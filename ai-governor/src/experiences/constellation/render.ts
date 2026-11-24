/**
 * Canvas 2D renderer with a home-made 3D projection: yaw/pitch rotation,
 * perspective divide and painter's depth sort. Called on demand (data, size,
 * camera, hover) or by the shared animation clock when motion is allowed.
 * Glows are pre-rendered radial sprites blended additively (dark themes only).
 */
import type { NodeType } from './model';
import type { BgParticles, Vec3 } from './layout';
import { rgba, rgbKey, type Palette, type Rgb } from './palette';

export interface RNode {
  key: string;
  p: Vec3;
  /** Radius in CSS px at depth 0, zoom 1. */
  base: number;
  type: NodeType;
  /** Emissive colour (dark) / stroke colour (light). */
  color: Rgb;
  css: string;
  /** Hot core (dark) or pastel fill (light). */
  coreCss: string;
  fillCss: string;
  /** 0..1 glow amount (activity, live flows). */
  glow: number;
  error: boolean;
  warn: boolean;
  /** Touched by a real flow in the window. */
  active: boolean;
  /** Busy agent / running task: breathes when motion is allowed. */
  pulse: boolean;
  label: string;
  /** 3 always · 2 primary · 1 secondary · 0 never (unless hovered/selected). */
  labelPri: number;
}

export interface RLink {
  a: number;
  b: number;
  css: string;
}

export interface RFlow {
  a: number;
  b: number;
  key: string;
  count: number;
  failed: boolean;
  css: string;
  rgb: Rgb;
  path: Vec3[];
  seed: number;
}

export interface Scene {
  form: 'burst' | 'sphere';
  nodes: RNode[];
  links: RLink[];
  flows: RFlow[];
  dust: BgParticles | null;
  dustCss: string[];
  dustNeutralCss: string;
}

export interface Camera {
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface View {
  w: number;
  h: number;
  dpr: number;
  pal: Palette;
  cam: Camera;
  time: number;
  /** Flow particles and pulses (only when motion is allowed and not suspended). */
  animate: boolean;
  /** Glow intensity setting (0..1); ignored on light themes. */
  glow: number;
  showLinks: boolean;
  labels: 'none' | 'hubs' | 'all';
  hover: number;
  focus: number;
  sel: number;
  /** Indices related to the selection (others are dimmed), or null. */
  related: Set<number> | null;
  compact: boolean;
}

export interface Projection {
  n: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  r: Float32Array;
}

const DIST = 3.6;
const sprites = new Map<string, HTMLCanvasElement>();
const textW = new Map<string, number>();

function sprite(c: Rgb): HTMLCanvasElement {
  const key = rgbKey(c);
  let s = sprites.get(key);
  if (s) return s;
  if (sprites.size > 64) sprites.clear();
  const S = 64;
  s = document.createElement('canvas');
  s.width = s.height = S;
  const g = s.getContext('2d')!;
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, rgba(c, 0.85));
  grd.addColorStop(0.16, rgba(c, 0.42));
  grd.addColorStop(0.45, rgba(c, 0.1));
  grd.addColorStop(1, rgba(c, 0));
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  sprites.set(key, s);
  return s;
}

export function createProjection(): Projection {
  return { n: 0, x: new Float32Array(0), y: new Float32Array(0), z: new Float32Array(0), r: new Float32Array(0) };
}

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const depthOf = (z: number) => clamp((z + 1.25) / 2.5, 0, 1);

export function sceneUnit(w: number, h: number, form: Scene['form'], zoom: number) {
  return Math.min(w, h) * (form === 'sphere' ? 0.37 : 0.34) * zoom;
}

