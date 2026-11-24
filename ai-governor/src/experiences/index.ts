/**
 * Built-in experiences. Each entry is a manifest (data) + a lazy loader:
 * Vite splits every experience into its own chunk, and only the active one
 * is downloaded. Adding an experience = adding a folder and one entry here;
 * nothing in core/, engine/ or shell/ changes (see docs/CREATING_AN_EXPERIENCE.md).
 */
import type { ExperienceDefinition } from '@engine/manifest';
import { THUMB_AI_OFFICE, THUMB_CONTROL_CENTER, THUMB_LEDGER, THUMB_MODULAR, THUMB_SYSTEM_MAP } from './thumbs';

const sdk = { sdk: '^1.0.0', libraries: [] as string[] };

export const BUILTIN_EXPERIENCES: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'control-center',
      name: 'Control Center',
      description: 'Tableau de bord analytique : consommation, économies, qualité, tâches, incidents et arbitrages, avec comparaison avant/après optimisation.',
      version: '0.1.0',
      thumbnail: THUMB_CONTROL_CENTER,
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
      dependencies: sdk,
      performance: { cost: 'low', maxNodes: 5000, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./control-center/ControlCenter'),
  },
  {
    manifest: {
      id: 'ai-office',
      name: 'AI Office',
      description: 'Bureau virtuel isométrique : chaque département est une pièce, chaque agent un personnage animé selon son état réel. Les scripts et services sont des machines.',
      version: '0.1.0',
      thumbnail: THUMB_AI_OFFICE,
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'boolean', key: 'showLabels', label: 'Noms des agents', default: true, group: 'Scène' },
        { type: 'boolean', key: 'floorGrid', label: 'Quadrillage du sol', default: true, group: 'Scène' },
        { type: 'number', key: 'roomSize', label: 'Taille des pièces', default: 5, min: 4, max: 7, step: 1, unit: 'cases', group: 'Disposition' },
        { type: 'number', key: 'figureScale', label: 'Taille des personnages', default: 1, min: 0.8, max: 1.4, step: 0.1, group: 'Personnages' },
        { type: 'number', key: 'wallHeight', label: 'Hauteur des cloisons', default: 0.35, min: 0, max: 0.8, step: 0.05, group: 'Mobilier' },
        { type: 'boolean', key: 'decor', label: 'Plantes et décor', default: true, group: 'Mobilier' },
      ],
      components: ['IsoFloor', 'IsoFigure', 'Desk', 'MeetingTable', 'ServerRack', 'ZoomPan', 'Minimap'],
      layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Chaque agent est focusable ; une liste textuelle résume la scène.' },
      dependencies: sdk,
      performance: { cost: 'medium', maxNodes: 400, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./ai-office/AiOffice'),
  },
  {
    manifest: {
      id: 'system-map',
      name: 'AI System Map',
      description: 'Cartographie technique isométrique : agents, modèles, fournisseurs, connecteurs MCP, skills, files et bases, reliés par les échanges réellement enregistrés.',
      version: '0.1.0',
      thumbnail: THUMB_SYSTEM_MAP,
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'boolean', key: 'showLabels', label: 'Libellés des blocs', default: true, group: 'Scène' },
        { type: 'number', key: 'flowWindowMin', label: 'Fenêtre des flux actifs', default: 10, min: 1, max: 120, step: 1, unit: 'min', group: 'Flux' },
        { type: 'boolean', key: 'showInvisible', label: 'Montrer les zones non observables', default: true, group: 'Scène' },
        { type: 'number', key: 'blockHeight', label: 'Hauteur des blocs', default: 0.5, min: 0.2, max: 1.2, step: 0.1, group: 'Formes' },
        { type: 'select', key: 'flowStyle', label: 'Représentation des flux', default: 'dashes', options: [{ value: 'dashes', label: 'Tirets animés' }, { value: 'solid', label: 'Traits pleins' }], group: 'Flux' },
      ],
      components: ['IsoBox', 'Cylinder', 'IsoFlowPath', 'ZoomPan', 'Minimap', 'TechnicalOverlay'],
      layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: sdk,
      performance: { cost: 'medium', maxNodes: 300, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./system-map/SystemMap'),
  },
  {
    manifest: {
      id: 'modular-office',
      name: 'AI Modular Office',
      description: 'Hybride : chaque département est une plateforme miniature reliée aux autres. Réorganisable, extensible, avec regroupement automatique quand le système grandit.',
      version: '0.1.0',
      thumbnail: THUMB_MODULAR,
      renderer: 'svg',
      status: 'prototype',
      graphics: [
        { type: 'number', key: 'gap', label: 'Espacement des plateformes', default: 2, min: 1, max: 4, step: 0.5, unit: 'cases', group: 'Disposition' },
        { type: 'select', key: 'grouping', label: 'Regroupement', default: 'auto', options: [{ value: 'auto', label: 'Automatique' }, { value: 'always', label: 'Toujours' }, { value: 'never', label: 'Jamais' }], group: 'Disposition' },
        { type: 'number', key: 'thickness', label: 'Épaisseur des plateformes', default: 0.3, min: 0.1, max: 0.6, step: 0.05, group: 'Formes' },
        { type: 'boolean', key: 'showLinks', label: 'Connexions entre plateformes', default: true, group: 'Scène' },
        { type: 'boolean', key: 'showIndicators', label: 'Indicateurs sur les plateformes', default: true, group: 'Scène' },
      ],
      components: ['IsoFloor', 'IsoFigure', 'IsoFlowPath', 'ZoomPan', 'Minimap', 'ClusterPlate'],
      layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Réorganisation au clavier (flèches) en plus du glisser-déposer.' },
      dependencies: sdk,
      performance: { cost: 'high', maxNodes: 600, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
      createdAt: '2026-11-24',
    },
    load: () => import('./modular-office/ModularOffice'),
  },
  {
    manifest: {
      id: 'ledger',
      name: 'Journal opérationnel',
      description: 'Cinquième expérience, ajoutée sans toucher au moteur : un fil textuel accessible et sobre, pensé pour la lecture d’écran, le mobile et le mode économie.',
      version: '0.1.0',
      thumbnail: THUMB_LEDGER,
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'groupBy', label: 'Regrouper par', default: 'time', options: [{ value: 'time', label: 'Heure' }, { value: 'department', label: 'Département' }, { value: 'agent', label: 'Agent' }], group: 'Disposition' },
        { type: 'boolean', key: 'showLowSignal', label: 'Inclure les événements techniques (flux, états)', default: false, group: 'Données' },
      ],
      components: ['NatureBadge', 'StatusPill'],
      layout: { kind: 'list', zoomPan: false, minimap: false, minWidth: 280 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AAA' },
      dependencies: sdk,
      performance: { cost: 'low', maxNodes: 2000, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./ledger/Ledger'),
  },
];
