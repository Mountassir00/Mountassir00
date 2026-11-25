/**
 * Themes are pure data (Category A customisation). Every value is validated:
 * colours must be colour literals, fonts come from an allow-list, sizes are
 * clamped. A theme can therefore never inject CSS or script.
 */
import { z } from 'zod';
import { isSafeColor } from './manifest';

const color = z.string().refine(isSafeColor, 'couleur invalide');

export const FONT_STACKS = {
  jakarta: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
  archivo: "'Archivo Variable', 'Archivo', system-ui, sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  humanist: "'Gill Sans', 'Gill Sans MT', Seravek, 'Trebuchet MS', sans-serif",
  serif: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
} as const;
export const MONO_STACKS = {
  plex: "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
  system: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace",
} as const;

export const themeSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,40}$/),
  name: z.string().min(2).max(40),
  scheme: z.enum(['light', 'dark']),
  builtin: z.boolean().optional(),
  colors: z.object({
    paper: color, raised: color, sunken: color, ink: color, inkSoft: color, inkMuted: color, line: color, grid: color, gridMajor: color,
    accent: color, accentInk: color, focus: color,
    /** Selected item (pill, tab, nav): black on light themes, white on dark. Defaults to ink/raised. */
    active: color.optional(), activeInk: color.optional(),
  }),
  status: z.object({
    working: color, waiting: color, collaborating: color, researching: color, validating: color, error: color, paused: color, idle: color, offline: color,
  }),
  nature: z.object({ real: color, estimated: color, demo: color, unavailable: color, planned: color, historical: color }),
  pastel: z.object({ p1: color, p2: color, p3: color, p4: color, p5: color, p6: color, p7: color, p8: color }),
  series: z.object({ s1: color, s2: color, s3: color, s4: color }),
  type: z.object({
    ui: z.enum(Object.keys(FONT_STACKS) as [keyof typeof FONT_STACKS]),
    mono: z.enum(Object.keys(MONO_STACKS) as [keyof typeof MONO_STACKS]),
    basePx: z.number().min(12).max(18),
  }),
  shape: z.object({
    radius: z.number().min(0).max(32),
    stroke: z.number().min(0.5).max(2),
    shadow: z.enum(['none', 'soft', 'crisp']),
  }),
  surface: z.object({
    grid: z.enum(['none', 'dots', 'lines', 'plan']),
    gridSize: z.number().min(8).max(64),
    /** Subtle paper grain, drawn once by the browser (skipped at minimal/eco quality). */
    texture: z.enum(['none', 'paper']).optional(),
    /** Translucent, blurred cards over a glowing canvas (more GPU: off at minimal/eco). */
    glass: z.boolean().optional(),
  }),
  density: z.enum(['compact', 'comfortable', 'spacious']),
});

export type Theme = z.infer<typeof themeSchema>;

/** Default light theme: soft grey canvas, white cards, black selection, violet signal. */
const LUMIERE: Theme = {
  id: 'lumiere',
  name: 'Lumière',
  scheme: 'light',
  builtin: true,
  colors: {
    paper: '#ECECEF', raised: '#FFFFFF', sunken: '#F4F4F6', ink: '#0F0F12', inkSoft: '#3F3F46', inkMuted: '#62626C',
    line: '#E2E2E7', grid: '#E3E3E8', gridMajor: '#D6D6DD', accent: '#7B3FE4', accentInk: '#FFFFFF', focus: '#7B3FE4',
    active: '#111114', activeInk: '#FFFFFF',
  },
  status: {
    working: '#2E6FE0', waiting: '#B7790B', collaborating: '#7B3FE4', researching: '#0E8A86', validating: '#13915F', error: '#D93A45',
    paused: '#62626C', idle: '#9A9AA5', offline: '#C4C4CC',
  },
  nature: { real: '#13915F', estimated: '#B7790B', demo: '#7B3FE4', unavailable: '#8A8A94', planned: '#2E6FE0', historical: '#62626C' },
  pastel: { p1: '#D9F2E4', p2: '#DCE8FB', p3: '#E9E0FB', p4: '#FBE6D5', p5: '#F8EFC3', p6: '#F9DDE6', p7: '#E4EED9', p8: '#D6F0F0' },
  series: { s1: '#7B3FE4', s2: '#D99A00', s3: '#14A06F', s4: '#2E7CF6' },
  type: { ui: 'jakarta', mono: 'plex', basePx: 14 },
  shape: { radius: 20, stroke: 1, shadow: 'soft' },
  surface: { grid: 'dots', gridSize: 22 },
  density: 'comfortable',
};

