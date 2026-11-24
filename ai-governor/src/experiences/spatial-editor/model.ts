/**
 * Pure model of the spatial editor: footprints, validation (overlaps, room
 * bounds, departments without a station), draft ↔ published diff, the
 * element library and placement helpers. No React, no Three.js.
 */
import type { Catalog } from '@sdk';
import { PRIMITIVE_LABEL, reconcileLayout, type PrimitiveKind, type SpatialLayout, type SpatialPrimitive } from '@ds/three';

export const DEG = Math.PI / 180;
const BOARDS: PrimitiveKind[] = ['kanban', 'whiteboard', 'board'];
export const DECOR: PrimitiveKind[] = ['plant', 'armchair', 'sofa', 'table'];
export const isBoard = (k: PrimitiveKind) => BOARDS.includes(k);
export const isDecor = (k: PrimitiveKind) => DECOR.includes(k);

/** Base footprint (plan metres, before scale), local width × depth. Matches the kit factories. */
const FOOT: Record<PrimitiveKind, [number, number]> = {
  desk: [2.0, 1.9], vault: [1.3, 1.25], gate: [1.5, 1.0], kanban: [1, 0.4], whiteboard: [1, 0.4], board: [1, 0.4], station: [2.1, 2.1],
  models: [2.9, 2.4], plant: [0.5, 0.5], armchair: [0.9, 0.8], sofa: [1.8, 0.9], table: [0.6, 0.6],
};

export function footprint(p: SpatialPrimitive): { w: number; d: number } {
  if (isBoard(p.kind)) return { w: p.scale.x, d: 0.4 };
  const [w, d] = FOOT[p.kind];
  return { w: w * p.scale.x, d: d * p.scale.y };
}

/** Corners of the rotated footprint (plan coordinates). */
export function corners(p: SpatialPrimitive, at = p.position, rotZ = p.rotation.z): Array<[number, number]> {
  const { w, d } = footprint(p);
  // The kit maps rotation.z to a rotation about +Y: plan (x, y) turns like world (x, z).
  const a = rotZ * DEG;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2],
  ].map(([lx, ly]) => [at.x + lx * c + ly * s, at.y - lx * s + ly * c]);
}

/** Half extents of the axis-aligned box around the rotated footprint. */
export function halfExtents(p: SpatialPrimitive, rotZ = p.rotation.z) {
  const { w, d } = footprint(p);
  const a = rotZ * DEG;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return { hx: (w * c + d * s) / 2, hy: (w * s + d * c) / 2 };
}

/** Separating-axis overlap of two rotated rectangles; returns the penetration depth (0 = none). */
export function overlapDepth(a: Array<[number, number]>, b: Array<[number, number]>): number {
  let min = Infinity;
  for (const poly of [a, b]) {
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % 4];
      const nx = -(y2 - y1);
      const ny = x2 - x1;
      const len = Math.hypot(nx, ny) || 1;
      const ax = nx / len;
      const ay = ny / len;
      const proj = (p: Array<[number, number]>) => p.map(([x, y]) => x * ax + y * ay);
      const pa = proj(a);
      const pb = proj(b);
      const o = Math.min(Math.max(...pa), Math.max(...pb)) - Math.max(Math.min(...pa), Math.min(...pb));
      if (o <= 0) return 0;
      min = Math.min(min, o);
    }
  }
  return min;
}

export function insideRoom(layout: Pick<SpatialLayout, 'room'>, p: SpatialPrimitive, at = p.position, rotZ = p.rotation.z, tol = 0.02): boolean {
  return corners(p, at, rotZ).every(([x, y]) => x >= -tol && y >= -tol && x <= layout.room.width + tol && y <= layout.room.depth + tol);
}

/** Clamps a centre so the rotated footprint stays inside the room. */
export function clampToRoom(layout: Pick<SpatialLayout, 'room'>, p: SpatialPrimitive, x: number, y: number, rotZ = p.rotation.z) {
  const { hx, hy } = halfExtents(p, rotZ);
  const W = layout.room.width;
  const D = layout.room.depth;
  const cx = hx * 2 > W ? W / 2 : Math.min(W - hx, Math.max(hx, x));
  const cy = hy * 2 > D ? D / 2 : Math.min(D - hy, Math.max(hy, y));
  return { x: cx, y: cy, clamped: Math.abs(cx - x) > 1e-6 || Math.abs(cy - y) > 1e-6 };
}

