/**
 * Figures: LLM agents are robots (face, visor, glowing eyes); deterministic
 * scripts are consoles and shared services are drones — deliberately without
 * a face, so nobody mistakes a cron job for an AI. Humans are simple
 * low-poly people.
 *
 * Every pose/animation is driven ONLY by a status (AgentStatus) passed by the
 * caller, plus the motion amplitude granted by the stage (quality).
 */
import { Color, Group, Mesh, Object3D, Vector3 } from 'three';
import type { AgentStatus } from '@sdk';
import type { ColorLike, MaterialKit } from './materials';
import { mergeColoredParts, mergeParts, type Part } from './optimize';

/** Each figure remembers the kit that built it, so status setters only need the figure. */
const KITS = new WeakMap<Object3D, MaterialKit>();
const kitOf = (o: Object3D): MaterialKit => {
  const k = KITS.get(o);
  if (!k) throw new Error('Figure créée hors du kit 3D');
  return k;
};

/* ------------------------------------------------------------------ */
/* Glow ring                                                           */
/* ------------------------------------------------------------------ */

export interface GlowRing extends Group {
  userData: { ring: Mesh; glow: Mesh; color: string; strength: number };
}

/** Thin glowing torus + soft halo disc. 2 draw calls. */
export function createGlowRing(kit: MaterialKit, color: ColorLike, opts: { radius?: number } = {}): GlowRing {
  const r = opts.radius ?? 0.42;
  const g = new Group() as GlowRing;
  g.name = 'glow-ring';
  const ring = new Mesh(kit.torus(r, 0.02, 8, 64), kit.emissive(color));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.025;
  const glow = new Mesh(kit.disc(r * 1.65, 40), kit.glowDisc(color, 1));
  glow.position.y = 0.014;
  glow.renderOrder = 2;
  g.add(glow, ring);
  g.userData = { ring, glow, color: String(color), strength: 1 };
  KITS.set(g, kit);
  return g;
}

/** Re-colours a glow ring (materials are shared through the kit cache). */
export function setGlowRing(ring: GlowRing, color: Color, strength = 1) {
  const kit = kitOf(ring);
  const k = `#${color.getHexString()}`;
  const s = Math.round(strength * 20) / 20;
  if (ring.userData.color === k && ring.userData.strength === s) return;
  ring.userData.color = k;
  ring.userData.strength = s;
  ring.userData.ring.material = s < 0.4 ? kit.emissive(color.clone().lerp(kit.palette.floor, 0.55)) : kit.emissive(color);
  ring.userData.glow.material = kit.glowDisc(k, s);
}

/* ------------------------------------------------------------------ */
/* Robot (LLM agent)                                                   */
/* ------------------------------------------------------------------ */

export type Accessory = 'none' | 'glasses' | 'headset' | 'cap' | 'badge' | 'visor' | 'scarf';

export interface RobotOptions {
  color: ColorLike;
  accessory?: Accessory;
  /** Overall scale (1 ≈ 1.2 m tall). */
  scale?: number;
}

export interface RobotParts {
  figure: Group;
  body: Mesh;
  head: Group;
  eyes: Mesh;
  armL: Group;
  armR: Group;
  ring: GlowRing;
}

export interface Robot extends Group {
  userData: { kind: 'robot'; parts: RobotParts; status: AgentStatus | null; statusAt: number; selection?: unknown; [k: string]: unknown };
}

