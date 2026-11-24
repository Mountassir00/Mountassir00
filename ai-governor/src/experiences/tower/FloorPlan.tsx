/**
 * Floor view: the isometric plan of one pole. One room per department,
 * one workstation per engine serving it; the engine is drawn where it
 * actually stands (its current task), the other desks stay empty.
 */
import { memo, type KeyboardEvent, type ReactNode } from 'react';
import {
  Antenna, Conveyor, Cylinder, Gauge, IsoBackWalls, IsoBox, IsoFloor, LabBench, MeetingTable, Plant, RouterBox, ServerRack, Shelf, Shield, Whiteboard, iso, toneVar,
} from '@ds';
import type { AgentDef, AgentStatus, DepartmentDef, EquipmentKind } from '@sdk';
import { Character, Workstation } from './Robot';
import { isActive, type Floor } from './model';
import type { PlanGeom, RoomBox } from './geometry';

type Pt = [number, number];
const P = (pts: Pt[]) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
const at = (z: number) => `translate(0 ${(-z * 32).toFixed(1)})`;

export interface RoomLive {
  running: number;
  pending: number;
  decisions: number;
  incidents: number;
}

export interface FloorPlanProps {
  floor: Floor;
  geom: PlanGeom;
  agents: Map<string, AgentDef>;
  standing: Map<string, string>;
  statusOf: (id: string) => AgentStatus;
  deptName: (id: string) => string;
  rooms: Map<string, RoomLive>;
  selectedAgent?: string;
  selectedDept?: string;
  dimDept: (id: string) => boolean;
  dimAgent: (id: string) => boolean;
  night: boolean;
  pools: boolean;
  showLabels: boolean;
  shaftLinks: number;
  onSelectAgent: (id: string) => void;
  onSelectDept: (id: string) => void;
}

function Equipment({ kind, x, y, active, tone }: { kind: EquipmentKind; x: number; y: number; active: boolean; tone: string }): ReactNode {
  switch (kind) {
    case 'server':
      return <ServerRack x={x} y={y} active={active} />;
    case 'database':
      return <Cylinder x={x + 0.35} y={y + 0.35} r={0.3} h={0.7} fill={tone} />;
    case 'router':
      return <RouterBox x={x} y={y} active={active} />;
    case 'gauge':
      return <Gauge x={x} y={y} value={active ? 0.72 : 0.28} />;
    case 'shield':
      return <Shield x={x + 0.3} y={y + 0.3} />;
    case 'antenna':
      return <Antenna x={x + 0.3} y={y + 0.3} active={active} />;
    case 'archive':
      return <Shelf x={x} y={y} />;
    case 'lab':
      return <LabBench x={x} y={y} active={active} />;
    case 'board':
      return <Whiteboard x={x} y={y} />;
    case 'meeting':
      return <MeetingTable x={x} y={y + 0.2} />;
    case 'conveyor':
      return <Conveyor x={x} y={y + 0.1} active={active} />;
    default:
      return null;
  }
}

interface Slot {
  agent: AgentDef;
  here: boolean;
  status: AgentStatus;
}

