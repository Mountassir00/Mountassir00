import type { ExperienceDefinition } from '@sdk';
import { box, wrap } from '../thumbs';

/**
 * Thumbnail: a closed room seen in 3/4 — back and left walls with windows,
 * a desk with a robot at work, a vault, robots on glowing rings, a radial
 * menu around an object and a floating glass card.
 */
const ROBOT = (x: number, y: number, c: string) =>
  `<ellipse cx="${x}" cy="${y + 9}" rx="10" ry="4.5" fill="none" stroke="${c}" stroke-width="2" opacity=".9"/>` +
  `<rect x="${x - 5}" y="${y - 5}" width="10" height="12" rx="5" fill="${c}"/>` +
  `<circle cx="${x}" cy="${y - 9}" r="6.5" fill="${c}"/><rect x="${x - 4.6}" y="${y - 12}" width="9.2" height="4.6" rx="2.3" fill="#141824"/>` +
  `<circle cx="${x - 2}" cy="${y - 9.7}" r="1" fill="#62f0ff"/><circle cx="${x + 2}" cy="${y - 9.7}" r="1" fill="#62f0ff"/>`;

const THUMB = wrap(
  // floor
  `<path d="M160 70 L292 132 L160 178 L28 116 Z" fill="#f4f5f8" stroke="#d6dbe3"/>` +
  // back wall (right side) with windows
  `<path d="M160 70 L292 132 L292 72 L160 10 Z" fill="#fbfbfd" stroke="#d6dbe3"/>` +
  [0, 1].map((i) => {
    const x = 182 + i * 50;
    const y = 30 + i * 23.5;
    return `<path d="M${x} ${y} l34 16 v26 l-34 -16 Z" fill="url(#sky)" stroke="#3a404c" stroke-width="1.6"/><path d="M${x + 17} ${y + 8} v26" stroke="#3a404c" stroke-width="1"/>`;
  }).join('') +
  // left wall with a window and the plaque
  `<path d="M160 70 L28 116 L28 56 L160 10 Z" fill="#f1f2f6" stroke="#d6dbe3"/>` +
  `<path d="M120 34 l-34 12 v26 l34 -12 Z" fill="url(#sky)" stroke="#3a404c" stroke-width="1.6"/>` +
  `<path d="M150 24 l-22 7.6 v7 l22 -7.6 Z" fill="#ffffff" stroke="#c9ced8"/><rect x="132" y="30" width="5" height="5" rx="1.5" fill="#7b3fe4" transform="skewY(-19)"/>` +
  // sun patch
  `<path d="M200 96 l40 19 l-16 7 l-40 -19 Z" fill="#fff1cf" opacity=".9"/>` +
  // vault + desk
  box(96, 84, 26, 22, '#e3e6eb', '#c9ced6', '#b4bac4') + `<circle cx="91" cy="104" r="5" fill="none" stroke="#8d949f" stroke-width="1.4"/>` +
  box(178, 112, 50, 9, '#b07a52', '#8b5a3a', '#7a4d31') +
  `<path d="M176 108 l12 6 v-10 l-12 -6Z" fill="#20242e"/>` +
  ROBOT(160, 118, '#4f7df0') + ROBOT(232, 140, '#3fb57a') + ROBOT(110, 130, '#e0883a') +
  // radial menu around the vault
  `<circle cx="96" cy="84" r="27" fill="#ffffff" fill-opacity=".55" stroke="#ffffff"/>` +
  [0, 1, 2, 3, 4].map((i) => {
    const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    const x = 96 + Math.cos(a) * 21;
    const y = 84 + Math.sin(a) * 21;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.2" fill="${i === 1 ? '#111114' : '#ffffff'}" stroke="#d6dbe3"/>`;
  }).join('') +
  `<circle cx="96" cy="84" r="5" fill="#e8eaef"/>` +
  // floating glass card
  `<rect x="236" y="74" width="70" height="52" rx="10" fill="#ffffff" fill-opacity=".86" stroke="#ffffff"/>` +
  `<circle cx="248" cy="86" r="5" fill="#4f7df0"/><rect x="257" y="82" width="34" height="4.5" rx="2.2" fill="#1c2230"/><rect x="257" y="89" width="24" height="3" rx="1.5" fill="#9aa6b8"/>` +
  `<rect x="244" y="98" width="26" height="7" rx="3.5" fill="#dfe9fb"/><circle cx="248" cy="101.5" r="1.8" fill="#2e6fe0"/>` +
  `<rect x="244" y="110" width="26" height="9" rx="4" fill="#111114"/><rect x="273" y="110" width="26" height="9" rx="4" fill="#eef0f4"/>` +
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb8f0"/><stop offset="1" stop-color="#e8f4ff"/></linearGradient></defs>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'office-3d',
      name: 'Bureau 3D',
      description:
        "Pièce 3D fermée (murs, fenêtres, ambiance jour ou soir) : postes, salon pour les agents disponibles, coffre, portique, murs kanban et tableau. Fiche de verre et menu radial d’actions sur chaque objet.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'scene-3d',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [
        {
          type: 'select', key: 'ambiance', label: 'Ambiance', default: 'auto', group: 'Pièce',
          options: [{ value: 'auto', label: 'Automatique (jour en clair, soir en sombre)' }, { value: 'day', label: 'Jour' }, { value: 'evening', label: 'Soir' }],
        },
        { type: 'number', key: 'wallHeight', label: 'Hauteur des murs', default: 2.8, min: 2.2, max: 4, step: 0.1, unit: 'm', group: 'Pièce' },
        {
          type: 'select', key: 'cameraPreset', label: 'Caméra par défaut', default: 'cinematic', group: 'Caméra',
          options: [{ value: 'cinematic', label: 'Cinématique (basse)' }, { value: 'iso', label: 'Vue 3/4' }, { value: 'top', label: 'Plan' }],
        },
        { type: 'boolean', key: 'showFlows', label: 'Afficher les flux (tubes lumineux)', default: true, group: 'Scène' },
        { type: 'boolean', key: 'showLabels', label: 'Afficher les étiquettes des postes', default: true, group: 'Scène' },
      ],
      components: ['ThreeStage', 'SceneLabels', 'Anchored', 'buildSpatialScene', 'createRobot', 'createConsole', 'createDrone', 'FlowNetwork', 'NatureBadge', 'StatusPill', 'Segmented'],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Tab parcourt la liste des objets (Entrée : menu radial ; flèches pour choisir, Entrée pour agir, Échap pour fermer). Touche Menu ou Maj + F10 sur la scène ou une étiquette. Résumé textuel de la pièce.',
      },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Office3D'),
  },
];
