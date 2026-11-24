import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

const THUMB = wrap(
  `<rect x="0" y="0" width="320" height="180" fill="#141417"/>` +
  // user bubble
  `<rect x="182" y="14" width="122" height="20" rx="10" fill="#f4f4f6"/><rect x="194" y="21" width="84" height="6" rx="3" fill="#141417"/>` +
  // answer card
  `<rect x="16" y="44" width="288" height="96" rx="12" fill="#1f1f24" stroke="#2c2c33"/>` +
  `<circle cx="32" cy="58" r="7" fill="none" stroke="#7b3fe4" stroke-width="2.5"/><circle cx="32" cy="58" r="2.6" fill="#a98af0"/>` +
  `<rect x="46" y="54" width="44" height="8" rx="4" fill="#3a2d5c"/><rect x="94" y="54" width="30" height="8" rx="4" fill="#2c2c33"/>` +
  `<rect x="26" y="70" width="190" height="5" rx="2.5" fill="#c9c9d1"/>` +
  [0, 1, 2].map((i) => `<rect x="${26 + i * 52}" y="82" width="46" height="22" rx="6" fill="#2a2a31"/><rect x="${32 + i * 52}" y="87" width="22" height="4" rx="2" fill="#8a8a94"/><rect x="${32 + i * 52}" y="94" width="30" height="6" rx="3" fill="#f4f4f6"/>`).join('') +
  Array.from({ length: 9 }, (_, i) => { const h = [16, 22, 12, 28, 20, 34, 26, 18, 30][i]; return `<rect x="${186 + i * 12}" y="${132 - h}" width="8" height="${h}" rx="2" fill="${i === 5 ? '#a98af0' : '#7b3fe4'}"/>`; }).join('') +
  // chips + composer
  [0, 1, 2].map((i) => `<rect x="${16 + i * 70}" y="146" width="64" height="10" rx="5" fill="#26262c"/>`).join('') +
  `<rect x="16" y="160" width="288" height="16" rx="8" fill="#26262c" stroke="#34343c"/><circle cx="296" cy="168" r="5.5" fill="#f4f4f6"/>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'assistant',
      name: 'Assistant',
      description: "Posez une question, la réponse s'affiche en chiffres, graphiques et tableaux. Calculé localement à partir de vos données, sans modèle d'IA ni dépense.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'tool',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        { type: 'select', key: 'density', label: 'Densité des réponses', default: 'comfortable', options: [{ value: 'comfortable', label: 'Confortable' }, { value: 'compact', label: 'Compacte' }], group: 'Disposition' },
        { type: 'boolean', key: 'showUnderstood', label: 'Afficher ce qui a été compris (intention, période, entités)', default: true, group: 'Réponses' },
        { type: 'boolean', key: 'keepHistory', label: 'Conserver les 20 dernières réponses sur cet appareil', default: true, group: 'Réponses' },
      ],
      components: ['IntentParser', 'AnswerCard', 'KpiTiles', 'StackedColumns', 'LineArea', 'HBars', 'DataTable', 'PinnedStrip', 'Composer', 'NatureBadge'],
      layout: { kind: 'workspace', zoomPan: false, minimap: false, minWidth: 320, immersive: true },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Chaque réponse est annoncée au lecteur d’écran ; Entrée envoie, Flèche haut rappelle la dernière question ; tableaux et listes navigables.',
      },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 2000, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Assistant'),
  },
];
