import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'kanban',
      name: 'Kanban des tâches',
      description: "Les tâches réelles en colonnes (en attente, en cours, suspendues, terminées, échouées), avec fiche détaillée, filtres et regroupements.",
      version: '0.1.0',
      thumbnail: placeholder('Kanban des tâches'),
      family: 'tool',
      renderer: 'dom',
      status: 'prototype',
      graphics: [],
      components: [],
      layout: { kind: 'workspace', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Kanban'),
  },
];
