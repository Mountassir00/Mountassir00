/**
 * 3D canvas of the spatial editor.
 *
 * Built with `bake: false` (each primitive stays its own group, then is baked
 * on its own so it can still move as one piece). Desktop pointer gestures:
 *  - tool "Déplacer": drag an element on the floor (grid snapping, kept inside the room)
 *  - tool "Pivoter": drag an element to turn it around its centre (15° steps, Maj = 1°)
 *  - the round handle in front of the selection turns it with every tool
 *  - tool "Sélection": drags only move the camera (no accidental edit)
 * A gesture only changes the DRAFT, on release; nothing is ever published from here.
 */
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { PlanMinimap, type PlanItem } from '@ds';
import {
  Anchored, CAMERA_PRESETS, SceneLabels, THREE, ThreeStage, bakeStatic, buildSpatialScene, planToWorld, useScenePalette, worldToPlan,
  type SceneLabel, type ScenePalette, type SpatialLayout, type SpatialPrimitive, type SpatialScene, type Stage3D,
} from '@ds/three';
import type { Catalog, QualitySettings } from '@sdk';
import { DEG, bindingLabel, clampToRoom, corners, fmtM, footprint, normDeg, overlapDepth, round2, snapValue } from './model';

type V3 = InstanceType<typeof THREE.Vector3>;
type MeshT = InstanceType<typeof THREE.Mesh>;
type MatT = InstanceType<typeof THREE.MeshBasicMaterial>;

export type Tool = 'select' | 'move' | 'rotate';
export type ViewPreset = 'iso' | 'top';

export interface EditorSceneHandle {
  fit: () => void;
  focus: (id: string) => void;
  /** Plan point at the centre of the view (where new elements go). */
  viewCenter: () => { x: number; y: number } | null;
  /** Plan point under client coordinates (drop from the library). */
  planAt: (clientX: number, clientY: number) => { x: number; y: number } | null;
  /** Plan direction (unit, axis-aligned) for a screen arrow, relative to the camera. */
  arrowToPlan: (key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') => { dx: number; dy: number };
}

export interface CommitMove {
  id: string;
  x: number;
  y: number;
  rotZ: number;
}

interface Gizmo {
  group: InstanceType<typeof THREE.Group>;
  sel: InstanceType<typeof THREE.Group>;
  selEdges: MeshT[];
  handle: MeshT;
  handleProxy: MeshT;
  stem: MeshT;
  flags: Map<string, { group: InstanceType<typeof THREE.Group>; edges: MeshT[] }>;
  accent: MatT;
  danger: MatT;
}

interface Live {
  scene: SpatialScene;
  layout: SpatialLayout;
  anchors: Map<string, V3>;
  giz: Gizmo;
}

interface Drag {
  id: string;
  mode: 'move' | 'rotate' | 'handle';
  pointerId: number;
  sx: number;
  sy: number;
  moved: boolean;
  startFloor: V3 | null;
  startPos: { x: number; y: number };
  startRot: number;
  ang0: number;
  cur: { x: number; y: number; rotZ: number };
  clamped: boolean;
  overlap: boolean;
}

/** Frees the CanvasTextures of glass boards before a rebuild (the kit keeps them tracked otherwise). */
function releaseBoards(stage: Stage3D) {
  stage.root.traverse((o) => {
    const k = o.userData?.textureKey;
    if (typeof k === 'string') stage.kit.untrack(k);
  });
}

/** Schematic content of boards in the editor (the live data is shown by the 3D views). */
function drawSchematic(prim: SpatialPrimitive, ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette) {
  const dark = p.scheme === 'dark';
  ctx.fillStyle = dark ? 'rgba(18,22,30,0.5)' : 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, 10);
  ctx.fill();
  ctx.fillStyle = dark ? '#e9edf6' : '#1c2230';
  ctx.font = `700 ${Math.round(h * 0.11)}px ${p.css.font}`;
  ctx.textBaseline = 'top';
  ctx.fillText(prim.name.slice(0, 26), 10, 8);
  ctx.strokeStyle = dark ? 'rgba(220,226,240,0.35)' : 'rgba(40,50,70,0.28)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  if (prim.kind === 'kanban') {
    const n = 4;
    const top = h * 0.28;
    const cw = (w - 12 - (n - 1) * 6) / n;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.roundRect(6 + i * (cw + 6), top, cw, h - top - 8, 6);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.roundRect(10, h * 0.3, w - 20, h * 0.6, 8);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function edgeMeshes(kit: Stage3D['kit'], mat: MatT, parent: InstanceType<typeof THREE.Group>) {
  const edges: MeshT[] = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(kit.box(1, 1, 1), mat);
    m.renderOrder = 5;
    parent.add(m);
    edges.push(m);
  }
  return edges;
}

