#!/usr/bin/env node
// EVENT LAB — LA GRILLE 3x3 — générateur des plans d'implantation (SVG à l'échelle)
//
// Usage : node assets/plans/generer-plans.mjs            (depuis blueprints/la-grille-3x3/)
//         node generer-plans.mjs ../../event.json        (depuis assets/plans/)
//
// Lit venue.spaces[] et venue.access_points[] de event.json (coordonnées en mètres, origine = angle
// nord-ouest supposé du plateau, x vers l'est, y vers le sud) et écrit, dans le dossier du script :
//   implantation-standard.svg, implantation-economique.svg, implantation-premium.svg,
//   implantation-capacite-max.svg, implantation-secours.svg, circulation.svg, parcours-qualification.svg
// Le parcours reprend la géométrie de l'article 7.2 du règlement (section 12.2 du blueprint), qui fait foi.
//
// Les éléments propres à chaque configuration (surcouches « Δ ») et le gabarit de la salle de repli
// sont des HYPOTHÈSES DE CONCEPTION écrites ci-dessous : ils ne figurent pas (encore) dans event.json.
// Aucun plan produit ici ne vaut validation réglementaire ou technique (avertissement dans chaque cartouche).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfgPath = path.resolve(process.argv[2] ?? path.join(here, '..', '..', 'event.json'));
const config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const venue = config.venue;
const PLAN_VERSION = '1.0';
const PLAN_DATE = '2026-11-24';

const WARNING =
  "IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT. Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).";

const C = {
  ink: '#121417', grid1: '#f1f1f1', grid4: '#d9d9d9', wall: '#121417', floor: '#fbfbf8',
  court: '#f1dfbd', courtLine: '#8a6a32', pw: '#e3ebf6', sc: '#cfd6e0', zd: '#dcecff', pmr: '#9ec5ff',
  al: '#eaf7ea', ph: '#fff3c4', pole: '#FFC629', sec: '#fde2e2', secInk: '#c62828', sp: '#efe6fb',
  free: '#ffffff', tf: '#ececec', annex: '#f4f4f4', delta: '#FF5B1A', exit: '#1a8f3c', tech: '#666666',
  pub: '#1f5fbf', team: '#d97a00', evac: '#1a8f3c', rescue: '#c62828', warn: '#b00020',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n) => (Math.round(n * 100) / 100).toString().replace('.', ',');

