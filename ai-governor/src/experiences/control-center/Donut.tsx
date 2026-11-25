/**
 * Donut with rounded-cap segments separated by gaps. Categorical colours in
 * fixed order (series 1..4); beyond 4 entries the tail folds into "Autres".
 */
import { useState } from 'react';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
}

const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)'];

export function foldSlices(slices: DonutSlice[], max = 4): DonutSlice[] {
  const sorted = [...slices].filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const rest = sorted.slice(max - 1).reduce((s, x) => s + x.value, 0);
  return [...head, { key: '__other', label: 'Autres', value: rest }];
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

export function Donut({ slices, total, format, centerLabel, label }: { slices: DonutSlice[]; total: number; format: (n: number) => string; centerLabel: string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const size = 188;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const cap = (stroke / 2) / r; // angle eaten by a round cap
  const gap = 0.05;
  let a = 0;
  const segs = slices.map((s, i) => {
    const span = total > 0 ? (s.value / total) * Math.PI * 2 : 0;
    const a0 = a + gap / 2 + cap;
    const a1 = a + span - gap / 2 - cap;
    a += span;
    return { s, i, a0, a1, mid: (a0 + a1) / 2, span };
  });
  const focus = hover != null ? slices[hover] : undefined;
  return (
    <div className="cc-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} : ${slices.map((s) => `${s.label} ${format(s.value)}`).join(', ')}`}>
        <circle cx={c} cy={c} r={r} style={{ fill: 'none', stroke: 'var(--c-sunken)', strokeWidth: stroke }} />
        {segs.map(({ s, i, a0, a1, span }) =>
          span <= 0 ? null : a1 > a0 ? (
            <path
              key={s.key}
              d={arc(c, c, r, a0, a1)}
              style={{ fill: 'none', stroke: COLORS[i % COLORS.length], strokeWidth: hover === i ? stroke + 4 : stroke, strokeLinecap: 'round', transition: 'stroke-width 160ms ease' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ) : (
            <circle key={s.key} cx={c + r * Math.cos((a0 + a1) / 2 - Math.PI / 2)} cy={c + r * Math.sin((a0 + a1) / 2 - Math.PI / 2)} r={stroke / 2} style={{ fill: COLORS[i % COLORS.length] }} />
          ),
        )}
        <text x={c} y={c - 2} textAnchor="middle" className="cc-donut__total">
          {format(focus ? focus.value : total)}
        </text>
        <text x={c} y={c + 18} textAnchor="middle" className="cc-donut__caption">
          {focus ? focus.label : centerLabel}
        </text>
      </svg>
      <ul className="cc-donut__legend">
        {slices.map((s, i) => (
          <li key={s.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} data-active={hover === i || undefined}>
            <i style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
            <span className="cc-donut__name">{s.label}</span>
            <b className="num">{format(s.value)}</b>
            <span className="num t-muted cc-donut__share">{total > 0 ? `${Math.round((s.value / total) * 100)} %` : '—'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
