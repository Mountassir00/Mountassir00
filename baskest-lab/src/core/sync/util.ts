// EVENT LAB v0.4 — outils purs de la couche de données (stockage clé-valeur, identifiants, comparaisons).
import { bump } from '../eventlab/versioning';
import type { EventConfig } from '../eventlab';

/** Stockage clé-valeur synchrone (localStorage dans le navigateur, mémoire dans les tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  /** Lève une erreur si le stockage est plein ou indisponible. */
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export class MemoryKv implements KeyValueStore {
  readonly map = new Map<string, string>();
  /** Taille maximale simulée (octets), pour tester un stockage plein. */
  quota = Infinity;
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    const size = [...this.map.entries()].reduce((s, [kk, vv]) => s + (kk === k ? 0 : kk.length + vv.length), 0) + k.length + v.length;
    if (size > this.quota) {
      const e = new Error('QuotaExceededError');
      e.name = 'QuotaExceededError';
      throw e;
    }
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  keys() {
    return [...this.map.keys()];
  }
}

/** localStorage enveloppé ; null si indisponible (navigation privée stricte, enveloppe sans stockage). */
export function browserKv(): KeyValueStore | null {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => ls.setItem(k, v),
      removeItem: (k) => ls.removeItem(k),
      keys: () => Array.from({ length: ls.length }, (_, i) => ls.key(i)).filter((k): k is string => k != null),
    };
  } catch {
    return null;
  }
}

/** UUID v4 ; repli sur getRandomValues hors contexte sécurisé (crypto.randomUUID y est absent). */
export function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID();
    } catch {
      /* repli */
    }
  }
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** JSON canonique (clés triées, valeurs undefined retirées) : comparaison indépendante de l'ordre des clés. */
export function canonical(x: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(o)
          .filter((k) => o[k] !== undefined)
          .sort()
          .map((k) => [k, norm(o[k])]),
      );
    }
    return v;
  };
  return JSON.stringify(norm(JSON.parse(JSON.stringify(x ?? null))));
}
export const sameJson = (a: unknown, b: unknown) => canonical(a) === canonical(b);

/** Contenu d'une version hors statut et historique (même règle que private.version_content côté serveur). */
export function versionContent(c: EventConfig): unknown {
  const { status: _s, history: _h, ...rest } = c;
  void _s;
  void _h;
  return rest;
}
export const sameContent = (a: EventConfig, b: EventConfig) => sameJson(versionContent(a), versionContent(b));

export const SEMVER = /^[0-9]+\.[0-9]+\.[0-9]+$/;
export const SLUG = /^[a-z0-9-]+$/;

export function cmpVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Prochain numéro libre : incrément mineur du plus grand numéro connu (base comprise), sans collision. */
export function nextFreeVersion(taken: Iterable<string>, base: string): string {
  const set = new Set(taken);
  let v = [base, ...set].filter((x) => SEMVER.test(x)).sort(cmpVersion).at(-1) ?? '0.0.0';
  do v = bump(v, 'minor');
  while (set.has(v));
  return v;
}
