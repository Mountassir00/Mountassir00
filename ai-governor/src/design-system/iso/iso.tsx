/**
 * Isometric kit — 2D SVG, no 3D engine.
 * 2:1 dimetric projection: one world unit = one floor tile (64 × 32 px).
 * Faces are shaded by mixing the fill with the ink colour, so every theme
 * (light, dark, high contrast) gets coherent volumes for free.
 */
import { memo, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { AgentStatus } from '@core/events/schema';
import type { AvatarDef } from '@core/catalog';

export const TILE_W = 64;
export const TILE_H = 32;
export const Z_UNIT = 32;

export type Pt = [number, number];

export function iso(x: number, y: number, z = 0): Pt {
  return [(x - y) * (TILE_W / 2), (x + y) * (TILE_H / 2) - z * Z_UNIT];
}

const poly = (pts: Pt[]) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

export function shade(fill: string, pct: number) {
  return `color-mix(in oklab, ${fill} ${100 - pct}%, var(--c-ink))`;
}

export const toneVar = (tone: string) => `var(--${tone})`;

/** Depth key for painter's algorithm: larger = closer to the viewer. */
export const depth = (x: number, y: number, z = 0) => x + y + z * 0.01;

export interface BoxProps {
  x: number; y: number; z?: number; w: number; d: number; h: number;
  fill: string;
  className?: string;
  stroke?: boolean;
  topStyle?: CSSProperties;
  /** Darken percentages for the left (+y) and right (+x) faces. */
  shadeL?: number;
  shadeR?: number;
}

export const IsoBox = memo(function IsoBox({ x, y, z = 0, w, d, h, fill, className, stroke = true, topStyle, shadeL = 9, shadeR = 18 }: BoxProps) {
  const t = z + h;
  const top = [iso(x, y, t), iso(x + w, y, t), iso(x + w, y + d, t), iso(x, y + d, t)];
  const left = [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x, y + d, t)];
  const right = [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x + w, y, t)];
  const s = stroke ? 'iso-edge' : undefined;
  return (
    <g className={className}>
      {h > 0 && <polygon points={poly(left)} className={s} style={{ fill: shade(fill, shadeL) }} />}
      {h > 0 && <polygon points={poly(right)} className={s} style={{ fill: shade(fill, shadeR) }} />}
      <polygon points={poly(top)} className={s} style={{ fill, ...topStyle }} />
    </g>
  );
});

export function IsoTile({ x, y, z = 0, w = 1, d = 1, fill, className }: { x: number; y: number; z?: number; w?: number; d?: number; fill: string; className?: string }) {
  return <polygon className={`iso-edge ${className ?? ''}`} points={poly([iso(x, y, z), iso(x + w, y, z), iso(x + w, y + d, z), iso(x, y + d, z)])} style={{ fill }} />;
}

/** Floor plate with a fine iso grid, used for rooms and platforms. */
export function IsoFloor({ x, y, w, d, z = 0, fill, thickness = 0, grid = true, className }: { x: number; y: number; w: number; d: number; z?: number; fill: string; thickness?: number; grid?: boolean; className?: string }) {
  const lines: ReactNode[] = [];
  if (grid) {
    for (let i = 1; i < w; i++) {
      const [a, b] = iso(x + i, y, z);
      const [c, e] = iso(x + i, y + d, z);
      lines.push(<line key={`gx${i}`} x1={a} y1={b} x2={c} y2={e} className="iso-floorline" />);
    }
    for (let j = 1; j < d; j++) {
      const [a, b] = iso(x, y + j, z);
      const [c, e] = iso(x + w, y + j, z);
      lines.push(<line key={`gy${j}`} x1={a} y1={b} x2={c} y2={e} className="iso-floorline" />);
    }
  }
  return (
    <g className={className}>
      {thickness > 0 ? <IsoBox x={x} y={y} z={z - thickness} w={w} d={d} h={thickness} fill={fill} shadeL={14} shadeR={24} /> : <IsoTile x={x} y={y} z={z} w={w} d={d} fill={fill} />}
      {lines}
    </g>
  );
}

/** Low wall along the back edges of a room (x=back, y=back), keeps the room readable. */
export function IsoBackWalls({ x, y, w, d, h = 0.35, fill }: { x: number; y: number; w: number; d: number; h?: number; fill: string }) {
  return (
    <g>
      <IsoBox x={x} y={y - 0.08} w={w} d={0.08} h={h} fill={fill} shadeL={4} shadeR={10} />
      <IsoBox x={x - 0.08} y={y - 0.08} w={0.08} d={d + 0.08} h={h} fill={fill} shadeL={6} shadeR={12} />
    </g>
  );
}

