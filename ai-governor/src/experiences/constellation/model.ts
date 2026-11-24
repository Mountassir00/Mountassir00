/**
 * Data → graph. Every node comes from the catalog (or, for the small
 * satellites, from a real task of the period); every size, colour, error and
 * lit link comes from the event log. Nothing here is invented.
 */
import type {
  AgentStatus, Catalog, DataNature, FlowView, GovEvent, GovernorState, PastelSlot, Selection, TaskRuntime,
} from '@sdk';

export type NodeType = 'governor' | 'agent' | 'department' | 'model' | 'tool' | 'data' | 'task';
export type SizeBy = 'calls' | 'tokens';

export const TYPE_ORDER: NodeType[] = ['governor', 'agent', 'department', 'model', 'tool', 'data', 'task'];

export const TYPE_LABEL: Record<NodeType, string> = {
  governor: 'Gouverneur',
  agent: 'Agents et moteurs',
  department: 'Départements',
  model: 'Modèles et fournisseurs',
  tool: 'Outils et connecteurs',
  data: 'Données et files',
  task: 'Tâches de la période',
};

const KIND_LABEL: Record<string, string> = {
  agent: 'Agent IA',
  service: 'Service',
  model: 'Modèle',
  provider: 'Fournisseur',
  connector: 'Connecteur',
  mcp: 'Serveur MCP',
  skill: 'Skill',
  tool: 'Outil',
  database: 'Base de données',
  queue: 'File',
  process: 'Processus',
  user: 'Personne',
};

const AGENT_KIND_LABEL: Record<string, string> = { llm: 'Agent IA', script: 'Script déterministe', service: 'Service', human: 'Personne' };

export const TASK_STATUS_LABEL: Record<TaskRuntime['status'], string> = {
  pending: 'En file',
  running: 'En cours',
  paused: 'Suspendue',
  succeeded: 'Terminée',
  failed: 'Échouée',
  cancelled: 'Annulée',
};

export interface GNode {
  /** Unique key in the scene (tasks are prefixed). */
  key: string;
  /** Id used for the shared selection. */
  refId: string;
  selKind: Selection['kind'];
  type: NodeType;
  label: string;
  /** Short role / kind line for the tooltip. */
  sub: string;
  /** Region (sphere) / arm (burst) key. */
  group: string;
  tone?: PastelSlot;
  /** Hub this node hangs from (task → department, or agent when no department). */
  parent?: string;
  calls: number;
  tokens: number;
  failed: number;
  /** 0..1, log-normalised activity used for the size. */
  activity: number;
  nature: DataNature;
  status?: AgentStatus;
  taskStatus?: TaskRuntime['status'];
  error: boolean;
  warn: boolean;
  /** Why the node is red/amber, for the tooltip. */
  reason?: string;
  /** Set when the governor cannot observe this node. */
  unavailable?: string;
  /** Departments served (agents) / engines (departments): for the tooltip. */
  related?: string[];
}

export interface GLink {
  a: string;
  b: string;
  kind: 'catalog' | 'engine' | 'task';
}

export interface FlowAgg {
  key: string;
  from: string;
  to: string;
  count: number;
  failed: number;
  lastTs: number;
  lastFailed: boolean;
  tokens: number;
  kinds: string[];
  nature: DataNature;
}

export interface Graph {
  nodes: GNode[];
  byKey: Map<string, GNode>;
  links: GLink[];
  /** Department groups in catalog order (burst arms / sphere regions). */
  groups: string[];
  tasksShown: number;
  tasksTotal: number;
}

interface Acc {
  calls: number;
  tokens: number;
  failed: number;
  demo: number;
  real: number;
  other: DataNature | null;
}

const acc = (m: Map<string, Acc>, id: string | undefined): Acc | null => {
  if (!id) return null;
  let a = m.get(id);
  if (!a) {
    a = { calls: 0, tokens: 0, failed: 0, demo: 0, real: 0, other: null };
    m.set(id, a);
  }
  return a;
};

/** Calls and tokens per catalog id over the period (agent, department, model, provider, tool…). */
export function computeActivity(events: readonly GovEvent[]): Map<string, Acc> {
  const m = new Map<string, Acc>();
  const bump = (id: string | undefined, e: GovEvent, tokens: number) => {
    const a = acc(m, id);
    if (!a) return;
    a.calls++;
    a.tokens += tokens;
    if (e.status === 'failed') a.failed++;
    if (e.nature === 'demo') a.demo++;
    else if (e.nature === 'real') a.real++;
    else a.other = e.nature;
  };
  for (const e of events) {
    if (e.type === 'llm.call' || e.type === 'tool.call' || e.type === 'flow') {
      const tokens = e.type === 'llm.call' && e.metrics ? (e.metrics.inputTokens ?? 0) + (e.metrics.outputTokens ?? 0) + (e.metrics.cacheReadTokens ?? 0) : 0;
      const actor = e.type === 'flow' ? e.origin.id : e.actor?.id ?? e.origin.id;
      const ids = new Set([actor, e.destination?.id, e.department]);
      if (e.type === 'llm.call' && e.provider) ids.add(e.provider);
      for (const id of ids) bump(id, e, tokens);
    } else if (e.origin.kind === 'user' && (e.type.startsWith('task.') || e.type === 'decision.resolved' || e.type === 'config.changed')) {
      // Interventions of the person at the helm.
      bump(e.origin.id, e, 0);
    }
  }
  return m;
}

