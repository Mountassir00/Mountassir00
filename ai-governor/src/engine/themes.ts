/**
 * Themes are pure data (Category A customisation). Every value is validated:
 * colours must be colour literals, fonts come from an allow-list, sizes are
 * clamped. A theme can therefore never inject CSS or script.
 */
import { z } from 'zod';
import { isSafeColor } from './manifest';

const color = z.string().refine(isSafeColor, 'couleur invalide');

export const FONT_STACKS = {
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
    radius: z.number().min(0).max(14),
    stroke: z.number().min(0.5).max(2),
    shadow: z.enum(['none', 'soft', 'crisp']),
  }),
  surface: z.object({
    grid: z.enum(['none', 'dots', 'lines', 'plan']),
    gridSize: z.number().min(8).max(64),
    /** Subtle paper grain, drawn once by the browser (skipped at minimal/eco quality). */
    texture: z.enum(['none', 'paper']).optional(),
  }),
  density: z.enum(['compact', 'comfortable', 'spacious']),
});

export type Theme = z.infer<typeof themeSchema>;

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

export const BUILTIN_THEMES: Theme[] = [PLAN, ATELIER_NUIT, CONTRASTE];

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** Converts a validated theme to CSS custom properties. */
export function themeToCssVars(t: Theme): Record<string, string> {
  const v: Record<string, string> = {};
  for (const [k, val] of Object.entries(t.colors)) v[`--c-${kebab(k)}`] = val;
  for (const [k, val] of Object.entries(t.status)) v[`--st-${k}`] = val;
  for (const [k, val] of Object.entries(t.nature)) v[`--nat-${k}`] = val;
  for (const [k, val] of Object.entries(t.pastel)) v[`--${k}`] = val;
  for (const [k, val] of Object.entries(t.series)) v[`--series-${k.slice(1)}`] = val;
  v['--font-ui'] = FONT_STACKS[t.type.ui];
  v['--font-mono'] = MONO_STACKS[t.type.mono];
  v['--fs-base'] = `${t.type.basePx}px`;
  v['--radius'] = `${t.shape.radius}px`;
  v['--radius-lg'] = `${Math.round(t.shape.radius * 1.6)}px`;
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
  el.dataset.density = t.density;
  el.style.colorScheme = t.scheme;
}

export function validateTheme(input: unknown): { ok: true; theme: Theme } | { ok: false; error: string } {
  const r = themeSchema.safeParse(input);
  if (r.success) return { ok: true, theme: { ...r.data, builtin: false } };
  const i = r.error.issues[0];
  return { ok: false, error: `${i?.path.join('.')}: ${i?.message}` };
}