/* ---------------- furniture & equipment ---------------- */

const WOOD = 'var(--c-raised)';

export function Desk({ x, y, screen, active }: { x: number; y: number; screen?: string; active?: boolean }) {
  return (
    <g className="iso-desk">
      <IsoBox x={x} y={y} w={0.9} d={0.55} h={0.42} fill={WOOD} />
      <IsoBox x={x + 0.25} y={y + 0.06} z={0.42} w={0.42} d={0.07} h={0.32} fill="var(--c-ink-soft)" shadeL={0} shadeR={10} />
      <polygon
        className={active ? 'iso-screen iso-screen--on' : 'iso-screen'}
        points={poly([iso(x + 0.27, y + 0.13, 0.45), iso(x + 0.65, y + 0.13, 0.45), iso(x + 0.65, y + 0.13, 0.72), iso(x + 0.27, y + 0.13, 0.72)])}
        style={{ fill: screen ?? 'var(--c-sunken)' }}
      />
    </g>
  );
}

export function MeetingTable({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBox x={x} y={y} w={1.6} d={0.9} h={0.38} fill={WOOD} />
      {[0.15, 0.65, 1.15].map((o) => (
        <IsoBox key={o} x={x + o} y={y + 1.0} w={0.3} d={0.25} h={0.22} fill="var(--c-sunken)" />
      ))}
    </g>
  );
}

export function Whiteboard({ x, y, lines = 3 }: { x: number; y: number; lines?: number }) {
  const rows = Array.from({ length: lines }, (_, i) => {
    const [a, b] = iso(x + 0.12, y + 0.04, 0.85 - i * 0.18);
    const [c, d] = iso(x + 0.9 - i * 0.15, y + 0.04, 0.85 - i * 0.18);
    return <line key={i} x1={a} y1={b} x2={c} y2={d} className="iso-ink-line" />;
  });
  return (
    <g>
      <IsoBox x={x} y={y} w={1.1} d={0.04} h={1.05} fill="var(--c-raised)" shadeL={2} shadeR={8} />
      {rows}
    </g>
  );
}

export function ServerRack({ x, y, active }: { x: number; y: number; active?: boolean }) {
  const leds = [0.95, 0.7, 0.45].map((z, i) => {
    const [a, b] = iso(x + 0.56, y + 0.15 + i * 0.12, z);
    return <circle key={i} cx={a} cy={b} r={2} className={active ? 'iso-led iso-led--on' : 'iso-led'} style={{ animationDelay: `${i * 0.35}s` }} />;
  });
  return (
    <g>
      <IsoBox x={x} y={y} w={0.55} d={0.55} h={1.15} fill="var(--c-ink-soft)" shadeL={8} shadeR={16} />
      {leds}
    </g>
  );
}

export function Cylinder({ x, y, r = 0.32, h = 0.7, fill, z = 0 }: { x: number; y: number; r?: number; h?: number; fill: string; z?: number }) {
  const [cx, cyB] = iso(x, y, z);
  const [, cyT] = iso(x, y, z + h);
  const rx = r * TILE_W * 0.7071;
  const ry = r * TILE_H * 0.7071;
  return (
    <g>
      <path className="iso-edge" d={`M${cx - rx},${cyT} L${cx - rx},${cyB} A${rx},${ry} 0 0 0 ${cx + rx},${cyB} L${cx + rx},${cyT} Z`} style={{ fill: shade(fill, 12) }} />
      <ellipse className="iso-edge" cx={cx} cy={cyT} rx={rx} ry={ry} style={{ fill }} />
      <path className="iso-ink-line" d={`M${cx - rx},${(cyT + cyB) / 2} A${rx},${ry} 0 0 0 ${cx + rx},${(cyT + cyB) / 2}`} fill="none" />
    </g>
  );
}

export function LabBench({ x, y, active }: { x: number; y: number; active?: boolean }) {
  const [fx, fy] = iso(x + 0.55, y + 0.25, 0.42);
  return (
    <g>
      <IsoBox x={x} y={y} w={1.1} d={0.5} h={0.42} fill="var(--c-raised)" />
      <path className="iso-edge" d={`M${fx - 4},${fy - 18} h8 v6 l7,12 h-22 l7,-12 Z`} style={{ fill: 'var(--c-sunken)' }} />
      <path d={`M${fx - 9},${fy - 2} h18 l-3,-5 h-12 Z`} className={active ? 'iso-liquid iso-liquid--on' : 'iso-liquid'} />
    </g>
  );
}

