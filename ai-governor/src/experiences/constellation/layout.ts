/**
 * Deterministic 3D layouts (unit scene radius ≈ 1). Positions are seeded by
 * node id, so a new task never reshuffles the others.
 *  - burst: governor at the core, departments along spiral arms (one arm per
 *    group), engines around the core, models/tools/data in an outer halo,
 *    tasks sprayed outward from their department like filaments.
 *  - sphere: governor at the centre; every other node on a Fibonacci sphere,
 *    partitioned into contiguous regions (agents, each department group,
 *    models, tools, data); department hubs sit in the middle of their tasks.
 */
import type { GovEvent, PastelSlot } from '@sdk';
import type { GNode, Graph } from './model';

export type Vec3 = [number, number, number];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string): () => number {
  let a = hashStr(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(Math.max(1e-6, r()))) * Math.cos(2 * Math.PI * r());
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const normalize = (a: Vec3): Vec3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Two unit vectors orthogonal to `d` (tangent frame). */
function frame(d: Vec3): [Vec3, Vec3] {
  const up: Vec3 = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = normalize(cross(d, up));
  return [u, cross(u, d)];
}

/** N evenly spread unit vectors (golden-angle spiral). */
export function fibonacci(n: number, offset = 0): Vec3[] {
  const out: Vec3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = n === 1 ? 0 : 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = ga * i + offset;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}

/* ------------------------------------------------------------------ burst */

const ARM_TWIST = 0.7;
const armBase = new Map<number, Vec3[]>();

/** Arm directions spread in 3D (a flattened Fibonacci set), twisted with the radius. */
function armDir(k: number, count: number, r: number): Vec3 {
  let bases = armBase.get(count);
  if (!bases) {
    bases = fibonacci(Math.max(1, count), 0.9).map((d) => normalize([d[0], d[1] * 0.6, d[2]]));
    armBase.set(count, bases);
  }
  const b = bases[k % bases.length];
  const a = r * ARM_TWIST;
  const c = Math.cos(a), s = Math.sin(a);
  return normalize([b[0] * c - b[2] * s, b[1], b[0] * s + b[2] * c]);
}

export function layoutBurst(graph: Graph): Map<string, Vec3> {
  const pos = new Map<string, Vec3>();
  const { nodes, groups } = graph;
  const K = groups.length;
  pos.set('governor', [0, 0, 0]);

  // Departments along their group's spiral arm.
  const perGroup = new Map<string, GNode[]>();
  for (const n of nodes) if (n.type === 'department') perGroup.set(n.group, [...(perGroup.get(n.group) ?? []), n]);
  groups.forEach((gname, k) => {
    (perGroup.get(gname) ?? []).forEach((n, j) => {
      const r = Math.min(1.05, 0.36 + j * 0.21);
      const d = armDir(k, K, r);
      const [u, v] = frame(d);
      const rr = rng(n.key);
      const side = (j % 2 ? 1 : -1) * (0.05 + 0.03 * j);
      pos.set(n.key, add(add(scale(d, r), scale(u, side)), scale(v, (rr() - 0.5) * 0.1)));
    });
  });

  // Engines (and the person) close to the core, leaning toward the departments they serve.
  const engineDepts = new Map<string, string[]>();
  for (const l of graph.links) {
    if (l.kind !== 'engine') continue;
    const [dept, eng] = graph.byKey.get(l.a)?.type === 'department' ? [l.a, l.b] : [l.b, l.a];
    engineDepts.set(eng, [...(engineDepts.get(eng) ?? []), dept]);
  }
  for (const n of nodes) {
    if (n.type !== 'agent') continue;
    const rr = rng(n.key);
    const ds = (engineDepts.get(n.key) ?? []).map((d) => pos.get(d)).filter(Boolean) as Vec3[];
    let dir: Vec3 = ds.length ? normalize(ds.reduce(add, [0, 0, 0] as Vec3)) : normalize([gauss(rr), gauss(rr) * 0.4, gauss(rr)]);
    dir = normalize(add(dir, [(rr() - 0.5) * 0.5, (rr() - 0.5) * 0.4, (rr() - 0.5) * 0.5]));
    pos.set(n.key, scale(dir, n.key === 'you' ? 0.15 : 0.2 + rr() * 0.12));
  }

  // Outer halo: models, tools, data — placed toward what they are linked to, then spread apart.
  const outer = nodes.filter((n) => n.type === 'model' || n.type === 'tool' || n.type === 'data');
  const fib = fibonacci(Math.max(1, outer.length), 0.7);
  const neighbours = new Map<string, string[]>();
  const note = (a: string, b: string) => neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
  for (const l of graph.links) {
    note(l.a, l.b);
    note(l.b, l.a);
  }
  const dirs: Vec3[] = outer.map((n, i) => {
    const ps = (neighbours.get(n.key) ?? []).map((k) => pos.get(k)).filter((p): p is Vec3 => !!p && len(p) > 0.01);
    const want = ps.length ? normalize(ps.reduce(add, [0, 0, 0] as Vec3)) : fib[i];
    return normalize(add(scale(want, 0.75), scale(fib[i], 0.25)));
  });
  const minDot = Math.cos(0.42);
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < dirs.length; i++) {
      for (let j = i + 1; j < dirs.length; j++) {
        if (dot(dirs[i], dirs[j]) < minDot) continue;
        const push = scale(normalize(add(dirs[i], scale(dirs[j], -1))), 0.05);
        dirs[i] = normalize(add(dirs[i], push));
        dirs[j] = normalize(add(dirs[j], scale(push, -1)));
      }
    }
  }
  outer.forEach((n, i) => {
    const r = n.type === 'model' ? 1.22 : n.type === 'tool' ? 1.36 : 1.3;
    const d = dirs[i];
    pos.set(n.key, [d[0] * r, d[1] * r * 0.8, d[2] * r]);
  });

  // Tasks: filaments sprayed outward from their department.
  for (const n of nodes) {
    if (n.type !== 'task' || !n.parent) continue;
    const P = pos.get(n.parent);
    if (!P) continue;
    const rr = rng(n.key);
    const d = len(P) > 0.01 ? normalize(P) : normalize([gauss(rr), gauss(rr), gauss(rr)]);
    const [u, v] = frame(d);
    const t = Math.pow(rr(), 0.75);
    const spread = 0.012 + 0.11 * t;
    pos.set(n.key, add(add(add(P, scale(d, 0.06 + 0.62 * t)), scale(u, gauss(rr) * spread)), scale(v, gauss(rr) * spread * 0.8)));
  }
  for (const n of nodes) if (!pos.has(n.key)) pos.set(n.key, [0, 0, 0]);
  return pos;
}

