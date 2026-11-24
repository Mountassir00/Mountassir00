/**
 * AI System Map — technical, pedagogical cartography of the governor.
 *
 * Blocks come from the catalog (declared topology). Connections are either
 * declared dependencies (thin, idle) or REAL exchanges recorded in the
 * selected window (animated). Nothing is drawn as active unless an event
 * says so; flows whose endpoints are not mapped are counted, not invented.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Cylinder, IsoBox, IsoFigure, IsoFlowPath, iso, ZoomPan, type ZoomPanHandle } from '@ds';
import {
  displaySummary, fmtCompact, fmtDuration, fmtInt, recentFlows, useGovernor, STATUS_LABEL,
  type AgentStatus, type ExperienceProps, type Filters, type GovEvent, type SystemEdge, type SystemNode,
} from '@sdk';
import { computeLayout, center, hash, labelPoint, LANE_LABEL, pathOf, routePoints, type LaneId, type MapLayout, type NodePos } from './layout';
import { FlatGlyph, KIND_FILL, KIND_LABEL, TopGlyph } from './glyphs';
import './systemMap.css';

type FlowState = 'idle' | 'active' | 'error' | 'dim';

interface PairAgg {
  key: string;
  from: string;
  to: string;
  count: number;
  failed: number;
  lastTs: number;
  lastStatus: GovEvent['status'];
  lastSummary: string;
  kinds: Set<string>;
  tokens: number;
  latSum: number;
  latN: number;
}

interface Link {
  key: string;
  from: string;
  to: string;
  declared?: SystemEdge['kind'];
  agg?: PairAgg;
}

const EDGE_KIND: Record<SystemEdge['kind'], string> = {
  calls: 'appelle',
  reads: 'lit',
  writes: 'écrit',
  depends: 'dépend de',
  routes: 'route',
};

const BUSY: AgentStatus[] = ['working', 'collaborating', 'researching', 'validating'];

function excluded(n: SystemNode, f: Filters, deptOf: Map<string, string[]>): boolean {
  if ((n.kind === 'agent' || n.kind === 'service') && f.agents.length && !f.agents.includes(n.id)) return true;
  if ((n.kind === 'agent' || n.kind === 'service') && f.departments.length) {
    const depts = deptOf.get(n.id);
    if (depts && !depts.some((d) => f.departments.includes(d))) return true;
  }
  if (n.kind === 'model' && f.models.length && !f.models.includes(n.id)) return true;
  if (n.kind === 'provider' && f.providers.length && !f.providers.includes(n.provider ?? n.id)) return true;
  return false;
}

export default function SystemMap({ host, config, device, quality }: ExperienceProps) {
  const g = useGovernor();
  const zp = useRef<ZoomPanHandle>(null);
  const mobile = device === 'mobile';
  const [tech, setTech] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const showLabels = config.showLabels !== false;
  const showInvisible = config.showInvisible !== false;
  const blockH = Number(config.blockHeight ?? 0.5);
  const windowMin = Number(config.flowWindowMin ?? 10);
  const windowMs = windowMin * 60_000;
  const flowStyle = config.flowStyle === 'solid' ? 'solid' : 'dashes';

  const visibleNodes = useMemo(() => g.catalog.nodes.filter((n) => showInvisible || n.visibility !== 'none'), [g.catalog.nodes, showInvisible]);
  const layout = useMemo<MapLayout>(() => computeLayout({ ...g.catalog, nodes: visibleNodes }, mobile), [g.catalog, visibleNodes, mobile]);
  const nodeById = useMemo(() => new Map(visibleNodes.map((n) => [n.id, n])), [visibleNodes]);
  const deptOf = useMemo(() => new Map(g.catalog.agents.map((a) => [a.id, a.departmentIds])), [g.catalog.agents]);
  const avatarOf = useMemo(() => new Map(g.catalog.agents.map((a) => [a.id, a.avatar])), [g.catalog.agents]);

  // Real exchanges in the window (re-computed only when data, time or filters change).
  const traffic = useMemo(() => {
    const events = g.windowEvents(g.now - windowMs, g.now);
    const flows = recentFlows(events, g.now, windowMs);
    const pairs = new Map<string, PairAgg>();
    let unmapped = 0;
    for (const f of flows) {
      if (!layout.nodes.has(f.from) || !layout.nodes.has(f.to)) {
        unmapped++;
        continue;
      }
      const key = `${f.from}>${f.to}`;
      let a = pairs.get(key);
      if (!a) {
        a = { key, from: f.from, to: f.to, count: 0, failed: 0, lastTs: 0, lastStatus: f.status, lastSummary: '', kinds: new Set(), tokens: 0, latSum: 0, latN: 0 };
        pairs.set(key, a);
      }
      a.count++;
      if (f.status === 'failed') a.failed++;
      if (f.ts >= a.lastTs) {
        a.lastTs = f.ts;
        a.lastStatus = f.status;
        a.lastSummary = displaySummary({ summary: f.summary, confidentiality: f.confidentiality }, g.canViewConfidential);
      }
      a.kinds.add(f.kind);
      a.tokens += f.tokens ?? 0;
      if (f.latencyMs != null) {
        a.latSum += f.latencyMs;
        a.latN++;
      }
    }
    const errors = new Map<string, number>();
    for (const e of events) {
      if (e.status !== 'failed') continue;
      for (const id of new Set([e.actor?.id, e.origin.id, e.destination?.id])) if (id) errors.set(id, (errors.get(id) ?? 0) + 1);
    }
    const modelPerf = new Map<string, { calls: number; lat: number; latN: number }>();
    for (const a of pairs.values()) {
      if (nodeById.get(a.to)?.kind !== 'model') continue;
      const m = modelPerf.get(a.to) ?? { calls: 0, lat: 0, latN: 0 };
      m.calls += a.count;
      m.lat += a.latSum;
      m.latN += a.latN;
      modelPerf.set(a.to, m);
    }
    return { pairs, unmapped, errors, modelPerf, total: flows.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.version, g.now, windowMs, g.filters, layout, nodeById, g.canViewConfidential]);

  const pending = useMemo(() => Object.values(g.state.tasks).filter((t) => t.status === 'pending').length, [g.state, g.version]);

  const links = useMemo<Link[]>(() => {
    const m = new Map<string, Link>();
    for (const e of g.catalog.edges) {
      if (!layout.nodes.has(e.from) || !layout.nodes.has(e.to)) continue;
      const key = `${e.from}>${e.to}`;
      if (!m.has(key)) m.set(key, { key, from: e.from, to: e.to, declared: e.kind });
    }
    for (const a of traffic.pairs.values()) {
      const l = m.get(a.key) ?? { key: a.key, from: a.from, to: a.to };
      l.agg = a;
      m.set(a.key, l);
    }
    return [...m.values()];
  }, [g.catalog.edges, layout, traffic]);

  const sel = g.selection;
  const selNode = sel && (sel.kind === 'node' || sel.kind === 'agent') && layout.nodes.has(sel.id) ? sel.id : null;
  const selFlow = sel?.kind === 'flow' ? sel.id : null;

  // Centre on the selection when it changes (selection is shared across experiences).
  useEffect(() => {
    if (selNode) {
      const p = layout.nodes.get(selNode)!;
      const [cx, cy] = center(p);
      const [sx, sy] = iso(cx, cy, blockH / 2);
      zp.current?.centerOn(sx, sy);
    } else if (selFlow) {
      const l = links.find((x) => x.key === selFlow);
      const a = l && layout.nodes.get(l.from);
      const b = l && layout.nodes.get(l.to);
      if (a && b) {
        const [sx, sy] = labelPoint(routePoints(a, b, 0, layout.mobile));
        zp.current?.centerOn(sx, sy);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selNode, selFlow, layout]);

  // Phones: start readable (zoom ≈ 1) at the top of the tall map rather than fitting everything.
  useEffect(() => {
    if (!mobile) return;
    const id = setTimeout(() => {
      const first = [...layout.nodes.values()].sort((a, b) => a.x + a.y - (b.x + b.y))[0];
      if (!first) return;
      const [cx, cy] = center(first);
      const sy = iso(cx, cy)[1];
      zp.current?.centerOn(0, sy + 170, 0.92);
    }, 80);
    return () => clearTimeout(id);
  }, [mobile, layout]);

  const selectNode = useCallback((id: string) => host.select({ kind: 'node', id }), [host]);

  const isExcluded = (id: string) => {
    const n = nodeById.get(id);
    return n ? excluded(n, g.filters, deptOf) : false;
  };

  const label = (id: string) => nodeById.get(id)?.label ?? id;

  const flowStateOf = (l: Link): FlowState => {
    if (isExcluded(l.from) || isExcluded(l.to)) return 'dim';
    if (selNode && l.from !== selNode && l.to !== selNode) return 'dim';
    if (selFlow && l.key !== selFlow) return 'dim';
    if (!l.agg) return 'idle';
    return l.agg.lastStatus === 'failed' ? 'error' : 'active';
  };

  // Paint order: idle under active, selected last.
  const orderedLinks = useMemo(() => {
    const rank = (l: Link) => (l.key === selFlow ? 3 : l.agg ? (l.agg.lastStatus === 'failed' ? 2 : 1) : 0);
    return [...links].sort((a, b) => rank(a) - rank(b));
  }, [links, selFlow]);

  const orderedNodes = useMemo(
    () => [...layout.nodes.values()].sort((a, b) => a.x + a.y + a.w / 2 + a.d / 2 - (b.x + b.y + b.w / 2 + b.d / 2)),
    [layout],
  );

  const activePairs = [...traffic.pairs.values()].sort((a, b) => b.lastTs - a.lastTs);

  return (
    <div className="sm-root" data-tech={tech || undefined} data-mobile={mobile || undefined}>
      <ZoomPan
        ref={zp}
        bounds={layout.bounds}
        label="Carte du système : blocs et flux"
        onBackgroundClick={() => host.select(null)}
        minimap={<MiniMap layout={layout} nodeById={nodeById} links={links} />}
        showMinimap={!mobile}
      >
        {!layout.mobile && <LaneStrips layout={layout} />}
        <LaneTitles layout={layout} />

        <g className="sm-flows" data-style={flowStyle}>
          {orderedLinks.map((l) => {
            const a = layout.nodes.get(l.from)!;
            const b = layout.nodes.get(l.to)!;
            const offset = (((hash(l.key) % 7) - 3) * 0.11);
            const pts = routePoints(a, b, offset, layout.mobile);
            const state = flowStateOf(l);
            const kinds = l.agg ? [...l.agg.kinds] : [];
            const toolish = kinds.length > 0 && kinds.every((k) => k !== 'requête modèle');
            const statusWord = state === 'error' ? 'en erreur' : l.agg ? 'actif' : 'déclaré, sans échange récent';
            const aria = `Flux de ${label(l.from)} vers ${label(l.to)}, ${statusWord}, ${l.agg?.count ?? 0} échange${(l.agg?.count ?? 0) > 1 ? 's' : ''}`;
            return (
              <g key={l.key} style={{ ['--fc' as string]: toolish ? 'var(--st-researching)' : 'var(--st-working)' }} data-declared={l.declared ? 'true' : undefined}>
                <title>{flowTitle(l, label)}</title>
                <IsoFlowPath
                  d={pathOf(pts)}
                  state={state}
                  selected={l.key === selFlow}
                  label={aria}
                  onSelect={() => host.select({ kind: 'flow', id: l.key })}
                />
              </g>
            );
          })}
        </g>

        <g className="sm-nodes">
          {orderedNodes.map((p) => {
            const n = nodeById.get(p.id)!;
            const runtime = g.state.agents[p.id];
            return (
              <MapBlock
                key={p.id}
                n={n}
                p={p}
                h={blockH}
                showLabel={showLabels}
                selected={selNode === p.id}
                dimmed={isExcluded(p.id) || (!!selFlow && !selFlow.split('>').includes(p.id))}
                status={runtime?.status}
                avatar={avatarOf.get(p.id)}
                mobile={mobile}
                shadows={quality.shadows}
                onSelect={selectNode}
              />
            );
          })}
        </g>

        {tech && (
          <TechOverlay
            layout={layout}
            links={links}
            nodeById={nodeById}
            errors={traffic.errors}
            modelPerf={traffic.modelPerf}
            pending={pending}
            blockH={blockH}
            focus={selNode}
            focusKey={selFlow}
          />
        )}
      </ZoomPan>

      <aside className="sm-panel" aria-label="Carte du système : mode technique et légende" data-open={panelOpen || undefined}>
        <div className="sm-panel__head">
          <span className="t-h3">Carte du système</span>
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={panelOpen} onClick={() => setPanelOpen((o) => !o)}>
            {panelOpen ? 'Masquer la légende' : 'Légende'}
          </button>
        </div>
        <label className="sm-switch">
          <input type="checkbox" role="switch" checked={tech} onChange={(e) => setTech(e.target.checked)} />
          <span>
            <b>Mode technique</b>
            <span className="t-micro t-muted">Dépendances, erreurs, performances</span>
          </span>
        </label>
        <p className="t-micro t-muted sm-summary">
          {traffic.total > 0
            ? `${fmtInt(traffic.total)} échange${traffic.total > 1 ? 's' : ''} enregistré${traffic.total > 1 ? 's' : ''} sur les ${windowMin} dernières minutes${g.mode === 'replay' ? ' (replay)' : ''}.`
            : `Aucun échange enregistré sur les ${windowMin} dernières minutes.`}
        </p>
        {panelOpen && (
          <div className="sm-legend">
            {mobile && <FlowLegend unmapped={traffic.unmapped} showInvisible={showInvisible} vertical />}
            <div className="sm-kinds" aria-label="Types de blocs">
              {(['agent', 'service', 'queue', 'model', 'provider', 'mcp', 'connector', 'skill', 'database'] as const).map((k) => (
                <span key={k} className="sm-kind">
                  <span className="sm-kind__swatch" style={{ background: KIND_FILL[k] }}>
                    <FlatGlyph kind={k} size={14} />
                  </span>
                  {KIND_LABEL[k]}
                </span>
              ))}
            </div>
            <p className="t-micro t-muted" style={{ margin: '8px 0 0' }}>
              Les blocs viennent du catalogue déclaré. Seuls les échanges réellement enregistrés sont animés ; les autres liaisons sont des dépendances déclarées.
            </p>
          </div>
        )}
      </aside>

      {!mobile && (
        <div className="sm-legendbar" aria-label="Légende des liaisons">
          <FlowLegend unmapped={traffic.unmapped} showInvisible={showInvisible} />
        </div>
      )}

      <div className="sr-only">
        <h2>Carte du système</h2>
        {(Object.keys(LANE_LABEL) as LaneId[]).map((lane) => {
          const ids = [...layout.nodes.values()].filter((p) => p.lane === lane);
          if (!ids.length) return null;
          return (
            <p key={lane}>
              {LANE_LABEL[lane]} : {ids.map((p) => label(p.id)).join(', ')}.
            </p>
          );
        })}
        <h3>Flux actifs sur les {windowMin} dernières minutes</h3>
        {activePairs.length ? (
          <ul>
            {activePairs.slice(0, 20).map((a) => (
              <li key={a.key}>
                {label(a.from)} vers {label(a.to)} : {a.count} échange{a.count > 1 ? 's' : ''}
                {a.lastStatus === 'failed' ? ', dernier en erreur' : ''}.
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun flux actif.</p>
        )}
      </div>
    </div>
  );
}

function flowTitle(l: Link, label: (id: string) => string) {
  const lines = [`${label(l.from)} → ${label(l.to)}`];
  if (l.declared) lines.push(`Dépendance déclarée : ${EDGE_KIND[l.declared]}`);
  if (l.agg) {
    lines.push(`${l.agg.count} échange${l.agg.count > 1 ? 's' : ''} (${[...l.agg.kinds].join(', ')})`);
    if (l.agg.failed) lines.push(`${l.agg.failed} en erreur`);
    if (l.agg.tokens) lines.push(`${fmtCompact(l.agg.tokens)} tokens`);
    if (l.agg.latN) lines.push(`Latence moyenne ${fmtDuration(l.agg.latSum / l.agg.latN)}`);
    if (l.agg.lastSummary) lines.push(`Dernier : ${l.agg.lastSummary}`);
  } else lines.push('Aucun échange enregistré dans la fenêtre');
  return lines.join('\n');
}

function FlowLegend({ unmapped, showInvisible, vertical }: { unmapped: number; showInvisible: boolean; vertical?: boolean }) {
  return (
    <ul className="sm-flowlegend" data-vertical={vertical || undefined}>
      <li><LegendLine kind="model" />Requête modèle</li>
      <li><LegendLine kind="tool" />Outil ou donnée</li>
      <li><LegendLine kind="error" />En erreur</li>
      <li><LegendLine kind="idle" />Déclarée, sans échange</li>
      <li><span className="sm-vis sm-vis--partial" aria-hidden />Partiellement observable</li>
      {showInvisible && <li><span className="sm-vis sm-vis--none" aria-hidden />Non observable</li>}
      {unmapped > 0 && (
        <li className="sm-unmapped">
          {fmtInt(unmapped)} flux non cartographié{unmapped > 1 ? 's' : ''}
        </li>
      )}
    </ul>
  );
}

function LegendLine({ kind }: { kind: 'model' | 'tool' | 'error' | 'idle' }) {
  const color = kind === 'model' ? 'var(--st-working)' : kind === 'tool' ? 'var(--st-researching)' : kind === 'error' ? 'var(--st-error)' : 'var(--c-ink-muted)';
  return (
    <svg width={28} height={10} aria-hidden className="sm-legline">
      {kind === 'idle' ? (
        <path d="M1 5 H27" stroke={color} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
      ) : (
        <>
          <path d="M1 5 H27" stroke={color} strokeWidth={1.5} opacity={0.5} strokeDasharray={kind === 'error' ? '4 3' : undefined} />
          <path d="M1 5 H27" stroke={color} strokeWidth={2.6} strokeDasharray="2 6" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

const LaneStrips = memo(function LaneStrips({ layout }: { layout: MapLayout }) {
  return (
    <g className="sm-strips" aria-hidden>
      {layout.lanes.map((l) => {
        const pts = [iso(l.x0, l.y0), iso(l.x1, l.y0), iso(l.x1, l.y1), iso(l.x0, l.y1)].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
        return <polygon key={l.id} points={pts} className="sm-strip" data-wing={l.id === 'tools' || l.id === 'data' || undefined} />;
      })}
    </g>
  );
});

const LaneTitles = memo(function LaneTitles({ layout }: { layout: MapLayout }) {
  return (
    <g className="sm-lane-titles" aria-hidden>
      {layout.lanes.map((l) => (
        <text key={l.id} x={l.title[0]} y={l.title[1]} textAnchor={l.anchor} className="sm-lane-title">
          {LANE_LABEL[l.id]}
        </text>
      ))}
    </g>
  );
});

interface BlockProps {
  n: SystemNode;
  p: NodePos;
  h: number;
  showLabel: boolean;
  selected: boolean;
  dimmed: boolean;
  status?: AgentStatus;
  avatar?: { hue: number; accessory: 'none' | 'glasses' | 'headset' | 'cap' | 'badge' | 'visor' | 'scarf'; shape: 'round' | 'tall' | 'square' };
  mobile: boolean;
  shadows: boolean;
  onSelect: (id: string) => void;
}

const MapBlock = memo(function MapBlock({ n, p, h, showLabel, selected, dimmed, status, avatar, mobile, shadows, onSelect }: BlockProps) {
  const ghost = n.visibility === 'none';
  const fill = ghost ? 'color-mix(in oklab, var(--c-raised) 35%, transparent)' : KIND_FILL[n.kind] ?? 'var(--p2)';
  const isDb = n.kind === 'database';
  const isUser = n.kind === 'user';
  const isQueue = n.kind === 'queue';
  const bh = isUser ? 0.14 : n.kind === 'provider' ? h * 1.25 : isQueue ? h * 0.6 : h;
  const [cx, cy] = center(p);
  const footprint = [iso(p.x - 0.18, p.y - 0.18), iso(p.x + p.w + 0.18, p.y - 0.18), iso(p.x + p.w + 0.18, p.y + p.d + 0.18), iso(p.x - 0.18, p.y + p.d + 0.18)]
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(' ');
  const hitPad = mobile ? 0.55 : 0.2;
  const hit = [iso(p.x - hitPad, p.y - hitPad, bh + 0.6), iso(p.x + p.w + hitPad, p.y - hitPad, bh + 0.6), iso(p.x + p.w + hitPad, p.y + p.d + hitPad), iso(p.x - hitPad, p.y + p.d + hitPad)]
    .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
    .join(' ');
  const [lx, ly] = iso(p.x + p.w, p.y + p.d, 0);
  const statusText = status ? `, ${STATUS_LABEL[status].toLowerCase()}` : '';
  const visText = n.visibility === 'none' ? ', non observable' : n.visibility === 'partial' ? ', partiellement observable' : '';
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(n.id);
    }
  };
  const busy = status && BUSY.includes(status);
  const [ledX, ledY] = iso(p.x + p.w, p.y + p.d * 0.5, bh * 0.5);
  const [mx, my] = iso(p.x + 0.22, p.y + p.d - 0.22, bh);
  return (
    <g
      className="sm-node"
      role="button"
      tabIndex={0}
      aria-label={`${n.label}, ${KIND_LABEL[n.kind] ?? n.kind}${statusText}${visText}`}
      aria-pressed={selected}
      data-selected={selected || undefined}
      data-dimmed={dimmed || undefined}
      data-ghost={ghost || undefined}
      onClick={() => onSelect(n.id)}
      onKeyDown={onKey}
    >
      <polygon className="sm-node__hit" points={hit} />
      {shadows && !ghost && (
        <polygon
          className="sm-node__shadow"
          points={[iso(p.x + 0.12, p.y + 0.12), iso(p.x + p.w + 0.22, p.y + 0.12), iso(p.x + p.w + 0.22, p.y + p.d + 0.22), iso(p.x + 0.12, p.y + p.d + 0.22)]
            .map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`)
            .join(' ')}
        />
      )}
      <polygon className="sm-node__sel" points={footprint} />
      {isDb ? (
        <Cylinder x={cx} y={cy} r={p.w / 2} h={h * 1.35} fill={fill} />
      ) : (
        <IsoBox x={p.x} y={p.y} w={p.w} d={p.d} h={bh} fill={fill} />
      )}
      {isQueue && !ghost && <QueueSlats p={p} h={bh} />}
      {!ghost && !isUser && <TopGlyph kind={n.kind} cx={cx} cy={cy} z={isDb ? h * 1.35 : bh} size={Math.min(p.w, p.d)} />}
      {isUser && (
        <IsoFigure
          x={cx}
          y={cy}
          z={bh}
          status={status ?? 'idle'}
          avatar={avatar ?? { hue: 222, accessory: 'badge', shape: 'tall' }}
          kind="human"
          label={n.label}
          showLabel={false}
        />
      )}
      {(n.kind === 'agent' || n.kind === 'service') && status && (
        <circle className="sm-led" cx={ledX} cy={ledY} r={3.4} data-busy={busy || undefined} style={{ fill: `var(--st-${status})` }} />
      )}
      {n.visibility === 'partial' && (
        <g className="sm-partial" transform={`translate(${mx.toFixed(1)} ${my.toFixed(1)})`}>
          <circle r={4} />
          <path d="M0 -4 A4 4 0 0 1 0 4 Z" />
        </g>
      )}
      {showLabel && (
        <text className="iso-label sm-label" x={lx} y={ly + 14} textAnchor="middle">
          {n.label}
        </text>
      )}
      {ghost && (
        <text className="iso-label iso-label--muted iso-label--small" x={lx} y={ly + (showLabel ? 27 : 14)} textAnchor="middle">
          non observable
        </text>
      )}
    </g>
  );
});

function QueueSlats({ p, h }: { p: NodePos; h: number }) {
  const lines = [0.3, 0.55, 0.8].map((f) => {
    const [a, b] = iso(p.x + p.w, p.y + p.d * f - 0.08, 0.06);
    const [c, d] = iso(p.x + p.w, p.y + p.d * f - 0.08, h - 0.06);
    return <line key={f} x1={a} y1={b} x2={c} y2={d} className="iso-ink-line" />;
  });
  return <g aria-hidden>{lines}</g>;
}

function TechOverlay({ layout, links, nodeById, errors, modelPerf, pending, blockH, focus, focusKey }: {
  layout: MapLayout;
  links: Link[];
  focus: string | null;
  focusKey: string | null;
  nodeById: Map<string, SystemNode>;
  errors: Map<string, number>;
  modelPerf: Map<string, { calls: number; lat: number; latN: number }>;
  pending: number;
  blockH: number;
}) {
  // Dependency labels: greedy placement without overlap; with a selection, only its dependencies.
  const placed: Array<[number, number]> = [];
  const nodeLabels = [...layout.nodes.values()].map((p) => {
    const [x, y] = iso(p.x + p.w, p.y + p.d, 0);
    return [x, y + 10] as [number, number];
  });
  const edgeLabels = links
    .filter((l) => l.declared && (focusKey ? l.key === focusKey : !focus || l.from === focus || l.to === focus))
    .map((l) => {
      const a = layout.nodes.get(l.from)!;
      const b = layout.nodes.get(l.to)!;
      const [x, y] = labelPoint(routePoints(a, b, ((hash(l.key) % 7) - 3) * 0.11, layout.mobile));
      if (placed.some(([px, py]) => Math.abs(px - x) < 46 && Math.abs(py - y) < 14)) return null;
      if (nodeLabels.some(([px, py]) => Math.abs(px - x) < 56 && Math.abs(py - y) < 18)) return null;
      placed.push([x, y]);
      return (
        <text key={l.key} x={x} y={y - 4} textAnchor="middle" className="sm-edge-kind">
          {EDGE_KIND[l.declared!]}
        </text>
      );
    });
  return (
    <g className="sm-tech" aria-hidden>
      {edgeLabels}
      {[...layout.nodes.values()].map((p) => {
        const n = nodeById.get(p.id)!;
        const [cx, cy] = center(p);
        const top = n.kind === 'database' ? blockH * 1.35 : n.kind === 'provider' ? blockH * 1.25 : n.kind === 'queue' ? blockH * 0.6 : n.kind === 'user' ? 1.4 : blockH;
        const [sx, sy] = iso(cx, cy, top);
        const err = errors.get(p.id) ?? 0;
        const perf = modelPerf.get(p.id);
        const tag =
          n.kind === 'model'
            ? perf
              ? `${fmtInt(perf.calls)} appel${perf.calls > 1 ? 's' : ''}${perf.latN ? ` · ${fmtDuration(perf.lat / perf.latN)}` : ''}`
              : 'aucun appel'
            : p.id === 'task-queue'
              ? `${fmtInt(pending)} en attente`
              : null;
        return (
          <g key={p.id}>
            {tag && <Tag x={sx} y={sy - 26} text={tag} />}
            {err > 0 && (
              <g className="sm-err" transform={`translate(${(sx + 20).toFixed(1)} ${(sy - 14).toFixed(1)})`}>
                <circle r={8.5} />
                <text y={3.5} textAnchor="middle">
                  {err > 99 ? '99+' : err}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

function Tag({ x, y, text }: { x: number; y: number; text: string }) {
  const w = Math.max(40, text.length * 5.6 + 12);
  return (
    <g className="sm-tag" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
      <rect x={-w / 2} y={-10} width={w} height={18} rx={9} />
      <text y={3} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

const MiniMap = memo(function MiniMap({ layout, nodeById, links }: { layout: MapLayout; nodeById: Map<string, SystemNode>; links: Link[] }) {
  return (
    <g>
      {links.map((l) => {
        const a = layout.nodes.get(l.from)!;
        const b = layout.nodes.get(l.to)!;
        const [ax, ay] = iso(...center(a));
        const [bx, by] = iso(...center(b));
        return <line key={l.key} x1={ax} y1={ay} x2={bx} y2={by} stroke={l.agg ? 'var(--st-working)' : 'var(--c-line)'} strokeWidth={l.agg ? 3 : 1.5} />;
      })}
      {[...layout.nodes.values()].map((p) => {
        const pts = [iso(p.x, p.y), iso(p.x + p.w, p.y), iso(p.x + p.w, p.y + p.d), iso(p.x, p.y + p.d)].map(([a, b]) => `${a},${b}`).join(' ');
        return <polygon key={p.id} points={pts} fill={KIND_FILL[nodeById.get(p.id)!.kind] ?? 'var(--p2)'} stroke="var(--c-ink-soft)" strokeWidth={1} />;
      })}
    </g>
  );
});
