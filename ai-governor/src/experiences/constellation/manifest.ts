import type { ExperienceDefinition, GraphicParam } from '@sdk';
import { wrap } from '../thumbs';

/* ---------- thumbnails (static SVG, drawn from a fixed seed) ---------- */

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f1 = (n: number) => Math.round(n * 10) / 10;

/** Night burst: bright core, five coloured arms of filaments, sparse dust. */
function burstThumb(): string {
  const r = seeded(7);
  const arms = ['#9a7bff', '#4fd1c5', '#ffb36b', '#ff7aa8', '#7cc4ff'];
  const cx = 160, cy = 90;
  let rays = '';
  let dots = '';
  for (let i = 0; i < 70; i++) {
    const k = i % arms.length;
    const a = (k / arms.length) * Math.PI * 2 + 0.4 + (r() - 0.5) * 0.7;
    const len = 30 + r() * 70;
    const x = cx + Math.cos(a) * len * 1.25, y = cy + Math.sin(a) * len * 0.72;
    const mx = cx + Math.cos(a + 0.25) * len * 0.6, my = cy + Math.sin(a + 0.25) * len * 0.36;
    rays += `<path d="M${cx} ${cy}Q${f1(mx)} ${f1(my)} ${f1(x)} ${f1(y)}" stroke="${arms[k]}" stroke-opacity="${f1(0.15 + r() * 0.35)}" fill="none"/>`;
    dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.8 + r() * 2)}" fill="${arms[k]}"/>`;
  }
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2, d = 20 + r() * 115;
    dots += `<circle cx="${f1(cx + Math.cos(a) * d * 1.2)}" cy="${f1(cy + Math.sin(a) * d * 0.7)}" r=".6" fill="#fff" fill-opacity="${f1(0.2 + r() * 0.4)}"/>`;
  }
  return wrap(
    `<defs><radialGradient id="cstc" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff"/><stop offset=".2" stop-color="#c9b8ff" stop-opacity=".8"/><stop offset="1" stop-color="#7b3fe4" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="cstb" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#1d1638"/><stop offset="1" stop-color="#07070c"/></radialGradient></defs>` +
      `<rect width="320" height="180" fill="url(#cstb)"/><g stroke-width="1">${rays}</g>${dots}` +
      `<circle cx="${cx}" cy="${cy}" r="34" fill="url(#cstc)"/><circle cx="${cx}" cy="${cy}" r="5" fill="#fff"/>`,
  );
}

/** Light sphere: Fibonacci points in coloured regions, hubs with spokes, governor at the centre. */
function sphereThumb(): string {
  const cx = 160, cy = 90, R = 74;
  const regions = ['#2e7cf6', '#7b3fe4', '#14a06f', '#d99a00', '#e0607e', '#0e9ab0'];
  const n = 150;
  const ga = Math.PI * (3 - Math.sqrt(5));
  let back = '';
  let front = '';
  let spokes = '';
  const hubs: Array<[number, number, string]> = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const rr = Math.sqrt(1 - y * y);
    const t = ga * i;
    const x3 = Math.cos(t) * rr, z3 = Math.sin(t) * rr;
    // tilt toward the viewer
    const yy = y * 0.94 - z3 * 0.34, zz = y * 0.34 + z3 * 0.94;
    const sx = cx + x3 * R, sy = cy - yy * R;
    const col = regions[Math.min(regions.length - 1, Math.floor(((Math.atan2(zz, x3) + Math.PI) / (2 * Math.PI)) * 3) + (y > 0 ? 0 : 3))];
    const hub = i % 25 === 12;
    const dot = `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${hub ? 4.2 : f1(1.4 + (zz + 1) * 0.6)}" fill="${col}" fill-opacity="${zz > 0 ? 0.95 : 0.35}"${hub ? ' stroke="#16203a" stroke-opacity=".5"' : ''}/>`;
    if (zz > 0) front += dot;
    else back += dot;
    if (hub) hubs.push([sx, sy, col]);
    else if (i % 3 === 0 && hubs.length) {
      const h = hubs[hubs.length - 1];
      if (Math.hypot(h[0] - sx, h[1] - sy) < 40) spokes += `<path d="M${f1(h[0])} ${f1(h[1])}L${f1(sx)} ${f1(sy)}" stroke="${h[2]}" stroke-opacity=".35"/>`;
    }
  }
  const centre = hubs.map(([x, y]) => `<path d="M${cx} ${cy}L${f1(x)} ${f1(y)}" stroke="#5a6580" stroke-opacity=".35"/>`).join('');
  const arc = `<path d="M${f1(hubs[1]?.[0] ?? 120)} ${f1(hubs[1]?.[1] ?? 70)}Q${cx + 30} ${cy - 60} ${f1(hubs[4]?.[0] ?? 210)} ${f1(hubs[4]?.[1] ?? 80)}" stroke="#7b3fe4" stroke-width="2" fill="none"/>`;
  return wrap(
    `<circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="#fbfcfd" stroke="#cbd5df"/>` +
      back +
      `<g stroke-width=".8">${centre}${spokes}</g>` +
      front +
      arc +
      `<circle cx="${cx}" cy="${cy}" r="7" fill="#16203a"/><circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#7b3fe4" stroke-width="1.5"/>`,
  );
}

