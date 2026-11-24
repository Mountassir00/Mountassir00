import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

const card = (x: number, y: number, h: number, rows: number, accent: number) =>
  `<rect x="${x}" y="${y}" width="104" height="${h}" rx="9" fill="#ffffff" stroke="#e2e2e7"/><rect x="${x + 8}" y="${y + 8}" width="34" height="5" rx="2.5" fill="#16161a"/>` +
  Array.from({ length: rows }, (_, i) => `<circle cx="${x + 11}" cy="${y + 22 + i * 9}" r="2.2" fill="${i === accent ? '#7b3fe4' : '#c4c4cc'}"/><rect x="${x + 17}" y="${y + 20 + i * 9}" width="${30 + ((i * 17) % 24)}" height="4" rx="2" fill="#8a8a94"/><rect x="${x + 80}" y="${y + 19.5 + i * 9}" width="16" height="5" rx="2.5" fill="${i === accent ? '#e9e0fb' : '#f0f0f3'}"/>`).join('');

const THUMB = wrap(
  `<rect width="320" height="180" fill="#f4f4f6"/>` +
  card(16, 12, 44, 2, 0) + card(16, 64, 62, 4, 1) + card(16, 134, 36, 2, -1) +
  card(200, 18, 62, 4, 2) + card(200, 90, 52, 3, -1) +
  `<path d="M120 34H139M120 95H139M120 152H139M181 49H200M181 116H200" stroke="#16161a" stroke-opacity=".25"/>` +
  `<rect x="139" y="10" width="42" height="160" rx="21" fill="none" stroke="#16161a" stroke-opacity=".55" stroke-width="1.4"/>` +
  `<circle cx="181" cy="58" r="3.4" fill="#7b3fe4"/><circle cx="148" cy="166" r="3.4" fill="#7b3fe4"/><circle cx="139" cy="98" r="3.4" fill="#7b3fe4"/>` +
  `<rect x="148" y="5" width="24" height="11" rx="5.5" fill="#111114"/><rect x="153" y="9.5" width="14" height="2.5" rx="1" fill="#fff"/>` +
  `<rect x="146" y="76" width="28" height="28" rx="8" fill="#111114"/><path d="M160 83l7 4v7l-7 4-7-4v-7z" fill="none" stroke="#c9b4ff" stroke-width="1.4"/>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'loop',
      name: 'Boucle d’équipe',
      description: "Votre organisation en boucle : vous et le Gouverneur au centre, chaque pôle en carte avec ses agents et leur production.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'dashboard',
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'number', key: 'activityWindow', label: 'Fenêtre d’activité de la boucle', default: 5, min: 1, max: 30, step: 1, unit: 'min', group: 'Données' },
        { type: 'number', key: 'dotSpeed', label: 'Durée d’un tour des points', default: 14, min: 4, max: 40, step: 1, unit: 's', group: 'Animation' },
        { type: 'boolean', key: 'showConnectors', label: 'Liaisons entre les cartes et la boucle', default: true, group: 'Graphiques' },
        { type: 'select', key: 'density', label: 'Densité des cartes', default: 'comfortable', options: [{ value: 'comfortable', label: 'Confortable' }, { value: 'compact', label: 'Compacte' }], group: 'Disposition' },
        { type: 'number', key: 'outputs', label: 'Réalisations affichées dans « Production »', default: 6, min: 3, max: 15, step: 1, group: 'Données' },
      ],
      components: ['LoopTrack', 'GroupCard', 'ProductionPanel', 'StatusPill', 'NatureBadge'],
      layout: { kind: 'grid', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Échap ferme la production ; chaque agent et département est un bouton.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Loop'),
  },
];
