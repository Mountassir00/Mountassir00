/**
 * Imperative side of the HQ: builds the scene in the Stage3D, owns the
 * figures (robots, consoles, drones, the human), moves agents through the
 * corridors when — and only when — their real status or task changes, drives
 * the camera (isometric overview / eye-level visit with wall collisions) and
 * the real-flow tubes. React feeds it data; it reports the camera place, the
 * minimap view box and clicks back through callbacks.
 */
import {
  THREE, FlowNetwork, bakeStatic, createConsole, createDrone, createPerson, createRobot, hueColor, setDeviceStatus, setRobotStatus,
  type Device, type FlowTubeSpec, type PickHit, type Robot, type Stage3D,
} from '@ds/three';
import type { AgentDef, AgentStatus, Catalog } from '@sdk';
import { buildHQ, type BuildOptions, type HQScene, type Spot } from './building';
import { blocked, collide, placeName, route, spaceAt, toPlan, LOW_H, WALL_H, type Building, type P2, type Space } from './plan';
import { computePlacements, type Placement } from './placement';

export type Mode = 'overview' | 'visit';

export interface Settings {
  /** Camera speed factor (flights, walking). */
  speed: number;
  /** Ceiling shown in the visit. */
  ceiling: boolean;
}

export interface ControllerEvents {
  onPlace: (place: { id: string; name: string } | null) => void;
  onView: (v: { x: number; y: number; w: number; h: number } | null) => void;
  onMode: (m: Mode) => void;
  /** A click/tap (still pointer). `double` for a double click/tap. `floor` = floor point under the pointer. */
  onTap: (hit: PickHit | null, double: boolean, floor: P2 | null) => void;
}

export interface FigureStatus {
  status: AgentStatus;
  /** False when the agent never emitted an event (shown "aucun événement"). */
  known: boolean;
  partnerId?: string;
}

interface Fig {
  def: AgentDef;
  kind: 'robot' | 'console' | 'drone' | 'person';
  object: THREE.Group;
  scale: number;
  status: AgentStatus;
  known: boolean;
  partnerId?: string;
  spaceId: string | null;
  slot: number;
  path: THREE.Vector3[] | null;
  cum: number[];
  len: number;
  t0: number;
  dur: number;
  move: 'walk' | 'fade' | null;
  endYaw: number;
  beacon?: THREE.Object3D;
  anchor: THREE.Vector3;
}

export interface FlowPairSpec {
  key: string;
  from: string;
  to: string;
  color: string;
  level: number;
}

const EYE = 1.55;
const FPV_DIST = 0.4;
const OVERVIEW_FOV = 30;
const VISIT_FOV = 60;
const DEG = Math.PI / 180;
const smooth = (k: number) => k * k * (3 - 2 * k);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerpAngle = (a: number, b: number, t: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
};

export class HQController {
  readonly stage: Stage3D;
  b: Building | null = null;
  scene: HQScene | null = null;
  figs = new Map<string, Fig>();
  flows: FlowNetwork | null = null;
  mode: Mode = 'overview';
  settings: Settings = { speed: 1, ceiling: true };
  private events: ControllerEvents;
  private offAnimator: (() => void) | null = null;
  private offFrame: (() => void) | null = null;
  private listeners: Array<() => void> = [];
  private fp = { x: 0, z: 0, az: 0, polar: 88 * DEG };
  private keys = new Set<string>();
  private walk: { pts: P2[]; cum: number[]; len: number; t0: number; dur: number; endAz: number | null } | null = null;
  private fov: { from: number; to: number; t0: number; ms: number } | null = null;
  private drag: { id: number; x: number; y: number; sx: number; sy: number; type: string; moved: boolean; t: number } | null = null;
  private touches = new Map<number, { x: number; y: number }>();
  private pinch: number | null = null;
  private lastTap: { t: number; x: number; y: number } | null = null;
  private overviewOpts: { minDistance: number; maxDistance: number; minPolar: number; maxPolar: number; bounds: THREE.Box3 | null } | null = null;
  private home: { target: [number, number, number]; distance: number; azimuth: number; polar: number } | null = null;
  private extVisible = { n: true, s: true, e: true, w: true };
  private frames: { hover: THREE.Object3D | null; select: THREE.Object3D | null } = { hover: null, select: null };
  private lastPlace = '';
  private lastViewKey = '';
  private lastViewAt = 0;
  private hidden = new THREE.Vector3();
  private evening = false;

  constructor(stage: Stage3D, events: ControllerEvents) {
    this.stage = stage;
    this.events = events;
    this.attachInput();
    this.offFrame = stage.onFrame(() => this.afterFrame());
  }

  /* ================================================================ */
  /* Build                                                             */
  /* ================================================================ */

