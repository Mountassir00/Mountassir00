/**
 * Bureau 3D — the shared spatial layout shown as a CLOSED office room
 * (walls, windows, office lighting; day in light themes, evening in dark),
 * with a low cinematic camera and no IDE panels.
 *
 *  - robots = LLM agents, consoles = scripts, drones = services, the human at desk 01;
 *    the ONLY driver of their pose is state.agents[id].status; robots stand at the
 *    station of their task's department, in the lounge when idle, else at home
 *  - glowing tubes = real flows of the last minutes
 *  - left click: object card (glass) · right click / long press / Menu key: radial menu
 *  - Tab: accessible list of every object (Enter opens its radial menu)
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as RKeyboardEvent } from 'react';
import { IconDecision, IconEye, IconEyeOff, IconFit, IconInfo, IconMoon, IconPause, IconPlay, IconSun, NatureBadge, Segmented } from '@ds';
import {
  Anchored, FlowNetwork, SceneLabels, THREE, ThreeStage, bakeStatic, buildSpatialScene, createConsole, createDrone, createPerson, createRobot, hueColor, markStatic,
  reconcileLayout, routeBetween, setDeviceStatus, setRobotStatus, useScenePalette, useSpatialLayout,
  type Device, type FlowTubeSpec, type PickSelection, type Robot, type SceneLabel, type ScenePalette, type SpatialLayout, type SpatialPrimitive,
  type SpatialScene, type Stage3D,
} from '@ds/three';
import { STATUS_LABEL, recentFlows, useGovernor, type AgentDef, type AgentStatus, type Command, type ExperienceProps } from '@sdk';
import { drawAudit, drawKanban } from './boards';
import { KIND_LABEL, auditData, flowPairs, kanbanData, placement, statusOf, aggregateStatus, type PlacementReason } from './data';
import { ObjectCard, describeTarget } from './ObjectCard';
import { RadialMenu, type RadialAction } from './RadialMenu';
import { buildShell, setClock, type Ambiance, type Shell } from './shell';
import './office-3d.css';

type V3 = InstanceType<typeof THREE.Vector3>;
type G = InstanceType<typeof THREE.Group>;

type CamPreset = 'cinematic' | 'iso' | 'top';
const CAMS: Record<CamPreset, { azimuth: number; polar: number; dist: number; label: string }> = {
  cinematic: { azimuth: 34, polar: 61, dist: 0.8, label: 'Cinématique' },
  iso: { azimuth: 40, polar: 50, dist: 0.92, label: '3/4' },
  top: { azimuth: 0, polar: 8, dist: 0.95, label: 'Plan' },
};
const FLOW_COLORS = { llm: '#4f8dff', tools: '#22c3b4', data: '#9b6bff', failed: '#ff5a64' };
const FLOW_WINDOW = 10 * 60_000;
const LOUNGE = ['sofa', 'armchair', 'table'];

interface Figure {
  def: AgentDef;
  kind: 'robot' | 'console' | 'drone' | 'person';
  object: G;
  from: V3;
  to: V3;
  yawFrom: number;
  yawTo: number;
  t0: number;
  dur: number;
  primId: string | null;
  status: AgentStatus;
  scale: number;
}

interface Live {
  scene: SpatialScene;
  figures: Map<string, Figure>;
  flows: FlowNetwork;
  layout: SpatialLayout;
  shell: Shell;
  lounge: Array<{ p: V3; yaw: number }>;
}

const selKey = (s: PickSelection) => `${s.kind}:${s.id}`;
const same = (a: PickSelection | null | undefined, b: PickSelection | null | undefined) => !!a && !!b && a.kind === b.kind && a.id === b.id;

/** Frees glass-board canvases before a rebuild (the kit keeps them tracked otherwise). */
function releaseBoards(stage: Stage3D) {
  stage.root.traverse((o) => {
    const k = o.userData?.textureKey;
    if (typeof k === 'string') stage.kit.untrack(k);
  });
}

/* small icons for the radial menu (drawn for this view) */
const ico = (d: string) => (
  <svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
    <path d={d} />
  </svg>
);
const IcoTasks = () => ico('M3.5 4h4v12h-4ZM8 4h4v8H8ZM12.5 4h4v5h-4Z');
const IcoLayout = () => ico('M3 6.5 10 3l7 3.5-7 3.5ZM3 10.5l7 3.5 7-3.5M13.5 15.5l3-3M16.5 12.5l1 1-3 3H13.5v-1Z');
const IcoList = () => ico('M7 5.5h10M7 10h10M7 14.5h10M3.5 5.5h.1M3.5 10h.1M3.5 14.5h.1');