/** Lays 4 strips as a w × d rectangle (local XZ), thickness t. */
function layRect(edges: MeshT[], w: number, d: number, t = 0.05) {
  const h = 0.02;
  edges[0].position.set(0, h / 2, -d / 2);
  edges[0].scale.set(w + t, h, t);
  edges[1].position.set(0, h / 2, d / 2);
  edges[1].scale.set(w + t, h, t);
  edges[2].position.set(-w / 2, h / 2, 0);
  edges[2].scale.set(t, h, d);
  edges[3].position.set(w / 2, h / 2, 0);
  edges[3].scale.set(t, h, d);
}

function makeGizmo(stage: Stage3D, pal: ScenePalette): Gizmo {
  const kit = stage.kit;
  const accent = new THREE.MeshBasicMaterial({ color: pal.accent, toneMapped: false, transparent: true, opacity: 0.95, depthTest: false });
  const danger = new THREE.MeshBasicMaterial({ color: pal.status.error, toneMapped: false, transparent: true, opacity: 0.95, depthTest: false });
  accent.userData.owned = true;
  danger.userData.owned = true;
  const group = new THREE.Group();
  group.name = 'editor-gizmo';
  const sel = new THREE.Group();
  sel.visible = false;
  const selEdges = edgeMeshes(kit, accent, sel);
  const handle = new THREE.Mesh(kit.torus(0.17, 0.045, 8, 32), accent);
  handle.rotation.x = Math.PI / 2;
  handle.renderOrder = 6;
  const dot = new THREE.Mesh(kit.sphere(0.07, 12, 8), accent);
  dot.renderOrder = 6;
  handle.add(dot);
  const handleProxy = new THREE.Mesh(kit.sphere(0.36, 10, 8), kit.proxy);
  const stem = new THREE.Mesh(kit.box(1, 1, 1), accent);
  stem.renderOrder = 5;
  sel.add(handle, handleProxy, stem);
  group.add(sel);
  return { group, sel, selEdges, handle, handleProxy, stem, flags: new Map(), accent, danger };
}

