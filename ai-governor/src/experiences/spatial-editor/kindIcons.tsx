/**
 * Small isometric drawings of the library elements (drawn for this view).
 * Colours come from theme tokens so they read in Lumière, Onyx and Nexus.
 */
import type { ReactNode } from 'react';
import type { PrimitiveKind } from '@ds/three';

const S = { fill: 'var(--se-ico-top)', stroke: 'var(--se-ico-line)', strokeWidth: 1.1, strokeLinejoin: 'round' as const };
const L = { fill: 'var(--se-ico-left)', stroke: 'var(--se-ico-line)', strokeWidth: 1.1, strokeLinejoin: 'round' as const };
const R = { fill: 'var(--se-ico-right)', stroke: 'var(--se-ico-line)', strokeWidth: 1.1, strokeLinejoin: 'round' as const };

/** Iso box: centre-top (x, y), half width hw, height h. */
function Box({ x, y, hw, h, top, left, right }: { x: number; y: number; hw: number; h: number; top?: string; left?: string; right?: string }) {
  const hh = hw / 2;
  return (
    <g>
      <path d={`M${x} ${y} l${hw} ${hh} l${-hw} ${hh} l${-hw} ${-hh}Z`} {...S} style={top ? { fill: top } : undefined} />
      <path d={`M${x - hw} ${y + hh} l${hw} ${hh} v${h} l${-hw} ${-hh}Z`} {...L} style={left ? { fill: left } : undefined} />
      <path d={`M${x + hw} ${y + hh} l${-hw} ${hh} v${h} l${hw} ${-hh}Z`} {...R} style={right ? { fill: right } : undefined} />
    </g>
  );
}

function Pane({ x, y, w, h, glow }: { x: number; y: number; w: number; h: number; glow: string }) {
  // a glass pane seen in 3/4 (skewed)
  return <path d={`M${x} ${y} l${w} ${w / 2} v${h} l${-w} ${-w / 2}Z`} fill="var(--se-ico-glass)" stroke={glow} strokeWidth={1.4} strokeLinejoin="round" />;
}

