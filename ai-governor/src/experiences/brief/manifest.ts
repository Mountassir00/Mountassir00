import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

const line = (x: number, y: number, w: number, c = '#c9c9d1') => `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${c}"/>`;
const THUMB = wrap(
  `<rect width="320" height="180" fill="#ececef"/>` +
  `<rect x="64" y="8" width="192" height="180" rx="14" fill="#ffffff" stroke="#e2e2e7"/>` +
  `<circle cx="80" cy="22" r="3" fill="#d99a00"/>` + line(87, 20, 34, '#8a8a94') + line(214, 20, 28, '#c4c4cc') +
  `<text x="78" y="52" font-family="system-ui, sans-serif" font-size="22" font-weight="800" letter-spacing="-1" fill="#0f0f12">Bonjour.</text>` +
  line(78, 62, 150) + line(78, 70, 120) +
  `<path d="M78 82H242" stroke="#e2e2e7"/>` +
  `<rect x="78" y="90" width="9" height="9" rx="3" fill="#d9f2e4"/>` + line(92, 92, 70, '#3f3f46') + `<rect x="214" y="92" width="28" height="5" rx="2.5" fill="#13915f" opacity=".55"/>` +
  `<rect x="78" y="104" width="9" height="9" rx="3" fill="#f8efc3"/>` + line(92, 106, 58, '#3f3f46') + `<rect x="214" y="106" width="28" height="5" rx="2.5" fill="#d99a00" opacity=".55"/>` +
  `<path d="M78 120H242" stroke="#e2e2e7"/>` +
  `<rect x="78" y="127" width="164" height="22" rx="7" fill="#f3eefc"/>` + line(84, 131, 70, '#3f3f46') +
  `<rect x="174" y="132" width="20" height="12" rx="6" fill="#d9f2e4"/><rect x="197" y="132" width="20" height="12" rx="6" fill="#f9dde6"/><rect x="220" y="132" width="18" height="12" rx="6" fill="#f8efc3"/>` +
  Array.from({ length: 24 }, (_, i) => { const h = 4 + ((i * 37) % 17) * (i > 7 && i < 20 ? 1 : 0.3); return `<rect x="${78 + i * 6.9}" y="${172 - h}" width="4.6" height="${h}" rx="1" fill="${i === 17 ? '#7b3fe4' : '#3f3f46'}" opacity="${i === 17 ? 1 : 0.6}"/>`; }).join(''),
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'brief',
      name: 'Brief du matin',
      description: "Une page par jour : ce qui a marché, ce qui est prévu, ce qui attend votre accord, ce que cela a coûté.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'dashboard',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'number', key: 'topCount', label: 'Éléments par rubrique', default: 4, min: 2, max: 10, step: 1, group: 'Contenu' },
        { type: 'select', key: 'compareTo', label: 'Comparer le coût avec', default: 'day', options: [{ value: 'day', label: 'La veille' }, { value: 'week', label: 'Le même jour, semaine précédente' }], group: 'Données' },
        { type: 'boolean', key: 'showHourly', label: 'Coût heure par heure', default: true, group: 'Graphiques' },
        { type: 'select', key: 'headline', label: 'Salutation', default: 'grand', options: [{ value: 'grand', label: 'Grande (éditoriale)' }, { value: 'sobre', label: 'Sobre' }], group: 'Typographie' },
      ],
      components: ['DaySwitcher', 'Section', 'WinList', 'DecisionVerdict', 'HourlyBars', 'NatureBadge'],
      layout: { kind: 'list', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA', notes: 'Page imprimable ; sections titrées et numérotées.' },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Brief'),
  },
];
