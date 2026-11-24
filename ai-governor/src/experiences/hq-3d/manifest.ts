import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

/* Thumbnail: an isometric cut-away of the headquarters — pastel rooms along two
   wooden corridors, low walls, a lounge with a sofa, a test gym, robots with
   status rings and two status labels. Drawn here (no product imagery). */
const ISO = (x: number, y: number, z = 0): [number, number] => [158 + (x - y) * 7.4, 34 + (x + y) * 3.7 - z * 7];
const poly = (pts: Array<[number, number]>, fill: string, stroke = 'none', sw = 0) =>
  `<path d="M${pts.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(' L')} Z" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const tile = (x0: number, y0: number, x1: number, y1: number, fill: string) => poly([ISO(x0, y0), ISO(x1, y0), ISO(x1, y1), ISO(x0, y1)], fill, '#16203a', 0.35);
/** Low wall along x (horizontal) or y (vertical) at plan coords, height h. */
const wall = (x0: number, y0: number, x1: number, y1: number, h = 0.8) => {
  const a = ISO(x0, y0);
  const b = ISO(x1, y1);
  const c = ISO(x1, y1, h);
  const d = ISO(x0, y0, h);
  return poly([a, b, c, d], '#f3f4f7', '#16203a', 0.35) + `<path d="M${d[0].toFixed(1)} ${d[1].toFixed(1)} L${c[0].toFixed(1)} ${c[1].toFixed(1)}" stroke="#5a6580" stroke-width="1.2"/>`;
};
const robot = (x: number, y: number, c: string) => {
  const [sx, sy] = ISO(x, y);
  return (
    `<ellipse cx="${sx}" cy="${sy + 1}" rx="6.5" ry="3.2" fill="none" stroke="${c}" stroke-width="1.6"/>` +
    `<rect x="${sx - 3.4}" y="${sy - 8}" width="6.8" height="8" rx="3.4" fill="${c}"/>` +
    `<circle cx="${sx}" cy="${sy - 11}" r="4.6" fill="${c}"/><rect x="${sx - 3.4}" y="${sy - 13}" width="6.8" height="3.4" rx="1.7" fill="#141824"/>` +
    `<circle cx="${sx - 1.5}" cy="${sy - 11.4}" r=".8" fill="#62f0ff"/><circle cx="${sx + 1.5}" cy="${sy - 11.4}" r=".8" fill="#62f0ff"/>`
  );
};
const label = (x: number, y: number, w: number, dot: string) => {
  const [sx, sy] = ISO(x, y);
  const lx = sx - w / 2;
  const ly = sy - 32;
  return `<rect x="${lx}" y="${ly}" width="${w}" height="12" rx="6" fill="#ffffff" stroke="#d6d9e0" stroke-width=".6"/><circle cx="${lx + 7}" cy="${ly + 6}" r="2.4" fill="${dot}"/><rect x="${lx + 12}" y="${ly + 4.4}" width="${w - 18}" height="3.2" rx="1.6" fill="#3a4660"/>`;
};

const THUMB = wrap(
  // base slab
  poly([ISO(-0.6, -0.6), ISO(16.6, -0.6), ISO(16.6, 14.6), ISO(-0.6, 14.6)], '#dfe3ea', '#b9c1cd', 0.6) +
  // north row
  tile(0, 0, 4, 4, '#dce8fb') + tile(4, 0, 8, 4, '#d9f2e4') + tile(8, 0, 12, 4, '#d6f0f0') + tile(12, 0, 16, 4, '#2f3747') +
  // corridor north (wood)
  tile(0, 4, 16, 5.6, '#e3c59c') +
  // middle rows
  tile(1.6, 5.6, 5.8, 9.6, '#fbe6d5') + tile(5.8, 5.6, 10.2, 9.6, '#f9dde6') + tile(10.2, 5.6, 14.4, 9.6, '#e9e0fb') +
  tile(0, 5.6, 1.6, 9.6, '#e3c59c') + tile(14.4, 5.6, 16, 9.6, '#e3c59c') +
  // corridor south
  tile(0, 9.6, 16, 11, '#e3c59c') +
  // south row: control, reception, lounge, gym
  tile(0, 11, 4, 14, '#e4eed9') + tile(4, 11, 8, 14, '#dce8fb') + tile(8, 11, 12, 14, '#f3d9bd') + tile(12, 11, 16, 14, '#c9d3e6') +
  // rug + sofa in the lounge, treadmills in the gym, desks
  tile(8.8, 11.8, 10.8, 13.2, '#d98c6a') +
  wall(9, 12.1, 10.6, 12.1, 0.55).replace(/#f3f4f7/g, '#eceaf2') +
  [12.8, 14, 15.2].map((x) => tile(x, 11.6, x + 0.7, 13.2, '#2a2f3a')).join('') +
  [[1, 1.6], [2.6, 1.6], [5, 1.6], [6.6, 1.6], [2.6, 7.2], [7, 7.2], [11.4, 7.2]].map(([x, y]) => tile(x, y, x + 1, y + 0.6, '#c79a6b')).join('') +
  // low walls (cut-away)
  wall(0, 4, 3.2, 4) + wall(4, 4, 7.2, 4) + wall(8, 4, 11.2, 4) + wall(12, 4, 15.2, 4) +
  wall(4, 0, 4, 4) + wall(8, 0, 8, 4) + wall(12, 0, 12, 4) +
  wall(1.6, 5.6, 4.6, 5.6) + wall(5.8, 5.6, 9, 5.6) + wall(10.2, 5.6, 13.4, 5.6) + wall(5.8, 5.6, 5.8, 9.6) + wall(10.2, 5.6, 10.2, 9.6) +
  wall(1.6, 9.6, 4.6, 9.6) + wall(5.8, 9.6, 9, 9.6) + wall(10.2, 9.6, 13.4, 9.6) +
  wall(0.8, 11, 4, 11) + wall(4.8, 11, 8, 11) + wall(8.8, 11, 12, 11) + wall(12.8, 11, 16, 11) + wall(4, 11, 4, 14) + wall(8, 11, 8, 14) + wall(12, 11, 12, 14) +
  // far façades kept full height
  poly([ISO(0, 0), ISO(16, 0), ISO(16, 0, 2.4), ISO(0, 0, 2.4)], '#e8edf5', '#16203a', 0.35) +
  [2, 5, 8, 11, 14].map((x) => poly([ISO(x, 0, 0.9), ISO(x + 1.6, 0, 0.9), ISO(x + 1.6, 0, 2), ISO(x, 0, 2)], '#bcd8f5')).join('') +
  poly([ISO(0, 0), ISO(0, 14), ISO(0, 14, 2.4), ISO(0, 0, 2.4)], '#dfe5ee', '#16203a', 0.35) +
  [1.5, 6.5, 11.5].map((y) => poly([ISO(0, y, 0.9), ISO(0, y + 1.6, 0.9), ISO(0, y + 1.6, 2), ISO(0, y, 2)], '#b3cdea')).join('') +
  // a real flow along the corridor
  `<path d="M${ISO(3, 7.6).join(' ')} L${ISO(3, 10.3).join(' ')} L${ISO(13, 10.3).join(' ')} L${ISO(13, 2.4).join(' ')}" fill="none" stroke="#4f8dff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>` +
  // robots
  robot(3, 8.2, '#4f7df0') + robot(7.6, 8.4, '#e05a5a') + robot(9.6, 12.9, '#9aa3b2') + robot(13.35, 12.4, '#13915f') + robot(6, 2.4, '#7b3fe4') +
  label(3, 8.2, 44, '#2e6fe0') + label(7.6, 8.4, 40, '#d93a45') + label(9.6, 12.9, 40, '#9a9aa5'),
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'hq-3d',
      name: 'QG 3D',
      description:
        'Siège social explorable sur un niveau : une aile par pôle, une pièce aménagée par département, salon pour les agents disponibles, salle de réunion, salle d’essais, accueil. Vue d’ensemble isométrique ou visite à hauteur d’yeux, étiquettes de statut et flux réels.',
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'scene-3d',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [
        {
          type: 'select', key: 'ambience', label: 'Ambiance', default: 'auto', group: 'Scène',
          options: [{ value: 'auto', label: 'Automatique (heure de la vue)' }, { value: 'day', label: 'Jour' }, { value: 'evening', label: 'Soir' }],
        },
        {
          type: 'select', key: 'defaultMode', label: 'Mode à l’ouverture', default: 'overview', group: 'Caméra',
          options: [{ value: 'overview', label: 'Vue d’ensemble' }, { value: 'visit', label: 'Visite (hauteur d’yeux)' }],
        },
        { type: 'number', key: 'cameraSpeed', label: 'Vitesse de la caméra', default: 1, min: 0.5, max: 2, step: 0.1, unit: '×', group: 'Caméra' },
        { type: 'boolean', key: 'ceilingInVisit', label: 'Afficher le plafond en visite', default: true, group: 'Caméra' },
        {
          type: 'select', key: 'labelDensity', label: 'Densité des étiquettes', default: 'balanced', group: 'Étiquettes',
          options: [{ value: 'essential', label: 'Essentielle (erreurs, pièces)' }, { value: 'balanced', label: 'Équilibrée' }, { value: 'full', label: 'Complète' }],
        },
      ],
      components: ['ThreeStage', 'SceneLabels', 'Anchored', 'createRobot', 'createConsole', 'createDrone', 'createPerson', 'createEquipment', 'createDesk', 'FlowNetwork', 'bakeStatic', 'PlanMinimap', 'Segmented', 'NatureBadge', 'StatusPill'],
      layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320, immersive: true },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Liste des pièces au clavier, étiquettes focalisables, caméra au clavier (flèches, + / −, 0 ; V puis Z Q S D en visite), résumé textuel de l’emplacement et du statut de chaque agent. Mouvement réduit : téléportation douce.',
      },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./HQ3D'),
  },
];
