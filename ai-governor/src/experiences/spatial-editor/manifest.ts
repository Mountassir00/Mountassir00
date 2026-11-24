import type { ExperienceDefinition } from '@sdk';
import { box, wrap } from '../thumbs';

/**
 * Thumbnail: library tiles on the left, a plan floor with a selected element
 * (accent outline + rotation handle) and a red-flagged overlap, properties on
 * the right, publish pill on top.
 */
const THUMB = wrap(
  // library
  `<rect x="8" y="10" width="62" height="160" rx="9" fill="#ffffff" stroke="#dde4eb"/>` +
  [0, 1, 2, 3, 4, 5].map((i) => {
    const x = 14 + (i % 2) * 27;
    const y = 18 + Math.floor(i / 2) * 30;
    return `<rect x="${x}" y="${y}" width="23" height="25" rx="5" fill="#f6f7fa" stroke="#dde4eb"/>` +
      `<path d="M${x + 11.5} ${y + 6} l7 3.5 l-7 3.5 l-7 -3.5Z" fill="${['#e9e0fb', '#dce8fb', '#d9f2e4', '#fbe6d5', '#f8efc3', '#f9dde6'][i]}" stroke="#3a4660" stroke-width=".7"/>` +
      `<rect x="${x + 5}" y="${y + 17}" width="13" height="3" rx="1.5" fill="#9aa6b8"/>`;
  }).join('') +
  [0, 1, 2, 3].map((i) => `<rect x="16" y="${112 + i * 13}" width="${44 - (i % 2) * 10}" height="5" rx="2.5" fill="${i === 1 ? '#7b3fe4' : '#c3cbd6'}"/>`).join('') +
  // publish pill
  `<rect x="78" y="10" width="164" height="18" rx="9" fill="#ffffff" stroke="#dde4eb"/><circle cx="88" cy="19" r="3" fill="#b7790b"/><rect x="95" y="16.5" width="48" height="5" rx="2.5" fill="#3a4660"/>` +
  `<rect x="196" y="13" width="42" height="12" rx="6" fill="#111114"/><rect x="203" y="17.5" width="28" height="3" rx="1.5" fill="#ffffff"/>` +
  // floor (iso) with grid
  `<path d="M160 44 L236 82 L160 120 L84 82 Z" fill="#f7f8fa" stroke="#9fc8ff" stroke-width="1.4"/>` +
  [1, 2, 3, 4, 5].map((k) => `<path d="M${84 + k * 12.67} ${82 - k * 6.33} L${160 + k * 12.67} ${120 - k * 6.33}" stroke="#e1e6ee" stroke-width=".7"/><path d="M${84 + k * 12.67} ${82 + k * 6.33} L${160 + k * 12.67} ${44 + k * 6.33}" stroke="#e1e6ee" stroke-width=".7"/>`).join('') +
  // overlap (red outline) + vault
  `<path d="M120 66 L140 76 L120 86 L100 76 Z" fill="none" stroke="#d93a45" stroke-width="1.6"/>` +
  box(120, 60, 22, 12, '#e3e6eb', '#c9ced6', '#b4bac4') +
  `<path d="M128 70 L146 79 L128 88 L110 79 Z" fill="none" stroke="#d93a45" stroke-width="1.6" stroke-dasharray="3 2"/>` +
  // selected desk with accent outline + rotation handle
  `<path d="M176 74 L210 91 L176 108 L142 91 Z" fill="none" stroke="#7b3fe4" stroke-width="2"/>` +
  box(176, 82, 34, 7, '#b07a52', '#8b5a3a', '#7a4d31') +
  `<path d="M176 108 L176 118" stroke="#7b3fe4" stroke-width="1.6"/><circle cx="176" cy="122" r="4.5" fill="#ffffff" stroke="#7b3fe4" stroke-width="2"/>` +
  `<rect x="186" y="58" width="36" height="13" rx="6.5" fill="#ffffff" stroke="#dde4eb"/><circle cx="193" cy="64.5" r="2.4" fill="#13915f"/><rect x="198" y="62.5" width="19" height="4" rx="2" fill="#3a4660"/>` +
  // toolbar + minimap
  `<rect x="82" y="150" width="96" height="18" rx="9" fill="#ffffff" stroke="#dde4eb"/>` +
  [0, 1, 2, 3, 4].map((i) => `<circle cx="${93 + i * 18}" cy="159" r="6" fill="${i === 1 ? '#111114' : '#eef1f5'}"/>`).join('') +
  `<rect x="196" y="132" width="46" height="36" rx="7" fill="#ffffff" stroke="#dde4eb"/><rect x="202" y="140" width="34" height="22" rx="2" fill="#f1f3f6" stroke="#c9d1dc" stroke-width=".8"/><circle cx="222" cy="152" r="2.2" fill="#7b3fe4"/><circle cx="210" cy="146" r="2.2" fill="#d93a45"/>` +
  // properties
  `<rect x="250" y="10" width="62" height="160" rx="9" fill="#ffffff" stroke="#dde4eb"/>` +
  `<rect x="257" y="19" width="40" height="6" rx="3" fill="#3a4660"/>` +
  [0, 1, 2].map((i) => `<rect x="257" y="${36 + i * 24}" width="20" height="4" rx="2" fill="#9aa6b8"/><rect x="257" y="${43 + i * 24}" width="23" height="10" rx="4" fill="#f1f3f6"/><rect x="283" y="${43 + i * 24}" width="23" height="10" rx="4" fill="#f1f3f6"/>`).join('') +
  `<rect x="257" y="112" width="49" height="12" rx="5" fill="#f1f3f6"/><rect x="261" y="116.5" width="30" height="3" rx="1.5" fill="#7b3fe4"/>` +
  `<rect x="257" y="148" width="49" height="13" rx="6.5" fill="#fbe1e3"/><rect x="268" y="152.5" width="27" height="4" rx="2" fill="#d93a45"/>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'spatial-editor',
      name: 'Éditeur spatial',
      description:
        "Aménagez l’espace 3D partagé : bibliothèque d’éléments, déplacement aimanté, rotation, liaison aux départements, étiquettes, contrôle des chevauchements. Brouillon local, puis publication vers toutes les vues 3D.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'tool',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [
        {
          type: 'select', key: 'gridStep', label: 'Pas de la grille d’aimantation', default: '0.5', group: 'Édition',
          options: [{ value: '0.25', label: '0,25 m' }, { value: '0.5', label: '0,5 m' }, { value: '1', label: '1 m' }],
        },
        { type: 'boolean', key: 'snap', label: 'Aimantation activée au départ', default: true, group: 'Édition' },
        { type: 'boolean', key: 'showDims', label: 'Afficher les cotes de la pièce', default: true, group: 'Scène' },
        {
          type: 'select', key: 'defaultView', label: 'Vue par défaut', default: 'iso', group: 'Scène',
          options: [{ value: 'iso', label: 'Vue 3/4' }, { value: 'top', label: 'Plan' }],
        },
      ],
      components: ['DockLayout', 'PlanMinimap', 'Dialog', 'ThreeStage', 'SceneLabels', 'Anchored', 'buildSpatialScene', 'useSpatialLayout'],
      layout: { kind: 'workspace', zoomPan: true, minimap: true, minWidth: 320, immersive: true },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Toutes les modifications sont possibles sans souris : liste des éléments (flèches), champs numériques (Entrée, flèches haut/bas), Q/E pour pivoter, flèches sur la scène pour déplacer la sélection, Ctrl + Z / Ctrl + Maj + Z.',
      },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 200, targetFps: 30, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./SpatialEditor'),
  },
];
