/**
 * Experience Studio — Category A customisation: themes (pure data) and the
 * graphic parameters each experience declares. Live preview runs the real
 * experience on real data inside a scoped container; nothing is applied
 * until "Publier".
 */
import { useMemo, useState, type CSSProperties } from 'react';
import { defaultsOf, type GraphicParam } from '@engine/manifest';
import { ops, type RegistryEntry } from '@engine/registry';
import { BUILTIN_THEMES, FONT_STACKS, themeToCssVars, validateTheme, type Theme } from '@engine/themes';
import type { QualitySettings } from '@engine/quality';
import { IconAlert, IconReset, Notice } from '@ds';
import { ExperienceHost } from './ExperienceHost';
import { clock } from './App';
import { setPrefs, toast, ui, useUi } from './uiStore';
import { contrast } from './color';
import { registry } from './registryInstance';

type ColorGroup = 'colors' | 'pastel' | 'status' | 'series' | 'nature';

const COLOR_LABEL: Record<string, string> = {
  paper: 'Fond', raised: 'Panneaux', sunken: 'Creux', ink: 'Encre', inkSoft: 'Encre secondaire', inkMuted: 'Encre discrète', line: 'Contours', grid: 'Quadrillage',
  gridMajor: 'Quadrillage principal', accent: 'Accent', accentInk: 'Texte sur accent', focus: 'Focus',
  working: 'Au travail', waiting: 'En attente', collaborating: 'Collaboration', researching: 'Recherche', validating: 'Validation', error: 'Erreur', paused: 'Suspendu', idle: 'Disponible', offline: 'Hors ligne',
  real: 'Mesuré', estimated: 'Estimé', demo: 'Démo', unavailable: 'Indisponible', planned: 'Planifié', historical: 'Historique',
  s1: 'Série 1', s2: 'Série 2', s3: 'Série 3', s4: 'Série 4',
};