/* ---------- shared manifest parts ---------- */

const graphics = (form: 'burst' | 'sphere'): GraphicParam[] => [
  { type: 'select', key: 'form', label: 'Forme', default: form, options: [{ value: 'burst', label: 'Explosion' }, { value: 'sphere', label: 'Sphère' }], group: 'Scène' },
  { type: 'number', key: 'bgDensity', label: 'Densité des particules de fond (décoratives, explosion)', default: 0.3, min: 0, max: 1, step: 0.05, group: 'Scène' },
  { type: 'number', key: 'rotationSpeed', label: 'Vitesse de rotation (qualité haute)', default: 3, min: 0, max: 12, step: 0.5, unit: '°/s', group: 'Mouvement' },
  { type: 'number', key: 'flowWindowMin', label: 'Fenêtre des flux réels', default: 10, min: 1, max: 60, step: 1, unit: 'min', group: 'Données' },
  { type: 'boolean', key: 'showCatalogLinks', label: 'Afficher les liens du catalogue', default: true, group: 'Données' },
  { type: 'boolean', key: 'showEvents', label: 'Un point par événement réel de la période (explosion)', default: true, group: 'Données' },
  { type: 'boolean', key: 'showTasks', label: 'Afficher les tâches de la période (satellites)', default: true, group: 'Données' },
  { type: 'select', key: 'sizeBy', label: 'Taille des nœuds selon', default: 'calls', options: [{ value: 'calls', label: 'Appels' }, { value: 'tokens', label: 'Tokens' }], group: 'Données' },
  { type: 'number', key: 'glowIntensity', label: 'Intensité des lueurs (thèmes sombres)', default: 0.6, min: 0, max: 1, step: 0.05, group: 'Rendu' },
  { type: 'select', key: 'labels', label: 'Étiquettes', default: 'hubs', options: [{ value: 'hubs', label: 'Principales' }, { value: 'all', label: 'Toutes' }, { value: 'none', label: 'Aucune' }], group: 'Rendu' },
];

const common = {
  version: '0.2.0',
  family: 'scene-3d' as const,
  renderer: 'canvas2d' as const,
  status: 'prototype' as const,
  components: ['NatureBadge', 'StatusPill', 'Segmented'],
  layout: { kind: 'scene' as const, zoomPan: true, minimap: false, minWidth: 320, immersive: true },
  accessibility: {
    keyboard: true,
    screenReaderSummary: true,
    reducedMotion: 'full' as const,
    contrast: 'AA' as const,
    notes: 'Liste des nœuds au clavier (Tab), flèches pour tourner, + / − pour zoomer, Entrée pour ouvrir l’inspecteur ; résumé textuel de la scène.',
  },
  dependencies: { sdk: '^1.0.0', libraries: [] },
  performance: { cost: 'medium' as const, maxNodes: 400, targetFps: 30, animated: true },
  devices: { desktop: 'full' as const, tablet: 'full' as const, mobile: 'adapted' as const, fallbackId: 'system-map' },
  createdAt: '2026-11-24',
};

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      ...common,
      id: 'constellation',
      name: 'Constellation',
      description:
        'Le Gouverneur au cœur d’une explosion de points : départements en bras, moteurs autour, modèles et outils en halo. Taille = activité réelle ; seuls les flux réels récents s’allument et transportent des particules.',
      thumbnail: burstThumb(),
      graphics: graphics('burst'),
    },
    load: () => import('./Constellation'),
  },
  {
    manifest: {
      ...common,
      id: 'network-sphere',
      name: 'Sphère réseau',
      description:
        'Le catalogue réparti en régions colorées sur une sphère (agents, pôles de départements et leurs tâches, modèles, outils, données), le Gouverneur au centre ; les flux réels récents tracent des arcs de grand cercle.',
      thumbnail: sphereThumb(),
      graphics: graphics('sphere'),
    },
    load: () => import('./Constellation'),
  },
];
