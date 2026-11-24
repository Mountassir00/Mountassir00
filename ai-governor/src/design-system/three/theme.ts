/**
 * Theme bridge: reads the design tokens (CSS custom properties injected by the
 * theme engine on <html>) and turns them into a palette usable by Three.js.
 * The 3D scene therefore follows Lumière / Onyx / Nexus and any custom theme,
 * and is re-coloured live when the theme changes (MutationObserver, no polling).
 */
import { useEffect, useState } from 'react';
import { Color } from 'three';
import type { AgentStatus } from '@sdk';

export type Scheme = 'light' | 'dark';

export interface ScenePalette {
  scheme: Scheme;
  /** Clear colour = floor colour far away. */
  background: Color;
  floor: Color;
  /** Room slab (slightly lifted, lighter than the floor in light themes). */
  slab: Color;
  grid: Color;
  gridMajor: Color;
  ink: Color;
  inkSoft: Color;
  line: Color;
  raised: Color;
  accent: Color;
  /** Cyan used for robot eyes and "tech" glows (constant across themes, tuned per scheme). */
  glow: Color;
  status: Record<AgentStatus, Color>;
  /** Pastel slots p1…p8 (department tones). */
  pastel: Record<string, Color>;
  /** Saturated version of each pastel slot, for accents on dark floors. */
  tone: Record<string, Color>;
  /** CSS strings (for canvases and HTML overlays). */
  css: {
    ink: string; inkSoft: string; inkMuted: string; raised: string; sunken: string; line: string; accent: string; paper: string;
    status: Record<AgentStatus, string>; pastel: Record<string, string>; font: string; mono: string;
  };
}

const STATUSES: AgentStatus[] = ['working', 'waiting', 'collaborating', 'researching', 'validating', 'error', 'paused', 'idle', 'offline'];
const SLOTS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

const FALLBACK: Record<string, string> = {
  '--c-paper': '#ececef', '--c-raised': '#ffffff', '--c-sunken': '#f4f4f6', '--c-ink': '#0f0f12', '--c-ink-soft': '#3f3f46', '--c-ink-muted': '#62626c',
  '--c-line': '#e2e2e7', '--c-grid': '#e3e3e8', '--c-grid-major': '#d6d6dd', '--c-accent': '#7b3fe4',
  '--st-working': '#2e6fe0', '--st-waiting': '#b7790b', '--st-collaborating': '#7b3fe4', '--st-researching': '#0e8a86', '--st-validating': '#13915f',
  '--st-error': '#d93a45', '--st-paused': '#62626c', '--st-idle': '#9a9aa5', '--st-offline': '#c4c4cc',
  '--p1': '#d9f2e4', '--p2': '#dce8fb', '--p3': '#e9e0fb', '--p4': '#fbe6d5', '--p5': '#f8efc3', '--p6': '#f9dde6', '--p7': '#e4eed9', '--p8': '#d6f0f0',
};

/** Parses #rgb, #rrggbb, #rrggbbaa (alpha dropped), rgb()/hsl() via Three. Never throws. */
export function parseColor(input: string | undefined, fallback = '#888888'): Color {
  const v = (input ?? '').trim();
  const c = new Color();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((x) => x + x).join('');
    if (h.length === 8) h = h.slice(0, 6);
    if (h.length === 6) return c.setHex(parseInt(h, 16));
  }
  if (/^(rgb|hsl)a?\(/i.test(v)) {
    try {
      return c.setStyle(v.replace(/\s*\/\s*[\d.]+%?\s*\)$/, ')'));
    } catch {
      /* fall through */
    }
  }
  return c.set(fallback);
}

const mix = (a: Color, b: Color, t: number) => a.clone().lerp(b, t);

/** Builds a saturated accent from a pastel (keeps the hue, raises saturation, sets lightness). */
function toneOf(pastel: Color, dark: boolean): Color {
  const hsl = { h: 0, s: 0, l: 0 };
  pastel.getHSL(hsl);
  return new Color().setHSL(hsl.h, Math.min(0.75, Math.max(0.45, hsl.s * 1.1 + 0.2)), dark ? 0.62 : 0.56);
}

