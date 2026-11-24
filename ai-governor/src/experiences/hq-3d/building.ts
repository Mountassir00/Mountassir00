/**
 * Builds the 3D headquarters from the floor plan: floors, walls (low cut-away
 * part + upper part, so the overview reads like an architectural model and the
 * visit has real walls), ceiling with lamps, and each room furnished for its
 * trade (kit equipment + HQ props). Returns the posts where agents stand.
 *
 * Static geometry is merged with `bakeStatic`: the upper walls, the caps and
 * the ceiling are baked in their own groups so they can be shown or hidden
 * as a whole (one or two draw calls each).
 */
import {
  THREE, bakeStatic, createArmchair, createChair, createDesk, createEquipment, createGate, createGlassBoard, createModelHub, createPlant, createSideTable,
  createSofa, surfaceTint, type BakeReport, type EquipmentKind, type GlassBoard, type MaterialKit, type ScenePalette, type Stage3D,
} from '@ds/three';
import {
  CORRIDOR, DOOR_H, LOW_H, ROOM_DEPTH, WALL_H, type Building, type Space, type WallSide,
} from './plan';
import {
  createBar, createCabinet, createFloorLamp, createMeetingTable, createReceptionDesk, createRug, createTableFootball, createTreadmill, createWallScreen, createWeightRack,
  createWorkstation,
} from './props';

export interface Spot {
  x: number;
  y: number;
  z: number;
  /** Facing (radians around +Y; 0 = +Z). */
  yaw: number;
}

export interface Furnished {
  space: Space;
  /** Where robots stand (work posts, lounge places, meeting places, treadmills…). */
  posts: Spot[];
  /** Fixed consoles (scripts) and drones (services). */
  devices: Spot[];
  /** Seat of a human (executive desk). */
  seat?: Spot;
  board?: GlassBoard;
  /** Label anchor (world). */
  anchor: THREE.Vector3;
  /** Invisible floor object registered in the picker (bound rooms only). */
  pick?: THREE.Object3D;
}

export interface HQScene {
  root: THREE.Group;
  rooms: Map<string, Furnished>;
  caps: THREE.Group;
  upperInt: THREE.Group;
  upperExt: Record<'n' | 's' | 'e' | 'w', THREE.Group>;
  ceiling: THREE.Group;
  bounds: THREE.Box3;
  bake: BakeReport;
}

export interface BuildOptions {
  evening: boolean;
  simplified: boolean;
  /** Departments whose engines include a human (gets the executive desk). */
  humanDepts: Set<string>;
  /** Selection kind for a model room bound to a catalog node. */
  modelNodeExists: boolean;
  drawAgenda: (ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette) => void;
  boardTextureWidth: number;
}

type V3 = [number, number, number];

const FOOT_DEPTH: Partial<Record<EquipmentKind, number>> = {
  server: 0.62, database: 0.74, antenna: 0.9, gauge: 0.46, lab: 0.68, conveyor: 0.58, router: 0.6, shield: 0.7, archive: 0.56, board: 0.5, meeting: 2.0, desk: 0.62,
};

const staticMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3, opts: { cast?: boolean; receive?: boolean } = {}) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  m.userData.static = true;
  return m;
};

function wallMaterial(kit: MaterialKit) {
  return kit.themedMaterial('hq:wall', () => kit.matte('#ffffff', 0.9).clone(), (m, p) => {
    (m as THREE.MeshStandardMaterial).color.copy(p.scheme === 'dark' ? p.slab.clone().lerp(new THREE.Color('#ffffff'), 0.07) : new THREE.Color('#f7f7f9'));
  });
}
function capMaterial(kit: MaterialKit) {
  return kit.themedMaterial('hq:cap', () => kit.matte('#888888', 0.8).clone(), (m, p) => {
    (m as THREE.MeshStandardMaterial).color.copy(p.scheme === 'dark' ? p.line.clone().lerp(new THREE.Color('#ffffff'), 0.12) : p.inkSoft.clone().lerp(new THREE.Color('#ffffff'), 0.35));
  });
}
function ceilingMaterial(kit: MaterialKit) {
  return kit.themedMaterial('hq:ceiling', () => kit.matte('#ffffff', 0.95).clone(), (m, p) => {
    const mm = m as THREE.MeshStandardMaterial;
    mm.color.copy(p.scheme === 'dark' ? p.slab.clone().lerp(new THREE.Color('#ffffff'), 0.04) : new THREE.Color('#f3f3f1'));
    mm.side = THREE.DoubleSide;
  });
}

