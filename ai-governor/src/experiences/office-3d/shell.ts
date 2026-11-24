/**
 * The closed room of the 3D office: back and left walls with windows, low
 * front / right walls (cut-away dollhouse), skirting, a name plaque, a wall
 * clock showing the real time of the view, floor lamps, and the ambiance
 * (day: bright sky and sun patches; evening: dusk sky, warm lamps).
 *
 * Static parts are baked (a handful of draw calls). Only the clock hands
 * and, in the evening, a few point lights are separate.
 */
import { THREE, bakeStatic, markStatic, type ScenePalette, type Stage3D } from '@ds/three';

export type Ambiance = 'day' | 'evening';

type Group = InstanceType<typeof THREE.Group>;
type Mesh = InstanceType<typeof THREE.Mesh>;
type Material = InstanceType<typeof THREE.Material>;

export interface ShellOptions {
  width: number;
  depth: number;
  height: number;
  ambiance: Ambiance;
  /** Windows, plaque, clock, lamps (off on phones / minimal quality). */
  detail: boolean;
  /** Floor lamps (x, z world). */
  lamps: Array<[number, number]>;
}

export interface Shell {
  group: Group;
  clock: { hour: Group; minute: Group } | null;
  lights: Array<InstanceType<typeof THREE.PointLight>>;
}

const T = 0.18;

function owned<M extends Material>(m: M): M {
  m.userData.owned = true;
  return m;
}

/** Vertical sky gradient seen through the windows. */
function skyTexture(stage: Stage3D, amb: Ambiance) {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 128);
  if (amb === 'day') {
    grd.addColorStop(0, '#6fb0ee');
    grd.addColorStop(0.62, '#bfe0fb');
    grd.addColorStop(1, '#eef7ff');
  } else {
    grd.addColorStop(0, '#141a3c');
    grd.addColorStop(0.5, '#3d3468');
    grd.addColorStop(0.82, '#b4637a');
    grd.addColorStop(1, '#f2a35e');
  }
  g.fillStyle = grd;
  g.fillRect(0, 0, 32, 128);
  if (amb === 'day') {
    // a few soft clouds
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (const [x, y, r] of [[8, 34, 7], [14, 31, 9], [22, 36, 6], [5, 70, 5], [11, 68, 7]]) {
      g.beginPath();
      g.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    // distant city lights near the horizon
    g.fillStyle = 'rgba(255,214,150,0.9)';
    for (let i = 0; i < 18; i++) g.fillRect((i * 7.3) % 31, 112 + ((i * 5) % 12), 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  stage.kit.track(`o3:sky:${amb}`, tex);
  return tex;
}

/** Linear alpha ramp (opaque at v = 1 → transparent at v = 0) for sun patches. */
function rampTexture(stage: Stage3D) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, '#ffffff');
  grd.addColorStop(1, '#000000');
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 64);
  const tex = new THREE.CanvasTexture(c);
  stage.kit.track('o3:ramp', tex);
  return tex;
}

function plaqueTexture(stage: Stage3D, pal: ScenePalette) {
  const c = document.createElement('canvas');
  c.width = 384;
  c.height = 72;
  const g = c.getContext('2d')!;
  const dark = pal.scheme === 'dark';
  g.scale(0.75, 0.75);
  g.fillStyle = dark ? '#151922' : '#ffffff';
  g.beginPath();
  g.roundRect(0, 0, 512, 96, 18);
  g.fill();
  g.fillStyle = pal.css.accent;
  g.beginPath();
  g.roundRect(22, 26, 44, 44, 12);
  g.fill();
  g.strokeStyle = '#ffffff';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(44, 34);
  g.lineTo(58, 42);
  g.lineTo(58, 56);
  g.lineTo(44, 64);
  g.lineTo(30, 56);
  g.lineTo(30, 42);
  g.closePath();
  g.stroke();
  g.fillStyle = dark ? '#eef1f7' : '#15171d';
  g.font = `800 38px ${pal.css.font}`;
  g.textBaseline = 'middle';
  g.fillText('AI GOVERNOR', 84, 42);
  g.font = `600 18px ${pal.css.font}`;
  g.fillStyle = dark ? 'rgba(230,234,244,0.62)' : 'rgba(20,24,32,0.55)';
  g.fillText('Mountassir · supervision IA', 86, 74);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  stage.kit.track('o3:plaque', tex);
  return tex;
}