function wrap(str, maxChars) {
  const words = String(str).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Fabrique de dessin dans un repère métrique (S px par mètre, origine ox/oy en px). */
function makeCanvas({ S, ox, oy }) {
  const X = (m) => +(ox + m * S).toFixed(2);
  const Y = (m) => +(oy + m * S).toFixed(2);
  const L = (m) => +(m * S).toFixed(2);
  const out = [];
  const api = {
    S, X, Y, L, out,
    raw: (s) => out.push(s),
    rect(x, y, w, h, a = {}) {
      out.push(`<rect x="${X(x)}" y="${Y(y)}" width="${L(w)}" height="${L(h)}" ${attrs(a)}/>`);
    },
    line(x1, y1, x2, y2, a = {}) { out.push(`<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" ${attrs(a)}/>`); },
    circle(x, y, r, a = {}) { out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="${L(r)}" ${attrs(a)}/>`); },
    dot(x, y, rpx, a = {}) { out.push(`<circle cx="${X(x)}" cy="${Y(y)}" r="${rpx}" ${attrs(a)}/>`); },
    text(x, y, s, a = {}) { out.push(`<text x="${X(x)}" y="${Y(y)}" ${attrs({ 'font-size': 11, fill: C.ink, ...a })}>${esc(s)}</text>`); },
    lines(x, y, arr, a = {}, lh = 13) {
      const size = a['font-size'] ?? 11;
      const t = arr.map((s, i) => `<tspan x="${X(x)}" dy="${i === 0 ? 0 : lh}">${esc(s)}</tspan>`).join('');
      out.push(`<text x="${X(x)}" y="${Y(y)}" ${attrs({ 'font-size': size, fill: C.ink, ...a })}>${t}</text>`);
    },
    path(dm, a = {}) { out.push(`<path d="${dm}" ${attrs(a)}/>`); },
    /** Polyligne en mètres avec flèche finale. */
    arrow(pts, color, a = {}) {
      const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0])},${Y(p[1])}`).join(' ');
      out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${a.w ?? 3}" ${a.dash ? `stroke-dasharray="${a.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round" marker-end="url(#arr-${a.marker ?? 'pub'})" opacity="${a.op ?? 0.95}"/>`);
    },
    /** Cote horizontale (en mètres) avec traits de rappel. */
    dimH(x1, x2, y, label, a = {}) {
      const col = a.color ?? '#444';
      out.push(`<line x1="${X(x1)}" y1="${Y(y)}" x2="${X(x2)}" y2="${Y(y)}" stroke="${col}" stroke-width="1" marker-start="url(#tick)" marker-end="url(#tick)"/>`);
      out.push(`<text x="${(X(x1) + X(x2)) / 2}" y="${Y(y) - 4}" text-anchor="middle" font-size="${a.size ?? 10}" fill="${col}">${esc(label)}</text>`);
    },
    dimV(x, y1, y2, label, a = {}) {
      const col = a.color ?? '#444';
      out.push(`<line x1="${X(x)}" y1="${Y(y1)}" x2="${X(x)}" y2="${Y(y2)}" stroke="${col}" stroke-width="1" marker-start="url(#tick)" marker-end="url(#tick)"/>`);
      const cx = X(x) + (a.left ? -5 : 5); const cy = (Y(y1) + Y(y2)) / 2;
      out.push(`<text x="${cx}" y="${cy}" text-anchor="middle" font-size="${a.size ?? 10}" fill="${col}" transform="rotate(-90 ${cx} ${cy})">${esc(label)}</text>`);
    },
  };
  return api;
}
function attrs(a) { return Object.entries(a).map(([k, v]) => `${k}="${esc(v)}"`).join(' '); }

function defs() {
  const mk = (id, color) => `<marker id="arr-${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker>`;
  return `<defs>
  ${mk('pub', C.pub)}${mk('team', C.team)}${mk('evac', C.evac)}${mk('tech', C.tech)}${mk('rescue', C.rescue)}${mk('ink', C.ink)}${mk('delta', C.delta)}
  <marker id="tick" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M5,0 L5,10" stroke="#444" stroke-width="1.5"/></marker>
  <pattern id="hatch-zd" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="${C.zd}"/><line x1="0" y1="0" x2="0" y2="8" stroke="#a9c8f0" stroke-width="2"/></pattern>
  <pattern id="hatch-free" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><rect width="10" height="10" fill="#ffffff"/><line x1="0" y1="0" x2="0" y2="10" stroke="#9fd3ad" stroke-width="2"/></pattern>
  <pattern id="hatch-tf" width="12" height="6" patternUnits="userSpaceOnUse"><rect width="12" height="6" fill="${C.tf}"/><line x1="0" y1="5.5" x2="12" y2="5.5" stroke="#bdbdbd" stroke-width="1"/></pattern>
  <pattern id="hatch-delta" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#fff1ea"/><line x1="0" y1="0" x2="0" y2="9" stroke="#ffb08f" stroke-width="2"/></pattern>
</defs>`;
}

function svgDoc(width, height, title, desc, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Arial, Helvetica, sans-serif" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
${defs()}
<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------------------------
// Dessin d'un terrain 3x3 (tracés SCHÉMATIQUES : cotes officielles à reprendre du règlement FIBA 3x3)
// panier en haut (côté y minimal) : ligne de fond = bord supérieur du rectangle
function court(cv, x, y, w, l, label, opts = {}) {
  cv.rect(x, y, w, l, { fill: C.court, stroke: C.courtLine, 'stroke-width': 2 });
  const cx = x + w / 2; const by = y + 1.575; // centre du panier (schématique)
  const st = { fill: 'none', stroke: C.courtLine, 'stroke-width': 1.3 };
  cv.rect(cx - 2.45, y, 4.9, 5.8, st); // raquette (schématique)
  const half = Math.min(6.6, w / 2 - 0.3); const dy = Math.sqrt(Math.max(0, 6.75 ** 2 - half ** 2));
  cv.path(`M${cv.X(cx - half)},${cv.Y(y)} L${cv.X(cx - half)},${cv.Y(by + dy)} A${cv.L(6.75)},${cv.L(6.75)} 0 0 0 ${cv.X(cx + half)},${cv.Y(by + dy)} L${cv.X(cx + half)},${cv.Y(y)}`, st);
  cv.line(cx - 0.9, y + 1.2, cx + 0.9, y + 1.2, { stroke: C.ink, 'stroke-width': 3 }); // planche
  cv.circle(cx, by, 0.23, { fill: 'none', stroke: C.delta, 'stroke-width': 2 }); // cercle
  cv.text(cx, y + l / 2 + 1.2, label, { 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 'bold' });
  if (opts.sub) cv.lines(cx, y + l / 2 + 2.1, opts.sub, { 'text-anchor': 'middle', 'font-size': 9.5, fill: '#5a4520' }, 11);
  cv.text(cx, y - 0.25, opts.basketNote ?? 'panier latéral — position à relever', { 'text-anchor': 'middle', 'font-size': 9, fill: C.warn });
}

function label(cv, x, y, title, sub, a = {}) {
  cv.text(x, y, title, { 'font-size': a.size ?? 11, 'font-weight': 'bold', 'text-anchor': a.anchor ?? 'start', fill: a.color ?? C.ink });
  if (sub) cv.lines(x, y + (a.lh ?? 0.65), Array.isArray(sub) ? sub : [sub], { 'font-size': a.subSize ?? 9.5, 'text-anchor': a.anchor ?? 'start', fill: a.subColor ?? '#333' }, 11);
}

function deltaTag(cv, x, y, n) {
  cv.dot(x, y, 10, { fill: C.delta, stroke: '#ffffff', 'stroke-width': 1.5 });
  cv.raw(`<text x="${cv.X(x)}" y="${cv.Y(y) + 4}" text-anchor="middle" font-size="11" font-weight="bold" fill="#ffffff">${esc(n)}</text>`);
}
function warnTag(cv, x, y, n) {
  cv.raw(`<path d="M${cv.X(x)},${cv.Y(y) - 11} L${cv.X(x) + 11},${cv.Y(y) + 8} L${cv.X(x) - 11},${cv.Y(y) + 8} z" fill="${C.warn}" stroke="#fff" stroke-width="1.2"/>`);
  cv.raw(`<text x="${cv.X(x)}" y="${cv.Y(y) + 6}" text-anchor="middle" font-size="10" font-weight="bold" fill="#ffffff">${esc(n)}</text>`);
}

// ---------------------------------------------------------------------------------------------
// Éléments communs de mise en page : en-tête, légende, échelle, repère, cartouche
function header(w, title, subtitle) {
  return `<rect x="0" y="0" width="${w}" height="78" fill="${C.ink}"/>
<rect x="0" y="78" width="${w}" height="6" fill="${C.pole}"/>
<text x="28" y="38" font-size="24" font-weight="bold" fill="#ffffff">${esc(title)}</text>
<text x="28" y="62" font-size="13" fill="#e6e6e6">${esc(subtitle)}</text>`;
}

function legendBox(x, y, w, title, items, notesTitle, notes) {
  const out = [];
  let cy = y;
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="10" fill="none"/>`);
  out.push(`<text x="${x}" y="${cy + 14}" font-size="14" font-weight="bold" fill="${C.ink}">${esc(title)}</text>`);
  cy += 28;
  for (const it of items) {
    if (it.kind === 'swatch') out.push(`<rect x="${x}" y="${cy - 10}" width="18" height="12" fill="${it.fill}" stroke="${it.stroke ?? '#777'}" stroke-width="1"/>`);
    else if (it.kind === 'line') out.push(`<line x1="${x}" y1="${cy - 4}" x2="${x + 18}" y2="${cy - 4}" stroke="${it.color}" stroke-width="3" ${it.dash ? `stroke-dasharray="${it.dash}"` : ''} marker-end="url(#arr-${it.marker ?? 'pub'})"/>`);
    else if (it.kind === 'delta') out.push(`<circle cx="${x + 9}" cy="${cy - 4}" r="8" fill="${C.delta}"/><text x="${x + 9}" y="${cy}" text-anchor="middle" font-size="9" font-weight="bold" fill="#fff">${esc(it.n)}</text>`);
    else if (it.kind === 'warn') out.push(`<path d="M${x + 9},${cy - 13} L${x + 18},${cy + 2} L${x},${cy + 2} z" fill="${C.warn}"/><text x="${x + 9}" y="${cy}" text-anchor="middle" font-size="8" font-weight="bold" fill="#fff">${esc(it.n)}</text>`);
    else if (it.kind === 'exit') out.push(`<rect x="${x}" y="${cy - 10}" width="18" height="12" fill="${C.exit}"/>`);
    else if (it.kind === 'access') out.push(`<path d="M${x},${cy - 10} L${x + 18},${cy - 4} L${x},${cy + 2} z" fill="${it.fill ?? C.pub}"/>`);
    const lines = wrap(it.text, it.wrap ?? 52);
    lines.forEach((ln, i) => out.push(`<text x="${x + 26}" y="${cy + i * 12}" font-size="10.5" fill="${C.ink}" ${i === 0 && it.bold ? 'font-weight="bold"' : ''}>${esc(ln)}</text>`));
    cy += Math.max(16, lines.length * 12 + 5);
  }
  if (notes?.length) {
    cy += 8;
    out.push(`<text x="${x}" y="${cy}" font-size="13" font-weight="bold" fill="${C.warn}">${esc(notesTitle)}</text>`);
    cy += 16;
    for (const n of notes) {
      const lines = wrap(n, 58);
      lines.forEach((ln, i) => out.push(`<text x="${x + (i ? 10 : 0)}" y="${cy + i * 12}" font-size="10.5" fill="${C.ink}">${esc((i ? '' : '• ') + ln)}</text>`));
      cy += lines.length * 12 + 4;
    }
  }
  return { svg: out.join('\n'), bottom: cy };
}

function scaleAndNorth(x, y, S, opt = {}) {
  const out = [];
  out.push(`<text x="${x}" y="${y}" font-size="12" font-weight="bold" fill="${C.ink}">Échelle graphique</text>`);
  for (let i = 0; i < 10; i++) out.push(`<rect x="${x + i * S}" y="${y + 8}" width="${S}" height="8" fill="${i % 2 ? '#ffffff' : C.ink}" stroke="${C.ink}" stroke-width="1"/>`);
  out.push(`<text x="${x}" y="${y + 30}" font-size="10" fill="${C.ink}">0</text><text x="${x + 5 * S}" y="${y + 30}" font-size="10" text-anchor="middle" fill="${C.ink}">5</text><text x="${x + 10 * S}" y="${y + 30}" font-size="10" text-anchor="middle" fill="${C.ink}">10 m</text>`);
  out.push(`<text x="${x}" y="${y + 46}" font-size="10" fill="#333">1 m = ${S} px ; quadrillage fin = 1 m, quadrillage marqué = 4 m.</text>`);
  if (opt.localNote) { opt.localNote.forEach((t, i) => out.push(`<text x="${x + 10 * S + 40}" y="${y + 8 + i * 13}" font-size="10.5" fill="#333">${esc(t)}</text>`)); return out.join('\n'); }
  // Repère / nord
  const nx = x + 10 * S + 70, ny = y + 14;
  out.push(`<circle cx="${nx}" cy="${ny}" r="18" fill="#fff" stroke="${C.ink}" stroke-width="1.5"/>`);
  out.push(`<path d="M${nx},${ny - 15} L${nx + 7},${ny + 8} L${nx},${ny + 3} L${nx - 7},${ny + 8} z" fill="${C.ink}"/>`);
  out.push(`<text x="${nx}" y="${ny - 22}" text-anchor="middle" font-size="12" font-weight="bold" fill="${C.warn}">N ?</text>`);
  out.push(`<text x="${nx + 28}" y="${ny - 6}" font-size="10" fill="#333">Orientation non relevée : flèche indicative.</text>`);
  out.push(`<text x="${nx + 28}" y="${ny + 7}" font-size="10" fill="#333">Repères fixes : y = 0 = mur des paniers latéraux ;</text>`);
  out.push(`<text x="${nx + 28}" y="${ny + 20}" font-size="10" fill="#333">x = 0 = mur de l'entrée E1. Cotes en mètres.</text>`);
  return out.join('\n');
}

function cartouche(x, y, w, h, { file, configLabel, source, lieu, scale }) {
  const out = [];
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" stroke="${C.ink}" stroke-width="2"/>`);
  out.push(`<rect x="${x}" y="${y}" width="${w}" height="24" fill="${C.ink}"/>`);
  out.push(`<text x="${x + 10}" y="${y + 17}" font-size="12.5" font-weight="bold" fill="#ffffff">${esc('LA GRILLE 3x3 — EVENT LAB — ' + configLabel)}</text>`);
  const rows = [
    ['Fichier', `${file} — plan v${PLAN_VERSION} du ${PLAN_DATE}`],
    ['Source', source],
    ['Lieu', lieu],
    ['Échelle', scale],
    ['Statut', `Brouillon de conception — event.json v${config.version} (${config.status}) — à régénérer si les espaces changent`],
  ];
  let cy = y + 40;
  for (const [k, v] of rows) {
    out.push(`<text x="${x + 10}" y="${cy}" font-size="10.5" font-weight="bold" fill="${C.ink}">${esc(k)}</text>`);
    const lines = wrap(v, 88);
    lines.forEach((ln, i) => out.push(`<text x="${x + 70}" y="${cy + i * 12}" font-size="10.5" fill="${C.ink}">${esc(ln)}</text>`));
    cy += lines.length * 12 + 3;
  }
  cy += 4;
  out.push(`<rect x="${x + 6}" y="${cy - 11}" width="${w - 12}" height="${y + h - cy + 5}" fill="#fff4f4" stroke="${C.warn}" stroke-width="1.5"/>`);
  const wl = wrap(WARNING, 104);
  wl.forEach((ln, i) => out.push(`<text x="${x + 12}" y="${cy + 3 + i * 12}" font-size="10" fill="${C.warn}" ${i === 0 ? 'font-weight="bold"' : ''}>${esc(ln)}</text>`));
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// Plan du gymnase archétype à partir d'event.json (+ surcouches par configuration)
const spaceById = Object.fromEntries((venue.spaces ?? []).map((s) => [s.id, s]));
const accessById = Object.fromEntries((venue.access_points ?? []).map((a) => [a.id, a]));
const W = venue.dimensions.width_m; const H = venue.dimensions.length_m; const HEIGHT = venue.dimensions.height_m;

function drawGym(cv, cfg) {
  const { faded = false } = cfg;
  // Annexes sans coordonnées (schématiques, à l'ouest de E1)
  const annex = [
    { id: 'VEST', x: -14, y: 0, w: 10, h: 5.5, sub: ['Vestiaires (2) — existants', 'position schématique'] },
    { id: 'STOCK', x: -14, y: 6.5, w: 10, h: 4.5, sub: ['Local matériel — existant', 'position schématique'] },
    { id: 'HALL', x: -14, y: 13, w: 10, h: 11, sub: ['Hall d\'entrée hors aire de jeu', 'billetterie, accréditations, buvette', `${spaceById.HALL?.area_m2 ?? '?'} m² déclarés (forme à relever)`] },
  ];
  for (const a of annex) {
    cv.rect(a.x, a.y, a.w, a.h, { fill: C.annex, stroke: '#9a9a9a', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
    label(cv, a.x + 0.4, a.y + 1.0, a.id, a.sub);
  }
  cv.text(-9, -0.6, 'Locaux annexes (sans coordonnées dans event.json)', { 'text-anchor': 'middle', 'font-size': 10, fill: '#555' });
  // Plateau
  cv.rect(0, 0, W, H, { fill: C.floor, stroke: 'none' });
  for (let i = 0; i <= W; i++) cv.line(i, 0, i, H, { stroke: i % 4 ? C.grid1 : C.grid4, 'stroke-width': 1 });
  for (let j = 0; j <= H; j++) cv.line(0, j, W, j, { stroke: j % 4 ? C.grid1 : C.grid4, 'stroke-width': 1 });
  for (let i = 0; i <= W; i += 4) cv.text(i, -0.25, String(i), { 'text-anchor': 'middle', 'font-size': 9, fill: '#888' });
  for (let j = 0; j <= H; j += 4) cv.text(W + 0.35, j + 0.15, String(j), { 'font-size': 9, fill: '#888' });

  // Gradins fixes (hors de l'enveloppe 44 × 24 selon event.json : y 24 → 28)
  const tf = spaceById.TF;
  if (tf) {
    cv.rect(tf.x_m, tf.y_m, tf.width_m, tf.length_m, { fill: 'url(#hatch-tf)', stroke: '#8d8d8d', 'stroke-width': 1.5, 'stroke-dasharray': '7 4' });
    label(cv, 1, tf.y_m + 1.3, `${tf.id} — ${tf.label}`, [`${tf.width_m} × ${tf.length_m} m, capacité ${tf.capacity} (hypothèse) — position réelle à relever`, 'event.json place ces gradins hors de l\'enveloppe 44 × 24 m (y = 24 → 28) : incohérence signalée'], { subSize: 9.5 });
  }

  // Espaces positionnés
  const s = spaceById;
  // Terrains
  for (const id of ['T1', 'T2']) {
    const t = s[id]; if (!t) continue;
    court(cv, t.x_m, t.y_m, t.width_m, t.length_m, `${id}`, { sub: [t.label, `${t.width_m} × ${t.length_m} m`, 'tracés schématiques — cotes FIBA 3x3 à reprendre'] });
  }
  // Pit wall
  if (s.PW) {
    const p = s.PW;
    cv.rect(p.x_m, p.y_m, p.width_m, p.length_m, { fill: C.pw, stroke: '#7d93b5', 'stroke-width': 1.5 });
    // retrait de 2 m des lignes de touche (règle de conception interne, non réglementaire)
    cv.rect(p.x_m + 2, p.y_m + 1.5, 1, 4.5, { fill: '#b9c8e0', stroke: '#5a7096', 'stroke-width': 1 });
    cv.rect(p.x_m + p.width_m - 3, p.y_m + 1.5, 1, 4.5, { fill: '#b9c8e0', stroke: '#5a7096', 'stroke-width': 1 });
    cv.rect(p.x_m + 2, p.y_m + 6.6, 1.6, 1.0, { fill: '#ffffff', stroke: '#5a7096', 'stroke-width': 1 });
    cv.rect(p.x_m + p.width_m - 3.6, p.y_m + 6.6, 1.6, 1.0, { fill: '#ffffff', stroke: '#5a7096', 'stroke-width': 1 });
    cv.text(p.x_m + p.width_m / 2, p.y_m + 0.9, `${p.id} — Pit wall`, { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 'bold' });
    cv.lines(p.x_m + p.width_m / 2, p.y_m + 3.3, ['appel', 'équipes', '(créneau', 'suivant)'], { 'text-anchor': 'middle', 'font-size': 9, fill: '#334' }, 10);
    cv.lines(p.x_m + 2.5, p.y_m + 8.4, ['table T1'], { 'text-anchor': 'middle', 'font-size': 8.5, fill: '#334' });
    cv.lines(p.x_m + p.width_m - 2.5, p.y_m + 8.4, ['table T2'], { 'text-anchor': 'middle', 'font-size': 8.5, fill: '#334' });
    cv.text(p.x_m + 2.5, p.y_m + 6.3, 'bancs', { 'text-anchor': 'middle', 'font-size': 8.5, fill: '#334' });
    cv.text(p.x_m + p.width_m - 2.5, p.y_m + 6.3, 'bancs', { 'text-anchor': 'middle', 'font-size': 8.5, fill: '#334' });
    cv.dimH(p.x_m, p.x_m + 2, p.y_m + 8.0, '2 m', { size: 8.5 });
  }
  // Écran + régie
  if (s.SC && !cfg.hideSC) {
    const c = s.SC;
    cv.rect(c.x_m, c.y_m, c.width_m, c.length_m, { fill: C.sc, stroke: '#5f6b7a', 'stroke-width': 1.5 });
    cv.line(c.x_m + 1, c.y_m + 0.25, c.x_m + c.width_m - 1, c.y_m + 0.25, { stroke: C.ink, 'stroke-width': 4 });
    cv.text(c.x_m + c.width_m / 2, c.y_m + 1.05, cfg.scLabel ?? 'SC — écran (face au sud)', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' });
    cv.text(c.x_m + c.width_m / 2, c.y_m + 1.75, cfg.scSub ?? 'régie speaker / vidéo', { 'text-anchor': 'middle', 'font-size': 9 });
  }
  // Zone debout
  if (s.ZD) {
    const z = s.ZD;
    cv.rect(z.x_m, z.y_m, z.width_m, z.length_m, { fill: 'url(#hatch-zd)', stroke: '#5b8fd1', 'stroke-width': 1.5 });
    cv.line(z.x_m, z.y_m, z.x_m + z.width_m, z.y_m, { stroke: '#2b5ea8', 'stroke-width': 3, 'stroke-dasharray': '10 3' });
    cv.line(z.x_m, z.y_m + z.length_m, z.x_m + z.width_m, z.y_m + z.length_m, { stroke: '#2b5ea8', 'stroke-width': 3, 'stroke-dasharray': '10 3' });
    cv.text(z.x_m + 0.4, z.y_m + 1.1, `${z.id} — ${z.label}`, { 'font-size': 11, 'font-weight': 'bold' });
    cv.text(z.x_m + z.width_m - 0.4, z.y_m + 3.6, `${z.width_m} × ${z.length_m} m — capacité ${z.capacity} (hypothèse event.json) — barrières avant et arrière`, { 'font-size': 9.5, 'text-anchor': 'end', fill: '#1f3f73' });
    if (cfg.portillons) for (const px of cfg.portillons) { cv.rect(px - 0.75, z.y_m - 0.15, 1.5, 0.3, { fill: '#ffffff', stroke: 'none' }); cv.rect(px - 0.75, z.y_m + z.length_m - 0.15, 1.5, 0.3, { fill: '#ffffff', stroke: 'none' }); cv.text(px, z.y_m + 2.3, 'portillon', { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold', fill: '#1f3f73' }); }
  }
  if (s.PMR) {
    const p = s.PMR;
    cv.rect(p.x_m, p.y_m, p.width_m, p.length_m, { fill: C.pmr, stroke: '#1f5fbf', 'stroke-width': 1.5 });
    cv.text(p.x_m + p.width_m / 2, p.y_m + 0.85, `PMR (${p.capacity} empl.)`, { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' });
    cv.text(p.x_m + p.width_m / 2, p.y_m + 1.6, 'premier rang', { 'text-anchor': 'middle', 'font-size': 8.5 });
  }
  // Allée
  if (s.AL) {
    const a = s.AL;
    cv.rect(a.x_m, a.y_m, a.width_m, a.length_m, { fill: C.al, stroke: '#5aa86b', 'stroke-width': 1 });
    cv.text(a.x_m + a.width_m / 2, a.y_m + 1.25, `${a.id} — ${a.label} — ${a.length_m} m dans event.json — à maintenir libre`, { 'text-anchor': 'middle', 'font-size': 10, fill: '#1d5a2a', 'font-weight': 'bold' });
  }
  // Grille au sol
  if (s.PH) {
    const p = s.PH;
    cv.rect(p.x_m, p.y_m, p.width_m, p.length_m, { fill: C.ph, stroke: '#c9a227', 'stroke-width': 1.5 });
    const slotW = 1.15, slotH = 1.25;
    for (let i = 0; i < 8; i++) {
      for (let r = 0; r < 2; r++) {
        const sx = p.x_m + 0.4 + i * 1.2 + (r ? 0.6 : 0); const sy = p.y_m + 0.45 + r * 1.65;
        if (sx + slotW > p.x_m + p.width_m - 0.1) continue;
        const n = r * 8 + i + 1;
        cv.rect(sx, sy, slotW - 0.15, slotH, { fill: n === 1 ? C.pole : '#ffffff', stroke: C.ink, 'stroke-width': 1 });
        cv.text(sx + 0.5, sy + 0.85, String(n), { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold' });
      }
    }
    cv.text(p.x_m + p.width_m / 2, p.y_m + p.length_m - 0.25, `${p.id} — grille au sol / photo officielle (${p.width_m} × ${p.length_m} m)`, { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' });
  }
  // Poste de secours
  if (s.SEC) {
    const p = s.SEC;
    cv.rect(p.x_m, p.y_m, p.width_m, p.length_m, { fill: C.sec, stroke: C.secInk, 'stroke-width': 2 });
    const cx = p.x_m + p.width_m / 2, cy = p.y_m + 1.6;
    cv.rect(cx - 0.25, cy - 0.8, 0.5, 1.6, { fill: C.secInk }); cv.rect(cx - 0.8, cy - 0.25, 1.6, 0.5, { fill: C.secInk });
    cv.lines(cx, p.y_m + 2.9, ['SEC — poste', 'de secours', `${p.width_m} × ${p.length_m} m`], { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold', fill: C.secInk }, 11);
  }
  // Zone à maintenir libre devant S2 (entre SEC et SP)
  if (s.SEC && s.SP) {
    const x1 = s.SEC.x_m + s.SEC.width_m, x2 = cfg.freeEnd ?? s.SP.x_m;
    cv.rect(x1, s.SEC.y_m, x2 - x1, s.SEC.length_m, { fill: 'url(#hatch-free)', stroke: '#5aa86b', 'stroke-width': 1, 'stroke-dasharray': '5 3' });
    cv.lines((x1 + x2) / 2, s.SEC.y_m + 1.4, ['Zone à maintenir libre', 'dégagement vers S2 et accès aux gradins'], { 'text-anchor': 'middle', 'font-size': 9.5, fill: '#1d5a2a', 'font-weight': 'bold' }, 11);
  }
  // Stands partenaires
  if (s.SP && !cfg.hideSP) {
    const p = s.SP;
    cv.rect(p.x_m, p.y_m, p.width_m, p.length_m, { fill: C.sp, stroke: '#8a6cc0', 'stroke-width': 1.5 });
    const stands = cfg.stands ?? [[0.5, 0.5, 3, 3, 'titre 3×3'], [4.5, 0.5, 2, 2, 'off. 2×2'], [7.5, 0.5, 2, 2, 'off. 2×2'], [10.5, 0.5, 2, 2, 'off. 2×2']];
    for (const [dx, dy, w, h, t] of stands) { cv.rect(p.x_m + dx, p.y_m + dy, w, h, { fill: '#ffffff', stroke: '#8a6cc0', 'stroke-width': 1 }); cv.text(p.x_m + dx + w / 2, p.y_m + dy + h / 2 + 0.15, t, { 'text-anchor': 'middle', 'font-size': 8.5 }); }
    cv.text(p.x_m + p.width_m / 2, p.y_m + p.length_m - 0.25, cfg.spLabel ?? `${p.id} — ${p.label} (${p.width_m} × ${p.length_m} m)`, { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' });
  }

  // Murs du plateau (par-dessus)
  cv.rect(0, 0, W, H, { fill: 'none', stroke: C.wall, 'stroke-width': 4 });

  // Accès
  const acc = venue.access_points ?? [];
  for (const a of acc) {
    if (a.kind === 'acces_pmr') continue; // confondu avec E1 dans event.json
    if (a.kind === 'entree_public') {
      cv.rect(a.x_m - 0.15, a.y_m - 0.9, 0.3, 1.8, { fill: '#ffffff', stroke: 'none' });
      cv.raw(`<path d="M${cv.X(a.x_m - 1.6)},${cv.Y(a.y_m - 0.7)} L${cv.X(a.x_m + 0.4)},${cv.Y(a.y_m)} L${cv.X(a.x_m - 1.6)},${cv.Y(a.y_m + 0.7)} z" fill="${C.pub}"/>`);
      cv.lines(a.x_m - 1.7, a.y_m - 2.6, [`${a.id} entrée`, 'public', '+ PMR1', 'largeur ?'], { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 'bold', fill: C.pub }, 11);
    } else if (a.kind === 'sortie_secours') {
      const vertical = a.x_m === 0 || a.x_m === W;
      if (vertical) cv.rect(a.x_m - 0.35, a.y_m - 0.9, 0.7, 1.8, { fill: C.exit });
      else cv.rect(a.x_m - 0.9, a.y_m - 0.35, 1.8, 0.7, { fill: C.exit });
      const tx = a.x_m === W ? a.x_m + 0.8 : a.x_m + 1.2; const ty = a.x_m === W ? a.y_m + 0.3 : a.y_m - 0.6;
      cv.lines(tx, ty, [`${a.id} issue de secours`, 'largeur / UP à relever'], { 'font-size': 9.5, 'font-weight': 'bold', fill: C.exit }, 11);
    } else if (a.kind === 'acces_technique') {
      cv.rect(a.x_m - 0.35, a.y_m - 1.2, 0.7, 2.4, { fill: C.tech });
      cv.lines(a.x_m + 0.8, a.y_m - 0.2, [`${a.id} accès technique`, 'gabarit à relever'], { 'font-size': 9.5, 'font-weight': 'bold', fill: C.tech }, 11);
    }
  }
  // Cotes principales
  cv.dimH(0, W, -1.3, `${W} m (largeur du plateau, archétype)`);
  cv.dimV(-1.0, 0, H, `${H} m`, { left: true });
  if (s.T1) { cv.dimH(0, s.T1.x_m, s.T1.y_m + 5.2, `${s.T1.x_m} m`, { size: 9 }); cv.dimV(s.T1.x_m + 0.6, 0, s.T1.y_m, `${s.T1.y_m} m`, { size: 8.5 }); }
  if (s.T1 && s.ZD) cv.dimV(s.T1.x_m + 2.2, s.T1.y_m + s.T1.length_m, s.ZD.y_m, `${fmt(s.ZD.y_m - s.T1.y_m - s.T1.length_m)} m`, { size: 9 });
  if (s.T2) cv.dimH(s.T2.x_m + s.T2.width_m, W, s.T2.y_m + 5.2, `${fmt(W - s.T2.x_m - s.T2.width_m)} m`, { size: 9 });

  // Points de vigilance communs (triangles rouges) — numérotation reprise en légende
  if (!faded) {
    warnTag(cv, 0.5, 16, '1'); warnTag(cv, W - 0.5, 16, '1');
    warnTag(cv, 22, 24.6, '2');
    if (s.T1) warnTag(cv, s.T1.x_m + s.T1.width_m - 0.4, 0.5, '3');
    if (s.T2) warnTag(cv, s.T2.x_m + 0.4, 0.5, '3');
    if (s.SC) warnTag(cv, s.SC.x_m + s.SC.width_m + 0.5, s.SC.y_m + 1.3, '4');
  }
}

const commonWarnItems = [
  { kind: 'warn', n: '1', text: 'Extrémités de la zone debout : 1 m seulement entre ZD et les murs (x = 0 → 1 et 43 → 44). Seuls passages entre l\'aire de jeu et l\'allée : prévoir des portillons ou raccourcir ZD (correction proposée).' },
  { kind: 'warn', n: '2', text: 'S2 est positionnée sur la limite y = 24 m, là où event.json fait commencer les gradins TF : position réelle de S2 et des gradins à relever.' },
  { kind: 'warn', n: '3', text: 'Lignes de touche de T1 et T2 au contact du pit wall (0 m) et 1 m seulement entre ligne de fond et mur : mobilier du pit wall placé à 2 m des lignes (règle de conception interne, non réglementaire) ; protections murales à vérifier.' },
  { kind: 'warn', n: '4', text: 'Écran face au public : la projection frontale placerait le projecteur et ses câbles dans la zone public ; préférer la rétroprojection depuis le pit wall ou un écran à LED.' },
];

const commonNotes = [
  'Relever la position exacte des paniers latéraux (axe, porte-à-faux, hauteur) : elle fixe celle des terrains.',
  'Relever la largeur et le nombre d\'unités de passage de E1, S1, S2 et TECH, le sens d\'ouverture et la signalétique existante.',
  'Relever prises et circuits électriques (position, calibre), l\'éclairage de sécurité, l\'emplacement du DAE et des extincteurs.',
  'Relever la position des gradins et leur capacité réelle (plan de l\'exploitant), ainsi que les sanitaires (dont PMR).',
  'Faire valider l\'implantation, la zone debout et l\'allée par l\'exploitant et le chargé de sécurité (C-02).',
];

function gymPlan({ file, title, subtitle, configLabel, cfg = {}, overlay, items = [], notes = commonNotes, warnItems = commonWarnItems }) {
  const S = 20; const ox = 320; const oy = 152;
  const cv = makeCanvas({ S, ox, oy });
  drawGym(cv, cfg);
  if (overlay) overlay(cv);
  const width = 1790, height = 1130;
  const legendItems = [
    { kind: 'swatch', fill: C.court, stroke: C.courtLine, text: 'Terrain 3x3 (T1 central, T2) — event.json : 15 × 11 m chacun' },
    { kind: 'swatch', fill: C.pw, text: 'PW — pit wall : bancs, tables de marque, appel des équipes' },
    { kind: 'swatch', fill: C.sc, text: 'SC — écran de la grille et régie' },
    { kind: 'swatch', fill: C.zd, text: 'ZD — zone spectateurs debout ; PMR — emplacements réservés' },
    { kind: 'swatch', fill: C.al, text: 'AL — allée de circulation et d\'évacuation (libre en permanence)' },
    { kind: 'swatch', fill: C.ph, text: 'PH — grille au sol, zone photo (case 1 = pole, jaune)' },
    { kind: 'swatch', fill: C.sec, stroke: C.secInk, text: 'SEC — poste de secours' },
    { kind: 'swatch', fill: C.sp, text: 'SP — stands partenaires' },
    { kind: 'swatch', fill: C.tf, text: 'TF — gradins fixes (hypothèse, hors enveloppe)' },
    { kind: 'access', text: 'E1 — entrée du public (et accès PMR1)' },
    { kind: 'exit', text: 'S1, S2 — issues de secours ; TECH (gris) — accès technique' },
    ...items,
    ...warnItems,
  ];
  const lg = legendBox(1360, 104, 410, 'Légende', legendItems, 'À relever sur le lieu réel', notes);
  const body = [
    header(width, title, subtitle),
    cv.out.join('\n'),
    lg.svg,
    scaleAndNorth(60, 790, S),
    cartouche(640, 860, 680, 250, {
      file, configLabel,
      source: 'venue.spaces[] et venue.access_points[] de event.json (x_m, y_m, width_m, length_m) ; surcouches Δ = hypothèses de conception propres à cette configuration',
      lieu: `${venue.name} — ${W} × ${H} m, hauteur ${HEIGHT} m — ERP type ${venue.erp?.type_erp ?? '?'} (catégorie à confirmer)`,
      scale: '1 m = 20 px (échelle graphique ci-contre ; vérifier les cotes à l\'impression)',
    }),
  ].join('\n');
  fs.writeFileSync(path.join(here, file), svgDoc(width, height, `${title} — ${configLabel}`, `${subtitle}. ${WARNING}`, body));
  return file;
}

// ------------------------------------------------------------------------------------- STANDARD
gymPlan({
  file: 'implantation-standard.svg',
  title: 'LA GRILLE 3x3 — Plan d\'implantation',
  subtitle: 'Configuration standard — gymnase archétype, 2 terrains 3x3, qualifications sur 2 stations (T1 et T2), Q3 et finales sur T1',
  configLabel: 'Configuration standard',
});

// ------------------------------------------------------------------------------------- ÉCONOMIQUE
gymPlan({
  file: 'implantation-economique.svg',
  title: 'LA GRILLE 3x3 — Plan d\'implantation',
  subtitle: 'Configuration économique — même emprise que la standard ; matériel du lieu ou prêté, animation bénévole, signalétique réduite',
  configLabel: 'Configuration économique',
  cfg: { scLabel: 'SC — écran (prêté / loué)', scSub: 'lisibilité à tester depuis TF', stands: [[0.5, 0.5, 3, 3, 'local'], [4.5, 0.5, 3, 3, 'local'], [8.5, 0.5, 4, 0.6, 'mur partenaires']], spLabel: 'SP — stands selon contrats signés' },
  overlay(cv) {
    const s = spaceById;
    deltaTag(cv, s.SC.x_m - 0.7, s.SC.y_m + 0.3, 'Δ1');
    deltaTag(cv, s.SP.x_m - 0.6, s.SP.y_m + 0.6, 'Δ2');
    deltaTag(cv, s.PH.x_m + s.PH.width_m - 0.4, s.PH.y_m + 0.3, 'Δ3');
    deltaTag(cv, -2.0, 15, 'Δ4');
    deltaTag(cv, 1.5, 1.5, 'Δ5');
  },
  items: [
    { kind: 'delta', n: 'Δ1', text: 'Écran : vidéoprojection économique (E10 réduit) ; vérifier la lisibilité de la grille depuis le haut des gradins avant de valider.' },
    { kind: 'delta', n: 'Δ2', text: 'Stands : uniquement les partenaires signés ; un mur des partenaires (bâche) remplace les stands non vendus.' },
    { kind: 'delta', n: 'Δ3', text: 'Grille au sol en adhésif seul (pas de bâche imprimée) ; numéros réutilisables d\'une édition à l\'autre.' },
    { kind: 'delta', n: 'Δ4', text: 'Hall : une caisse de buvette ouverte d\'office, la seconde selon l\'affluence (R-13).' },
    { kind: 'delta', n: 'Δ5', text: 'Sonorisation réduite (E09) et speaker bénévole : enceintes directives orientées vers ZD et TF, pas vers les murs.' },
  ],
});

// ------------------------------------------------------------------------------------- PREMIUM
gymPlan({
  file: 'implantation-premium.svg',
  title: 'LA GRILLE 3x3 — Plan d\'implantation',
  subtitle: 'Configuration premium — mur LED, éclairage scénique au sol, captation multicaméra, espace invités',
  configLabel: 'Configuration premium',
  cfg: {
    scLabel: 'SC — mur LED', scSub: 'au sol, lesté, sans accroche',
    stands: [[0.5, 0.5, 3, 3, 'titre 3×3'], [4.0, 0.5, 2, 2, 'off. 2×2']], spLabel: 'SP — stands (réduits) + INV',
    freeEnd: 26,
  },
  overlay(cv) {
    const s = spaceById;
    // Espace invités dans la partie est de SP
    cv.rect(36.5, 20.2, 6.3, 3.6, { fill: 'url(#hatch-delta)', stroke: C.delta, 'stroke-width': 2 });
    cv.lines(39.65, 21.4, ['INV — espace invités', 'et partenaires (E32)'], { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold', fill: '#7a2b00' }, 11);
    deltaTag(cv, 36.5, 20.2, 'Δ3');
    // Régie captation
    cv.rect(26.3, 20.5, 3.4, 3.0, { fill: 'url(#hatch-delta)', stroke: C.delta, 'stroke-width': 2 });
    cv.lines(28.0, 21.7, ['Régie', 'captation'], { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold', fill: '#7a2b00' }, 11);
    deltaTag(cv, 26.3, 20.5, 'Δ4');
    // Pieds d'éclairage scénique (au sol, à au moins 2 m des lignes)
    const lum = [[0.8, 2.5], [0.8, 10.5], [21.0, 9.7], [23.0, 9.7]];
    for (const [x, y] of lum) { cv.rect(x - 0.35, y - 0.35, 0.7, 0.7, { fill: C.pole, stroke: C.ink, 'stroke-width': 1.2 }); }
    cv.text(0.8, 12.6, 'LUM', { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold' });
    deltaTag(cv, 1.6, 6.5, 'Δ2');
    // Caméras
    const cams = [[22, 25.8, 'CAM1 tribune'], [1.4, 7.2, 'CAM2'], [10, 13.1, 'CAM3 épaule'], [6.5, 19.6, 'CAM4 grille']];
    for (const [x, y, t] of cams) { cv.raw(`<path d="M${cv.X(x) - 8},${cv.Y(y) - 6} h12 l6,-4 v20 l-6,-4 h-12 z" fill="${C.delta}" stroke="#fff" stroke-width="1"/>`); cv.text(x + 0.9, y + 0.3, t, { 'font-size': 9, 'font-weight': 'bold', fill: '#7a2b00' }); }
    deltaTag(cv, 18.3, 25.6, 'Δ5');
    deltaTag(cv, s.SC.x_m - 0.7, s.SC.y_m + 0.3, 'Δ1');
  },
  items: [
    { kind: 'delta', n: 'Δ1', text: 'Mur LED à la place de la projection (E10 premium) : poids, puissance et stabilité à fournir par le loueur ; aucune accroche sans accord écrit de l\'exploitant.' },
    { kind: 'delta', n: 'Δ2', text: 'LUM — pieds d\'éclairage scénique (E30) posés au sol, lestés, à 2 m au moins des lignes ; câbles en passe-câbles ; l\'éclairage de sécurité n\'est jamais coupé.' },
    { kind: 'delta', n: 'Δ3', text: 'INV — espace invités et partenaires (E32) dans la partie est de SP ; accès au pit wall pendant les finales, accompagné, hors dégagements.' },
    { kind: 'delta', n: 'Δ4', text: 'Régie de captation (E31) : la zone libre devant S2 est conservée de x = 17 à 26 m.' },
    { kind: 'delta', n: 'Δ5', text: 'Caméras : CAM1 en tribune (plateforme à valider), CAM2 latérale T1, CAM3 à l\'épaule dans le couloir joueurs, CAM4 sur la grille au sol.' },
  ],
});

// ------------------------------------------------------------------------------------- CAPACITÉ MAXIMALE
gymPlan({
  file: 'implantation-capacite-max.svg',
  title: 'LA GRILLE 3x3 — Plan d\'implantation',
  subtitle: 'Configuration de capacité maximale autorisée — toutes les zones spectateurs ouvertes, dégagements élargis, comptage en continu',
  configLabel: 'Capacité maximale autorisée',
  cfg: { hideSP: true, portillons: [10, 33], freeEnd: 43 },
  overlay(cv) {
    const s = spaceById;
    // Stands déplacés : zone SP libérée
    cv.text(36.8, 23.55, 'SP libérée : stands déplacés dans le hall (si surface suffisante)', { 'text-anchor': 'middle', 'font-size': 9, fill: '#7a2b00', 'font-weight': 'bold' });
    deltaTag(cv, 30.4, 20.5, 'Δ1');
    // Portillons
    deltaTag(cv, 10, 13.3, 'Δ2'); deltaTag(cv, 33, 13.3, 'Δ2');
    // Comptage
    for (const [x, y, t] of [[-5.0, 17.4, 'CPT entrées'], [-5.0, 20.6, 'CPT sorties']]) { cv.rect(x - 0.4, y - 0.4, 0.8, 0.8, { fill: C.delta, stroke: '#fff', 'stroke-width': 1 }); cv.text(x - 0.6, y + 0.25, t, { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 'bold', fill: '#7a2b00' }); }
    deltaTag(cv, -2.0, 22.6, 'Δ3');
    // Orientation
    for (const [x, y] of [[3, 19], [22, 19], [41, 19]]) { cv.dot(x, y, 7, { fill: '#ffffff', stroke: C.delta, 'stroke-width': 2.5 }); cv.text(x, y + 0.2, 'O', { 'text-anchor': 'middle', 'font-size': 9, 'font-weight': 'bold', fill: C.delta }); }
    deltaTag(cv, 39.2, 19.0, 'Δ4');
    // File d'entrée en serpentin dans le hall
    cv.path(`M${cv.X(-13.2)},${cv.Y(23.3)} L${cv.X(-5.5)},${cv.Y(23.3)} L${cv.X(-5.5)},${cv.Y(22.4)} L${cv.X(-13.2)},${cv.Y(22.4)} L${cv.X(-13.2)},${cv.Y(21.5)} L${cv.X(-4.6)},${cv.Y(21.5)}`, { fill: 'none', stroke: C.pub, 'stroke-width': 2, 'stroke-dasharray': '6 3' });
    cv.text(-9.4, 24.8, 'file d\'entrée en serpentin (dans le hall)', { 'text-anchor': 'middle', 'font-size': 9, fill: C.pub });
  },
  items: [
    { kind: 'delta', n: 'Δ1', text: 'Stands partenaires retirés du plateau : la bande sud est libre de x = 17 à 43 m (dégagement S2, circulation, accès gradins).' },
    { kind: 'delta', n: 'Δ2', text: 'Portillons traversants dans les barrières de ZD (x ≈ 10 et 33 m), tenus libres par un bénévole d\'orientation.' },
    { kind: 'delta', n: 'Δ3', text: 'Comptage entrées et sorties en continu à E1 (2 compteurs) ; seuils d\'alerte et de fermeture de R-01, calculés sur l\'effectif confirmé par l\'exploitant.' },
    { kind: 'delta', n: 'Δ4', text: 'O — bénévoles d\'orientation aux deux bouts et au centre de l\'allée AL.' },
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, text: 'Plafond de spectateurs présents simultanément = effectif autorisé confirmé (C-02, hypothèse H-01) − participants présents − personnel présent, selon la définition d\'effectif retenue par l\'exploitant. Places physiques : TF, ZD et PMR (capacités event.json). La retransmission « dans le hall » ne crée aucune place si le hall est dans le même établissement.', wrap: 56 },
  ],
});

// ------------------------------------------------------------------------------------- CIRCULATION
(function circulation() {
  const S = 20; const ox = 320; const oy = 152;
  const cv = makeCanvas({ S, ox, oy });
  drawGym(cv, { faded: true, portillons: [10, 33] });
  // voile blanc pour faire ressortir les flux
  cv.rect(-14.5, -2, 62, 31, { fill: '#ffffff', opacity: 0.6 });
  // ---- Flux public (bleu) : extérieur → hall → E1 → allée → ZD (portillons arrière) et gradins (zone libre)
  cv.arrow([[-9, 27.4], [-9, 24.4]], C.pub, { marker: 'pub' });
  cv.text(-8.6, 27.0, 'entrée du bâtiment (à relever)', { 'font-size': 9.5, fill: C.pub, 'font-weight': 'bold' });
  cv.arrow([[-9, 23.6], [-9, 18.55], [0.8, 18.55]], C.pub, { marker: 'pub' });
  cv.text(-9.3, 22.4, 'contrôle billets', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.pub });
  cv.arrow([[1.4, 18.45], [31.6, 18.45]], C.pub, { marker: 'pub', w: 3 });
  cv.arrow([[10.0, 18.3], [10.0, 16.6]], C.pub, { marker: 'pub', w: 2.5 });
  cv.arrow([[33.0, 18.3], [33.0, 16.6]], C.pub, { marker: 'pub', w: 2.5 });
  cv.arrow([[21.0, 18.6], [21.0, 23.5]], C.pub, { marker: 'pub', w: 2.5 });
  cv.text(20.6, 23.6, 'vers gradins', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.pub, 'font-weight': 'bold' });
  // ---- Flux équipes (orange) : vestiaires → porte (hypothèse) → couloir ouest → couloir joueurs (y ≈ 13) → pit wall
  cv.rect(-0.15, 2.2, 0.3, 1.6, { fill: C.team });
  cv.text(-0.6, 1.5, 'porte vestiaires (hypothèse)', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.team, 'font-weight': 'bold' });
  cv.arrow([[-4.2, 3.0], [1.5, 3.0], [1.5, 12.9], [18.55, 12.9], [18.55, 10.4]], C.team, { marker: 'team', dash: '9 5' });
  cv.text(4.2, 12.6, 'couloir joueurs / photographes', { 'font-size': 9.5, fill: C.team, 'font-weight': 'bold' });
  // ---- Flux technique (gris) : TECH → couloir est → régie
  cv.arrow([[46.8, 7.6], [42.6, 7.6], [42.6, 13.2], [25.6, 13.2], [25.6, 12.7]], C.tech, { marker: 'tech', dash: '3 4', w: 3 });
  cv.text(36.5, 12.8, 'flux technique (hors public)', { 'font-size': 9.5, fill: C.tech, 'font-weight': 'bold' });
  // ---- Évacuation (vert) : vers E1, S1, S2
  cv.arrow([[6, 16.8], [6, 19.45], [0.6, 19.45]], C.evac, { marker: 'evac', w: 4 });
  cv.arrow([[38, 16.8], [38, 19.45], [43.5, 19.45]], C.evac, { marker: 'evac', w: 4 });
  cv.arrow([[10.6, 11.8], [10.6, 19.6], [7.0, 19.6]], C.evac, { marker: 'evac', w: 3 });
  cv.arrow([[33.6, 11.8], [33.6, 19.6], [37.2, 19.6]], C.evac, { marker: 'evac', w: 3 });
  cv.arrow([[23.6, 9.6], [25.7, 9.6], [25.7, 13.6], [33.2, 13.6]], C.evac, { marker: 'evac', w: 2.5, dash: '6 3' });
  cv.arrow([[27, 26.2], [23.0, 26.2], [22.2, 24.6]], C.evac, { marker: 'evac', w: 4 });
  cv.arrow([[23.5, 19.7], [23.5, 23.4]], C.evac, { marker: 'evac', w: 3 });
  // ---- Secours (rouge)
  cv.arrow([[14.6, 20.2], [14.6, 19.8], [11.4, 19.8], [11.4, 12.4]], C.rescue, { marker: 'rescue', w: 3, dash: '10 4' });
  cv.text(11.7, 16.9, 'intervention', { 'font-size': 9.5, fill: C.rescue, 'font-weight': 'bold' });
  cv.arrow([[13.6, 20.2], [13.6, 19.95], [0.2, 19.95], [-3.6, 19.95]], C.rescue, { marker: 'rescue', w: 3, dash: '10 4' });
  cv.lines(-4.6, 20.9, ['victime → hall → véhicule', 'de secours (accès à définir)'], { 'text-anchor': 'end', 'font-size': 9.5, fill: C.rescue, 'font-weight': 'bold' }, 11);
  cv.dot(-4.8, 12.0, 9, { fill: '#ffffff', stroke: C.rescue, 'stroke-width': 2 }); cv.text(-4.8, 12.22, 'DAE', { 'text-anchor': 'middle', 'font-size': 7.5, 'font-weight': 'bold', fill: C.rescue });
  cv.text(-5.6, 12.25, 'DAE du lieu : position à relever', { 'text-anchor': 'end', 'font-size': 9.5, fill: C.rescue, 'font-weight': 'bold' });
  // ---- Point de rassemblement
  cv.text(26, 29.6, 'Point de rassemblement extérieur : à définir avec l\'exploitant (consignes du lieu prioritaires)', { 'font-size': 10.5, 'font-weight': 'bold', fill: C.evac });
  const width = 1790, height = 1130;
  const lg = legendBox(1360, 104, 410, 'Légende des flux', [
    { kind: 'line', color: C.pub, marker: 'pub', text: 'Flux public : hall (contrôle) → E1 → allée AL → ZD par les portillons arrière, gradins TF par la zone libre centrale.' },
    { kind: 'line', color: C.team, marker: 'team', dash: '9 5', text: 'Flux équipes : vestiaires → couloir ouest (3 m) → couloir joueurs entre terrains et ZD → pit wall. Accueil des équipes dans le hall, file séparée du public.' },
    { kind: 'line', color: C.tech, marker: 'tech', dash: '3 4', text: 'Flux technique : TECH → couloir est (3 m) → régie SC. Livraisons hors présence du public (J-1, et J avant l\'ouverture des portes).' },
    { kind: 'line', color: C.evac, marker: 'evac', text: 'Évacuation : vers E1, S1 et S2 par l\'allée AL et les portillons de ZD. TECH n\'est pas comptée comme dégagement tant que l\'exploitant ne l\'a pas confirmé.' },
    { kind: 'line', color: C.rescue, marker: 'rescue', dash: '10 4', text: 'Secours : SEC → terrains par le portillon ouest ; SEC → E1 → hall pour l\'évacuation d\'une victime.' },
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, text: 'Règles : AL, portillons, zone libre devant S2 et couloirs latéraux jamais encombrés (pas de file d\'attente de buvette, pas de sacs, pas de câbles non protégés).' },
  ], 'À relever et à faire valider', [
    'Sens d\'ouverture et largeur des issues ; issues réellement disponibles le jour J (aucune ne doit être condamnée).',
    'Accès des véhicules de secours au bâtiment et point de rassemblement : avec l\'exploitant et l\'association agréée.',
    'Porte des vestiaires et cheminement réel des équipes (hypothèse graphique ici).',
    'Consignes d\'évacuation de l\'exploitant : elles priment sur ce schéma.',
  ]);
  const body = [
    header(width, 'LA GRILLE 3x3 — Schéma de circulation', 'Flux public, équipes, technique, évacuation et secours — configuration standard (base event.json)'),
    cv.out.join('\n'),
    lg.svg,
    scaleAndNorth(60, 790, S),
    cartouche(640, 860, 680, 250, {
      file: 'circulation.svg', configLabel: 'Schéma de circulation',
      source: 'venue.spaces[] et venue.access_points[] de event.json ; tracés des flux = hypothèses de conception',
      lieu: `${venue.name} — ${W} × ${H} m`,
      scale: '1 m = 20 px (échelle graphique ci-contre)',
    }),
  ].join('\n');
  fs.writeFileSync(path.join(here, 'circulation.svg'), svgDoc(width, height, 'LA GRILLE 3x3 — Schéma de circulation', `Flux public, équipes, technique, évacuation, secours. ${WARNING}`, body));
})();

// ------------------------------------------------------------------------------------- SECOURS
(function secours() {
  // Gabarit HYPOTHÉTIQUE de salle de repli (HS-01) : 32 × 22 m, 1 terrain 3x3, panier mobile.
  const SW = 32, SH = 22;
  const S = 24; const ox = 330; const oy = 150;
  const cv = makeCanvas({ S, ox, oy });
  // annexe
  cv.rect(-12, 11, 10, 11, { fill: C.annex, stroke: '#9a9a9a', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
  label(cv, -11.6, 12.0, 'HALL / accueil', ['billetterie, accréditations,', 'buvette (hors aire de jeu)', 'position à relever']);
  cv.rect(-12, 0, 10, 9.5, { fill: C.annex, stroke: '#9a9a9a', 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
  label(cv, -11.6, 1.0, 'Vestiaires / stockage', ['à relever (la salle de repli', 'peut ne pas en disposer)']);
  cv.rect(0, 0, SW, SH, { fill: C.floor });
  for (let i = 0; i <= SW; i++) cv.line(i, 0, i, SH, { stroke: i % 4 ? C.grid1 : C.grid4 });
  for (let j = 0; j <= SH; j++) cv.line(0, j, SW, j, { stroke: j % 4 ? C.grid1 : C.grid4 });
  for (let i = 0; i <= SW; i += 4) cv.text(i, -0.25, String(i), { 'text-anchor': 'middle', 'font-size': 9, fill: '#888' });
  court(cv, 3, 1, 15, 11, 'T1', { sub: ['terrain unique : qualifs (1 station),', 'poules, finales', '15 × 11 m (event.json)'], basketNote: 'panier mobile 3x3 (location) ou panier fixe à relever' });
  // pit wall
  cv.rect(18, 1, 9, 8, { fill: C.pw, stroke: '#7d93b5', 'stroke-width': 1.5 });
  cv.rect(20, 2.5, 1, 4.5, { fill: '#b9c8e0', stroke: '#5a7096' }); cv.rect(20, 7.3, 1.6, 1.0, { fill: '#fff', stroke: '#5a7096' });
  cv.lines(21.6, 2.0, ['PW — pit wall', 'bancs à 2 m', 'table de marque', 'appel des équipes'], { 'font-size': 9.5, 'font-weight': 'bold' }, 11);
  cv.rect(19.5, 9.4, 6, 1.6, { fill: C.sc, stroke: '#5f6b7a', 'stroke-width': 1.5 }); cv.line(20.3, 9.6, 24.7, 9.6, { stroke: C.ink, 'stroke-width': 4 });
  cv.text(22.5, 10.6, 'SC — écran + régie', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' });
  cv.rect(28, 1, 3.5, 3.5, { fill: C.sec, stroke: C.secInk, 'stroke-width': 2 }); cv.lines(29.75, 2.5, ['SEC', 'secours'], { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold', fill: C.secInk }, 11);
  cv.rect(28, 5.5, 3.5, 6.5, { fill: C.ph, stroke: '#c9a227', 'stroke-width': 1.5 });
  cv.lines(29.75, 7.0, ['PH — grille', 'réduite', '(16 cases)'], { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' }, 11);
  // zone debout + PMR
  cv.rect(3, 14, 25, 3, { fill: 'url(#hatch-zd)', stroke: '#5b8fd1', 'stroke-width': 1.5 });
  cv.text(3.4, 15.2, 'ZD — public debout + bancs bas', { 'font-size': 10, 'font-weight': 'bold' });
  cv.text(27.6, 16.6, 'capacité fixée par l\'exploitant de la salle de repli', { 'font-size': 9.5, 'text-anchor': 'end', fill: '#1f3f73' });
  cv.rect(13, 14, 5, 2, { fill: C.pmr, stroke: '#1f5fbf', 'stroke-width': 1.5 }); cv.text(15.5, 15.2, 'PMR', { 'text-anchor': 'middle', 'font-size': 9.5, 'font-weight': 'bold' });
  cv.rect(0, 17.5, SW, 2, { fill: C.al, stroke: '#5aa86b' });
  cv.text(16, 18.8, 'AL — allée de circulation et d\'évacuation (largeur à valider)', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 'bold', fill: '#1d5a2a' });
  cv.rect(3, 19.8, 9, 1.9, { fill: C.sp, stroke: '#8a6cc0' }); cv.text(7.5, 21.0, 'mur des partenaires', { 'text-anchor': 'middle', 'font-size': 9.5 });
  cv.rect(12.5, 19.8, 7, 1.9, { fill: 'url(#hatch-free)', stroke: '#5aa86b', 'stroke-dasharray': '5 3' }); cv.text(16, 21.0, 'libre devant S2', { 'text-anchor': 'middle', 'font-size': 9.5, fill: '#1d5a2a', 'font-weight': 'bold' });
  cv.rect(0, 0, SW, SH, { fill: 'none', stroke: C.wall, 'stroke-width': 4 });
  // accès hypothétiques
  cv.raw(`<path d="M${cv.X(-1.6)},${cv.Y(17.8)} L${cv.X(0.4)},${cv.Y(18.5)} L${cv.X(-1.6)},${cv.Y(19.2)} z" fill="${C.pub}"/>`);
  cv.text(-1.8, 17.2, 'E1 entrée (hyp.)', { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 'bold', fill: C.pub });
  cv.rect(SW - 0.35, 17.6, 0.7, 1.8, { fill: C.exit }); cv.text(SW + 0.8, 18.8, 'S1 issue (hyp.)', { 'font-size': 9.5, 'font-weight': 'bold', fill: C.exit });
  cv.rect(15.1, SH - 0.35, 1.8, 0.7, { fill: C.exit }); cv.text(17.2, SH + 0.9, 'S2 issue (hyp.)', { 'font-size': 9.5, 'font-weight': 'bold', fill: C.exit });
  cv.dimH(0, SW, -1.3, `${SW} m (gabarit minimal recommandé, hypothèse HS-01)`);
  cv.dimV(-1.0, 0, SH, `${SH} m`, { left: true });
  cv.dimV(3.6, 12, 14, '2 m', { size: 9 });
  cv.dimH(18, 20, 8.6, '2 m', { size: 8.5 });
  const width = 1660, height = 1130;
  const lg = legendBox(1240, 104, 400, 'Configuration de secours', [
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, bold: true, text: 'Déclencheur : gymnase indisponible (R-15). Lieu : salle polyvalente de repli réservée sous condition (jalon J-90).' },
    { kind: 'swatch', fill: C.court, stroke: C.courtLine, text: 'Un seul terrain : qualifications sur une station, puis poules et tableau final sur T1.' },
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, text: 'Format resserré à 16 équipes : Open 12 + Féminines 4 (bascule Open 16 si moins de 4 équipes féminines).' },
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, text: 'Open : Q1 (12) fige 9–12, Q2 (8) fige 5–8, Q3 (4) attribue 1–4. Féminines : manche unique (4).' },
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, text: 'Poules Open : 4 × 3 (serpentin) ; poule Féminines : 1 × 4. Matchs de poule en 7 min ou 13 points ; phases finales en 10 min ou 21 points.' },
    { kind: 'swatch', fill: '#ffffff', stroke: C.ink, text: 'Tableau final : quarts, demies et finale Open (8 équipes) ; finale Féminines entre les 2 premières de la poule.' },
    { kind: 'swatch', fill: C.pmr, text: 'PMR au premier rang ; cheminement E1 → AL → PMR à vérifier.' },
    { kind: 'swatch', fill: C.sec, stroke: C.secInk, text: 'SEC près de S1 ; DAE de la salle à repérer.' },
  ], 'Hypothèses à remplacer par le relevé', [
    'HS-01 : salle de 32 × 22 m utiles au minimum, hauteur libre compatible avec le basket (à vérifier), sol sportif.',
    'Aucun gradin supposé : public debout et bancs bas ; capacité et effectif fixés par l\'exploitant.',
    'Panier mobile 3x3 en location si la salle n\'a pas de panier fixe (poste à budgéter, non présent dans event.json).',
    'Positions de E1, S1, S2 hypothétiques : reporter celles du plan d\'évacuation réel.',
  ]);
  const body = [
    header(width, 'LA GRILLE 3x3 — Plan d\'implantation', 'Configuration de secours — salle polyvalente de repli, 1 terrain, format resserré à 16 équipes'),
    cv.out.join('\n'),
    lg.svg,
    scaleAndNorth(60, 770, S),
    cartouche(560, 860, 660, 250, {
      file: 'implantation-secours.svg', configLabel: 'Configuration de secours',
      source: 'Gabarit hypothétique HS-01 (aucun lieu de repli dans event.json) ; terrain 15 × 11 m et espaces repris de la configuration standard',
      lieu: 'Salle polyvalente de repli — à identifier et à relever (R-15)',
      scale: '1 m = 24 px (échelle graphique ci-contre)',
    }),
  ].join('\n');
  fs.writeFileSync(path.join(here, 'implantation-secours.svg'), svgDoc(width, height, 'LA GRILLE 3x3 — Configuration de secours', `Salle de repli, 1 terrain, 16 équipes. ${WARNING}`, body));
})();

// ------------------------------------------------------------------------------------- PARCOURS DE QUALIFICATION
(function parcours() {
  // Géométrie de l'article 7.2 du règlement (section 12.2 du blueprint) — repère au ruban :
  // x depuis la ligne de touche gauche (vue face au panier), y depuis la ligne de fond ; axe du panier supposé à x = 7,5.
  const S = 50; const ox = 80; const oy = 150;
  const cv = makeCanvas({ S, ox, oy });
  const CW = 15, CL = 11, AX = 7.5;
  cv.rect(0, 0, CW, CL, { fill: C.court, stroke: C.courtLine, 'stroke-width': 2.5 });
  for (let i = 1; i < CW; i++) cv.line(i, 0, i, CL, { stroke: '#e4cfa5', 'stroke-width': 1 });
  for (let j = 1; j < CL; j++) cv.line(0, j, CW, j, { stroke: '#e4cfa5', 'stroke-width': 1 });
  const st = { fill: 'none', stroke: C.courtLine, 'stroke-width': 1.5 };
  const by = 1.575;
  cv.rect(AX - 2.45, 0, 4.9, 5.8, st);
  const dy = Math.sqrt(6.75 ** 2 - 6.6 ** 2);
  cv.path(`M${cv.X(0.9)},${cv.Y(0)} L${cv.X(0.9)},${cv.Y(by + dy)} A${cv.L(6.75)},${cv.L(6.75)} 0 0 0 ${cv.X(14.1)},${cv.Y(by + dy)} L${cv.X(14.1)},${cv.Y(0)}`, st);
  cv.line(AX - 0.9, 1.2, AX + 0.9, 1.2, { stroke: C.ink, 'stroke-width': 5 });
  cv.circle(AX, by, 0.23, { fill: 'none', stroke: C.delta, 'stroke-width': 3 });
  cv.text(AX + 0.45, by - 0.35, 'B', { 'font-size': 12, 'font-weight': 'bold' });
  cv.line(AX, 0, AX, CL, { stroke: '#8a6a32', 'stroke-width': 1, 'stroke-dasharray': '3 5' });
  cv.text(AX + 0.1, 0.55, 'axe du panier', { 'font-size': 9.5, fill: '#5a4520' });
  for (let i = 0; i <= CW; i++) cv.text(i, -0.2, String(i), { 'text-anchor': 'middle', 'font-size': 10, fill: '#777' });
  for (let j = 0; j <= CL; j++) cv.text(-0.3, j + 0.12, String(j), { 'text-anchor': 'end', 'font-size': 10, fill: '#777' });
  cv.text(7.5, -0.75, 'Ligne de fond — repère au ruban : x depuis la ligne de touche gauche (vue face au panier), y depuis la ligne de fond (m)', { 'text-anchor': 'middle', 'font-size': 11, fill: '#555' });
  const P1C = C.pub, P2C = C.team, P3C = C.evac;
  // Ligne D/A (3 m, à 10 m de la ligne de fond, de 3 à 6 m à gauche de l'axe) avec damier
  for (let k = 0; k < 12; k++) cv.rect(1.5 + k * 0.25, 9.9, 0.25, 0.1, { fill: k % 2 ? '#ffffff' : C.ink }); 
  for (let k = 0; k < 12; k++) cv.rect(1.5 + k * 0.25, 10.0, 0.25, 0.1, { fill: k % 2 ? C.ink : '#ffffff' });
  cv.text(3.0, 10.55, 'Ligne D/A (3 m, damier)', { 'text-anchor': 'middle', 'font-size': 10.5, 'font-weight': 'bold' });
  for (const x of [1.5, 4.5]) cv.rect(x - 0.15, 9.85, 0.3, 0.3, { fill: C.delta, stroke: C.ink });
  cv.text(1.2, 9.75, 'cellule', { 'text-anchor': 'end', 'font-size': 9.5, 'font-weight': 'bold' });
  cv.text(4.8, 9.75, 'cellule', { 'font-size': 9.5, 'font-weight': 'bold' });
  cv.dimH(4.5, AX, 10.75, '3 m', { size: 9.5 });
  // Poste 1 : plots à 4,5 m à gauche de l'axe (x = 3), y = 8,5 → 2,5
  const plots = [8.5, 7.0, 5.5, 4.0, 2.5];
  plots.forEach((y, i) => { cv.raw(`<path d="M${cv.X(3.0)},${cv.Y(y) - 9} L${cv.X(3.0) + 8},${cv.Y(y) + 7} L${cv.X(3.0) - 8},${cv.Y(y) + 7} z" fill="${C.delta}" stroke="${C.ink}" stroke-width="1"/>`); cv.text(2.45, y + 0.15, `P${i + 1}`, { 'text-anchor': 'end', 'font-size': 10, 'font-weight': 'bold' }); });
  cv.dimV(1.3, 7.0, 8.5, '1,5 m', { size: 10, left: true });
  cv.dimH(3.0, AX, 2.0, '4,5 m', { size: 9.5 });
  cv.path(`M${cv.X(3.0)},${cv.Y(9.75)} C${cv.X(3.6)},${cv.Y(9.2)} ${cv.X(3.6)},${cv.Y(8.9)} ${cv.X(3.5)},${cv.Y(8.5)} C${cv.X(2.4)},${cv.Y(7.75)} ${cv.X(2.4)},${cv.Y(7.6)} ${cv.X(2.5)},${cv.Y(7.0)} C${cv.X(3.6)},${cv.Y(6.25)} ${cv.X(3.6)},${cv.Y(6.1)} ${cv.X(3.5)},${cv.Y(5.5)} C${cv.X(2.4)},${cv.Y(4.75)} ${cv.X(2.4)},${cv.Y(4.6)} ${cv.X(2.5)},${cv.Y(4.0)} C${cv.X(3.6)},${cv.Y(3.25)} ${cv.X(3.6)},${cv.Y(3.1)} ${cv.X(3.5)},${cv.Y(2.5)} C${cv.X(4.2)},${cv.Y(1.9)} ${cv.X(5.6)},${cv.Y(2.6)} ${cv.X(6.4)},${cv.Y(2.8)}`, { fill: 'none', stroke: P1C, 'stroke-width': 3, 'marker-end': 'url(#arr-pub)' });
  cv.text(4.2, 5.2, 'sens du slalom', { 'font-size': 9.5, fill: P1C, 'font-weight': 'bold' });
  cv.text(5.0, 3.35, 'tir intérieur de l\'arc', { 'font-size': 9.5, fill: P1C, 'font-weight': 'bold' });
  // Poste 2 : ligne d'attente (x 12,5 → 13,5 ; y = 9), haies sur l'axe x = 13 (y 8 → 5), cerceau C2 (11,5 ; 4)
  cv.line(12.5, 9.0, 13.5, 9.0, { stroke: C.ink, 'stroke-width': 4 });
  cv.text(13.65, 9.15, 'attente J2', { 'font-size': 9.5, 'font-weight': 'bold' });
  [8.0, 7.0, 6.0, 5.0].forEach((y, i) => { cv.rect(12.6, y - 0.06, 0.8, 0.12, { fill: P2C, stroke: C.ink, 'stroke-width': 0.8 }); cv.text(13.6, y + 0.12, `H${i + 1}`, { 'font-size': 10, 'font-weight': 'bold', fill: P2C }); });
  cv.dimV(14.4, 7.0, 8.0, '1,0 m', { size: 10 });
  cv.dimH(AX, 13.0, 9.6, '5,5 m', { size: 9.5 });
  cv.path(`M${cv.X(13.0)},${cv.Y(8.85)} L${cv.X(13.0)},${cv.Y(4.9)} C${cv.X(13.0)},${cv.Y(4.3)} ${cv.X(12.4)},${cv.Y(4.0)} ${cv.X(12.0)},${cv.Y(4.0)}`, { fill: 'none', stroke: P2C, 'stroke-width': 3, 'stroke-dasharray': '7 4', 'marker-end': 'url(#arr-team)' });
  cv.circle(11.5, 4.0, 0.4, { fill: '#ffffff', stroke: P2C, 'stroke-width': 3 });
  cv.text(11.5, 4.13, 'C2', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 'bold', fill: P2C });
  cv.dimH(AX, 11.5, 4.75, '4 m', { size: 9.5 });
  cv.dimV(10.9, 0, 4.0, '4 m', { size: 9.5, left: true });
  cv.text(13.2, 6.5, 'sans ballon', { 'font-size': 9.5, fill: P2C, 'font-weight': 'bold', 'text-anchor': 'end' });
  // passe J1 → J2
  cv.arrow([[7.3, 2.3], [11.1, 3.8]], P1C, { marker: 'pub', w: 2, dash: '6 4' });
  cv.text(8.8, 2.75, 'passe J1 → J2', { 'font-size': 10, fill: P1C, 'font-weight': 'bold' });
  // Poste 3 : C3 dans l'axe, derrière l'arc (≈ 8,8 m)
  const c3y = by + 6.75 + 0.5;
  cv.circle(AX, c3y, 0.4, { fill: '#ffffff', stroke: P3C, 'stroke-width': 3 });
  cv.text(AX, c3y + 0.13, 'C3', { 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 'bold', fill: P3C });
  cv.arrow([[11.2, 4.35], [7.85, c3y - 0.35]], P2C, { marker: 'team', w: 2, dash: '6 4' });
  cv.text(9.9, 6.9, 'passe J2 → J3', { 'font-size': 10, fill: P2C, 'font-weight': 'bold' });
  cv.text(AX + 0.55, c3y + 0.5, 'tir à 2 points depuis C3', { 'font-size': 9.5, fill: P3C, 'font-weight': 'bold' });
  cv.path(`M${cv.X(AX - 0.4)},${cv.Y(c3y + 0.2)} C${cv.X(6.0)},${cv.Y(9.4)} ${cv.X(5.0)},${cv.Y(9.6)} ${cv.X(4.0)},${cv.Y(10.25)}`, { fill: 'none', stroke: P3C, 'stroke-width': 3, 'marker-end': 'url(#arr-evac)' });
  cv.text(5.0, 9.25, 'retour en dribble', { 'font-size': 9.5, fill: P3C, 'font-weight': 'bold' });
  // pastilles de poste
  const tag = (x, y, n, col) => { cv.dot(x, y, 13, { fill: col, stroke: '#fff', 'stroke-width': 2 }); cv.raw(`<text x="${cv.X(x)}" y="${cv.Y(y) + 5}" text-anchor="middle" font-size="13" font-weight="bold" fill="#fff">${n}</text>`); };
  tag(0.6, 9.3, '1', P1C); tag(14.5, 9.95, '2', P2C); tag(6.4, c3y, '3', P3C);
  cv.rect(0, 0, CW, CL, { fill: 'none', stroke: C.courtLine, 'stroke-width': 2.5 });
  cv.dimH(0, CW, CL + 0.9, '15 m (largeur du terrain 3x3, event.json)');
  cv.dimV(CW + 0.6, 0, CL, '11 m', { size: 11 });
  // Panneau de droite
  const px = 900; let py = 118;
  const panel = [];
  const table = [
    ['Élément (art. 7.2)', 'x (m)', 'y (m)', 'Rôle'],
    ['Ligne D/A (3 m)', '1,50 → 4,50', '10,00', 'départ de J1, arrivée de J3'],
    ['Cellules / repères', '1,50 et 4,50', '10,00', 'aux extrémités de D/A'],
    ...plots.map((y, i) => [`P${i + 1} (poste 1)`, '3,00', y.toFixed(2).replace('.', ','), 'plot de slalom']),
    ['Ligne d\'attente J2', '12,50 → 13,50', '9,00', 'position de J2 au départ'],
    ...[8, 7, 6, 5].map((y, i) => [`H${i + 1} (poste 2)`, '13,00', y.toFixed(2).replace('.', ','), 'haie basse 15–20 cm']),
    ['C2 (poste 2)', '11,50', '4,00', 'réception et tir de J2'],
    ['C3 (poste 3)', '7,50', '≈ 8,8', 'derrière l\'arc à 2 points'],
  ];
  panel.push(`<text x="${px}" y="${py}" font-size="15" font-weight="bold" fill="${C.ink}">Implantation d'une station (A sur T1, B sur T2)</text>`);
  py += 20;
  const colX = [px, px + 140, px + 238, px + 296];
  table.forEach((row, i) => {
    if (i === 0) panel.push(`<rect x="${px - 4}" y="${py - 12}" width="510" height="16" fill="${C.ink}"/>`);
    else if (i % 2) panel.push(`<rect x="${px - 4}" y="${py - 12}" width="510" height="16" fill="#f3f3f3"/>`);
    row.forEach((c, j) => panel.push(`<text x="${colX[j]}" y="${py}" font-size="10.5" ${i === 0 ? 'font-weight="bold" fill="#fff"' : `fill="${C.ink}"`}>${esc(c)}</text>`));
    py += 16;
  });
  py += 12;
  const steps = [
    [P1C, '1', 'J1 part derrière D/A (départ du chrono), slalome en dribble entre P1 et P5, tire à l\'intérieur de l\'arc jusqu\'à réussite (3 tentatives au plus), prend son rebond et passe à J2.'],
    [P2C, '2', 'J2 attend derrière sa ligne, franchit les 4 haies sans ballon une fois le panier de J1 marqué, reçoit dans C2 et tire jusqu\'à réussite (3 tentatives au plus), puis passe à J3.'],
    [P3C, '3', 'J3 attend un pied dans C3, tire à 2 points jusqu\'à réussite (3 tentatives au plus), puis revient en dribble franchir D/A (arrêt du chrono).'],
  ];
  panel.push(`<text x="${px}" y="${py}" font-size="13" font-weight="bold" fill="${C.ink}">Déroulé (règlement, art. 7.3)</text>`);
  py += 18;
  for (const [col, n, t] of steps) {
    panel.push(`<circle cx="${px + 9}" cy="${py - 4}" r="9" fill="${col}"/><text x="${px + 9}" y="${py}" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">${n}</text>`);
    const ls = wrap(t, 80); ls.forEach((ln, i) => panel.push(`<text x="${px + 24}" y="${py + i * 13}" font-size="10.5" fill="${C.ink}">${esc(ln)}</text>`)); py += ls.length * 13 + 6;
  }
  py += 6;
  const notes = [
    'Géométrie de l\'article 7.2 du règlement (section 12.2), qui fait foi. Distances depuis la ligne de fond ; gauche et droite vues depuis la ligne de départ, face au panier. Axe du panier supposé à x = 7,50 : si le panier réel est décalé, mesurer depuis son axe réel.',
    'Centre du panier, raquette et arc schématiques : cotes officielles du terrain 3x3 à reprendre du règlement FIBA 3x3 en vigueur ; C3 se cale sur l\'arc réellement tracé.',
    'Par station : 5 plots, 4 haies souples ou à rabat (15 à 20 cm), 2 cerceaux, 1 ballon de match identique pour toutes les équipes, cellules ou tablette, 2 chronomètres manuels, adhésif parquet.',
    'Chronométrage, pénalités, plafond de 90 s, ordre de passage, égalités, réclamations : annexes/reglement-parcours-qualification.md.',
    'Durée réelle d\'un run à mesurer lors du test (jalon J-30).',
  ];
  panel.push(`<text x="${px}" y="${py}" font-size="13" font-weight="bold" fill="${C.warn}">Notes</text>`);
  py += 16;
  for (const n of notes) { const ls = wrap(n, 84); ls.forEach((ln, i) => panel.push(`<text x="${px + (i ? 10 : 0)}" y="${py + i * 13}" font-size="10.5" fill="${C.ink}">${esc((i ? '' : '• ') + ln)}</text>`)); py += ls.length * 13 + 4; }
  const width = 1440, height = Math.max(1000, py + 110);
  const fy = height - 72;
  const body = [
    header(width, 'LA GRILLE 3x3 — Parcours de qualification', 'Relais technique à 3 joueurs (règlement, art. 7) — 1 station = 1 demi-terrain 3x3 (Q1 et Q2 : stations A et B ; Q3 : station A, terrain central)'),
    cv.out.join('\n'),
    panel.join('\n'),
    scaleAndNorth(80, 790, S, { localNote: ['Repère local de la station (pas d\'orientation géographique).', 'Implanter les deux stations dans le même sens par rapport à leur panier.'] }),
    `<text x="80" y="${fy}" font-size="10.5" fill="${C.warn}" font-weight="bold">${esc('Plan v' + PLAN_VERSION + ' du ' + PLAN_DATE + ' — sources : règlement LA GRILLE 3x3 (section 12.2, art. 7.2) et event.json v' + config.version + ' (brique « qualification » : 2 stations, 90 s maximum, 60 s de remise en place).')}</text>`,
    ...wrap(WARNING, 210).map((ln, i) => `<text x="80" y="${fy + 18 + i * 13}" font-size="10" fill="${C.warn}">${esc(ln)}</text>`),
  ].join('\n');
  fs.writeFileSync(path.join(here, 'parcours-qualification.svg'), svgDoc(width, height, 'LA GRILLE 3x3 — Parcours de qualification', `Schéma coté du parcours technique chronométré (règlement, article 7). ${WARNING}`, body));
})();

console.log('Plans écrits dans', here);
