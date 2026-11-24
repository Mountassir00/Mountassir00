/**
 * Camera rig: orbit / pan / zoom with damping, for mouse, trackpad, touch and
 * keyboard. Spherical coordinates around a target on the floor.
 *
 *  - mouse: left-drag orbit · right/middle-drag or Shift+drag pan · wheel zoom (towards the cursor)
 *  - trackpad: pinch (ctrl+wheel) zoom · horizontal swipe pan
 *  - touch: one finger orbit · two fingers pinch-zoom + pan
 *  - keyboard (canvas focused): arrows pan · Shift+arrows orbit · + / − zoom · 0 reset
 *
 * A gesture that moved more than a few pixels is a drag and never a click:
 * `onTap` only fires for still pointers.
 */
import { Box3, MathUtils, Object3D, OrthographicCamera, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';

export type AnyCamera = PerspectiveCamera | OrthographicCamera;

export interface CameraView {
  target: [number, number, number];
  /** Distance from target (m). */
  distance: number;
  /** Horizontal angle in degrees (0 = looking from +Z towards −Z). */
  azimuth: number;
  /** Angle from the vertical in degrees (0 = top-down, 90 = horizon). */
  polar: number;
}

export const CAMERA_PRESETS: Record<'iso' | 'top' | 'low' | 'front', Omit<CameraView, 'target' | 'distance'> & { distanceFactor: number }> = {
  /** Classic 3/4 "designer toy" view. */
  iso: { azimuth: 38, polar: 54, distanceFactor: 1 },
  /** Plan view (slightly tilted so volumes still read). */
  top: { azimuth: 0, polar: 8, distanceFactor: 1.08 },
  /** Low, cinematic. */
  low: { azimuth: 30, polar: 68, distanceFactor: 0.82 },
  front: { azimuth: 0, polar: 60, distanceFactor: 0.95 },
};
export type CameraPreset = keyof typeof CAMERA_PRESETS;

export interface CameraRigOptions {
  view: CameraView;
  minDistance: number;
  maxDistance: number;
  minPolar: number;
  maxPolar: number;
  /** The target is clamped to this box (floor area + margin). */
  bounds: Box3 | null;
  /** 0 = no damping (instant), 0.1–0.25 = smooth. */
  damping: number;
  /** Tween duration for focusOn / reset (ms); 0 = jump. */
  tweenMs: number;
  /** Drag threshold in px (mouse); touch uses 2×. */
  dragThreshold: number;
}

interface State {
  target: Vector3;
  distance: number;
  az: number; // radians
  polar: number; // radians
}

const DEG = Math.PI / 180;
const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class CameraRig {
  readonly camera: AnyCamera;
  readonly dom: HTMLElement;
  opts: CameraRigOptions;
  private home: CameraView;
  private cur: State;
  private goal: State;
  private tween: { from: State; to: State; t0: number; ms: number } | null = null;
  private pointers = new Map<number, { x: number; y: number; sx: number; sy: number; type: string; button: number; shift: boolean }>();
  private pinch: { dist: number; cx: number; cy: number } | null = null;
  private moved = false;
  private downAt = 0;
  private listeners: Array<() => void> = [];
  /** Called when the rig needs frames (gesture, damping, tween). */
  onChange: () => void = () => undefined;
  /** Still pointer released: a click/tap at client coordinates. */
  onTap: (x: number, y: number, e: PointerEvent) => void = () => undefined;
  /** Hover position (no button pressed). */
  onHover: (x: number, y: number) => void = () => undefined;
  onLeave: () => void = () => undefined;
  /** Viewport size in CSS px (set by the stage). */
  size = { w: 1, h: 1 };
  private ray = new Raycaster();
  private floor = new Plane(new Vector3(0, 1, 0), 0);

  constructor(camera: AnyCamera, dom: HTMLElement, opts: Partial<CameraRigOptions> & { view: CameraView }) {
    this.camera = camera;
    this.dom = dom;
    this.opts = {
      minDistance: 4,
      maxDistance: 60,
      minPolar: 4,
      maxPolar: 78,
      bounds: null,
      damping: 0.18,
      tweenMs: 650,
      dragThreshold: 4,
      ...opts,
    };
    this.home = opts.view;
    this.cur = this.toState(opts.view);
    this.goal = this.toState(opts.view);
    this.apply();
    this.attach();
  }

  private toState(v: CameraView): State {
    return { target: new Vector3(...v.target), distance: v.distance, az: v.azimuth * DEG, polar: v.polar * DEG };
  }

  get view(): CameraView {
    const s = this.goal;
    return { target: s.target.toArray() as [number, number, number], distance: s.distance, azimuth: s.az / DEG, polar: s.polar / DEG };
  }
  get distance() {
    return this.cur.distance;
  }
  get target() {
    return this.cur.target;
  }

  setHome(v: CameraView) {
    this.home = v;
  }

  /** Moves to a view (animated unless tweenMs = 0 or `instant`). */
  setView(v: Partial<CameraView>, instant = false) {
    const next: State = {
      target: v.target ? new Vector3(...v.target) : this.goal.target.clone(),
      distance: v.distance ?? this.goal.distance,
      az: v.azimuth != null ? v.azimuth * DEG : this.goal.az,
      polar: v.polar != null ? v.polar * DEG : this.goal.polar,
    };
    // shortest way round
    while (next.az - this.cur.az > Math.PI) next.az -= Math.PI * 2;
    while (next.az - this.cur.az < -Math.PI) next.az += Math.PI * 2;
    this.clamp(next);
    if (instant || this.opts.tweenMs <= 0) {
      this.tween = null;
      this.copy(this.goal, next);
      this.copy(this.cur, next);
      this.apply();
    } else {
      this.tween = { from: this.cloneState(this.cur), to: next, t0: performance.now(), ms: this.opts.tweenMs };
      this.copy(this.goal, next);
    }
    this.onChange();
  }

  reset(instant = false) {
    this.setView(this.home, instant);
  }

  /** Smoothly centres on a point / object / box, optionally changing the distance. */
  focusOn(target: Vector3 | Object3D | Box3, opts: { distance?: number; instant?: boolean } = {}) {
    let p: Vector3;
    let dist = opts.distance;
    if ((target as Box3).isBox3) {
      const b = target as Box3;
      p = b.getCenter(new Vector3());
      const size = b.getSize(new Vector3());
      dist ??= Math.max(size.x, size.z, size.y * 1.5) * 1.6 + 2;
    } else if ((target as Object3D).isObject3D) {
      const b = new Box3().setFromObject(target as Object3D);
      p = b.isEmpty() ? (target as Object3D).getWorldPosition(new Vector3()) : b.getCenter(new Vector3());
      if (!b.isEmpty()) {
        const size = b.getSize(new Vector3());
        dist ??= Math.max(size.x, size.z, size.y) * 2.4 + 3;
      }
    } else p = (target as Vector3).clone();
    p.y = Math.max(0, p.y * 0.5);
    this.setView({ target: p.toArray() as [number, number, number], distance: dist ?? this.goal.distance }, opts.instant);
  }

  /** Fits a floor box in the viewport at the current angles. */
  fit(box: Box3, instant = false) {
    const size = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    const aspect = this.size.w / Math.max(1, this.size.h);
    const fov = (this.camera as PerspectiveCamera).isPerspectiveCamera ? (this.camera as PerspectiveCamera).fov * DEG : 30 * DEG;
    const radius = Math.hypot(size.x, size.z) / 2;
    const fitH = radius / Math.tan(fov / 2);
    const fitW = radius / (Math.tan(fov / 2) * Math.min(1.6, aspect));
    const d = Math.max(fitH, fitW) * 0.92;
    this.setView({ target: [c.x, 0, c.z], distance: MathUtils.clamp(d, this.opts.minDistance, this.opts.maxDistance) }, instant);
  }

  zoomBy(factor: number, at?: { x: number; y: number }) {
    const before = at ? this.floorPoint(at.x, at.y) : null;
    this.goal.distance = MathUtils.clamp(this.goal.distance * factor, this.opts.minDistance, this.opts.maxDistance);
    if (before) {
      // keep the point under the cursor: move target towards it proportionally
      const k = 1 - factor;
      if (Number.isFinite(k)) this.goal.target.add(before.sub(this.goal.target).multiplyScalar(MathUtils.clamp(k, -1, 0.5) * 0.9));
    }
    this.tween = null;
    this.clamp(this.goal);
    this.kick();
  }

  /** Pans by screen pixels. */
  panBy(dx: number, dy: number) {
    const s = this.goal;
    const perPx = (2 * s.distance * Math.tan(((this.camera as PerspectiveCamera).fov ?? 30) * DEG * 0.5)) / Math.max(1, this.size.h);
    const right = new Vector3(Math.cos(s.az), 0, -Math.sin(s.az));
    const fwd = new Vector3(Math.sin(s.az), 0, Math.cos(s.az));
    const vy = dy / Math.max(0.35, Math.cos(s.polar * 0.6));
    s.target.addScaledVector(right, -dx * perPx).addScaledVector(fwd, -vy * perPx);
    this.tween = null;
    this.clamp(s);
    this.kick();
  }

  orbitBy(dAz: number, dPolar: number) {
    this.goal.az += dAz;
    this.goal.polar += dPolar;
    this.tween = null;
    this.clamp(this.goal);
    this.kick();
  }

  /** Advances damping/tween. Returns true while still moving. */
  update(): boolean {
    let moving = false;
    if (this.tween) {
      const k = Math.min(1, (performance.now() - this.tween.t0) / this.tween.ms);
      const e = ease(k);
      const { from, to } = this.tween;
      this.cur.target.lerpVectors(from.target, to.target, e);
      this.cur.distance = MathUtils.lerp(from.distance, to.distance, e);
      this.cur.az = MathUtils.lerp(from.az, to.az, e);
      this.cur.polar = MathUtils.lerp(from.polar, to.polar, e);
      if (k >= 1) this.tween = null;
      moving = true;
    } else {
      const d = this.opts.damping;
      const k = d <= 0 ? 1 : Math.min(1, d * 1.6);
      const c = this.cur;
      const g = this.goal;
      c.target.lerp(g.target, k);
      c.distance += (g.distance - c.distance) * k;
      c.az += (g.az - c.az) * k;
      c.polar += (g.polar - c.polar) * k;
      moving = c.target.distanceToSquared(g.target) > 1e-6 || Math.abs(g.distance - c.distance) > 1e-3 || Math.abs(g.az - c.az) > 1e-4 || Math.abs(g.polar - c.polar) > 1e-4;
      if (!moving) this.copy(c, g);
    }
    this.apply();
    return moving;
  }

  /** Writes the current state to the camera. */
  apply() {
    const s = this.cur;
    const cam = this.camera;
    const sinP = Math.sin(s.polar);
    cam.position.set(s.target.x + s.distance * sinP * Math.sin(s.az), s.target.y + s.distance * Math.cos(s.polar), s.target.z + s.distance * sinP * Math.cos(s.az));
    cam.up.set(0, 1, 0);
    if (s.polar < 0.02) cam.up.set(-Math.sin(s.az), 0, -Math.cos(s.az));
    cam.lookAt(s.target);
    if ((cam as OrthographicCamera).isOrthographicCamera) {
      const o = cam as OrthographicCamera;
      const halfH = s.distance * Math.tan(15 * DEG);
      const aspect = this.size.w / Math.max(1, this.size.h);
      o.top = halfH;
      o.bottom = -halfH;
      o.left = -halfH * aspect;
      o.right = halfH * aspect;
      o.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
  }

  /** Point on the floor (y = 0) under client coordinates relative to the canvas. */
  floorPoint(x: number, y: number): Vector3 | null {
    const ndc = new Vector2((x / this.size.w) * 2 - 1, -(y / this.size.h) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const out = new Vector3();
    return this.ray.ray.intersectPlane(this.floor, out) ? out : null;
  }

  private clamp(s: State) {
    s.distance = MathUtils.clamp(s.distance, this.opts.minDistance, this.opts.maxDistance);
    s.polar = MathUtils.clamp(s.polar, this.opts.minPolar * DEG, this.opts.maxPolar * DEG);
    if (this.opts.bounds) s.target.clamp(this.opts.bounds.min, this.opts.bounds.max);
  }

  private kick() {
    if (this.opts.damping <= 0) {
      this.copy(this.cur, this.goal);
      this.apply();
    }
    this.onChange();
  }

  private copy(a: State, b: State) {
    a.target.copy(b.target);
    a.distance = b.distance;
    a.az = b.az;
    a.polar = b.polar;
  }
  private cloneState(s: State): State {
    return { target: s.target.clone(), distance: s.distance, az: s.az, polar: s.polar };
  }

  /* ---------------- input ---------------- */

  private local(e: { clientX: number; clientY: number }) {
    const r = this.dom.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private attach() {
    const el = this.dom;
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.listeners.push(() => el.removeEventListener(type, fn as EventListener, opts));
    };
    on('contextmenu', (e) => e.preventDefault());
    on('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button > 2) return;
      el.setPointerCapture?.(e.pointerId);
      const p = this.local(e);
      this.pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, type: e.pointerType, button: e.button, shift: e.shiftKey });
      if (this.pointers.size === 1) {
        this.moved = false;
        this.downAt = performance.now();
      }
      if (this.pointers.size === 2) this.pinch = this.pinchState();
      this.tween = null;
    });
    on('pointermove', (e) => {
      const p = this.local(e);
      const ptr = this.pointers.get(e.pointerId);
      if (!ptr) {
        if (e.pointerType === 'mouse') this.onHover(p.x, p.y);
        return;
      }
      const dx = p.x - ptr.x;
      const dy = p.y - ptr.y;
      ptr.x = p.x;
      ptr.y = p.y;
      const thr = this.opts.dragThreshold * (ptr.type === 'touch' ? 2 : 1);
      if (!this.moved && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > thr) this.moved = true;
      if (!this.moved) return;
      if (this.pointers.size >= 2) {
        const next = this.pinchState();
        if (this.pinch && next) {
          if (next.dist > 0 && this.pinch.dist > 0) this.zoomBy(this.pinch.dist / next.dist, { x: next.cx, y: next.cy });
          this.panBy(next.cx - this.pinch.cx, next.cy - this.pinch.cy);
        }
        this.pinch = next;
        return;
      }
      const pan = ptr.button === 2 || ptr.button === 1 || ptr.shift || e.shiftKey;
      if (pan) this.panBy(dx, dy);
      else this.orbitBy((-dx / Math.max(1, this.size.w)) * Math.PI * 1.4, (-dy / Math.max(1, this.size.h)) * Math.PI * 0.9);
    });
    const end = (e: PointerEvent) => {
      const ptr = this.pointers.get(e.pointerId);
      if (!ptr) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (e.type === 'pointerup' && !this.moved && this.pointers.size === 0 && performance.now() - this.downAt < 600 && ptr.button === 0) {
        const p = this.local(e);
        this.onTap(p.x, p.y, e);
      }
      if (this.pointers.size === 0) this.moved = false;
    };
    on('pointerup', end);
    on('pointercancel', end);
    on('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !this.pointers.size) this.onLeave();
    });
    on(
      'wheel',
      (e) => {
        e.preventDefault();
        const p = this.local(e);
        const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
        const dy = e.deltaY * unit;
        const dx = e.deltaX * unit;
        if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy) * 1.2) {
          this.panBy(-dx, 0);
          return;
        }
        const factor = Math.exp(MathUtils.clamp(dy, -120, 120) * (e.ctrlKey ? 0.01 : 0.0016));
        this.zoomBy(factor, p);
      },
      { passive: false },
    );
    on('keydown', (e) => {
      const step = e.altKey ? 8 : 48;
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft':
          if (e.shiftKey) this.orbitBy(-0.12, 0);
          else this.panBy(step, 0);
          break;
        case 'ArrowRight':
          if (e.shiftKey) this.orbitBy(0.12, 0);
          else this.panBy(-step, 0);
          break;
        case 'ArrowUp':
          if (e.shiftKey) this.orbitBy(0, -0.08);
          else this.panBy(0, step);
          break;
        case 'ArrowDown':
          if (e.shiftKey) this.orbitBy(0, 0.08);
          else this.panBy(0, -step);
          break;
        case '+':
        case '=':
          this.zoomBy(0.85);
          break;
        case '-':
        case '_':
          this.zoomBy(1 / 0.85);
          break;
        case '0':
          this.reset();
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    });
  }

  private pinchState() {
    const pts = [...this.pointers.values()];
    if (pts.length < 2) return null;
    const [a, b] = pts;
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  get dragging() {
    return this.moved;
  }

  dispose() {
    for (const off of this.listeners) off();
    this.listeners = [];
    this.pointers.clear();
  }
}
