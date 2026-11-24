/**
 * Visual parts of the Modular Office: department platform, cluster plate,
 * compact equipment, task tokens and captions. Presentational only.
 */
import { memo, type KeyboardEvent, type Ref } from 'react';
import { Antenna, Cylinder, Desk, Gauge, IsoBox, IsoFigure, IsoFloor, RouterBox, ServerRack, Shield, iso, shade, toneVar } from '@ds';
import type { AgentDef, AgentStatus, DepartmentDef, EquipmentKind } from '@sdk';
import { PD, PW } from './layout';

/** Local layout of a 4×4 platform: equipment back-right, desks mid-row, figures in front, tokens front-left. */
const DESK_X0 = 0.5;
const DESK_PITCH = 1.05;
const DESK_Y = 1.0;
const FIG_Y = 1.95;

const pts = (list: Array<[number, number]>) => list.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

export function topFace(x: number, y: number, z = 0) {
  return pts([iso(x, y, z), iso(x + PW, y, z), iso(x + PW, y + PD, z), iso(x, y + PD, z)]);
}

export function silhouette(x: number, y: number, th: number) {
  return pts([iso(x, y, 0), iso(x + PW, y, 0), iso(x + PW, y, -th), iso(x + PW, y + PD, -th), iso(x, y + PD, -th), iso(x, y + PD, 0)]);
}

const ACTIVE: AgentStatus[] = ['working', 'researching', 'validating', 'collaborating'];
export const isActive = (s: AgentStatus) => ACTIVE.includes(s);

/* ---------- equipment, compact enough for a 4×4 platform (back-right slot) ---------- */

export function Equipment({ kind, x, y, active, tone }: { kind: EquipmentKind | undefined; x: number; y: number; active: boolean; tone: string }) {
  switch (kind) {
    case 'server':
      return <ServerRack x={x} y={y} active={active} />;
    case 'database':
      return <Cylinder x={x + 0.28} y={y + 0.28} r={0.26} h={0.62} fill={shade(tone, 18)} />;
    case 'router':
      return <RouterBox x={x - 0.2} y={y} active={active} />;
    case 'gauge':
      return <Gauge x={x} y={y + 0.1} value={active ? 0.72 : 0.3} />;
    case 'shield':
      return <Shield x={x + 0.28} y={y + 0.28} alert={false} />;
    case 'antenna':
      return <Antenna x={x + 0.3} y={y + 0.3} active={active} />;
    case 'archive':
      return (
        <g>
          <IsoBox x={x} y={y} w={0.55} d={0.45} h={0.32} fill="var(--c-raised)" />
          <IsoBox x={x + 0.04} y={y + 0.04} z={0.32} w={0.47} d={0.38} h={0.28} fill={shade(tone, 6)} />
          <IsoBox x={x + 0.08} y={y + 0.06} z={0.6} w={0.4} d={0.34} h={0.22} fill="var(--c-raised)" />
        </g>
      );
    case 'lab': {
      const [fx, fy] = iso(x + 0.28, y + 0.28, 0.32);
      return (
        <g>
          <IsoBox x={x} y={y} w={0.56} d={0.56} h={0.32} fill="var(--c-raised)" />
          <path className="iso-edge" d={`M${fx - 3},${fy - 15} h6 v5 l6,10 h-18 l6,-10 Z`} style={{ fill: 'var(--c-sunken)' }} />
          <path d={`M${fx - 7},${fy - 1} h14 l-2.6,-4 h-8.8 Z`} className={active ? 'iso-liquid iso-liquid--on' : 'iso-liquid'} />
        </g>
      );
    }
    case 'board': {
      const rows = [0.62, 0.48, 0.34].map((z, i) => {
        const [a, b] = iso(x + 0.06, y + 0.06, z);
        const [c, d] = iso(x + 0.5 - i * 0.1, y + 0.06, z);
        return <line key={z} x1={a} y1={b} x2={c} y2={d} className="iso-ink-line" />;
      });
      return (
        <g>
          <IsoBox x={x} y={y} w={0.58} d={0.04} h={0.78} fill="var(--c-raised)" shadeL={2} shadeR={8} />
          {rows}
        </g>
      );
    }
    case 'meeting':
      return (
        <g>
          <Cylinder x={x + 0.3} y={y + 0.3} r={0.3} h={0.32} fill="var(--c-raised)" />
          <IsoBox x={x + 0.15} y={y + 0.68} w={0.22} d={0.18} h={0.16} fill="var(--c-sunken)" />
        </g>
      );
    case 'conveyor': {
      const [a, b] = iso(x, y + 0.2, 0.2);
      const [c, d] = iso(x + 0.56, y + 0.2, 0.2);
      return (
        <g>
          <IsoBox x={x} y={y} w={0.56} d={0.4} h={0.2} fill="var(--c-sunken)" />
          <line x1={a} y1={b} x2={c} y2={d} className={active ? 'iso-belt iso-belt--on' : 'iso-belt'} />
        </g>
      );
    }
    default:
      return null;
  }
}