const natureOf = (a: Acc | undefined, hasDemo: boolean): DataNature =>
  !a ? (hasDemo ? 'demo' : 'real') : a.demo > 0 ? 'demo' : a.real > 0 ? 'real' : a.other ?? (hasDemo ? 'demo' : 'real');

export function aggregateFlows(flows: readonly FlowView[], known: (id: string) => boolean) {
  const pairs = new Map<string, FlowAgg>();
  let unmapped = 0;
  for (const f of flows) {
    if (!known(f.from) || !known(f.to) || f.from === f.to) {
      unmapped++;
      continue;
    }
    const key = `${f.from}>${f.to}`;
    let p = pairs.get(key);
    if (!p) {
      p = { key, from: f.from, to: f.to, count: 0, failed: 0, lastTs: 0, lastFailed: false, tokens: 0, kinds: [], nature: f.nature };
      pairs.set(key, p);
    }
    p.count++;
    p.tokens += f.tokens ?? 0;
    if (f.status === 'failed') p.failed++;
    if (f.ts >= p.lastTs) {
      p.lastTs = f.ts;
      p.lastFailed = f.status === 'failed';
    }
    if (!p.kinds.includes(f.kind)) p.kinds.push(f.kind);
    if (f.nature === 'demo') p.nature = 'demo';
  }
  return { pairs: [...pairs.values()], unmapped, total: flows.length };
}

function typeOfKind(kind: string, id: string): NodeType {
  if (id === 'governor') return 'governor';
  switch (kind) {
    case 'agent':
    case 'service':
    case 'user':
      return 'agent';
    case 'model':
    case 'provider':
      return 'model';
    case 'connector':
    case 'mcp':
    case 'skill':
    case 'tool':
      return 'tool';
    case 'department':
      return 'department';
    default:
      return 'data';
  }
}

const BUSY: AgentStatus[] = ['working', 'collaborating', 'researching', 'validating'];
export const isBusy = (s?: AgentStatus) => !!s && BUSY.includes(s);

