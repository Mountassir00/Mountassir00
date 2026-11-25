import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ExperienceRegistry, ops, exportBundle, importBundle, pickExperience } from '../../src/engine/registry';
import { DEFAULT_PREFS, type Prefs } from '../../src/engine/prefs';
import { BUILTIN_THEMES, validateTheme, themeToCssVars } from '../../src/engine/themes';
import { manifestSchema, sanitizeOverrides } from '../../src/engine/manifest';
import { resolveQuality } from '../../src/engine/quality';
import { BUILTIN_EXPERIENCES } from '../../src/experiences';

const fresh = (): Prefs => structuredClone(DEFAULT_PREFS);
function reg() {
  const r = new ExperienceRegistry();
  for (const d of BUILTIN_EXPERIENCES) r.register(d);
  return r;
}

describe('experience manifests', () => {
  it('every built-in manifest is valid and ids are unique', () => {
    const ids = new Set<string>();
    for (const d of BUILTIN_EXPERIENCES) {
      expect(manifestSchema.safeParse(d.manifest).success).toBe(true);
      expect(ids.has(d.manifest.id)).toBe(false);
      ids.add(d.manifest.id);
    }
    // The retained set (the user's favourites); adding a folder adds a view.
    for (const id of ['control-center', 'spatial-workspace', 'kanban', 'ai-office', 'system-map']) expect(ids.has(id)).toBe(true);
  });
  it('registry refuses an invalid manifest', () => {
    const r = new ExperienceRegistry();
    expect(() => r.register({ manifest: { ...BUILTIN_EXPERIENCES[0].manifest, id: 'BAD ID' }, load: BUILTIN_EXPERIENCES[0].load })).toThrow();
  });
  it('overrides are clamped to declared params only', () => {
    const m = BUILTIN_EXPERIENCES.find((d) => d.manifest.id === 'ai-office')!.manifest;
    const clean = sanitizeOverrides(m, { roomSize: 99, unknown: 'x', showLabels: 'yes', figureScale: 1.2 });
    expect(clean).toEqual({ roomSize: 7, figureScale: 1.2 });
  });
});

describe('registry lifecycle (pure ops on preferences)', () => {
  it('duplicate → customize → publish → remove a variant', () => {
    const r = reg();
    let p = fresh();
    const base = r.resolve('ai-office', p)!;
    const d = ops.duplicate(p, base, 'Bureau du soir');
    p = d.prefs;
    let v = r.resolve(d.id, p)!;
    expect(v.origin).toBe('variant');
    expect(v.variant?.status).toBe('draft');
    p = ops.customize(p, r, v, { roomSize: 6 });
    v = r.resolve(d.id, p)!;
    expect(v.config.roomSize).toBe(6);
    expect(v.manifest.version).toBe('1.0.1');
    p = ops.publish(p, d.id);
    expect(r.resolve(d.id, p)!.variant?.status).toBe('published');
    p = ops.remove(p, r.resolve(d.id, p)!);
    expect(r.resolve(d.id, p)).toBeUndefined();
  });
  it('built-ins cannot be deleted, and the default cannot be disabled', () => {
    const r = reg();
    const p = fresh();
    expect(() => ops.remove(p, r.resolve('control-center', p)!)).toThrow();
    expect(() => ops.setEnabled(p, 'control-center', false)).toThrow();
  });
  it('picks the experience by project, then device, then last, then default', () => {
    const r = reg();
    let p = fresh();
    p = ops.setDefault(p, 'system-map', { device: 'mobile' });
    p = ops.setDefault(p, 'kanban', { project: 'Governor' });
    const e = r.entries(p);
    expect(pickExperience(e, p, 'mobile')).toBe('system-map');
    expect(pickExperience(e, p, 'mobile', 'Governor')).toBe('kanban');
    expect(pickExperience(e, p, 'desktop')).toBe('control-center');
  });
});

