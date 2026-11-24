/** Content of the glass windows (orders, activity, agents, notifications). */
import { useMemo, useState } from 'react';
import {
  displaySummary, fmtCompact, fmtInt, fmtPct, fmtRelative, fmtUsd, STATUS_LABEL, sumUsage,
  type AgentDef, type AgentStatus, type DataNature, type GovernorSnapshot, type HostApi, type TaskRuntime,
} from '@sdk';
import { IconAlert, IconBell, IconDecision, IconInfo, IconSearch, NatureBadge } from '@ds';
import { AgentAvatar } from './avatar';

export const ACTIVE = new Set<AgentStatus>(['working', 'collaborating', 'researching', 'validating']);
type Idx = { agents: Map<string, AgentDef>; departments: Map<string, { id: string; name: string }> };

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const TASK_STATUS: Record<TaskRuntime['status'], { label: string; tone: string }> = {
  running: { label: 'En cours', tone: 'working' },
  paused: { label: 'Suspendue', tone: 'paused' },
  pending: { label: 'En file', tone: 'waiting' },
  succeeded: { label: 'Livrée', tone: 'validating' },
  failed: { label: 'Échouée', tone: 'error' },
  cancelled: { label: 'Annulée', tone: 'idle' },
};
const RANK: Record<TaskRuntime['status'], number> = { running: 0, paused: 1, pending: 2, failed: 3, succeeded: 4, cancelled: 5 };