export function Antenna({ x, y, active }: { x: number; y: number; active?: boolean }) {
  const [bx, by] = iso(x, y, 0);
  const [tx, ty] = iso(x, y, 1.4);
  return (
    <g>
      <IsoBox x={x - 0.18} y={y - 0.18} w={0.36} d={0.36} h={0.12} fill="var(--c-sunken)" />
      <line x1={bx} y1={by - 4} x2={tx} y2={ty} className="iso-mast" />
      <circle cx={tx} cy={ty} r={3} style={{ fill: 'var(--c-ink-soft)' }} />
      <g className={active ? 'iso-waves iso-waves--on' : 'iso-waves'}>
        <path d={`M${tx + 7},${ty - 6} a9,9 0 0 1 0,12`} />
        <path d={`M${tx + 12},${ty - 10} a15,15 0 0 1 0,20`} />
      </g>
    </g>
  );
}

export function Gauge({ x, y, value = 0.5 }: { x: number; y: number; value?: number }) {
  const [cx, cy] = iso(x + 0.3, y + 0.05, 0.75);
  const a = Math.PI * (1 - Math.max(0, Math.min(1, value)));
  return (
    <g>
      <IsoBox x={x} y={y} w={0.6} d={0.1} h={0.95} fill="var(--c-raised)" />
      <path d={`M${cx - 11},${cy} A11,11 0 0 1 ${cx + 11},${cy}`} className="iso-ink-line" fill="none" />
      <line x1={cx} y1={cy} x2={cx + Math.cos(a) * 9} y2={cy - Math.sin(a) * 9} className="iso-needle" />
    </g>
  );
}

export function Shield({ x, y, alert }: { x: number; y: number; alert?: boolean }) {
  const [cx, cy] = iso(x, y, 0.95);
  return (
    <g>
      <IsoBox x={x - 0.2} y={y - 0.2} w={0.4} d={0.4} h={0.3} fill="var(--c-sunken)" />
      <path className="iso-edge" d={`M${cx},${cy - 16} l13,5 v8 c0,8 -6,12 -13,15 c-7,-3 -13,-7 -13,-15 v-8 Z`} style={{ fill: alert ? 'color-mix(in oklab, var(--st-error) 30%, var(--c-raised))' : 'var(--c-raised)' }} />
      <path d={`M${cx - 5},${cy} l4,4 7,-8`} className="iso-ink-line" fill="none" />
    </g>
  );
}

export function Shelf({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBox x={x} y={y} w={1.2} d={0.35} h={1.0} fill="var(--c-raised)" />
      {[0.3, 0.62].map((z) => (
        <IsoBox key={z} x={x + 0.05} y={y + 0.36} z={z} w={1.1} d={0.02} h={0.02} fill="var(--c-ink-soft)" stroke={false} />
      ))}
      {[0.1, 0.32, 0.55, 0.8].map((o, i) => (
        <IsoBox key={o} x={x + o} y={y + 0.28} z={i % 2 ? 0.66 : 0.34} w={0.16} d={0.06} h={0.24} fill={`var(--p${(i % 8) + 1})`} />
      ))}
    </g>
  );
}

export function RouterBox({ x, y, active }: { x: number; y: number; active?: boolean }) {
  const ports = [0, 1, 2, 3].map((i) => {
    const [a, b] = iso(x + 0.15 + i * 0.18, y + 0.5, 0.12);
    return <circle key={i} cx={a} cy={b} r={1.8} className={active ? 'iso-led iso-led--on' : 'iso-led'} style={{ animationDelay: `${i * 0.2}s` }} />;
  });
  return (
    <g>
      <IsoBox x={x} y={y} w={0.85} d={0.5} h={0.22} fill="var(--c-raised)" />
      {ports}
    </g>
  );
}

export function Conveyor({ x, y, active }: { x: number; y: number; active?: boolean }) {
  const [a, b] = iso(x + 0.05, y + 0.25, 0.3);
  const [c, d] = iso(x + 1.45, y + 0.25, 0.3);
  return (
    <g>
      <IsoBox x={x} y={y} w={1.5} d={0.5} h={0.3} fill="var(--c-sunken)" />
      <line x1={a} y1={b} x2={c} y2={d} className={active ? 'iso-belt iso-belt--on' : 'iso-belt'} />
    </g>
  );
}

