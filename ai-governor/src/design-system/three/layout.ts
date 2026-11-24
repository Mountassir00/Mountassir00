/**
 * Shared spatial layout document.
 *
 * One JSON document describes the room and its primitives (vault, gate,
 * boards, desks, stations…) and how each one is BOUND to the catalog
 * (department or system node). The spatial editor writes it with
 * `host.setShared('spatial-layout', …)`; every 3D view reads it through
 * `useSpatialLayout(host)` and therefore shows the same office.
 *
 * Coordinates are PLAN coordinates, like a floor plan: `x` along the width
 * (0 → width), `y` along the depth (0 = back wall → depth = front), `z` the
 * elevation. Rotation is in degrees; `rotation.z` turns around the vertical
 * axis (counter-clockwise seen from above). Units: metres.
 *
 * Presentation data only — never operational data.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { Catalog, HostApi } from '@sdk';
import type { EquipmentKind } from './props';

export const SPATIAL_LAYOUT_KEY = 'spatial-layout';

export type PrimitiveKind =
  | 'desk' | 'vault' | 'gate' | 'kanban' | 'whiteboard' | 'board' | 'station' | 'models' | 'plant' | 'armchair' | 'sofa' | 'table';

export const PRIMITIVE_LABEL: Record<PrimitiveKind, string> = {
  desk: 'Bureau', vault: 'Coffre', gate: 'Portique de sécurité', kanban: 'Mur kanban', whiteboard: 'Tableau blanc', board: 'Panneau de verre',
  station: 'Poste', models: 'Salle des modèles', plant: 'Plante', armchair: 'Fauteuil', sofa: 'Canapé', table: 'Table basse',
};

export type PrimitiveMaterial = 'auto' | 'plastic' | 'metal' | 'glass' | 'wood';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SpatialBinding {
  kind: 'department' | 'node';
  id: string;
}

export interface SpatialPrimitive {
  id: string;
  kind: PrimitiveKind;
  /** Shown on the label card. */
  name: string;
  subtitle?: string;
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  material: PrimitiveMaterial;
  /** Accent colour override (#rrggbb). */
  color?: string;
  /** 0–1, glass / boards. */
  opacity: number;
  /** Edge glow colour (#rrggbb) or null. */
  edgeGlow: string | null;
  binding: SpatialBinding | null;
  /** Other catalog node ids this primitive stands for (flows to them arrive here). */
  represents?: string[];
  /** Equipment drawn on a station. */
  equipment?: EquipmentKind;
  /** Show the label card (default true). */
  label?: boolean;
  tags?: string[];
}

export interface SpatialLayout {
  version: 1;
  name: string;
  room: { width: number; depth: number; height: number; walls: 'none' | 'back' | 'all' };
  gridSize: number;
  snap: boolean;
  primitives: SpatialPrimitive[];
}

const P = (
  id: string, kind: PrimitiveKind, name: string, x: number, y: number, rest: Partial<SpatialPrimitive> & { rot?: number } = {},
): SpatialPrimitive => {
  const { rot, ...r } = rest;
  return {
    id, kind, name, position: { x, y, z: 0 }, rotation: { x: 0, y: 0, z: rot ?? 0 }, scale: { x: 1, y: 1, z: 1 }, material: 'auto', opacity: 1, edgeGlow: null,
    binding: null, ...r,
  };
};
const dept = (id: string): SpatialBinding => ({ kind: 'department', id });
const node = (id: string): SpatialBinding => ({ kind: 'node', id });

/**
 * Default office, bound to the demo catalog (15 departments, task queue,
 * models). 18 × 14 m, 0.5 m grid.
 */
