/**
 * Characters of the « Siège » floor plans, drawn for this view:
 * a small robot for LLM agents, a person for humans, a console for
 * scripts and services. Their look and motion come from the recorded
 * status only (CSS classes gated by html[data-motion]).
 */
import { memo, type KeyboardEvent, type ReactNode } from 'react';
import { IsoBox, iso } from '@ds';
import type { AgentDef, AgentStatus } from '@sdk';
import { isActive } from './model';

const STATUS_TEXT: Record<AgentStatus, string> = {
  working: 'au travail', waiting: 'en attente', collaborating: 'en collaboration', researching: 'en recherche', validating: 'en validation',
  error: 'en erreur', paused: 'suspendu', idle: 'au repos', offline: 'hors ligne',
};

const GLYPH: Partial<Record<AgentStatus, ReactNode>> = {
  waiting: (
    <g className="tw-glyph-dots">
      <circle cx={-3.6} cy={0} r={1.3} />
      <circle cx={0} cy={0} r={1.3} />
      <circle cx={3.6} cy={0} r={1.3} />
    </g>
  ),
  error: (
    <g>
      <path d="M0 -3.8v4.2" strokeWidth={2} />
      <circle cx={0} cy={3.2} r={1.1} />
    </g>
  ),
  paused: <path d="M-1.7 -3v6M1.7 -3v6" strokeWidth={1.8} />,
  validating: <path d="M-3.3 0 -1 2.4 3.3 -2.4" fill="none" strokeWidth={1.8} />,
  researching: (
    <g fill="none" strokeWidth={1.5}>
      <circle cx={-0.8} cy={-0.8} r={2.8} />
      <path d="M1.3 1.3 3.8 3.8" />
    </g>
  ),
  collaborating: (
    <g fill="none" strokeWidth={1.4}>
      <circle cx={-1.9} cy={0} r={2.3} />
      <circle cx={1.9} cy={0} r={2.3} />
    </g>
  ),
  working: <path d="M-3.4 1.8 -1 -1.8 1 1 3.4 -2.4" fill="none" strokeWidth={1.5} />,
};

export interface CharacterProps {
  agent: AgentDef;
  /** World position of the feet. */
  x: number;
  y: number;
  status: AgentStatus;
  selected: boolean;
  dimmed: boolean;
  where: string;
  scale?: number;
  onSelect?: () => void;
}

