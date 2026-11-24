/**
 * Tower overview: one floor per pole, one facade section per department,
 * windows lit only from the recorded engine statuses, elevator traffic only
 * for recorded inter-floor exchanges.
 */
import { memo, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { Antenna, IsoBox, IsoFloor, Plant, iso, toneVar } from '@ds';
import type { Bay, Floor, Light, ShaftRun } from './model';
import { LIGHT_LABEL, levelLabel, levelLong } from './model';
import { baySpans, levelZ, type TowerGeom } from './geometry';

type Pt = [number, number];
const P = (pts: Pt[]) => pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(' ');

export function Prism({ x, y, z = 0, w, d, h, top, left, right, className }: { x: number; y: number; z?: number; w: number; d: number; h: number; top: string; left: string; right: string; className?: string }) {
  const t = z + h;
  return (
    <g className={className}>
      <polygon className="tw-edge" points={P([iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x, y + d, t)])} style={{ fill: left }} />
      <polygon className="tw-edge" points={P([iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, t), iso(x + w, y, t)])} style={{ fill: right }} />
      <polygon className="tw-edge" points={P([iso(x, y, t), iso(x + w, y, t), iso(x + w, y + d, t), iso(x, y + d, t)])} style={{ fill: top }} />
    </g>
  );
}

/* ---------------- windows ---------------- */

const FacadeWindow = memo(function FacadeWindow({ x0, x1, Y, z0, z1, light, title, glow }: { x0: number; x1: number; Y: number; z0: number; z1: number; light: Light; title: string; glow: boolean }) {
  const pts: Pt[] = [iso(x0, Y, z0), iso(x1, Y, z0), iso(x1, Y, z1), iso(x0, Y, z1)];
  const lit = light === 'work' || light === 'wait' || light === 'error';
  const h = z1 - z0;
  const [mx, my] = iso((x0 + x1) / 2, Y, z0);
  return (
    <g className="tw-win" data-light={light}>
      <title>{title}</title>
      {glow && lit && <polygon className="tw-win__spill" points={P([iso(x0 - 0.08, Y, z0 - 0.32), iso(x1 + 0.08, Y, z0 - 0.32), iso(x1, Y, z0), iso(x0, Y, z0)])} />}
      <polygon className="tw-win__glass" points={P(pts)} />
      {light === 'wait' && <polygon className="tw-win__blind" points={P([iso(x0, Y, z1 - h * 0.46), iso(x1, Y, z1 - h * 0.46), iso(x1, Y, z1), iso(x0, Y, z1)])} />}
      {light === 'error' && <path className="tw-win__alert" d={`M${P([pts[0]])} L${P([pts[2]])} M${P([pts[1]])} L${P([pts[3]])}`} />}
      {light === 'work' && (
        <g className="tw-win__occupant" transform={`translate(${mx.toFixed(1)} ${my.toFixed(1)})`}>
          <rect x={-5} y={-9} width={10} height={9} rx={3} />
          <circle cx={0} cy={-13} r={3.6} />
          <line x1={0} y1={-16.5} x2={0} y2={-20} />
        </g>
      )}
      {!lit && light !== 'pause' && <line className="tw-win__glint" x1={pts[3][0] + 3} y1={pts[3][1] + 5} x2={pts[3][0] + 9} y2={pts[3][1] + 11} />}
    </g>
  );
});

/* ---------------- floor label ---------------- */

export interface FloorTally {
  work: number;
  wait: number;
  error: number;
  pending: number;
}

function statusSegments(t: FloorTally): Array<{ cls: string; text: string }> {
  const segs: Array<{ cls: string; text: string }> = [];
  if (t.work) segs.push({ cls: 'work', text: `${t.work} actif${t.work > 1 ? 's' : ''}` });
  if (t.wait) segs.push({ cls: 'wait', text: `${t.wait} en attente` });
  if (t.error) segs.push({ cls: 'error', text: `${t.error} en erreur` });
  if (!segs.length) segs.push({ cls: 'off', text: 'au repos' });
  return segs;
}

