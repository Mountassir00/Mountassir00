/**
 * Constellation / Sphère réseau — the governor's catalog as a 3D cloud of
 * points drawn on a Canvas 2D (home-made projection, no WebGL).
 *
 *  - Nodes = catalog (governor, engines, departments, models, tools, data)
 *    plus the real tasks of the period as small satellites.
 *  - Size = calls (or tokens) on the period; colour = node type / department
 *    tone; red = error state (agent status, connector, open incident).
 *  - Thin links = catalog relations; lit paths = real flows of the last N
 *    minutes (recentFlows). Particles travel only on real flows and only
 *    when motion is allowed. No flow → nothing moves, legend says « Calme ».
 *  - Rendering is on demand (base canvas). The shared clock only drives an
 *    overlay canvas: particles on real flows and status pulses at « subtle »
 *    (20 fps), plus the slow decorative rotation at « ambient » (30 fps).
 *    Nothing moves at none/state, in minimal, or when suspended.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from 'react';
import { IconClose, IconFit, IconZoomIn, IconZoomOut, NatureBadge, Segmented, StatusPill } from '@ds';
import {
  fmtCompact, fmtInt, PERIOD_LABEL, recentFlows, useAnimationFrame, useGovernor, type DataNature, type ExperienceProps,
} from '@sdk';
import {
  aggregateFlows, buildGraph, computeActivity, isBusy, TASK_STATUS_LABEL, TYPE_LABEL, TYPE_ORDER, type GNode, type NodeType, type SizeBy,
} from './model';
import { backgroundParticles, eventParticles, facing, flowPath, layoutBurst, layoutSphere, rng, type Vec3 } from './layout';
import { createProjection, draw, drawOverlay, hitTest, type Camera, type OverlayState, type RFlow, type RLink, type RNode, type Scene } from './render';
import { mix, rgba, SLOTS, usePalette, type Palette, type Rgb } from './palette';
import './constellation.css';

type Form = 'burst' | 'sphere';
type Labels = 'none' | 'hubs' | 'all';

const FORM_LABEL: Record<Form, string> = { burst: 'Explosion', sphere: 'Sphère' };
/** The two installed views that share this component. */
const VIEW_OF: Record<Form, string> = { burst: 'constellation', sphere: 'network-sphere' };
const DEFAULT_CAM: Record<Form, Camera> = {
  burst: { yaw: 0.55, pitch: 0.5, zoom: 1 },
  sphere: { yaw: 0.35, pitch: 0.22, zoom: 1 },
};
const ZOOM_MIN = 0.45;
const ZOOM_MAX = 4;
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const css = (c: Rgb) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;

function colorOf(n: GNode, pal: Palette): Rgb {
  if (n.type === 'department' || n.type === 'task') return n.tone ? pal.tone[n.tone] : pal.type.agent;
  return pal.type[n.type];
}

