/**
 * Kind glyphs, drawn flat then mapped onto the block's top face with the
 * isometric affine transform (rotate 45°, squash 1:2), so they read as
 * symbols printed on the block — like the labels on a technical model.
 */
import { iso } from '@ds';
import type { NodeKind } from '@sdk';

const G: Partial<Record<NodeKind, React.ReactNode>> = {
  agent: (
    <>
      <path d="M0 -9 L7.8 -4.5 L7.8 4.5 L0 9 L-7.8 4.5 L-7.8 -4.5 Z" />
      <circle cx={0} cy={0} r={2.6} />
      <path d="M0 -9 V-2.6 M0 2.6 V9" />
    </>
  ),
  service: (
    <>
      <circle cx={0} cy={0} r={5} />
      <circle cx={0} cy={0} r={1.8} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} d="M0 -5 V-8.5" transform={`rotate(${a})`} />
      ))}
    </>
  ),
  process: (
    <>
      <circle cx={0} cy={0} r={5} />
      <path d="M-2 -2.5 L3 0 L-2 2.5 Z" />
    </>
  ),
  queue: (
    <>
      <path d="M-8 -5 H8 M-8 0 H8 M-8 5 H8" />
      <path d="M5 -8 L8 -5 L5 -2" />
    </>
  ),
  model: (
    <>
      <path d="M0 -9 C1 -2 2 -1 9 0 C2 1 1 2 0 9 C-1 2 -2 1 -9 0 C-2 -1 -1 -2 0 -9 Z" />
    </>
  ),
  provider: (
    <>
      <path d="M-7 4 H6 A4 4 0 0 0 6 -4 A6 6 0 0 0 -5 -3 A3.5 3.5 0 0 0 -7 4 Z" />
    </>
  ),
  mcp: (
    <>
      <path d="M-5 -2 H5 V2 A5 5 0 0 1 -5 2 Z" />
      <path d="M-2.5 -2 V-7 M2.5 -2 V-7 M0 7 V9.5" />
    </>
  ),
  connector: (
    <>
      <circle cx={0} cy={0} r={7} />
      <path d="M-7 0 H7 M0 -7 C-3.5 -3 -3.5 3 0 7 C3.5 3 3.5 -3 0 -7" />
    </>
  ),
  tool: (
    <>
      <path d="M-6 6 L2 -2 M2 -2 A4 4 0 1 0 6 -6 L3.5 -3.5" />
    </>
  ),
  skill: (
    <>
      <path d="M-7 -6 H-1 A2 2 0 0 1 1 -6 H7 V6 H1 A2 2 0 0 0 -1 6 H-7 Z" />
      <path d="M0 -5 V5" />
    </>
  ),
  database: (
    <>
      <path d="M-6 0 H6 M-4 -3.5 H4 M-4 3.5 H4" />
    </>
  ),
  department: (
    <>
      <rect x={-6} y={-6} width={12} height={12} rx={2} />
    </>
  ),
};

export function TopGlyph({ kind, cx, cy, z, size }: { kind: NodeKind; cx: number; cy: number; z: number; size: number }) {
  const g = G[kind];
  if (!g) return null;
  const [sx, sy] = iso(cx, cy, z);
  const k = Math.min(1.5, size * 0.92);
  return (
    <g className="sm-glyph" transform={`translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(1 0.5) rotate(45) scale(${k.toFixed(2)})`} aria-hidden>
      {g}
    </g>
  );
}

/** Same glyph, upright — for the floating legend and the panel. */
export function FlatGlyph({ kind, size = 16 }: { kind: NodeKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-11 -11 22 22" className="sm-flatglyph" aria-hidden>
      {G[kind]}
    </svg>
  );
}

export const KIND_FILL: Partial<Record<NodeKind, string>> = {
  agent: 'var(--p3)',
  service: 'var(--p2)',
  process: 'var(--p2)',
  queue: 'var(--p5)',
  model: 'var(--p1)',
  provider: 'var(--p4)',
  mcp: 'var(--p8)',
  connector: 'var(--p8)',
  tool: 'var(--p8)',
  skill: 'var(--p7)',
  database: 'var(--p6)',
  user: 'var(--c-raised)',
  department: 'var(--p2)',
};

export const KIND_LABEL: Partial<Record<NodeKind, string>> = {
  agent: 'Agent IA',
  service: 'Service ou script',
  process: 'Processus',
  queue: 'File',
  model: 'Modèle',
  provider: 'Fournisseur',
  mcp: 'Serveur MCP',
  connector: 'Connecteur',
  tool: 'Outil',
  skill: 'Skill',
  database: 'Base de données',
  user: 'Personne',
  department: 'Département',
};
