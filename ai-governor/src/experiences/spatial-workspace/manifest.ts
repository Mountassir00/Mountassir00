import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'spatial-workspace',
      name: 'Espace spatial',
      description: "Espace de travail type IDE : explorateur, scène 3D où les agents travaillent autour du coffre, du portique, du kanban et du tableau, flux lumineux réels, mini-carte, terminal et revue.",
      version: '0.1.0',
      thumbnail: placeholder('Espace spatial'),
      family: 'workspace',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'workspace', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./SpatialWorkspace'),
  },
];
