/**
 * Draw-call economy.
 *
 *  - `mergeParts` builds one geometry from several transformed parts (used by
 *    factories so a robot torso + legs + feet is one mesh).
 *  - `bakeStatic` walks a subtree and merges every mesh flagged
 *    `userData.static = true` into one mesh per material (and line segments
 *    per line material). Groups, their transforms and their `userData`
 *    (selection, anchors) are kept, so picking proxies and labels still work.
 *
 * Merged geometries are owned by the returned meshes; `disposeObject` frees them.
 */
import { BufferAttribute, BufferGeometry, Color, Euler, LineSegments, Material, Matrix4, Mesh, Object3D, Quaternion, Vector3, type Texture } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv'];

/** Returns a non-indexed copy with only position/normal/uv (uv filled with zeros when missing). */
export function normalizeGeometry(g: BufferGeometry): BufferGeometry {
  const src = g.index ? g.toNonIndexed() : g.clone();
  for (const name of Object.keys(src.attributes)) if (!KEEP.includes(name)) src.deleteAttribute(name);
  if (!src.attributes.normal) src.computeVertexNormals();
  if (!src.attributes.uv) src.setAttribute('uv', new BufferAttribute(new Float32Array((src.attributes.position.count) * 2), 2));
  src.morphAttributes = {};
  src.clearGroups();
  return src;
}

export interface Part {
  geometry: BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number] | number;
}

const _m = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _e = new Euler();

export function partMatrix(p: Part, out = new Matrix4()) {
  _p.set(...(p.position ?? [0, 0, 0]));
  const r = p.rotation ?? [0, 0, 0];
  _q.setFromEuler(_e.set(r[0], r[1], r[2]));
  const sc = p.scale ?? 1;
  if (typeof sc === 'number') _s.setScalar(sc);
  else _s.set(...sc);
  return out.compose(_p, _q, _s);
}

/** Merges transformed parts into one geometry (caller owns the result). */
export function mergeParts(parts: Part[]): BufferGeometry {
  const list = parts.map((p) => {
    const g = normalizeGeometry(p.geometry);
    g.applyMatrix4(partMatrix(p, _m));
    return g;
  });
  const merged = mergeGeometries(list, false) ?? new BufferGeometry();
  for (const g of list) g.dispose();
  merged.computeBoundingSphere();
  merged.userData.owned = true;
  return merged;
}

/** Merges groups of parts, each painted with one colour (vertex colours). Use with `kit.vertexPlastic()`. */
export function mergeColoredParts(groups: Array<{ color: Color | string | number; parts: Part[] }>): BufferGeometry {
  const list: BufferGeometry[] = [];
  for (const grp of groups) {
    const c = new Color(grp.color);
    for (const p of grp.parts) {
      const g = normalizeGeometry(p.geometry);
      g.applyMatrix4(partMatrix(p, _m));
      const n = g.attributes.position.count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        arr[i * 3] = c.r;
        arr[i * 3 + 1] = c.g;
        arr[i * 3 + 2] = c.b;
      }
      g.setAttribute('color', new BufferAttribute(arr, 3));
      list.push(g);
    }
  }
  const merged = mergeGeometries(list, false) ?? new BufferGeometry();
  for (const g of list) g.dispose();
  merged.computeBoundingSphere();
  merged.userData.owned = true;
  return merged;
}

export interface BakeReport {
  meshesBefore: number;
  meshesAfter: number;
  linesBefore: number;
  linesAfter: number;
}

/**
 * Merges static meshes under `root` by material. Only meshes with
 * `userData.static === true` are touched. Materials that belong to the same
 * FAMILY (`material.userData.family`, set by the kit for plastics, mattes and
 * emissives that differ only by colour) are merged into ONE vertex-coloured
 * mesh. Returns counts for the perf report.
 */