export function Studio({ entries, quality }: { entries: RegistryEntry[]; quality: QualitySettings }) {
  const prefs = useUi((s) => s.prefs);
  const target = useUi((s) => s.studioTarget);
  const active = useUi((s) => s.active);
  const themes = [...BUILTIN_THEMES, ...prefs.customThemes];
  const currentThemeId = prefs.themeId === 'auto' ? 'plan' : prefs.themeId;
  const [entryId, setEntryId] = useState(target ?? active);
  const entry = entries.find((e) => e.id === entryId) ?? entries[0];
  const [theme, setTheme] = useState<Theme>(() => structuredClone(themes.find((t) => t.id === currentThemeId) ?? BUILTIN_THEMES[0]));
  const [params, setParams] = useState<Record<string, unknown>>(() => ({ ...entry.config }));
  const [newName, setNewName] = useState('');
  const [tab, setTab] = useState<'theme' | 'params'>('params');

  const pickEntry = (id: string) => {
    setEntryId(id);
    const e = entries.find((x) => x.id === id);
    if (e) setParams({ ...e.config });
    ui.set({ studioTarget: id });
  };

  const vars = useMemo(() => themeToCssVars(theme) as CSSProperties, [theme]);
  const warnings = useMemo(() => {
    const w: string[] = [];
    const check = (a: string, b: string, min: number, label: string) => {
      const c = contrast(a, b);
      if (c != null && c < min) w.push(`${label} : contraste ${c.toFixed(1)}:1 (minimum ${min}:1)`);
    };
    check(theme.colors.ink, theme.colors.paper, 4.5, 'Encre sur fond');
    check(theme.colors.inkMuted, theme.colors.raised, 4.5, 'Encre discrète sur panneaux');
    check(theme.colors.accentInk, theme.colors.accent, 4.5, 'Texte sur accent');
    check(theme.colors.ink, theme.colors.raised, 4.5, 'Encre sur panneaux');
    return w;
  }, [theme]);

  const setColor = (group: ColorGroup, key: string, value: string) => setTheme((t) => ({ ...t, [group]: { ...(t[group] as Record<string, string>), [key]: value } }));

  const publish = () => {
    const isBuiltinUnchanged = BUILTIN_THEMES.some((b) => b.id === theme.id && JSON.stringify(b) === JSON.stringify(theme));
    setPrefs((p) => {
      let next = ops.customize(p, registry, entry, params);
      if (!isBuiltinUnchanged) {
        const id = BUILTIN_THEMES.some((b) => b.id === theme.id) ? `${theme.id}-perso` : theme.id;
        const v = validateTheme({ ...theme, id, name: BUILTIN_THEMES.some((b) => b.id === theme.id) ? `${theme.name} (perso)` : theme.name });
        if (!v.ok) {
          toast(`Thème refusé : ${v.error}`, 'denied');
          return p;
        }
        next = { ...next, customThemes: [...next.customThemes.filter((t) => t.id !== id), v.theme], themeId: id };
      } else next = { ...next, themeId: theme.id };
      return next;
    });
    toast('Personnalisation publiée.');
  };

  const saveAsTheme = () => {
    const name = newName.trim() || `${theme.name} — variante`;
    const id = name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'theme';
    const v = validateTheme({ ...theme, id: prefs.customThemes.some((t) => t.id === id) ? `${id}-${prefs.customThemes.length + 1}` : id, name: name.slice(0, 40) });
    if (!v.ok) return toast(`Thème refusé : ${v.error}`, 'denied');
    setPrefs((p) => ({ ...p, customThemes: [...p.customThemes, v.theme], themeId: v.theme.id }));
    setTheme(v.theme);
    toast(`Thème « ${v.theme.name} » enregistré.`);
  };

  const saveAsVariant = () => {
    const name = newName.trim() || `${entry.manifest.name} — variante`;
    setPrefs((p) => {
      const r = ops.duplicate(p, entry, name, params);
      const themeId = BUILTIN_THEMES.some((b) => b.id === theme.id && JSON.stringify(b) === JSON.stringify(theme)) ? theme.id : undefined;
      return { ...r.prefs, variants: r.prefs.variants.map((v) => (v.id === r.id ? { ...v, themeId } : v)) };
    });
    toast('Variante enregistrée en brouillon : validez-la dans la galerie.');
  };

  const reset = () => {
    setTheme(structuredClone(BUILTIN_THEMES[0]));
    const base = registry.baseManifest(entry.baseId);
    if (base) setParams(defaultsOf(base));
    setPrefs((p) => ({ ...ops.reset(p, entry), themeId: 'auto' }));
    toast('Paramètres initiaux restaurés.');
  };

  const groups = useMemo(() => {
    const m = new Map<string, GraphicParam[]>();
    for (const p of entry.manifest.graphics) {
      const k = p.group ?? 'Général';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(p);
    }
    return [...m.entries()];
  }, [entry]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="t-h1">Experience Studio</h1>
          <p className="t-muted" style={{ margin: '4px 0 0' }}>
            Modifiez l’apparence sans toucher au fonctionnement : l’aperçu utilise les données réelles affichées, rien n’est appliqué avant publication.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={reset}>
            <IconReset size={16} /> Restaurer les paramètres initiaux
          </button>
          <button type="button" className="btn btn--primary" onClick={publish}>
            Publier
          </button>
        </div>
      </div>
      <div className="page__body split">
        <div className="panel" style={{ padding: 14 }}>
          <label className="field">
            <span>Expérience</span>
            <select className="select" value={entry.id} onChange={(e) => pickEntry(e.target.value)}>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.manifest.name}
                </option>
              ))}
            </select>
          </label>
          <div className="seg" role="tablist" style={{ margin: '12px 0 4px' }}>
            <button type="button" role="tab" aria-selected={tab === 'params'} onClick={() => setTab('params')}>
              Paramètres de la vue
            </button>
            <button type="button" role="tab" aria-selected={tab === 'theme'} onClick={() => setTab('theme')}>
              Thème
            </button>
          </div>

          {tab === 'params' &&
            groups.map(([group, list]) => (
              <div key={group} className="param-group">
                <h2 className="t-h3">{group}</h2>
                {list.map((p) => (
                  <ParamControl key={p.key} p={p} value={params[p.key]} onChange={(v) => setParams((x) => ({ ...x, [p.key]: v }))} />
                ))}
              </div>
            ))}

          {tab === 'theme' && (
            <>
              <div className="param-group">
                <label className="field">
                  <span>Partir d’un thème</span>
                  <select className="select" value={theme.id} onChange={(e) => setTheme(structuredClone(themes.find((t) => t.id === e.target.value) ?? BUILTIN_THEMES[0]))}>
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Typographie</span>
                  <select className="select" value={theme.type.ui} onChange={(e) => setTheme((t) => ({ ...t, type: { ...t.type, ui: e.target.value as Theme['type']['ui'] } }))}>
                    {Object.keys(FONT_STACKS).map((f) => (
                      <option key={f} value={f}>
                        {f === 'archivo' ? 'Archivo (par défaut)' : f === 'system' ? 'Police système' : f === 'humanist' ? 'Humaniste' : 'Sérif'}
                      </option>
                    ))}
                  </select>
                </label>
                <Range label="Taille de base" value={theme.type.basePx} min={12} max={18} step={1} unit="px" onChange={(v) => setTheme((t) => ({ ...t, type: { ...t.type, basePx: v } }))} />
                <Range label="Arrondi" value={theme.shape.radius} min={0} max={14} step={1} unit="px" onChange={(v) => setTheme((t) => ({ ...t, shape: { ...t.shape, radius: v } }))} />
                <Range label="Épaisseur des contours" value={theme.shape.stroke} min={0.5} max={2} step={0.25} unit="px" onChange={(v) => setTheme((t) => ({ ...t, shape: { ...t.shape, stroke: v } }))} />
                <Select label="Ombres" value={theme.shape.shadow} options={[['none', 'Aucune'], ['soft', 'Douces'], ['crisp', 'Nettes (décalées)']]} onChange={(v) => setTheme((t) => ({ ...t, shape: { ...t.shape, shadow: v as Theme['shape']['shadow'] } }))} />
                <Select label="Fond" value={theme.surface.grid} options={[['plan', 'Papier millimétré'], ['lines', 'Quadrillage simple'], ['dots', 'Points'], ['none', 'Uni']]} onChange={(v) => setTheme((t) => ({ ...t, surface: { ...t.surface, grid: v as Theme['surface']['grid'] } }))} />
                <Select label="Texture" value={theme.surface.texture ?? 'none'} options={[['none', 'Aucune'], ['paper', 'Grain de papier']]} onChange={(v) => setTheme((t) => ({ ...t, surface: { ...t.surface, texture: v as 'none' | 'paper' } }))} />
                <Range label="Taille du quadrillage" value={theme.surface.gridSize} min={8} max={64} step={2} unit="px" onChange={(v) => setTheme((t) => ({ ...t, surface: { ...t.surface, gridSize: v } }))} />
                <Select label="Densité" value={theme.density} options={[['compact', 'Compacte'], ['comfortable', 'Confortable'], ['spacious', 'Aérée']]} onChange={(v) => setTheme((t) => ({ ...t, density: v as Theme['density'] }))} />
              </div>
              <ColorGroupEditor title="Couleurs de base" group="colors" values={theme.colors} onChange={setColor} />
              <ColorGroupEditor title="Pastels des départements" group="pastel" values={theme.pastel} onChange={setColor} />
              <ColorGroupEditor title="Indicateurs de statut" group="status" values={theme.status} onChange={setColor} />
              <ColorGroupEditor title="Nature des données" group="nature" values={theme.nature} onChange={setColor} />
              <ColorGroupEditor title="Séries des graphiques" group="series" values={theme.series} onChange={setColor} />
            </>
          )}

          {warnings.length > 0 && (
            <Notice tone="warn" icon={<IconAlert size={16} />}>
              <b>Lisibilité insuffisante</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Notice>
          )}

          <div className="param-group">
            <label className="field">
              <span>Nom (nouveau thème ou variante)</span>
              <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. Bureau du soir" maxLength={40} />
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="btn" onClick={saveAsTheme}>
                Enregistrer comme thème
              </button>
              <button type="button" className="btn" onClick={saveAsVariant}>
                Enregistrer comme variante
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="t-small t-muted" style={{ marginBottom: 6 }}>
            Aperçu — {entry.manifest.name}, données {ui.get().time.mode === 'live' ? 'en direct' : 'du replay'}
          </div>
          <div className="studio-preview surface-plan" style={{ ...vars, fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-base)', color: 'var(--c-ink)', colorScheme: theme.scheme }} data-scheme={theme.scheme}>
            <ExperienceHost entry={entry} quality={quality} clock={clock} configOverride={params} previewKey={`studio-${entry.id}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ParamControl({ p, value, onChange }: { p: GraphicParam; value: unknown; onChange: (v: unknown) => void }) {
  if (p.type === 'boolean')
    return (
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <span>{p.label}</span>
      </label>
    );
  if (p.type === 'number') return <Range label={p.label} value={Number(value ?? p.default)} min={p.min} max={p.max} step={p.step} unit={p.unit} onChange={onChange} />;
  if (p.type === 'select') return <Select label={p.label} value={String(value ?? p.default)} options={p.options.map((o) => [o.value, o.label])} onChange={onChange} />;
  return (
    <label className="swatch">
      <input type="color" value={String(value ?? p.default)} onChange={(e) => onChange(e.target.value)} />
      {p.label}
    </label>
  );
}

function Range({ label, value, min, max, step, unit, onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
        {label}
        <b className="num">
          {value}
          {unit ? ` ${unit}` : ''}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: Array<[string, string]>; onChange: (v: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorGroupEditor({ title, group, values, onChange }: { title: string; group: ColorGroup; values: Record<string, string>; onChange: (g: ColorGroup, k: string, v: string) => void }) {
  return (
    <div className="param-group">
      <h2 className="t-h3">{title}</h2>
      <div className="swatches">
        {Object.entries(values).map(([k, v]) => (
          <label key={k} className="swatch">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000'} onChange={(e) => onChange(group, k, e.target.value)} aria-label={`${title} : ${COLOR_LABEL[k] ?? k}`} />
            {COLOR_LABEL[k] ?? k}
          </label>
        ))}
      </div>
    </div>
  );
}
