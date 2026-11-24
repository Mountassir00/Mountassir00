/**
 * Hub arrangement of the Modular Office: the central platform (the
 * orchestrator's office), the walkways to each department and the
 * « Statut des tâches » panel. Light and motion follow recorded data only.
 */
import { memo, useMemo, useState, type KeyboardEvent, type Ref } from 'react';
import { Desk, IsoFigure, NatureBadge, iso } from '@ds';
import { fmtRelative, type DataNature, type DepartmentDef, type TaskRuntime } from '@sdk';
import { HUB_R } from './layout';
import type { FigureSpec } from './parts';

const RX = HUB_R * 45.25;
const RY = HUB_R * 22.63;
const TH = 0.55 * 32;

/* ---------------- walkway ---------------- */

export function Walkway({ a, b, z = -0.06, width = 0.7 }: { a: [number, number]; b: [number, number]; z?: number; width?: number }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * (width / 2);
  const ny = (dx / len) * (width / 2);
  const pts = [iso(a[0] + nx, a[1] + ny, z), iso(b[0] + nx, b[1] + ny, z), iso(b[0] - nx, b[1] - ny, z), iso(a[0] - nx, a[1] - ny, z)];
  return <polygon className="mo-walk" points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} />;
}

/* ---------------- central hub ---------------- */

export interface HubProps {
  dept: DepartmentDef;
  cx: number;
  cy: number;
  figures: FigureSpec[];
  /** The hub's engines are recorded as active. */
  active: boolean;
  /** Recorded traffic on at least one walkway in the window. */
  traffic: boolean;
  selected: boolean;
  dimmed: boolean;
  shadows: boolean;
  far: boolean;
  figureScale: number;
  ariaLabel: string;
  hitRef?: Ref<SVGGElement>;
  onActivate: () => void;
  onKey: (e: KeyboardEvent<SVGGElement>) => void;
  onSelectAgent: (id: string) => void;
}

/** Desk spots around the core (world offsets from the hub centre), front first. */
const SPOTS: Array<[number, number]> = [
  [-2.7, 0.9],
  [0.9, -2.7],
  [-0.4, 2.2],
];

export const HubPlatform = memo(function HubPlatform(p: HubProps) {
  const [sx, sy] = iso(p.cx, p.cy, 0);
  return (
    <g className="mo-hub" data-active={p.active || undefined} data-traffic={p.traffic || undefined} data-dimmed={p.dimmed || undefined}>
      <g transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`}>
        {p.shadows && <ellipse className="mo-hub__shadow" cx={0} cy={TH + 26} rx={RX * 1.02} ry={RY * 1.02} />}
        <path className="mo-hub__side" d={`M${-RX},0 A${RX},${RY} 0 0 0 ${RX},0 L${RX},${TH} A${RX},${RY} 0 0 1 ${-RX},${TH} Z`} />
        <path className="mo-hub__band" d={`M${-RX},${TH * 0.45} A${RX},${RY} 0 0 0 ${RX},${TH * 0.45}`} />
        <ellipse className="mo-hub__top" cx={0} cy={0} rx={RX} ry={RY} />
        <ellipse className="mo-hub__orbit" cx={0} cy={0} rx={RX * 0.74} ry={RY * 0.74} />
        <ellipse className="mo-hub__rim" cx={0} cy={0} rx={RX - 3} ry={RY - 1.5} />
      </g>
      <g
        ref={p.hitRef}
        className="iso-room mo-hit mo-hub__hit"
        role="button"
        tabIndex={0}
        aria-label={p.ariaLabel}
        aria-pressed={p.selected}
        data-selected={p.selected || undefined}
        onClick={p.onActivate}
        onKeyDown={p.onKey}
      >
        <ellipse className="mo-hit__area" cx={sx} cy={sy + TH / 2} rx={RX} ry={RY + TH / 2} />
        <ellipse className="iso-room__outline" cx={sx} cy={sy} rx={RX + 4} ry={RY + 2} />
      </g>
      <g className="mo-decor">
        {p.figures.slice(0, SPOTS.length).map((f, i) => (
          <Desk key={f.agent.id} x={p.cx + SPOTS[i][0]} y={p.cy + SPOTS[i][1] - 0.9} active={f.status === 'working' || f.status === 'researching' || f.status === 'validating' || f.status === 'collaborating'} />
        ))}
      </g>
      <g className="mo-hub__core" transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)})`} aria-hidden>
        <ellipse className="mo-hub__pad" cx={0} cy={0} rx={52} ry={26} />
        <path className="mo-hub__pedestal" d="M-26,0 A26,13 0 0 0 26,0 L26,-14 A26,13 0 0 1 -26,-14 Z" />
        <ellipse className="mo-hub__pedestal-top" cx={0} cy={-14} rx={26} ry={13} />
        {p.traffic && <rect className="mo-hub__beam" x={-7} y={-150} width={14} height={118} rx={7} />}
        <circle className="mo-hub__halo" cx={0} cy={-38} r={30} />
        <circle className="mo-hub__orb" cx={0} cy={-38} r={17} />
        <ellipse className="mo-hub__ring" cx={0} cy={-38} rx={30} ry={9} />
        <ellipse className="mo-hub__ring mo-hub__ring--b" cx={0} cy={-38} rx={24} ry={14} transform="rotate(-28 0 -38)" />
      </g>
      <g className="mo-agents">
        {p.figures.slice(0, SPOTS.length).map((f, i) => (
          <IsoFigure
            key={f.agent.id}
            x={p.cx + SPOTS[i][0] + 0.45}
            y={p.cy + SPOTS[i][1]}
            status={f.status}
            avatar={f.agent.avatar}
            kind={f.agent.kind}
            label={f.agent.name}
            sublabel={f.agent.role}
            selected={f.selected}
            dimmed={f.dimmed}
            showLabel={false}
            scale={p.figureScale}
            onSelect={() => p.onSelectAgent(f.agent.id)}
          />
        ))}
        {!p.far &&
          p.figures.slice(0, SPOTS.length).map((f, i) => {
            const [lx, ly] = iso(p.cx + SPOTS[i][0] + 0.45, p.cy + SPOTS[i][1], 0);
            return (
              <text key={f.agent.id} x={lx} y={ly + 15} textAnchor="middle" className="iso-label mo-agent-label" data-dimmed={f.dimmed || undefined}>
                {f.agent.name}
              </text>
            );
          })}
      </g>
    </g>
  );
});

