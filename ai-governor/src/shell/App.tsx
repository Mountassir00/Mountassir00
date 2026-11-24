import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { GovernorContext } from '@sdk';
import { pickExperience } from '@engine/registry';
import { detectEnvironment, resolveQuality } from '@engine/quality';
import { ActivityMonitor, AnimationClock, PerfMonitor } from '@engine/runtime';
import { applyTheme, BUILTIN_THEMES } from '@engine/themes';
import { deviceClass } from '@engine/prefs';
import { IconClose } from '@ds';
import { flushSync } from 'react-dom';
import { RuntimeContext, useSnapshot } from './context';
import { GovernorRuntime } from './runtime';
import { registry } from './registryInstance';
import { setPrefs, ui, useUi } from './uiStore';
import { ExperienceHost } from './ExperienceHost';
import { Header } from './Header';
import { Sidebar, MobileNav } from './Sidebar';
import { Inspector } from './Inspector';
import { DecisionCenter } from './DecisionCenter';
import { Timeline } from './Timeline';
import { TitleBlock } from './TitleBlock';
import { ConfirmDialog } from './ConfirmDialog';
import { PerfHud } from './PerfHud';
import { Search } from './Search';
import { Launcher, quickList } from './Launcher';

// Admin pages are split out: the stage only pays for what it shows.
const Gallery = lazy(() => import('./Gallery').then((m) => ({ default: m.Gallery })));
const Studio = lazy(() => import('./Studio').then((m) => ({ default: m.Studio })));
const Builder = lazy(() => import('./Builder').then((m) => ({ default: m.Builder })));
const Sources = lazy(() => import('./Sources').then((m) => ({ default: m.Sources })));
const Settings = lazy(() => import('./Settings').then((m) => ({ default: m.Settings })));

export const runtime = new GovernorRuntime();
const activity = new ActivityMonitor();
export const clock = new AnimationClock();
export const perf = new PerfMonitor();

// Read-only diagnostics for automated tests (counts only, no data, no actions).
if (typeof window !== 'undefined') {
  (window as unknown as { __mag: unknown }).__mag = {
    eventCount: () => runtime.store.getEvents().length,
    loadedRenderers: () => [...registry.loadTimings.keys()],
    uiModelCalls: () => runtime.uiInitiatedModelCalls,
    lastSwitchMs: () => perf.lastSwitchMs,
    clockRunning: () => clock.running,
    views: () => registry.entries(ui.get().prefs).filter((e) => e.enabled && !e.hidden).map((e) => ({ id: e.id, name: e.manifest.name, renderer: e.manifest.renderer, family: e.manifest.family ?? 'other' })),
  };
}

let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  // The demo generator is its own chunk; a real-data-only setup never downloads it.
  void import('@core/sources/demo').then(({ DemoSource }) => runtime.addSource(new DemoSource(), { live: ui.get().prefs.liveDemo }));
}

/** Theme + quality + motion are applied once at the root; experiences only read them. */
function useAppearance(themeOverride?: string) {
  const prefs = useUi((s) => s.prefs);
  const [suspended, setSuspended] = useState(false);
  // A host may force the theme with data-theme on <html>; otherwise follow the OS.
  const hostTheme = () => document.documentElement.getAttribute('data-theme');
  const isDark = () => (hostTheme() === 'dark' ? true : hostTheme() === 'light' ? false : window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [systemDark, setSystemDark] = useState(isDark);
  const [env, setEnv] = useState(detectEnvironment);

  useEffect(() => activity.start(), []);
  useEffect(() => {
    const off = activity.subscribe(() => setSuspended(activity.suspended));
    return () => void off();
  }, []);
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)');
    const r = window.matchMedia('(prefers-reduced-motion: reduce)');
    const a = () => setSystemDark(isDark());
    const mo = new MutationObserver(a);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const b = () => setEnv(detectEnvironment());
    m.addEventListener('change', a);
    r.addEventListener('change', b);
    return () => {
      m.removeEventListener('change', a);
      r.removeEventListener('change', b);
      mo.disconnect();
    };
  }, []);

  const theme = useMemo(() => {
    const all = [...BUILTIN_THEMES, ...prefs.customThemes];
    const forced = themeOverride ? all.find((t) => t.id === themeOverride) : undefined;
    if (forced) return forced;
    if (prefs.themeId === 'auto') return systemDark ? BUILTIN_THEMES[1] : BUILTIN_THEMES[0];
    return all.find((t) => t.id === prefs.themeId) ?? BUILTIN_THEMES[0];
  }, [prefs.themeId, prefs.customThemes, systemDark, themeOverride]);

  const reducedMotion = prefs.reducedMotion === 'on' ? true : prefs.reducedMotion === 'off' ? false : env.reducedMotion;
  const quality = useMemo(() => resolveQuality(prefs.quality, { ...env, reducedMotion, suspended }), [prefs.quality, env, reducedMotion, suspended]);

  useEffect(() => {
    applyTheme(theme, document.documentElement);
  }, [theme]);
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.motion = quality.motion;
    el.dataset.quality = quality.level;
    clock.configure(quality.fpsCap, quality.suspended || quality.motion !== 'ambient');
  }, [quality]);
  return { theme, quality };
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