export interface BgParticles {
  /** Start of each streak; the streak points away from the core. */
  xyz: Float32Array;
  /** Streak length as a fraction of the radius. */
  len: Float32Array;
  size: Float32Array;
  alpha: Float32Array;
  /** Arm index (colour) — or 255 for neutral dust. */
  arm: Uint8Array;
  count: number;
}

/** Decorative dust for the burst: carries NO data (density is a Studio setting). */
export function backgroundParticles(count: number, arms: number): BgParticles {
  const rr = rng(`dust-${arms}`);
  const xyz = new Float32Array(count * 3);
  const len = new Float32Array(count);
  const size = new Float32Array(count);
  const alpha = new Float32Array(count);
  const arm = new Uint8Array(count);
  // Grouped by arm so the renderer switches colour only a few times per frame.
  const arms0 = Array.from({ length: count }, () => (rr() < 0.3 || arms === 0 ? 255 : Math.floor(rr() * arms))).sort((a, b) => a - b);
  for (let i = 0; i < count; i++) {
    const neutral = arms0[i] === 255;
    const k = neutral ? 0 : arms0[i];
    const r = 0.08 + 1.55 * Math.pow(rr(), 1.35);
    let d: Vec3 = neutral ? normalize([gauss(rr), gauss(rr) * 0.6, gauss(rr)]) : armDir(k, arms, r);
    d = normalize(add(d, [gauss(rr) * 0.2, gauss(rr) * 0.15, gauss(rr) * 0.2]));
    len[i] = 0.012 + rr() * 0.045;
    xyz[i * 3] = d[0] * r;
    xyz[i * 3 + 1] = d[1] * r;
    xyz[i * 3 + 2] = d[2] * r;
    size[i] = 0.5 + rr() * 1.1;
    alpha[i] = (0.25 + rr() * 0.75) * (1 - Math.min(1, r / 1.6) * 0.6);
    arm[i] = neutral ? 255 : k;
  }
  return { xyz, len, size, alpha, arm, count };
}