/** Screen-space centre for a caption placed on the hub side of a ring platform. */
export function inwardCaption(sx: number, sy: number, hx: number, hy: number, halfW: number, halfH: number): { x: number; y: number } {
  const dx = hx - sx;
  const dy = hy - sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const edge = 1 / (Math.abs(ux) / 128 + Math.abs(uy) / 72 + 1e-6);
  const d = edge + 10 + Math.abs(ux) * halfW + Math.abs(uy) * halfH;
  return { x: sx + ux * d, y: sy + uy * d };
}

/** Inverse of iso() at z = 0 (screen → world). */
export function unIso(x: number, y: number): [number, number] {
  const a = x / 32;
  const b = y / 16;
  return [(a + b) / 2, (b - a) / 2];
}

/* ---------------- task status panel ---------------- */

type Tab = 'running' | 'pending' | 'done' | 'failed';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'running', label: 'En cours' },
  { id: 'pending', label: 'En attente' },
  { id: 'done', label: 'Terminées' },
  { id: 'failed', label: 'Échouées' },
];

export function TaskStatusPanel({
  tasks, from, to, now, nature, periodLabel, agentName, deptName, selectedTask, onSelect, initialOpen, onOpenChange, mobile,
}: {
  tasks: Record<string, TaskRuntime>;
  from: number;
  to: number;
  now: number;
  nature: DataNature;
  periodLabel: string;
  agentName: (id?: string) => string;
  deptName: (id?: string) => string;
  selectedTask?: string;
  onSelect: (id: string) => void;
  initialOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mobile: boolean;
}) {
  const [tab, setTab] = useState<Tab>('running');
  const [open, setOpen] = useState(initialOpen);
  const lists = useMemo(() => {
    const out: Record<Tab, TaskRuntime[]> = { running: [], pending: [], done: [], failed: [] };
    for (const t of Object.values(tasks)) {
      if (t.status === 'running' || t.status === 'paused') out.running.push(t);
      else if (t.status === 'pending') out.pending.push(t);
      else if (t.endedAt != null && t.endedAt >= from && t.endedAt <= to) {
        if (t.status === 'succeeded') out.done.push(t);
        else out.failed.push(t);
      }
    }
    out.running.sort((a, b) => (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt));
    out.pending.sort((a, b) => b.createdAt - a.createdAt);
    out.done.sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
    out.failed.sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
    return out;
  }, [tasks, from, to]);
  const setOpenBoth = (v: boolean) => {
    setOpen(v);
    onOpenChange(v);
  };
  const list = lists[tab];
  const when = (t: TaskRuntime) =>
    tab === 'running' ? `démarrée ${fmtRelative(t.startedAt ?? t.createdAt, now)}` : tab === 'pending' ? `créée ${fmtRelative(t.createdAt, now)}` : `${tab === 'done' ? 'terminée' : 'échouée'} ${fmtRelative(t.endedAt ?? now, now)}`;
  return (
    <section className="mo-ts" data-open={open || undefined} data-mobile={mobile || undefined} aria-label="Statut des tâches">
      <header className="mo-ts__head">
        <h2>Statut des tâches</h2>
        <NatureBadge nature={nature} />
        <button type="button" className="btn btn--sm btn--ghost mo-ts__toggle" aria-expanded={open} onClick={() => setOpenBoth(!open)}>
          {open ? 'Replier' : 'Détails'}
        </button>
      </header>
      <div className="mo-ts__tabs" role="group" aria-label="Filtrer par statut">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="mo-ts__tab"
            data-k={t.id}
            aria-pressed={open && tab === t.id}
            onClick={() => {
              setTab(t.id);
              if (!open) setOpenBoth(true);
            }}
          >
            <b className="num">{lists[t.id].length}</b>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      {open && (
        <>
          {list.length === 0 ? (
            <p className="mo-ts__empty">{tab === 'done' || tab === 'failed' ? `Aucune tâche ${tab === 'done' ? 'terminée' : 'échouée'} sur la période (${periodLabel}).` : `Aucune tâche ${tab === 'running' ? 'en cours' : 'en attente'}.`}</p>
          ) : (
            <ul className="mo-ts__list">
              {list.slice(0, 30).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="mo-ts__row"
                    data-k={t.status}
                    aria-pressed={selectedTask === t.id}
                    onClick={() => onSelect(t.id)}
                    aria-label={`${t.title}, ${deptName(t.departmentId)}, ${agentName(t.agentId)}, ${when(t)}`}
                  >
                    <i className="mo-ts__dot" aria-hidden />
                    <span className="mo-ts__main">
                      <span className="mo-ts__title">{t.title}</span>
                      <span className="mo-ts__meta">
                        {deptName(t.departmentId)} · {agentName(t.agentId)} · {when(t)}
                      </span>
                    </span>
                    {t.status === 'paused' && <span className="pill">Suspendue</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mo-ts__foot">{tab === 'done' || tab === 'failed' ? `Période : ${periodLabel}. ` : 'État actuel. '}Cliquer une tâche ouvre l’inspecteur.</p>
        </>
      )}
    </section>
  );
}
