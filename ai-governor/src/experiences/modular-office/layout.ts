/**
 * Pure layout & topology helpers for the Modular Office.
 * Nothing here reads React state: inputs in, positions/links out, so the
 * scene is memoised on (catalog, order, grouping, device, gap).
 */
import { iso, type Bounds } from '@ds';
import type { Catalog, DepartmentDef, FlowView, GovEvent, GovernorState } from '@sdk';

/** Platform footprint in world units (tiles). */
export const PW = 4;
export const PD = 4;

export type LayoutMode = 'diamond' | 'columns';

export type Item =
  | { kind: 'dept'; key: string; dept: DepartmentDef; isNew: boolean }
  | { kind: 'cluster'; key: string; group: string; depts: DepartmentDef[] }
  | { kind: 'empty'; key: string };

export interface Placed {
  item: Item;
  slot: number;
  x: number;
  y: number;
  /** Screen-space centre of the platform top (for focus, centring, arrows). */
  sx: number;
  sy: number;
}

/** Ordered department list: saved order first, then anything new appended (growth). */
export function orderedDepartments(catalog: Catalog, saved: string[]): { slots: Array<DepartmentDef | null>; newIds: Set<string> } {
  const byId = new Map(catalog.departments.map((d) => [d.id, d]));
  const slots: Array<DepartmentDef | null> = [];
  const used = new Set<string>();
  for (const id of saved) {
    if (id === '') {
      slots.push(null);
      continue;
    }
    const d = byId.get(id);
    if (d && !used.has(id)) {
      slots.push(d);
      used.add(id);
    }
  }
  // Trim trailing gaps, then append new modules.
  while (slots.length && slots[slots.length - 1] === null) slots.pop();
  const newIds = new Set<string>();
  for (const d of catalog.departments) {
    if (used.has(d.id)) continue;
    if (saved.length) newIds.add(d.id);
    const gap = slots.indexOf(null);
    if (gap >= 0) slots[gap] = d;
    else slots.push(d);
  }
  return { slots, newIds };
}

/** Builds the visible items: departments, or cluster plates for collapsed groups. */
export function buildItems(slots: Array<DepartmentDef | null>, newIds: Set<string>, grouping: boolean, expanded: Set<string>): Item[] {
  if (!grouping) {
    return slots.map((d, i) => (d ? { kind: 'dept', key: d.id, dept: d, isNew: newIds.has(d.id) } : { kind: 'empty', key: `empty-${i}` }));
  }
  const items: Item[] = [];
  const seen = new Set<string>();
  for (const d of slots) {
    if (!d || seen.has(d.group)) continue;
    seen.add(d.group);
    const members = slots.filter((x): x is DepartmentDef => !!x && x.group === d.group);
    // An unfolded group keeps its departments together, where the group stood.
    if (expanded.has(d.group)) for (const m of members) items.push({ kind: 'dept', key: m.id, dept: m, isNew: newIds.has(m.id) });
    else items.push({ kind: 'cluster', key: `cluster:${d.group}`, group: d.group, depts: members });
  }
  return items;
}

export function columnsFor(n: number, mode: LayoutMode) {
  if (mode === 'columns') return 2;
  return Math.max(2, Math.ceil(Math.sqrt(Math.max(1, n))));
}

/** World position of a slot. Diamond = world grid; columns = screen-aligned rows (phones). */
export function slotPosition(i: number, cols: number, rows: number, mode: LayoutMode, gap: number): { x: number; y: number } {
  if (mode === 'columns') {
    const A = PW + PD + 0.6;
    const B = PW + PD + 5 + gap;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col - (cols - 1) / 2;
    const cy = row - (rows - 1) / 2;
    return { x: (cx * A + cy * B) / 2 - PW / 2, y: (cy * B - cx * A) / 2 - PD / 2 };
  }
  const S = PW + gap;
  const c = i % cols;
  const r = Math.floor(i / cols);
  return { x: c * S - (cols * S - gap) / 2, y: r * S - (rows * S - gap) / 2 };
}

export function placeItems(items: Item[], mode: LayoutMode, gap: number, minSlots = 0): { placed: Placed[]; cols: number; rows: number } {
  const n = Math.max(items.length, minSlots);
  const cols = columnsFor(n, mode);
  const rows = Math.max(1, Math.ceil(n / cols));
  const all: Item[] = [...items];
  for (let i = items.length; i < n; i++) all.push({ kind: 'empty', key: `empty-${i}` });
  const placed = all.map((item, slot) => {
    const { x, y } = slotPosition(slot, cols, rows, mode, gap);
    const [sx, sy] = iso(x + PW / 2, y + PD / 2, 0);
    return { item, slot, x, y, sx, sy };
  });
  return { placed, cols, rows };
}

