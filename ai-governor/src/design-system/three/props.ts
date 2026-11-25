/**
 * Props: furniture, equipment and the room. Every prop is built around its
 * floor centre, facing +Z, in metres. Meshes are flagged `userData.static`
 * so `bakeStatic` can merge them per material (a whole office ≈ 25 draw calls).
 * Parts that change at runtime (glass board content, status LEDs) are not static.
 */
import {
  CanvasTexture, Color, DoubleSide, Group, LinearFilter, BufferGeometry, Mesh, MeshBasicMaterial, Object3D,
  PlaneGeometry, ShaderMaterial, SRGBColorSpace, type Material,
} from 'three';
import type { ColorLike, MaterialKit } from './materials';
import { mergeParts, type Part } from './optimize';
import type { ScenePalette } from './theme';

type V3 = [number, number, number];

/** Adds a mesh, flagged static, with shadows. */
function add(parent: Object3D, geometry: BufferGeometry, material: Material, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], opts: { cast?: boolean; receive?: boolean; static?: boolean } = {}) {
  const m = new Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  m.userData.static = opts.static ?? true;
  parent.add(m);
  return m;
}

/** Merges parts sharing one material into a single static mesh (geometry cached under `key`). */
function addMerged(kit: MaterialKit, parent: Object3D, key: string, material: Material, parts: () => Part[], opts?: { cast?: boolean; receive?: boolean }) {
  return add(parent, kit.geo(key, () => mergeParts(parts())), material, [0, 0, 0], [0, 0, 0], opts);
}

/* ------------------------------------------------------------------ */
/* Desk, chair, laptop, monitors                                        */
/* ------------------------------------------------------------------ */

export interface DeskOptions {
  laptop?: boolean;
  monitors?: 0 | 1 | 2;
  chair?: boolean;
  width?: number;
  plant?: boolean;
  mug?: boolean;
}

/** Executive wooden desk (≈ 2 m). Returns the group; `userData.seat` is the chair position (local). */
export function createDesk(kit: MaterialKit, opts: DeskOptions = {}): Group {
  const g = new Group();
  g.name = 'desk';
  const w = opts.width ?? 2.0;
  const wood = kit.wood('walnut');
  const h = 0.76;
  addMerged(kit, g, `desk:wood:${w}`, wood, () => [
    { geometry: kit.roundedBox(w, 0.07, 1.0, 0.025), position: [0, h - 0.035, 0] },
    { geometry: kit.roundedBox(0.08, h - 0.07, 0.92, 0.02), position: [-w / 2 + 0.08, (h - 0.07) / 2, 0] },
    { geometry: kit.roundedBox(0.52, h - 0.07, 0.92, 0.02), position: [w / 2 - 0.3, (h - 0.07) / 2, 0] },
  ]);
  // drawer fronts (slightly darker lines) + handles
  addMerged(kit, g, `desk:handles:${w}`, kit.metal('chrome'), () => [
    { geometry: kit.roundedBox(0.18, 0.018, 0.02, 0.008, 1), position: [w / 2 - 0.3, h - 0.2, 0.47] },
    { geometry: kit.roundedBox(0.18, 0.018, 0.02, 0.008, 1), position: [w / 2 - 0.3, h - 0.42, 0.47] },
  ]);
  if (opts.laptop !== false) {
    const lap = new Group();
    lap.position.set(-0.15, h, 0.05);
    lap.rotation.y = 0.12;
    add(lap, kit.roundedBox(0.38, 0.018, 0.26, 0.008, 2), kit.metal('chrome'), [0, 0.009, 0]);
    const lid = new Group();
    lid.position.set(0, 0.018, -0.12);
    lid.rotation.x = -0.32;
    add(lid, kit.roundedBox(0.38, 0.25, 0.012, 0.008, 2), kit.plastic('#1b1f28', { roughness: 0.25 }), [0, 0.125, 0]);
    add(lid, kit.plane(0.35, 0.215), kit.screen(), [0, 0.127, 0.0075], [0, 0, 0], { cast: false });
    lap.add(lid);
    g.add(lap);
  }
  const mon = opts.monitors ?? 0;
  for (let i = 0; i < mon; i++) {
    const m = new Group();
    const off = mon === 1 ? 0 : (i - 0.5) * 0.66;
    m.position.set(off + 0.1, h, -0.3);
    m.rotation.y = mon === 1 ? 0 : -off * 0.4;
    add(m, kit.cylinder(0.12, 0.13, 0.015, 20), kit.metal('dark'), [0, 0.008, 0]);
    add(m, kit.roundedBox(0.04, 0.26, 0.03, 0.01, 1), kit.metal('dark'), [0, 0.14, -0.02]);
    add(m, kit.roundedBox(0.62, 0.37, 0.03, 0.012, 2), kit.plastic('#1b1f28', { roughness: 0.25 }), [0, 0.42, 0]);
    add(m, kit.plane(0.58, 0.33), kit.screen(), [0, 0.42, 0.016], [0, 0, 0], { cast: false });
    g.add(m);
  }
  if (opts.mug !== false) {
    add(g, kit.cylinder(0.04, 0.036, 0.09, 16), kit.plastic('#f6f6f6'), [0.32, h + 0.045, 0.18]);
    add(g, kit.torus(0.026, 0.007, 6, 12), kit.plastic('#f6f6f6'), [0.365, h + 0.05, 0.18], [0, 0, 0]);
  }
  if (opts.plant !== false) {
    const p = createPlant(kit, { size: 'small' });
    p.position.set(w / 2 - 0.25, h, -0.25);
    g.add(p);
  }
  if (opts.chair !== false) {
    const c = createChair(kit);
    c.position.set(-0.15, 0, 0.82);
    c.rotation.y = Math.PI;
    g.add(c);
    g.userData.seat = [-0.15, 0, 0.86];
  }
  return g;
}

