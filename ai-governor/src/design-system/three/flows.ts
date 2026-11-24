/**
 * Flow tubes: translucent glass tubes with a bright core and pulses that move
 * along the tube ONLY when the flow is active and motion is allowed.
 *
 * `FlowNetwork` merges all tubes of a scene into two meshes (active / idle):
 * 2 draw calls whatever the number of flows. Per-tube colour, length and
 * phase are vertex attributes; time and motion are uniforms.
 */
import { BufferAttribute, CatmullRomCurve3, Color, Group, Mesh, ShaderMaterial, TubeGeometry, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ColorLike, MaterialKit } from './materials';
import type { ScenePalette } from './theme';

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aLen;
attribute float aSeed;
attribute float aLevel;
varying vec2 vUv;
varying vec3 vColor;
varying float vLen;
varying float vSeed;
varying float vLevel;
varying vec3 vN;
varying vec3 vV;
void main() {
  vUv = uv;
  vColor = aColor;
  vLen = aLen;
  vSeed = aSeed;
  vLevel = aLevel;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uFlow;
uniform float uActive;
uniform float uDark;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vColor;
varying float vLen;
varying float vSeed;
varying float vLevel;
varying vec3 vN;
varying vec3 vV;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(1.0 - facing, 2.0);
  float core = pow(facing, 3.0);
  // pulses every ~0.9 m along the tube, moving from start to end
  float d = fract(vUv.x * vLen / 0.9 - uTime * 0.55 * uFlow + vSeed);
  float pulse = smoothstep(0.0, 0.12, d) * (1.0 - smoothstep(0.12, 0.42, d));
  vec3 bright = mix(vColor, vec3(1.0), 0.55);
  vec3 col;
  float a;
  if (uActive > 0.5) {
    float lv = mix(0.55, 1.0, vLevel);
    col = mix(vColor, bright, core * 0.55 + pulse * 0.75);
    a = (0.42 + core * 0.3 + rim * 0.3 + pulse * 0.4 * lv) * lv;
  } else {
    col = mix(vColor, bright, core * 0.3);
    a = 0.14 + rim * 0.24 + core * 0.06;
  }
  a *= uOpacity;
  // ends fade softly into the stations
  a *= smoothstep(0.0, 0.04, vUv.x) * smoothstep(1.0, 0.96, vUv.x);
  gl_FragColor = vec4(col * (uDark > 0.5 ? 1.15 : 1.0), clamp(a, 0.0, 1.0));
  #include <colorspace_fragment>
}`;

export interface FlowTubeSpec {
  id: string;
  points: Vector3[];
  color: ColorLike;
  active: boolean;
  /** 0–1, scales brightness (e.g. log of the number of calls). */
  level?: number;
  radius?: number;
}

/** Path between two floor points: rises out of A, runs low along a soft S-curve, drops into B. */
export function routeBetween(a: Vector3, b: Vector3, opts: { height?: number; bend?: number; endHeight?: number } = {}): Vector3[] {
  const h = opts.height ?? 0.09;
  const eh = opts.endHeight ?? 0.32;
  const dir = new Vector3().subVectors(b, a).setY(0);
  const len = dir.length() || 1;
  dir.normalize();
  const perp = new Vector3(-dir.z, 0, dir.x);
  const bend = (opts.bend ?? 0.18) * len;
  const out = Math.min(0.7, len * 0.18);
  const p = (v: Vector3, y: number) => new Vector3(v.x, y, v.z);
  return [
    p(a, eh),
    p(a.clone().addScaledVector(dir, out * 0.6), h + 0.05),
    p(a.clone().addScaledVector(dir, len * 0.3).addScaledVector(perp, bend * 0.6), h),
    p(a.clone().addScaledVector(dir, len * 0.7).addScaledVector(perp, -bend * 0.3), h),
    p(b.clone().addScaledVector(dir, -out * 0.6), h + 0.05),
    p(b, eh),
  ];
}

function tubeGeometry(spec: FlowTubeSpec, seed: number): BufferGeometry {
  const curve = new CatmullRomCurve3(spec.points, false, 'centripetal', 0.5);
  const len = curve.getLength();
  const segs = Math.max(24, Math.min(140, Math.round(len * 9)));
  const g = new TubeGeometry(curve, segs, spec.radius ?? (spec.active ? 0.06 : 0.035), 10, false);
  const n = g.attributes.position.count;
  const c = new Color(spec.color);
  const cols = new Float32Array(n * 3);
  const lens = new Float32Array(n);
  const seeds = new Float32Array(n);
  const levels = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
    lens[i] = len;
    seeds[i] = seed;
    levels[i] = spec.level ?? 1;
  }
  g.setAttribute('aColor', new BufferAttribute(cols, 3));
  g.setAttribute('aLen', new BufferAttribute(lens, 1));
  g.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  g.setAttribute('aLevel', new BufferAttribute(levels, 1));
  return g;
}

function flowMaterial(active: boolean) {
  const m = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uFlow: { value: 0 }, uActive: { value: active ? 1 : 0 }, uDark: { value: 0 }, uOpacity: { value: 1 } },
  });
  m.userData.owned = true;
  return m;
}

/** All flow tubes of a scene in two merged meshes. */
export class FlowNetwork {
  readonly group = new Group();
  private active: Mesh | null = null;
  private idle: Mesh | null = null;
  private matActive = flowMaterial(true);
  private matIdle = flowMaterial(false);
  private signature = '';
  activeCount = 0;
  idleCount = 0;

  constructor(palette?: ScenePalette) {
    this.group.name = 'flows';
    if (palette) this.setPalette(palette);
  }

  setPalette(p: ScenePalette) {
    const dark = p.scheme === 'dark' ? 1 : 0;
    this.matActive.uniforms.uDark.value = dark;
    this.matIdle.uniforms.uDark.value = dark;
    this.matIdle.uniforms.uOpacity.value = dark ? 1.1 : 0.95;
  }

  /** Rebuilds the merged meshes when the set of tubes or their state changed. Returns true if rebuilt. */
  set(specs: FlowTubeSpec[]): boolean {
    const sig = specs.map((s) => `${s.id}:${s.active ? 1 : 0}:${(s.level ?? 1).toFixed(2)}:${new Color(s.color).getHexString()}:${s.points.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';')}`).join('|');
    if (sig === this.signature) return false;
    this.signature = sig;
    this.clearMeshes();
    const build = (list: FlowTubeSpec[], mat: ShaderMaterial) => {
      if (!list.length) return null;
      const geos = list.map((s, i) => tubeGeometry(s, (i * 0.37) % 1));
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      if (!merged) return null;
      merged.userData.owned = true;
      const mesh = new Mesh(merged, mat);
      mesh.renderOrder = 4;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    const act = specs.filter((s) => s.active && s.points.length > 1);
    const idl = specs.filter((s) => !s.active && s.points.length > 1);
    this.active = build(act, this.matActive);
    this.idle = build(idl, this.matIdle);
    this.activeCount = act.length;
    this.idleCount = idl.length;
    return true;
  }

  /** Advances pulses; `flow` is stage.amplitude('flow'). Returns true while pulses move. */
  update(t: number, flow: number): boolean {
    this.matActive.uniforms.uTime.value = t;
    this.matActive.uniforms.uFlow.value = flow;
    return this.group.visible && flow > 0 && this.activeCount > 0;
  }

  setVisible(v: boolean) {
    this.group.visible = v;
  }

  private clearMeshes() {
    for (const m of [this.active, this.idle]) {
      if (!m) continue;
      m.geometry.dispose();
      m.removeFromParent();
    }
    this.active = this.idle = null;
  }

  dispose() {
    this.clearMeshes();
    this.matActive.dispose();
    this.matIdle.dispose();
  }
}

/** A single standalone tube (1 draw call). `setActive` swaps between the two looks. */
export function createFlowTube(kit: MaterialKit, points: Vector3[], color: ColorLike, opts: { radius?: number; active?: boolean } = {}) {
  const net = new FlowNetwork(kit.palette);
  const spec: FlowTubeSpec = { id: 'tube', points, color, active: opts.active ?? true, radius: opts.radius };
  net.set([spec]);
  return {
    object: net.group,
    setActive(active: boolean) {
      spec.active = active;
      net.set([{ ...spec }]);
    },
    update: (t: number, flow: number) => net.update(t, flow),
    dispose: () => net.dispose(),
  };
}
