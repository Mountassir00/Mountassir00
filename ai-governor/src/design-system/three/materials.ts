/**
 * Shared materials, geometries and small procedural textures.
 *
 * Everything is cached by key, so a scene with 30 desks still uses one wood
 * material and one desk-top geometry. The kit owns what it creates and frees
 * it in `dispose()`. Texture memory is tracked (`textureBytes`) so views can
 * check the ≤ 1 MB budget.
 */
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, CircleGeometry, Color, CylinderGeometry, DoubleSide,
  LinearFilter, LineBasicMaterial, Material, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, NormalBlending, PlaneGeometry,
  RepeatWrapping, SphereGeometry, SRGBColorSpace, Texture, TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { ScenePalette } from './theme';

export type ColorLike = Color | string | number;

const key = (c: ColorLike) => (c instanceof Color ? `#${c.getHexString()}` : typeof c === 'number' ? `#${c.toString(16).padStart(6, '0')}` : c);
const col = (c: ColorLike) => (c instanceof Color ? c.clone() : new Color(c));

export interface KitOptions {
  /** Procedural textures (wood grain, screens). Off at minimal/eco. */
  textures: boolean;
  /** Geometry smoothness: 'low' halves segment counts. */
  detail: 'low' | 'normal';
}

export class MaterialKit {
  palette: ScenePalette;
  opts: KitOptions;
  private mats = new Map<string, Material>();
  private geos = new Map<string, BufferGeometry>();
  private texs = new Map<string, Texture>();
  /** Materials whose colour follows the theme (re-tinted by `setPalette`). */
  private themed: Array<(p: ScenePalette) => void> = [];

  constructor(palette: ScenePalette, opts: Partial<KitOptions> = {}) {
    this.palette = palette;
    this.opts = { textures: opts.textures ?? true, detail: opts.detail ?? 'normal' };
  }

  get dark() {
    return this.palette.scheme === 'dark';
  }

  /** Re-tints theme-dependent materials in place (no rebuild). */
  setPalette(p: ScenePalette) {
    this.palette = p;
    for (const f of this.themed) f(p);
  }

  private cached<T extends Material>(k: string, make: () => T): T {
    let m = this.mats.get(k) as T | undefined;
    if (!m) {
      m = make();
      m.name = k;
      this.mats.set(k, m);
    }
    return m;
  }

  /** Registers a material whose colour depends on the theme. */
  themedMaterial<T extends Material>(k: string, make: () => T, apply: (m: T, p: ScenePalette) => void): T {
    const existing = this.mats.get(k) as T | undefined;
    if (existing) return existing;
    const m = this.cached(k, make);
    // themed colours change at runtime: never merge them into vertex colours
    delete m.userData.family;
    apply(m, this.palette);
    this.themed.push((p) => {
      apply(m, p);
      m.needsUpdate = true;
    });
    return m;
  }

  /* ---------------- materials ---------------- */

  /** Glossy "designer toy" plastic. */
  plastic(color: ColorLike, opts: { roughness?: number; clearcoat?: number } = {}): MeshPhysicalMaterial {
    const r = opts.roughness ?? 0.36;
    const cc = opts.clearcoat ?? 0.55;
    return this.cached(`plastic:${key(color)}:${r}:${cc}`, () => {
      const m = new MeshPhysicalMaterial({ color: col(color), roughness: r, metalness: 0, clearcoat: cc, clearcoatRoughness: 0.28 });
      m.userData.family = `plastic:${r <= 0.3 ? 'gloss' : r <= 0.5 ? 'satin' : 'soft'}`;
      return m;
    });
  }

  /** Glossy plastic whose colour comes from vertex colours (multi-colour parts in one draw call). */
  vertexPlastic(roughness = 0.3, clearcoat = 0.8): MeshPhysicalMaterial {
    return this.cached(`vplastic:${roughness}:${clearcoat}`, () => new MeshPhysicalMaterial({ color: '#ffffff', vertexColors: true, roughness, metalness: 0, clearcoat, clearcoatRoughness: 0.2 }));
  }

  /** Matte painted surface (walls, fabric, soil). */
  matte(color: ColorLike, roughness = 0.85): MeshStandardMaterial {
    return this.cached(`matte:${key(color)}:${roughness}`, () => {
      const m = new MeshStandardMaterial({ color: col(color), roughness, metalness: 0 });
      m.userData.family = 'matte';
      return m;
    });
  }

  /** Metals: brushed (vault, gate), dark (chair base, racks), chrome (handles). */
  metal(tone: 'brushed' | 'dark' | 'chrome' = 'brushed'): MeshPhysicalMaterial {
    return this.cached(`metal:${tone}`, () => {
      const base = tone === 'dark' ? '#3a3d44' : tone === 'chrome' ? '#e9ecf1' : '#c9cdd4';
      const m = new MeshPhysicalMaterial({ color: base, metalness: 1, roughness: tone === 'chrome' ? 0.16 : tone === 'dark' ? 0.42 : 0.3 });
      if (tone === 'brushed') {
        m.anisotropy = 0.7;
        m.anisotropyRotation = Math.PI / 2;
      }
      return m;
    });
  }