export const DEFAULT_SPATIAL_LAYOUT: SpatialLayout = {
  version: 1,
  name: 'Espace principal',
  room: { width: 18, depth: 14, height: 3, walls: 'none' },
  gridSize: 0.5,
  snap: true,
  primitives: [
    // back row
    P('vault', 'vault', 'Coffre', 2.4, 2.3, { subtitle: 'Archives · journal d’événements', binding: dept('archive'), represents: ['event-store', 'archive-db', 'prefs-db', 'event-bus'] }),
    P('st-routing', 'station', 'Routage des modèles', 5.8, 2.4, { binding: dept('routing'), equipment: 'router' }),
    P('whiteboard', 'whiteboard', 'Tableau blanc', 9, 1.7, { subtitle: 'Audit des consignes · architecture', binding: dept('instructions'), edgeGlow: '#7cc3ff', opacity: 0.22, scale: { x: 3.2, y: 1.6, z: 1 } }),
    P('st-connectors', 'station', 'Connecteurs & MCP', 12.3, 2.4, { binding: dept('connectors'), equipment: 'antenna', represents: ['mcp-github', 'mcp-notion', 'mcp-drive', 'web-search'] }),
    P('gate', 'gate', 'Portique de sécurité', 15.7, 2.4, { subtitle: 'Cybersécurité · accès', binding: dept('security') }),
    // middle row
    P('st-tokens', 'station', 'Gestion des tokens', 2.4, 5.8, { binding: dept('tokens'), equipment: 'gauge' }),
    P('st-context', 'station', 'Gestion du contexte', 5.8, 5.8, { binding: dept('context'), equipment: 'conveyor' }),
    P('models', 'models', 'Salle des modèles', 9, 5.5, { subtitle: 'Opus · Sonnet · Haiku', binding: node('anthropic'), represents: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-ai', 'other-ai'] }),
    P('st-skills', 'station', 'Laboratoire des skills', 12.3, 5.8, { binding: dept('skills'), equipment: 'lab', represents: ['skill-writing', 'skill-pdf', 'skill-research'] }),
    P('st-research', 'station', 'Recherche', 15.7, 5.8, { binding: dept('research'), equipment: 'antenna' }),
    // front row
    P('st-automation', 'station', 'Automatisation', 2.4, 9.3, { binding: dept('automation'), equipment: 'conveyor' }),
    P('kanban', 'kanban', 'Mur kanban', 5.5, 9.0, { subtitle: 'File des tâches', binding: node('task-queue'), edgeGlow: '#b58cff', opacity: 0.2, rot: 30, scale: { x: 2.7, y: 1.5, z: 1 } }),
    P('desk-01', 'desk', 'Bureau 01', 9, 9.2, { subtitle: 'Direction · arbitrages', binding: dept('executive'), represents: ['you'] }),
    P('st-quality', 'station', 'Contrôle qualité', 12.3, 9.3, { binding: dept('quality'), equipment: 'gauge' }),
    P('st-benchmark', 'station', 'Banc d’essai', 15.7, 9.3, { binding: dept('benchmark'), equipment: 'lab' }),
    // front edge
    P('st-finance', 'station', 'Contrôle financier', 2.4, 12.4, { binding: dept('finance'), equipment: 'database' }),
    P('st-evolution', 'station', 'Évolution', 5.8, 12.4, { binding: dept('evolution'), equipment: 'board' }),
    // lounge (decor)
    P('sofa', 'sofa', 'Canapé', 12.6, 12.9, { label: false, rot: 180 }),
    P('armchair', 'armchair', 'Fauteuil', 15.1, 12.2, { label: false, rot: -125 }),
    P('table', 'table', 'Table basse', 13.8, 12.0, { label: false }),
    P('plant-1', 'plant', 'Plante', 17.1, 13.2, { label: false }),
    P('plant-2', 'plant', 'Plante', 0.8, 0.8, { label: false }),
    P('plant-3', 'plant', 'Plante', 10.7, 8.1, { label: false, scale: { x: 0.75, y: 0.75, z: 0.75 } }),
  ],
};

/* ---------------- coordinates ---------------- */

/** Plan (x, y, z) → Three.js world (x, y-up, z). */
export function planToWorld(layout: Pick<SpatialLayout, 'room'>, p: { x: number; y: number; z?: number }): [number, number, number] {
  return [p.x - layout.room.width / 2, p.z ?? 0, p.y - layout.room.depth / 2];
}
export function worldToPlan(layout: Pick<SpatialLayout, 'room'>, w: { x: number; y: number; z: number }): Vec3 {
  return { x: w.x + layout.room.width / 2, y: w.z + layout.room.depth / 2, z: w.y };
}
export const snapTo = (v: number, grid: number) => Math.round(v / grid) * grid;

/* ---------------- validation ---------------- */

const KINDS: PrimitiveKind[] = ['desk', 'vault', 'gate', 'kanban', 'whiteboard', 'board', 'station', 'models', 'plant', 'armchair', 'sofa', 'table'];
const EQUIP: EquipmentKind[] = ['desk', 'meeting', 'lab', 'server', 'database', 'board', 'shield', 'archive', 'router', 'gauge', 'antenna', 'conveyor'];
const num = (v: unknown, d: number, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
const hex = (v: unknown) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : undefined);
const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.slice(0, max) : undefined);

/** Validates and clamps an untrusted layout. Returns null when unusable. */
export function normalizeLayout(raw: unknown): SpatialLayout | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const room = (r.room ?? {}) as Record<string, unknown>;
  const width = num(room.width, 20, 4, 80);
  const depth = num(room.depth, 16, 4, 80);
  const list = Array.isArray(r.primitives) ? r.primitives : null;
  if (!list) return null;
  const seen = new Set<string>();
  const prims: SpatialPrimitive[] = [];
  for (const x of list.slice(0, 200)) {
    if (!x || typeof x !== 'object') continue;
    const p = x as Record<string, unknown>;
    const id = str(p.id, 60);
    const kind = p.kind as PrimitiveKind;
    if (!id || seen.has(id) || !KINDS.includes(kind)) continue;
    seen.add(id);
    const v = (o: unknown, d: Vec3, lo: number, hi: number): Vec3 => {
      const q = (o ?? {}) as Record<string, unknown>;
      return { x: num(q.x, d.x, lo, hi), y: num(q.y, d.y, lo, hi), z: num(q.z, d.z, lo, hi) };
    };
    const b = p.binding as Record<string, unknown> | null | undefined;
    prims.push({
      id,
      kind,
      name: str(p.name) ?? PRIMITIVE_LABEL[kind],
      subtitle: str(p.subtitle, 120),
      position: v(p.position, { x: width / 2, y: depth / 2, z: 0 }, -2, 82),
      rotation: v(p.rotation, { x: 0, y: 0, z: 0 }, -360, 360),
      scale: v(p.scale, { x: 1, y: 1, z: 1 }, 0.2, 8),
      material: (['auto', 'plastic', 'metal', 'glass', 'wood'] as const).includes(p.material as PrimitiveMaterial) ? (p.material as PrimitiveMaterial) : 'auto',
      color: hex(p.color),
      opacity: num(p.opacity, 1, 0.05, 1),
      edgeGlow: hex(p.edgeGlow) ?? null,
      binding: b && (b.kind === 'department' || b.kind === 'node') && typeof b.id === 'string' ? { kind: b.kind, id: b.id.slice(0, 120) } : null,
      represents: Array.isArray(p.represents) ? p.represents.filter((s): s is string => typeof s === 'string').slice(0, 30) : undefined,
      equipment: EQUIP.includes(p.equipment as EquipmentKind) ? (p.equipment as EquipmentKind) : undefined,
      label: p.label === false ? false : undefined,
      tags: Array.isArray(p.tags) ? p.tags.filter((s): s is string => typeof s === 'string').slice(0, 12) : undefined,
    });
  }
  return {
    version: 1,
    name: str(r.name) ?? 'Espace',
    room: { width, depth, height: num(room.height, 3, 2, 8), walls: room.walls === 'back' || room.walls === 'all' ? room.walls : 'none' },
    gridSize: num(r.gridSize, 0.5, 0.1, 2),
    snap: r.snap !== false,
    primitives: prims,
  };
}

