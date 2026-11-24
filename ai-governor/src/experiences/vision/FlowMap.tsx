/**
 * "Flux" window: a route-map of the real exchanges of the last minutes.
 * Departments are city blocks; models, tools and data are terminals on the
 * right. Each route is an actual aggregate of llm/tool/flow events — none is
 * drawn without an event behind it. The most recent route is animated only
 * when motion is allowed.
 */
import { useMemo, type KeyboardEvent } from 'react';
import { fmtCompact, fmtDuration, fmtInt, type Catalog, type DataNature, type GovEvent } from '@sdk';
import { NatureBadge } from '@ds';

const W = 400;
const H = 250;
const COLS = 5;
const BX = 14;
const BY = 18;
const BW = 48;
const BH = 34;
const GX = 12;
const GY = 34;
const TERM_X = 368;

type Term = 'models' | 'tools' | 'data';
const TERMS: Array<{ id: Term; label: string; y: number }> = [
  { id: 'models', label: 'Modèles', y: 46 },
  { id: 'tools', label: 'Outils', y: 124 },
  { id: 'data', label: 'Données', y: 202 },
];

function termOf(kind: string): Term | null {
  if (kind === 'model' || kind === 'provider') return 'models';
  if (kind === 'tool' || kind === 'mcp' || kind === 'connector' || kind === 'skill') return 'tools';
  if (kind === 'database' || kind === 'queue' || kind === 'process') return 'data';
  return null;
}

interface Route {
  key: string;
  from: string;
  to: string;
  toDept: boolean;
  count: number;
  last: number;
  failed: number;
}

export interface FlowStats {
  routes: Route[];
  exchanges: number;
  tokens: number;
  latency: number | null;
  nature: DataNature;
}

export function flowStats(events: readonly GovEvent[], catalog: Catalog): FlowStats {
  const home = new Map(catalog.agents.map((a) => [a.id, a.departmentIds[0]]));
  const map = new Map<string, Route>();
  let tokens = 0;
  let lat = 0;
  let latN = 0;
  let demo = false;
  let n = 0;
  for (const e of events) {
    if (!e.destination || (e.type !== 'flow' && e.type !== 'llm.call' && e.type !== 'tool.call')) continue;
    const from = e.department ?? (e.actor ? home.get(e.actor.id) : undefined) ?? (e.origin.kind === 'agent' || e.origin.kind === 'service' ? home.get(e.origin.id) : undefined);
    if (!from) continue;
    let to: string | null = termOf(e.destination.kind);
    let toDept = false;
    if (!to) {
      const d = e.destination.kind === 'department' ? e.destination.id : home.get(e.destination.id);
      if (!d || d === from) continue;
      to = d;
      toDept = true;
    }
    n++;
    if (e.nature === 'demo') demo = true;
    tokens += (e.metrics?.inputTokens ?? 0) + (e.metrics?.outputTokens ?? 0) + (e.metrics?.cacheReadTokens ?? 0);
    if (e.metrics?.latencyMs != null) {
      lat += e.metrics.latencyMs;
      latN++;
    } else if (e.durationMs != null) {
      lat += e.durationMs;
      latN++;
    }
    const key = `${from}>${to}`;
    const r = map.get(key) ?? { key, from, to, toDept, count: 0, last: 0, failed: 0 };
    r.count++;
    r.last = Math.max(r.last, e.ts);
    if (e.status === 'failed') r.failed++;
    map.set(key, r);
  }
  return { routes: [...map.values()].sort((a, b) => a.last - b.last), exchanges: n, tokens, latency: latN ? lat / latN : null, nature: demo ? 'demo' : 'real' };
}