/* ---------- task tokens: one cube per running / paused / pending task ---------- */

export function TaskTokens({ x, y, running, paused, pending, max = 6 }: { x: number; y: number; running: number; paused: number; pending: number; max?: number }) {
  const list: Array<'running' | 'paused' | 'pending'> = [
    ...Array<'running'>(running).fill('running'),
    ...Array<'paused'>(paused).fill('paused'),
    ...Array<'pending'>(pending).fill('pending'),
  ].slice(0, max);
  if (!list.length) return null;
  const fill = { running: 'color-mix(in oklab, var(--st-working) 55%, var(--c-raised))', paused: 'color-mix(in oklab, var(--st-paused) 45%, var(--c-raised))', pending: 'var(--c-raised)' } as const;
  return (
    <g className="mo-tokens" aria-hidden>
      {list.map((k, i) => {
        const col = i % 2;
        const lvl = Math.floor(i / 2);
        return <IsoBox key={i} x={x + col * 0.34} y={y} z={lvl * 0.2} w={0.28} d={0.28} h={0.18} fill={fill[k]} className={`mo-token mo-token--${k}`} />;
      })}
    </g>
  );
}

/* ---------- caption under the platform ---------- */

export interface Chip {
  key: string;
  glyph: string;
  value: string;
  tone: string;
  title: string;
}

const CHIP_H = 18;

