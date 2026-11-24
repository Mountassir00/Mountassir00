import { VERDICT_LABELS } from '../simulation/analysis';
import type {
  Concept,
  CriterionKey,
  Evaluation,
  FairnessReport,
  GateStatus,
  Innovation,
  Layout,
  RuleResult,
  ScenarioResult,
} from '../model';
import { clamp, round } from '../rng';
import { computeMaturity } from './maturity';

/**
 * Système de notation sur 100 (exigence §21).
 * Chaque critère est calculé à partir d'indicateurs explicites et justifiés
 * (raisons listées) ; un jury peut surcharger une note en la motivant.
 * Sécurité, équité et conformité sont des CONDITIONS PRÉALABLES, hors note.
 */

export const CRITERIA: { key: CriterionKey; label: string; max: number }[] = [
  { key: 'innovation_sportive', label: 'Innovation sportive', max: 12 },
  { key: 'experience_spectateur', label: 'Expérience spectateur', max: 15 },
  { key: 'experience_joueur', label: 'Expérience joueur', max: 10 },
  { key: 'faisabilite', label: 'Faisabilité opérationnelle', max: 15 },
  { key: 'rentabilite', label: 'Rentabilité potentielle', max: 15 },
  { key: 'potentiel_mediatique', label: 'Potentiel médiatique', max: 10 },
  { key: 'reproductibilite', label: 'Reproductibilité', max: 10 },
  { key: 'coherence_baskest', label: 'Cohérence avec Bask’Est', max: 8 },
  { key: 'impact_territorial', label: 'Impact territorial et social', max: 5 },
];

export interface EvaluationInput {
  concept: Concept;
  fairness?: FairnessReport;
  scenarios?: ScenarioResult[];
  rules?: RuleResult[];
  layout?: Layout;
  innovations?: Innovation[];
  overrides?: Evaluation['overrides'];
}

type Sub = { score: number; reasons: string[] };

const rule = (rules: RuleResult[] | undefined, id: string) => rules?.find((r) => r.ruleId === id);
const ruleScore = (r?: RuleResult) => (!r || r.outcome === 'non_evaluable' ? 0.6 : r.outcome === 'ok' ? 1 : r.outcome === 'alerte' ? 0.4 : 0);

function innovation(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  let s = 0.25;
  const m = c.format.match.mechanics.length;
  s += Math.min(3, m) * 0.12;
  if (m) reasons.push(`${m} mécanique(s) de match non standard`);
  const stages = c.format.stages.map((x) => x.type);
  const rare = stages.filter((t) => ['king_of_the_court', 'ladder', 'points_race', 'double_elim', 'swiss'].includes(t));
  if (rare.length) {
    s += 0.12;
    reasons.push(`structure peu courante (${rare.join(', ')})`);
  }
  if (c.format.teamSize === 2 || c.format.teamSize === 4) {
    s += 0.08;
    reasons.push(`format ${c.format.teamSize}c${c.format.teamSize} rare en compétition`);
  }
  if (c.format.composition?.length) {
    s += 0.08;
    reasons.push('règles de composition (mixité, âge, inclusion)');
  }
  if (c.core !== 'match') {
    s += 0.08;
    reasons.push(`activité centrale « ${c.core} » (au-delà du match)`);
  }
  if (c.innovationIds.length >= 2) {
    s += 0.08;
    reasons.push(`${c.innovationIds.length} innovations transposées`);
  }
  if (i.fairness?.verdict === 'desequilibre') {
    s -= 0.2;
    reasons.push('pénalité : déséquilibre détecté en simulation');
  }
  return { score: clamp(s, 0, 1), reasons };
}

