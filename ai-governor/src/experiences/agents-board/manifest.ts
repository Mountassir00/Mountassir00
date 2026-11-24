import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

const ST = ['#5b8cff', '#2fbf87', '#f2b33d', '#a47bff', '#ff5d6c', '#8c8c96'];
const THUMB = wrap(
  `<rect x="12" y="10" width="296" height="160" rx="16" fill="#141418"/>` +
  [0, 1, 2, 3, 4].map((i) => `<rect x="${22 + i * 57}" y="20" width="51" height="28" rx="8" fill="#1f1f25"/><rect x="${22 + i * 57}" y="20" width="51" height="2.5" rx="1" fill="${ST[i]}"/><rect x="${29 + i * 57}" y="28" width="22" height="4" rx="2" fill="#6b6b78"/><rect x="${29 + i * 57}" y="36" width="${14 + ((i * 7) % 12)}" height="7" rx="2" fill="#f2f2f5"/>`).join('') +
  ST.map((c, i) => {
    const y = 60 + i * 18;
    const w = [92, 60, 110, 35, 20, 0][i];
    return `<circle cx="32" cy="${y + 6}" r="5.5" fill="${c}" opacity=".9"/><rect x="44" y="${y + 3}" width="${38 + ((i * 13) % 20)}" height="6" rx="3" fill="#d8d8de"/>` +
      `<rect x="120" y="${y + 3}" width="34" height="6" rx="3" fill="${c}" opacity=".35"/>` +
      `<rect x="170" y="${y + 4}" width="110" height="4" rx="2" fill="#2a2a31"/><rect x="170" y="${y + 4}" width="${w}" height="4" rx="2" fill="${c}"/>` +
      `<rect x="288" y="${y + 3}" width="12" height="6" rx="3" fill="#6b6b78"/>`;
  }).join(''),
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'agents-board',
      name: 'Équipe d’agents',
      description: "Le statut de chaque agent en un coup d'œil : tâche en cours, progression, débit de tokens, coût, erreurs.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'defaultView', label: 'Présentation par défaut', default: 'table', options: [{ value: 'table', label: 'Tableau' }, { value: 'cards', label: 'Cartes' }], group: 'Disposition' },
        { type: 'select', key: 'density', label: 'Densité', default: 'comfortable', options: [{ value: 'comfortable', label: 'Confortable' }, { value: 'compact', label: 'Compacte' }], group: 'Disposition' },
        { type: 'number', key: 'throughputWindow', label: 'Fenêtre du débit de tokens', default: 15, min: 5, max: 60, step: 5, unit: 'min', group: 'Données' },
        { type: 'boolean', key: 'showSparklines', label: 'Courbes de débit par agent', default: true, group: 'Graphiques' },
        { type: 'boolean', key: 'showHumans', label: 'Inclure les personnes', default: false, group: 'Données' },
      ],
      components: ['AgentAvatar', 'StatusPill', 'NatureBadge', 'Sparkline', 'Segmented', 'ProgressBar'],
      layout: { kind: 'grid', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Tableau triable (aria-sort), lignes activables au clavier via le nom de l’agent.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: true },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./AgentsBoard'),
  },
];
