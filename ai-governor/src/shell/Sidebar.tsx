/**
 * Collapsible sidebar (desktop), overlay (tablet), sheet (phone).
 * Views are a group whose children are every installed experience; the
 * current route is a black pill, the current experience a raised white pill.
 */
import { useState } from 'react';
import type { RegistryEntry } from '@engine/registry';
import {
  IconBuilder, IconChevron, IconClose, IconData, IconDecision, IconGallery, IconGovernor, IconMinus, IconPlus, IconSettings, IconSidebar, IconStage, IconStudio,
} from '@ds';
import { registry } from './registryInstance';
import { switchTo } from './App';
import { setPrefs, ui, useUi, type Route } from './uiStore';

const thumb = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const PAGES: Array<{ route: Route; label: string; icon: typeof IconStage }> = [
  { route: 'gallery', label: 'Galerie', icon: IconGallery },
  { route: 'studio', label: 'Studio', icon: IconStudio },
  { route: 'builder', label: 'Créer une expérience', icon: IconBuilder },
];
const SYSTEM: Array<{ route: Route; label: string; icon: typeof IconStage }> = [
  { route: 'sources', label: 'Données', icon: IconData },
  { route: 'settings', label: 'Réglages', icon: IconSettings },
];

export function Sidebar({ entries, activeId, pendingDecisions }: { entries: RegistryEntry[]; activeId: string; pendingDecisions: number }) {
  const route = useUi((s) => s.route);
  const collapsed = useUi((s) => s.prefs.navCollapsed);
  const device = useUi((s) => s.device);
  const menuOpen = useUi((s) => s.menuOpen);
  const drawer = useUi((s) => s.drawer);
  const [viewsOpen, setViewsOpen] = useState(true);
  const views = entries.filter((e) => e.enabled && !e.hidden);
  const overlay = device !== 'desktop';
  const iconOnly = overlay ? !menuOpen : collapsed;

  const go = (r: Route) => {
    ui.set({ route: r, menuOpen: false });
  };
  const toggleCollapse = () => {
    if (overlay) ui.set({ menuOpen: !menuOpen });
    else setPrefs((p) => ({ ...p, navCollapsed: !p.navCollapsed }));
  };

  const item = (r: Route, label: string, Icon: typeof IconStage) => (
    <button key={r} type="button" className="nav-item" aria-current={route === r ? 'page' : undefined} onClick={() => go(r)} title={iconOnly ? label : undefined}>
      <Icon size={20} />
      <span className="nav-item__label">{label}</span>
    </button>
  );

  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <div className="sidebar__brand">
        <IconGovernor size={28} />
        <div className="sidebar__brand-text" style={{ flex: 1, minWidth: 0 }}>
          <b>AI GOVERNOR</b>
          <small>Mountassir · supervision IA</small>
        </div>
        {device === 'mobile' && (
          <button type="button" className="btn btn--icon btn--ghost" aria-label="Fermer le menu" onClick={() => ui.set({ menuOpen: false })}>
            <IconClose size={18} />
          </button>
        )}
      </div>
      <div className="sidebar__scroll">
        <div className="sidebar__section">Supervision</div>
        <button
          type="button"
          className="nav-item"
          aria-current={route === 'stage' ? 'page' : undefined}
          aria-expanded={iconOnly ? undefined : viewsOpen}
          onClick={() => (route === 'stage' && !iconOnly ? setViewsOpen((v) => !v) : go('stage'))}
          title={iconOnly ? 'Vues' : undefined}
        >
          <IconStage size={20} />
          <span className="nav-item__label">Vues</span>
          <span className="nav-item__end" aria-hidden>
            {viewsOpen ? <IconMinus size={16} /> : <IconPlus size={16} />}
          </span>
        </button>
        {viewsOpen && (
          <div className="nav-sub" role="group" aria-label="Expériences">
            {views.map((e, i) => (
              <button
                key={e.id}
                type="button"
                className="nav-item"
                aria-current={route === 'stage' && e.id === activeId ? 'true' : undefined}
                onClick={() => {
                  switchTo(e.id);
                  ui.set({ menuOpen: false });
                }}
                onMouseEnter={() => registry.prefetch(e.baseId)}
                onFocus={() => registry.prefetch(e.baseId)}
              >
                <img className="nav-thumb" src={thumb(e.manifest.thumbnail)} alt="" />
                <span className="nav-item__label">{e.manifest.name}</span>
                {i < 9 && (
                  <span className="nav-item__end">
                    <span className="kbd" aria-hidden>
                      {i + 1}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="nav-item"
          data-active={drawer === 'decisions' || undefined}
          aria-pressed={drawer === 'decisions'}
          onClick={() => ui.set((s) => ({ drawer: s.drawer === 'decisions' ? null : 'decisions', menuOpen: false }))}
          title={iconOnly ? `Décisions (${pendingDecisions} en attente)` : undefined}
          aria-label={`Décisions GO / NO GO / TEST, ${pendingDecisions} en attente`}
        >
          <IconDecision size={20} />
          <span className="nav-item__label">Décisions</span>
          {pendingDecisions > 0 && (
            <span className="nav-item__end">
              <span className="badge-count">{pendingDecisions}</span>
            </span>
          )}
          {pendingDecisions > 0 && <i className="dot-badge" aria-hidden />}
        </button>

        <div className="sidebar__section">Personnaliser</div>
        {PAGES.map((p) => item(p.route, p.label, p.icon))}
        <div className="sidebar__section">Système</div>
        {SYSTEM.map((p) => item(p.route, p.label, p.icon))}
      </div>
      {device !== 'mobile' && (
        <div className="sidebar__foot">
          <button type="button" className="nav-item" onClick={toggleCollapse} aria-label={iconOnly ? 'Déplier le menu' : 'Replier le menu'} title={iconOnly ? 'Déplier le menu' : undefined}>
            {iconOnly ? <IconChevron size={18} /> : <IconSidebar size={18} />}
            <span className="nav-item__label">Replier le menu</span>
          </button>
        </div>
      )}
    </nav>
  );
}

const MOBILE: Array<{ route: Route | 'decisions'; label: string; icon: typeof IconStage }> = [
  { route: 'stage', label: 'Vue', icon: IconStage },
  { route: 'decisions', label: 'Décisions', icon: IconDecision },
  { route: 'gallery', label: 'Galerie', icon: IconGallery },
  { route: 'sources', label: 'Données', icon: IconData },
  { route: 'settings', label: 'Réglages', icon: IconSettings },
];

/** Floating capsule navigation for phones (thumb zone). */
export function MobileNav({ pendingDecisions }: { pendingDecisions: number }) {
  const route = useUi((s) => s.route);
  const drawer = useUi((s) => s.drawer);
  return (
    <nav className="mobile-nav" aria-label="Navigation rapide">
      {MOBILE.map(({ route: r, label, icon: Icon }) => {
        const current = r === 'decisions' ? drawer === 'decisions' : route === r && drawer !== 'decisions';
        return (
          <button
            key={r}
            type="button"
            className="mobile-nav__item"
            aria-current={current ? 'page' : undefined}
            aria-label={r === 'decisions' ? `${label}, ${pendingDecisions} en attente` : label}
            onClick={() => (r === 'decisions' ? ui.set((s) => ({ drawer: s.drawer === 'decisions' ? null : 'decisions' })) : ui.set({ route: r, drawer: null }))}
          >
            <Icon size={20} />
            <span className="mobile-nav__label">{label}</span>
            {r === 'decisions' && pendingDecisions > 0 && !current && <span className="badge-count">{pendingDecisions}</span>}
          </button>
        );
      })}
    </nav>
  );
}