export const snapValue = (v: number, step: number) => Math.round(v / step) * step;
export const round2 = (v: number) => Math.round(v * 100) / 100;
export const normDeg = (d: number) => {
  let a = ((d % 360) + 360) % 360;
  if (a > 180) a -= 360;
  return Math.round(a * 10) / 10;
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export type Issue =
  | { id: string; kind: 'overlap'; a: string; b: string; text: string }
  | { id: string; kind: 'outside'; a: string; text: string }
  | { id: string; kind: 'missing'; dept: string; text: string }
  | { id: string; kind: 'binding'; a: string; text: string }
  | { id: string; kind: 'duplicate'; a: string; dept: string; text: string };

export interface Validation {
  issues: Issue[];
  /** Primitive ids drawn with a red outline. */
  flagged: Set<string>;
}

export function validate(layout: SpatialLayout, catalog: Catalog): Validation {
  const issues: Issue[] = [];
  const flagged = new Set<string>();
  const prims = layout.primitives;
  const polys = prims.map((p) => corners(p));
  for (let i = 0; i < prims.length; i++) {
    for (let j = i + 1; j < prims.length; j++) {
      // a small plant tucked against furniture is fine; real overlaps are > 5 cm
      if (overlapDepth(polys[i], polys[j]) > 0.05) {
        const a = prims[i];
        const b = prims[j];
        issues.push({ id: `ov:${a.id}:${b.id}`, kind: 'overlap', a: a.id, b: b.id, text: `« ${a.name} » chevauche « ${b.name} »` });
        flagged.add(a.id);
        flagged.add(b.id);
      }
    }
  }
  for (const p of prims) {
    if (!insideRoom(layout, p)) {
      issues.push({ id: `out:${p.id}`, kind: 'outside', a: p.id, text: `« ${p.name} » dépasse de la pièce` });
      flagged.add(p.id);
    }
  }
  const deptIds = new Set(catalog.departments.map((d) => d.id));
  const nodeIds = new Set([...catalog.nodes.map((n) => n.id), ...catalog.agents.map((a) => a.id)]);
  const seenDept = new Map<string, string>();
  for (const p of prims) {
    const b = p.binding;
    if (!b) continue;
    if (b.kind === 'department' && !deptIds.has(b.id)) {
      issues.push({ id: `bind:${p.id}`, kind: 'binding', a: p.id, text: `« ${p.name} » est lié à un département absent du catalogue (${b.id})` });
      flagged.add(p.id);
    } else if (b.kind === 'node' && !nodeIds.has(b.id)) {
      issues.push({ id: `bind:${p.id}`, kind: 'binding', a: p.id, text: `« ${p.name} » est lié à un nœud absent du catalogue (${b.id})` });
    }
    if (b.kind === 'department' && deptIds.has(b.id)) {
      const first = seenDept.get(b.id);
      if (first) {
        const d = catalog.departments.find((x) => x.id === b.id);
        issues.push({ id: `dup:${p.id}`, kind: 'duplicate', a: p.id, dept: b.id, text: `« ${p.name} » et « ${prims.find((x) => x.id === first)?.name} » représentent tous deux ${d?.name ?? b.id} : les agents iront au premier` });
      } else seenDept.set(b.id, p.id);
    }
  }
  // departments without a station: exactly those the 3D views will add on their own (reconcileLayout)
  for (const p of reconcileLayout(layout, catalog).primitives) {
    if (!p.tags?.includes('auto') || p.binding?.kind !== 'department') continue;
    const d = catalog.departments.find((x) => x.id === p.binding!.id);
    issues.push({ id: `miss:${p.binding.id}`, kind: 'missing', dept: p.binding.id, text: `${d?.name ?? p.binding.id} n’a pas de poste : les vues 3D en ajouteront un automatiquement` });
  }
  return { issues, flagged };
}

/* ------------------------------------------------------------------ */
/* Diff draft ↔ published                                              */
/* ------------------------------------------------------------------ */

export interface Change {
  id: string;
  /** Primitive id (to select it), when it still exists. */
  target?: string;
  verb: 'Ajouté' | 'Supprimé' | 'Déplacé' | 'Pivoté' | 'Renommé' | 'Réassigné' | 'Redimensionné' | 'Modifié' | 'Pièce';
  text: string;
}

/** Metres in French notation, at most 2 decimals, one decimal kept for whole numbers (12,0). */
export const fmtM = (v: number) => {
  const r = round2(v);
  return (Number.isInteger(r) ? r.toFixed(1) : String(r)).replace('.', ',');
};

export function diffLayouts(published: SpatialLayout, draft: SpatialLayout, label: (p: SpatialPrimitive) => string): Change[] {
  const out: Change[] = [];
  const a = published.room;
  const b = draft.room;
  if (a.width !== b.width || a.depth !== b.depth) out.push({ id: 'room:size', verb: 'Pièce', text: `${fmtM(a.width)} × ${fmtM(a.depth)} m → ${fmtM(b.width)} × ${fmtM(b.depth)} m` });
  if (a.height !== b.height) out.push({ id: 'room:h', verb: 'Pièce', text: `hauteur ${fmtM(a.height)} → ${fmtM(b.height)} m` });
  if (published.gridSize !== draft.gridSize) out.push({ id: 'room:grid', verb: 'Pièce', text: `grille ${fmtM(published.gridSize)} → ${fmtM(draft.gridSize)} m` });
  if (published.name !== draft.name) out.push({ id: 'room:name', verb: 'Pièce', text: `nom « ${published.name} » → « ${draft.name} »` });
  const before = new Map(published.primitives.map((p) => [p.id, p]));
  const after = new Map(draft.primitives.map((p) => [p.id, p]));
  for (const p of draft.primitives) {
    const o = before.get(p.id);
    if (!o) {
      out.push({ id: `add:${p.id}`, target: p.id, verb: 'Ajouté', text: `${label(p)} en (${fmtM(p.position.x)} ; ${fmtM(p.position.y)})` });
      continue;
    }
    if (Math.abs(o.position.x - p.position.x) > 1e-6 || Math.abs(o.position.y - p.position.y) > 1e-6)
      out.push({ id: `mv:${p.id}`, target: p.id, verb: 'Déplacé', text: `${label(p)} : (${fmtM(o.position.x)} ; ${fmtM(o.position.y)}) → (${fmtM(p.position.x)} ; ${fmtM(p.position.y)})` });
    if (Math.abs(o.rotation.z - p.rotation.z) > 1e-6) out.push({ id: `rot:${p.id}`, target: p.id, verb: 'Pivoté', text: `${label(p)} : ${Math.round(o.rotation.z)}° → ${Math.round(p.rotation.z)}°` });
    if (o.name !== p.name || (o.subtitle ?? '') !== (p.subtitle ?? '') || o.label !== p.label) out.push({ id: `nm:${p.id}`, target: p.id, verb: 'Renommé', text: o.name !== p.name ? `« ${o.name} » → « ${p.name} »` : `${label(p)} : étiquette modifiée` });
    if (JSON.stringify(o.binding) !== JSON.stringify(p.binding)) out.push({ id: `bd:${p.id}`, target: p.id, verb: 'Réassigné', text: `${label(p)} → ${p.binding ? p.binding.id : 'aucune liaison'}` });
    if (o.scale.x !== p.scale.x || o.scale.y !== p.scale.y || o.scale.z !== p.scale.z) out.push({ id: `sc:${p.id}`, target: p.id, verb: 'Redimensionné', text: label(p) });
    if (o.equipment !== p.equipment || o.color !== p.color || o.edgeGlow !== p.edgeGlow || o.opacity !== p.opacity || o.material !== p.material)
      out.push({ id: `mod:${p.id}`, target: p.id, verb: 'Modifié', text: label(p) });
  }
  for (const p of published.primitives) if (!after.has(p.id)) out.push({ id: `rm:${p.id}`, verb: 'Supprimé', text: label(p) });
  return out;
}

/** Canonical JSON (sorted keys, undefined dropped): layouts built by different code paths compare equal. */
export function canon(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, (val as Record<string, unknown>)[k]])) : val,
  );
}