export function EditorScene({
  layout, catalog, quality, simplified, selectedId, flagged, tool, snapStep, snapOn, showDims, preset, showLabels, onSelect, onCommit, handleRef, rootRef,
}: {
  layout: SpatialLayout;
  catalog: Catalog;
  quality: QualitySettings;
  simplified: boolean;
  selectedId: string | null;
  flagged: Set<string>;
  tool: Tool;
  snapStep: number;
  snapOn: boolean;
  showDims: boolean;
  preset: ViewPreset;
  showLabels: boolean;
  onSelect: (id: string | null) => void;
  onCommit: (m: CommitMove) => void;
  handleRef: MutableRefObject<EditorSceneHandle | null>;
  /** Overlays labels must avoid. */
  rootRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const [stage, setStage] = useState<Stage3D | null>(null);
  const [version, setVersion] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [view, setView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const live = useRef<Live | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const framed = useRef(false);
  const palette = useScenePalette();
  // latest props for native listeners
  const P = useRef({ selectedId, tool, snapStep, snapOn, onSelect, onCommit, layout, flagged });
  P.current = { selectedId, tool, snapStep, snapOn, onSelect, onCommit, layout, flagged };

  /* ---------------- build ---------------- */
  useEffect(() => {
    if (!stage) return;
    stage.setPalette(palette);
    releaseBoards(stage);
    stage.clearContent();
    const scene = buildSpatialScene(stage, layout, { catalog, bake: false, pickable: false, simplified, boardTextureWidth: 192, drawBoard: drawSchematic, outline: true });
    const anchors = new Map<string, V3>();
    for (const b of scene.prims.values()) {
      // proxy first (real bounds), then merge this element's static meshes into a few draw calls
      stage.picker.add(b.object, { kind: 'node', id: b.prim.id }, 0.1);
      bakeStatic(b.object);
      anchors.set(b.prim.id, b.object.worldToLocal(b.anchor.clone()));
    }
    bakeStatic(scene.room);
    const giz = makeGizmo(stage, palette);
    stage.root.add(giz.group);
    live.current = { scene, layout, anchors, giz };
    if (!framed.current) {
      framed.current = true;
      const pz = CAMERA_PRESETS[preset];
      stage.rig.setView({ azimuth: pz.azimuth, polar: pz.polar }, true);
      stage.rig.fit(scene.bounds, true);
      stage.rig.setView({ distance: stage.rig.view.distance * (simplified ? 0.92 : 0.9) }, true);
      stage.rig.setHome(stage.rig.view);
    }
    setVersion((v) => v + 1);
    stage.invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, layout, catalog, simplified, palette]);

  /* ---------------- gizmo: selection outline, rotation handle, red outlines ---------------- */
  const syncGizmo = () => {
    const L = live.current;
    if (!L || !stage) return;
    const { giz, scene } = L;
    const d = drag.current;
    const selId = P.current.selectedId;
    const b = selId ? scene.prims.get(selId) : undefined;
    if (b) {
      const fp = footprint(b.prim);
      const pad = 0.26;
      giz.sel.visible = true;
      giz.sel.position.set(b.object.position.x, 0.015, b.object.position.z);
      giz.sel.rotation.set(0, b.object.rotation.y, 0);
      layRect(giz.selEdges, fp.w + pad, fp.d + pad, 0.055);
      const hz = (fp.d + pad) / 2 + 0.55;
      giz.handle.position.set(0, 0.03, hz);
      giz.handleProxy.position.set(0, 0.1, hz);
      giz.stem.position.set(0, 0.01, (fp.d + pad) / 2 + 0.2);
      giz.stem.scale.set(0.04, 0.02, 0.4);
      const bad = d?.id === b.prim.id ? d.overlap : P.current.flagged.has(b.prim.id);
      for (const e of giz.selEdges) e.material = bad ? giz.danger : giz.accent;
      giz.handle.visible = giz.stem.visible = !simplified;
    } else giz.sel.visible = false;
    // red outlines on flagged elements (and the dragged one while it overlaps)
    const want = new Set(P.current.flagged);
    if (d) {
      if (d.overlap) want.add(d.id);
      else want.delete(d.id);
    }
    if (selId) want.delete(selId);
    for (const [id, f] of giz.flags) {
      if (!want.has(id)) {
        f.group.removeFromParent();
        giz.flags.delete(id);
      }
    }
    for (const id of want) {
      const pb = scene.prims.get(id);
      if (!pb) continue;
      let f = giz.flags.get(id);
      if (!f) {
        const group = new THREE.Group();
        const edges = edgeMeshes(stage.kit, giz.danger, group);
        giz.group.add(group);
        f = { group, edges };
        giz.flags.set(id, f);
      }
      const fp = footprint(pb.prim);
      f.group.position.set(pb.object.position.x, 0.015, pb.object.position.z);
      f.group.rotation.set(0, pb.object.rotation.y, 0);
      layRect(f.edges, fp.w + 0.12, fp.d + 0.12, 0.045);
    }
    stage.setHalo('select', b ? b.object : null);
    stage.invalidate();
  };
  useEffect(syncGizmo);

  /* ---------------- camera presets ---------------- */
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
  }, [stage, preset, version]);

  /* ---------------- handle ---------------- */
  useEffect(() => {
    handleRef.current = {
      fit: () => {
        const L = live.current;
        if (stage && L) stage.rig.fit(L.scene.bounds);
      },
      focus: (id) => {
        const b = live.current?.scene.prims.get(id);
        if (stage && b) stage.rig.focusOn(b.world.clone(), { distance: Math.max(8, Math.min(14, stage.rig.distance)) });
      },
      viewCenter: () => {
        const L = live.current;
        if (!stage || !L) return null;
        const p = worldToPlan(L.layout, stage.rig.target);
        return { x: p.x, y: p.y };
      },
      planAt: (cx, cy) => {
        const L = live.current;
        if (!stage || !L) return null;
        const r = stage.canvas.getBoundingClientRect();
        const w = stage.rig.floorPoint(cx - r.left, cy - r.top);
        if (!w) return null;
        const p = worldToPlan(L.layout, w);
        return { x: p.x, y: p.y };
      },
      arrowToPlan: (key) => {
        // camera right / forward on the floor (see CameraRig.panBy), snapped to the nearest plan axis
        const az = ((stage?.rig.view.azimuth ?? 0) * Math.PI) / 180;
        const right = { x: Math.cos(az), y: -Math.sin(az) };
        const fwd = { x: -Math.sin(az), y: -Math.cos(az) };
        const v = key === 'ArrowRight' ? right : key === 'ArrowLeft' ? { x: -right.x, y: -right.y } : key === 'ArrowUp' ? fwd : { x: -fwd.x, y: -fwd.y };
        return Math.abs(v.x) >= Math.abs(v.y) ? { dx: Math.sign(v.x), dy: 0 } : { dx: 0, dy: Math.sign(v.y) };
      },
    };
  }, [stage, handleRef]);

  /* ---------------- pointer editing (desktop) ---------------- */
  useEffect(() => {
    const el = wrap.current;
    if (!el || !stage || simplified) return;
    const canvas = stage.canvas;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const hitHandle = (x: number, y: number) => {
      const L = live.current;
      if (!L || !L.giz.sel.visible || !L.giz.handle.visible) return false;
      ndc.set((x / stage.size.w) * 2 - 1, -(y / stage.size.h) * 2 + 1);
      ray.setFromCamera(ndc, stage.camera);
      L.giz.group.updateMatrixWorld(true);
      return ray.intersectObject(L.giz.handleProxy, false).length > 0;
    };
    const showReadout = (d: Drag) => {
      const n = readout.current;
      if (!n) return;
      const warn = d.overlap ? ' · chevauchement' : d.clamped ? ' · bord de la pièce' : '';
      n.textContent = d.mode === 'move' ? `X ${fmtM(d.cur.x)} · Y ${fmtM(d.cur.y)} m${warn}` : `${Math.round(d.cur.rotZ)}°${warn}`;
      n.dataset.warn = String(!!warn);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === 'touch' || e.shiftKey || e.target !== canvas) return;
      const L = live.current;
      if (!L) return;
      const p = local(e);
      let id: string | null = null;
      let mode: Drag['mode'] | null = null;
      const sel = P.current.selectedId;
      if (sel && hitHandle(p.x, p.y)) {
        id = sel;
        mode = 'handle';
      } else {
        const hit = stage.picker.pick(p.x, p.y, stage.size.w, stage.size.h, stage.camera);
        if (!hit) return;
        if (P.current.tool === 'select') return; // the rig turns it into a click (select) or an orbit
        id = hit.selection.id;
        mode = P.current.tool === 'rotate' ? 'rotate' : 'move';
      }
      const b = L.scene.prims.get(id);
      if (!b) return;
      e.stopPropagation();
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      el.setPointerCapture(e.pointerId);
      const f = stage.rig.floorPoint(p.x, p.y);
      const c = b.object.position;
      drag.current = {
        id, mode, pointerId: e.pointerId, sx: p.x, sy: p.y, moved: false, startFloor: f,
        startPos: { x: b.prim.position.x, y: b.prim.position.y }, startRot: b.prim.rotation.z,
        ang0: f ? Math.atan2(f.x - c.x, f.z - c.z) : 0,
        cur: { x: b.prim.position.x, y: b.prim.position.y, rotZ: b.prim.rotation.z }, clamped: false, overlap: false,
      };
    };
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const L = live.current;
      if (!d || !L || e.pointerId !== d.pointerId) return;
      e.stopPropagation();
      const p = local(e);
      if (!d.moved) {
        if (Math.hypot(p.x - d.sx, p.y - d.sy) < 4) return;
        d.moved = true;
        P.current.onSelect(d.id);
        setDragging(true);
      }
      const b = L.scene.prims.get(d.id);
      const f = stage.rig.floorPoint(p.x, p.y);
      if (!b || !f) return;
      const prim = b.prim;
      const { snapOn: snap, snapStep: step } = P.current;
      if (d.mode === 'move' && d.startFloor) {
        let x = d.startPos.x + (f.x - d.startFloor.x);
        let y = d.startPos.y + (f.z - d.startFloor.z);
        if (snap && !e.altKey) {
          x = snapValue(x, step);
          y = snapValue(y, step);
        }
        const c = clampToRoom(L.layout, prim, x, y, d.cur.rotZ);
        d.cur.x = round2(c.x);
        d.cur.y = round2(c.y);
        d.clamped = c.clamped;
        const [wx, , wz] = planToWorld(L.layout, { x: d.cur.x, y: d.cur.y });
        b.object.position.set(wx, b.object.position.y, wz);
      } else {
        const c = b.object.position;
        const ang = Math.atan2(f.x - c.x, f.z - c.z);
        let deg = d.mode === 'handle' ? ang / DEG : d.startRot + (ang - d.ang0) / DEG;
        deg = e.shiftKey ? Math.round(deg) : snapValue(deg, 15);
        d.cur.rotZ = normDeg(deg);
        // turning may push a long element through a wall: keep the centre inside
        const cl = clampToRoom(L.layout, prim, d.cur.x, d.cur.y, d.cur.rotZ);
        d.clamped = cl.clamped;
        if (cl.clamped) {
          d.cur.x = round2(cl.x);
          d.cur.y = round2(cl.y);
          const [wx, , wz] = planToWorld(L.layout, { x: d.cur.x, y: d.cur.y });
          b.object.position.set(wx, b.object.position.y, wz);
        }
        b.object.rotation.y = d.cur.rotZ * DEG;
      }
      // live overlap against every other element
      const poly = corners(prim, { x: d.cur.x, y: d.cur.y, z: 0 }, d.cur.rotZ);
      d.overlap = L.layout.primitives.some((o) => o.id !== prim.id && overlapDepth(poly, corners(o)) > 0.05);
      showReadout(d);
      syncGizmo();
    };
    const end = (e: PointerEvent) => {
      const d = drag.current;
      if (!d || e.pointerId !== d.pointerId) return;
      e.stopPropagation();
      drag.current = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      setDragging(false);
      if (e.type === 'pointercancel') {
        setVersion((v) => v + 1);
        return;
      }
      if (!d.moved) {
        P.current.onSelect(d.id);
        return;
      }
      if (d.cur.x !== d.startPos.x || d.cur.y !== d.startPos.y || d.cur.rotZ !== d.startRot) P.current.onCommit({ id: d.id, x: d.cur.x, y: d.cur.y, rotZ: d.cur.rotZ });
    };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move, true);
    el.addEventListener('pointerup', end, true);
    el.addEventListener('pointercancel', end, true);
    return () => {
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move, true);
      el.removeEventListener('pointerup', end, true);
      el.removeEventListener('pointercancel', end, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, simplified]);

  /* ---------------- minimap view box (throttled) ---------------- */
  useEffect(() => {
    if (!stage || simplified) return;
    let last = '';
    let lastAt = 0;
    return stage.onFrame(() => {
      const now = performance.now();
      if (now - lastAt < 180) return;
      lastAt = now;
      const L = live.current;
      if (!L) return;
      const t = worldToPlan(L.layout, stage.rig.target);
      const dd = stage.rig.distance;
      const v = { x: Math.round((t.x - dd * 0.42) * 2) / 2, y: Math.round((t.y - dd * 0.28) * 2) / 2, w: Math.round(dd * 0.84 * 2) / 2, h: Math.round(dd * 0.56 * 2) / 2 };
      const k = `${v.x}:${v.y}:${v.w}:${v.h}`;
      if (k !== last) {
        last = k;
        setView(v);
      }
    });
  }, [stage, simplified]);

  /* ---------------- labels ---------------- */
  const labels = useMemo<SceneLabel[]>(() => {
    const L = live.current;
    if (!L || !showLabels) return [];
    const out: SceneLabel[] = [];
    for (const b of L.scene.prims.values()) {
      const p = b.prim;
      if (p.label === false && p.id !== selectedId) continue;
      const anchor = L.anchors.get(p.id);
      const obj = b.object;
      out.push({
        id: `prim:${p.id}`,
        position: () => (anchor ? obj.localToWorld(anchor.clone()) : b.anchor),
        title: p.name,
        subtitle: p.binding ? bindingLabel(p, catalog) : 'Sans liaison',
        status: flagged.has(p.id) ? 'error' : p.binding ? 'validating' : 'idle',
        statusLabel: flagged.has(p.id) ? 'Problème signalé' : undefined,
        priority: p.kind === 'station' ? 1 : 2,
        selection: { kind: 'node', id: p.id },
        selected: p.id === selectedId,
      });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, showLabels, selectedId, flagged, catalog]);

  /* ---------------- minimap items ---------------- */
  const plan = useMemo<PlanItem[]>(() => {
    const items: PlanItem[] = [{ id: 'room', kind: 'room', x: 0, y: 0, w: layout.room.width, h: layout.room.depth }];
    for (const p of layout.primitives) {
      const fp = footprint(p);
      const rot = Math.abs(normDeg(p.rotation.z)) % 180;
      const swap = rot > 45 && rot < 135;
      items.push({ id: p.id, kind: 'object', x: p.position.x, y: p.position.y, w: swap ? fp.d : fp.w, h: swap ? fp.w : fp.d, label: p.name });
    }
    for (const p of layout.primitives) if (flagged.has(p.id)) items.push({ id: `flag:${p.id}`, kind: 'agent', x: p.position.x, y: p.position.y, color: 'var(--st-error)', label: p.name });
    const sel = layout.primitives.find((p) => p.id === selectedId);
    if (sel) items.push({ id: `flag:${sel.id}:sel`, kind: 'agent', x: sel.position.x, y: sel.position.y, color: 'var(--c-accent)', label: sel.name });
    return items;
  }, [layout, flagged, selectedId]);

  const W = layout.room.width;
  const D = layout.room.depth;
  const dimFront = useMemo(() => new THREE.Vector3(0, 0, D / 2 + 0.9), [D]);
  const dimSide = useMemo(() => new THREE.Vector3(W / 2 + 0.9, 0, 0), [W]);

  return (
    <div ref={wrap} className="se-scene" data-tool={tool} data-dragging={dragging || undefined}>
      <ThreeStage
        quality={quality}
        label="Éditeur de la disposition 3D"
        help={
          simplified
            ? 'Toucher un élément pour le sélectionner, puis modifier sa position dans la fiche. Un doigt pour tourner la vue, deux doigts pour zoomer.'
            : 'Outil Déplacer : glisser un élément pour le déplacer (Alt : sans aimantation). Outil Pivoter ou poignée ronde : glisser pour tourner (Maj : degré par degré). Avec un élément sélectionné, les flèches le déplacent d’un pas de grille ; Q et E le tournent de 15° (Maj : 90°). Sans sélection : flèches pour déplacer la vue, Maj + flèches pour tourner, + et − pour zoomer.'
        }
        camera={{ fov: 28, minDistance: 3.5, maxDistance: 70 }}
        onStage={setStage}
        onClick={(hit) => onSelect(hit ? hit.selection.id : null)}
      >
        {(st) => (
          <>
            <SceneLabels
              stage={st}
              labels={labels}
              farDistance={simplified ? 20 : 30}
              onSelect={(sel) => onSelect(sel.id)}
              avoid={() => (rootRef.current ? [...rootRef.current.querySelectorAll('.se-avoid')] : [])}
            />
            {showDims && !simplified && (
              <>
                <Anchored stage={st} position={dimFront} offsetY={-10}>
                  <span className="se-dim">{fmtM(W)} m</span>
                </Anchored>
                <Anchored stage={st} position={dimSide} offsetY={-10}>
                  <span className="se-dim">{fmtM(D)} m</span>
                </Anchored>
              </>
            )}
            <Anchored
              stage={st}
              offsetY={18}
              position={
                dragging
                  ? () => {
                      const d = drag.current;
                      const b = d ? live.current?.scene.prims.get(d.id) : undefined;
                      return b ? b.object.position.clone().setY(0.2) : [0, -50, 0];
                    }
                  : null
              }
            >
              <div ref={readout} className="se-readout" role="status" aria-live="off" />
            </Anchored>
          </>
        )}
      </ThreeStage>
      {!simplified && (
        <div className="se-minimap se-avoid">
          <PlanMinimap
            items={plan}
            iso={false}
            bounds={{ x: 0, y: 0, w: W, h: D }}
            title="Plan"
            view={view}
            onPick={(id) => {
              if (id === 'room') return;
              const real = id.startsWith('flag:') ? id.split(':')[1] : id;
              onSelect(real);
              handleRef.current?.focus(real);
            }}
            footer={<span>{fmtM(W)} × {fmtM(D)} m · grille {fmtM(layout.gridSize)} m</span>}
          />
        </div>
      )}
    </div>
  );
}
