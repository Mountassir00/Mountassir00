// Concepts ajoutés depuis le générateur multisectoriel, conservés dans l'espace actif
// (ce navigateur en mode local ; l'organisation, synchronisée, quand un compte est connecté).
// v0.3 : clé « baskest-lab:eventlab:portefeuille-local », reprise par src/core/sync/migrate-v03.ts.
import type { EventConfig } from '../core/eventlab';
import { cmpVersion, type LocalRepository } from '../core/sync';
import { requestSync } from './workspace';

/** Dernière version de chaque événement créé par le générateur. */
export function generatedConcepts(repo: LocalRepository): EventConfig[] {
  return repo
    .events()
    .filter((e) => e.origin === 'generateur')
    .map((e) => repo.versions(e.slug).sort((a, b) => cmpVersion(a.version, b.version)).at(-1)?.config)
    .filter((c): c is EventConfig => !!c);
}

/** Renvoie un message d'erreur lisible si l'enregistrement échoue, sinon null. */
export function addGeneratedConcept(repo: LocalRepository, c: EventConfig): string | null {
  try {
    repo.createVersion(c, { origin: 'generateur' });
    requestSync();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export function removeGeneratedConcept(repo: LocalRepository, slug: string): string | null {
  const ev = repo.eventBySlug(slug);
  if (!ev) return null;
  try {
    repo.deleteEvent(ev.id);
    requestSync();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}
