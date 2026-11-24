/**
 * Hero: a stack of headline cards (front card = the figure in focus, the
 * others peek out behind it) plus a row of quick actions.
 */
import { useState, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatedNumber, IconDecision, IconFilter, IconUpload, NatureBadge } from '@ds';
import { fmtPct, type DataNature, type HostApi } from '@sdk';
import { GArrowDown, GArrowUp, GReplay } from './glyphs';

export interface HeroMetric {
  id: string;
  label: string;
  value: number | null;
  format: (n: number) => string;
  unavailable?: string;
  sub?: ReactNode;
  delta: number | null;
  /** true when a lower value is the favourable direction (costs). */
  lowerIsBetter?: boolean;
  nature: DataNature;
  tone: 'ink' | 'gold' | 'violet';
}

export function DeltaPill({ delta, lowerIsBetter, subject, onDark }: { delta: number | null; lowerIsBetter?: boolean; subject: string; onDark?: boolean }) {
  if (delta == null)
    return (
      <span className="pill cc-delta" data-on-dark={onDark || undefined} title="Pas de période précédente comparable">
        —
      </span>
    );
  const up = delta > 0;
  const good = lowerIsBetter ? !up : up;
  const flat = Math.abs(delta) < 0.005;
  const label = `${subject} ${flat ? 'stable' : up ? `en hausse de ${fmtPct(Math.abs(delta))}` : `en baisse de ${fmtPct(Math.abs(delta))}`} par rapport à la période précédente${flat ? '' : good ? ' (favorable)' : ' (défavorable)'}`;
  return (
    <span className={`pill cc-delta ${flat ? '' : good ? 'pill--up' : 'pill--down'}`} data-on-dark={onDark || undefined} aria-label={label} title={label}>
      {!flat && (up ? <GArrowUp size={13} /> : <GArrowDown size={13} />)}
      {flat ? '≈ 0 %' : `${up ? '+' : '−'}${fmtPct(Math.abs(delta), Math.abs(delta) < 0.1 ? 1 : 0)}`}
    </span>
  );
}

export function HeroStack({ metrics }: { metrics: HeroMetric[] }) {
  const [front, setFront] = useState(0);
  const order = metrics.map((_, i) => (i - front + metrics.length) % metrics.length);
  const bring = (i: number) => setFront(i);
  const onKey = (i: number) => (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      bring(i);
    }
  };
  return (
    <section className="cc-hero" aria-label="Indicateurs principaux" aria-roledescription="pile de cartes">
      <div className="cc-stack" style={{ ['--depth' as string]: metrics.length }}>
        {metrics.map((m, i) => {
          const pos = order[i];
          const isFront = pos === 0;
          return (
            <article
              key={m.id}
              className="cc-card"
              data-tone={m.tone}
              data-pos={pos}
              role={isFront ? undefined : 'button'}
              tabIndex={isFront ? undefined : 0}
              aria-label={isFront ? undefined : `Mettre au premier plan : ${m.label}`}
              onClick={isFront ? undefined : () => bring(i)}
              onKeyDown={isFront ? undefined : onKey(i)}
            >
              <div className="cc-card__peek">
                <span>{m.label}</span>
                <b className="num">{m.value == null ? '—' : m.format(m.value)}</b>
              </div>
              <div className="cc-card__body">
                <div className="cc-card__top">
                  <span className="cc-card__label">{m.label}</span>
                  <DeltaPill delta={m.delta} lowerIsBetter={m.lowerIsBetter} subject={m.label} onDark />
                </div>
                <div className="cc-card__value" data-unavailable={m.value == null || undefined}>
                  {m.value == null ? m.unavailable ?? 'Indisponible' : isFront ? <AnimatedNumber value={m.value} format={m.format} /> : m.format(m.value)}
                </div>
                <div className="cc-card__foot">
                  <span className="cc-card__sub">{m.sub}</span>
                  <NatureBadge nature={m.nature} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <div className="cc-dots" role="group" aria-label="Carte au premier plan">
        {metrics.map((m, i) => (
          <button key={m.id} type="button" aria-pressed={i === front} aria-label={m.label} onClick={() => bring(i)} />
        ))}
      </div>
    </section>
  );
}

export function QuickActions({ host, pending }: { host: HostApi; pending: number }) {
  const items: Array<{ id: string; label: string; icon: ReactNode; run: () => void; badge?: number; hint: string }> = [
    { id: 'decide', label: 'Arbitrer', icon: <IconDecision size={20} />, run: () => host.openDecisions(), badge: pending, hint: `Ouvrir les propositions GO / NO GO / TEST (${pending} en attente)` },
    { id: 'replay', label: 'Rejouer', icon: <GReplay size={20} />, run: () => host.startReplay(), hint: 'Rejouer la période affichée (lecture seule)' },
    { id: 'filter', label: 'Filtrer', icon: <IconFilter size={20} />, run: () => host.openFilters(), hint: 'Filtrer par fournisseur, modèle, projet, département, agent' },
    { id: 'import', label: 'Importer', icon: <IconUpload size={20} />, run: () => host.navigate('sources'), hint: 'Importer des données réelles (sessions Claude Code)' },
  ];
  return (
    <nav className="cc-actions" aria-label="Actions rapides">
      {items.map((a) => (
        <button key={a.id} type="button" className="cc-action" onClick={a.run} title={a.hint} aria-label={a.hint}>
          <span className="cc-action__icon">
            {a.icon}
            {a.badge ? <span className="badge-count">{a.badge}</span> : null}
          </span>
          <span className="cc-action__label" aria-hidden>
            {a.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
