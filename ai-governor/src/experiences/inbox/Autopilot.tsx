/** Autopilot tab: recurring jobs inferred from automation.run events. */
import { useId, useState } from 'react';
import { NatureBadge } from '@ds';
import { displaySummary, fmtPct, fmtRelative, fmtTime, type Catalog, type GovEvent } from '@sdk';
import { fmtNext, type Job } from './autopilot';

export function Autopilot({ jobs, catalog, now, conf, stripLength }: { jobs: Job[]; catalog: Catalog; now: number; conf: boolean; stripLength: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const totalRuns = jobs.reduce((s, j) => s + j.runs.length, 0);
  const ok = jobs.reduce((s, j) => s + j.ok, 0);
  const tipId = useId();
  return (
    <div className="ib-auto">
      <header className="ib-auto__head">
        <div>
          <h3>Ce que vos équipes exécutent seules, et quand</h3>
          <p className="t-small t-muted">
            {jobs.length} automatisation(s) détectée(s) · {totalRuns} exécution(s) observée(s)
            {totalRuns ? ` · ${fmtPct(ok / totalRuns)} de réussite` : ''}
          </p>
        </div>
        <p className="ib-auto__note t-micro" id={tipId}>
          Déduit des événements <span className="ib-mono">automation.run</span>. La récurrence est inférée des horodatages ; la prochaine exécution est une projection. Activer ou suspendre une automatisation n’est pas encore pris en charge par la passerelle : aucune commande n’existe pour cela.
        </p>
      </header>
      {!jobs.length && (
        <div className="ib-empty">
          <p>
            <b>Aucune automatisation observée.</b>
          </p>
          <p className="t-small t-muted">Les tâches récurrentes apparaîtront ici dès que la source émettra des événements d’automatisation.</p>
        </div>
      )}
      <ul className="ib-jobs">
        {jobs.map((j) => {
          const dept = catalog.departments.find((d) => d.id === j.departmentId);
          const actor = catalog.agents.find((a) => a.id === j.actorId);
          const isOpen = open === j.key;
          const strip = j.runs.slice(-stripLength);
          const rate = j.runs.length ? j.ok / j.runs.length : 0;
          const lastFailed = j.last?.status === 'failed';
          return (
            <li key={j.key} className="ib-job" data-open={isOpen || undefined}>
              <div className="ib-job__row">
                <span className="ib-job__ic" style={dept ? { ['--tone' as string]: `var(--${dept.tone})` } : undefined} aria-hidden>
                  <svg width="18" height="18" viewBox="0 0 20 20" focusable="false">
                    <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 6.5V10l2.5 1.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M15.5 3.5 17 5M4.5 3.5 3 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </span>
                <div className="ib-job__main">
                  <button type="button" className="ib-job__name" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : j.key)}>
                    {(j.last ? displaySummary(j.last, conf) : '') || j.name}
                  </button>
                  <p className="ib-job__line t-small">
                    <span className="ib-job__sched">{cap(j.schedule.label)}</span>
                    <span className="t-muted">· {actor?.name ?? j.actorId ?? 'moteur inconnu'}</span>
                    {dept && (
                      <span className="ib-chip" style={{ ['--tone' as string]: `var(--${dept.tone})` }}>
                        {dept.name}
                      </span>
                    )}
                    <span className="t-micro t-muted">(récurrence inférée)</span>
                  </p>
                  <div className="ib-strip" role="img" aria-label={`${strip.length} dernières exécutions : ${strip.filter((r) => r.status !== 'failed').length} réussies, ${strip.filter((r) => r.status === 'failed').length} en échec`}>
                    {strip.map((r) => (
                      <i key={r.id} data-s={r.status === 'failed' ? 'failed' : 'ok'} title={`${fmtTime(r.ts, true)} · ${r.status === 'failed' ? 'échec' : 'réussie'}`} />
                    ))}
                  </div>
                </div>
                <dl className="ib-job__stats">
                  <div>
                    <dt>Dernière</dt>
                    <dd>
                      <span className="ib-run" data-s={lastFailed ? 'failed' : 'ok'}>{lastFailed ? 'Échec' : 'Réussie'}</span>
                      <span className="t-micro t-muted">{j.last ? fmtRelative(j.last.ts, now) : '—'}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Prochaine</dt>
                    <dd>
                      {j.next ? <span className="num">{fmtNext(j.next, now)}</span> : <span className="t-muted">Indéterminée</span>}
                      <NatureBadge nature={j.next ? 'planned' : 'unavailable'} />
                    </dd>
                  </div>
                  <div>
                    <dt>Réussite</dt>
                    <dd>
                      <span className="num">
                        {j.ok}/{j.runs.length} · {fmtPct(rate)}
                      </span>
                      <NatureBadge nature={j.nature} />
                    </dd>
                  </div>
                </dl>
                <span className="ib-switch-wrap">
                  <button type="button" role="switch" aria-checked={true} aria-disabled="true" aria-describedby={tipId} className="ib-switch" title="Non pris en charge : la passerelle n’expose aucune commande pour activer ou suspendre une automatisation." onClick={(e) => e.preventDefault()}>
                    <i aria-hidden />
                    <span className="sr-only">Automatisation active (modification non prise en charge)</span>
                  </button>
                  <span className="t-micro t-muted">Active</span>
                </span>
              </div>
              {isOpen && <RunHistory runs={j.runs} now={now} conf={conf} minuteOfDay={j.schedule.minuteOfDay} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RunHistory({ runs, now, conf, minuteOfDay }: { runs: GovEvent[]; now: number; conf: boolean; minuteOfDay?: number }) {
  const recent = runs.slice(-12).reverse();
  const drift = (ts: number) => {
    if (minuteOfDay == null) return null;
    const d = new Date(ts);
    const delta = Math.round(d.getHours() * 60 + d.getMinutes() - minuteOfDay);
    return delta === 0 ? 'à l’heure prévue' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} min vs horaire inféré`;
  };
  return (
    <div className="ib-history">
      <h4 className="t-micro">Historique des exécutions ({runs.length})</h4>
      <ol>
        {recent.map((r) => (
          <li key={r.id}>
            <span className="ib-run" data-s={r.status === 'failed' ? 'failed' : 'ok'}>{r.status === 'failed' ? 'Échec' : 'OK'}</span>
            <span className="num">{fmtTime(r.ts, true)}</span>
            <span className="t-muted t-micro">{fmtRelative(r.ts, now)}</span>
            <span className="ib-history__sum t-small">{r.status === 'failed' ? displaySummary(r, conf) || 'Échec signalé par la source' : drift(r.ts) ?? displaySummary(r, conf)}</span>
          </li>
        ))}
      </ol>
      {runs.length > recent.length && <p className="t-micro t-muted">{runs.length - recent.length} exécution(s) plus ancienne(s) non affichée(s).</p>}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
