/**
 * Zoom & pan stage for spatial experiences (mouse, trackpad, touch, keyboard).
 * The transform is written directly to the DOM during gestures, so panning a
 * scene of hundreds of nodes never re-renders React.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconFit, IconZoomIn, IconZoomOut } from '../icons';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ZoomPanHandle {
  centerOn(x: number, y: number, k?: number): void;
  fit(): void;
  zoomBy(f: number): void;
}

export type ZoomBucket = 'far' | 'mid' | 'near';

interface Props {
  bounds: Bounds;
  children: ReactNode;
  label: string;
  minimap?: ReactNode;
  showMinimap?: boolean;
  onBackgroundClick?: () => void;
  onZoomBucket?: (b: ZoomBucket) => void;
  minZoom?: number;
  maxZoom?: number;
  /** Extra SVG <defs>. */
  defs?: ReactNode;
}

type View = { x: number; y: number; k: number };

const bucketOf = (k: number): ZoomBucket => (k < 0.62 ? 'far' : k < 1.3 ? 'mid' : 'near');

export const ZoomPan = forwardRef<ZoomPanHandle, Props>(function ZoomPan(
  { bounds, children, label, minimap, showMinimap = true, onBackgroundClick, onZoomBucket, minZoom = 0.25, maxZoom = 3, defs },
  ref,
) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const layer = useRef<SVGGElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const size = useRef({ w: 800, h: 600 });
  const listeners = useRef(new Set<() => void>());
  const bucket = useRef<ZoomBucket>('mid');
  const fitted = useRef(false);
  /** Once the user pans or zooms, a resize no longer refits the scene. */
  const userMoved = useRef(false);

  const apply = useCallback(() => {
    const v = view.current;
    layer.current?.setAttribute('transform', `translate(${v.x.toFixed(1)} ${v.y.toFixed(1)}) scale(${v.k.toFixed(4)})`);
    const b = bucketOf(v.k);
    if (b !== bucket.current) {
      bucket.current = b;
      onZoomBucket?.(b);
    }
    for (const l of listeners.current) l();
  }, [onZoomBucket]);

  const clampK = (k: number) => Math.max(minZoom, Math.min(maxZoom, k));

  const fit = useCallback(() => {
    const { w, h } = size.current;
    const bw = Math.max(1, bounds.maxX - bounds.minX);
    const bh = Math.max(1, bounds.maxY - bounds.minY);
    const pad = w < 600 ? 16 : 48;
    const k = clampK(Math.min((w - pad * 2) / bw, (h - pad * 2) / bh, 1.4));
    view.current = { k, x: (w - bw * k) / 2 - bounds.minX * k, y: (h - bh * k) / 2 - bounds.minY * k };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY, apply]);

  const zoomAt = useCallback(
    (f: number, px: number, py: number) => {
      const v = view.current;
      const k = clampK(v.k * f);
      const r = k / v.k;
      view.current = { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r };
      apply();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apply],
  );

  useImperativeHandle(ref, () => ({
    centerOn(x, y, k) {
      const { w, h } = size.current;
      const kk = clampK(k ?? view.current.k);
      view.current = { k: kk, x: w / 2 - x * kk, y: h / 2 - y * kk };
      apply();
    },
    fit,
    zoomBy(f) {
      zoomAt(f, size.current.w / 2, size.current.h / 2);
    },
  }));

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      size.current = { w: width, h: height };
      if ((!fitted.current || !userMoved.current) && width > 0) {
        fitted.current = true;
        fit();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fit]);

  // Gestures.
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; vx: number; vy: number } | null = null;
    let pinch: { d: number; k: number; cx: number; cy: number } | null = null;
    let moved = false;
    const local = (e: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      const p = local(e);
      const mouseWheel = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && e.deltaX === 0);
      if (e.ctrlKey || e.metaKey || mouseWheel) zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)), p.x, p.y);
      else {
        view.current = { ...view.current, x: view.current.x - e.deltaX, y: view.current.y - e.deltaY };
        apply();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pointers.set(e.pointerId, local(e));
      moved = false;
      if (pointers.size === 1) {
        const p = local(e);
        start = { x: p.x, y: p.y, vx: view.current.x, vy: view.current.y };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.current.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        start = null;
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const p = local(e);
      pointers.set(e.pointerId, p);
      if (pinch && pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const target = clampK(pinch.k * (d / pinch.d));
        zoomAt(target / view.current.k, pinch.cx, pinch.cy);
        moved = true;
        userMoved.current = true;
        return;
      }
      if (start) {
        const dx = p.x - start.x;
        const dy = p.y - start.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) {
          moved = true;
          userMoved.current = true;
          el.setPointerCapture(e.pointerId);
          el.dataset.dragging = 'true';
        }
        view.current = { ...view.current, x: start.vx + dx, y: start.vy + dy };
        apply();
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (!pointers.size) {
        start = null;
        delete el.dataset.dragging;
      }
    };
    // A drag must never be interpreted as a click on an agent or a flow.
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('click', onClickCapture, true);
    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('click', onClickCapture, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply, zoomAt]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== svg.current) return;
    const step = 60;
    const v = view.current;
    const map: Record<string, () => void> = {
      ArrowLeft: () => (view.current = { ...v, x: v.x + step }),
      ArrowRight: () => (view.current = { ...v, x: v.x - step }),
      ArrowUp: () => (view.current = { ...v, y: v.y + step }),
      ArrowDown: () => (view.current = { ...v, y: v.y - step }),
      '+': () => zoomAt(1.2, size.current.w / 2, size.current.h / 2),
      '=': () => zoomAt(1.2, size.current.w / 2, size.current.h / 2),
      '-': () => zoomAt(1 / 1.2, size.current.w / 2, size.current.h / 2),
      '0': () => fit(),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      userMoved.current = e.key !== '0';
      fn();
      apply();
    }
  };

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0 }}>
      <svg
        ref={svg}
        className="iso-svg"
        role="group"
        aria-label={`${label}. Flèches pour se déplacer, + et − pour zoomer, 0 pour recadrer.`}
        tabIndex={0}
        onKeyDown={onKey}
        onClick={(e) => {
          if (e.target === svg.current || (e.target as Element).classList?.contains('zp-bg')) onBackgroundClick?.();
        }}
      >
        {defs && <defs>{defs}</defs>}
        <rect className="zp-bg" x={0} y={0} width="100%" height="100%" fill="transparent" />
        <g ref={layer}>{children}</g>
      </svg>
      <div className="zp-controls">
        <button type="button" className="btn btn--icon btn--sm" onClick={() => zoomAt(1.25, size.current.w / 2, size.current.h / 2)} aria-label="Zoomer">
          <IconZoomIn size={16} />
        </button>
        <button type="button" className="btn btn--icon btn--sm" onClick={() => zoomAt(0.8, size.current.w / 2, size.current.h / 2)} aria-label="Dézoomer">
          <IconZoomOut size={16} />
        </button>
        <button type="button" className="btn btn--icon btn--sm" onClick={fit} aria-label="Recadrer la scène">
          <IconFit size={16} />
        </button>
      </div>
      {minimap && showMinimap && <Minimap bounds={bounds} view={view} size={size} listeners={listeners.current} onJump={(x, y) => {
        const { w, h } = size.current;
        const k = view.current.k;
        view.current = { k, x: w / 2 - x * k, y: h / 2 - y * k };
        apply();
      }}>{minimap}</Minimap>}
    </div>
  );
});

