/**
 * Stage3D — the imperative core of the 3D kit.
 *
 * One renderer, one scene, one camera rig, one picker, one material kit.
 * Rendering is ON DEMAND: `invalidate()` schedules a single frame. A frame
 * loop only runs while something actually moves (camera damping / tween, a
 * short "burst" after a state change, or an animator that asks for frames)
 * AND the quality settings allow motion AND animations are not suspended
 * (`quality.suspended`, `html[data-anim=paused]`). The loop is capped to
 * `quality.fpsCap` with timers, so a 15/30 fps cap really sleeps between frames.
 */
import {
  AdditiveBlending, AmbientLight, Box3, Color, DirectionalLight, Group, HemisphereLight, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, NeutralToneMapping, NormalBlending,
  Object3D, OrthographicCamera, PCFShadowMap, PerspectiveCamera, PMREMGenerator, Quaternion, Scene, SRGBColorSpace, Texture, Vector3, WebGLRenderer,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { QualitySettings } from '@sdk';
import { CameraRig, type CameraRigOptions, type CameraView } from './camera';
import { MaterialKit } from './materials';
import { Picker, type PickHit } from './picking';
import { readScenePalette, type ScenePalette } from './theme';

export type MotionKind = 'figure' | 'indicator' | 'flow';

export interface FrameInfo {
  t: number;
  dt: number;
  /** Draw calls / triangles of the last frame (renderer.info). */
  calls: number;
  triangles: number;
  /** CPU time spent in renderer.render (ms). */
  ms: number;
}

export interface StageStats {
  calls: number;
  triangles: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
  /** Average CPU ms per rendered frame (last 60 frames). */
  msPerFrame: number;
  frames: number;
  /** Bytes of textures created through the kit (content textures). */
  kitTextureBytes: number;
  pixelRatio: number;
  shadows: boolean;
  environment: boolean;
  looping: boolean;
}

export interface StageOptions {
  quality: QualitySettings;
  palette?: ScenePalette;
  camera?: Partial<Omit<CameraRigOptions, 'view'>> & { view?: CameraView; projection?: 'perspective' | 'orthographic'; fov?: number };
  /** Accessible name of the canvas. */
  label?: string;
  /** aria-describedby target id (keyboard help). */
  describedBy?: string;
  /** Force-disable the PMREM environment (saves ≈ 4 MB of GPU memory). */
  environment?: boolean;
}

export const PIXEL_RATIO_CAP: Record<QualitySettings['level'], number> = { minimal: 1, eco: 1, standard: 1.5, high: 2 };

/** True when WebGL can be created in this browser. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

type Animator = (t: number, dt: number, stage: Stage3D) => boolean | void;

export class Stage3D {
  readonly renderer: WebGLRenderer;
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera | OrthographicCamera;
  readonly rig: CameraRig;
  readonly kit: MaterialKit;
  readonly picker: Picker;
  /** Put your content here (cleared by `clearContent`). */
  readonly root = new Group();
  readonly contact: ContactShadows;
  readonly container: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  palette: ScenePalette;
  quality: QualitySettings;
  private hemi: HemisphereLight;
  private ambient: AmbientLight;
  private key: DirectionalLight;
  private envTex: Texture | null = null;
  private envWanted: boolean;
  private animators = new Set<Animator>();
  private frameListeners = new Set<(f: FrameInfo) => void>();
  private raf = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastFrame = 0;
  private burstUntil = 0;
  private burstStart = 0;
  private ro: ResizeObserver;
  private mo: MutationObserver;
  private disposed = false;
  private msHistory: number[] = [];
  private frames = 0;
  private hoverHalo: Mesh;
  private selectHalo: Mesh;
  private haloTargets: { hover: Object3D | null; select: Object3D | null } = { hover: null, select: null };
  private looping = false;
  size = { w: 1, h: 1 };
  /** Picking callbacks (set by the React wrapper or the view). */
  onHover: (hit: PickHit | null) => void = () => undefined;
  onClick: (hit: PickHit | null, e: PointerEvent) => void = () => undefined;
  onContextLost: () => void = () => undefined;

  constructor(container: HTMLElement, opts: StageOptions) {
    this.container = container;
    this.quality = opts.quality;
    this.palette = opts.palette ?? readScenePalette();
    this.envWanted = opts.environment ?? true;
    const r = (this.renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = NeutralToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.type = PCFShadowMap;
    r.shadowMap.autoUpdate = false;
    r.info.autoReset = true;
    const canvas = (this.canvas = r.domElement);
    canvas.className = 't3-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-roledescription', 'scène 3D');
    canvas.setAttribute('aria-label', opts.label ?? 'Scène 3D');
    if (opts.describedBy) canvas.setAttribute('aria-describedby', opts.describedBy);
    canvas.addEventListener('webglcontextlost', this.handleLost, false);
    container.appendChild(canvas);
    // Dev-only handle for perf measurement scripts (stats(), renderNow()).
    if (import.meta.env.DEV) (canvas as HTMLCanvasElement & { __stage?: Stage3D }).__stage = this;

    this.kit = new MaterialKit(this.palette, { textures: opts.quality.textures || opts.quality.level === 'standard', detail: opts.quality.level === 'minimal' ? 'low' : 'normal' });
    this.picker = new Picker(this.kit);

    const fov = opts.camera?.fov ?? 30;
    this.camera = opts.camera?.projection === 'orthographic' ? new OrthographicCamera(-10, 10, 10, -10, -100, 500) : new PerspectiveCamera(fov, 1, 0.1, 500);
    const view = opts.camera?.view ?? { target: [0, 0, 0], distance: 26, azimuth: 38, polar: 54 };
    this.rig = new CameraRig(this.camera, canvas, { ...opts.camera, view });
    this.rig.onChange = () => this.invalidate();
    this.rig.onTap = (x, y, e) => {
      const hit = this.picker.pick(x, y, this.size.w, this.size.h, this.camera);
      this.onClick(hit, e);
    };
    this.rig.onHover = (x, y) => {
      const hit = this.picker.pick(x, y, this.size.w, this.size.h, this.camera);
      const prev = this.picker.hovered;
      if (prev?.object !== hit?.object) {
        this.picker.hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : '';
        this.setHalo('hover', hit?.object ?? null);
        this.onHover(hit);
      } else if (hit && prev) prev.point.copy(hit.point);
    };
    this.rig.onLeave = () => {
      if (this.picker.hovered) {
        this.picker.hovered = null;
        canvas.style.cursor = '';
        this.setHalo('hover', null);
        this.onHover(null);
      }
    };

    // lights
    this.hemi = new HemisphereLight(0xffffff, 0xdddddd, 1.2);
    this.ambient = new AmbientLight(0xffffff, 0.15);
    this.key = new DirectionalLight(0xffffff, 2.1);
    this.key.position.set(-9, 16, 11);
    this.key.target.position.set(0, 0, 0);
    this.key.shadow.bias = -0.0006;
    this.key.shadow.normalBias = 0.02;
    this.key.shadow.radius = 5;
    this.key.shadow.intensity = 0.55;
    this.scene.add(this.hemi, this.ambient, this.key, this.key.target, this.root);

    this.contact = new ContactShadows(this.kit);
    this.scene.add(this.contact.mesh);

    const haloMat = () => new MeshBasicMaterial({ map: this.kit.ringGradient(), transparent: true, depthWrite: false, toneMapped: false });
    this.hoverHalo = new Mesh(this.kit.disc(1, 48), haloMat());
    this.selectHalo = new Mesh(this.kit.disc(1, 48), haloMat());
    for (const h of [this.hoverHalo, this.selectHalo]) {
      h.visible = false;
      h.renderOrder = 2;
      this.scene.add(h);
    }

    this.applyPalette();
    this.applyQuality();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    // html[data-anim=paused] (activity monitor) stops the loop immediately.
    this.mo = new MutationObserver(() => this.invalidate());
    this.mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-anim'] });
  }

  /* ---------------- motion policy ---------------- */

  get suspended(): boolean {
    return this.quality.suspended || document.documentElement.dataset.anim === 'paused' || document.visibilityState === 'hidden';
  }

  /**
   * How much a kind of motion may move right now (0 = still, 1 = full).
   *  - figure: robots' bodies, drones (ambient only; short bursts at eco)
   *  - indicator: status rings, eyes, error flashes (subtle and above)
   *  - flow: dashes moving along active tubes (subtle and above)
   */
  amplitude(kind: MotionKind): number {
    if (this.suspended) return 0;
    const m = this.quality.motion;
    if (m === 'none') return 0;
    if (m === 'state') {
      const now = performance.now();
      if (now >= this.burstUntil || kind === 'flow') return 0;
      const left = this.burstUntil - now;
      return Math.min(1, left / 350) * (kind === 'figure' ? 0.8 : 1);
    }
    if (m === 'subtle') return kind === 'figure' ? 0 : 1;
    return 1;
  }

  /** Short animation window after a real state change (the only motion allowed at "eco"). */
  burst(ms = 1400) {
    if (this.quality.motion === 'none') return this.invalidate();
    const now = performance.now();
    this.burstStart = now;
    this.burstUntil = Math.max(this.burstUntil, now + ms);
    this.invalidate();
  }

  /** Time since the last burst started (ms), for one-shot cues. */
  get burstAge() {
    return performance.now() - this.burstStart;
  }

  /** Registers a per-frame callback. Return true to ask for another frame. */
  addAnimator(fn: Animator): () => void {
    this.animators.add(fn);
    this.invalidate();
    return () => {
      this.animators.delete(fn);
    };
  }

  /** Called after each rendered frame (labels, minimap view box…). */
  onFrame(fn: (f: FrameInfo) => void): () => void {
    this.frameListeners.add(fn);
    return () => {
      this.frameListeners.delete(fn);
    };
  }

  /** Schedules one frame (coalesced). */
  invalidate = () => {
    if (this.disposed || this.raf || this.timer) return;
    this.raf = requestAnimationFrame(this.frame);
  };

  private frame = (now: number) => {
    this.raf = 0;
    this.timer = null;
    if (this.disposed) return;
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0.016;
    this.lastFrame = now;
    const t = now / 1000;
    const moving = this.rig.update();
    let wants = false;
    for (const a of this.animators) if (a(t, dt, this) === true) wants = true;
    this.updateHalos(t);
    const t0 = performance.now();
    this.renderer.render(this.scene, this.camera);
    const ms = performance.now() - t0;
    this.frames++;
    this.msHistory.push(ms);
    if (this.msHistory.length > 60) this.msHistory.shift();
    const info: FrameInfo = { t, dt, calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, ms };
    for (const l of this.frameListeners) l(info);

    const bursting = performance.now() < this.burstUntil && this.quality.motion !== 'none' && !this.suspended;
    const continuous = wants && !this.suspended && this.quality.motion !== 'none';
    this.looping = moving || bursting || continuous;
    if (moving) this.raf = requestAnimationFrame(this.frame);
    else if (bursting || continuous) {
      const cap = Math.max(1, this.quality.fpsCap || 30);
      const wait = Math.max(0, 1000 / cap - (performance.now() - now));
      this.timer = setTimeout(() => {
        this.timer = null;
        this.raf = requestAnimationFrame(this.frame);
      }, wait);
    }
  };

  /** Renders immediately (synchronously), e.g. before reading stats. */
  renderNow() {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.timer) clearTimeout(this.timer);
    this.raf = 0;
    this.timer = null;
    this.frame(performance.now());
  }

  /* ---------------- quality & theme ---------------- */

  setQuality(q: QualitySettings) {
    const prev = this.quality;
    this.quality = q;
    if (prev.level !== q.level || prev.shadows !== q.shadows) this.applyQuality();
    this.invalidate();
  }

  private applyQuality() {
    const q = this.quality;
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP[q.level]));
    const shadows = q.shadows && q.level !== 'minimal' && q.level !== 'eco';
    if (r.shadowMap.enabled !== shadows) {
      r.shadowMap.enabled = shadows;
      this.scene.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => (x.needsUpdate = true));
      });
    }
    this.key.castShadow = shadows;
    const size = q.level === 'high' ? 2048 : 1024;
    if (this.key.shadow.mapSize.x !== size) {
      this.key.shadow.mapSize.set(size, size);
      this.key.shadow.map?.dispose();
      this.key.shadow.map = null;
    }
    r.shadowMap.needsUpdate = true;
    this.rig.opts.damping = q.level === 'minimal' ? 0 : 0.2;
    this.rig.opts.tweenMs = q.level === 'minimal' || q.reducedMotion ? 0 : 650;
    const env = this.envWanted && (q.level === 'standard' || q.level === 'high');
    if (env && !this.envTex) {
      const pm = new PMREMGenerator(r);
      const room = new RoomEnvironment();
      this.envTex = pm.fromScene(room, 0.04).texture;
      room.dispose();
      pm.dispose();
      this.scene.environment = this.envTex;
    } else if (!env && this.envTex) {
      this.scene.environment = null;
      this.envTex.dispose();
      this.envTex = null;
    }
    this.applyLights();
    this.resize();
  }

  setPalette(p: ScenePalette) {
    this.palette = p;
    this.kit.setPalette(p);
    this.applyPalette();
    this.invalidate();
  }

  private applyPalette() {
    const p = this.palette;
    this.scene.background = p.background.clone();
    const dark = p.scheme === 'dark';
    const sel = this.selectHalo.material as MeshBasicMaterial;
    const hov = this.hoverHalo.material as MeshBasicMaterial;
    sel.color.copy(p.accent);
    hov.color.copy(dark ? new Color('#ffffff') : p.inkSoft);
    sel.blending = hov.blending = dark ? AdditiveBlending : NormalBlending;
    sel.opacity = dark ? 0.9 : 0.75;
    hov.opacity = dark ? 0.45 : 0.32;
    this.contact.setPalette(p);
    this.applyLights();
  }

  private applyLights() {
    const dark = this.palette.scheme === 'dark';
    const env = !!this.envTex;
    this.hemi.color.set(dark ? '#cfd6ff' : '#ffffff');
    this.hemi.groundColor.copy(this.palette.floor).lerp(new Color(dark ? '#000000' : '#c8c8d2'), 0.4);
    this.hemi.intensity = (dark ? 0.75 : 0.95) + (env ? 0 : 0.45);
    this.ambient.intensity = env ? 0.04 : 0.22;
    this.key.intensity = dark ? 1.9 : 2.5;
    this.scene.environmentIntensity = dark ? 0.5 : 0.62;
    this.renderer.toneMappingExposure = dark ? 1.0 : 1.0;
  }

  /** Fits the key light's shadow camera to a floor box and refreshes the (static) shadow map. */
  setShadowBounds(box: Box3) {
    const c = box.getCenter(new Vector3());
    const s = box.getSize(new Vector3());
    const r = Math.max(s.x, s.z) * 0.62 + 2;
    const cam = this.key.shadow.camera;
    cam.left = -r;
    cam.right = r;
    cam.top = r;
    cam.bottom = -r;
    cam.near = 1;
    cam.far = 60;
    cam.updateProjectionMatrix();
    this.key.position.set(c.x - 9, 16, c.z + 11);
    this.key.target.position.copy(c);
    this.key.target.updateMatrixWorld();
    this.updateShadows();
  }

  /** Shadows are baked once per content change (static furniture); call after rebuilding. */
  updateShadows() {
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.size = { w, h };
    this.rig.size = { w, h };
    this.renderer.setSize(w, h, false);
    if ((this.camera as PerspectiveCamera).isPerspectiveCamera) {
      const pc = this.camera as PerspectiveCamera;
      pc.aspect = w / h;
      pc.updateProjectionMatrix();
    }
    this.rig.apply();
    // Render synchronously so the canvas never shows a stretched/blank frame after a resize.
    if (!this.disposed) this.renderNow();
  }

  /* ---------------- halos (hover / selection) ---------------- */

  setHalo(which: 'hover' | 'select', object: Object3D | null) {
    this.haloTargets[which] = object;
    this.invalidate();
  }

  private updateHalos(t: number) {
    for (const which of ['hover', 'select'] as const) {
      const obj = this.haloTargets[which];
      const halo = which === 'hover' ? this.hoverHalo : this.selectHalo;
      if (!obj || !obj.parent || (which === 'hover' && obj === this.haloTargets.select)) {
        halo.visible = false;
        continue;
      }
      const b = new Box3().setFromObject(obj, true);
      if (b.isEmpty()) {
        halo.visible = false;
        continue;
      }
      const c = b.getCenter(new Vector3());
      const s = b.getSize(new Vector3());
      const r = Math.max(0.55, Math.hypot(s.x, s.z) * 0.62);
      const pulse = which === 'select' ? 1 + Math.sin(t * 3) * 0.03 * this.amplitude('indicator') : 1;
      halo.position.set(c.x, 0.012, c.z);
      halo.scale.setScalar(r * pulse);
      halo.visible = true;
    }
  }

  /* ---------------- projection ---------------- */

  /** Projects a world point to canvas CSS pixels. `visible` is false behind the camera or off-screen. */
  project(world: Vector3, out = { x: 0, y: 0, visible: false, depth: 0 }) {
    const v = _v.copy(world).project(this.camera);
    out.x = (v.x * 0.5 + 0.5) * this.size.w;
    out.y = (-v.y * 0.5 + 0.5) * this.size.h;
    out.depth = v.z;
    out.visible = v.z < 1 && v.z > -1 && out.x > -40 && out.y > -40 && out.x < this.size.w + 40 && out.y < this.size.h + 40;
    return out;
  }

  /* ---------------- content helpers ---------------- */

  /** Removes and frees everything under `root` (kit resources stay cached). */
  clearContent() {
    this.picker.clear();
    this.contact.clear();
    this.haloTargets = { hover: null, select: null };
    const owned = new Set<{ dispose: () => void }>();
    const textureKeys: string[] = [];
    this.root.traverse((o) => {
      if (typeof o.userData?.textureKey === 'string') textureKeys.push(o.userData.textureKey);
      const m = o as Mesh;
      if (m.geometry?.userData.owned) owned.add(m.geometry);
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const x of mats) if (x.userData.owned) owned.add(x);
    });
    for (const x of owned) x.dispose();
    // Canvas textures of glass boards are tracked by the kit: release them too.
    for (const k of textureKeys) this.kit.untrack(k);
    this.root.clear();
  }

  stats(): StageStats {
    const i = this.renderer.info;
    const avg = this.msHistory.length ? this.msHistory.reduce((a, b) => a + b, 0) / this.msHistory.length : 0;
    return {
      calls: i.render.calls,
      triangles: i.render.triangles,
      lines: i.render.lines,
      geometries: i.memory.geometries,
      textures: i.memory.textures,
      programs: i.programs?.length ?? 0,
      msPerFrame: Math.round(avg * 100) / 100,
      frames: this.frames,
      kitTextureBytes: this.kit.textureBytes,
      pixelRatio: this.renderer.getPixelRatio(),
      shadows: this.renderer.shadowMap.enabled,
      environment: !!this.envTex,
      looping: this.looping,
    };
  }

  private handleLost = (e: Event) => {
    e.preventDefault();
    this.onContextLost();
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.raf) cancelAnimationFrame(this.raf);
    if (this.timer) clearTimeout(this.timer);
    this.ro.disconnect();
    this.mo.disconnect();
    this.rig.dispose();
    this.animators.clear();
    this.frameListeners.clear();
    this.canvas.removeEventListener('webglcontextlost', this.handleLost);
    // Free everything reachable from the scene, then the kit caches.
    const geos = new Set<{ dispose: () => void }>();
    const mats = new Set<Material>();
    const texs = new Set<Texture>();
    this.scene.traverse((o) => {
      const m = o as Mesh;
      if (m.geometry) geos.add(m.geometry);
      const list = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const x of list) {
        mats.add(x);
        for (const v of Object.values(x)) if (v && (v as Texture).isTexture) texs.add(v as Texture);
      }
    });
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
    for (const t of texs) t.dispose();
    this.contact.dispose();
    this.kit.dispose();
    this.envTex?.dispose();
    this.key.shadow.map?.dispose();
    this.key.dispose();
    this.hemi.dispose();
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}