export const Character = memo(function Character(p: CharacterProps) {
  const [sx, sy] = iso(p.x, p.y, 0);
  const s = p.scale ?? 1;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onSelect?.();
    }
  };
  const machine = p.agent.kind === 'script' || p.agent.kind === 'service';
  const hue = p.agent.avatar.hue;
  const kindText = p.agent.kind === 'llm' ? 'agent IA' : p.agent.kind === 'human' ? 'humain' : p.agent.kind === 'script' ? 'script' : 'service';
  return (
    <g
      className="tw-char"
      data-status={p.status}
      data-kind={p.agent.kind}
      data-selected={p.selected || undefined}
      data-dimmed={p.dimmed || undefined}
      data-active={isActive(p.status) || undefined}
      role={p.onSelect ? 'button' : 'img'}
      tabIndex={p.onSelect ? 0 : undefined}
      aria-label={`${p.agent.name} (${kindText}, ${p.agent.role}), ${STATUS_TEXT[p.status]}, ${p.where}`}
      aria-pressed={p.onSelect ? p.selected : undefined}
      onClick={p.onSelect}
      onKeyDown={p.onSelect ? onKey : undefined}
      transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${s})`}
    >
      <rect className="tw-char__hit" x={-20} y={machine ? -46 : -62} width={40} height={machine ? 58 : 74} />
      <ellipse className="tw-char__shadow" cx={0} cy={0} rx={14} ry={6.5} />
      {p.selected && <ellipse className="tw-char__ring" cx={0} cy={0} rx={21} ry={10} />}
      {machine ? <ConsoleBody hue={hue} /> : p.agent.kind === 'human' ? <PersonBody hue={hue} /> : <RobotBody hue={hue} />}
      {GLYPH[p.status] && (
        <g className="tw-char__badge" transform={`translate(${machine ? 13 : 14} ${machine ? -40 : -58})`}>
          <circle r={7.5} className="tw-char__badge-bg" />
          <g className="tw-char__glyph">{GLYPH[p.status]}</g>
        </g>
      )}
    </g>
  );
});

/** Robot: rounded head with a visor, antenna, chest light. */
function RobotBody({ hue }: { hue: number }) {
  const body = `hsl(${hue} 42% 60%)`;
  const head = `hsl(${hue} 26% 88%)`;
  return (
    <g className="tw-char__body">
      <rect className="tw-edge" x={-6.5} y={-8} width={4.5} height={8} rx={2} style={{ fill: `hsl(${hue} 22% 34%)` }} />
      <rect className="tw-edge" x={2} y={-8} width={4.5} height={8} rx={2} style={{ fill: `hsl(${hue} 22% 34%)` }} />
      <rect className="tw-edge" x={-13} y={-26} width={4.5} height={12} rx={2.2} style={{ fill: body }} />
      <rect className="tw-edge" x={8.5} y={-26} width={4.5} height={12} rx={2.2} style={{ fill: body }} />
      <rect className="tw-edge" x={-9} y={-29} width={18} height={22} rx={6} style={{ fill: body }} />
      <circle className="tw-char__core" cx={0} cy={-19} r={2.6} />
      <line className="tw-char__mast" x1={0} y1={-45} x2={0} y2={-51} />
      <circle className="tw-char__tip" cx={0} cy={-52.5} r={2.4} />
      <rect className="tw-edge" x={-11} y={-46} width={22} height={17} rx={7} style={{ fill: head }} />
      <rect className="tw-char__visor" x={-8} y={-42} width={16} height={8} rx={4} />
      <circle className="tw-char__eye" cx={-3.4} cy={-38} r={1.7} />
      <circle className="tw-char__eye" cx={3.4} cy={-38} r={1.7} />
    </g>
  );
}

function PersonBody({ hue }: { hue: number }) {
  return (
    <g className="tw-char__body">
      <path className="tw-edge" d="M-8.5 -2 v-20 c0 -8 17 -8 17 0 v20 c-4 3 -13 3 -17 0 Z" style={{ fill: `hsl(${hue} 46% 58%)` }} />
      <circle className="tw-edge" cx={0} cy={-36} r={7.5} style={{ fill: `hsl(${hue} 28% 90%)` }} />
      <path d="M-7.2 -38.5 a7.5 7.5 0 0 1 14.4 0 c-4 -2 -10 -2 -14.4 0 Z" className="tw-char__hair" />
      <rect x={-3.2} y={-17} width={6.4} height={4.2} rx={1.2} className="tw-char__badgeid" />
    </g>
  );
}

/** Console (script or service): a cabinet with a tilted screen and a status LED. */
function ConsoleBody({ hue }: { hue: number }) {
  return (
    <g className="tw-char__body">
      <path className="tw-edge" d="M-13 -4 L0 2.5 L13 -4 L13 -20 L0 -13.5 L-13 -20 Z" style={{ fill: 'var(--tw-device)' }} />
      <path className="tw-edge" d="M-13 -20 L0 -26.5 L13 -20 L0 -13.5 Z" style={{ fill: `hsl(${hue} 30% 70%)` }} />
      <path className="tw-edge" d="M-10 -22 L-10 -36 L4 -42.5 L4 -28.5 Z" style={{ fill: 'var(--tw-device)' }} />
      <path className="tw-char__screen" d="M-8.4 -23.6 L-8.4 -34.6 L2.4 -39.6 L2.4 -28.6 Z" />
      <path className="tw-char__scanline" d="M-6.8 -28.6 L0.8 -32.2 M-6.8 -31.4 L-1.2 -34" />
      <circle className="tw-char__led" cx={7.5} cy={-9.5} r={1.9} />
    </g>
  );
}

/** Workstation desk with a monitor (screen lit only when its engine is active here). */
export function Workstation({ x, y, lit, tone }: { x: number; y: number; lit: 'on' | 'wait' | 'error' | 'off'; tone: string }) {
  return (
    <g className="tw-desk" data-lit={lit}>
      <IsoBox x={x} y={y} w={1.0} d={0.6} h={0.4} fill="var(--tw-wood)" />
      <IsoBox x={x + 0.28} y={y + 0.08} z={0.4} w={0.46} d={0.07} h={0.34} fill="var(--tw-device)" shadeL={0} shadeR={10} />
      <polygon
        className="tw-desk__screen"
        points={[iso(x + 0.3, y + 0.16, 0.43), iso(x + 0.72, y + 0.16, 0.43), iso(x + 0.72, y + 0.16, 0.71), iso(x + 0.3, y + 0.16, 0.71)].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ')}
      />
      <IsoBox x={x + 0.05} y={y + 0.4} z={0.4} w={0.22} d={0.14} h={0.02} fill={tone} stroke={false} />
    </g>
  );
}
