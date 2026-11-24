/**
 * Brief du matin — one calm, editorial page per day: what worked, what is
 * planned, what waits for you, what it cost, and what needs attention.
 * Everything is computed locally from the event log (no model call); planned
 * items are inferred from recurring automations and labelled as such.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  displaySummary, fmtCompact, fmtInt, fmtPct, fmtRelative, fmtUsd, useCatalogIndex, useGovernor,
  type DataNature, type Decision, type ExperienceProps,
} from '@sdk';
import { IconAlert, IconCheck, IconChevron, IconStar, NatureBadge, Segmented } from '@ds';
import { buildDay, dayStartAt, delta, startOfDay, DAY, type BriefDay, type Win } from './data';
import './brief.css';

const dateFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const dateFmtY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const hm = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n > 1 ? many : one}`;
const RISK: Record<Decision['risk'], string> = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' };
const REV: Record<Decision['reversibility'], string> = { reversible: 'Réversible', partial: 'Partiellement réversible', irreversible: 'Irréversible' };
const VERDICT: Record<Exclude<Decision['status'], 'pending'>, string> = { go: 'GO', nogo: 'NO GO', test: 'TEST' };

function greeting(ts: number) {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 12) return 'Bonjour.';
  if (h >= 12 && h < 18) return 'Bon après-midi.';
  return 'Bonsoir.';
}

export default function Brief({ host, config, device }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const [offset, setOffset] = useState(0);
  const compare = config.compareTo === 'week' ? 'week' : 'day';
  const topN = Math.max(2, Math.round(Number(config.topCount ?? 4)));
  const showHourly = config.showHourly !== false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const firstTs = useMemo(() => g.allEvents()[0]?.ts ?? g.now, [g.version]);
  const maxOffset = Math.max(0, Math.round((startOfDay(g.now) - startOfDay(firstTs)) / DAY));
  const off = Math.min(offset, maxOffset);
  const minuteKey = Math.floor(g.now / 30_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const day = useMemo(() => buildDay(g, off, compare), [g.version, minuteKey, off, compare, g.filters, g.mode]);

  useEffect(
    () =>
      host.provideCommands([
        { id: 'brief.today', label: 'Brief : aujourd’hui', keyword: 'brief', run: () => setOffset(0) },
        { id: 'brief.yesterday', label: 'Brief : hier', keyword: 'brief', run: () => setOffset(1) },
        { id: 'brief.prev', label: 'Brief : jour précédent', keyword: 'brief', run: () => setOffset((o) => o + 1) },
        { id: 'brief.next', label: 'Brief : jour suivant', keyword: 'brief', run: () => setOffset((o) => Math.max(0, o - 1)) },
      ]),
    [host],
  );

  const go = (o: number) => {
    const next = Math.max(0, Math.min(maxOffset, o));
    setOffset(next);
    host.announce(`Brief du ${dateFmt.format(dayStartAt(g.now, next))}`);
  };

  const decisions = useMemo(() => {
    const all = Object.values(g.state.decisions);
    const list = day.isToday ? all.filter((d) => d.status === 'pending' || (d.resolvedAt != null && d.resolvedAt >= day.from)) : all.filter((d) => d.proposedAt >= day.from && d.proposedAt < day.from + DAY);
    return list.sort((a, b) => Number(b.status === 'pending') - Number(a.status === 'pending') || b.proposedAt - a.proposedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.version, day.from, day.isToday]);
  const pending = decisions.filter((d) => d.status === 'pending');
  const running = useMemo(
    () => (day.isToday ? Object.values(g.state.tasks).filter((t) => t.status === 'running' || t.status === 'paused').sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, day.isToday],
  );
  const queued = day.isToday ? Object.values(g.state.tasks).filter((t) => t.status === 'pending').length : 0;
  const openAlerts = day.alerts.filter((a) => a.open).length;
  const finished = day.usage.tasksDone + day.usage.tasksFailed;
  const tokensSaved = day.optimizations.reduce((s, o) => s + o.tokensSaved, 0);
  const avoided = day.optimizations.reduce((s, o) => s + o.avoidedUsd, 0) + day.usage.avoidedUsd;
  const costDelta = delta(day.cost, day.prevCost);
  const readOnly = g.mode === 'replay';

  const dateLabel = cap((day.isToday ? dateFmt : dateFmtY).format(day.from));
  const headline = day.isToday ? greeting(g.now) : off === 1 ? 'Hier.' : `${cap(new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(day.from))} ${new Date(day.from).getDate()}.`;
  const when = day.isToday ? 'Depuis minuit' : 'Ce jour-là';
  const lead = [
    `${when}, vos agents ont terminé ${plural(day.usage.tasksDone, 'tâche')}${day.cost > 0 ? ` pour un coût estimé de ${fmtUsd(day.cost)}` : ''}.`,
    day.optimizations.length ? `${plural(day.optimizations.length, 'optimisation')} ${day.optimizations.length > 1 ? 'ont' : 'a'} économisé ${fmtCompact(tokensSaved)} tokens.` : '',
    pending.length ? `${plural(pending.length, 'décision')} ${pending.length > 1 ? 'attendent' : 'attend'} votre accord.` : day.isToday ? 'Rien n’attend votre accord.' : '',
    openAlerts ? `${plural(openAlerts, 'alerte ouverte', 'alertes ouvertes')}.` : '',
  ].filter(Boolean).join(' ');

  const resolve = async (d: Decision, verdict: 'go' | 'nogo' | 'test') => {
    const r = await host.request({ type: 'decision.resolve', decisionId: d.id, verdict, durable: d.durable, costDeltaUsd: d.costDeltaUsd }, 'click');
    if (r.status === 'denied') host.announce(r.reason);
  };

  const agentName = (id?: string) => (id ? idx.agents.get(id)?.name ?? id : '');
  const deptName = (id?: string) => (id ? idx.departments.get(id)?.name ?? id : '');

  return (
    <div className="bf" data-headline={config.headline === 'sobre' ? 'sobre' : 'grand'} data-device={device}>
      <div className="bf-bar" role="group" aria-label="Choisir le jour du brief">
        <Segmented<'0' | '1' | 'x'>
          raised
          size="sm"
          label="Jour"
          value={off === 0 ? '0' : off === 1 ? '1' : 'x'}
          onChange={(v) => go(v === '0' ? 0 : 1)}
          options={[
            { value: '0', label: 'Aujourd’hui' },
            { value: '1', label: 'Hier' },
          ]}
        />
        <div className="bf-nav">
          <button type="button" className="icon-btn bf-nav__btn" onClick={() => go(off + 1)} disabled={off >= maxOffset} aria-label="Jour précédent">
            <IconChevron size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
          <span className="bf-nav__date" aria-live="polite">
            {cap(shortFmt.format(day.from))}
          </span>
          <button type="button" className="icon-btn bf-nav__btn" onClick={() => go(off - 1)} disabled={off <= 0} aria-label="Jour suivant">
            <IconChevron size={16} />
          </button>
        </div>
        {readOnly && <span className="pill replay-banner">Relecture : lecture seule</span>}
      </div>

      <article className="bf-paper" aria-labelledby="bf-hello">
        <header className="bf-mast">
          <div className="bf-mast__top">
            <span className="bf-kicker">
              <i aria-hidden /> Brief du matin
            </span>
            <span className="bf-mast__when num">{day.isToday ? `${dateLabel} · ${hm.format(g.now)}` : dateLabel}</span>
          </div>
          <h2 className="bf-hello" id="bf-hello">
            {headline}
          </h2>
          <p className="bf-lead">{lead}</p>
          <div className="bf-mast__nat">
            <NatureBadge nature={day.nature} label={day.nature === 'demo' ? 'Données de démonstration' : day.nature === 'real' ? 'Mesuré' : 'Estimé'} />
            <span className="t-muted">{plural(day.events, 'événement')} · calculé localement, sans appel à un modèle</span>
          </div>
        </header>

        <Section n="01" title="Ce qui a marché" aside={<span className="bf-figure">{finished ? `${fmtPct(day.usage.tasksDone / finished)} de réussite` : 'Aucune tâche terminée'}</span>}>
          <p className="bf-sum">
            {plural(day.usage.tasksDone, 'tâche terminée', 'tâches terminées')} · {plural(day.optimizations.length, 'optimisation')} · {fmtCompact(tokensSaved)} tokens économisés · {fmtUsd(avoided)} évités
            <NatureBadge nature={day.costNature} />
          </p>
          <div className="bf-cols">
            <div>
              <h4 className="bf-h4">Tâches marquantes</h4>
              {day.tasks.length ? (
                <ol className="bf-list">
                  {day.tasks.slice(0, topN).map((w) => (
                    <WinItem key={w.id} w={w} meta={`${agentName(w.agentId)} · ${deptName(w.deptId)} · ${hm.format(w.ts)}`} onOpen={() => host.select({ kind: 'task', id: w.id })} />
                  ))}
                </ol>
              ) : (
                <p className="bf-empty">Aucune tâche terminée {day.isToday ? 'depuis minuit' : 'ce jour-là'}.</p>
              )}
            </div>
            <div>
              <h4 className="bf-h4">Économies</h4>
              {day.optimizations.length ? (
                <ol className="bf-list">
                  {day.optimizations.slice(0, topN).map((w) => (
                    <WinItem key={w.id} w={w} meta={`${deptName(w.deptId) || agentName(w.agentId)} · ${hm.format(w.ts)}`} onOpen={() => w.deptId && host.select({ kind: 'department', id: w.deptId })} />
                  ))}
                </ol>
              ) : (
                <p className="bf-empty">Aucune optimisation appliquée.</p>
              )}
            </div>
          </div>
        </Section>

        <Section n="02" title={day.isToday ? 'Au programme' : 'Ce qui était au programme'} aside={<NatureBadge nature="planned" label="Planifié (déduit)" />}>
          {day.planned.length ? (
            <ul className="bf-plan">
              {day.planned.map((p) => (
                <li key={p.id}>
                  <span className="bf-plan__time num">{hm.format(p.at)}</span>
                  <span className="bf-plan__txt">
                    <b>{p.title}</b>
                    <small>
                      {p.ranToday
                        ? `${p.ranToday.ok ? 'Exécutée' : 'En échec'} à ${hm.format(p.ranToday.ts)}${p.next ? ` · prochaine demain à ${hm.format(p.next)}` : ''}`
                        : p.missed
                          ? 'Aucune exécution observée à l’heure habituelle'
                          : 'Prévue aujourd’hui'}
                      {` · quotidienne, déduite de ${p.seenDays} jours`}
                    </small>
                  </span>
                  {p.ranToday ? (
                    <span className={`pill ${p.ranToday.ok ? 'pill--up' : 'pill--down'}`}>{p.ranToday.ok ? 'Faite' : 'Échec'}</span>
                  ) : p.missed ? (
                    <span className="pill pill--risk-medium">Non observée</span>
                  ) : (
                    <NatureBadge nature="planned" />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="bf-empty">Aucune automatisation récurrente détectée (il faut au moins 3 jours d’exécutions pour en déduire un horaire).</p>
          )}
          {day.isToday && (running.length > 0 || queued > 0) && (
            <>
              <h4 className="bf-h4">En cours maintenant</h4>
              <ul className="bf-plan bf-plan--now">
                {running.slice(0, topN).map((t) => (
                  <li key={t.id}>
                    <span className="bf-plan__time bf-plan__time--live" aria-hidden>
                      <i />
                    </span>
                    <button type="button" className="bf-plan__txt bf-link" onClick={() => host.select({ kind: 'task', id: t.id })}>
                      <b>{t.title}</b>
                      <small>
                        {agentName(t.agentId)} · {deptName(t.departmentId)} · {t.status === 'paused' ? 'suspendue' : `démarrée ${t.startedAt ? fmtRelative(t.startedAt, g.now) : ''}`}
                      </small>
                    </button>
                    <span className="pill pill--accent">{t.status === 'paused' ? 'Suspendue' : 'En cours'}</span>
                  </li>
                ))}
              </ul>
              {queued > 0 && <p className="bf-note">{plural(queued, 'tâche')} en file d’attente.</p>}
            </>
          )}
        </Section>

        <Section n="03" title="En attente de vous" aside={pending.length ? <span className="badge-count">{pending.length}</span> : undefined}>
          {decisions.length ? (
            <ul className="bf-decs">
              {decisions.map((d) => (
                <li key={d.id} className="bf-dec" data-pending={d.status === 'pending' ? 'true' : undefined}>
                  <div className="bf-dec__main">
                    <button type="button" className="bf-link bf-dec__title" onClick={() => host.select({ kind: 'decision', id: d.id })}>
                      {d.title}
                    </button>
                    {d.rationale && <p className="bf-dec__why">{d.rationale}</p>}
                    <div className="bf-dec__meta">
                      <span className={`pill pill--risk-${d.risk}`}>{RISK[d.risk]}</span>
                      <span className="pill">{REV[d.reversibility]}</span>
                      {d.durable && <span className="pill pill--accent">Changement durable</span>}
                      {d.costDeltaUsd != null && d.costDeltaUsd > 0 && <span className="pill">Coût estimé {fmtUsd(d.costDeltaUsd)}</span>}
                      {d.impact && <span className="bf-dec__impact">{d.impact}</span>}
                      <NatureBadge nature={d.nature} />
                    </div>
                  </div>
                  {d.status === 'pending' ? (
                    <div className="verdict bf-verdict" role="group" aria-label={`Arbitrer : ${d.title}`}>
                      <button type="button" className="btn go" disabled={readOnly} title={readOnly ? 'Relecture : lecture seule' : undefined} onClick={() => resolve(d, 'go')}>
                        GO
                      </button>
                      <button type="button" className="btn nogo" disabled={readOnly} title={readOnly ? 'Relecture : lecture seule' : undefined} onClick={() => resolve(d, 'nogo')}>
                        NO GO
                      </button>
                      <button type="button" className="btn test" disabled={readOnly} title={readOnly ? 'Relecture : lecture seule' : undefined} onClick={() => resolve(d, 'test')}>
                        TEST
                      </button>
                    </div>
                  ) : (
                    <span className={`pill ${d.status === 'nogo' ? 'pill--down' : 'pill--up'} bf-dec__done`}>
                      {VERDICT[d.status]}
                      {d.resolvedAt ? ` · ${fmtRelative(d.resolvedAt, g.now)}` : ''}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="bf-empty">Rien n’attend votre accord.</p>
          )}
        </Section>

        <Section n="04" title="Ce que ça a coûté" aside={<NatureBadge nature={day.costNature} label={day.costNature === 'demo' ? 'Démo' : day.costNature === 'real' ? 'Facturé' : 'Estimé (prix catalogue)'} />}>
          <CostBlock day={day} costDelta={costDelta} now={g.now} showHourly={showHourly} />
        </Section>

        <Section n="05" title="Alertes" aside={openAlerts ? <span className="badge-count badge-count--alert">{openAlerts}</span> : undefined}>
          {day.alerts.length ? (
            <ul className="bf-alerts">
              {day.alerts.slice(0, topN * 2).map((a) => (
                <li key={a.id} data-sev={a.severity} data-open={a.open ? 'true' : undefined}>
                  <span className="bf-alerts__icon" aria-hidden>
                    <IconAlert size={15} />
                  </span>
                  <span className="bf-alerts__txt">
                    {a.taskId ? (
                      <button type="button" className="bf-link" onClick={() => host.select({ kind: 'task', id: a.taskId! })}>
                        {a.title}
                      </button>
                    ) : (
                      <b>{a.confidential ? displaySummary({ summary: a.title, confidentiality: 'confidential' }, g.canViewConfidential) : a.title}</b>
                    )}
                    <small>
                      {a.kind === 'incident' ? 'Sécurité' : a.kind === 'connector' ? 'Connecteur' : a.kind === 'automation' ? 'Automatisation' : 'Tâche échouée'} · {fmtRelative(a.ts, g.now)}
                    </small>
                  </span>
                  <span className={`pill ${a.open ? 'pill--down' : ''}`}>{a.open ? (a.severity === 'high' || a.severity === 'critical' ? 'Ouverte · grave' : 'Ouverte') : a.kind === 'incident' ? 'Résolue' : 'Constatée'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bf-empty bf-ok">
              <IconCheck size={16} /> Aucune alerte.
            </p>
          )}
        </Section>

        <footer className="bf-colophon">
          Brief établi à partir du journal d’événements{g.hasDemo ? ' (données de démonstration)' : ''}. Les horaires « au programme » sont déduits des exécutions récurrentes et ne garantissent pas une exécution.
        </footer>
      </article>
    </div>
  );
}

function Section({ n, title, aside, children }: { n: string; title: string; aside?: ReactNode; children: ReactNode }) {
  const id = `bf-s${n}`;
  return (
    <section className="bf-sec" aria-labelledby={id}>
      <header className="bf-sec__head">
        <span className="bf-sec__n num" aria-hidden>
          {n}
        </span>
        <h3 className="bf-sec__title" id={id}>
          {title}
        </h3>
        {aside && <span className="bf-sec__aside">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

function WinItem({ w, meta, onOpen }: { w: Win; meta: string; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className="bf-win" data-kind={w.kind} onClick={onOpen}>
        <span className="bf-win__icon" aria-hidden>
          {w.kind === 'task' ? <IconCheck size={14} /> : <IconStar size={14} />}
        </span>
        <span className="bf-win__txt">
          <b>{w.title}</b>
          <small>{meta}</small>
        </span>
        <span className="bf-win__val num">
          {w.kind === 'task' ? (
            <>
              <span>{w.costUsd > 0 ? fmtUsd(w.costUsd, 3) : '—'}</span>
              {w.avoidedUsd > 0 && <small>cache −{fmtUsd(w.avoidedUsd, 3)}</small>}
            </>
          ) : (
            <>
              <span>−{fmtCompact(w.tokensSaved)} tokens</span>
              {w.avoidedUsd > 0 && <small>{fmtUsd(w.avoidedUsd, w.avoidedUsd < 1 ? 3 : 2)} évités</small>}
            </>
          )}
        </span>
      </button>
    </li>
  );
}

function CostBlock({ day, costDelta, now, showHourly }: { day: BriefDay; costDelta: number | null; now: number; showHourly: boolean }) {
  const max = Math.max(...day.hourly.map((b) => b.costUsd), 0.0001);
  const peak = day.hourly.reduce((m, b) => (b.costUsd > m.costUsd ? b : m), day.hourly[0]);
  const curHour = day.isToday ? new Date(now).getHours() : -1;
  const nature: DataNature = day.costNature;
  return (
    <div className="bf-cost">
      <div className="bf-cost__figs">
        <div className="bf-cost__main">
          <span className="bf-cost__label">Coût {nature === 'real' ? 'facturé' : 'estimé'}</span>
          <span className="bf-cost__value num">{fmtUsd(day.cost)}</span>
          <span className="bf-cost__cmp">
            {costDelta != null ? (
              <span className={`pill ${costDelta <= 0 ? 'pill--up' : 'pill--down'}`}>
                {costDelta <= 0 ? '↘' : '↗'} {costDelta > 0 ? '+' : ''}
                {fmtPct(costDelta)}
              </span>
            ) : (
              <span className="pill">Comparaison indisponible</span>
            )}
            <span className="t-muted">vs {fmtUsd(day.prevCost)} {day.prevLabel}</span>
          </span>
        </div>
        <dl className="bf-cost__kv">
          <div>
            <dt>Part servie par le cache</dt>
            <dd className="num">{day.cacheShare != null ? fmtPct(day.cacheShare) : 'Indisponible'}</dd>
          </div>
          <div>
            <dt>Tokens traités</dt>
            <dd className="num">{fmtCompact(day.tokens)}</dd>
          </div>
          <div>
            <dt>Appels modèle</dt>
            <dd className="num">{fmtInt(day.usage.llmCalls)}</dd>
          </div>
          <div>
            <dt>Évité grâce au cache</dt>
            <dd className="num">{fmtUsd(day.usage.avoidedUsd)}</dd>
          </div>
        </dl>
      </div>
      {showHourly && (
        <figure className="bf-hours">
          <svg viewBox="0 0 240 60" preserveAspectRatio="none" role="img" aria-label={day.cost > 0 ? `Coût heure par heure ; pic à ${new Date(peak.t).getHours()} h (${fmtUsd(peak.costUsd)})` : 'Aucun coût sur la journée'}>
            {day.hourly.map((b, i) => {
              const h = (b.costUsd / max) * 54;
              return <rect key={b.t} x={i * 10 + 1.5} y={58 - Math.max(h, b.costUsd > 0 ? 1.5 : 0.6)} width={7} height={Math.max(h, b.costUsd > 0 ? 1.5 : 0.6)} rx={1.5} className="bf-hours__bar" data-now={i === curHour ? 'true' : undefined} data-future={day.isToday && i > curHour ? 'true' : undefined} />;
            })}
          </svg>
          <figcaption className="bf-hours__axis" aria-hidden>
            <span>0 h</span>
            <span>6 h</span>
            <span>12 h</span>
            <span>18 h</span>
            <span>24 h</span>
          </figcaption>
        </figure>
      )}
    </div>
  );
}
