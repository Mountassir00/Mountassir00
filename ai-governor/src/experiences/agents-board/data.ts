/**
 * Rows of the agents board — pure derivations from the SDK snapshot.
 * Nothing is invented: throughput and cost come from `llm.call` metrics,
 * progress from the steps announced by the task itself, status from the
 * projected `state.agents[id]`. Unknown values stay null ("Indisponible").
 */
import type { AgentDef, AgentKind, AgentStatus, DataNature, DepartmentDef, GovEvent, GovernorSnapshot, TaskRuntime } from '@sdk';

export const ACTIVE: ReadonlySet<AgentStatus> = new Set(['working', 'collaborating', 'researching', 'validating']);
export const WAITING: ReadonlySet<AgentStatus> = new Set(['waiting', 'paused']);

export type StatusGroup = 'all' | 'active' | 'waiting' | 'error' | 'idle';
export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = { all: 'Tous', active: 'Actifs', waiting: 'En attente', error: 'En erreur', idle: 'Disponibles' };
export const KIND_LABEL: Record<AgentKind, string> = { llm: 'Agent IA', script: 'Script', service: 'Service', human: 'Humain' };

export function groupOf(s: AgentStatus | null): Exclude<StatusGroup, 'all'> {
  if (!s) return 'idle';
  if (ACTIVE.has(s)) return 'active';
  if (WAITING.has(s)) return 'waiting';
  if (s === 'error') return 'error';
  return 'idle';
}

/** Sort order of statuses: problems first, then work in progress. */
export const STATUS_RANK: Record<AgentStatus, number> = {
  error: 0, waiting: 1, paused: 2, working: 3, collaborating: 4, researching: 5, validating: 6, idle: 7, offline: 8,
};

export interface AgentRow {
  id: string;
  name: string;
  role: string;
  kind: AgentKind;
  def?: AgentDef;
  departments: DepartmentDef[];
  status: AgentStatus | null;
  statusSince?: number;
  task?: TaskRuntime;
  progress: { done: number; total: number } | null;
  /** Tokens per minute over the throughput window, and per-minute series. */
  tpm: number;
  spark: number[];
  costToday: number;
  errors: number;
  lastTs: number | null;
  model?: string;
  natureTokens: DataNature;
  natureCost: DataNature;
}

export function natureOfEvents(list: readonly GovEvent[], fallback: DataNature): DataNature {
  let real = false;
  for (const e of list) {
    if (e.nature === 'demo') return 'demo';
    if (e.nature === 'real') real = true;
  }
  return real ? 'real' : fallback;
}

export function costNature(list: readonly GovEvent[]): DataNature {
  let measured = false;
  let any = false;
  for (const e of list) {
    if (e.type !== 'llm.call') continue;
    if (e.nature === 'demo') return 'demo';
    any = true;
    if (e.metrics?.costNature === 'measured') measured = true;
  }
  if (!any) return 'estimated';
  return measured ? 'real' : 'estimated';
}

export const tokensOf = (e: GovEvent) =>
  (e.metrics?.inputTokens ?? 0) + (e.metrics?.outputTokens ?? 0) + (e.metrics?.cacheReadTokens ?? 0) + (e.metrics?.cacheWriteTokens ?? 0);

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Steps announced at task creation (`attrs.remainingSteps`) for the given task ids. */
export function announcedSteps(all: readonly GovEvent[], now: number, ids: Set<string>): Map<string, number> {
  const out = new Map<string, number>();
  if (!ids.size) return out;
  const floor = now - 12 * 3_600_000;
  for (let i = all.length - 1; i >= 0 && out.size < ids.size; i--) {
    const e = all[i];
    if (e.ts > now) continue;
    if (e.ts < floor) break;
    if (e.type === 'task.created' && e.taskId && ids.has(e.taskId) && typeof e.attrs?.remainingSteps === 'number') out.set(e.taskId, e.attrs.remainingSteps);
  }
  return out;
}

export interface BoardData {
  rows: AgentRow[];
  windowMin: number;
  totalTpm: number;
  tokensNature: DataNature;
  costNature: DataNature;
  runningTasks: number;
}