  /** Clear or tinted glass (no transmission pass: cheap transparency + clearcoat reflections). */
  glass(tint: ColorLike = '#dff3ff', opacity = 0.22): MeshPhysicalMaterial {
    return this.themedMaterial(
      `glass:${key(tint)}:${opacity}`,
      () => new MeshPhysicalMaterial({ color: col(tint), metalness: 0, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, depthWrite: false, side: DoubleSide }),
      (m, p) => {
        m.opacity = p.scheme === 'dark' ? opacity * 0.75 : opacity;
      },
    );
  }

  /** Warm walnut-like wood, with a tiny procedural grain when textures are on. */
  wood(tone: 'walnut' | 'oak' = 'walnut'): MeshStandardMaterial {
    return this.cached(`wood:${tone}:${this.opts.textures}`, () => {
      const m = new MeshStandardMaterial({ color: tone === 'walnut' ? '#8a5a3c' : '#c79a6b', roughness: 0.55, metalness: 0 });
      if (this.opts.textures) m.map = this.woodGrain();
      return m;
    });
  }

  /** Unlit glowing surface (screens, LEDs, eyes). Not affected by tone mapping so it stays vivid. */
  emissive(color: ColorLike, opacity = 1): MeshBasicMaterial {
    return this.cached(`emissive:${key(color)}:${opacity}`, () => {
      const m = new MeshBasicMaterial({ color: col(color), toneMapped: false, transparent: opacity < 1, opacity });
      if (opacity >= 1) m.userData.family = 'emissive';
      return m;
    });
  }

  /** Soft halo (radial gradient), additive on dark floors, normal blending on light ones. */
  glowDisc(color: ColorLike, strength = 1): MeshBasicMaterial {
    return this.themedMaterial(
      `glow:${key(color)}:${strength}`,
      () => new MeshBasicMaterial({ color: col(color), map: this.gradient(), transparent: true, depthWrite: false, toneMapped: false }),
      (m, p) => {
        m.blending = p.scheme === 'dark' ? AdditiveBlending : NormalBlending;
        m.opacity = (p.scheme === 'dark' ? 0.75 : 0.42) * strength;
      },
    );
  }

  /** Flat glowing ring (bright rim, soft inside) — one draw call, used under consoles and drones. */
  glowRing(color: ColorLike, strength = 1): MeshBasicMaterial {
    return this.themedMaterial(
      `glowring:${key(color)}:${strength}`,
      () => new MeshBasicMaterial({ color: col(color), map: this.ringGradient(), transparent: true, depthWrite: false, toneMapped: false }),
      (m, p) => {
        m.blending = p.scheme === 'dark' ? AdditiveBlending : NormalBlending;
        m.opacity = Math.min(1, (p.scheme === 'dark' ? 0.95 : 0.8) * strength);
      },
    );
  }

  /** Line colour (room edges, board edges). */
  line(color: ColorLike, opacity = 1): LineBasicMaterial {
    return this.cached(`line:${key(color)}:${opacity}`, () => new LineBasicMaterial({ color: col(color), transparent: opacity < 1, opacity, toneMapped: false }));
  }

  /** Material for invisible picking proxies (never rendered). */
  get proxy(): MeshBasicMaterial {
    return this.cached('proxy', () => new MeshBasicMaterial({ visible: false }));
  }

  /* ---------------- geometries ---------------- */

  geo<T extends BufferGeometry>(k: string, make: () => T): T {
    let g = this.geos.get(k) as T | undefined;
    if (!g) {
      g = make();
      this.geos.set(k, g);
    }
    return g;
  }

  private seg(n: number) {
    return this.opts.detail === 'low' ? Math.max(3, Math.round(n / 2)) : n;
  }