  build(b: Building, catalog: Pick<Catalog, 'agents'>, opts: BuildOptions) {
    const stage = this.stage;
    const kit = stage.kit;
    this.offAnimator?.();
    this.flows?.dispose();
    stage.clearContent();
    this.frames = { hover: null, select: null };
    const firstBuild = !this.b || this.b.width !== b.width || this.b.depth !== b.depth;
    this.b = b;
    this.evening = opts.evening;
    const scene = (this.scene = buildHQ(stage, b, opts));
    stage.root.add(scene.root);

    // figures
    this.figs.clear();
    const fixed = new THREE.Group();
    fixed.name = 'hq-fixed';
    const fixedPlaces = computePlacements({ agents: {}, tasks: {} }, catalog, b);
    for (const def of catalog.agents) {
      const color = hueColor(def.avatar.hue, kit.palette.scheme);
      let object: THREE.Group;
      let kind: Fig['kind'];
      if (def.kind === 'llm') {
        object = createRobot(kit, { color, accessory: def.avatar.accessory, scale: 1 });
        kind = 'robot';
      } else if (def.kind === 'script') {
        object = createConsole(kit, { color });
        kind = 'console';
      } else if (def.kind === 'service') {
        object = createDrone(kit, { color });
        kind = 'drone';
      } else {
        object = createPerson(kit, { color, pose: 'sit' });
        kind = 'person';
      }
      object.userData.agentId = def.id;
      const fig: Fig = {
        def, kind, object, scale: 1, status: 'offline', known: false, spaceId: null, slot: -1, path: null, cum: [], len: 0, t0: 0, dur: 0, move: null, endYaw: 0,
        anchor: new THREE.Vector3(),
      };
      stage.picker.add(object, { kind: 'agent', id: def.id }, kind === 'robot' ? 0.04 : 0.08);
      if (kind === 'robot') {
        // red beacon above an agent in error (static, no blinking loop)
        const beacon = new THREE.Group();
        const bulb = new THREE.Mesh(kit.sphere(0.075, 16, 10), kit.emissive(kit.palette.status.error));
        bulb.position.y = 1.62;
        const halo = new THREE.Mesh(kit.disc(0.22, 24), kit.glowDisc(kit.palette.status.error, 0.9));
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 1.62;
        halo.renderOrder = 3;
        beacon.add(bulb, halo);
        beacon.visible = false;
        object.add(beacon);
        fig.beacon = beacon;
        stage.root.add(object);
      } else {
        const p = fixedPlaces.get(def.id);
        if (p) {
          const spot = this.spotFor(p);
          object.position.set(spot.x, spot.y, spot.z);
          object.rotation.y = spot.yaw;
          fig.spaceId = p.spaceId;
          fig.slot = p.slot;
          if (kind !== 'person') stage.contact.set(`fig:${def.id}`, spot.x, spot.z, 0.4);
        }
        fixed.add(object);
        if (kind === 'person') object.traverse((o) => (o.userData.static = (o as THREE.Mesh).isMesh));
      }
      this.figs.set(def.id, fig);
    }
    bakeStatic(fixed);
    stage.root.add(fixed);

    this.flows = new FlowNetwork(kit.palette);
    stage.root.add(this.flows.group);

    // camera framing
    stage.setShadowBounds(scene.bounds);
    const box = scene.bounds.clone().expandByVector(new THREE.Vector3(4, 0, 4));
    box.min.y = 0;
    box.max.y = 2;
    this.overviewOpts = { minDistance: 6, maxDistance: 150, minPolar: 6, maxPolar: 74, bounds: box };
    if (firstBuild || !this.home) {
      const rig = stage.rig;
      Object.assign(rig.opts, this.overviewOpts);
      this.setFov(OVERVIEW_FOV, true);
      rig.setView({ azimuth: 36, polar: 50 }, true);
      rig.fit(new THREE.Box3(new THREE.Vector3(b.bounds.x0, 0, b.bounds.z0), new THREE.Vector3(b.bounds.x1, 0, b.bounds.z1)), true);
      rig.setView({ distance: rig.view.distance * 0.9, target: [0, 0, b.depth * 0.04] }, true);
      this.home = rig.view;
      rig.setHome(this.home);
      if (this.mode === 'visit') this.applyVisitOpts();
    }
    this.applyWalls();
    this.offAnimator = stage.addAnimator((t, dt) => this.animate(t, dt));
    stage.updateShadows();
  }

  /* ================================================================ */
  /* Data                                                              */
  /* ================================================================ */

  private spotFor(p: Placement): Spot {
    const f = this.scene?.rooms.get(p.spaceId);
    if (!f) return { x: 0, y: 0, z: 0, yaw: 0 };
    if (p.kind === 'seat') return f.seat ?? f.devices[0] ?? { x: f.space.center.x, y: 0, z: f.space.center.z, yaw: 0 };
    const list = p.kind === 'device' ? f.devices : f.posts;
    if (p.slot < list.length) return list[p.slot];
    // overflow: a small grid near the room centre, facing it
    const k = p.slot - list.length;
    const c = f.space.center;
    const x = c.x + ((k % 3) - 1) * 0.95;
    const z = c.z + (Math.floor(k / 3) % 2 ? -0.6 : 0.6) + (f.space.doorSide > 0 ? 0.6 : -0.6);
    return { x, y: 0, z, yaw: Math.atan2(c.x - x, c.z - z) };
  }

