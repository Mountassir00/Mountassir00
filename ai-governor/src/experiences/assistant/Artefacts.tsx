/** Renders the data artefacts of an answer (all built from the design-system primitives and charts). */
import { memo, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { HostApi } from '@sdk';
import { HBars, Legend, LineArea, NatureBadge, StackedColumns, type Series } from '@ds';
import { fmtUnit, type Block, type Kpi, type Link } from './answer';

const dayFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const hourFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtX = (bucket: 'hour' | 'day') => (t: number) => (bucket === 'day' ? dayFmt.format(t) : hourFmt.format(t));

export function follow(host: HostApi, link: Link) {
  if (link.kind === 'decisions') host.openDecisions();
  else host.select({ kind: link.kind, id: link.id });
}

function KpiTile({ k }: { k: Kpi }) {
  return (
    <div className="as-kpi" data-unavailable={k.nature === 'unavailable' || undefined}>
      <span className="as-kpi__label">{k.label}</span>
      <b className="as-kpi__value num">{k.value}</b>
      <span className="as-kpi__foot">
        {k.delta && (
          <span className={`pill ${k.delta.good == null ? '' : k.delta.good ? 'pill--up' : 'pill--down'}`} title="Par rapport à la période précédente de même durée">
            {k.delta.text}
          </span>
        )}
        {k.sub && <span className="as-kpi__sub">{k.sub}</span>}
      </span>
      <NatureBadge nature={k.nature} />
    </div>
  );
}

function CardHead({ title, nature, extra }: { title: string; nature: Parameters<typeof NatureBadge>[0]['nature']; extra?: ReactNode }) {
  return (
    <div className="as-card__head">
      <h4>{title}</h4>
      <span className="as-card__meta">
        {extra}
        <NatureBadge nature={nature} />
      </span>
    </div>
  );
}

function LinkLabel({ link, host, children }: { link?: Link; host: HostApi; children: ReactNode }) {
  if (!link) return <>{children}</>;
  return (
    <button type="button" className="as-link" onClick={() => follow(host, link)}>
      {children}
    </button>
  );
}

/** Side-by-side columns for "period vs previous" (stacking them would add up two periods). */
function GroupedColumns({ points, a, b, fmtY, fmtX, label }: { points: Array<{ t: number; a: number; b: number }>; a: { label: string; color: string }; b: { label: string; color: string }; fmtY: (n: number) => string; fmtX: (t: number) => string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  const [hover, setHover] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 190;
  const padL = 48;
  const padB = 22;
  const padT = 8;
  const innerW = w - padL - 4;
  const innerH = H - padB - padT;
  const raw = Math.max(0, ...points.flatMap((p) => [p.a, p.b]));
  const pw = raw > 0 ? Math.pow(10, Math.floor(Math.log10(raw))) : 1;
  const max = raw > 0 ? [1, 2, 2.5, 5, 10].map((m) => m * pw).find((m) => m >= raw) ?? raw : 1;
  const slot = innerW / Math.max(1, points.length);
  const bw = Math.max(1.5, Math.min(12, (slot - 4) / 2));
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const every = Math.ceil(points.length / Math.max(2, Math.floor(innerW / 70)));
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg className="chart" width={w} height={H} role="img" aria-label={label}>
        <g className="grid">
          {[0, max / 2, max].map((t) => (
            <line key={t} x1={padL} x2={w - 4} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {[0, max / 2, max].map((t) => (
            <text key={t} x={padL - 6} y={y(t) + 4} textAnchor="end">
              {fmtY(t)}
            </text>
          ))}
          {points.map((p, i) =>
            i % every === 0 ? (
              <text key={p.t} x={padL + i * slot + slot / 2} y={H - 6} textAnchor="middle">
                {fmtX(p.t)}
              </text>
            ) : null,
          )}
        </g>
        {points.map((p, i) => {
          const cx = padL + i * slot + slot / 2;
          const op = hover == null || hover === i ? 1 : 0.45;
          return (
            <g key={p.t} opacity={op}>
              <rect x={cx - bw - 1} y={y(p.a)} width={bw} height={Math.max(0, y(0) - y(p.a))} rx={Math.min(3, bw / 2)} fill={a.color} />
              <rect x={cx + 1} y={y(p.b)} width={bw} height={Math.max(0, y(0) - y(p.b))} rx={Math.min(3, bw / 2)} fill={b.color} />
              <rect x={padL + i * slot} y={padT} width={slot} height={innerH} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
        <line className="baseline" x1={padL} x2={w - 4} y1={y(0)} y2={y(0)} />
      </svg>
      {hover != null && points[hover] && (
        <div className="chart-tip" style={{ left: Math.min(w - 170, padL + hover * slot + slot / 2 + 8), top: 4 }}>
          <div className="t-micro t-muted">{fmtX(points[hover].t)}</div>
          {[a, b].map((s, k) => (
            <div className="row" key={s.label}>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <i className="sw" style={{ background: s.color }} />
                {s.label}
              </span>
              <b className="num">{fmtY(k === 0 ? points[hover].a : points[hover].b)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const Artefact = memo(function Artefact({ b, host, onAsk }: { b: Block; host: HostApi; onAsk: (q: string) => void }) {
  switch (b.kind) {
    case 'kpis':
      return (
        <div className="as-kpis" data-n={b.items.length}>
          {b.items.map((k) => (
            <KpiTile key={k.label} k={k} />
          ))}
        </div>
      );
    case 'columns': {
      const series: Series[] = b.series;
      const empty = b.points.every((p) => Object.values(p.v).every((v) => !v));
      return (
        <section className="as-card">
          <CardHead title={b.title} nature={b.nature} />
          {series.length > 1 && <Legend series={series} />}
          {empty ? (
            <p className="as-empty">Aucune valeur sur la période.</p>
          ) : (
            <StackedColumns
              data={b.points.map((p) => ({ t: p.t, ...p.v }))}
              series={series}
              height={190}
              value={(d, k) => (d as unknown as Record<string, number>)[k] ?? 0}
              fmtY={(n) => fmtUnit(b.unit, n)}
              fmtX={fmtX(b.bucket)}
              label={`${b.title} : ${b.points.length} ${b.bucket === 'day' ? 'jours' : 'heures'}`}
            />
          )}
        </section>
      );
    }
    case 'grouped':
      return (
        <section className="as-card">
          <CardHead title={b.title} nature={b.nature} />
          <Legend series={[{ key: 'a', ...b.a }, { key: 'b', ...b.b }]} />
          <GroupedColumns points={b.points} a={b.a} b={b.b} fmtY={(n) => fmtUnit(b.unit, n)} fmtX={fmtX(b.bucket)} label={`${b.title} : ${b.points.length} ${b.bucket === 'day' ? 'jours' : 'heures'}`} />
        </section>
      );
    case 'line':
      return (
        <section className="as-card">
          <CardHead title={b.title} nature={b.nature} />
          {b.points.length < 2 ? (
            <p className="as-empty">Pas assez de points pour tracer une courbe.</p>
          ) : (
            <LineArea data={b.points} value={(d) => d.v} height={170} fmtY={(n) => fmtUnit(b.unit, n)} fmtX={fmtX(b.bucket)} label={b.title} color="var(--series-1)" />
          )}
        </section>
      );
    case 'bars':
      return (
        <section className="as-card">
          <CardHead title={b.title} nature={b.nature} />
          {b.rows.length ? (
            <HBars
              label={b.title}
              fmt={(n) => fmtUnit(b.unit, n)}
              rows={b.rows.map((r) => ({ key: r.key, label: <LinkLabel link={r.link} host={host}>{r.label}</LinkLabel>, value: r.value, note: r.note }))}
            />
          ) : (
            <p className="as-empty">Aucune donnée.</p>
          )}
        </section>
      );
    case 'table':
      return (
        <section className="as-card">
          <CardHead title={b.title} nature={b.nature} />
          {b.rows.length ? (
            <div className="as-table">
              <table className="table">
                <thead>
                  <tr>
                    {b.columns.map((c) => (
                      <th key={c.key} className={c.align === 'r' ? 'r' : undefined} data-narrow={c.narrow || undefined} scope="col">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((r, i) => (
                    <tr key={i}>
                      {b.columns.map((c, j) => (
                        <td key={c.key} className={c.align === 'r' ? 'r' : undefined} data-narrow={c.narrow || undefined}>
                          {j === 0 ? (
                            <LinkLabel link={r.link} host={host}>
                              {r.cells[c.key]}
                            </LinkLabel>
                          ) : (
                            r.cells[c.key]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="as-empty">Aucune ligne.</p>
          )}
        </section>
      );
    case 'list':
      return (
        <section className="as-card">
          <CardHead title={b.title} nature={b.nature} extra={b.items.length ? <span className="as-count">{b.items.length}</span> : undefined} />
          {b.items.length ? (
            <ul className="as-list">
              {b.items.map((it, i) => (
                <li key={i}>
                  {it.tone && <i className="as-dot" style={{ ['--sc' as string]: `var(--st-${it.tone})` }} aria-hidden />}
                  <span className="as-list__text">
                    <LinkLabel link={it.link} host={host}>
                      {it.label}
                    </LinkLabel>
                    {it.sub && <small>{it.sub}</small>}
                  </span>
                  {it.badge && <span className={`pill ${it.tone === 'error' ? 'pill--risk-high' : it.tone === 'waiting' ? 'pill--risk-medium' : it.tone === 'validating' ? 'pill--risk-low' : ''}`}>{it.badge}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="as-empty">{b.empty ?? 'Aucun élément.'}</p>
          )}
        </section>
      );
    case 'note':
      return <p className="as-note">{b.text}</p>;
    case 'chips':
      return (
        <div className="as-chipset">
          <span className="as-chipset__title">{b.title}</span>
          <div className="as-chipset__list">
            {b.items.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => onAsk(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      );
  }
});
