/**
 * Builds a 3D office from a SpatialLayout document: room, every primitive
 * (through the factories), picking proxies bound to the catalog, contact
 * shadows, label anchors and standing spots for agents. Static geometry is
 * then baked (merged per material).
 *
 * Reused by every 3D view; the spatial editor builds with `bake: false` so it
 * can move primitives individually.
 */
import { Box3, Color, Group, Mesh, Vector3 } from 'three';
import type { Catalog } from '@sdk';
import { planToWorld, type SpatialLayout, type SpatialPrimitive } from './layout';
import { bakeStatic, type BakeReport } from './optimize';
import type { PickSelection } from './picking';
import {
  createArmchair, createDesk, createEquipment, createGate, createGlassBoard, createModelHub, createPlant, createPlatform, createRoom, createSideTable,
  createSofa, createVault, type GlassBoard,
} from './props';
import type { Stage3D } from './stage';
import type { ScenePalette } from './theme';

const DEG = Math.PI / 180;

export interface Spot {
  p: Vector3;
  /** Yaw (radians) facing the primitive. */
  yaw: number;
}

export interface BuiltPrimitive {
  prim: SpatialPrimitive;
  object: Group;
  /** Floor centre (world). */
  world: Vector3;
  /** Label anchor (world). */
  anchor: Vector3;
  /** Standing spots for agents (world), nearest first. */
  spots: Spot[];
  /** Place for a fixed device (console / drone). */
  deviceSpot: Spot;
  /** Seat of a desk (world), for a seated person. */
  seat?: Spot;
  board?: GlassBoard;
  /** Plan footprint (m) for minimaps. */
  footprint: { w: number; d: number };
  /** Resolved accent colour. */
  tone: Color;
}

export interface SpatialScene {
  layout: SpatialLayout;
  group: Group;
  room: Group;
  prims: Map<string, BuiltPrimitive>;
  byDepartment: Map<string, BuiltPrimitive>;
  byNode: Map<string, BuiltPrimitive>;
  /** Resolves a department id, node id or catalog agent id (home) to a primitive. */
  resolve(id: string): BuiltPrimitive | undefined;
  bounds: Box3;
  bake: BakeReport | null;
}

export interface BuildOptions {
  catalog?: Catalog;
  /** Merge static meshes (default true). */
  bake?: boolean;
  /** Register picking proxies on bound primitives (default true). */
  pickable?: boolean;
  /** Draws a board's content. Called with the primitive. */
  drawBoard?: (prim: SpatialPrimitive, ctx: CanvasRenderingContext2D, w: number, h: number, palette: ScenePalette) => void;
  boardTextureWidth?: number;
  /** Simplified scene (phones / minimal): no station equipment, no decor. */
  simplified?: boolean;
  outline?: boolean;
}

const FOOT: Record<SpatialPrimitive['kind'], [number, number]> = {
  desk: [2.0, 1.9], vault: [1.3, 1.25], gate: [1.5, 1.0], kanban: [1, 0.4], whiteboard: [1, 0.4], board: [1, 0.4], station: [2.2, 2.2], models: [2.9, 1.6],
  plant: [0.5, 0.5], armchair: [0.9, 0.8], sofa: [1.8, 0.9], table: [0.6, 0.6],
};

/** Local spots (x, z) per kind; boards get theirs from their width. */
function localSpots(p: SpatialPrimitive): { device: [number, number]; agents: Array<[number, number]>; anchorY: number; seat?: [number, number] } {
  const w = p.scale.x;
  switch (p.kind) {
    case 'station':
      return { device: [-0.58, 0.5], agents: [[0.58, 0.55], [0.05, 1.0], [1.05, 0.05], [-1.05, 0.1], [0.6, 1.35]], anchorY: 1.85 };
    case 'vault':
      return { device: [-1.1, 0.55], agents: [[1.05, 0.8], [0.15, 1.35], [-1.0, 1.35]], anchorY: 1.75 };
    case 'gate':
      return { device: [1.3, 0.3], agents: [[-1.25, 0.9], [1.25, 1.05], [0, 1.4]], anchorY: 1.55 };
    case 'kanban':
    case 'whiteboard':
    case 'board':
      return { device: [w / 2 + 0.6, 0.55], agents: [[-w / 2 + 0.35, 1.0], [w / 2 - 0.35, 1.05], [0, 1.4], [-w / 2 - 0.4, 0.6]], anchorY: 0.12 + p.scale.y + 0.38 };
    case 'desk':
      return { device: [1.6, -0.9], agents: [[-1.75, 0.05], [1.75, 0.35], [0.2, -1.05], [-1.6, -0.95]], anchorY: 1.6, seat: [-0.15, 0.86] };
    case 'models':
      return { device: [1.6, 0.9], agents: [[-1.5, 1.05], [1.5, 1.1], [0, 1.5]], anchorY: 2.55 };
    default:
      return { device: [0.9, 0.6], agents: [[0.9, 0.9], [-0.9, 0.9]], anchorY: 1.3 };
  }
}