export function createChair(kit: MaterialKit): Group {
  const g = new Group();
  g.name = 'chair';
  const shell = kit.plastic('#eceef2', { roughness: 0.45 });
  const frame = kit.metal('dark');
  addMerged(kit, g, 'chair:shell', shell, () => [
    { geometry: kit.roundedBox(0.5, 0.08, 0.48, 0.035), position: [0, 0.46, 0] },
    { geometry: kit.roundedBox(0.48, 0.56, 0.06, 0.03), position: [0, 0.8, -0.24], rotation: [-0.12, 0, 0] },
  ]);
  addMerged(kit, g, 'chair:frame', frame, () => {
    const parts: Part[] = [{ geometry: kit.cylinder(0.03, 0.03, 0.34, 10), position: [0, 0.25, 0] }];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push({ geometry: kit.roundedBox(0.3, 0.035, 0.05, 0.015, 1), position: [Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15], rotation: [0, -a, 0] });
      parts.push({ geometry: kit.sphere(0.03, 8, 6), position: [Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29] });
    }
    parts.push({ geometry: kit.roundedBox(0.04, 0.2, 0.3, 0.015, 1), position: [-0.27, 0.58, -0.02] });
    parts.push({ geometry: kit.roundedBox(0.04, 0.2, 0.3, 0.015, 1), position: [0.27, 0.58, -0.02] });
    return parts;
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* Vault, gate                                                          */
/* ------------------------------------------------------------------ */

/** Brushed-metal vault with a combination wheel and a glowing base strip. */
export function createVault(kit: MaterialKit): Group {
  const g = new Group();
  g.name = 'vault';
  const metal = kit.metal('brushed');
  const chrome = kit.metal('chrome');
  const dark = kit.metal('dark');
  add(g, kit.roundedBox(1.25, 1.25, 1.15, 0.1, 4), metal, [0, 0.72, 0]);
  add(g, kit.roundedBox(1.0, 1.0, 0.08, 0.05, 3), kit.plastic('#b9bec7', { roughness: 0.28, clearcoat: 0.8 }), [0, 0.74, 0.56]);
  addMerged(kit, g, 'vault:chrome', chrome, () => [
    { geometry: kit.cylinder(0.27, 0.27, 0.05, 40), position: [0.06, 0.74, 0.62], rotation: [Math.PI / 2, 0, 0] },
    { geometry: kit.torus(0.2, 0.022, 10, 40), position: [0.06, 0.74, 0.66] },
    { geometry: kit.roundedBox(0.4, 0.035, 0.035, 0.015, 1), position: [0.06, 0.74, 0.665] },
    { geometry: kit.roundedBox(0.4, 0.035, 0.035, 0.015, 1), position: [0.06, 0.74, 0.665], rotation: [0, 0, Math.PI / 3] },
    { geometry: kit.roundedBox(0.4, 0.035, 0.035, 0.015, 1), position: [0.06, 0.74, 0.665], rotation: [0, 0, -Math.PI / 3] },
    { geometry: kit.sphere(0.055, 16, 10), position: [0.06, 0.74, 0.68] },
    { geometry: kit.cylinder(0.035, 0.035, 0.22, 12), position: [-0.47, 1.0, 0.6] },
    { geometry: kit.cylinder(0.035, 0.035, 0.22, 12), position: [-0.47, 0.48, 0.6] },
    { geometry: kit.cylinder(0.05, 0.05, 0.03, 16), position: [0.38, 1.03, 0.6], rotation: [Math.PI / 2, 0, 0] },
  ]);
  addMerged(kit, g, 'vault:feet', dark, () => [
    { geometry: kit.cylinder(0.06, 0.07, 0.1, 12), position: [-0.48, 0.05, -0.45] },
    { geometry: kit.cylinder(0.06, 0.07, 0.1, 12), position: [0.48, 0.05, -0.45] },
    { geometry: kit.cylinder(0.06, 0.07, 0.1, 12), position: [-0.48, 0.05, 0.45] },
    { geometry: kit.cylinder(0.06, 0.07, 0.1, 12), position: [0.48, 0.05, 0.45] },
  ]);
  // glowing base
  add(g, kit.roundedBox(1.32, 0.03, 1.22, 0.015, 1), kit.emissive(kit.palette.glow), [0, 0.1, 0], [0, 0, 0], { cast: false });
  const halo = add(g, kit.disc(1.25, 40), kit.glowDisc(kit.palette.glow, 0.8), [0, 0.012, 0], [0, 0, 0], { cast: false, receive: false });
  halo.renderOrder = 2;
  return g;
}

/** Turnstile security gate with glass flaps and a status light strip. `userData.light` is the strip mesh. */
export function createGate(kit: MaterialKit, opts: { color?: ColorLike } = {}): Group {
  const g = new Group();
  g.name = 'gate';
  const shell = kit.plastic('#f1f2f5', { roughness: 0.3 });
  const metal = kit.metal('brushed');
  addMerged(kit, g, 'gate:pillars', shell, () => [
    { geometry: kit.roundedBox(0.28, 1.05, 0.95, 0.06), position: [-0.58, 0.525, 0] },
    { geometry: kit.roundedBox(0.28, 1.05, 0.95, 0.06), position: [0.58, 0.525, 0] },
  ]);
  addMerged(kit, g, 'gate:tops', metal, () => [
    { geometry: kit.roundedBox(0.3, 0.05, 0.97, 0.02), position: [-0.58, 1.07, 0] },
    { geometry: kit.roundedBox(0.3, 0.05, 0.97, 0.02), position: [0.58, 1.07, 0] },
  ]);
  const glass = kit.glass('#d8f6ea', 0.3);
  addMerged(kit, g, 'gate:flaps', glass, () => [
    { geometry: kit.roundedBox(0.42, 0.55, 0.02, 0.06, 2), position: [-0.24, 0.78, 0.05] },
    { geometry: kit.roundedBox(0.42, 0.55, 0.02, 0.06, 2), position: [0.24, 0.78, 0.05] },
  ], { cast: false, receive: false });
  const col = opts.color ?? kit.palette.status.validating;
  const light = add(g, kit.geo('gate:light', () => mergeParts([
    { geometry: kit.roundedBox(0.03, 0.8, 0.03, 0.012, 1), position: [-0.435, 0.6, 0.47] },
    { geometry: kit.roundedBox(0.03, 0.8, 0.03, 0.012, 1), position: [0.435, 0.6, 0.47] },
  ])), kit.emissive(col), [0, 0, 0], [0, 0, 0], { cast: false, static: false });
  add(g, kit.roundedBox(0.18, 0.14, 0.03, 0.02, 2), kit.plastic('#1b1f28', { roughness: 0.2 }), [0.58, 0.86, 0.49], [-0.2, 0, 0]);
  add(g, kit.torus(0.035, 0.008, 6, 20), kit.emissive(col), [0.58, 0.865, 0.508], [-0.2, 0, 0], { cast: false, static: false });
  g.userData.light = light;
  return g;
}

/* ------------------------------------------------------------------ */
/* Glass board with live canvas content                                 */
/* ------------------------------------------------------------------ */

export interface GlassBoardOptions {
  width: number;
  height: number;
  /** Draws the content (transparent background). Called on creation and on `redraw`. */
  drawTexture?: (ctx: CanvasRenderingContext2D, w: number, h: number, palette: ScenePalette) => void;
  /** Texture width in px (height follows the aspect ratio). Default 384. */
  textureWidth?: number;
  edgeGlow?: ColorLike | null;
  tint?: ColorLike;
  opacity?: number;
  /** 'feet' = free standing on two blocks; 'wall' = no feet. */
  stand?: 'feet' | 'wall';
}

export interface GlassBoard extends Group {
  userData: { redraw: (draw?: GlassBoardOptions['drawTexture']) => void; texture: CanvasTexture; canvas: HTMLCanvasElement; [k: string]: unknown };
}

let boardSeq = 0;
/** Frosted glass panel with an edge glow and a CanvasTexture that can be redrawn from real data. */
export function createGlassBoard(kit: MaterialKit, opts: GlassBoardOptions): GlassBoard {
  const g = new Group() as GlassBoard;
  g.name = 'glass-board';
  const { width: w, height: h } = opts;
  const lift = opts.stand === 'wall' ? 0.9 : 0.12;
  add(g, kit.roundedBox(w, h, 0.03, 0.04, 2), kit.glass(opts.tint ?? '#e8f4ff', opts.opacity ?? 0.2), [0, lift + h / 2, 0], [0, 0, 0], { cast: false, receive: false });
  if (opts.stand !== 'wall') {
    addMerged(kit, g, `board:feet:${w}`, kit.metal('brushed'), () => [
      { geometry: kit.roundedBox(0.12, 0.16, 0.34, 0.03), position: [-w / 2 + 0.25, 0.08, 0] },
      { geometry: kit.roundedBox(0.12, 0.16, 0.34, 0.03), position: [w / 2 - 0.25, 0.08, 0] },
    ]);
  }
  if (opts.edgeGlow) {
    const t = 0.014;
    add(g, kit.geo(`board:edge:${w}:${h}`, () => mergeParts([
      { geometry: kit.box(w, t, t), position: [0, lift + h, 0.018] },
      { geometry: kit.box(w, t, t), position: [0, lift, 0.018] },
      { geometry: kit.box(t, h, t), position: [-w / 2, lift + h / 2, 0.018] },
      { geometry: kit.box(t, h, t), position: [w / 2, lift + h / 2, 0.018] },
    ])), kit.emissive(opts.edgeGlow, 0.9), [0, 0, 0], [0, 0, 0], { cast: false, receive: false });
  }
  const tw = opts.textureWidth ?? 384;
  const th = Math.round((tw * h) / w);
  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = LinearFilter;
  tex.anisotropy = 4;
  const tkey = `board:${++boardSeq}`;
  kit.track(tkey, tex);
  const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, side: DoubleSide });
  mat.userData.owned = true;
  const plane = new Mesh(new PlaneGeometry(w * 0.96, h * 0.94), mat);
  plane.geometry.userData.owned = true;
  plane.position.set(0, lift + h / 2, 0.02);
  plane.renderOrder = 3;
  g.add(plane);
  let draw = opts.drawTexture;
  g.userData = {
    texture: tex,
    canvas,
    textureKey: tkey,
    redraw(next) {
      if (next) draw = next;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, tw, th);
      draw?.(ctx, tw, th, kit.palette);
      tex.needsUpdate = true;
    },
  };
  g.userData.redraw();
  return g;
}

