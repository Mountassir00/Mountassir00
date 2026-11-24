/**
 * Pure layout & topology helpers for the Modular Office.
 * Nothing here reads React state: inputs in, positions/links out, so the
 * scene is memoised on (catalog, order, grouping, device, gap).
 */
import { iso, type Bounds } from '@ds';
import type { Catalog, DepartmentDef, FlowView, GovernorState } from '@sdk';

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