export function createRobot(kit: MaterialKit, opts: RobotOptions): Robot {
  const root = new Group() as Robot;
  root.name = 'robot';
  const body = kit.plastic(opts.color);
  const light = kit.plastic(new Color(opts.color).lerp(new Color('#ffffff'), 0.55));
  const figure = new Group();
  root.add(figure);

  // torso + legs + feet (one mesh)
  const torso = new Mesh(
    kit.geo('robot:torso', () =>
      mergeParts([
        { geometry: kit.capsule(0.18, 0.12, 8, 20), position: [0, 0.44, 0], scale: [1.05, 1, 0.92] },
        { geometry: kit.capsule(0.055, 0.1, 4, 10), position: [-0.085, 0.15, 0] },
        { geometry: kit.capsule(0.055, 0.1, 4, 10), position: [0.085, 0.15, 0] },
        { geometry: kit.roundedBox(0.13, 0.07, 0.19, 0.03, 2), position: [-0.088, 0.035, 0.025] },
        { geometry: kit.roundedBox(0.13, 0.07, 0.19, 0.03, 2), position: [0.088, 0.035, 0.025] },
      ]),
    ),
    body,
  );
  torso.castShadow = true;
  figure.add(torso);

  const head = new Group();
  head.position.y = 0.68;
  figure.add(head);
  const acc = opts.accessory ?? 'none';
  const headParts: Part[] = [
    { geometry: kit.sphere(0.25, 28, 20), position: [0, 0.23, 0], scale: [1.1, 0.93, 1] },
    { geometry: kit.cylinder(0.012, 0.012, 0.09, 8), position: [0, 0.5, 0] },
    { geometry: kit.sphere(0.032, 12, 8), position: [0, 0.555, 0] },
  ];
  if (acc === 'headset') {
    headParts.push({ geometry: kit.torus(0.27, 0.018, 6, 24, Math.PI), position: [0, 0.24, 0], scale: [1.02, 1.08, 1] });
    headParts.push({ geometry: kit.cylinder(0.06, 0.06, 0.05, 16), position: [-0.275, 0.22, 0], rotation: [0, 0, Math.PI / 2] });
    headParts.push({ geometry: kit.cylinder(0.06, 0.06, 0.05, 16), position: [0.275, 0.22, 0], rotation: [0, 0, Math.PI / 2] });
  }
  if (acc === 'cap') {
    headParts.push({ geometry: kit.sphere(0.262, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.27, -0.01], scale: [1.1, 0.9, 1] });
    headParts.push({ geometry: kit.cylinder(0.16, 0.16, 0.018, 20), position: [0, 0.33, 0.2], scale: [1, 1, 0.8] });
  }
  // head shell + dark glossy visor in ONE mesh (vertex colours)
  const headMesh = new Mesh(
    mergeColoredParts([
      { color: opts.color, parts: headParts },
      { color: '#10131b', parts: [{ geometry: kit.sphere(0.252, 28, 18, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.3, Math.PI * 0.42), position: [0, 0.23, 0.012], scale: [1.1, 0.93, 1] }] },
    ]),
    kit.vertexPlastic(0.3, 0.85),
  );
  headMesh.castShadow = true;
  head.add(headMesh);
  // eyes
  const eyes = new Mesh(
    kit.geo('robot:eyes', () =>
      mergeParts([
        { geometry: kit.capsule(0.03, 0.035, 4, 10), position: [-0.085, 0.245, 0.245], scale: [1, 1, 0.45], rotation: [0.15, -0.32, 0] },
        { geometry: kit.capsule(0.03, 0.035, 4, 10), position: [0.085, 0.245, 0.245], scale: [1, 1, 0.45], rotation: [0.15, 0.32, 0] },
      ]),
    ),
    kit.emissive(kit.palette.glow),
  );
  head.add(eyes);
  if (acc === 'glasses') {
    const frames = new Mesh(
      kit.geo('robot:glasses', () =>
        mergeParts([
          { geometry: kit.torus(0.058, 0.009, 6, 20), position: [-0.088, 0.245, 0.262], rotation: [0, -0.3, 0] },
          { geometry: kit.torus(0.058, 0.009, 6, 20), position: [0.088, 0.245, 0.262], rotation: [0, 0.3, 0] },
          { geometry: kit.cylinder(0.007, 0.007, 0.06, 6), position: [0, 0.25, 0.275], rotation: [0, 0, Math.PI / 2] },
        ]),
      ),
      light,
    );
    head.add(frames);
  }

  // arms (shoulder pivots)
  const armGeo = kit.geo('robot:arm', () =>
    mergeParts([
      { geometry: kit.capsule(0.05, 0.16, 4, 10), position: [0, -0.13, 0] },
      { geometry: kit.sphere(0.062, 14, 10), position: [0, -0.27, 0.01] },
    ]),
  );
  const mkArm = (side: -1 | 1) => {
    const pivot = new Group();
    pivot.position.set(0.215 * side, 0.57, 0);
    const m = new Mesh(armGeo, body);
    m.castShadow = true;
    pivot.add(m);
    pivot.rotation.z = 0.14 * side;
    figure.add(pivot);
    return pivot;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);

  if (acc === 'badge' || acc === 'scarf') {
    const extra = new Mesh(
      acc === 'badge' ? kit.roundedBox(0.1, 0.07, 0.02, 0.01, 2) : kit.torus(0.15, 0.04, 8, 24),
      acc === 'badge' ? light : kit.plastic('#ffffff', { roughness: 0.6, clearcoat: 0 }),
    );
    if (acc === 'badge') extra.position.set(0.08, 0.52, 0.17);
    else {
      extra.position.set(0, 0.64, 0);
      extra.rotation.x = Math.PI / 2;
    }
    figure.add(extra);
  }

  const ring = createGlowRing(kit, kit.palette.status.idle, { radius: 0.4 });
  root.add(ring);

  const s = opts.scale ?? 1;
  figure.scale.setScalar(s);
  ring.scale.setScalar(Math.max(0.8, s));
  root.userData = { kind: 'robot', parts: { figure, body: torso, head, eyes, armL, armR, ring }, status: null, statusAt: 0 };
  KITS.set(root, kit);
  return root;
}