const _v = new Vector3();

/* ------------------------------------------------------------------ */
/* Contact shadows: one instanced quad for every soft blob shadow.      */
/* ------------------------------------------------------------------ */

const _m4 = new Matrix4();
const _q = new Quaternion();
const _s = new Vector3();
const _p = new Vector3();

export class ContactShadows {
  readonly mesh: InstancedMesh;
  private ids = new Map<string, number>();
  private data: Array<{ x: number; z: number; rx: number; rz: number }> = [];
  private capacity: number;
  private kit: MaterialKit;

  constructor(kit: MaterialKit, capacity = 160) {
    this.kit = kit;
    this.capacity = capacity;
    const mat = new MeshBasicMaterial({ color: '#000000', alphaMap: kit.gradientMask(), transparent: true, depthWrite: false, opacity: 0.22, toneMapped: false });
    this.mesh = new InstancedMesh(kit.disc(0.5, 32), mat, capacity);
    this.mesh.count = 0;
    this.mesh.renderOrder = 1;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'contact-shadows';
  }

  setPalette(p: ScenePalette) {
    const m = this.mesh.material as MeshBasicMaterial;
    m.opacity = p.scheme === 'dark' ? 0.55 : 0.2;
  }

  /** Adds or moves a blob (floor ellipse of radii rx/rz, metres). */
  set(id: string, x: number, z: number, rx: number, rz = rx) {
    let i = this.ids.get(id);
    if (i == null) {
      if (this.data.length >= this.capacity) return;
      i = this.data.length;
      this.ids.set(id, i);
      this.data.push({ x, z, rx, rz });
      this.mesh.count = this.data.length;
    }
    this.data[i] = { x, z, rx, rz };
    _p.set(x, 0.006, z);
    _s.set(rx * 2, 1, rz * 2);
    this.mesh.setMatrixAt(i, _m4.compose(_p, _q.identity(), _s));
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.ids.clear();
    this.data = [];
    this.mesh.count = 0;
  }

  dispose() {
    (this.mesh.material as Material).dispose();
    this.mesh.dispose();
    void this.kit;
  }
}