export interface EventParticles {
  xyz: Float32Array;
  size: Float32Array;
  /** 0..7 = department tone p1..p8, 8 = no department, 9 = failed. Sorted. */
  colour: Uint8Array;
  count: number;
}

const SLOT_INDEX: Record<PastelSlot, number> = { p1: 0, p2: 1, p3: 2, p4: 3, p5: 4, p6: 5, p7: 6, p8: 7 };

/**
 * One particle per REAL event of the period (burst only): it leaves the core
 * along the arm of its department; distance to the core = age in the period
 * (recent events are still close to the core, older ones flew further).
 */
export function eventParticles(events: readonly GovEvent[], graph: Graph, range: { from: number; to: number }, max: number): EventParticles {
  const K = graph.groups.length;
  const deptInfo = new Map<string, { k: number; tone?: PastelSlot }>();
  for (const n of graph.nodes) if (n.type === 'department') deptInfo.set(n.key, { k: Math.max(0, graph.groups.indexOf(n.group)), tone: n.tone });
  const agentDept = new Map<string, string>();
  for (const l of graph.links) {
    if (l.kind !== 'engine') continue;
    const [dept, eng] = deptInfo.has(l.a) ? [l.a, l.b] : [l.b, l.a];
    if (!agentDept.has(eng)) agentDept.set(eng, dept);
  }
  const list = (events.length > max ? events.slice(events.length - max) : events).filter((e) => e.ts >= range.from && e.ts <= range.to);
  const N = list.length;
  const tmp: Array<{ x: number; y: number; z: number; s: number; c: number }> = [];
  // Events are sorted by time: rank 0 = oldest. Rank (not raw time) keeps arms evenly filled
  // whatever the rhythm of activity, while preserving the order: farther = older.
  list.forEach((e, rank) => {
    const dept = e.department && deptInfo.has(e.department) ? e.department : agentDept.get(e.actor?.id ?? e.origin.id);
    const info = dept ? deptInfo.get(dept) : undefined;
    const rr = rng(e.id);
    const age = N > 1 ? 1 - rank / (N - 1) : 0;
    const r = 0.1 + 1.4 * Math.pow(age, 0.8);
    let d: Vec3 = info ? armDir(info.k, K, r) : normalize([gauss(rr), gauss(rr) * 0.6, gauss(rr)]);
    const jit = info ? 0.07 + 0.1 * age : 0.25;
    d = normalize(add(d, [gauss(rr) * jit, gauss(rr) * jit * 0.8, gauss(rr) * jit]));
    const tokens = e.metrics ? (e.metrics.inputTokens ?? 0) + (e.metrics.outputTokens ?? 0) : 0;
    tmp.push({ x: d[0] * r, y: d[1] * r, z: d[2] * r, s: 1.2 + Math.min(1.8, Math.log10(1 + tokens) / 2.5), c: e.status === 'failed' ? 9 : info?.tone ? SLOT_INDEX[info.tone] : 8 });
  });
  tmp.sort((a, b) => a.c - b.c);
  const n = tmp.length;
  const xyz = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const colour = new Uint8Array(n);
  tmp.forEach((p, i) => {
    xyz[i * 3] = p.x;
    xyz[i * 3 + 1] = p.y;
    xyz[i * 3 + 2] = p.z;
    size[i] = p.s;
    colour[i] = p.c;
  });
  return { xyz, size, colour, count: n };
}

