/**
 * HQ-specific props, drawn here (the kit has the generic ones): treadmills and
 * a weight rack for the test gym, a table football and a bar for the lounge,
 * a reception counter, a long meeting table, rugs, floor lamps, ceiling lamps.
 * Everything is static (merged by `bakeStatic`), built around its floor
 * centre and facing +Z like the kit's factories.
 */
import { THREE, mergeParts, type ColorLike, type MaterialKit } from '@ds/three';

type V3 = [number, number, number];
type Part = Parameters<typeof mergeParts>[0][number];

function add(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, position: V3 = [0, 0, 0], rotation: V3 = [0, 0, 0], opts: { cast?: boolean; receive?: boolean } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.castShadow = opts.cast ?? true;
  m.receiveShadow = opts.receive ?? true;
  m.userData.static = true;
  parent.add(m);
  return m;
}

function merged(kit: MaterialKit, parent: THREE.Object3D, key: string, material: THREE.Material, parts: () => Part[], opts?: { cast?: boolean; receive?: boolean }) {
  return add(parent, kit.geo(`hq:${key}`, () => mergeParts(parts())), material, [0, 0, 0], [0, 0, 0], opts);
}

/** Treadmill (test gym): the user stands on the belt facing −Z, console at the back. Belt top ≈ 0.16 m. */
export function createTreadmill(kit: MaterialKit, tone: ColorLike): THREE.Group {
  const g = new THREE.Group();
  g.name = 'treadmill';
  const dark = kit.plastic('#22262f', { roughness: 0.35, clearcoat: 0.5 });
  merged(kit, g, 'tread:base', dark, () => [
    { geometry: kit.roundedBox(0.82, 0.12, 1.75, 0.05), position: [0, 0.06, 0] },
    { geometry: kit.roundedBox(0.07, 1.15, 0.07, 0.03), position: [-0.36, 0.62, -0.72], rotation: [0.18, 0, 0] },
    { geometry: kit.roundedBox(0.07, 1.15, 0.07, 0.03), position: [0.36, 0.62, -0.72], rotation: [0.18, 0, 0] },
    { geometry: kit.roundedBox(0.8, 0.26, 0.16, 0.05), position: [0, 1.18, -0.84], rotation: [-0.5, 0, 0] },
  ]);
  add(g, kit.roundedBox(0.62, 0.025, 1.45, 0.012, 1), kit.matte('#3a3f4a', 0.9), [0, 0.13, 0.08], [0, 0, 0], { cast: false });
  merged(kit, g, 'tread:rails', kit.metal('chrome'), () => [
    { geometry: kit.cylinder(0.02, 0.02, 0.55, 8), position: [-0.37, 1.02, -0.45], rotation: [Math.PI / 2, 0, 0] },
    { geometry: kit.cylinder(0.02, 0.02, 0.55, 8), position: [0.37, 1.02, -0.45], rotation: [Math.PI / 2, 0, 0] },
  ]);
  add(g, kit.roundedBox(0.5, 0.12, 0.02, 0.01, 1), kit.emissive(tone), [0, 1.22, -0.76], [-0.5, 0, 0], { cast: false });
  return g;
}

/** Weight rack with coloured plates. */
export function createWeightRack(kit: MaterialKit, tone: ColorLike): THREE.Group {
  const g = new THREE.Group();
  g.name = 'weight-rack';
  merged(kit, g, 'rack:frame', kit.metal('dark'), () => [
    { geometry: kit.roundedBox(1.3, 0.05, 0.42, 0.02), position: [0, 0.03, 0] },
    { geometry: kit.roundedBox(0.06, 1.0, 0.06, 0.02), position: [-0.6, 0.5, 0] },
    { geometry: kit.roundedBox(0.06, 1.0, 0.06, 0.02), position: [0.6, 0.5, 0] },
    { geometry: kit.cylinder(0.022, 0.022, 1.32, 10), position: [0, 0.92, 0], rotation: [0, 0, Math.PI / 2] },
    { geometry: kit.cylinder(0.018, 0.018, 1.2, 10), position: [0, 0.5, 0.05], rotation: [0, 0, Math.PI / 2] },
  ]);
  merged(kit, g, 'rack:plates', kit.plastic(tone, { roughness: 0.45 }), () => [
    { geometry: kit.cylinder(0.2, 0.2, 0.06, 24), position: [-0.48, 0.92, 0], rotation: [0, 0, Math.PI / 2] },
    { geometry: kit.cylinder(0.2, 0.2, 0.06, 24), position: [0.48, 0.92, 0], rotation: [0, 0, Math.PI / 2] },
    { geometry: kit.cylinder(0.14, 0.14, 0.05, 20), position: [-0.4, 0.5, 0.05], rotation: [0, 0, Math.PI / 2] },
    { geometry: kit.cylinder(0.14, 0.14, 0.05, 20), position: [0.4, 0.5, 0.05], rotation: [0, 0, Math.PI / 2] },
  ]);
  return g;
}