export function buildSpatialScene(stage: Stage3D, layout: SpatialLayout, opts: BuildOptions = {}): SpatialScene {
  const kit = stage.kit;
  const pal = kit.palette;
  const group = new Group();
  group.name = 'spatial-scene';
  const room = createRoom(kit, { width: layout.room.width, depth: layout.room.depth, height: layout.room.height, walls: layout.room.walls, gridSize: layout.gridSize, outline: opts.outline });
  group.add(room);
  const prims = new Map<string, BuiltPrimitive>();
  const byDepartment = new Map<string, BuiltPrimitive>();
  const byNode = new Map<string, BuiltPrimitive>();
  const deptTone = (id?: string) => {
    const d = id ? opts.catalog?.departments.find((x) => x.id === id) : undefined;
    return d ? pal.tone[d.tone] ?? pal.accent : pal.accent;
  };

  for (const p of layout.primitives) {
    if (opts.simplified && (p.kind === 'plant' || p.kind === 'armchair' || p.kind === 'sofa' || p.kind === 'table')) continue;
    const tone = p.color ? new Color(p.color) : deptTone(p.binding?.kind === 'department' ? p.binding.id : undefined);
    let obj: Group;
    let board: GlassBoard | undefined;
    switch (p.kind) {
      case 'desk':
        obj = createDesk(kit, { laptop: true, monitors: 0, chair: true, plant: !opts.simplified });
        break;
      case 'vault':
        obj = createVault(kit);
        break;
      case 'gate':
        obj = createGate(kit);
        break;
      case 'models':
        obj = createModelHub(kit);
        break;
      case 'kanban':
      case 'whiteboard':
      case 'board': {
        const glass = p.material !== 'plastic';
        board = createGlassBoard(kit, {
          width: p.scale.x,
          height: p.scale.y,
          edgeGlow: p.edgeGlow,
          opacity: glass ? p.opacity : 0.95,
          tint: glass ? '#e6f2ff' : '#ffffff',
          textureWidth: opts.boardTextureWidth,
          drawTexture: opts.drawBoard ? (ctx, w, h, palette) => opts.drawBoard!(p, ctx, w, h, palette) : undefined,
        });
        obj = board;
        break;
      }
      case 'plant':
        obj = createPlant(kit);
        break;
      case 'armchair':
        obj = createArmchair(kit);
        break;
      case 'sofa':
        obj = createSofa(kit);
        break;
      case 'table':
        obj = createSideTable(kit);
        break;
      case 'station':
      default: {
        obj = new Group();
        obj.add(createPlatform(kit, { radius: 1.05, color: tone }));
        if (!opts.simplified) {
          const eq = createEquipment(kit, p.equipment ?? 'desk', tone);
          eq.position.set(0, 0.06, -0.32);
          eq.scale.setScalar(0.92);
          obj.add(eq);
        }
        break;
      }
    }
    const [x, y, z] = planToWorld(layout, p.position);
    obj.position.set(x, y, z);
    obj.rotation.set(p.rotation.x * DEG, p.rotation.z * DEG, p.rotation.y * DEG, 'YXZ');
    if (p.kind !== 'kanban' && p.kind !== 'whiteboard' && p.kind !== 'board') obj.scale.set(p.scale.x, p.scale.z, p.scale.y);
    obj.name = `prim:${p.id}`;
    obj.userData.primitiveId = p.id;
    if (p.edgeGlow && !board) {
      const ring = new Mesh(kit.disc(Math.max(...FOOT[p.kind]) * 0.75, 48), kit.glowRing(p.edgeGlow, 0.7));
      ring.position.y = 0.012;
      ring.renderOrder = 2;
      obj.add(ring);
    }
    group.add(obj);
    obj.updateMatrixWorld(true);

    const ls = localSpots(p);
    const toWorld = (lx: number, lz: number, ly = 0) => obj.localToWorld(new Vector3(lx / (obj.scale.x || 1), ly, lz / (obj.scale.z || 1)));
    const center = obj.getWorldPosition(new Vector3());
    const focus = p.kind === 'desk' ? toWorld(0, 0) : center.clone();
    const spot = (lx: number, lz: number): Spot => {
      const w = toWorld(lx, lz);
      w.y = 0;
      return { p: w, yaw: Math.atan2(focus.x - w.x, focus.z - w.z) };
    };
    const anchor = toWorld(0, p.kind === 'station' ? -0.2 : 0, 0);
    anchor.y = ls.anchorY * (p.kind === 'kanban' || p.kind === 'whiteboard' || p.kind === 'board' ? 1 : obj.scale.y);
    const fp = FOOT[p.kind];
    const built: BuiltPrimitive = {
      prim: p,
      object: obj,
      world: center,
      anchor,
      spots: ls.agents.map(([a, b]) => spot(a, b)),
      deviceSpot: spot(...ls.device),
      seat: ls.seat ? { p: toWorld(ls.seat[0], ls.seat[1]).setY(0), yaw: obj.rotation.y + Math.PI } : undefined,
      board,
      footprint: { w: p.kind === 'kanban' || p.kind === 'whiteboard' || p.kind === 'board' ? p.scale.x : fp[0] * p.scale.x, d: fp[1] * p.scale.y },
      tone,
    };
    prims.set(p.id, built);
    if (p.binding?.kind === 'department' && !byDepartment.has(p.binding.id)) byDepartment.set(p.binding.id, built);
    if (p.binding?.kind === 'node' && !byNode.has(p.binding.id)) byNode.set(p.binding.id, built);
    for (const r of p.represents ?? []) if (!byNode.has(r)) byNode.set(r, built);

    // contact shadow
    const r = Math.max(fp[0] * p.scale.x, fp[1] * p.scale.y) * 0.5;
    if (p.kind !== 'station' && p.kind !== 'kanban' && p.kind !== 'whiteboard' && p.kind !== 'board') stage.contact.set(`prim:${p.id}`, center.x, center.z, r * 0.95, r * 0.95);
    // picking (before baking: the proxy uses the real meshes' bounds)
    if (opts.pickable !== false && p.binding) {
      const sel: PickSelection = { kind: p.binding.kind === 'department' ? 'department' : 'node', id: p.binding.id };
      stage.picker.add(obj, sel, 0.12);
    }
  }

  const bake = opts.bake === false ? null : bakeStatic(group);
  stage.root.add(group);
  const bounds = new Box3(new Vector3(-layout.room.width / 2, 0, -layout.room.depth / 2), new Vector3(layout.room.width / 2, 2.5, layout.room.depth / 2));
  stage.setShadowBounds(bounds);
  stage.rig.opts.bounds = bounds.clone().expandByVector(new Vector3(4, 0, 4));
  stage.rig.opts.bounds.min.y = 0;
  stage.rig.opts.bounds.max.y = 2;

  const resolve = (id: string): BuiltPrimitive | undefined => {
    const direct = byDepartment.get(id) ?? byNode.get(id) ?? prims.get(id);
    if (direct) return direct;
    const cat = opts.catalog;
    if (!cat) return undefined;
    const agent = cat.agents.find((a) => a.id === id);
    if (agent) return agent.departmentIds.map((d) => byDepartment.get(d)).find(Boolean);
    const n = cat.nodes.find((x) => x.id === id);
    if (!n) return undefined;
    const viaProvider = n.provider ? byNode.get(n.provider) : undefined;
    switch (n.kind) {
      case 'model':
      case 'provider':
        return viaProvider ?? [...prims.values()].find((b) => b.prim.kind === 'models');
      case 'mcp':
      case 'connector':
        return byDepartment.get('connectors');
      case 'skill':
        return byDepartment.get('skills');
      case 'database':
        return byDepartment.get('archive') ?? [...prims.values()].find((b) => b.prim.kind === 'vault');
      case 'queue':
        return [...prims.values()].find((b) => b.prim.kind === 'kanban');
      case 'user':
        return byDepartment.get('executive');
      default:
        return undefined;
    }
  };

  return { layout, group, room, prims, byDepartment, byNode, resolve, bounds, bake };
}