function box(parent: Group, w: number, h: number, d: number, mat: Material, x: number, y: number, z: number, kit: Stage3D['kit'], shadow = true) {
  const m = new THREE.Mesh(kit.box(round(w), round(h), round(d)), mat);
  m.position.set(x, y, z);
  m.castShadow = false;
  m.receiveShadow = shadow;
  parent.add(m);
  return m;
}
const round = (v: number) => Math.round(v * 1000) / 1000;

/**
 * A wall along local X (length L, centred), inner face towards +Z, with
 * window openings centred at `windows` (local x).
 */
function wall(stage: Stage3D, L: number, H: number, windows: number[], ww: number, wh: number, sill: number, mats: { wall: Material; frame: Material; sill: Material; glass: Material; skirting: Material }) {
  const kit = stage.kit;
  const g = new THREE.Group();
  const top = sill + wh;
  box(g, L, sill, T, mats.wall, 0, sill / 2, 0, kit);
  box(g, L, H - top, T, mats.wall, 0, top + (H - top) / 2, 0, kit);
  // piers between openings
  const edges = [-L / 2, ...windows.flatMap((x) => [x - ww / 2, x + ww / 2]), L / 2];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const b = edges[i + 1];
    if (b - a > 0.01) box(g, b - a, wh, T, mats.wall, (a + b) / 2, sill + wh / 2, 0, kit);
  }
  // skirting on the inner face
  box(g, L, 0.08, 0.02, mats.skirting, 0, 0.04, T / 2 + 0.01, kit, false);
  for (const x of windows) {
    const glass = new THREE.Mesh(kit.plane(round(ww), round(wh)), mats.glass);
    glass.position.set(x, sill + wh / 2, -0.02);
    g.add(glass);
    const f = 0.055;
    const fd = T + 0.03;
    box(g, ww + f, f, fd, mats.frame, x, sill, 0, kit, false);
    box(g, ww + f, f, fd, mats.frame, x, top, 0, kit, false);
    box(g, f, wh, fd, mats.frame, x - ww / 2, sill + wh / 2, 0, kit, false);
    box(g, f, wh, fd, mats.frame, x + ww / 2, sill + wh / 2, 0, kit, false);
    box(g, f * 0.7, wh, fd * 0.6, mats.frame, x, sill + wh / 2, 0, kit, false);
    box(g, ww, f * 0.7, fd * 0.6, mats.frame, x, sill + wh * 0.62, 0, kit, false);
    // inner sill ledge
    box(g, ww + 0.22, 0.045, 0.24, mats.sill, x, sill - 0.02, T / 2 + 0.08, kit);
  }
  return g;
}

/** Window centres spread along a wall of length L (local x), keeping the ends free. */
function windowSlots(L: number, ww: number): number[] {
  const n = Math.max(1, Math.min(5, Math.floor((L - 2) / (ww + 1.6))));
  const span = L - 2.4;
  return Array.from({ length: n }, (_, i) => -span / 2 + ((i + 0.5) * span) / n);
}

