/**
 * Pure selectors over events/state shared by every experience.
 * Filters, time ranges, chart series and before/after comparisons live here,
 * not in a renderer, so all views agree on the numbers.
 */
import type { Catalog } from './catalog';
import type { DataNature, EventType, GovEvent } from './events/schema';
import type { GovernorState, TaskRuntime } from './projection';

export type PeriodPreset = 'live' | '1h' | '24h' | '7d' | '30d' | 'custom';

export interface Period {
  preset: PeriodPreset;
  /** Only for custom. */
  from?: number;
  to?: number;
}

export const PERIOD_MS: Record<Exclude<PeriodPreset, 'custom'>, number> = {
  live: 15 * 60_000,
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
};

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  live: 'En direct',
  '1h': '1 h',
  '24h': '24 h',
  '7d': '7 j',
  '30d': '30 j',
  custom: 'Personnalisée',
};

export function resolveRange(period: Period, now: number): { from: number; to: number } {
  if (period.preset === 'custom' && period.from != null && period.to != null) return { from: period.from, to: period.to };
  const span = PERIOD_MS[period.preset === 'custom' ? '24h' : period.preset];
  return { from: now - span, to: now };
}

export type EventCategory =
  | 'llm' | 'tools' | 'tasks' | 'governance' | 'security' | 'skills' | 'connectors' | 'optimization' | 'automation' | 'quality';

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  llm: 'Appels modèle',
  tools: 'Outils',
  tasks: 'Tâches',
  governance: 'Gouvernance',
  security: 'Sécurité',
  skills: 'Skills',
  connectors: 'Connecteurs',
  optimization: 'Optimisation',
  automation: 'Automatisations',
  quality: 'Qualité',
};

export function categoryOf(type: EventType): EventCategory {
  if (type === 'llm.call') return 'llm';
  if (type === 'tool.call' || type === 'flow') return 'tools';
  if (type.startsWith('task.') || type === 'agent.state') return 'tasks';
  if (type.startsWith('decision.') || type === 'config.changed' || type === 'recommendation' || type === 'update.detected') return 'governance';
  if (type === 'security.incident') return 'security';
  if (type.startsWith('skill.')) return 'skills';
  if (type === 'connector.status') return 'connectors';
  if (type === 'optimization.applied' || type === 'quota.updated') return 'optimization';
  if (type === 'automation.run') return 'automation';
  return 'quality';
}

export interface Filters {
  providers: string[];
  models: string[];
  projects: string[];
  departments: string[];
  agents: string[];
  categories: EventCategory[];
}

export const EMPTY_FILTERS: Filters = { providers: [], models: [], projects: [], departments: [], agents: [], categories: [] };

export function activeFilterCount(f: Filters): number {
  return f.providers.length + f.models.length + f.projects.length + f.departments.length + f.agents.length + f.categories.length;
}

export function matches(e: GovEvent, f: Filters): boolean {
  if (f.providers.length && !(e.provider && f.providers.includes(e.provider))) return false;
  if (f.models.length && !(e.model && f.models.includes(e.model))) return false;
  if (f.projects.length && !(e.project && f.projects.includes(e.project))) return false;
  if (f.departments.length && !(e.department && f.departments.includes(e.department))) return false;
  if (f.agents.length && !(e.actor && f.agents.includes(e.actor.id))) return false;
  if (f.categories.length && !f.categories.includes(categoryOf(e.type))) return false;
  return true;
}

export function filterEvents(events: readonly GovEvent[], f: Filters): GovEvent[] {
  if (!activeFilterCount(f)) return events as GovEvent[];
  return events.filter((e) => matches(e, f));
}

/** Natures present in a set of events — drives the "data mix" disclosure. */
export function natureMix(events: readonly GovEvent[]): Partial<Record<DataNature, number>> {
  const out: Partial<Record<DataNature, number>> = {};
  for (const e of events) out[e.nature] = (out[e.nature] ?? 0) + 1;
  return out;
}

export interface UsageTotals {
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  costMeasured: number;
  costEstimated: number;
  avoidedUsd: number;
  tokensSaved: number;
  llmCalls: number;
  toolCalls: number;
  tasksDone: number;
  tasksFailed: number;
  errors: number;
  qualityAvg: number | null;
  latencyAvgMs: number | null;
  optimizations: number;
  interventions: number;
  incidents: number;
}

