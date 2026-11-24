/**
 * Pure data helpers of the 3D office. Everything derives from the SDK
 * snapshot: where each agent stands (its task's department, the lounge when
 * it is idle, else its home), which stations exchange real flows, the
 * consumption shown on object cards. Nothing is invented.
 */
import type { AgentDef, AgentStatus, Catalog, DataNature, FlowView, GovernorState } from '@sdk';

export const STATUS_RANK: Record<AgentStatus, number> = {
  error: 9, waiting: 8, collaborating: 7, working: 6, researching: 6, validating: 6, paused: 3, idle: 2, offline: 1,
};

export const statusOf = (state: GovernorState, id: string): AgentStatus => state.agents[id]?.status ?? 'idle';

export function aggregateStatus(state: GovernorState, ids: string[]): AgentStatus {
  let best: AgentStatus = 'idle';
  let seen = false;
  for (const id of ids) {
    const r = state.agents[id];
    if (!r) continue;
    if (!seen || STATUS_RANK[r.status] > STATUS_RANK[best]) best = r.status;
    seen = true;
  }
  return seen ? best : 'idle';
}

export type PlacementReason = 'task' | 'lounge' | 'home';

/**
 * Where an LLM agent stands: the department of its running / paused task;
 * the lounge when it is idle (available) and the layout has one; else its home.
 */
export function placement(state: GovernorState, a: AgentDef, hasLounge: boolean): { dept: string | undefined; reason: PlacementReason } {
  const rt = state.agents[a.id];
  const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
  if (task?.departmentId && (task.status === 'running' || task.status === 'paused')) return { dept: task.departmentId, reason: 'task' };
  if (hasLounge && (rt?.status ?? 'idle') === 'idle') return { dept: undefined, reason: 'lounge' };
  return { dept: a.departmentIds[0], reason: 'home' };
}

export interface FlowPair {
  key: string;
  from: string;
  to: string;
  count: number;
  failed: number;
  llm: number;
  tools: number;
  data: number;
}

/** Aggregates real flows into directed station pairs. `where` maps an agent / node id to a primitive id. */
export function flowPairs(flows: FlowView[], where: (id: string) => string | undefined): FlowPair[] {
  const m = new Map<string, FlowPair>();
  for (const f of flows) {
    const a = where(f.from);
    const b = where(f.to);
    if (!a || !b || a === b) continue;
    const key = `${a}>${b}`;
    let p = m.get(key);
    if (!p) m.set(key, (p = { key, from: a, to: b, count: 0, failed: 0, llm: 0, tools: 0, data: 0 }));
    p.count++;
    if (f.status === 'failed') p.failed++;
    if (f.kind === 'requête modèle') p.llm++;
    else if (f.kind === 'appel outil') p.tools++;
    else p.data++;
  }
  return [...m.values()];
}

export interface Usage {
  tokens: number;
  costUsd: number;
  calls: number;
  nature: DataNature;
}

/** Consumption of a department: sum of its tasks (state.tasks). */
export function departmentUsage(state: GovernorState, deptId: string, hasDemo: boolean): Usage {
  let tokens = 0;
  let cost = 0;
  let calls = 0;
  let real = false;
  for (const t of Object.values(state.tasks)) {
    if (t.departmentId !== deptId) continue;
    tokens += t.tokensIn + t.tokensOut + t.cacheRead + t.cacheWrite;
    cost += t.costUsd;
    calls += t.llmCalls;
    if (t.nature === 'real') real = true;
  }
  return { tokens, costUsd: cost, calls, nature: real ? 'estimated' : hasDemo ? 'demo' : 'estimated' };
}

export function agentUsage(state: GovernorState, id: string, hasDemo: boolean): Usage | null {
  const rt = state.agents[id];
  if (!rt) return null;
  return { tokens: rt.tokensIn + rt.tokensOut + rt.cacheRead + rt.cacheWrite, costUsd: rt.costUsd, calls: rt.llmCalls, nature: rt.nature === 'demo' || (hasDemo && rt.nature !== 'real') ? 'demo' : 'estimated' };
}

export const KIND_LABEL: Record<AgentDef['kind'], string> = { llm: 'Agent IA', script: 'Script déterministe', service: 'Service partagé', human: 'Humain' };

/* ------------------------------------------------------------------ */
/* Board data                                                           */
/* ------------------------------------------------------------------ */

export interface KanbanData {
  columns: Array<{ title: string; count: number; cards: Array<{ title: string; tone: string; agent: string }> }>;
  nature: string;
}

export function kanbanData(state: GovernorState, catalog: Catalog, now: number): KanbanData {
  const tone = new Map(catalog.departments.map((d) => [d.id, d.tone]));
  const agentName = new Map(catalog.agents.map((a) => [a.id, a.name]));
  const tasks = Object.values(state.tasks);
  const col = (title: string, list: typeof tasks) => ({
    title,
    count: list.length,
    cards: [...list]
      .sort((a, b) => (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt))
      .slice(0, 3)
      .map((t) => ({ title: t.title, tone: tone.get(t.departmentId ?? '') ?? 'p2', agent: agentName.get(t.agentId ?? '') ?? '' })),
  });
  return {
    columns: [
      col('À faire', tasks.filter((t) => t.status === 'pending')),
      col('En cours', tasks.filter((t) => t.status === 'running')),
      col('En pause', tasks.filter((t) => t.status === 'paused')),
      col('Terminé · 1 h', tasks.filter((t) => (t.status === 'succeeded' || t.status === 'failed') && (t.endedAt ?? 0) >= now - 3_600_000)),
    ],
    nature: tasks.some((t) => t.nature === 'real') ? 'mesurées' : 'démo',
  };
}

export interface AuditData {
  pending: Array<{ title: string; risk: string }>;
  pendingCount: number;
  recent: string[];
}

export function auditData(state: GovernorState): AuditData {
  const pending = Object.values(state.decisions)
    .filter((d) => d.status === 'pending')
    .sort((a, b) => b.proposedAt - a.proposedAt);
  const recent = Object.values(state.tasks)
    .filter((t) => (t.departmentId === 'instructions' || t.departmentId === 'quality') && t.endedAt)
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
    .slice(0, 3)
    .map((t) => t.title);
  return { pending: pending.slice(0, 3).map((d) => ({ title: d.title, risk: d.risk })), pendingCount: pending.length, recent };
}
