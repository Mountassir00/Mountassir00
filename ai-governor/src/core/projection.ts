/**
 * Event-sourced projection: GovernorState = fold(events).
 *
 * Because every view reads a projection of the same event log, the Replay
 * mode is just "project at time t": it never re-runs an agent nor repeats an
 * operation, and it is automatically synchronised across all experiences.
 */
import type { AgentStatus, DataNature, GovEvent } from './events/schema';

export type TaskStatus = 'pending' | 'running' | 'paused' | 'succeeded' | 'failed' | 'cancelled';
export type Priority = 'low' | 'normal' | 'high' | 'critical';

export interface Usage {
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  llmCalls: number;
  toolCalls: number;
}

const emptyUsage = (): Usage => ({ tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, llmCalls: 0, toolCalls: 0 });

export interface TaskRuntime extends Usage {
  id: string;
  title: string;
  agentId?: string;
  departmentId?: string;
  project?: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  provider?: string;
  model?: string;
  effort?: string;
  tools: Record<string, number>;
  skills: Record<string, number>;
  errors: string[];
  resultRef?: string;
  dependsOn: string[];
  remainingSteps?: number;
  requiresApproval?: string;
  nature: DataNature;
  lastSummary?: string;
}

export interface AgentRuntime extends Usage {
  id: string;
  status: AgentStatus;
  statusSince: number;
  currentTaskId?: string;
  collaboratingWith?: string;
  lastEventTs: number;
  provider?: string;
  model?: string;
  effort?: string;
  errors: number;
  tasksDone: number;
  tools: Record<string, number>;
  skills: Record<string, number>;
  nature: DataNature;
}

export type Verdict = 'go' | 'nogo' | 'test';

export interface Decision {
  id: string;
  title: string;
  rationale: string;
  impact: string;
  costDeltaUsd?: number;
  risk: 'low' | 'medium' | 'high';
  reversibility: 'reversible' | 'partial' | 'irreversible';
  durable: boolean;
  departmentId?: string;
  proposedBy?: string;
  status: 'pending' | Verdict;
  proposedAt: number;
  resolvedAt?: number;
  nature: DataNature;
}

export interface Incident {
  id: string;
  ts: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
  state: 'open' | 'resolved';
  departmentId?: string;
  nature: DataNature;
}

export interface SkillState {
  id: string;
  name: string;
  status: 'active' | 'disabled';
  version: string;
  installedAt: number;
  updatedAt: number;
  improvements: number;
  uses: number;
  nature: DataNature;
}

export interface ConnectorState {
  id: string;
  name: string;
  status: 'connected' | 'degraded' | 'disconnected' | 'auth-required';
  since: number;
  calls: number;
  nature: DataNature;
}

export interface FeedItem {
  id: string;
  ts: number;
  type: GovEvent['type'];
  summary: string;
  nature: DataNature;
  departmentId?: string;
  agentId?: string;
  tokensSaved?: number;
  avoidedCostUsd?: number;
  attrs?: GovEvent['attrs'];
}

export interface Totals extends Usage {
  tokensSaved: number;
  costMeasuredUsd: number;
  costEstimatedUsd: number;
  avoidedCostUsd: number;
  tasksDone: number;
  tasksFailed: number;
  errors: number;
  interventions: number;
  optimizations: number;
  qualitySum: number;
  qualityCount: number;
}

export interface QuotaState {
  provider: string;
  usedPct: number;
  ts: number;
  nature: DataNature;
}

export interface GovernorState {
  asOf: number;
  eventCount: number;
  agents: Record<string, AgentRuntime>;
  tasks: Record<string, TaskRuntime>;
  decisions: Record<string, Decision>;
  incidents: Record<string, Incident>;
  skills: Record<string, SkillState>;
  connectors: Record<string, ConnectorState>;
  quotas: Record<string, QuotaState>;
  feed: {
    optimizations: FeedItem[];
    updates: FeedItem[];
    recommendations: FeedItem[];
    automations: FeedItem[];
    changes: FeedItem[];
    interventions: FeedItem[];
    security: FeedItem[];
  };
  totals: Totals;
  natures: Partial<Record<DataNature, number>>;
}

const FEED_CAP = 250;

