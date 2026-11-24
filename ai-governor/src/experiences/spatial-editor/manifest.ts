import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'spatial-editor',
      name: 'Éditeur spatial',
      description: "Aménagez la scène 3D : dimensions de la pièce, grille, primitives (position, rotation, échelle, matière, lueur) et liaison aux départements.",
      version: '0.1.0',
      thumbnail: placeholder('Éditeur spatial'),
      family: 'tool',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'workspace', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'fallback', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./SpatialEditor'),
  },
];