/* ------------------------------------------------------------------ */
/* Plants, lounge                                                       */
/* ------------------------------------------------------------------ */

export function createPlant(kit: MaterialKit, opts: { size?: 'small' | 'floor' } = {}): Group {
  const g = new Group();
  g.name = 'plant';
  const big = opts.size !== 'small';
  const s = big ? 1 : 0.32;
  const pot = kit.plastic('#f5f5f3', { roughness: 0.5 });
  add(g, kit.cylinder(0.17 * s, 0.13 * s, 0.32 * s, 20), pot, [0, 0.16 * s, 0]);
  add(g, kit.cylinder(0.155 * s, 0.155 * s, 0.02 * s, 16), kit.matte('#4a3a2c'), [0, 0.31 * s, 0], [0, 0, 0], { cast: false });
  const leaves: Part[] = [];
  const n = big ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
    const tilt = 0.55 + (i % 3) * 0.18;
    const len = (0.42 + (i % 4) * 0.08) * s;
    leaves.push({ geometry: kit.sphere(0.5, 10, 8), position: [Math.cos(a) * len * 0.45, 0.32 * s + len * 0.62, Math.sin(a) * len * 0.45], rotation: [Math.sin(a) * tilt, -a, Math.cos(a) * -tilt], scale: [0.09 * s * 2.2, len, 0.035 * s * 2.2] });
  }
  addMerged(kit, g, `plant:leaves:${big}`, kit.plastic('#3f9a5b', { roughness: 0.5, clearcoat: 0.3 }), () => leaves);
  if (big) {
    const inner: Part[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.6;
      inner.push({ geometry: kit.sphere(0.5, 10, 8), position: [Math.cos(a) * 0.08, 0.62, Math.sin(a) * 0.08], rotation: [Math.sin(a) * 0.3, -a, Math.cos(a) * -0.3], scale: [0.17, 0.42, 0.07] });
    }
    addMerged(kit, g, 'plant:inner', kit.plastic('#62b878', { roughness: 0.5, clearcoat: 0.3 }), () => inner);
  }
  return g;
}