export interface StatusMotion {
  /** Body motion amplitude 0–1 (stage.amplitude('figure')). */
  figure?: number;
  /** Indicator motion amplitude 0–1 (stage.amplitude('indicator')). */
  indicator?: number;
  /** World position of the collaboration partner, if any. */
  partner?: Vector3 | null;
}

const MOVING: AgentStatus[] = ['working', 'waiting', 'collaborating', 'researching', 'validating'];
const _w = new Vector3();

/**
 * Poses and animates a robot for a status at time `t` (seconds).
 * With zero amplitude the robot holds a still pose that still reads as the status
 * (hands on the keyboard, head turned, arm raised…). Returns true while it
 * wants more frames.
 */
export function setRobotStatus(robot: Robot, status: AgentStatus, t: number, m: StatusMotion = {}): boolean {
  const kit = kitOf(robot);
  const ud = robot.userData;
  const p = ud.parts;
  if (ud.status !== status) {
    ud.status = status;
    ud.statusAt = t;
  }
  const a = m.figure ?? 0;
  const i = m.indicator ?? 0;
  const pal = kit.palette;
  // neutral pose
  p.figure.position.y = 0;
  p.figure.rotation.set(0, 0, 0);
  p.head.rotation.set(0, 0, 0);
  p.armL.rotation.set(0, 0, -0.14);
  p.armR.rotation.set(0, 0, 0.14);
  p.eyes.visible = true;
  let eye: Color | string = pal.glow;
  let ringStrength = 1;
  let ringScale = 1;
  const since = t - ud.statusAt;

  switch (status) {
    case 'working': {
      p.armL.rotation.x = -1.05 + Math.sin(t * 16) * 0.14 * a;
      p.armR.rotation.x = -1.05 + Math.sin(t * 16 + Math.PI) * 0.14 * a;
      p.armL.rotation.z = -0.05;
      p.armR.rotation.z = 0.05;
      p.head.rotation.x = 0.12 + Math.sin(t * 2.2) * 0.03 * a;
      p.figure.position.y = Math.abs(Math.sin(t * 8)) * 0.014 * a;
      ringScale = 1 + Math.sin(t * 3) * 0.035 * i;
      break;
    }
    case 'waiting': {
      p.figure.rotation.z = Math.sin(t * 1.5) * 0.05 * a;
      p.head.rotation.z = 0.12 + Math.sin(t * 1.5 + 0.6) * 0.08 * a;
      p.head.rotation.x = -0.05;
      p.armL.rotation.x = 0.08;
      p.armR.rotation.x = 0.08;
      break;
    }
    case 'collaborating': {
      if (m.partner) {
        robot.getWorldPosition(_w);
        const yaw = Math.atan2(m.partner.x - _w.x, m.partner.z - _w.z) - robot.rotation.y;
        p.figure.rotation.y = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      }
      p.armR.rotation.z = 2.5 + Math.sin(t * 7) * 0.32 * a;
      p.armR.rotation.x = -0.2;
      p.head.rotation.x = -0.08;
      break;
    }
    case 'researching': {
      p.head.rotation.y = 0.45 * (1 - a) + Math.sin(t * 1.3) * 0.7 * a;
      p.head.rotation.x = -0.12;
      p.armR.rotation.x = -1.9;
      p.armR.rotation.z = -0.35;
      p.figure.rotation.x = 0.05;
      break;
    }
    case 'validating': {
      p.head.rotation.x = 0.16 + Math.sin(t * 4.2) * 0.2 * a;
      p.armR.rotation.x = -0.7;
      p.armL.rotation.x = -0.35;
      ringScale = 1 + Math.sin(t * 2.4) * 0.03 * i;
      break;
    }
    case 'error': {
      eye = pal.status.error;
      // three short flashes after the status change, then a still, red gaze
      if (i > 0 && since < 1.6) p.eyes.visible = Math.floor(since * 6) % 2 === 0;
      p.head.rotation.x = 0.28;
      p.armL.rotation.x = 0.1;
      p.armR.rotation.x = 0.1;
      break;
    }
    case 'paused':
      eye = new Color(pal.glow).lerp(pal.floor, 0.55);
      p.head.rotation.x = 0.2;
      ringStrength = 0.45;
      break;
    case 'idle':
      ringStrength = 0.5;
      break;
    case 'offline':
      eye = pal.scheme === 'dark' ? '#2a2f3a' : '#3c414c';
      p.head.rotation.x = 0.34;
      ringStrength = 0.22;
      break;
  }
  p.eyes.material = kit.emissive(eye);
  const rc = status === 'offline' ? pal.status.offline : pal.status[status];
  setGlowRing(p.ring, rc, ringStrength);
  p.ring.scale.setScalar(ringScale * Math.max(0.8, p.figure.scale.x));
  const flashing = status === 'error' && i > 0 && since < 1.7;
  return flashing || (MOVING.includes(status) && (a > 0 || ((status === 'working' || status === 'validating') && i > 0)));
}

