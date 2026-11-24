import type { ExperienceDefinition } from '@sdk';
import { THUMB_MODULAR, box, wrap } from '../thumbs';

/* Thumbnail of the hub arrangement: a glowing central platform, departments in a ring, one walkway each (two lit). */
const RING = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 10;
  return { i, x: 160 + Math.cos(a) * 118, y: 92 + Math.sin(a) * 58 };
});
const TONES: Array<[string, string, string]> = [
  ['#e1daf7', '#d0c9e6', '#bfb8d5'], ['#d2e3f7', '#c1d2e6', '#b0c1d5'], ['#cdebdc', '#bcdacb', '#abc9ba'], ['#f9dec7', '#e8cdb6', '#d7bca5'], ['#f3e8b6', '#e2d7a5', '#d1c694'],
  ['#f4d2dc', '#e3c1cb', '#d2b0ba'], ['#ccebeb', '#bbdada', '#aac9c9'], ['#dbe6cf', '#cad5be', '#b9c4ad'], ['#d2e3f7', '#c1d2e6', '#b0c1d5'], ['#e1daf7', '#d0c9e6', '#bfb8d5'],
];
const THUMB_HUB = wrap(
  `<ellipse cx="160" cy="96" rx="118" ry="58" fill="none" stroke="#7b3fe4" stroke-opacity=".18" stroke-width="7"/>` +
    RING.map(({ i, x, y }) => `<path d="M160 96 L${x.toFixed(1)} ${(y + 9).toFixed(1)}" stroke="${i === 1 || i === 6 ? '#7b3fe4' : '#9aa3b5'}" stroke-width="${i === 1 || i === 6 ? 2.5 : 1.2}" stroke-dasharray="${i === 1 || i === 6 ? '3 3' : '1 3'}" stroke-linecap="round"/>`).join('') +
    `<path d="M108 96 A52 25 0 0 0 212 96 L212 104 A52 25 0 0 1 108 104 Z" fill="#cbb8f3" stroke="#16203a" stroke-opacity=".5"/>` +
    `<ellipse cx="160" cy="96" rx="52" ry="25" fill="#f1ebfd" stroke="#7b3fe4" stroke-width="2.5"/>` +
    `<ellipse cx="160" cy="96" rx="36" ry="17" fill="none" stroke="#7b3fe4" stroke-opacity=".35" stroke-dasharray="2 3"/>` +
    `<rect x="156" y="52" width="8" height="34" rx="4" fill="#7b3fe4" fill-opacity=".28"/>` +
    `<circle cx="160" cy="84" r="9" fill="#a47bff" stroke="#5b2bc0"/><ellipse cx="160" cy="84" rx="14" ry="4.5" fill="none" stroke="#5b2bc0" stroke-opacity=".7"/>` +
    [...RING].sort((a, b) => a.y - b.y).map(({ i, x, y }) => box(x, y - 4, 40, 4, ...TONES[i])).join(''),
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'modular-office',
      name: 'AI Modular Office',
      description: 'Hybride : chaque département est une plateforme miniature reliée aux autres. Réorganisable, extensible, avec regroupement automatique quand le système grandit.',
      version: '0.1.0',
      thumbnail: THUMB_MODULAR,
      family: 'scene-2d',
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'arrangement', label: 'Disposition', default: 'grid', options: [{ value: 'grid', label: 'Grille' }, { value: 'hub', label: 'Hub central' }], group: 'Disposition' },
        { type: 'number', key: 'gap', label: 'Espacement des plateformes', default: 2, min: 1, max: 4, step: 0.5, unit: 'cases', group: 'Disposition' },
        { type: 'select', key: 'grouping', label: 'Regroupement', default: 'auto', options: [{ value: 'auto', label: 'Automatique' }, { value: 'always', label: 'Toujours' }, { value: 'never', label: 'Jamais' }], group: 'Disposition' },
        { type: 'number', key: 'thickness', label: 'Épaisseur des plateformes', default: 0.3, min: 0.1, max: 0.6, step: 0.05, group: 'Formes' },
        { type: 'boolean', key: 'showLinks', label: 'Connexions entre plateformes', default: true, group: 'Scène' },
        { type: 'boolean', key: 'showIndicators', label: 'Indicateurs sur les plateformes', default: true, group: 'Scène' },
      ],
      components: ['IsoFloor', 'IsoFigure', 'IsoFlowPath', 'ZoomPan', 'Minimap', 'ClusterPlate'],
      layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Réorganisation au clavier (flèches) en plus du glisser-déposer.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'high', maxNodes: 600, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./ModularOffice'),
  },
  {
    manifest: {
      id: 'hub-office',
      name: 'Hub central',
      description: 'Variante du Modular Office : le bureau de direction sur une plateforme centrale lumineuse, les départements en anneau par pôle ; une passerelle ne s’éclaire que pour un échange enregistré. Panneau de statut des tâches.',
      version: '0.2.0',
      thumbnail: THUMB_HUB,
      family: 'scene-2d',
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'arrangement', label: 'Disposition', default: 'hub', options: [{ value: 'grid', label: 'Grille' }, { value: 'hub', label: 'Hub central' }], group: 'Disposition' },
        { type: 'number', key: 'gap', label: 'Espacement des plateformes', default: 2, min: 1, max: 4, step: 0.5, unit: 'cases', group: 'Disposition' },
        { type: 'select', key: 'grouping', label: 'Regroupement', default: 'auto', options: [{ value: 'auto', label: 'Automatique' }, { value: 'always', label: 'Toujours' }, { value: 'never', label: 'Jamais' }], group: 'Disposition' },
        { type: 'number', key: 'thickness', label: 'Épaisseur des plateformes', default: 0.3, min: 0.1, max: 0.6, step: 0.05, group: 'Formes' },
        { type: 'boolean', key: 'showLinks', label: 'Connexions entre plateformes', default: true, group: 'Scène' },
        { type: 'boolean', key: 'showIndicators', label: 'Indicateurs sur les plateformes', default: true, group: 'Scène' },
      ],
      components: ['IsoFloor', 'IsoFigure', 'IsoFlowPath', 'ZoomPan', 'ClusterPlate', 'HubPlatform', 'TaskStatusPanel'],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Réorganisation de l’anneau au clavier (flèches) ; chaque tâche du panneau de statut est un bouton.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'high', maxNodes: 600, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./ModularOffice'),
  },
];
