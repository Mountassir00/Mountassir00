import type { ExperienceDefinition } from '@sdk';
import { THUMB_CONTROL_CENTER } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'control-center',
      name: 'Control Center',
      description: 'Tableau de bord analytique : consommation, économies, qualité, tâches, incidents et arbitrages, avec comparaison avant/après optimisation.',
      version: '0.1.0',
      thumbnail: THUMB_CONTROL_CENTER,
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'density', label: 'Densité', default: 'comfortable', options: [{ value: 'compact', label: 'Compacte' }, { value: 'comfortable', label: 'Confortable' }], group: 'Disposition' },
        { type: 'select', key: 'usageChart', label: 'Graphique de consommation', default: 'columns', options: [{ value: 'columns', label: 'Colonnes empilées' }, { value: 'line', label: 'Courbe du coût' }], group: 'Graphiques' },
        { type: 'boolean', key: 'showTables', label: 'Afficher les tableaux de données sous les graphiques', default: false, group: 'Graphiques' },
        { type: 'boolean', key: 'showEstimates', label: 'Afficher les valeurs estimées', default: true, group: 'Données' },
      ],
      components: ['KpiStrip', 'StackedColumns', 'LineArea', 'HBars', 'BeforeAfterBars', 'NatureBadge', 'DecisionList'],
      layout: { kind: 'grid', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Tableaux de données disponibles pour chaque graphique.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 5000, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./ControlCenter'),
  },
];
