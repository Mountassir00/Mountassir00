/**
 * Central registry of visual experiences.
 *
 * - Code experiences (built-in, or installed after review) register a
 *   definition with a lazy `load()`: only the active experience's renderer is
 *   downloaded and evaluated.
 * - Variants (duplicates, customisations, imports) are pure data stored in
 *   preferences: a base experience id + validated graphic overrides.
 * - All lifecycle operations are pure functions over Prefs, so they are
 *   trivially testable and never touch operational state.
 */
import { z } from 'zod';
import { manifestSchema, sanitizeOverrides, defaultsOf, type ExperienceDefinition, type ExperienceManifest, type ExperienceModule } from './manifest';
import type { Prefs, VariantRecord } from './prefs';
import type { DeviceClass } from './contract';
import { themeSchema, type Theme } from './themes';

export interface RegistryEntry {
  id: string;
  baseId: string;
  origin: 'builtin' | 'variant' | 'installed';
  manifest: ExperienceManifest;
  enabled: boolean;
  hidden: boolean;
  favorite: boolean;
  isDefault: boolean;
  overrides: Record<string, unknown>;
  config: Record<string, unknown>;
  variant?: VariantRecord;
}

export class ExperienceRegistry {
  private defs = new Map<string, ExperienceDefinition & { origin: 'builtin' | 'installed' }>();
  private modules = new Map<string, Promise<ExperienceModule>>();
  readonly loadTimings = new Map<string, number>();

  register(def: ExperienceDefinition, origin: 'builtin' | 'installed' = 'builtin') {
    const parsed = manifestSchema.safeParse(def.manifest);
    if (!parsed.success) {
      throw new Error(`Manifeste invalide pour ${def.manifest?.id ?? '?'} : ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}`);
    }
    if (this.defs.has(def.manifest.id)) throw new Error(`Expérience déjà enregistrée : ${def.manifest.id}`);
    this.defs.set(def.manifest.id, { ...def, origin });
  }

  hasBase(id: string) {
    return this.defs.has(id);
  }

  baseManifest(id: string): ExperienceManifest | undefined {
    return this.defs.get(id)?.manifest;
  }

  entries(prefs: Prefs): RegistryEntry[] {
    const out: RegistryEntry[] = [];
    for (const def of this.defs.values()) out.push(this.makeEntry(def.manifest.id, def.manifest, def.origin, prefs));
    for (const v of prefs.variants) {
      const base = this.defs.get(v.baseId);
      if (!base) continue;
      const manifest: ExperienceManifest = { ...base.manifest, id: v.id, name: v.name, description: v.description, version: v.version, createdAt: v.createdAt };
      out.push(this.makeEntry(v.id, manifest, 'variant', prefs, v));
    }
    return out;
  }

  private makeEntry(id: string, manifest: ExperienceManifest, origin: RegistryEntry['origin'], prefs: Prefs, variant?: VariantRecord): RegistryEntry {
    const baseId = variant?.baseId ?? id;
    const baseManifest = this.defs.get(baseId)!.manifest;
    const overrides = sanitizeOverrides(baseManifest, variant ? variant.overrides : prefs.overrides[id] ?? {});
    return {
      id,
      baseId,
      origin,
      manifest,
      enabled: !prefs.disabled.includes(id),
      hidden: prefs.hidden.includes(id),
      favorite: prefs.favorites.includes(id),
      isDefault: prefs.defaultExperience === id,
      overrides,
      config: { ...defaultsOf(baseManifest), ...overrides },
      variant,
    };
  }

  resolve(id: string, prefs: Prefs): RegistryEntry | undefined {
    return this.entries(prefs).find((e) => e.id === id);
  }

  /** Lazy-load a renderer; cached so switching back is instant. */
  load(baseId: string): Promise<ExperienceModule> {
    const cached = this.modules.get(baseId);
    if (cached) return cached;
    const def = this.defs.get(baseId);
    if (!def) return Promise.reject(new Error(`Expérience inconnue : ${baseId}`));
    const t0 = performance.now();
    const p = def.load().then((m) => {
      this.loadTimings.set(baseId, performance.now() - t0);
      return m;
    });
    p.catch(() => this.modules.delete(baseId));
    this.modules.set(baseId, p);
    return p;
  }