export function emptyState(): GovernorState {
  return {
    asOf: 0,
    eventCount: 0,
    agents: {},
    tasks: {},
    decisions: {},
    incidents: {},
    skills: {},
    connectors: {},
    quotas: {},
    feed: { optimizations: [], updates: [], recommendations: [], automations: [], changes: [], interventions: [], security: [] },
    totals: {
      ...emptyUsage(),
      tokensSaved: 0,
      costMeasuredUsd: 0,
      costEstimatedUsd: 0,
      avoidedCostUsd: 0,
      tasksDone: 0,
      tasksFailed: 0,
      errors: 0,
      interventions: 0,
      optimizations: 0,
      qualitySum: 0,
      qualityCount: 0,
    },
    natures: {},
  };
}

const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v));
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

function pushFeed(list: FeedItem[], item: FeedItem) {
  list.push(item);
  if (list.length > FEED_CAP) list.splice(0, list.length - FEED_CAP);
}

function feedItem(e: GovEvent): FeedItem {
  return {
    id: e.id,
    ts: e.ts,
    type: e.type,
    summary: e.summary ?? e.type,
    nature: e.nature,
    departmentId: e.department,
    agentId: e.actor?.kind === 'agent' ? e.actor.id : undefined,
    tokensSaved: e.metrics?.tokensSaved,
    avoidedCostUsd: e.metrics?.avoidedCostUsd,
    attrs: e.attrs,
  };
}

function agentOf(s: GovernorState, e: GovEvent): AgentRuntime | undefined {
  const ref = e.actor && (e.actor.kind === 'agent' || e.actor.kind === 'service') ? e.actor : undefined;
  if (!ref) return undefined;
  let a = s.agents[ref.id];
  if (!a) {
    a = s.agents[ref.id] = {
      id: ref.id,
      status: 'idle',
      statusSince: e.ts,
      lastEventTs: e.ts,
      errors: 0,
      tasksDone: 0,
      tools: {},
      skills: {},
      nature: e.nature,
      ...emptyUsage(),
    };
  }
  a.lastEventTs = e.ts;
  return a;
}

function setStatus(a: AgentRuntime, status: AgentStatus, ts: number) {
  if (a.status !== status) {
    a.status = status;
    a.statusSince = ts;
  }
  if (status !== 'collaborating') a.collaboratingWith = undefined;
}

function taskOf(s: GovernorState, e: GovEvent): TaskRuntime | undefined {
  if (!e.taskId) return undefined;
  let t = s.tasks[e.taskId];
  if (!t) {
    t = s.tasks[e.taskId] = {
      id: e.taskId,
      title: str(e.attrs?.title, e.summary ?? e.taskId),
      agentId: e.actor?.id,
      departmentId: e.department,
      project: e.project,
      status: 'pending',
      priority: 'normal',
      createdAt: e.ts,
      tools: {},
      skills: {},
      errors: [],
      dependsOn: [],
      nature: e.nature,
      ...emptyUsage(),
    };
  }
  return t;
}

function addUsage(target: Usage, e: GovEvent) {
  const m = e.metrics;
  if (!m) return;
  target.tokensIn += m.inputTokens ?? 0;
  target.tokensOut += m.outputTokens ?? 0;
  target.cacheRead += m.cacheReadTokens ?? 0;
  target.cacheWrite += m.cacheWriteTokens ?? 0;
  target.costUsd += m.costUsd ?? 0;
}