  roundedBox(w: number, h: number, d: number, r = 0.04, segments = 3) {
    const s = this.opts.detail === 'low' ? 1 : segments;
    return this.geo(`rbox:${w}:${h}:${d}:${r}:${s}`, () => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2, h / 2, d / 2)));
  }
  box(w: number, h: number, d: number) {
    return this.geo(`box:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d));
  }
  cylinder(rt: number, rb: number, h: number, radial = 24, open = false) {
    const r = this.seg(radial);
    return this.geo(`cyl:${rt}:${rb}:${h}:${r}:${open}`, () => new CylinderGeometry(rt, rb, h, r, 1, open));
  }
  sphere(r: number, ws = 24, hs = 16, phiStart = 0, phiLen = Math.PI * 2, thetaStart = 0, thetaLen = Math.PI) {
    const w = this.seg(ws);
    const h = this.seg(hs);
    return this.geo(`sph:${r}:${w}:${h}:${phiStart}:${phiLen}:${thetaStart}:${thetaLen}`, () => new SphereGeometry(r, w, h, phiStart, phiLen, thetaStart, thetaLen));
  }
  capsule(r: number, len: number, cap = 6, radial = 16) {
    const c = this.seg(cap);
    const rs = this.seg(radial);
    return this.geo(`cap:${r}:${len}:${c}:${rs}`, () => new CapsuleGeometry(r, len, c, rs));
  }
  torus(r: number, tube: number, radial = 10, tubular = 48, arc = Math.PI * 2) {
    const a = this.seg(radial);
    const b = this.seg(tubular);
    return this.geo(`tor:${r}:${tube}:${a}:${b}:${arc}`, () => new TorusGeometry(r, tube, a, b, arc));
  }
  plane(w: number, h: number) {
    return this.geo(`plane:${w}:${h}`, () => new PlaneGeometry(w, h));
  }
  disc(r: number, segs = 48) {
    const s = this.seg(segs);
    return this.geo(`disc:${r}:${s}`, () => new CircleGeometry(r, s).rotateX(-Math.PI / 2));
  }

  /* ---------------- textures ---------------- */

  /** Bytes of texture data created by the kit (budget tracking). */
  get textureBytes(): number {
    let n = 0;
    for (const t of this.texs.values()) {
      const img = t.image as { width?: number; height?: number } | undefined;
      if (img?.width && img?.height) n += img.width * img.height * 4 * (t.generateMipmaps ? 4 / 3 : 1);
    }
    return Math.round(n);
  }

  /** Registers an externally created texture so it is counted and disposed with the kit. */
  track(k: string, t: Texture) {
    this.texs.get(k)?.dispose();
    this.texs.set(k, t);
    return t;
  }
  untrack(k: string) {
    this.texs.get(k)?.dispose();
    this.texs.delete(k);
  }

  /** White radial gradient (alpha falloff) shared by halos, glow discs and contact shadows. 64×64. */
  gradient(): Texture {
    let t = this.texs.get('gradient');
    if (!t) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      rg.addColorStop(0.7, 'rgba(255,255,255,0.14)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 64, 64);
      t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace;
      this.texs.set('gradient', t);
    }
    return t;
  }

  /** Ring-shaped gradient (bright rim, soft inside) for glow rings under robots. 64×64. */
  ringGradient(): Texture {
    let t = this.texs.get('ring');
    if (!t) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d')!;
      const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(255,255,255,0.10)');
      rg.addColorStop(0.55, 'rgba(255,255,255,0.28)');
      rg.addColorStop(0.72, 'rgba(255,255,255,0.95)');
      rg.addColorStop(0.8, 'rgba(255,255,255,0.4)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, 64, 64);
      t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace;
      this.texs.set('ring', t);
    }
    return t;
  }

  /** 32×128 wood grain (tiled). */
  woodGrain(): Texture {
    let t = this.texs.get('wood');
    if (!t) {
      const c = document.createElement('canvas');
      c.width = 32;
      c.height = 128;
      const g = c.getContext('2d')!;
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 32, 128);
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * 32;
        g.strokeStyle = `rgba(80,45,20,${0.06 + rnd() * 0.12})`;
        g.lineWidth = 0.6 + rnd() * 1.6;
        g.beginPath();
        g.moveTo(x, 0);
        for (let y = 0; y <= 128; y += 16) g.lineTo(x + Math.sin(y / 18 + i) * 1.6, y);
        g.stroke();
      }
      t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace;
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(3, 1);
      this.texs.set('wood', t);
    }
    return t;
  }

  /** 128×80 code-editor screen (laptop / monitors), theme independent (dark editor). */
  codeScreen(): Texture {
    let t = this.texs.get('code');
    if (!t) {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 80;
      const g = c.getContext('2d')!;
      g.fillStyle = '#0f1420';
      g.fillRect(0, 0, 128, 80);
      const cols = ['#7aa2ff', '#c792ea', '#9ece6a', '#e0af68', '#7dcfff', '#a9b1d6'];
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let y = 6; y < 76; y += 6) {
        let x = 6 + Math.floor(rnd() * 3) * 6;
        const n = 1 + Math.floor(rnd() * 4);
        for (let k = 0; k < n && x < 118; k++) {
          const w = 6 + rnd() * 26;
          g.fillStyle = cols[Math.floor(rnd() * cols.length)];
          g.fillRect(x, y, Math.min(w, 122 - x), 2.4);
          x += w + 4;
        }
      }
      t = new CanvasTexture(c);
      t.colorSpace = SRGBColorSpace;
      t.minFilter = LinearFilter;
      t.generateMipmaps = false;
      this.texs.set('code', t);
    }
    return t;
  }

  /** Screen material using the code texture. */
  screen(): MeshBasicMaterial {
    return this.cached(`screen:${this.opts.textures}`, () => new MeshBasicMaterial({ color: this.opts.textures ? '#ffffff' : '#1b2233', map: this.opts.textures ? this.codeScreen() : null, toneMapped: false }));
  }

  dispose() {
    for (const m of this.mats.values()) m.dispose();
    for (const g of this.geos.values()) g.dispose();
    for (const t of this.texs.values()) t.dispose();
    this.mats.clear();
    this.geos.clear();
    this.texs.clear();
    this.themed = [];
  }
}

/** Utility: a mesh part descriptor used by factories before merging. */
export function paintKey(c: ColorLike) {
  return key(c);
}
