import type { MaturityEvidence, MaturityLevel } from '../model';

/**
 * Échelle de maturité (exigence §21). Un niveau n'est accordé que sur
 * PREUVES : on ne peut pas présenter une idée comme un format validé tant
 * qu'elle n'a pas été testée dans des conditions suffisantes.
 */

export const MATURITY_LEVELS: { level: MaturityLevel; label: string; requirement: string; test: (e: MaturityEvidence) => boolean }[] = [
  { level: 'idee', label: 'Idée', requirement: '—', test: () => true },
  { level: 'concept_documente', label: 'Concept documenté', requirement: 'Fiche concept complète (format, public, lieu, budget, sécurité)', test: (e) => e.documented },
  { level: 'concept_en_simulation', label: 'Concept en simulation', requirement: '≥ 100 simulations Monte-Carlo du format', test: (e) => e.simulationRuns >= 100 },
  { level: 'prototype', label: 'Prototype', requirement: '≥ 1 test terrain à petite échelle (séance, joueurs réels)', test: (e) => e.prototypeSessions >= 1 },
  { level: 'evenement_pilote', label: 'Événement pilote', requirement: '≥ 1 édition réelle auditée', test: (e) => e.pilotEditions >= 1 },
  { level: 'format_valide', label: 'Format validé', requirement: '≥ 2 éditions atteignant leurs objectifs', test: (e) => e.editionsMeetingTargets >= 2 },
  { level: 'format_reproductible', label: 'Format reproductible', requirement: '≥ 1 édition réussie par une autre équipe / un autre lieu avec le manuel', test: (e) => e.replications >= 1 },
  { level: 'format_exportable', label: 'Format exportable', requirement: '≥ 1 édition dans un autre territoire (licence / partenariat)', test: (e) => e.otherTerritories >= 1 },
];

export function computeMaturity(e: MaturityEvidence): { level: MaturityLevel; label: string; next?: { level: MaturityLevel; label: string; requirement: string } } {
  let idx = 0;
  for (let i = 1; i < MATURITY_LEVELS.length; i++) {
    if (MATURITY_LEVELS[i].test(e)) idx = i;
    else break; // les niveaux sont cumulatifs
  }
  const cur = MATURITY_LEVELS[idx];
  const nxt = MATURITY_LEVELS[idx + 1];
  return { level: cur.level, label: cur.label, next: nxt && { level: nxt.level, label: nxt.label, requirement: nxt.requirement } };
}

export const maturityLabel = (l: MaturityLevel) => MATURITY_LEVELS.find((m) => m.level === l)?.label ?? l;
export const maturityIndex = (l: MaturityLevel) => MATURITY_LEVELS.findIndex((m) => m.level === l);
