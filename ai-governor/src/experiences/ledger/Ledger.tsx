/**
 * Experience 05 — Journal opérationnel.
 * Added as a plain folder + one registry entry, with no change to core/,
 * engine/ or shell/: the proof that a fifth interface plugs into the same
 * data, events, permissions and selection.
 */
import { useMemo, useState } from 'react';
import { displaySummary, fmtTime, useCatalogIndex, useGovernor, type ExperienceProps, type GovEvent } from '@sdk';
import { NatureBadge } from '@ds';
import './ledger.css';

const LOW_SIGNAL = new Set<GovEvent['type']>(['flow', 'agent.state', 'tool.call', 'llm.call', 'quality.check', 'quota.updated']);
const TYPE_LABEL: Partial<Record<GovEvent['type'], string>> = {
  'task.created': 'Tâche créée', 'task.started': 'Tâche démarrée', 'task.completed': 'Tâche terminée', 'task.failed': 'Tâche échouée',
  'task.paused': 'Tâche suspendue', 'task.resumed': 'Tâche reprise', 'task.priority': 'Priorité modifiée', 'decision.proposed': 'Proposition',
  'decision.resolved': 'Arbitrage', 'security.incident': 'Sécurité', 'optimization.applied': 'Optimisation', 'config.changed': 'Configuration',
  'skill.installed': 'Skill installé', 'skill.updated': 'Skill amélioré', 'skill.disabled': 'Skill désactivé', 'connector.status': 'Connecteur',
  'update.detected': 'Mise à jour', recommendation: 'Recommandation', 'automation.run': 'Automatisation', 'llm.call': 'Appel modèle',
  'tool.call': 'Appel outil', 'agent.state': 'État d’agent', flow: 'Flux', 'quality.check': 'Contrôle qualité', 'quota.updated': 'Quota',
};

const PAGE = 120;

export default function Ledger({ config, host }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const [limit, setLimit] = useState(PAGE);
  const groupBy = (config.groupBy as string) ?? 'time';
  const events = g.rangeEvents();
  const rows = useMemo(() => {
    const out: GovEvent[] = [];
    for (let i = events.length - 1; i >= 0 && out.length < limit; i--) {
      const e = events[i];
      if (!config.showLowSignal && LOW_SIGNAL.has(e.type) && e.status !== 'failed') continue;
      if (e.type === 'task.created' || e.type === 'task.started') if (!config.showLowSignal) continue;
      out.push(e);
    }
    return out;
  }, [events, limit, config.showLowSignal]);

  const groups = useMemo(() => {
    const m = new Map<string, GovEvent[]>();
    for (const e of rows) {
      const k =
        groupBy === 'department'
          ? idx.departments.get(e.department ?? '')?.name ?? 'Sans département'
          : groupBy === 'agent'
            ? idx.agents.get(e.actor?.id ?? '')?.name ?? (e.origin.kind === 'user' ? 'Vous' : 'Système')
            : new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit' }).format(e.ts) + ' h';
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return [...m.entries()];
  }, [rows, groupBy, idx]);

  return (
    <div className="ledger">
      <div className="ledger__inner">
        <header className="ledger__head">
          <h1 className="t-h1">Journal opérationnel</h1>
          <p className="t-small t-muted">
            {rows.length} entrée(s) sur la période{config.showLowSignal ? '' : ', événements techniques masqués (sauf échecs)'}.
          </p>
        </header>
        {!groups.length && <p className="empty">Aucun événement sur la période et les filtres choisis.</p>}
        {groups.map(([k, list]) => (
          <section key={k} className="ledger__group" aria-label={k}>
            <h2 className="ledger__gh">{k}</h2>
            <ol className="ledger__list">
              {list.map((e) => {
                const agent = e.actor ? idx.agents.get(e.actor.id) : undefined;
                const failed = e.status === 'failed';
                return (
                  <li key={e.id} className="ledger__row" data-failed={failed || undefined} data-selected={g.selection?.id === agent?.id || undefined}>
                    <span className="num t-muted ledger__time">{fmtTime(e.ts)}</span>
                    <span className="ledger__type">{TYPE_LABEL[e.type] ?? e.type}</span>
                    <span className="ledger__text">
                      {failed && <span className="sr-only">Échec : </span>}
                      {displaySummary(e, g.canViewConfidential) || TYPE_LABEL[e.type]}
                      {agent && (
                        <>
                          {' '}
                          <button type="button" className="ledger__who" onClick={() => host.select({ kind: 'agent', id: agent.id })}>
                            {agent.name}
                          </button>
                        </>
                      )}
                    </span>
                    <NatureBadge nature={e.nature} />
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {rows.length >= limit && (
          <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE)}>
            Afficher plus
          </button>
        )}
      </div>
    </div>
  );
}
