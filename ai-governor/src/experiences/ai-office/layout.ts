/**
 * Campus layout for the AI Office — pure, memoised on (catalog, room size, columns).
 * Departments of the same group share a "plot" (plate); plots are packed into
 * rows first-fit so related departments sit side by side.
 */
import type { AgentDef, Catalog, DepartmentDef, EquipmentKind } from '@sdk';
import { iso } from '@ds';

export interface Seat {
  agent: AgentDef;
  /** Desk origin (world units). */
  x: number;
  y: number;
}

export interface PlacedItem {
  kind: EquipmentKind;
  x: number;
  y: number;
  wall: boolean;
}

export interface RoomLayout {
  dept: DepartmentDef;
  x: number;
  y: number;
  s: number;
  seats: Seat[];
  /** Agents that do not fit in the room (shown as "+N"). */
  overflow: AgentDef[];
  items: PlacedItem[];
  plant: { x: number; y: number };
  group: string;
}

export interface Plate {
  group: string;
  x: number;
  y: number;
  w: number;
  d: number;
  label: boolean;
}

export interface OfficeLayout {
  rooms: RoomLayout[];
  plates: Plate[];
  roomOf: Map<string, RoomLayout>;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

const WALL_ITEMS: EquipmentKind[] = ['board', 'gauge', 'archive'];
const FOOTPRINT: Partial<Record<EquipmentKind, number>> = {
  meeting: 3, conveyor: 2.5, lab: 2, router: 1.5, database: 1, server: 1, antenna: 1, shield: 1,
};
const KIND_ORDER: Record<AgentDef['kind'], number> = { human: 0, llm: 1, script: 2, service: 3 };

export const GAP_IN = 1;
export const GAP_GROUP = 1.6;
export const GAP_ROW = 2.4;
const MARGIN = 0.45;

function buildRoom(dept: DepartmentDef, x: number, y: number, s: number, agents: AgentDef[], group: string): RoomLayout {
  const items = dept.equipment.filter((k) => k !== 'desk');
  const wall = items.filter((k) => WALL_ITEMS.includes(k));
  const floor = items.filter((k) => !WALL_ITEMS.includes(k)).sort((a, b) => (FOOTPRINT[b] ?? 1) - (FOOTPRINT[a] ?? 1));

  const placed: PlacedItem[] = [];
  const wallSlots: Array<[number, number]> = [[s - 1.75, 0.08], [s - 3.1, 0.08]];
  const floorSlots: Array<[number, number]> = [[s - 1.8, s - 2.15], [s - 1.35, 1.0], [s - 1.35, s - 0.95]];
  wall.forEach((k, i) => {
    const slot = wallSlots[i];
    if (slot) placed.push({ kind: k, x: x + slot[0], y: y + slot[1], wall: true });
  });
  floor.forEach((k, i) => {
    const slot = floorSlots[i];
    if (slot) placed.push({ kind: k, x: x + slot[0], y: y + slot[1], wall: false });
  });

  const rightLimit = s - (floor.length ? 1.7 : 0.3);
  const xs: number[] = [];
  for (let i = 0; 0.5 + i * 1.6 + 0.9 <= rightLimit; i++) xs.push(0.5 + i * 1.6);
  const ys: number[] = [];
  for (let j = 0; 0.75 + j * 1.85 + 1.35 <= s - 0.25; j++) ys.push(0.75 + j * 1.85);
  if (!xs.length) xs.push(0.5);
  if (!ys.length) ys.push(0.75);

  const staff = agents
    .filter((a) => a.departmentIds.includes(dept.id))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name, 'fr'));
  const capacity = xs.length * ys.length;
  const seats: Seat[] = staff.slice(0, capacity).map((agent, i) => ({
    agent,
    x: x + xs[i % xs.length],
    y: y + ys[Math.floor(i / xs.length)],
  }));
  return { dept, x, y, s, seats, overflow: staff.slice(capacity), items: placed, plant: { x: x + 0.35, y: y + s - 0.4 }, group };
}

