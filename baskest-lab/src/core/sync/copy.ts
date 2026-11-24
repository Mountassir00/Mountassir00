// EVENT LAB v0.4 — copie volontaire des données de l'espace local vers un espace d'organisation.
// Rien n'est copié automatiquement : l'utilisateur le demande depuis la page « Compte et organisation ».
// Les statuts sont conservés ; le serveur refusera (alerte « refus ») une version validée envoyée
// par un rôle inférieur à administrateur. L'espace local n'est pas modifié.
import type { LocalRepository } from './local-repository';
import { sameJson } from './util';

export interface CopyReport {
  copied: number;
  alreadyThere: number;
  renumbered: { slug: string; from: string; to: string }[];
  failed: { slug: string; version: string; reason: string }[];
}

export function copyWorkspace(from: LocalRepository, to: LocalRepository): CopyReport {
  const report: CopyReport = { copied: 0, alreadyThere: 0, renumbered: [], failed: [] };
  for (const v of from.versions()) {
    if (to.versions(v.eventSlug).some((x) => sameJson({ ...x.config, version: v.version }, v.config))) {
      report.alreadyThere++;
      continue;
    }
    const ev = from.events().find((e) => e.id === v.eventId);
    const cfg = structuredClone(v.config);
    let note = 'Copie de l’espace local de cet appareil';
    if (to.takenVersions(v.eventSlug).includes(cfg.version)) {
      const next = to.nextVersion(v.eventSlug, cfg.version);
      report.renumbered.push({ slug: v.eventSlug, from: cfg.version, to: next });
      note += ` (renumérotée ${cfg.version} → ${next}, numéro déjà pris dans l’organisation)`;
      cfg.version = next;
    }
    try {
      to.createVersion(cfg, { origin: ev?.origin === 'generateur' ? 'generateur' : 'import', eventName: ev?.name, note });
      report.copied++;
    } catch (e) {
      report.failed.push({ slug: v.eventSlug, version: v.version, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return report;
}