describe('import / export security', () => {
  it('round-trips variants and themes', () => {
    const r = reg();
    let p = fresh();
    p = ops.duplicate(p, r.resolve('system-map', p)!, 'Carte claire').prefs;
    const custom = validateTheme({ ...BUILTIN_THEMES[0], id: 'mon-theme', name: 'Mon thème' });
    expect(custom.ok).toBe(true);
    if (custom.ok) p = { ...p, customThemes: [custom.theme] };
    const bundle = JSON.parse(JSON.stringify(exportBundle(p)));
    const res = importBundle(fresh(), r, bundle);
    expect(res.added.length).toBe(1);
    expect(res.themes).toEqual(['mon-theme']);
  });
  it('rejects executable or external content', () => {
    const r = reg();
    const evil = { format: 'mag.experience-bundle', version: 1, exportedAt: 'x', variants: [], themes: [{ ...BUILTIN_THEMES[0], id: 'evil', name: '<script>alert(1)</script>' }] };
    expect(() => importBundle(fresh(), r, evil)).toThrow(/exécutable/);
    const css = { format: 'mag.experience-bundle', version: 1, exportedAt: 'x', variants: [], themes: [{ ...BUILTIN_THEMES[0], id: 'css', colors: { ...BUILTIN_THEMES[0].colors, paper: 'url(https://evil.test/x.png)' } }] };
    expect(() => importBundle(fresh(), r, css)).toThrow();
  });
  it('rejects unknown keys and variants of uninstalled experiences', () => {
    const r = reg();
    const extra = { format: 'mag.experience-bundle', version: 1, exportedAt: 'x', variants: [], themes: [], code: 'x' };
    expect(() => importBundle(fresh(), r, extra)).toThrow(/non conforme/);
    const orphan = {
      format: 'mag.experience-bundle', version: 1, exportedAt: 'x', themes: [],
      variants: [{ id: 'ghost-v1', baseId: 'ghost', name: 'Ghost', description: '', overrides: {}, version: '1.0.0', createdAt: 'x', updatedAt: 'x', status: 'published' }],
    };
    const res = importBundle(fresh(), r, orphan);
    expect(res.added).toEqual([]);
    expect(res.rejected.length).toBe(1);
  });
  it('imported variants always arrive as drafts (validation before publication)', () => {
    const r = reg();
    const b = {
      format: 'mag.experience-bundle', version: 1, exportedAt: 'x', themes: [],
      variants: [{ id: 'carte-v1', baseId: 'system-map', name: 'Carte', description: '', overrides: { blockHeight: 0.8 }, version: '1.0.0', createdAt: 'x', updatedAt: 'x', status: 'published' }],
    };
    const res = importBundle(fresh(), r, b);
    expect(res.prefs.variants[0].status).toBe('draft');
  });
});

describe('themes & quality', () => {
  it('built-in themes validate and produce CSS variables', () => {
    for (const t of BUILTIN_THEMES) {
      expect(validateTheme(t).ok).toBe(true);
      expect(themeToCssVars(t)['--c-paper']).toBe(t.colors.paper);
    }
  });
  it('reduced motion never allows ambient animation or flow particles', () => {
    const q = resolveQuality('high', { reducedMotion: true, saveData: false, lowEnd: false, suspended: false });
    expect(q.motion).toBe('state');
    expect(q.flowParticles).toBe(false);
    expect(resolveQuality('minimal', { reducedMotion: false, saveData: false, lowEnd: false, suspended: false }).motion).toBe('none');
    expect(resolveQuality('auto', { reducedMotion: false, saveData: true, lowEnd: false, suspended: false }).level).toBe('eco');
  });
});

describe('architecture boundaries', () => {
  const root = join(__dirname, '../../src');
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
    });
  const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1] ?? m[2]);

  it('experiences import only the SDK, the design system, React and their own folder', () => {
    const files = walk(join(root, 'experiences')).filter((f) => !/experiences\/(index|thumbs)\.ts$/.test(f));
    const bad: string[] = [];
    for (const f of files) {
      const folder = relative(join(root, 'experiences'), f).split('/')[0];
      for (const spec of imports(f)) {
        const isManifest = f.endsWith('/manifest.ts');
        const ok =
          spec === 'react' || spec === '@sdk' || spec === '@ds' || spec.startsWith('@ds/') || (spec.startsWith('./') && !spec.includes('..')) || spec.endsWith('.css') ||
          // a manifest may use the shared thumbnail helpers
          (isManifest && spec === '../thumbs');
        if (!ok) bad.push(`${relative(root, f)} → ${spec} (dossier ${folder})`);
      }
    }
    expect(bad).toEqual([]);
  });
  it('core/ is independent from React, the engine, the shell and the experiences', () => {
    const bad = walk(join(root, 'core')).flatMap((f) => imports(f).filter((s) => /react|@engine|@sdk|@ds|shell|experiences/.test(s)).map((s) => `${relative(root, f)} → ${s}`));
    expect(bad).toEqual([]);
  });
  it('engine/ never imports the shell or a specific experience', () => {
    const bad = walk(join(root, 'engine')).flatMap((f) => imports(f).filter((s) => /shell|experiences/.test(s)).map((s) => `${relative(root, f)} → ${s}`));
    expect(bad).toEqual([]);
  });
  it('the presentation layer never calls an LLM API', () => {
    const offenders = walk(root).filter((f) => /api\.anthropic\.com|@anthropic-ai\/sdk|openai/i.test(readFileSync(f, 'utf8')));
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });
});
