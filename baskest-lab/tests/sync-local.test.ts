// v0.4 — dépôt local hors ligne et reprise des données v0.3 (stockage du navigateur).
import fs from 'node:fs';
import path from 'node:path';
import { FrozenVersionError, newVersion, transition, type EventConfig } from '../src/core/eventlab';
import {
  DuplicateVersionError,
  LEGACY_PORTFOLIO_KEY,
  LEGACY_VERSIONS_PREFIX,
  LocalRepository,
  MIGRATION_MARK,
  MemoryKv,
  StorageError,
  copyWorkspace,
  migrateV03,
  orgWorkspace,
  sameJson,
  storeKey,
} from '../src/core/sync';

const EL = path.resolve(__dirname, '../../event-lab');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(EL, p), 'utf8')) as EventConfig;
const GRILLE_BP = read('blueprints/la-grille-3x3/event.json'); // v0.2.0
const GRILLE_CONCEPT = read('portfolio/concepts/la-grille-3x3.json'); // v0.1.0
const CARRE = read('portfolio/concepts/carre-fest.json');
const D = '2026-11-24';

describe('dépôt local', () => {
  test('brouillon modifiable, transitions du moteur, version validée figée', () => {
    const repo = new LocalRepository(new MemoryKv(), 'local');
    const v = repo.createVersion(newVersion(GRILLE_BP, { author: 'test', date: D }));
    expect(v.version).toBe('0.3.0');
    expect(v.sync).toBe('local');
    expect(repo.pendingCount()).toBe(0); // espace local : rien n'est envoyé
    const edited = repo.updateDraft(v.id, { ...v.config, identity: { ...v.config.identity, tagline: 'modifiée' } });
    expect(edited.config.identity.tagline).toBe('modifiée');
    repo.transition(v.id, 'submit', 'bob', D);
    const ok = repo.transition(v.id, 'approve', 'dave', D);
    expect(ok.status).toBe('validated');
    expect(() => repo.updateDraft(v.id, ok.config)).toThrow(FrozenVersionError);
    expect(() => repo.deleteVersion(v.id)).toThrow(FrozenVersionError);
    expect(() => repo.deleteEvent(v.eventId)).toThrow(FrozenVersionError);
    expect(() => repo.transition(v.id, 'submit', 'x', D)).toThrow(/impossible/);
    // La bonne voie : nouvelle version brouillon
    const n = repo.createVersion(newVersion(ok.config, { author: 'test', date: D }));
    expect(n.version).toBe('0.4.0');
    expect(n.config.parent).toEqual({ id: 'la-grille-3x3', version: '0.3.0', relation: 'new_version' });
    expect(repo.version(v.id)!.config).toEqual(ok.config); // la version validée n'a pas bougé
  });

  test('numéro de version unique par événement, prochain numéro libre', () => {
    const repo = new LocalRepository(new MemoryKv(), 'local');
    repo.createVersion(newVersion(GRILLE_BP, { date: D }));
    expect(() => repo.createVersion(newVersion(GRILLE_BP, { date: D }))).toThrow(DuplicateVersionError);
    expect(repo.nextVersion('la-grille-3x3', GRILLE_BP.version)).toBe('0.4.0');
    expect(repo.nextVersion('la-grille-3x3', '0.1.0')).toBe('0.4.0');
  });

  test('espace d’organisation : file d’envoi regroupée (création + modifications = 1 opération)', () => {
    const repo = new LocalRepository(new MemoryKv(), orgWorkspace('org-1'));
    const v = repo.createVersion(newVersion(GRILLE_BP, { date: D }));
    repo.updateDraft(v.id, { ...v.config, hypotheses: ['a'] });
    repo.updateDraft(v.id, { ...v.config, hypotheses: ['a', 'b'] });
    expect(repo.data.outbox).toHaveLength(1);
    expect(repo.data.outbox[0].kind).toBe('create_version');
    expect((repo.data.outbox[0] as { config: EventConfig }).config.hypotheses).toEqual(['a', 'b']);
    repo.transition(v.id, 'submit', 'bob', D);
    expect(repo.data.outbox.map((o) => o.kind)).toEqual(['create_version', 'transition']);
    // Un brouillon jamais envoyé puis supprimé ne laisse aucune trace dans la file
    const w = repo.createVersion({ ...newVersion(GRILLE_BP, { date: D }), version: '0.9.0' });
    repo.deleteVersion(w.id);
    expect(repo.data.outbox.map((o) => o.kind)).toEqual(['create_version', 'transition']);
  });

  test('stockage plein : erreur lisible et état inchangé', () => {
    const kv = new MemoryKv();
    const repo = new LocalRepository(kv, 'local');
    repo.createVersion(newVersion(GRILLE_BP, { date: D }));
    kv.quota = kv.getItem(storeKey('local'))!.length + 100;
    expect(() => repo.createVersion({ ...newVersion(GRILLE_BP, { date: D }), version: '0.9.0' })).toThrow(StorageError);
    expect(repo.versions()).toHaveLength(1);
    expect(new LocalRepository(kv, 'local').versions()).toHaveLength(1);
  });

  test('persistance : un autre dépôt sur le même stockage relit les données', () => {
    const kv = new MemoryKv();
    const a = new LocalRepository(kv, orgWorkspace('o'));
    a.createVersion(newVersion(CARRE, { date: D }));
    const b = new LocalRepository(kv, orgWorkspace('o'));
    expect(b.versions('carre-fest')).toHaveLength(1);
    expect(b.pendingCount()).toBe(1); // la file d'envoi est persistante
    expect(new LocalRepository(kv, 'local').versions()).toHaveLength(0); // espaces séparés
  });
});

