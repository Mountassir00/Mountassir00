/**
 * Deterministic layout of the system map (pure, memoised on the catalog).
 *
 * Desktop: one iso floor strip per architectural layer, stacked along the
 * world x axis (people → agents → services → orchestration → models →
 * providers); tools and data are side wings running along x, behind and in
 * front of the main strips. Mobile: each layer becomes a screen-horizontal
 * row, rows stacked downwards, so the map is tall instead of wide.
 */
import { iso, type Bounds } from '@ds';
import type { Catalog, SystemNode } from '@sdk';

export type LaneId = 'people' | 'agents' | 'services' | 'orchestration' | 'models' | 'providers' | 'tools' | 'data';

export const LANE_LABEL: Record<LaneId, string> = {
  people: 'Personnes',
  agents: 'Agents IA',
  services: 'Services et scripts',
  orchestration: 'Orchestration',
  models: 'Modèles',
  providers: 'Fournisseurs',
  tools: 'Outils, connecteurs et skills',
  data: 'Données',
};

const MAIN: LaneId[] = ['people', 'agents', 'services', 'orchestration', 'models', 'providers'];
const MOBILE_ORDER: LaneId[] = ['people', 'agents', 'services', 'orchestration', 'models', 'providers', 'tools', 'data'];

export interface NodePos {
  id: string;
  /** Min corner of the footprint, world units. */
  x: number;
  y: number;
  w: number;
  d: number;
  lane: LaneId;
}

export interface LaneBox {
  id: LaneId;
  /** World rectangle of the floor strip (desktop only). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Screen position of the lane title. */
  title: [number, number];
  anchor: 'start' | 'middle' | 'end';
}

export interface MapLayout {
  nodes: Map<string, NodePos>;
  lanes: LaneBox[];
  bounds: Bounds;
  mobile: boolean;
}

export function laneOf(n: SystemNode): LaneId {
  switch (n.layer) {
    case 'people':
      return 'people';
    case 'agents':
      return n.kind === 'service' || n.kind === 'process' ? 'services' : 'agents';
    case 'orchestration':
      return 'orchestration';
    case 'models':
      return 'models';
    case 'providers':
      return 'providers';
    case 'tools':
      return 'tools';
    default:
      return 'data';
  }
}

export function sizeOf(n: SystemNode): { w: number; d: number } {
  switch (n.kind) {
    case 'provider':
      return { w: 1.7, d: 1.7 };
    case 'queue':
      return { w: 1.3, d: 2.1 };
    case 'database':
      return { w: 1.3, d: 1.3 };
    case 'user':
      return { w: 1.3, d: 1.3 };
    default:
      return { w: 1.4, d: 1.4 };
  }
}

export const center = (p: NodePos): [number, number] => [p.x + p.w / 2, p.y + p.d / 2];

function group(catalog: Catalog) {
  const lanes = new Map<LaneId, SystemNode[]>();
  for (const n of catalog.nodes) {
    const l = laneOf(n);
    if (!lanes.has(l)) lanes.set(l, []);
    lanes.get(l)!.push(n);
  }
  return lanes;
}

export function computeLayout(catalog: Catalog, mobile: boolean): MapLayout {
  return mobile ? mobileLayout(catalog) : desktopLayout(catalog);
}

function desktopLayout(catalog: Catalog): MapLayout {
  const byLane = group(catalog);
  const nodes = new Map<string, NodePos>();
  const lanes: LaneBox[] = [];
  const MAX_ROWS = 5;
  const COL_GAP = 1.7;
  const LANE_GAP = 3.3;
  const Y_GAP = 1.5;
  let x = 0;
  let yMin = 0;
  let yMax = 0;
  for (const lane of MAIN) {
    const list = byLane.get(lane);
    if (!list?.length) continue;
    const cols = Math.ceil(list.length / MAX_ROWS);
    const perCol = Math.ceil(list.length / cols);
    const laneX0 = x;
    let laneY0 = Infinity;
    let laneY1 = -Infinity;
    for (let c = 0; c < cols; c++) {
      const col = list.slice(c * perCol, (c + 1) * perCol);
      const sizes = col.map(sizeOf);
      const colW = Math.max(...sizes.map((s) => s.w));
      const length = sizes.reduce((s, z) => s + z.d, 0) + Y_GAP * (col.length - 1);
      let y = -length / 2;
      col.forEach((n, i) => {
        const s = sizes[i];
        nodes.set(n.id, { id: n.id, x: x + (colW - s.w) / 2, y, w: s.w, d: s.d, lane });
        laneY0 = Math.min(laneY0, y);
        laneY1 = Math.max(laneY1, y + s.d);
        y += s.d + Y_GAP;
      });
      x += colW + (c < cols - 1 ? COL_GAP : 0);
    }
    const pad = 0.55;
    const box: LaneBox = { id: lane, x0: laneX0 - pad, y0: laneY0 - pad, x1: x + pad, y1: laneY1 + pad, title: [0, 0], anchor: 'middle' };
    const [tx, ty] = iso((box.x0 + box.x1) / 2, box.y0, 0);
    box.title = [tx + 10, ty - 16];
    box.anchor = 'start';
    lanes.push(box);
    yMin = Math.min(yMin, laneY0);
    yMax = Math.max(yMax, laneY1);
    x += LANE_GAP;
  }
  const mainX1 = Math.max(4, x - LANE_GAP);
  const firstMain = lanes[0]?.x0 ?? 0;
  const wing = (lane: LaneId, yBase: number, dir: -1 | 1) => {
    const list = byLane.get(lane);
    if (!list?.length) return;
    const span = mainX1 - firstMain;
    const step = 2.9;
    const perRow = Math.max(1, Math.min(list.length, Math.floor(span / step) + 1));
    const rows = Math.ceil(list.length / perRow);
    let w0 = Infinity;
    let w1 = -Infinity;
    let r0 = Infinity;
    let r1 = -Infinity;
    for (let r = 0; r < rows; r++) {
      const row = list.slice(r * perRow, (r + 1) * perRow);
      const width = (row.length - 1) * step;
      const startX = firstMain + (span - width) / 2;
      const rowY = yBase + dir * r * 2.9;
      row.forEach((n, i) => {
        const s = sizeOf(n);
        const nx = startX + i * step - s.w / 2;
        const ny = dir < 0 ? rowY - s.d : rowY;
        nodes.set(n.id, { id: n.id, x: nx, y: ny, w: s.w, d: s.d, lane });
        w0 = Math.min(w0, nx);
        w1 = Math.max(w1, nx + s.w);
        r0 = Math.min(r0, ny);
        r1 = Math.max(r1, ny + s.d);
      });
    }
    const pad = 0.55;
    const box: LaneBox = { id: lane, x0: w0 - pad, y0: r0 - pad, x1: w1 + pad, y1: r1 + pad, title: [0, 0], anchor: 'end' };
    const [tx, ty] = iso(box.x0, (box.y0 + box.y1) / 2, 0);
    box.title = [tx - 12, ty + 4];
    lanes.push(box);
  };
  wing('tools', yMin - 3.4, -1);
  wing('data', yMax + 3.4, 1);
  return { nodes, lanes, bounds: boundsOf(nodes, lanes), mobile: false };
}