export default function Constellation({ host, config, quality, device, manifest }: ExperienceProps) {
  const g = useGovernor();
  const pal = usePalette();
  const uid = useId();
  const mobile = device === 'mobile';

  /* ---------- settings ---------- */
  const form0: Form = config.form === 'sphere' ? 'sphere' : 'burst';
  const density = clamp(num(config.bgDensity, 0.3), 0, 1);
  const speed = clamp(num(config.rotationSpeed, 3), 0, 20);
  const windowMin = clamp(num(config.flowWindowMin, 10), 1, 120);
  const showLinks = config.showCatalogLinks !== false;
  const glowK = clamp(num(config.glowIntensity, 0.6), 0, 1);
  const showTasks = config.showTasks !== false;
  const showEvents = config.showEvents !== false;
  const sizeBy: SizeBy = config.sizeBy === 'tokens' ? 'tokens' : 'calls';
  const labels: Labels = config.labels === 'none' || config.labels === 'all' ? config.labels : 'hubs';

  // Local switch between the two layouts (the host cannot navigate between views).
  const [override, setOverride] = useState<{ form: Form; base: Form } | null>(() => host.getLocal<{ form: Form; base: Form } | null>('formOverride', null));
  const form: Form = override && override.base === form0 ? override.form : form0;

  const minimal = quality.level === 'minimal';
  const eco = quality.level === 'eco';
  const motionOK = (quality.motion === 'subtle' || quality.motion === 'ambient') && !quality.reducedMotion;
  const live = motionOK && !quality.suspended;
  // Decorative rotation only at « ambient »; at « subtle » only real flows and status pulses move.
  const rotating = live && quality.motion === 'ambient' && speed > 0;
  const dustOn = form === 'burst' && !minimal && !eco && density > 0;
  const maxTasks = minimal ? 60 : eco || mobile ? 140 : 260;
  const maxEvents = minimal ? 400 : eco || mobile ? 900 : quality.level === 'high' ? 2400 : 1600;

  /* ---------- data ---------- */
  const periodEvents = useMemo(() => g.rangeEvents(), [g]);
  const activity = useMemo(() => computeActivity(periodEvents), [periodEvents]);
  const graph = useMemo(
    () => buildGraph({ catalog: g.catalog, state: g.state, activity, range: g.range, hasDemo: g.hasDemo, sizeBy, showTasks, maxTasks }),
    [g.catalog, g.state, activity, g.range, g.hasDemo, sizeBy, showTasks, maxTasks],
  );
  // Layout depends on the structure only, so live updates never reshuffle the scene.
  const structKey = useMemo(() => graph.nodes.map((n) => n.key).join(','), [graph]);
  const positions = useMemo(
    () => (form === 'sphere' ? layoutSphere(graph) : layoutBurst(graph)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [structKey, form],
  );
  const windowMs = windowMin * 60_000;
  const flowAgg = useMemo(() => {
    const flows = recentFlows(g.windowEvents(g.now - windowMs, g.now), g.now, windowMs);
    return aggregateFlows(flows, (id) => graph.byKey.has(id));
  }, [g, windowMs, graph]);

  const nodeFlows = useMemo(() => {
    const m = new Map<string, { out: number; in: number; failed: number }>();
    for (const p of flowAgg.pairs) {
      const a = m.get(p.from) ?? { out: 0, in: 0, failed: 0 };
      a.out += p.count;
      a.failed += p.failed;
      m.set(p.from, a);
      const b = m.get(p.to) ?? { out: 0, in: 0, failed: 0 };
      b.in += p.count;
      b.failed += p.failed;
      m.set(p.to, b);
    }
    return m;
  }, [flowAgg]);

  const evParts = useMemo(
    () => (form === 'burst' && showEvents ? eventParticles(periodEvents, graph, g.range, maxEvents) : null),
    [form, showEvents, periodEvents, graph, g.range, maxEvents],
  );

  const dust = useMemo(() => (dustOn ? backgroundParticles(Math.round(density * (mobile ? 360 : 700)), graph.groups.length) : null), [dustOn, density, mobile, graph.groups.length]);

  /* ---------- scene (render-ready) ---------- */
  const scene = useMemo<Scene | null>(() => {
    if (!pal) return null;
    const index = new Map<string, number>();
    graph.nodes.forEach((n, i) => index.set(n.key, i));
    const nodes: RNode[] = graph.nodes.map((n) => {
      const c = colorOf(n, pal);
      const active = nodeFlows.has(n.key);
      const pulse = n.type === 'task' ? n.taskStatus === 'running' : isBusy(n.status);
      const a = n.activity;
      let base: number;
      switch (n.type) {
        case 'governor':
          base = 10;
          break;
        case 'department':
          base = 3.6 + 5.4 * a;
          break;
        case 'agent':
          base = 3.2 + 5 * a;
          break;
        case 'task':
          base = n.error ? 2 : 1.15 + 1.5 * a;
          break;
        default:
          base = 2.8 + 4.8 * a;
      }
      if (minimal && n.type !== 'task') base = Math.max(base, 3.5);
      const glow = n.type === 'governor' ? 1 : n.type === 'task' ? (pulse ? 0.55 : 0.08 + 0.25 * a) : clamp(0.12 + 0.55 * a + (active ? 0.35 : 0), 0, 1);
      const lightFill = n.type === 'governor' ? pal.ink : n.type === 'task' ? c : n.type === 'department' && n.tone ? mix(pal.pastel[n.tone], c, 0.18) : mix(c, WHITE, 0.6);
      return {
        key: n.key,
        p: positions.get(n.key) ?? ([0, 0, 0] as Vec3),
        base,
        type: n.type,
        color: c,
        css: css(c),
        coreCss: css(n.type === 'governor' ? mix(pal.accent, WHITE, 0.78) : mix(c, WHITE, n.type === 'task' ? 0.15 : 0.18 + 0.45 * a)),
        fillCss: n.type === 'task' ? rgba(lightFill, 0.78) : css(lightFill),
        glow,
        error: n.error,
        warn: n.warn,
        active,
        pulse,
        label: n.label,
        labelPri: n.type === 'governor' ? 3 : n.type === 'department' || (n.type === 'model' && n.calls > 0) ? 2 : n.type === 'task' ? 0 : 1,
      };
    });
    const links: RLink[] = [];
    for (const l of graph.links) {
      const a = index.get(l.a);
      const b = index.get(l.b);
      if (a == null || b == null) continue;
      const tn = graph.nodes[b].type === 'task' ? graph.nodes[b] : null;
      const lc = tn ? colorOf(tn, pal) : pal.dark ? pal.ink : pal.inkSoft;
      const alpha = tn ? (pal.dark ? 0.16 : 0.3) : pal.dark ? 0.2 : 0.24;
      links.push({ a, b, css: rgba(lc, alpha) });
    }
    links.sort((x, y) => (x.css < y.css ? -1 : x.css > y.css ? 1 : 0));
    const flows: RFlow[] = [];
    for (const p of flowAgg.pairs) {
      const a = index.get(p.from);
      const b = index.get(p.to);
      if (a == null || b == null) continue;
      const to = graph.nodes[b];
      const rgb = p.lastFailed ? pal.error : colorOf(to, pal);
      flows.push({
        a,
        b,
        key: p.key,
        count: p.count,
        failed: p.lastFailed,
        css: css(rgb),
        rgb,
        path: flowPath(positions.get(p.from) ?? [0, 0, 0], positions.get(p.to) ?? [0, 0, 0], form),
        seed: rng(p.key)(),
      });
    }
    // Dust colours follow the arms (tone of the first department of each group).
    const dustCss = graph.groups.map((gr) => {
      const d = graph.nodes.find((n) => n.type === 'department' && n.group === gr);
      return css(d?.tone ? pal.tone[d.tone] : pal.muted);
    });
    return {
      form,
      nodes,
      links,
      flows,
      dust,
      dustCss,
      dustNeutralCss: css(pal.dark ? mix(pal.ink, pal.accent, 0.2) : pal.muted),
      events: evParts,
      eventCss: [...SLOTS.map((sl) => css(pal.tone[sl])), css(pal.dark ? mix(pal.ink, pal.accent, 0.35) : pal.muted), css(pal.error)],
    };
  }, [pal, graph, positions, flowAgg, nodeFlows, dust, evParts, form, minimal]);

  /* ---------- interaction state ---------- */
  const [hover, setHover] = useState(-1);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [pinned, setPinned] = useState(-1);
  const [legendOpen, setLegendOpen] = useState(!mobile);
  const [tweenOn, setTweenOn] = useState(false);

  const selIdx = useMemo(() => {
    const s = g.selection;
    if (!s) return -1;
    const key = s.kind === 'task' ? `task:${s.id}` : s.id;
    return graph.nodes.findIndex((n) => n.key === key);
  }, [g.selection, graph]);

  const related = useMemo(() => {
    if (selIdx < 0 || !scene) return null;
    const set = new Set([selIdx]);
    for (const l of scene.links) {
      if (l.a === selIdx) set.add(l.b);
      if (l.b === selIdx) set.add(l.a);
    }
    for (const f of scene.flows) {
      if (f.a === selIdx) set.add(f.b);
      if (f.b === selIdx) set.add(f.a);
    }
    return set;
  }, [selIdx, scene]);

  /* ---------- canvas plumbing ---------- */
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const overlayState = useRef<OverlayState>({ rects: [] });
  const baseDirty = useRef(true);
  const tipRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const camRef = useRef<Camera>({ ...DEFAULT_CAM[form] });
  const tweenRef = useRef<{ from: Camera; to: Camera; start: number; dur: number } | null>(null);
  const projRef = useRef(createProjection());
  const rafRef = useRef(0);
  const lastFrame = useRef(0);
  const dragRef = useRef<{ x: number; y: number; sx: number; sy: number; moved: boolean; pinch: number; type: string } | null>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());

  const tip = pinned >= 0 ? pinned : focusIdx >= 0 ? focusIdx : hover;
  const params = {
    scene,
    pal,
    live,
    glow: minimal ? 0 : glowK,
    showLinks,
    labels: minimal && labels === 'all' ? ('hubs' as Labels) : labels,
    hover,
    focus: focusIdx,
    sel: selIdx,
    related,
    compact: mobile,
    tip,
    pinnedMode: pinned >= 0 && mobile,
    rotating,
  };
  const P = useRef(params);
  P.current = params;

  const drawNow = useCallback((time: number) => {
    const c = canvasRef.current;
    const o = overlayRef.current;
    const p = P.current;
    const { w, h, dpr } = sizeRef.current;
    if (!c || !p.scene || !p.pal || !w || !h) return;
    const view = {
      w, h, dpr, pal: p.pal, cam: camRef.current, time, animate: p.live, glow: p.pal.dark ? p.glow : 0, showLinks: p.showLinks,
      labels: p.labels, hover: p.hover, focus: p.focus, sel: p.sel, related: p.related, compact: p.compact,
    };
    const proj = projRef.current;
    // Base layer: redrawn only when something visible changed (data, camera, hover, theme…).
    if (baseDirty.current) {
      const ctx = c.getContext('2d');
      if (!ctx) return;
      draw(ctx, p.scene, view, proj);
      baseDirty.current = false;
    }
    // Overlay: particles on real flows and status pulses; cleared when motion is off.
    const octx = o?.getContext('2d');
    if (octx) drawOverlay(octx, p.scene, view, proj, overlayState.current);
    // Keep the tooltip glued to its node (imperatively: no React render per frame).
    const el = tipRef.current;
    if (el && p.tip >= 0 && p.tip < proj.n && !p.pinnedMode) {
      const tw = el.offsetWidth;
      const th = el.offsetHeight;
      let x = proj.x[p.tip] + proj.r[p.tip] + 16;
      if (x + tw > w - 10) x = proj.x[p.tip] - proj.r[p.tip] - 16 - tw;
      x = clamp(x, 10, Math.max(10, w - tw - 10));
      const y = clamp(proj.y[p.tip] - th / 2, 10, Math.max(10, h - th - 10));
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    }
  }, []);

  const requestDraw = useCallback(() => {
    baseDirty.current = true;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame((t) => {
      rafRef.current = 0;
      drawNow(t);
    });
  }, [drawNow]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Size: device pixel ratio capped at 2.
  useEffect(() => {
    const el = wrapRef.current;
    const c = canvasRef.current;
    if (!el || !c) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { w: r.width, h: r.height, dpr };
      for (const cv of [c, overlayRef.current]) {
        if (!cv) continue;
        cv.width = Math.max(1, Math.round(r.width * dpr));
        cv.height = Math.max(1, Math.round(r.height * dpr));
      }
      overlayState.current.rects.length = 0;
      baseDirty.current = true;
      drawNow(performance.now());
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawNow]);

  // Redraw on any change that affects the picture (data, theme, hover, selection, settings).
  useEffect(() => {
    requestDraw();
  }, [requestDraw, scene, pal, hover, focusIdx, selIdx, related, showLinks, labels, glowK, live, pinned]);

  /* ---------- camera ---------- */
  const animateTo = useCallback(
    (to: Camera) => {
      tweenRef.current = null;
      if (!P.current.live) {
        camRef.current = { ...to };
        requestDraw();
        return;
      }
      const from = { ...camRef.current };
      // Shortest way round.
      const dy = ((((to.yaw - from.yaw) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      tweenRef.current = { from, to: { ...to, yaw: from.yaw + dy }, start: performance.now(), dur: 700 };
      setTweenOn(true);
    },
    [requestDraw],
  );
  const formRef = useRef(form);
  formRef.current = form;
  const resetView = useCallback(() => animateTo(DEFAULT_CAM[formRef.current]), [animateTo]);
  const focusOn = useCallback(
    (i: number) => {
      const s = P.current.scene;
      const nd = s?.nodes[i];
      const f = nd ? facing(nd.p) : null;
      if (!f) return resetView();
      animateTo({ yaw: f.yaw, pitch: f.pitch, zoom: Math.max(camRef.current.zoom, 1.6) });
    },
    [animateTo, resetView],
  );
  const zoomBy = useCallback(
    (k: number) => {
      tweenRef.current = null;
      camRef.current.zoom = clamp(camRef.current.zoom * k, ZOOM_MIN, ZOOM_MAX);
      requestDraw();
    },
    [requestDraw],
  );

  // New layout → back to its default framing.
  useEffect(() => {
    camRef.current = { ...DEFAULT_CAM[form] };
    tweenRef.current = null;
    requestDraw();
  }, [form, requestDraw]);

  /* ---------- animation (shared, capped clock) ---------- */
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const hasPulse = useMemo(() => !!scene?.nodes.some((n) => n.pulse), [scene]);
  const animating = live && (rotating || (scene?.flows.length ?? 0) > 0 || hasPulse || tweenOn);
  useAnimationFrame((t, dt) => {
    const p = P.current;
    // « subtle »: only particles and pulses move, 20 fps is plenty; a slow drift needs no more than 30 fps.
    if (!tweenRef.current && t - lastFrame.current < (p.rotating ? 32 : 48)) return;
    const step = Math.min(120, t - (lastFrame.current || t - dt));
    lastFrame.current = t;
    const cam = camRef.current;
    const tw = tweenRef.current;
    if (tw) {
      baseDirty.current = true;
      const k = clamp((t - tw.start) / tw.dur, 0, 1);
      const e = 1 - Math.pow(1 - k, 3);
      cam.yaw = tw.from.yaw + (tw.to.yaw - tw.from.yaw) * e;
      cam.pitch = tw.from.pitch + (tw.to.pitch - tw.from.pitch) * e;
      cam.zoom = tw.from.zoom + (tw.to.zoom - tw.from.zoom) * e;
      if (k >= 1) {
        tweenRef.current = null;
        setTweenOn(false);
      }
    } else if (p.rotating && !dragRef.current && p.tip < 0) {
      cam.yaw += ((speedRef.current * Math.PI) / 180) * (step / 1000);
      baseDirty.current = true;
    }
    drawNow(t);
  }, animating);
  // When motion stops (quality change, suspension), erase the overlay once.
  useEffect(() => {
    if (!animating) requestDraw();
  }, [animating, requestDraw]);

  /* ---------- pointer & keyboard ---------- */
  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const select = useCallback(
    (i: number) => {
      const n = graph.nodes[i];
      if (!n) return;
      host.select({ kind: n.selKind, id: n.refId });
    },
    [graph, host],
  );

  const onPointerDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, p);
    tweenRef.current = null;
    if (ptrs.current.size === 1) dragRef.current = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, pinch: 0, type: e.pointerType };
    if (ptrs.current.size === 2 && dragRef.current) {
      const [a, b] = [...ptrs.current.values()];
      dragRef.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
      dragRef.current.moved = true;
    }
  };
  const onPointerMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    const d = dragRef.current;
    if (d && ptrs.current.has(e.pointerId)) {
      const prev = ptrs.current.get(e.pointerId)!;
      ptrs.current.set(e.pointerId, p);
      if (ptrs.current.size >= 2) {
        const [a, b] = [...ptrs.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (d.pinch > 0) camRef.current.zoom = clamp((camRef.current.zoom * dist) / d.pinch, ZOOM_MIN, ZOOM_MAX);
        d.pinch = dist;
        requestDraw();
        return;
      }
      if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 4) {
        d.moved = true;
        if (hover >= 0) setHover(-1);
      }
      if (d.moved) {
        const cam = camRef.current;
        cam.yaw += (p.x - prev.x) * 0.0065;
        cam.pitch = clamp(cam.pitch + (p.y - prev.y) * 0.0065, -1.35, 1.35);
        requestDraw();
      }
      return;
    }
    if (e.pointerType === 'mouse' && scene) {
      const i = hitTest(projRef.current, scene, p.x, p.y);
      if (i !== hover) setHover(i);
    }
  };
  const onPointerUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size > 0) return;
    dragRef.current = null;
    if (!d || d.moved || !scene) return;
    const p = local(e);
    const touch = d.type !== 'mouse';
    const i = hitTest(projRef.current, scene, p.x, p.y, touch);
    if (!touch) {
      if (i >= 0) select(i);
      return;
    }
    // Touch: first tap shows the card, a second tap on the same node opens the inspector.
    if (i < 0) setPinned(-1);
    else if (i === pinned) select(i);
    else setPinned(i);
  };
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scene) return;
    const p = local(e);
    const i = hitTest(projRef.current, scene, p.x, p.y);
    if (i >= 0) focusOn(i);
    else resetView();
  };

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camRef.current.zoom = clamp(camRef.current.zoom * Math.exp(-e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
      tweenRef.current = null;
      requestDraw();
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [requestDraw]);

  const onSceneKey = (e: KeyboardEvent) => {
    const cam = camRef.current;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':
        cam.yaw -= 0.16;
        break;
      case 'ArrowRight':
        cam.yaw += 0.16;
        break;
      case 'ArrowUp':
        cam.pitch = clamp(cam.pitch - 0.12, -1.35, 1.35);
        break;
      case 'ArrowDown':
        cam.pitch = clamp(cam.pitch + 0.12, -1.35, 1.35);
        break;
      case '+':
      case '=':
        cam.zoom = clamp(cam.zoom * 1.15, ZOOM_MIN, ZOOM_MAX);
        break;
      case '-':
      case '_':
        cam.zoom = clamp(cam.zoom / 1.15, ZOOM_MIN, ZOOM_MAX);
        break;
      case '0':
      case 'Home':
        resetView();
        break;
      case 'Escape':
        setPinned(-1);
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      tweenRef.current = null;
      requestDraw();
    }
  };

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const setForm = useCallback(
    (f: Form) => {
      if (f === form) return;
      setPinned(-1);
      setHover(-1);
      const applyLocal = () => {
        const o = f === form0 ? null : { form: f, base: form0 };
        setOverride(o);
        host.setLocal('formOverride', o);
        host.announce(`Disposition : ${FORM_LABEL[f].toLowerCase()}`);
      };
      const target = VIEW_OF[f];
      // Back to this view's own form, or already on the target view: local switch only.
      if (f === form0 || manifest.id === target) return applyLocal();
      // Otherwise open the sibling view (context kept); fall back to a local switch if it is disabled.
      host.openView(target);
      window.setTimeout(() => {
        if (mounted.current) applyLocal();
      }, 450);
    },
    [form, form0, host, manifest.id],
  );

  // View commands in the palette (Ctrl+K).
  useEffect(
    () =>
      host.provideCommands([
        { id: 'recenter', label: 'Recentrer la scène', hint: 'Constellation', run: resetView },
        { id: 'form', label: form === 'burst' ? 'Afficher en sphère' : 'Afficher en explosion', hint: 'Disposition', run: () => setForm(form === 'burst' ? 'sphere' : 'burst') },
      ]),
    [host, form, resetView, setForm],
  );

  /* ---------- derived figures ---------- */
  const catalogNodes = graph.nodes.filter((n) => n.type !== 'task');
  const activeCount = catalogNodes.filter((n) => nodeFlows.has(n.key) || isBusy(n.status)).length;
  const counts = useMemo(() => {
    const m = new Map<NodeType, number>();
    for (const n of graph.nodes) m.set(n.type, (m.get(n.type) ?? 0) + 1);
    return m;
  }, [graph]);
  const dataNature: DataNature = g.hasDemo ? 'demo' : 'real';
  const period = PERIOD_LABEL[g.period.preset];
  const flowFailed = flowAgg.pairs.reduce((s, p) => s + p.failed, 0);
  const flowTotal = flowAgg.pairs.reduce((s, p) => s + p.count, 0);
  const calm = flowTotal === 0;
  const unit = sizeBy === 'tokens' ? 'tokens' : 'appels';

  const summary = useMemo(() => {
    const top = [...catalogNodes].filter((n) => n.type !== 'governor').sort((a, b) => b.calls - a.calls)[0];
    const topFlow = [...flowAgg.pairs].sort((a, b) => b.count - a.count)[0];
    const errs = catalogNodes.filter((n) => n.error);
    const lbl = (id: string) => graph.byKey.get(id)?.label ?? id;
    const parts = [
      form === 'burst'
        ? `Constellation en explosion : le Gouverneur au cœur, ${counts.get('department') ?? 0} départements répartis en ${graph.groups.length} bras, ${counts.get('agent') ?? 0} agents et moteurs autour du cœur, ${(counts.get('model') ?? 0) + (counts.get('tool') ?? 0) + (counts.get('data') ?? 0)} modèles, outils et sources de données en halo extérieur.`
        : `Sphère réseau : le Gouverneur au centre, ${catalogNodes.length - 1} nœuds du catalogue répartis en régions sur la sphère (agents, groupes de départements, modèles, outils, données).`,
      `Période ${period} : ${activeCount} nœuds actifs sur ${catalogNodes.length}.`,
      top && top.calls > 0 ? `Le plus actif : ${top.label} (${fmtInt(top.calls)} appels).` : 'Aucune activité enregistrée sur la période.',
      calm
        ? `Calme : aucun flux réel sur les ${windowMin} dernières minutes.`
        : `${fmtInt(flowTotal)} flux réels sur les ${windowMin} dernières minutes${flowFailed ? `, dont ${flowFailed} en échec` : ''}${topFlow ? ` ; le plus fréquent : ${lbl(topFlow.from)} vers ${lbl(topFlow.to)} (${topFlow.count})` : ''}.`,
      errs.length ? `En erreur : ${errs.map((n) => `${n.label}${n.reason ? ` (${n.reason.toLowerCase()})` : ''}`).join(', ')}.` : 'Aucun nœud en erreur.',
      showTasks ? `${fmtInt(graph.tasksShown)} tâches de la période représentées en satellites${graph.tasksTotal > graph.tasksShown ? ` (sur ${fmtInt(graph.tasksTotal)})` : ''}.` : '',
      evParts && evParts.count ? `${fmtInt(evParts.count)} événements réels de la période en particules, d’autant plus loin du cœur qu’ils sont anciens.` : '',
      g.hasDemo ? 'Données de démonstration.' : '',
      g.mode === 'replay' ? 'Relecture : état passé, lecture seule.' : '',
    ];
    return parts.filter(Boolean).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, flowAgg, form, activeCount, calm, windowMin, period, showTasks, evParts, g.hasDemo, g.mode]);

  const ordered = useMemo(
    () =>
      TYPE_ORDER.filter((t) => t !== 'task').map((t) => ({
        type: t,
        items: graph.nodes.map((n, i) => ({ n, i })).filter(({ n }) => n.type === t),
      })),
    [graph],
  );

  const swatch = (t: NodeType): string => {
    if (!pal) return 'var(--c-ink-muted)';
    if (t === 'governor') return pal.dark ? css(mix(pal.accent, WHITE, 0.55)) : css(pal.ink);
    if (t === 'department' || t === 'task') {
      const tones = [...new Set(graph.nodes.filter((n) => n.type === 'department' && n.tone).map((n) => n.tone!))].slice(0, 6);
      if (!tones.length) return css(pal.type.agent);
      return `conic-gradient(${tones.map((s, i) => `${css(pal.tone[s])} ${(i / tones.length) * 100}% ${((i + 1) / tones.length) * 100}%`).join(', ')})`;
    }
    return css(pal.type[t]);
  };

  const describe = (n: GNode) => {
    const f = nodeFlows.get(n.key);
    const act = n.unavailable ? `indisponible : ${n.unavailable}` : `${fmtInt(n.calls)} appels${n.tokens ? `, ${fmtCompact(n.tokens)} tokens` : ''} sur ${period}`;
    return `${n.label}, ${n.type === 'governor' ? 'Gouverneur' : TYPE_LABEL[n.type].toLowerCase()}, ${act}${f ? `, ${f.in + f.out} flux sur ${windowMin} min` : ''}${n.error ? `, en erreur${n.reason ? ` : ${n.reason}` : ''}` : ''}`;
  };

  const tipNode = tip >= 0 ? graph.nodes[tip] : null;
  const tipFlows = tipNode ? nodeFlows.get(tipNode.key) : undefined;
  const listKey = (e: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', '0', 'Home'].includes(e.key)) onSceneKey(e);
  };

  return (
    <div className="cst" data-form={form} data-scheme={pal?.dark ? 'dark' : 'light'} data-device={device} data-quality={quality.level}>
      <div ref={wrapRef} className="cst__stage">
        <canvas
          ref={canvasRef}
          className="cst__canvas"
          role="img"
          aria-label={`${form === 'burst' ? 'Constellation' : 'Sphère réseau'} : ${catalogNodes.length} nœuds, ${flowTotal} flux sur ${windowMin} min`}
          aria-describedby={`${uid}-sum`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={(e) => e.pointerType === 'mouse' && !dragRef.current && setHover(-1)}
          onDoubleClick={onDoubleClick}
          data-hover={hover >= 0 || undefined}
        />
        <canvas ref={overlayRef} className="cst__overlay" aria-hidden hidden={!animating} />
      </div>
      <p id={`${uid}-sum`} className="sr-only">
        {summary}
      </p>

      {/* HUD: counters, nature, calm state */}
      <section className="cst-hud" aria-label="Compteurs de la scène">
        <div className="cst-hud__head">
          <span className="cst-hud__title">{form === 'burst' ? 'Constellation' : 'Sphère réseau'}</span>
          {g.mode === 'replay' && <span className="pill pill--accent">Relecture</span>}
          <NatureBadge nature={dataNature} />
        </div>
        <dl className="cst-stats">
          <div>
            <dt>Nœuds actifs</dt>
            <dd className="num">
              {activeCount}
              <small>/{catalogNodes.length}</small>
            </dd>
          </div>
          <div>
            <dt>Flux · {windowMin} min</dt>
            <dd className="num" data-err={flowFailed > 0 || undefined}>
              {fmtInt(flowTotal)}
              {flowFailed > 0 && <small> · {flowFailed} échec{flowFailed > 1 ? 's' : ''}</small>}
            </dd>
          </div>
          {showTasks && !mobile && (
            <div>
              <dt>Tâches · {period}</dt>
              <dd className="num">
                {fmtInt(graph.tasksShown)}
                {graph.tasksTotal > graph.tasksShown && <small>/{fmtInt(graph.tasksTotal)}</small>}
              </dd>
            </div>
          )}
        </dl>
        {calm && (
          <p className="cst-calm">
            <i aria-hidden /> Calme — aucun flux réel sur {windowMin} min
          </p>
        )}
      </section>

      {/* Controls */}
      <div className="cst-ctrl">
        <Segmented<Form>
          size="sm"
          raised
          label="Disposition de la scène"
          value={form}
          onChange={setForm}
          options={[
            { value: 'burst', label: 'Explosion' },
            { value: 'sphere', label: 'Sphère' },
          ]}
        />
        <div className="cst-ctrl__row">
          <button type="button" className="icon-btn cst-ib" aria-label="Zoom avant" onClick={() => zoomBy(1.25)}>
            <IconZoomIn size={16} />
          </button>
          <button type="button" className="icon-btn cst-ib" aria-label="Zoom arrière" onClick={() => zoomBy(1 / 1.25)}>
            <IconZoomOut size={16} />
          </button>
          <button type="button" className="btn btn--sm btn--raised cst-recenter" onClick={resetView} aria-label="Recentrer la scène">
            <IconFit size={16} />
            <span>Recentrer</span>
          </button>
        </div>
      </div>

      {/* Keyboard access: the scene itself, then every catalog node */}
      <div
        className="cst-kbd"
        tabIndex={0}
        role="group"
        aria-label="Scène 3D : flèches pour tourner, plus et moins pour zoomer, 0 pour recentrer ; Tab pour parcourir les nœuds"
        onKeyDown={onSceneKey}
      >
        <span aria-hidden>Flèches : tourner · + / − : zoom · 0 : recentrer · Tab : nœuds</span>
      </div>
      <nav className="cst-list" aria-label="Nœuds de la scène">
        {ordered.map(({ type, items }) =>
          items.length ? (
            <div key={type} role="group" aria-label={type === 'governor' ? 'Gouverneur' : TYPE_LABEL[type]}>
              {items.map(({ n, i }) => (
                <button
                  key={n.key}
                  type="button"
                  className="cst-list__item"
                  aria-label={describe(n)}
                  aria-current={i === selIdx ? 'true' : undefined}
                  onFocus={() => {
                    setFocusIdx(i);
                    setHover(-1);
                  }}
                  onBlur={() => setFocusIdx((f) => (f === i ? -1 : f))}
                  onClick={() => select(i)}
                  onKeyDown={listKey}
                >
                  <i className="cst-sw" style={{ background: swatch(type) }} aria-hidden />
                  <span>{n.label}</span>
                  <small className="num">{n.unavailable ? 'indisp.' : fmtCompact(sizeBy === 'tokens' ? n.tokens : n.calls)}</small>
                </button>
              ))}
            </div>
          ) : null,
        )}
      </nav>

      {/* Legend */}
      <section className="cst-legend" data-open={legendOpen || undefined} aria-label="Légende">
        <button type="button" className="cst-legend__toggle" aria-expanded={legendOpen} onClick={() => setLegendOpen((o) => !o)}>
          Légende
          <span className="cst-legend__chev" aria-hidden />
        </button>
        {legendOpen && (
          <div className="cst-legend__body">
            <ul className="cst-legend__types">
              {TYPE_ORDER.filter((t) => (counts.get(t) ?? 0) > 0).map((t) => (
                <li key={t}>
                  <i className="cst-sw" data-type={t} style={{ background: swatch(t) }} aria-hidden />
                  <span>{t === 'governor' ? 'Gouverneur' : TYPE_LABEL[t]}</span>
                  <small className="num">{counts.get(t)}</small>
                </li>
              ))}
            </ul>
            <ul className="cst-legend__keys">
              <li>
                <i className="cst-key cst-key--flow" aria-hidden />
                Flux réel ({windowMin} min){!live && !calm ? ' — immobile (animations coupées)' : ''}
              </li>
              {evParts && evParts.count > 0 && (
                <li>
                  <i className="cst-key cst-key--event" aria-hidden />
                  {fmtInt(evParts.count)} événements · loin du cœur = plus ancien
                </li>
              )}
              {showLinks && (
                <li>
                  <i className="cst-key cst-key--link" aria-hidden />
                  Relation du catalogue
                </li>
              )}
              <li>
                <i className="cst-key cst-key--err" aria-hidden />
                En erreur
              </li>
            </ul>
            <p className="cst-legend__note">
              Taille = {unit} sur {period}.{dustOn ? ' Traînées de fond décoratives, sans donnée.' : ''}
              {!mobile && (
                <>
                  <br />
                  Glisser : tourner · molette : zoom · double-clic : recentrer
                </>
              )}
            </p>
          </div>
        )}
      </section>

      {/* Tooltip (hover / keyboard focus) or pinned card (touch) */}
      {tipNode && (
        <div
          ref={tipRef}
          className="cst-tip"
          data-pinned={(pinned >= 0 && mobile) || undefined}
          aria-hidden={pinned >= 0 && mobile ? undefined : true}
          role={pinned >= 0 && mobile ? 'dialog' : undefined}
          aria-label={pinned >= 0 && mobile ? tipNode.label : undefined}
        >
          <div className="cst-tip__head">
            <i className="cst-sw" style={{ background: tipNode.error && pal ? css(pal.error) : swatch(tipNode.type) }} aria-hidden />
            <b>{tipNode.label}</b>
            {pinned >= 0 && mobile && (
              <button type="button" className="icon-btn cst-ib cst-tip__close" aria-label="Fermer la fiche" onClick={() => setPinned(-1)}>
                <IconClose size={14} />
              </button>
            )}
          </div>
          <div className="cst-tip__sub">
            {tipNode.type === 'governor' ? 'Gouverneur' : tipNode.type === 'task' ? 'Tâche' : TYPE_LABEL[tipNode.type]} · {tipNode.sub}
          </div>
          {tipNode.status && <StatusPill status={tipNode.status} />}
          {tipNode.taskStatus && <span className="cst-tip__chip" data-s={tipNode.taskStatus}>{TASK_STATUS_LABEL[tipNode.taskStatus]}</span>}
          <dl className="cst-tip__kv">
            <dt>{tipNode.type === 'task' ? 'Consommation' : `Activité · ${period}`}</dt>
            <dd>
              {tipNode.unavailable ? (
                <>Indisponible : {tipNode.unavailable}</>
              ) : (
                <>
                  <span className="num">{fmtInt(tipNode.calls)}</span> appels
                  {tipNode.tokens > 0 && (
                    <>
                      {' '}· <span className="num">{fmtCompact(tipNode.tokens)}</span> tokens
                    </>
                  )}
                </>
              )}{' '}
              <NatureBadge nature={tipNode.nature} />
            </dd>
            {tipNode.type !== 'task' && (
              <>
                <dt>Flux · {windowMin} min</dt>
                <dd>
                  {tipFlows ? (
                    <>
                      <span className="num">{tipFlows.out}</span> sortants · <span className="num">{tipFlows.in}</span> entrants
                      {tipFlows.failed > 0 && <span className="cst-tip__err"> · {tipFlows.failed} en échec</span>}
                    </>
                  ) : (
                    'Aucun'
                  )}
                </dd>
              </>
            )}
            {tipNode.related && tipNode.related.length > 0 && (
              <>
                <dt>{tipNode.type === 'department' ? 'Moteurs' : 'Départements'}</dt>
                <dd>{tipNode.related.join(', ')}</dd>
              </>
            )}
          </dl>
          {tipNode.reason && <p className="cst-tip__err">{tipNode.reason}</p>}
          {pinned >= 0 && mobile ? (
            <button type="button" className="btn btn--primary btn--sm cst-tip__open" onClick={() => select(pinned)}>
              Ouvrir dans l’inspecteur
            </button>
          ) : (
            <p className="cst-tip__hint">{focusIdx === tip && hover < 0 ? 'Entrée : ouvrir dans l’inspecteur' : 'Clic : inspecteur · double-clic : recentrer'}</p>
          )}
        </div>
      )}
    </div>
  );
}