  isLoaded(baseId: string) {
    return this.loadTimings.has(baseId);
  }

  /** Warm a renderer during idle time (e.g. on hover in the switcher). */
  prefetch(baseId: string) {
    if (this.modules.has(baseId) || !this.defs.has(baseId)) return;
    const run = () => void this.load(baseId).catch(() => undefined);
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
    if (ric) ric(run);
    else setTimeout(run, 50);
  }
}

/** Which experience to open, given device, project and availability. */
export function pickExperience(entries: RegistryEntry[], prefs: Prefs, device: DeviceClass, project?: string): string {
  const usable = (id?: string) => (id && entries.some((e) => e.id === id && e.enabled) ? id : undefined);
  return (
    usable(project ? prefs.perProject[project] : undefined) ??
    usable(prefs.perDevice[device]) ??
    usable(prefs.lastExperience) ??
    usable(prefs.defaultExperience) ??
    entries.find((e) => e.enabled)?.id ??
    'control-center'
  );
}

/* ---------- pure lifecycle operations ---------- */

const toggle = (list: string[], id: string, on: boolean) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id));

export const ops = {
  setEnabled(p: Prefs, id: string, enabled: boolean): Prefs {
    if (!enabled && p.defaultExperience === id) throw new Error('Choisissez une autre expérience par défaut avant de désactiver celle-ci.');
    return { ...p, disabled: toggle(p.disabled, id, !enabled) };
  },
  setHidden(p: Prefs, id: string, hidden: boolean): Prefs {
    return { ...p, hidden: toggle(p.hidden, id, hidden) };
  },
  setFavorite(p: Prefs, id: string, fav: boolean): Prefs {
    return { ...p, favorites: toggle(p.favorites, id, fav) };
  },
  setDefault(p: Prefs, id: string, scope: { device?: DeviceClass; project?: string } = {}): Prefs {
    if (scope.device) return { ...p, perDevice: { ...p.perDevice, [scope.device]: id } };
    if (scope.project) return { ...p, perProject: { ...p.perProject, [scope.project]: id } };
    return { ...p, defaultExperience: id, disabled: p.disabled.filter((x) => x !== id) };
  },
  customize(p: Prefs, reg: ExperienceRegistry, entry: RegistryEntry, overrides: Record<string, unknown>): Prefs {
    const base = reg.baseManifest(entry.baseId);
    if (!base) return p;
    const clean = sanitizeOverrides(base, overrides);
    if (entry.origin === 'variant') {
      return {
        ...p,
        variants: p.variants.map((v) => (v.id === entry.id ? { ...v, overrides: clean, updatedAt: new Date().toISOString(), version: bump(v.version) } : v)),
      };
    }
    return { ...p, overrides: { ...p.overrides, [entry.id]: clean } };
  },
  reset(p: Prefs, entry: RegistryEntry): Prefs {
    if (entry.origin === 'variant') return { ...p, variants: p.variants.map((v) => (v.id === entry.id ? { ...v, overrides: {} } : v)) };
    const { [entry.id]: _drop, ...rest } = p.overrides;
    void _drop;
    return { ...p, overrides: rest };
  },
  duplicate(p: Prefs, entry: RegistryEntry, name: string, overrides = entry.overrides): { prefs: Prefs; id: string } {
    const id = uniqueId(p, `${entry.baseId}-v`);
    const now = new Date().toISOString();
    const v: VariantRecord = {
      id, baseId: entry.baseId, name: name.slice(0, 60), description: `Variante de ${entry.manifest.name}`, overrides, version: '1.0.0', createdAt: now, updatedAt: now, status: 'draft',
    };
    return { prefs: { ...p, variants: [...p.variants, v] }, id };
  },
  publish(p: Prefs, id: string): Prefs {
    return { ...p, variants: p.variants.map((v) => (v.id === id ? { ...v, status: 'published' } : v)) };
  },
  remove(p: Prefs, entry: RegistryEntry): Prefs {
    if (entry.origin === 'builtin') throw new Error('Une expérience intégrée ne peut pas être supprimée : désactivez-la.');
    if (p.defaultExperience === entry.id) throw new Error('Choisissez une autre expérience par défaut avant de supprimer celle-ci.');
    const clean = (rec: Record<string, string>) => Object.fromEntries(Object.entries(rec).filter(([, v]) => v !== entry.id));
    return {
      ...p,
      variants: p.variants.filter((v) => v.id !== entry.id),
      favorites: p.favorites.filter((x) => x !== entry.id),
      hidden: p.hidden.filter((x) => x !== entry.id),
      disabled: p.disabled.filter((x) => x !== entry.id),
      perProject: clean(p.perProject),
      perDevice: clean(p.perDevice as Record<string, string>),
      lastExperience: p.lastExperience === entry.id ? undefined : p.lastExperience,
    };
  },
};