/** Table football (lounge). */
export function createTableFootball(kit: MaterialKit): THREE.Group {
  const g = new THREE.Group();
  g.name = 'table-football';
  add(g, kit.roundedBox(1.25, 0.24, 0.72, 0.04), kit.wood('oak'), [0, 0.8, 0]);
  add(g, kit.roundedBox(1.12, 0.02, 0.6, 0.01, 1), kit.matte('#3f9a5b', 0.8), [0, 0.92, 0], [0, 0, 0], { cast: false });
  merged(kit, g, 'foot:legs', kit.metal('dark'), () =>
    ([[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.3], [0.55, 0.3]] as Array<[number, number]>).map(([x, z]) => ({ geometry: kit.roundedBox(0.07, 0.7, 0.07, 0.02, 1), position: [x, 0.35, z] as V3 })),
  );
  merged(kit, g, 'foot:rods', kit.metal('chrome'), () => [-0.45, -0.15, 0.15, 0.45].map((x) => ({ geometry: kit.cylinder(0.012, 0.012, 1.0, 6), position: [x, 0.97, 0] as V3, rotation: [Math.PI / 2, 0, 0] as V3 })));
  merged(kit, g, 'foot:red', kit.plastic('#e05a5a', { roughness: 0.4 }), () => [-0.45, 0.15].flatMap((x) => [-0.18, 0.18].map((z) => ({ geometry: kit.roundedBox(0.05, 0.12, 0.04, 0.015, 1), position: [x, 0.95, z] as V3 }))));
  merged(kit, g, 'foot:blue', kit.plastic('#4f7df0', { roughness: 0.4 }), () => [-0.15, 0.45].flatMap((x) => [-0.18, 0.18].map((z) => ({ geometry: kit.roundedBox(0.05, 0.12, 0.04, 0.015, 1), position: [x, 0.95, z] as V3 }))));
  return g;
}

/** Bar counter with three stools (lounge), front at +Z. */
export function createBar(kit: MaterialKit, tone: ColorLike, width = 2.2): THREE.Group {
  const g = new THREE.Group();
  g.name = 'bar';
  add(g, kit.roundedBox(width, 1.0, 0.55, 0.05), kit.plastic(tone, { roughness: 0.5, clearcoat: 0.2 }), [0, 0.5, 0]);
  add(g, kit.roundedBox(width + 0.12, 0.05, 0.68, 0.02), kit.wood('oak'), [0, 1.03, 0.04]);
  merged(kit, g, `bar:stools:${width}`, kit.metal('dark'), () =>
    [-1, 0, 1].flatMap((i) => [
      { geometry: kit.cylinder(0.025, 0.025, 0.7, 8), position: [i * (width / 3), 0.35, 0.6] as V3 },
      { geometry: kit.cylinder(0.16, 0.18, 0.02, 16), position: [i * (width / 3), 0.01, 0.6] as V3 },
    ]),
  );
  merged(kit, g, `bar:seats:${width}`, kit.plastic('#f1f1f3', { roughness: 0.55 }), () => [-1, 0, 1].map((i) => ({ geometry: kit.cylinder(0.19, 0.17, 0.06, 18), position: [i * (width / 3), 0.73, 0.6] as V3 })));
  // espresso machine
  add(g, kit.roundedBox(0.36, 0.32, 0.3, 0.04), kit.metal('brushed'), [-width / 2 + 0.35, 1.22, -0.06]);
  return g;
}

