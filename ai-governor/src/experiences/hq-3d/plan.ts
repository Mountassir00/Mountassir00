/**
 * Floor plan of the headquarters — pure geometry, no Three.js.
 *
 * One level. Departments are grouped into WINGS (catalog `group`: Direction,
 * Optimisation, Savoir-faire, Opérations, Contrôle…), each wing a run of
 * rooms along a corridor ("rue des pôles"). Common spaces complete the plan:
 * lounge (idle agents), meeting room (agents collaborating on one task),
 * model room (where model calls arrive), test gym (= Benchmark Laboratory)
 * and reception (= Connector Department, main entrance).
 *
 * Layout: rows of rooms on both sides of B east–west corridors. The outer
 * rows span the full width; inner rows are back to back and inset to leave
 * two end passages that join the corridors (a ring), so every room is
 * reachable through its door without crossing a wall.
 *
 * World axes (metres): x east, z south, y up. The plan is generated from the
 * catalog only, so an imported catalog gets its own building.
 */
import type { Catalog, DepartmentDef, EquipmentKind, PastelSlot } from '@sdk';

export const ROOM_DEPTH = 5.6;
export const CORRIDOR = 2.6;
export const WALL_T = 0.16;
export const WALL_H = 2.8;
/** Height of the cut-away walls in the overview. */
export const LOW_H = 1.0;
export const DOOR_W = 1.4;
export const DOOR_H = 2.2;
export const BASE_W = 6.2;
export const ENTRANCE_W = 2.2;

export type SpaceRole = 'department' | 'lounge' | 'meeting' | 'models' | 'gym' | 'reception';

export interface P2 {
  x: number;
  z: number;
}
export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface Space {
  id: string;
  role: SpaceRole;
  /** Display name (department name, or the common space name). */
  name: string;
  /** What it is, in one short line (label subtitle). */
  caption: string;
  wing: string;
  wingId: string;
  deptId?: string;
  nodeId?: string;
  dept?: DepartmentDef;
  tone: PastelSlot;
  equipment: EquipmentKind[];
  rect: Rect;
  row: number;
  corridor: number;
  /** +1: door on the south wall (z1); −1: door on the north wall (z0). */
  doorSide: 1 | -1;
  /** Door centre on the wall line. */
  door: P2;
  /** Just inside the door. */
  inner: P2;
  /** In front of the door, on the corridor centre line. */
  outer: P2;
  center: P2;
  /** Exterior entrance (reception only), on the façade line. */
  entrance?: P2;
}

export interface Corridor {
  id: string;
  name: string;
  rect: Rect;
  /** Centre line. */
  z: number;
}

export interface Passage {
  id: string;
  name: string;
  rect: Rect;
  x: number;
}

export type WallSide = 'n' | 's' | 'e' | 'w' | 'int';

export interface WallSeg {
  rect: Rect;
  /** Exterior façade side, or interior. */
  side: WallSide;
  /** Runs along z (drawn 2 mm lower so caps never z-fight). */
  vertical: boolean;
  /** Upper part in glass (meeting room, model room fronts). */
  glass?: boolean;
}

export interface DoorGap {
  /** Wall line (z for horizontal walls, x for vertical). */
  line: number;
  a: number;
  b: number;
  vertical: boolean;
  exterior: boolean;
}

export interface Wing {
  id: string;
  name: string;
  spaceIds: string[];
}