/** Applies one event to the state (mutates `s` for speed; callers own the instance). */
export function applyEvent(s: GovernorState, e: GovEvent): void {
  s.asOf = Math.max(s.asOf, e.ts);
  s.eventCount++;
  s.natures[e.nature] = (s.natures[e.nature] ?? 0) + 1;
  const T = s.totals;
  const attrs = e.attrs ?? {};
  const byUser = e.origin.kind === 'user';

  switch (e.type) {
    case 'task.created': {
      const t = taskOf(s, e)!;
      t.title = str(attrs.title, t.title);
      t.priority = (str(attrs.priority, t.priority) as Priority) || 'normal';
      t.dependsOn = str(attrs.dependsOn).split(',').filter(Boolean);
      t.remainingSteps = num(attrs.remainingSteps);
      t.requiresApproval = attrs.requiresApproval ? str(attrs.requiresApproval) : undefined;
      t.agentId = e.actor?.id ?? t.agentId;
      t.departmentId = e.department ?? t.departmentId;
      break;
    }
    case 'task.started': {
      const t = taskOf(s, e)!;
      t.status = 'running';
      t.startedAt = e.ts;
      t.agentId = e.actor?.id ?? t.agentId;
      t.provider = e.provider ?? t.provider;
      t.model = e.model ?? t.model;
      t.effort = e.effort ?? t.effort;
      const a = agentOf(s, e);
      if (a) {
        a.currentTaskId = t.id;
        setStatus(a, (str(attrs.agentStatus) as AgentStatus) || 'working', e.ts);
      }
      break;
    }
    case 'task.completed':
    case 'task.failed': {
      const t = taskOf(s, e)!;
      const ok = e.type === 'task.completed';
      t.status = ok ? 'succeeded' : 'failed';
      t.endedAt = e.ts;
      t.resultRef = e.resultRef ?? t.resultRef;
      t.remainingSteps = 0;
      if (!ok) {
        t.errors.push(e.summary ?? 'Échec');
        T.tasksFailed++;
        T.errors++;
      } else T.tasksDone++;
      const a = agentOf(s, e);
      if (a) {
        if (ok) a.tasksDone++;
        else a.errors++;
        if (a.currentTaskId === t.id) {
          a.currentTaskId = undefined;
          setStatus(a, ok ? 'idle' : 'error', e.ts);
        }
      }
      break;
    }
    case 'task.paused':
    case 'task.resumed': {
      const t = taskOf(s, e)!;
      t.status = e.type === 'task.paused' ? 'paused' : 'running';
      const a = t.agentId ? s.agents[t.agentId] : undefined;
      if (a && a.currentTaskId === t.id) setStatus(a, e.type === 'task.paused' ? 'paused' : 'working', e.ts);
      if (byUser) {
        T.interventions++;
        pushFeed(s.feed.interventions, feedItem(e));
      }
      break;
    }
    case 'task.priority': {
      const t = taskOf(s, e)!;
      t.priority = (str(attrs.priority, t.priority) as Priority) || t.priority;
      if (byUser) {
        T.interventions++;
        pushFeed(s.feed.interventions, feedItem(e));
      }
      break;
    }
    case 'agent.state': {
      const a = agentOf(s, e);
      if (a) {
        setStatus(a, (str(attrs.status) as AgentStatus) || 'idle', e.ts);
        if (attrs.with) a.collaboratingWith = str(attrs.with);
        if (attrs.taskId) a.currentTaskId = str(attrs.taskId) || undefined;
      }
      break;
    }
    case 'llm.call': {
      const a = agentOf(s, e);
      const t = taskOf(s, e);
      for (const u of [a, t, T]) if (u) addUsage(u, e);
      for (const u of [a, t, T]) if (u) u.llmCalls++;
      if (e.metrics?.costUsd) {
        if (e.metrics.costNature === 'measured') T.costMeasuredUsd += e.metrics.costUsd;
        else T.costEstimatedUsd += e.metrics.costUsd;
      }
      if (e.metrics?.avoidedCostUsd) T.avoidedCostUsd += e.metrics.avoidedCostUsd;
      if (a) {
        a.model = e.model ?? a.model;
        a.provider = e.provider ?? a.provider;
        a.effort = e.effort ?? a.effort;
      }
      if (t) {
        t.model = e.model ?? t.model;
        t.provider = e.provider ?? t.provider;
        t.effort = e.effort ?? t.effort;
        if (typeof attrs.remainingSteps === 'number') t.remainingSteps = attrs.remainingSteps;
        t.lastSummary = e.summary ?? t.lastSummary;
      }
      if (e.status === 'failed') {
        T.errors++;
        if (a) a.errors++;
        if (t) t.errors.push(e.summary ?? 'Appel modèle en échec');
      }
      break;
    }
    case 'tool.call': {
      const a = agentOf(s, e);
      const t = taskOf(s, e);
      const tool = str(attrs.tool, e.destination?.id ?? 'outil');
      const skill = attrs.skill ? str(attrs.skill) : undefined;
      for (const u of [a, t]) {
        if (!u) continue;
        u.toolCalls++;
        u.tools[tool] = (u.tools[tool] ?? 0) + 1;
        if (skill) u.skills[skill] = (u.skills[skill] ?? 0) + 1;
      }
      T.toolCalls++;
      if (skill && s.skills[skill]) s.skills[skill].uses++;
      const conn = e.destination && (e.destination.kind === 'connector' || e.destination.kind === 'mcp') ? s.connectors[e.destination.id] : undefined;
      if (conn) conn.calls++;
      if (e.status === 'failed') {
        T.errors++;
        if (a) a.errors++;
        if (t) t.errors.push(e.summary ?? `${tool} en échec`);
      }
      break;
    }
    case 'skill.installed':
    case 'skill.updated':
    case 'skill.disabled': {
      const id = str(attrs.skill, e.destination?.id ?? e.id);
      const prev = s.skills[id];
      const sk: SkillState = prev ?? {
        id,
        name: str(attrs.name, id),
        status: 'active',
        version: str(attrs.version, '1.0.0'),
        installedAt: e.ts,
        updatedAt: e.ts,
        improvements: 0,
        uses: 0,
        nature: e.nature,
      };
      sk.updatedAt = e.ts;
      if (attrs.version) sk.version = str(attrs.version);
      if (e.type === 'skill.updated') sk.improvements++;
      sk.status = e.type === 'skill.disabled' ? 'disabled' : 'active';
      s.skills[id] = sk;
      pushFeed(s.feed.changes, feedItem(e));
      break;
    }
    case 'connector.status': {
      const id = e.destination?.id ?? str(attrs.connector, e.id);
      const prev = s.connectors[id];
      const status = (str(attrs.status, 'connected') as ConnectorState['status']) || 'connected';
      s.connectors[id] = {
        id,
        name: str(attrs.name, prev?.name ?? id),
        status,
        since: prev && prev.status === status ? prev.since : e.ts,
        calls: prev?.calls ?? 0,
        nature: e.nature,
      };
      break;
    }
    case 'optimization.applied': {
      T.optimizations++;
      T.tokensSaved += e.metrics?.tokensSaved ?? 0;
      T.avoidedCostUsd += e.metrics?.avoidedCostUsd ?? 0;
      pushFeed(s.feed.optimizations, feedItem(e));
      break;
    }
    case 'decision.proposed': {
      const id = str(attrs.decisionId, e.id);
      s.decisions[id] = {
        id,
        title: str(attrs.title, e.summary ?? id),
        rationale: str(attrs.rationale),
        impact: str(attrs.impact),
        costDeltaUsd: num(attrs.costDeltaUsd),
        risk: (str(attrs.risk, 'low') as Decision['risk']) || 'low',
        reversibility: (str(attrs.reversibility, 'reversible') as Decision['reversibility']) || 'reversible',
        durable: attrs.durable === true,
        departmentId: e.department,
        proposedBy: e.actor?.id,
        status: 'pending',
        proposedAt: e.ts,
        nature: e.nature,
      };
      break;
    }
    case 'decision.resolved': {
      const id = str(attrs.decisionId, e.id);
      const d = s.decisions[id];
      if (d) {
        d.status = (str(attrs.verdict, 'nogo') as Verdict) || 'nogo';
        d.resolvedAt = e.ts;
      }
      if (byUser) {
        T.interventions++;
        pushFeed(s.feed.interventions, feedItem(e));
      }
      break;
    }
    case 'security.incident': {
      const id = str(attrs.incidentId, e.id);
      const prev = s.incidents[id];
      s.incidents[id] = {
        id,
        ts: prev?.ts ?? e.ts,
        severity: (str(attrs.severity, prev?.severity ?? 'low') as Incident['severity']) || 'low',
        summary: e.summary ?? prev?.summary ?? 'Incident',
        state: (str(attrs.state, 'open') as Incident['state']) || 'open',
        departmentId: e.department ?? prev?.departmentId,
        nature: e.nature,
      };
      pushFeed(s.feed.security, feedItem(e));
      break;
    }
    case 'update.detected':
      pushFeed(s.feed.updates, feedItem(e));
      break;
    case 'recommendation':
      pushFeed(s.feed.recommendations, feedItem(e));
      break;
    case 'config.changed':
      pushFeed(s.feed.changes, feedItem(e));
      break;
    case 'automation.run':
      pushFeed(s.feed.automations, feedItem(e));
      if (e.status === 'failed') T.errors++;
      break;
    case 'quality.check': {
      const q = e.metrics?.qualityScore;
      if (typeof q === 'number') {
        T.qualitySum += q;
        T.qualityCount++;
      }
      break;
    }
    case 'quota.updated': {
      const provider = e.provider ?? str(attrs.provider, 'inconnu');
      s.quotas[provider] = { provider, usedPct: e.metrics?.quotaUsedPct ?? 0, ts: e.ts, nature: e.nature };
      break;
    }
    case 'flow':
      // Flows are read through time-window selectors, not accumulated.
      break;
  }
}

export function project(events: readonly GovEvent[], untilTs = Infinity): GovernorState {
  const s = emptyState();
  for (const e of events) {
    if (e.ts > untilTs) break;
    applyEvent(s, e);
  }
  if (untilTs !== Infinity) s.asOf = untilTs;
  return s;
}

export function cloneState(s: GovernorState): GovernorState {
  return structuredClone(s);
}