describe('reprise des données v0.3 (stockage du navigateur)', () => {
  // Données telles que la v0.3 les écrivait (src/ui/pages/ConfigStudio.tsx, src/ui/local-portfolio.ts)
  const bp030 = newVersion(GRILLE_BP, { author: 'porteur', summary: 'prix du billet à 6 €', date: D }); // 0.3.0
  const bp040 = transition(transition(newVersion(bp030, { author: 'porteur', date: D }), 'submit', { actor: 'porteur', date: D }), 'approve', { actor: 'porteur', date: D }); // 0.4.0 validée
  const c020 = newVersion(GRILLE_CONCEPT, { author: 'porteur', date: D }); // 0.2.0 (depuis le concept)
  const c030 = newVersion({ ...c020, budget: { ...c020.budget!, contingency_rate: 0.2 } }, { author: 'porteur', date: D }); // 0.3.0 : même numéro que bp030, contenu différent
  const carre = newVersion(CARRE, { author: 'porteur', date: D });
  const generated: EventConfig = { ...structuredClone(CARRE), id: 'carre-fest-gen-lx2k9', identity: { ...CARRE.identity, name: 'Concept généré' } };
  const legacy: Record<string, string> = {
    [`${LEGACY_VERSIONS_PREFIX}blueprint:la-grille-3x3`]: JSON.stringify([bp030, bp040]),
    [`${LEGACY_VERSIONS_PREFIX}concept:la-grille-3x3`]: JSON.stringify([c020, c030]),
    [`${LEGACY_VERSIONS_PREFIX}concept:carre-fest`]: JSON.stringify([carre]),
    [`${LEGACY_VERSIONS_PREFIX}concept:casse`]: '{ceci n’est pas du JSON',
    [LEGACY_PORTFOLIO_KEY]: JSON.stringify([generated, { id: 'Pas Un Slug', version: '1' }]),
    'baskest-lab:theme': JSON.stringify('dark'),
  };
  const fill = () => {
    const kv = new MemoryKv();
    for (const [k, v] of Object.entries(legacy)) kv.setItem(k, v);
    return kv;
  };

  test('tout est repris sans perte ; les clés v0.3 restent intactes', () => {
    const kv = fill();
    const repo = new LocalRepository(kv, 'local');
    const r = migrateV03(kv, repo);
    expect(r.alreadyDone).toBe(false);
    expect(r.imported).toBe(6);
    expect(r.renumbered).toEqual([{ slug: 'la-grille-3x3', from: '0.3.0', to: '0.5.0', source: 'concept:la-grille-3x3' }]);
    expect(r.skipped.map((s) => s.source).sort()).toEqual(['concept:casse', 'portefeuille-local']);
    // Chaque configuration v0.3 valide se retrouve, contenu identique (hors numéro pour la version renumérotée)
    for (const c of [bp030, bp040, c020, c030, carre, generated]) {
      const found = repo.versions(c.id).find((v) => sameJson({ ...v.config, version: c.version }, c));
      expect(found, `${c.id}@${c.version}`).toBeTruthy();
    }
    // Statut conservé : la version validée reste validée (et donc figée)
    const v040 = repo.versions('la-grille-3x3').find((v) => v.version === '0.4.0')!;
    expect(v040.status).toBe('validated');
    expect(() => repo.updateDraft(v040.id, v040.config)).toThrow(FrozenVersionError);
    // Un seul événement par identifiant, provenance notée
    expect(repo.events().map((e) => `${e.slug}:${e.origin}`).sort()).toEqual(['carre-fest-gen-lx2k9:generateur', 'carre-fest:studio', 'la-grille-3x3:studio']);
    expect(repo.versions('la-grille-3x3').map((v) => v.version)).toEqual(['0.2.0', '0.3.0', '0.4.0', '0.5.0']);
    expect(repo.versions('la-grille-3x3').find((v) => v.version === '0.5.0')!.note).toMatch(/renumérotée 0\.3\.0 → 0\.5\.0/);
    // Sauvegarde : les clés v0.3 ne sont ni supprimées ni modifiées
    for (const [k, v] of Object.entries(legacy)) expect(kv.getItem(k)).toBe(v);
    expect(JSON.parse(kv.getItem(MIGRATION_MARK)!).imported).toBe(6);
  });

  test('rejouable : pas de doublon, même en forçant', () => {
    const kv = fill();
    const repo = new LocalRepository(kv, 'local');
    migrateV03(kv, repo);
    const n = repo.versions().length;
    expect(migrateV03(kv, repo).alreadyDone).toBe(true);
    const forced = migrateV03(kv, repo, { force: true });
    expect(forced.imported).toBe(0); // la version renumérotée est reconnue à son contenu
    expect(forced.duplicates).toBe(6);
    expect(repo.versions().length).toBe(n);
  });

  test('stockage vide ou absent : aucune erreur', () => {
    const kv = new MemoryKv();
    const r = migrateV03(kv, new LocalRepository(kv, 'local'));
    expect(r.imported).toBe(0);
    expect(r.skipped).toEqual([]);
  });
});

