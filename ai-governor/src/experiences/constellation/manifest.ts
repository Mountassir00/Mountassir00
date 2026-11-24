import type { ExperienceDefinition } from '@sdk';
import { placeholder } from '../thumbs';

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'constellation',
      name: 'Constellation',
      description: "Chaque événement est une particule qui jaillit du cœur du système ; les couleurs suivent les pôles, l'intensité suit l'activité réelle.",
      version: '0.1.0',
      thumbnail: placeholder('Constellation'),
      family: 'scene-3d',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'form', label: 'Forme', default: 'burst', options: [{ value: 'burst', label: 'Explosion' }, { value: 'sphere', label: 'Sphère' }], group: 'Scène' },
      ],
      components: [],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Constellation'),
  },
  {
    manifest: {
      id: 'network-sphere',
      name: 'Sphère réseau',
      description: "Agents, tâches et composants disposés sur une sphère, reliés par leurs échanges réels ; la sphère tourne lentement et se met en veille avec vous.",
      version: '0.1.0',
      thumbnail: placeholder('Sphère réseau'),
      family: 'scene-3d',
      renderer: 'webgl',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'form', label: 'Forme', default: 'sphere', options: [{ value: 'burst', label: 'Explosion' }, { value: 'sphere', label: 'Sphère' }], group: 'Scène' },
      ],
      components: [],
      layout: { kind: 'scene', zoomPan: true, minimap: false, minWidth: 320, immersive: true },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
      dependencies: { sdk: '^1.0.0', libraries: ['three'] },
      performance: { cost: 'high', maxNodes: 500, targetFps: 30, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Constellation'),
  },
];
