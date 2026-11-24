/**
 * Agent Inspector (and inspector for departments, nodes, flows, tasks).
 * Shows operational summaries and logs only — never a model's private reasoning.
 * Actions go through the command gateway (permissions, mode, confirmation).
 */
import { useMemo } from 'react';
import type { GovEvent } from '@core/events/schema';
import type { Priority, TaskRuntime } from '@core/projection';
import { IconClose, IconInfo, NatureBadge, Notice, StatusPill } from '@ds';
import { displaySummary, fmtCompact, fmtDuration, fmtRelative, fmtTime, fmtUsd, modelLabel, useCatalogIndex, useGovernor, recentFlows } from '@sdk';
import { requestCommand, useRuntime } from './context';
import { ui, useUi } from './uiStore';

const KIND_LABEL = { llm: 'Agent LLM', script: 'Script déterministe', service: 'Service partagé', human: 'Humain' } as const;
const TASK_STATUS = { pending: 'En attente', running: 'En cours', paused: 'Suspendue', succeeded: 'Terminée', failed: 'Échouée', cancelled: 'Annulée' } as const;
const PRIORITIES: Array<{ v: Priority; l: string }> = [
  { v: 'low', l: 'Basse' },
  { v: 'normal', l: 'Normale' },
  { v: 'high', l: 'Haute' },
  { v: 'critical', l: 'Critique' },
];

export function Inspector() {
  const sel = useUi((s) => s.selection);
  const close = () => ui.set({ drawer: null });
  let title = 'Inspecteur';
  let body: React.ReactNode = (
    <div className="empty">
      <p>Sélectionnez un agent, un département, un composant ou un flux dans la vue.</p>
      <p className="t-small">Raccourci : Ctrl+K pour rechercher.</p>
    </div>
  );
  const idx = useCatalogIndex();
  if (sel?.kind === 'agent') {
    title = idx.agents.get(sel.id)?.name ?? sel.id;
    body = <AgentPanel id={sel.id} />;
  } else if (sel?.kind === 'department') {
    title = idx.departments.get(sel.id)?.name ?? sel.id;
    body = <DepartmentPanel id={sel.id} />;
  } else if (sel?.kind === 'node') {
    title = idx.nodes.get(sel.id)?.label ?? sel.id;
    body = idx.agents.has(sel.id) ? <AgentPanel id={sel.id} /> : <NodePanel id={sel.id} />;
  } else if (sel?.kind === 'flow') {
    title = 'Flux';
    body = <FlowPanel id={sel.id} />;
  } else if (sel?.kind === 'task') {
    title = 'Tâche';
    body = <TaskPanel id={sel.id} />;
  }
  return (
    <aside className="drawer" aria-label={`Inspecteur : ${title}`}>
      <div className="drawer__grip" aria-hidden />
      <div className="drawer__head">
        <h2 className="t-h2" style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </h2>
        <button type="button" className="btn btn--icon btn--ghost" onClick={close} aria-label="Fermer l’inspecteur">
          <IconClose size={18} />
        </button>
      </div>
      <div className="drawer__body">{body}</div>
    </aside>
  );
}

