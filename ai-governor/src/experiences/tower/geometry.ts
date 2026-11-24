/**
 * Geometry of the tower (world units of the iso kit: 1 = one floor tile).
 * Memoised on (floors, bays, floor height, shaft): live data never moves it,
 * so the camera is not refitted when a window lights up.
 */
import { iso, type Bounds } from '@ds';
import type { DepartmentDef } from '@sdk';
import type { Floor } from './model';

export const DEPTH = 3.2;
const LABEL_GAP = 30;

export interface TowerGeom {
  N: number;
  D: number;
  H: number;
  regular: Floor[];
  roof?: Floor;
  zRoof: number;
  zTop: number;
  pent?: { x: number; y: number; w: number; d: number; z: number; h: number };
  shaft: { x: number; y: number; w: number; d: number; h: number };
  /** Screen x of the right edge of the floor labels column. */
  labelRight: number;
  bounds: Bounds;
}

/** Centre z of a level: a floor index, or floors.length for the models link above the roof. */
export function levelZ(g: TowerGeom, level: number): number {
  if (level < g.regular.length) return level * g.H + g.H * 0.5;
  if (g.roof && level === g.regular.length) return g.zRoof + g.H * 0.5;
  return g.zTop + 0.25;
}

export function pillWidth(name: string) {
  return Math.max(name.length * 7.5, 160) + 64;
}

export function towerGeom(floors: Floor[], bays: number, H: number, showShaft: boolean): TowerGeom {
  const roof = floors.find((f) => f.role === 'roof');
  const regular = floors.filter((f) => f.role !== 'roof');
  const maxDepts = Math.max(1, ...floors.map((f) => f.depts.length));
  const N = Math.max(Math.round(bays), maxDepts, 3);
  const D = DEPTH;
  const zRoof = regular.length * H;
  let pent: TowerGeom['pent'];
  if (roof) {
    const w = Math.min(N - 1, Math.max(roof.depts.length * 2, Math.round(N * 0.62)));
    pent = { x: 0.45, y: 0.45, w, d: D - 0.95, z: zRoof, h: H };
  }
  const zTop = zRoof + (roof ? H : 0) + 0.4;
  const shaft = { x: N, y: D - 1.15, w: 1, d: 1, h: zTop };
  const labelRight = iso(0, D, 0)[0] - LABEL_GAP;
  const maxPill = Math.max(...floors.map((f) => pillWidth(f.id)));
  const top = iso(N - 0.9, 0.9, zRoof + 2.2)[1];
  const bounds: Bounds = {
    minX: labelRight - maxPill - 14,
    maxX: iso(N + 1, D - 1.15, 0)[0] + 36,
    minY: Math.min(top, iso(0, 0, zTop + (showShaft ? 1.2 : 0))[1]) - 22,
    maxY: iso(N + 1, D, 0)[1] + 34,
  };
  return { N, D, H, regular, roof, zRoof, zTop, pent, shaft, labelRight, bounds };
}

/** Bays of the penthouse or of a regular floor: [x0, x1] spans along the facade. */
export function baySpans(count: number, x0: number, width: number): Array<[number, number]> {
  const step = width / Math.max(1, count);
  return Array.from({ length: count }, (_, i) => [x0 + i * step, x0 + (i + 1) * step]);
}

/* ---------------- floor plan ---------------- */

export const RW = 5;
export const RD = 4.4;
const CORR = 1.5;
const M = 0.5;
const FRONT = 2.4;

export interface RoomBox {
  dept: DepartmentDef;
  x: number;
  y: number;
  w: number;
  d: number;
}

export interface PlanGeom {
  rooms: RoomBox[];
  slab: { x: number; y: number; w: number; d: number };
  landing: { x: number; y: number; w: number; d: number };
  bounds: Bounds;
}

export function planGeom(floor: Floor): PlanGeom {
  const n = Math.max(1, floor.depts.length);
  const cols = n <= 3 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  const rooms = floor.depts.map((dept, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return { dept, x: M + c * RW, y: M + r * (RD + CORR), w: RW - 0.25, d: RD };
  });
  const w = cols * RW + M * 2;
  const d = rows * RD + (rows - 1) * CORR + M * 2 + FRONT;
  const slab = { x: 0, y: 0, w, d };
  // The lift stands outside the slab, against its right side (never over a room label).
  const landing = { x: w, y: d - 2.6, w: 1.5, d: 2.1 };
  const corners = [iso(0, 0, 0), iso(w + 1.5, 0, 0), iso(w + 1.5, d, 0), iso(0, d, 0)];
  const bounds: Bounds = {
    minX: Math.min(...corners.map((c) => c[0])) - 30,
    maxX: Math.max(...corners.map((c) => c[0])) + 30,
    minY: Math.min(...corners.map((c) => c[1])) - 90,
    maxY: Math.max(...corners.map((c) => c[1])) + 40,
  };
  return { rooms, slab, landing, bounds };
}