export function sumUsage(events: readonly GovEvent[]): UsageTotals {
  const t: UsageTotals = {
    tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, costMeasured: 0, costEstimated: 0, avoidedUsd: 0,
    tokensSaved: 0, llmCalls: 0, toolCalls: 0, tasksDone: 0, tasksFailed: 0, errors: 0, qualityAvg: null, latencyAvgMs: null,
    optimizations: 0, interventions: 0, incidents: 0,
  };
  let qSum = 0;
  let qN = 0;
  let latSum = 0;
  let latN = 0;
  for (const e of events) {
    const m = e.metrics;
    switch (e.type) {
      case 'llm.call':
        t.llmCalls++;
        if (m) {
          t.tokensIn += m.inputTokens ?? 0;
          t.tokensOut += m.outputTokens ?? 0;
          t.cacheRead += m.cacheReadTokens ?? 0;
          t.cacheWrite += m.cacheWriteTokens ?? 0;
          t.costUsd += m.costUsd ?? 0;
          if (m.costNature === 'measured') t.costMeasured += m.costUsd ?? 0;
          else t.costEstimated += m.costUsd ?? 0;
          t.avoidedUsd += m.avoidedCostUsd ?? 0;
          if (m.latencyMs != null) {
            latSum += m.latencyMs;
            latN++;
          }
        }
        if (e.status === 'failed') t.errors++;
        break;
      case 'tool.call':
        t.toolCalls++;
        if (e.status === 'failed') t.errors++;
        break;
      case 'task.completed':
        t.tasksDone++;
        break;
      case 'task.failed':
        t.tasksFailed++;
        t.errors++;
        break;
      case 'optimization.applied':
        t.optimizations++;
        t.tokensSaved += m?.tokensSaved ?? 0;
        t.avoidedUsd += m?.avoidedCostUsd ?? 0;
        break;
      case 'quality.check':
        if (m?.qualityScore != null) {
          qSum += m.qualityScore;
          qN++;
        }
        break;
      case 'security.incident':
        if (e.attrs?.state !== 'resolved') t.incidents++;
        break;
      case 'task.paused':
      case 'task.resumed':
      case 'task.priority':
      case 'decision.resolved':
        if (e.origin.kind === 'user') t.interventions++;
        break;
    }
  }
  t.qualityAvg = qN ? qSum / qN : null;
  t.latencyAvgMs = latN ? latSum / latN : null;
  return t;
}

export interface Bucket {
  t: number;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  cacheWrite: number;
  costUsd: number;
  calls: number;
  errors: number;
  tasks: number;
  events: number;
}

export function pickBucketMs(span: number): number {
  const target = span / 48;
  const steps = [60_000, 5 * 60_000, 15 * 60_000, 30 * 60_000, 3_600_000, 3 * 3_600_000, 6 * 3_600_000, 12 * 3_600_000, 86_400_000];
  return steps.find((s) => s >= target) ?? 86_400_000;
}

export function bucketize(events: readonly GovEvent[], from: number, to: number, bucketMs = pickBucketMs(to - from)): Bucket[] {
  const start = Math.floor(from / bucketMs) * bucketMs;
  const n = Math.max(1, Math.ceil((to - start) / bucketMs));
  const out: Bucket[] = Array.from({ length: n }, (_, i) => ({
    t: start + i * bucketMs, tokensIn: 0, tokensOut: 0, cacheRead: 0, cacheWrite: 0, costUsd: 0, calls: 0, errors: 0, tasks: 0, events: 0,
  }));
  for (const e of events) {
    if (e.ts < from || e.ts > to) continue;
    const i = Math.min(n - 1, Math.floor((e.ts - start) / bucketMs));
    const b = out[i];
    b.events++;
    if (e.type === 'llm.call') {
      b.calls++;
      b.tokensIn += e.metrics?.inputTokens ?? 0;
      b.tokensOut += e.metrics?.outputTokens ?? 0;
      b.cacheRead += e.metrics?.cacheReadTokens ?? 0;
      b.cacheWrite += e.metrics?.cacheWriteTokens ?? 0;
      b.costUsd += e.metrics?.costUsd ?? 0;
    }
    if (e.status === 'failed') b.errors++;
    if (e.type === 'task.completed' || e.type === 'task.failed') b.tasks++;
  }
  return out;
}

export interface ModelRow {
  model: string;
  provider: string;
  calls: number;
  tokensIn: number;
  tokensOut: number;
  cacheRead: number;
  costUsd: number;
  errors: number;
  latencyAvgMs: number | null;
  cacheHitRate: number | null;
}

export function byModel(events: readonly GovEvent[]): ModelRow[] {
  const m = new Map<string, ModelRow & { _lat: number; _latN: number }>();
  for (const e of events) {
    if (e.type !== 'llm.call' || !e.model) continue;
    let r = m.get(e.model);
    if (!r) {
      r = { model: e.model, provider: e.provider ?? '—', calls: 0, tokensIn: 0, tokensOut: 0, cacheRead: 0, costUsd: 0, errors: 0, latencyAvgMs: null, cacheHitRate: null, _lat: 0, _latN: 0 };
      m.set(e.model, r);
    }
    r.calls++;
    r.tokensIn += e.metrics?.inputTokens ?? 0;
    r.tokensOut += e.metrics?.outputTokens ?? 0;
    r.cacheRead += e.metrics?.cacheReadTokens ?? 0;
    r.costUsd += e.metrics?.costUsd ?? 0;
    if (e.status === 'failed') r.errors++;
    if (e.metrics?.latencyMs != null) {
      r._lat += e.metrics.latencyMs;
      r._latN++;
    }
  }
  return [...m.values()]
    .map(({ _lat, _latN, ...r }) => ({
      ...r,
      latencyAvgMs: _latN ? _lat / _latN : null,
      cacheHitRate: r.tokensIn + r.cacheRead > 0 ? r.cacheRead / (r.tokensIn + r.cacheRead) : null,
    }))
    .sort((a, b) => b.costUsd - a.costUsd);
}