function bump(v: string) {
  const [a, b, c] = v.split('-')[0].split('.').map(Number);
  return `${a}.${b}.${(c || 0) + 1}`;
}

function uniqueId(p: Prefs, prefix: string) {
  let i = p.variants.length + 1;
  while (p.variants.some((v) => v.id === `${prefix}${i}`)) i++;
  return `${prefix}${i}`;
}

/* ---------- import / export (data only, never code) ---------- */

const variantSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9.-]{2,63}$/),
    baseId: z.string(),
    name: z.string().min(1).max(60),
    description: z.string().max(400),
    overrides: z.record(z.string(), z.union([z.string().max(64), z.number(), z.boolean()])),
    themeId: z.string().optional(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: z.enum(['draft', 'published']),
  })
  .strict();

export const bundleSchema = z
  .object({
    format: z.literal('mag.experience-bundle'),
    version: z.literal(1),
    exportedAt: z.string(),
    variants: z.array(variantSchema).max(50),
    themes: z.array(themeSchema).max(20),
  })
  .strict();

export type Bundle = z.infer<typeof bundleSchema>;

export function exportBundle(p: Prefs, ids?: string[]): Bundle {
  return {
    format: 'mag.experience-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    variants: p.variants.filter((v) => !ids || ids.includes(v.id)) as Bundle['variants'],
    themes: p.customThemes,
  };
}

export interface ImportResult {
  prefs: Prefs;
  added: string[];
  themes: string[];
  rejected: string[];
}

/**
 * Imports a bundle. Rejects anything that is not declared data: unknown keys,
 * code-like strings, variants of experiences that are not installed.
 */
export function importBundle(p: Prefs, reg: ExperienceRegistry, raw: unknown): ImportResult {
  const text = JSON.stringify(raw ?? null);
  if (/<\s*script|javascript:|\bon[a-z]+\s*=|url\s*\(|@import|expression\s*\(/i.test(text)) {
    throw new Error('Fichier refusé : il contient du contenu exécutable ou des références externes.');
  }
  const parsed = bundleSchema.safeParse(raw);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new Error(`Fichier non conforme (${i?.path.join('.') || 'racine'} : ${i?.message}).`);
  }
  let next = p;
  const added: string[] = [];
  const rejected: string[] = [];
  for (const v of parsed.data.variants) {
    const base = reg.baseManifest(v.baseId);
    if (!base) {
      rejected.push(`${v.name} : l’expérience de base « ${v.baseId} » n’est pas installée`);
      continue;
    }
    const id = next.variants.some((x) => x.id === v.id) || reg.hasBase(v.id) ? uniqueId(next, `${v.baseId}-v`) : v.id;
    next = { ...next, variants: [...next.variants, { ...v, id, status: 'draft', overrides: sanitizeOverrides(base, v.overrides) }] };
    added.push(id);
  }
  const themes: string[] = [];
  for (const t of parsed.data.themes) {
    const exists = next.customThemes.some((x) => x.id === t.id) || ['plan', 'atelier-nuit', 'contraste'].includes(t.id);
    const theme: Theme = { ...t, id: exists ? `${t.id}-${next.customThemes.length + 1}` : t.id, builtin: false };
    next = { ...next, customThemes: [...next.customThemes, theme] };
    themes.push(theme.id);
  }
  return { prefs: next, added, themes, rejected };
}