function FloorPill({ floor, tally, right, cy }: { floor: Floor; tally: FloorTally; right: number; cy: number }) {
  const segs = statusSegments(tally);
  const nameW = floor.id.length * 7.5;
  const segW = segs.map((s) => 14 + s.text.length * 6.1);
  const statusW = segW.reduce((a, b) => a + b, 0) + (segs.length - 1) * 8;
  const w = Math.max(nameW, statusW) + 64 + (tally.pending ? 34 : 0);
  const x = right - w;
  let cursor = x + 52;
  return (
    <g className="tw-pill" transform={`translate(0 ${(cy - 19).toFixed(1)})`}>
      <rect className="tw-pill__bg" x={x} y={0} width={w} height={38} rx={19} />
      <rect className="tw-pill__lvl" x={x + 6} y={7} width={38} height={24} rx={12} />
      <text className="tw-pill__lvltext" x={x + 25} y={23.2} textAnchor="middle">
        {levelLabel(floor)}
      </text>
      <text className="tw-pill__name" x={x + 52} y={16.5}>
        {floor.id}
      </text>
      {segs.map((s, i) => {
        const at = cursor;
        cursor += segW[i] + 8;
        return (
          <g key={s.cls} className="tw-pill__seg" data-k={s.cls}>
            <circle cx={at + 4} cy={27.5} r={3.6} />
            <text x={at + 12} y={31.2}>
              {s.text}
            </text>
          </g>
        );
      })}
      {tally.pending > 0 && (
        <g className="tw-pill__dec">
          <rect x={right - 38} y={9} width={30} height={20} rx={10} />
          <text x={right - 23} y={23} textAnchor="middle">
            ◆{tally.pending}
          </text>
        </g>
      )}
    </g>
  );
}

/* ---------------- building ---------------- */

export interface BuildingProps {
  geom: TowerGeom;
  floors: Floor[];
  bays: Map<string, Bay[]>;
  tallies: Map<string, FloorTally>;
  runs: ShaftRun[];
  showShaft: boolean;
  night: boolean;
  glow: boolean;
  near: boolean;
  /** none: static arrows · once: one ride per change · loop: continuous rides. */
  ride: 'none' | 'once' | 'loop';
  highlighted?: string;
  dimmedDepts: (id: string) => boolean;
  onOpen: (floorId: string) => void;
  ariaFor: (f: Floor) => string;
}

const CITY: Array<[number, number, number, number, number]> = [
  [-8, -4, 3, 2.6, 4.6], [-5.5, -8.5, 2.6, 3, 7.4], [-1.5, -11, 4, 3, 9.5], [4, -10.5, 3, 2.4, 6.2], [9.5, -8, 3.2, 3, 8.4], [12.5, -3.5, 2.4, 2.4, 4.2],
];

