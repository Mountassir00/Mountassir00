// v0.4 — synchronisation hors ligne d'abord avec un faux serveur en mémoire (tests/sync/memory-backend.ts).
// Couvre : envoi différé, rejeu dans l'ordre, idempotence (réponse perdue), conflit sur brouillon
// (les deux versions conservées + alerte), collision de numéro, refus selon le rôle, version
// validée jamais réécrite, suppression annulée, lecture du serveur.
import fs from 'node:fs';
import path from 'node:path';
import { FrozenVersionError, newVersion, type EventConfig } from '../src/core/eventlab';
import { LocalRepository, MemoryKv, SyncEngine, orgWorkspace, sameJson, type VersionRecord } from '../src/core/sync';
import { MemoryBackend } from './sync/memory-backend';

const EL = path.resolve(__dirname, '../../event-lab');
const GRILLE_BP = JSON.parse(fs.readFileSync(path.join(EL, 'blueprints/la-grille-3x3/event.json'), 'utf8')) as EventConfig;
const D = '2026-11-24';
const ORG = 'org-bask-est';

/** Un appareil : son propre stockage, son dépôt local, son moteur de synchronisation. */
function device(backend: MemoryBackend, user: string) {
  const kv = new MemoryKv();
  const repo = new LocalRepository(kv, orgWorkspace(ORG));
  const sync = new SyncEngine(repo, backend.client(user));
  return { kv, repo, sync };
}
const draft = (over: Partial<EventConfig> = {}) => ({ ...newVersion(GRILLE_BP, { author: 'test', date: D }), ...over });
const tag = (v: VersionRecord, text: string): EventConfig => ({ ...v.config, identity: { ...v.config.identity, tagline: text } });
const serverVersions = (b: MemoryBackend) => [...b.versions.values()].sort((x, y) => x.version.localeCompare(y.version));

let backend: MemoryBackend;
beforeEach(() => {
  backend = new MemoryBackend();
  backend.setRole(ORG, 'alice', 'proprietaire');
  backend.setRole(ORG, 'bob', 'editeur');
  backend.setRole(ORG, 'bea', 'editeur');
  backend.setRole(ORG, 'carol', 'lecteur');
  backend.setRole(ORG, 'dave', 'administrateur');
});

test('envoi différé : hors ligne, tout reste sur l’appareil ; au retour du réseau, la file part', async () => {
  const a = device(backend, 'bob');
  backend.online = false;
  const v = a.repo.createVersion(draft());
  expect(v.sync).toBe('pending');
  const r1 = await a.sync.sync();
  expect(r1.offline).toBe(true);
  expect(a.repo.pendingCount()).toBe(1);
  expect(a.repo.data.lastError).toMatch(/injoignable/);
  expect(backend.versions.size).toBe(0);
  backend.online = true;
  const r2 = await a.sync.sync();
  expect(r2).toMatchObject({ sent: 1, remaining: 0, offline: false, pulled: true });
  expect(a.repo.version(v.id)).toMatchObject({ sync: 'synced', rowVersion: 1 });
  expect(backend.versions.get(v.id)!.config).toEqual(JSON.parse(JSON.stringify(a.repo.version(v.id)!.config)));
  expect(a.repo.data.lastSyncAt).not.toBeNull();
});

test('rejeu dans l’ordre : création, modifications regroupées, soumission, puis validation par un administrateur', async () => {
  const a = device(backend, 'bob');
  backend.online = false;
  const v = a.repo.createVersion(draft());
  a.repo.updateDraft(v.id, tag(v, 'v1'));
  a.repo.updateDraft(v.id, tag(a.repo.version(v.id)!, 'v2'));
  a.repo.transition(v.id, 'submit', 'bob', D);
  expect(a.repo.data.outbox.map((o) => o.kind)).toEqual(['create_version', 'transition']);
  backend.online = true;
  await a.sync.sync();
  const s = backend.versions.get(v.id)!;
  expect(s.status).toBe('review');
  expect(s.config.identity.tagline).toBe('v2');
  expect(s.rowVersion).toBe(2);
  // Validation sur l'appareil de l'administrateur, visible chez l'éditeur après synchronisation
  const d = device(backend, 'dave');
  await d.sync.sync();
  d.repo.transition(v.id, 'approve', 'dave', D);
  await d.sync.sync();
  expect(backend.versions.get(v.id)!.status).toBe('validated');
  await a.sync.sync();
  expect(a.repo.version(v.id)!.status).toBe('validated');
  expect(() => a.repo.updateDraft(v.id, tag(a.repo.version(v.id)!, 'x'))).toThrow(FrozenVersionError);
});