export default function Office3D({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const { state, catalog, now, selection, mode, hasDemo } = g;
  const { layout } = useSpatialLayout(host);
  const palette = useScenePalette();
  const reconciled = useMemo(() => reconcileLayout(layout, catalog), [layout, catalog]);
  const hasLounge = useMemo(() => reconciled.primitives.some((p) => p.kind === 'sofa' || p.kind === 'armchair'), [reconciled]);

  /* ---------------- settings (Studio defaults, local toggles) ---------------- */
  const cfgAmb = (['auto', 'day', 'evening'] as const).includes(config.ambiance as 'auto') ? (config.ambiance as 'auto' | 'day' | 'evening') : 'auto';
  const cfgCam = (['cinematic', 'iso', 'top'] as const).includes(config.cameraPreset as CamPreset) ? (config.cameraPreset as CamPreset) : 'cinematic';
  const [ambSetting, setAmbSetting] = useState<'auto' | 'day' | 'evening'>(() => host.getLocal('ambiance', cfgAmb));
  const [cam, setCam] = useState<CamPreset>(() => host.getLocal('camera', cfgCam));
  const [showFlows, setShowFlows] = useState<boolean>(() => host.getLocal('showFlows', config.showFlows !== false));
  const [showLabels, setShowLabels] = useState<boolean>(() => host.getLocal('showLabels', config.showLabels !== false));
  const wallHeight = typeof config.wallHeight === 'number' ? config.wallHeight : 2.8;
  const ambiance: Ambiance = ambSetting === 'auto' ? (palette.scheme === 'dark' ? 'evening' : 'day') : ambSetting;
  const persist = <T,>(key: string, set: (v: T) => void) => (v: T) => {
    set(v);
    host.setLocal(key, v);
  };
  const setAmb = persist('ambiance', setAmbSetting);
  const setCamera = persist('camera', setCam);
  const setFlows = persist('showFlows', setShowFlows);
  const setLabels = persist('showLabels', setShowLabels);
  const firstCfg = useRef(true);
  useEffect(() => {
    if (firstCfg.current) {
      firstCfg.current = false;
      return;
    }
    setAmb(cfgAmb);
    setCamera(cfgCam);
    setFlows(config.showFlows !== false);
    setLabels(config.showLabels !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.ambiance, config.cameraPreset, config.showFlows, config.showLabels]);

  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(device === 'mobile');
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const mobile = narrow || device === 'mobile';
  const minimal = quality.level === 'minimal';

  /* ---------------- data ---------------- */
  const winEvents = useMemo(() => g.windowEvents(now - FLOW_WINDOW, now), [g, now]);
  const flows = useMemo(() => recentFlows(winEvents, now, FLOW_WINDOW), [winEvents, now]);
  const kanban = useMemo(() => kanbanData(state, catalog, now), [state, catalog, now]);
  const audit = useMemo(() => auditData(state), [state]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const boardData = useRef({ kanban, audit });
  boardData.current = { kanban, audit };
  const placements = useMemo(() => {
    const m = new Map<string, { dept?: string; reason: PlacementReason }>();
    for (const a of catalog.agents) if (a.kind === 'llm') m.set(a.id, placement(state, a, hasLounge));
    return m;
  }, [state, catalog, hasLounge]);
  const placeOf = useCallback((id: string) => {
    const p = placements.get(id);
    if (p) return p;
    const a = catalog.agents.find((x) => x.id === id);
    return a ? { dept: a.departmentIds[0], reason: 'home' as const } : undefined;
  }, [placements, catalog]);

  /* ---------------- stage / build ---------------- */
  const [stage, setStage] = useState<Stage3D | null>(null);
  const live = useRef<Live | null>(null);
  const [buildVersion, setBuildVersion] = useState(0);
  const framed = useRef(false);
  const tier = quality.level === 'high' ? 'h' : quality.level === 'standard' ? 's' : 'l';

  useEffect(() => {
    if (!stage) return;
    stage.setPalette(palette);
    releaseBoards(stage);
    stage.clearContent();
    live.current?.flows.dispose();
    const kit = stage.kit;
    const texW = tier === 'h' ? 448 : tier === 's' ? 384 : 256;
    const sceneLayout: SpatialLayout = { ...reconciled, room: { ...reconciled.room, walls: 'none' } };
    const scene = buildSpatialScene(stage, sceneLayout, {
      catalog,
      simplified: minimal,
      outline: false,
      boardTextureWidth: texW,
      drawBoard: (prim: SpatialPrimitive, ctx, w, h, pal: ScenePalette) => {
        const d = boardData.current;
        if (prim.kind === 'kanban') drawKanban(ctx, w, h, pal, d.kanban);
        else drawAudit(ctx, w, h, pal, d.audit, prim.name);
      },
    });
    // lounge spots (sofa / armchair / table), nearest the seats first
    const lounge = [...scene.prims.values()].filter((b) => LOUNGE.includes(b.prim.kind)).flatMap((b) => b.spots.map((s) => ({ p: s.p, yaw: s.yaw })));
    // floor lamps: next to desks and the lounge
    const lamps: Array<[number, number]> = [];
    for (const b of scene.prims.values()) {
      if (b.prim.kind === 'desk') lamps.push([b.world.x + 1.35, b.world.z - 0.9]);
      if (b.prim.kind === 'sofa') lamps.push([b.world.x - 1.3, b.world.z + 0.2]);
    }
    const shell = buildShell(stage, { width: reconciled.room.width, depth: reconciled.room.depth, height: wallHeight, ambiance, detail: !minimal, lamps: lamps.slice(0, 4) });
    stage.root.add(shell.group);
    setClock(shell.clock, now);

    const rs = 1.12;
    const figures = new Map<string, Figure>();
    const fixed = new THREE.Group();
    fixed.name = 'fixed-devices';
    const used = new Map<string, number>();
    for (const def of catalog.agents) {
      const color = hueColor(def.avatar.hue);
      let object: G;
      let kind: Figure['kind'];
      if (def.kind === 'llm') {
        object = createRobot(kit, { color, accessory: def.avatar.accessory, scale: rs });
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
      const fig: Figure = { def, kind, object, from: new THREE.Vector3(), to: new THREE.Vector3(), yawFrom: 0, yawTo: 0, t0: 0, dur: 0, primId: null, status: statusOf(state, def.id), scale: kind === 'robot' ? rs : 1 };
      if (kind !== 'robot') {
        const home = def.departmentIds.map((d) => scene.byDepartment.get(d)).find(Boolean) ?? scene.resolve(def.id);
        if (home) {
          let spot = kind === 'person' && home.seat ? home.seat : home.deviceSpot;
          const n = used.get(home.prim.id) ?? 0;
          if (kind !== 'person') {
            if (n > 0) spot = home.spots[home.spots.length - n] ?? home.deviceSpot;
            used.set(home.prim.id, n + 1);
          }
          object.position.copy(spot.p);
          object.rotation.y = spot.yaw;
          fig.primId = home.prim.id;
          fig.to.copy(spot.p);
          fig.from.copy(spot.p);
        }
        fixed.add(object);
        if (kind === 'person') markStatic(object);
      } else stage.root.add(object);
      stage.picker.add(object, { kind: 'agent', id: def.id }, kind === 'robot' ? 0.02 : 0.06);
      figures.set(def.id, fig);
    }
    bakeStatic(fixed);
    stage.root.add(fixed);
    for (const f of figures.values()) if (f.kind !== 'robot') stage.contact.set(`fig:${f.def.id}`, f.to.x, f.to.z, 0.42);
    const net = new FlowNetwork(kit.palette);
    stage.root.add(net.group);
    live.current = { scene, figures, flows: net, layout: reconciled, shell, lounge };

    // camera: low and cinematic by default; a short dolly-in on first load (high quality only)
    const pz = CAMS[cam];
    const prev = framed.current ? stage.rig.view : null;
    stage.rig.opts.maxPolar = 74;
    stage.rig.setView({ azimuth: pz.azimuth, polar: pz.polar }, true);
    stage.rig.fit(scene.bounds, true);
    const home = { ...stage.rig.view, distance: stage.rig.view.distance * pz.dist * (mobile ? 1.25 : 1), target: [-0.4, 0, scene.bounds.max.z * 0.02] as [number, number, number] };
    stage.rig.setHome(home);
    if (prev) stage.rig.setView(prev, true);
    else if (quality.motion === 'ambient' && !quality.reducedMotion) {
      stage.rig.setView({ ...home, distance: home.distance * 1.3, azimuth: home.azimuth + 16, polar: home.polar - 8 }, true);
      stage.rig.setView(home);
    } else stage.rig.setView(home, true);
    framed.current = true;

    const ease = (k: number) => 1 - Math.pow(1 - k, 3);
    const partnerPos = new THREE.Vector3();
    const off = stage.addAnimator((t) => {
      const L = live.current;
      if (!L) return false;
      const fig = stage.amplitude('figure');
      const ind = stage.amplitude('indicator');
      const nowMs = performance.now();
      let wants = false;
      for (const f of L.figures.values()) {
        if (f.kind === 'person') continue;
        if (f.kind === 'console' || f.kind === 'drone') {
          wants = setDeviceStatus(f.object as Device, f.status, t, { figure: fig, indicator: ind }) || wants;
          continue;
        }
        const k = f.dur > 0 ? Math.min(1, (nowMs - f.t0) / f.dur) : 1;
        if (k < 1) {
          const e = ease(k);
          f.object.position.lerpVectors(f.from, f.to, e);
          f.object.rotation.y = f.yawFrom + (f.yawTo - f.yawFrom) * e;
          wants = true;
        } else {
          f.object.position.copy(f.to);
          f.object.rotation.y = f.yawTo;
        }
        stage.contact.set(`fig:${f.def.id}`, f.object.position.x, f.object.position.z, 0.34 * f.scale);
        const partnerId = f.status === 'collaborating' ? stateRef.current.agents[f.def.id]?.collaboratingWith : undefined;
        const partner = partnerId ? L.figures.get(partnerId) : undefined;
        wants = setRobotStatus(f.object as Robot, f.status, t, { figure: fig, indicator: ind, partner: partner ? partnerPos.copy(partner.object.position) : null }) || wants;
      }
      wants = L.flows.update(t, stage.amplitude('flow')) || wants;
      return wants;
    });
    setBuildVersion((v) => v + 1);
    return () => {
      off();
      net.dispose();
      live.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, reconciled, catalog, minimal, palette, wallHeight, ambiance, tier]);

  /* ---------------- data → scene ---------------- */
  useEffect(() => {
    const L = live.current;
    if (!stage || !L) return;
    let changed = false;
    const occupancy = new Map<string, number>();
    let loungeN = 0;
    for (const f of L.figures.values()) {
      const st = statusOf(state, f.def.id);
      if (st !== f.status) {
        f.status = st;
        changed = true;
      }
      if (f.kind !== 'robot') continue;
      const pl = placements.get(f.def.id);
      let target: V3;
      let yaw: number;
      let primId: string;
      if (pl?.reason === 'lounge' && L.lounge.length) {
        const s = L.lounge[loungeN % L.lounge.length];
        target = s.p.clone();
        if (loungeN >= L.lounge.length) target.x += 0.55 * Math.floor(loungeN / L.lounge.length);
        yaw = s.yaw;
        primId = 'lounge';
        loungeN++;
      } else {
        const prim = (pl?.dept ? L.scene.byDepartment.get(pl.dept) : undefined) ?? L.scene.resolve(f.def.id);
        if (!prim) continue;
        const n = occupancy.get(prim.prim.id) ?? 0;
        occupancy.set(prim.prim.id, n + 1);
        const spot = prim.spots[n % prim.spots.length];
        target = spot.p.clone();
        if (n >= prim.spots.length) target.x += 0.5 * Math.floor(n / prim.spots.length);
        yaw = spot.yaw;
        primId = prim.prim.id;
      }
      if (f.primId !== primId || f.to.distanceToSquared(target) > 1e-4) {
        const first = f.primId == null;
        f.from.copy(first ? target : f.object.position);
        f.to.copy(target);
        f.yawFrom = first ? yaw : f.object.rotation.y;
        let y = yaw;
        while (y - f.yawFrom > Math.PI) y -= Math.PI * 2;
        while (y - f.yawFrom < -Math.PI) y += Math.PI * 2;
        f.yawTo = y;
        f.t0 = performance.now();
        f.dur = first || quality.motion === 'none' || quality.reducedMotion ? 0 : 1200;
        f.primId = primId;
        if (first) {
          f.object.position.copy(target);
          f.object.rotation.y = y;
        }
        changed = true;
      }
    }
    // real flows → tubes between stations (a robot in the lounge is drawn from its home station)
    const where = (id: string) => {
      const fig = L.figures.get(id);
      if (fig?.primId && fig.primId !== 'lounge') return fig.primId;
      return L.scene.resolve(id)?.prim.id;
    };
    const pairs = flowPairs(flows, where);
    const specs: FlowTubeSpec[] = [];
    const activeKeys = new Set(pairs.map((p) => p.key));
    for (const p of pairs) {
      const a = L.scene.prims.get(p.from)?.world;
      const b = L.scene.prims.get(p.to)?.world;
      if (!a || !b) continue;
      const color = p.failed > 0 && p.failed >= p.count / 2 ? FLOW_COLORS.failed : p.llm >= p.tools && p.llm >= p.data ? FLOW_COLORS.llm : p.tools >= p.data ? FLOW_COLORS.tools : FLOW_COLORS.data;
      specs.push({ id: p.key, points: routeBetween(a, b, { bend: activeKeys.has(`${p.to}>${p.from}`) ? 0.22 : 0.12 }), color, active: true, level: Math.min(1, 0.35 + Math.log10(1 + p.count) / 1.6) });
    }
    if (L.flows.set(specs)) changed = true;
    L.flows.setVisible(showFlows);
    for (const b of L.scene.prims.values()) b.board?.userData.redraw();
    setClock(L.shell.clock, now);
    if (changed) stage.burst(1600);
    else stage.invalidate();
  }, [stage, buildVersion, state, placements, flows, showFlows, quality.motion, quality.reducedMotion, kanban, audit, now]);

  /* ---------------- camera preset changes ---------------- */
  const firstCam = useRef(true);
  useEffect(() => {
    if (!stage || !live.current) return;
    if (firstCam.current) {
      firstCam.current = false;
      return;
    }
    const pz = CAMS[cam];
    const L = live.current;
    stage.rig.setView({ azimuth: pz.azimuth, polar: pz.polar }, true);
    stage.rig.fit(L.scene.bounds, true);
    const home = { ...stage.rig.view, distance: stage.rig.view.distance * pz.dist * (mobile ? 1.25 : 1), target: [-0.4, 0, L.scene.bounds.max.z * 0.02] as [number, number, number] };
    stage.rig.setHome(home);
    stage.rig.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, cam]);

  /* ---------------- card (local) & halo ---------------- */
  const [card, setCard] = useState<PickSelection | null>(null);
  const [hover, setHover] = useState<PickSelection | null>(null);
  const shellSel = selection && (selection.kind === 'agent' || selection.kind === 'department' || selection.kind === 'node') ? (selection as PickSelection) : null;
  useEffect(() => {
    if (!stage || !live.current) return;
    const sel = card ?? shellSel;
    stage.setHalo('select', sel ? stage.picker.find(sel) : null);
  }, [stage, card, shellSel, buildVersion]);

  const worldOf = useCallback((sel: PickSelection): V3 | null => {
    const L = live.current;
    if (!L) return null;
    if (sel.kind === 'agent') {
      const f = L.figures.get(sel.id);
      return f ? f.object.position.clone().setY(f.kind === 'robot' ? 1.45 * f.scale : 1.3) : null;
    }
    const b = sel.kind === 'department' ? L.scene.byDepartment.get(sel.id) : L.scene.byNode.get(sel.id);
    return b ? b.anchor.clone() : null;
  }, []);
  const focusOn = useCallback((sel: PickSelection) => {
    const w = worldOf(sel);
    if (stage && w) stage.rig.focusOn(w.setY(0.5), { distance: Math.max(7, Math.min(11, stage.rig.distance)) });
  }, [stage, worldOf]);

  /* ---------------- actions (radial menu + card) ---------------- */
  const actionsFor = useCallback((sel: PickSelection): RadialAction[] => {
    const replay = mode === 'replay';
    const out: RadialAction[] = [
      { id: 'inspect', label: 'Inspecter', icon: <IconInfo size={18} />, tone: 'accent', run: () => { host.select(sel); setCard(sel); } },
      { id: 'center', label: 'Centrer la vue', icon: <IconFit size={18} />, run: () => focusOn(sel) },
    ];
    const isQueue = sel.kind === 'node' && sel.id === 'task-queue';
    if (sel.kind !== 'node' || isQueue) {
      out.push({ id: 'tasks', label: isQueue ? 'Ouvrir le Kanban' : 'Voir ses tâches', icon: <IcoTasks />, run: () => { if (!isQueue) host.select(sel); host.openView('kanban'); } });
    }
    if (sel.kind !== 'node') {
      let task = undefined as undefined | { id: string; status: string; title: string };
      let why: string | undefined;
      if (sel.kind === 'agent') {
        const a = catalog.agents.find((x) => x.id === sel.id);
        const rt = state.agents[sel.id];
        const t = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
        if (a?.kind === 'human') why = 'un humain n’a pas de tâche pilotable';
        else if (!t || (t.status !== 'running' && t.status !== 'paused')) why = 'aucune tâche en cours';
        else task = t;
      } else {
        const list = Object.values(state.tasks).filter((t) => t.departmentId === sel.id && (t.status === 'running' || t.status === 'paused'));
        if (!list.length) why = 'aucune tâche en cours';
        else if (list.length > 1) why = `${list.length} tâches en cours : ouvrez le Kanban`;
        else task = list[0];
      }
      if (replay) why = 'Replay : lecture seule';
      const paused = task?.status === 'paused';
      out.push({
        id: 'pause',
        label: paused ? 'Reprendre la tâche' : 'Suspendre la tâche',
        icon: paused ? <IconPlay size={18} /> : <IconPause size={18} />,
        disabled: why,
        tone: 'warn',
        run: (interaction) => {
          if (!task) return;
          const cmd: Command = paused ? { type: 'task.resume', taskId: task.id } : { type: 'task.pause', taskId: task.id };
          void host.request(cmd, interaction);
        },
      });
    }
    out.push({ id: 'decisions', label: 'Ouvrir les décisions', icon: <IconDecision size={18} />, run: () => host.openDecisions() });
    out.push({ id: 'edit', label: 'Éditer la disposition', icon: <IcoLayout />, run: () => host.openView('spatial-editor') });
    return out;
  }, [mode, host, focusOn, catalog, state]);

  /* ---------------- radial menu ---------------- */
  const [radial, setRadial] = useState<{ sel: PickSelection; x: number; y: number; restore: HTMLElement | null } | null>(null);
  const openRadialAt = useCallback((sel: PickSelection, x?: number, y?: number, restore?: HTMLElement | null) => {
    if (!stage) return;
    let px = x;
    let py = y;
    if (px == null || py == null) {
      const w = worldOf(sel);
      if (!w) return;
      const q = stage.project(w.setY(Math.max(0.6, w.y - 0.4)));
      px = q.x;
      py = q.y;
    }
    setRadial({ sel, x: px, y: py, restore: restore ?? (document.activeElement as HTMLElement | null) });
  }, [stage, worldOf]);

  // right click / long press on the canvas (never from a drag: still pointer only)
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !stage) return;
    const canvas = stage.canvas;
    let rdown: { x: number; y: number } | null = null;
    let lp: { id: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null = null;
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const pick = (x: number, y: number) => stage.picker.pick(x, y, stage.size.w, stage.size.h, stage.camera);
    const down = (e: PointerEvent) => {
      if (e.target !== canvas) return;
      const p = local(e);
      if (e.pointerType === 'mouse' && e.button === 2) rdown = p;
      if (e.pointerType === 'touch') {
        if (lp) {
          clearTimeout(lp.timer);
          lp = null;
          return;
        }
        const id = e.pointerId;
        lp = {
          id, x: p.x, y: p.y,
          timer: setTimeout(() => {
            const hit = pick(p.x, p.y);
            lp = null;
            if (hit) openRadialAt(hit.selection, p.x, p.y, canvas);
          }, 600),
        };
      }
    };
    const move = (e: PointerEvent) => {
      if (lp && e.pointerId === lp.id) {
        const p = local(e);
        if (Math.hypot(p.x - lp.x, p.y - lp.y) > 8) {
          clearTimeout(lp.timer);
          lp = null;
        }
      }
    };
    const up = (e: PointerEvent) => {
      if (lp && e.pointerId === lp.id) {
        clearTimeout(lp.timer);
        lp = null;
      }
      if (e.pointerType === 'mouse' && e.button === 2 && rdown) {
        const p = local(e);
        const still = Math.hypot(p.x - rdown.x, p.y - rdown.y) < 5;
        rdown = null;
        if (still) {
          const hit = pick(p.x, p.y);
          if (hit) openRadialAt(hit.selection, p.x, p.y, canvas);
        }
      }
    };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move, true);
    el.addEventListener('pointerup', up, true);
    el.addEventListener('pointercancel', up, true);
    return () => {
      if (lp) clearTimeout(lp.timer);
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move, true);
      el.removeEventListener('pointerup', up, true);
      el.removeEventListener('pointercancel', up, true);
    };
  }, [stage, openRadialAt]);

  // Menu key / Shift+F10 on the canvas or a label
  const onKeyDown = (e: RKeyboardEvent) => {
    if (!(e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey))) return;
    const t = e.target as HTMLElement;
    let sel: PickSelection | null = null;
    const lid = t.closest<HTMLElement>('[data-label-id]')?.dataset.labelId;
    if (lid) sel = labels.find((l) => l.id === lid)?.selection ?? null;
    else if (t.classList.contains('t3-canvas')) sel = card ?? shellSel ?? hover;
    if (!sel) {
      if (t.classList.contains('t3-canvas')) host.announce('Aucun objet ciblé : utilisez la liste des objets (Tab) puis Entrée.');
      return;
    }
    e.preventDefault();
    openRadialAt(sel, undefined, undefined, t);
  };

  /* ---------------- labels ---------------- */
  const labels = useMemo<SceneLabel[]>(() => {
    const L = live.current;
    if (!L || !showLabels) return [];
    const out: SceneLabel[] = [];
    const deptById = new Map(catalog.departments.map((d) => [d.id, d]));
    for (const b of L.scene.prims.values()) {
      const p = b.prim;
      if (p.label === false) continue;
      const sel = p.binding ? ({ kind: p.binding.kind === 'department' ? 'department' : 'node', id: p.binding.id } as PickSelection) : undefined;
      let status: AgentStatus | undefined;
      let count: string | undefined;
      let subtitle = p.subtitle;
      if (p.binding?.kind === 'department') {
        const d = deptById.get(p.binding.id);
        status = aggregateStatus(state, d?.engineIds ?? []);
        const n = Object.values(state.tasks).filter((t) => t.departmentId === p.binding!.id && t.status === 'running').length;
        count = n ? `${n} en cours` : undefined;
        if (!subtitle && d) subtitle = d.mission;
      } else if (p.binding?.id === 'task-queue') {
        status = kanban.columns[1].count ? 'working' : 'idle';
        count = `${kanban.columns[1].count} · ${kanban.columns[0].count} en file`;
      } else if (p.kind === 'models') {
        const calls = flows.filter((f) => f.kind === 'requête modèle').length;
        status = calls ? 'working' : 'idle';
        count = `${calls} appels`;
      }
      out.push({
        id: `prim:${p.id}`, position: b.anchor, title: p.name, subtitle, status, statusLabel: status ? STATUS_LABEL[status] : undefined, count,
        priority: p.kind === 'station' ? (mobile ? 0 : 1) : 2, selection: sel, selected: !!sel && (same(sel, card) || same(sel, shellSel)),
      });
    }
    const agentSel = card?.kind === 'agent' ? card : shellSel?.kind === 'agent' ? shellSel : null;
    if (agentSel && !mobile) {
      const f = L.figures.get(agentSel.id);
      if (f && !card)
        out.push({
          id: `agent:${f.def.id}`, position: () => f.object.position.clone().setY(f.kind === 'robot' ? 1.5 * f.scale : 1.35), title: f.def.name, subtitle: KIND_LABEL[f.def.kind],
          status: f.status, statusLabel: STATUS_LABEL[f.status], priority: 9, selection: { kind: 'agent', id: f.def.id }, selected: true,
        });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildVersion, showLabels, state, catalog, card, shellSel, flows, kanban, mobile]);

  /* ---------------- accessible object list ---------------- */
  const [listOpen, setListOpen] = useState(false);
  const objects = useMemo(() => {
    const L = live.current;
    const out: Array<{ sel: PickSelection; label: string; detail: string; status: AgentStatus | null }> = [];
    for (const a of catalog.agents) {
      const st = a.kind === 'human' ? null : statusOf(state, a.id);
      const pl = placeOf(a.id);
      const where = pl?.reason === 'lounge' ? 'au salon' : `au poste ${catalog.departments.find((d) => d.id === pl?.dept)?.name ?? '—'}`;
      out.push({ sel: { kind: 'agent', id: a.id }, label: a.name, detail: `${KIND_LABEL[a.kind]}${st ? `, ${STATUS_LABEL[st].toLowerCase()}` : ''}, ${where}`, status: st });
    }
    if (L)
      for (const b of L.scene.prims.values()) {
        const p = b.prim;
        if (!p.binding) continue;
        const sel: PickSelection = { kind: p.binding.kind === 'department' ? 'department' : 'node', id: p.binding.id };
        if (out.some((o) => same(o.sel, sel))) continue;
        const d = p.binding.kind === 'department' ? catalog.departments.find((x) => x.id === p.binding!.id) : undefined;
        out.push({ sel, label: p.name, detail: d ? `poste, ${STATUS_LABEL[aggregateStatus(state, d.engineIds)].toLowerCase()}` : 'objet', status: d ? aggregateStatus(state, d.engineIds) : null });
      }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, state, placeOf, buildVersion]);

  /* ---------------- summary & commands ---------------- */
  const robots = useMemo(() => catalog.agents.filter((a) => a.kind === 'llm'), [catalog]);
  const active = catalog.agents.filter((a) => a.kind !== 'human' && !['idle', 'offline', 'paused'].includes(statusOf(state, a.id))).length;
  const summary = useMemo(() => {
    const parts = robots.map((a) => {
      const pl = placements.get(a.id);
      const d = catalog.departments.find((x) => x.id === pl?.dept);
      return `${a.name} (${STATUS_LABEL[statusOf(state, a.id)].toLowerCase()}) ${pl?.reason === 'lounge' ? 'au salon, disponible' : `au poste ${d?.name ?? 'inconnu'}${pl?.reason === 'task' ? ' pour sa tâche en cours' : ''}`}`;
    });
    return `Bureau 3D fermé de ${reconciled.room.width} × ${reconciled.room.depth} m, ambiance ${ambiance === 'day' ? 'de jour' : 'du soir'} : ${reconciled.primitives.length} éléments, ${robots.length} agents IA (robots), ${catalog.agents.filter((a) => a.kind === 'script' || a.kind === 'service').length} scripts et services (consoles et drones). ${parts.join(' ; ')}. ${flows.length} échanges réels sur les 10 dernières minutes. Clic droit, appui long ou touche Menu sur un objet : menu d’actions.`;
  }, [robots, placements, catalog, state, reconciled, flows.length, ambiance]);

  const C = useRef({ setAmb, setFlows, setLabels, ambSetting, showFlows, showLabels });
  C.current = { setAmb, setFlows, setLabels, ambSetting, showFlows, showLabels };
  useEffect(
    () =>
      host.provideCommands([
        { id: 'fit', label: 'Recadrer le bureau', keyword: 'vue:recadrer', run: () => stage?.rig.reset() },
        { id: 'ambiance', label: 'Changer l’ambiance (auto, jour, soir)', keyword: 'vue:ambiance', run: () => C.current.setAmb(C.current.ambSetting === 'auto' ? 'day' : C.current.ambSetting === 'day' ? 'evening' : 'auto') },
        { id: 'flows', label: 'Afficher / masquer les flux', keyword: 'vue:flux', run: () => C.current.setFlows(!C.current.showFlows) },
        { id: 'labels', label: 'Afficher / masquer les étiquettes', keyword: 'vue:étiquettes', run: () => C.current.setLabels(!C.current.showLabels) },
        { id: 'edit', label: 'Éditer la disposition de l’espace', keyword: 'vue:éditer', run: () => host.openView('spatial-editor') },
      ]),
    [host, stage],
  );

  /* ---------------- render ---------------- */
  const cardInfo = card ? describeTarget(card, state, catalog, now, hasDemo, flows, placeOf) : null;
  const hoverInfo = hover && hover.kind === 'agent' && !same(hover, card) ? catalog.agents.find((a) => a.id === hover.id) : undefined;
  const ambIcon = ambiance === 'day' ? <IconSun size={16} /> : <IconMoon size={16} />;
  const ambLabel = ambSetting === 'auto' ? `Auto (${ambiance === 'day' ? 'jour' : 'soir'})` : ambSetting === 'day' ? 'Jour' : 'Soir';

  return (
    <div ref={rootRef} className="o3" data-mobile={mobile || undefined} data-amb={ambiance} onKeyDown={onKeyDown}>
      <ThreeStage
        quality={quality}
        label="Bureau 3D des agents"
        help="Clic : fiche de l’objet. Clic droit, appui long ou touche Menu : menu d’actions. Glisser pour tourner, clic droit glissé ou Maj + glisser pour déplacer, molette pour zoomer. Au clavier : flèches, Maj + flèches, + et −, 0 pour recadrer ; Tab parcourt la liste des objets."
        camera={{ fov: 24, minDistance: 3.5, maxDistance: 60 }}
        onStage={setStage}
        onHover={(hit) => setHover(hit ? hit.selection : null)}
        onClick={(hit) => {
          setRadial(null);
          setCard(hit ? hit.selection : null);
        }}
      >
        {(st) => (
          <>
            <SceneLabels
              stage={st}
              labels={labels}
              farDistance={mobile ? 18 : 26}
              onSelect={(sel) => setCard(sel)}
              avoid={() => (rootRef.current ? [...rootRef.current.querySelectorAll('.o3-avoid')] : [])}
            />
            {hoverInfo && (
              <Anchored stage={st} position={() => worldOf({ kind: 'agent', id: hoverInfo.id }) ?? [0, -40, 0]}>
                <div className="o3-tip" role="tooltip">
                  <i style={{ ['--dot' as string]: `var(--st-${statusOf(state, hoverInfo.id)})` }} aria-hidden />
                  <b>{hoverInfo.name}</b>
                  <span>{hoverInfo.kind === 'human' ? 'Humain' : STATUS_LABEL[statusOf(state, hoverInfo.id)]}</span>
                </div>
              </Anchored>
            )}
            {cardInfo && card && !mobile && (
              <Anchored stage={st} offsetY={18} position={() => worldOf(card) ?? [0, -40, 0]} className="o3-card-anchor">
                <ObjectCard info={cardInfo} actions={actionsFor(card)} onClose={() => setCard(null)} />
              </Anchored>
            )}
          </>
        )}
      </ThreeStage>

      {/* HUD */}
      <div className="o3-hud o3-avoid">
        <div className="o3-title">
          <b>{reconciled.name}</b>
          <span>
            {active} actif{active > 1 ? 's' : ''} · {flows.length} flux / 10 min
          </span>
          <NatureBadge nature={hasDemo ? 'demo' : 'real'} />
        </div>
      </div>
      <div className="o3-controls o3-avoid" role="toolbar" aria-label="Vue du bureau">
        {!mobile && (
          <Segmented
            size="sm"
            label="Caméra"
            value={cam}
            onChange={setCamera}
            options={(Object.keys(CAMS) as CamPreset[]).map((k) => ({ value: k, label: CAMS[k].label }))}
          />
        )}
        <button type="button" className="o3-btn" onClick={() => setAmb(ambSetting === 'auto' ? 'day' : ambSetting === 'day' ? 'evening' : 'auto')} aria-label={`Ambiance : ${ambLabel}. Changer`} title={`Ambiance : ${ambLabel}`}>
          {ambIcon}
          {!mobile && <span>{ambLabel}</span>}
        </button>
        <button type="button" className="o3-btn" aria-pressed={showFlows} onClick={() => setFlows(!showFlows)} aria-label={showFlows ? 'Masquer les flux' : 'Afficher les flux'} title="Flux">
          {showFlows ? <IconEye size={15} /> : <IconEyeOff size={15} />}
          <span>Flux</span>
        </button>
        {!mobile && (
          <button type="button" className="o3-btn" aria-pressed={showLabels} onClick={() => setLabels(!showLabels)} aria-label={showLabels ? 'Masquer les étiquettes' : 'Afficher les étiquettes'} title="Étiquettes">
            {showLabels ? <IconEye size={15} /> : <IconEyeOff size={15} />}
            <span>Étiquettes</span>
          </button>
        )}
        <button type="button" className="o3-btn" onClick={() => stage?.rig.reset()} aria-label="Recadrer (0)" title="Recadrer (0)">
          <IconFit size={15} />
        </button>
        {!mobile && (
          <button type="button" className="o3-btn" onClick={() => host.openView('spatial-editor')} title="Éditer la disposition dans l’éditeur spatial">
            <IcoLayout />
            <span>Éditer</span>
          </button>
        )}
      </div>

      <nav className="o3-objects o3-avoid" data-open={listOpen || undefined} aria-label="Objets de la scène">
        <button type="button" className="o3-objects__toggle" aria-expanded={listOpen} onClick={() => setListOpen((v) => !v)}>
          <IcoList />
          <span>Objets · {objects.length}</span>
        </button>
        <ul className="o3-objects__list">
          {objects.map((o) => (
            <li key={selKey(o.sel)}>
              <button
                type="button"
                aria-label={`${o.label} : ${o.detail}. Entrée : menu d’actions.`}
                aria-current={same(o.sel, card) || undefined}
                onFocus={() => stage?.setHalo('hover', stage.picker.find(o.sel))}
                onBlur={() => stage?.setHalo('hover', null)}
                onKeyDown={(e) => {
                  if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
                    e.preventDefault();
                    e.stopPropagation();
                    openRadialAt(o.sel, undefined, undefined, e.currentTarget);
                  }
                }}
                onClick={(e) => {
                  if (e.detail === 0) openRadialAt(o.sel, undefined, undefined, e.currentTarget);
                  else {
                    setCard(o.sel);
                    focusOn(o.sel);
                  }
                }}
              >
                <i style={{ ['--dot' as string]: o.status ? `var(--st-${o.status})` : 'var(--c-line)' }} aria-hidden />
                <span>{o.label}</span>
                <small>{o.detail}</small>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {!mobile && (
        <div className="o3-legend o3-avoid" aria-hidden>
          <span><i style={{ background: FLOW_COLORS.llm }} />Appels modèle</span>
          <span><i style={{ background: FLOW_COLORS.tools }} />Outils</span>
          <span><i style={{ background: FLOW_COLORS.data }} />Données</span>
          <span className="o3-legend__hint">Clic droit : actions</span>
        </div>
      )}
      {mobile && !card && <p className="o3-mhint o3-avoid">Appui long sur un objet : actions</p>}
      {mode === 'replay' && <div className="o3-replay o3-avoid">Replay : lecture seule</div>}

      {cardInfo && card && mobile && (
        <div className="o3-sheet o3-avoid">
          <ObjectCard info={cardInfo} actions={actionsFor(card)} onClose={() => setCard(null)} sheet />
        </div>
      )}

      {radial && stage && (
        <RadialMenu
          x={radial.x}
          y={radial.y}
          bounds={{ w: stage.size.w, h: stage.size.h }}
          title={describeTarget(radial.sel, state, catalog, now, hasDemo, flows, placeOf)?.title ?? ''}
          actions={actionsFor(radial.sel)}
          restoreFocus={radial.restore}
          onClose={() => setRadial(null)}
        />
      )}
      <p className="sr-only" aria-live="off">
        {summary}
      </p>
    </div>
  );
}
