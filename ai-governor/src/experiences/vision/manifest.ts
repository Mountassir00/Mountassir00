import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

const win = (x: number, y: number, w: number, h: number, body: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="#1b2130" fill-opacity=".78" stroke="#4c9bff" stroke-opacity=".9"/>` +
  `<rect x="${x - 1.5}" y="${y - 1.5}" width="${w + 3}" height="${h + 3}" rx="10.5" fill="none" stroke="#4c9bff" stroke-opacity=".25" stroke-width="3"/>` +
  `<circle cx="${x + 8}" cy="${y + 8}" r="2" fill="#3fcf6c"/><circle cx="${x + 14}" cy="${y + 8}" r="2" fill="#5b6275"/><rect x="${x + 21}" y="${y + 6}" width="${Math.min(40, w - 30)}" height="4" rx="2" fill="#e8ecf5"/>` +
  body;

const THUMB = wrap(
  `<defs><radialGradient id="vzA" cx=".2" cy=".2" r=".7"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="vzB" cx=".85" cy=".3" r=".6"><stop offset="0" stop-color="#4c9bff" stop-opacity=".45"/><stop offset="1" stop-color="#4c9bff" stop-opacity="0"/></radialGradient></defs>` +
  `<rect width="320" height="180" fill="#aab3bf"/><rect y="118" width="320" height="62" fill="#c9bfb1"/><rect width="320" height="180" fill="url(#vzA)"/><rect width="320" height="180" fill="url(#vzB)"/>` +
  `<rect x="10" y="14" width="24" height="152" rx="12" fill="#1b2130" fill-opacity=".8" stroke="#4c9bff" stroke-opacity=".7"/>` +
  `<circle cx="22" cy="30" r="6" fill="#4c9bff"/><circle cx="22" cy="54" r="6" fill="#4c9bff" stroke="#9cc6ff"/><circle cx="22" cy="72" r="5" fill="#2a3245"/><circle cx="22" cy="88" r="5" fill="#2a3245"/>` +
  `<path d="M32 54h8v-8M40 54v14" stroke="#9aa3b5" stroke-width="1" fill="none"/>` +
  win(42, 14, 76, 152, [0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="50" y="${32 + i * 18}" width="10" height="4" rx="2" fill="#5b6275"/><rect x="64" y="${31 + i * 18}" width="${30 + ((i * 11) % 14)}" height="5" rx="2.5" fill="#cfd6e4"/><circle cx="110" cy="${33.5 + i * 18}" r="2.4" fill="${['#4c9bff', '#3fcf6c', '#f2b33d', '#4c9bff', '#3fcf6c', '#3fcf6c', '#ff5d6c'][i]}"/>`).join('')) +
  win(126, 14, 118, 100, `<rect x="132" y="26" width="106" height="66" rx="6" fill="#0c111c"/>` +
    [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${137 + c * 20}" y="${31 + r * 20}" width="14" height="11" rx="2" fill="#26324a"/>`).join('')).join('') +
    `<path d="M144 42V50H210V44H226" stroke="#4c9bff" stroke-width="2.4" fill="none" stroke-linejoin="round"/><circle cx="228" cy="44" r="4" fill="none" stroke="#4c9bff"/>` +
    `<rect x="132" y="98" width="30" height="10" rx="4" fill="#2a3245"/><rect x="166" y="98" width="30" height="10" rx="4" fill="#2a3245"/><rect x="200" y="98" width="30" height="10" rx="4" fill="#2a3245"/>`) +
  win(126, 120, 118, 46, [0, 1, 2, 3].map((i) => `<circle cx="${140 + i * 9}" cy="146" r="7" fill="${['#e9d5ff', '#c7f0d8', '#ffe2b8', '#4c9bff'][i]}" stroke="#1b2130" stroke-width="1.5"/>`).join('') + `<rect x="184" y="141" width="26" height="9" rx="3" fill="#e8ecf5"/>`) +
  win(252, 14, 58, 70, `<rect x="258" y="28" width="22" height="24" rx="4" fill="#2a4a7a"/><rect x="283" y="28" width="22" height="24" rx="4" fill="#2a3245"/><rect x="258" y="56" width="22" height="22" rx="4" fill="#2a3245"/><rect x="283" y="56" width="22" height="22" rx="4" fill="#2a3245"/>`) +
  win(252, 90, 58, 76, [0, 1, 2].map((i) => `<rect x="258" y="${106 + i * 18}" width="9" height="9" rx="3" fill="${['#4c9bff', '#ff5d6c', '#f2b33d'][i]}" opacity=".8"/><rect x="271" y="${107 + i * 18}" width="32" height="4" rx="2" fill="#cfd6e4"/>`).join('')),
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'vision',
      name: 'Vision',
      description: "Fenêtres de verre flottantes et lumineuses, à la manière d'un casque de réalité mixte : indicateurs, tâches, carte des flux.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'color', key: 'glow', label: 'Couleur du halo des fenêtres', default: '#4c9bff', group: 'Verre' },
        { type: 'number', key: 'tilt', label: 'Inclinaison spatiale des fenêtres', default: 4, min: 0, max: 10, step: 1, unit: '°', group: 'Verre' },
        { type: 'number', key: 'parallax', label: 'Amplitude de la parallaxe (pointeur)', default: 10, min: 0, max: 24, step: 2, unit: 'px', group: 'Animation' },
        { type: 'number', key: 'flowWindow', label: 'Fenêtre de la carte des flux', default: 10, min: 2, max: 60, step: 1, unit: 'min', group: 'Données' },
      ],
      components: ['GlassWindow', 'GlassDock', 'FlowMap', 'AgentAvatar', 'NatureBadge'],
      layout: { kind: 'grid', immersive: true, zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Fenêtres déplaçables au clavier (poignée + flèches) ; verre opaque si le flou n’est pas pris en charge.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'medium', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Vision'),
  },
];
