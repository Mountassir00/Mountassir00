/**
 * Pure model of the « Siège » (tower) view: floors from catalog groups,
 * windows from the recorded engine statuses, elevator traffic from recorded
 * flows, autopilot cadence inferred from `automation.run` events.
 * Nothing here reads React state; nothing is invented.
 */
import type { AgentDef, AgentStatus, Catalog, DataNature, DepartmentDef, FlowView, GovEvent, GovernorState } from '@sdk';

export type FloorRole = 'ground' | 'middle' | 'roof';

export interface Floor {
  /** Group name (stable id of the floor). */
  id: string;
  /** 0 = ground floor, increasing upwards. */
  index: number;
  role: FloorRole;
  depts: DepartmentDef[];
}

/** Short label for a floor level, French conventions (RDC, 1er, 2e…, Toit). */
export function levelLabel(f: Floor): string {
  if (f.role === 'roof') return 'Toit';
  if (f.index === 0) return 'RDC';
  return f.index === 1 ? '1er' : `${f.index}e`;
}

export function levelLong(f: Floor): string {
  if (f.role === 'roof') return 'Toit';
  if (f.index === 0) return 'Rez-de-chaussée';
  return f.index === 1 ? '1er étage' : `${f.index}e étage`;
}

/**
 * One floor per catalog group. The direction group sits on the roof, the
 * operations / connectors group on the ground floor, the others in between
 * in catalog order (first listed = highest).
 */
export function buildFloors(catalog: Catalog): Floor[] {
  const groups = [...new Set(catalog.departments.map((d) => d.group))];
  if (!groups.length) return [];
  const groupOf = (deptId: string) => catalog.departments.find((d) => d.id === deptId)?.group;
  const top = groups.find((g) => g === 'Direction') ?? groupOf('executive') ?? groups[0];
  const rest = groups.filter((g) => g !== top);
  const ground = rest.find((g) => g === 'Opérations') ?? (groupOf('connectors') !== top ? groupOf('connectors') : undefined) ?? rest[rest.length - 1];
  const middle = rest.filter((g) => g !== ground);
  const bottomUp: string[] = groups.length === 1 ? [top] : [...(ground ? [ground] : []), ...[...middle].reverse(), top];
  return bottomUp.map((g, i) => ({
    id: g,
    index: i,
    role: groups.length > 1 && i === bottomUp.length - 1 ? 'roof' : i === 0 ? 'ground' : 'middle',
    depts: catalog.departments.filter((d) => d.group === g),
  }));
}

export const ACTIVE: AgentStatus[] = ['working', 'researching', 'validating', 'collaborating'];
export const isActive = (s: AgentStatus) => ACTIVE.includes(s);

/** Where each engine physically is: the department of its current task, else its home department. */
export function standingOf(catalog: Catalog, state: GovernorState): Map<string, string> {
  const ids = new Set(catalog.departments.map((d) => d.id));
  const out = new Map<string, string>();
  for (const a of catalog.agents) {
    const rt = state.agents[a.id];
    const t = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
    const d = t?.departmentId && ids.has(t.departmentId) && a.departmentIds.includes(t.departmentId) ? t.departmentId : a.departmentIds.find((x) => ids.has(x));
    if (d) out.set(a.id, d);
  }
  return out;
}

/* ---------------- windows ---------------- */

export type Light = 'work' | 'wait' | 'error' | 'pause' | 'off' | 'away';

export const LIGHT_LABEL: Record<Light, string> = {
  work: 'éclairée (au travail)',
  wait: 'ambre (en attente)',
  error: 'rouge (erreur)',
  pause: 'veilleuse (suspendu)',
  off: 'éteinte (au repos)',
  away: 'éteinte (moteur à un autre poste)',
};

export function lightOf(status: AgentStatus | undefined): Light {
  if (!status) return 'off';
  if (isActive(status)) return 'work';
  if (status === 'waiting') return 'wait';
  if (status === 'error') return 'error';
  if (status === 'paused') return 'pause';
  return 'off';
}

export interface Bay {
  index: number;
  dept: DepartmentDef;
  engineId?: string;
  light: Light;
}

/** Splits `n` bays between departments (at least one each), then between their engines. */
export function bayPlan(depts: DepartmentDef[], n: number, standing: Map<string, string>, statusOf: (id: string) => AgentStatus | undefined): Bay[] {
  if (!depts.length) return [];
  const total = Math.max(n, depts.length);
  const base = Math.floor(total / depts.length);
  let extra = total - base * depts.length;
  const out: Bay[] = [];
  for (const d of depts) {
    const m = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    const engines = d.engineIds;
    for (let j = 0; j < m; j++) {
      const engineId = engines.length ? engines[j % engines.length] : undefined;
      let light: Light = 'off';
      if (engineId) {
        const st = statusOf(engineId);
        // A shared engine only lights the department where it actually stands.
        light = standing.get(engineId) && standing.get(engineId) !== d.id ? (st && st !== 'idle' && st !== 'offline' ? 'away' : 'off') : lightOf(st);
      }
      out.push({ index: out.length, dept: d, engineId, light });
    }
  }
  return out;
}

/* ---------------- elevator traffic ---------------- */

export interface ShaftRun {
  key: string;
  /** Floor index; floors.length = models link above the roof. */
  from: number;
  to: number;
  count: number;
  failed: number;
  lastTs: number;
  kinds: string[];
}