export function buildGraph(input: {
  catalog: Catalog;
  state: GovernorState;
  activity: Map<string, Acc>;
  range: { from: number; to: number };
  hasDemo: boolean;
  sizeBy: SizeBy;
  showTasks: boolean;
  maxTasks: number;
}): Graph {
  const { catalog, state, activity, range, hasDemo, sizeBy } = input;
  const nodes: GNode[] = [];
  const byKey = new Map<string, GNode>();
  const add = (n: GNode) => {
    if (byKey.has(n.key)) return;
    byKey.set(n.key, n);
    nodes.push(n);
  };
  const agentDefs = new Map(catalog.agents.map((a) => [a.id, a]));
  const deptName = new Map(catalog.departments.map((d) => [d.id, d.name]));
  const groups: string[] = [];
  for (const d of catalog.departments) if (!groups.includes(d.group)) groups.push(d.group);

  const base = (id: string) => {
    const a = activity.get(id);
    return { calls: a?.calls ?? 0, tokens: a?.tokens ?? 0, failed: a?.failed ?? 0, nature: natureOf(a, hasDemo), activity: 0 };
  };

  // Agents, engines and the person at the helm.
  const addAgent = (id: string, kindFallback: string, labelFallback: string) => {
    const def = agentDefs.get(id);
    const rt = state.agents[id];
    const type: NodeType = id === 'governor' ? 'governor' : 'agent';
    const status: AgentStatus | undefined = def?.kind === 'human' ? undefined : rt?.status ?? 'idle';
    add({
      key: id,
      refId: id,
      selKind: def ? 'agent' : 'node',
      type,
      label: def?.name ?? labelFallback,
      sub: def ? `${AGENT_KIND_LABEL[def.kind] ?? def.kind} · ${def.role}` : KIND_LABEL[kindFallback] ?? kindFallback,
      group: type === 'governor' ? 'core' : 'agents',
      ...base(id),
      status,
      error: status === 'error',
      warn: false,
      reason: status === 'error' ? 'Agent en erreur' : undefined,
      related: def?.departmentIds.map((d) => deptName.get(d) ?? d),
    });
  };

  for (const n of catalog.nodes) {
    const type = typeOfKind(n.kind, n.id);
    if (type === 'governor' || type === 'agent') {
      addAgent(n.id, n.kind, n.label);
      continue;
    }
    const conn = state.connectors[n.id];
    const connErr = conn && (conn.status === 'disconnected' || conn.status === 'auth-required');
    const connWarn = conn?.status === 'degraded';
    const b = base(n.id);
    add({
      key: n.id,
      refId: n.id,
      selKind: 'node',
      type,
      label: n.label,
      sub: KIND_LABEL[n.kind] ?? n.kind,
      group: type === 'model' ? 'models' : type === 'tool' ? 'tools' : type === 'department' ? 'departments' : 'data',
      ...b,
      nature: n.visibility === 'none' ? 'unavailable' : b.nature,
      error: !!connErr,
      warn: !!connWarn,
      reason: connErr ? (conn.status === 'auth-required' ? 'Authentification requise' : 'Déconnecté') : connWarn ? 'Connecteur dégradé' : undefined,
      unavailable: n.visibility === 'none' ? n.note ?? 'Activité non observable par le gouverneur' : undefined,
    });
  }
  for (const a of catalog.agents) if (!byKey.has(a.id)) addAgent(a.id, a.kind, a.name);

  const incidents = Object.values(state.incidents).filter((i) => i.state === 'open');
  for (const d of catalog.departments) {
    const open = incidents.filter((i) => i.departmentId === d.id).length;
    const agentErr = d.engineIds.some((id) => state.agents[id]?.status === 'error');
    add({
      key: d.id,
      refId: d.id,
      selKind: 'department',
      type: 'department',
      label: d.name,
      sub: d.mission,
      group: d.group,
      tone: d.tone,
      ...base(d.id),
      error: open > 0 || agentErr,
      warn: false,
      reason: open > 0 ? `${open} incident${open > 1 ? 's' : ''} ouvert${open > 1 ? 's' : ''}` : agentErr ? 'Moteur en erreur' : undefined,
      related: d.engineIds.map((id) => agentDefs.get(id)?.name ?? id),
    });
  }

  // Real tasks of the period, as small satellites of their department.
  let tasksTotal = 0;
  let tasksShown = 0;
  const taskNodes: GNode[] = [];
  if (input.showTasks) {
    const inRange = Object.values(state.tasks).filter(
      (t) => (t.createdAt >= range.from && t.createdAt <= range.to) || t.status === 'running' || t.status === 'paused',
    );
    tasksTotal = inRange.length;
    inRange.sort((a, b) => b.createdAt - a.createdAt);
    const keep = inRange.slice(0, input.maxTasks);
    tasksShown = keep.length;
    for (const t of keep) {
      const parent = t.departmentId && byKey.has(t.departmentId) ? t.departmentId : t.agentId && byKey.has(t.agentId) ? t.agentId : undefined;
      if (!parent) continue;
      const p = byKey.get(parent)!;
      const failed = t.status === 'failed';
      taskNodes.push({
        key: `task:${t.id}`,
        refId: t.id,
        selKind: 'task',
        type: 'task',
        label: t.title,
        sub: `${TASK_STATUS_LABEL[t.status]}${t.agentId ? ` · ${agentDefs.get(t.agentId)?.name ?? t.agentId}` : ''}`,
        group: p.type === 'department' ? p.group : 'agents',
        tone: p.tone,
        parent,
        calls: t.llmCalls + t.toolCalls,
        tokens: t.tokensIn + t.tokensOut + t.cacheRead,
        failed: failed ? 1 : 0,
        activity: 0,
        nature: t.nature,
        taskStatus: t.status,
        error: failed,
        warn: false,
        reason: failed ? t.errors[t.errors.length - 1] ?? 'Tâche échouée' : undefined,
      });
    }
    for (const n of taskNodes) add(n);
  }

  // Size = log-normalised activity (separately for hubs and for task satellites).
  const metric = (n: GNode) => (sizeBy === 'tokens' ? n.tokens : n.calls);
  const hubs = nodes.filter((n) => n.type !== 'task' && n.type !== 'governor');
  const maxHub = Math.max(1, ...hubs.map(metric));
  const maxTask = Math.max(1, ...taskNodes.map(metric));
  for (const n of nodes) {
    const max = n.type === 'task' ? maxTask : maxHub;
    n.activity = Math.min(1, Math.log1p(metric(n)) / Math.log1p(max));
  }

  // Catalog relations: declared edges, department ↔ engine, task ↔ department.
  const links: GLink[] = [];
  const seen = new Set<string>();
  const link = (a: string, b: string, kind: GLink['kind']) => {
    if (a === b || !byKey.has(a) || !byKey.has(b)) return;
    const k = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(k)) return;
    seen.add(k);
    links.push({ a, b, kind });
  };
  for (const e of catalog.edges) link(e.from, e.to, 'catalog');
  for (const d of catalog.departments) for (const id of d.engineIds) link(d.id, id, 'engine');
  for (const t of taskNodes) link(t.parent!, t.key, 'task');

  return { nodes, byKey, links, groups, tasksShown, tasksTotal };
}