function spectator(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  const phases = new Set(c.experience.map((e) => e.phase));
  let s = (phases.size / 8) * 0.35;
  reasons.push(`${phases.size}/8 phases du parcours spectateur conçues`);
  const special = ['enfants', 'familles', 'pmr', 'entreprises', 'vip'].filter((a) => c.experience.some((e) => e.audience?.includes(a as never)) || c.audiences.includes(a as never));
  s += Math.min(1, special.length / 4) * 0.15;
  if (special.length) reasons.push(`parcours spécifiques : ${special.join(', ')}`);
  if (i.fairness) {
    const suspense = clamp(i.fairness.closeGameRate / 0.4, 0, 1);
    s += suspense * 0.2;
    reasons.push(`${Math.round(i.fairness.closeGameRate * 100)} % de matchs serrés (simulation)`);
    const len = i.fairness.avgMatchMinutes;
    if (len >= 4 && len <= 25) s += 0.05;
  } else s += 0.1;
  const lis = ruleScore(rule(i.rules, 'R01'));
  const dead = ruleScore(rule(i.rules, 'R02'));
  const vis = ruleScore(rule(i.rules, 'R09'));
  const food = ruleScore(rule(i.rules, 'R10'));
  const inter = ruleScore(rule(i.rules, 'R14'));
  s += lis * 0.07 + dead * 0.06 + vis * 0.04 + food * 0.04 + inter * 0.04;
  if (lis < 1) reasons.push('règles à simplifier pour le grand public');
  if (dead < 1) reasons.push('temps morts à combler');
  return { score: clamp(s, 0, 1), reasons };
}

function player(i: EvaluationInput): Sub {
  const reasons: string[] = [];
  let s = 0.3;
  if (i.fairness) {
    const g = i.fairness.gamesPerTeam.min;
    s += clamp(g / 3, 0, 1) * 0.25;
    reasons.push(`au moins ${g} match(s) garanti(s) par équipe`);
    if (i.fairness.unfairSituations.length) {
      s -= 0.1;
      reasons.push('situations injustes détectées');
    }
  }
  s += ruleScore(rule(i.rules, 'R03')) * 0.12 + ruleScore(rule(i.rules, 'R04')) * 0.12 + ruleScore(rule(i.rules, 'R07')) * 0.08 + ruleScore(rule(i.rules, 'R12')) * 0.1;
  if (i.concept.content.some((h) => /joueur|carte|highlight|portrait/i.test(h.format))) {
    s += 0.08;
    reasons.push('contenus personnalisés pour les joueurs');
  }
  return { score: clamp(s, 0, 1), reasons };
}

function feasibility(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  const tier = { micro: 1, limite: 0.85, standard: 0.65, premium: 0.4 }[c.budgetTier];
  let s = tier * 0.3;
  reasons.push(`budget ${c.budgetTier}`);
  const vol = c.volunteersNeeded <= 20 ? 1 : c.volunteersNeeded <= 40 ? 0.75 : c.volunteersNeeded <= 70 ? 0.5 : 0.25;
  s += vol * 0.2;
  reasons.push(`${c.volunteersNeeded} bénévoles nécessaires`);
  const blocks = i.rules?.filter((r) => r.outcome === 'bloquant').length ?? 0;
  const alerts = i.rules?.filter((r) => r.outcome === 'alerte').length ?? 0;
  s += clamp(1 - blocks * 0.35 - alerts * 0.06, 0, 1) * 0.3;
  if (blocks) reasons.push(`${blocks} règle(s) bloquante(s)`);
  if (alerts) reasons.push(`${alerts} alerte(s) de conception`);
  if (i.layout) {
    const unp = i.layout.unplaced.length;
    s += clamp(1 - unp * 0.25, 0, 1) * 0.15;
    if (unp) reasons.push(`${unp} zone(s) non implantée(s)`);
  } else s += 0.08;
  if (c.venueType === 'palais_des_sports' || c.venueType === 'arena') {
    s -= 0.05;
    reasons.push('disponibilité d’une grande salle contrainte');
  }
  s += c.durationHours <= 8 ? 0.05 : 0;
  return { score: clamp(s, 0, 1), reasons };
}

function profitability(i: EvaluationInput): Sub {
  const reasons: string[] = [];
  if (!i.scenarios) return { score: 0.4, reasons: ['budget non simulé'] };
  const real = i.scenarios.find((s) => s.name === 'realiste')!;
  const prud = i.scenarios.find((s) => s.name === 'prudent')!;
  let s = 0;
  s += clamp((real.margin + 0.2) / 0.4, 0, 1) * 0.4;
  reasons.push(`marge réaliste ${Math.round(real.margin * 100)} %`);
  s += clamp((prud.result / Math.max(1, prud.totalCosts) + 0.3) / 0.3, 0, 1) * 0.25;
  reasons.push(`résultat prudent ${Math.round(prud.result)} €`);
  if (real.breakEvenSpectators !== null && i.concept.expectedSpectators > 0) {
    const ratio = real.breakEvenSpectators / i.concept.expectedSpectators;
    s += clamp(1.2 - ratio, 0, 1) * 0.15;
    reasons.push(`point mort à ${real.breakEvenSpectators} spectateurs`);
  } else s += 0.05;
  s += (1 - clamp(real.dependency.subsidyShare / 0.5, 0, 1)) * 0.1;
  s += clamp(real.dependency.securedShare / 0.6, 0, 1) * 0.1;
  if (real.dependency.subsidyShare > 0.4) reasons.push('forte dépendance aux subventions');
  return { score: clamp(s, 0, 1), reasons };
}