export interface Building {
  width: number;
  depth: number;
  bounds: Rect;
  spaces: Space[];
  byId: Map<string, Space>;
  byDept: Map<string, Space>;
  corridors: Corridor[];
  passages: Passage[];
  walls: WallSeg[];
  doors: DoorGap[];
  wings: Wing[];
  lounge?: Space;
  meeting?: Space;
  models?: Space;
  gym?: Space;
  reception?: Space;
  /** x of the two end passages' centre lines (west, east); empty with a single corridor. */
  passageX: number[];
  /** Centre lines of the corridors. */
  corridorZ: number[];
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pole';

export const COMMONS_WING = 'Espaces communs';

const isGym = (d: DepartmentDef) => d.id === 'benchmark' || /bench/i.test(`${d.id} ${d.name}`);
const isReception = (d: DepartmentDef) => d.id === 'connectors' || /connect/i.test(`${d.id} ${d.name}`);

interface Draft {
  id: string;
  role: SpaceRole;
  name: string;
  caption: string;
  wing: string;
  dept?: DepartmentDef;
  nodeId?: string;
  tone: PastelSlot;
  equipment: EquipmentKind[];
  weight: number;
}

/** Builds the floor plan from the catalog. Deterministic. */
export function planBuilding(catalog: Pick<Catalog, 'departments' | 'nodes'>): Building {
  const depts = catalog.departments;
  const gymDept = depts.find(isGym);
  const recDept = depts.find((d) => d !== gymDept && isReception(d));
  const modelNode = catalog.nodes.find((n) => n.kind === 'provider' && n.visibility !== 'none') ?? catalog.nodes.find((n) => n.kind === 'model');

  // wings (catalog order of first appearance)
  const wingOrder: string[] = [];
  const wingDrafts = new Map<string, Draft[]>();
  for (const d of depts) {
    if (d === gymDept || d === recDept) continue;
    const w = d.group || 'Pôle';
    if (!wingDrafts.has(w)) {
      wingDrafts.set(w, []);
      wingOrder.push(w);
    }
    wingDrafts.get(w)!.push({ id: `d-${d.id}`, role: 'department', name: d.name, caption: `Pôle ${w}`, wing: w, dept: d, tone: d.tone, equipment: d.equipment, weight: 1 });
  }
  const commons: Draft[] = [
    { id: 'meeting', role: 'meeting', name: 'Salle de réunion', caption: 'Collaborations sur une même tâche', wing: COMMONS_WING, tone: 'p3', equipment: ['meeting', 'board'], weight: 1 },
    { id: 'lounge', role: 'lounge', name: 'Salon', caption: 'Agents disponibles', wing: COMMONS_WING, tone: 'p4', equipment: [], weight: 1 },
  ];
  if (modelNode) commons.push({ id: 'models', role: 'models', name: 'Salle des modèles', caption: 'Arrivée des appels de modèles', wing: COMMONS_WING, nodeId: modelNode.id, tone: 'p2', equipment: ['server'], weight: 1 });
  if (gymDept) commons.push({ id: `d-${gymDept.id}`, role: 'gym', name: 'Salle d’essais', caption: gymDept.name, wing: COMMONS_WING, dept: gymDept, tone: gymDept.tone, equipment: gymDept.equipment, weight: 1 });
  const reception: Draft = recDept
    ? { id: `d-${recDept.id}`, role: 'reception', name: 'Accueil', caption: recDept.name, wing: COMMONS_WING, dept: recDept, tone: recDept.tone, equipment: recDept.equipment, weight: 1 }
    : { id: 'reception', role: 'reception', name: 'Accueil', caption: 'Entrée principale', wing: COMMONS_WING, tone: 'p2', equipment: [], weight: 1 };

  const N = [...wingDrafts.values()].reduce((s, l) => s + l.length, 0) + commons.length + 1;
  const B = Math.max(1, Math.ceil(N / 10));
  const R = 2 * B;
  let F = 1;
  while (2 * F + (R - 2) * Math.max(1, F - 1) < N) F++;
  const I = Math.max(1, F - 1);
  const caps = Array.from({ length: R }, (_, r) => (r === 0 || r === R - 1 ? F : I));
  const rows: Draft[][] = Array.from({ length: R }, () => []);
  // reception: last row (south façade), placed in its centre later
  caps[R - 1]--;
  const remaining = () => caps.map((c, r) => c - rows[r].length);
  const bestRow = (prefer?: (r: number) => boolean) => {
    const rem = remaining();
    let best = -1;
    for (let r = 0; r < R; r++) {
      if (rem[r] <= 0 || (prefer && !prefer(r))) continue;
      if (best < 0 || rem[r] > rem[best]) best = r;
    }
    return best;
  };
  const wings = wingOrder.map((w) => ({ name: w, list: wingDrafts.get(w)! })).sort((a, b) => b.list.length - a.list.length);
  for (const w of wings) {
    const rem = remaining();
    const fit = rem.map((v, r) => (v >= w.list.length ? r : -1)).filter((r) => r >= 0);
    if (fit.length) {
      const r = fit.reduce((a, b) => (rem[b] > rem[a] ? b : a));
      rows[r].push(...w.list);
    } else {
      // larger than any row: split over the rows with the most room
      const queue = [...w.list];
      while (queue.length) {
        let r = bestRow();
        if (r < 0) {
          // every row is full: widen the last inner row
          r = R > 2 ? 1 : 0;
          caps[r]++;
        }
        rows[r].push(queue.shift()!);
      }
    }
  }
  for (const c of commons) {
    const middle = (r: number) => r > 0 && r < R - 1;
    let r = c.role === 'gym' ? bestRow() : bestRow(middle);
    if (r < 0) r = bestRow();
    if (r < 0) {
      r = R - 1;
      caps[r]++;
    }
    rows[r].push(c);
  }
  const last = rows[R - 1];
  last.splice(Math.floor(last.length / 2), 0, reception);

  // dimensions
  const fullCount = Math.max(...rows.filter((_, r) => r === 0 || r === R - 1).map((l) => l.length), 1);
  const innerCount = R > 2 ? Math.max(...rows.filter((_, r) => r > 0 && r < R - 1).map((l) => l.length), 1) : 0;
  const W = Math.max(fullCount * BASE_W, R > 2 ? innerCount * BASE_W + 2 * CORRIDOR : 0, 3 * BASE_W);
  const D = R * ROOM_DEPTH + B * CORRIDOR;
  const X0 = -W / 2;
  const Z0 = -D / 2;

  const spaces: Space[] = [];
  const corridors: Corridor[] = [];
  const rowZ: Array<[number, number]> = [];
  let z = Z0;
  for (let r = 0; r < R; r++) {
    rowZ.push([z, z + ROOM_DEPTH]);
    z += ROOM_DEPTH;
    if (r % 2 === 0) {
      const b = r / 2;
      corridors.push({
        id: `corridor-${b}`,
        name: B === 1 ? 'Rue des pôles' : B === 2 ? (b === 0 ? 'Rue des pôles nord' : 'Rue des pôles sud') : `Rue des pôles ${b + 1}`,
        rect: { x0: X0, z0: z, x1: X0 + W, z1: z + CORRIDOR },
        z: z + CORRIDOR / 2,
      });
      z += CORRIDOR;
    }
  }
  const passageX = R > 2 ? [X0 + CORRIDOR / 2, X0 + W - CORRIDOR / 2] : [];
  const passages: Passage[] =
    R > 2
      ? [
          { id: 'passage-w', name: 'Passage ouest', rect: { x0: X0, z0: corridors[0].rect.z1, x1: X0 + CORRIDOR, z1: corridors[B - 1].rect.z0 }, x: passageX[0] },
          { id: 'passage-e', name: 'Passage est', rect: { x0: X0 + W - CORRIDOR, z0: corridors[0].rect.z1, x1: X0 + W, z1: corridors[B - 1].rect.z0 }, x: passageX[1] },
        ]
      : [];

  const rowX = (r: number): [number, number] => (r === 0 || r === R - 1 ? [X0, X0 + W] : [X0 + CORRIDOR, X0 + W - CORRIDOR]);
  rows.forEach((list, r) => {
    const [rx0, rx1] = rowX(r);
    const [za, zb] = rowZ[r];
    const total = list.reduce((s, d) => s + d.weight, 0) || 1;
    const doorSide: 1 | -1 = r % 2 === 0 ? 1 : -1;
    const corridor = r % 2 === 0 ? r / 2 : (r - 1) / 2;
    const cz = corridors[corridor].z;
    let x = rx0;
    list.forEach((d, i) => {
      const w = ((rx1 - rx0) * d.weight) / total;
      const rect: Rect = { x0: x, z0: za, x1: x + w, z1: zb };
      x += w;
      const wallZ = doorSide > 0 ? zb : za;
      // doors near the west end of the room, alternating, the reception's in the middle (aligned with the entrance)
      const dx = d.role === 'reception' ? rect.x0 + w / 2 : i % 2 === 0 ? rect.x0 + Math.min(1.25, w * 0.22) : rect.x1 - Math.min(1.25, w * 0.22);
      const door = { x: dx, z: wallZ };
      const space: Space = {
        id: d.id,
        role: d.role,
        name: d.name,
        caption: d.caption,
        wing: d.wing,
        wingId: slug(d.wing),
        deptId: d.dept?.id,
        nodeId: d.nodeId,
        dept: d.dept,
        tone: d.tone,
        equipment: d.equipment,
        rect,
        row: r,
        corridor,
        doorSide,
        door,
        inner: { x: dx, z: wallZ - doorSide * 0.75 },
        outer: { x: dx, z: cz },
        center: { x: rect.x0 + w / 2, z: (za + zb) / 2 },
      };
      if (d.role === 'reception' && r === R - 1) space.entrance = { x: rect.x0 + w / 2, z: zb };
      spaces.push(space);
    });
  });

  /* ---------------- walls ---------------- */
  const T = WALL_T;
  const walls: WallSeg[] = [];
  const doors: DoorGap[] = [];
  const hWall = (zl: number, xa: number, xb: number, gaps: Array<[number, number]>, side: WallSide, glassRanges: Array<[number, number]> = []) => {
    const cuts = [...gaps].sort((a, b) => a[0] - b[0]);
    let s = xa;
    const push = (a: number, b: number) => {
      if (b - a < 0.02) return;
      // split by glass ranges
      let c = a;
      for (const [ga, gb] of glassRanges) {
        const g0 = Math.max(ga, a);
        const g1 = Math.min(gb, b);
        if (g1 <= g0) continue;
        if (g0 > c) walls.push({ rect: { x0: c, z0: zl - T / 2, x1: g0, z1: zl + T / 2 }, side, vertical: false });
        walls.push({ rect: { x0: g0, z0: zl - T / 2, x1: g1, z1: zl + T / 2 }, side, vertical: false, glass: true });
        c = g1;
      }
      if (b > c + 0.02) walls.push({ rect: { x0: c, z0: zl - T / 2, x1: b, z1: zl + T / 2 }, side, vertical: false });
    };
    for (const [ga, gb] of cuts) {
      push(s, ga);
      doors.push({ line: zl, a: ga, b: gb, vertical: false, exterior: side !== 'int' });
      s = gb;
    }
    push(s, xb);
  };
  const vWall = (xl: number, za: number, zb: number, side: WallSide) => {
    if (zb - za < 0.02) return;
    walls.push({ rect: { x0: xl - T / 2, z0: za, x1: xl + T / 2, z1: zb }, side, vertical: true });
  };

  // façades
  hWall(Z0, X0 - T / 2, X0 + W + T / 2, [], 'n');
  const rec = spaces.find((s) => s.entrance);
  hWall(Z0 + D, X0 - T / 2, X0 + W + T / 2, rec?.entrance ? [[rec.entrance.x - ENTRANCE_W / 2, rec.entrance.x + ENTRANCE_W / 2]] : [], 's');
  vWall(X0, Z0, Z0 + D, 'w');
  vWall(X0 + W, Z0, Z0 + D, 'e');

  for (let r = 0; r < R; r++) {
    const [rx0, rx1] = rowX(r);
    const [za, zb] = rowZ[r];
    const full = r === 0 || r === R - 1;
    const inRow = spaces.filter((s) => s.row === r);
    const doorSide = r % 2 === 0 ? 1 : -1;
    const front = doorSide > 0 ? zb : za;
    const ext = full ? 0 : T / 2;
    const glass = inRow.filter((s) => s.role === 'meeting' || s.role === 'models').map((s): [number, number] => [s.rect.x0 + 0.3, s.rect.x1 - 0.3]);
    hWall(front, rx0 - ext, rx1 + ext, inRow.map((s) => [s.door.x - DOOR_W / 2, s.door.x + DOOR_W / 2] as [number, number]), 'int', glass);
    for (let i = 1; i < inRow.length; i++) vWall(inRow[i].rect.x0, za, zb, 'int');
    if (!full) {
      vWall(rx0, za, zb, 'int');
      vWall(rx1, za, zb, 'int');
      // back-to-back wall with the next inner row (once per pair)
      if (r % 2 === 1 && r + 1 < R - 1) hWall(zb, rx0 - T / 2, rx1 + T / 2, [], 'int');
    }
  }

  const byId = new Map(spaces.map((s) => [s.id, s]));
  const byDept = new Map<string, Space>();
  for (const s of spaces) if (s.deptId) byDept.set(s.deptId, s);
  const wingList: Wing[] = wingOrder.map((w) => ({ id: slug(w), name: w, spaceIds: spaces.filter((s) => s.wing === w).map((s) => s.id) }));
  wingList.push({ id: slug(COMMONS_WING), name: COMMONS_WING, spaceIds: spaces.filter((s) => s.wing === COMMONS_WING).map((s) => s.id) });

  return {
    width: W,
    depth: D,
    bounds: { x0: X0, z0: Z0, x1: X0 + W, z1: Z0 + D },
    spaces,
    byId,
    byDept,
    corridors,
    passages,
    walls,
    doors,
    wings: wingList,
    lounge: spaces.find((s) => s.role === 'lounge'),
    meeting: spaces.find((s) => s.role === 'meeting'),
    models: spaces.find((s) => s.role === 'models'),
    gym: spaces.find((s) => s.role === 'gym'),
    reception: spaces.find((s) => s.role === 'reception'),
    passageX,
    corridorZ: corridors.map((c) => c.z),
  };
}

/* ------------------------------------------------------------------ */
/* Lookup                                                               */
/* ------------------------------------------------------------------ */

const inside = (r: Rect, p: P2, m = 0) => p.x >= r.x0 - m && p.x <= r.x1 + m && p.z >= r.z0 - m && p.z <= r.z1 + m;

export function spaceAt(b: Building, p: P2): Space | undefined {
  return b.spaces.find((s) => inside(s.rect, p));
}

/** Name of the place at a point (room, corridor, passage, outside). */
export function placeName(b: Building, p: P2): { id: string; name: string } {
  const s = spaceAt(b, p);
  if (s) return { id: s.id, name: s.name };
  const c = b.corridors.find((x) => inside(x.rect, p));
  if (c) return { id: c.id, name: c.name };
  const pa = b.passages.find((x) => inside(x.rect, p));
  if (pa) return { id: pa.id, name: pa.name };
  return { id: 'outside', name: 'Parvis' };
}

/* ------------------------------------------------------------------ */
/* Routes (through doors and corridors, never through a wall)           */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Projects a circulation point onto the corridor network (centre lines). */
function toNetwork(b: Building, p: P2): P2 {
  const xL = b.passageX[0] ?? b.bounds.x0 + CORRIDOR / 2;
  const xR = b.passageX[1] ?? b.bounds.x1 - CORRIDOR / 2;
  const c = b.corridors.find((x) => inside(x.rect, p, 0.2));
  if (c) return { x: clamp(p.x, xL, xR), z: c.z };
  const pa = b.passages.find((x) => inside(x.rect, p, 0.2));
  if (pa) return { x: pa.x, z: clamp(p.z, b.corridorZ[0], b.corridorZ[b.corridorZ.length - 1]) };
  // nearest corridor centre line
  let best = b.corridors[0];
  for (const x of b.corridors) if (Math.abs(x.z - p.z) < Math.abs(best.z - p.z)) best = x;
  return { x: clamp(p.x, xL, xR), z: best.z };
}

function onPassage(b: Building, p: P2) {
  return b.passageX.findIndex((x) => Math.abs(p.x - x) < 0.01 && !b.corridorZ.some((z) => Math.abs(p.z - z) < 0.01));
}

/** Route between two points on the corridor network. */
function networkRoute(b: Building, a: P2, c: P2): P2[] {
  const sameLine = b.corridorZ.some((z) => Math.abs(a.z - z) < 0.01 && Math.abs(c.z - z) < 0.01);
  if (sameLine) return [a, c];
  const pa = onPassage(b, a);
  const pc = onPassage(b, c);
  if (pa >= 0 && pc === pa) return [a, c];
  if (!b.passageX.length) return [a, { x: a.x, z: c.z }, c];
  const options = pa >= 0 ? [b.passageX[pa]] : pc >= 0 ? [b.passageX[pc]] : b.passageX;
  let best: P2[] | null = null;
  let bestLen = Infinity;
  for (const xs of options) {
    const pts = [a, { x: xs, z: a.z }, { x: xs, z: c.z }, c];
    const len = polyLength(pts);
    if (len < bestLen) {
      bestLen = len;
      best = pts;
    }
  }
  return best!;
}

export function polyLength(pts: P2[]) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
  return s;
}