/** Default dark theme: deep black, graphite cards, white selection. */
const ONYX: Theme = {
  id: 'onyx',
  name: 'Onyx',
  scheme: 'dark',
  builtin: true,
  colors: {
    paper: '#050506', raised: '#151517', sunken: '#1E1E21', ink: '#F5F5F7', inkSoft: '#CACAD2', inkMuted: '#9696A0',
    line: '#2A2A2F', grid: '#141416', gridMajor: '#232327', accent: '#A47BFF', accentInk: '#0F0F12', focus: '#B794FF',
    active: '#FFFFFF', activeInk: '#0F0F12',
  },
  status: {
    working: '#5B9BFF', waiting: '#E9B53A', collaborating: '#A47BFF', researching: '#3CC4C0', validating: '#3DD68C', error: '#FF6369',
    paused: '#9696A0', idle: '#6E6E78', offline: '#45454C',
  },
  nature: { real: '#3DD68C', estimated: '#E9B53A', demo: '#A47BFF', unavailable: '#9696A0', planned: '#5B9BFF', historical: '#CACAD2' },
  pastel: { p1: '#1D3A2D', p2: '#1E2E4A', p3: '#2E2350', p4: '#43301F', p5: '#3F3820', p6: '#45232F', p7: '#2C3A23', p8: '#1C3B3C' },
  series: { s1: '#9A6BFF', s2: '#C98500', s3: '#199E70', s4: '#3987E5' },
  type: { ui: 'jakarta', mono: 'plex', basePx: 14 },
  shape: { radius: 20, stroke: 1, shadow: 'none' },
  surface: { grid: 'dots', gridSize: 22 },
  density: 'comfortable',
};

/** Deep green, translucent cards over a soft glow. */
const NEXUS: Theme = {
  id: 'nexus',
  name: 'Nexus',
  scheme: 'dark',
  builtin: true,
  colors: {
    paper: '#0B1310', raised: '#16211DE6', sunken: '#1E2B26', ink: '#EEF5F1', inkSoft: '#C3D3CB', inkMuted: '#93A79D',
    line: '#2A3A33', grid: '#101A16', gridMajor: '#1B2823', accent: '#46C08F', accentInk: '#06110C', focus: '#7DDCB4',
    active: '#46C08F', activeInk: '#06110C',
  },
  status: {
    working: '#5B9BFF', waiting: '#E9C25A', collaborating: '#9A8CF8', researching: '#46C0B8', validating: '#46C08F', error: '#FF6B6B',
    paused: '#93A79D', idle: '#6B7F75', offline: '#3F4F48',
  },
  nature: { real: '#46C08F', estimated: '#E9C25A', demo: '#9A8CF8', unavailable: '#93A79D', planned: '#5B9BFF', historical: '#C3D3CB' },
  pastel: { p1: '#1F3D31', p2: '#1F3046', p3: '#2B2A4D', p4: '#3E3324', p5: '#38391F', p6: '#40262F', p7: '#29391F', p8: '#1C3A3B' },
  series: { s1: '#9A6BFF', s2: '#C98500', s3: '#199E70', s4: '#3987E5' },
  type: { ui: 'jakarta', mono: 'plex', basePx: 14 },
  shape: { radius: 22, stroke: 1, shadow: 'none' },
  surface: { grid: 'dots', gridSize: 22, glass: true },
  density: 'comfortable',
};

