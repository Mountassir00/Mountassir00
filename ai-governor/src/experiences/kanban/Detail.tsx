/** Card detail ("fiche"): everything known about one task, and the explicit actions. */
import type { MouseEvent, ReactNode } from 'react';
import { IconCheck, IconClose, IconPause, IconPlay, IconReplay, NatureBadge } from '@ds';
import {
  displaySummary, fmtCompact, fmtDuration, fmtRelative, fmtTime, fmtUsd, modelLabel,
  type AgentDef, type Command, type DepartmentDef, type GovEvent, type HostApi, type Interaction, type TaskRuntime,
} from '@sdk';
import { Avatar, PriorityMark, Progress } from './Card';
import { COLS, colOf, PRIORITIES, PRIORITY_LABEL, shortId, STATUS_LABEL, type StepInfo } from './data';

const how = (e: MouseEvent): Interaction => (e.detail === 0 ? 'keyboard' : 'click');

export interface DetailProps {
  t: TaskRuntime;
  agent?: AgentDef;
  dept?: DepartmentDef;
  agentName: (id?: string) => string;
  steps: StepInfo;
  now: number;
  replay: boolean;
  canViewConfidential: boolean;
  host: HostApi;
  onClose: () => void;
  /** Phones: the fiche is a full-screen sheet with a back button. */
  sheet?: boolean;
  log?: ReactNode;
}

