/**
 * Pure data helpers for the spatial workspace: where each agent stands, which
 * station pairs carry real flows, terminal lines, explorer badges. Everything
 * derives from the SDK snapshot — nothing is invented.
 */
import {
  displaySummary, fmtCompact, fmtInt, modelLabel, type AgentDef, type AgentStatus, type Catalog, type DataNature, type FlowView, type GovEvent,
  type GovernorState,
} from '@sdk';
import type { LogLine } from '@ds';

/** Context window assumed for the 5.5 family (catalog hypothesis, shown as such). */
export const CONTEXT_WINDOW = 1_000_000;

export const STATUS_RANK: Record<AgentStatus, number> = {
  error: 9, waiting: 8, collaborating: 7, working: 6, researching: 6, validating: 6, paused: 3, idle: 2, offline: 1,
};

export function statusOf(state: GovernorState, id: string): AgentStatus {
  return state.agents[id]?.status ?? 'idle';
}

/** Worst/most significant status among a set of agents. */
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

/** Department an agent works for right now: its current task's department, else its home. */
export function placementDepartment(state: GovernorState, a: AgentDef): { dept: string | undefined; reason: 'task' | 'home' } {
  const rt = state.agents[a.id];
  const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
  if (task?.departmentId && (task.status === 'running' || task.status === 'paused')) return { dept: task.departmentId, reason: 'task' };
  return { dept: a.departmentIds[0], reason: 'home' };
}

export interface ContextInfo {
  tokens: number | null;
  ratio: number | null;
  nature: DataNature;
  model?: string;
  ts?: number;
}

/** Prompt size of the agent's last model call (input + cache read + cache write) vs the 1 M window. */
export function lastContext(events: readonly GovEvent[], agentId: string, now: number): ContextInfo {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.ts > now) continue;
    if (e.type !== 'llm.call' || e.actor?.id !== agentId) continue;
    const m = e.metrics;
    if (!m) return { tokens: null, ratio: null, nature: 'unavailable', model: e.model, ts: e.ts };
    const tokens = (m.inputTokens ?? 0) + (m.cacheReadTokens ?? 0) + (m.cacheWriteTokens ?? 0);
    return { tokens, ratio: tokens / CONTEXT_WINDOW, nature: e.nature === 'demo' ? 'demo' : e.nature === 'real' ? 'real' : e.nature, model: e.model, ts: e.ts };
  }
  return { tokens: null, ratio: null, nature: 'unavailable' };
}

export interface FlowPair {
  key: string;
  from: string;
  to: string;
  count: number;
  tokens: number;
  failed: number;
  last: number;
  llm: number;
  tools: number;
  data: number;
  nature: DataNature;
}

/** Aggregates real flows into directed station pairs. `where` maps an id (agent or node) to a primitive id. */
export function flowPairs(flows: FlowView[], where: (id: string) => string | undefined): FlowPair[] {
  const m = new Map<string, FlowPair>();
  for (const f of flows) {
    const a = where(f.from);
    const b = where(f.to);
    if (!a || !b || a === b) continue;
    const key = `${a}>${b}`;
    let p = m.get(key);
    if (!p) m.set(key, (p = { key, from: a, to: b, count: 0, tokens: 0, failed: 0, last: 0, llm: 0, tools: 0, data: 0, nature: f.nature }));
    p.count++;
    p.tokens += f.tokens ?? 0;
    if (f.status === 'failed') p.failed++;
    p.last = Math.max(p.last, f.ts);
    if (f.kind === 'requête modèle') p.llm++;
    else if (f.kind === 'appel outil') p.tools++;
    else p.data++;
    if (f.nature === 'real') p.nature = 'real';
  }
  return [...m.values()];
}

const short = (s: string, n = 64) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export interface Names {
  agent: (id?: string) => string;
  node: (id?: string) => string;
  dept: (id?: string) => string;
}

export function makeNames(catalog: Catalog): Names {
  const a = new Map(catalog.agents.map((x) => [x.id, x.name]));
  const n = new Map(catalog.nodes.map((x) => [x.id, x.label]));
  const d = new Map(catalog.departments.map((x) => [x.id, x.name]));
  return {
    agent: (id) => (id ? a.get(id) ?? n.get(id) ?? id : '—'),
    node: (id) => (id ? n.get(id) ?? a.get(id) ?? id : '—'),
    dept: (id) => (id ? d.get(id) ?? id : '—'),
  };
}

const TYPE_LABEL: Partial<Record<GovEvent['type'], string>> = {
  'task.created': 'tâche créée', 'task.started': 'tâche démarrée', 'task.completed': 'tâche terminée', 'task.failed': 'tâche en échec',
  'task.paused': 'tâche suspendue', 'task.resumed': 'tâche reprise', 'agent.state': 'état', 'decision.proposed': 'proposition', 'decision.resolved': 'arbitrage',
};

