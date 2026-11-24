import type { Layout, LayoutZone } from '../model';
import { ZONE_COLORS } from './layout';

/** Rendu SVG d'une implantation (UI, exports PDF/DOCX, partage). */
export function renderLayoutSvg(layout: Layout, opts: { scale?: number; title?: string; dark?: boolean } = {}): string {
  const k = opts.scale ?? 10; // px par mètre
  const pad = 20;
  const W = layout.canvas.width * k + pad * 2;
  const legendH = 120;
  const H = layout.canvas.height * k + pad * 2 + legendH;
  const ink = opts.dark ? '#E9EDF5' : '#13203A';
  const paper = opts.dark ? '#0E1626' : '#FFFFFF';
  const X = (m: number) => pad + m * k;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Inter, Arial, sans-serif">`);
  parts.push(`<rect width="${W}" height="${H}" fill="${paper}"/>`);
  parts.push(`<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${ink}"/></marker>
  <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${ink}" stroke-opacity="0.15" stroke-width="2"/></pattern></defs>`);

  for (const s of layout.spaces) {
    parts.push(`<rect x="${X(s.x)}" y="${X(s.y)}" width="${s.w * k}" height="${s.h * k}" fill="url(#hatch)" stroke="${ink}" stroke-width="1.5"/>`);
    parts.push(`<text x="${X(s.x) + 4}" y="${X(s.y) - 5}" font-size="11" fill="${ink}" font-weight="600">${esc(s.name)} — ${s.w} × ${s.h} m</text>`);
  }
  for (const z of layout.zones) parts.push(zoneSvg(z, k, X, ink));
  for (const f of layout.flows) {
    const color = f.kind === 'secours' ? '#E63946' : f.kind === 'joueurs' ? '#3BA272' : f.kind === 'sortie' ? '#6C757D' : '#2E86AB';
    parts.push(`<line x1="${X(f.from[0])}" y1="${X(f.from[1])}" x2="${X(f.to[0])}" y2="${X(f.to[1])}" stroke="${color}" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#arr)" opacity="0.85"/>`);
  }
  // Échelle
  const sy = H - legendH + 10;
  parts.push(`<line x1="${pad}" y1="${sy}" x2="${pad + 10 * k}" y2="${sy}" stroke="${ink}" stroke-width="2"/><text x="${pad}" y="${sy + 14}" font-size="10" fill="${ink}">10 m</text>`);
  // Légende
  const types = [...new Set(layout.zones.map((z) => z.type))];
  types.forEach((t, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const lx = pad + 90 + col * 190;
    const ly = sy - 6 + row * 18;
    const label = layout.zones.find((z) => z.type === t)!.label.split('(')[0].trim();
    parts.push(`<rect x="${lx}" y="${ly}" width="12" height="12" fill="${ZONE_COLORS[t]}"/><text x="${lx + 16}" y="${ly + 10}" font-size="10" fill="${ink}">${esc(label)}</text>`);
  });
  if (opts.title) parts.push(`<text x="${pad}" y="${H - 12}" font-size="10" fill="${ink}" opacity="0.7">${esc(opts.title)} — implantation indicative, à valider (gestionnaire, sécurité).</text>`);
  parts.push('</svg>');
  return parts.join('\n');
}

function zoneSvg(z: LayoutZone, k: number, X: (m: number) => number, ink: string): string {
  const fill = ZONE_COLORS[z.type];
  const x = X(z.x);
  const y = X(z.y);
  const w = z.w * k;
  const h = z.h * k;
  const out: string[] = [];
  if (z.type === 'terrain') {
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#F7E3CF" stroke="${ink}" stroke-opacity="0.3"/>`);
    out.push(courtLines(z, k, X));
  } else {
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${z.type === 'tribune' ? 0.35 : 0.8}" stroke="${ink}" stroke-opacity="0.4"/>`);
  }
  if (w > 40 && h > 14) {
    const fs = Math.max(8, Math.min(12, w / 14));
    const label = z.label.length * fs * 0.55 > w - 6 ? z.label.split('(')[0].trim() : z.label;
    out.push(`<text x="${x + 4}" y="${y + fs + 3}" font-size="${fs}" fill="${z.type === 'terrain' ? '#13203A' : '#0B1220'}" font-weight="600">${esc(label)}</text>`);
    if (z.type !== 'terrain' && z.type !== 'tribune' && h > 30)
      out.push(`<text x="${x + 4}" y="${y + fs * 2 + 6}" font-size="${fs - 1}" fill="#0B1220" opacity="0.75">${Math.round(z.w * z.h)} m²</text>`);
  }
  return out.join('');
}

