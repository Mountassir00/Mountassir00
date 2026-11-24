// Portefeuille local : concepts ajoutés depuis le générateur multisectoriel, conservés dans ce navigateur.
import type { EventConfig } from '../core/eventlab';
import { readStore, writeStore } from './eventlab-ui';

const KEY = 'eventlab:portefeuille-local';

export function loadLocalConcepts(): EventConfig[] {
  const list = readStore<EventConfig[]>(KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Renvoie un message d'erreur lisible si l'écriture échoue, sinon null. */
export function saveLocalConcepts(list: EventConfig[]): string | null {
  return writeStore(KEY, list);
}