function mobileLayout(catalog: Catalog): MapLayout {
  const byLane = group(catalog);
  const nodes = new Map<string, NodePos>();
  const lanes: LaneBox[] = [];
  const PER_ROW = 3;
  const ST = 1.75;
  let o = 0;
  for (const lane of MOBILE_ORDER) {
    const list = byLane.get(lane);
    if (!list?.length) continue;
    const rows = Math.ceil(list.length / PER_ROW);
    const firstO = o;
    for (let r = 0; r < rows; r++) {
      const row = list.slice(r * PER_ROW, (r + 1) * PER_ROW);
      row.forEach((n, i) => {
        const k = (i - (row.length - 1) / 2) * ST;
        const s = sizeOf(n);
        const cx = o + k;
        const cy = o - k;
        nodes.set(n.id, { id: n.id, x: cx - s.w / 2, y: cy - s.d / 2, w: s.w, d: s.d, lane });
      });
      o += 2.7;
    }
    const [tx, ty] = iso(firstO, firstO, 0);
    lanes.push({ id: lane, x0: 0, y0: 0, x1: 0, y1: 0, title: [tx, ty - 50], anchor: 'middle' });
    o += 1.9;
  }
  return { nodes, lanes, bounds: boundsOf(nodes, lanes, true), mobile: true };
}

function boundsOf(nodes: Map<string, NodePos>, lanes: LaneBox[], mobile = false): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (p: [number, number]) => {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  };
  for (const n of nodes.values()) {
    add(iso(n.x, n.y, 1.3));
    add(iso(n.x + n.w, n.y, 1.3));
    add(iso(n.x, n.y + n.d, 0));
    add(iso(n.x + n.w, n.y + n.d, 0));
  }
  for (const l of lanes) {
    if (!mobile) {
      add(iso(l.x0, l.y0));
      add(iso(l.x1, l.y0));
      add(iso(l.x0, l.y1));
      add(iso(l.x1, l.y1));
    }
    add(l.title);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
  const padX = mobile ? 24 : 120;
  return { minX: minX - padX, minY: minY - 40, maxX: maxX + padX, maxY: maxY + 46 };
}

/** Orthogonal pipe route between two blocks, via a corridor beside the source. */
export function routePoints(a: NodePos, b: NodePos, offset: number, mobile: boolean): Array<[number, number]> {
  const [ax, ay] = center(a);
  const [bx, by] = center(b);
  if (mobile) {
    // Screen-aligned schematic routing for the tall phone layout:
    // down/up a column, along the gap above (or below) the target row, then into the target.
    const ua = ax - ay + offset;
    const va = ax + ay;
    const ub = bx - by + offset;
    const vb = bx + by;
    const vg = vb + (vb >= va ? -2.7 : 2.7);
    const toXY = (u: number, v: number): [number, number] => [(u + v) / 2, (v - u) / 2];
    if (Math.abs(ua - ub) < 0.3) return [[ax, ay], [bx, by]];
    return [[ax, ay], toXY(ua, vg), toXY(ub, vg), [bx, by]];
  }
  const side = Math.sign(bx - ax) || 1;
  if (Math.abs(bx - ax) < 0.4) {
    const cx = ax + (a.w / 2 + 0.75) + offset;
    return [[ax, ay], [cx, ay], [cx, by], [bx, by]];
  }
  const cx = ax + side * (a.w / 2 + 0.85) + offset;
  return [[ax, ay], [cx, ay], [cx, by], [bx, by]];
}

export function pathOf(points: Array<[number, number]>, z = 0.02): string {
  return points
    .map(([x, y], i) => {
      const [sx, sy] = iso(x, y, z);
      return `${i ? 'L' : 'M'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    })
    .join(' ');
}

/** Screen midpoint of the longest segment (for labels on a route). */
export function labelPoint(points: Array<[number, number]>): [number, number] {
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    if (len > bestLen) {
      bestLen = len;
      best = i;
    }
  }
  const [x0, y0] = points[best];
  const [x1, y1] = points[best + 1] ?? points[best];
  return iso((x0 + x1) / 2, (y0 + y1) / 2, 0.02);
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