export function bakeStatic(root: Object3D): BakeReport {
  root.updateMatrixWorld(true);
  const inv = new Matrix4().copy(root.matrixWorld).invert();
  type Bucket = { material: Material; geos: BufferGeometry[]; cast: boolean; receive: boolean; order: number; family?: string };
  const meshBuckets = new Map<string, Bucket>();
  const lineBuckets = new Map<string, Bucket>();
  const remove: Object3D[] = [];
  let meshesBefore = 0;
  let linesBefore = 0;
  root.traverse((o) => {
    if (o.userData.static !== true) return;
    const isMesh = (o as Mesh).isMesh && !(o as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh;
    const isLine = (o as LineSegments).isLineSegments;
    if (!isMesh && !isLine) return;
    const m = o as Mesh;
    if (Array.isArray(m.material)) return;
    const mat = m.material as Material;
    const local = new Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (isMesh) {
      meshesBefore++;
      const family = mat.userData.family as string | undefined;
      const k = family ? `family:${family}:${m.castShadow}:${m.receiveShadow}` : `${mat.uuid}:${m.castShadow}:${m.receiveShadow}`;
      let b = meshBuckets.get(k);
      if (!b) meshBuckets.set(k, (b = { material: mat, geos: [], cast: m.castShadow, receive: m.receiveShadow, order: m.renderOrder, family }));
      const g = normalizeGeometry(m.geometry);
      g.applyMatrix4(local);
      if (family) {
        const c = (mat as Material & { color?: Color }).color ?? new Color(1, 1, 1);
        const n = g.attributes.position.count;
        const arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          arr[i * 3] = c.r;
          arr[i * 3 + 1] = c.g;
          arr[i * 3 + 2] = c.b;
        }
        g.setAttribute('color', new BufferAttribute(arr, 3));
      }
      b.geos.push(g);
    } else {
      linesBefore++;
      const k = mat.uuid;
      let b = lineBuckets.get(k);
      if (!b) lineBuckets.set(k, (b = { material: mat, geos: [], cast: false, receive: false, order: m.renderOrder }));
      const g = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
      for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
      g.applyMatrix4(local);
      b.geos.push(g);
    }
    remove.push(o);
  });
  for (const o of remove) {
    o.removeFromParent();
    if ((o as Mesh).geometry?.userData.owned) (o as Mesh).geometry.dispose();
  }
  const group = new Object3D();
  group.name = 'baked';
  for (const b of meshBuckets.values()) {
    const g = mergeGeometries(b.geos, false);
    for (const x of b.geos) x.dispose();
    if (!g) continue;
    g.userData.owned = true;
    g.computeBoundingSphere();
    let material = b.material;
    if (b.family) {
      material = b.material.clone();
      (material as Material & { color?: Color }).color?.set(1, 1, 1);
      material.vertexColors = true;
      material.name = `${b.family}:vc`;
      material.userData = { owned: true, family: b.family };
    }
    const mesh = new Mesh(g, material);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.receive;
    mesh.renderOrder = b.order;
    mesh.matrixAutoUpdate = false;
    mesh.userData.baked = true;
    group.add(mesh);
  }
  for (const b of lineBuckets.values()) {
    const g = mergeGeometries(b.geos, false);
    for (const x of b.geos) x.dispose();
    if (!g) continue;
    g.userData.owned = true;
    const l = new LineSegments(g, b.material);
    l.renderOrder = b.order;
    l.matrixAutoUpdate = false;
    l.userData.baked = true;
    group.add(l);
  }
  root.add(group);
  return { meshesBefore, meshesAfter: meshBuckets.size, linesBefore, linesAfter: lineBuckets.size };
}

/** Frees geometries/materials/textures under `root` that are not shared kit resources (owned flag) — or everything with `all`. */
export function disposeObject(root: Object3D, all = false) {
  const geos = new Set<BufferGeometry>();
  const mats = new Set<Material>();
  const texs = new Set<Texture>();
  root.traverse((o) => {
    const m = o as Mesh;
    if (m.geometry && (all || m.geometry.userData.owned)) geos.add(m.geometry);
    const list = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    for (const mat of list) {
      if (!all && !mat.userData.owned) continue;
      mats.add(mat);
      for (const v of Object.values(mat)) if (v && (v as Texture).isTexture) texs.add(v as Texture);
    }
  });
  for (const g of geos) g.dispose();
  for (const m of mats) m.dispose();
  for (const t of texs) t.dispose();
}

/** Marks every mesh/line under `o` as static (mergeable). */
export function markStatic<T extends Object3D>(o: T, value = true): T {
  o.traverse((c) => {
    if ((c as Mesh).isMesh || (c as LineSegments).isLineSegments) c.userData.static = value;
  });
  return o;
}
