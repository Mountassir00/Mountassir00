/**
 * Morning brief — one page per day, computed locally from the event log.
 * Planned items are inferred from recurring `automation.run` events and are
 * always labelled 'planned' (never presented as something that happened).
 */
import { bucketize, sumUsage, type Bucket, type DataNature, type GovEvent, type GovernorSnapshot, type UsageTotals } from '@sdk';

export const DAY = 86_400_000;

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
/** Local midnight `offset` days before the day containing `now` (DST-safe). */
export function dayStartAt(now: number, offset: number) {
  const d = new Date(startOfDay(now));
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

export interface Win {
  kind: 'task' | 'optimization';
  id: string;
  ts: number;
  title: string;
  agentId?: string;
  deptId?: string;
  costUsd: number;
  avoidedUsd: number;
  tokensSaved: number;
  tokens: number;
  priority?: string;
  milestone?: boolean;
  nature: DataNature;
}

export interface Planned {
  id: string;
  title: string;
  at: number;
  /** Minutes after midnight of the inferred schedule. */
  minute: number;
  seenDays: number;
  lastStatus?: GovEvent['status'];
  ranToday?: { ts: number; ok: boolean };
  /** Next inferred occurrence after the page's day (today's page only). */
  next?: number;
  /** Usual time passed on this page's day without any observed run. */
  missed: boolean;
}

export interface Alert {
  id: string;
  ts: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  kind: 'incident' | 'task' | 'automation' | 'connector';
  taskId?: string;
  open: boolean;
  nature: DataNature;
  confidential?: boolean;
}

export interface BriefDay {
  from: number;
  to: number;
  isToday: boolean;
  usage: UsageTotals;
  prev: UsageTotals;
  prevLabel: string;
  cost: number;
  prevCost: number;
  cacheShare: number | null;
  tokens: number;
  hourly: Bucket[];
  tasks: Win[];
  optimizations: Win[];
  planned: Planned[];
  alerts: Alert[];
  nature: DataNature;
  costNature: DataNature;
  events: number;
}

function natureOf(list: readonly GovEvent[]): DataNature {
  let real = false;
  for (const e of list) {
    if (e.nature === 'demo') return 'demo';
    if (e.nature === 'real') real = true;
  }
  return real ? 'real' : 'estimated';
}

export function buildDay(g: GovernorSnapshot, offset: number, compare: 'day' | 'week'): BriefDay {
  const now = g.now;
  const from = dayStartAt(now, offset);
  const end = dayStartAt(now, offset - 1);
  const isToday = offset === 0;
  const to = Math.min(end, now);
  const events = g.windowEvents(from, to);
  const usage = sumUsage(events);
  const back = compare === 'week' ? 7 : 1;
  const pFrom = dayStartAt(now, offset + back);
  const pTo = isToday ? pFrom + (to - from) : dayStartAt(now, offset + back - 1);
  const prev = sumUsage(g.windowEvents(pFrom, pTo));
  const prevLabel = compare === 'week' ? (isToday ? 'à la même heure il y a 7 jours' : 'le même jour la semaine précédente') : isToday ? 'à la même heure hier' : 'la veille';

  // Per-task cost, tokens and cache savings measured on this day's model calls.
  const perTask = new Map<string, { cost: number; avoided: number; tokens: number }>();
  let measured = false;
  for (const e of events) {
    if (e.type !== 'llm.call' || !e.taskId) continue;
    const m = e.metrics;
    if (!m) continue;
    if (m.costNature === 'measured') measured = true;
    const t = perTask.get(e.taskId) ?? { cost: 0, avoided: 0, tokens: 0 };
    t.cost += m.costUsd ?? 0;
    t.avoided += m.avoidedCostUsd ?? 0;
    t.tokens += (m.inputTokens ?? 0) + (m.outputTokens ?? 0) + (m.cacheReadTokens ?? 0) + (m.cacheWriteTokens ?? 0);
    perTask.set(e.taskId, t);
  }

  const tasks: Win[] = [];
  const optimizations: Win[] = [];
  const alerts: Alert[] = [];
  for (const e of events) {
    if (e.type === 'task.completed' && e.taskId) {
      const t = perTask.get(e.taskId);
      const rt = g.state.tasks[e.taskId];
      tasks.push({
        kind: 'task', id: e.taskId, ts: e.ts, title: rt?.title ?? e.summary ?? e.taskId, agentId: e.actor?.id, deptId: e.department,
        costUsd: t?.cost ?? 0, avoidedUsd: t?.avoided ?? 0, tokensSaved: 0, tokens: t?.tokens ?? 0, priority: rt?.priority, nature: e.nature,
      });
    } else if (e.type === 'optimization.applied') {
      optimizations.push({
        kind: 'optimization', id: e.id, ts: e.ts, title: e.summary ?? 'Optimisation', agentId: e.actor?.id, deptId: e.department, costUsd: 0,
        avoidedUsd: e.metrics?.avoidedCostUsd ?? 0, tokensSaved: e.metrics?.tokensSaved ?? 0, tokens: 0, milestone: !!e.attrs?.milestone, nature: e.nature,
      });
    } else if (e.type === 'task.failed') {
      alerts.push({ id: e.id, ts: e.ts, severity: 'medium', title: `${g.state.tasks[e.taskId ?? '']?.title ?? 'Tâche'} — ${e.summary ?? 'échec'}`, kind: 'task', taskId: e.taskId, open: false, nature: e.nature });
    } else if (e.type === 'automation.run' && e.status === 'failed') {
      alerts.push({ id: e.id, ts: e.ts, severity: 'medium', title: `Automatisation en échec : ${e.summary ?? 'exécution'}`, kind: 'automation', open: false, nature: e.nature });
    }
  }
  // Rank: priority first, then the work's size; savings: milestones then avoided cost.
  const prio = (w: Win) => (w.priority === 'critical' ? 3 : w.priority === 'high' ? 2 : 1);
  tasks.sort((a, b) => prio(b) - prio(a) || b.tokens + b.avoidedUsd * 1e6 - (a.tokens + a.avoidedUsd * 1e6) || b.ts - a.ts);
  optimizations.sort((a, b) => Number(b.milestone) - Number(a.milestone) || b.avoidedUsd - a.avoidedUsd || b.tokensSaved - a.tokensSaved);

  // Incidents: open ones today (state), or those raised that day for a past page.
  for (const inc of Object.values(g.state.incidents)) {
    const sameDay = inc.ts >= from && inc.ts < end;
    if ((isToday && inc.state === 'open') || sameDay) {
      alerts.push({ id: inc.id, ts: inc.ts, severity: inc.severity, title: inc.summary, kind: 'incident', open: inc.state === 'open', nature: inc.nature, confidential: true });
    }
  }
  if (isToday) {
    for (const c of Object.values(g.state.connectors)) {
      if (c.status === 'connected') continue;
      alerts.push({ id: `conn-${c.id}`, ts: c.since, severity: c.status === 'disconnected' ? 'high' : 'medium', title: `${c.name} : ${c.status === 'degraded' ? 'connecteur dégradé' : c.status === 'auth-required' ? 'authentification requise' : 'déconnecté'}`, kind: 'connector', open: true, nature: c.nature });
    }
  }
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  alerts.sort((a, b) => Number(b.open) - Number(a.open) || sevRank[a.severity] - sevRank[b.severity] || b.ts - a.ts);

  const planned = inferPlanned(g.windowEvents(from - 14 * DAY, Math.min(end, now)), from, end, now);
  const cost = usage.costEstimated + usage.costMeasured;
  return {
    from, to, isToday, usage, prev, prevLabel, cost, prevCost: prev.costEstimated + prev.costMeasured,
    cacheShare: usage.tokensIn + usage.cacheRead > 0 ? usage.cacheRead / (usage.tokensIn + usage.cacheRead) : null,
    tokens: usage.tokensIn + usage.tokensOut + usage.cacheRead + usage.cacheWrite,
    hourly: bucketize(events, from, end - 1, 3_600_000),
    tasks, optimizations, planned, alerts,
    nature: natureOf(events),
    costNature: natureOf(events) === 'demo' ? 'demo' : measured ? 'real' : 'estimated',
    events: events.length,
  };
}

/** Daily automations: same summary seen on ≥ 3 distinct days in the last 14 days. */
function inferPlanned(events: readonly GovEvent[], from: number, end: number, now: number): Planned[] {
  const by = new Map<string, { minutes: number[]; days: Set<number>; last?: GovEvent; today?: GovEvent }>();
  for (const e of events) {
    if (e.type !== 'automation.run') continue;
    const key = e.summary ?? 'Automatisation';
    let r = by.get(key);
    if (!r) by.set(key, (r = { minutes: [], days: new Set() }));
    const d = new Date(e.ts);
    r.minutes.push(d.getHours() * 60 + d.getMinutes());
    r.days.add(startOfDay(e.ts));
    if (e.ts < from) r.last = e;
    if (e.ts >= from && e.ts < end) r.today = e;
  }
  const out: Planned[] = [];
  for (const [title, r] of by) {
    if (r.days.size < 3) continue;
    const sorted = [...r.minutes].sort((a, b) => a - b);
    const minute = sorted[Math.floor(sorted.length / 2)];
    const at = new Date(from);
    at.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    const ts = at.getTime();
    const isToday = end > now;
    let next: number | undefined;
    if (isToday && (r.today || ts <= now)) {
      const n = new Date(ts);
      n.setDate(n.getDate() + 1);
      next = n.getTime();
    }
    const missed = !r.today && (isToday ? ts < now - 15 * 60_000 : true);
    out.push({ id: title, title, at: ts, minute, seenDays: r.days.size, lastStatus: (r.today ?? r.last)?.status, ranToday: r.today ? { ts: r.today.ts, ok: r.today.status !== 'failed' } : undefined, next, missed });
  }
  return out.sort((a, b) => a.at - b.at);
}

export function delta(cur: number, prev: number): number | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev <= 0) return null;
  return (cur - prev) / prev;
}