export interface FlowView {
  id: string;
  ts: number;
  from: string;
  to: string;
  kind: string;
  status: GovEvent['status'];
  nature: DataNature;
  summary?: string;
  confidentiality: GovEvent['confidentiality'];
  tokens?: number;
  latencyMs?: number;
}

/**
 * Real exchanges in a window: explicit `flow` events plus llm/tool calls
 * (agent → model, agent → tool/connector). Nothing is invented.
 */
export function recentFlows(events: readonly GovEvent[], t: number, windowMs: number): FlowView[] {
  const out: FlowView[] = [];
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.ts > t) continue;
    if (e.ts < t - windowMs) break;
    if (!e.destination) continue;
    if (e.type !== 'flow' && e.type !== 'llm.call' && e.type !== 'tool.call') continue;
    const from = e.type === 'flow' ? e.origin.id : e.actor?.id ?? e.origin.id;
    out.push({
      id: e.id,
      ts: e.ts,
      from,
      to: e.destination.id,
      kind: e.type === 'flow' ? String(e.attrs?.kind ?? 'données') : e.type === 'llm.call' ? 'requête modèle' : 'appel outil',
      status: e.status,
      nature: e.nature,
      summary: e.confidentiality === 'restricted' ? undefined : e.summary,
      confidentiality: e.confidentiality,
      tokens: e.metrics ? (e.metrics.inputTokens ?? 0) + (e.metrics.outputTokens ?? 0) + (e.metrics.cacheReadTokens ?? 0) : undefined,
      latencyMs: e.metrics?.latencyMs,
    });
  }
  return out;
}

export interface BeforeAfter {
  label: string;
  at: number;
  before: { tasks: number; tokensPerTask: number; costPerTask: number };
  after: { tasks: number; tokensPerTask: number; costPerTask: number };
  deltaTokensPct: number | null;
  deltaCostPct: number | null;
  sufficient: boolean;
  nature: DataNature;
}

/**
 * Compares per-task consumption over equal windows before/after an
 * optimisation. Returns `sufficient: false` when samples are too small to
 * conclude — the UI must then say "données insuffisantes", not show a delta.
 */
export function beforeAfter(
  tasks: readonly TaskRuntime[],
  at: number,
  windowMs: number,
  label: string,
  scope?: { departmentId?: string },
): BeforeAfter {
  const pick = (from: number, to: number) => {
    const list = tasks.filter(
      (t) => t.status === 'succeeded' && t.endedAt != null && t.endedAt >= from && t.endedAt < to && (!scope?.departmentId || t.departmentId === scope.departmentId),
    );
    const tok = list.reduce((s, t) => s + t.tokensIn + t.tokensOut + t.cacheWrite, 0);
    const cost = list.reduce((s, t) => s + t.costUsd, 0);
    return { tasks: list.length, tokensPerTask: list.length ? tok / list.length : 0, costPerTask: list.length ? cost / list.length : 0 };
  };
  const before = pick(at - windowMs, at);
  const after = pick(at, at + windowMs);
  const sufficient = before.tasks >= 8 && after.tasks >= 8;
  const pct = (a: number, b: number) => (a > 0 ? (b - a) / a : null);
  const natures = new Set(tasks.map((t) => t.nature));
  return {
    label,
    at,
    before,
    after,
    deltaTokensPct: sufficient ? pct(before.tokensPerTask, after.tokensPerTask) : null,
    deltaCostPct: sufficient ? pct(before.costPerTask, after.costPerTask) : null,
    sufficient,
    nature: natures.has('demo') ? 'demo' : natures.has('real') ? 'real' : 'estimated',
  };
}

export function departmentLoad(state: GovernorState, catalog: Catalog) {
  return catalog.departments.map((d) => {
    const agents = catalog.agents.filter((a) => a.departmentIds.includes(d.id));
    const runtimes = agents.map((a) => state.agents[a.id]).filter(Boolean);
    const running = Object.values(state.tasks).filter((t) => t.departmentId === d.id && (t.status === 'running' || t.status === 'paused'));
    return {
      dept: d,
      agents,
      active: runtimes.filter((r) => r.status !== 'idle' && r.status !== 'offline').length,
      errors: runtimes.filter((r) => r.status === 'error').length,
      running: running.length,
      pendingDecisions: Object.values(state.decisions).filter((x) => x.status === 'pending' && x.departmentId === d.id).length,
      openIncidents: Object.values(state.incidents).filter((x) => x.state === 'open' && x.departmentId === d.id).length,
    };
  });
}

export function eventDensity(events: readonly GovEvent[], from: number, to: number, buckets: number): number[] {
  const out = new Array(buckets).fill(0);
  const span = Math.max(1, to - from);
  for (const e of events) {
    if (e.ts < from || e.ts > to) continue;
    out[Math.min(buckets - 1, Math.floor(((e.ts - from) / span) * buckets))]++;
  }
  return out;
}
