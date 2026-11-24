// EVENT LAB — simulateur d'incidents (docs/07-algorithmes.md §8)
import { simulate } from './finance.js';
import { simulateCompetition } from './competition.js';

export const INCIDENT_TYPES = {
  delay: 'Retard du programme',
  dropout: 'Désistement de participants',
  supplier_absence: "Absence d'un prestataire",
  it_failure: 'Panne informatique',
  power_failure: 'Défaillance électrique',
  weather: 'Météo défavorable',
  attendance_change: 'Affluence différente des prévisions',
  budget_cut: 'Réduction de budget',
};

const MAX_COMPRESSION = 0.3;

/** Retard : décale les séquences à partir de `fromMin`, compresse les non critiques jusqu'à −30 % pour rattraper. */
function applyDelay(cfg, { minutes, fromMin = 0 }) {
  const seqs = [...(cfg.program ?? [])].sort((a, b) => a.start_min - b.start_min);
  const after = seqs.filter((s) => s.start_min >= fromMin);
  const compressible = after.filter((s) => !s.critical && !['montage', 'demontage'].includes(s.kind));
  const capacity = compressible.reduce((s, x) => s + x.duration_min * MAX_COMPRESSION, 0);
  const recovered = Math.min(minutes, capacity);
  const ratio = capacity ? recovered / capacity : 0;
  let shift = minutes;
  const actions = [];
  for (const s of after) {
    s.start_min += shift;
    if (compressible.includes(s)) {
      const cut = Math.round(s.duration_min * MAX_COMPRESSION * ratio);
      if (cut > 0) { s.duration_min -= cut; shift -= cut; actions.push(`Réduire « ${s.label} » de ${cut} min`); }
    }
  }
  const residual = Math.max(0, Math.round(shift));
  return { actions, residualDelayMin: residual, recoveredMin: Math.round(minutes - residual) };
}

function applyDropout(cfg, { count }) {
  const actions = [];
  for (const st of cfg.competition?.stages ?? []) {
    if (st === cfg.competition.stages[0] || st.type === 'round_robin') {
      const before = st.entrants;
      st.entrants = Math.max(2, st.entrants - count);
      actions.push(`Étape « ${st.label ?? st.id} » : ${before} → ${st.entrants} entrants (repêchage liste d'attente prioritaire)`);
    }
  }
  if (cfg.participants?.count) for (const k of Object.keys(cfg.participants.count)) cfg.participants.count[k] = Math.max(0, cfg.participants.count[k] - count);
  return { actions };
}

function removeEquipment(cfg, predicate, reason) {
  const removed = (cfg.resources?.equipment ?? []).filter(predicate);
  cfg.resources.equipment = (cfg.resources?.equipment ?? []).filter((e) => !predicate(e));
  return { actions: removed.map((e) => `${reason} : « ${e.item} » indisponible → mode dégradé`) , removed };
}

function applyBudgetCut(cfg, { rate }) {
  const total = (cfg.budget?.expenses ?? []).reduce((s, e) => s + (e.basis === 'fixed' ? e.amount : 0), 0);
  let toCut = total * rate;
  const actions = [];
  const candidates = [...(cfg.budget?.expenses ?? [])].filter((e) => e.basis === 'fixed').sort((a, b) => (b.optional - a.optional) || ((b.priority ?? 2) - (a.priority ?? 2)) || (b.amount - a.amount));
  for (const e of candidates) {
    if (toCut <= 0) break;
    if ((e.priority ?? 2) === 1 && !e.optional) continue; // jamais les indispensables
    actions.push(`Supprimer « ${e.label} » (${e.amount} €)`);
    toCut -= e.amount;
    cfg.budget.expenses = cfg.budget.expenses.filter((x) => x !== e);
  }
  return { actions, uncovered: Math.max(0, Math.round(toCut)) };
}

/**
 * Applique un incident à une copie de la configuration et ré-simule.
 * @returns {{ type, label, config, actions, impact, continuity }}
 */
export function runIncident(config, incident, scenario = 'central') {
  const cfg = structuredClone(config);
  cfg.resources ??= { staff: [], equipment: [] };
  let res = { actions: [] };
  switch (incident.type) {
    case 'delay': res = applyDelay(cfg, incident); break;
    case 'dropout': res = applyDropout(cfg, incident); break;
    case 'supplier_absence': res = removeEquipment(cfg, (e) => e.source === incident.source, 'Prestataire absent'); break;
    case 'it_failure': res = removeEquipment(cfg, (e) => /écran|ecran|tablette|ordinateur|vidéoproj|videoproj|app|chrono/i.test(e.item), 'Panne informatique'); break;
    case 'power_failure': res = removeEquipment(cfg, (e) => (e.power_w ?? 0) > 0 && !e.on_generator, 'Défaillance électrique'); break;
    case 'weather': {
      const fallback = (cfg.variants ?? []).find((v) => v.kind === 'secours');
      res = { actions: [fallback ? `Basculer sur la variante « ${fallback.label} »` : 'Aucune variante de secours définie : en créer une (kind = secours) avant validation'] };
      break;
    }
    case 'attendance_change': {
      const f = 1 + (incident.rate ?? 0);
      for (const k of Object.keys(cfg.audience?.attendance ?? {})) cfg.audience.attendance[k] = Math.round(cfg.audience.attendance[k] * f);
      res = { actions: [incident.rate < 0 ? 'Réduire les ouvertures de buvette et de files ; concentrer le public autour du terrain central' : 'Ouvrir des files supplémentaires ; activer la jauge et la communication « complet »'] };
      break;
    }
    case 'budget_cut': res = applyBudgetCut(cfg, incident); break;
    default: throw new Error(`Incident inconnu : ${incident.type}`);
  }
  const before = simulate(config, scenario).totals.result;
  const after = simulate(cfg, scenario).totals.result;
  const compBefore = simulateCompetition(config).totalWithMarginMin;
  const compAfter = simulateCompetition(cfg).totalWithMarginMin;
  const related = (config.risks ?? []).filter((r) => (incident.riskIds ?? []).includes(r.id) || r.description?.toLowerCase().includes((INCIDENT_TYPES[incident.type] ?? '').toLowerCase().split(' ')[0]));
  return {
    type: incident.type,
    label: INCIDENT_TYPES[incident.type],
    config: cfg,
    actions: res.actions,
    details: res,
    impact: {
      financialResultDelta: Math.round(after - before),
      competitionDurationDeltaMin: compAfter - compBefore,
    },
    continuity: related.map((r) => ({ risk: r.id, plan: r.continuity_plan })),
  };
}