  /** Applies real statuses and placements. Returns true when something visible changed. */
  setAgents(placements: Map<string, Placement>, statuses: Map<string, FigureStatus>): boolean {
    let changed = false;
    for (const f of this.figs.values()) {
      const st = statuses.get(f.def.id);
      const status: AgentStatus = st?.status ?? 'offline';
      if (status !== f.status || (st?.known ?? false) !== f.known) {
        f.status = status;
        f.known = st?.known ?? false;
        changed = true;
      }
      f.partnerId = st?.partnerId;
      if (f.beacon) f.beacon.visible = f.status === 'error';
      if (f.kind !== 'robot') continue;
      const p = placements.get(f.def.id);
      if (!p) continue;
      if (f.spaceId === p.spaceId && f.slot === p.slot) continue;
      this.startMove(f, p, f.spaceId == null);
      f.spaceId = p.spaceId;
      f.slot = p.slot;
      changed = true;
    }
    if (changed) this.stage.burst(1600);
    else this.stage.invalidate();
    return changed;
  }

  private startMove(f: Fig, p: Placement, first: boolean) {
    const spot = this.spotFor(p);
    const q = this.stage.quality;
    const to = new THREE.Vector3(spot.x, spot.y, spot.z);
    f.endYaw = spot.yaw;
    if (first || q.motion === 'none' || !this.b) {
      f.move = null;
      f.path = null;
      f.object.position.copy(to);
      f.object.rotation.y = spot.yaw;
      f.object.scale.setScalar(1);
      this.stage.contact.set(`fig:${f.def.id}`, to.x, to.z, 0.34);
      return;
    }
    const from = f.object.position.clone();
    if (q.motion === 'state' || q.reducedMotion) {
      // soft teleport: shrink here, grow there
      f.move = 'fade';
      f.path = [from, to];
      f.t0 = performance.now();
      f.dur = 760;
      this.stage.burst(1000);
      return;
    }
    const pts2 = route(this.b, { x: from.x, z: from.z }, { x: to.x, z: to.z });
    const pts = pts2.map((p2, i) => new THREE.Vector3(p2.x, i === pts2.length - 1 ? to.y : 0, p2.z));
    pts[0].y = from.y;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const len = cum[cum.length - 1];
    const ambient = q.motion === 'ambient';
    f.move = 'walk';
    f.path = pts;
    f.cum = cum;
    f.len = len;
    f.t0 = performance.now();
    f.dur = clamp((len / (ambient ? 1.9 : 4.8)) * 1000, 700, ambient ? 9000 : 2600);
    this.stage.burst(f.dur + 200);
  }

  /** Real flows as tubes routed through doors and corridors. */
  setFlows(pairs: FlowPairSpec[], visible: boolean) {
    if (!this.flows || !this.b) return;
    const specs: FlowTubeSpec[] = [];
    pairs.forEach((p, i) => {
      const a = this.b!.byId.get(p.from);
      const c = this.b!.byId.get(p.to);
      if (!a || !c || a.id === c.id) return;
      const lane = ((i % 5) - 2) * 0.17;
      const start = { x: a.inner.x, z: a.inner.z - a.doorSide * 0.9 };
      const end = { x: c.inner.x, z: c.inner.z - c.doorSide * 0.9 };
      const poly = route(this.b!, start, end);
      specs.push({ id: p.key, points: roundCorners(poly).map((q) => new THREE.Vector3(q.x + lane, 0.32 + Math.abs(lane) * 0.4, q.z + lane)), color: p.color, active: true, level: p.level });
    });
    const rebuilt = this.flows.set(specs);
    this.flows.setVisible(visible);
    if (rebuilt) this.stage.invalidate();
  }

  redrawBoards() {
    for (const f of this.scene?.rooms.values() ?? []) f.board?.userData.redraw();
    this.stage.invalidate();
  }

  /* ================================================================ */
  /* Per-frame                                                         */
  /* ================================================================ */