export function sameLayout(a: SpatialLayout, b: SpatialLayout) {
  return a === b || canon(a) === canon(b);
}

/* ------------------------------------------------------------------ */
/* Library                                                             */
/* ------------------------------------------------------------------ */

export interface LibraryItem {
  key: string;
  label: string;
  hint: string;
  group: 'Postes' | 'Panneaux' | 'Infrastructure' | 'Salon et décor';
  icon: PrimitiveKind | 'lounge';
  /** Builds the primitive(s) at a plan point. */
  make: (ctx: { at: { x: number; y: number }; catalog: Catalog; layout: SpatialLayout; uid: () => string }) => SpatialPrimitive[];
}

const base = (id: string, kind: PrimitiveKind, name: string, x: number, y: number, rest: Partial<SpatialPrimitive> = {}): SpatialPrimitive => ({
  id, kind, name, position: { x, y, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, material: 'auto', opacity: 1, edgeGlow: null, binding: null, ...rest,
});

/** First catalog department without any primitive bound to it. */
export function unboundDepartment(layout: SpatialLayout, catalog: Catalog) {
  const bound = new Set(layout.primitives.filter((p) => p.binding?.kind === 'department').map((p) => p.binding!.id));
  return catalog.departments.find((d) => !bound.has(d.id));
}

export const LIBRARY: LibraryItem[] = [
  {
    key: 'station', label: 'Poste de département', hint: 'Plateforme + équipement, liée au premier département sans poste', group: 'Postes', icon: 'station',
    make: ({ at, catalog, layout, uid }) => {
      const d = unboundDepartment(layout, catalog);
      return [base(uid(), 'station', d?.name ?? 'Poste', at.x, at.y, { binding: d ? { kind: 'department', id: d.id } : null, equipment: d?.equipment[0] ?? 'desk' })];
    },
  },
  {
    key: 'desk', label: 'Bureau', hint: 'Bureau en bois, fauteuil et portable', group: 'Postes', icon: 'desk',
    make: ({ at, layout, uid }) => [base(uid(), 'desk', `Bureau ${String(layout.primitives.filter((p) => p.kind === 'desk').length + 1).padStart(2, '0')}`, at.x, at.y)],
  },
  {
    key: 'kanban', label: 'Tableau kanban', hint: 'Panneau de verre lié à la file des tâches', group: 'Panneaux', icon: 'kanban',
    make: ({ at, catalog, uid }) => [base(uid(), 'kanban', 'Mur kanban', at.x, at.y, { subtitle: 'File des tâches', binding: catalog.nodes.some((n) => n.id === 'task-queue') ? { kind: 'node', id: 'task-queue' } : null, edgeGlow: '#b58cff', opacity: 0.2, scale: { x: 2.7, y: 1.5, z: 1 } })],
  },
  {
    key: 'whiteboard', label: 'Tableau blanc', hint: 'Grand panneau de verre (schémas, audit)', group: 'Panneaux', icon: 'whiteboard',
    make: ({ at, uid }) => [base(uid(), 'whiteboard', 'Tableau blanc', at.x, at.y, { edgeGlow: '#7cc3ff', opacity: 0.22, scale: { x: 3.2, y: 1.6, z: 1 } })],
  },
  {
    key: 'board', label: 'Panneau de verre', hint: 'Petit panneau libre', group: 'Panneaux', icon: 'board',
    make: ({ at, uid }) => [base(uid(), 'board', 'Panneau', at.x, at.y, { edgeGlow: '#7cc3ff', opacity: 0.22, scale: { x: 1.8, y: 1.1, z: 1 } })],
  },
  {
    key: 'vault', label: 'Coffre', hint: 'Archives, bases de données', group: 'Infrastructure', icon: 'vault',
    make: ({ at, uid }) => [base(uid(), 'vault', 'Coffre', at.x, at.y)],
  },
  {
    key: 'gate', label: 'Portique', hint: 'Contrôle d’accès, sécurité', group: 'Infrastructure', icon: 'gate',
    make: ({ at, uid }) => [base(uid(), 'gate', 'Portique de sécurité', at.x, at.y)],
  },
  {
    key: 'models', label: 'Hub de modèles', hint: 'Salle des modèles (appels de modèles)', group: 'Infrastructure', icon: 'models',
    make: ({ at, catalog, uid }) => [base(uid(), 'models', 'Salle des modèles', at.x, at.y, { binding: catalog.nodes.some((n) => n.id === 'anthropic') ? { kind: 'node', id: 'anthropic' } : null })],
  },
  {
    key: 'lounge', label: 'Salon', hint: 'Canapé, table basse et fauteuil (agents disponibles)', group: 'Salon et décor', icon: 'lounge',
    make: ({ at, uid }) => [
      base(uid(), 'sofa', 'Canapé', at.x, at.y + 0.9, { label: false, rotation: { x: 0, y: 0, z: 180 } }),
      base(uid(), 'table', 'Table basse', at.x, at.y - 0.3, { label: false }),
      base(uid(), 'armchair', 'Fauteuil', at.x + 1.6, at.y - 0.3, { label: false, rotation: { x: 0, y: 0, z: -110 } }),
    ],
  },
  { key: 'sofa', label: 'Canapé', hint: 'Décor', group: 'Salon et décor', icon: 'sofa', make: ({ at, uid }) => [base(uid(), 'sofa', 'Canapé', at.x, at.y, { label: false })] },
  { key: 'armchair', label: 'Fauteuil', hint: 'Décor', group: 'Salon et décor', icon: 'armchair', make: ({ at, uid }) => [base(uid(), 'armchair', 'Fauteuil', at.x, at.y, { label: false })] },
  { key: 'table', label: 'Table basse', hint: 'Décor', group: 'Salon et décor', icon: 'table', make: ({ at, uid }) => [base(uid(), 'table', 'Table basse', at.x, at.y, { label: false })] },
  { key: 'plant', label: 'Plante', hint: 'Décor', group: 'Salon et décor', icon: 'plant', make: ({ at, uid }) => [base(uid(), 'plant', 'Plante', at.x, at.y, { label: false })] },
];

/** Bounding box of a group of new primitives relative to their anchor (for placement). */
function groupFits(layout: SpatialLayout, items: SpatialPrimitive[], dx: number, dy: number, others: SpatialPrimitive[]) {
  const polysOthers = others.map((o) => corners(o));
  for (const it of items) {
    const at = { x: it.position.x + dx, y: it.position.y + dy, z: 0 };
    if (!insideRoom(layout, it, at)) return false;
    const poly = corners(it, at);
    if (polysOthers.some((q) => overlapDepth(poly, q) > 0.02)) return false;
  }
  return true;
}

/**
 * Moves freshly made primitives to the nearest free, snapped spot around
 * their anchor (spiral search). Returns them unchanged when the room is full
 * (the overlap is then reported as a problem).
 */
export function placeFree(layout: SpatialLayout, items: SpatialPrimitive[], step: number): SpatialPrimitive[] {
  const others = layout.primitives;
  const anchor = items[0].position;
  const W = layout.room.width;
  const D = layout.room.depth;
  const tryAt = (x: number, y: number) => {
    const sx = snapValue(x, step) - anchor.x;
    const sy = snapValue(y, step) - anchor.y;
    return groupFits(layout, items, sx, sy, others) ? { dx: sx, dy: sy } : null;
  };
  let found = tryAt(anchor.x, anchor.y);
  for (let r = step; !found && r < Math.max(W, D); r += step) {
    const n = Math.max(8, Math.round((2 * Math.PI * r) / step));
    for (let k = 0; k < n && !found; k++) {
      const a = (k / n) * Math.PI * 2;
      found = tryAt(anchor.x + Math.cos(a) * r, anchor.y + Math.sin(a) * r);
    }
  }
  if (!found) {
    // keep inside at least
    return items.map((it) => {
      const c = clampToRoom(layout, it, it.position.x, it.position.y);
      return { ...it, position: { ...it.position, x: c.x, y: c.y } };
    });
  }
  return items.map((it) => ({ ...it, position: { ...it.position, x: round2(it.position.x + found!.dx), y: round2(it.position.y + found!.dy) } }));
}

export function kindLabel(k: PrimitiveKind) {
  return k === 'station' ? 'Poste de département' : k === 'models' ? 'Hub de modèles' : k === 'kanban' ? 'Tableau kanban' : PRIMITIVE_LABEL[k];
}

/** Human label of a binding. */
export function bindingLabel(p: SpatialPrimitive, catalog: Catalog): string {
  const b = p.binding;
  if (!b) return 'Aucune liaison';
  if (b.kind === 'department') return catalog.departments.find((d) => d.id === b.id)?.name ?? `${b.id} (introuvable)`;
  return catalog.nodes.find((n) => n.id === b.id)?.label ?? catalog.agents.find((a) => a.id === b.id)?.name ?? `${b.id} (introuvable)`;
}