/** Floor colour of a space. */
function floorColor(kit: MaterialKit, s: Space): THREE.Color {
  const p = kit.palette;
  switch (s.role) {
    case 'lounge':
      return surfaceTint(kit, '#d9a46a', 0.34);
    case 'gym':
      return surfaceTint(kit, '#5c6f93', kit.dark ? 0.3 : 0.32);
    case 'models':
      return surfaceTint(kit, '#2c3446', kit.dark ? 0.5 : 0.22);
    case 'reception':
      return surfaceTint(kit, p.tone[s.tone] ?? p.accent, 0.14);
    default:
      return surfaceTint(kit, p.tone[s.tone] ?? p.accent, kit.dark ? 0.24 : 0.26);
  }
}

export function buildHQ(stage: Stage3D, b: Building, opts: BuildOptions): HQScene {
  const kit = stage.kit;
  const pal = kit.palette;
  const root = new THREE.Group();
  root.name = 'hq';
  const wall = wallMaterial(kit);
  const cap = capMaterial(kit);
  const T = 0.16;

  /* ---------------- floors ---------------- */
  const W = b.width;
  const D = b.depth;
  root.add(staticMesh(kit.roundedBox(W + 0.9, 0.14, D + 0.9, 0.06, 2), kit.matte(pal.scheme === 'dark' ? pal.slab.clone().lerp(new THREE.Color('#000000'), 0.18) : pal.slab.clone().lerp(new THREE.Color('#c9ccd3'), 0.35)), [0, -0.12, 0], { cast: false }));
  for (const s of b.spaces) {
    const w = s.rect.x1 - s.rect.x0;
    const d = s.rect.z1 - s.rect.z0;
    root.add(staticMesh(kit.box(w, 0.06, d), kit.matte(floorColor(kit, s), 0.8), [s.center.x, -0.03, s.center.z], { cast: false }));
  }
  // corridors: light oak; a deeper, quieter wood tone on dark themes
  const oak = kit.dark ? kit.matte(pal.slab.clone().lerp(new THREE.Color('#9a6a44'), 0.42), 0.7) : kit.wood('oak');
  for (const c of b.corridors) root.add(staticMesh(kit.box(c.rect.x1 - c.rect.x0, 0.06, CORRIDOR), oak, [(c.rect.x0 + c.rect.x1) / 2, -0.03, c.z], { cast: false }));
  for (const pa of b.passages) root.add(staticMesh(kit.box(CORRIDOR, 0.06, pa.rect.z1 - pa.rect.z0), oak, [pa.x, -0.03, (pa.rect.z0 + pa.rect.z1) / 2], { cast: false }));
  // forecourt in front of the entrance
  const rec = b.reception;
  if (rec?.entrance) {
    root.add(staticMesh(kit.roundedBox(5.2, 0.08, 2.6, 0.04, 2), kit.matte(surfaceTint(kit, '#9aa3b2', 0.22), 0.9), [rec.entrance.x, -0.02, rec.entrance.z + 1.55], { cast: false }));
    if (!opts.simplified)
      for (const sx of [-1, 1]) {
        const p = createPlant(kit);
        p.position.set(rec.entrance.x + sx * 2.2, 0, rec.entrance.z + 1.4);
        root.add(p);
        stage.contact.set(`hq:fore:${sx}`, p.position.x, p.position.z, 0.3);
      }
  }

  /* ---------------- walls ---------------- */
  const caps = new THREE.Group();
  caps.name = 'hq-caps';
  const upperInt = new THREE.Group();
  upperInt.name = 'hq-upper-int';
  const upperExt = { n: new THREE.Group(), s: new THREE.Group(), e: new THREE.Group(), w: new THREE.Group() };
  const glassExt = kit.glass(opts.evening ? '#22335a' : '#cfe6ff', opts.evening ? 0.62 : 0.3);
  const glassInt = kit.glass('#e3f1ff', 0.24);
  const mullion = kit.metal('dark');
  for (const seg of b.walls) {
    const r = seg.rect;
    const w = r.x1 - r.x0;
    const d = r.z1 - r.z0;
    const cx = (r.x0 + r.x1) / 2;
    const cz = (r.z0 + r.z1) / 2;
    const dh = seg.vertical ? 0.004 : 0;
    // low part (always visible)
    root.add(staticMesh(kit.box(w, LOW_H - dh, d), wall, [cx, (LOW_H - dh) / 2, cz], { cast: true }));
    caps.add(staticMesh(kit.box(w + (seg.vertical ? 0 : 0.002), 0.02, d + (seg.vertical ? 0.002 : 0)), cap, [cx, LOW_H + 0.01 - dh, cz], { cast: false, receive: false }));
    // upper part
    const target = seg.side === 'int' ? upperInt : upperExt[seg.side as Exclude<WallSide, 'int'>];
    const upH = WALL_H - LOW_H - dh;
    if (seg.side !== 'int') {
      // façade: glass band with mullions, lintel above
      const band = 2.25 - LOW_H;
      target.add(staticMesh(kit.box(w, band, d), glassExt, [cx, LOW_H + band / 2, cz], { cast: false, receive: false }));
      target.add(staticMesh(kit.box(w, WALL_H - 2.25 - dh, d), wall, [cx, 2.25 + (WALL_H - 2.25 - dh) / 2, cz]));
      const len = seg.vertical ? d : w;
      const n = Math.max(1, Math.round(len / 1.6));
      for (let i = 0; i <= n; i++) {
        const t = -len / 2 + (len * i) / n;
        target.add(staticMesh(kit.box(seg.vertical ? T + 0.02 : 0.06, band, seg.vertical ? 0.06 : T + 0.02), mullion, [seg.vertical ? cx : cx + t, LOW_H + band / 2, seg.vertical ? cz + t : cz], { cast: false }));
      }
    } else if (seg.glass) {
      target.add(staticMesh(kit.box(w, DOOR_H - LOW_H, d), glassInt, [cx, (LOW_H + DOOR_H) / 2, cz], { cast: false, receive: false }));
      target.add(staticMesh(kit.box(w, WALL_H - DOOR_H, d), wall, [cx, (DOOR_H + WALL_H) / 2, cz]));
      target.add(staticMesh(kit.box(w, 0.05, d + 0.03), mullion, [cx, LOW_H + 0.025, cz], { cast: false }));
    } else target.add(staticMesh(kit.box(w, upH, d), wall, [cx, LOW_H + upH / 2, cz]));
  }
  // lintels above doorways
  for (const g of b.doors) {
    const len = g.b - g.a;
    const h = WALL_H - DOOR_H;
    const target = g.exterior ? upperExt.s : upperInt;
    target.add(staticMesh(kit.box(len, h, T), wall, [(g.a + g.b) / 2, DOOR_H + h / 2, g.line]));
  }

  /* ---------------- ceiling ---------------- */
  const ceiling = new THREE.Group();
  ceiling.name = 'hq-ceiling';
  const ceil = new THREE.Mesh(kit.plane(W, D), ceilingMaterial(kit));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, WALL_H, 0);
  ceil.userData.static = true;
  ceiling.add(ceil);
  const lamp = kit.emissive(opts.evening ? '#ffe2b0' : '#f7f9fc');
  for (const s of b.spaces) {
    const w = s.rect.x1 - s.rect.x0;
    for (const sx of [-1, 1]) ceiling.add(staticMesh(kit.box(1.1, 0.03, 0.55), lamp, [s.center.x + (sx * w) / 4, WALL_H - 0.02, s.center.z], { cast: false, receive: false }));
  }
  for (const c of b.corridors) for (let x = c.rect.x0 + 2.2; x < c.rect.x1 - 1; x += 4.4) ceiling.add(staticMesh(kit.box(0.5, 0.03, 0.9), lamp, [x, WALL_H - 0.02, c.z], { cast: false, receive: false }));
  for (const pa of b.passages) for (let z = pa.rect.z0 + 2; z < pa.rect.z1 - 1; z += 4.4) ceiling.add(staticMesh(kit.box(0.9, 0.03, 0.5), lamp, [pa.x, WALL_H - 0.02, z], { cast: false, receive: false }));

  /* ---------------- rooms ---------------- */
  const rooms = new Map<string, Furnished>();
  // plants are costly (≈ 2 k triangles): one per wing, plus the common spaces
  const greenery = new Set(b.wings.map((w) => w.spaceIds[0]));
  for (const s of b.spaces) {
    const f = furnish(stage, s, opts, s.role !== 'department' || greenery.has(s.id));
    root.add(f.group);
    rooms.set(s.id, f);
  }

  /* ---------------- picking (floors of bound rooms) ---------------- */
  for (const f of rooms.values()) {
    const s = f.space;
    const sel = s.deptId ? { kind: 'department' as const, id: s.deptId } : s.nodeId && opts.modelNodeExists ? { kind: 'node' as const, id: s.nodeId } : null;
    if (!sel) continue;
    const w = s.rect.x1 - s.rect.x0;
    const d = s.rect.z1 - s.rect.z0;
    const pick = new THREE.Mesh(kit.box(w - 0.2, 0.04, d - 0.2), kit.proxy);
    pick.position.set(s.center.x, 0.02, s.center.z);
    pick.name = `pick:${s.id}`;
    root.add(pick);
    stage.picker.add(pick, sel, 0);
    f.pick = pick;
  }

  // bake: the separately toggled groups first, then everything else
  bakeStatic(caps);
  bakeStatic(upperInt);
  for (const g of Object.values(upperExt)) bakeStatic(g);
  bakeStatic(ceiling);
  root.add(caps, upperInt, upperExt.n, upperExt.s, upperExt.e, upperExt.w, ceiling);
  const bake = bakeStatic(root);
  ceiling.visible = false;
  for (const m of [ceiling]) m.traverse((o) => ((o as THREE.Mesh).castShadow = false));

  const bounds = new THREE.Box3(new THREE.Vector3(b.bounds.x0, 0, b.bounds.z0), new THREE.Vector3(b.bounds.x1, WALL_H, b.bounds.z1));
  return { root, rooms, caps, upperInt, upperExt, ceiling, bounds, bake };
}