export function FlowMap({ stats, catalog, animate, windowMin, onDept }: { stats: FlowStats; catalog: Catalog; animate: boolean; windowMin: number; onDept: (id: string) => void }) {
  const blocks = useMemo(
    () =>
      catalog.departments.slice(0, 15).map((d, i) => {
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        return { d, x: BX + c * (BW + GX), y: BY + r * (BH + GY) };
      }),
    [catalog.departments],
  );
  const pos = new Map(blocks.map((b) => [b.d.id, b]));
  const active = new Set(stats.routes.flatMap((r) => [r.from, r.toDept ? r.to : '']));
  const termCount = new Map<string, number>();
  for (const r of stats.routes) if (!r.toDept) termCount.set(r.to, (termCount.get(r.to) ?? 0) + r.count);
  const latest = stats.routes[stats.routes.length - 1];

  const routePath = (r: Route): string | null => {
    const a = pos.get(r.from);
    if (!a) return null;
    const sx = a.x + BW / 2;
    const sy = a.y + BH;
    const street = sy + GY / 2;
    if (r.toDept) {
      const b = pos.get(r.to);
      if (!b) return null;
      const tx = b.x + BW / 2;
      const ty = b.y + BH;
      const st2 = ty + GY / 2;
      const lane = Math.max(street, st2);
      return `M${sx},${sy} V${lane} H${tx} V${ty}`;
    }
    const t = TERMS.find((x) => x.id === r.to)!;
    const corridor = 316 + TERMS.indexOf(t) * 5;
    return `M${sx},${sy} V${street} H${corridor} V${t.y} H${TERM_X - 14}`;
  };

  const key = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDept(id);
    }
  };

  return (
    <div className="vz-map">
      <svg viewBox={`0 0 ${W} ${H}`} className="vz-map__svg" role="group" aria-label={`Carte des flux réels des ${windowMin} dernières minutes : ${stats.exchanges} échanges sur ${stats.routes.length} itinéraires`}>
        <defs>
          <pattern id="vz-streets" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V16" fill="none" className="vz-map__minor" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#vz-streets)" />
        <path d={`M0 ${H * 0.82} C 90 ${H * 0.7} 170 ${H * 0.96} ${W} ${H * 0.74}`} className="vz-map__river" />
        <path d="M-10 40 L 410 180 M 120 -10 L 250 270" className="vz-map__avenue" />
        {[0, 1, 2].map((r) => (
          <path key={r} d={`M0 ${BY + r * (BH + GY) + BH + GY / 2} H${W}`} className="vz-map__street" />
        ))}
        {stats.routes.map((r) => {
          const d = routePath(r);
          if (!d) return null;
          const w = Math.min(4.5, 1.4 + Math.log2(1 + r.count));
          const isLatest = r === latest;
          return (
            <g key={r.key} className="vz-route" data-latest={isLatest ? 'true' : undefined} data-failed={r.failed ? 'true' : undefined}>
              <path d={d} className="vz-route__glow" style={{ strokeWidth: w + 5 }} />
              <path d={d} className="vz-route__line" style={{ strokeWidth: w }} />
              {isLatest && <path d={d} className="vz-route__run" data-animate={animate ? 'true' : undefined} />}
            </g>
          );
        })}
        {blocks.map(({ d, x, y }) => {
          const on = active.has(d.id);
          return (
            <g key={d.id} className="vz-block" data-on={on ? 'true' : undefined} role="button" tabIndex={0} aria-label={`Inspecter ${d.name}${on ? ' (échanges récents)' : ''}`} onClick={() => onDept(d.id)} onKeyDown={key(d.id)}>
              <rect x={x} y={y} width={BW} height={BH} rx={7} style={{ ['--tone' as string]: `var(--${d.tone})` }} className="vz-block__rect" />
              <text x={x + BW / 2} y={y + BH / 2 + 3.5} textAnchor="middle" className="vz-block__label">
                {short(d.name)}
              </text>
              {on && <circle cx={x + BW / 2} cy={y + BH} r={3.2} className="vz-block__pin" />}
            </g>
          );
        })}
        {TERMS.map((t) => (
          <g key={t.id} className="vz-term" data-on={termCount.get(t.id) ? 'true' : undefined}>
            <circle cx={TERM_X} cy={t.y} r={14} className="vz-term__ring" />
            <circle cx={TERM_X} cy={t.y} r={5} className="vz-term__core" />
            <text x={TERM_X} y={t.y + 27} textAnchor="middle" className="vz-term__label">
              {t.label}
            </text>
            {!!termCount.get(t.id) && (
              <text x={TERM_X} y={t.y - 19} textAnchor="middle" className="vz-term__n">
                {fmtInt(termCount.get(t.id)!)}
              </text>
            )}
          </g>
        ))}
      </svg>
      {!stats.exchanges && <p className="vz-map__empty">Aucun échange depuis {windowMin} min — aucune route tracée.</p>}
      <div className="vz-map__stats">
        <span>
          <b className="num">{fmtInt(stats.exchanges)}</b> échanges
        </span>
        <span>
          <b className="num">{fmtCompact(stats.tokens)}</b> tokens
        </span>
        <span>
          <b className="num">{stats.latency != null ? fmtDuration(stats.latency) : '—'}</b> latence moy.
        </span>
        <NatureBadge nature={stats.exchanges ? stats.nature : 'unavailable'} label={stats.exchanges ? undefined : 'Aucun flux'} />
      </div>
    </div>
  );
}

function short(name: string) {
  const w = name.replace(/ (Department|Laboratory|Office|Management|Control)$/i, '').split(' ');
  const s = w[w.length - 1];
  return s.length > 9 ? `${s.slice(0, 8)}.` : s;
}
