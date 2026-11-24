import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'hq-3d',
      name: 'QG 3D',
      description: "Un quartier général explorable : open space par pôle, salle de sport et salon pour les agents en pause, couloirs, étiquettes de statut.",
      version: '0.1.0',
      thumbnail: placeholder('QG 3D'),
      family: 'scene-3d',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./HQ3D'),
  },
];
