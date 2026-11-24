/**
 * Picking: a raycaster tests a short list of invisible proxy boxes (one per
 * pickable object, attached to it so it follows its moves). Proxies are never
 * rendered (no draw call) and give generous, stable hit areas even after the
 * static geometry has been merged.
 *
 * The selected object carries `userData.selection = { kind, id }`.
 */
import { Box3, Matrix4, Mesh, Object3D, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { MaterialKit } from './materials';

export interface PickSelection {
  kind: 'agent' | 'node' | 'department';
  id: string;
}

export interface PickHit {
  selection: PickSelection;
  object: Object3D;
  point: Vector3;
}

const _box = new Box3();
const _inv = new Matrix4();

export class Picker {
  private proxies: Mesh[] = [];
  private ray = new Raycaster();
  private ndc = new Vector2();
  private kit: MaterialKit;
  hovered: PickHit | null = null;

  constructor(kit: MaterialKit) {
    this.kit = kit;
  }

  /**
   * Makes `object` pickable. The proxy is the object's local bounding box,
   * optionally padded (metres) so small items are easy to hit.
   */
  add(object: Object3D, selection: PickSelection, pad = 0.08): Mesh {
    this.remove(object);
    object.userData.selection = selection;
    object.updateMatrixWorld(true);
    _box.makeEmpty();
    _inv.copy(object.matrixWorld).invert();
    object.traverse((c) => {
      const m = c as Mesh;
      if (!m.isMesh || !m.geometry || c.userData.pickProxy) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      const b = m.geometry.boundingBox!.clone().applyMatrix4(new Matrix4().multiplyMatrices(_inv, m.matrixWorld));
      _box.union(b);
    });
    if (_box.isEmpty()) _box.set(new Vector3(-0.4, 0, -0.4), new Vector3(0.4, 1, 0.4));
    _box.expandByScalar(pad);
    const size = _box.getSize(new Vector3());
    const center = _box.getCenter(new Vector3());
    const proxy = new Mesh(this.kit.box(1, 1, 1), this.kit.proxy);
    proxy.scale.copy(size);
    proxy.position.copy(center);
    proxy.userData.pickProxy = true;
    proxy.userData.target = object;
    object.add(proxy);
    this.proxies.push(proxy);
    return proxy;
  }

  remove(object: Object3D) {
    const keep: Mesh[] = [];
    for (const p of this.proxies) {
      if (p.userData.target === object) p.removeFromParent();
      else keep.push(p);
    }
    this.proxies = keep;
  }

  clear() {
    for (const p of this.proxies) p.removeFromParent();
    this.proxies = [];
    this.hovered = null;
  }

  /** Raycasts at canvas-local CSS pixel coordinates. */
  pick(x: number, y: number, w: number, h: number, camera: Camera): PickHit | null {
    this.ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    this.ray.setFromCamera(this.ndc, camera);
    const visible = this.proxies.filter((p) => isShown(p.userData.target as Object3D));
    const hits = this.ray.intersectObjects(visible, false);
    const h0 = hits[0];
    if (!h0) return null;
    const target = h0.object.userData.target as Object3D;
    return { selection: target.userData.selection as PickSelection, object: target, point: h0.point.clone() };
  }

  /** Finds the object registered for a selection. */
  find(sel: PickSelection | null | undefined): Object3D | null {
    if (!sel) return null;
    const p = this.proxies.find((x) => {
      const s = (x.userData.target as Object3D).userData.selection as PickSelection;
      return s.kind === sel.kind && s.id === sel.id;
    });
    return p ? (p.userData.target as Object3D) : null;
  }

  get count() {
    return this.proxies.length;
  }
}

function isShown(o: Object3D | null): boolean {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

export const sameSelection = (a: PickSelection | null | undefined, b: PickSelection | null | undefined) => !!a && !!b && a.kind === b.kind && a.id === b.id;
