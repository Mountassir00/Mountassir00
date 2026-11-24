/**
 * Page header: title + live chips, quick view switcher (sliding pill, scrollable
 * on phones), search, filters, decisions, theme and profile — all round,
 * thumb-sized controls.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RegistryEntry } from '@engine/registry';
import { ROLE_LABEL } from '@core/commands';
import { activeFilterCount, CATEGORY_LABEL, EMPTY_FILTERS, type EventCategory, type Filters } from '@core/selectors';
import { IconBell, IconChevron, IconFilter, IconMenu, IconMoon, IconPresent, IconSearch, IconSun, Segmented } from '@ds';
import { fmtTime, modelLabel, useGovernor } from '@sdk';
import { registry } from './registryInstance';
import { switchTo, togglePresentation } from './App';
import { setPrefs, ui, useUi, type Route } from './uiStore';

const PAGE_TITLE: Record<Exclude<Route, 'stage'>, string> = {
  gallery: 'Galerie des expériences',
  studio: 'Experience Studio',
  builder: 'Créer une expérience',
  sources: 'Sources de données',
  settings: 'Réglages',
};

export function Header({ entries, activeId, pendingDecisions, scheme }: { entries: RegistryEntry[]; activeId: string; pendingDecisions: number; scheme: 'light' | 'dark' }) {
  const g = useGovernor();
  const route = useUi((s) => s.route);
  const filters = useUi((s) => s.filters);
  const filtersOpen = useUi((s) => s.filtersOpen);
  const drawer = useUi((s) => s.drawer);
  const device = useUi((s) => s.device);
  const role = useUi((s) => s.prefs.role);
  const menuOpen = useUi((s) => s.menuOpen);
  const nFilters = activeFilterCount(filters);
  const active = entries.find((e) => e.id === activeId);
  const views = entries.filter((e) => e.enabled && !e.hidden);
  const title = route === 'stage' ? active?.manifest.name ?? 'Vue' : PAGE_TITLE[route];
  const dark = scheme === 'dark';
  const real = g.sources.some((s) => s.nature === 'real');

  return (
    <header className="header">
      {device !== 'desktop' && (
        <button type="button" className="icon-btn" aria-label="Ouvrir le menu" aria-expanded={menuOpen} onClick={() => ui.set({ menuOpen: !menuOpen })}>
          <IconMenu size={18} />
        </button>
      )}
      <div className="header__titles">
        <h1>{title}</h1>
        <div className="header__sub">
          {g.mode === 'replay' ? (
            <span className="demo-banner replay-banner" role="status">
              Replay · {fmtTime(g.now, true)} · lecture seule
            </span>
          ) : (
            <span className="pill" role="status">
              <i className="live-dot" aria-hidden /> En direct
            </span>
          )}
          {g.hasDemo && (
            <span className="demo-banner" title="Toutes les données affichées sont générées. Aucune opération réelle.">
              {real ? 'Démo + données réelles' : 'Données de démonstration'}
            </span>
          )}
          {!g.hasDemo && real && <span className="pill pill--up">Données réelles</span>}
        </div>
      </div>

      {route === 'stage' && views.length > 1 && (
        <div className="header__switch">
          <Segmented
            raised
            label="Changer d’expérience"
            value={activeId}
            onChange={(id) => switchTo(id)}
            options={views.map((e, i) => ({ value: e.id, label: e.manifest.name, title: `${e.manifest.name} (touche ${i + 1})`, onIntent: () => registry.prefetch(e.baseId) }))}
          />
        </div>
      )}

      <div className="header__actions">
        <button type="button" className="search-pill" onClick={() => ui.set({ searchOpen: true })} aria-label="Rechercher un agent, un département ou une vue (Ctrl+K)">
          <IconSearch size={17} />
          <span className="search-pill__text hide-mobile">Rechercher…</span>
          <span className="kbd hide-mobile">Ctrl K</span>
        </button>
        <button type="button" className="icon-btn" aria-expanded={filtersOpen} onClick={() => ui.set({ filtersOpen: !filtersOpen })} aria-label={`Filtres${nFilters ? `, ${nFilters} actifs` : ''}`} title="Filtres">
          <IconFilter size={17} />
          {nFilters > 0 && <span className="badge-count">{nFilters}</span>}
        </button>
        <button type="button" className="icon-btn" aria-pressed={drawer === 'decisions'} onClick={() => ui.set((s) => ({ drawer: s.drawer === 'decisions' ? null : 'decisions' }))} aria-label={`Décisions, ${pendingDecisions} en attente`} title="Décisions (D)">
          <IconBell size={18} />
          {pendingDecisions > 0 && <span className="badge-count">{pendingDecisions}</span>}
        </button>
        <button type="button" className="icon-btn hide-mobile" onClick={() => setPrefs((p) => ({ ...p, themeId: dark ? 'lumiere' : 'onyx' }))} aria-label={dark ? 'Passer en thème clair' : 'Passer en thème sombre'} title="Thème">
          {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
        </button>
        {device === 'desktop' && (
          <button type="button" className="icon-btn" onClick={() => togglePresentation(true)} aria-label="Mode présentation plein écran (P)" title="Présentation (P)">
            <IconPresent size={17} />
          </button>
        )}
        <button type="button" className="avatar hide-mobile" onClick={() => ui.set({ route: 'settings' })} aria-label={`Profil : ${ROLE_LABEL[role]}. Ouvrir les réglages`} title={ROLE_LABEL[role]}>
          M
        </button>
      </div>
      {filtersOpen && <FiltersPanel />}
    </header>
  );
}

function FiltersPanel() {
  const g = useGovernor();
  const filters = useUi((s) => s.filters);
  const ref = useRef<HTMLDivElement>(null);
  const [, force] = useState(0);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!ref.current?.contains(t) && !t.closest?.('[aria-label^="Filtres"]')) ui.set({ filtersOpen: false });
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && ui.set({ filtersOpen: false });
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);
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
  const toggle = (k: keyof Filters, v: string) => {
    const list = filters[k] as string[];
    ui.set({ filters: { ...filters, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } });
    force((n) => n + 1);
  };
  const group = (title: string, k: keyof Filters, items: Array<{ value: string; label: string }>) =>
    items.length ? (
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 14px' }}>
        <legend className="section-title" style={{ marginTop: 0 }}>
          {title}
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((i) => (
            <button key={i.value} type="button" className="chip" aria-pressed={(filters[k] as string[]).includes(i.value)} onClick={() => toggle(k, i.value)}>
              {i.label}
            </button>
          ))}
        </div>
      </fieldset>
    ) : null;
  return (
    <div ref={ref} className="menu filters-panel" role="dialog" aria-label="Filtres">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 className="t-h2">Filtres</h2>
        <span className="t-micro t-muted">Appliqués à toutes les vues</span>
      </div>
      {group('Fournisseur', 'providers', options.providers.map((p) => ({ value: p, label: p })))}
      {group('Modèle', 'models', options.models.map((m) => ({ value: m, label: modelLabel(m) })))}
      {group('Projet', 'projects', options.projects.map((p) => ({ value: p, label: p })))}
      {group('Département', 'departments', g.catalog.departments.map((d) => ({ value: d.id, label: d.name })))}
      {group('Agent', 'agents', g.catalog.agents.filter((a) => a.kind !== 'human').map((a) => ({ value: a.id, label: a.name })))}
      {group('Catégorie', 'categories', (Object.keys(CATEGORY_LABEL) as EventCategory[]).map((c) => ({ value: c, label: CATEGORY_LABEL[c] })))}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, position: 'sticky', bottom: -14, background: 'var(--c-raised)', padding: '10px 0 0' }}>
        <button type="button" className="btn btn--ghost" onClick={() => ui.set({ filters: EMPTY_FILTERS })} disabled={!activeFilterCount(filters)}>
          Effacer les filtres
        </button>
        <button type="button" className="btn btn--primary" onClick={() => ui.set({ filtersOpen: false })}>
          Fermer <IconChevron size={14} />
        </button>
      </div>
    </div>
  );
}