function media(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  const avg = c.content.length ? c.content.reduce((a, h) => a + h.viralPotential, 0) / c.content.length : 0;
  let s = clamp(c.content.length / 6, 0, 1) * 0.35 + (avg / 5) * 0.3;
  reasons.push(`${c.content.length} séquences à fort potentiel, potentiel moyen ${round(avg, 1)}/5`);
  const platforms = new Set(c.content.map((h) => h.platform));
  s += (platforms.size / 4) * 0.1;
  const innov = (i.innovations ?? []).filter((x) => c.innovationIds.includes(x.id));
  if (innov.length) {
    const mp = innov.reduce((a, x) => a + x.mediaPotential, 0) / innov.length;
    s += (mp / 5) * 0.15;
    reasons.push(`innovations à potentiel médiatique ${round(mp, 1)}/5`);
  } else s += 0.05;
  s += ruleScore(rule(i.rules, 'R15')) * 0.1;
  return { score: clamp(s, 0, 1), reasons };
}

function reproducibility(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  const venue: Record<string, number> = {
    gymnase: 1,
    city_stade: 1,
    terrain_exterieur: 0.9,
    campus: 0.85,
    complexe_sportif: 0.85,
    place_publique: 0.6,
    centre_commercial: 0.7,
    espace_temporaire: 0.5,
    palais_des_sports: 0.5,
    arena: 0.3,
  };
  let s = (venue[c.venueType] ?? 0.6) * 0.35;
  reasons.push(`lieu type « ${c.venueType.replace(/_/g, ' ')} »`);
  s += ({ micro: 1, limite: 0.85, standard: 0.6, premium: 0.35 }[c.budgetTier]) * 0.25;
  s += (c.volunteersNeeded <= 25 ? 1 : c.volunteersNeeded <= 50 ? 0.6 : 0.3) * 0.15;
  const sims = c.format.match.mechanics.length;
  s += (sims <= 2 ? 1 : 0.6) * 0.1;
  s += (c.scale === 'locale' ? 1 : c.scale === 'regionale' ? 0.8 : 0.6) * 0.15;
  if (c.volunteersNeeded > 50) reasons.push('dépend d’une grosse équipe bénévole');
  return { score: clamp(s, 0, 1), reasons };
}

const MISSION = ['inclusion', 'jeunesse', 'communaute', 'territoire', 'spectacle', 'detection'];
function coherence(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  const overlap = c.objectives.filter((o) => MISSION.includes(o)).length;
  let s = clamp(overlap / 3, 0, 1) * 0.5;
  reasons.push(`${overlap} objectif(s) alignés avec la mission (lien social, inclusion, dynamisation locale)`);
  const local = /(nancy|lorraine|grand est|stan|chardon|mirabelle|meurthe|moselle|est)/i.test(`${c.title} ${c.identity.name} ${c.identity.tagline} ${c.pitch}`);
  if (local) {
    s += 0.25;
    reasons.push('ancrage territorial dans l’identité');
  }
  if (c.propertyId || c.tags.some((t) => t.includes('passerelle'))) {
    s += 0.15;
    reasons.push('rattaché à l’écosystème Bask’Est');
  }
  s += 0.1;
  return { score: clamp(s, 0, 1), reasons };
}

function territory(i: EvaluationInput): Sub {
  const c = i.concept;
  const reasons: string[] = [];
  const target = ['eloignes_pratique', 'femmes', 'pmr', 'jeunes', 'enfants', 'familles', 'etudiants'].filter((a) => c.audiences.includes(a as never));
  let s = clamp(target.length / 3, 0, 1) * 0.6;
  if (target.length) reasons.push(`publics prioritaires : ${target.join(', ')}`);
  if (c.objectives.includes('territoire') || c.objectives.includes('inclusion')) s += 0.25;
  if ((c.ops?.ticketPrice ?? 0) === 0 || c.budgetTier === 'micro') {
    s += 0.15;
    reasons.push('accès gratuit ou à bas prix');
  }
  return { score: clamp(s, 0, 1), reasons };
}