export function Plant({ x, y }: { x: number; y: number }) {
  const [cx, cy] = iso(x, y, 0.35);
  return (
    <g aria-hidden>
      <Cylinder x={x} y={y} r={0.13} h={0.3} fill="var(--c-raised)" />
      <circle cx={cx - 4} cy={cy - 6} r={6} style={{ fill: 'color-mix(in oklab, var(--st-validating) 55%, var(--c-raised))' }} className="iso-edge" />
      <circle cx={cx + 4} cy={cy - 9} r={5} style={{ fill: 'color-mix(in oklab, var(--st-validating) 40%, var(--c-raised))' }} className="iso-edge" />
    </g>
  );
}

/* ---------------- characters ---------------- */

const STATUS_GLYPH: Partial<Record<AgentStatus, ReactNode>> = {
  waiting: (
    <g>
      <circle cx={-4} cy={0} r={1.4} />
      <circle cx={0} cy={0} r={1.4} />
      <circle cx={4} cy={0} r={1.4} />
    </g>
  ),
  researching: (
    <g fill="none" strokeWidth={1.6}>
      <circle cx={-1} cy={-1} r={3} />
      <path d="M1.2 1.2 4 4" />
    </g>
  ),
  validating: <path d="M-3.5 0 -1 2.5 3.5 -2.5" fill="none" strokeWidth={1.8} />,
  error: (
    <g>
      <path d="M0 -4v4.5" strokeWidth={2} />
      <circle cx={0} cy={3.4} r={1.1} />
    </g>
  ),
  paused: <path d="M-1.8 -3v6M1.8 -3v6" strokeWidth={1.8} />,
  collaborating: (
    <g fill="none" strokeWidth={1.5}>
      <circle cx={-2} cy={0} r={2.4} />
      <circle cx={2} cy={0} r={2.4} />
    </g>
  ),
  working: <path d="M-3.5 2 -1 -2 1 1 3.5 -2.5" fill="none" strokeWidth={1.5} />,
};

export interface FigureProps {
  x: number;
  y: number;
  z?: number;
  status: AgentStatus;
  avatar: AvatarDef;
  kind: 'llm' | 'script' | 'service' | 'human';
  label: string;
  sublabel?: string;
  selected?: boolean;
  dimmed?: boolean;
  showLabel?: boolean;
  onSelect?: () => void;
  scale?: number;
}

/**
 * An agent. LLM agents and humans are characters; scripts and services are
 * machines — the drawing itself says whether a model is behind the role.
 * The animation class is derived from the *recorded* status only.
 */
