import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'whiteboard',
      name: 'Tableau blanc',
      description: "Toile libre : cadres générés depuis les données (cycle des tâches, routage, décisions), post-it et formes à vous, panneau d'assistance.",
      version: '0.1.0',
      thumbnail: placeholder('Tableau blanc'),
      family: 'tool',
      renderer: 'svg',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'workspace', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'medium', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Whiteboard'),
  },
];
