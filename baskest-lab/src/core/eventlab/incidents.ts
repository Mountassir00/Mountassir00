// EVENT LAB — simulateur d'incidents (event-lab/docs/07-algorithmes.md §8)
import { simulate } from './finance';
import { simulateCompetition } from './competition';
import type { Config, EquipmentLine, EquipmentSource, Expense, ProgramItem, ScenarioKey } from './types';

export type IncidentType = 'delay' | 'dropout' | 'supplier_absence' | 'it_failure' | 'power_failure' | 'weather' | 'attendance_change' | 'budget_cut';

export const INCIDENT_TYPES: Record<IncidentType, string> = {
  delay: 'Retard du programme',
  dropout: 'Désistement de participants',
  supplier_absence: "Absence d'un prestataire",
  it_failure: 'Panne informatique',
  power_failure: 'Défaillance électrique',
  weather: 'Météo défavorable',
  attendance_change: 'Affluence différente des prévisions',
  budget_cut: 'Réduction de budget',
};

export interface Incident {
  type: IncidentType;
  /** delay : minutes de retard */
  minutes?: number;
  /** delay : début du retard, en minutes depuis 00:00 de J */
  fromMin?: number;
  /** dropout : nombre de participants (équipes) forfait */
  count?: number;
  /** supplier_absence : provenance du matériel indisponible */
  source?: EquipmentSource;
  /** attendance_change : variation (−0,4 = −40 %) ; budget_cut : taux de réduction */
  rate?: number;
  riskIds?: string[];
  label?: string;
}

export interface IncidentDetails {
  actions: string[];
  residualDelayMin?: number;
  recoveredMin?: number;
  removed?: EquipmentLine[];
  uncovered?: number;
}

const MAX_COMPRESSION = 0.3;

/**
 * Retard : décale les séquences à partir de `fromMin` puis rattrape en deux temps (07 §8) :
 * 1) shows, animations et pauses non critiques (jusqu'à −30 %) ; 2) compétition en poules / passages (jusqu'à −30 %).
 * Les phases finales (élimination directe) et les séquences critiques ne sont jamais compressées.
 */
function applyDelay(cfg: Config, incident: Incident): IncidentDetails {
  // Pas de valeur par défaut pour `minutes` : comportement identique au moteur d'origine (donnée invalide → NaN).
  const minutes = incident.minutes as number;
  const fromMin = incident.fromMin ?? 0;
  const stageType = Object.fromEntries((cfg.competition?.stages ?? []).map((st) => [st.id, st.type]));
  const seqs = [...(cfg.program ?? [])].sort((a, b) => a.start_min - b.start_min);
  const after = seqs.filter((s) => s.start_min >= fromMin);
  const soft = after.filter((s) => !s.critical && ['show', 'animation', 'pause'].includes(s.kind));
  const play = after.filter((s) => !s.critical && s.kind === 'competition' && ['round_robin', 'time_trial', 'swiss'].includes(stageType[s.stage_ref as string]));
  const cuts = new Map<ProgramItem, number>();
  let left = minutes;
  const actions: string[] = [];
  for (const group of [soft, play]) {
    const cap = group.reduce((t, x) => t + x.duration_min * MAX_COMPRESSION, 0);
    if (left <= 0 || cap <= 0) continue;
    const ratio = Math.min(1, left / cap);
    for (const x of group) {
      const cut = Math.round(x.duration_min * MAX_COMPRESSION * ratio);
      if (cut > 0) {
        cuts.set(x, cut);
        left -= cut;
        actions.push(`Réduire « ${x.label} » de ${cut} min`);
      }
    }
  }
  let shift = minutes;
  for (const s of after) {
    s.start_min += shift;
    const cut = cuts.get(s) ?? 0;
    if (cut) {
      s.duration_min -= cut;
      shift -= cut;
    }
  }
  const residual = Math.max(0, Math.round(shift));
  if (residual > 0) actions.push(`Retard résiduel de ${residual} min sur les phases finales : prévenir le public et les équipes`);
  return { actions, residualDelayMin: residual, recoveredMin: Math.round(minutes - residual) };
}

function applyDropout(cfg: Config, incident: Incident): IncidentDetails {
  const count = incident.count as number;
  // Les inscriptions encaissées ne sont pas remboursées (règlement) : seules les étapes de compétition changent.
  const actions: string[] = [];
  for (const st of cfg.competition?.stages ?? []) {
    if (st === cfg.competition!.stages[0] || st.type === 'round_robin') {
      const before = st.entrants;
      st.entrants = Math.max(2, st.entrants - count);
      actions.push(`Étape « ${st.label ?? st.id} » : ${before} → ${st.entrants} entrants (repêchage sur liste d'attente en priorité)`);
    }
  }
  return { actions };
}