describe('copie volontaire de l’espace local vers une organisation', () => {
  test('copie sans toucher à l’espace local ; rejouable ; numéro déjà pris renuméroté', () => {
    const kv = new MemoryKv();
    const local = new LocalRepository(kv, 'local');
    const org = new LocalRepository(kv, orgWorkspace('o1'));
    const a = local.createVersion(newVersion(GRILLE_BP, { date: D }));
    local.createVersion(newVersion(CARRE, { date: D }), { origin: 'generateur' });
    org.createVersion({ ...newVersion(GRILLE_BP, { date: D }), hypotheses: ['déjà là, autre contenu'] });
    const before = kv.getItem(storeKey('local'));
    const r = copyWorkspace(local, org);
    expect(r).toMatchObject({ copied: 2, alreadyThere: 0, failed: [] });
    expect(r.renumbered).toEqual([{ slug: 'la-grille-3x3', from: '0.3.0', to: '0.4.0' }]);
    expect(kv.getItem(storeKey('local'))).toBe(before);
    expect(org.versions('la-grille-3x3').map((v) => v.version)).toEqual(['0.3.0', '0.4.0']);
    expect(org.data.outbox.filter((o) => o.kind === 'create_version')).toHaveLength(3); // envoyées à la prochaine synchronisation
    expect(org.events().find((e) => e.slug === 'carre-fest')!.origin).toBe('generateur');
    expect(copyWorkspace(local, org)).toMatchObject({ copied: 0, alreadyThere: 2 });
    expect(local.version(a.id)!.sync).toBe('local');
  });
});
