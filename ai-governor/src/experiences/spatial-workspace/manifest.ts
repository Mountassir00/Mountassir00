import type { ExperienceDefinition } from '@sdk';
import { box, wrap } from '../thumbs';

/** Thumbnail: explorer column, 3D office with a vault, a desk, a glass board, robots on glowing rings and a flow tube, terminal below. */
const THUMB = wrap(
  // explorer
  `<rect x="8" y="10" width="58" height="160" rx="8" fill="#ffffff" stroke="#dde4eb"/>` +
  [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${i % 3 === 0 ? 14 : 22}" y="${22 + i * 16}" width="${i % 3 === 0 ? 38 : 30}" height="5" rx="2.5" fill="${i % 3 === 0 ? '#3a4660' : '#9aa6b8'}"/><circle cx="58" cy="${24.5 + i * 16}" r="2.4" fill="${['#2e6fe0', '#13915f', '#b7790b', '#7b3fe4'][i % 4]}"/>`).join('') +
  // floor
  `<path d="M190 52 L282 98 L190 144 L98 98 Z" fill="#f7f8fa" stroke="#bcd8ff" stroke-width="1.4"/>` +
  // flow tube
  `<path d="M130 96 C150 112 176 118 196 112 S236 92 250 98" fill="none" stroke="#4f8dff" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>` +
  // vault
  box(140, 62, 30, 24, '#e3e6eb', '#c9ced6', '#b4bac4') + `<circle cx="146" cy="84" r="6" fill="none" stroke="#8d949f" stroke-width="1.6"/>` +
  // glass board
  `<path d="M206 60 L246 80 L246 104 L206 84 Z" fill="#e6f2ff" fill-opacity=".75" stroke="#7cc3ff" stroke-width="1.2"/>` +
  `<rect x="212" y="70" width="8" height="6" fill="#f9dde6" transform="skewY(26)"/>` +
  // desk
  box(186, 104, 46, 10, '#a0694a', '#8a5a3c', '#734a31') +
  // robots on rings
  [[118, 112, '#3fb57a'], [174, 128, '#4f7df0'], [252, 112, '#e05a5a']].map(([x, y, c]) =>
    `<ellipse cx="${x}" cy="${(y as number) + 8}" rx="11" ry="5" fill="none" stroke="${c}" stroke-width="2" opacity=".9"/>` +
    `<rect x="${(x as number) - 5}" y="${(y as number) - 6}" width="10" height="12" rx="5" fill="${c}"/>` +
    `<circle cx="${x}" cy="${(y as number) - 10}" r="7" fill="${c}"/><rect x="${(x as number) - 5}" y="${(y as number) - 13}" width="10" height="5" rx="2.5" fill="#141824"/>` +
    `<circle cx="${(x as number) - 2.2}" cy="${(y as number) - 10.5}" r="1.1" fill="#62f0ff"/><circle cx="${(x as number) + 2.2}" cy="${(y as number) - 10.5}" r="1.1" fill="#62f0ff"/>`,
  ).join('') +
  // terminal + right panel
  `<rect x="74" y="150" width="166" height="22" rx="6" fill="#ffffff" stroke="#dde4eb"/>` +
  [0, 1].map((i) => `<rect x="82" y="${156 + i * 7}" width="${110 - i * 30}" height="3" rx="1.5" fill="#9aa6b8"/>`).join('') +
  `<rect x="248" y="10" width="64" height="162" rx="8" fill="#ffffff" stroke="#dde4eb"/>` +
  `<rect x="256" y="20" width="44" height="6" rx="3" fill="#3a4660"/><rect x="256" y="32" width="48" height="40" rx="6" fill="#f4f4f6"/>` +
  `<rect x="258" y="62" width="13" height="6" rx="3" fill="#13915f"/><rect x="273" y="62" width="13" height="6" rx="3" fill="#d93a45"/><rect x="288" y="62" width="13" height="6" rx="3" fill="#b7790b"/>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'spatial-workspace',
      name: 'Espace spatial',
      description: "Espace de travail type IDE : explorateur, scène 3D où les agents travaillent autour du coffre, du portique, du kanban et du tableau, flux lumineux réels, mini-carte, terminal et revue.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'workspace',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [
        { type: 'number', key: 'flowWindowMin', label: 'Fenêtre des flux affichés', default: 10, min: 1, max: 60, step: 1, unit: 'min', group: 'Flux' },
        { type: 'boolean', key: 'showFlows', label: 'Afficher les flux (tubes lumineux)', default: true, group: 'Flux' },
        { type: 'boolean', key: 'showLabels', label: 'Afficher les étiquettes des postes', default: true, group: 'Scène' },
        {
          type: 'select', key: 'cameraPreset', label: 'Cadrage initial', default: 'iso', group: 'Scène',
          options: [{ value: 'iso', label: 'Vue 3/4' }, { value: 'top', label: 'Plan' }, { value: 'low', label: 'Rasante' }, { value: 'front', label: 'De face' }],
        },
        { type: 'number', key: 'robotScale', label: 'Taille des robots', default: 1, min: 0.6, max: 1.6, step: 0.1, group: 'Scène' },
      ],
      components: ['DockLayout', 'ExplorerTree', 'LogTerminal', 'PlanMinimap', 'ThreeStage', 'SceneLabels', 'createRobot', 'FlowNetwork', 'buildSpatialScene', 'NatureBadge', 'StatusPill'],
      layout: { kind: 'workspace', zoomPan: true, minimap: true, minWidth: 320, immersive: true },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Caméra au clavier (flèches, Maj + flèches, + / −, 0), étiquettes et arborescence focalisables, résumé textuel de la scène.',
      },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./SpatialWorkspace'),
  },
];