/* ----------------------------------------------------------------- sphere */

/** Greedy capacity assignment: each point goes to the nearest group centre that still has room. */
function assign(points: Vec3[], idx: number[], sizes: number[], centres: Vec3[]): number[][] {
  const pairs: Array<[number, number, number]> = [];
  for (const i of idx) for (let g = 0; g < sizes.length; g++) pairs.push([dot(points[i], centres[g]), i, g]);
  pairs.sort((a, b) => b[0] - a[0]);
  const cap = sizes.slice();
  const taken = new Set<number>();
  const out: number[][] = sizes.map(() => []);
  for (const [, i, g] of pairs) {
    if (taken.has(i) || cap[g] <= 0) continue;
    taken.add(i);
    cap[g]--;
    out[g].push(i);
  }
  return out;
}

const centroid = (points: Vec3[], idx: number[]): Vec3 => normalize(idx.reduce((s, i) => add(s, points[i]), [0, 0, 0] as Vec3));

export function layoutSphere(graph: Graph): Map<string, Vec3> {
  const pos = new Map<string, Vec3>();
  const { nodes } = graph;
  pos.set('governor', [0, 0, 0]);
  const surface = nodes.filter((n) => n.type !== 'governor');
  if (!surface.length) return pos;

  // Regions in a fixed order so that related regions end up neighbours on the spiral.
  const order = [...graph.groups, 'agents', 'models', 'tools', 'data'];
  const regions = new Map<string, GNode[]>(order.map((k) => [k, []]));
  // Engines sit with the departments they serve (first one), so their spokes stay short.
  const groupOfDept = new Map(nodes.filter((n) => n.type === 'department').map((n) => [n.key, n.group]));
  const engineGroup = new Map<string, string>();
  for (const l of graph.links) {
    if (l.kind !== 'engine') continue;
    const [dept, eng] = groupOfDept.has(l.a) ? [l.a, l.b] : [l.b, l.a];
    if (!engineGroup.has(eng)) engineGroup.set(eng, groupOfDept.get(dept)!);
  }
  for (const n of surface) {
    const g0 = n.type === 'agent' ? engineGroup.get(n.key) ?? 'agents' : n.type === 'task' && n.group === 'agents' ? engineGroup.get(n.parent ?? '') ?? 'agents' : n.group;
    regions.get(regions.has(g0) ? g0 : 'data')!.push(n);
  }
  const used = order.filter((k) => regions.get(k)!.length);
  const points = fibonacci(surface.length, 0.3);
  const all = points.map((_, i) => i);
  const centres = fibonacci(used.length, 1.1);
  const parts = assign(points, all, used.map((k) => regions.get(k)!.length), centres);

  used.forEach((key, ri) => {
    const members = regions.get(key)!;
    let idx = parts[ri];
    const c = centroid(points, idx);
    const depts = members.filter((n) => n.type === 'department');
    if (depts.length) {
      // Department group: one sub-patch per department, hub in the middle of its tasks.
      const units = depts.map((d) => ({ hub: d, tasks: members.filter((n) => n.parent === d.key) }));
      // Engines of the group take the points nearest the region centre.
      const engines = members.filter((n) => n.type === 'agent').sort((a, b) => b.activity - a.activity || a.key.localeCompare(b.key));
      const byCentre = [...idx].sort((a, b) => dot(points[b], c) - dot(points[a], c));
      const engPts = byCentre.slice(0, engines.length);
      engines.forEach((n, k) => pos.set(n.key, points[engPts[k]]));
      idx = idx.filter((i) => !engPts.includes(i));
      const placed = new Set([...units.flatMap((u) => [u.hub, ...u.tasks]), ...engines]);
      const orphans = members.filter((n) => !placed.has(n));
      if (orphans.length) units.push({ hub: orphans[0], tasks: orphans.slice(1) });
      const [u, v] = frame(c);
      // Sub-centres: the department slots spread on a small ring around the region centre.
      const ang = Math.acos(Math.max(-1, Math.min(1, Math.min(...idx.map((i) => dot(points[i], c)))))) * 0.55;
      const subC = units.map((_, j) => {
        if (units.length === 1) return c;
        const a = (j / units.length) * Math.PI * 2;
        return normalize(add(scale(c, Math.cos(ang)), scale(add(scale(u, Math.cos(a)), scale(v, Math.sin(a))), Math.sin(ang))));
      });
      const sub = assign(points, idx, units.map((x) => 1 + x.tasks.length), subC);
      units.forEach((unit, j) => {
        const q = sub[j];
        const cc = centroid(points, q);
        q.sort((a, b) => dot(points[b], cc) - dot(points[a], cc));
        pos.set(unit.hub.key, points[q[0]]);
        const hubP = points[q[0]];
        const rest = q.slice(1).sort((a, b) => dot(points[b], hubP) - dot(points[a], hubP));
        unit.tasks.forEach((t, k) => pos.set(t.key, rest[k] != null ? points[rest[k]] : hubP));
      });
    } else {
      // Other regions: the most active members in the middle.
      const sorted = [...members].sort((a, b) => (a.type === 'task' ? 1 : 0) - (b.type === 'task' ? 1 : 0) || b.activity - a.activity || a.key.localeCompare(b.key));
      const pts = [...idx].sort((a, b) => dot(points[b], c) - dot(points[a], c));
      sorted.forEach((n, k) => pos.set(n.key, points[pts[k]]));
    }
  });
  for (const n of nodes) if (!pos.has(n.key)) pos.set(n.key, [0, 0, 0]);
  return pos;
}