export function draw(ctx: CanvasRenderingContext2D, scene: Scene, v: View, proj: Projection): Projection {
  const { w, h, dpr, pal, cam } = v;
  const dark = pal.dark;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const unit = sceneUnit(w, h, scene.form, cam.zoom);
  const cyw = Math.cos(cam.yaw), syw = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const project = (p: Vec3 | Float32Array, o = 0): [number, number, number, number] => {
    const x1 = p[o] * cyw + p[o + 2] * syw;
    const z1 = -p[o] * syw + p[o + 2] * cyw;
    const y2 = p[o + 1] * cp - z1 * sp;
    const z2 = p[o + 1] * sp + z1 * cp;
    const k = DIST / (DIST - z2);
    return [cx + x1 * unit * k, cy - y2 * unit * k, z2, k];
  };

  const nodes = scene.nodes;
  const n = nodes.length;
  if (proj.x.length < n) {
    proj.x = new Float32Array(n);
    proj.y = new Float32Array(n);
    proj.z = new Float32Array(n);
    proj.r = new Float32Array(n);
  }
  proj.n = n;
  const sizeK = clamp(Math.min(w, h) / 820, 0.72, 1.2) * (0.7 + 0.3 * cam.zoom);
  const t = v.time;
  for (let i = 0; i < n; i++) {
    const nd = nodes[i];
    const [x, y, z, k] = project(nd.p);
    proj.x[i] = x;
    proj.y[i] = y;
    proj.z[i] = z;
    let r = nd.base * sizeK * k;
    if (v.animate && nd.pulse) r *= 1 + 0.16 * (0.5 + 0.5 * Math.sin(t / 380 + i * 1.7));
    proj.r[i] = r;
  }
  const { x: X, y: Y, z: Z, r: R } = proj;
  const sel = v.related;

  /* 1. decorative dust (burst only, no data) */
  const dust = scene.dust;
  if (dust && dust.count) {
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    let cur = -1;
    const base = dark ? 0.5 : 0.22;
    for (let i = 0; i < dust.count; i++) {
      const arm = dust.arm[i];
      if (arm !== cur) {
        cur = arm;
        ctx.fillStyle = arm === 255 ? scene.dustNeutralCss : scene.dustCss[arm % scene.dustCss.length];
      }
      const [x, y, z, k] = project(dust.xyz, i * 3);
      const s = dust.size[i] * k;
      ctx.globalAlpha = dust.alpha[i] * base * (0.35 + 0.65 * depthOf(z));
      ctx.fillRect(x - s / 2, y - s / 2, s, s);
    }
  }

  /* 2. catalog links (thin, discreet), batched by colour and depth band */
  ctx.globalCompositeOperation = 'source-over';
  const hl = v.hover >= 0 ? v.hover : v.focus >= 0 ? v.focus : v.sel;
  if (v.showLinks && scene.links.length) {
    ctx.lineWidth = dark ? 0.7 : 0.8;
    const bandAlpha = [0.4, 0.7, 1];
    for (let band = 0; band < 3; band++) {
      let cur = '';
      ctx.globalAlpha = bandAlpha[band] * (sel ? 0.55 : 1);
      ctx.beginPath();
      for (const l of scene.links) {
        if (l.a === hl || l.b === hl) continue;
        const zz = (Z[l.a] + Z[l.b]) / 2;
        const b = zz < -0.35 ? 0 : zz < 0.35 ? 1 : 2;
        if (b !== band) continue;
        if (l.css !== cur) {
          if (cur) ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = l.css;
          cur = l.css;
        }
        ctx.moveTo(X[l.a], Y[l.a]);
        ctx.lineTo(X[l.b], Y[l.b]);
      }
      if (cur) ctx.stroke();
    }
  }
  // Links of the hovered / focused / selected node, always visible.
  if (hl >= 0) {
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(dark ? pal.ink : pal.inkSoft, dark ? 0.55 : 0.6);
    ctx.beginPath();
    for (const l of scene.links) {
      if (l.a !== hl && l.b !== hl) continue;
      ctx.moveTo(X[l.a], Y[l.a]);
      ctx.lineTo(X[l.b], Y[l.b]);
    }
    ctx.stroke();
  }

  /* 3. real flows of the window: lit paths (+ travelling particles when motion is allowed) */
  if (scene.flows.length) {
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    ctx.lineCap = 'round';
    const px: number[] = [];
    const py: number[] = [];
    for (const f of scene.flows) {
      const dim = sel && !(sel.has(f.a) && sel.has(f.b));
      px.length = 0;
      py.length = 0;
      let zsum = 0;
      for (const p of f.path) {
        const [x, y, z] = project(p);
        px.push(x);
        py.push(y);
        zsum += z;
      }
      const dz = depthOf(zsum / f.path.length);
      ctx.globalAlpha = (dark ? 0.5 : 0.75) * (0.45 + 0.55 * dz) * (dim ? 0.3 : 1);
      ctx.strokeStyle = f.css;
      ctx.lineWidth = Math.min(3, 0.9 + Math.log2(1 + f.count) * 0.55);
      ctx.beginPath();
      ctx.moveTo(px[0], py[0]);
      for (let i = 1; i < px.length; i++) ctx.lineTo(px[i], py[i]);
      ctx.stroke();
      if (!v.animate || dim) continue;
      const m = Math.min(4, 1 + Math.floor(Math.log2(f.count)));
      const segs = px.length - 1;
      for (let j = 0; j < m; j++) {
        const ph = (t / 2600 + j / m + f.seed) % 1;
        const fi = ph * segs;
        const i0 = Math.floor(fi);
        const fr = fi - i0;
        const x = px[i0] + (px[Math.min(segs, i0 + 1)] - px[i0]) * fr;
        const y = py[i0] + (py[Math.min(segs, i0 + 1)] - py[i0]) * fr;
        const fade = Math.sin(Math.PI * ph);
        if (dark) {
          const s = 16 * (0.6 + 0.4 * dz);
          ctx.globalAlpha = 0.9 * fade * (0.5 + 0.5 * v.glow);
          ctx.drawImage(sprite(f.rgb), x - s / 2, y - s / 2, s, s);
          ctx.globalAlpha = fade;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(x, y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.95 * fade;
          ctx.fillStyle = f.css;
          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.lineCap = 'butt';
  }

  /* 4. nodes, far to near */
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Z[a] - Z[b]);
  if (dark && v.glow > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (const i of order) {
      const nd = nodes[i];
      if (nd.glow <= 0.02 && !nd.error) continue;
      const g = (nd.error ? Math.max(0.5, nd.glow) : nd.glow) * v.glow;
      const dz = depthOf(Z[i]);
      const s = R[i] * (nd.type === 'governor' ? 13 : nd.type === 'task' ? 7 : 5 + 5 * g);
      ctx.globalAlpha = Math.min(1, g * (0.3 + 0.7 * dz) * (sel && !sel.has(i) ? 0.25 : 1));
      ctx.drawImage(sprite(nd.error ? pal.error : nd.color), X[i] - s / 2, Y[i] - s / 2, s, s);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  const errCss = rgba(pal.error, 1);
  const warnCss = rgba(pal.warn, 1);
  for (const i of order) {
    const nd = nodes[i];
    const dz = depthOf(Z[i]);
    const faded = sel && !sel.has(i) ? 0.3 : 1;
    const r = R[i];
    ctx.globalAlpha = (dark ? 0.3 + 0.7 * dz : 0.5 + 0.5 * dz) * faded;
    ctx.beginPath();
    ctx.arc(X[i], Y[i], Math.max(0.6, r), 0, Math.PI * 2);
    if (dark) {
      ctx.fillStyle = nd.error ? errCss : nd.coreCss;
      ctx.fill();
    } else {
      ctx.fillStyle = nd.error ? rgba(pal.error, nd.type === 'task' ? 0.9 : 0.28) : nd.fillCss;
      ctx.fill();
      if (nd.type !== 'task' && r > 1.6) {
        ctx.lineWidth = nd.type === 'governor' ? 2 : 1;
        ctx.strokeStyle = nd.error ? errCss : nd.css;
        ctx.stroke();
      }
    }
    // Status rings: error / warning / live flow.
    if ((nd.error || nd.warn) && nd.type !== 'task') {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = nd.error ? errCss : warnCss;
      ctx.beginPath();
      ctx.arc(X[i], Y[i], r + 3.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (nd.active && nd.type !== 'task') {
      ctx.lineWidth = 1;
      ctx.strokeStyle = nd.css;
      ctx.globalAlpha *= dark ? 0.7 : 0.9;
      ctx.beginPath();
      ctx.arc(X[i], Y[i], r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* 5. selection, hover, keyboard focus */
  ctx.globalAlpha = 1;
  const ring = (i: number, color: string, extra: number, width: number, dash?: number[]) => {
    if (i < 0 || i >= n) return;
    ctx.setLineDash(dash ?? []);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(X[i], Y[i], R[i] + extra, 0, Math.PI * 2);
    ctx.stroke();
  };
  ring(v.sel, rgba(pal.accent, 1), 6, 2);
  ring(v.hover, rgba(pal.ink, 0.85), 4.5, 1.5);
  ring(v.focus, rgba(pal.focus, 1), 8, 2, [4, 3]);
  ctx.setLineDash([]);

  /* 6. labels, highest priority first, without overlaps */
  if (v.labels !== 'none' || v.hover >= 0 || v.sel >= 0 || v.focus >= 0) {
    const fs = v.compact ? 11 : 12;
    ctx.font = `600 ${fs}px ${pal.font}`;
    ctx.textBaseline = 'middle';
    const placed: Array<[number, number, number, number]> = [];
    const forced = new Set([v.hover, v.sel, v.focus].filter((i) => i >= 0));
    const cands: number[] = [];
    for (let i = 0; i < n; i++) {
      const nd = nodes[i];
      if (forced.has(i)) continue;
      const min = v.labels === 'all' ? 1 : v.labels === 'hubs' ? 2 : 4;
      if (nd.labelPri >= min && depthOf(Z[i]) > 0.3) cands.push(i);
    }
    cands.sort((a, b) => nodes[b].labelPri - nodes[a].labelPri || Z[b] - Z[a]);
    const list = [...forced, ...cands];
    ctx.lineJoin = 'round';
    for (const i of list) {
      const nd = nodes[i];
      const key = `${fs}|${nd.label}`;
      let tw = textW.get(key);
      if (tw == null) {
        tw = ctx.measureText(nd.label).width;
        if (textW.size > 2000) textW.clear();
        textW.set(key, tw);
      }
      let lx = X[i] + R[i] + 7;
      if (lx + tw > w - 8) lx = X[i] - R[i] - 7 - tw;
      const ly = Y[i];
      const rect: [number, number, number, number] = [lx - 3, ly - fs / 2 - 3, tw + 6, fs + 6];
      if (!forced.has(i) && placed.some((p) => rect[0] < p[0] + p[2] && rect[0] + rect[2] > p[0] && rect[1] < p[1] + p[3] && rect[1] + rect[3] > p[1])) continue;
      placed.push(rect);
      const dz = depthOf(Z[i]);
      const a = forced.has(i) ? 1 : (0.45 + 0.55 * dz) * (sel && !sel.has(i) ? 0.4 : 1);
      ctx.globalAlpha = a;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = rgba(dark ? pal.bg : pal.raised, 0.85);
      ctx.strokeText(nd.label, lx, ly);
      ctx.fillStyle = rgba(forced.has(i) || nd.labelPri >= 3 ? pal.ink : pal.inkSoft, 1);
      ctx.fillText(nd.label, lx, ly);
    }
  }
  ctx.globalAlpha = 1;
  return proj;
}

/** Index of the node under (mx, my), preferring hubs and nodes nearer the viewer. */
export function hitTest(proj: Projection, scene: Scene, mx: number, my: number, touch = false): number {
  let best = -1;
  let bestScore = Infinity;
  const minR = touch ? 14 : 7;
  for (let i = 0; i < proj.n; i++) {
    const dx = proj.x[i] - mx;
    const dy = proj.y[i] - my;
    const d = Math.hypot(dx, dy);
    const rr = Math.max(proj.r[i] + 3, minR);
    if (d > rr) continue;
    const score = d - proj.z[i] * 4 + (scene.nodes[i].type === 'task' ? 5 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}