/* ------------------------------------------------------------------ */
/* Console (deterministic script) and drone (shared service)           */
/* ------------------------------------------------------------------ */

export interface Device extends Group {
  userData: { kind: 'console' | 'drone'; led: Mesh; ring: Mesh; rotor?: Object3D; hover?: Object3D; status: AgentStatus | null; [k: string]: unknown };
}

/** Kiosk terminal for a deterministic script. Body is static (bakeable): only the LED and ring change. */
export function createConsole(kit: MaterialKit, opts: { color: ColorLike }): Device {
  const g = new Group() as Device;
  g.name = 'console';
  const shell = kit.plastic('#f4f5f8', { roughness: 0.4 });
  const accent = kit.plastic(opts.color, { roughness: 0.42 });
  const dark = kit.plastic('#1a1e27', { roughness: 0.3, clearcoat: 0.8 });
  const base = new Mesh(kit.roundedBox(0.56, 0.08, 0.44, 0.035), shell);
  base.position.y = 0.04;
  const column = new Mesh(kit.roundedBox(0.2, 0.62, 0.18, 0.06), accent);
  column.position.set(0, 0.38, -0.02);
  const head = new Mesh(kit.roundedBox(0.6, 0.38, 0.09, 0.04), dark);
  head.position.set(0, 0.8, 0.02);
  head.rotation.x = -0.42;
  const screen = new Mesh(kit.plane(0.5, 0.29), kit.screen());
  screen.position.set(0, 0.8 + Math.sin(0.42) * 0.047, 0.02 + Math.cos(0.42) * 0.047);
  screen.rotation.x = -0.42;
  for (const m of [base, column, head, screen]) {
    m.userData.static = true;
    m.castShadow = m !== screen;
    g.add(m);
  }
  const led = new Mesh(kit.roundedBox(0.3, 0.025, 0.02, 0.01, 1), kit.emissive(kit.palette.status.idle));
  led.position.set(0, 0.6, 0.075);
  led.rotation.x = -0.42;
  const ring = new Mesh(kit.disc(0.46, 40), kit.glowRing(kit.palette.status.idle, 0.6));
  ring.position.y = 0.012;
  ring.renderOrder = 2;
  g.add(led, ring);
  g.userData = { kind: 'console', led, ring, status: null };
  KITS.set(g, kit);
  return g;
}