const SCORERS: Record<CriterionKey, (i: EvaluationInput) => Sub> = {
  innovation_sportive: innovation,
  experience_spectateur: spectator,
  experience_joueur: player,
  faisabilite: feasibility,
  rentabilite: profitability,
  potentiel_mediatique: media,
  reproductibilite: reproducibility,
  coherence_baskest: coherence,
  impact_territorial: territory,
};

export function evaluateConcept(i: EvaluationInput): Evaluation {
  const criteria = CRITERIA.map((c) => {
    const sub = SCORERS[c.key](i);
    const ov = i.overrides?.find((o) => o.key === c.key);
    const points = ov ? clamp(ov.points, 0, c.max) : round(sub.score * c.max, 1);
    const reasons = ov ? [...sub.reasons, `note ajustée par ${ov.by} : ${ov.reason}`] : sub.reasons;
    return { key: c.key, label: c.label, max: c.max, points, reasons };
  });
  const total = round(criteria.reduce((a, c) => a + c.points, 0), 1);

  const details: string[] = [];
  const blocking = (ids: string[]) => (i.rules ?? []).filter((r) => ids.includes(r.ruleId) && r.outcome === 'bloquant');
  const unevaluated = (ids: string[]) => (i.rules ?? []).filter((r) => ids.includes(r.ruleId) && r.outcome === 'non_evaluable');

  // Sécurité
  const safetyIds = ['R04', 'R20', 'R21', 'R22', 'R24', 'R26'];
  let safety: GateStatus = 'conforme';
  const sb = blocking(safetyIds);
  if (sb.length) {
    safety = 'non_conforme';
    details.push(...sb.map((r) => `Sécurité — ${r.label} : ${r.message}`));
  } else if (!i.rules || unevaluated(safetyIds).length || !i.concept.safety.dps) {
    safety = 'a_verifier';
    details.push('Sécurité — à confirmer : DPS, jauge et implantation validés par le gestionnaire du lieu.');
  }

  // Équité
  let fairness: GateStatus = 'conforme';
  if (!i.fairness) {
    fairness = 'a_verifier';
    details.push('Équité — format non simulé.');
  } else if (i.fairness.dominantStrategies.length) {
    fairness = 'non_conforme';
    details.push(`Équité — stratégie dominante : ${i.fairness.dominantStrategies.map((d) => d.strategy).join(', ')}.`);
  } else if (i.fairness.verdict !== 'equilibre') {
    fairness = 'a_verifier';
    details.push(`Équité — verdict ${VERDICT_LABELS[i.fairness.verdict]} : ${[...i.fairness.unfairSituations, ...i.fairness.manipulationRisks][0] ?? 'à analyser'}.`);
  }

  // Conformité
  let compliance: GateStatus = 'conforme';
  const cb = blocking(['R23']);
  if (!i.concept.safety.insurance) {
    compliance = 'non_conforme';
    details.push('Conformité — assurance RC organisateur absente (obligation légale).');
  }
  if (cb.length) {
    compliance = 'non_conforme';
    details.push(`Conformité — ${cb[0].message}`);
  }
  if (i.concept.format.match.official && i.concept.format.match.mechanics.length) {
    compliance = 'non_conforme';
    details.push('Conformité — compétition déclarée officielle avec des règles non FIBA/FFBB : la déclarer non officielle ou retirer les mécaniques.');
  }
  if (compliance === 'conforme' && i.concept.safety.authorizations.length === 0) {
    compliance = 'a_verifier';
    details.push('Conformité — autorisations à lister (lieu, mairie/préfecture, buvette, SACEM).');
  }

  const eligible = safety !== 'non_conforme' && fairness !== 'non_conforme' && compliance !== 'non_conforme';
  const grade = total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : 'D';
  const mat = computeMaturity(i.concept.evidence);
  return {
    conceptId: i.concept.id,
    criteria,
    total,
    gates: { safety, fairness, compliance, details },
    eligible,
    grade,
    maturity: mat.level,
    nextMaturitySteps: mat.next ? [`${mat.next.label} : ${mat.next.requirement}`] : ['Niveau maximal atteint'],
    overrides: i.overrides,
  };
}