export function KindIcon({ kind, size = 40 }: { kind: PrimitiveKind | 'lounge'; size?: number }) {
  let body: ReactNode;
  switch (kind) {
    case 'station':
      body = (
        <>
          <ellipse cx="20" cy="28" rx="15" ry="7.5" fill="var(--se-ico-plat)" stroke="var(--c-accent)" strokeWidth={1.4} />
          <Box x={20} y={12} hw={7} h={9} />
          <rect x="16.5" y="16.6" width="7" height="3" rx="1" fill="var(--c-accent)" opacity={0.85} transform="skewY(26.5) translate(0 -8.3)" />
        </>
      );
      break;
    case 'desk':
      body = (
        <>
          <Box x={20} y={11} hw={14} h={3} top="var(--se-ico-wood)" left="var(--se-ico-wood-d)" right="var(--se-ico-wood-d)" />
          <path d="M8 21 v8 M32 21 v8 M20 27 v7" stroke="var(--se-ico-line)" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M17 14 l6 3 v-5 l-6 -3Z" fill="#20242e" />
        </>
      );
      break;
    case 'kanban':
      body = (
        <>
          <Pane x={7} y={6} w={26} h={20} glow="#b58cff" />
          {[0, 1, 2].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={10 + c * 7.5} y={11 + c * 3.75 + r * 6} width={5} height={4} rx={1} fill={['var(--p6)', 'var(--p5)', 'var(--p1)'][c]} stroke="var(--se-ico-line)" strokeWidth={0.4} />))}
        </>
      );
      break;
    case 'whiteboard':
      body = (
        <>
          <Pane x={5} y={7} w={30} h={19} glow="#7cc3ff" />
          <path d="M10 15 l6 3 M10 19 l9 4.5 M22 18 l6 3" stroke="var(--c-accent)" strokeWidth={1.3} strokeLinecap="round" />
          <circle cx="27" cy="25" r="2" fill="none" stroke="var(--se-ico-line)" strokeWidth={1} />
        </>
      );
      break;
    case 'board':
      body = <Pane x={10} y={9} w={20} h={16} glow="#7cc3ff" />;
      break;
    case 'vault':
      body = (
        <>
          <Box x={20} y={6} hw={12} h={16} top="var(--se-ico-metal)" left="var(--se-ico-metal-d)" right="var(--se-ico-metal)" />
          <circle cx="26" cy="23" r="4" fill="none" stroke="var(--se-ico-line)" strokeWidth={1.3} />
          <path d="M26 19.5 v7 M22.5 23 h7" stroke="var(--se-ico-line)" strokeWidth={0.9} />
        </>
      );
      break;
    case 'gate':
      body = (
        <>
          <Box x={12} y={10} hw={4} h={17} top="var(--se-ico-metal)" left="var(--se-ico-metal-d)" right="var(--se-ico-metal)" />
          <Box x={28} y={14} hw={4} h={17} top="var(--se-ico-metal)" left="var(--se-ico-metal-d)" right="var(--se-ico-metal)" />
          <path d="M16 20 L24 24" stroke="var(--st-validating)" strokeWidth={2} strokeLinecap="round" />
        </>
      );
      break;
    case 'models':
      body = (
        <>
          <ellipse cx="20" cy="30" rx="15" ry="6" fill="var(--se-ico-plat)" stroke="var(--se-ico-line)" strokeWidth={1} />
          <Box x={11} y={12} hw={4.5} h={13} top="#3a3f4c" left="#20242e" right="#2b303b" />
          <Box x={20} y={6} hw={4.5} h={17} top="#3a3f4c" left="#20242e" right="#2b303b" />
          <Box x={29} y={13} hw={4.5} h={12} top="#3a3f4c" left="#20242e" right="#2b303b" />
          <path d="M9.5 18 v6 M18.5 12 v8 M27.5 19 v5" stroke="#9b7bff" strokeWidth={1.2} />
        </>
      );
      break;
    case 'plant':
      body = (
        <>
          <Box x={20} y={22} hw={5} h={7} top="#c98f5e" left="#a96f42" right="#b97c4e" />
          <path d="M20 24 C14 18 12 12 14 7 M20 24 C22 16 26 12 30 10 M20 24 C19 17 20 11 22 6" stroke="#3f9a5c" strokeWidth={3} strokeLinecap="round" fill="none" />
        </>
      );
      break;
    case 'armchair':
      body = <Box x={20} y={13} hw={10} h={8} top="var(--se-ico-fabric)" left="var(--se-ico-fabric-d)" right="var(--se-ico-fabric-d)" />;
      break;
    case 'sofa':
      body = (
        <>
          <Box x={20} y={13} hw={15} h={6} top="var(--se-ico-fabric)" left="var(--se-ico-fabric-d)" right="var(--se-ico-fabric-d)" />
          <path d="M5 20.5 l15 -7.5 v-5 l-15 7.5Z" fill="var(--se-ico-fabric)" stroke="var(--se-ico-line)" strokeWidth={1.1} strokeLinejoin="round" />
        </>
      );
      break;
    case 'table':
      body = (
        <>
          <ellipse cx="20" cy="16" rx="10" ry="5" fill="var(--se-ico-wood)" stroke="var(--se-ico-line)" strokeWidth={1.1} />
          <path d="M20 21 v9 M14 30 h12" stroke="var(--se-ico-line)" strokeWidth={1.6} strokeLinecap="round" />
        </>
      );
      break;
    case 'lounge':
      body = (
        <>
          <Box x={15} y={12} hw={11} h={5} top="var(--se-ico-fabric)" left="var(--se-ico-fabric-d)" right="var(--se-ico-fabric-d)" />
          <ellipse cx="29" cy="27" rx="6" ry="3" fill="var(--se-ico-wood)" stroke="var(--se-ico-line)" strokeWidth={1} />
          <path d="M29 30 v4" stroke="var(--se-ico-line)" strokeWidth={1.4} />
        </>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden focusable="false" className="se-kind-ico">
      {body}
    </svg>
  );
}
