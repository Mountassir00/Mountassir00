/** Colour utilities for the Studio and the Builder (deterministic, no network, no model call). */

export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split('').map((c) => c + c).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

export function luminance([r, g, b]: [number, number, number]) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio, or null if a colour is not a hex literal. */
export function contrast(a: string, b: string): number | null {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  if (!x || !y) return null;
  const [l1, l2] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a)!;
  const y = hexToRgb(b)!;
  return rgbToHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
}

export function saturation([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return max === 0 ? 0 : (max - min) / max;
}

/** k-means palette extraction on sampled pixels (k ≤ 8). */
export function extractPalette(pixels: Uint8ClampedArray, k = 6): Array<{ hex: string; share: number }> {
  const pts: Array<[number, number, number]> = [];
  const step = Math.max(4, Math.floor(pixels.length / 4 / 6000) * 4);
  for (let i = 0; i + 3 < pixels.length; i += step) if (pixels[i + 3] > 128) pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  if (!pts.length) return [];
  let centers = Array.from({ length: k }, (_, i) => pts[Math.floor((i / k) * pts.length)].slice() as [number, number, number]);
  const assign = new Array(pts.length).fill(0);
  for (let iter = 0; iter < 10; iter++) {
    for (let i = 0; i < pts.length; i++) {
      let best = 0;
      let bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = (pts[i][0] - centers[c][0]) ** 2 + (pts[i][1] - centers[c][1]) ** 2 + (pts[i][2] - centers[c][2]) ** 2;
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
      assign[i] = best;
    }
    centers = centers.map((c, ci) => {
      let n = 0;
      const s = [0, 0, 0];
      for (let i = 0; i < pts.length; i++) if (assign[i] === ci) {
        n++;
        s[0] += pts[i][0];
        s[1] += pts[i][1];
        s[2] += pts[i][2];
      }
      return n ? ([s[0] / n, s[1] / n, s[2] / n] as [number, number, number]) : c;
    });
  }
  const counts = new Array(centers.length).fill(0);
  for (const a of assign) counts[a]++;
  return centers
    .map((c, i) => ({ hex: rgbToHex(...c), share: counts[i] / pts.length }))
    .filter((c) => c.share > 0.01)
    .sort((a, b) => b.share - a.share);
}