export function readScenePalette(el: HTMLElement = document.documentElement): ScenePalette {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim() || FALLBACK[name];
  const dark = el.dataset.scheme === 'dark';
  const paper = parseColor(v('--c-paper'));
  const raised = parseColor(v('--c-raised'));
  const sunken = parseColor(v('--c-sunken'));
  const ink = parseColor(v('--c-ink'));
  const line = parseColor(v('--c-line'));
  const gridMajor = parseColor(v('--c-grid-major'));
  const accent = parseColor(v('--c-accent'));
  const status = Object.fromEntries(STATUSES.map((s) => [s, parseColor(v(`--st-${s}`))])) as Record<AgentStatus, Color>;
  const pastel = Object.fromEntries(SLOTS.map((p) => [p, parseColor(v(`--${p}`))]));
  const tone = Object.fromEntries(SLOTS.map((p) => [p, toneOf(pastel[p], dark)]));
  const floor = dark ? mix(paper, sunken, 0.55) : mix(raised, sunken, 0.62);
  const slab = dark ? mix(paper, sunken, 0.9) : mix(raised, sunken, 0.15);
  return {
    scheme: dark ? 'dark' : 'light',
    background: floor.clone(),
    floor,
    slab,
    grid: dark ? mix(floor, line, 0.55) : mix(floor, gridMajor, 0.75),
    gridMajor: dark ? mix(floor, line, 1) : mix(floor, ink, 0.12),
    ink,
    inkSoft: parseColor(v('--c-ink-soft')),
    line,
    raised,
    accent,
    glow: new Color(dark ? '#62f0ff' : '#2fd4f0'),
    status,
    pastel,
    tone,
    css: {
      ink: v('--c-ink'), inkSoft: v('--c-ink-soft'), inkMuted: v('--c-ink-muted'), raised: v('--c-raised'), sunken: v('--c-sunken'), line: v('--c-line'),
      accent: v('--c-accent'), paper: v('--c-paper'),
      status: Object.fromEntries(STATUSES.map((s) => [s, v(`--st-${s}`)])) as Record<AgentStatus, string>,
      pastel: Object.fromEntries(SLOTS.map((p) => [p, v(`--${p}`)])),
      font: cs.getPropertyValue('--font-ui').trim() || 'system-ui, sans-serif',
      mono: cs.getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace',
    },
  };
}

/** Calls `cb` (debounced to one frame) whenever the theme on <html> changes. Returns a disposer. */
export function observeTheme(cb: () => void, el: HTMLElement = document.documentElement): () => void {
  let raf = 0;
  const mo = new MutationObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(cb);
  });
  mo.observe(el, { attributes: true, attributeFilter: ['style', 'data-scheme', 'class'] });
  return () => {
    cancelAnimationFrame(raf);
    mo.disconnect();
  };
}

/** React hook: the current scene palette, refreshed on theme change. */
export function useScenePalette(): ScenePalette {
  const [p, setP] = useState<ScenePalette>(() => readScenePalette());
  useEffect(
    () =>
      observeTheme(() => {
        const next = readScenePalette();
        // keep the same object when nothing visible changed (avoids rebuilding scenes)
        setP((prev) => (paletteSignature(prev) === paletteSignature(next) ? prev : next));
      }),
    [],
  );
  return p;
}

/** Stable string identifying a palette (scheme + every CSS colour used). */
export function paletteSignature(p: ScenePalette): string {
  return `${p.scheme}|${JSON.stringify(p.css)}`;
}

/** Toy-plastic body colour from a catalog avatar hue (0–360). */
export function hueColor(hue: number, scheme: Scheme = 'light', sat = 0.66, light = 0.54): Color {
  return new Color().setHSL(((hue % 360) + 360) % 360 / 360, sat, scheme === 'dark' ? light + 0.04 : light);
}

/** CSS colour for an agent hue, readable on the current scheme (tags in logs, minimap dots). */
export function hueCss(hue: number, scheme: Scheme = 'light'): string {
  return `hsl(${Math.round(hue)} 62% ${scheme === 'dark' ? 66 : 42}%)`;
}