export function buildShell(stage: Stage3D, opts: ShellOptions): Shell {
  const kit = stage.kit;
  const pal = kit.palette;
  const dark = pal.scheme === 'dark';
  const { width: W, depth: D, height: H, ambiance: amb, detail } = opts;
  const group = new THREE.Group();
  group.name = 'office-shell';
  const statics = new THREE.Group();
  group.add(statics);

  // walls read against the floor: a touch darker / warmer than the floor in light themes, lifted in dark ones
  const wallCol = dark ? pal.slab.clone().lerp(pal.raised, 0.85) : pal.floor.clone().lerp(new THREE.Color('#d9dbe2'), 0.55);
  const mats = {
    wall: kit.matte(`#${wallCol.getHexString()}`, 0.92),
    frame: kit.plastic(dark ? '#0e1117' : '#3a404c', { roughness: 0.35, clearcoat: 0.4 }),
    sill: kit.matte(dark ? '#2a2f3a' : '#fbfbfc', 0.6),
    skirting: kit.matte(dark ? '#0b0d12' : '#d9dbe1', 0.7),
    glass: owned(new THREE.MeshBasicMaterial({ map: detail ? skyTexture(stage, amb) : null, color: detail ? '#ffffff' : amb === 'day' ? '#cfe6fb' : '#33305a', toneMapped: false })),
  };
  const ww = Math.min(2.5, W / 4);
  const wh = Math.max(0.9, Math.min(1.7, H - 1.25));
  const sill = Math.min(0.9, H - wh - 0.3);
  const backSlots = detail ? windowSlots(W, ww) : [];
  const leftSlots = detail ? windowSlots(D, ww) : [];

  // back wall (z = −D/2), inner face +Z
  const back = wall(stage, W + T, H, backSlots, ww, wh, sill, mats);
  back.position.set(-T / 2, 0, -D / 2 - T / 2);
  statics.add(back);
  // left wall (x = −W/2), inner face +X
  const left = wall(stage, D, H, leftSlots, ww, wh, sill, mats);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2 - T / 2, 0, 0);
  statics.add(left);
  // low front and right walls (the cut-away side)
  const low = 0.34;
  box(statics, W + 2 * T, low, T, mats.wall, 0, low / 2, D / 2 + T / 2, kit);
  box(statics, T, low, D + T, mats.wall, W / 2 + T / 2, low / 2, -T / 2, kit);
  // wall caps (a slightly darker top edge reads as thickness from above)
  const cap = kit.matte(`#${wallCol.clone().lerp(new THREE.Color(dark ? '#000000' : '#7d8390'), dark ? 0.3 : 0.4).getHexString()}`, 0.8);
  box(statics, W + T, 0.02, T + 0.002, cap, -T / 2, H + 0.01, -D / 2 - T / 2, kit, false);
  box(statics, T + 0.002, 0.02, D, cap, -W / 2 - T / 2, H + 0.01, 0, kit, false);
  box(statics, W + 2 * T, 0.02, T + 0.002, cap, 0, low + 0.01, D / 2 + T / 2, kit, false);
  box(statics, T + 0.002, 0.02, D + T, cap, W / 2 + T / 2, low + 0.01, -T / 2, kit, false);

  let clock: Shell['clock'] = null;
  const lights: Shell['lights'] = [];
  if (detail) {
    // name plaque on the left wall, near the back corner (between the corner and the first window)
    const pw = 2.0;
    const plaque = new THREE.Mesh(kit.plane(pw, 0.375), owned(new THREE.MeshBasicMaterial({ map: plaqueTexture(stage, pal), toneMapped: false })));
    plaque.rotation.y = Math.PI / 2;
    plaque.position.set(-W / 2 + 0.012, Math.min(H - 0.45, 2.0), -D / 2 + 0.3 + pw / 2);
    statics.add(plaque);

    // wall clock between the first two back windows (real time of the view)
    const cx = backSlots.length > 1 ? (backSlots[0] + backSlots[1]) / 2 - T / 2 : -W / 2 + 0.9;
    const cy = Math.min(H - 0.45, sill + wh * 0.7);
    const face = new THREE.Mesh(kit.cylinder(0.3, 0.3, 0.04, 40), kit.matte(dark ? '#e9ecf2' : '#ffffff', 0.5));
    face.rotation.x = Math.PI / 2;
    face.position.set(cx, cy, -D / 2 + 0.03);
    statics.add(face);
    const rim = new THREE.Mesh(kit.torus(0.3, 0.025, 8, 40), mats.frame);
    rim.position.set(cx, cy, -D / 2 + 0.05);
    statics.add(rim);
    const handMat = kit.matte('#1a1d24', 0.5);
    const mk = (len: number, wdt: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(cx, cy, -D / 2 + 0.06);
      const hand = new THREE.Mesh(kit.box(wdt, len, 0.012), handMat);
      hand.position.y = len / 2 - 0.03;
      pivot.add(hand);
      group.add(pivot);
      return pivot;
    };
    clock = { hour: mk(0.17, 0.03), minute: mk(0.25, 0.02) };

    // floor lamps
    const shadeMat = amb === 'evening' ? kit.emissive('#ffd39a') : kit.matte('#f4efe6', 0.6);
    for (const [x, z] of opts.lamps) {
      box(statics, 0.03, 1.55, 0.03, kit.metal('dark'), x, 0.78, z, kit, false);
      const base = new THREE.Mesh(kit.cylinder(0.17, 0.19, 0.03, 24), kit.metal('dark'));
      base.position.set(x, 0.015, z);
      statics.add(base);
      const shade = new THREE.Mesh(kit.cylinder(0.16, 0.24, 0.26, 24, true), shadeMat);
      shade.position.set(x, 1.62, z);
      statics.add(shade);
      if (amb === 'evening') {
        const pool = new THREE.Mesh(kit.disc(1.5, 40), kit.glowDisc('#ffb066', dark ? 0.55 : 0.4));
        pool.position.set(x, 0.014, z);
        pool.renderOrder = 2;
        group.add(pool);
        const l = new THREE.PointLight('#ffb36b', dark ? 4.5 : 3.2, 7, 1.6);
        l.position.set(x, 1.7, z);
        group.add(l);
        lights.push(l);
      }
    }

    // sun patches on the floor (day) / cool window glow (evening)
    const ramp = rampTexture(stage);
    const patchMat = owned(new THREE.MeshBasicMaterial({
      color: amb === 'day' ? '#ffe3a1' : '#8fa2ff', alphaMap: ramp, transparent: true, depthWrite: false, toneMapped: false,
      opacity: amb === 'day' ? (dark ? 0.18 : 0.42) : dark ? 0.12 : 0.18, blending: dark ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
    const len = Math.min(2.8, D * 0.25);
    for (const x of backSlots) {
      const m = new THREE.Mesh(kit.plane(round(ww * 0.95), round(len)), patchMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x - T / 2 + 0.35, 0.011, -D / 2 + len / 2);
      m.renderOrder = 1;
      group.add(m);
    }
    for (const z of leftSlots) {
      const m = new THREE.Mesh(kit.plane(round(ww * 0.95), round(len)), patchMat);
      m.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      m.position.set(-W / 2 + len / 2, 0.011, -z + 0.35);
      m.renderOrder = 1;
      group.add(m);
    }
  }

  // soft darker ground around the room so the closed room reads as one object (under the faded grid)
  const apron = new THREE.Mesh(kit.disc(Math.max(W, D) * 1.25, 48), owned(new THREE.MeshBasicMaterial({
    color: dark ? '#000000' : pal.floor.clone().lerp(new THREE.Color('#aab1c0'), 0.55), map: kit.gradient(), transparent: true, depthWrite: false, toneMapped: false,
    opacity: dark ? 0.5 : 0.75,
  })));
  apron.position.y = -0.085;
  apron.renderOrder = -2;
  group.add(apron);

  markStatic(statics);
  bakeStatic(statics);
  return { group, clock, lights };
}

/** Sets the clock hands to a timestamp (local time). */
export function setClock(clock: Shell['clock'], ts: number) {
  if (!clock) return;
  const d = new Date(ts);
  const m = d.getMinutes() + d.getSeconds() / 60;
  const h = (d.getHours() % 12) + m / 60;
  clock.minute.rotation.z = -(m / 60) * Math.PI * 2;
  clock.hour.rotation.z = -(h / 12) * Math.PI * 2;
}

export type { Mesh };