/** Human-readable operational line for one event. */
export function lineFor(e: GovEvent, names: Names, canViewConfidential: boolean, tasks: GovernorState['tasks']): LogLine {
  const who = names.agent(e.actor?.id ?? e.origin.id);
  const level: LogLine['level'] = e.status === 'failed' ? 'error' : e.status === 'succeeded' ? 'success' : e.type === 'agent.state' && e.attrs?.status === 'waiting' ? 'warn' : 'info';
  const summary = displaySummary(e, canViewConfidential);
  let text: string;
  switch (e.type) {
    case 'llm.call': {
      const m = e.metrics;
      const tok = m ? (m.inputTokens ?? 0) + (m.outputTokens ?? 0) + (m.cacheReadTokens ?? 0) + (m.cacheWriteTokens ?? 0) : 0;
      text = `${who} · llm.call · ${modelLabel(e.model)} · ${fmtCompact(tok)} tokens${m?.latencyMs ? ` · ${(m.latencyMs / 1000).toFixed(1).replace('.', ',')} s` : ''}${e.status === 'failed' ? ` · ${summary}` : ''}`;
      break;
    }
    case 'tool.call':
      text = `${who} · tool.call · ${String(e.attrs?.tool ?? 'outil')} → ${names.node(e.destination?.id)}${e.status === 'failed' ? ` · ${summary}` : ''}`;
      break;
    case 'task.created':
    case 'task.started':
    case 'task.completed':
    case 'task.failed':
    case 'task.paused':
    case 'task.resumed': {
      const t = e.taskId ? tasks[e.taskId] : undefined;
      text = `${who} · ${e.type} · ${short(t?.title ?? summary ?? '', 70)}`;
      break;
    }
    case 'agent.state':
      text = `${who} · ${TYPE_LABEL['agent.state']} → ${String(e.attrs?.status ?? '?')}${summary ? ` · ${summary}` : ''}`;
      break;
    case 'flow':
      text = `${names.node(e.origin.id)} → ${names.node(e.destination?.id)} · ${String(e.attrs?.kind ?? 'données')}`;
      break;
    default:
      text = `${e.type} · ${short(summary, 90)}`;
  }
  return { id: e.id, ts: e.ts, text, level };
}

/** Lines for the four terminal tabs, newest last, capped. */
export function terminalTabs(
  events: readonly GovEvent[],
  names: Names,
  canViewConfidential: boolean,
  tasks: GovernorState['tasks'],
  agentColor: (id: string) => string,
  agentFilter: string | null,
  cap = 160,
) {
  const terminal: LogLine[] = [];
  const all: LogLine[] = [];
  const agents: LogLine[] = [];
  const problems: LogLine[] = [];
  for (let i = events.length - 1; i >= 0 && (terminal.length < cap || all.length < cap || agents.length < cap || problems.length < cap); i--) {
    const e = events[i];
    const l = lineFor(e, names, canViewConfidential, tasks);
    if (all.length < cap) all.push({ ...l, tag: e.type, color: 'var(--c-ink-muted)', level: undefined, text: l.text });
    if (terminal.length < cap && (e.type === 'llm.call' || e.type === 'tool.call' || e.type.startsWith('task.'))) terminal.push(l);
    const actor = e.actor?.id;
    if (agents.length < cap && actor && (!agentFilter || actor === agentFilter) && (e.type === 'agent.state' || e.type.startsWith('task.') || e.type === 'llm.call' || e.type === 'tool.call')) {
      agents.push({ ...l, tag: names.agent(actor), color: agentColor(actor), text: l.text.replace(`${names.agent(actor)} · `, '') });
    }
    if (problems.length < cap && e.status === 'failed') problems.push({ ...l, level: 'error' });
  }
  const rev = (x: LogLine[]) => x.reverse();
  return { terminal: rev(terminal), all: rev(all), agents: rev(agents), problems: rev(problems) };
}

/** Explorer letter: M = activity in the last 10 min, I = no event for over an hour. */
export function activityLetter(lastTs: number | undefined, now: number): { letter: 'M' | 'I' | null; title: string } {
  if (!lastTs) return { letter: 'I', title: 'Inactif : aucun événement enregistré' };
  const d = now - lastTs;
  if (d <= 10 * 60_000) return { letter: 'M', title: `Modifié récemment : dernier événement il y a ${Math.max(1, Math.round(d / 60_000))} min` };
  if (d >= 60 * 60_000) return { letter: 'I', title: `Inactif : dernier événement il y a ${d >= 86_400_000 ? `${Math.round(d / 86_400_000)} j` : `${Math.round(d / 3_600_000)} h`}` };
  return { letter: null, title: '' };
}

/** Progress of a task from its declared steps (task.created remainingSteps) and the current remaining steps. */
export function taskProgress(events: readonly GovEvent[], taskId: string, remaining: number | undefined): number | null {
  if (remaining == null) return null;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.taskId === taskId && e.type === 'task.created') {
      const total = typeof e.attrs?.remainingSteps === 'number' ? e.attrs.remainingSteps : null;
      if (!total) return null;
      return Math.max(0, Math.min(1, (total - remaining) / total));
    }
  }
  return null;
}

export const slug = (s?: string) => (s ? s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'sans-projet');

export const fmtTokens = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',')} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : fmtInt(n));