  private animate(t: number, dt: number): boolean {
    const stage = this.stage;
    const fa = stage.amplitude('figure');
    const ia = stage.amplitude('indicator');
    const nowMs = performance.now();
    let wants = false;
    const partner = new THREE.Vector3();
    for (const f of this.figs.values()) {
      if (f.kind === 'console' || f.kind === 'drone') {
        wants = setDeviceStatus(f.object as Device, f.status, t, { figure: fa, indicator: ia }) || wants;
        continue;
      }
      if (f.kind !== 'robot') continue;
      let walking = false;
      if (f.move && f.path) {
        const k = clamp((nowMs - f.t0) / Math.max(1, f.dur), 0, 1);
        if (f.move === 'fade') {
          const [a, c] = f.path;
          if (k < 0.5) {
            f.object.position.copy(a);
            f.object.scale.setScalar(Math.max(0.001, 1 - smooth(k * 2)));
          } else {
            f.object.position.copy(c);
            f.object.rotation.y = f.endYaw;
            f.object.scale.setScalar(Math.max(0.001, smooth((k - 0.5) * 2)));
          }
        } else {
          const s = smooth(k) * f.len;
          let i = 1;
          while (i < f.cum.length - 1 && f.cum[i] < s) i++;
          const a = f.path[i - 1];
          const c = f.path[i];
          const seg = Math.max(1e-6, f.cum[i] - f.cum[i - 1]);
          const u = clamp((s - f.cum[i - 1]) / seg, 0, 1);
          f.object.position.lerpVectors(a, c, u);
          const dir = Math.atan2(c.x - a.x, c.z - a.z);
          f.object.rotation.y = k > 0.94 ? lerpAngle(f.object.rotation.y, f.endYaw, 0.35) : lerpAngle(f.object.rotation.y, dir, 0.3);
          walking = k < 1;
        }
        if (k >= 1) {
          f.move = null;
          f.object.position.copy(f.path[f.path.length - 1]);
          f.object.rotation.y = f.endYaw;
          f.object.scale.setScalar(1);
          f.path = null;
        } else wants = true;
        stage.contact.set(`fig:${f.def.id}`, f.object.position.x, f.object.position.z, 0.34 * f.object.scale.x);
      }
      const pf = f.partnerId ? this.figs.get(f.partnerId) : undefined;
      wants = setRobotStatus(f.object as Robot, f.status, t, { figure: walking ? 0 : fa, indicator: ia, partner: pf ? partner.copy(pf.object.position) : null }) || wants;
      if (walking) {
        // neutral arms while walking (a swing only when full motion is allowed)
        const parts = (f.object as Robot).userData.parts;
        const sw = Math.sin(t * 9) * 0.45 * fa;
        parts.armL.rotation.set(sw, 0, -0.14);
        parts.armR.rotation.set(-sw, 0, 0.14);
        parts.head.rotation.set(0, 0, 0);
        parts.figure.rotation.set(0, 0, 0);
        parts.figure.position.y = Math.abs(Math.sin(t * 9)) * 0.03 * fa;
      }
    }
    if (this.flows) wants = this.flows.update(t, stage.amplitude('flow')) || wants;
    wants = this.animateCamera(dt, nowMs) || wants;
    return wants;
  }

  private afterFrame() {
    const b = this.b;
    if (!b) return;
    const now = performance.now();
    const rig = this.stage.rig;
    if (this.mode === 'overview') {
      // dollhouse: façades facing away from the camera keep their full height
      const az = rig.view.azimuth * DEG;
      const sa = Math.sin(az);
      const ca = Math.cos(az);
      const next = { n: ca > 0.05, s: ca < -0.05, e: sa < -0.05, w: sa > 0.05 };
      if (next.n !== this.extVisible.n || next.s !== this.extVisible.s || next.e !== this.extVisible.e || next.w !== this.extVisible.w) {
        this.extVisible = next;
        this.applyWalls();
        this.stage.updateShadows();
      }
    }
    if (now - this.lastViewAt < 160) return;
    this.lastViewAt = now;
    let v: { x: number; y: number; w: number; h: number };
    if (this.mode === 'visit') {
      const p = toPlan(b, { x: this.fp.x, z: this.fp.z });
      v = { x: Math.round((p.x - 0.9) * 4) / 4, y: Math.round((p.y - 0.9) * 4) / 4, w: 1.8, h: 1.8 };
      const place = placeName(b, { x: this.fp.x, z: this.fp.z });
      if (place.id !== this.lastPlace) {
        this.lastPlace = place.id;
        this.events.onPlace(place);
      }
    } else {
      const t = rig.target;
      const d = rig.distance;
      const p = toPlan(b, { x: t.x, z: t.z });
      const w = Math.min(b.width + 4, d * 0.62);
      const h = Math.min(b.depth + 4, d * 0.4);
      v = { x: Math.round((p.x - w / 2) * 2) / 2, y: Math.round((p.y - h / 2) * 2) / 2, w: Math.round(w * 2) / 2, h: Math.round(h * 2) / 2 };
      if (this.lastPlace) {
        this.lastPlace = '';
        this.events.onPlace(null);
      }
    }
    const key = `${v.x}:${v.y}:${v.w}:${v.h}`;
    if (key !== this.lastViewKey) {
      this.lastViewKey = key;
      this.events.onView(v);
    }
  }

  /* ================================================================ */
  /* Labels / occlusion helpers                                        */
  /* ================================================================ */

  /** World anchor above an agent; a point behind the camera when hidden (visit: out of sight). */
  agentAnchor(id: string): THREE.Vector3 {
    const f = this.figs.get(id);
    if (!f) return this.hiddenPoint();
    const p = f.object.position;
    const y = f.kind === 'robot' ? 1.5 * f.object.scale.x + p.y : f.kind === 'person' ? 1.38 : f.kind === 'drone' ? 1.3 : 1.18;
    if (this.mode === 'visit' && this.b) {
      const c = { x: this.fp.x, z: this.fp.z };
      if (Math.hypot(p.x - c.x, p.z - c.z) > 18 || blocked(this.b, c, { x: p.x, z: p.z })) return this.hiddenPoint();
    }
    return f.anchor.set(p.x, y, p.z);
  }

