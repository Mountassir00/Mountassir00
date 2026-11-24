/**
 * Kanban — pure data helpers. Everything is derived from the projected state
 * (tasks) and the event log (task steps). No value is invented: when a figure
 * is unknown the helpers return `undefined` and the UI says why.
 */
import type { AgentDef, DepartmentDef, Filters, GovEvent, TaskRuntime } from '@sdk';

export type Col = 'pending' | 'running' | 'paused' | 'succeeded' | 'failed';
export type Grouping = 'status' | 'department' | 'agent' | 'priority';
export type SortKey = 'recent' | 'priority' | 'cost';
export type Priority = TaskRuntime['priority'];

export const COLS: Array<{ id: Col; label: string; tone: string; empty: string }> = [
  { id: 'pending', label: 'En attente', tone: 'var(--st-waiting)', empty: 'Aucune tâche en file : le moteur démarre les tâches dès leur création.' },
  { id: 'running', label: 'En cours', tone: 'var(--st-working)', empty: 'Aucune tâche en cours d’exécution.' },
  { id: 'paused', label: 'Suspendues', tone: 'var(--st-paused)', empty: 'Aucune tâche suspendue. Glissez ici une tâche en cours pour la suspendre.' },
  { id: 'succeeded', label: 'Terminées', tone: 'var(--st-validating)', empty: 'Aucune tâche terminée sur la période.' },
  { id: 'failed', label: 'Échouées', tone: 'var(--st-error)', empty: 'Aucun échec sur la période.' },
];
export const COL_LABEL: Record<Col, string> = Object.fromEntries(COLS.map((c) => [c.id, c.label])) as Record<Col, string>;

export const STATUS_LABEL: Record<TaskRuntime['status'], string> = {
  pending: 'En attente', running: 'En cours', paused: 'Suspendue', succeeded: 'Terminée', failed: 'Échouée', cancelled: 'Annulée',
};

export const PRIORITIES: Priority[] = ['critical', 'high', 'normal', 'low'];
export const PRIORITY_LABEL: Record<Priority, string> = { critical: 'Critique', high: 'Haute', normal: 'Normale', low: 'Basse' };
const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, normal: 2, low: 3 };

export const GROUPING_LABEL: Record<Grouping, string> = { status: 'Statut', department: 'Département', agent: 'Agent', priority: 'Priorité' };
export const SORT_LABEL: Record<SortKey, string> = { recent: 'Plus récentes', priority: 'Priorité', cost: 'Coût estimé' };

export function colOf(t: TaskRuntime): Col {
  return t.status === 'cancelled' ? 'failed' : t.status;
}

/** "t-1842" → "T-1842"; other ids keep their tail so they stay recognisable. */
export function shortId(id: string): string {
  const m = /(\d{2,})$/.exec(id);
  if (m) return `T-${m[1]}`;
  const tail = id.replace(/[^a-z0-9]/gi, '').slice(-5).toUpperCase();
  return `T-${tail || '?'}`;
}

export function lastActivity(t: TaskRuntime): number {
  return t.endedAt ?? t.startedAt ?? t.createdAt;
}

export function sortTasks(list: TaskRuntime[], key: SortKey): TaskRuntime[] {
  const out = [...list];
  if (key === 'recent') out.sort((a, b) => lastActivity(b) - lastActivity(a));
  else if (key === 'priority') out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || lastActivity(b) - lastActivity(a));
  else out.sort((a, b) => b.costUsd - a.costUsd || lastActivity(b) - lastActivity(a));
  return out;
}