/**
 * Walkable route from `from` to `to`: out through the door of the start room,
 * along the corridors (via the end passages if needed), in through the door of
 * the destination room. Same room: straight line. Outside (forecourt): via the
 * reception entrance.
 */
export function route(b: Building, from: P2, to: P2): P2[] {
  const sa = spaceAt(b, from);
  const sb = spaceAt(b, to);
  if (sa && sb && sa.id === sb.id) return [from, to];
  const outside = (p: P2) => !inside(b.bounds, p, -0.05);
  const pts: P2[] = [from];
  let na: P2;
  const rec = b.reception;
  if (outside(from) && rec?.entrance) {
    pts.push({ x: rec.entrance.x, z: rec.entrance.z + 0.8 }, { x: rec.entrance.x, z: rec.entrance.z - 0.8 });
    if (sb?.id === rec.id) {
      pts.push(to);
      return dedupe(pts);
    }
    pts.push(rec.inner, rec.outer);
    na = rec.outer;
  } else if (sa) {
    pts.push(sa.inner, sa.outer);
    na = sa.outer;
  } else {
    na = toNetwork(b, from);
    pts.push(na);
  }
  const tail: P2[] = [];
  let nb: P2;
  if (outside(to) && rec?.entrance) {
    nb = rec.outer;
    tail.push(rec.outer, rec.inner, { x: rec.entrance.x, z: rec.entrance.z - 0.8 }, { x: rec.entrance.x, z: rec.entrance.z + 0.8 }, to);
  } else if (sb) {
    nb = sb.outer;
    tail.push(sb.outer, sb.inner, to);
  } else {
    nb = toNetwork(b, to);
    tail.push(nb, to);
  }
  const mid = networkRoute(b, na, nb);
  pts.push(...mid.slice(1, -1));
  pts.push(...tail);
  return dedupe(pts);
}