const PLAN: Theme = {
  id: 'plan',
  name: 'Plan d’atelier',
  scheme: 'light',
  builtin: true,
  colors: {
    paper: '#EEF2F5', raised: '#FBFCFD', sunken: '#E3E9EE', ink: '#16203A', inkSoft: '#3A4660', inkMuted: '#5A6580',
    line: '#BFC9D6', grid: '#DDE4EB', gridMajor: '#CBD5DF', accent: '#3A3FD4', accentInk: '#FFFFFF', focus: '#3A3FD4',
  },
  status: {
    working: '#1F74D6', waiting: '#B2700F', collaborating: '#8A45C8', researching: '#0E8585', validating: '#2B8048', error: '#CF2F3C',
    paused: '#5E6779', idle: '#8D99AD', offline: '#B9C2CF',
  },
  nature: { real: '#2B8048', estimated: '#B2700F', demo: '#8A45C8', unavailable: '#7E889C', planned: '#1F74D6', historical: '#5A6580' },
  pastel: { p1: '#CDEBDC', p2: '#D2E3F7', p3: '#E1DAF7', p4: '#F9DEC7', p5: '#F3E8B6', p6: '#F4D2DC', p7: '#DBE6CF', p8: '#CCEAEB' },
  series: { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', s4: '#eda100' },
  type: { ui: 'archivo', mono: 'plex', basePx: 14 },
  shape: { radius: 6, stroke: 1, shadow: 'soft' },
  surface: { grid: 'plan', gridSize: 24 },
  density: 'comfortable',
};

const ATELIER_NUIT: Theme = {
  id: 'atelier-nuit',
  name: 'Atelier de nuit',
  scheme: 'dark',
  builtin: true,
  colors: {
    paper: '#0F1A2E', raised: '#16243D', sunken: '#0B1424', ink: '#E7EDF6', inkSoft: '#BCC7D8', inkMuted: '#8F9DB4',
    line: '#2E3F5E', grid: '#172640', gridMajor: '#1F3152', accent: '#8C93FF', accentInk: '#0F1A2E', focus: '#A9AEFF',
  },
  status: {
    working: '#5AA5F5', waiting: '#E0A43C', collaborating: '#B88BEF', researching: '#3CC4C0', validating: '#56C27A', error: '#F06470',
    paused: '#8F9DB4', idle: '#6E7C95', offline: '#4A5873',
  },
  nature: { real: '#56C27A', estimated: '#E0A43C', demo: '#B88BEF', unavailable: '#8F9DB4', planned: '#5AA5F5', historical: '#BCC7D8' },
  pastel: { p1: '#2B4A40', p2: '#28405F', p3: '#3A3560', p4: '#523C2E', p5: '#4C4528', p6: '#513141', p7: '#37472F', p8: '#264A4D' },
  series: { s1: '#3987e5', s2: '#d95926', s3: '#199e70', s4: '#c98500' },
  type: { ui: 'archivo', mono: 'plex', basePx: 14 },
  shape: { radius: 6, stroke: 1, shadow: 'none' },
  surface: { grid: 'plan', gridSize: 24 },
  density: 'comfortable',
};

const CONTRASTE: Theme = {
  id: 'contraste',
  name: 'Contraste élevé',
  scheme: 'light',
  builtin: true,
  colors: {
    paper: '#FFFFFF', raised: '#FFFFFF', sunken: '#F1F1F1', ink: '#000000', inkSoft: '#1A1A1A', inkMuted: '#333333',
    line: '#000000', grid: '#E6E6E6', gridMajor: '#CCCCCC', accent: '#0000C8', accentInk: '#FFFFFF', focus: '#0000C8',
  },
  status: {
    working: '#0047B3', waiting: '#7A4A00', collaborating: '#5B1F99', researching: '#00605F', validating: '#0B5A24', error: '#A8000F',
    paused: '#333333', idle: '#555555', offline: '#777777',
  },
  nature: { real: '#0B5A24', estimated: '#7A4A00', demo: '#5B1F99', unavailable: '#555555', planned: '#0047B3', historical: '#333333' },
  pastel: { p1: '#E8F5EE', p2: '#E7F0FB', p3: '#EFEBFB', p4: '#FCEEE3', p5: '#FAF4DA', p6: '#FAE8EE', p7: '#EDF3E7', p8: '#E6F5F5' },
  series: { s1: '#1c5cab', s2: '#b8461d', s3: '#0f7a52', s4: '#8a5d00' },
  type: { ui: 'archivo', mono: 'plex', basePx: 15 },
  shape: { radius: 2, stroke: 1.5, shadow: 'none' },
  surface: { grid: 'none', gridSize: 24 },
  density: 'comfortable',
};

/** Index 0 = default light, index 1 = default dark (used by the "automatic" setting). */
export const BUILTIN_THEMES: Theme[] = [LUMIERE, ONYX, NEXUS, PLAN, ATELIER_NUIT, CONTRASTE];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Converts a validated theme to CSS custom properties. */
export function themeToCssVars(t: Theme): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(t.colors)) if (val) v[`--c-${kebab(k)}`] = val;
  v['--c-active'] = t.colors.active ?? t.colors.ink;
  v['--c-active-ink'] = t.colors.activeInk ?? t.colors.raised;
  for (const [k, val] of Object.entries(t.status)) v[`--st-${k}`] = val;
  for (const [k, val] of Object.entries(t.nature)) v[`--nat-${k}`] = val;
  for (const [k, val] of Object.entries(t.pastel)) v[`--${k}`] = val;
  for (const [k, val] of Object.entries(t.series)) v[`--series-${k.slice(1)}`] = val;
  v['--font-ui'] = FONT_STACKS[t.type.ui];
  v['--font-mono'] = MONO_STACKS[t.type.mono];
  v['--fs-base'] = `${t.type.basePx}px`;
  // radius = cards; small controls use a proportional radius; pills stay round.
  v['--radius-lg'] = `${t.shape.radius}px`;
  v['--radius'] = `${Math.max(2, Math.round(t.shape.radius * 0.6))}px`;
  v['--radius-sm'] = `${Math.max(2, Math.round(t.shape.radius * 0.4))}px`;
  v['--stroke'] = `${t.shape.stroke}px`;
  v['--shadow'] =
    t.shape.shadow === 'none' ? 'none' : t.shape.shadow === 'crisp' ? '2px 2px 0 color-mix(in oklab, var(--c-ink) 22%, transparent)' : '0 1px 2px color-mix(in oklab, var(--c-ink) 10%, transparent), 0 6px 18px -8px color-mix(in oklab, var(--c-ink) 22%, transparent)';
  v['--grid-size'] = `${t.surface.gridSize}px`;
  v['--space'] = t.density === 'compact' ? '6px' : t.density === 'spacious' ? '12px' : '8px';
  return v;
}

export function applyTheme(t: Theme, el: HTMLElement) {
  for (const [k, val] of Object.entries(themeToCssVars(t))) el.style.setProperty(k, val);
  el.dataset.scheme = t.scheme;
  el.dataset.grid = t.surface.grid;
  el.dataset.texture = t.surface.texture ?? 'none';
  el.dataset.glass = t.surface.glass ? 'true' : 'false';
  el.dataset.density = t.density;
  el.style.colorScheme = t.scheme;
}

export function validateTheme(input: unknown): { ok: true; theme: Theme } | { ok: false; error: string } {
  const r = themeSchema.safeParse(input);
  if (r.success) return { ok: true, theme: { ...r.data, builtin: false } };
  const i = r.error.issues[0];
  return { ok: false, error: `${i?.path.join('.')}: ${i?.message}` };
}
