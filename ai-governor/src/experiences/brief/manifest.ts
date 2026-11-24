import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'brief',
      name: 'Brief du matin',
      description: "Une page par jour : ce qui a marché, ce qui est prévu, ce qui attend votre accord, ce que cela a coûté.",
      version: '0.1.0',
      thumbnail: placeholder('Brief du matin'),
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'list', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Brief'),
  },
];