function dedupe(pts: P2[]): P2[] {
  const out: P2[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.z - q.z) > 0.03) out.push(p);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Collisions and visibility                                            */
/* ------------------------------------------------------------------ */

/** Pushes a circle of radius `r` out of every wall; keeps it near the building. */
export function collide(b: Building, p: P2, r = 0.3): P2 {
  let x = p.x;
  let z = p.z;
  for (let pass = 0; pass < 2; pass++) {
    for (const w of b.walls) {
      const q = w.rect;
      const cx = clamp(x, q.x0, q.x1);
      const cz = clamp(z, q.z0, q.z1);
      const dx = x - cx;
      const dz = z - cz;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      if (d > 1e-6) {
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      } else {
        // centre inside the wall: leave by the shortest side
        const opts = [
          { v: x - q.x0, nx: q.x0 - r, nz: z },
          { v: q.x1 - x, nx: q.x1 + r, nz: z },
          { v: z - q.z0, nx: x, nz: q.z0 - r },
          { v: q.z1 - z, nx: x, nz: q.z1 + r },
        ].sort((a, c) => a.v - c.v)[0];
        x = opts.nx;
        z = opts.nz;
      }
    }
  }
  const m = 5;
  return { x: clamp(x, b.bounds.x0 - m, b.bounds.x1 + m), z: clamp(z, b.bounds.z0 - m, b.bounds.z1 + m) };
}

/** True when the segment a→b crosses a wall (doors are gaps, so you see through them). */
export function blocked(b: Building, a: P2, c: P2): boolean {
  const dx = c.x - a.x;
  const dz = c.z - a.z;
  for (const w of b.walls) {
    if (w.glass) continue;
    const r = w.rect;
    let t0 = 0.02;
    let t1 = 0.98;
    const slab = (p: number, d: number, lo: number, hi: number) => {
      if (Math.abs(d) < 1e-9) return p >= lo && p <= hi;
      let ta = (lo - p) / d;
      let tb = (hi - p) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta);
      t1 = Math.min(t1, tb);
      return t0 <= t1;
    };
    if (slab(a.x, dx, r.x0, r.x1) && slab(a.z, dz, r.z0, r.z1)) return true;
  }
  return false;
}

/** Plan coordinates (0,0 = north-west corner) for the minimap. */
export function toPlan(b: Building, p: P2) {
  return { x: p.x - b.bounds.x0, y: p.z - b.bounds.z0 };
}
