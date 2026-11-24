/**
 * Center of the spatial workspace: the 3D office built from the shared
 * layout, with robots (LLM agents), consoles (scripts), drones (services),
 * the human at desk 01, real flows as glowing tubes, station labels, an agent
 * hover card and the plan minimap.
 */
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  NatureBadge, PlanMinimap, StatusPill, IconFit, IconEye, IconEyeOff, IconMap, type PlanItem,
} from '@ds';
import {
  Anchored, CAMERA_PRESETS, FlowNetwork, SceneLabels, ThreeStage, bakeStatic, buildSpatialScene, createConsole, createDrone, createPerson, createRobot,
  hueColor, markStatic, reconcileLayout, routeBetween, useScenePalette, setDeviceStatus, setRobotStatus, THREE, worldToPlan,
  type CameraPreset, type Device, type FlowTubeSpec, type PickSelection, type Robot, type SceneLabel, type ScenePalette,
  type SpatialLayout, type SpatialPrimitive, type SpatialScene, type Stage3D,
} from '@ds/three';
import {
  fmtCompact, fmtRelative, modelLabel, recentFlows, STATUS_LABEL, useGovernor, type AgentDef, type AgentStatus, type DeviceClass, type HostApi, type QualitySettings,
} from '@sdk';
import { drawArchitecture, drawKanban, kanbanData, type ArchData, type KanbanData } from './boards';
import { aggregateStatus, CONTEXT_WINDOW, flowPairs, fmtTokens, lastContext, placementDepartment, statusOf } from './data';

type V3 = InstanceType<typeof THREE.Vector3>;

export interface SceneHandle {
  fit: () => void;
  focusAgent: (id: string) => void;
  focusPrimitive: (id: string) => void;
}

interface Figure {
  def: AgentDef;
  kind: 'robot' | 'console' | 'drone' | 'person';
  object: InstanceType<typeof THREE.Group>;
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
  version: number;
}

const FLOW_COLORS = { llm: '#4f8dff', tools: '#22c3b4', data: '#9b6bff', failed: '#ff5a64' };

