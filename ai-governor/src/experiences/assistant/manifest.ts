import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'assistant',
      name: 'Assistant',
      description: "Posez une question, la réponse s'affiche en chiffres et en graphiques. Calculé localement, sans modèle d'IA ni dépense.",
      version: '0.1.0',
      thumbnail: placeholder('Assistant'),
      family: 'tool',
      renderer: 'dom',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'workspace', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Assistant'),
  },
];
