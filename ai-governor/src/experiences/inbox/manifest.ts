import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'inbox',
      name: 'Boîte de réception',
      description: "Les propositions à arbitrer présentées comme une revue de code (contexte, changements, contrôles, GO / NO GO / TEST) et l'autopilote des tâches planifiées.",
      version: '0.1.0',
      thumbnail: placeholder('Boîte de réception'),
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
    load: () => import('./Inbox'),
  },
];