/**
 * Adds a station for every catalog department that no primitive is bound to
 * (e.g. an imported catalog with other departments), on free grid cells.
 * The returned layout is derived (not persisted).
 */
export function reconcileLayout(layout: SpatialLayout, catalog: Pick<Catalog, 'departments'>): SpatialLayout {
  const bound = new Set(layout.primitives.filter((p) => p.binding?.kind === 'department').map((p) => p.binding!.id));
  const missing = catalog.departments.filter((d) => !bound.has(d.id));
  if (!missing.length) return layout;
  const { width: W, depth: D } = layout.room;
  const taken = layout.primitives.map((p) => p.position);
  const free: Array<{ x: number; y: number }> = [];
  for (let y = 2.4; y < D - 1; y += 3.8) for (let x = 2.6; x < W - 1; x += 3.6) if (!taken.some((t) => Math.hypot(t.x - x, t.y - y) < 2.4)) free.push({ x, y });
  const extra: SpatialPrimitive[] = missing.map((d, i) => {
    const spot = free[i] ?? { x: 1.5 + (i % 6) * 3, y: D + 1.8 + Math.floor(i / 6) * 3 };
    return P(`auto-${d.id}`, 'station', d.name, spot.x, spot.y, { binding: dept(d.id), equipment: (d.equipment[0] as EquipmentKind) ?? 'desk', tags: ['auto'] });
  });
  const maxY = Math.max(D, ...extra.map((e) => e.position.y + 1.5));
  return { ...layout, room: { ...layout.room, depth: maxY }, primitives: [...layout.primitives, ...extra] };
}

/* ---------------- hook ---------------- */

export interface SpatialLayoutState {
  layout: SpatialLayout;
  setLayout: (next: SpatialLayout) => void;
  resetLayout: () => void;
  /** True when the user (spatial editor) saved a custom layout. */
  isCustom: boolean;
}

/**
 * Reads/writes the shared layout. `host.getShared` is not reactive by itself:
 * the value is re-read on every render (the shell re-renders views on data
 * ticks), and local writes bump a version so the caller re-renders at once.
 */
/** Reactive: every 3D view re-renders as soon as the editor (or any view) saves the layout. */
export function useSpatialLayout(host: Pick<HostApi, 'getShared' | 'setShared' | 'subscribeShared'>): SpatialLayoutState {
  const raw = useSyncExternalStore(
    (cb) => host.subscribeShared(SPATIAL_LAYOUT_KEY, cb),
    () => host.getShared<unknown>(SPATIAL_LAYOUT_KEY, null),
    () => host.getShared<unknown>(SPATIAL_LAYOUT_KEY, null),
  );
  const layout = useMemo(() => normalizeLayout(raw) ?? DEFAULT_SPATIAL_LAYOUT, [raw]);
  const setLayout = useCallback((next: SpatialLayout) => host.setShared(SPATIAL_LAYOUT_KEY, next), [host]);
  const resetLayout = useCallback(() => host.setShared(SPATIAL_LAYOUT_KEY, null), [host]);
  return { layout, setLayout, resetLayout, isCustom: raw != null && layout !== DEFAULT_SPATIAL_LAYOUT };
}
