// EVENT LAB — notation /100, confiance, portes éliminatoires (docs/07-algorithmes.md §1)

export const CRITERIA = [
  { key: 'originalite', label: 'Originalité', weight: 12 },
  { key: 'experience_utilisateur', label: 'Expérience utilisateur', weight: 15 },
  { key: 'faisabilite_technique', label: 'Faisabilité technique', weight: 15 },
  { key: 'viabilite_economique', label: 'Viabilité économique', weight: 15 },
  { key: 'potentiel_mediatique', label: 'Potentiel médiatique', weight: 10 },
  { key: 'reproductibilite', label: 'Reproductibilité', weight: 10 },
  { key: 'adaptabilite_lieux', label: 'Adaptabilité aux lieux', weight: 8 },
  { key: 'accessibilite_inclusion', label: 'Accessibilité et inclusion', weight: 5 },
  { key: 'potentiel_commercial', label: 'Potentiel commercial', weight: 5 },
  { key: 'responsabilite_environnementale', label: 'Responsabilité environnementale', weight: 5 },
];

export const EVIDENCE_WEIGHT = { donnees_reelles: 1, benchmark_source: 0.6, jugement_expert: 0.3 };

const round1 = (x) => Math.round(x * 10) / 10;

/** Score pondéré. Lève une erreur si une note manque ou sort de [0 ; 5]. */
export function weightedScore(ratings) {
  let total = 0;
  const detail = [];
  for (const c of CRITERIA) {
    const r = ratings?.[c.key]?.rating;
    if (typeof r !== 'number' || Number.isNaN(r) || r < 0 || r > 5) {
      throw new Error(`Note invalide ou manquante pour « ${c.label} » (${c.key}) : ${r}`);
    }
    const points = (c.weight * r) / 5;
    total += points;
    detail.push({ key: c.key, label: c.label, weight: c.weight, rating: r, points: round1(points), gain: round1((c.weight * (5 - r)) / 5) });
  }
  return { raw: total, score: Math.round(total), detail };
}

export function grade(score) {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export function confidence(ratings) {
  let s = 0;
  for (const c of CRITERIA) {
    const ev = ratings?.[c.key]?.evidence ?? 'jugement_expert';
    s += c.weight * (EVIDENCE_WEIGHT[ev] ?? EVIDENCE_WEIGHT.jugement_expert);
  }
  return Math.round((s / 100) * 100) / 100;
}

/**
 * Portes éliminatoires, indépendantes du score (07 §1.5).
 * @param {object} config EventConfig
 * @param {object} [opts] { daysToEvent?: number }
 */
export function computeGates(config, opts = {}) {
  const risks = config.risks ?? [];
  const compliance = config.compliance ?? [];
  const notes = { securite: [], conformite_reglementaire: [], risques_critiques: [] };
  let sec = 'ok', reg = 'ok', crit = 'ok';

  for (const r of risks) {
    const prevention = Array.isArray(r.prevention) ? r.prevention.filter(Boolean) : [];
    if (['securite', 'sante'].includes(r.category) && r.impact === 5 && r.probability >= 3 && prevention.length === 0) {
      sec = 'bloquant';
      notes.securite.push(`${r.id} : impact 5, probabilité ${r.probability}, aucune prévention`);
    }
    if (r.critical && !(r.continuity_plan && r.continuity_plan.trim())) {
      crit = 'bloquant';
      notes.risques_critiques.push(`${r.id} : risque critique sans plan de continuité`);
    }
  }

  let days = opts.daysToEvent;
  if (typeof days !== 'number' && config.event_date) {
    const today = opts.today ? new Date(opts.today) : new Date();
    days = Math.round((new Date(config.event_date) - today) / 86400000);
  }
  const lateStage = config.maturity === 'blueprint' || config.maturity === 'executed' || (typeof days === 'number' && days < 30);
  for (const c of compliance) {
    if (!c.mandatory) continue;
    if (c.status === 'non_conforme') {
      reg = 'bloquant';
      notes.conformite_reglementaire.push(`${c.id} non conforme : ${c.item}`);
    } else if (['a_verifier', 'en_cours'].includes(c.status) && lateStage && reg !== 'bloquant') {
      reg = 'a_verifier';
      notes.conformite_reglementaire.push(`${c.id} à vérifier : ${c.item}`);
    }
  }

  const gates = {
    securite: { status: sec, notes: notes.securite.join(' ; ') || undefined },
    conformite_reglementaire: { status: reg, notes: notes.conformite_reglementaire.join(' ; ') || undefined },
    risques_critiques: { status: crit, notes: notes.risques_critiques.join(' ; ') || undefined },
  };
  return gates;
}

export function verdict(gates) {
  const statuses = Object.values(gates).map((g) => g.status);
  if (statuses.includes('bloquant')) return 'elimine';
  if (statuses.includes('a_verifier')) return 'sous_reserve';
  return 'eligible';
}

/** Les trois critères au plus fort gain potentiel, et le score si chaque note gagnait +1. */
export function improvementPlan(ratings) {
  const { detail } = weightedScore(ratings);
  const top = [...detail].sort((a, b) => b.gain - a.gain).slice(0, 3).map((d) => ({
    key: d.key, label: d.label, gain: d.gain, actions: ratings[d.key]?.improvements ?? [],
  }));
  const bumped = Object.fromEntries(CRITERIA.map((c) => [c.key, { rating: Math.min(5, ratings[c.key].rating + 1) }]));
  return { top, scoreIfPlusOne: weightedScore(bumped).score };
}

/** Évaluation complète : combine les portes déclarées (si plus sévères) et les portes calculées. */
export function evaluate(config, opts = {}) {
  const ev = config.evaluation ?? {};
  const { score, detail } = weightedScore(ev.ratings);
  const computedGates = computeGates(config, opts);
  const order = { ok: 0, a_verifier: 1, bloquant: 2 };
  const gates = {};
  for (const k of Object.keys(computedGates)) {
    const declared = ev.gates?.[k];
    gates[k] = declared && order[declared.status] > order[computedGates[k].status] ? declared : computedGates[k];
  }
  return {
    score,
    grade: grade(score),
    confidence: confidence(ev.ratings),
    verdict: verdict(gates),
    gates,
    detail,
    improvements: improvementPlan(ev.ratings),
  };
}
