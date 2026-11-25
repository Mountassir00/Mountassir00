import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

/* Thumbnail: five soft columns of cards, one card selected, a fiche on the right. */
const COLS = [
  { x: 14, tone: '#b7790b', cards: 1 },
  { x: 62, tone: '#2e6fe0', cards: 3 },
  { x: 110, tone: '#62626c', cards: 1 },
  { x: 158, tone: '#13915f', cards: 3 },
  { x: 206, tone: '#d93a45', cards: 2 },
];
const PASTEL = ['#d9f2e4', '#dce8fb', '#e9e0fb', '#fbe6d5', '#f9dde6'];
const card = (x: number, y: number, i: number, sel = false) =>
  `<rect x="${x}" y="${y}" width="40" height="30" rx="5" fill="#fff" stroke="${sel ? '#7b3fe4' : '#e2e2e7'}" stroke-width="${sel ? 1.6 : 1}"/>` +
  `<rect x="${x + 4}" y="${y + 5}" width="${18 + ((i * 7) % 14)}" height="3.5" rx="1.7" fill="#3f3f46"/>` +
  `<rect x="${x + 4}" y="${y + 12}" width="16" height="5" rx="2" fill="${PASTEL[i % PASTEL.length]}"/>` +
  `<circle cx="${x + 7}" cy="${y + 23}" r="3" fill="hsl(${(i * 67) % 360} 58% 45%)"/>` +
  `<rect x="${x + 13}" y="${y + 22}" width="${10 + (i % 3) * 5}" height="2.4" rx="1.2" fill="#9a9aa5"/>`;

const THUMB = wrap(
  `<rect x="8" y="10" width="248" height="160" rx="12" fill="#ffffff" stroke="#e2e2e7"/>` +
    `<rect x="16" y="18" width="70" height="7" rx="3.5" fill="#0f0f12"/><rect x="176" y="17" width="72" height="10" rx="5" fill="#111114"/>` +
    COLS.map(
      (c, ci) =>
        `<rect x="${c.x}" y="36" width="46" height="128" rx="8" fill="#f4f4f6"/>` +
        `<circle cx="${c.x + 7}" cy="44" r="2.6" fill="${c.tone}"/><rect x="${c.x + 12}" y="42" width="20" height="4" rx="2" fill="#62626c"/>` +
        Array.from({ length: c.cards }, (_, k) => card(c.x + 3, 52 + k * 36, ci * 3 + k, ci === 1 && k === 0)).join(''),
    ).join('') +
    `<rect x="262" y="10" width="50" height="160" rx="10" fill="#ffffff" stroke="#e2e2e7"/>` +
    `<rect x="268" y="20" width="36" height="5" rx="2.5" fill="#0f0f12"/><rect x="268" y="31" width="26" height="8" rx="4" fill="#dce8fb"/>` +
    [0, 1, 2, 3, 4].map((i) => `<rect x="268" y="${48 + i * 12}" width="${30 - (i % 2) * 8}" height="3.5" rx="1.7" fill="#bfc0c8"/>`).join('') +
    `<rect x="268" y="112" width="38" height="4" rx="2" fill="#e2e2e7"/><rect x="268" y="112" width="22" height="4" rx="2" fill="#2e6fe0"/>` +
    `<rect x="268" y="150" width="38" height="12" rx="6" fill="#111114"/>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'kanban',
      name: 'Kanban des tâches',
      description: "Les tâches réelles en colonnes (en attente, en cours, suspendues, terminées, échouées), avec fiche détaillée, filtres et regroupements.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'tool',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        {
          type: 'select', key: 'defaultGrouping', label: 'Regroupement par défaut', default: 'status', group: 'Disposition',
          options: [{ value: 'status', label: 'Statut (colonnes)' }, { value: 'department', label: 'Département (couloirs)' }, { value: 'agent', label: 'Agent (couloirs)' }, { value: 'priority', label: 'Priorité (couloirs)' }],
        },
        { type: 'select', key: 'density', label: 'Densité des cartes', default: 'comfortable', group: 'Disposition', options: [{ value: 'comfortable', label: 'Confortable' }, { value: 'compact', label: 'Compacte' }] },
        { type: 'number', key: 'maxCards', label: 'Cartes affichées par colonne', default: 30, min: 5, max: 100, step: 5, group: 'Disposition' },
        { type: 'boolean', key: 'showDone', label: 'Afficher la colonne « Terminées »', default: true, group: 'Colonnes' },
        { type: 'boolean', key: 'showFailed', label: 'Afficher la colonne « Échouées »', default: true, group: 'Colonnes' },
        { type: 'boolean', key: 'showExplorer', label: 'Explorateur des départements (écrans larges)', default: true, group: 'Panneaux' },
        { type: 'boolean', key: 'showLog', label: 'Journal de la tâche sous le tableau', default: true, group: 'Panneaux' },
      ],
      components: ['Card', 'Detail', 'ExplorerTree', 'LogTerminal', 'Segmented', 'NatureBadge'],
      layout: { kind: 'workspace', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Déplacement au clavier : Espace pour saisir une carte, flèches pour choisir la colonne, Entrée pour déposer, Échap pour annuler.',
      },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'adapted' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Kanban'),
  },
];