/** Hovering drone for a shared service (no face, a single lens). */
export function createDrone(kit: MaterialKit, opts: { color: ColorLike }): Device {
  const g = new Group() as Device;
  g.name = 'drone';
  const hover = new Group();
  hover.position.y = 0.78;
  g.add(hover);
  const body = new Mesh(
    mergeColoredParts([
      {
        color: '#f4f5f8',
        parts: [
          { geometry: kit.sphere(0.24, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.02, 0], scale: [1, 0.62, 1] },
          { geometry: kit.cylinder(0.24, 0.2, 0.08, 28), position: [0, -0.02, 0] },
        ],
      },
      { color: opts.color, parts: [{ geometry: kit.torus(0.235, 0.03, 8, 32), rotation: [Math.PI / 2, 0, 0] }] },
    ]),
    kit.vertexPlastic(0.32, 0.7),
  );
  body.castShadow = true;
  const rotor = new Mesh(
    kit.geo('drone:rotor', () =>
      mergeParts([
        { geometry: kit.torus(0.34, 0.016, 6, 40), rotation: [Math.PI / 2, 0, 0], position: [0, 0.03, 0] },
        { geometry: kit.box(0.68, 0.012, 0.03), position: [0, 0.03, 0] },
        { geometry: kit.box(0.03, 0.012, 0.68), position: [0, 0.03, 0] },
      ]),
    ),
    kit.plastic('#c9ced8', { roughness: 0.3 }),
  );
  const led = new Mesh(kit.sphere(0.06, 16, 10), kit.emissive(kit.palette.status.idle));
  led.position.set(0, -0.05, 0.19);
  led.scale.set(1, 0.8, 0.5);
  hover.add(body, rotor, led);
  const ring = new Mesh(kit.disc(0.46, 40), kit.glowRing(kit.palette.status.idle, 0.6));
  ring.position.y = 0.012;
  ring.renderOrder = 2;
  g.add(ring);
  g.userData = { kind: 'drone', led, ring, rotor, hover, status: null };
  KITS.set(g, kit);
  return g;
}

/** Status for consoles and drones: LED + ring colour; rotor spin and hover only with motion. */
export function setDeviceStatus(d: Device, status: AgentStatus, t: number, m: StatusMotion = {}): boolean {
  const kit = kitOf(d);
  const pal = kit.palette;
  const a = m.figure ?? 0;
  const i = m.indicator ?? 0;
  const busy = MOVING.includes(status);
  const c = pal.status[status];
  const strength = status === 'offline' ? 0.25 : status === 'idle' || status === 'paused' ? 0.5 : 0.95;
  d.userData.status = status;
  d.userData.led.material = kit.emissive(status === 'offline' ? '#3a3f4a' : c);
  d.userData.ring.material = kit.glowRing(`#${c.getHexString()}`, strength);
  d.userData.led.visible = !(busy && i > 0 && Math.floor(t * 1.6) % 4 === 3);
  if (d.userData.rotor) d.userData.rotor.rotation.y = busy ? t * 5 * a + 0.4 : 0.4;
  if (d.userData.hover) d.userData.hover.position.y = (status === 'offline' ? 0.5 : 0.78) + Math.sin(t * 2) * 0.04 * a;
  return busy && (a > 0 || i > 0);
}

/* ------------------------------------------------------------------ */
/* Person (human)                                                       */
/* ------------------------------------------------------------------ */

export interface PersonOptions {
  color: ColorLike;
  pose?: 'stand' | 'sit';
  skin?: ColorLike;
  hair?: ColorLike;
}