export function App() {
  return (
    <RuntimeContext.Provider value={runtime}>
      <AppInner />
    </RuntimeContext.Provider>
  );
}

function AppInner() {
  boot();
  const snapshot = useSnapshot();
  const route = useUi((s) => s.route);
  const active = useUi((s) => s.active);
  const prefs = useUi((s) => s.prefs);
  const drawer = useUi((s) => s.drawer);
  const presentation = useUi((s) => s.presentation);
  const toasts = useUi((s) => s.toasts);
  const announceText = useUi((s) => s.announce);
  const device = useUi((s) => s.device);
  const time = useUi((s) => s.time);
  const entries = useMemo(() => registry.entries(prefs), [prefs]);
  const entry = entries.find((e) => e.id === active && e.enabled) ?? entries.find((e) => e.id === pickExperience(entries, prefs, device));
  const { quality, theme } = useAppearance(route === 'stage' ? entry?.variant?.themeId : undefined);
  const navCollapsed = prefs.navCollapsed;
  const menuOpen = useUi((s) => s.menuOpen);
  const projectFilter = useUi((s) => (s.filters.projects.length === 1 ? s.filters.projects[0] : ''));
  const pendingDecisions = Object.values(snapshot.state.decisions).filter((d) => d.status === 'pending').length;
  const shellRef = useRef<HTMLDivElement>(null);

  // A project can have its own preferred experience.
  useEffect(() => {
    const target = projectFilter ? ui.get().prefs.perProject[projectFilter] : undefined;
    if (target && target !== ui.get().active) ui.set({ active: target });
  }, [projectFilter]);

  // Device class follows the viewport.
  useEffect(() => {
    const onResize = () => {
      const d = deviceClass(window.innerWidth);
      if (d !== ui.get().device) ui.set({ device: d });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Replay playback: coarse 10 Hz ticks, never per frame; projection is cached forward.
  useEffect(() => {
    if (time.mode !== 'replay' || !time.playing || quality.suspended) return;
    const id = setInterval(() => {
      const s = ui.get().time;
      const end = s.domain?.to ?? runtime.store.lastTs();
      const t = Math.min(end, s.t + s.speed * 100);
      ui.set({ time: { ...s, t, playing: t < end } });
    }, 100);
    return () => clearInterval(id);
  }, [time.mode, time.playing, quality.suspended]);

  // Keyboard shortcuts (documented in Réglages).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A view that handled the key itself (e.g. a canvas with focus) wins.
      if (e.defaultPrevented) return;
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !isTyping(e))) {
        e.preventDefault();
        ui.set({ searchOpen: true });
        return;
      }
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      const visible = quickList(registry.entries(ui.get().prefs), ui.get().prefs.favorites);
      if (/^[1-9]$/.test(e.key)) {
        const target = visible[Number(e.key) - 1];
        if (target) switchTo(target.id);
      } else if (e.key === 'd' || e.key === 'D') ui.set((s) => ({ drawer: s.drawer === 'decisions' ? null : 'decisions' }));
      else if (e.key === 'i' || e.key === 'I') ui.set((s) => ({ drawer: s.drawer === 'inspector' ? null : 'inspector' }));
      else if (e.key === 'l' || e.key === 'L') goLive();
      else if (e.key === '[') setPrefs((p) => ({ ...p, navCollapsed: !p.navCollapsed }));
      else if (e.key === 'g' || e.key === 'G') ui.set((s) => ({ launcherOpen: !s.launcherOpen }));
      else if (e.key === 'p' || e.key === 'P') togglePresentation();
      else if (e.key === 'Escape') {
        if (ui.get().launcherOpen) ui.set({ launcherOpen: false });
        else if (ui.get().presentation) togglePresentation(false);
        else ui.set((s) => (s.drawer ? { drawer: null } : { selection: null }));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const showTimeline = route === 'stage';
  const navState = presentation ? 'hidden' : device === 'mobile' ? (menuOpen ? 'sheet' : 'hidden') : device === 'tablet' ? (menuOpen ? 'expanded-overlay' : 'collapsed') : navCollapsed ? 'collapsed' : 'expanded';
  const layout = route === 'stage' ? entry?.manifest.layout.kind ?? 'grid' : 'page';
  return (
    <>
      <GovernorContext.Provider value={snapshot}>
        <div className="app" ref={shellRef} data-nav={navState} data-presentation={presentation || undefined} data-timeline={showTimeline ? 'shown' : 'hidden'} data-immersive={(route === 'stage' && entry?.manifest.layout.immersive) || undefined}>
          <a href="#stage" className="sr-only">
            Aller à la vue principale
          </a>
          <Sidebar entries={entries} activeId={entry?.id ?? active} pendingDecisions={pendingDecisions} />
          {(navState === 'sheet' || navState === 'expanded-overlay') && <div className="sheet-scrim" onClick={() => ui.set({ menuOpen: false })} aria-hidden />}
          <div className="main">
            <Header entries={entries} activeId={entry?.id ?? active} pendingDecisions={pendingDecisions} scheme={theme.scheme} />
            <main className="stage" id="stage" data-surface="plan" data-layout={layout} aria-label={entry && route === 'stage' ? `Expérience ${entry.manifest.name}` : 'Page'}>
              {route === 'stage' && entry && (
                <div key={entry.id} className="stage__fade" style={{ position: 'absolute', inset: 0 }}>
                  <ExperienceHost entry={entry} quality={quality} clock={clock} perf={perf} />
                  <TitleBlock entry={entry} quality={quality.level} />
                  {prefs.perfHud && <PerfHud quality={quality} />}
                </div>
              )}
              <Suspense fallback={<div className="stage__loading">Chargement…</div>}>
                {route !== 'stage' && (
                  <div key={route} className="stage__fade" style={{ position: 'absolute', inset: 0 }}>
                    {route === 'gallery' && <Gallery entries={entries} activeId={entry?.id ?? ''} />}
                    {route === 'studio' && <Studio entries={entries} quality={quality} />}
                    {route === 'builder' && <Builder entries={entries} quality={quality} />}
                    {route === 'sources' && <Sources />}
                    {route === 'settings' && <Settings entries={entries} />}
                  </div>
                )}
              </Suspense>
              {presentation && (
                <button type="button" className="btn btn--raised present-exit" onClick={() => togglePresentation(false)}>
                  <IconClose size={16} /> Quitter la présentation
                </button>
              )}
            </main>
            {showTimeline && <Timeline />}
          </div>
          {drawer === 'inspector' && <Inspector />}
          {drawer === 'decisions' && <DecisionCenter />}
          {device === 'mobile' && !presentation && <MobileNav pendingDecisions={pendingDecisions} />}
        </div>
        <ConfirmDialog />
        <Search entries={entries} />
        <Launcher entries={entries} activeId={entry?.id ?? active} />
        <div className="toasts" role="status" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="toast" data-tone={t.tone}>
              {t.text}
            </div>
          ))}
        </div>
        <div className="sr-only" aria-live="polite">
          {announceText}
        </div>
      </GovernorContext.Provider>
    </>
  );
}

/** Switching view changes only the renderer: data, tasks, filters, selection and time stay. */
export function switchTo(id: string) {
  const apply = () => ui.set({ active: id, route: 'stage' });
  // Native cross-fade between views where supported and motion is allowed.
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && document.documentElement.dataset.motion !== 'none' && ui.get().active !== id) doc.startViewTransition(() => flushSync(apply));
  else apply();
  setPrefs((p) => ({ ...p, lastExperience: id }));
}

/** Presentation mode hides the chrome and, when the browser allows it, goes full screen. */
let enteredFullscreen = false;
export function togglePresentation(on = !ui.get().presentation) {
  ui.set({ presentation: on });
  if (on && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().then(() => (enteredFullscreen = true)).catch(() => undefined);
  } else if (!on && document.fullscreenElement && enteredFullscreen) {
    void document.exitFullscreen?.();
    enteredFullscreen = false;
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && enteredFullscreen) {
      enteredFullscreen = false;
      ui.set({ presentation: false });
    }
  });
}

export function goLive() {
  ui.set((s) => ({ time: { ...s.time, mode: 'live', playing: false, domain: null } }));
}
