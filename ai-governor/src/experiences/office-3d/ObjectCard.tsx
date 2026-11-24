/**
 * Floating glass card of an object (agent, station, board…): name, type,
 * status, current task, consumption with its nature, action buttons.
 * Desktop: anchored next to the object. Phone: bottom sheet.
 */
import type { ReactNode } from 'react';
import { IconClose, NatureBadge, StatusPill } from '@ds';
import { hueCss, type PickSelection } from '@ds/three';
import { STATUS_LABEL, fmtCompact, fmtRelative, fmtUsd, modelLabel, type AgentStatus, type Catalog, type FlowView, type GovernorState } from '@sdk';
import { KIND_LABEL, agentUsage, aggregateStatus, departmentUsage, type PlacementReason } from './data';
import type { RadialAction } from './RadialMenu';

export interface CardInfo {
  title: string;
  type: string;
  status: AgentStatus | null;
  hue?: number;
  rows: Array<{ k: string; v: ReactNode }>;
}

export function describeTarget(
  sel: PickSelection, state: GovernorState, catalog: Catalog, now: number, hasDemo: boolean, flows: FlowView[], placeOf: (id: string) => { dept?: string; reason: PlacementReason } | undefined,
): CardInfo | null {
  if (sel.kind === 'agent') {
    const a = catalog.agents.find((x) => x.id === sel.id);
    if (!a) return null;
    const rt = state.agents[a.id];
    const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
    const u = agentUsage(state, a.id, hasDemo);
    const pl = placeOf(a.id);
    const dept = catalog.departments.find((d) => d.id === (pl?.dept ?? a.departmentIds[0]));
    return {
      title: a.name,
      type: a.kind === 'llm' ? `${KIND_LABEL[a.kind]} · ${modelLabel(rt?.model ?? a.model)}` : KIND_LABEL[a.kind],
      status: a.kind === 'human' ? null : rt?.status ?? 'idle',
      hue: a.avatar.hue,
      rows: [
        { k: 'Tâche en cours', v: task ? task.title : <span className="t-muted">Aucune</span> },
        { k: 'Emplacement', v: pl?.reason === 'lounge' ? 'Salon (disponible)' : `${dept?.name ?? '—'}${pl?.reason === 'task' ? ' · pour sa tâche' : ''}` },
        {
          k: 'Consommation',
          v:
            a.kind === 'human' ? (
              <span className="t-muted">Sans objet</span>
            ) : u && (u.tokens || u.costUsd) ? (
              <span className="o3-usage">
                {fmtCompact(u.tokens)} tokens · {fmtUsd(u.costUsd)} <NatureBadge nature={u.nature} />
              </span>
            ) : a.kind === 'llm' ? (
              <span className="o3-usage">
                Aucune sur la période <NatureBadge nature={hasDemo ? 'demo' : 'real'} />
              </span>
            ) : (
              <span className="o3-usage">
                Aucun appel de modèle <NatureBadge nature={hasDemo ? 'demo' : 'real'} />
              </span>
            ),
        },
        { k: 'Activité', v: rt?.lastEventTs ? `dernier événement ${fmtRelative(rt.lastEventTs, now)}` : <span className="t-muted">Aucun événement</span> },
      ],
    };
  }
  if (sel.kind === 'department') {
    const d = catalog.departments.find((x) => x.id === sel.id);
    if (!d) return { title: sel.id, type: 'Poste', status: null, rows: [{ k: 'Liaison', v: 'Département absent du catalogue actif' }] };
    const open = Object.values(state.tasks).filter((t) => t.departmentId === d.id);
    const running = open.filter((t) => t.status === 'running');
    const pending = open.filter((t) => t.status === 'pending').length;
    const u = departmentUsage(state, d.id, hasDemo);
    const decisions = Object.values(state.decisions).filter((x) => x.status === 'pending' && x.departmentId === d.id).length;
    const engines = d.engineIds.map((id) => catalog.agents.find((a) => a.id === id)?.name).filter(Boolean).join(' · ');
    return {
      title: d.name,
      type: d.mission,
      status: aggregateStatus(state, d.engineIds),
      rows: [
        { k: 'Moteurs', v: engines || '—' },
        { k: 'Tâche en cours', v: running[0] ? `${running[0].title}${running.length > 1 ? ` (+${running.length - 1})` : ''}` : <span className="t-muted">Aucune · {pending} en file</span> },
        {
          k: 'Consommation',
          v: u.tokens || u.costUsd ? (
            <span className="o3-usage">
              {fmtCompact(u.tokens)} tokens · {fmtUsd(u.costUsd)} <NatureBadge nature={u.nature} />
            </span>
          ) : (
            <span className="o3-usage">
              Aucune sur la période <NatureBadge nature={u.nature} />
            </span>
          ),
        },
        { k: 'Décisions', v: decisions ? `${decisions} en attente` : 'Aucune en attente' },
      ],
    };
  }
  const n = catalog.nodes.find((x) => x.id === sel.id);
  if (!n) return null;
  if (n.kind === 'queue' && n.id === 'task-queue') {
    const tasks = Object.values(state.tasks);
    const c = (s: string) => tasks.filter((t) => t.status === s).length;
    return {
      title: n.label,
      type: 'Mur kanban · file d’attente',
      status: c('running') ? 'working' : 'idle',
      rows: [
        { k: 'À faire', v: String(c('pending')) },
        { k: 'En cours', v: String(c('running')) },
        { k: 'En pause', v: String(c('paused')) },
        { k: 'Consommation', v: <span className="t-muted">Sans objet (file, aucun appel de modèle)</span> },
      ],
    };
  }
  const touching = flows.filter((f) => f.to === n.id || f.from === n.id || (n.kind === 'provider' && f.kind === 'requête modèle'));
  const tokens = touching.reduce((s, f) => s + (f.tokens ?? 0), 0);
  return {
    title: n.label,
    type: n.kind === 'provider' ? 'Salle des modèles · fournisseur' : `Nœud ${n.kind}`,
    status: n.visibility === 'none' ? 'offline' : touching.length ? 'working' : 'idle',
    rows: [
      { k: 'Observabilité', v: n.visibility === 'full' ? 'Complète' : n.visibility === 'partial' ? 'Partielle' : 'Aucune (non observable)' },
      {
        k: 'Échanges · 10 min',
        v:
          n.visibility === 'none' ? (
            <span className="o3-usage">
              Indisponible <NatureBadge nature="unavailable" />
            </span>
          ) : (
            <span className="o3-usage">
              {touching.length} · {fmtCompact(tokens)} tokens <NatureBadge nature={hasDemo ? 'demo' : 'real'} />
            </span>
          ),
      },
      ...(n.note ? [{ k: 'Note', v: n.note }] : []),
    ],
  };
}

