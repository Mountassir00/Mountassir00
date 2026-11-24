import type { Innovation, WatchItem } from '../model';
import { clamp, round } from '../rng';

/**
 * Qualification de la veille : pertinence = transposabilité × accessibilité
 * financière × potentiel médiatique × adéquation Bask'Est.
 */
const BASKEST_KEYWORDS = ['3x3', 'streetball', 'all-star', 'all star', 'dunk', 'inclusi', 'handi', 'fauteuil', 'féminin', 'jeunes', 'quartier', 'tournoi', 'fan', 'expérience', 'draft', 'format', 'règle', 'communauté', 'grand est', 'nancy'];

export function scoreWatchItem(item: Pick<WatchItem, 'title' | 'summary' | 'sector' | 'tags'>): number {
  const text = `${item.title} ${item.summary} ${item.tags.join(' ')}`.toLowerCase();
  const hits = BASKEST_KEYWORDS.filter((k) => text.includes(k)).length;
  const sectorBoost = item.sector === 'basketball' ? 0.25 : 0.1;
  return round(clamp(0.15 + sectorBoost + hits * 0.08, 0, 1), 2);
}

export function innovationPriority(i: Innovation): number {
  const cost = { tres_faible: 1, faible: 0.8, moyen: 0.5, eleve: 0.25 }[i.cost.tier];
  const fit = clamp(i.applicableTo.length / 3, 0, 1);
  return round((i.mediaPotential / 5) * 0.4 + cost * 0.35 + fit * 0.15 + (i.immediate ? 0.1 : 0), 2);
}

/** Synthèse hebdomadaire (markdown) — à brancher sur une tâche planifiée (intégration). */
export function weeklyDigest(items: WatchItem[], weekLabel: string): string {
  const top = items.slice().sort((a, b) => b.relevance - a.relevance).slice(0, 10);
  return [
    `# Synthèse de veille — ${weekLabel}`,
    '',
    `${items.length} signaux collectés, ${items.filter((i) => i.status === 'qualifie').length} qualifiés, ${items.filter((i) => i.status === 'transpose').length} transposés.`,
    '',
    '| Pertinence | Secteur | Signal | Statut |',
    '|---|---|---|---|',
    ...top.map((i) => `| ${Math.round(i.relevance * 100)} % | ${i.sector} | [${i.title}](${i.url}) | ${i.status} |`),
    '',
    '## Décisions à prendre',
    '- Quels signaux passent en « Laboratoire » (fiche innovation + test) ?',
    '- Quels signaux sont écartés (et pourquoi) ?',
  ].join('\n');
}
