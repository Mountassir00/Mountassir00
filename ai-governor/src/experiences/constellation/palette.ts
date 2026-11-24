/**
 * Scene palette read from the active theme tokens (CSS custom properties on
 * <html>), re-read whenever the theme changes. Canvas 2D cannot use CSS
 * variables directly, so every token is resolved to RGB once here.
 */
import { useEffect, useState } from 'react';
import type { AgentStatus, PastelSlot } from '@sdk';
import type { NodeType } from './model';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Palette {
  dark: boolean;
  bg: Rgb;
  raised: Rgb;
  ink: Rgb;
  inkSoft: Rgb;
  muted: Rgb;
  line: Rgb;
  accent: Rgb;
  focus: Rgb;
  error: Rgb;
  warn: Rgb;
  /** Saturated colour per node type (dark: emissive; light: stroke). */
  type: Record<Exclude<NodeType, 'department' | 'task'>, Rgb>;
  /** Department tones: the theme pastel, kept for light fills… */
  pastel: Record<PastelSlot, Rgb>;
  /** …and a saturated tone of the same hue for glows and strokes. */
  tone: Record<PastelSlot, Rgb>;
  status: Record<AgentStatus, Rgb>;
  font: string;
  /** Changes whenever the palette is re-read (cache key for sprites). */
  stamp: number;
}

export const SLOTS: PastelSlot[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
const STATUSES: AgentStatus[] = ['working', 'waiting', 'collaborating', 'researching', 'validating', 'error', 'paused', 'idle', 'offline'];

let probe: CanvasRenderingContext2D | null = null;

/** Resolves any CSS colour literal to RGB through the canvas parser. */
export function parseColor(value: string, fallback: Rgb): Rgb {
  if (!value) return fallback;
  if (!probe) probe = document.createElement('canvas').getContext('2d');
  if (!probe) return fallback;
  probe.fillStyle = '#010203';
  probe.fillStyle = value;
  const out = String(probe.fillStyle);
  if (out === '#010203' && value.trim().toLowerCase() !== '#010203') return fallback;
  if (out.startsWith('#')) {
    const n = parseInt(out.slice(1, 7), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = out.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map((x) => parseFloat(x));
    return { r, g, b };
  }
  return fallback;
}

export const rgba = (c: Rgb, a = 1) => `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
export const mix = (a: Rgb, b: Rgb, t: number): Rgb => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t });
export const rgbKey = (c: Rgb) => `${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)}`;

function toHsl({ r, g, b }: Rgb): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h / 6, s, l];
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)));
  };
  return { r: f(0), g: f(8), b: f(4) };
}

/** Same hue as a (light or dark) pastel, saturated enough to read as a colour. */
function toneOf(pastel: Rgb, dark: boolean): Rgb {
  const [h, s] = toHsl(pastel);
  return fromHsl(h, Math.min(0.78, Math.max(0.5, s * 1.1 + 0.22)), dark ? 0.64 : 0.52);
}

const FALLBACK = {
  paper: { r: 236, g: 236, b: 239 },
  raised: { r: 255, g: 255, b: 255 },
  ink: { r: 15, g: 15, b: 18 },
  inkSoft: { r: 63, g: 63, b: 70 },
  muted: { r: 98, g: 98, b: 108 },
  line: { r: 226, g: 226, b: 231 },
  accent: { r: 123, g: 63, b: 228 },
  s1: { r: 123, g: 63, b: 228 },
  s2: { r: 217, g: 154, b: 0 },
  s3: { r: 20, g: 160, b: 111 },
  s4: { r: 46, g: 124, b: 246 },
  error: { r: 217, g: 58, b: 69 },
  warn: { r: 183, g: 121, b: 11 },
};

let stampSeq = 0;

export function readPalette(el: HTMLElement = document.documentElement): Palette {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const dark = el.dataset.scheme === 'dark';
  const pastel = Object.fromEntries(SLOTS.map((p) => [p, parseColor(v(`--${p}`), FALLBACK.line)])) as Record<PastelSlot, Rgb>;
  const tone = Object.fromEntries(SLOTS.map((p) => [p, toneOf(pastel[p], dark)])) as Record<PastelSlot, Rgb>;
  const accent = parseColor(v('--c-accent'), FALLBACK.accent);
  const ink = parseColor(v('--c-ink'), FALLBACK.ink);
  // Series tokens are tuned for charts on both schemes; lift them a little on dark backgrounds so points glow.
  const lift = (c: Rgb) => (dark ? mix(c, { r: 255, g: 255, b: 255 }, 0.18) : c);
  return {
    dark,
    bg: parseColor(v('--c-paper'), FALLBACK.paper),
    raised: parseColor(v('--c-raised'), FALLBACK.raised),
    ink,
    inkSoft: parseColor(v('--c-ink-soft'), FALLBACK.inkSoft),
    muted: parseColor(v('--c-ink-muted'), FALLBACK.muted),
    line: parseColor(v('--c-line'), FALLBACK.line),
    accent,
    focus: parseColor(v('--c-focus'), accent),
    error: parseColor(v('--st-error'), FALLBACK.error),
    warn: parseColor(v('--st-waiting'), FALLBACK.warn),
    type: {
      governor: dark ? mix(accent, { r: 255, g: 255, b: 255 }, 0.35) : ink,
      agent: lift(parseColor(v('--series-4'), FALLBACK.s4)),
      model: lift(parseColor(v('--series-1'), FALLBACK.s1)),
      tool: lift(parseColor(v('--series-2'), FALLBACK.s2)),
      data: lift(parseColor(v('--series-3'), FALLBACK.s3)),
    },
    pastel,
    tone,
    status: Object.fromEntries(STATUSES.map((s) => [s, parseColor(v(`--st-${s}`), FALLBACK.muted)])) as Record<AgentStatus, Rgb>,
    font: v('--font-ui') || 'system-ui, sans-serif',
    stamp: ++stampSeq,
  };
}

/** Current palette, refreshed when the theme engine rewrites the tokens on <html>. */
export function usePalette(): Palette | null {
  const [p, setP] = useState<Palette | null>(null);
  useEffect(() => {
    const el = document.documentElement;
    let raf = 0;
    let sig = '';
    // Only re-read when a token we use actually changed (other code may touch <html style>).
    const signature = () => {
      const cs = getComputedStyle(el);
      return [el.dataset.scheme, '--c-paper', '--c-ink', '--c-accent', '--series-1', '--series-2', '--series-3', '--series-4', '--p1', '--p5', '--st-error', '--font-ui']
        .map((k, i) => (i === 0 ? k : cs.getPropertyValue(k as string)))
        .join('|');
    };
    const refresh = () => {
      const next = signature();
      if (next === sig) return;
      sig = next;
      setP(readPalette(el));
    };
    refresh();
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(refresh);
    });
    mo.observe(el, { attributes: true, attributeFilter: ['style', 'data-scheme', 'class'] });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, []);
  return p;
}
