import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'office-3d',
      name: 'Bureau 3D',
      description: "Pièce 3D fermée : postes, salon pour les agents disponibles, coffre, portique de sécurité, murs kanban et tableau ; menu radial et actions sur chaque objet.",
      version: '0.1.0',
      thumbnail: placeholder('Bureau 3D'),
      family: 'scene-3d',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Office3D'),
  },
];