  /** True when a world point is hidden by a wall from the visit camera. */
  occluded(p: { x: number; z: number }): boolean {
    if (this.mode !== 'visit' || !this.b) return false;
    return blocked(this.b, { x: this.fp.x, z: this.fp.z }, p);
  }

  private hiddenPoint() {
    const cam = this.stage.camera;
    const dir = cam.getWorldDirection(new THREE.Vector3());
    return this.hidden.copy(cam.position).addScaledVector(dir, -20);
  }

  figurePosition(id: string): THREE.Vector3 | null {
    return this.figs.get(id)?.object.position ?? null;
  }

  /* ================================================================ */
  /* Highlights                                                        */
  /* ================================================================ */

  highlight(which: 'hover' | 'select', space: Space | null) {
    const prev = this.frames[which];
    if (prev && prev.userData.spaceId === space?.id) return;
    if (prev) {
      prev.removeFromParent();
      prev.traverse((o) => (o as THREE.Mesh).geometry?.userData.owned && (o as THREE.Mesh).geometry.dispose());
      this.frames[which] = null;
    }
    if (space && this.scene) {
      const kit = this.stage.kit;
      const r = space.rect;
      const inset = 0.2;
      const t = which === 'select' ? 0.07 : 0.045;
      const w = r.x1 - r.x0 - inset * 2;
      const d = r.z1 - r.z0 - inset * 2;
      const g = new THREE.Group();
      const mat = kit.emissive(which === 'select' ? kit.palette.accent : kit.palette.scheme === 'dark' ? '#ffffff' : kit.palette.inkSoft, which === 'select' ? 1 : 0.55);
      for (const [x, z, sx, sz] of [
        [0, -d / 2, w, t], [0, d / 2, w, t], [-w / 2, 0, t, d], [w / 2, 0, t, d],
      ] as Array<[number, number, number, number]>) {
        const m = new THREE.Mesh(kit.box(sx, 0.012, sz), mat);
        m.position.set(x, 0.012, z);
        m.renderOrder = 2;
        g.add(m);
      }
      g.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2);
      g.userData.spaceId = space.id;
      this.scene.root.add(g);
      this.frames[which] = g;
    }
    this.stage.invalidate();
  }

  /* ================================================================ */
  /* Camera                                                            */
  /* ================================================================ */

  private flightMs() {
    const q = this.stage.quality;
    if (q.level === 'minimal' || q.reducedMotion || q.motion === 'none') return 0;
    return Math.round(clamp(1000 / this.settings.speed, 350, 2200));
  }

  private setFov(fov: number, instant = false) {
    const cam = this.stage.camera as THREE.PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const ms = instant ? 0 : this.flightMs();
    if (ms <= 0) {
      this.fov = null;
      cam.fov = fov;
      cam.updateProjectionMatrix();
      this.stage.invalidate();
      return;
    }
    this.fov = { from: cam.fov, to: fov, t0: performance.now(), ms };
    this.stage.invalidate();
  }

  private applyVisitOpts() {
    const rig = this.stage.rig;
    const b = this.b!;
    rig.opts.minDistance = 0.2;
    rig.opts.maxDistance = 0.8;
    rig.opts.minPolar = 48;
    rig.opts.maxPolar = 122;
    rig.opts.bounds = new THREE.Box3(new THREE.Vector3(b.bounds.x0 - 6, 0, b.bounds.z0 - 6), new THREE.Vector3(b.bounds.x1 + 6, 2.6, b.bounds.z1 + 6));
  }

  private applyFp(instant = true) {
    const { x, z, az, polar } = this.fp;
    const o = new THREE.Vector3(Math.sin(polar) * Math.sin(az), Math.cos(polar), Math.sin(polar) * Math.cos(az));
    const target: [number, number, number] = [x - o.x * FPV_DIST, EYE - o.y * FPV_DIST, z - o.z * FPV_DIST];
    if (!instant) this.stage.rig.opts.tweenMs = this.flightMs();
    this.stage.rig.setView({ target, distance: FPV_DIST, azimuth: az / DEG, polar: polar / DEG }, instant);
  }

  private applyWalls() {
    const s = this.scene;
    if (!s) return;
    const visit = this.mode === 'visit';
    s.caps.visible = !visit;
    s.upperInt.visible = visit;
    s.upperExt.n.visible = visit || this.extVisible.n;
    s.upperExt.s.visible = visit || this.extVisible.s;
    s.upperExt.e.visible = visit || this.extVisible.e;
    s.upperExt.w.visible = visit || this.extVisible.w;
    s.ceiling.visible = visit && this.settings.ceiling;
    this.stage.invalidate();
  }

  setSettings(next: Settings) {
    const ceilingChanged = next.ceiling !== this.settings.ceiling;
    this.settings = next;
    if (ceilingChanged) this.applyWalls();
  }

  /** Evening: lower exposure, dusk-tinted background (re-applied after theme/quality changes, which reset them). */
  applyAmbience(evening: boolean) {
    this.evening = evening;
    const stage = this.stage;
    const dark = stage.palette.scheme === 'dark';
    stage.renderer.toneMappingExposure = evening ? (dark ? 0.84 : 0.76) : 1;
    const bg = stage.palette.background.clone();
    if (evening) bg.lerp(new THREE.Color(dark ? '#0b1022' : '#cfd3e6'), dark ? 0.35 : 0.5);
    stage.scene.background = bg;
    stage.invalidate();
  }

  /** Overview → visit (at a room, or the reception entrance). */
  enterVisit(spaceId?: string) {
    const b = this.b;
    if (!b) return;
    if (this.mode === 'visit') {
      if (spaceId) this.goToSpace(spaceId);
      return;
    }
    this.mode = 'visit';
    this.walk = null;
    this.applyVisitOpts();
    const s = spaceId ? b.byId.get(spaceId) : undefined;
    if (s) {
      const into = -s.doorSide;
      this.fp = { x: s.inner.x, z: s.inner.z + into * 0.5, az: s.doorSide > 0 ? 0 : Math.PI, polar: 86 * DEG };
    } else if (b.reception?.entrance) {
      const e = b.reception.entrance;
      this.fp = { x: e.x, z: e.z - 0.9, az: 0, polar: 87 * DEG };
    } else {
      const c = b.corridors[0];
      this.fp = { x: 0, z: c.z, az: Math.PI / 2, polar: 87 * DEG };
    }
    this.applyWalls();
    this.stage.updateShadows();
    this.setFov(VISIT_FOV);
    this.applyFp(this.flightMs() === 0);
    this.lastPlace = '';
    this.events.onMode('visit');
  }

  enterOverview() {
    if (this.mode === 'overview') {
      this.stage.rig.opts.tweenMs = this.flightMs();
      this.stage.rig.reset(this.flightMs() === 0);
      return;
    }
    this.mode = 'overview';
    this.walk = null;
    this.keys.clear();
    if (this.overviewOpts) Object.assign(this.stage.rig.opts, this.overviewOpts);
    this.applyWalls();
    this.stage.updateShadows();
    this.setFov(OVERVIEW_FOV);
    this.stage.rig.opts.tweenMs = this.flightMs();
    if (this.home) this.stage.rig.setView(this.home, this.flightMs() === 0);
    this.events.onMode('overview');
  }

  /** "Go to" a room: overview → soft flight above it; visit → walk there through the doors. */
  goToSpace(spaceId: string) {
    const b = this.b;
    const s = b?.byId.get(spaceId);
    if (!b || !s) return;
    if (this.mode === 'overview') {
      const rig = this.stage.rig;
      rig.opts.tweenMs = this.flightMs();
      rig.setView({ target: [s.center.x, 0, s.center.z], distance: 17, polar: 48 }, this.flightMs() === 0);
      return;
    }
    const inside = { x: s.center.x, z: s.center.z + s.doorSide * 0.6 };
    this.walkTo(inside, s.doorSide > 0 ? 0 : Math.PI);
  }

  /** Visit: walks to a floor point (route through doors); overview: flies above it. */
  goToPoint(p: P2) {
    const b = this.b;
    if (!b) return;
    if (this.mode === 'overview') {
      const s = spaceAt(b, p);
      if (s) this.goToSpace(s.id);
      else {
        this.stage.rig.opts.tweenMs = this.flightMs();
        this.stage.rig.setView({ target: [p.x, 0, p.z], distance: 17 }, this.flightMs() === 0);
      }
      return;
    }
    this.walkTo(collide(b, p, 0.45), null);
  }

  focusAgent(id: string) {
    const f = this.figs.get(id);
    if (!f || !this.b) return;
    const p = f.object.position;
    if (this.mode === 'overview') {
      this.stage.rig.opts.tweenMs = this.flightMs();
      this.stage.rig.setView({ target: [p.x, 0.4, p.z], distance: 11 }, this.flightMs() === 0);
    } else {
      // stop 1.3 m before the agent, facing it
      const s = spaceAt(this.b, p);
      const back = s ? { x: s.center.x - p.x, z: s.center.z - p.z } : { x: 0, z: 1 };
      const l = Math.hypot(back.x, back.z) || 1;
      const goal = collide(this.b, { x: p.x + (back.x / l) * 1.4, z: p.z + (back.z / l) * 1.4 }, 0.4);
      this.walkTo(goal, Math.atan2(-(p.x - goal.x), -(p.z - goal.z)));
    }
  }

  private walkTo(goal: P2, endAz: number | null) {
    const b = this.b;
    if (!b) return;
    const pts = route(b, { x: this.fp.x, z: this.fp.z }, goal);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
    const len = cum[cum.length - 1];
    if (this.flightMs() === 0 || len < 0.05) {
      this.fp.x = goal.x;
      this.fp.z = goal.z;
      if (endAz != null) this.fp.az = endAz;
      this.walk = null;
      this.applyFp(true);
      return;
    }
    const speed = 3.4 * this.settings.speed;
    this.walk = { pts, cum, len, t0: performance.now(), dur: clamp((len / speed) * 1000, 400, 9000), endAz };
    this.stage.invalidate();
  }

  private animateCamera(dt: number, nowMs: number): boolean {
    let wants = false;
    if (this.fov) {
      const k = clamp((nowMs - this.fov.t0) / this.fov.ms, 0, 1);
      const cam = this.stage.camera as THREE.PerspectiveCamera;
      cam.fov = this.fov.from + (this.fov.to - this.fov.from) * smooth(k);
      cam.updateProjectionMatrix();
      if (k >= 1) this.fov = null;
      else wants = true;
    }
    if (this.mode !== 'visit' || !this.b) return wants;
    if (this.walk) {
      const w = this.walk;
      const k = clamp((nowMs - w.t0) / w.dur, 0, 1);
      const s = smooth(k) * w.len;
      let i = 1;
      while (i < w.cum.length - 1 && w.cum[i] < s) i++;
      const a = w.pts[i - 1];
      const c = w.pts[i];
      const u = clamp((s - w.cum[i - 1]) / Math.max(1e-6, w.cum[i] - w.cum[i - 1]), 0, 1);
      this.fp.x = a.x + (c.x - a.x) * u;
      this.fp.z = a.z + (c.z - a.z) * u;
      const heading = Math.atan2(-(c.x - a.x), -(c.z - a.z));
      if (Math.hypot(c.x - a.x, c.z - a.z) > 0.05) this.fp.az = lerpAngle(this.fp.az, k > 0.9 && w.endAz != null ? w.endAz : heading, 0.12);
      this.fp.polar = this.fp.polar + (86 * DEG - this.fp.polar) * 0.1;
      if (k >= 1) {
        if (w.endAz != null) this.fp.az = lerpAngle(this.fp.az, w.endAz, 1);
        this.walk = null;
      } else wants = true;
      this.applyFp(true);
      return true;
    }
    if (this.keys.size && this.stage.quality.motion !== 'none') {
      this.step(dt);
      wants = true;
    }
    return wants;
  }

  /** Moves the visitor for `dt` seconds according to the held keys. */
  private step(dt: number) {
    const k = this.keys;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const turn = (k.has('ArrowLeft') || k.has('KeyQ') ? 1 : 0) - (k.has('ArrowRight') || k.has('KeyE') ? 1 : 0);
    this.fp.az += turn * 1.8 * dt;
    if (fwd || side) {
      const v = 2.6 * this.settings.speed * dt;
      const hx = -Math.sin(this.fp.az);
      const hz = -Math.cos(this.fp.az);
      const nx = this.fp.x + (hx * fwd + -hz * side) * v;
      const nz = this.fp.z + (hz * fwd + hx * side) * v;
      const c = collide(this.b!, { x: nx, z: nz });
      this.fp.x = c.x;
      this.fp.z = c.z;
    }
    this.applyFp(true);
  }

  private look(dx: number, dy: number) {
    this.fp.az += dx * 0.0042;
    this.fp.polar = clamp(this.fp.polar + dy * 0.0035, 50 * DEG, 120 * DEG);
    this.walk = null;
    this.applyFp(true);
  }

  private advance(meters: number) {
    const hx = -Math.sin(this.fp.az);
    const hz = -Math.cos(this.fp.az);
    const c = collide(this.b!, { x: this.fp.x + hx * meters, z: this.fp.z + hz * meters });
    this.fp.x = c.x;
    this.fp.z = c.z;
    this.walk = null;
    this.applyFp(true);
  }

  private zoomFov(factor: number) {
    const cam = this.stage.camera as THREE.PerspectiveCamera;
    this.fov = null;
    cam.fov = clamp(cam.fov * factor, 32, 74);
    cam.updateProjectionMatrix();
    this.stage.invalidate();
  }

  /* ================================================================ */
  /* Input                                                             */
  /* ================================================================ */

  /** Shared tap logic (both modes): double tap detection + floor point. */
  tap(hit: PickHit | null, clientX: number, clientY: number) {
    const now = performance.now();
    const dbl = !!this.lastTap && now - this.lastTap.t < 380 && Math.hypot(clientX - this.lastTap.x, clientY - this.lastTap.y) < 28;
    this.lastTap = dbl ? null : { t: now, x: clientX, y: clientY };
    if (hit && this.occluded({ x: hit.point.x, z: hit.point.z })) hit = null;
    const r = this.stage.canvas.getBoundingClientRect();
    const fp = this.stage.rig.floorPoint(clientX - r.left, clientY - r.top);
    let floor: P2 | null = fp ? { x: fp.x, z: fp.z } : null;
    if (floor && this.occluded(floor)) floor = null;
    this.events.onTap(hit, dbl, floor);
  }

  private attachInput() {
    const el = this.stage.container;
    const canvas = this.stage.canvas;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.listeners.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    on(
      'keydown',
      (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (this.mode === 'overview') {
          if (e.code === 'KeyV' && e.target === canvas) {
            e.preventDefault();
            e.stopPropagation();
            this.enterVisit();
          }
          return;
        }
        const moveKeys = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (moveKeys.includes(e.code)) {
          e.preventDefault();
          e.stopPropagation();
          this.walk = null;
          if (this.stage.quality.motion === 'none') {
            // no frame loop at "minimal": one step per key press (auto-repeat)
            this.keys.clear();
            this.keys.add(e.code);
            this.step(0.16);
            this.keys.clear();
          } else {
            this.keys.add(e.code);
            this.stage.invalidate();
          }
          return;
        }
        if (e.key === '0' || e.code === 'Escape' || e.code === 'KeyV') {
          e.preventDefault();
          e.stopPropagation();
          this.enterOverview();
          return;
        }
        if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') {
          e.preventDefault();
          e.stopPropagation();
          this.zoomFov(e.key === '+' || e.key === '=' ? 0.9 : 1 / 0.9);
        }
      },
      { capture: true },
    );
    on('keyup', (e) => {
      if (this.keys.delete(e.code)) this.stage.invalidate();
    }, { capture: true });
    on('focusout', () => this.keys.clear());

    on(
      'pointerdown',
      (e) => {
        if (this.mode !== 'visit' || e.target !== canvas) return;
        e.stopPropagation();
        canvas.focus({ preventScroll: true });
        const p = local(e);
        if (e.pointerType === 'touch') {
          this.touches.set(e.pointerId, p);
          if (this.touches.size === 2) {
            const [a, c] = [...this.touches.values()];
            this.pinch = Math.hypot(a.x - c.x, a.y - c.y);
            this.drag = null;
            return;
          }
        }
        if (this.touches.size > 1) return;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        this.drag = { id: e.pointerId, x: p.x, y: p.y, sx: p.x, sy: p.y, type: e.pointerType, moved: false, t: performance.now() };
        this.walk = null;
      },
      { capture: true },
    );
    on(
      'pointermove',
      (e) => {
        if (this.mode !== 'visit') return;
        const p = local(e);
        if (e.pointerType === 'touch' && this.touches.has(e.pointerId)) {
          e.stopPropagation();
          this.touches.set(e.pointerId, p);
          if (this.touches.size === 2 && this.pinch) {
            const [a, c] = [...this.touches.values()];
            const d = Math.hypot(a.x - c.x, a.y - c.y);
            if (d > 0 && this.pinch > 0) this.zoomFov(this.pinch / d);
            this.pinch = d;
            return;
          }
        }
        const dr = this.drag;
        if (!dr || dr.id !== e.pointerId) return;
        e.stopPropagation();
        const dx = p.x - dr.x;
        const dy = p.y - dr.y;
        dr.x = p.x;
        dr.y = p.y;
        if (!dr.moved && Math.hypot(p.x - dr.sx, p.y - dr.sy) > (dr.type === 'touch' ? 8 : 4)) dr.moved = true;
        if (!dr.moved) return;
        if (dr.type === 'touch') {
          // one finger: horizontal = look around, vertical = walk forward / back
          this.fp.az += dx * 0.0055;
          this.applyFp(true);
          if (Math.abs(dy) > 0.2) this.advance(-dy * 0.03 * this.settings.speed);
        } else this.look(dx, dy);
      },
      { capture: true },
    );
    const end = (e: PointerEvent) => {
      if (this.mode !== 'visit') return;
      if (e.pointerType === 'touch') {
        const had = this.touches.delete(e.pointerId);
        if (this.touches.size < 2) this.pinch = null;
        if (had) e.stopPropagation();
      }
      const dr = this.drag;
      if (!dr || dr.id !== e.pointerId) return;
      e.stopPropagation();
      this.drag = null;
      if (e.type === 'pointerup' && !dr.moved && performance.now() - dr.t < 600) {
        const p = local(e);
        const hit = this.stage.picker.pick(p.x, p.y, this.stage.size.w, this.stage.size.h, this.stage.camera);
        this.tap(hit, e.clientX, e.clientY);
      }
    };
    on('pointerup', end, { capture: true });
    on('pointercancel', end, { capture: true });
    on(
      'wheel',
      (e) => {
        if (this.mode !== 'visit') return;
        e.preventDefault();
        e.stopPropagation();
        this.zoomFov(Math.exp(clamp(e.deltaY, -120, 120) * 0.0015));
      },
      { capture: true, passive: false },
    );
  }

  dispose() {
    this.offAnimator?.();
    this.offFrame?.();
    for (const off of this.listeners) off();
    this.listeners = [];
    this.flows?.dispose();
    this.flows = null;
  }
}

/** Adds points around each corner so the Catmull-Rom tube hugs the corridors. */
function roundCorners(pts: P2[]): P2[] {
  if (pts.length < 3) return pts;
  const out: P2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const l1 = Math.hypot(b.x - a.x, b.z - a.z);
    const l2 = Math.hypot(c.x - b.x, c.z - b.z);
    const r1 = Math.min(0.45, l1 / 2.5);
    const r2 = Math.min(0.45, l2 / 2.5);
    if (l1 > 0.01) out.push({ x: b.x - ((b.x - a.x) / l1) * r1, z: b.z - ((b.z - a.z) / l1) * r1 });
    out.push(b);
    if (l2 > 0.01) out.push({ x: b.x + ((c.x - b.x) / l2) * r2, z: b.z + ((c.z - b.z) / l2) * r2 });
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export { LOW_H, WALL_H };
