import type { ExperienceDefinition } from '@sdk';
import { wrap } from '../thumbs';

/* Thumbnail: a triage list on the left, a review panel with a diff and a green GO button on the right. */
const item = (y: number, sel: boolean, w: number, tone: string) =>
  `<rect x="18" y="${y}" width="96" height="30" rx="7" fill="${sel ? '#f1ebfd' : '#ffffff'}" stroke="${sel ? '#7b3fe4' : '#e2e2e7'}"/>` +
  `<rect x="24" y="${y + 6}" width="26" height="5" rx="2.5" fill="${tone}"/>` +
  `<rect x="24" y="${y + 15}" width="${w}" height="4" rx="2" fill="#3f3f46"/>` +
  `<circle cx="27" cy="${y + 24}" r="2.6" fill="hsl(250 58% 45%)"/><rect x="32" y="${y + 22.5}" width="22" height="3" rx="1.5" fill="#9a9aa5"/>`;
const diff = (y: number, kind: 'add' | 'del' | 'ctx', w: number) =>
  `<rect x="132" y="${y}" width="170" height="8" fill="${kind === 'add' ? '#dff3e8' : kind === 'del' ? '#fbe4e6' : '#ffffff'}"/>` +
  `<rect x="140" y="${y + 2.5}" width="${w}" height="3" rx="1.5" fill="${kind === 'add' ? '#13915f' : kind === 'del' ? '#d93a45' : '#9a9aa5'}"/>`;

const THUMB = wrap(
  `<rect x="10" y="10" width="112" height="160" rx="12" fill="#ffffff" stroke="#e2e2e7"/>` +
    `<rect x="18" y="18" width="60" height="7" rx="3.5" fill="#0f0f12"/>` +
    item(32, true, 70, '#e9e0fb') + item(66, false, 58, '#e9e0fb') + item(100, false, 64, '#f9dde6') +
    `<rect x="18" y="140" width="96" height="20" rx="6" fill="#f4f4f6"/><rect x="24" y="148" width="50" height="4" rx="2" fill="#9a9aa5"/>` +
    `<rect x="126" y="10" width="184" height="160" rx="12" fill="#ffffff" stroke="#e2e2e7"/>` +
    `<rect x="134" y="18" width="40" height="5" rx="2.5" fill="#9a9aa5"/><rect x="178" y="17" width="22" height="7" rx="3.5" fill="#e9e0fb"/>` +
    `<rect x="134" y="29" width="120" height="7" rx="3.5" fill="#0f0f12"/>` +
    `<rect x="134" y="44" width="34" height="4" rx="2" fill="#3f3f46"/><rect x="174" y="44" width="34" height="4" rx="2" fill="#9a9aa5"/><rect x="214" y="44" width="30" height="4" rx="2" fill="#9a9aa5"/>` +
    `<rect x="134" y="50" width="34" height="1.6" fill="#7b3fe4"/>` +
    `<rect x="132" y="58" width="170" height="64" rx="6" fill="#ffffff" stroke="#e2e2e7"/>` +
    diff(62, 'ctx', 120) + diff(70, 'del', 96) + diff(78, 'del', 110) + diff(86, 'add', 130) + diff(94, 'add', 104) + diff(102, 'add', 118) + diff(110, 'ctx', 90) +
    `<rect x="132" y="130" width="96" height="32" rx="6" fill="#f4f4f6"/><rect x="138" y="137" width="60" height="4" rx="2" fill="#3f3f46"/><rect x="138" y="146" width="80" height="3" rx="1.5" fill="#9a9aa5"/>` +
    `<rect x="234" y="130" width="68" height="16" rx="5" fill="#107a50"/><text x="268" y="141.5" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#fff">GO</text>` +
    `<rect x="234" y="149" width="32" height="13" rx="4" fill="#f8efc3"/><rect x="270" y="149" width="32" height="13" rx="4" fill="#f9dde6"/>`,
);

export const definitions: ExperienceDefinition[] = [
  {
    manifest: {
      id: 'inbox',
      name: 'Boîte de réception',
      description: "Les propositions à arbitrer présentées comme une revue de code (contexte, changements, contrôles, GO / NO GO / TEST) et l'autopilote des tâches planifiées.",
      version: '0.2.0',
      thumbnail: THUMB,
      family: 'tool',
      renderer: 'dom',
      status: 'prototype',
      graphics: [
        {
          type: 'select', key: 'defaultTab', label: 'Onglet à l’ouverture', default: 'pending', group: 'Disposition',
          options: [{ value: 'pending', label: 'À arbitrer' }, { value: 'history', label: 'Historique' }, { value: 'autopilot', label: 'Autopilote' }],
        },
        { type: 'boolean', key: 'compactList', label: 'Liste compacte (titres seuls)', default: false, group: 'Disposition' },
        { type: 'boolean', key: 'showRelated', label: 'Événements liés dans la conversation', default: true, group: 'Revue' },
        { type: 'number', key: 'runStrip', label: 'Exécutions affichées dans la frise de l’autopilote', default: 30, min: 7, max: 60, step: 1, group: 'Autopilote' },
      ],
      components: ['Review', 'ChangesView', 'ChecksView', 'ObjectsView', 'Autopilot', 'NatureBadge'],
      layout: { kind: 'workspace', zoomPan: false, minimap: false, minWidth: 320 },
      accessibility: {
        keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA',
        notes: 'Les verdicts passent par la passerelle : permission, Replay en lecture seule et confirmation proportionnée au risque (saisie de CONFIRMER pour un changement durable).',
      },
      dependencies: { sdk: '^1.0.0', libraries: [] },
      performance: { cost: 'low', maxNodes: 500, targetFps: 0, animated: false },
      devices: { desktop: 'full', tablet: 'full', mobile: 'full' },
      createdAt: '2026-11-24',
    },
    load: () => import('./Inbox'),
  },
];