function Minimap({ bounds, view, size, listeners, onJump, children }: {
  bounds: Bounds; view: React.RefObject<View>; size: React.RefObject<{ w: number; h: number }>; listeners: Set<() => void>; onJump: (x: number, y: number) => void; children: ReactNode;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    let raf = 0;
    const l = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        force((n) => n + 1);
      });
    };
    listeners.add(l);
    return () => {
      listeners.delete(l);
      cancelAnimationFrame(raf);
    };
  }, [listeners]);
  const pad = 40;
  const vb = { x: bounds.minX - pad, y: bounds.minY - pad, w: bounds.maxX - bounds.minX + pad * 2, h: bounds.maxY - bounds.minY + pad * 2 };
  const v = view.current!;
  const s = size.current!;
  const rect = { x: -v.x / v.k, y: -v.y / v.k, w: s.w / v.k, h: s.h / v.k };
  return (
    <div
      className="minimap"
      role="button"
      tabIndex={-1}
      aria-label="Mini-carte : cliquer pour se déplacer"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const sc = Math.max(vb.w / r.width, vb.h / r.height);
        const offX = (r.width * sc - vb.w) / 2;
        const offY = (r.height * sc - vb.h) / 2;
        onJump(vb.x - offX + (e.clientX - r.left) * sc, vb.y - offY + (e.clientY - r.top) * sc);
      }}
    >
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
        {children}
        <rect className="minimap__view" x={rect.x} y={rect.y} width={rect.w} height={rect.h} />
      </svg>
    </div>
  );
}
