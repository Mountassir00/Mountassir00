/**
 * Workspace kit — IDE-like building blocks shared by the "workspace" views:
 * DockLayout (resizable, collapsible panels that become tabs on phones),
 * ExplorerTree (keyboard-navigable tree), LogTerminal (tabbed live logs),
 * PlanMinimap (top-down plan with agents). Pure presentation: data comes in
 * through props, so any view can feed them from the SDK.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { IconChevron, IconClose, IconMinimap } from '../icons';

/* ------------------------------------------------------------------ */
/* DockLayout                                                          */
/* ------------------------------------------------------------------ */

export interface DockPanel {
  id: string;
  label: string;
  content: ReactNode;
  /** Initial size in px (width for left/right, height for bottom). */
  size?: number;
  min?: number;
  max?: number;
  collapsed?: boolean;
}

type Mode = 'wide' | 'medium' | 'narrow';

export function DockLayout({
  left, right, bottom, center, centerLabel = 'Scène', onSizes, sizes, className,
}: {
  left?: DockPanel;
  right?: DockPanel;
  bottom?: DockPanel;
  center: ReactNode;
  centerLabel?: string;
  /** Persist panel sizes / collapsed state (e.g. host.setLocal). */
  onSizes?: (s: DockSizes) => void;
  sizes?: Partial<DockSizes>;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('wide');
  const [s, setS] = useState<DockSizes>(() => ({
    left: sizes?.left ?? left?.size ?? 260,
    right: sizes?.right ?? right?.size ?? 340,
    bottom: sizes?.bottom ?? bottom?.size ?? 200,
    leftCollapsed: sizes?.leftCollapsed ?? left?.collapsed ?? false,
    rightCollapsed: sizes?.rightCollapsed ?? right?.collapsed ?? false,
    bottomCollapsed: sizes?.bottomCollapsed ?? bottom?.collapsed ?? false,
  }));
  const [tab, setTab] = useState<string>('center');
  const [overlay, setOverlay] = useState<'left' | 'right' | null>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = e.contentRect.width;
      setMode(w < 640 ? 'narrow' : w < 1080 ? 'medium' : 'wide');
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const update = (patch: Partial<DockSizes>) =>
    setS((prev) => {
      const next = { ...prev, ...patch };
      onSizes?.(next);
      return next;
    });

  const drag = (which: 'left' | 'right' | 'bottom') => (e: React.PointerEvent) => {
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY, v: s[which] };
    const panel = which === 'left' ? left : which === 'right' ? right : bottom;
    const min = panel?.min ?? (which === 'bottom' ? 90 : 180);
    const max = panel?.max ?? (which === 'bottom' ? 520 : 560);
    const move = (ev: PointerEvent) => {
      const d = which === 'left' ? ev.clientX - start.x : which === 'right' ? start.x - ev.clientX : start.y - ev.clientY;
      update({ [which]: Math.max(min, Math.min(max, start.v + d)) } as Partial<DockSizes>);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const keyResize = (which: 'left' | 'right' | 'bottom') => (e: KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 12;
    const dir = which === 'bottom' ? (e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0) : (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0) * (which === 'right' ? -1 : 1);
    if (dir) {
      e.preventDefault();
      update({ [which]: Math.max(90, s[which] + dir * step) } as Partial<DockSizes>);
    }
  };

  if (mode === 'narrow') {
    const tabs = [{ id: 'center', label: centerLabel }, ...[left, right, bottom].filter(Boolean).map((p) => ({ id: p!.id, label: p!.label }))];
    const current = [left, right, bottom].find((p) => p?.id === tab);
    return (
      <div ref={root} className={`dock dock--narrow ${className ?? ''}`}>
        <div className="dock__tabs" role="tablist" aria-label="Panneaux">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="dock__narrow-body" role="tabpanel">
          <div className="dock__center" style={{ display: tab === 'center' ? undefined : 'none' }}>
            {center}
          </div>
          {current && <div className="dock__panel dock__panel--full">{current.content}</div>}
        </div>
      </div>
    );
  }

  const showLeft = left && !s.leftCollapsed && mode === 'wide';
  const showRight = right && !s.rightCollapsed && mode === 'wide';
  const cols = [showLeft ? `${s.left}px 6px` : '', 'minmax(0, 1fr)', showRight ? `6px ${s.right}px` : ''].filter(Boolean).join(' ');
  return (
    <div ref={root} className={`dock ${className ?? ''}`} data-mode={mode}>
      <div className="dock__row" style={{ gridTemplateColumns: cols }}>
        {showLeft && (
          <>
            <section className="dock__panel" aria-label={left!.label}>
              <PanelHead label={left!.label} onClose={() => update({ leftCollapsed: true })} />
              <div className="dock__panel-body">{left!.content}</div>
            </section>
            <div className="dock__gutter" role="separator" aria-orientation="vertical" aria-label={`Redimensionner ${left!.label}`} tabIndex={0} onPointerDown={drag('left')} onKeyDown={keyResize('left')} />
          </>
        )}
        <div className="dock__mid" style={{ gridTemplateRows: bottom && !s.bottomCollapsed ? `minmax(0, 1fr) 6px ${s.bottom}px` : 'minmax(0, 1fr)' }}>
          <div className="dock__center">
            {center}
            <div className="dock__toggles">
              {left && (s.leftCollapsed || mode !== 'wide') && (
                <button type="button" className="btn btn--sm btn--raised" onClick={() => (mode === 'wide' ? update({ leftCollapsed: false }) : setOverlay(overlay === 'left' ? null : 'left'))}>
                  {left.label}
                </button>
              )}
              {right && (s.rightCollapsed || mode !== 'wide') && (
                <button type="button" className="btn btn--sm btn--raised" onClick={() => (mode === 'wide' ? update({ rightCollapsed: false }) : setOverlay(overlay === 'right' ? null : 'right'))}>
                  {right.label}
                </button>
              )}
              {bottom && s.bottomCollapsed && (
                <button type="button" className="btn btn--sm btn--raised" onClick={() => update({ bottomCollapsed: false })}>
                  {bottom.label}
                </button>
              )}
            </div>
          </div>
          {bottom && !s.bottomCollapsed && (
            <>
              <div className="dock__gutter dock__gutter--h" role="separator" aria-orientation="horizontal" aria-label={`Redimensionner ${bottom.label}`} tabIndex={0} onPointerDown={drag('bottom')} onKeyDown={keyResize('bottom')} />
              <section className="dock__panel dock__panel--bottom" aria-label={bottom.label}>
                <div className="dock__panel-body">{bottom.content}</div>
                <button type="button" className="btn btn--sm btn--icon btn--ghost dock__collapse" onClick={() => update({ bottomCollapsed: true })} aria-label={`Masquer ${bottom.label}`}>
                  <IconChevron size={14} style={{ transform: 'rotate(90deg)' }} />
                </button>
              </section>
            </>
          )}
        </div>
        {showRight && (
          <>
            <div className="dock__gutter" role="separator" aria-orientation="vertical" aria-label={`Redimensionner ${right!.label}`} tabIndex={0} onPointerDown={drag('right')} onKeyDown={keyResize('right')} />
            <section className="dock__panel" aria-label={right!.label}>
              <PanelHead label={right!.label} onClose={() => update({ rightCollapsed: true })} />
              <div className="dock__panel-body">{right!.content}</div>
            </section>
          </>
        )}
      </div>
      {overlay && mode !== 'wide' && (
        <section className={`dock__overlay dock__overlay--${overlay}`} aria-label={(overlay === 'left' ? left : right)!.label}>
          <PanelHead label={(overlay === 'left' ? left : right)!.label} onClose={() => setOverlay(null)} />
          <div className="dock__panel-body">{(overlay === 'left' ? left : right)!.content}</div>
        </section>
      )}
    </div>
  );
}

export interface DockSizes {
  left: number;
  right: number;
  bottom: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
}

function PanelHead({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <div className="dock__head">
      <span>{label}</span>
      <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={onClose} aria-label={`Masquer ${label}`}>
        <IconClose size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ExplorerTree                                                        */
/* ------------------------------------------------------------------ */

export interface TreeNode {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Right-side marker (status dot, letter, count). */
  badge?: ReactNode;
  hint?: string;
  children?: TreeNode[];
  defaultOpen?: boolean;
}

export function ExplorerTree({ title, nodes, selectedId, onSelect, actions }: { title?: string; nodes: TreeNode[]; selectedId?: string | null; onSelect?: (id: string) => void; actions?: ReactNode }) {
  const initial = useMemo(() => {
    const open = new Set<string>();
    const walk = (ns: TreeNode[]) => ns.forEach((n) => {
      if (n.children && n.defaultOpen !== false) open.add(n.id);
      if (n.children) walk(n.children);
    });
    walk(nodes);
    return open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [open, setOpen] = useState<Set<string>>(initial);
  const [focus, setFocus] = useState<string | null>(null);
  const flat = useMemo(() => {
    const out: Array<{ n: TreeNode; depth: number; parent?: string }> = [];
    const walk = (ns: TreeNode[], depth: number, parent?: string) => ns.forEach((n) => {
      out.push({ n, depth, parent });
      if (n.children && open.has(n.id)) walk(n.children, depth + 1, n.id);
    });
    walk(nodes, 0);
    return out;
  }, [nodes, open]);
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (focus) ref.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(focus)}"]`)?.focus();
  }, [focus]);
  const toggle = (id: string) => setOpen((o) => {
    const n = new Set(o);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const onKey = (e: KeyboardEvent, i: number) => {
    const item = flat[i];
    if (e.key === 'ArrowDown') setFocus(flat[Math.min(flat.length - 1, i + 1)].n.id);
    else if (e.key === 'ArrowUp') setFocus(flat[Math.max(0, i - 1)].n.id);
    else if (e.key === 'ArrowRight' && item.n.children && !open.has(item.n.id)) toggle(item.n.id);
    else if (e.key === 'ArrowLeft') {
      if (item.n.children && open.has(item.n.id)) toggle(item.n.id);
      else if (item.parent) setFocus(item.parent);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (item.n.children) toggle(item.n.id);
      onSelect?.(item.n.id);
    } else return;
    e.preventDefault();
  };
  return (
    <div className="tree">
      {(title || actions) && (
        <div className="tree__title">
          <span>{title}</span>
          {actions}
        </div>
      )}
      <ul ref={ref} role="tree" aria-label={title ?? 'Arborescence'}>
        {flat.map(({ n, depth }, i) => (
          <li
            key={n.id}
            role="treeitem"
            aria-level={depth + 1}
            aria-expanded={n.children ? open.has(n.id) : undefined}
            aria-selected={selectedId === n.id}
            data-id={n.id}
            tabIndex={(focus ?? selectedId ?? flat[0]?.n.id) === n.id ? 0 : -1}
            className="tree__item"
            style={{ paddingLeft: 8 + depth * 16 }}
            title={n.hint}
            onClick={() => {
              if (n.children) toggle(n.id);
              setFocus(n.id);
              onSelect?.(n.id);
            }}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="tree__chev" aria-hidden>
              {n.children ? <IconChevron size={12} style={{ transform: open.has(n.id) ? 'rotate(90deg)' : undefined }} /> : null}
            </span>
            {n.icon && <span className="tree__icon">{n.icon}</span>}
            <span className="tree__label">{n.label}</span>
            {n.badge && <span className="tree__badge">{n.badge}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LogTerminal                                                         */
/* ------------------------------------------------------------------ */

export interface LogLine {
  id: string;
  ts: number;
  /** e.g. agent name; coloured with `color`. */
  tag?: string;
  color?: string;
  level?: 'info' | 'success' | 'warn' | 'error' | 'idle';
  text: string;
}

export function LogTerminal({
  tabs, active, onTab, lines, aside, toolbar, emptyText = 'Aucune ligne pour le moment.',
}: {
  tabs: Array<{ id: string; label: string; count?: number }>;
  active: string;
  onTab: (id: string) => void;
  lines: LogLine[];
  aside?: ReactNode;
  toolbar?: ReactNode;
  emptyText?: string;
}) {
  const body = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  useEffect(() => {
    const el = body.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [lines]);
  const fmt = (ts: number) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts);
  return (
    <div className="term">
      <div className="term__bar">
        <div className="term__tabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === active} onClick={() => onTab(t.id)}>
              {t.label}
              {t.count != null && t.count > 0 && <span className="term__count">{t.count}</span>}
            </button>
          ))}
        </div>
        <div className="term__tools">{toolbar}</div>
      </div>
      <div className="term__main" data-aside={aside ? 'true' : undefined}>
        <div
          ref={body}
          className="term__body"
          role="log"
          aria-live="off"
          tabIndex={0}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
          }}
        >
          {lines.length === 0 && <div className="term__empty">{emptyText}</div>}
          {lines.map((l) => (
            <div key={l.id} className="term__line" data-level={l.level}>
              <span className="term__ts">{fmt(l.ts)}</span>
              {l.tag && (
                <span className="term__tag" style={{ ['--tag' as string]: l.color ?? 'var(--c-ink-muted)' }}>
                  <i aria-hidden />
                  {l.tag}
                </span>
              )}
              {l.level && <span className="term__lvl">[{LEVEL[l.level]}]</span>}
              <span className="term__text">{l.text}</span>
            </div>
          ))}
        </div>
        {aside && <aside className="term__aside">{aside}</aside>}
      </div>
    </div>
  );
}
const LEVEL = { info: 'INFO', success: 'OK', warn: 'ATTENTION', error: 'ERREUR', idle: 'INACTIF' } as const;

/* ------------------------------------------------------------------ */
/* PlanMinimap                                                         */
/* ------------------------------------------------------------------ */

export interface PlanItem {
  id: string;
  kind: 'room' | 'object' | 'agent';
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
  label?: string;
}

/**
 * Small top-down (optionally isometric) plan of a scene. Cheap SVG: safe to
 * keep visible while the main 3D view sleeps.
 */
export function PlanMinimap({
  items, bounds, title = 'Plan', iso = true, view, onPick, footer,
}: {
  items: PlanItem[];
  bounds: { x: number; y: number; w: number; h: number };
  title?: string;
  iso?: boolean;
  view?: { x: number; y: number; w: number; h: number } | null;
  onPick?: (id: string) => void;
  footer?: ReactNode;
}) {
  const pad = 1;
  const vb = `${bounds.x - pad} ${bounds.y - pad} ${bounds.w + pad * 2} ${bounds.h + pad * 2}`;
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const tf = iso ? `translate(${cx} ${cy}) scale(1 0.58) rotate(45) translate(${-cx} ${-cy})` : undefined;
  return (
    <div className="plan">
      <div className="plan__head">
        <IconMinimap size={14} />
        <span>{title}</span>
      </div>
      <svg viewBox={vb} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`${title} : ${items.filter((i) => i.kind === 'agent').length} agents`}>
        <g transform={tf}>
          {items.filter((i) => i.kind === 'room').map((r) => (
            <rect key={r.id} x={r.x} y={r.y} width={r.w ?? 1} height={r.h ?? 1} rx={0.2} className="plan__room" style={{ fill: r.color }} onClick={() => onPick?.(r.id)} />
          ))}
          {items.filter((i) => i.kind === 'object').map((o) => (
            <rect key={o.id} x={o.x - (o.w ?? 0.6) / 2} y={o.y - (o.h ?? 0.6) / 2} width={o.w ?? 0.6} height={o.h ?? 0.6} rx={0.12} className="plan__obj" onClick={() => onPick?.(o.id)} />
          ))}
          {view && <rect x={view.x} y={view.y} width={view.w} height={view.h} className="plan__view" />}
        </g>
        {items.filter((i) => i.kind === 'agent').map((a) => {
          // agents are drawn upright (not skewed) at their projected position
          const p = iso ? isoProject(a.x, a.y, cx, cy) : { x: a.x, y: a.y };
          return (
            <g key={a.id} transform={`translate(${p.x} ${p.y})`} onClick={() => onPick?.(a.id)} className="plan__agent">
              <circle r={0.55} style={{ fill: a.color ?? 'var(--c-accent)' }} />
              <circle r={0.9} className="plan__halo" style={{ stroke: a.color ?? 'var(--c-accent)' }} />
            </g>
          );
        })}
      </svg>
      {footer && <div className="plan__foot">{footer}</div>}
    </div>
  );
}

function isoProject(x: number, y: number, cx: number, cy: number) {
  // same transform as the <g>: translate(c) scale(1, .58) rotate(45) translate(-c)
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.SQRT1_2;
  const rx = dx * r - dy * r;
  const ry = dx * r + dy * r;
  return { x: cx + rx, y: cy + ry * 0.58 };
}
