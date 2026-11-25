import type { ExperienceDefinition } from '@sdk';
import { THUMB_AI_OFFICE } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'ai-office',
      name: 'AI Office',
      description: 'Bureau virtuel isométrique : chaque département est une pièce, chaque agent un personnage animé selon son état réel. Les scripts et services sont des machines.',
      version: '0.1.0',
      thumbnail: THUMB_AI_OFFICE,
      family: 'scene-2d',
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'boolean', key: 'showLabels', label: 'Noms des agents', default: true, group: 'Scène' },
        { type: 'boolean', key: 'floorGrid', label: 'Quadrillage du sol', default: true, group: 'Scène' },
        { type: 'number', key: 'roomSize', label: 'Taille des pièces', default: 5, min: 4, max: 7, step: 1, unit: 'cases', group: 'Disposition' },
        { type: 'number', key: 'figureScale', label: 'Taille des personnages', default: 1, min: 0.8, max: 1.4, step: 0.1, group: 'Personnages' },
        { type: 'number', key: 'wallHeight', label: 'Hauteur des cloisons', default: 0.35, min: 0, max: 0.8, step: 0.05, group: 'Mobilier' },
        { type: 'boolean', key: 'decor', label: 'Plantes et décor', default: true, group: 'Mobilier' },
      ],
      components: ['IsoFloor', 'IsoFigure', 'Desk', 'MeetingTable', 'ServerRack', 'ZoomPan', 'Minimap'],
      layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Chaque agent est focusable ; une liste textuelle résume la scène.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'medium', maxNodes: 400, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'control-center' },
      createdAt: '2026-11-24',
    },
    load: () => import('./AiOffice'),
  },
];
