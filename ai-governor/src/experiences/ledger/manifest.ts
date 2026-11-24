import type { ExperienceDefinition } from '@sdk';
import { THUMB_LEDGER } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'ledger',
      name: 'Journal opérationnel',
      description: 'Cinquième expérience, ajoutée sans toucher au moteur : un fil textuel accessible et sobre, pensé pour la lecture d’écran, le mobile et le mode économie.',
      version: '0.1.0',
      thumbnail: THUMB_LEDGER,
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'groupBy', label: 'Regrouper par', default: 'time', options: [{ value: 'time', label: 'Heure' }, { value: 'department', label: 'Département' }, { value: 'agent', label: 'Agent' }], group: 'Disposition' },
        { type: 'boolean', key: 'showLowSignal', label: 'Inclure les événements techniques (flux, états)', default: false, group: 'Données' },
      ],
      components: ['NatureBadge', 'StatusPill'],
      layout: { kind: 'list', zoomPan: false, minimap: false, minWidth: 280 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AAA' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 2000, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Ledger'),
  },
];
