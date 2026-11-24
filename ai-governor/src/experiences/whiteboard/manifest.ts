import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

const sticky = (x: number, y: number, c: string, r = 0) =>
  `<g transform="rotate(${r} ${x + 17} ${y + 15})"><rect x="${x}" y="${y}" width="34" height="30" rx="2" fill="${c}"/><rect x="${x + 5}" y="${y + 7}" width="22" height="3" rx="1.5" fill="#3f3f46" opacity=".55"/><rect x="${x + 5}" y="${y + 13}" width="16" height="3" rx="1.5" fill="#3f3f46" opacity=".4"/></g>`;
const node = (x: number, y: number, c: string, s: string) => `<rect x="${x}" y="${y}" width="30" height="24" rx="5" fill="${c}" stroke="${s}" stroke-width="1.2"/>`;

const THUMB = wrap(
  // generated frame: task cycle
  `<rect x="14" y="16" width="176" height="74" rx="9" fill="#ffffff" stroke="#d6d6dd"/>` +
  `<rect x="22" y="24" width="70" height="5" rx="2.5" fill="#16161a"/>` +
  node(22, 40, '#dce8fb', '#2e6fe0') + node(64, 40, '#fbe6d5', '#b7790b') + node(106, 40, '#e9e0fb', '#7b3fe4') + node(148, 40, '#d9f2e4', '#13915f') +
  `<path d="M53 52h9M95 52h9M137 52h9" stroke="#62626c" stroke-width="1.4"/>` +
  node(85, 70, '#f9dde6', '#d93a45').replace('height="24"', 'height="14"') +
  // decisions stickies
  `<rect x="200" y="16" width="106" height="74" rx="9" fill="#ffffff" stroke="#d6d6dd"/>` +
  sticky(208, 34, '#f9dde6', -3) + sticky(248, 32, '#f8efc3', 2) + sticky(228, 56, '#d9f2e4', -1).replace(/y="56"/g, 'y="58"') +
  // routing diamond
  `<rect x="14" y="100" width="150" height="66" rx="9" fill="#ffffff" stroke="#d6d6dd"/>` +
  `<path d="M89 108 L107 120 L89 132 L71 120 Z" fill="#f8efc3" stroke="#b7790b" stroke-width="1.2"/>` +
  `<path d="M89 132v8M44 140h90M44 140v6M89 140v6M134 140v6" stroke="#62626c" stroke-width="1.2" fill="none"/>` +
  `<rect x="30" y="146" width="28" height="14" rx="3" fill="#fff" stroke="#7b3fe4"/><rect x="75" y="146" width="28" height="14" rx="3" fill="#fff" stroke="#2e7cf6"/><rect x="120" y="146" width="28" height="14" rx="3" fill="#fff" stroke="#14a06f"/>` +
  // user objects: sticky + arrow + doc
  sticky(178, 112, '#ffe07a', -4) +
  `<path d="M214 126 C232 126 236 140 252 140" stroke="#3f3f46" stroke-width="1.6" fill="none"/><path d="M248 136l5 4-6 2" fill="none" stroke="#3f3f46" stroke-width="1.6"/>` +
  `<rect x="256" y="100" width="50" height="66" rx="8" fill="#ffffff" stroke="#7b3fe4" stroke-width="1.4"/>` +
  `<rect x="263" y="110" width="30" height="4" rx="2" fill="#16161a"/><rect x="263" y="120" width="36" height="3" rx="1.5" fill="#9a9aa5"/><rect x="263" y="127" width="32" height="3" rx="1.5" fill="#9a9aa5"/><rect x="263" y="134" width="26" height="3" rx="1.5" fill="#9a9aa5"/>` +
  // floating toolbar
  `<rect x="118" y="4" width="84" height="10" rx="5" fill="#16161a"/>` +
  [0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${127 + i * 13}" cy="9" r="2.2" fill="${i === 0 ? '#ffffff' : '#9a9aa5'}"/>`).join(''),
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'whiteboard',
      name: 'Tableau blanc',
      description: "Toile infinie : cadres générés depuis les données (cycle des tâches, routage, décisions, recommandations), post-it, formes et flèches à vous, panneau d'assistance calculé localement.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'tool',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'grid', label: 'Fond de la toile', default: 'dots', options: [{ value: 'dots', label: 'Points' }, { value: 'lines', label: 'Quadrillage' }, { value: 'none', label: 'Uni' }], group: 'Toile' },
        { type: 'select', key: 'palette', label: 'Couleurs des post-it', default: 'pastel', options: [{ value: 'pastel', label: 'Pastel (suit le thème)' }, { value: 'vivid', label: 'Vives' }], group: 'Toile' },
        { type: 'boolean', key: 'showFrames', label: 'Afficher les cadres générés depuis les données', default: true, group: 'Contenu' },
        { type: 'boolean', key: 'minimap', label: 'Mini-carte affichée par défaut', default: true, group: 'Navigation' },
      ],
      components: ['InfiniteCanvas', 'GeneratedFrames', 'StickyNotes', 'Connectors', 'DocumentBlock', 'AssistPanel', 'Minimap', 'NatureBadge', 'StatusPill'],
      layout: { kind: 'workspace', zoomPan: true, minimap: true, minWidth: 320, immersive: true },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Raccourcis V H R P T N C, flèches pour déplacer, Suppr, Ctrl+Z/D. Objets et cadres atteignables au clavier ; résumé textuel des cadres générés.',
      },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'medium', maxNodes: 600, targetFps: 30, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Whiteboard'),
  },
];