export function createArmchair(kit: MaterialKit, opts: { color?: ColorLike } = {}): Group {
  const g = new Group();
  g.name = 'armchair';
  const fabric = kit.plastic(opts.color ?? '#f3f3f5', { roughness: 0.7, clearcoat: 0.05 });
  addMerged(kit, g, 'armchair:body', fabric, () => [
    { geometry: kit.roundedBox(0.84, 0.3, 0.78, 0.1), position: [0, 0.27, 0] },
    { geometry: kit.roundedBox(0.84, 0.56, 0.2, 0.09), position: [0, 0.56, -0.3] },
    { geometry: kit.roundedBox(0.17, 0.42, 0.74, 0.08), position: [-0.36, 0.4, 0.01] },
    { geometry: kit.roundedBox(0.17, 0.42, 0.74, 0.08), position: [0.36, 0.4, 0.01] },
    { geometry: kit.roundedBox(0.56, 0.1, 0.6, 0.05), position: [0, 0.45, 0.05] },
  ]);
  addMerged(kit, g, 'armchair:feet', kit.metal('dark'), () => [
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [-0.34, 0.06, -0.3] },
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [0.34, 0.06, -0.3] },
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [-0.34, 0.06, 0.3] },
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [0.34, 0.06, 0.3] },
  ]);
  return g;
}

export function createSofa(kit: MaterialKit, opts: { color?: ColorLike; width?: number } = {}): Group {
  const g = new Group();
  g.name = 'sofa';
  const w = opts.width ?? 1.8;
  const fabric = kit.plastic(opts.color ?? '#e9e9ee', { roughness: 0.7, clearcoat: 0.05 });
  addMerged(kit, g, `sofa:body:${w}`, fabric, () => [
    { geometry: kit.roundedBox(w, 0.3, 0.82, 0.1), position: [0, 0.27, 0] },
    { geometry: kit.roundedBox(w, 0.5, 0.2, 0.09), position: [0, 0.55, -0.32] },
    { geometry: kit.roundedBox(0.18, 0.4, 0.8, 0.08), position: [-w / 2 + 0.09, 0.4, 0] },
    { geometry: kit.roundedBox(0.18, 0.4, 0.8, 0.08), position: [w / 2 - 0.09, 0.4, 0] },
    { geometry: kit.roundedBox((w - 0.4) / 2 - 0.02, 0.1, 0.62, 0.05), position: [-(w - 0.4) / 4, 0.45, 0.05] },
    { geometry: kit.roundedBox((w - 0.4) / 2 - 0.02, 0.1, 0.62, 0.05), position: [(w - 0.4) / 4, 0.45, 0.05] },
  ]);
  addMerged(kit, g, `sofa:feet:${w}`, kit.metal('dark'), () => [
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [-w / 2 + 0.12, 0.06, -0.32] },
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [w / 2 - 0.12, 0.06, -0.32] },
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [-w / 2 + 0.12, 0.06, 0.32] },
    { geometry: kit.cylinder(0.025, 0.02, 0.12, 8), position: [w / 2 - 0.12, 0.06, 0.32] },
  ]);
  return g;
}