export function sceneBounds(placed: Placed[], thickness: number): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of placed) {
    const top = iso(p.x, p.y, 0);
    const left = iso(p.x, p.y + PD, 0);
    const right = iso(p.x + PW, p.y, 0);
    const bottom = iso(p.x + PW, p.y + PD, -thickness);
    minX = Math.min(minX, left[0] - 20);
    maxX = Math.max(maxX, right[0] + 20);
    minY = Math.min(minY, top[1] - 70);
    maxY = Math.max(maxY, bottom[1] + 64);
  }
  if (!Number.isFinite(minX)) return { minX: -200, minY: -150, maxX: 200, maxY: 150 };
  return { minX, minY, maxX, maxY };
}

/* ---------------- topology ---------------- */

export interface DeptLink {
  a: string;
  b: string;
  kind: 'shared' | 'depends' | 'dispatch' | 'flow';
}

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Static links derived from the catalog: shared engine, direct dependency, queue dispatch. */
export function staticLinks(catalog: Catalog): DeptLink[] {
  const engineDepts = new Map<string, string[]>();
  for (const d of catalog.departments) for (const e of d.engineIds) engineDepts.set(e, [...(engineDepts.get(e) ?? []), d.id]);
  const out = new Map<string, DeptLink>();
  const add = (a: string, b: string, kind: DeptLink['kind']) => {
    if (a === b) return;
    const k = pairKey(a, b);
    if (!out.has(k)) out.set(k, { a, b, kind });
  };
  for (const depts of engineDepts.values()) for (let i = 0; i < depts.length; i++) for (let j = i + 1; j < depts.length; j++) add(depts[i], depts[j], 'shared');
  for (const e of catalog.edges) {
    const A = engineDepts.get(e.from);
    const B = engineDepts.get(e.to);
    if (A && B) for (const a of A) for (const b of B) add(a, b, 'depends');
  }
  const queues = new Set(catalog.nodes.filter((n) => n.kind === 'queue').map((n) => n.id));
  for (const q of queues) {
    const writers = catalog.edges.filter((e) => e.to === q && e.kind === 'writes').flatMap((e) => engineDepts.get(e.from) ?? []);
    const routed = catalog.edges.filter((e) => e.from === q && e.kind === 'routes').flatMap((e) => engineDepts.get(e.to) ?? []);
    for (const a of writers) for (const b of routed) add(a, b, 'dispatch');
  }
  return [...out.values()];
}

/** Links active in the window: real flows between engines + recorded collaborations. */
export function activeLinks(catalog: Catalog, flows: FlowView[], state: GovernorState, standing: Map<string, string>): Map<string, 'active' | 'error'> {
  const engineDepts = new Map<string, string[]>();
  for (const d of catalog.departments) for (const e of d.engineIds) engineDepts.set(e, [...(engineDepts.get(e) ?? []), d.id]);
  const out = new Map<string, 'active' | 'error'>();
  const mark = (a: string, b: string, failed: boolean) => {
    if (a === b) return;
    const k = pairKey(a, b);
    if (failed) out.set(k, 'error');
    else if (!out.has(k)) out.set(k, 'active');
  };
  for (const f of flows) {
    const A = standing.get(f.from) ? [standing.get(f.from)!] : engineDepts.get(f.from);
    const B = engineDepts.get(f.to);
    if (!A || !B) continue;
    for (const a of A) for (const b of B) mark(a, b, f.status === 'failed');
  }
  for (const a of Object.values(state.agents)) {
    if (a.status !== 'collaborating' || !a.collaboratingWith) continue;
    const da = standing.get(a.id);
    const db = standing.get(a.collaboratingWith);
    if (da && db) mark(da, db, false);
  }
  return out;
}

export { pairKey };