function removeEquipment(cfg: Config, predicate: (e: EquipmentLine) => boolean, reason: string): IncidentDetails {
  const removed = (cfg.resources?.equipment ?? []).filter(predicate);
  cfg.resources!.equipment = (cfg.resources?.equipment ?? []).filter((e) => !predicate(e));
  return { actions: removed.map((e) => `${reason} : « ${e.item} » indisponible → mode dégradé`), removed };
}

function applyBudgetCut(cfg: Config, incident: Incident): IncidentDetails {
  const rate = incident.rate as number;
  const total = (cfg.budget?.expenses ?? []).reduce((s, e) => s + (e.basis === 'fixed' ? e.amount : 0), 0);
  let toCut = total * rate;
  const actions: string[] = [];
  // Number(undefined) = NaN, comme la soustraction de booléens non définis du moteur d'origine.
  const candidates = [...(cfg.budget?.expenses ?? [])]
    .filter((e) => e.basis === 'fixed')
    .sort((a, b) => Number(b.optional) - Number(a.optional) || (b.priority ?? 2) - (a.priority ?? 2) || b.amount - a.amount);
  for (const e of candidates) {
    if (toCut <= 0) break;
    if ((e.priority ?? 2) === 1 && !e.optional) continue; // jamais les indispensables
    actions.push(`Supprimer « ${e.label} » (${e.amount} €)`);
    toCut -= e.amount;
    cfg.budget!.expenses = cfg.budget!.expenses.filter((x: Expense) => x !== e);
  }
  return { actions, uncovered: Math.max(0, Math.round(toCut)) };
}

export interface IncidentResult {
  type: IncidentType;
  label: string;
  config: Config;
  actions: string[];
  details: IncidentDetails;
  impact: { financialResultDelta: number; competitionDurationDeltaMin: number };
  continuity: { risk: string; plan: string | undefined }[];
}

/** Applique un incident à une copie de la configuration et ré-simule. */
export function runIncident(config: Config, incident: Incident, scenario: ScenarioKey = 'central'): IncidentResult {
  const cfg = structuredClone(config);
  cfg.resources ??= { staff: [], equipment: [] };
  let res: IncidentDetails = { actions: [] };
  switch (incident.type) {
    case 'delay':
      res = applyDelay(cfg, incident);
      break;
    case 'dropout':
      res = applyDropout(cfg, incident);
      break;
    case 'supplier_absence':
      res = removeEquipment(cfg, (e) => e.source === incident.source, 'Prestataire absent');
      break;
    case 'it_failure':
      res = removeEquipment(cfg, (e) => (e.power_w ?? 0) > 0 && /écran|ecran|tablette|ordinateur|vidéoproj|videoproj|app|chrono|score/i.test(e.item), 'Panne informatique');
      break;
    case 'power_failure':
      res = removeEquipment(cfg, (e) => (e.power_w ?? 0) > 0 && !e.on_generator, 'Défaillance électrique');
      res.actions.push("Éclairage du bâtiment : vérifier l'éclairage de sécurité avec l'exploitant ; arrêt du jeu si l'éclairage sportif est coupé, évacuation guidée si nécessaire");
      break;
    case 'weather': {
      const fallback = (cfg.variants ?? []).find((v) => v.kind === 'secours');
      res = { actions: [fallback ? `Basculer sur la variante « ${fallback.label} »` : 'Aucune variante de secours définie : en créer une (kind = secours) avant validation'] };
      break;
    }
    case 'attendance_change': {
      const f = 1 + (incident.rate ?? 0);
      const att = cfg.audience?.attendance as Record<string, number> | undefined;
      for (const k of Object.keys(att ?? {})) att![k] = Math.round(att![k] * f);
      res = { actions: [(incident.rate ?? NaN) < 0 ? 'Réduire les ouvertures de buvette et de files ; concentrer le public autour du terrain central' : 'Ouvrir des files supplémentaires ; activer la jauge et la communication « complet »'] };
      break;
    }
    case 'budget_cut':
      res = applyBudgetCut(cfg, incident);
      break;
    default:
      throw new Error(`Incident inconnu : ${(incident as Incident).type}`);
  }
  const before = simulate(config, scenario).totals.result;
  const after = simulate(cfg, scenario).totals.result;
  const compBefore = simulateCompetition(config).totalWithMarginMin;
  const compAfter = simulateCompetition(cfg).totalWithMarginMin;
  const firstWord = (INCIDENT_TYPES[incident.type] ?? '').toLowerCase().split(' ')[0];
  const related = (config.risks ?? []).filter((r) => (incident.riskIds ?? []).includes(r.id) || r.description?.toLowerCase().includes(firstWord));
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
