import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

/* Thumbnail: a night tower, one floor per pole, a few windows lit, an elevator shaft with a dot. */
const S = 11.5;
const iso = (x: number, y: number, z: number) => [150 + (x - y) * S, 104 + ((x + y) * S) / 2 - z * S] as const;
const poly = (pts: ReadonlyArray<readonly [number, number]>, fill: string, extra = '') =>
  `<path d="M${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' L')} Z" fill="${fill}" ${extra}/>`;
const prism = (x: number, y: number, z: number, w: number, d: number, h: number, top: string, left: string, right: string) =>
  poly([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)], left, 'stroke="#0b0d16" stroke-opacity=".5"') +
  poly([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)], right, 'stroke="#0b0d16" stroke-opacity=".5"') +
  poly([iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)], top, 'stroke="#0b0d16" stroke-opacity=".5"');
const LIT: Record<string, string> = { w: '#ffe0a0', a: '#f2a33a', r: '#ff5c63', o: '#262c40' };
const ROWS = ['owwoaoww', 'wowoowor', 'oowwowoo', 'wwoooawo'];
const windows = ROWS.map((row, f) =>
  [...row].map((c, b) => poly([iso(b + 0.2, 3, f * 1.5 + 0.35), iso(b + 0.8, 3, f * 1.5 + 0.35), iso(b + 0.8, 3, f * 1.5 + 1.25), iso(b + 0.2, 3, f * 1.5 + 1.25)], LIT[c])).join(''),
).join('');
const pent = 'wwoww';
const pentWin = [...pent].map((c, b) => poly([iso(0.5 + b + 0.2, 2.6, 6.35), iso(0.5 + b + 0.8, 2.6, 6.35), iso(0.5 + b + 0.8, 2.6, 7.25), iso(0.5 + b + 0.2, 2.6, 7.25)], LIT[c])).join('');
const [dx, dy] = iso(8.5, 2.35, 3.6);

export const THUMB_TOWER = wrap(
    `<rect width="320" height="180" fill="#0c0f1c"/><circle cx="268" cy="30" r="9" fill="#efe8d2"/>` +
      [[24, 22], [60, 40], [96, 16], [210, 26], [236, 56], [296, 70], [130, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#fff" opacity=".7"/>`).join('') +
      prism(-7, -4, 0, 2.6, 2.2, 5, '#151a2b', '#10131f', '#0b0e18') +
      prism(11, -5, 0, 2.6, 2.4, 4.2, '#151a2b', '#10131f', '#0b0e18') +
      poly([iso(-2, -1.5, 0), iso(11, -1.5, 0), iso(11, 5.5, 0), iso(-2, 5.5, 0)], '#161a28', 'stroke="#2a2f40"') +
      prism(0, 0, 0, 8, 3, 6, '#2a2f40', '#1d2130', '#141724') +
      windows +
      prism(0.5, 0.5, 6, 5, 2.1, 1.5, '#2e3446', '#1f2434', '#161a27') +
      pentWin +
      prism(8, 1.85, 0, 1, 1, 7.9, '#9fb2e6', '#6f86c8', '#4c5e96') +
      `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="2.6" fill="#c9b8ff" stroke="#0b0d16"/>`,
  );

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'tower',
      name: 'Siège',
      description: 'Un immeuble de nuit : un étage par pôle, une fenêtre éclairée par moteur au travail, un ascenseur pour les échanges réels ; plan de chaque étage et autopilote.',
      version: '0.2.0',
      thumbnail: THUMB_TOWER,
      family: 'scene-2d',
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'number', key: 'bays', label: 'Baies par étage', default: 8, min: 4, max: 12, step: 1, unit: 'fenêtres', group: 'Immeuble' },
        { type: 'number', key: 'floorHeight', label: 'Hauteur d’étage', default: 1.5, min: 1.2, max: 2.4, step: 0.1, group: 'Immeuble' },
        { type: 'boolean', key: 'showShaft', label: 'Afficher l’ascenseur (échanges entre étages)', default: true, group: 'Immeuble' },
        { type: 'select', key: 'ambiance', label: 'Ambiance', default: 'auto', options: [{ value: 'auto', label: 'Automatique (selon le thème)' }, { value: 'day', label: 'Jour' }, { value: 'night', label: 'Nuit' }], group: 'Ambiance' },
      ],
      components: ['IsoBox', 'IsoFloor', 'IsoBackWalls', 'ZoomPan', 'Antenna', 'Plant', 'NatureBadge'],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Chaque étage, pièce et moteur est focusable ; Échap revient à l’immeuble ; résumé textuel de la façade.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 300, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Tower'),
  },
];