export function SpatialScene3D({
  host, quality, device, layout, showLabels, showFlows, preset, flowWindowMin, robotScale, simplified, handleRef,
}: {
  host: HostApi;
  quality: QualitySettings;
  device: DeviceClass;
  layout: SpatialLayout;
  showLabels: boolean;
  showFlows: boolean;
  preset: CameraPreset;
  flowWindowMin: number;
  robotScale: number;
  simplified: boolean;
  handleRef: MutableRefObject<SceneHandle | null>;
}) {
  const g = useGovernor();
  const { state, catalog, now, selection } = g;
  const [stage, setStage] = useState<Stage3D | null>(null);
  const live = useRef<Live | null>(null);
  const [buildVersion, setBuildVersion] = useState(0);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const windowMs = flowWindowMin * 60_000;
  const palette = useScenePalette();
  const rs = 1.15 * robotScale;
  const reconciled = useMemo(() => reconcileLayout(layout, catalog), [layout, catalog]);

  /* ---------------- derived data ---------------- */
  const winEvents = useMemo(() => g.windowEvents(now - windowMs, now), [g, now, windowMs]);
  const flows = useMemo(() => recentFlows(winEvents, now, windowMs), [winEvents, now, windowMs]);
  const kanban = useMemo<KanbanData>(() => kanbanData(state, catalog, now), [state, catalog, now]);
  const arch = useMemo<ArchData>(() => {
    const active = new Set(flows.map((f) => `${f.from}>${f.to}`));
    for (const f of flows) {
      // agent → model calls reach the catalog edge agent → model; tasks routed through the queue
      if (f.kind === 'requête modèle') active.add(`${f.from}>${f.to}`);
    }
    const pending = Object.values(state.decisions).filter((d) => d.status === 'pending' && d.departmentId === 'instructions').length;
    const last = Object.values(state.tasks)
      .filter((t) => t.departmentId === 'instructions' && t.endedAt)
      .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))[0];
    return { active, pendingInstructions: pending, lastAudit: last?.endedAt ? fmtRelative(last.endedAt, now) : 'aucun sur la période' };
  }, [flows, state, now]);
  const boardData = useRef({ kanban, arch, catalog });
  boardData.current = { kanban, arch, catalog };

  /* ---------------- build (layout / catalog / detail) ---------------- */
  useEffect(() => {
    if (!stage) return;
    stage.setPalette(palette);
    stage.clearContent();
    live.current?.flows.dispose();
    const kit = stage.kit;
    const texW = quality.level === 'high' ? 448 : quality.level === 'standard' ? 384 : 256;
    const scene = buildSpatialScene(stage, reconciled, {
      catalog,
      simplified,
      boardTextureWidth: texW,
      drawBoard: (prim: SpatialPrimitive, ctx, w, h, palette: ScenePalette) => {
        const d = boardData.current;
        if (prim.kind === 'kanban') drawKanban(ctx, w, h, palette, d.kanban);
        else drawArchitecture(ctx, w, h, palette, d.catalog, d.arch);
      },
    });
    const figures = new Map<string, Figure>();
    const fixed = new THREE.Group();
    fixed.name = 'fixed-devices';
    const usedSpots = new Map<string, number>();
    for (const def of catalog.agents) {
      const color = hueColor(def.avatar.hue);
      let object: InstanceType<typeof THREE.Group>;
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
      // fixed figures: devices at their home station, the human at the desk seat
      if (kind !== 'robot') {
        const home = def.departmentIds.map((d) => scene.byDepartment.get(d)).find(Boolean) ?? scene.resolve(def.id);
        if (home) {
          let spot = kind === 'person' && home.seat ? home.seat : home.deviceSpot;
          const n = usedSpots.get(home.prim.id) ?? 0;
          if (kind !== 'person') {
            if (n > 0) spot = home.spots[home.spots.length - n] ?? home.deviceSpot;
            usedSpots.set(home.prim.id, n + 1);
          }
          object.position.copy(spot.p);
          object.rotation.y = kind === 'person' ? spot.yaw : spot.yaw;
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
    live.current = { scene, figures, flows: net, layout: reconciled, version: Date.now() };

    // camera framing
    const pz = CAMERA_PRESETS[preset];
    stage.rig.setView({ azimuth: pz.azimuth, polar: pz.polar }, true);
    stage.rig.fit(scene.bounds, true);
    // open a little closer than "fit": the hero cluster (desk, boards, models) fills the view
    stage.rig.setView({ distance: stage.rig.view.distance * (simplified ? 0.58 : 0.66), target: [0, 0, scene.bounds.max.z * 0.08] }, true);
    stage.rig.setHome(stage.rig.view);

    const ease = (k: number) => 1 - Math.pow(1 - k, 3);
    const partnerPos = new THREE.Vector3();
    const off = stage.addAnimator((t) => {
      const L = live.current;
      if (!L) return false;
      const fig = stage.amplitude('figure');
      const ind = stage.amplitude('indicator');
      const flow = stage.amplitude('flow');
      const nowMs = performance.now();
      let wants = false;
      for (const f of L.figures.values()) {
        if (f.kind !== 'robot' && f.kind !== 'drone') {
          if (f.kind === 'console') wants = setDeviceStatus(f.object as Device, f.status, t, { figure: fig, indicator: ind }) || wants;
          continue;
        }
        if (f.kind === 'robot') {
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
          const partnerId = f.status === 'collaborating' ? state.agents[f.def.id]?.collaboratingWith : undefined;
          const partner = partnerId ? L.figures.get(partnerId) : undefined;
          wants = setRobotStatus(f.object as Robot, f.status, t, { figure: fig, indicator: ind, partner: partner ? partnerPos.copy(partner.object.position) : null }) || wants;
        } else wants = setDeviceStatus(f.object as Device, f.status, t, { figure: fig, indicator: ind }) || wants;
      }
      wants = L.flows.update(t, flow) || wants;
      return wants;
    });
    setBuildVersion((v) => v + 1);
    return () => {
      off();
      net.dispose();
      live.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, reconciled, catalog, simplified, rs, palette, quality.level === 'high' ? 'h' : quality.level === 'standard' ? 's' : 'l']);

  /* ---------------- data → scene ---------------- */
  const placements = useMemo(() => {
    const m = new Map<string, { dept?: string; reason: 'task' | 'home' }>();
    for (const a of catalog.agents) if (a.kind === 'llm') m.set(a.id, placementDepartment(state, a));
    return m;
  }, [state, catalog]);

  useEffect(() => {
    const L = live.current;
    if (!stage || !L) return;
    let changed = false;
    // robots → station of their current task's department (else home)
    const occupancy = new Map<string, number>();
    for (const f of L.figures.values()) {
      const st = statusOf(state, f.def.id);
      if (st !== f.status) {
        f.status = st;
        changed = true;
      }
      if (f.kind !== 'robot') continue;
      const pl = placements.get(f.def.id);
      const prim = (pl?.dept ? L.scene.byDepartment.get(pl.dept) : undefined) ?? L.scene.resolve(f.def.id);
      if (!prim) continue;
      const n = occupancy.get(prim.prim.id) ?? 0;
      occupancy.set(prim.prim.id, n + 1);
      const spot = prim.spots[n % prim.spots.length];
      const target = spot.p.clone();
      if (n >= prim.spots.length) target.x += 0.5 * Math.floor(n / prim.spots.length);
      if (f.primId !== prim.prim.id || f.to.distanceToSquared(target) > 1e-4) {
        const first = f.primId == null;
        f.from.copy(first ? target : f.object.position);
        f.to.copy(target);
        f.yawFrom = first ? spot.yaw : f.object.rotation.y;
        let yaw = spot.yaw;
        while (yaw - f.yawFrom > Math.PI) yaw -= Math.PI * 2;
        while (yaw - f.yawFrom < -Math.PI) yaw += Math.PI * 2;
        f.yawTo = yaw;
        f.t0 = performance.now();
        f.dur = first || quality.motion === 'none' || quality.reducedMotion ? 0 : 1100;
        f.primId = prim.prim.id;
        if (first) {
          f.object.position.copy(target);
          f.object.rotation.y = yaw;
        }
        changed = true;
      }
    }
    // flows → tubes between stations
    const where = (id: string) => {
      const fig = L.figures.get(id);
      if (fig?.primId) return fig.primId;
      return L.scene.resolve(id)?.prim.id;
    };
    const pairs = flowPairs(flows, where);
    const specs: FlowTubeSpec[] = [];
    const activeKeys = new Set(pairs.map((p) => p.key));
    const center = (id: string) => L.scene.prims.get(id)?.world;
    for (const p of pairs) {
      const a = center(p.from);
      const b = center(p.to);
      if (!a || !b) continue;
      const color = p.failed > 0 && p.failed >= p.count / 2 ? FLOW_COLORS.failed : p.llm >= p.tools && p.llm >= p.data ? FLOW_COLORS.llm : p.tools >= p.data ? FLOW_COLORS.tools : FLOW_COLORS.data;
      specs.push({ id: p.key, points: routeBetween(a, b, { bend: activeKeys.has(`${p.to}>${p.from}`) ? 0.22 : 0.12 }), color, active: true, level: Math.min(1, 0.35 + Math.log10(1 + p.count) / 1.6) });
    }
    if (!simplified) {
      // idle "pipes": catalog edges between stations without flows in the window
      const seen = new Set<string>();
      for (const e of catalog.edges) {
        const a = where(e.from);
        const b = where(e.to);
        if (!a || !b || a === b) continue;
        const k = `${a}>${b}`;
        const kr = `${b}>${a}`;
        if (activeKeys.has(k) || activeKeys.has(kr) || seen.has(k) || seen.has(kr)) continue;
        seen.add(k);
        const pa = center(a);
        const pb = center(b);
        if (pa && pb) specs.push({ id: `idle:${k}`, points: routeBetween(pa, pb, { bend: 0.1 }), color: '#8fa6c8', active: false, level: 0.3 });
      }
    }
    // New flows only need a redraw: a burst (figures moving at eco) is reserved for status changes.
    L.flows.set(specs);
    L.flows.setVisible(showFlows);
    // boards
    for (const b of L.scene.prims.values()) b.board?.userData.redraw();
    if (changed) stage.burst(1600);
    else stage.invalidate();
  }, [stage, buildVersion, state, placements, flows, showFlows, simplified, catalog, quality.motion, quality.reducedMotion, kanban, arch]);

  /* ---------------- selection halo ---------------- */
  useEffect(() => {
    if (!stage || !live.current) return;
    const sel = selection && (selection.kind === 'agent' || selection.kind === 'department' || selection.kind === 'node') ? (selection as PickSelection) : null;
    stage.setHalo('select', sel ? stage.picker.find(sel) : null);
  }, [stage, selection, buildVersion]);

  /* ---------------- camera preset ---------------- */
  const firstPreset = useRef(true);
  useEffect(() => {
    if (!stage || !live.current) return;
    if (firstPreset.current) {
      firstPreset.current = false;
      return;
    }
    const pz = CAMERA_PRESETS[preset];
    stage.rig.setView({ azimuth: pz.azimuth, polar: pz.polar });
    stage.rig.setHome({ ...stage.rig.view, azimuth: pz.azimuth, polar: pz.polar });
  }, [stage, preset]);

  /* ---------------- imperative handle ---------------- */
  useEffect(() => {
    handleRef.current = {
      fit: () => {
        const L = live.current;
        if (stage && L) stage.rig.fit(L.scene.bounds);
      },
      focusAgent: (id) => {
        const f = live.current?.figures.get(id);
        if (stage && f) stage.rig.focusOn(f.to.clone().setY(0.6), { distance: 9 });
      },
      focusPrimitive: (id) => {
        const b = live.current?.scene.prims.get(id) ?? live.current?.scene.byDepartment.get(id) ?? live.current?.scene.byNode.get(id);
        if (stage && b) stage.rig.focusOn(b.world.clone(), { distance: 10 });
      },
    };
  }, [stage, handleRef]);

  /* ---------------- minimap view box (throttled) ---------------- */
  useEffect(() => {
    if (!stage) return;
    let last = '';
    let lastAt = 0;
    return stage.onFrame(() => {
      const nowMs = performance.now();
      if (nowMs - lastAt < 180) return;
      lastAt = nowMs;
      const L = live.current;
      if (!L) return;
      const t = worldToPlan(L.layout, stage.rig.target);
      const d = stage.rig.distance;
      const v = { x: Math.round((t.x - d * 0.45) * 2) / 2, y: Math.round((t.y - d * 0.3) * 2) / 2, w: Math.round(d * 0.9 * 2) / 2, h: Math.round(d * 0.6 * 2) / 2 };
      const k = `${v.x}:${v.y}:${v.w}:${v.h}`;
      if (k !== last) {
        last = k;
        setView(v);
      }
    });
  }, [stage]);

  /* ---------------- labels ---------------- */
  const labels = useMemo<SceneLabel[]>(() => {
    const L = live.current;
    if (!L || !showLabels) return [];
    const out: SceneLabel[] = [];
    const deptById = new Map(catalog.departments.map((d) => [d.id, d]));
    const running = (dept: string) => Object.values(state.tasks).filter((t) => t.departmentId === dept && t.status === 'running').length;
    for (const b of L.scene.prims.values()) {
      const p = b.prim;
      if (p.label === false) continue;
      const featured = p.kind !== 'station';
      const sel = p.binding ? ({ kind: p.binding.kind === 'department' ? 'department' : 'node', id: p.binding.id } as PickSelection) : undefined;
      const selected = !!sel && selection?.kind === sel.kind && selection.id === sel.id;
      let status: AgentStatus | undefined;
      let count: string | undefined;
      let subtitle = p.subtitle;
      if (p.binding?.kind === 'department') {
        const d = deptById.get(p.binding.id);
        const engines = d?.engineIds ?? [];
        status = aggregateStatus(state, engines);
        const n = running(p.binding.id);
        count = n ? `${n} en cours` : undefined;
        if (!subtitle && d) subtitle = engines.map((id) => catalog.agents.find((a) => a.id === id)?.name).filter(Boolean).join(' · ');
        if (!d) subtitle = 'Liaison introuvable dans le catalogue';
      } else if (p.binding?.id === 'task-queue') {
        const tasks = Object.values(state.tasks);
        const waiting = tasks.filter((t) => t.status === 'pending').length;
        const run = tasks.filter((t) => t.status === 'running').length;
        status = run ? 'working' : 'idle';
        count = `${run} · ${waiting} en file`;
      } else if (p.kind === 'models') {
        const calls = flows.filter((f) => f.kind === 'requête modèle').length;
        status = calls ? 'working' : 'idle';
        count = `${calls} appels`;
      }
      if (p.kind === 'vault') count = `${fmtCompact(state.eventCount)} évén.`;
      out.push({
        id: `prim:${p.id}`,
        position: b.anchor,
        title: p.name,
        subtitle,
        status,
        statusLabel: status ? STATUS_LABEL[status] : undefined,
        count,
        priority: simplified ? (featured ? 2 : 0) : featured ? 2 : 1,
        selection: sel,
        selected,
      });
    }
    // pinned label above the selected agent
    if (selection?.kind === 'agent') {
      const f = L.figures.get(selection.id);
      if (f)
        out.push({
          id: `agent:${f.def.id}`,
          position: () => f.object.position.clone().setY(f.kind === 'robot' ? 1.45 * f.scale : 1.35),
          title: f.def.name,
          subtitle: f.def.kind === 'llm' ? modelLabel(state.agents[f.def.id]?.model ?? f.def.model) : f.def.kind === 'human' ? 'Humain' : f.def.kind === 'script' ? 'Script déterministe' : 'Service',
          status: f.status,
          statusLabel: STATUS_LABEL[f.status],
          priority: 9,
          selection: { kind: 'agent', id: f.def.id },
          selected: true,
        });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildVersion, showLabels, state, catalog, selection, flows, simplified]);

  /* ---------------- minimap ---------------- */
  const plan = useMemo(() => {
    const L = live.current;
    const items: PlanItem[] = [{ id: 'room', kind: 'room', x: 0, y: 0, w: reconciled.room.width, h: reconciled.room.depth }];
    for (const p of reconciled.primitives) {
      if (p.kind === 'plant' || p.kind === 'table') continue;
      const fp = L?.scene.prims.get(p.id)?.footprint ?? { w: 1.2, d: 1.2 };
      items.push({ id: p.id, kind: 'object', x: p.position.x, y: p.position.y, w: Math.min(3.4, fp.w), h: Math.min(2.2, fp.d), label: p.name });
    }
    if (L)
      for (const f of L.figures.values()) {
        if (f.kind !== 'robot' && f.kind !== 'person') continue;
        const pp = worldToPlan(reconciled, f.to);
        items.push({ id: `ag:${f.def.id}`, kind: 'agent', x: pp.x, y: pp.y, color: `var(--st-${f.status})`, label: f.def.name });
      }
    else {
      // no 3D scene (WebGL unavailable): place dots from the layout itself
      const perPrim = new Map<string, number>();
      for (const a of catalog.agents) {
        if (a.kind !== 'llm' && a.kind !== 'human') continue;
        const dept = a.kind === 'llm' ? placements.get(a.id)?.dept : a.departmentIds[0];
        const prim = reconciled.primitives.find((p) => p.binding?.kind === 'department' && p.binding.id === dept);
        if (!prim) continue;
        const n = perPrim.get(prim.id) ?? 0;
        perPrim.set(prim.id, n + 1);
        items.push({ id: `ag:${a.id}`, kind: 'agent', x: prim.position.x + 0.9 * (n % 2 ? -1 : 1), y: prim.position.y + 0.9 + 0.5 * Math.floor(n / 2), color: `var(--st-${statusOf(state, a.id)})`, label: a.name });
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconciled, buildVersion, placements, state]);

  /* ---------------- hover card ---------------- */
  const hoverFig = hover ? live.current?.figures.get(hover) : undefined;
  const hoverIsLlm = hover ? catalog.agents.find((a) => a.id === hover)?.kind === 'llm' : false;
  const hoverCtx = useMemo(() => (hover && hoverIsLlm ? lastContext(g.allEvents(), hover, now) : null), [hover, hoverIsLlm, g, now]);
  const hoverTask = hover ? state.tasks[state.agents[hover]?.currentTaskId ?? ''] : undefined;

  const robots = catalog.agents.filter((a) => a.kind === 'llm');
  const devices = catalog.agents.filter((a) => a.kind === 'script' || a.kind === 'service');
  const summary = useMemo(() => {
    const parts = robots.map((a) => {
      const pl = placements.get(a.id);
      const d = catalog.departments.find((x) => x.id === pl?.dept);
      return `${a.name} (${STATUS_LABEL[statusOf(state, a.id)].toLowerCase()}) au poste ${d?.name ?? 'inconnu'}${pl?.reason === 'task' ? ' pour sa tâche en cours' : ''}`;
    });
    return `Bureau 3D de ${reconciled.room.width} × ${reconciled.room.depth} m : ${reconciled.primitives.length} éléments, ${robots.length} agents IA représentés par des robots, ${devices.length} scripts et services représentés par des consoles et des drones. ${parts.join(' ; ')}. ${flows.length} échanges réels sur les ${flowWindowMin} dernières minutes.`;
  }, [robots, devices, placements, catalog, state, reconciled, flows.length, flowWindowMin]);

  const pickPlan = (id: string) => {
    if (id.startsWith('ag:')) {
      const aid = id.slice(3);
      host.select({ kind: 'agent', id: aid });
      handleRef.current?.focusAgent(aid);
    } else if (id !== 'room') {
      const p = reconciled.primitives.find((x) => x.id === id);
      handleRef.current?.focusPrimitive(id);
      if (p?.binding) host.select({ kind: p.binding.kind === 'department' ? 'department' : 'node', id: p.binding.id });
    }
  };

  return (
    <div ref={rootRef} className="sw-scene" data-device={device}>
      <ThreeStage
        quality={quality}
        label="Bureau 3D des agents"
        camera={{ fov: 28, minDistance: 3.5, maxDistance: 70 }}
        onStage={setStage}
        onHover={(hit) => setHover(hit?.selection.kind === 'agent' ? hit.selection.id : null)}
        onClick={(hit) => {
          if (hit) host.select(hit.selection);
          else if (selection) host.select(null);
        }}
      >
        {(st) => (
          <>
            <SceneLabels
              stage={st}
              labels={labels}
              farDistance={simplified ? 22 : 34}
              onSelect={(sel) => host.select(sel)}
              avoid={() => {
                const c = rootRef.current?.parentElement;
                return c ? [...c.querySelectorAll('.sw-minimap, .sw-toolbar, .sw-legend, .dock__toggles')] : [];
              }}
            />
            {hoverFig && (
              <Anchored stage={st} position={() => hoverFig.object.position.clone().setY(hoverFig.kind === 'robot' ? 1.4 * hoverFig.scale : 1.3)}>
                <div className="sw-card" role="tooltip">
                  <div className="sw-card__head">
                    <i className="sw-dot" style={{ ['--dot' as string]: `var(--st-${hoverFig.status})` }} aria-hidden />
                    <b>{hoverFig.def.name}</b>
                    <span className="t-muted">{hoverFig.def.kind === 'llm' ? modelLabel(state.agents[hoverFig.def.id]?.model ?? hoverFig.def.model) : hoverFig.def.kind === 'human' ? 'Humain' : hoverFig.def.kind === 'script' ? 'Script' : 'Service'}</span>
                  </div>
                  <dl className="sw-card__kv">
                    <dt>Agent</dt>
                    <dd>{hoverFig.def.role}</dd>
                    <dt>Tâche en cours</dt>
                    <dd>{hoverTask ? hoverTask.title : 'Aucune'}</dd>
                    <dt>Contexte</dt>
                    <dd>
                      {hoverFig.def.kind !== 'llm' ? (
                        <span className="t-muted">Sans objet (pas un modèle de langage)</span>
                      ) : hoverCtx?.tokens != null ? (
                        <span className="sw-ctx">
                          {fmtTokens(hoverCtx.tokens)} / {fmtTokens(CONTEXT_WINDOW)} ({((hoverCtx.ratio ?? 0) * 100).toFixed(1).replace('.', ',')} %)
                          <NatureBadge nature={hoverCtx.nature} />
                        </span>
                      ) : (
                        <span className="sw-ctx">
                          Indisponible <NatureBadge nature="unavailable" />
                        </span>
                      )}
                    </dd>
                    <dt>Statut</dt>
                    <dd>
                      <StatusPill status={hoverFig.status} />
                    </dd>
                  </dl>
                </div>
              </Anchored>
            )}
          </>
        )}
      </ThreeStage>
      <p className="sr-only" aria-live="off">
        {summary}
      </p>
      {!simplified && (
        <div className="sw-minimap">
          <PlanMinimap
            items={plan}
            bounds={{ x: 0, y: 0, w: reconciled.room.width, h: reconciled.room.depth }}
            title="Plan de l’espace"
            view={view}
            onPick={pickPlan}
            footer={
              <>
                <span>{robots.filter((a) => !['idle', 'offline'].includes(statusOf(state, a.id))).length} agents actifs</span>
                <span>{flows.length} flux · {flowWindowMin} min</span>
              </>
            }
          />
        </div>
      )}
      <div className="sw-legend" aria-hidden={simplified || undefined}>
        <span><i style={{ background: FLOW_COLORS.llm }} />Appels modèle</span>
        <span><i style={{ background: FLOW_COLORS.tools }} />Outils</span>
        <span><i style={{ background: FLOW_COLORS.data }} />Données</span>
        <NatureBadge nature={g.hasDemo ? 'demo' : 'real'} />
      </div>
    </div>
  );
}

export function SceneToolbar({ preset, setPreset, showFlows, setShowFlows, showLabels, setShowLabels, onFit }: {
  preset: CameraPreset;
  setPreset: (p: CameraPreset) => void;
  showFlows: boolean;
  setShowFlows: (v: boolean) => void;
  showLabels: boolean;
  setShowLabels: (v: boolean) => void;
  onFit: () => void;
}) {
  return (
    <div className="sw-toolbar" role="toolbar" aria-label="Vue 3D">
      <button type="button" className="sw-tool" onClick={onFit} aria-label="Recadrer la vue" title="Recadrer la vue (0)">
        <IconFit size={16} />
      </button>
      <button type="button" className="sw-tool" aria-pressed={preset === 'top'} onClick={() => setPreset(preset === 'top' ? 'iso' : 'top')} aria-label={preset === 'top' ? 'Vue 3/4' : 'Vue en plan'} title={preset === 'top' ? 'Vue 3/4' : 'Vue en plan'}>
        <IconMap size={16} />
      </button>
      <button type="button" className="sw-tool sw-tool--text" aria-pressed={showFlows} onClick={() => setShowFlows(!showFlows)} aria-label={showFlows ? 'Masquer les flux' : 'Afficher les flux'}>
        {showFlows ? <IconEye size={15} /> : <IconEyeOff size={15} />}
        <span>Flux</span>
      </button>
      <button type="button" className="sw-tool sw-tool--text" aria-pressed={showLabels} onClick={() => setShowLabels(!showLabels)} aria-label={showLabels ? 'Masquer les étiquettes' : 'Afficher les étiquettes'}>
        {showLabels ? <IconEye size={15} /> : <IconEyeOff size={15} />}
        <span>Étiquettes</span>
      </button>
    </div>
  );
}

