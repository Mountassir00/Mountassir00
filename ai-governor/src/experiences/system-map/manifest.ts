import type { ExperienceDefinition } from '@sdk';
import { THUMB_SYSTEM_MAP } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'system-map',
      name: 'AI System Map',
      description: 'Cartographie technique isométrique : agents, modèles, fournisseurs, connecteurs MCP, skills, files et bases, reliés par les échanges réellement enregistrés.',
      version: '0.1.0',
      thumbnail: THUMB_SYSTEM_MAP,
      family: 'scene-2d',
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
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'medium', maxNodes: 300, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'control-center' },
      createdAt: '2026-11-24',
    },
    load: () => import('./SystemMap'),
  },
];