/** Low round coffee table (lounge). */
export function createSideTable(kit: MaterialKit): Group {
  const g = new Group();
  add(g, kit.cylinder(0.3, 0.3, 0.04, 32), kit.wood('oak'), [0, 0.46, 0]);
  add(g, kit.cylinder(0.03, 0.03, 0.44, 10), kit.metal('dark'), [0, 0.22, 0]);
  add(g, kit.cylinder(0.18, 0.2, 0.02, 24), kit.metal('dark'), [0, 0.01, 0]);
  return g;
}

/* ------------------------------------------------------------------ */
/* Platforms and station equipment                                      */
/* ------------------------------------------------------------------ */

/** Tints a tone for large surfaces: soft pastel on light floors, deep tone on dark ones. */
export function surfaceTint(kit: MaterialKit, tone: ColorLike, amount = 0.18): Color {
  const t = new Color(tone);
  return kit.dark ? kit.palette.slab.clone().lerp(t, amount * 1.1) : new Color('#ffffff').lerp(t, amount);
}

/** Round station platform tinted with the department tone and a glowing rim. */
export function createPlatform(kit: MaterialKit, opts: { radius?: number; color?: ColorLike; glow?: boolean } = {}): Group {
  const g = new Group();
  g.name = 'platform';
  const r = opts.radius ?? 1.1;
  const tone = opts.color ?? kit.palette.accent;
  add(g, kit.cylinder(r, r + 0.04, 0.08, 56), kit.plastic(surfaceTint(kit, tone, 0.16), { roughness: 0.45, clearcoat: 0.3 }), [0, 0.04, 0], [0, 0, 0], { cast: false });
  add(g, kit.cylinder(r * 0.62, r * 0.62, 0.012, 48), kit.plastic(surfaceTint(kit, tone, 0.3), { roughness: 0.45, clearcoat: 0.3 }), [0, 0.086, 0], [0, 0, 0], { cast: false });
  if (opts.color) add(g, kit.torus(r + 0.012, 0.018, 6, 72), kit.emissive(opts.color), [0, 0.07, 0], [Math.PI / 2, 0, 0], { cast: false, receive: false });
  return g;
}

export type EquipmentKind = 'desk' | 'meeting' | 'lab' | 'server' | 'database' | 'board' | 'shield' | 'archive' | 'router' | 'gauge' | 'antenna' | 'conveyor';

/**
 * Compact equipment prop that hints a department's function. `tone` colours
 * the accents. Everything is static.
 */
