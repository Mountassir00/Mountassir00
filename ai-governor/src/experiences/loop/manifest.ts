import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'loop',
      name: 'Boucle d’équipe',
      description: "Votre organisation en boucle : vous et le Gouverneur au centre, chaque pôle en carte avec ses agents et leur production.",
      version: '0.1.0',
      thumbnail: placeholder('Boucle d’équipe'),
      family: 'dashboard',
      renderer: 'svg',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'grid', zoomPan: true, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Loop'),
  },
];