/** Low-poly humanoid: 4 draw calls. Seated pose fits a 0.48 m chair seat facing +Z. */
export function createPerson(kit: MaterialKit, opts: PersonOptions): Group {
  const g = new Group();
  g.name = 'person';
  const sit = opts.pose === 'sit';
  const shirt = kit.plastic(opts.color, { roughness: 0.55, clearcoat: 0.1 });
  const skin = kit.plastic(opts.skin ?? '#e7bf9f', { roughness: 0.6, clearcoat: 0.1 });
  const pants = kit.matte('#2c3242', 0.7);
  const hair = kit.plastic(opts.hair ?? '#2a2421', { roughness: 0.5, clearcoat: 0.2 });
  const hipY = sit ? 0.5 : 0.86;
  const top = new Mesh(
    kit.geo(`person:top:${sit}`, () =>
      mergeParts([
        { geometry: kit.capsule(0.15, 0.24, 6, 14), position: [0, hipY + 0.28, 0], scale: [1.15, 1, 0.8] },
        { geometry: kit.capsule(0.05, 0.24, 4, 10), position: [-0.2, hipY + 0.33, sit ? 0.12 : 0], rotation: [sit ? -1.15 : 0.05, 0, sit ? 0.1 : 0.08] },
        { geometry: kit.capsule(0.05, 0.24, 4, 10), position: [0.2, hipY + 0.33, sit ? 0.12 : 0], rotation: [sit ? -1.15 : 0.05, 0, sit ? -0.1 : -0.08] },
      ]),
    ),
    shirt,
  );
  const skinMesh = new Mesh(
    kit.geo(`person:skin:${sit}`, () =>
      mergeParts([
        { geometry: kit.sphere(0.12, 18, 14), position: [0, hipY + 0.66, 0], scale: [0.95, 1.08, 1] },
        { geometry: kit.cylinder(0.045, 0.05, 0.08, 10), position: [0, hipY + 0.52, 0] },
        { geometry: kit.sphere(0.045, 10, 8), position: [-0.21, sit ? hipY + 0.26 : hipY + 0.12, sit ? 0.33 : 0.01] },
        { geometry: kit.sphere(0.045, 10, 8), position: [0.21, sit ? hipY + 0.26 : hipY + 0.12, sit ? 0.33 : 0.01] },
      ]),
    ),
    skin,
  );
  const hairMesh = new Mesh(kit.sphere(0.128, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairMesh.position.set(0, hipY + 0.68, -0.012);
  hairMesh.rotation.x = -0.25;
  const legs = new Mesh(
    kit.geo(`person:legs:${sit}`, () =>
      mergeParts(
        sit
          ? [
              { geometry: kit.capsule(0.075, 0.3, 4, 10), position: [-0.09, hipY, 0.18], rotation: [Math.PI / 2, 0, 0] },
              { geometry: kit.capsule(0.075, 0.3, 4, 10), position: [0.09, hipY, 0.18], rotation: [Math.PI / 2, 0, 0] },
              { geometry: kit.capsule(0.065, 0.3, 4, 10), position: [-0.09, 0.27, 0.36] },
              { geometry: kit.capsule(0.065, 0.3, 4, 10), position: [0.09, 0.27, 0.36] },
              { geometry: kit.roundedBox(0.1, 0.07, 0.2, 0.03, 2), position: [-0.09, 0.035, 0.41] },
              { geometry: kit.roundedBox(0.1, 0.07, 0.2, 0.03, 2), position: [0.09, 0.035, 0.41] },
            ]
          : [
              { geometry: kit.capsule(0.075, 0.6, 4, 10), position: [-0.09, hipY - 0.4, 0] },
              { geometry: kit.capsule(0.075, 0.6, 4, 10), position: [0.09, hipY - 0.4, 0] },
              { geometry: kit.roundedBox(0.1, 0.07, 0.2, 0.03, 2), position: [-0.09, 0.035, 0.04] },
              { geometry: kit.roundedBox(0.1, 0.07, 0.2, 0.03, 2), position: [0.09, 0.035, 0.04] },
            ],
      ),
    ),
    pants,
  );
  for (const m of [top, skinMesh, hairMesh, legs]) {
    m.castShadow = true;
    g.add(m);
  }
  g.userData.kind = 'person';
  return g;
}
