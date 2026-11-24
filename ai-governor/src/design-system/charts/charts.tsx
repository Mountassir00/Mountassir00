/**
 * Lightweight SVG charts (no chart library): thin marks, one axis, legend for
 * ≥ 2 series, hover tooltip, recessive grid. Text uses ink tokens, never the
 * series colour.
 */
import { useMemo, useRef, useState, type ReactNode } from 'react';

export interface Series {
  key: string;
  label: string;
  color: string;
}

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return n * p;
};

function useWidth(initial = 640) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  const ro = useRef<ResizeObserver | null>(null);
  const setRef = (el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (el) {
      ro.current = new ResizeObserver(([e]) => setW(Math.max(200, Math.round(e.contentRect.width))));
      ro.current.observe(el);
    }
  };
  return [setRef, w] as const;
}

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="legend" aria-hidden>
      {series.map((s) => (
        <span key={s.key}>
          <i style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function StackedColumns<T extends { t: number }>({
  data, series, height = 200, value, fmtY, fmtX, fmtTip, label,
}: {
  data: T[];
  series: Series[];
  height?: number;
  value: (d: T, key: string) => number;
  fmtY: (n: number) => string;
  fmtX: (t: number) => string;
  fmtTip?: (n: number) => string;
  label: string;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 48;
  const padB = 22;
  const padT = 8;
  const innerW = width - padL - 4;
  const innerH = height - padB - padT;
  const totals = data.map((d) => series.reduce((s, x) => s + value(d, x.key), 0));
  const max = niceMax(Math.max(0, ...totals));
  const slot = innerW / Math.max(1, data.length);
  const bw = Math.max(2, Math.min(24, slot - 3));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70)));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={width} height={height} role="img" aria-label={label}>
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={padL} x2={width - 4} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t) => (
            <text key={t} x={padL - 6} y={y(t) + 4} textAnchor="end">
              {fmtY(t)}
            </text>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.t} x={padL + i * slot + slot / 2} y={height - 6} textAnchor="middle">
                {fmtX(d.t)}
              </text>
            ) : null,
          )}
        </g>
        {data.map((d, i) => {
          let acc = 0;
          const x = padL + i * slot + (slot - bw) / 2;
          const segs = series.map((s, si) => {
            const v = value(d, s.key);
            if (v <= 0) return null;
            const y0 = y(acc);
            acc += v;
            const y1 = y(acc);
            const h = Math.max(0, y0 - y1 - (si > 0 ? 2 : 0));
            const top = series.slice(si + 1).every((n) => value(d, n.key) <= 0);
            const r = top ? Math.min(4, bw / 2, h) : 0;
            return (
              <path
                key={s.key}
                d={`M${x},${y1 + h} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + bw - r} Q${x + bw},${y1} ${x + bw},${y1 + r} V${y1 + h} Z`}
                fill={s.color}
                opacity={hover == null || hover === i ? 1 : 0.45}
              />
            );
          });
          return (
            <g key={d.t}>
              {segs}
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
        <line className="baseline" x1={padL} x2={width - 4} y1={y(0)} y2={y(0)} />
      </svg>
      {hover != null && data[hover] && (
        <div className="chart-tip" style={{ left: Math.min(width - 170, padL + hover * slot + slot / 2 + 8), top: 4 }}>
          <div className="t-micro t-muted">{fmtX(data[hover].t)}</div>
          {series.map((s) => (
            <div className="row" key={s.key}>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <i className="sw" style={{ background: s.color }} />
                {s.label}
              </span>
              <b className="num">{(fmtTip ?? fmtY)(value(data[hover], s.key))}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LineArea<T extends { t: number }>({
  data, value, height = 160, color = 'var(--series-1)', fmtY, fmtX, label, markers,
}: {
  data: T[];
  value: (d: T) => number;
  height?: number;
  color?: string;
  fmtY: (n: number) => string;
  fmtX: (t: number) => string;
  label: string;
  markers?: Array<{ t: number; label: string }>;
}) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 48;
  const padB = 22;
  const padT = 10;
  const innerW = width - padL - 8;
  const innerH = height - padB - padT;
  const vals = data.map(value);
  const max = niceMax(Math.max(0, ...vals));
  const t0 = data[0]?.t ?? 0;
  const t1 = data[data.length - 1]?.t ?? 1;
  const x = (t: number) => padL + ((t - t0) / Math.max(1, t1 - t0)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const pts = data.map((d, i) => `${x(d.t).toFixed(1)},${y(vals[i]).toFixed(1)}`);
  const line = pts.length ? `M${pts.join(' L')}` : '';
  const area = pts.length ? `${line} L${x(t1)},${y(0)} L${x(t0)},${y(0)} Z` : '';
  const ticks = [0, max / 2, max];
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        className="chart"
        width={width}
        height={height}
        role="img"
        aria-label={label}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = e.clientX - r.left;
          if (!data.length) return;
          const tt = t0 + ((px - padL) / innerW) * (t1 - t0);
          let best = 0;
          for (let i = 1; i < data.length; i++) if (Math.abs(data[i].t - tt) < Math.abs(data[best].t - tt)) best = i;
          setHover(best);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={padL} x2={width - 8} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t) => (
            <text key={t} x={padL - 6} y={y(t) + 4} textAnchor="end">
              {fmtY(t)}
            </text>
          ))}
          {[t0, (t0 + t1) / 2, t1].map((t, i) => (
            <text key={i} x={x(t)} y={height - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>
              {fmtX(t)}
            </text>
          ))}
        </g>
        {markers?.map((m) => (
          <g key={m.t}>
            <line x1={x(m.t)} x2={x(m.t)} y1={padT} y2={y(0)} stroke="var(--c-ink-muted)" strokeDasharray="3 3" />
            <text className="lbl" x={x(m.t) + 4} y={padT + 10}>
              {m.label}
            </text>
          </g>
        ))}
        <path d={area} fill={color} opacity={0.1} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hover != null && data[hover] && (
          <g>
            <line className="hover-line" x1={x(data[hover].t)} x2={x(data[hover].t)} y1={padT} y2={y(0)} />
            <circle cx={x(data[hover].t)} cy={y(vals[hover])} r={4} fill={color} stroke="var(--c-raised)" strokeWidth={2} />
          </g>
        )}
        <line className="baseline" x1={padL} x2={width - 8} y1={y(0)} y2={y(0)} />
      </svg>
      {hover != null && data[hover] && (
        <div className="chart-tip" style={{ left: Math.min(width - 170, x(data[hover].t) + 10), top: 4 }}>
          <div className="t-micro t-muted">{fmtX(data[hover].t)}</div>
          <b className="num">{fmtY(vals[hover])}</b>
        </div>
      )}
    </div>
  );
}

export function HBars({ rows, fmt, label, color = 'var(--series-1)', extra }: { rows: Array<{ key: string; label: ReactNode; value: number; note?: ReactNode }>; fmt: (n: number) => string; label: string; color?: string; extra?: ReactNode }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.value));
  return (
    <div role="list" aria-label={label} style={{ display: 'grid', gap: 10 }}>
      {rows.map((r) => (
        <div role="listitem" key={r.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 30%) 1fr auto', gap: 10, alignItems: 'center' }}>
          <div className="t-small" style={{ minWidth: 0 }}>
            {r.label}
            {r.note && <div className="t-micro t-muted">{r.note}</div>}
          </div>
          <svg height={14} width="100%" aria-hidden>
            <rect x={0} y={1} height={12} width={`${Math.max(0.5, (r.value / max) * 100)}%`} rx={3} fill={color} />
          </svg>
          <b className="num t-small">{fmt(r.value)}</b>
        </div>
      ))}
      {extra}
    </div>
  );
}

/** Paired before/after bars for one metric. */
export function BeforeAfterBars({ before, after, fmt, label }: { before: number; after: number; fmt: (n: number) => string; label: string }) {
  const max = Math.max(before, after, 1e-9);
  const rows = useMemo(
    () => [
      { k: 'Avant', v: before, c: 'var(--c-ink-muted)' },
      { k: 'Après', v: after, c: 'var(--series-1)' },
    ],
    [before, after],
  );
  return (
    <div role="img" aria-label={`${label} : avant ${fmt(before)}, après ${fmt(after)}`} style={{ display: 'grid', gap: 6 }}>
      {rows.map((r) => (
        <div key={r.k} style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto', gap: 8, alignItems: 'center' }}>
          <span className="t-micro t-muted">{r.k}</span>
          <svg height={12} width="100%" aria-hidden>
            <rect x={0} y={1} height={10} width={`${Math.max(0.5, (r.v / max) * 100)}%`} rx={3} fill={r.c} />
          </svg>
          <span className="num t-small">{fmt(r.v)}</span>
        </div>
      ))}
    </div>
  );
}