test('idempotence : réponse perdue après enregistrement, le rejeu ne crée ni doublon ni conflit', async () => {
  const a = device(backend, 'bob');
  const v = a.repo.createVersion(draft());
  backend.dropResponseOf = 'insertVersion'; // le serveur enregistre la création, la réponse se perd
  const r1 = await a.sync.sync();
  expect(r1.offline).toBe(true);
  expect(backend.versions.size).toBe(1);
  expect(a.repo.pendingCount()).toBe(1);
  await a.sync.sync();
  expect(backend.versions.size).toBe(1);
  expect(a.repo.version(v.id)).toMatchObject({ sync: 'synced', rowVersion: 1 });

  // Même chose pour une modification : le serveur passe en row_version 2, l'appareil croit encore 1
  a.repo.updateDraft(v.id, tag(a.repo.version(v.id)!, 'modifiée'));
  backend.dropResponseOf = 'updateVersion';
  await a.sync.sync();
  expect(backend.versions.get(v.id)!.rowVersion).toBe(2);
  const r3 = await a.sync.sync();
  expect(r3.conflicts).toBe(0);
  expect(a.repo.data.alerts).toHaveLength(0);
  expect(a.repo.versions()).toHaveLength(1);
  expect(a.repo.version(v.id)).toMatchObject({ sync: 'synced', rowVersion: 2 });
});

test('conflit sur un brouillon : le serveur garde la version de l’autre appareil, la nôtre devient un nouveau brouillon, alerte', async () => {
  const a = device(backend, 'bob');
  const b = device(backend, 'bea');
  const v = a.repo.createVersion(draft());
  await a.sync.sync();
  await b.sync.sync();
  expect(b.repo.version(v.id)).toBeTruthy();
  // B passe hors ligne et modifie ; A modifie et envoie d'abord
  a.repo.updateDraft(v.id, tag(a.repo.version(v.id)!, 'version de A'));
  await a.sync.sync();
  b.repo.updateDraft(v.id, tag(b.repo.version(v.id)!, 'version de B'));
  const r = await b.sync.sync();
  expect(r.conflicts).toBe(1);
  // Sur B : la version d'origine reflète le serveur (A), la modification de B est dans une copie
  expect(b.repo.version(v.id)!.config.identity.tagline).toBe('version de A');
  const copy = b.repo.versions('la-grille-3x3').find((x) => x.id !== v.id)!;
  expect(copy.config.identity.tagline).toBe('version de B');
  expect(copy.version).toBe('0.4.0');
  expect(copy.config.parent).toEqual({ id: 'la-grille-3x3', version: '0.3.0', relation: 'new_version' });
  expect(copy.sync).toBe('synced'); // envoyée dans le même passage
  const alert = b.repo.data.alerts.find((x) => x.kind === 'conflit')!;
  expect(alert.copyVersionId).toBe(copy.id);
  expect(alert.message).toMatch(/nouveau brouillon v0\.4\.0/);
  // Sur le serveur : les deux versions existent
  expect(serverVersions(backend).map((x) => `${x.version}:${x.config.identity.tagline}`)).toEqual(['0.3.0:version de A', '0.4.0:version de B']);
  // A récupère la copie de B à la synchronisation suivante
  await a.sync.sync();
  expect(a.repo.versions('la-grille-3x3')).toHaveLength(2);
});

test('même transition faite sur deux appareils : pas de copie, simple information', async () => {
  const a = device(backend, 'bob');
  const b = device(backend, 'bea');
  const v = a.repo.createVersion(draft());
  await a.sync.sync();
  await b.sync.sync();
  a.repo.transition(v.id, 'submit', 'bob', D);
  b.repo.transition(v.id, 'submit', 'bea', D);
  await a.sync.sync();
  const r = await b.sync.sync();
  expect(r.conflicts).toBe(1);
  expect(b.repo.versions()).toHaveLength(1);
  expect(b.repo.version(v.id)!.status).toBe('review');
  expect(b.repo.data.alerts.map((x) => x.kind)).toEqual(['transition_non_appliquee']);
});

test('même numéro créé hors ligne sur deux appareils : les deux versions sont gardées, la seconde est renumérotée', async () => {
  const a = device(backend, 'bob');
  const b = device(backend, 'bea');
  a.repo.createVersion(draft({ hypotheses: ['A'] }));
  b.repo.createVersion(draft({ hypotheses: ['B'] }));
  await a.sync.sync();
  await b.sync.sync();
  expect(serverVersions(backend).map((x) => `${x.version}:${x.config.hypotheses![0]}`)).toEqual(['0.3.0:A', '0.4.0:B']);
  expect(b.repo.data.alerts.map((x) => x.kind)).toEqual(['renumerotation']);
  expect(b.repo.versions().map((x) => x.version)).toEqual(['0.3.0', '0.4.0']);
  // Un seul événement côté serveur, même identifiant sur les deux appareils
  expect(backend.events.size).toBe(1);
  expect(new Set(b.repo.versions().map((x) => x.eventId))).toEqual(new Set([...backend.events.keys()]));
});

