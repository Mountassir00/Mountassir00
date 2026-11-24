import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'agents-board',
      name: 'Équipe d’agents',
      description: "Le statut de chaque agent en un coup d'œil : tâche en cours, progression, débit de tokens, coût, erreurs.",
      version: '0.1.0',
      thumbnail: placeholder('Équipe d’agents'),
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'grid', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./AgentsBoard'),
  },
];