export function nodeLevel(catalog: Catalog, floors: Floor[], standing: Map<string, string>, nodeId: string): number | undefined {
  const floorOfDept = (deptId?: string) => (deptId ? floors.find((f) => f.depts.some((d) => d.id === deptId))?.index : undefined);
  const agent = catalog.agents.find((a) => a.id === nodeId);
  if (agent) return floorOfDept(standing.get(agent.id) ?? agent.departmentIds[0]);
  const node = catalog.nodes.find((n) => n.id === nodeId);
  if (node && (node.kind === 'model' || node.kind === 'provider')) return floors.length;
  // Infrastructure (queues, stores, connectors, skills): the floor of the engine wired to it in the catalog.
  for (const e of catalog.edges) {
    const other = e.to === nodeId ? e.from : e.from === nodeId ? e.to : undefined;
    if (!other) continue;
    const a = catalog.agents.find((x) => x.id === other && x.kind !== 'human');
    if (a) return floorOfDept(a.departmentIds[0]);
  }
  return floors.length ? 0 : undefined;
}

/** Inter-floor exchanges actually recorded in the window (same-floor flows stay off the shaft). */
export function shaftRuns(catalog: Catalog, floors: Floor[], standing: Map<string, string>, flows: FlowView[], events: readonly GovEvent[]): ShaftRun[] {
  const deptOfEvent = new Map<string, string | undefined>();
  for (const e of events) deptOfEvent.set(e.id, e.department);
  const floorOfDept = (deptId?: string) => (deptId ? floors.find((f) => f.depts.some((d) => d.id === deptId))?.index : undefined);
  const runs = new Map<string, ShaftRun>();
  for (const f of flows) {
    const from = floorOfDept(deptOfEvent.get(f.id)) ?? nodeLevel(catalog, floors, standing, f.from);
    const to = nodeLevel(catalog, floors, standing, f.to);
    if (from == null || to == null || from === to) continue;
    const key = `${from}>${to}`;
    const r = runs.get(key) ?? { key, from, to, count: 0, failed: 0, lastTs: 0, kinds: [] };
    r.count++;
    if (f.status === 'failed') r.failed++;
    r.lastTs = Math.max(r.lastTs, f.ts);
    if (!r.kinds.includes(f.kind)) r.kinds.push(f.kind);
    runs.set(key, r);
  }
  return [...runs.values()].sort((a, b) => b.lastTs - a.lastTs);
}

/* ---------------- autopilot ---------------- */

export interface Automation {
  key: string;
  name: string;
  dept?: DepartmentDef;
  engine?: AgentDef;
  runs: number;
  failed: number;
  lastTs: number;
  lastFailed: boolean;
  intervalMs: number | null;
  regular: boolean;
  nextTs: number | null;
  cadence: string;
  nature: DataNature;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const near = (v: number, target: number, tol = 0.12) => Math.abs(v - target) <= target * tol;
const hhmm = (ts: number) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(ts);
const weekday = (ts: number) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(ts);

function humanInterval(ms: number) {
  if (ms >= DAY) return `${Math.round(ms / DAY)} j`;
  if (ms >= HOUR) return `${Math.round(ms / HOUR)} h`;
  return `${Math.max(1, Math.round(ms / 60_000))} min`;
}

/**
 * Recurring automations deduced from `automation.run` events: grouped by name,
 * cadence = median gap between runs. The next run is a deduction (shown as
 * « Planifié (déduit) »), never a recorded schedule.
 */
export function inferAutomations(events: readonly GovEvent[], now: number, catalog: Catalog): Automation[] {
  const groups = new Map<string, GovEvent[]>();
  for (const e of events) {
    if (e.type !== 'automation.run' || e.ts > now) continue;
    const name = typeof e.attrs?.name === 'string' ? e.attrs.name : e.summary ?? 'Automatisation';
    const key = `${e.actor?.id ?? e.origin.id}|${name}`;
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  const out: Automation[] = [];
  for (const [key, list] of groups) {
    list.sort((a, b) => a.ts - b.ts);
    const last = list[list.length - 1];
    const gaps = list.slice(1).map((e, i) => e.ts - list[i].ts).filter((x) => x > 0).sort((a, b) => a - b);
    const intervalMs = gaps.length ? gaps[Math.floor(gaps.length / 2)] : null;
    let regular = false;
    if (intervalMs && gaps.length >= 1) {
      const mean = gaps.reduce((s, x) => s + x, 0) / gaps.length;
      const sd = Math.sqrt(gaps.reduce((s, x) => s + (x - mean) ** 2, 0) / gaps.length);
      regular = mean > 0 && sd / mean < 0.35;
    }
    let cadence: string;
    if (!intervalMs) cadence = 'Une seule exécution observée : cadence non déductible';
    else if (!regular) cadence = `Cadence irrégulière (environ toutes les ${humanInterval(intervalMs)})`;
    else if (near(intervalMs, DAY)) cadence = `Tous les jours vers ${hhmm(last.ts)}`;
    else if (near(intervalMs, 7 * DAY)) cadence = `Chaque ${weekday(last.ts)} vers ${hhmm(last.ts)}`;
    else if (near(intervalMs, HOUR)) cadence = 'Toutes les heures';
    else cadence = `Toutes les ${humanInterval(intervalMs)}`;
    const engineId = last.actor?.id ?? last.origin.id;
    out.push({
      key,
      name: typeof last.attrs?.name === 'string' ? last.attrs.name : last.summary ?? 'Automatisation',
      dept: catalog.departments.find((d) => d.id === last.department),
      engine: catalog.agents.find((a) => a.id === engineId),
      runs: list.length,
      failed: list.filter((e) => e.status === 'failed').length,
      lastTs: last.ts,
      lastFailed: last.status === 'failed',
      intervalMs,
      regular,
      nextTs: intervalMs && regular ? last.ts + intervalMs : null,
      cadence,
      nature: last.nature,
    });
  }
  return out.sort((a, b) => (a.nextTs ?? Infinity) - (b.nextTs ?? Infinity) || b.lastTs - a.lastTs);
}
