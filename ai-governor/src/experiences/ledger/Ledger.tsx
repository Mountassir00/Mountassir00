/**
 * Experience 05 — Journal opérationnel (transactions-style feed).
 * Added as a plain folder + one registry entry, with no change to core/,
 * engine/ or shell/: the proof that another interface plugs into the same
 * data, events, permissions and selection.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { displaySummary, fmtCompact, fmtTime, fmtUsd, useCatalogIndex, useGovernor, type ExperienceProps, type GovEvent } from '@sdk';
import { NatureBadge } from '@ds';
import { CATEGORY_ICON, type Cat } from './glyphs';
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

const CATS: Array<{ id: Cat | 'all'; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'tasks', label: 'Tâches' },
  { id: 'decisions', label: 'Décisions' },
  { id: 'security', label: 'Sécurité' },
  { id: 'optimization', label: 'Optimisations' },
  { id: 'skills', label: 'Skills' },
  { id: 'connectors', label: 'Connecteurs' },
];

function catOf(t: GovEvent['type']): Cat {
  if (t.startsWith('task.') || t === 'agent.state') return 'tasks';
  if (t.startsWith('decision.')) return 'decisions';
  if (t === 'security.incident') return 'security';
  if (t === 'optimization.applied' || t === 'quota.updated') return 'optimization';
  if (t.startsWith('skill.')) return 'skills';
  if (t === 'connector.status') return 'connectors';
  if (t === 'llm.call' || t === 'tool.call' || t === 'flow') return 'calls';
  return 'other';
}

const PAGE = 120;
const DAY = 86_400_000;

function dayLabel(ts: number, now: number) {
  const d = new Date(ts);
  const n = new Date(now);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(n) - start(d)) / DAY);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(ts);
}

function statusOf(e: GovEvent): { label: string; tone: 'up' | 'down' | 'accent' | 'neutral' } | null {
  if (e.status === 'failed') return { label: 'Échec', tone: 'down' };
  if (e.type === 'task.completed' || e.type === 'skill.installed' || e.type === 'skill.updated') return { label: 'Terminé', tone: 'up' };
  if (e.type === 'decision.resolved') return { label: String(e.attrs?.verdict ?? '').toUpperCase() || 'Arbitré', tone: e.attrs?.verdict === 'nogo' ? 'down' : 'up' };
  if (e.type === 'decision.proposed') return { label: 'À arbitrer', tone: 'accent' };
  if (e.type === 'security.incident') return e.attrs?.state === 'resolved' ? { label: 'Résolu', tone: 'up' } : { label: 'Ouvert', tone: 'down' };
  if (e.type === 'task.started' || e.type === 'task.resumed') return { label: 'En cours', tone: 'accent' };
  if (e.type === 'task.paused') return { label: 'Suspendu', tone: 'neutral' };
  return null;
}

export default function Ledger({ config, host }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const [limit, setLimit] = useState(PAGE);
  const [cat, setCat] = useState<Cat | 'all'>('all');
  const groupBy = (config.groupBy as string) ?? 'time';
  const events = useMemo(() => g.rangeEvents(), [g.version, g.range.from, g.range.to, g.filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const out: GovEvent[] = [];
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (!config.showLowSignal && LOW_SIGNAL.has(e.type) && e.status !== 'failed') continue;
      if (!config.showLowSignal && (e.type === 'task.created' || e.type === 'task.started')) continue;
      out.push(e);
    }
    return out;
  }, [events, config.showLowSignal]);

  const counts = useMemo(() => {
    const c: Partial<Record<Cat | 'all', number>> = { all: visible.length };
    for (const e of visible) {
      const k = catOf(e.type);
      c[k] = (c[k] ?? 0) + 1;
    }
    return c;
  }, [visible]);

  const rows = useMemo(() => (cat === 'all' ? visible : visible.filter((e) => catOf(e.type) === cat)).slice(0, limit), [visible, cat, limit]);
  const total = cat === 'all' ? visible.length : counts[cat] ?? 0;

  const groups = useMemo(() => {
    const m = new Map<string, GovEvent[]>();
    for (const e of rows) {
      const k =
        groupBy === 'department'
          ? idx.departments.get(e.department ?? '')?.name ?? 'Sans département'
          : groupBy === 'agent'
            ? idx.agents.get(e.actor?.id ?? '')?.name ?? (e.origin.kind === 'user' ? 'Vous' : 'Système')
            : dayLabel(e.ts, g.now);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return [...m.entries()];
  }, [rows, groupBy, idx, g.now]);

  return (
    <div className="ledger">
      <div className="ledger__inner">
        <div className="ledger__filters" role="group" aria-label="Filtrer par catégorie">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="chip"
              aria-pressed={cat === c.id}
              onClick={() => {
                setCat(c.id);
                setLimit(PAGE);
              }}
            >
              {c.label}
              <span className="ledger__count num">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>
        <p className="ledger__summary t-small t-muted">
          {total} entrée(s) sur la période{config.showLowSignal ? '' : ' · événements techniques masqués, sauf échecs'}
        </p>

        {!groups.length && <div className="ledger__empty">Aucun événement pour cette catégorie, cette période et ces filtres.</div>}

        {groups.map(([k, list]) => (
          <section key={k} className="ledger__group" aria-label={k}>
            <h2 className="ledger__gh">
              <span>{k}</span>
              <span className="t-micro t-muted num">{list.length}</span>
            </h2>
            <ol className="ledger__list">
              {list.map((e) => {
                const agent = e.actor ? idx.agents.get(e.actor.id) : undefined;
                const dept = e.department ? idx.departments.get(e.department) : undefined;
                const c = catOf(e.type);
                const st = statusOf(e);
                const tokens = e.metrics ? (e.metrics.inputTokens ?? 0) + (e.metrics.outputTokens ?? 0) + (e.metrics.cacheReadTokens ?? 0) : 0;
                const summary = displaySummary(e, g.canViewConfidential) || TYPE_LABEL[e.type] || e.type;
                const selected = !!agent && g.selection?.kind === 'agent' && g.selection.id === agent.id;
                const body: ReactNode = (
                  <>
                    <span className="ledger__icon" data-cat={c} data-failed={e.status === 'failed' || undefined} aria-hidden>
                      {CATEGORY_ICON[c]}
                    </span>
                    <span className="ledger__text">
                      <b>{summary}</b>
                      <span>
                        <span className="num">{fmtTime(e.ts)}</span>
                        {` · ${TYPE_LABEL[e.type] ?? e.type}`}
                        {agent ? ` · ${agent.name}` : e.origin.kind === 'user' ? ' · Vous' : ''}
                        {dept && groupBy !== 'department' ? ` · ${dept.name}` : ''}
                      </span>
                    </span>
                    <span className="ledger__end">
                      {e.metrics?.costUsd ? (
                        <b className="num">{fmtUsd(e.metrics.costUsd, e.metrics.costUsd < 1 ? 3 : 2)}</b>
                      ) : tokens ? (
                        <b className="num">{fmtCompact(tokens)} tk</b>
                      ) : st ? (
                        <span className={`pill ${st.tone === 'up' ? 'pill--up' : st.tone === 'down' ? 'pill--down' : st.tone === 'accent' ? 'pill--accent' : ''}`}>{st.label}</span>
                      ) : null}
                      <NatureBadge nature={e.nature} />
                    </span>
                  </>
                );
                return (
                  <li key={e.id} className="ledger__item" data-selected={selected || undefined}>
                    {agent ? (
                      <button type="button" className="ledger__row" onClick={() => host.select({ kind: 'agent', id: agent.id })} aria-label={`${summary}, ${fmtTime(e.ts)}, ${agent.name}. Ouvrir l’inspecteur.`}>
                        {body}
                      </button>
                    ) : (
                      <div className="ledger__row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
        {rows.length >= limit && total > limit && (
          <button type="button" className="btn btn--raised ledger__more" onClick={() => setLimit((l) => l + PAGE)}>
            Afficher plus ({total - limit} restantes)
          </button>
        )}
      </div>
    </div>
  );
}
