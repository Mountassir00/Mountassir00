/**
 * HTML overlays anchored to 3D positions.
 *
 *  - <SceneLabels>: crisp, accessible, clickable pill cards (title, subtitle,
 *    status dot, live count). Positions are written directly to the DOM after
 *    each rendered frame (no React render per frame). Labels behind the
 *    camera or off-screen are hidden; at far zoom low-priority labels are
 *    dropped and overlapping labels are decluttered (higher priority wins).
 *  - <Anchored>: positions any children at a world point (hover cards…).
 */
import { useEffect, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { Vector3 } from 'three';
import type { AgentStatus } from '@sdk';
import type { PickSelection } from './picking';
import type { Stage3D } from './stage';
import './three.css';

export type Vec3Like = Vector3 | [number, number, number];

export interface SceneLabel {
  id: string;
  /** World position, or a getter for moving targets. */
  position: Vec3Like | (() => Vec3Like);
  title: string;
  subtitle?: string;
  /** Agent status (uses --st-*) or any CSS colour. */
  status?: AgentStatus | string;
  statusLabel?: string;
  /** Live figure shown on the right (e.g. "3 en cours"). */
  count?: ReactNode;
  /** 0 = decor … 3 = always visible when on screen. */
  priority?: number;
  selection?: PickSelection;
  selected?: boolean;
  /** Extra accessible text. */
  description?: string;
}

const STATUSES = ['working', 'waiting', 'collaborating', 'researching', 'validating', 'error', 'paused', 'idle', 'offline'];
const _v = new Vector3();
const toVec = (p: Vec3Like) => (Array.isArray(p) ? _v.set(p[0], p[1], p[2]) : _v.copy(p));

export function SceneLabels({
  stage, labels, onSelect, onHover, farDistance = 30, hidden = false, className, avoid,
}: {
  stage: Stage3D | null;
  labels: SceneLabel[];
  onSelect?: (sel: PickSelection, label: SceneLabel) => void;
  onHover?: (label: SceneLabel | null) => void;
  /** Camera distance beyond which only priority ≥ 2 labels stay. */
  farDistance?: number;
  hidden?: boolean;
  className?: string;
  /** Overlay elements labels must not sit under (minimap, toolbars). Measured each frame. */
  avoid?: () => Array<Element | null | undefined>;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const avoidRef = useRef(avoid);
  avoidRef.current = avoid;
  const live = useRef(labels);
  live.current = labels;
  const sizes = useRef(new Map<string, { w: number; h: number }>());

  // measure once per content change
  useLayoutEffect(() => {
    const el = layer.current;
    if (!el) return;
    sizes.current.clear();
    el.querySelectorAll<HTMLElement>('[data-label-id]').forEach((n) => sizes.current.set(n.dataset.labelId!, { w: n.offsetWidth, h: n.offsetHeight }));
    stage?.invalidate();
  }, [labels, stage]);

  useEffect(() => {
    if (!stage) return;
    const pos = { x: 0, y: 0, visible: false, depth: 0 };
    const place = () => {
      const el = layer.current;
      if (!el) return;
      const nodes = new Map<string, HTMLElement>();
      el.querySelectorAll<HTMLElement>('[data-label-id]').forEach((n) => nodes.set(n.dataset.labelId!, n));
      const far = stage.rig.distance > farDistance;
      const items = live.current
        .map((l) => {
          const p = typeof l.position === 'function' ? l.position() : l.position;
          stage.project(toVec(p), pos);
          return { l, x: pos.x, y: pos.y, visible: pos.visible, depth: pos.depth };
        })
        .sort((a, b) => (b.l.selected ? 9 : b.l.priority ?? 1) - (a.l.selected ? 9 : a.l.priority ?? 1) || a.depth - b.depth);
      const placed: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
      const blockers: typeof placed = [];
      const base = el.getBoundingClientRect();
      for (const b of avoidRef.current?.() ?? []) {
        if (!b) continue;
        const r = b.getBoundingClientRect();
        if (r.width && r.height) blockers.push({ x0: r.left - base.left, y0: r.top - base.top, x1: r.right - base.left, y1: r.bottom - base.top });
      }
      const hits = (box: { x0: number; y0: number; x1: number; y1: number }, list: typeof placed, m = 4) => list.some((b) => box.x0 < b.x1 + m && box.x1 > b.x0 - m && box.y0 < b.y1 + 2 && box.y1 > b.y0 - 2);
      for (const it of items) {
        const n = nodes.get(it.l.id);
        if (!n) continue;
        const sz = sizes.current.get(it.l.id) ?? { w: 140, h: 44 };
        const pr = it.l.selected ? 9 : it.l.priority ?? 1;
        let show = it.visible && !(far && pr < 2);
        // centred above the anchor, kept inside the canvas horizontally
        const x0 = Math.min(stage.size.w - sz.w - 4, Math.max(4, it.x - sz.w / 2));
        const y0 = Math.max(4, it.y - sz.h - 6);
        const box = { x0, y0, x1: x0 + sz.w, y1: y0 + sz.h };
        if (show && hits(box, blockers, 2)) show = false;
        if (show && pr < 9 && hits(box, placed)) show = false;
        if (show) placed.push(box);
        n.style.transform = `translate3d(${Math.round(box.x0)}px, ${Math.round(box.y0)}px, 0)`;
        if (n.dataset.hidden !== String(!show)) {
          n.dataset.hidden = String(!show);
          n.tabIndex = show ? 0 : -1;
          n.setAttribute('aria-hidden', String(!show));
        }
        n.style.zIndex = String(10 + Math.round((1 - it.depth) * 1000));
      }
    };
    const off = stage.onFrame(place);
    stage.invalidate();
    return off;
  }, [stage, farDistance]);

  return (
    <div ref={layer} className={`t3-labels ${className ?? ''}`} data-hidden={hidden || undefined}>
      {labels.map((l) => {
        const isStatus = l.status && STATUSES.includes(l.status);
        const dot = l.status ? (isStatus ? `var(--st-${l.status})` : l.status) : undefined;
        const aria = [l.title, l.subtitle, l.statusLabel, typeof l.count === 'string' || typeof l.count === 'number' ? String(l.count) : '', l.description].filter(Boolean).join(' · ');
        return (
          <button
            key={l.id}
            type="button"
            className="t3-label"
            data-label-id={l.id}
            data-selected={l.selected || undefined}
            data-hidden="true"
            tabIndex={-1}
            aria-hidden="true"
            aria-label={aria}
            onClick={() => l.selection && onSelect?.(l.selection, l)}
            onMouseEnter={() => onHover?.(l)}
            onMouseLeave={() => onHover?.(null)}
            onFocus={() => onHover?.(l)}
            onBlur={() => onHover?.(null)}
          >
            {dot && <i className="t3-label__dot" style={{ ['--dot' as string]: dot }} aria-hidden />}
            <span className="t3-label__text">
              <b>{l.title}</b>
              {l.subtitle && <small>{l.subtitle}</small>}
            </span>
            {l.count != null && l.count !== '' && <span className="t3-label__count">{l.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Keeps its children positioned at a world point (centered horizontally,
 * bottom edge at the point + `offsetY`). Hidden when the point is off-screen.
 */
export function Anchored({ stage, position, children, offsetY = 12, className, style }: { stage: Stage3D | null; position: Vec3Like | (() => Vec3Like) | null; children: ReactNode; offsetY?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const posRef = useRef(position);
  posRef.current = position;
  useEffect(() => {
    if (!stage) return;
    const out = { x: 0, y: 0, visible: false, depth: 0 };
    const place = () => {
      const el = ref.current;
      const p = posRef.current;
      if (!el) return;
      if (!p) {
        el.style.visibility = 'hidden';
        return;
      }
      stage.project(toVec(typeof p === 'function' ? p() : p), out);
      el.style.visibility = out.visible ? 'visible' : 'hidden';
      // keep the card inside the canvas
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = Math.min(stage.size.w - w - 8, Math.max(8, out.x - w / 2));
      let y = out.y - h - offsetY;
      if (y < 8) y = out.y + offsetY + 24;
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    };
    const off = stage.onFrame(place);
    stage.invalidate();
    return off;
  }, [stage, offsetY]);
  useLayoutEffect(() => {
    stage?.invalidate();
  }, [position, stage]);
  return (
    <div ref={ref} className={`t3-anchored ${className ?? ''}`} style={{ visibility: 'hidden', ...style }}>
      {children}
    </div>
  );
}
