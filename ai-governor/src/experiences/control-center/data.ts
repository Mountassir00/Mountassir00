/**
 * Derived figures for the Control Center. Pure functions over the SDK
 * selectors: no invented values — when a figure cannot be computed it is
 * returned as null and the UI says "Indisponible" with the reason.
 */
import { sumUsage, type DataNature, type GovEvent, type UsageTotals } from '@sdk';

export type Kind = 'measured' | 'estimated' | 'unavailable';

export interface PeriodFigures {
  u: UsageTotals;
  processed: number;
  cost: number;
  cacheShare: number | null;
  successRate: number | null;
  errorRate: number | null;
  costPerTask: number | null;
  calls: number;
}

export function figures(events: readonly GovEvent[]): PeriodFigures {
  const u = sumUsage(events);
  const finished = u.tasksDone + u.tasksFailed;
  const calls = u.llmCalls + u.toolCalls;
  const cost = u.costEstimated + u.costMeasured;
  return {
    u,
    processed: u.tokensIn + u.tokensOut + u.cacheRead + u.cacheWrite,
    cost,
    cacheShare: u.tokensIn + u.cacheRead > 0 ? u.cacheRead / (u.tokensIn + u.cacheRead) : null,
    successRate: finished > 0 ? u.tasksDone / finished : null,
    errorRate: calls > 0 ? u.errors / calls : null,
    costPerTask: u.tasksDone > 0 && cost > 0 ? cost / u.tasksDone : null,
    calls,
  };
}

/** Relative change vs. the previous equal window; null when there is no comparable base. */
export function delta(cur: number | null, prev: number | null): number | null {
  if (cur == null || prev == null || !Number.isFinite(cur) || !Number.isFinite(prev) || prev <= 0) return null;
  return (cur - prev) / prev;
}

export function natureOf(kind: Kind, onlyDemo: boolean): DataNature {
  if (kind === 'unavailable') return 'unavailable';
  if (onlyDemo) return 'demo';
  return kind === 'measured' ? 'real' : 'estimated';
}

/** Bucket size giving roughly `count` capsules over the span. */
export function bucketFor(span: number, count: number): number {
  const target = span / Math.max(4, count);
  const steps = [60_000, 5 * 60_000, 10 * 60_000, 15 * 60_000, 30 * 60_000, 3_600_000, 2 * 3_600_000, 3 * 3_600_000, 6 * 3_600_000, 12 * 3_600_000, 86_400_000, 2 * 86_400_000];
  return steps.find((s) => s >= target) ?? 2 * 86_400_000;
}

export const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return n * p;
};

/* ---------- goals (targets belong to the user) ---------- */

export type GoalId = 'cache' | 'costPerTask' | 'quality' | 'errors';

export interface GoalDef {
  id: GoalId;
  title: string;
  /** 'min' = reach at least the target; 'max' = stay at or below it. */
  direction: 'min' | 'max';
  unit: 'pct' | 'usd';
  suggested: number;
  step: number;
  min: number;
  max: number;
}

export const GOALS: GoalDef[] = [
  { id: 'cache', title: 'Taux de cache', direction: 'min', unit: 'pct', suggested: 0.6, step: 0.05, min: 0.05, max: 0.99 },
  { id: 'costPerTask', title: 'Coût par tâche', direction: 'max', unit: 'usd', suggested: 0.05, step: 0.01, min: 0.001, max: 10 },
  { id: 'quality', title: 'Qualité des résultats', direction: 'min', unit: 'pct', suggested: 0.85, step: 0.01, min: 0.5, max: 1 },
  { id: 'errors', title: 'Taux d’erreur', direction: 'max', unit: 'pct', suggested: 0.02, step: 0.005, min: 0.001, max: 0.5 },
];

export type GoalTargets = Partial<Record<GoalId, number>>;

export function goalCurrent(id: GoalId, f: PeriodFigures): number | null {
  switch (id) {
    case 'cache':
      return f.cacheShare;
    case 'costPerTask':
      return f.costPerTask;
    case 'quality':
      return f.u.qualityAvg;
    case 'errors':
      return f.errorRate;
  }
}

/** Share of the goal reached, 0..1 (1 = met). */
export function goalProgress(def: GoalDef, current: number | null, target: number): number | null {
  if (current == null) return null;
  if (def.direction === 'min') return Math.max(0, Math.min(1, current / target));
  if (current <= target) return 1;
  return Math.max(0, Math.min(1, target / current));
}