function useEntityEvents(match: (e: GovEvent) => boolean, limit = 12) {
  const g = useGovernor();
  return useMemo(() => {
    const all = g.allEvents();
    const out: GovEvent[] = [];
    for (let i = all.length - 1; i >= 0 && out.length < limit; i--) {
      const e = all[i];
      if (e.ts > g.now) continue;
      if (e.type === 'agent.state') continue;
      if (match(e)) out.push(e);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.version, g.now, limit]);
}

function Log({ events }: { events: GovEvent[] }) {
  const g = useGovernor();
  if (!events.length) return <p className="t-small t-muted">Aucun événement enregistré.</p>;
  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
      {events.map((e) => (
        <li key={e.id} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 8, fontSize: '0.84rem' }}>
          <span className="num t-muted">{fmtTime(e.ts)}</span>
          <span style={{ minWidth: 0 }}>
            <span style={{ color: e.status === 'failed' ? 'var(--st-error)' : undefined }}>{displaySummary(e, g.canViewConfidential) || e.type}</span>
            {e.metrics && (e.metrics.inputTokens != null || e.metrics.outputTokens != null) && (
              <span className="t-muted num"> · {fmtCompact((e.metrics.inputTokens ?? 0) + (e.metrics.cacheReadTokens ?? 0) + (e.metrics.outputTokens ?? 0))} tokens</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

function UsageBlock({ u, nature, costKnown = true }: { u: { tokensIn: number; tokensOut: number; cacheRead: number; cacheWrite: number; costUsd: number; llmCalls: number; toolCalls: number }; nature: GovEvent['nature']; costKnown?: boolean }) {
  return (
    <dl className="kv">
      <dt>Tokens entrée</dt>
      <dd className="num">{fmtCompact(u.tokensIn)} <NatureBadge nature={nature === 'demo' ? 'demo' : 'real'} /></dd>
      <dt>Tokens sortie</dt>
      <dd className="num">{fmtCompact(u.tokensOut)}</dd>
      <dt>Lus depuis le cache</dt>
      <dd className="num">{fmtCompact(u.cacheRead)}</dd>
      <dt>Écrits en cache</dt>
      <dd className="num">{fmtCompact(u.cacheWrite)}</dd>
      <dt>Coût</dt>
      <dd className="num">{costKnown ? fmtUsd(u.costUsd) : '—'} <NatureBadge nature={nature === 'demo' ? 'demo' : 'estimated'} /></dd>
      <dt>Appels</dt>
      <dd className="num">
        {u.llmCalls} modèle · {u.toolCalls} outils
      </dd>
    </dl>
  );
}

function TaskActions({ task }: { task: TaskRuntime }) {
  const rt = useRuntime();
  const g = useGovernor();
  const active = task.status === 'running' || task.status === 'pending';
  // Rerun estimate = what the previous run cost (estimated, list price).
  const est = task.costUsd > 0 ? task.costUsd : undefined;
  const disabled = g.mode === 'replay';
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {disabled && <Notice icon={<IconInfo size={16} />}>Replay : les actions sont désactivées. Revenez en direct pour agir.</Notice>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {active && (
          <button type="button" className="btn" disabled={disabled} onClick={(e) => requestCommand(rt, { type: 'task.pause', taskId: task.id }, e.detail === 0 ? 'keyboard' : 'click')}>
            Suspendre
          </button>
        )}
        {task.status === 'paused' && (
          <button type="button" className="btn" disabled={disabled} onClick={(e) => requestCommand(rt, { type: 'task.resume', taskId: task.id }, e.detail === 0 ? 'keyboard' : 'click')}>
            Reprendre
          </button>
        )}
        {(task.status === 'failed' || task.status === 'succeeded') && (
          <button type="button" className="btn" disabled={disabled} onClick={(e) => requestCommand(rt, { type: 'task.rerun', taskId: task.id, estimatedCostUsd: est }, e.detail === 0 ? 'keyboard' : 'click')}>
            Relancer
          </button>
        )}
        {task.resultRef && (
          <span className="pill" title="Référence vers le résultat archivé (le contenu n’est pas chargé ici)">
            Résultat : <span className="mono">{task.resultRef}</span>
          </span>
        )}
      </div>
      {(active || task.status === 'paused') && (
        <label className="field">
          <span>Priorité</span>
          <select
            className="select"
            value={task.priority}
            disabled={disabled}
            onChange={(e) => requestCommand(rt, { type: 'task.priority', taskId: task.id, priority: e.target.value as Priority }, 'click')}
          >
            {PRIORITIES.map((p) => (
              <option key={p.v} value={p.v}>
                {p.l}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function TaskSummary({ task }: { task: TaskRuntime }) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const started = task.startedAt ?? task.createdAt;
  const end = task.endedAt ?? g.now;
  return (
    <>
      <dl className="kv">
        <dt>Mission</dt>
        <dd>{task.title}</dd>
        <dt>Statut</dt>
        <dd>{TASK_STATUS[task.status]}</dd>
        <dt>Projet</dt>
        <dd>{task.project ?? '—'}</dd>
        <dt>Département</dt>
        <dd>{task.departmentId ? idx.departments.get(task.departmentId)?.name ?? task.departmentId : '—'}</dd>
        <dt>Fournisseur</dt>
        <dd>{task.provider ?? '—'}</dd>
        <dt>Modèle</dt>
        <dd>{task.model ? modelLabel(task.model) : 'Aucun (exécution déterministe)'}</dd>
        <dt>Niveau d’effort</dt>
        <dd>{task.effort ?? '—'}</dd>
        <dt>Démarrage</dt>
        <dd className="num">{fmtTime(started, true)}</dd>
        <dt>Durée</dt>
        <dd className="num">{fmtDuration(end - started)}</dd>
        <dt>Actions restantes</dt>
        <dd>{task.remainingSteps != null ? `${task.remainingSteps} étape(s) prévue(s)` : 'Non communiqué par la source'}</dd>
        <dt>Dépendances</dt>
        <dd>{task.dependsOn.length ? task.dependsOn.join(', ') : 'Aucune déclarée'}</dd>
        <dt>Autorisation requise</dt>
        <dd>{task.requiresApproval ?? 'Aucune'}</dd>
      </dl>
      {Object.keys(task.tools).length > 0 && (
        <>
          <h3 className="section-title">Outils mobilisés</h3>
          <Chips map={task.tools} />
        </>
      )}
      {Object.keys(task.skills).length > 0 && (
        <>
          <h3 className="section-title">Skills utilisés</h3>
          <Chips map={task.skills} />
        </>
      )}
      {task.errors.length > 0 && (
        <>
          <h3 className="section-title">Erreurs</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--st-error)', fontSize: '0.86rem' }}>
            {task.errors.slice(-5).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Chips({ map }: { map: Record<string, number> }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([k, v]) => (
          <span key={k} className="chip">
            {k} <b className="num">{v}</b>
          </span>
        ))}
    </div>
  );
}

function AgentPanel({ id }: { id: string }) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const def = idx.agents.get(id);
  const rt = g.state.agents[id];
  const task = rt?.currentTaskId ? g.state.tasks[rt.currentTaskId] : undefined;
  const lastTasks = useMemo(
    () =>
      Object.values(g.state.tasks)
        .filter((t) => t.agentId === id && t.id !== task?.id)
        .sort((a, b) => (b.endedAt ?? b.createdAt) - (a.endedAt ?? a.createdAt))
        .slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, g.now, id, task?.id],
  );
  const events = useEntityEvents((e) => e.actor?.id === id);
  const pending = Object.values(g.state.decisions).filter((d) => d.status === 'pending' && (d.proposedBy === id || def?.departmentIds.includes(d.departmentId ?? '')));
  if (!def) return <p>Agent inconnu du catalogue.</p>;
  const nature = rt?.nature ?? g.sources[0]?.nature ?? 'unavailable';
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
        {rt ? <StatusPill status={rt.status} /> : <span className="pill">Aucune activité enregistrée</span>}
        <span className="pill">{KIND_LABEL[def.kind]}</span>
        <NatureBadge nature={nature} />
      </div>
      <dl className="kv">
        <dt>Fonction</dt>
        <dd>{def.role}</dd>
        <dt>Département(s)</dt>
        <dd>{def.departmentIds.map((d) => idx.departments.get(d)?.name ?? d).join(', ') || '—'}</dd>
        {rt && (
          <>
            <dt>Depuis</dt>
            <dd>{fmtRelative(rt.statusSince, g.now)}</dd>
          </>
        )}
        {rt?.collaboratingWith && (
          <>
            <dt>Collabore avec</dt>
            <dd>{idx.agents.get(rt.collaboratingWith)?.name ?? rt.collaboratingWith}</dd>
          </>
        )}
      </dl>
      {def.kind !== 'llm' && def.kind !== 'human' && (
        <p className="t-small t-muted" style={{ marginTop: 8 }}>
          Ce rôle est assuré par du code déterministe : aucun modèle n’est sollicité, aucun token consommé.
        </p>
      )}

      <h3 className="section-title">Mission actuelle</h3>
      {task ? (
        <>
          <TaskSummary task={task} />
          <h3 className="section-title">Actions</h3>
          <TaskActions task={task} />
        </>
      ) : (
        <p className="t-small t-muted">Aucune tâche en cours.</p>
      )}

      {rt && (
        <>
          <h3 className="section-title">Consommation cumulée (historique chargé)</h3>
          <UsageBlock u={rt} nature={nature} />
          {Object.keys(rt.tools).length > 0 && (
            <>
              <h3 className="section-title">Outils mobilisés</h3>
              <Chips map={rt.tools} />
            </>
          )}
          {Object.keys(rt.skills).length > 0 && (
            <>
              <h3 className="section-title">Skills utilisés</h3>
              <Chips map={rt.skills} />
            </>
          )}
          <dl className="kv" style={{ marginTop: 10 }}>
            <dt>Tâches terminées</dt>
            <dd className="num">{rt.tasksDone}</dd>
            <dt>Erreurs</dt>
            <dd className="num">{rt.errors}</dd>
          </dl>
        </>
      )}

      {pending.length > 0 && (
        <>
          <h3 className="section-title">Autorisations attendues</h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {pending.map((d) => (
              <li key={d.id}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => ui.set({ drawer: 'decisions' })}>
                  {d.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {lastTasks.length > 0 && (
        <>
          <h3 className="section-title">Résultats récents</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {lastTasks.map((t) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: '0.86rem' }}>
                <button type="button" className="btn btn--ghost btn--sm" style={{ justifyContent: 'flex-start', minWidth: 0, overflow: 'hidden' }} onClick={() => ui.set({ selection: { kind: 'task', id: t.id } })}>
                  {t.title}
                </button>
                <span className="t-muted" style={{ whiteSpace: 'nowrap' }}>
                  {TASK_STATUS[t.status]}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="section-title">Journal d’activité</h3>
      <Log events={events} />
      <p className="t-micro t-muted" style={{ marginTop: 12 }}>
        Résumés opérationnels issus des événements enregistrés. Le raisonnement interne des modèles n’est ni collecté ni affiché.
      </p>
    </div>
  );
}

function TaskPanel({ id }: { id: string }) {
  const g = useGovernor();
  const task = g.state.tasks[id];
  const events = useEntityEvents((e) => e.taskId === id, 20);
  if (!task) return <p>Tâche introuvable à cet instant de la chronologie.</p>;
  return (
    <div>
      <TaskSummary task={task} />
      <h3 className="section-title">Consommation</h3>
      <UsageBlock u={task} nature={task.nature} />
      <h3 className="section-title">Actions</h3>
      <TaskActions task={task} />
      <h3 className="section-title">Journal</h3>
      <Log events={events} />
    </div>
  );
}

function DepartmentPanel({ id }: { id: string }) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const d = idx.departments.get(id);
  const events = useEntityEvents((e) => e.department === id);
  if (!d) return <p>Département inconnu.</p>;
  const tasks = Object.values(g.state.tasks).filter((t) => t.departmentId === id);
  const running = tasks.filter((t) => t.status === 'running' || t.status === 'paused');
  const pending = tasks.filter((t) => t.status === 'pending');
  const engines = d.engineIds.map((e) => idx.agents.get(e)).filter(Boolean);
  const shared = engines.filter((a) => a!.departmentIds.length > 1);
  return (
    <div>
      <p>{d.mission}</p>
      <dl className="kv">
        <dt>Groupe</dt>
        <dd>{d.group}</dd>
        <dt>Moteur(s)</dt>
        <dd>
          {engines.map((a) => (
            <button key={a!.id} type="button" className="btn btn--ghost btn--sm" onClick={() => ui.set({ selection: { kind: 'agent', id: a!.id } })}>
              {a!.name} · {KIND_LABEL[a!.kind]}
            </button>
          ))}
        </dd>
        <dt>Tâches en cours</dt>
        <dd className="num">{running.length}</dd>
        <dt>En attente</dt>
        <dd className="num">{pending.length}</dd>
      </dl>
      {shared.length > 0 && (
        <p className="t-small t-muted" style={{ marginTop: 8 }}>
          Département fonctionnel : son moteur est partagé avec d’autres départements, aucun agent permanent n’est créé pour lui.
        </p>
      )}
      {running.length > 0 && (
        <>
          <h3 className="section-title">En cours</h3>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {running.map((t) => (
              <li key={t.id}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => ui.set({ selection: { kind: 'task', id: t.id } })}>
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <h3 className="section-title">Journal du département</h3>
      <Log events={events} />
    </div>
  );
}

function NodePanel({ id }: { id: string }) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const n = idx.nodes.get(id);
  const conn = g.state.connectors[id];
  const flows = useMemo(() => recentFlows(g.windowEvents(g.now - 3_600_000, g.now), g.now, 3_600_000).filter((f) => f.from === id || f.to === id), [g, id]);
  const incoming = g.catalog.edges.filter((e) => e.to === id);
  const outgoing = g.catalog.edges.filter((e) => e.from === id);
  if (!n) return <p>Composant inconnu.</p>;
  const label = (x: string) => idx.nodes.get(x)?.label ?? idx.agents.get(x)?.name ?? x;
  return (
    <div>
      <dl className="kv">
        <dt>Type</dt>
        <dd>{n.kind}</dd>
        <dt>Couche</dt>
        <dd>{n.layer}</dd>
        {n.provider && (
          <>
            <dt>Fournisseur</dt>
            <dd>{n.provider}</dd>
          </>
        )}
        <dt>Observabilité</dt>
        <dd>{n.visibility === 'full' ? 'Complète' : n.visibility === 'partial' ? 'Partielle (appels visibles, contenu non)' : 'Aucune'}</dd>
        {conn && (
          <>
            <dt>État du connecteur</dt>
            <dd>{conn.status}</dd>
          </>
        )}
        <dt>Échanges (1 h)</dt>
        <dd className="num">{flows.length}</dd>
      </dl>
      {n.note && <Notice icon={<IconInfo size={16} />}>{n.note}</Notice>}
      {n.visibility === 'none' && (
        <Notice tone="warn" icon={<IconInfo size={16} />}>
          Aucune donnée n’est collectée pour ce composant. Rien n’est affiché ni estimé à sa place.
        </Notice>
      )}
      <h3 className="section-title">Dépendances déclarées</h3>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem' }}>
        {incoming.map((e) => (
          <li key={`i${e.from}${e.kind}`}>
            {label(e.from)} → ici ({e.kind})
          </li>
        ))}
        {outgoing.map((e) => (
          <li key={`o${e.to}${e.kind}`}>
            ici → {label(e.to)} ({e.kind})
          </li>
        ))}
        {!incoming.length && !outgoing.length && <li>Aucune</li>}
      </ul>
    </div>
  );
}

function FlowPanel({ id }: { id: string }) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const [from, to] = id.split('>');
  const flows = useMemo(() => recentFlows(g.windowEvents(g.now - 3_600_000, g.now), g.now, 3_600_000).filter((f) => f.from === from && f.to === to), [g, from, to]);
  const label = (x: string) => idx.nodes.get(x)?.label ?? idx.agents.get(x)?.name ?? x;
  const last = flows[0];
  const failed = flows.filter((f) => f.status === 'failed').length;
  const tokens = flows.reduce((s, f) => s + (f.tokens ?? 0), 0);
  const lat = flows.filter((f) => f.latencyMs != null);
  return (
    <div>
      <dl className="kv">
        <dt>Origine</dt>
        <dd>{label(from)}</dd>
        <dt>Destination</dt>
        <dd>{label(to)}</dd>
        <dt>Nature</dt>
        <dd>{last ? [...new Set(flows.map((f) => f.kind))].join(', ') : '—'}</dd>
        <dt>Statut</dt>
        <dd>{last ? (last.status === 'failed' ? 'Dernier échange en échec' : 'Opérationnel') : 'Aucun échange sur la dernière heure'}</dd>
        <dt>Échanges (1 h)</dt>
        <dd className="num">
          {flows.length} {failed ? `dont ${failed} en échec` : ''}
        </dd>
        {tokens > 0 && (
          <>
            <dt>Tokens transportés</dt>
            <dd className="num">{fmtCompact(tokens)}</dd>
          </>
        )}
        {lat.length > 0 && (
          <>
            <dt>Latence moyenne</dt>
            <dd className="num">{fmtDuration(lat.reduce((s, f) => s + (f.latencyMs ?? 0), 0) / lat.length)}</dd>
          </>
        )}
        {last && (
          <>
            <dt>Dernier échange</dt>
            <dd className="num">{fmtTime(last.ts, true)}</dd>
            <dt>Données</dt>
            <dd>
              <NatureBadge nature={last.nature} />
            </dd>
          </>
        )}
      </dl>
      <Notice icon={<IconInfo size={16} />}>Seules les métadonnées des échanges sont affichées. Clés, secrets et contenus ne transitent jamais par l’interface.</Notice>
    </div>
  );
}
