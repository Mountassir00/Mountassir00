import { useEffect, useMemo, useRef } from 'react';
import { activeFilterCount, CATEGORY_LABEL, EMPTY_FILTERS, type EventCategory, type Filters } from '@core/selectors';
import { IconFilter, IconPresent, IconSearch } from '@ds';
import { modelLabel, useGovernor } from '@sdk';
import { ui, useUi } from './uiStore';
import { togglePresentation } from './App';

/** Data-mode banner + filters + search + presentation. */
export function TopBarControls() {
  const g = useGovernor();
  const filters = useUi((s) => s.filters);
  const filtersOpen = useUi((s) => s.filtersOpen);
  const n = activeFilterCount(filters);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
      {g.mode === 'replay' ? (
        <span className="demo-banner replay-banner" role="status">
          Replay : lecture seule
        </span>
      ) : g.hasDemo ? (
        <span className="demo-banner" role="status" title="Toutes les données affichées sont générées. Aucune opération réelle.">
          <span className="hide-mobile">Données de démonstration</span>
          <span className="only-mobile">Démo</span>
        </span>
      ) : null}
      <button ref={btn} type="button" className="btn" aria-expanded={filtersOpen} onClick={() => ui.set({ filtersOpen: !filtersOpen })} aria-label={`Filtres${n ? `, ${n} actifs` : ''}`}>
        <IconFilter size={16} />
        <span className="hide-mobile">Filtres</span>
        {n > 0 && <span className="pill">{n}</span>}
      </button>
      <button type="button" className="btn btn--icon" onClick={() => ui.set({ searchOpen: true })} aria-label="Rechercher un agent ou un département (Ctrl+K)" title="Rechercher (Ctrl+K)">
        <IconSearch size={16} />
      </button>
      <button type="button" className="btn btn--icon hide-mobile" onClick={() => togglePresentation(true)} aria-label="Mode présentation plein écran (P)" title="Mode présentation (P)">
        <IconPresent size={16} />
      </button>
      {filtersOpen && <FiltersPopover anchor={btn} />}
    </div>
  );
}

function FiltersPopover({ anchor }: { anchor: React.RefObject<HTMLButtonElement | null> }) {
  const g = useGovernor();
  const filters = useUi((s) => s.filters);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) ui.set({ filtersOpen: false });
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.set({ filtersOpen: false });
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [anchor]);
  const options = useMemo(() => {
    const models = new Set<string>();
    const providers = new Set<string>(g.catalog.providers);
    const projects = new Set<string>(g.catalog.projects);
    for (const e of g.allEvents()) {
      if (e.model) models.add(e.model);
      if (e.provider) providers.add(e.provider);
      if (e.project) projects.add(e.project);
    }
    return { models: [...models], providers: [...providers], projects: [...projects] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.catalog, g.version > 0]);
  const toggle = <K extends keyof Filters>(k: K, v: Filters[K][number]) => {
    const list = filters[k] as string[];
    const next = list.includes(v as string) ? list.filter((x) => x !== v) : [...list, v as string];
    ui.set({ filters: { ...filters, [k]: next } });
  };
  const group = (title: string, k: keyof Filters, items: Array<{ value: string; label: string }>) =>
    items.length ? (
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 10px' }}>
        <legend className="section-title" style={{ marginTop: 0 }}>
          {title}
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((i) => (
            <button key={i.value} type="button" className="chip" aria-pressed={(filters[k] as string[]).includes(i.value)} onClick={() => toggle(k, i.value as never)}>
              {i.label}
            </button>
          ))}
        </div>
      </fieldset>
    ) : null;
  return (
    <div ref={ref} className="menu" role="dialog" aria-label="Filtres" style={{ top: 42, right: 0, width: 'min(420px, calc(100vw - 24px))', maxHeight: '70vh', overflow: 'auto', padding: 14 }}>
      {group('Fournisseur', 'providers', options.providers.map((p) => ({ value: p, label: p })))}
      {group('Modèle', 'models', options.models.map((m) => ({ value: m, label: modelLabel(m) })))}
      {group('Projet', 'projects', options.projects.map((p) => ({ value: p, label: p })))}
      {group('Département', 'departments', g.catalog.departments.map((d) => ({ value: d.id, label: d.name })))}
      {group('Agent', 'agents', g.catalog.agents.filter((a) => a.kind !== 'human').map((a) => ({ value: a.id, label: a.name })))}
      {group('Catégorie', 'categories', (Object.keys(CATEGORY_LABEL) as EventCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] })))}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <button type="button" className="btn btn--ghost" onClick={() => ui.set({ filters: EMPTY_FILTERS })} disabled={!activeFilterCount(filters)}>
          Effacer les filtres
        </button>
        <button type="button" className="btn btn--primary" onClick={() => ui.set({ filtersOpen: false })}>
          Fermer
        </button>
      </div>
    </div>
  );
}