/** Reception counter (curved front faces −Z: visitors come from the entrance). */
export function createReceptionDesk(kit: MaterialKit, tone: ColorLike): THREE.Group {
  const g = new THREE.Group();
  g.name = 'reception-desk';
  const shell = kit.plastic('#f4f5f8', { roughness: 0.35 });
  merged(kit, g, 'rec:body', shell, () => [
    { geometry: kit.roundedBox(2.4, 1.05, 0.5, 0.08), position: [0, 0.525, 0] },
    { geometry: kit.roundedBox(0.5, 1.05, 1.1, 0.08), position: [-1.2, 0.525, 0.35] },
  ]);
  add(g, kit.roundedBox(2.5, 0.05, 0.62, 0.02), kit.wood('oak'), [0, 1.08, 0]);
  add(g, kit.roundedBox(2.36, 0.05, 0.02, 0.01, 1), kit.emissive(tone), [0, 0.32, -0.26], [0, 0, 0], { cast: false });
  // screen for the receptionist
  add(g, kit.roundedBox(0.5, 0.31, 0.025, 0.01, 1), kit.plastic('#1b1f28', { roughness: 0.25 }), [0.5, 1.3, 0.12], [0, Math.PI, 0]);
  add(g, kit.plane(0.46, 0.27), kit.screen(), [0.5, 1.3, 0.134], [0, 0, 0], { cast: false });
  return g;
}

/** Long meeting table with six chairs (chairs at ±Z). */
export function createMeetingTable(kit: MaterialKit, length = 3.4): THREE.Group {
  const g = new THREE.Group();
  g.name = 'meeting-table';
  add(g, kit.roundedBox(length, 0.06, 1.15, 0.04), kit.wood('walnut'), [0, 0.74, 0]);
  merged(kit, g, `meet:legs:${length}`, kit.metal('dark'), () => [
    { geometry: kit.roundedBox(0.08, 0.72, 0.8, 0.02, 1), position: [-length / 2 + 0.35, 0.36, 0] },
    { geometry: kit.roundedBox(0.08, 0.72, 0.8, 0.02, 1), position: [length / 2 - 0.35, 0.36, 0] },
  ]);
  return g;
}

/** Flat rug / gym mat. */
export function createRug(kit: MaterialKit, w: number, d: number, color: ColorLike): THREE.Mesh {
  const m = new THREE.Mesh(kit.roundedBox(w, 0.02, d, 0.01, 1), kit.matte(color, 0.95));
  m.position.y = 0.01;
  m.receiveShadow = true;
  m.userData.static = true;
  return m;
}

/** Standing lamp; the shade glows (always unlit; reads as "on" in the evening). */
export function createFloorLamp(kit: MaterialKit, glow: ColorLike): THREE.Group {
  const g = new THREE.Group();
  g.name = 'floor-lamp';
  merged(kit, g, 'lamp:stand', kit.metal('dark'), () => [
    { geometry: kit.cylinder(0.16, 0.18, 0.03, 18), position: [0, 0.015, 0] },
    { geometry: kit.cylinder(0.015, 0.015, 1.45, 8), position: [0, 0.74, 0] },
  ]);
  add(g, kit.cylinder(0.16, 0.22, 0.24, 20, true), kit.emissive(glow), [0, 1.5, 0], [0, 0, 0], { cast: false });
  return g;
}

/** Wall-mounted TV (lounge). */
export function createWallScreen(kit: MaterialKit): THREE.Group {
  const g = new THREE.Group();
  add(g, kit.roundedBox(1.5, 0.86, 0.05, 0.02, 1), kit.plastic('#14171e', { roughness: 0.2, clearcoat: 0.9 }), [0, 1.55, 0]);
  add(g, kit.plane(1.42, 0.78), kit.screen(), [0, 1.55, 0.027], [0, 0, 0], { cast: false });
  return g;
}

/** Low cabinet (desk side, archives…), front at +Z. */
export function createCabinet(kit: MaterialKit, tone: ColorLike, w = 1.2): THREE.Group {
  const g = new THREE.Group();
  add(g, kit.roundedBox(w, 0.72, 0.45, 0.04), kit.plastic('#f2f3f6', { roughness: 0.4 }), [0, 0.36, 0]);
  add(g, kit.geo(`hq:cab:handles:${w}`, () => mergeParts([-1, 1].map((s) => ({ geometry: kit.roundedBox(0.16, 0.02, 0.02, 0.008, 1), position: [s * w * 0.25, 0.55, 0.235] as V3 })))), kit.plastic(tone, { roughness: 0.4 }));
  return g;
}
