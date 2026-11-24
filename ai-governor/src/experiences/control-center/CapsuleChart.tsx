/**
 * Capsule bar chart (single series): hatched rounded bars, the focused bar
 * solid with its value in a floating pill. One axis, 3 ticks. Keyboard:
 * focus the chart, then ←/→ (Home/End) to move between bars.
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { niceMax } from './data';

export interface CapsulePoint {
  t: number;
  value: number;
  label: string;
  /** Full description for the tooltip and the screen reader. */
  detail: string;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function CapsuleChart({
  points, format, height = 230, label, onCountHint,
}: { points: CapsulePoint[]; format: (n: number) => string; height?: number; label: string; onCountHint?: (n: number) => void }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const pid = useId().replace(/:/g, '');
  const [focus, setFocus] = useState<number | null>(null);
  const [live, setLive] = useState('');
  useEffect(() => {
    onCountHint?.(Math.max(8, Math.min(30, Math.floor(width / 34))));
  }, [width, onCountHint]);

  const padL = 44;
  const padT = 40;
  const padB = 26;
  const innerW = Math.max(10, width - padL - 6);
  const innerH = height - padT - padB;
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const slot = innerW / Math.max(1, points.length);
  const bw = Math.max(6, Math.min(28, slot * 0.62));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const lastNonEmpty = useMemo(() => {
    for (let i = points.length - 1; i >= 0; i--) if (points[i].value > 0) return i;
    return null;
  }, [points]);
  const hi = focus ?? lastNonEmpty;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(3, Math.floor(innerW / 64))));
  const ticks = [0, max / 2, max];

  const move = (i: number) => {
    const n = Math.max(0, Math.min(points.length - 1, i));
    setFocus(n);
    const p = points[n];
    if (p) setLive(`${p.label} : ${p.detail}`);
  };
  const onKey = (e: KeyboardEvent) => {
    const cur = focus ?? lastNonEmpty ?? points.length - 1;
    if (e.key === 'ArrowRight') move(cur + 1);
    else if (e.key === 'ArrowLeft') move(cur - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(points.length - 1);
    else return;
    e.preventDefault();
  };

  const hp = hi != null ? points[hi] : undefined;
  const hx = hi != null ? padL + hi * slot + slot / 2 : 0;
  const hy = hp ? y(hp.value) : 0;
  const pillW = hp ? Math.max(58, format(hp.value).length * 7.4 + 22) : 0;

  return (
    <div ref={ref} className="cc-capsule">
      <svg
        className="chart"
        width={width}
        height={height}
        role="group"
        tabIndex={0}
        aria-label={`${label}. Flèches gauche et droite pour parcourir les ${points.length} intervalles.`}
        onKeyDown={onKey}
        onMouseLeave={() => setFocus(null)}
        onBlur={() => setFocus(null)}
      >
        <defs>
          <pattern id={`h${pid}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" style={{ fill: 'color-mix(in oklab, var(--c-ink-muted) 16%, var(--c-raised))' }} />
            <line x1="0" y1="0" x2="0" y2="6" style={{ stroke: 'color-mix(in oklab, var(--c-ink-muted) 70%, transparent)', strokeWidth: 2.2 }} />
          </pattern>
        </defs>
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={padL} x2={width - 6} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t) => (
            <text key={t} x={padL - 8} y={y(t) + 4} textAnchor="end">
              {format(t)}
            </text>
          ))}
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={p.t} x={padL + i * slot + slot / 2} y={height - 6} textAnchor="middle">
                {p.label}
              </text>
            ) : null,
          )}
        </g>
        {points.map((p, i) => {
          const x = padL + i * slot + (slot - bw) / 2;
          const top = p.value > 0 ? Math.min(y(p.value), y(0) - bw) : y(0) - 3;
          const h = y(0) - top;
          const isHi = i === hi;
          return (
            <g key={p.t} onMouseEnter={() => setFocus(i)}>
              <rect x={padL + i * slot} y={padT - 30} width={slot} height={innerH + 30} fill="transparent" />
              <rect
                className="bar-grow cc-capsule__bar"
                x={x}
                y={top}
                width={bw}
                height={Math.max(3, h)}
                rx={bw / 2}
                style={{ fill: isHi ? 'var(--c-accent)' : p.value > 0 ? `url(#h${pid})` : 'var(--c-sunken)', animationDelay: `${Math.min(i, 24) * 14}ms` }}
              />
            </g>
          );
        })}
        {hp && hp.value > 0 && (
          <g className="cc-capsule__pill" pointerEvents="none">
            <line x1={hx} x2={hx} y1={hy - 6} y2={hy - 14} style={{ stroke: 'var(--c-active)', strokeWidth: 1.5 }} />
            <rect x={Math.min(width - pillW - 4, Math.max(padL, hx - pillW / 2))} y={Math.max(2, hy - 40)} width={pillW} height={26} rx={13} style={{ fill: 'var(--c-active)' }} />
            <text x={Math.min(width - pillW - 4, Math.max(padL, hx - pillW / 2)) + pillW / 2} y={Math.max(2, hy - 40) + 17} textAnchor="middle" style={{ fill: 'var(--c-active-ink)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)' }}>
              {format(hp.value)}
            </text>
            <circle cx={hx} cy={hy} r={4.5} style={{ fill: 'var(--c-raised)', stroke: 'var(--c-accent)', strokeWidth: 2.5 }} />
          </g>
        )}
        <line className="baseline" x1={padL} x2={width - 6} y1={y(0)} y2={y(0)} />
      </svg>
      {hp && (
        <div className="cc-capsule__caption t-micro t-muted" aria-hidden>
          {hp.label} · {hp.detail}
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {live}
      </span>
    </div>
  );
}
