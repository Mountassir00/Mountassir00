/**
 * Where each agent is, derived ONLY from the projected state:
 *  - LLM agents (robots): `idle` → lounge (an honest picture of rest, nothing
 *    else); `collaborating` → meeting room, grouped by task; any other status →
 *    their post in the room of their current task's department (running or
 *    paused task), else their home department. No event at all → home post,
 *    shown as "aucun événement".
 *  - scripts (consoles) and services (drones) never move: home room.
 *  - humans: the executive seat of their home department.
 */
import type { AgentDef, AgentStatus, Catalog, GovernorState, TaskRuntime } from '@sdk';
import type { Building, Space } from './plan';

export type Reason = 'task' | 'home' | 'lounge' | 'meeting' | 'unknown' | 'fixed' | 'seat';

export interface Placement {
  spaceId: string;
  /** Index in the room's posts (robots), devices (consoles, drones) or 0 for a seat. */
  slot: number;
  kind: 'post' | 'device' | 'seat';
  reason: Reason;
  taskId?: string;
}

/** Real status, or null when the agent has never emitted an event. */
export function realStatus(state: Pick<GovernorState, 'agents'>, id: string): AgentStatus | null {
  return state.agents[id]?.status ?? null;
}

export function currentTask(state: Pick<GovernorState, 'agents' | 'tasks'>, id: string): TaskRuntime | undefined {
  const tid = state.agents[id]?.currentTaskId;
  return tid ? state.tasks[tid] : undefined;
}

export function homeSpace(b: Building, a: AgentDef): Space | undefined {
  for (const d of a.departmentIds) {
    const s = b.byDept.get(d);
    if (s) return s;
  }
  return b.reception ?? b.spaces[0];
}

/**
 * `prev` = the previous result: an agent who stays in the same room keeps its
 * post (nobody shuffles when someone else arrives or leaves); newcomers take
 * the first free post — in the meeting room, next to a colleague on the same task.
 */
export function computePlacements(state: Pick<GovernorState, 'agents' | 'tasks'>, catalog: Pick<Catalog, 'agents'>, b: Building, prev?: Map<string, Placement>): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const robots: Array<{ a: AgentDef; space: Space; reason: Reason; taskId?: string; order: number }> = [];
  catalog.agents.forEach((a, order) => {
    const home = homeSpace(b, a);
    if (!home) return;
    if (a.kind === 'human') {
      out.set(a.id, { spaceId: home.id, slot: 0, kind: 'seat', reason: 'seat' });
      return;
    }
    if (a.kind !== 'llm') return;
    const rt = state.agents[a.id];
    if (!rt) {
      robots.push({ a, space: home, reason: 'unknown', order });
      return;
    }
    const task = currentTask(state, a.id);
    if (rt.status === 'idle' && b.lounge) {
      robots.push({ a, space: b.lounge, reason: 'lounge', order });
      return;
    }
    if (rt.status === 'collaborating' && b.meeting) {
      robots.push({ a, space: b.meeting, reason: 'meeting', taskId: task?.id ?? rt.currentTaskId, order });
      return;
    }
    if (task?.departmentId && (task.status === 'running' || task.status === 'paused')) {
      const s = b.byDept.get(task.departmentId);
      if (s) {
        robots.push({ a, space: s, reason: 'task', taskId: task.id, order });
        return;
      }
    }
    robots.push({ a, space: home, reason: 'home', order });
  });
  // slots: agents of one task sit together in the meeting room; elsewhere catalog order
  const bySpace = new Map<string, typeof robots>();
  for (const r of robots) {
    const l = bySpace.get(r.space.id) ?? [];
    l.push(r);
    bySpace.set(r.space.id, l);
  }
  for (const [spaceId, list] of bySpace) {
    list.sort((x, y) => (x.reason === 'meeting' && y.reason === 'meeting' ? (x.taskId ?? '~').localeCompare(y.taskId ?? '~') : 0) || x.order - y.order);
    const taken = new Set<number>();
    const slots = new Map<string, number>();
    for (const r of list) {
      const p = prev?.get(r.a.id);
      if (p && p.spaceId === spaceId && p.kind === 'post' && !taken.has(p.slot)) {
        taken.add(p.slot);
        slots.set(r.a.id, p.slot);
      }
    }
    for (const r of list) {
      if (slots.has(r.a.id)) continue;
      let slot = -1;
      if (r.reason === 'meeting' && r.taskId) {
        for (const o of list) {
          const s0 = o !== r && o.taskId === r.taskId ? slots.get(o.a.id) : undefined;
          if (s0 == null) continue;
          slot = [s0 + 1, s0 - 1, s0 + 2, s0 - 2].find((c) => c >= 0 && !taken.has(c)) ?? -1;
          if (slot >= 0) break;
        }
      }
      if (slot < 0) {
        slot = 0;
        while (taken.has(slot)) slot++;
      }
      taken.add(slot);
      slots.set(r.a.id, slot);
    }
    for (const r of list) out.set(r.a.id, { spaceId, slot: slots.get(r.a.id)!, kind: 'post', reason: r.reason, taskId: r.taskId });
  }
  // fixed devices
  const devCount = new Map<string, number>();
  for (const a of catalog.agents) {
    if (a.kind !== 'script' && a.kind !== 'service') continue;
    const home = homeSpace(b, a);
    if (!home) continue;
    const n = devCount.get(home.id) ?? 0;
    devCount.set(home.id, n + 1);
    out.set(a.id, { spaceId: home.id, slot: n, kind: 'device', reason: 'fixed' });
  }
  return out;
}

export const REASON_LABEL: Record<Reason, string> = {
  task: 'au poste de sa tâche',
  home: 'à son poste',
  lounge: 'au salon',
  meeting: 'en réunion',
  unknown: 'à son poste (aucun événement)',
  fixed: 'poste fixe',
  seat: 'à son bureau',
};