/* ------------------------------------------------------------------ */
/* Furnishing                                                           */
/* ------------------------------------------------------------------ */

function furnish(stage: Stage3D, s: Space, opts: BuildOptions, plants: boolean): Furnished & { group: THREE.Group } {
  const kit = stage.kit;
  const pal = kit.palette;
  const tone = pal.tone[s.dept?.tone ?? s.tone] ?? pal.accent;
  const w = s.rect.x1 - s.rect.x0;
  const d = ROOM_DEPTH;
  const flip = s.doorSide < 0;
  const g = new THREE.Group();
  g.name = `room:${s.id}`;
  g.position.set(s.center.x, 0, s.center.z);
  g.rotation.y = flip ? Math.PI : 0;
  const doorX = flip ? -(s.door.x - s.center.x) : s.door.x - s.center.x;
  /** local (door at +Z) → world */
  const world = (lx: number, lz: number, yaw = 0, y = 0): Spot =>
    flip ? { x: s.center.x - lx, y, z: s.center.z - lz, yaw: yaw + Math.PI } : { x: s.center.x + lx, y, z: s.center.z + lz, yaw };
  const face = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);
  const put = <T extends THREE.Object3D>(o: T, x: number, z: number, rotY = 0, shadow = 0): T => {
    o.position.set(x, o.position.y, z);
    o.rotation.y = rotY;
    g.add(o);
    if (shadow > 0) {
      const wp = world(x, z);
      stage.contact.set(`hq:${s.id}:${g.children.length}`, wp.x, wp.z, shadow);
    }
    return o;
  };
  const posts: Spot[] = [];
  const devices: Spot[] = [];
  let seat: Spot | undefined;
  let board: GlassBoard | undefined;
  const plantCorner = () => {
    if (opts.simplified || !plants) return;
    const px = doorX > 0 ? -w / 2 + 0.5 : w / 2 - 0.5;
    put(createPlant(kit), px, d / 2 - 0.5, 0, 0.3);
  };

  switch (s.role) {
    case 'lounge': {
      const lx = -w / 4 + 0.1;
      if (!opts.simplified) g.add(createRug(kit, 3.1, 2.3, surfaceTint(kit, '#c7643f', 0.42)).translateX(lx).translateZ(-0.7));
      put(createSofa(kit, { color: kit.dark ? '#6b6f7d' : '#eceaf2', width: 1.9 }), lx, -d / 2 + 0.72, 0, 0.7);
      put(createArmchair(kit, { color: surfaceTint(kit, '#d9a46a', 0.55) }), lx - 1.45, -0.55, Math.PI / 2, 0.42);
      put(createArmchair(kit, { color: surfaceTint(kit, '#d9a46a', 0.55) }), lx + 1.45, -0.55, -Math.PI / 2, 0.42);
      put(createSideTable(kit), lx, -0.6, 0, 0.3);
      const fx = w / 4 + 0.35;
      put(createTableFootball(kit), fx, 0.55, 0, 0.6);
      if (!opts.simplified) {
        put(createBar(kit, surfaceTint(kit, tone, 0.6), 1.9), fx + 0.05, -d / 2 + 0.42, 0, 0.6);
        put(createFloorLamp(kit, opts.evening ? '#ffd28a' : '#fff4dc'), -w / 2 + 0.45, -d / 2 + 0.45);
        put(createWallScreen(kit), lx, d / 2 - 0.12, Math.PI);
      }
      plantCorner();
      // places (standing): around the coffee table, the table football, the bar
      posts.push(
        world(lx - 0.55, 0.45, face(lx - 0.55, 0.45, lx, -0.6)),
        world(lx + 0.55, 0.45, face(lx + 0.55, 0.45, lx, -0.6)),
        world(fx - 0.15, 1.3, Math.PI),
        world(fx + 0.25, -0.2, 0),
        world(fx - 0.6, -d / 2 + 1.55, Math.PI),
        world(fx + 0.6, -d / 2 + 1.55, Math.PI),
        world(lx, 1.35, Math.PI),
        world(0.2, 1.7, face(0.2, 1.7, fx, 0.55)),
      );
      break;
    }
    case 'meeting': {
      const L = Math.min(3.4, w - 2.0);
      put(createMeetingTable(kit, L), 0, -0.3, 0, 1.3);
      put(createChair(kit), -L / 2 - 0.5, -0.3, Math.PI / 2);
      put(createChair(kit), L / 2 + 0.5, -0.3, -Math.PI / 2);
      board = createGlassBoard(kit, { width: Math.min(2.8, w - 1.6), height: 1.05, stand: 'wall', edgeGlow: pal.accent, opacity: 0.9, tint: '#ffffff', textureWidth: opts.boardTextureWidth, drawTexture: opts.drawAgenda });
      put(board, 0, -d / 2 + 0.14);
      plantCorner();
      const xs = [-1.35, -0.45, 0.45, 1.35].map((x) => (x * L) / 3.4);
      for (const x of xs) posts.push(world(x, -0.3 + 0.98, Math.PI));
      for (const x of xs) posts.push(world(x, -0.3 - 0.98, 0));
      break;
    }
    case 'models': {
      put(createModelHub(kit), 0, -0.55, 0, 1.4);
      put(createEquipment(kit, 'server', tone), -w / 2 + 0.7, 0.9, Math.PI / 2, 0.5);
      put(createEquipment(kit, 'server', tone), w / 2 - 0.7, 0.9, -Math.PI / 2, 0.5);
      posts.push(world(-1.1, 1.4, Math.PI), world(1.1, 1.4, Math.PI));
      break;
    }
    case 'gym': {
      const x0 = -w / 4 - 0.55;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * 1.12;
        put(createTreadmill(kit, tone), x, -d / 2 + 1.15, 0, 0.5);
        posts.push(world(x, -d / 2 + 1.4, Math.PI, 0.14));
      }
      put(createWeightRack(kit, tone), w / 2 - 0.45, -0.4, -Math.PI / 2, 0.45);
      if (!opts.simplified) g.add(createRug(kit, 1.9, 1.3, surfaceTint(kit, tone, 0.55)).translateX(w / 4 - 0.1).translateZ(0.85));
      put(createEquipment(kit, 'gauge', tone), w / 4 + 0.3, -d / 2 + 0.42, 0, 0.4);
      put(createEquipment(kit, 'lab', tone), -w / 2 + 0.55, 0.95, Math.PI / 2, 0.55);
      posts.push(world(w / 4 - 0.6, 0.85, 0), world(w / 4 + 0.4, 0.85, 0), world(0, 1.8, Math.PI));
      devices.push(world(-w / 2 + 1.45, -0.55, face(-w / 2 + 1.45, -0.55, 0, 0)));
      break;
    }
    case 'reception': {
      put(createGate(kit, { color: pal.status.validating }), 0, -d / 2 + 0.85, 0, 0.6);
      const rx = w / 4 + 0.25;
      put(createReceptionDesk(kit, tone), rx, 0.35, 0, 1.1);
      const feats = s.equipment.filter((k) => k !== 'desk').slice(0, 2);
      feats.forEach((k, i) => put(createEquipment(kit, k, tone), -w / 2 + 0.75, i === 0 ? 1.2 : -0.6, Math.PI / 2, 0.5));
      if (!opts.simplified) {
        put(createSofa(kit, { color: kit.dark ? '#5d6271' : '#e9e9ee', width: 1.6 }), -w / 4 + 0.35, 1.95, Math.PI, 0.6);
        for (const sx of [-1, 1]) put(createPlant(kit), sx * 1.45, -d / 2 + 0.42, 0, 0.3);
      }
      posts.push(world(rx + 0.45, 1.05, Math.PI), world(rx - 0.55, 1.05, Math.PI));
      devices.push(world(-w / 2 + 1.6, 0.3, face(-w / 2 + 1.6, 0.3, 0, 0)), world(-0.4, 1.4, Math.PI));
      break;
    }
    default: {
      const human = s.deptId ? opts.humanDepts.has(s.deptId) : false;
      const feats = s.equipment.filter((k) => k !== 'desk').slice(0, 2);
      if (human) {
        // executive: big desk facing the door (seat behind it), board + round table
        const dx = w / 4 + 0.1;
        const dz = -0.75;
        const desk = createDesk(kit, { laptop: true, monitors: 1, chair: true, plant: false, width: 1.9 });
        put(desk, dx, dz, Math.PI, 1.0);
        seat = world(dx + 0.15, dz - 0.86, 0);
        const mx = -w / 4 + 0.05;
        if (feats.includes('board')) put(createEquipment(kit, 'board', tone), mx, -d / 2 + 0.45, 0, 0.5);
        if (feats.includes('meeting')) put(createEquipment(kit, 'meeting', tone), mx, 0.75, 0, 0.9);
        else put(createCabinet(kit, tone), mx, -d / 2 + 0.35);
        posts.push(world(mx - 1.15, 1.75, face(mx - 1.15, 1.75, mx, 0.75)), world(mx + 1.15, 1.75, face(mx + 1.15, 1.75, mx, 0.75)), world(dx - 0.2, 0.55, Math.PI));
        devices.push(world(w / 2 - 0.7, 1.4, face(w / 2 - 0.7, 1.4, 0, 0)));
      } else {
        // features against the back wall
        const fx = feats.length === 2 ? [-w / 4 - 0.1, w / 4 + 0.1] : [w / 6];
        feats.forEach((k, i) => {
          const fd = FOOT_DEPTH[k] ?? 0.6;
          const z = k === 'meeting' ? -d / 2 + 1.25 : -d / 2 + 0.22 + fd / 2;
          put(createEquipment(kit, k, tone), fx[i], z, 0, Math.max(0.4, fd * 0.7));
        });
        // three workstations facing the back wall
        const sp = Math.min(1.85, (w - 1.5) / 2);
        for (let i = -1; i <= 1; i++) {
          put(createWorkstation(kit, surfaceTint(kit, tone, kit.dark ? 0.5 : 0.45)), i * sp, 0.35, 0, 0.55);
          posts.push(world(i * sp + 0.38, 1.0, Math.PI - 0.25));
        }
        // more places near the features (busy rooms)
        posts.push(world(-w / 2 + 1.1, -0.85, face(-w / 2 + 1.1, -0.85, fx[0], -d / 2 + 0.6)), world(w / 2 - 1.1, -0.85, face(w / 2 - 1.1, -0.85, fx[fx.length - 1], -d / 2 + 0.6)));
        devices.push(world(w / 2 - 0.62, -0.95, face(w / 2 - 0.62, -0.95, 0, 0)), world(-w / 2 + 0.62, -0.95, face(-w / 2 + 0.62, -0.95, 0, 0)));
      }
      plantCorner();
    }
  }

  const anchor = new THREE.Vector3(s.center.x, LOW_H + 0.45, s.center.z);
  return { space: s, posts, devices, seat, board, anchor, group: g };
}
