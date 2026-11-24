// EVENT LAB — simulateur de compétition (event-lab/docs/07-algorithmes.md §4)
import type { Config, Stage, StageType } from './types';

export const DEFAULT_MARGIN = 0.15;

export interface StageStructure {
  matches: number;
  rounds: number;
  matchesPerRound: number[];
  slotsPerRound: number[];
  slots: number;
}

type StageInput = Pick<Stage, 'id' | 'type' | 'entrants'> & Partial<Stage>;

/** Structure d'une étape : créneaux par tour séquentiel. */
export function stageStructure(stage: StageInput): StageStructure {
  const n = stage.entrants;
  const p = Math.max(1, stage.parallel_units ?? 1);
  if (!Number.isInteger(n) || n < 1) throw new Error(`Étape ${stage.id} : entrants invalides`);
  let rounds: number[] = [];
  switch (stage.type) {
    case 'time_trial': {
      const passes = stage.runs_per_entrant ?? 1;
      rounds = [n * passes];
      break;
    }
    case 'round_robin': {
      const g = Math.max(1, stage.groups ?? 1);
      // Répartition équilibrée : certaines poules ont k, d'autres k-1 équipes
      const sizes = Array.from({ length: g }, (_, i) => Math.floor(n / g) + (i < n % g ? 1 : 0));
      const kMax = Math.max(...sizes);
      const nRounds = kMax % 2 === 0 ? kMax - 1 : kMax;
      rounds = Array.from({ length: nRounds }, () => sizes.reduce((s, k) => s + Math.floor(k / 2), 0));
      // Ajustement : total exact des matchs = Σ k(k-1)/2
      const total = sizes.reduce((s, k) => s + (k * (k - 1)) / 2, 0);
      const planned = rounds.reduce((s, m) => s + m, 0);
      if (planned !== total) rounds[rounds.length - 1] += total - planned;
      break;
    }
    case 'single_elimination': {
      let remaining = n;
      while (remaining > 1) {
        const matches = Math.floor(remaining / 2);
        rounds.push(matches);
        remaining = matches + (remaining % 2);
      }
      if (stage.third_place) rounds[rounds.length - 1] += 1;
      break;
    }
    case 'double_elimination': {
      const total = stage.grand_final_reset ? 2 * n - 1 : 2 * n - 2;
      const nRounds = 2 * Math.ceil(Math.log2(n));
      const per = Math.ceil(total / nRounds);
      let left = total;
      for (let i = 0; i < nRounds && left > 0; i++) {
        const m = Math.min(per, left);
        rounds.push(m);
        left -= m;
      }
      break;
    }
    case 'swiss': {
      const r = stage.rounds ?? Math.ceil(Math.log2(n));
      rounds = Array.from({ length: r }, () => Math.floor(n / 2));
      break;
    }
    case 'battle_royale':
    case 'custom': {
      // Paliers explicites : [{ slots }] ou durée fixe
      if (Array.isArray(stage.tiers)) rounds = stage.tiers.map((t) => t.slots * p);
      else rounds = [p];
      break;
    }
    default:
      throw new Error(`Type d'étape inconnu : ${stage.type as string}`);
  }
  const slotsPerRound = rounds.map((m) => Math.ceil(m / p));
  return { matches: rounds.reduce((s, m) => s + m, 0), rounds: rounds.length, matchesPerRound: rounds, slotsPerRound, slots: slotsPerRound.reduce((s, x) => s + x, 0) };
}

export interface StageDuration extends StageStructure {
  id: string;
  label: string;
  type: StageType;
  slotMin: number;
  netMin: number;
  withMarginMin: number;
  utilization: number;
}

export function stageDuration(stage: StageInput, margin = DEFAULT_MARGIN): StageDuration {
  const st = stageStructure(stage);
  const slot = (stage.slot_duration_min ?? 0) + (stage.changeover_min ?? 0);
  const net = st.slots * slot;
  const p = Math.max(1, stage.parallel_units ?? 1);
  const utilization = st.slots ? st.matches / (st.slots * p) : 0;
  return { id: stage.id, label: stage.label ?? stage.id, type: stage.type, ...st, slotMin: slot, netMin: net, withMarginMin: Math.round(net * (1 + margin)), utilization: Math.round(utilization * 100) / 100 };
}

export interface CompetitionResult {
  stages: StageDuration[];
  totalNetMin: number;
  totalWithMarginMin: number;
  margin: number;
}

export function simulateCompetition(config: Config, margin = DEFAULT_MARGIN): CompetitionResult {
  const stages = (config.competition?.stages ?? []).map((s) => stageDuration(s, margin));
  const net = stages.reduce((s, x) => s + x.netMin, 0);
  return { stages, totalNetMin: net, totalWithMarginMin: Math.round(net * (1 + margin)), margin };
}
