import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'tower',
      name: 'Siège',
      description: "Un immeuble de nuit : un étage par pôle, les agents à leurs bureaux ; zoom sur un étage, boîte de réception et autopilote.",
      version: '0.1.0',
      thumbnail: placeholder('Siège'),
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
    load: () => import('./Tower'),
  },
];