export function Detail({ t, agent, dept, agentName, steps, now, replay, canViewConfidential, host, onClose, sheet, log }: DetailProps) {
  const col = colOf(t);
  const colDef = COLS.find((c) => c.id === col)!;
  const active = t.status === 'running' || t.status === 'pending' || t.status === 'paused';
  const run = (cmd: Command, e: MouseEvent) => void host.request(cmd, how(e));
  const lastSummary = [...steps.events].reverse().find((e) => e.summary && (e.type === 'llm.call' || e.type === 'tool.call' || e.type === 'agent.state'));
  const activity = steps.events.filter((e) => e.type.startsWith('task.') || e.type === 'agent.state' || e.status === 'failed').slice(-14).reverse();
  const shown = steps.items.slice(-10);
  const hidden = steps.items.length - shown.length;
  const todo = steps.total != null && steps.done != null ? Math.max(0, steps.total - steps.done) : 0;
  const isEstimated = steps.events.some((e) => e.metrics?.costNature === 'estimated') || t.costUsd === 0;
  const duration = t.startedAt ? (t.endedAt ?? now) - t.startedAt : undefined;

  return (
    <article className="kb-detail" aria-label={`Fiche ${shortId(t.id)} : ${t.title}`} data-sheet={sheet || undefined}>
      <header className="kb-detail__head">
        {sheet ? (
          <button type="button" className="btn btn--sm btn--ghost kb-back" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden focusable="false"><path d="m12 5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Tableau
          </button>
        ) : (
          <span className="kb-detail__id">{shortId(t.id)}</span>
        )}
        <span className="kb-detail__head-end">
          <NatureBadge nature={t.nature} />
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => host.select({ kind: 'task', id: t.id })} title="Ouvrir la tâche dans l’inspecteur du gouverneur">
            Inspecteur
          </button>
          {!sheet && (
            <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={onClose} aria-label="Fermer la fiche">
              <IconClose size={14} />
            </button>
          )}
        </span>
      </header>
      {sheet && <span className="kb-detail__id">{shortId(t.id)}</span>}
      <h2 className="kb-detail__title">{t.title}</h2>

      <dl className="kb-kv">
        <dt>Statut</dt>
        <dd>
          <span className="kb-status" style={{ ['--tone' as string]: colDef.tone }}>
            <i aria-hidden />
            {STATUS_LABEL[t.status]}
          </span>
        </dd>
        <dt>Assignée</dt>
        <dd>
          {t.agentId ? (
            <button type="button" className="kb-who-btn" onClick={() => host.select({ kind: 'agent', id: t.agentId! })} title="Voir l’agent dans l’inspecteur">
              <Avatar agent={agent} id={t.agentId} size={22} />
              {agentName(t.agentId)}
            </button>
          ) : (
            <span className="t-muted">Non assignée</span>
          )}
        </dd>
        <dt>Libellés</dt>
        <dd className="kb-kv__chips">
          {dept ? (
            <span className="kb-label" style={{ ['--tone' as string]: `var(--${dept.tone})` }}>
              {dept.name}
            </span>
          ) : (
            <span className="t-muted">Aucun département</span>
          )}
          {t.skills && Object.keys(t.skills).slice(0, 2).map((s) => (
            <span key={s} className="kb-label kb-label--ghost">
              {s}
            </span>
          ))}
        </dd>
        <dt>Projet</dt>
        <dd>{t.project ?? <span className="t-muted">Non renseigné</span>}</dd>
        <dt>Priorité</dt>
        <dd>
          {active && !replay ? (
            <label className="kb-prio-select">
              <PriorityMark p={t.priority} />
              <span className="sr-only">Modifier la priorité</span>
              <select
                className="select"
                value={t.priority}
                onChange={(e) => void host.request({ type: 'task.priority', taskId: t.id, priority: e.target.value as TaskRuntime['priority'] }, 'click')}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="kb-inline">
              <PriorityMark p={t.priority} withLabel />
              <span className="t-micro t-muted">{replay ? '· lecture seule (Replay)' : '· tâche finie'}</span>
            </span>
          )}
        </dd>
        <dt>Modèle</dt>
        <dd>
          {t.model ? (
            <>
              {modelLabel(t.model)} <span className="t-muted">· {t.provider ?? 'fournisseur inconnu'}{t.effort ? ` · effort ${t.effort}` : ''}</span>
            </>
          ) : (
            <span className="t-muted">{agent && agent.kind !== 'llm' ? 'Aucun — moteur déterministe' : 'Pas encore d’appel modèle'}</span>
          )}
        </dd>
        <dt>Chronologie</dt>
        <dd className="t-small">
          Créée {fmtTime(t.createdAt, true)}
          {t.startedAt && <> · démarrée {fmtTime(t.startedAt)}</>}
          {t.endedAt && <> · finie {fmtTime(t.endedAt)}</>}
          {duration != null && <span className="t-muted"> · {fmtDuration(duration)}</span>}
        </dd>
      </dl>

      <section className="kb-sec">
        <h3 className="kb-sec__title">Description</h3>
        <p className="kb-desc">
          {t.title}.{' '}
          {lastSummary ? (
            <span className="t-soft">Dernier signal : « {displaySummary(lastSummary, canViewConfidential)} » ({fmtRelative(lastSummary.ts, now)}).</span>
          ) : (
            <span className="t-muted">Aucun signal d’exécution pour le moment.</span>
          )}
        </p>
        {t.errors.length > 0 && (
          <ul className="kb-errors">
            {t.errors.slice(-3).map((er, i) => (
              <li key={i}>{er}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="kb-sec">
        <h3 className="kb-sec__title">
          Étapes
          {steps.total == null && <span className="t-muted num">{steps.items.length} réalisée(s)</span>}
        </h3>
        <Progress steps={steps} status={t.status} />
        <ul className="kb-check" aria-label="Étapes de la tâche">
          {hidden > 0 && <li className="kb-check__more t-micro t-muted">{hidden} étape(s) antérieure(s) masquée(s)</li>}
          {shown.map((e) => (
            <li key={e.id} data-state={e.status === 'failed' ? 'failed' : 'done'}>
              <span className="kb-check__box" aria-hidden>{e.status === 'failed' ? '!' : <IconCheck size={11} />}</span>
              <span className="kb-check__label">
                {e.type === 'llm.call' ? `Appel modèle${e.model ? ` · ${modelLabel(e.model)}` : ''}` : `Outil · ${String(e.attrs?.tool ?? e.destination?.id ?? 'outil')}`}
                {e.status === 'failed' && <span className="kb-check__fail"> — {displaySummary(e, canViewConfidential)}</span>}
              </span>
              <span className="kb-check__ts t-micro num">{fmtTime(e.ts)}</span>
            </li>
          ))}
          {Array.from({ length: Math.min(todo, 6) }, (_, i) => (
            <li key={`todo-${i}`} data-state="todo">
              <span className="kb-check__box" aria-hidden />
              <span className="kb-check__label">
                Étape {(steps.done ?? 0) + i + 1} sur {steps.total} — {t.status === 'failed' ? 'non réalisée' : 'à venir'}
              </span>
              <NatureBadge nature="planned" />
            </li>
          ))}
          {steps.total == null && <li className="t-micro t-muted">Nombre total d’étapes inconnu : la source ne l’a pas fourni.</li>}
          {!shown.length && !todo && steps.total != null && <li className="t-micro t-muted">Aucune étape enregistrée.</li>}
        </ul>
      </section>

      <section className="kb-sec">
        <h3 className="kb-sec__title">Consommation</h3>
        <div className="kb-usage">
          <div>
            <span className="t-micro t-muted">Entrée</span>
            <b className="num">{fmtCompact(t.tokensIn)}</b>
          </div>
          <div>
            <span className="t-micro t-muted">Sortie</span>
            <b className="num">{fmtCompact(t.tokensOut)}</b>
          </div>
          <div>
            <span className="t-micro t-muted">Cache lu</span>
            <b className="num">{fmtCompact(t.cacheRead)}</b>
          </div>
          <div>
            <span className="t-micro t-muted">Coût</span>
            <b className="num">{t.llmCalls ? fmtUsd(t.costUsd) : '—'}</b>
          </div>
        </div>
        <div className="kb-usage__nat">
          {t.llmCalls ? <NatureBadge nature={isEstimated ? 'estimated' : 'real'} label={isEstimated ? 'Coût estimé (tokens × tarif catalogue)' : 'Coût mesuré'} /> : <NatureBadge nature="unavailable" label="Aucun appel modèle : pas de coût en tokens" />}
        </div>
      </section>

      <section className="kb-sec">
        <h3 className="kb-sec__title">Activité</h3>
        <ol className="kb-activity">
          {activity.map((e) => (
            <li key={e.id}>
              <span className="kb-activity__dot" data-s={e.status} aria-hidden />
              <span className="kb-activity__txt">{activityText(e, agentName, canViewConfidential)}</span>
              <time className="t-micro t-muted" dateTime={new Date(e.ts).toISOString()} title={fmtTime(e.ts, true)}>
                {fmtRelative(e.ts, now)}
              </time>
            </li>
          ))}
          {!activity.length && <li className="t-muted t-small">Aucune activité enregistrée.</li>}
        </ol>
      </section>

      {log}

      <footer className="kb-detail__actions">
        {replay && <p className="kb-note t-micro">Replay : vous consultez l’état passé. Aucune action n’est possible.</p>}
        {!replay && !sheet && t.status === 'running' && <p className="kb-note t-micro">Suspendre ne consomme rien ; la reprise demandera une confirmation (elle peut consommer des tokens).</p>}
        <div className="kb-detail__btns">
          {(t.status === 'running' || t.status === 'pending') && (
            <button type="button" className="btn btn--sm" disabled={replay} onClick={(e) => run({ type: 'task.pause', taskId: t.id }, e)}>
              <IconPause size={14} /> Suspendre
            </button>
          )}
          {t.status === 'paused' && (
            <button type="button" className="btn btn--sm btn--primary" disabled={replay} onClick={(e) => run({ type: 'task.resume', taskId: t.id }, e)}>
              <IconPlay size={14} /> Reprendre
            </button>
          )}
          {(t.status === 'succeeded' || t.status === 'failed' || t.status === 'cancelled') && (
            <button
              type="button"
              className="btn btn--sm"
              disabled={replay}
              onClick={(e) => run({ type: 'task.rerun', taskId: t.id, estimatedCostUsd: t.costUsd > 0 ? Math.round(t.costUsd * 100) / 100 : undefined }, e)}
              title={t.costUsd > 0 ? `Nouvelle exécution — coût estimé ≈ ${fmtUsd(t.costUsd)} (d’après l’exécution précédente)` : 'Nouvelle exécution'}
            >
              <IconReplay size={14} /> Relancer
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function activityText(e: GovEvent, agentName: (id?: string) => string, conf: boolean): string {
  const byYou = e.origin.kind === 'user';
  switch (e.type) {
    case 'task.created':
      return 'Créée dans la file des tâches';
    case 'task.started':
      return `Démarrée par ${agentName(e.actor?.id)}`;
    case 'task.paused':
      return byYou ? 'Suspendue par vous' : 'Suspendue';
    case 'task.resumed':
      return byYou ? 'Reprise par vous' : 'Reprise';
    case 'task.priority':
      return `Priorité → ${PRIORITY_LABEL[(e.attrs?.priority as TaskRuntime['priority']) ?? 'normal'] ?? e.attrs?.priority}${byYou ? ' (par vous)' : ''}`;
    case 'task.completed':
      return 'Terminée';
    case 'task.failed':
      return `Échouée : ${displaySummary(e, conf)}`;
    case 'agent.state':
      return displaySummary(e, conf) || 'Changement d’état';
    default:
      return e.status === 'failed' ? `Erreur : ${displaySummary(e, conf)}` : displaySummary(e, conf);
  }
}
