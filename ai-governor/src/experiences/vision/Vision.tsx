/**
 * Vision — a "spatial glass" dashboard: floating frosted windows with glowing
 * edges over an ambient, theme-aware backdrop, and a glass dock with a nested
 * pop-out menu. Windows can be focused, moved (title bar or arrow keys) and
 * minimised; their layout is a per-view preference (host.setLocal).
 * Falls back to opaque cards, no tilt and no parallax when backdrop-filter is
 * unsupported or the quality level is minimal/eco; stacks on phones.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useCatalogIndex, useGovernor, type ExperienceProps } from '@sdk';
import { IconBell, IconDecision, IconGallery, IconGovernor, IconGroup, IconMap, IconMenu, IconMinus, IconReset, IconStage } from '@ds';
import { FlowMap, flowStats } from './FlowMap';
import { ActivityWindow, AgentsWindow, NotificationsWindow, OrdersWindow, notifications } from './windows';
import './vision.css';

type WinId = 'orders' | 'flows' | 'activity' | 'agents' | 'notifs';
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface WinState {
  x: number;
  y: number;
  min: boolean;
}
interface Layout {
  wins: Record<WinId, WinState>;
  order: WinId[];
}

const DEFAULT: Record<WinId, Rect> = {
  orders: { x: 0, y: 0, w: 0.27, h: 1 },
  flows: { x: 0.285, y: 0, w: 0.445, h: 0.64 },
  agents: { x: 0.285, y: 0.665, w: 0.445, h: 0.335 },
  activity: { x: 0.745, y: 0, w: 0.255, h: 0.44 },
  notifs: { x: 0.745, y: 0.465, w: 0.255, h: 0.535 },
};
const TITLE: Record<WinId, string> = { orders: 'Commandes du jour', flows: 'Flux', activity: 'Activité', agents: 'Agents', notifs: 'Notifications' };
const ICON: Record<WinId, (p: { size?: number }) => ReactNode> = { orders: IconMenu, flows: IconMap, activity: IconStage, agents: IconGroup, notifs: IconBell };
const IDS: WinId[] = ['orders', 'flows', 'agents', 'activity', 'notifs'];
const MOBILE_ORDER: WinId[] = ['activity', 'notifs', 'orders', 'flows', 'agents'];

const freshLayout = (): Layout => ({
  wins: Object.fromEntries(IDS.map((id) => [id, { x: DEFAULT[id].x, y: DEFAULT[id].y, min: false }])) as Record<WinId, WinState>,
  order: [...IDS],
});
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function sanitize(l: Layout | null): Layout {
  const base = freshLayout();
  if (!l || typeof l !== 'object' || !l.wins) return base;
  for (const id of IDS) {
    const w = l.wins[id];
    if (w && Number.isFinite(w.x) && Number.isFinite(w.y)) base.wins[id] = { x: clamp(w.x, 0, 1 - DEFAULT[id].w), y: clamp(w.y, 0, 1 - DEFAULT[id].h * 0.3), min: !!w.min };
  }
  if (Array.isArray(l.order) && l.order.length === IDS.length && IDS.every((id) => l.order.includes(id))) base.order = [...l.order];
  return base;
}

function supportsBackdrop() {
  return typeof CSS !== 'undefined' && (CSS.supports('backdrop-filter', 'blur(2px)') || CSS.supports('-webkit-backdrop-filter', 'blur(2px)'));
}

export default function Vision({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const flowWindow = Math.max(1, Math.round(Number(config.flowWindow ?? 10)));
  const glow = typeof config.glow === 'string' ? config.glow : '#4c9bff';
  const tiltDeg = Number(config.tilt ?? 4);
  const parallaxPx = Number(config.parallax ?? 10);

  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1200);
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const stacked = device === 'mobile' || width < 1000;
  const glass = supportsBackdrop() && quality.level !== 'minimal' && quality.level !== 'eco';
  const spatial = glass && !stacked;
  const motionOn = (quality.motion === 'subtle' || quality.motion === 'ambient') && !quality.suspended;
  const parallax = spatial && motionOn && parallaxPx > 0;

  const [layout, setLayout] = useState<Layout>(() => sanitize(host.getLocal<Layout | null>('windows', null)));
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const commit = useCallback(
    (next: Layout) => {
      layoutRef.current = next;
      setLayout(next);
      host.setLocal('windows', next);
    },
    [host],
  );
  const front = useCallback(
    (id: WinId) => {
      const l = layoutRef.current;
      if (l.order[l.order.length - 1] === id && !l.wins[id].min) return;
      commit({ wins: { ...l.wins, [id]: { ...l.wins[id], min: false } }, order: [...l.order.filter((x) => x !== id), id] });
    },
    [commit],
  );
  const minimize = (id: WinId) => {
    commit({ ...layout, wins: { ...layout.wins, [id]: { ...layout.wins[id], min: true } } });
    host.announce(`${TITLE[id]} réduite dans le dock`);
  };
  const restore = (id: WinId) => {
    front(id);
    host.announce(`${TITLE[id]} au premier plan`);
    requestAnimationFrame(() => document.getElementById(`vz-win-${id}`)?.focus({ preventScroll: !stacked }));
  };
  const reset = () => {
    commit(freshLayout());
    host.announce('Disposition des fenêtres réinitialisée');
  };

  useEffect(
    () =>
      host.provideCommands([
        ...IDS.map((id) => ({ id: `vision.focus.${id}`, label: `Vision : afficher « ${TITLE[id]} »`, keyword: 'fenêtre', run: () => restore(id) })),
        { id: 'vision.reset', label: 'Vision : réinitialiser la disposition', keyword: 'fenêtres', run: reset },
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host],
  );

  /* ---------- drag (UI layout only, never an operation) ---------- */
  const onBarDown = (id: WinId) => (e: RPointerEvent<HTMLElement>) => {
    if (stacked || e.button !== 0 || (e.target as HTMLElement).closest('button, input, a')) return;
    const area = areaRef.current?.getBoundingClientRect();
    const el = document.getElementById(`vz-win-${id}`);
    if (!area || !el) return;
    e.preventDefault();
    const start = { px: e.clientX, py: e.clientY, x: layout.wins[id].x, y: layout.wins[id].y };
    let nx = start.x;
    let ny = start.y;
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    el.dataset.dragging = 'true';
    const move = (ev: PointerEvent) => {
      nx = clamp(start.x + (ev.clientX - start.px) / area.width, 0, 1 - DEFAULT[id].w);
      ny = clamp(start.y + (ev.clientY - start.py) / area.height, 0, 1 - 0.12);
      el.style.left = `${nx * 100}%`;
      el.style.top = `${ny * 100}%`;
    };
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      delete el.dataset.dragging;
      const l = layoutRef.current;
      commit({ ...l, wins: { ...l.wins, [id]: { ...l.wins[id], x: nx, y: ny } } });
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  };
  const onGripKey = (id: WinId) => (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 0.06 : 0.02;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const w = layout.wins[id];
    commit({ ...layout, wins: { ...layout.wins, [id]: { ...w, x: clamp(w.x + d[0], 0, 1 - DEFAULT[id].w), y: clamp(w.y + d[1], 0, 1 - 0.12) } } });
  };

  /* ---------- parallax: CSS variables only, one frame per pointer move ---------- */
  const raf = useRef(0);
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (!parallax || e.pointerType !== 'mouse' || raf.current) return;
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * 2 - 1;
    const py = ((e.clientY - r.top) / r.height) * 2 - 1;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
    });
  };
  useEffect(() => {
    const el = rootRef.current;
    if (!parallax && el) {
      el.style.setProperty('--px', '0');
      el.style.setProperty('--py', '0');
    }
    return () => cancelAnimationFrame(raf.current);
  }, [parallax]);

  /* ---------- data ---------- */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const flows = useMemo(() => flowStats(g.windowEvents(g.now - flowWindow * 60_000, g.now), g.catalog), [g.version, g.now, flowWindow, g.filters, g.catalog]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notifs = useMemo(() => notifications(g), [g.version, g.canViewConfidential]);
  const pending = Object.values(g.state.decisions).filter((d) => d.status === 'pending').length;
  const openCount = Object.values(g.state.tasks).filter((t) => t.status === 'running' || t.status === 'pending' || t.status === 'paused').length;

  /* ---------- dock menu ---------- */
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  const top = layout.order[layout.order.length - 1];
  const badge: Partial<Record<WinId, number>> = { notifs: notifs.length, orders: openCount };

  const body = (id: WinId) => {
    switch (id) {
      case 'orders':
        return <OrdersWindow g={g} idx={idx} host={host} />;
      case 'flows':
        return <FlowMap stats={flows} catalog={g.catalog} animate={motionOn} windowMin={flowWindow} onDept={(d) => host.select({ kind: 'department', id: d })} />;
      case 'activity':
        return <ActivityWindow g={g} />;
      case 'agents':
        return <AgentsWindow g={g} host={host} motion={motionOn} />;
      case 'notifs':
        return <NotificationsWindow items={notifs} now={g.now} host={host} />;
    }
  };

  const windows = (stacked ? MOBILE_ORDER : IDS).map((id) => {
    const r = DEFAULT[id];
    const w = layout.wins[id];
    const z = layout.order.indexOf(id);
    const depth = 0.45 + (z / (IDS.length - 1)) * 0.55;
    const cx = w.x + r.w / 2;
    const tilt = spatial ? (cx - 0.5) * -2 * tiltDeg : 0;
    const Icon = ICON[id];
    const style = stacked
      ? undefined
      : { left: `${w.x * 100}%`, top: `${w.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`, zIndex: z + 1, ['--depth' as string]: depth.toFixed(2), ['--tilt' as string]: `${tilt.toFixed(2)}deg` };
    return (
      <section
        key={id}
        id={`vz-win-${id}`}
        className="vz-win"
        data-win={id}
        data-top={top === id ? 'true' : undefined}
        data-min={w.min ? 'true' : undefined}
        style={style}
        tabIndex={-1}
        aria-labelledby={`vz-t-${id}`}
        hidden={!stacked && w.min}
        onPointerDownCapture={() => !stacked && front(id)}
        onFocusCapture={() => !stacked && top !== id && front(id)}
      >
        <header className="vz-win__bar" onPointerDown={onBarDown(id)}>
          {!stacked && (
            <button type="button" className="vz-win__grip" aria-label={`Déplacer « ${TITLE[id]} » avec les flèches`} onKeyDown={onGripKey(id)}>
              <i />
              <i />
              <i />
            </button>
          )}
          {stacked && (
            <span className="vz-win__icon" aria-hidden>
              <Icon size={15} />
            </span>
          )}
          <h2 className="vz-win__title" id={`vz-t-${id}`}>
            {TITLE[id]}
          </h2>
          {!!badge[id] && <span className="vz-win__badge num">{badge[id]}</span>}
          {(!stacked || !w.min) && (
            <button type="button" className="vz-win__btn" onClick={() => (stacked ? commit({ ...layout, wins: { ...layout.wins, [id]: { ...w, min: true } } }) : minimize(id))} aria-label={`Réduire « ${TITLE[id]} »`}>
              <IconMinus size={15} />
            </button>
          )}
          {stacked && w.min && (
            <button type="button" className="vz-win__btn" onClick={() => commit({ ...layout, wins: { ...layout.wins, [id]: { ...w, min: false } } })} aria-label={`Déplier « ${TITLE[id]} »`}>
              <IconGallery size={15} />
            </button>
          )}
        </header>
        {!(stacked && w.min) && <div className="vz-win__body">{body(id)}</div>}
      </section>
    );
  });

  const dockItem = (id: WinId) => {
    const Icon = ICON[id];
    const w = layout.wins[id];
    return (
      <button
        key={id}
        type="button"
        className="vz-dock__btn"
        data-on={!stacked && top === id && !w.min ? 'true' : undefined}
        data-min={w.min ? 'true' : undefined}
        onClick={() => (stacked ? document.getElementById(`vz-win-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }) : restore(id))}
        aria-label={`${TITLE[id]}${w.min ? ' (réduite)' : ''}`}
        title={TITLE[id]}
      >
        <Icon size={18} />
        {!!badge[id] && id === 'notifs' && <span className="vz-dock__n">{badge[id]}</span>}
      </button>
    );
  };

  const summary = `Vision : ${IDS.length} fenêtres de verre. ${flows.exchanges} échanges réels sur ${flowWindow} minutes, ${openCount} commandes ouvertes, ${notifs.length} notifications dont ${pending} décisions à arbitrer.${
    !stacked ? ` Fenêtres réduites : ${IDS.filter((id) => layout.wins[id].min).map((id) => TITLE[id]).join(', ') || 'aucune'}.` : ''
  }`;

  return (
    <div
      ref={rootRef}
      className="vz"
      data-glass={glass ? 'on' : 'off'}
      data-spatial={spatial ? 'true' : undefined}
      data-parallax={parallax ? 'true' : undefined}
      data-stacked={stacked ? 'true' : undefined}
      data-quality={quality.level}
      style={{ ['--vz-glow' as string]: glow, ['--vz-par' as string]: `${parallaxPx}px` }}
      onPointerMove={onMove}
    >
      <p className="sr-only">{summary}</p>
      <div className="vz-backdrop" aria-hidden>
        <i className="vz-orb vz-orb--1" />
        <i className="vz-orb vz-orb--2" />
        <i className="vz-orb vz-orb--3" />
        <i className="vz-orb vz-orb--4" />
        <i className="vz-floor" />
      </div>

      <nav className="vz-dock" aria-label="Dock des fenêtres">
        <span className="vz-dock__logo" aria-hidden>
          <IconGovernor size={18} />
        </span>
        {!stacked && <span className="vz-dock__label">Principal</span>}
        <div className="vz-dock__group" ref={menuRef}>
          <button type="button" className="vz-dock__btn vz-dock__btn--main" data-min={(['activity', 'flows', 'orders'] as WinId[]).some((id) => layout.wins[id].min) ? 'true' : undefined} aria-expanded={menu} aria-controls="vz-menu" aria-label="Tableaux" title="Tableaux" onClick={() => setMenu((m) => !m)}>
            <IconGallery size={18} />
          </button>
          {menu && (
            <div className="vz-menu" id="vz-menu" role="menu" aria-label="Tableaux">
              {(['activity', 'flows', 'orders'] as WinId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className="vz-menu__item"
                  data-on={top === id && !layout.wins[id].min ? 'true' : undefined}
                  onClick={() => {
                    setMenu(false);
                    if (stacked) document.getElementById(`vz-win-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                    else restore(id);
                  }}
                >
                  {TITLE[id]}
                  {layout.wins[id].min && <small>réduite</small>}
                </button>
              ))}
            </div>
          )}
        </div>
        {dockItem('agents')}
        {dockItem('notifs')}
        <span className="vz-dock__sep" aria-hidden />
        <button type="button" className="vz-dock__btn" onClick={() => host.openDecisions()} aria-label={`Décisions (${pending} en attente)`} title="Décisions">
          <IconDecision size={18} />
          {pending > 0 && <span className="vz-dock__n vz-dock__n--alert">{pending}</span>}
        </button>
        {!stacked && (
          <button type="button" className="vz-dock__btn vz-dock__btn--end" onClick={reset} aria-label="Réinitialiser la disposition des fenêtres" title="Réinitialiser la disposition">
            <IconReset size={18} />
          </button>
        )}
      </nav>

      <div className="vz-area" ref={areaRef}>
        {windows}
      </div>
    </div>
  );
}