export function buildBoard(g: GovernorSnapshot, windowMin: number, showHumans: boolean): BoardData {
  const now = g.now;
  const W = windowMin * 60_000;
  const win = g.windowEvents(now - W, now);
  const today = g.windowEvents(startOfDay(now), now);
  const range = g.rangeEvents();
  const state = g.state;

  const spark = new Map<string, number[]>();
  const tok = new Map<string, number>();
  for (const e of win) {
    if (e.type !== 'llm.call' || !e.actor) continue;
    const id = e.actor.id;
    const n = tokensOf(e);
    tok.set(id, (tok.get(id) ?? 0) + n);
    let s = spark.get(id);
    if (!s) spark.set(id, (s = new Array(windowMin).fill(0)));
    const i = Math.min(windowMin - 1, Math.max(0, Math.floor((e.ts - (now - W)) / 60_000)));
    s[i] += n;
  }
  const cost = new Map<string, number>();
  for (const e of today) if (e.type === 'llm.call' && e.actor) cost.set(e.actor.id, (cost.get(e.actor.id) ?? 0) + (e.metrics?.costUsd ?? 0));
  const errs = new Map<string, number>();
  let lastUser: number | null = null;
  for (const e of range) {
    if (e.status === 'failed' && e.actor) errs.set(e.actor.id, (errs.get(e.actor.id) ?? 0) + 1);
    if (e.origin.kind === 'user') lastUser = e.ts;
  }

  const deptById = new Map(g.catalog.departments.map((d) => [d.id, d]));
  const ids = new Set<string>(g.catalog.agents.filter((a) => showHumans || a.kind !== 'human').map((a) => a.id));
  for (const id of Object.keys(state.agents)) ids.add(id);
  const current = new Set<string>();
  for (const id of ids) {
    const t = state.agents[id]?.currentTaskId;
    if (t) current.add(t);
  }
  const steps = announcedSteps(g.allEvents(), now, current);
  const tokNature = natureOfEvents(win, 'real');
  const cNature = costNature(today);

  const rows: AgentRow[] = [];
  for (const id of ids) {
    const def = g.catalog.agents.find((a) => a.id === id);
    const rt = state.agents[id];
    const kind: AgentKind = def?.kind ?? (rt ? 'service' : 'llm');
    const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
    let progress: AgentRow['progress'] = null;
    if (task) {
      const total = steps.get(task.id);
      if (total && task.remainingSteps != null) progress = { total, done: Math.max(0, Math.min(total, total - task.remainingSteps)) };
    }
    rows.push({
      id,
      name: def?.name ?? id,
      role: def?.role ?? 'Agent observé (hors catalogue)',
      kind,
      def,
      departments: (def?.departmentIds ?? []).map((d) => deptById.get(d)).filter((d): d is DepartmentDef => !!d),
      status: rt?.status ?? null,
      statusSince: rt?.statusSince,
      task,
      progress,
      tpm: (tok.get(id) ?? 0) / windowMin,
      spark: spark.get(id) ?? new Array(windowMin).fill(0),
      costToday: cost.get(id) ?? 0,
      errors: errs.get(id) ?? 0,
      lastTs: rt?.lastEventTs ?? (kind === 'human' ? lastUser : null),
      model: rt?.model ?? def?.model,
      natureTokens: rt?.nature === 'demo' ? 'demo' : tokNature,
      natureCost: rt?.nature === 'demo' ? 'demo' : cNature,
    });
  }
  const running = Object.values(state.tasks).filter((t) => t.status === 'running' || t.status === 'paused').length;
  return {
    rows,
    windowMin,
    totalTpm: [...tok.values()].reduce((s, n) => s + n, 0) / windowMin,
    tokensNature: tokNature,
    costNature: cNature,
    runningTasks: running,
  };
}

export type SortKey = 'name' | 'status' | 'progress' | 'tpm' | 'cost' | 'errors' | 'last';
export const SORT_LABEL: Record<SortKey, string> = {
  name: 'Nom', status: 'Statut', progress: 'Progression', tpm: 'Débit de tokens', cost: 'Coût du jour', errors: 'Erreurs', last: 'Dernière activité',
};

export function sortRows(rows: AgentRow[], key: SortKey, dir: 1 | -1): AgentRow[] {
  const v = (r: AgentRow): number | string => {
    switch (key) {
      case 'name':
        return r.name.toLocaleLowerCase('fr');
      case 'status':
        return r.status ? STATUS_RANK[r.status] : 99;
      case 'progress':
        return r.progress ? r.progress.done / r.progress.total : -1;
      case 'tpm':
        return r.tpm;
      case 'cost':
        return r.costToday;
      case 'errors':
        return r.errors;
      case 'last':
        return r.lastTs ?? 0;
    }
  };
  return [...rows].sort((a, b) => {
    const x = v(a);
    const y = v(b);
    const c = typeof x === 'string' && typeof y === 'string' ? x.localeCompare(y, 'fr') : (x as number) - (y as number);
    return c !== 0 ? c * dir : a.name.localeCompare(b.name, 'fr');
  });
}