/** Tasks of the period: every active task plus those created or ended inside the range. */
export function tasksForBoard(all: Record<string, TaskRuntime>, range: { from: number; to: number }, f: Filters): TaskRuntime[] {
  const out: TaskRuntime[] = [];
  for (const t of Object.values(all)) {
    const active = t.status === 'pending' || t.status === 'running' || t.status === 'paused';
    if (!active && lastActivity(t) < range.from) continue;
    if (t.createdAt > range.to) continue;
    if (f.departments.length && !(t.departmentId && f.departments.includes(t.departmentId))) continue;
    if (f.agents.length && !(t.agentId && f.agents.includes(t.agentId))) continue;
    if (f.projects.length && !(t.project && f.projects.includes(t.project))) continue;
    if (f.providers.length && !(t.provider && f.providers.includes(t.provider))) continue;
    if (f.models.length && !(t.model && f.models.includes(t.model))) continue;
    out.push(t);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Per-task event index (incremental over the append-only log)          */
/* ------------------------------------------------------------------ */

export interface TaskIndex {
  src: readonly GovEvent[] | null;
  n: number;
  byTask: Map<string, GovEvent[]>;
}

export function newIndex(): TaskIndex {
  return { src: null, n: 0, byTask: new Map() };
}

/** Indexes events by taskId. Appends only the new tail when the log grew in place. */
export function updateIndex(ix: TaskIndex, events: readonly GovEvent[]): TaskIndex {
  if (ix.src !== events || events.length < ix.n) {
    ix.src = events;
    ix.n = 0;
    ix.byTask = new Map();
  }
  for (let i = ix.n; i < events.length; i++) {
    const e = events[i];
    if (!e.taskId) continue;
    let l = ix.byTask.get(e.taskId);
    if (!l) ix.byTask.set(e.taskId, (l = []));
    l.push(e);
  }
  ix.n = events.length;
  return ix;
}

export interface StepInfo {
  /** Total planned steps (from `remainingSteps` at creation), when known. */
  total?: number;
  /** Steps completed so far (total − smallest remainingSteps seen). */
  done?: number;
  /** Concrete events that make up the work: model and tool calls. */
  items: GovEvent[];
  events: GovEvent[];
}

export function stepsOf(t: TaskRuntime, evs: GovEvent[] | undefined, now: number): StepInfo {
  const events = (evs ?? []).filter((e) => e.ts <= now);
  let total: number | undefined;
  let remaining: number | undefined;
  const items: GovEvent[] = [];
  for (const e of events) {
    const r = e.attrs?.remainingSteps;
    if (e.type === 'task.created' && typeof r === 'number') total = r;
    if ((e.type === 'llm.call' || e.type === 'tool.call') && typeof r === 'number') remaining = remaining == null ? r : Math.min(remaining, r);
    if (e.type === 'llm.call' || e.type === 'tool.call') items.push(e);
  }
  if (total == null) return { items, events };
  if (t.status === 'succeeded') return { total, done: total, items, events };
  // `remainingSteps` is emitted after each completed step: total − remaining steps are done.
  const done = remaining == null ? 0 : Math.max(0, Math.min(total, total - remaining));
  return { total, done, items, events };
}

/* ------------------------------------------------------------------ */
/* Moves (drag & drop / keyboard) → commands                            */
/* ------------------------------------------------------------------ */

export type MovePlan =
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'invalid'; reason: string };

export function planMove(from: Col, to: Col): MovePlan {
  if (to === 'paused' && (from === 'running' || from === 'pending')) return { kind: 'pause' };
  if (to === 'running' && from === 'paused') return { kind: 'resume' };
  if (to === 'succeeded') return { kind: 'invalid', reason: 'Une tâche se termine d’elle-même quand le moteur a fini : elle ne peut pas être marquée « terminée » à la main.' };
  if (to === 'failed') return { kind: 'invalid', reason: 'Un échec est constaté par le moteur opérationnel, il ne se décide pas depuis le tableau.' };
  if (to === 'pending') return { kind: 'invalid', reason: 'Remettre une tâche en file n’existe pas. Pour l’arrêter temporairement, glissez-la dans « Suspendues ».' };
  if (to === 'running' && (from === 'succeeded' || from === 'failed'))
    return { kind: 'invalid', reason: 'Pour exécuter à nouveau une tâche finie, utilisez « Relancer » dans la fiche : c’est une nouvelle exécution, avec un coût estimé et une confirmation.' };
  if (to === 'running' && from === 'pending') return { kind: 'invalid', reason: 'Le démarrage est décidé par la file des tâches, pas depuis le tableau.' };
  if (to === 'paused') return { kind: 'invalid', reason: 'Seule une tâche en attente ou en cours peut être suspendue.' };
  return { kind: 'invalid', reason: 'Ce déplacement ne correspond à aucune commande disponible.' };
}

/** Hint shown on a column while a card is dragged over the board. */
export function dropHint(from: Col, to: Col): { ok: 'yes' | 'click' | 'no'; text: string } | null {
  if (from === to) return null;
  const p = planMove(from, to);
  if (p.kind === 'pause') return { ok: 'yes', text: 'Déposer pour suspendre' };
  if (p.kind === 'resume') return { ok: 'click', text: 'Reprise : clic requis' };
  return { ok: 'no', text: 'Transition impossible' };
}

/* ------------------------------------------------------------------ */
/* Swimlanes                                                            */
/* ------------------------------------------------------------------ */

export interface Lane {
  id: string;
  label: string;
  tone?: string;
  hue?: number;
  tasks: TaskRuntime[];
}

export function lanesOf(tasks: TaskRuntime[], g: Grouping, depts: Map<string, DepartmentDef>, agents: Map<string, AgentDef>): Lane[] {
  if (g === 'status') return [{ id: 'all', label: 'Toutes', tasks }];
  const m = new Map<string, Lane>();
  for (const t of tasks) {
    let id: string;
    let label: string;
    let tone: string | undefined;
    let hue: number | undefined;
    if (g === 'department') {
      id = t.departmentId ?? '—';
      const d = depts.get(id);
      label = d?.name ?? 'Sans département';
      tone = d ? `var(--${d.tone})` : undefined;
    } else if (g === 'agent') {
      id = t.agentId ?? '—';
      const a = agents.get(id);
      label = a?.name ?? (t.agentId ? t.agentId : 'Non assignée');
      hue = a?.avatar.hue;
    } else {
      id = t.priority;
      label = `Priorité ${PRIORITY_LABEL[t.priority].toLowerCase()}`;
    }
    let lane = m.get(id);
    if (!lane) m.set(id, (lane = { id, label, tone, hue, tasks: [] }));
    lane.tasks.push(t);
  }
  const lanes = [...m.values()];
  if (g === 'priority') lanes.sort((a, b) => PRIORITY_RANK[a.id as Priority] - PRIORITY_RANK[b.id as Priority]);
  else lanes.sort((a, b) => activeCount(b.tasks) - activeCount(a.tasks) || b.tasks.length - a.tasks.length || a.label.localeCompare(b.label, 'fr'));
  return lanes;
}

function activeCount(ts: TaskRuntime[]) {
  let n = 0;
  for (const t of ts) if (t.status === 'running' || t.status === 'paused' || t.status === 'pending') n++;
  return n;
}

export function avatarBg(hue: number | undefined) {
  return hue == null ? 'var(--c-ink-muted)' : `hsl(${hue} 58% 40%)`;
}

export function initialOf(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase();
}