export const FloorPlan = memo(function FloorPlan(p: FloorPlanProps) {
  const { geom: G } = p;
  const onKey = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  const slotsFor = (dept: DepartmentDef): Slot[] => {
    const ids = [...dept.engineIds];
    for (const [id, d] of p.standing) if (d === dept.id && !ids.includes(id)) ids.push(id);
    const out: Slot[] = [];
    for (const id of ids) {
      const agent = p.agents.get(id);
      if (!agent) continue;
      out.push({ agent, here: (p.standing.get(id) ?? dept.id) === dept.id, status: p.statusOf(id) });
    }
    return out.slice(0, 6);
  };

  const ordered = [...G.rooms].sort((a, b) => a.x + a.y - (b.x + b.y));

  const room = (r: RoomBox) => {
    const d = r.dept;
    const tone = toneVar(d.tone);
    const slots = slotsFor(d);
    const anyActive = slots.some((s) => s.here && isActive(s.status));
    const live = p.rooms.get(d.id) ?? { running: 0, pending: 0, decisions: 0, incidents: 0 };
    const equipment = d.equipment.filter((e) => e !== 'desk').slice(0, 2);
    const dimmed = p.dimDept(d.id);
    const selected = p.selectedDept === d.id;
    const perRow = 3;
    const positions = slots.map((_, i) => ({ x: r.x + 0.55 + (i % perRow) * 1.75, y: r.y + 1.75 + Math.floor(i / perRow) * 1.75 }));
    const here = slots.filter((s) => s.here);
    const aria = [
      `${d.name} — ${d.mission}`,
      here.length ? `présents : ${here.map((s) => s.agent.name).join(', ')}` : 'aucun moteur présent',
      live.running ? `${live.running} tâche${live.running > 1 ? 's' : ''} en cours` : '',
      live.pending ? `${live.pending} en file` : '',
      live.decisions ? `${live.decisions} décision${live.decisions > 1 ? 's' : ''} en attente` : '',
      live.incidents ? `${live.incidents} incident${live.incidents > 1 ? 's' : ''} ouvert${live.incidents > 1 ? 's' : ''}` : '',
    ].filter(Boolean).join(', ');
    const [lx, ly] = iso(r.x + 0.15, r.y + r.d - 0.1, 0);
    const chips: Array<{ k: string; t: string }> = [];
    if (live.running) chips.push({ k: 'run', t: `▶ ${live.running}` });
    if (live.pending) chips.push({ k: 'pend', t: `… ${live.pending}` });
    if (live.decisions) chips.push({ k: 'dec', t: `◆ ${live.decisions}` });
    if (live.incidents) chips.push({ k: 'inc', t: `▲ ${live.incidents}` });
    return (
      <g key={d.id} className="tw-room" data-dimmed={dimmed || undefined} style={{ ['--tone' as string]: tone }}>
        <IsoFloor x={r.x} y={r.y} w={r.w} d={r.d} fill="var(--tw-room)" grid={!p.night} className="tw-room__floor" />
        {p.pools &&
          slots.map((s, i) =>
            s.here && isActive(s.status) ? (
              <ellipse key={`pool-${s.agent.id}`} className="tw-pool" cx={iso(positions[i].x + 0.5, positions[i].y + 0.7, 0)[0]} cy={iso(positions[i].x + 0.5, positions[i].y + 0.7, 0)[1]} rx={58} ry={29} />
            ) : null,
          )}
        <g
          className="tw-room__hit"
          role="button"
          tabIndex={0}
          aria-label={aria}
          aria-pressed={selected}
          data-selected={selected || undefined}
          onClick={() => p.onSelectDept(d.id)}
          onKeyDown={onKey(() => p.onSelectDept(d.id))}
        >
          <polygon className="tw-room__area" points={P([iso(r.x, r.y, 0), iso(r.x + r.w, r.y, 0), iso(r.x + r.w, r.y + r.d, 0), iso(r.x, r.y + r.d, 0)])} />
        </g>
        <g className="tw-room__decor" aria-hidden>
          <IsoBackWalls x={r.x} y={r.y} w={r.w} d={r.d} h={0.55} fill="var(--tw-wall)" />
          {equipment[0] && <Equipment kind={equipment[0]} x={r.x + 0.35} y={r.y + 0.25} active={anyActive} tone={tone} />}
          {equipment[1] && <Equipment kind={equipment[1]} x={r.x + r.w - 1.75} y={r.y + 0.25} active={anyActive} tone={tone} />}
          <Plant x={r.x + r.w - 0.45} y={r.y + r.d - 0.5} />
          {slots.map((s, i) =>
            s.agent.kind === 'script' || s.agent.kind === 'service' ? null : (
              <Workstation key={`desk-${s.agent.id}`} x={positions[i].x} y={positions[i].y} tone={tone} lit={!s.here ? 'off' : isActive(s.status) ? 'on' : s.status === 'waiting' ? 'wait' : s.status === 'error' ? 'error' : 'off'} />
            ),
          )}
        </g>
        {slots.map((s, i) => {
          const pos = positions[i];
          const machine = s.agent.kind === 'script' || s.agent.kind === 'service';
          const fx = machine ? pos.x + 0.5 : pos.x + 0.5;
          const fy = machine ? pos.y + 0.35 : pos.y + 1.0;
          const [tx, ty] = iso(fx, fy, 0);
          if (!s.here) {
            const elsewhere = p.deptName(p.standing.get(s.agent.id) ?? '');
            return (
              <g key={s.agent.id} className="tw-away" aria-hidden>
                {machine && <IsoBox x={pos.x + 0.15} y={pos.y} w={0.7} d={0.5} h={0.4} fill="var(--tw-device)" className="tw-away__console" />}
                {p.showLabels && (
                  <text className="tw-agentlabel tw-agentlabel--away" x={tx} y={ty + 16} textAnchor="middle">
                    {`${s.agent.name} · ${elsewhere ? `en ${elsewhere}` : 'ailleurs'}`}
                  </text>
                )}
              </g>
            );
          }
          return (
            <g key={s.agent.id}>
              <Character
                agent={s.agent}
                x={fx}
                y={fy}
                status={s.status}
                selected={p.selectedAgent === s.agent.id}
                dimmed={p.dimAgent(s.agent.id)}
                where={`poste ${d.name}`}
                scale={1.05}
                onSelect={() => p.onSelectAgent(s.agent.id)}
              />
              {p.showLabels && (
                <text className="tw-agentlabel" data-dimmed={p.dimAgent(s.agent.id) || undefined} x={tx} y={ty + 17} textAnchor="middle">
                  {s.agent.name}
                </text>
              )}
            </g>
          );
        })}
        <g className="tw-roomlabel" aria-hidden data-selected={selected || undefined} transform={`translate(${lx.toFixed(1)} ${ly.toFixed(1)})`}>
          <text className="tw-roomlabel__name" x={0} y={18}>
            {d.name}
          </text>
          {chips.map((c, i) => (
            <g key={c.k} transform={`translate(${i * 40} 25)`} className="tw-roomchip" data-k={c.k}>
              <rect width={36} height={18} rx={9} />
              <text x={18} y={13} textAnchor="middle">
                {c.t}
              </text>
            </g>
          ))}
        </g>
      </g>
    );
  };

  const L = G.landing;
  const [ex, ey] = iso(L.x + L.w / 2, L.y + 0.6, 0);
  return (
    <g className="tw-plan">
      <IsoFloor x={G.slab.x} y={G.slab.y} w={G.slab.w} d={G.slab.d} fill="var(--tw-slab)" thickness={0.35} grid={false} />
      <IsoBackWalls x={G.slab.x} y={G.slab.y} w={G.slab.w} d={G.slab.d} h={0.9} fill="var(--tw-facade)" />
      {ordered.map(room)}
      <g aria-hidden className="tw-landing-area">
        <IsoFloor x={L.x} y={L.y} w={L.w} d={L.d} fill="var(--tw-landing-floor)" grid={false} />
        <IsoBox x={L.x + 0.3} y={L.y - 0.05} w={L.w - 0.6} d={0.35} h={1.6} fill="var(--tw-glass)" className="tw-lift" />
        <g transform={at(0)}>
          <line className="tw-lift__seam" x1={iso(L.x + L.w / 2, L.y + 0.3, 0)[0]} y1={iso(L.x + L.w / 2, L.y + 0.3, 0)[1]} x2={iso(L.x + L.w / 2, L.y + 0.3, 1.5)[0]} y2={iso(L.x + L.w / 2, L.y + 0.3, 1.5)[1]} />
        </g>
        <text className="tw-agentlabel tw-agentlabel--away" x={ex} y={ey + 30} textAnchor="middle">
          {p.shaftLinks ? `Ascenseur · ${p.shaftLinks} échange${p.shaftLinks > 1 ? 's' : ''} récent${p.shaftLinks > 1 ? 's' : ''}` : 'Ascenseur'}
        </text>
      </g>
    </g>
  );
});