/** Orthogonal cable through the corridors between platforms (never across a platform top). */
export function cablePath(A: Placed, B: Placed, mode: LayoutMode, gap: number, z: number, lane: number): string {
  const ac: [number, number] = [A.x + PW / 2, A.y + PD / 2];
  const bc: [number, number] = [B.x + PW / 2, B.y + PD / 2];
  let pts: Array<[number, number]>;
  if (mode === 'columns') {
    pts = [ac, bc];
  } else {
    const half = gap / 2;
    const cxA = A.x + PW + half + lane;
    const cxB = B.x + PW + half + lane;
    if (Math.abs(A.x - B.x) < 0.01) {
      pts = [ac, [cxA, ac[1]], [cxA, bc[1]], bc];
    } else {
      const ry = (B.y >= A.y ? A.y + PD + half : A.y - half) + lane;
      pts = [ac, [cxA, ac[1]], [cxA, ry], [cxB, ry], [cxB, bc[1]], bc];
    }
  }
  return pts
    .map(([x, y], i) => {
      const [sx, sy] = iso(x, y, z);
      return `${i ? 'L' : 'M'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');
}

/** Picks the slot in a screen direction (arrow keys), whatever the layout. */
export function neighbourSlot(placed: Placed[], from: number, dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'): number | null {
  const cur = placed.find((p) => p.slot === from);
  if (!cur) return null;
  const v = dir === 'ArrowLeft' ? [-1, 0] : dir === 'ArrowRight' ? [1, 0] : dir === 'ArrowUp' ? [0, -1] : [0, 1];
  let best: { slot: number; score: number } | null = null;
  for (const p of placed) {
    if (p.slot === from) continue;
    const dx = p.sx - cur.sx;
    const dy = p.sy - cur.sy;
    const dist = Math.hypot(dx, dy);
    if (!dist) continue;
    const cos = (dx * v[0] + dy * v[1]) / dist;
    if (cos < 0.45) continue;
    const score = dist * (2 - cos);
    if (!best || score < best.score) best = { slot: p.slot, score };
  }
  return best?.slot ?? null;
}

/* ---------------- hub arrangement ---------------- */

/** Radius (world units) of the central hub platform. */
export const HUB_R = 4.6;

/** The department that becomes the hub: the executive office, else the one served by the orchestrator, else the first. */
export function pickHubDept(catalog: Catalog): DepartmentDef | undefined {
  return (
    catalog.departments.find((d) => d.id === 'executive') ??
    catalog.departments.find((d) => d.engineIds.includes('governor')) ??
    catalog.departments[0]
  );
}

/** Ring order: departments grouped by pole so each pole reads as an arc around the hub. */
export function hubCatalog(catalog: Catalog, hubId: string | undefined): Catalog {
  const groups = [...new Set(catalog.departments.map((d) => d.group))];
  const departments = catalog.departments.filter((d) => d.id !== hubId).sort((a, b) => groups.indexOf(a.group) - groups.indexOf(b.group));
  return { ...catalog, departments };
}

export function hubRingRadius(n: number, gap: number): number {
  const clear = HUB_R + PW * 0.71 + gap + 1.6;
  if (n <= 1) return clear;
  const chord = PW * 1.414 + gap * 0.45 + 0.6;
  return Math.max(clear, chord / (2 * Math.sin(Math.PI / n)));
}

export interface HubPlacement {
  placed: Placed[];
  /** World centre of the hub. */
  hub: { x: number; y: number; sx: number; sy: number };
  R: number;
}

/**
 * Ring: departments evenly spaced on a circle around the hub (starting at the
 * top of the screen, clockwise). Columns (phones): the hub on top, two
 * screen-aligned columns below it.
 */
export function placeHub(items: Item[], mode: 'ring' | 'columns', gap: number, minSlots = 0): HubPlacement {
  const n = Math.max(items.length, minSlots);
  const all: Item[] = [...items];
  for (let i = items.length; i < n; i++) all.push({ kind: 'empty', key: `empty-${i}` });
  if (mode === 'ring') {
    const R = hubRingRadius(n, gap);
    const placed = all.map((item, slot) => {
      const th = (-3 * Math.PI) / 4 + (slot * 2 * Math.PI) / Math.max(1, n);
      const cx = R * Math.cos(th);
      const cy = R * Math.sin(th);
      const [sx, sy] = iso(cx, cy, 0);
      return { item, slot, x: cx - PW / 2, y: cy - PD / 2, sx, sy };
    });
    return { placed, hub: { x: 0, y: 0, sx: 0, sy: 0 }, R };
  }
  const cols = 2;
  const rows = Math.max(1, Math.ceil(n / cols));
  const placed = all.map((item, slot) => {
    const { x, y } = slotPosition(slot, cols, rows, 'columns', gap);
    const [sx, sy] = iso(x + PW / 2, y + PD / 2, 0);
    return { item, slot, x, y, sx, sy };
  });
  // Hub centred above the first row: a world shift (d, d) moves 32·d px straight up on screen.
  const top = placed.length ? Math.min(...placed.map((p) => p.sy)) : 0;
  const lift = (top - (HUB_R * 22.63 + 64 + 92)) / 32;
  const hx = lift;
  const hy = lift;
  const [sx, sy] = iso(hx, hy, 0);
  return { placed, hub: { x: hx, y: hy, sx, sy }, R: 0 };
}

export function hubBounds(h: HubPlacement, thickness: number): Bounds {
  const b = sceneBounds(h.placed, thickness);
  const rx = HUB_R * 45.25;
  const ry = HUB_R * 22.63;
  return {
    minX: Math.min(b.minX, h.hub.sx - rx - 20),
    maxX: Math.max(b.maxX, h.hub.sx + rx + 20),
    minY: Math.min(b.minY, h.hub.sy - ry - 120),
    maxY: Math.max(b.maxY, h.hub.sy + ry + 40),
  };
}

/** Straight walkway from the hub rim to a platform (world coordinates). */
export function spokeEnds(h: HubPlacement, p: Placed): { a: [number, number]; b: [number, number] } {
  const cx = p.x + PW / 2;
  const cy = p.y + PD / 2;
  const dx = cx - h.hub.x;
  const dy = cy - h.hub.y;
  const len = Math.hypot(dx, dy) || 1;
  return { a: [h.hub.x + (dx / len) * (HUB_R - 0.2), h.hub.y + (dy / len) * (HUB_R - 0.2)], b: [cx, cy] };
}

/** Phones: a spine from the hub down between the two columns, then a short branch to the platform. */
export function spineBranch(h: HubPlacement, p: Placed): string {
  const right = p.sx >= h.hub.sx;
  const lane = h.hub.sx + (right ? 3 : -3);
  const startY = h.hub.sy + HUB_R * 22.63;
  const vx = p.sx + (right ? -PW * 32 : PW * 32);
  return `M${lane.toFixed(1)},${startY.toFixed(1)} L${lane.toFixed(1)},${p.sy.toFixed(1)} L${vx.toFixed(1)},${p.sy.toFixed(1)}`;
}

/**
 * Walkways lit by recorded traffic in the window: exchanges with the hub
 * (its engines or the queues they feed), tasks dispatched by the hub's queue,
 * and department-to-department exchanges or collaborations (relayed by the hub).
 */
export function hubSpokeStates(
  catalog: Catalog, hubId: string, flows: FlowView[], events: readonly GovEvent[], state: GovernorState, standing: Map<string, string>,
): Map<string, 'active' | 'error'> {
  const hub = catalog.departments.find((d) => d.id === hubId);
  const hubNodes = new Set<string>(hub?.engineIds ?? []);
  for (const e of catalog.edges) {
    if (!hubNodes.has(e.from) || (e.kind !== 'writes' && e.kind !== 'calls')) continue;
    if (catalog.nodes.find((n) => n.id === e.to)?.kind === 'queue') hubNodes.add(e.to);
  }
  const ids = new Set(catalog.departments.map((d) => d.id));
  const deptOfEvent = new Map<string, string | undefined>();
  for (const e of events) deptOfEvent.set(e.id, e.department);
  const out = new Map<string, 'active' | 'error'>();
  const mark = (dept: string | undefined, failed: boolean) => {
    if (!dept || dept === hubId || !ids.has(dept)) return;
    if (failed) out.set(dept, 'error');
    else if (!out.has(dept)) out.set(dept, 'active');
  };
  for (const f of flows) {
    const failed = f.status === 'failed';
    const fromDept = deptOfEvent.get(f.id) ?? standing.get(f.from);
    const toDept = standing.get(f.to);
    if (hubNodes.has(f.to) || toDept === hubId) mark(fromDept, failed);
    else if (hubNodes.has(f.from) || fromDept === hubId) mark(toDept, failed);
    else if (fromDept && toDept && fromDept !== toDept) {
      mark(fromDept, failed);
      mark(toDept, failed);
    }
  }
  for (const e of events) if (e.type === 'task.created' && hubNodes.has(e.origin.id)) mark(e.department, false);
  for (const a of Object.values(state.agents)) {
    if (a.status !== 'collaborating' || !a.collaboratingWith) continue;
    const da = standing.get(a.id);
    const db = standing.get(a.collaboratingWith);
    if (da && db && da !== db) {
      mark(da, false);
      mark(db, false);
    }
  }
  return out;
}