export function createEquipment(kit: MaterialKit, kind: EquipmentKind, tone: ColorLike): Group {
  const g = new Group();
  g.name = `equipment:${kind}`;
  const shell = kit.plastic(surfaceTint(kit, tone, kit.dark ? 0.32 : 0.28), { roughness: 0.4 });
  const accent = kit.plastic(tone, { roughness: 0.4 });
  const dark = kit.plastic('#1d212b', { roughness: 0.3, clearcoat: 0.6 });
  const led = kit.emissive(tone);
  switch (kind) {
    case 'server':
      addMerged(kit, g, 'eq:server:body', dark, () => [
        { geometry: kit.roundedBox(0.55, 1.35, 0.6, 0.05), position: [-0.32, 0.675, 0] },
        { geometry: kit.roundedBox(0.55, 1.1, 0.6, 0.05), position: [0.32, 0.55, 0] },
      ]);
      add(g, kit.geo('eq:server:leds', () => {
        const parts: Part[] = [];
        for (let i = 0; i < 6; i++) parts.push({ geometry: kit.box(0.4, 0.018, 0.01), position: [-0.32, 0.25 + i * 0.18, 0.305] });
        for (let i = 0; i < 5; i++) parts.push({ geometry: kit.box(0.4, 0.018, 0.01), position: [0.32, 0.2 + i * 0.17, 0.305] });
        return mergeParts(parts);
      }), led, [0, 0, 0], [0, 0, 0], { cast: false });
      break;
    case 'database':
      addMerged(kit, g, 'eq:db', accent, () => [0, 1, 2].map((i) => ({ geometry: kit.cylinder(0.36, 0.36, 0.2, 32), position: [0, 0.12 + i * 0.25, 0] as V3 })));
      addMerged(kit, g, 'eq:db:rings', shell, () => [0, 1, 2].map((i) => ({ geometry: kit.torus(0.36, 0.02, 6, 40), position: [0, 0.22 + i * 0.25, 0] as V3, rotation: [Math.PI / 2, 0, 0] as V3 })));
      break;
    case 'antenna':
      addMerged(kit, g, 'eq:antenna', shell, () => [
        { geometry: kit.roundedBox(0.7, 0.36, 0.55, 0.08), position: [0, 0.18, 0] },
        { geometry: kit.cylinder(0.06, 0.08, 0.8, 14), position: [0, 0.75, 0] },
      ]);
      // satellite dish: shallow truncated cone tilted towards the front, feed arm and LED
      add(g, kit.cylinder(0.52, 0.16, 0.14, 36), accent, [0, 1.18, 0.06], [0.95, 0, 0]);
      add(g, kit.cylinder(0.42, 0.42, 0.012, 36), shell, [0, 1.18 + Math.cos(0.95) * 0.077, 0.06 + Math.sin(0.95) * 0.077], [0.95, 0, 0], { cast: false });
      add(g, kit.cylinder(0.022, 0.022, 0.42, 8), kit.metal('dark'), [0, 1.33, 0.24], [0.95, 0, 0]);
      add(g, kit.sphere(0.055, 12, 8), led, [0, 1.46, 0.41], [0, 0, 0], { cast: false });
      break;
    case 'gauge':
      add(g, kit.roundedBox(0.9, 1.15, 0.42, 0.1), shell, [0, 0.575, 0]);
      add(g, kit.cylinder(0.32, 0.32, 0.05, 36), dark, [0, 0.74, 0.22], [Math.PI / 2, 0, 0]);
      add(g, kit.torus(0.25, 0.03, 8, 36, Math.PI * 1.2), led, [0, 0.74, 0.255], [0, 0, -Math.PI * 0.1], { cast: false });
      add(g, kit.roundedBox(0.035, 0.24, 0.03, 0.012, 1), accent, [0.06, 0.8, 0.27], [0, 0, -0.6]);
      add(g, kit.roundedBox(0.5, 0.1, 0.05, 0.03, 2), accent, [0, 0.3, 0.215]);
      break;
    case 'lab':
      add(g, kit.roundedBox(1.3, 0.1, 0.66, 0.04), kit.plastic('#f6f7f9', { roughness: 0.35 }), [0, 0.8, 0]);
      add(g, kit.roundedBox(1.2, 0.74, 0.58, 0.06), shell, [0, 0.37, 0]);
      addMerged(kit, g, 'eq:lab:flasks', kit.glass(tone, 0.55), () => [
        { geometry: kit.sphere(0.15, 18, 12), position: [-0.32, 1.0, 0] },
        { geometry: kit.cylinder(0.04, 0.04, 0.2, 12), position: [-0.32, 1.18, 0] },
        { geometry: kit.cylinder(0.08, 0.08, 0.34, 18), position: [0.05, 1.02, 0.05] },
        { geometry: kit.cylinder(0.06, 0.11, 0.24, 18), position: [0.38, 0.97, -0.05] },
      ], { cast: false, receive: false });
      break;
    case 'conveyor':
      add(g, kit.roundedBox(1.5, 0.16, 0.56, 0.05), dark, [0, 0.52, 0]);
      addMerged(kit, g, 'eq:conv:legs', shell, () => [
        { geometry: kit.roundedBox(0.1, 0.44, 0.44, 0.03), position: [-0.62, 0.22, 0] },
        { geometry: kit.roundedBox(0.1, 0.44, 0.44, 0.03), position: [0.62, 0.22, 0] },
      ]);
      addMerged(kit, g, 'eq:conv:boxes', accent, () => [
        { geometry: kit.roundedBox(0.26, 0.2, 0.26, 0.04), position: [-0.4, 0.66, 0] },
        { geometry: kit.roundedBox(0.22, 0.16, 0.22, 0.04), position: [0.1, 0.64, 0] },
        { geometry: kit.roundedBox(0.24, 0.24, 0.24, 0.04), position: [0.5, 0.68, 0] },
      ]);
      break;
    case 'router':
      add(g, kit.roundedBox(0.8, 0.22, 0.5, 0.07), shell, [0, 0.42, 0]);
      add(g, kit.roundedBox(0.5, 0.3, 0.36, 0.05), kit.metal('dark'), [0, 0.15, 0]);
      addMerged(kit, g, 'eq:router:ant', accent, () => [
        { geometry: kit.cylinder(0.02, 0.02, 0.4, 8), position: [-0.3, 0.72, -0.15], rotation: [0, 0, 0.2] },
        { geometry: kit.cylinder(0.02, 0.02, 0.4, 8), position: [0, 0.74, -0.15] },
        { geometry: kit.cylinder(0.02, 0.02, 0.4, 8), position: [0.3, 0.72, -0.15], rotation: [0, 0, -0.2] },
      ]);
      add(g, kit.geo('eq:router:leds', () => mergeParts([0, 1, 2, 3, 4].map((i) => ({ geometry: kit.sphere(0.022, 8, 6), position: [-0.24 + i * 0.12, 0.43, 0.25] as V3 })))), led, [0, 0, 0], [0, 0, 0], { cast: false });
      break;
    case 'shield':
      add(g, kit.cylinder(0.28, 0.34, 0.5, 24), shell, [0, 0.25, 0]);
      add(g, kit.geo('eq:shield', () => mergeParts([
        { geometry: kit.sphere(0.36, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), position: [0, 0.9, 0], scale: [1, 1.15, 0.35] },
        { geometry: kit.cylinder(0.36, 0.0, 0.42, 20), position: [0, 0.69, 0], scale: [1, 1, 0.35] },
      ])), accent, [0, 0, 0], [0, 0, 0]);
      break;
    case 'archive':
      add(g, kit.roundedBox(0.9, 1.1, 0.55, 0.05), shell, [0, 0.55, 0]);
      add(g, kit.geo('eq:archive:drawers', () => mergeParts([0, 1, 2, 3].map((i) => ({ geometry: kit.roundedBox(0.8, 0.22, 0.03, 0.02, 1), position: [0, 0.18 + i * 0.26, 0.28] as V3 })))), accent);
      break;
    case 'meeting':
      add(g, kit.cylinder(0.55, 0.55, 0.05, 40), kit.wood('oak'), [0, 0.72, 0]);
      add(g, kit.cylinder(0.05, 0.08, 0.7, 12), kit.metal('dark'), [0, 0.35, 0]);
      addMerged(kit, g, 'eq:meeting:stools', accent, () => [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return { geometry: kit.cylinder(0.16, 0.14, 0.42, 20), position: [Math.cos(a) * 0.85, 0.21, Math.sin(a) * 0.85] as V3 };
      }));
      break;
    case 'board': {
      // standing presentation board: pastel panel with notes, dark frame, two feet
      add(g, kit.roundedBox(1.35, 0.9, 0.08, 0.05), dark, [0, 1.12, 0]);
      add(g, kit.roundedBox(1.25, 0.8, 0.02, 0.03, 2), shell, [0, 1.12, 0.045], [0, 0, 0], { cast: false });
      add(g, kit.geo('eq:board:notes', () => mergeParts([0, 1, 2, 3, 4, 5].map((i) => ({ geometry: kit.roundedBox(0.26, 0.18, 0.015, 0.02, 1), position: [-0.4 + (i % 3) * 0.4, 1.26 - Math.floor(i / 3) * 0.3, 0.06] as V3 })))), accent, [0, 0, 0], [0, 0, 0], { cast: false });
      addMerged(kit, g, 'eq:board:stand', dark, () => [
        { geometry: kit.roundedBox(0.08, 0.7, 0.08, 0.03, 1), position: [-0.5, 0.35, 0] },
        { geometry: kit.roundedBox(0.08, 0.7, 0.08, 0.03, 1), position: [0.5, 0.35, 0] },
        { geometry: kit.roundedBox(0.16, 0.05, 0.5, 0.02, 1), position: [-0.5, 0.025, 0] },
        { geometry: kit.roundedBox(0.16, 0.05, 0.5, 0.02, 1), position: [0.5, 0.025, 0] },
      ]);
      break;
    }
    case 'desk':
    default: {
      add(g, kit.roundedBox(1.2, 0.05, 0.6, 0.02), kit.wood('oak'), [0, 0.74, 0]);
      addMerged(kit, g, 'eq:desk:legs', kit.metal('dark'), () => [
        { geometry: kit.roundedBox(0.05, 0.72, 0.52, 0.015, 1), position: [-0.55, 0.36, 0] },
        { geometry: kit.roundedBox(0.05, 0.72, 0.52, 0.015, 1), position: [0.55, 0.36, 0] },
      ]);
      add(g, kit.roundedBox(0.5, 0.31, 0.025, 0.01, 1), kit.plastic('#1b1f28', { roughness: 0.25 }), [0, 1.0, -0.15]);
      add(g, kit.plane(0.46, 0.27), kit.screen(), [0, 1.0, -0.136], [0, 0, 0], { cast: false });
      add(g, kit.roundedBox(0.04, 0.2, 0.03, 0.01, 1), kit.metal('dark'), [0, 0.84, -0.17]);
      break;
    }
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Room                                                                 */
/* ------------------------------------------------------------------ */

export interface RoomOptions {
  width: number;
  depth: number;
  height?: number;
  walls?: 'none' | 'back' | 'all';
  gridSize?: number;
  /** Glowing outline + corner posts (spatial editor look). */
  outline?: boolean;
  /** Infinite faded floor grid around the room. */
  ground?: boolean;
}

const GRID_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const GRID_FRAG = /* glsl */ `
uniform vec3 uMinor;
uniform vec3 uMajor;
uniform float uSize;
uniform float uAlpha;
uniform vec2 uCenter;
uniform float uFade;
varying vec3 vWorld;
float gridLine(vec2 p, float size) {
  vec2 g = abs(fract(p / size - 0.5) - 0.5) / fwidth(p / size);
  return 1.0 - min(min(g.x, g.y), 1.0);
}
void main() {
  vec2 p = vWorld.xz;
  float minor = gridLine(p, uSize);
  float major = gridLine(p, uSize * 5.0);
  float d = length(p - uCenter);
  float fade = uFade > 0.0 ? 1.0 - smoothstep(uFade * 0.45, uFade, d) : 1.0;
  vec3 col = mix(uMinor, uMajor, major);
  float a = max(minor * 0.55, major) * uAlpha * fade;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

/** Grid material (fwidth anti-aliased lines), theme-tinted. */
export function gridMaterial(kit: MaterialKit, key: string, size: number, fade: number, alpha: number, center: [number, number] = [0, 0]) {
  return kit.themedMaterial(
    `grid:${key}:${size}:${fade}:${alpha}:${center.join(',')}`,
    () =>
      new ShaderMaterial({
        vertexShader: GRID_VERT,
        fragmentShader: GRID_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uMinor: { value: new Color() }, uMajor: { value: new Color() }, uSize: { value: size }, uAlpha: { value: alpha }, uCenter: { value: center }, uFade: { value: fade } },
      }),
    (m, p) => {
      m.uniforms.uMinor.value.copy(p.grid);
      m.uniforms.uMajor.value.copy(p.gridMajor);
      m.uniforms.uAlpha.value = alpha * (p.scheme === 'dark' ? 1.15 : 1);
    },
  );
}

/** The room: slab with grid, optional walls, glowing outline and corner posts, faded ground grid. */
export function createRoom(kit: MaterialKit, opts: RoomOptions): Group {
  const g = new Group();
  g.name = 'room';
  const { width: W, depth: D } = opts;
  const H = opts.height ?? 3;
  const gs = opts.gridSize ?? 0.5;
  const slab = kit.themedMaterial('room:slab', () => kit.plastic('#ffffff', { roughness: 0.62, clearcoat: 0.12 }).clone(), (m, p) => {
    (m as unknown as { color: Color }).color.copy(p.slab);
  });
  const s = add(g, kit.roundedBox(W, 0.08, D, 0.04, 2), slab, [0, -0.04, 0], [0, 0, 0], { cast: false, receive: true });
  s.userData.static = true;
  const grid = new Mesh(kit.plane(W - 0.08, D - 0.08), gridMaterial(kit, 'room', gs, 0, 0.85));
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = 0.002;
  grid.renderOrder = 0;
  grid.userData.static = false;
  g.add(grid);
  if (opts.ground !== false) {
    const ground = new Mesh(kit.plane(120, 120), gridMaterial(kit, 'ground', gs * 2, Math.max(W, D) * 1.6, 0.5));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.079;
    ground.renderOrder = -1;
    g.add(ground);
  }
  if (opts.outline !== false) {
    const glowCol = kit.themedMaterial('room:outline', () => new MeshBasicMaterial({ transparent: true, toneMapped: false }), (m, p) => {
      m.color.copy(p.scheme === 'dark' ? new Color('#6fb8ff') : new Color('#8fc4ff'));
      m.opacity = p.scheme === 'dark' ? 0.75 : 0.9;
    });
    const t = 0.03;
    add(g, kit.geo(`room:edges:${W}:${D}`, () => mergeParts([
      { geometry: kit.box(W, t, t), position: [0, 0.01, -D / 2] },
      { geometry: kit.box(W, t, t), position: [0, 0.01, D / 2] },
      { geometry: kit.box(t, t, D), position: [-W / 2, 0.01, 0] },
      { geometry: kit.box(t, t, D), position: [W / 2, 0.01, 0] },
    ])), glowCol, [0, 0, 0], [0, 0, 0], { cast: false, receive: false });
    add(g, kit.geo(`room:posts:${W}:${D}`, () => mergeParts([
      [-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2],
    ].map(([x, z]) => ({ geometry: kit.roundedBox(0.2, 0.12, 0.2, 0.03, 2), position: [x, 0.06, z] as V3 })))), kit.glass('#bfe0ff', 0.7), [0, 0, 0], [0, 0, 0], { cast: false, receive: false });
  }
  const walls = opts.walls ?? 'none';
  if (walls !== 'none') {
    const wall = kit.themedMaterial('room:wall', () => kit.matte('#ffffff', 0.9).clone(), (m, p) => {
      (m as unknown as { color: Color }).color.copy(p.scheme === 'dark' ? p.slab.clone().lerp(new Color('#ffffff'), 0.04) : new Color('#fbfbfc'));
    });
    const th = 0.14;
    add(g, kit.roundedBox(W, H, th, 0.03, 1), wall, [0, H / 2, -D / 2 - th / 2], [0, 0, 0], { cast: false });
    add(g, kit.roundedBox(th, H, D + th, 0.03, 1), wall, [-W / 2 - th / 2, H / 2, -th / 2], [0, 0, 0], { cast: false });
    if (walls === 'all') {
      const low = 0.28;
      add(g, kit.roundedBox(W, low, th, 0.03, 1), wall, [0, low / 2, D / 2 + th / 2], [0, 0, 0], { cast: false });
      add(g, kit.roundedBox(th, low, D + th, 0.03, 1), wall, [W / 2 + th / 2, low / 2, -th / 2 + th], [0, 0, 0], { cast: false });
    }
  }
  g.userData.size = { width: W, depth: D, height: H };
  return g;
}

/** "Model room": three glossy columns with tone light strips around a glowing core. */
export function createModelHub(kit: MaterialKit, tones: ColorLike[] = ['#9b7bff', '#f0a35e', '#4fd1c5']): Group {
  const g = new Group();
  g.name = 'model-hub';
  const shell = kit.plastic('#20242e', { roughness: 0.22, clearcoat: 1 });
  const cols: Array<[number, number, number]> = [[-0.85, -0.15, 1.7], [0, -0.45, 2.0], [0.85, -0.15, 1.5]];
  addMerged(kit, g, 'hub:cols', shell, () => cols.map(([x, z, h]) => ({ geometry: kit.roundedBox(0.62, h, 0.62, 0.12, 3), position: [x, h / 2, z] as V3 })));
  addMerged(kit, g, 'hub:base', kit.plastic('#f2f3f6', { roughness: 0.4 }), () => [
    { geometry: kit.cylinder(1.45, 1.5, 0.1, 48), position: [0, 0.05, -0.2] },
  ]);
  cols.forEach(([x, z, h], i) => {
    add(g, kit.geo(`hub:strip:${h}`, () => mergeParts([
      { geometry: kit.roundedBox(0.05, h * 0.7, 0.02, 0.02, 1), position: [-0.16, h * 0.5, 0.315] },
      { geometry: kit.roundedBox(0.05, h * 0.7, 0.02, 0.02, 1), position: [0.0, h * 0.5, 0.315] },
      { geometry: kit.roundedBox(0.05, h * 0.7, 0.02, 0.02, 1), position: [0.16, h * 0.5, 0.315] },
    ])), kit.emissive(tones[i % tones.length]), [x, 0, z], [0, 0, 0], { cast: false });
  });
  add(g, kit.cylinder(0.16, 0.2, 0.3, 24), kit.plastic('#f2f3f6', { roughness: 0.4 }), [0, 0.25, 0.62]);
  add(g, kit.sphere(0.1, 18, 12), kit.emissive(kit.palette.glow), [0, 0.47, 0.62], [0, 0, 0], { cast: false });
  const halo = add(g, kit.disc(1.6, 40), kit.glowDisc(kit.palette.glow, 0.7), [0, 0.012, 0.2], [0, 0, 0], { cast: false, receive: false });
  halo.renderOrder = 2;
  return g;
}