export const IsoFigure = memo(function IsoFigure(p: FigureProps) {
  const [sx, sy] = iso(p.x, p.y, p.z ?? 0);
  const s = p.scale ?? 1;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onSelect?.();
    }
  };
  const machine = p.kind === 'script' || p.kind === 'service';
  const body = `hsl(${p.avatar.hue} 46% 62%)`;
  const head = `hsl(${p.avatar.hue} 30% 88%)`;
  return (
    <g
      className="iso-figure"
      data-status={p.status}
      data-kind={p.kind}
      data-selected={p.selected || undefined}
      data-dimmed={p.dimmed || undefined}
      transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${s})`}
      role={p.onSelect ? 'button' : 'img'}
      tabIndex={p.onSelect ? 0 : undefined}
      aria-label={`${p.label}${p.sublabel ? `, ${p.sublabel}` : ''}, ${STATUS_TEXT[p.status]}`}
      aria-pressed={p.onSelect ? !!p.selected : undefined}
      onClick={p.onSelect}
      onKeyDown={p.onSelect ? onKey : undefined}
    >
      <ellipse className="iso-figure__shadow" cx={0} cy={0} rx={13} ry={6} />
      {p.selected && <ellipse className="iso-figure__ring" cx={0} cy={0} rx={19} ry={9} />}
      <rect className="iso-figure__hit" x={-18} y={-50} width={36} height={58} />
      <g className="iso-figure__body">
        {machine ? (
          <g>
            <path className="iso-edge" d="M-11 -4 L0 1.5 L11 -4 L11 -22 L0 -16.5 L-11 -22 Z" style={{ fill: 'var(--c-ink-soft)' }} />
            <path className="iso-edge" d="M-11 -22 L0 -27.5 L11 -22 L0 -16.5 Z" style={{ fill: shade(body, 0) }} />
            <path className="iso-figure__screen" d="M-8.5 -8 L-1.5 -4.6 L-1.5 -14 L-8.5 -17.4 Z" />
            <circle className="iso-figure__led" cx={5.5} cy={-9.5} r={1.8} />
          </g>
        ) : (
          <g>
            <path className="iso-edge" d={p.avatar.shape === 'square' ? 'M-8 -3 v-17 h16 v17 c-4 3 -12 3 -16 0 Z' : p.avatar.shape === 'tall' ? 'M-7 -3 v-21 c0 -5 14 -5 14 0 v21 c-4 3 -10 3 -14 0 Z' : 'M-8.5 -3 v-14 c0 -7 17 -7 17 0 v14 c-4 3 -13 3 -17 0 Z'} style={{ fill: body }} />
            <circle className="iso-edge iso-figure__head" cx={0} cy={p.avatar.shape === 'tall' ? -31 : -27} r={6.5} style={{ fill: head }} />
            <Accessory kind={p.avatar.accessory} y={p.avatar.shape === 'tall' ? -31 : -27} human={p.kind === 'human'} />
          </g>
        )}
      </g>
      {STATUS_GLYPH[p.status] && (
        <g className="iso-figure__badge" transform={`translate(${machine ? 0 : 12} ${machine ? -36 : -44})`}>
          <circle r={7.5} className="iso-figure__badge-bg" />
          <g className="iso-figure__glyph">{STATUS_GLYPH[p.status]}</g>
        </g>
      )}
      {p.showLabel !== false && (
        <text className="iso-label" x={0} y={16} textAnchor="middle">
          {p.label}
        </text>
      )}
    </g>
  );
});

function Accessory({ kind, y, human }: { kind: AvatarDef['accessory']; y: number; human: boolean }) {
  switch (kind) {
    case 'glasses':
      return <path d={`M-5 ${y} h3.5 M1.5 ${y} h3.5 M-1.5 ${y} h3`} className="iso-acc" />;
    case 'headset':
      return <path d={`M-7 ${y + 1} a7 7 0 0 1 14 0`} className="iso-acc" fill="none" />;
    case 'cap':
      return <path d={`M-6.5 ${y - 2} a6.5 6.5 0 0 1 13 0 h3 Z`} className="iso-acc-fill" />;
    case 'visor':
      return <rect x={-5} y={y - 2.2} width={10} height={3.4} rx={1.7} className="iso-acc-fill" />;
    case 'badge':
      return <rect x={-3} y={y + 11} width={6} height={4} rx={1} className={human ? 'iso-acc-human' : 'iso-acc-fill'} />;
    case 'scarf':
      return <path d={`M-6 ${y + 7} h12`} className="iso-acc" />;
    default:
      return null;
  }
}

const STATUS_TEXT: Record<AgentStatus, string> = {
  working: 'au travail', waiting: 'en attente', collaborating: 'en collaboration', researching: 'en recherche', validating: 'en validation',
  error: 'en erreur', paused: 'suspendu', idle: 'disponible', offline: 'hors ligne',
};

/* ---------------- labels & flows ---------------- */

export function IsoLabel({ x, y, z = 0, children, className, anchor = 'middle', dy = 0 }: { x: number; y: number; z?: number; children: ReactNode; className?: string; anchor?: 'start' | 'middle' | 'end'; dy?: number }) {
  const [sx, sy] = iso(x, y, z);
  return (
    <text x={sx} y={sy + dy} textAnchor={anchor} className={`iso-label ${className ?? ''}`}>
      {children}
    </text>
  );
}

/** Orthogonal iso path from a to b (along x, then y), lifted to z. */
export function isoRoute(a: [number, number], b: [number, number], z = 0.02, bend: 'xy' | 'yx' = 'xy'): string {
  const mid: [number, number] = bend === 'xy' ? [b[0], a[1]] : [a[0], b[1]];
  const p = [iso(a[0], a[1], z), iso(mid[0], mid[1], z), iso(b[0], b[1], z)];
  return `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)} L${p[1][0].toFixed(1)},${p[1][1].toFixed(1)} L${p[2][0].toFixed(1)},${p[2][1].toFixed(1)}`;
}

export function IsoFlowPath({ d, state, selected, onSelect, label }: { d: string; state: 'idle' | 'active' | 'error' | 'dim'; selected?: boolean; onSelect?: () => void; label?: string }) {
  return (
    <g
      className="iso-flow"
      data-state={state}
      data-selected={selected || undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={label}
      onClick={onSelect}
      onKeyDown={onSelect ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect()) : undefined}
    >
      <path d={d} className="iso-flow__hit" />
      <path d={d} className="iso-flow__base" />
      {state === 'active' || state === 'error' ? <path d={d} className="iso-flow__dash" /> : null}
    </g>
  );
}
