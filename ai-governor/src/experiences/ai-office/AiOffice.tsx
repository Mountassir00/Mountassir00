/**
 * AI Office — an isometric office where each department is a room and each
 * agent a character (LLM agents, humans) or a console (scripts, services).
 * Everything on screen is derived from the recorded state: presence comes
 * from the agent's current task, motion from its recorded status, badges
 * from real tasks, decisions and incidents. Nothing is simulated here.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
  STATUS_LABEL, useGovernor,
  type AgentDef, type AgentStatus, type DepartmentDef, type ExperienceProps, type HostApi, type Selection,
} from '@sdk';
import {
  Antenna, Conveyor, Cylinder, Desk, Gauge, IsoBackWalls, IsoBox, IsoFigure, IsoFloor, LabBench, MeetingTable, Plant, RouterBox,
  Segmented, ServerRack, Shelf, Shield, StatusPill, Whiteboard, ZoomPan, depth, iso, toneVar,
  type ZoomBucket, type ZoomPanHandle,
} from '@ds';
import { computeLayout, figureSpot, type OfficeLayout, type PlacedItem, type RoomLayout, type Seat } from './layout';
import './office.css';

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const ACTIVE: AgentStatus[] = ['working', 'researching', 'validating', 'collaborating'];
const KIND_LABEL: Record<AgentDef['kind'], string> = { llm: 'Agent IA', human: 'Humain', script: 'Script', service: 'Service' };
const SKEW = 26.565;

interface Live {
  deptOf: Map<string, string>;
  status: Map<string, AgentStatus>;
  task: Map<string, string | undefined>;
  collab: Map<string, string | undefined>;
  running: Map<string, number>;
  queued: Map<string, number>;
  incidents: Map<string, number>;
  anyIncident: boolean;
  pendingDecisions: number;
  cacheHit: number | null;
  quality: number | null;
  quota: number | null;
}

const inc = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

export default function AiOffice({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const zp = useRef<ZoomPanHandle>(null);
  const localSelect = useRef(false);
  const [bucket, setBucket] = useState<ZoomBucket>('mid');
  // On a phone the accessible list is the default; the scene stays one tap away.
  const [mode, setMode] = useState<'scene' | 'list'>(() => host.getLocal<'scene' | 'list'>(device === 'mobile' ? 'modeMobile' : 'mode', device === 'mobile' ? 'list' : 'scene'));
  const wrap = useRef<HTMLDivElement>(null);
  const [legend, setLegend] = useState(() => host.getLocal<boolean>('legend', device !== 'mobile'));

  const roomSize = Math.round(num(config.roomSize, 5));
  const cols = device === 'mobile' ? 2 : device === 'tablet' ? 3 : 4;
  const minimal = quality.level === 'minimal';
  const cfg = {
    showLabels: bool(config.showLabels, true),
    floorGrid: bool(config.floorGrid, true) && !minimal,
    wallHeight: num(config.wallHeight, 0.35),
    // Base 1.2: characters read at the default campus zoom; the config scales from there.
    figureScale: num(config.figureScale, 1) * 1.2 * (device === 'mobile' ? 1.15 : 1),
    decor: bool(config.decor, true) && !minimal,
  };
  const cfgKey = `${cfg.showLabels}|${cfg.floorGrid}|${cfg.wallHeight}|${cfg.figureScale}|${cfg.decor}|${bucket}`;

  const arrangement = device === 'mobile' ? 'stack' : 'campus';
  const layout = useMemo(() => computeLayout(g.catalog, roomSize, cols, arrangement), [g.catalog, roomSize, cols, arrangement]);

  // Phone: zoom to the stage width and start at the top of the stack (fit-all would be unreadably small).
  useEffect(() => {
    if (device !== 'mobile' || mode !== 'scene') return;
    const id = setTimeout(() => {
      const el = wrap.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const b = layout.bounds;
      const k = Math.min(1, (width - 16) / (b.maxX - b.minX));
      zp.current?.centerOn((b.minX + b.maxX) / 2, b.minY + (height / 2 - 56) / k, k);
    }, 160);
    return () => clearTimeout(id);
  }, [device, mode, layout]);

  // Live facts, recomputed when the store (or the replay cursor) moves.
  const live = useMemo<Live>(() => {
    const st = g.state;
    const deptOf = new Map<string, string>();
    const status = new Map<string, AgentStatus>();
    const task = new Map<string, string | undefined>();
    const collab = new Map<string, string | undefined>();
    for (const a of g.catalog.agents) {
      const rt = st.agents[a.id];
      const t = rt?.currentTaskId ? st.tasks[rt.currentTaskId] : undefined;
      const d = t?.departmentId && a.departmentIds.includes(t.departmentId) ? t.departmentId : a.departmentIds[0];
      if (d) deptOf.set(a.id, d);
      status.set(a.id, rt?.status ?? 'idle');
      task.set(a.id, t && (t.status === 'running' || t.status === 'paused') ? t.title : undefined);
      collab.set(a.id, rt?.status === 'collaborating' ? rt.collaboratingWith : undefined);
    }
    const running = new Map<string, number>();
    const queued = new Map<string, number>();
    for (const t of Object.values(st.tasks)) {
      if (!t.departmentId) continue;
      if (t.status === 'running' || t.status === 'paused') inc(running, t.departmentId);
      else if (t.status === 'pending') inc(queued, t.departmentId);
    }
    const incidents = new Map<string, number>();
    let anyIncident = false;
    for (const i of Object.values(st.incidents)) {
      if (i.state !== 'open') continue;
      anyIncident = true;
      if (i.departmentId) inc(incidents, i.departmentId);
    }
    const T = st.totals;
    const quotas = Object.values(st.quotas);
    return {
      deptOf, status, task, collab, running, queued, incidents, anyIncident,
      pendingDecisions: Object.values(st.decisions).filter((d) => d.status === 'pending').length,
      cacheHit: T.tokensIn + T.cacheRead > 0 ? T.cacheRead / (T.tokensIn + T.cacheRead) : null,
      quality: T.qualityCount ? T.qualitySum / T.qualityCount : null,
      quota: quotas.length ? Math.max(...quotas.map((q) => q.usedPct)) / 100 : null,
    };
    // g.version: the live projection is mutated in place, so the version is the change signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.state, g.version, g.catalog]);

  const selectAgent = useCallback(
    (id: string) => {
      localSelect.current = true;
      host.select({ kind: 'agent', id });
    },
    [host],
  );
  const selectDept = useCallback(
    (id: string) => {
      localSelect.current = true;
      host.select({ kind: 'department', id });
    },
    [host],
  );

  // Center on a selection made elsewhere (search, another view, inspector) — not on our own clicks.
  const selKey = g.selection ? `${g.selection.kind}:${g.selection.id}` : '';
  const mounted = useRef(false);
  useEffect(() => {
    const sel = g.selection;
    if (!sel || localSelect.current) {
      localSelect.current = false;
      mounted.current = true;
      return;
    }
    const p = positionOf(sel, layout, live);
    if (!p) return;
    const run = () => zp.current?.centerOn(p[0], p[1]);
    if (!mounted.current) {
      mounted.current = true;
      const id = setTimeout(run, 120);
      return () => clearTimeout(id);
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey, layout]);

  const fDept = g.filters.departments;
  const fAgent = g.filters.agents;
  const selAgent = g.selection?.kind === 'agent' ? g.selection.id : null;
  const selDept = g.selection?.kind === 'department' ? g.selection.id : null;

  const rooms = useMemo(() => [...layout.rooms].sort((a, b) => depth(a.x, a.y) - depth(b.x, b.y)), [layout]);

  const setModePersist = (m: 'scene' | 'list') => {
    setMode(m);
    host.setLocal(device === 'mobile' ? 'modeMobile' : 'mode', m);
  };

  // Collaboration lines between two present agents (recorded `collaboratingWith`).
  const collabLines = useMemo(() => {
    const spot = new Map<string, [number, number]>();
    for (const r of layout.rooms)
      for (const s of r.seats) if (live.deptOf.get(s.agent.id) === r.dept.id) spot.set(s.agent.id, figureSpot(s));
    const out: Array<{ key: string; a: [number, number]; b: [number, number]; label: string }> = [];
    for (const [id, other] of live.collab) {
      if (!other) continue;
      const a = spot.get(id);
      const b = spot.get(other);
      if (a && b) out.push({ key: `${id}-${other}`, a, b, label: `${id} collabore avec ${other}` });
    }
    return out;
  }, [layout, live]);

  return (
    <div className="ao" data-device={device} ref={wrap}>
      <div className="ao-toolbar">
        <Segmented
          label="Mode d’affichage"
          value={mode}
          onChange={setModePersist}
          options={[
            { value: 'scene', label: 'Scène' },
            { value: 'list', label: 'Liste' },
          ]}
        />
        {mode === 'scene' && (
          <button
            type="button"
            className="btn btn--sm"
            aria-expanded={legend}
            onClick={() => {
              setLegend(!legend);
              host.setLocal('legend', !legend);
            }}
          >
            Légende
          </button>
        )}
      </div>
      {mode === 'scene' && legend && <Legend />}

      {mode === 'scene' ? (
        <ZoomPan
          ref={zp}
          bounds={layout.bounds}
          label="Bureau virtuel des agents"
          onBackgroundClick={() => host.select(null)}
          onZoomBucket={setBucket}
          minimap={<MiniMap layout={layout} />}
        >
          <g className="ao-plates">
            {layout.plates.map((p) => (
              <IsoFloor key={`${p.group}-${p.x}-${p.y}`} x={p.x} y={p.y} w={p.w} d={p.d} z={-0.1} thickness={0.12} fill="var(--ao-plate)" grid={false} />
            ))}
          </g>
          {rooms.map((r) => {
            const present = r.seats.filter((s) => live.deptOf.get(s.agent.id) === r.dept.id);
            const sig = r.seats
              .map((s) => `${s.agent.id}:${live.deptOf.get(s.agent.id) === r.dept.id ? live.status.get(s.agent.id) : '-'}:${s.agent.id === selAgent ? 1 : 0}:${fAgent.length && !fAgent.includes(s.agent.id) ? 1 : 0}`)
              .join('|');
            const active = present.some((s) => ACTIVE.includes(live.status.get(s.agent.id) ?? 'idle'));
            const facts: RoomFacts = {
              active,
              pendingDecisions: r.dept.equipment.includes('board') && r.dept.id === 'executive' ? live.pendingDecisions : null,
              shieldAlert: live.anyIncident,
              gauge: gaugeFor(r.dept, live, present.length ? present.filter((s) => ACTIVE.includes(live.status.get(s.agent.id) ?? 'idle')).length / Math.max(1, r.seats.length) : 0),
            };
            return (
              <RoomView
                key={r.dept.id}
                room={r}
                sig={`${sig}#${active}#${facts.pendingDecisions}#${facts.shieldAlert}#${facts.gauge.value.toFixed(2)}#${cfgKey}`}
                live={live}
                facts={facts}
                cfg={cfg}
                showFigureLabels={cfg.showLabels && bucket !== 'far'}
                selAgent={selAgent}
                fAgent={fAgent}
                dimmed={fDept.length > 0 && !fDept.includes(r.dept.id)}
                onAgent={selectAgent}
                onDept={selectDept}
                host={host}
              />
            );
          })}
          <g className="ao-collab-layer" aria-hidden>
            {collabLines.map((l) => {
              const [ax, ay] = iso(l.a[0], l.a[1], 0.8);
              const [bx, by] = iso(l.b[0], l.b[1], 0.8);
              return <line key={l.key} className="ao-collab" x1={ax} y1={ay} x2={bx} y2={by} />;
            })}
          </g>
          <g className="ao-labels">
            {layout.plates
              .filter((p) => p.label)
              .map((p) => {
                const [lx, ly] = iso(p.x, p.y + p.d, 0);
                return (
                  <g key={`gl-${p.group}`} transform={`translate(${lx.toFixed(1)} ${ly.toFixed(1)}) skewY(${-SKEW})`} aria-hidden>
                    <text className="ao-group-label" x={6} y={-8}>
                      {p.group}
                    </text>
                  </g>
                );
              })}
            {layout.rooms.map((r) => (
              <RoomLabel
                key={`rl-${r.dept.id}`}
                room={r}
                running={live.running.get(r.dept.id) ?? 0}
                queued={live.queued.get(r.dept.id) ?? 0}
                alerts={(live.incidents.get(r.dept.id) ?? 0) + r.seats.filter((s) => live.deptOf.get(s.agent.id) === r.dept.id && live.status.get(s.agent.id) === 'error').length}
                selected={selDept === r.dept.id}
                onSelect={selectDept}
              />
            ))}
          </g>
        </ZoomPan>
      ) : (
        <ListView layout={layout} live={live} onAgent={selectAgent} onDept={selectDept} selAgent={selAgent} selDept={selDept} />
      )}

      <SceneSummary layout={layout} live={live} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

interface RoomFacts {
  active: boolean;
  pendingDecisions: number | null;
  shieldAlert: boolean;
  gauge: { value: number; title: string };
}

interface Cfg {
  showLabels: boolean;
  floorGrid: boolean;
  wallHeight: number;
  figureScale: number;
  decor: boolean;
}

function gaugeFor(dept: DepartmentDef, live: Live, activity: number): { value: number; title: string } {
  const pct = (v: number) => `${Math.round(v * 100)} %`;
  if (dept.id === 'tokens') return live.cacheHit == null ? { value: 0, title: 'Taux de lecture cache : donnée indisponible' } : { value: live.cacheHit, title: `Part des tokens d’entrée servis par le cache : ${pct(live.cacheHit)}` };
  if (dept.id === 'quality') return live.quality == null ? { value: 0, title: 'Score qualité : donnée indisponible' } : { value: live.quality, title: `Score qualité moyen : ${pct(live.quality)}` };
  if (dept.id === 'finance') return live.quota == null ? { value: 0, title: 'Quota : donnée indisponible' } : { value: live.quota, title: `Quota mensuel utilisé : ${pct(live.quota)}` };
  return { value: activity, title: `Activité du département : ${pct(activity)} des postes actifs` };
}

const RoomView = memo(
  function RoomView({ room, live, facts, cfg, showFigureLabels, selAgent, fAgent, dimmed, onAgent, onDept, host }: {
    room: RoomLayout;
    sig: string;
    live: Live;
    facts: RoomFacts;
    cfg: Cfg;
    showFigureLabels: boolean;
    selAgent: string | null;
    fAgent: string[];
    dimmed: boolean;
    onAgent: (id: string) => void;
    onDept: (id: string) => void;
    host: HostApi;
  }) {
    const { dept, x, y, s } = room;
    const tone = toneVar(dept.tone);
    type Item = { d: number; key: string; node: ReactNode };
    const items: Item[] = [];

    for (const it of room.items) items.push({ d: depth(it.x + 0.4, it.y + 0.3), key: `eq-${it.kind}-${it.x}`, node: <Equipment item={it} facts={facts} host={host} /> });

    for (const seat of room.seats) {
      const here = live.deptOf.get(seat.agent.id) === dept.id;
      const status = live.status.get(seat.agent.id) ?? 'idle';
      const machine = seat.agent.kind === 'script' || seat.agent.kind === 'service';
      if (!machine) {
        items.push({
          d: depth(seat.x + 0.45, seat.y + 0.3),
          key: `desk-${seat.agent.id}`,
          node: (
            <g>
              {!here && <title>{`Poste de ${seat.agent.name} — actuellement dans un autre département`}</title>}
              <Desk x={seat.x} y={seat.y} active={here && ACTIVE.includes(status)} />
            </g>
          ),
        });
      } else if (!here) {
        items.push({
          d: depth(seat.x + 0.45, seat.y + 0.45),
          key: `dock-${seat.agent.id}`,
          node: (
            <g>
              <title>{`Emplacement de ${seat.agent.name} — en service dans un autre département`}</title>
              <IsoBox x={seat.x + 0.15} y={seat.y + 0.15} w={0.6} d={0.6} h={0.05} fill="var(--c-sunken)" />
            </g>
          ),
        });
      }
      if (here) {
        const [fx, fy] = figureSpot(seat);
        const task = live.task.get(seat.agent.id);
        items.push({
          d: depth(fx, fy) + 0.01,
          key: `fig-${seat.agent.id}`,
          node: (
            <IsoFigure
              x={fx}
              y={fy}
              status={status}
              avatar={seat.agent.avatar}
              kind={seat.agent.kind}
              label={seat.agent.name}
              sublabel={`${KIND_LABEL[seat.agent.kind]}, ${seat.agent.role}${task ? `, mission : ${task}` : ''}`}
              selected={selAgent === seat.agent.id}
              dimmed={fAgent.length > 0 && !fAgent.includes(seat.agent.id)}
              showLabel={showFigureLabels}
              scale={cfg.figureScale}
              onSelect={() => onAgent(seat.agent.id)}
            />
          ),
        });
      }
    }
    if (cfg.decor) items.push({ d: depth(room.plant.x, room.plant.y), key: 'plant', node: <Plant x={room.plant.x} y={room.plant.y} /> });
    items.sort((a, b) => a.d - b.d);

    const onClick = (e: ReactMouseEvent) => {
      if ((e.target as Element).closest('.iso-figure, .ao-board')) return;
      onDept(dept.id);
    };
    return (
      <g className="ao-room" data-dimmed={dimmed || undefined} onClick={onClick}>
        <IsoFloor x={x} y={y} w={s} d={s} thickness={0.08} fill={tone} grid={cfg.floorGrid} />
        {cfg.wallHeight > 0 && <IsoBackWalls x={x} y={y} w={s} d={s} h={cfg.wallHeight} fill={`color-mix(in oklab, ${tone} 55%, var(--c-raised))`} />}
        {items.map((i) => (
          <g key={i.key}>{i.node}</g>
        ))}
        {room.overflow.length > 0 && (
          <g className="ao-overflow">
            <title>{`Autres agents rattachés : ${room.overflow.map((a) => a.name).join(', ')}`}</title>
            <text className="iso-label iso-label--small" {...xy(iso(x + s - 0.4, y + s - 0.3, 0))} textAnchor="end">
              +{room.overflow.length} agent{room.overflow.length > 1 ? 's' : ''}
            </text>
          </g>
        )}
      </g>
    );
  },
  (a, b) => a.sig === b.sig && a.room === b.room && a.dimmed === b.dimmed && a.showFigureLabels === b.showFigureLabels && a.cfg.figureScale === b.cfg.figureScale,
);

const xy = ([a, b]: [number, number]) => ({ x: a, y: b });

function Equipment({ item, facts, host }: { item: PlacedItem; facts: RoomFacts; host: HostApi }) {
  const { x, y, kind } = item;
  switch (kind) {
    case 'meeting':
      return <MeetingTable x={x} y={y} />;
    case 'board':
      if (facts.pendingDecisions != null) return <DecisionBoard x={x} y={y} count={facts.pendingDecisions} onOpen={() => host.openDecisions()} />;
      return <Whiteboard x={x} y={y} />;
    case 'lab':
      return <LabBench x={x} y={y} active={facts.active} />;
    case 'server':
      return <ServerRack x={x} y={y} active={facts.active} />;
    case 'database':
      return <Cylinder x={x + 0.4} y={y + 0.4} fill="var(--c-raised)" />;
    case 'router':
      return <RouterBox x={x} y={y} active={facts.active} />;
    case 'gauge':
      return (
        <g>
          <title>{facts.gauge.title}</title>
          <Gauge x={x} y={y} value={facts.gauge.value} />
        </g>
      );
    case 'shield':
      return (
        <g>
          <title>{facts.shieldAlert ? 'Incident de sécurité ouvert' : 'Aucun incident ouvert'}</title>
          <Shield x={x + 0.35} y={y + 0.35} alert={facts.shieldAlert} />
        </g>
      );
    case 'archive':
      return <Shelf x={x} y={y} />;
    case 'antenna':
      return <Antenna x={x + 0.35} y={y + 0.35} active={facts.active} />;
    case 'conveyor':
      return <Conveyor x={x} y={y} active={facts.active} />;
    default:
      return null;
  }
}

/** Executive whiteboard: the real number of proposals awaiting GO / NO GO / TEST. */
function DecisionBoard({ x, y, count, onOpen }: { x: number; y: number; count: number; onOpen: () => void }) {
  const [tx, ty] = iso(x + 0.12, y + 0.04, 0.86);
  const label = count ? `${count} décision${count > 1 ? 's' : ''} en attente : ouvrir le centre GO / NO GO / TEST` : 'Aucune décision en attente : ouvrir le centre GO / NO GO / TEST';
  return (
    <g
      className="ao-board"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <title>{label}</title>
      <Whiteboard x={x} y={y} lines={0} />
      <g transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) skewY(${SKEW})`}>
        <text className="ao-board__count" x={1} y={18}>
          {count}
        </text>
        <text className="ao-board__text" x={count > 9 ? 30 : 19} y={9}>
          à arbitrer
        </text>
        <text className="ao-board__text" x={count > 9 ? 30 : 19} y={19}>
          GO / NO GO
        </text>
      </g>
    </g>
  );
}

/** Room name painted on the front-left face, like lettering on an isometric plan. */
function RoomLabel({ room, running, queued, alerts, selected, onSelect }: {
  room: RoomLayout; running: number; queued: number; alerts: number; selected: boolean; onSelect: (id: string) => void;
}) {
  const { x, y, s, dept } = room;
  const [lx, ly] = iso(x, y + s, 0);
  const top = [iso(x, y), iso(x + s, y), iso(x + s, y + s), iso(x, y + s)].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const counts: string[] = [];
  if (running) counts.push(`${running} en cours`);
  if (queued) counts.push(`${queued} en file`);
  const aria = `${dept.name}, ${dept.mission}. ${counts.length ? counts.join(', ') : 'Aucune tâche en cours'}${alerts ? `, ${alerts} alerte${alerts > 1 ? 's' : ''}` : ''}.`;
  return (
    <g
      className="iso-room ao-room-focus"
      role="button"
      tabIndex={0}
      aria-label={aria}
      data-selected={selected || undefined}
      onClick={() => onSelect(dept.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(dept.id);
        }
      }}
    >
      <polygon className="iso-room__outline" points={top} />
      <g transform={`translate(${lx.toFixed(1)} ${ly.toFixed(1)}) skewY(${SKEW})`}>
        <text className="ao-room-label" x={8} y={18}>
          {dept.name}
        </text>
        {(counts.length > 0 || alerts > 0) && (
          <text className="ao-room-count" x={8} y={33}>
            {counts.join(', ')}
            {alerts > 0 && (
              <tspan className="ao-room-alert">
                {counts.length ? ', ' : ''}
                {alerts} alerte{alerts > 1 ? 's' : ''}
              </tspan>
            )}
          </text>
        )}
      </g>
    </g>
  );
}

function Legend() {
  return (
    <div className="ao-legend" role="note" aria-label="Légende">
      <div className="ao-legend__row">
        <svg width="18" height="22" viewBox="-10 -30 20 34" aria-hidden>
          <path d="M-7 -3 v-14 c0 -6 14 -6 14 0 v14 c-4 3 -10 3 -14 0 Z" fill="hsl(250 46% 62%)" stroke="currentColor" strokeOpacity=".6" />
          <circle cx="0" cy="-22" r="5" fill="hsl(250 30% 88%)" stroke="currentColor" strokeOpacity=".6" />
        </svg>
        <span>Personnage : agent IA ou humain</span>
      </div>
      <div className="ao-legend__row">
        <svg width="18" height="22" viewBox="-12 -30 24 34" aria-hidden>
          <path d="M-11 -4 L0 1.5 L11 -4 L11 -22 L0 -16.5 L-11 -22 Z" fill="var(--c-ink-soft)" />
          <path d="M-11 -22 L0 -27.5 L11 -22 L0 -16.5 Z" fill="hsl(205 46% 62%)" />
        </svg>
        <span>Console : script ou service, sans modèle</span>
      </div>
      <div className="ao-legend__row ao-legend__muted">Pupitre vide : l’agent travaille dans un autre département.</div>
      <div className="ao-legend__statuses">
        {(['working', 'researching', 'validating', 'collaborating', 'waiting', 'error'] as AgentStatus[]).map((s) => (
          <StatusPill key={s} status={s} />
        ))}
      </div>
      <div className="ao-legend__row ao-legend__muted">Les animations reflètent l’état enregistré, jamais une activité simulée.</div>
    </div>
  );
}

function MiniMap({ layout }: { layout: OfficeLayout }) {
  const pts = (x: number, y: number, w: number, d: number) =>
    [iso(x, y), iso(x + w, y), iso(x + w, y + d), iso(x, y + d)].map(([a, b]) => `${a.toFixed(0)},${b.toFixed(0)}`).join(' ');
  return (
    <g>
      {layout.plates.map((p) => (
        <polygon key={`mp-${p.group}-${p.x}-${p.y}`} points={pts(p.x, p.y, p.w, p.d)} fill="var(--c-sunken)" />
      ))}
      {layout.rooms.map((r) => (
        <polygon key={`mr-${r.dept.id}`} points={pts(r.x, r.y, r.s, r.s)} fill={toneVar(r.dept.tone)} stroke="var(--c-ink-muted)" strokeWidth={2} />
      ))}
    </g>
  );
}

function ListView({ layout, live, onAgent, onDept, selAgent, selDept }: {
  layout: OfficeLayout; live: Live; onAgent: (id: string) => void; onDept: (id: string) => void; selAgent: string | null; selDept: string | null;
}) {
  const byGroup = new Map<string, RoomLayout[]>();
  for (const r of layout.rooms) byGroup.set(r.group, [...(byGroup.get(r.group) ?? []), r]);
  return (
    <div className="stage__scroll ao-list">
      <div className="ao-list__inner">
        {[...byGroup].map(([group, rooms]) => (
          <section key={group} aria-label={group} className="ao-list__group">
            <h2 className="t-h3 ao-list__group-title">{group}</h2>
            <div className="ao-list__cards">
              {rooms.map((r) => {
                const running = live.running.get(r.dept.id) ?? 0;
                const queued = live.queued.get(r.dept.id) ?? 0;
                const alerts = live.incidents.get(r.dept.id) ?? 0;
                const staff = [...r.seats.map((s) => s.agent), ...r.overflow];
                return (
                  <article key={r.dept.id} className="ao-card" data-selected={selDept === r.dept.id || undefined} style={{ ['--tone' as string]: toneVar(r.dept.tone) }}>
                    <button type="button" className="ao-card__head" onClick={() => onDept(r.dept.id)}>
                      <span className="ao-card__swatch" aria-hidden />
                      <span>
                        <b>{r.dept.name}</b>
                        <span className="t-micro t-muted ao-card__mission">{r.dept.mission}</span>
                      </span>
                    </button>
                    <p className="t-small t-soft ao-card__counts">
                      {running ? `${running} tâche${running > 1 ? 's' : ''} en cours` : 'Aucune tâche en cours'}
                      {queued ? `, ${queued} en file` : ''}
                      {alerts ? `, ${alerts} alerte${alerts > 1 ? 's' : ''}` : ''}
                    </p>
                    <ul className="ao-card__agents">
                      {staff.map((a) => {
                        const here = live.deptOf.get(a.id) === r.dept.id;
                        const st = live.status.get(a.id) ?? 'idle';
                        const task = here ? live.task.get(a.id) : undefined;
                        return (
                          <li key={a.id}>
                            <button type="button" className="ao-agent" aria-pressed={selAgent === a.id} onClick={() => onAgent(a.id)}>
                              <span className="ao-agent__name">
                                {a.name}
                                <span className="t-micro t-muted"> {KIND_LABEL[a.kind]}</span>
                              </span>
                              {here ? <StatusPill status={st} /> : <span className="t-micro t-muted">Dans un autre département</span>}
                              {task && <span className="t-micro t-soft ao-agent__task">{task}</span>}
                            </button>
                          </li>
                        );
                      })}
                      {!staff.length && <li className="t-small t-muted">Aucun agent rattaché.</li>}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
        {!layout.rooms.length && <div className="empty">Aucun département dans les sources actives.</div>}
      </div>
    </div>
  );
}

/** Text summary of the scene for screen readers (always present, visually hidden). */
function SceneSummary({ layout, live }: { layout: OfficeLayout; live: Live }) {
  return (
    <div className="sr-only">
      <h2>Résumé du bureau</h2>
      <ul>
        {layout.rooms.map((r) => {
          const present = r.seats.filter((s: Seat) => live.deptOf.get(s.agent.id) === r.dept.id);
          return (
            <li key={r.dept.id}>
              {r.dept.name} : {live.running.get(r.dept.id) ?? 0} tâche(s) en cours.{' '}
              {present.length
                ? present.map((s) => `${s.agent.name} (${STATUS_LABEL[live.status.get(s.agent.id) ?? 'idle']})`).join(', ')
                : 'Aucun agent présent.'}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function positionOf(sel: Selection, layout: OfficeLayout, live: Live): [number, number] | null {
  if (sel.kind === 'department') {
    const r = layout.roomOf.get(sel.id);
    return r ? iso(r.x + r.s / 2, r.y + r.s / 2, 0) : null;
  }
  if (sel.kind === 'agent') {
    const d = live.deptOf.get(sel.id);
    const r = d ? layout.roomOf.get(d) : undefined;
    const seat = r?.seats.find((s) => s.agent.id === sel.id);
    if (!seat) return null;
    const [fx, fy] = figureSpot(seat);
    return iso(fx, fy, 0.5);
  }
  return null;
}