export const Building = memo(function Building(p: BuildingProps) {
  const { geom: g } = p;
  const { N, D, H } = g;
  const touched = new Set<number>();
  for (const r of p.runs) {
    touched.add(r.from);
    touched.add(r.to);
  }
  const modelsLevel = p.floors.length;
  const onKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      p.onOpen(id);
    }
  };

  const facadeFloor = (floor: Floor, x0: number, width: number, Y: number, z0: number, sideX: number | null) => {
    const bays = p.bays.get(floor.id) ?? [];
    const spans = baySpans(bays.length, x0, width);
    const sections: Array<{ dept: Bay['dept']; a: number; b: number }> = [];
    bays.forEach((bay, i) => {
      const last = sections[sections.length - 1];
      if (last && last.dept.id === bay.dept.id) last.b = spans[i][1];
      else sections.push({ dept: bay.dept, a: spans[i][0], b: spans[i][1] });
    });
    const out: ReactNode[] = [];
    for (const s of sections) {
      out.push(
        <polygon
          key={`t-${s.dept.id}`}
          className="tw-tint"
          data-dimmed={p.dimmedDepts(s.dept.id) || undefined}
          points={P([iso(s.a, Y, z0 + 0.05), iso(s.b, Y, z0 + 0.05), iso(s.b, Y, z0 + H - 0.05), iso(s.a, Y, z0 + H - 0.05)])}
          style={{ ['--tone' as string]: toneVar(s.dept.tone) } as CSSProperties}
        />,
      );
    }
    bays.forEach((bay, i) => {
      const [a, b] = spans[i];
      const engine = bay.engineId ?? '—';
      out.push(
        <g key={`w-${i}`} data-dimmed={p.dimmedDepts(bay.dept.id) || undefined} className="tw-winwrap">
          <FacadeWindow
            x0={a + 0.17}
            x1={b - 0.17}
            Y={Y + 0.001}
            z0={z0 + H * 0.24}
            z1={z0 + H * 0.84}
            light={bay.light}
            glow={p.glow}
            title={`${bay.dept.name} — ${engine} : fenêtre ${LIGHT_LABEL[bay.light]}`}
          />
        </g>,
      );
    });
    for (const s of sections.slice(1)) {
      const [ax, ay] = iso(s.a, Y, z0);
      const [bx, by] = iso(s.a, Y, z0 + H);
      out.push(<line key={`p-${s.dept.id}`} className="tw-pilaster" x1={ax} y1={ay} x2={bx} y2={by} />);
    }
    if (p.near)
      for (const s of sections) {
        const [tx, ty] = iso((s.a + s.b) / 2, Y, z0 + 0.06);
        out.push(
          <text key={`n-${s.dept.id}`} className="tw-deptname" x={tx} y={ty - 1} textAnchor="middle" transform={`rotate(26.565 ${tx.toFixed(1)} ${ty.toFixed(1)})`}>
            {s.dept.name}
          </text>,
        );
      }
    if (sideX != null) {
      const [nx, ny] = iso(sideX, 0.9, z0 + H * 0.5);
      out.push(
        <text key="no" className="tw-sideno" x={nx} y={ny + 4} textAnchor="middle">
          {levelLabel(floor)}
        </text>,
      );
    }
    return out;
  };

  const shaftX = iso(g.shaft.x + 0.5, g.shaft.y + 0.5, 0)[0];
  const yAt = (z: number) => iso(g.shaft.x + 0.5, g.shaft.y + 0.5, z)[1];
  const runs = p.runs.slice(0, 6);

  return (
    <g className="tw-building">
      {/* distant city: silhouettes only, never lit */}
      <g className="tw-city" aria-hidden>
        {CITY.map(([x, y, w, d, h], i) => (
          <Prism key={i} x={x + (N - 8) * 0.5} y={y} w={w} d={d} h={h} top="var(--tw-city-top)" left="var(--tw-city)" right="var(--tw-city-side)" />
        ))}
      </g>
      <g aria-hidden>
        <IsoFloor x={-2.4} y={-1.6} w={N + 5.2} d={D + 3.8} fill="var(--tw-ground)" thickness={0.22} grid={false} />
        <polygon className="tw-walk" points={P([iso(-2.4, D + 1.1, 0.002), iso(N + 2.8, D + 1.1, 0.002), iso(N + 2.8, D + 1.5, 0.002), iso(-2.4, D + 1.5, 0.002)])} />
        <Plant x={-1.1} y={D - 0.4} />
        <Plant x={-1.1} y={0.6} />
        <Plant x={N + 2.0} y={D + 0.4} />
      </g>

      {/* core */}
      <Prism x={0} y={0} w={N} d={D} h={g.zRoof} top="var(--tw-roof)" left="var(--tw-facade)" right="var(--tw-facade-side)" className="tw-core" />
      {g.regular.map((f) => (
        <g key={f.id} className="tw-level">
          {facadeFloor(f, 0, N, D, f.index * H, N)}
        </g>
      ))}
      {g.regular.map((f) => {
        const z = (f.index + 1) * H;
        return <polyline key={`c-${f.id}`} className="tw-cornice" points={P([iso(0, D, z), iso(N, D, z), iso(N, 0, z)])} />;
      })}

      {/* roof terrace, parapet, penthouse */}
      <g aria-hidden>
        <IsoBox x={0} y={D - 0.12} z={g.zRoof} w={N} d={0.12} h={0.2} fill="var(--tw-facade)" />
        <IsoBox x={N - 0.12} y={0} z={g.zRoof} w={0.12} d={D - 0.12} h={0.2} fill="var(--tw-facade)" />
        {g.pent && (
          <g transform={`translate(0 ${(-g.zRoof * 32).toFixed(1)})`}>
            <Plant x={g.pent.x + g.pent.w + 0.7} y={D - 0.7} />
            <Plant x={N - 0.6} y={D - 0.7} />
          </g>
        )}
      </g>
      {g.pent && g.roof && (
        <g className="tw-level">
          <Prism x={g.pent.x} y={g.pent.y} z={g.pent.z} w={g.pent.w} d={g.pent.d} h={g.pent.h} top="var(--tw-roof)" left="var(--tw-facade)" right="var(--tw-facade-side)" className="tw-core" />
          {facadeFloor(g.roof, g.pent.x, g.pent.w, g.pent.y + g.pent.d, g.pent.z, null)}
          <IsoBox x={g.pent.x - 0.1} y={g.pent.y - 0.1} z={g.pent.z + g.pent.h} w={g.pent.w + 0.2} d={g.pent.d + 0.2} h={0.1} fill="var(--tw-facade)" />
        </g>
      )}

      {/* elevator shaft */}
      {p.showShaft && (
        <g className="tw-shaft" data-busy={runs.length > 0 || undefined}>
          <Prism x={g.shaft.x} y={g.shaft.y} w={g.shaft.w} d={g.shaft.d} h={g.shaft.h} top="var(--tw-glass-top)" left="var(--tw-glass)" right="var(--tw-glass-side)" className="tw-shaft__glass" />
          <line className="tw-rail" x1={shaftX} y1={yAt(0)} x2={shaftX} y2={yAt(g.zTop)} />
          {[...g.regular, ...(g.roof ? [g.roof] : [])].map((f) => {
            const z = levelZ(g, f.index);
            const [lx, ly] = iso(g.shaft.x + 0.15, g.shaft.y + g.shaft.d, z);
            return <circle key={f.id} className="tw-landing" data-on={touched.has(f.index) || undefined} cx={lx} cy={ly} r={2.6} />;
          })}
          <g transform={`translate(0 ${(-g.zTop * 32).toFixed(1)})`}>
            <Antenna x={g.shaft.x + 0.5} y={g.shaft.y + 0.5} active={touched.has(modelsLevel)} />
          </g>
          {runs.map((r, i) => {
            const dx = (i - (runs.length - 1) / 2) * 5;
            const y0 = yAt(levelZ(g, r.from));
            const y1 = yAt(levelZ(g, r.to));
            const up = y1 < y0;
            const dots = Math.min(3, r.count);
            return (
              <g key={r.key} className="tw-run" data-failed={r.failed > 0 || undefined}>
                <line className="tw-run__line" x1={shaftX + dx} y1={y0} x2={shaftX + dx} y2={y1} />
                {p.ride === 'none' ? (
                  <path className="tw-run__head" d={`M${shaftX + dx - 3.5},${y1 + (up ? 5 : -5)} L${shaftX + dx},${y1} L${shaftX + dx + 3.5},${y1 + (up ? 5 : -5)} Z`} />
                ) : (
                  Array.from({ length: dots }, (_, j) => (
                    <circle
                      key={`${r.lastTs}-${j}`}
                      className="tw-dot"
                      data-ride={p.ride}
                      cx={shaftX + dx}
                      cy={0}
                      r={3.3}
                      style={{ ['--y0' as string]: `${y0.toFixed(1)}px`, ['--y1' as string]: `${y1.toFixed(1)}px`, animationDelay: `${(j * 0.7 + i * 0.23).toFixed(2)}s`, transform: `translateY(${y1.toFixed(1)}px)` } as CSSProperties}
                    />
                  ))
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* interactive floors (on top: hit areas + labels) */}
      {p.floors.map((f) => {
        const isRoof = f.role === 'roof' && g.pent;
        const z0 = isRoof ? g.pent!.z : f.index * H;
        const z1 = z0 + H;
        const band = isRoof
          ? P([iso(g.pent!.x, g.pent!.y + g.pent!.d, z0), iso(g.pent!.x + g.pent!.w, g.pent!.y + g.pent!.d, z0), iso(g.pent!.x + g.pent!.w, g.pent!.y, z0), iso(g.pent!.x + g.pent!.w, g.pent!.y, z1 + 0.1), iso(g.pent!.x, g.pent!.y, z1 + 0.1), iso(g.pent!.x, g.pent!.y + g.pent!.d, z1)])
          : P([iso(0, D, z0), iso(N, D, z0), iso(N, 0, z0), iso(N, 0, z1), iso(N, D, z1), iso(0, D, z1)]);
        const anchor = isRoof ? iso(g.pent!.x, g.pent!.y + g.pent!.d, z0 + H / 2) : iso(0, D, z0 + H / 2);
        const tally = p.tallies.get(f.id) ?? { work: 0, wait: 0, error: 0, pending: 0 };
        return (
          <g
            key={f.id}
            className="tw-floor"
            role="button"
            tabIndex={0}
            aria-label={p.ariaFor(f)}
            data-highlighted={p.highlighted === f.id || undefined}
            onClick={() => p.onOpen(f.id)}
            onKeyDown={onKey(f.id)}
          >
            <title>{`${levelLong(f)} — ${f.id} : ouvrir l’étage`}</title>
            <polygon className="tw-floor__hit" points={band} />
            <polygon className="tw-floor__outline" points={band} />
            <line className="tw-leader" x1={g.labelRight} y1={anchor[1]} x2={anchor[0] - 3} y2={anchor[1]} />
            <circle className="tw-leader__dot" cx={anchor[0] - 3} cy={anchor[1]} r={2.4} />
            <FloorPill floor={f} tally={tally} right={g.labelRight} cy={anchor[1]} />
          </g>
        );
      })}
    </g>
  );
});
