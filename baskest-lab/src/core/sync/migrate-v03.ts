// EVENT LAB v0.4 — reprise des données enregistrées par la v0.3 dans le navigateur.
//
// v0.3 stockait (préfixe « baskest-lab: » de src/ui/eventlab-ui.tsx) :
//   - baskest-lab:eventlab:versions:<source>   versions du studio de configuration, par source
//       (<source> = « blueprint:la-grille-3x3 » ou « concept:<id> »), tableau d'EventConfig ;
//   - baskest-lab:eventlab:portefeuille-local  concepts ajoutés depuis le générateur multisectoriel.
// La reprise copie tout dans l'espace « local » de la v0.4 (un événement par EventConfig.id),
// sans rien supprimer : les clés v0.3 restent en place comme sauvegarde. Elle est rejouable
// (marqueur + dédoublonnage par contenu) et ne lève jamais d'exception.
import type { EventConfig } from '../eventlab';
import type { LocalRepository } from './local-repository';
import { SEMVER, SLUG, nextFreeVersion, sameJson, type KeyValueStore } from './util';

export const LEGACY_VERSIONS_PREFIX = 'baskest-lab:eventlab:versions:';
export const LEGACY_PORTFOLIO_KEY = 'baskest-lab:eventlab:portefeuille-local';
export const MIGRATION_MARK = 'baskest-lab:eventlab:migration-v03';

export interface MigrationReport {
  at: string;
  alreadyDone: boolean;
  keys: string[];
  imported: number;
  duplicates: number;
  renumbered: { slug: string; from: string; to: string; source: string }[];
  skipped: { source: string; reason: string }[];
}

const STATUSES = new Set(['draft', 'review', 'validated', 'archived']);

function check(c: unknown): string | null {
  if (!c || typeof c !== 'object') return 'contenu non objet';
  const x = c as Partial<EventConfig>;
  if (typeof x.id !== 'string' || !SLUG.test(x.id)) return 'identifiant absent ou invalide';
  if (typeof x.version !== 'string' || !SEMVER.test(x.version)) return 'numéro de version invalide';
  if (x.status != null && !STATUSES.has(x.status)) return 'statut inconnu';
  return null;
}

export function readMigrationReport(kv: KeyValueStore): MigrationReport | null {
  try {
    const raw = kv.getItem(MIGRATION_MARK);
    return raw ? (JSON.parse(raw) as MigrationReport) : null;
  } catch {
    return null;
  }
}

/** Reprend les données v0.3 dans `repo` (espace local). Sans effet si la reprise a déjà eu lieu. */
export function migrateV03(kv: KeyValueStore, repo: LocalRepository, opts: { force?: boolean } = {}): MigrationReport {
  const previous = readMigrationReport(kv);
  if (previous && !opts.force) return { ...previous, alreadyDone: true };
  const report: MigrationReport = { at: repo.clock(), alreadyDone: false, keys: [], imported: 0, duplicates: 0, renumbered: [], skipped: [] };

  const sources: { key: string; source: string; origin: 'studio' | 'generateur' }[] = [];
  let keys: string[] = [];
  try {
    keys = kv.keys();
  } catch {
    keys = [];
  }
  // Le blueprint d'abord : en cas de numéro commun avec une version faite depuis le concept
  // du même événement, c'est la version issue du concept qui est renumérotée.
  const versionKeys = keys.filter((k) => k.startsWith(LEGACY_VERSIONS_PREFIX)).sort((a, b) => Number(b.includes(':blueprint:')) - Number(a.includes(':blueprint:')) || a.localeCompare(b));
  for (const k of versionKeys) sources.push({ key: k, source: k.slice(LEGACY_VERSIONS_PREFIX.length), origin: 'studio' });
  if (keys.includes(LEGACY_PORTFOLIO_KEY)) sources.push({ key: LEGACY_PORTFOLIO_KEY, source: 'portefeuille-local', origin: 'generateur' });

  for (const s of sources) {
    report.keys.push(s.key);
    let list: unknown;
    try {
      list = JSON.parse(kv.getItem(s.key) ?? '[]');
    } catch {
      report.skipped.push({ source: s.source, reason: 'JSON illisible (clé conservée telle quelle)' });
      continue;
    }
    if (!Array.isArray(list)) {
      report.skipped.push({ source: s.source, reason: 'contenu inattendu (clé conservée telle quelle)' });
      continue;
    }
    for (const item of list) {
      const why = check(item);
      if (why) {
        report.skipped.push({ source: s.source, reason: why });
        continue;
      }
      const cfg = structuredClone(item) as EventConfig;
      cfg.status = cfg.status ?? 'draft';
      // Déjà repris (éventuellement sous un autre numéro, après renumérotation) : contenu identique hors numéro
      if (repo.versions(cfg.id).some((v) => sameJson({ ...v.config, version: cfg.version }, cfg))) {
        report.duplicates++;
        continue;
      }
      const same = repo.versions(cfg.id).find((v) => v.version === cfg.version);
      let note = `Reprise v0.3 (${s.source})`;
      if (same) {
        const to = nextFreeVersion(repo.takenVersions(cfg.id), cfg.version);
        report.renumbered.push({ slug: cfg.id, from: cfg.version, to, source: s.source });
        note += ` : renumérotée ${cfg.version} → ${to}, le numéro ${cfg.version} existait déjà pour « ${cfg.id} ». Contenu d’origine intact dans la clé ${s.key}.`;
        cfg.version = to;
      }
      try {
        repo.createVersion(cfg, { origin: s.origin, note });
        report.imported++;
      } catch (e) {
        report.skipped.push({ source: s.source, reason: e instanceof Error ? e.message : String(e) });
      }
    }
  }
  try {
    kv.setItem(MIGRATION_MARK, JSON.stringify(report));
  } catch {
    /* stockage plein : la reprise sera retentée (dédoublonnage par contenu) */
  }
  return report;
}