test('version validée jamais réécrite : une modification hors ligne d’un brouillon validé entre-temps part dans une copie', async () => {
  const a = device(backend, 'bob');
  const d = device(backend, 'dave');
  const v = a.repo.createVersion(draft());
  await a.sync.sync();
  await d.sync.sync();
  d.repo.transition(v.id, 'submit', 'dave', D);
  d.repo.transition(v.id, 'approve', 'dave', D);
  await d.sync.sync();
  const validated = structuredClone(backend.versions.get(v.id)!);
  expect(validated.status).toBe('validated');
  a.repo.updateDraft(v.id, tag(a.repo.version(v.id)!, 'modifiée hors ligne')); // A ne sait pas encore
  await a.sync.sync();
  expect(backend.versions.get(v.id)).toEqual(validated); // inchangée sur le serveur
  expect(a.repo.version(v.id)!.status).toBe('validated');
  expect(a.repo.version(v.id)!.config.identity.tagline).not.toBe('modifiée hors ligne');
  const copy = a.repo.versions().find((x) => x.id !== v.id)!;
  expect(copy).toMatchObject({ status: 'draft', version: '0.4.0' });
  expect(copy.config.identity.tagline).toBe('modifiée hors ligne');
});

test('lecture du serveur : une version figée locale n’est jamais réécrite, même si le serveur diffère (alerte d’intégrité)', async () => {
  const d = device(backend, 'dave');
  const v = d.repo.createVersion(draft());
  d.repo.transition(v.id, 'submit', 'dave', D);
  d.repo.transition(v.id, 'approve', 'dave', D);
  await d.sync.sync();
  const before = structuredClone(d.repo.version(v.id)!.config);
  // Altération directe côté serveur (impossible avec le vrai schéma : déclencheur d'immutabilité)
  backend.versions.get(v.id)!.config = tag(d.repo.version(v.id)!, 'altérée');
  await d.sync.sync();
  expect(sameJson(d.repo.version(v.id)!.config, before)).toBe(true);
  expect(d.repo.data.alerts.map((x) => x.kind)).toEqual(['integrite']);
});

test('refus selon le rôle : un lecteur ne peut rien envoyer ; sa copie locale est gardée et signalée', async () => {
  const c = device(backend, 'carol');
  const v = c.repo.createVersion(draft());
  const r = await c.sync.sync();
  expect(r.rejected).toBe(1);
  expect(backend.versions.size).toBe(0);
  expect(c.repo.version(v.id)).toMatchObject({ sync: 'rejected' });
  expect(c.repo.pendingCount()).toBe(0); // la file n'est pas bloquée
  expect(c.repo.data.alerts[0]).toMatchObject({ kind: 'refus' });
});

test('refus selon le rôle : un éditeur qui approuve hors ligne est ramené à l’état du serveur', async () => {
  const a = device(backend, 'bob');
  const v = a.repo.createVersion(draft());
  a.repo.transition(v.id, 'submit', 'bob', D);
  await a.sync.sync();
  a.repo.transition(v.id, 'approve', 'bob', D); // le moteur local l'accepte, le serveur non
  const r = await a.sync.sync();
  expect(r.rejected).toBe(1);
  expect(backend.versions.get(v.id)!.status).toBe('review');
  expect(a.repo.version(v.id)!.status).toBe('review');
  expect(a.repo.versions()).toHaveLength(1); // contenu identique : pas de copie
  expect(a.repo.data.alerts.map((x) => x.kind)).toEqual(['refus']);
});

test('suppression hors ligne d’un brouillon modifié ailleurs : suppression annulée, version restaurée', async () => {
  const a = device(backend, 'bob');
  const b = device(backend, 'bea');
  const v = a.repo.createVersion(draft());
  await a.sync.sync();
  await b.sync.sync();
  a.repo.deleteVersion(v.id);
  expect(a.repo.version(v.id)).toBeUndefined();
  b.repo.updateDraft(v.id, tag(b.repo.version(v.id)!, 'modifiée par B'));
  await b.sync.sync();
  await a.sync.sync();
  expect(backend.versions.has(v.id)).toBe(true);
  expect(a.repo.version(v.id)!.config.identity.tagline).toBe('modifiée par B');
  expect(a.repo.data.alerts.map((x) => x.kind)).toEqual(['suppression_annulee']);
});

test('suppression et création se propagent entre appareils', async () => {
  const a = device(backend, 'bob');
  const b = device(backend, 'bea');
  const v = a.repo.createVersion(draft());
  await a.sync.sync();
  await b.sync.sync();
  expect(b.repo.versions()).toHaveLength(1);
  a.repo.deleteVersion(v.id);
  await a.sync.sync();
  expect(backend.versions.size).toBe(0);
  await b.sync.sync();
  expect(b.repo.versions()).toHaveLength(0);
});

test('isolation : un appareil d’une autre organisation ne lit rien', async () => {
  const a = device(backend, 'bob');
  a.repo.createVersion(draft());
  await a.sync.sync();
  const intrus = device(backend, 'mallory');
  await intrus.sync.sync();
  expect(intrus.repo.versions()).toHaveLength(0);
});