export function Caption({ x, y, dy, title, chips, isNew, far, selected, scale = 1 }: { x: number; y: number; dy: number; title: string; chips: Chip[]; isNew?: boolean; far: boolean; selected?: boolean; scale?: number }) {
  const [ax, ay] = iso(x, y, 0);
  // Captions are laid out around (0,0) then placed (and optionally enlarged for far zoom).
  const cx = 0;
  const cy = 0;
  const all: Array<Chip & { w: number; isNewTag?: boolean }> = [
    ...(isNew ? [{ key: 'new', glyph: '', value: 'nouveau', tone: 'var(--c-accent)', title: 'Nouveau module, ajouté automatiquement', w: 60, isNewTag: true }] : []),
    ...chips.map((c) => ({ ...c, w: 24 + c.value.length * 7.4 })),
  ];
  const total = all.reduce((s, c) => s + c.w, 0) + Math.max(0, all.length - 1) * 5;
  let cursor = cx - total / 2;
  const placed = all.map((c) => {
    const left = cursor;
    cursor += c.w + 5;
    return { ...c, left };
  });
  return (
    <g className="mo-caption" data-selected={selected || undefined} aria-hidden transform={`translate(${ax.toFixed(1)} ${(ay + dy).toFixed(1)})${scale !== 1 ? ` scale(${scale})` : ''}`}>
      <text x={cx} y={cy + 17} textAnchor="middle" className="iso-label mo-caption__title">
        {title}
      </text>
      {!far && placed.length > 0 && (
        <g transform={`translate(0 ${(cy + 25).toFixed(1)})`}>
          {placed.map((c) => (
            <g key={c.key} transform={`translate(${c.left.toFixed(1)} 0)`}>
              <title>{c.title}</title>
              <rect width={c.w} height={CHIP_H} rx={CHIP_H / 2} className={c.isNewTag ? 'mo-chip mo-chip--new' : 'mo-chip'} style={c.isNewTag ? undefined : { stroke: c.tone }} />
              {c.isNewTag ? (
                <text x={c.w / 2} y={13} textAnchor="middle" className="mo-chip__text mo-chip__text--new">
                  {c.value}
                </text>
              ) : (
                <>
                  <text x={10} y={13} textAnchor="middle" className="mo-chip__glyph" style={{ fill: c.tone }}>
                    {c.glyph}
                  </text>
                  <text x={18} y={13} className="mo-chip__text">
                    {c.value}
                  </text>
                </>
              )}
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/* ---------- department platform ---------- */

export interface FigureSpec {
  agent: AgentDef;
  status: AgentStatus;
  selected: boolean;
  dimmed: boolean;
}

export interface PlatformProps {
  dept: DepartmentDef;
  x: number;
  y: number;
  lift: number;
  thickness: number;
  desks: Array<{ owner?: AgentDef; active: boolean }>;
  figures: FigureSpec[];
  overflow: number;
  tasks: { running: number; paused: number; pending: number };
  selected: boolean;
  picked: boolean;
  dimmed: boolean;
  far: boolean;
  detail: 'full' | 'reduced' | 'minimal';
  shadows: boolean;
  floorGrid: boolean;
  showLabels: boolean;
  figureScale: number;
  reorganizing: boolean;
  ariaLabel: string;
  hitRef?: Ref<SVGGElement>;
  onActivate: () => void;
  onKey: (e: KeyboardEvent<SVGGElement>) => void;
  onSelectAgent: (id: string) => void;
}

export const Platform = memo(function Platform(p: PlatformProps) {
  const z = p.lift;
  const tone = toneVar(p.dept.tone);
  const anyActive = p.figures.some((f) => isActive(f.status));
  const eq = p.dept.equipment.find((e) => e !== 'desk');
  return (
    <g className="mo-platform" data-dimmed={p.dimmed || undefined} data-picked={p.picked || undefined} transform={z ? `translate(0 ${(-z * 32).toFixed(1)})` : undefined}>
      {p.shadows && <polygon className="mo-shadow" points={topFace(p.x - 0.1, p.y - 0.1, -p.thickness - 0.8 - z)} />}
      <IsoFloor x={p.x} y={p.y} w={PW} d={PD} thickness={p.thickness} fill={tone} grid={p.floorGrid && p.detail === 'full' && !p.far} />
      <g
        ref={p.hitRef}
        className="iso-room mo-hit"
        role="button"
        tabIndex={0}
        aria-label={p.ariaLabel}
        aria-pressed={p.reorganizing ? p.picked : p.selected}
        data-selected={p.selected || p.picked || undefined}
        onClick={p.onActivate}
        onKeyDown={p.onKey}
      >
        <polygon className="mo-hit__area" points={silhouette(p.x, p.y, p.thickness)} />
        <polygon className="iso-room__outline" points={topFace(p.x, p.y)} />
      </g>
      <g className="mo-decor">
        {p.detail !== 'minimal' && <Equipment kind={eq} x={p.x + 3.3} y={p.y + 0.28} active={anyActive} tone={tone} />}
        {p.desks.map((d, i) => (
          <Desk key={i} x={p.x + DESK_X0 + i * DESK_PITCH} y={p.y + DESK_Y} active={d.active} />
        ))}
      </g>
      <g className="mo-agents" data-reorganizing={p.reorganizing || undefined}>
        {p.figures.map((f, i) => (
          <IsoFigure
            key={f.agent.id}
            x={p.x + DESK_X0 + 0.45 + i * DESK_PITCH}
            y={p.y + FIG_Y}
            status={f.status}
            avatar={f.agent.avatar}
            kind={f.agent.kind}
            label={f.agent.name}
            sublabel={f.agent.role}
            selected={f.selected}
            dimmed={f.dimmed}
            showLabel={false}
            scale={p.figureScale}
            onSelect={p.reorganizing ? undefined : () => p.onSelectAgent(f.agent.id)}
          />
        ))}
        {p.showLabels && !p.far &&
          p.figures.map((f, i) => {
            const at = labelAt(p.x + DESK_X0 + 0.45 + i * DESK_PITCH, p.y + FIG_Y);
            return (
              <text key={f.agent.id} x={at.x} y={at.y + 15} textAnchor="middle" className="iso-label mo-agent-label" data-dimmed={f.dimmed || undefined}>
                {f.agent.name}
              </text>
            );
          })}
        {p.overflow > 0 && (
          <text {...labelAt(p.x + 3.6, p.y + 2.2)} className="iso-label mo-agent-label iso-label--muted" textAnchor="middle">
            +{p.overflow}
          </text>
        )}
      </g>
      <TaskTokens x={p.x + 0.32} y={p.y + 2.9} {...p.tasks} />
    </g>
  );
});

function labelAt(x: number, y: number) {
  const [sx, sy] = iso(x, y, 0);
  return { x: sx, y: sy };
}

/* ---------- cluster plate: a collapsed group of departments ---------- */

export const ClusterPlate = memo(function ClusterPlate(p: {
  group: string;
  depts: Array<{ dept: DepartmentDef; active: number; errors: number }>;
  x: number;
  y: number;
  thickness: number;
  shadows: boolean;
  dimmed: boolean;
  ariaLabel: string;
  hitRef?: Ref<SVGGElement>;
  onActivate: () => void;
  onKey: (e: KeyboardEvent<SVGGElement>) => void;
}) {
  const th = p.thickness * 1.5;
  const n = p.depts.length;
  const cols = n <= 4 ? 2 : 3;
  const cell = cols === 2 ? 1.6 : 1.12;
  const tile = cell - 0.3;
  return (
    <g className="mo-platform mo-cluster" data-dimmed={p.dimmed || undefined}>
      {p.shadows && <polygon className="mo-shadow" points={topFace(p.x - 0.1, p.y - 0.1, -th - 0.8)} />}
      <IsoFloor x={p.x} y={p.y} w={PW} d={PD} thickness={th} fill="var(--c-raised)" grid={false} />
      <g ref={p.hitRef} className="iso-room mo-hit" role="button" tabIndex={0} aria-label={p.ariaLabel} aria-expanded={false} onClick={p.onActivate} onKeyDown={p.onKey}>
        <polygon className="mo-hit__area" points={silhouette(p.x, p.y, th)} />
        <polygon className="iso-room__outline" points={topFace(p.x, p.y)} />
      </g>
      <g className="mo-decor">
        {p.depts.slice(0, 9).map((d, i) => {
          const cx = p.x + 0.35 + (i % cols) * cell;
          const cy = p.y + 0.35 + Math.floor(i / cols) * cell;
          const [dx, dy] = iso(cx + tile / 2, cy + tile / 2, 0.16);
          return (
            <g key={d.dept.id}>
              <IsoBox x={cx} y={cy} w={tile} d={tile} h={0.16} fill={toneVar(d.dept.tone)} />
              {(d.active > 0 || d.errors > 0) && <circle cx={dx} cy={dy - 2} r={3.6} className={d.errors ? 'mo-dot mo-dot--error' : 'mo-dot'} />}
            </g>
          );
        })}
      </g>
    </g>
  );
});

export function EmptySlot({ x, y, index, armed, onActivate }: { x: number; y: number; index: number; armed: boolean; onActivate: () => void }) {
  return (
    <g
      className="mo-empty"
      data-armed={armed || undefined}
      role="button"
      tabIndex={armed ? 0 : -1}
      aria-label={`Emplacement libre ${index + 1}${armed ? ' : déposer ici' : ''}`}
      onClick={onActivate}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onActivate())}
    >
      <polygon points={topFace(x, y)} />
    </g>
  );
}
