/**
 * Runtime services shared by all renderers:
 *  - ActivityMonitor: suspends animations when the tab is hidden or the user
 *    is idle (no input for IDLE_MS), resumes on the next interaction.
 *  - AnimationClock: ONE requestAnimationFrame loop for the whole app, capped
 *    to the quality level's fps, running only while someone subscribes.
 *  - PerfMonitor: fps sampling (only while the HUD is open), long tasks,
 *    JS heap (Chromium only), DOM size and view-switch durations.
 */

const IDLE_MS = 90_000;

type Fn = () => void;

export class ActivityMonitor {
  suspended = false;
  private listeners = new Set<Fn>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private hidden = false;
  private idle = false;

  start() {
    if (typeof document === 'undefined') return () => undefined;
    const onVis = () => {
      this.hidden = document.visibilityState === 'hidden';
      this.update();
    };
    const onInput = () => {
      if (this.idle) {
        this.idle = false;
        this.update();
      }
      this.armIdle();
    };
    document.addEventListener('visibilitychange', onVis);
    const opts = { passive: true, capture: true } as AddEventListenerOptions;
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, onInput, opts);
    this.armIdle();
    onVis();
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.removeEventListener(ev, onInput, opts);
      if (this.idleTimer) clearTimeout(this.idleTimer);
    };
  }

  private armIdle() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.idle = true;
      this.update();
    }, IDLE_MS);
  }

  private update() {
    const next = this.hidden || this.idle;
    if (next === this.suspended) return;
    this.suspended = next;
    document.documentElement.dataset.anim = next ? 'paused' : 'running';
    for (const l of this.listeners) l();
  }

  subscribe(fn: Fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export class AnimationClock {
  private subs = new Set<(t: number, dt: number) => void>();
  private raf = 0;
  private last = 0;
  private fps = 30;
  private paused = false;

  configure(fps: number, paused: boolean) {
    this.fps = fps;
    this.paused = paused || fps <= 0;
    if (this.paused) this.stop();
    else this.maybeStart();
  }

  subscribe(fn: (t: number, dt: number) => void) {
    this.subs.add(fn);
    this.maybeStart();
    return () => {
      this.subs.delete(fn);
      if (!this.subs.size) this.stop();
    };
  }

  private maybeStart() {
    if (this.raf || this.paused || !this.subs.size || typeof requestAnimationFrame === 'undefined') return;
    this.last = performance.now();
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      const dt = now - this.last;
      if (dt < 1000 / this.fps - 1) return;
      this.last = now;
      for (const s of this.subs) s(now, dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  private stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  get running() {
    return this.raf !== 0;
  }
}

export interface PerfSnapshot {
  fps: number | null;
  longTasks: number;
  heapMb: number | null;
  domNodes: number;
  lastSwitchMs: number | null;
  lastLoadMs: number | null;
  clockRunning: boolean;
  gpu: string;
}

export class PerfMonitor {
  private frames = 0;
  private fpsValue: number | null = null;
  private raf = 0;
  private windowStart = 0;
  private longTasks = 0;
  private observer: PerformanceObserver | null = null;
  lastSwitchMs: number | null = null;
  lastLoadMs: number | null = null;

  startSampling() {
    if (this.raf || typeof requestAnimationFrame === 'undefined') return;
    this.windowStart = performance.now();
    this.frames = 0;
    const loop = (now: number) => {
      this.frames++;
      if (now - this.windowStart >= 1000) {
        this.fpsValue = Math.round((this.frames * 1000) / (now - this.windowStart));
        this.frames = 0;
        this.windowStart = now;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    try {
      this.observer = new PerformanceObserver((list) => {
        this.longTasks += list.getEntries().length;
      });
      this.observer.observe({ type: 'longtask', buffered: true });
    } catch {
      this.observer = null;
    }
  }

  stopSampling() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.observer?.disconnect();
    this.observer = null;
    this.fpsValue = null;
  }

  markSwitchStart(id: string) {
    performance.mark(`mag:switch:${id}:start`);
  }

  markSwitchEnd(id: string) {
    try {
      const m = performance.measure(`mag:switch:${id}`, `mag:switch:${id}:start`);
      this.lastSwitchMs = Math.round(m.duration);
    } catch {
      /* start mark missing (first render) */
    }
  }

  snapshot(clockRunning: boolean): PerfSnapshot {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return {
      fps: this.fpsValue,
      longTasks: this.longTasks,
      heapMb: mem ? Math.round(mem.usedJSHeapSize / 1e5) / 10 : null,
      domNodes: typeof document !== 'undefined' ? document.getElementsByTagName('*').length : 0,
      lastSwitchMs: this.lastSwitchMs,
      lastLoadMs: this.lastLoadMs,
      clockRunning,
      gpu: 'Non mesurable depuis le navigateur',
    };
  }
}