export function computeLayout(catalog: Catalog, s: number, cols: number, arrangement: 'campus' | 'stack' = 'campus'): OfficeLayout {
  if (arrangement === 'stack') return stackLayout(catalog, s);
  const groups = new Map<string, DepartmentDef[]>();
  for (const d of catalog.departments) {
    const list = groups.get(d.group) ?? [];
    list.push(d);
    groups.set(d.group, list);
  }
  const chunks: Array<{ group: string; depts: DepartmentDef[]; first: boolean }> = [];
  for (const [group, ds] of groups) for (let i = 0; i < ds.length; i += cols) chunks.push({ group, depts: ds.slice(i, i + cols), first: i === 0 });

  // First-fit packing: a later small group fills the gap left in an earlier row.
  const rows: Array<typeof chunks> = [];
  const used: number[] = [];
  for (const c of chunks) {
    let r = used.findIndex((u) => u + c.depts.length <= cols);
    if (r < 0) {
      r = rows.length;
      rows.push([]);
      used.push(0);
    }
    rows[r].push(c);
    used[r] += c.depts.length;
  }

  const rooms: RoomLayout[] = [];
  const plates: Plate[] = [];
  rows.forEach((row, ri) => {
    let x = 0;
    const y = ri * (s + GAP_ROW);
    row.forEach((c, ci) => {
      if (ci > 0) x += GAP_GROUP - GAP_IN;
      const x0 = x;
      for (const d of c.depts) {
        rooms.push(buildRoom(d, x, y, s, catalog.agents, c.group));
        x += s + GAP_IN;
      }
      const w = x - GAP_IN - x0;
      plates.push({ group: c.group, x: x0 - MARGIN, y: y - MARGIN, w: w + 2 * MARGIN, d: s + 2 * MARGIN, label: c.first });
    });
  });

  return finish(rooms, plates);
}

/**
 * Phone arrangement: two rooms per screen row, rows stacked downward, so the
 * campus reads top-to-bottom on a portrait screen instead of a long diagonal.
 */
function stackLayout(catalog: Catalog, s: number): OfficeLayout {
  const order = [...catalog.departments].sort((a, b) => {
    const ga = catalog.departments.findIndex((d) => d.group === a.group);
    const gb = catalog.departments.findIndex((d) => d.group === b.group);
    return ga - gb;
  });
  const P = s + 1.4;
  const rooms = order.map((d, i) => {
    const k = Math.floor(i / 2);
    const c = i % 2;
    return buildRoom(d, (k + c) * P, (k - c) * P, s, catalog.agents, d.group);
  });
  return finish(rooms, []);
}

function finish(rooms: RoomLayout[], plates: Plate[]): OfficeLayout {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = ([a, b]: [number, number]) => {
    minX = Math.min(minX, a);
    minY = Math.min(minY, b);
    maxX = Math.max(maxX, a);
    maxY = Math.max(maxY, b);
  };
  const rects = plates.length ? plates : rooms.map((r) => ({ x: r.x, y: r.y, w: r.s, d: r.s }));
  for (const p of rects) {
    add(iso(p.x, p.y, 1.7));
    add(iso(p.x + p.w, p.y, 0));
    add(iso(p.x, p.y + p.d, 0));
    add(iso(p.x + p.w, p.y + p.d, 0));
    const [lx, ly] = iso(p.x, p.y + p.d, 0);
    add([lx - 10, ly + 46]);
  }
  if (!rects.length) {
    minX = -100;
    minY = -100;
    maxX = 100;
    maxY = 100;
  }
  return { rooms, plates, roomOf: new Map(rooms.map((r) => [r.dept.id, r])), bounds: { minX: minX - 30, minY: minY - 40, maxX: maxX + 30, maxY: maxY + 30 } };
}

/** Where an agent stands when present at a seat. */
export function figureSpot(seat: Seat): [number, number] {
  return seat.agent.kind === 'script' || seat.agent.kind === 'service' ? [seat.x + 0.45, seat.y + 0.45] : [seat.x + 0.45, seat.y + 0.95];
}