export function ObjectCard({ info, actions, onClose, sheet }: { info: CardInfo; actions: RadialAction[]; onClose: () => void; sheet?: boolean }) {
  return (
    <section className={`o3-card ${sheet ? "o3-card--sheet" : ""}`} role="region" aria-label={`Fiche : ${info.title}`}>
      {sheet && <div className="o3-card__grip" aria-hidden />}
      <header className="o3-card__head">
        {info.hue != null ? (
          <span className="o3-avatar" style={{ ['--hue' as string]: hueCss(info.hue) }} aria-hidden>
            {info.title[0]}
          </span>
        ) : (
          <span className="o3-avatar o3-avatar--prim" aria-hidden />
        )}
        <div className="o3-card__titles">
          <h2>{info.title}</h2>
          <p>{info.type}</p>
        </div>
        <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={onClose} aria-label={`Fermer la fiche ${info.title}`}>
          <IconClose size={14} />
        </button>
      </header>
      {info.status && (
        <div className="o3-card__status">
          <StatusPill status={info.status} />
          <span className="sr-only">{STATUS_LABEL[info.status]}</span>
        </div>
      )}
      <dl className="o3-card__kv">
        {info.rows.map((r) => (
          <div key={r.k}>
            <dt>{r.k}</dt>
            <dd>{r.v}</dd>
          </div>
        ))}
      </dl>
      <div className="o3-card__actions">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`o3-act ${a.tone === 'accent' ? 'o3-act--accent' : ''}`}
            disabled={!!a.disabled}
            title={a.disabled ? `${a.label} — ${a.disabled}` : a.label}
            onClick={(e) => a.run(e.detail === 0 ? 'keyboard' : 'click')}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