export function OrdersWindow({ g, idx, host }: { g: GovernorSnapshot; idx: Idx; host: HostApi }) {
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<'all' | 'open'>('all');
  const today = startOfDay(g.now);
  const tasks = useMemo(
    () => Object.values(g.state.tasks).filter((t) => t.createdAt >= today && t.createdAt <= g.now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, today],
  );
  const list = tasks
    .filter((t) => (scope === 'all' || t.status === 'running' || t.status === 'pending' || t.status === 'paused') && (!q || t.title.toLocaleLowerCase('fr').includes(q.toLocaleLowerCase('fr'))))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || (b.endedAt ?? b.startedAt ?? b.createdAt) - (a.endedAt ?? a.startedAt ?? a.createdAt))
    .slice(0, 60);
  const open = tasks.filter((t) => t.status === 'running' || t.status === 'pending' || t.status === 'paused').length;
  return (
    <div className="vz-orders">
      <div className="vz-orders__tools">
        <label className="vz-search">
          <IconSearch size={15} />
          <span className="sr-only">Rechercher une commande</span>
          <input type="search" placeholder="Rechercher une commande" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="vz-tabs" role="group" aria-label="Commandes affichées">
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
            Toutes <span>{tasks.length}</span>
          </button>
          <button type="button" aria-pressed={scope === 'open'} onClick={() => setScope('open')}>
            Ouvertes <span>{open}</span>
          </button>
        </div>
      </div>
      <div className="vz-orders__head" aria-hidden>
        <span>N°</span>
        <span>Commande · itinéraire</span>
        <span>État</span>
      </div>
      {list.length ? (
        <ul className="vz-orders__list">
          {list.map((t) => {
            const st = TASK_STATUS[t.status];
            return (
              <li key={t.id}>
                <button type="button" className="vz-order" onClick={() => host.select({ kind: 'task', id: t.id })} aria-label={`${t.title} — ${st.label}, inspecter`}>
                  <span className="vz-order__id num">#{t.id.replace(/^\D+/, '').slice(-4)}</span>
                  <span className="vz-order__txt">
                    <b>{t.title}</b>
                    <small>
                      {idx.departments.get(t.departmentId ?? '')?.name ?? '—'} → {idx.agents.get(t.agentId ?? '')?.name ?? t.agentId ?? '—'}
                    </small>
                  </span>
                  <span className="vz-order__st" style={{ ['--sc' as string]: `var(--st-${st.tone})` }}>
                    <i aria-hidden />
                    {st.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="vz-empty">{q ? 'Aucune commande ne correspond.' : 'Aucune commande aujourd’hui.'}</p>
      )}
    </div>
  );
}

export function ActivityWindow({ g }: { g: GovernorSnapshot }) {
  const minute = Math.floor(g.now / 30_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const u = useMemo(() => sumUsage(g.windowEvents(startOfDay(g.now), g.now)), [g.version, minute, g.filters]);
  const cost = u.costEstimated + u.costMeasured;
  const tokens = u.tokensIn + u.tokensOut + u.cacheRead + u.cacheWrite;
  const cache = u.tokensIn + u.cacheRead > 0 ? u.cacheRead / (u.tokensIn + u.cacheRead) : null;
  const finished = u.tasksDone + u.tasksFailed;
  const nature: DataNature = g.hasDemo ? 'demo' : u.costMeasured > 0 ? 'real' : 'estimated';
  return (
    <div className="vz-act">
      <div className="vz-kpi vz-kpi--hero">
        <span>Coût du jour</span>
        <b className="num">{fmtUsd(cost)}</b>
        <small title={u.costMeasured > 0 ? 'Coût facturé' : 'Estimé au prix catalogue'}>{u.costMeasured > 0 ? 'facturé' : 'estimé'}</small>
      </div>
      <div className="vz-kpi">
        <span>Tokens</span>
        <b className="num">{fmtCompact(tokens)}</b>
        <small>{cache != null ? `${fmtPct(cache)} en cache` : 'cache indisponible'}</small>
      </div>
      <div className="vz-kpi">
        <span>Tâches livrées</span>
        <b className="num">{fmtInt(u.tasksDone)}</b>
        <small>{finished ? `${fmtPct(u.tasksDone / finished)} réussies` : 'aucune terminée'}</small>
      </div>
      <div className="vz-kpi" data-bad={u.errors > 0 ? 'true' : undefined}>
        <span>Erreurs</span>
        <b className="num">{fmtInt(u.errors)}</b>
        <small>{fmtInt(u.llmCalls + u.toolCalls)} appels</small>
      </div>
      <div className="vz-act__nat">
        <NatureBadge nature={nature} />
        <span>depuis minuit</span>
      </div>
    </div>
  );
}

export function AgentsWindow({ g, host, motion }: { g: GovernorSnapshot; host: HostApi; motion: boolean }) {
  const agents = g.catalog.agents.filter((a) => a.kind !== 'human');
  const st = (a: AgentDef): AgentStatus | null => g.state.agents[a.id]?.status ?? null;
  const active = agents.filter((a) => {
    const s = st(a);
    return s && ACTIVE.has(s);
  });
  const stack = active.slice(0, 5);
  return (
    <div className="vz-agents">
      <div className="vz-agents__top">
        <div className="vz-stack" aria-hidden>
          {stack.map((a) => (
            <AgentAvatar key={a.id} def={a} kind={a.kind} status={st(a)} size={34} />
          ))}
          {active.length > stack.length && <span className="vz-stack__more">+{active.length - stack.length}</span>}
          {!active.length && <span className="vz-stack__more">0</span>}
        </div>
        <div className="vz-agents__count">
          <b className="num">{active.length}</b>
          <span>
            agent{active.length > 1 ? 's' : ''} actif{active.length > 1 ? 's' : ''}
            <br />
            sur {agents.length}
          </span>
        </div>
        <NatureBadge nature={g.hasDemo ? 'demo' : 'real'} />
      </div>
      <ul className="vz-agents__grid">
        {agents.map((a) => {
          const s = st(a);
          const rt = g.state.agents[a.id];
          const task = rt?.currentTaskId ? g.state.tasks[rt.currentTaskId] : undefined;
          return (
            <li key={a.id}>
              <button type="button" className="vz-agent" onClick={() => host.select({ kind: 'agent', id: a.id })} aria-label={`${a.name} : ${s ? STATUS_LABEL[s] : 'statut non observé'}${task ? `, ${task.title}` : ''}`} title={task?.title}>
                <AgentAvatar def={a} kind={a.kind} status={s} size={26} pulse={motion && !!s && ACTIVE.has(s)} />
                <span>
                  <b>{a.name}</b>
                  <small>{s ? STATUS_LABEL[s] : 'Non observé'}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface Notif {
  id: string;
  ts: number;
  kind: 'decision' | 'incident' | 'connector' | 'update';
  title: string;
  sub: string;
  nature: DataNature;
}

export function notifications(g: GovernorSnapshot): Notif[] {
  const out: Notif[] = [];
  for (const d of Object.values(g.state.decisions)) if (d.status === 'pending') out.push({ id: d.id, ts: d.proposedAt, kind: 'decision', title: d.title, sub: 'Décision à arbitrer', nature: d.nature });
  for (const i of Object.values(g.state.incidents))
    if (i.state === 'open') out.push({ id: i.id, ts: i.ts, kind: 'incident', title: displaySummary({ summary: i.summary, confidentiality: 'confidential' }, g.canViewConfidential), sub: `Sécurité · gravité ${i.severity === 'high' || i.severity === 'critical' ? 'élevée' : i.severity === 'medium' ? 'moyenne' : 'faible'}`, nature: i.nature });
  for (const c of Object.values(g.state.connectors))
    if (c.status !== 'connected') out.push({ id: c.id, ts: c.since, kind: 'connector', title: `${c.name} : ${c.status === 'degraded' ? 'dégradé' : c.status === 'auth-required' ? 'authentification requise' : 'déconnecté'}`, sub: 'Connecteur', nature: c.nature });
  for (const u of [...g.state.feed.updates, ...g.state.feed.recommendations].slice(-4)) out.push({ id: u.id, ts: u.ts, kind: 'update', title: displaySummary(u, g.canViewConfidential), sub: u.type === 'recommendation' ? 'Recommandation' : 'Mise à jour détectée', nature: u.nature });
  const rank = { incident: 0, decision: 1, connector: 2, update: 3 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind] || b.ts - a.ts);
}

export function NotificationsWindow({ items, now, host }: { items: Notif[]; now: number; host: HostApi }) {
  if (!items.length) return <p className="vz-empty">Aucune notification. Tout est calme.</p>;
  return (
    <ul className="vz-notifs">
      {items.map((n) => {
        const Icon = n.kind === 'decision' ? IconDecision : n.kind === 'incident' ? IconAlert : n.kind === 'connector' ? IconBell : IconInfo;
        const inner = (
          <>
            <span className="vz-notif__icon" data-kind={n.kind} aria-hidden>
              <Icon size={15} />
            </span>
            <span className="vz-notif__txt">
              <b>{n.title}</b>
              <small>
                {n.sub} · {fmtRelative(n.ts, now)}
              </small>
            </span>
          </>
        );
        return (
          <li key={`${n.kind}-${n.id}`}>
            {n.kind === 'decision' ? (
              <button type="button" className="vz-notif" onClick={() => host.openDecisions()} aria-label={`${n.title} — ouvrir les décisions`}>
                {inner}
              </button>
            ) : (
              <div className="vz-notif">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
