/**
 * Activity timeline & Replay. Seeking moves a playhead; the shell then serves
 * every experience the projection of the event log at that instant. Nothing
 * is re-executed: Replay is read-only by construction (the command gateway
 * refuses every action while mode === 'replay').
 */
import { useMemo, useRef, useState } from 'react';
import { PERIOD_LABEL, PERIOD_MS, eventDensity, type PeriodPreset } from '@core/selectors';
import { IconLive, IconPause, IconPlay, Segmented } from '@ds';
import { fmtTime, useGovernor } from '@sdk';
import { goLive } from './App';
import { ui, useUi } from './uiStore';

const SPEEDS: Array<{ v: number; label: string }> = [
  { v: 1, label: '×1 (temps réel)' },
  { v: 10, label: '×10' },
  { v: 60, label: '1 min/s' },
  { v: 600, label: '10 min/s' },
  { v: 3600, label: '1 h/s' },
  { v: 21600, label: '6 h/s' },
];

const PRESETS: PeriodPreset[] = ['live', '1h', '24h', '7d', '30d', 'custom'];

const toLocalInput = (ts: number) => {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
};

export function Timeline() {
  const g = useGovernor();
  const time = useUi((s) => s.time);
  const period = useUi((s) => s.period);
  const device = useUi((s) => s.device);
  const track = useRef<HTMLDivElement>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const domain = time.mode === 'replay' && time.domain ? time.domain : g.range;
  const buckets = device === 'mobile' ? 60 : 160;
  const density = useMemo(
    () => eventDensity(g.windowEvents(domain.from, domain.to), domain.from, domain.to, buckets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, domain.from, domain.to, buckets, g.filters],
  );
  const max = Math.max(1, ...density);
  const head = time.mode === 'replay' ? (time.t - domain.from) / Math.max(1, domain.to - domain.from) : 1;

  const seekFromX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const t = domain.from + f * (domain.to - domain.from);
    ui.set((s) => ({ time: { ...s.time, mode: 'replay', t, domain: s.time.domain ?? { ...domain } } }));
  };

  const setPreset = (preset: PeriodPreset) => {
    if (preset === 'custom') {
      const to = Date.now();
      ui.set({ period: { preset, from: to - PERIOD_MS['24h'], to } });
    } else ui.set({ period: { preset } });
    if (preset === 'live') goLive();
    else if (time.mode === 'replay') ui.set((s) => ({ time: { ...s.time, domain: null } }));
  };

  const togglePlay = () => {
    if (time.mode === 'live') {
      ui.set((s) => ({ time: { ...s.time, mode: 'replay', t: domain.from, playing: true, domain: { ...domain } } }));
    } else {
      const atEnd = time.t >= (time.domain?.to ?? domain.to);
      ui.set((s) => ({ time: { ...s.time, playing: !s.time.playing, t: atEnd ? domain.from : s.time.t } }));
    }
  };

  return (
    <section className="timeline" aria-label="Chronologie de l’activité">
      <div className="timeline__controls">
        <Segmented
          label="Période"
          value={period.preset}
          onChange={setPreset}
          options={PRESETS.map((p) => ({
            value: p,
            label: p === 'live' ? (
              <>
                <IconLive size={14} />
                {PERIOD_LABEL[p]}
              </>
            ) : (
              PERIOD_LABEL[p]
            ),
            className: p === 'custom' || p === '1h' ? 'hide-mobile' : undefined,
          }))}
        />
        {period.preset === 'custom' && (
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }} className="hide-mobile">
            <label className="sr-only" htmlFor="tl-from">Début</label>
            <input id="tl-from" className="input" style={{ height: 36 }} type="datetime-local" value={toLocalInput(period.from ?? Date.now())} onChange={(e) => ui.set({ period: { ...period, from: new Date(e.target.value).getTime() } })} />
            <span aria-hidden>→</span>
            <label className="sr-only" htmlFor="tl-to">Fin</label>
            <input id="tl-to" className="input" style={{ height: 36 }} type="datetime-local" value={toLocalInput(period.to ?? Date.now())} onChange={(e) => ui.set({ period: { ...period, to: new Date(e.target.value).getTime() } })} />
          </span>
        )}
      </div>

      <div className="timeline__summary" aria-live="off">
        {time.mode === 'live' ? (
          <>{g.windowEvents(domain.from, domain.to).length.toLocaleString('fr-FR')} événements sur la période</>
        ) : (
          <>
            Replay au <b className="num" style={{ color: 'var(--c-ink)' }}>{fmtTime(time.t, true)}</b> · aucune action rejouée
          </>
        )}
      </div>

      <div className="timeline__controls" style={{ justifySelf: 'end' }}>
        <button type="button" className="btn btn--icon btn--primary" onClick={togglePlay} aria-label={time.playing ? 'Mettre en pause le replay' : 'Lancer le replay'} title={time.playing ? 'Pause' : 'Rejouer la période'}>
          {time.playing ? <IconPause size={16} /> : <IconPlay size={16} />}
        </button>
        <label className="sr-only" htmlFor="tl-speed">Vitesse du replay</label>
        <select id="tl-speed" className="select hide-mobile" style={{ height: 40, borderRadius: 999 }} value={time.speed} onChange={(e) => ui.set((s) => ({ time: { ...s.time, speed: Number(e.target.value) } }))}>
          {SPEEDS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="button" className="btn" onClick={goLive} disabled={time.mode === 'live'} aria-label="Revenir au direct (L)">
          <IconLive size={16} />
          <span className="hide-mobile">Direct</span>
        </button>
      </div>

      <div
        ref={track}
        className="timeline__track"
        role="slider"
        tabIndex={0}
        aria-label="Position dans la chronologie"
        aria-valuemin={domain.from}
        aria-valuemax={domain.to}
        aria-valuenow={time.mode === 'replay' ? Math.round(time.t) : domain.to}
        aria-valuetext={time.mode === 'replay' ? `Replay ${fmtTime(time.t, true)}` : 'En direct'}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          seekFromX(e.clientX);
        }}
        onPointerMove={(e) => {
          const r = track.current!.getBoundingClientRect();
          setHoverT(domain.from + ((e.clientX - r.left) / r.width) * (domain.to - domain.from));
          if (e.buttons === 1) seekFromX(e.clientX);
        }}
        onPointerLeave={() => setHoverT(null)}
        onKeyDown={(e) => {
          const span = domain.to - domain.from;
          const step = e.shiftKey ? span / 10 : span / 100;
          const cur = time.mode === 'replay' ? time.t : domain.to;
          let t: number | null = null;
          if (e.key === 'ArrowLeft') t = cur - step;
          else if (e.key === 'ArrowRight') t = cur + step;
          else if (e.key === 'Home') t = domain.from;
          else if (e.key === 'End') {
            goLive();
            return;
          } else if (e.key === ' ') {
            e.preventDefault();
            togglePlay();
            return;
          }
          if (t != null) {
            e.preventDefault();
            const tt = Math.max(domain.from, Math.min(domain.to, t));
            ui.set((s) => ({ time: { ...s.time, mode: 'replay', t: tt, domain: s.time.domain ?? { ...domain } } }));
          }
        }}
      >
        <svg viewBox={`0 0 ${buckets} 34`} preserveAspectRatio="none" aria-hidden>
          <rect x={0} y={0} width={buckets} height={34} fill="var(--c-sunken)" />
          {density.map((v, i) => {
            const h = v ? Math.max(2, (v / max) * 28) : 0.8;
            return <rect key={i} x={i + 0.18} y={31 - h} width={0.64} height={h} rx={0.32} fill={i / buckets <= head ? (time.mode === 'replay' ? 'var(--c-accent)' : 'var(--c-ink-soft)') : 'var(--c-line)'} opacity={v ? 1 : 0.6} />;
          })}
        </svg>
        <div className="timeline__head" style={{ left: `calc(${Math.min(1, Math.max(0, head)) * 100}% - 1px)` }} />
        {hoverT != null && (
          <div className="chart-tip t-micro" style={{ bottom: 38, left: `clamp(0px, calc(${((hoverT - domain.from) / (domain.to - domain.from)) * 100}% - 60px), calc(100% - 150px))`, minWidth: 0 }}>
            {fmtTime(hoverT, true)}
          </div>
        )}
      </div>
    </section>
  );
}