/* ------------------------------------------------------------------ paths */

/** Sample points of a flow path: great-circle arc on the sphere, bowed curve in the burst. */
export function flowPath(a: Vec3, b: Vec3, form: 'burst' | 'sphere', steps = 18): Vec3[] {
  const out: Vec3[] = [];
  const la = len(a);
  const lb = len(b);
  if (form === 'sphere' && la > 0.5 && lb > 0.5) {
    const ua = normalize(a);
    const ub = normalize(b);
    const omega = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub))));
    const so = Math.sin(omega);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p: Vec3 = so < 1e-4 ? ua : add(scale(ua, Math.sin((1 - t) * omega) / so), scale(ub, Math.sin(t * omega) / so));
      const lift = 1.02 + Math.sin(Math.PI * t) * Math.min(0.14, omega * 0.06);
      out.push(scale(normalize(p), lift * (la + (lb - la) * t)));
    }
    return out;
  }
  // Quadratic Bézier bowed away from the centre.
  const mid = scale(add(a, b), 0.5);
  const lm = len(mid);
  const bow = 0.18 + 0.12 * Math.min(1, len(add(a, scale(b, -1))));
  const ctrl: Vec3 = lm > 0.02 ? add(mid, scale(normalize(mid), bow)) : add(mid, [0, bow, 0]);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k0 = (1 - t) * (1 - t), k1 = 2 * (1 - t) * t, k2 = t * t;
    out.push([a[0] * k0 + ctrl[0] * k1 + b[0] * k2, a[1] * k0 + ctrl[1] * k1 + b[1] * k2, a[2] * k0 + ctrl[2] * k1 + b[2] * k2]);
  }
  return out;
}

/** Camera angles that bring `p` in front of the viewer. */
export function facing(p: Vec3): { yaw: number; pitch: number } | null {
  if (len(p) < 0.05) return null;
  const yaw = Math.atan2(-p[0], p[2]);
  const zr = Math.hypot(p[0], p[2]);
  const pitch = Math.atan2(p[1], zr);
  return { yaw, pitch: Math.max(-1.3, Math.min(1.3, pitch)) };
}