function courtLines(z: LayoutZone, k: number, X: (m: number) => number): string {
  const is5 = z.label.includes('5x5');
  const horizontal = z.w >= z.h;
  const L = is5 ? 28 : 15;
  const Wd = is5 ? 15 : 11;
  const cw = (horizontal ? L : Wd) * k;
  const ch = (horizontal ? Wd : L) * k;
  const cx = X(z.x) + (z.w * k - cw) / 2;
  const cy = X(z.y) + (z.h * k - ch) / 2;
  const s = '#13203A';
  const parts = [`<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="#EFC79F" stroke="${s}" stroke-width="1.5"/>`];
  if (is5) {
    if (horizontal) {
      parts.push(`<line x1="${cx + cw / 2}" y1="${cy}" x2="${cx + cw / 2}" y2="${cy + ch}" stroke="${s}"/>`);
      parts.push(`<circle cx="${cx + cw / 2}" cy="${cy + ch / 2}" r="${1.8 * k}" fill="none" stroke="${s}"/>`);
      for (const side of [0, 1]) {
        const bx = side === 0 ? cx : cx + cw;
        const dir = side === 0 ? 1 : -1;
        parts.push(`<rect x="${side === 0 ? bx : bx - 5.8 * k}" y="${cy + ch / 2 - 2.45 * k}" width="${5.8 * k}" height="${4.9 * k}" fill="#E8743B" fill-opacity="0.35" stroke="${s}"/>`);
        parts.push(`<path d="M ${bx} ${cy + 0.9 * k} L ${bx + dir * 2.99 * k} ${cy + 0.9 * k} A ${6.75 * k} ${6.75 * k} 0 0 ${side === 0 ? 1 : 0} ${bx + dir * 2.99 * k} ${cy + ch - 0.9 * k} L ${bx} ${cy + ch - 0.9 * k}" fill="none" stroke="${s}"/>`);
      }
    } else {
      parts.push(`<line x1="${cx}" y1="${cy + ch / 2}" x2="${cx + cw}" y2="${cy + ch / 2}" stroke="${s}"/>`);
      parts.push(`<circle cx="${cx + cw / 2}" cy="${cy + ch / 2}" r="${1.8 * k}" fill="none" stroke="${s}"/>`);
    }
  } else {
    // Demi-terrain 3x3 : panier sur le grand côté, arc à 6,75 m
    const bx = horizontal ? cx : cx + cw / 2;
    const by = horizontal ? cy + ch / 2 : cy;
    parts.push(`<circle cx="${horizontal ? bx + 1.575 * k : bx}" cy="${horizontal ? by : by + 1.575 * k}" r="${0.23 * k}" fill="none" stroke="#E8743B" stroke-width="2"/>`);
    parts.push(
      horizontal
        ? `<path d="M ${cx} ${by - 6.6 * k} A ${6.75 * k} ${6.75 * k} 0 0 1 ${cx} ${by + 6.6 * k}" fill="none" stroke="${s}" transform="translate(${1.575 * k},0)"/>`
        : `<path d="M ${bx - 5.5 * k} ${cy} A ${6.75 * k} ${6.75 * k} 0 0 0 ${bx + 5.5 * k} ${cy}" fill="none" stroke="${s}" transform="translate(0,${1.2 * k})"/>`,
    );
  }
  return parts.join('');
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
