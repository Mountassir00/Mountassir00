/**
 * Experience 01 — Control Center.
 * Every figure states its nature (measured, estimated, unavailable, demo).
 * A number that cannot be known from the active sources is shown as
 * "Indisponible" with the reason — never filled with a guess.
 */
import { useMemo, useState } from 'react';
import {
  beforeAfter, bucketize, byModel, fmtCompact, fmtDuration, fmtInt, fmtPct, fmtRelative, fmtTime, fmtUsd, modelLabel, natureMix, sumUsage,
  useCatalogIndex, useGovernor, PRICE_TABLE_SOURCE, type DataNature, type ExperienceProps, type TaskRuntime,
} from '@sdk';
import { BeforeAfterBars, HBars, Legend, LineArea, NatureBadge, Panel, Segmented, StackedColumns, StatusPill, type Series } from '@ds';
import './control-center.css';

const SERIES: Series[] = [
  { key: 'tokensIn', label: 'Entrée', color: 'var(--series-1)' },
  { key: 'tokensOut', label: 'Sortie', color: 'var(--series-2)' },
  { key: 'cacheRead', label: 'Lecture cache', color: 'var(--series-3)' },
  { key: 'cacheWrite', label: 'Écriture cache', color: 'var(--series-4)' },
];

type Kind = 'measured' | 'estimated' | 'unavailable';

export default function ControlCenter({ config, host, device }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const events = g.rangeEvents();
  const showEst = config.showEstimates !== false;
  const [tableView, setTableView] = useState(config.showTables === true);
  const [chart, setChart] = useState<'columns' | 'line'>((config.usageChart as 'columns' | 'line') ?? 'columns');

  const u = useMemo(() => sumUsage(events), [events]);
  const mix = useMemo(() => natureMix(events), [events]);
  const onlyDemo = (mix.demo ?? 0) > 0 && !mix.real;
  const hasBilling = g.sources.some((s) => s.id === 'anthropic-usage-api');
  /** Nature of a KPI given what kind of value it is and which sources fed it. */
  const nat = (k: Kind): DataNature => (k === 'unavailable' ? 'unavailable' : onlyDemo ? 'demo' : k === 'measured' ? 'real' : 'estimated');

  const buckets = useMemo(() => bucketize(events, g.range.from, g.range.to), [events, g.range.from, g.range.to]);
  const models = useMemo(() => byModel(events), [events]);
  const tasks = useMemo(() => Object.values(g.state.tasks), [g.state.tasks, g.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = tasks.filter((t) => t.status === 'running' || t.status === 'paused');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const decisions = Object.values(g.state.decisions).filter((d) => d.status === 'pending');
  const incidents = Object.values(g.state.incidents).sort((a, b) => b.ts - a.ts);
  const openIncidents = incidents.filter((i) => i.state === 'open');
  const skills = Object.values(g.state.skills);
  const connectors = Object.values(g.state.connectors);
  const quotas = Object.values(g.state.quotas);
  const processed = u.tokensIn + u.tokensOut + u.cacheRead + u.cacheWrite;
  const cacheShare = u.tokensIn + u.cacheRead > 0 ? u.cacheRead / (u.tokensIn + u.cacheRead) : null;

  const comparisons = useMemo(() => {
    const ms = g.state.feed.optimizations.filter((o) => o.attrs?.milestone).slice(-4).reverse();
    return ms.map((m) => {
      const scope = m.departmentId === 'tokens' ? { agent: 'governor' } : m.departmentId === 'routing' ? { agent: 'scout' } : m.departmentId === 'context' ? { agent: 'auditor' } : {};
      const list = 'agent' in scope ? tasks.filter((t) => t.agentId === scope.agent) : tasks;
      return { m, r: beforeAfter(list, m.ts, 5 * 86_400_000, m.summary), scope: 'agent' in scope ? idx.agents.get(scope.agent!)?.name : 'Toutes les tâches' };
    });
  }, [g.state.feed.optimizations, tasks, idx.agents]);

  const changes = useMemo(
    () => [...g.state.feed.changes, ...g.state.feed.interventions].sort((a, b) => b.ts - a.ts).slice(0, 8),
    [g.state.feed.changes, g.state.feed.interventions],
  );

  const span = g.range.to - g.range.from;
  const fmtX = (t: number) => (span > 2 * 86_400_000 ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(t) : new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(t));

  return (
    <div className="cc" data-density={config.density as string}>
      <div className="cc__inner">
        <header className="cc__head">
          <div>
            <h1 className="t-h1">Control Center</h1>
            <p className="t-small t-muted">
              {g.mode === 'replay' ? `État au ${fmtTime(g.now, true)}` : 'Période'} · {fmtTime(g.range.from, true)} → {fmtTime(g.range.to, true)} · {fmtInt(events.length)} événements
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {(Object.keys(mix) as DataNature[]).map((n) => (
              <NatureBadge key={n} nature={n} label={`${NATURE_SHORT[n]} ${fmtPct((mix[n] ?? 0) / Math.max(1, events.length))}`} />
            ))}
          </div>
        </header>

        <section className="cc-kpis" aria-label="Indicateurs clés">
          <Kpi hero label="Tokens traités" value={fmtCompact(processed)} sub={`${fmtCompact(u.tokensIn)} entrée · ${fmtCompact(u.tokensOut)} sortie`} nature={nat('measured')} />
          <Kpi label="Servis par le cache" value={fmtCompact(u.cacheRead)} sub={cacheShare != null ? `${fmtPct(cacheShare)} de l’entrée` : 'Aucune entrée'} nature={nat('measured')} />
          <Kpi label="Tokens évités (optimisations)" value={fmtCompact(u.tokensSaved)} sub={`${u.optimizations} optimisation(s) appliquée(s)`} nature={nat('estimated')} />
          <Kpi label="Dépenses réelles" value={hasBilling ? fmtUsd(u.costMeasured) : null} unavailable="Nécessite la source de facturation" nature={hasBilling ? nat('measured') : 'unavailable'} />
          <Kpi label="Coût estimé" value={showEst ? fmtUsd(u.costEstimated + u.costMeasured) : null} unavailable="Masqué (réglage)" sub="Tokens × prix catalogue" nature={nat('estimated')} />
          <Kpi label="Économies vérifiées" value={null} unavailable={hasBilling ? 'Aucune optimisation vérifiée' : 'Indisponible : aucune facture rapprochée'} nature="unavailable" />
          <Kpi label="Coûts évités estimés" value={showEst ? fmtUsd(u.avoidedUsd) : null} unavailable="Masqué (réglage)" sub="Cache + optimisations" nature={nat('estimated')} />
          <Kpi label="Qualité moyenne" value={u.qualityAvg != null ? fmtPct(u.qualityAvg) : null} unavailable="Aucun contrôle qualité" nature={u.qualityAvg != null ? nat('measured') : 'unavailable'} />
          <Kpi label="Tâches exécutées" value={fmtInt(u.tasksDone)} sub={`${running.length} en cours · ${pendingTasks.length} en attente · ${u.tasksFailed} en échec`} nature={nat('measured')} />
          <Kpi label="Erreurs" value={fmtInt(u.errors)} sub={`${u.interventions} intervention(s) humaine(s)`} nature={nat('measured')} />
          <Kpi
            label="Quota consommé"
            value={quotas.length ? fmtPct(quotas[0].usedPct / 100) : null}
            unavailable="Non exposé par la source"
            sub={quotas.length ? `${quotas[0].provider}, mis à jour ${fmtRelative(quotas[0].ts, g.now)}` : undefined}
            nature={quotas.length ? (quotas[0].nature === 'demo' ? 'demo' : 'real') : 'unavailable'}
          />
        </section>

        <div className="cc__grid">
          <Panel
            className="cc__span-8"
            title={chart === 'columns' ? 'Consommation de tokens' : 'Coût estimé dans le temps'}
            aside={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Segmented size="sm" label="Type de graphique" value={chart} onChange={setChart} options={[{ value: 'columns', label: 'Tokens' }, { value: 'line', label: 'Coût' }]} />
                <button type="button" className="btn btn--sm" aria-pressed={tableView} onClick={() => setTableView((v) => !v)}>
                  {tableView ? 'Graphique' : 'Tableau'}
                </button>
              </div>
            }
          >
            {!tableView && chart === 'columns' && (
              <>
                <Legend series={SERIES} />
                <StackedColumns data={buckets} series={SERIES} value={(d, k) => d[k as keyof typeof d] as number} fmtY={fmtCompact} fmtX={fmtX} fmtTip={fmtInt} height={device === 'mobile' ? 170 : 220} label="Tokens par intervalle, empilés par type" />
              </>
            )}
            {!tableView && chart === 'line' && (
              <LineArea
                data={buckets}
                value={(d) => d.costUsd}
                fmtY={(n) => fmtUsd(n)}
                fmtX={fmtX}
                height={device === 'mobile' ? 170 : 220}
                label="Coût estimé par intervalle"
                markers={comparisons.filter((c) => c.m.ts >= g.range.from && c.m.ts <= g.range.to).map((c) => ({ t: c.m.ts, label: 'Optimisation' }))}
              />
            )}
            {tableView && (
              <div className="table-wrap" style={{ maxHeight: 260, overflow: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Intervalle</th>
                      {SERIES.map((s) => (
                        <th key={s.key} className="r">
                          {s.label}
                        </th>
                      ))}
                      <th className="r">Coût estimé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buckets.filter((b) => b.calls).map((b) => (
                      <tr key={b.t}>
                        <td className="num">{fmtTime(b.t, true)}</td>
                        <td className="r">{fmtInt(b.tokensIn)}</td>
                        <td className="r">{fmtInt(b.tokensOut)}</td>
                        <td className="r">{fmtInt(b.cacheRead)}</td>
                        <td className="r">{fmtInt(b.cacheWrite)}</td>
                        <td className="r">{fmtUsd(b.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="t-micro t-muted" style={{ marginTop: 8 }}>
              Coûts : {PRICE_TABLE_SOURCE.label}. {PRICE_TABLE_SOURCE.caveat}
            </p>
          </Panel>

          <Panel className="cc__span-4" title="Performance des modèles" aside={<NatureBadge nature={nat('measured')} />}>
            {models.length ? (
              <>
                <HBars rows={models.map((m) => ({ key: m.model, label: modelLabel(m.model), value: m.costUsd, note: `${fmtInt(m.calls)} appels` }))} fmt={(n) => fmtUsd(n)} label="Coût estimé par modèle" />
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Modèle</th>
                        <th className="r">Latence</th>
                        <th className="r">Cache</th>
                        <th className="r">Erreurs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((m) => (
                        <tr key={m.model}>
                          <td>{modelLabel(m.model)}</td>
                          <td className="r">{m.latencyAvgMs != null ? fmtDuration(m.latencyAvgMs) : '—'}</td>
                          <td className="r">{m.cacheHitRate != null ? fmtPct(m.cacheHitRate) : '—'}</td>
                          <td className="r">{m.errors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="t-muted">Aucun appel modèle sur la période et les filtres choisis.</p>
            )}
          </Panel>

          <Panel className="cc__span-6" title="Avant / après optimisation" aside={<span className="t-micro t-muted">Fenêtres de 5 jours, coût par tâche réussie</span>}>
            {comparisons.length ? (
              <div className="cc-ba">
                {comparisons.map(({ m, r, scope }) => (
                  <div key={m.id} className="cc-ba__item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <b style={{ fontWeight: 600 }}>{m.summary}</b>
                      <span className="t-micro t-muted">
                        {fmtTime(m.ts, true)} · {scope}
                      </span>
                    </div>
                    {r.sufficient ? (
                      <div className="cc-split">
                        <div>
                          <div className="t-micro t-muted" style={{ marginBottom: 4 }}>
                            Coût par tâche{' '}
                            <span className="cc-delta" data-good={(r.deltaCostPct ?? 0) < 0}>
                              {r.deltaCostPct != null ? `${r.deltaCostPct > 0 ? '+' : ''}${fmtPct(r.deltaCostPct)}` : ''}
                            </span>
                          </div>
                          <BeforeAfterBars before={r.before.costPerTask} after={r.after.costPerTask} fmt={(n) => fmtUsd(n, 3)} label="Coût par tâche" />
                        </div>
                        <div>
                          <div className="t-micro t-muted" style={{ marginBottom: 4 }}>
                            Tokens facturés plein tarif par tâche{' '}
                            <span className="cc-delta" data-good={(r.deltaTokensPct ?? 0) < 0}>
                              {r.deltaTokensPct != null ? `${r.deltaTokensPct > 0 ? '+' : ''}${fmtPct(r.deltaTokensPct)}` : ''}
                            </span>
                          </div>
                          <BeforeAfterBars before={r.before.tokensPerTask} after={r.after.tokensPerTask} fmt={fmtCompact} label="Tokens par tâche" />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <NatureBadge nature={r.nature === 'demo' ? 'demo' : 'estimated'} />
                          <span className="t-micro t-muted">
                            {r.before.tasks} tâches avant, {r.after.tasks} après. Corrélation observée, pas une preuve de causalité.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="t-small t-muted">Données insuffisantes pour conclure ({r.before.tasks} tâches avant, {r.after.tasks} après ; 8 minimum de chaque côté).</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="t-muted">Aucune optimisation datée dans l’historique chargé.</p>
            )}
          </Panel>

          <Panel className="cc__span-6" title="Tâches" aside={<span className="t-micro t-muted">{running.length} en cours · {pendingTasks.length} en attente</span>}>
            <TaskList tasks={[...running, ...pendingTasks].slice(0, 7)} now={g.now} onSelect={(id) => host.select({ kind: 'agent', id })} />
            <h3 className="section-title">Échecs récents</h3>
            <TaskList tasks={tasks.filter((t) => t.status === 'failed').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)).slice(0, 4)} now={g.now} onSelect={(id) => host.select({ kind: 'agent', id })} showError />
          </Panel>

          <Panel className="cc__span-4" title="Propositions GO / NO GO / TEST" aside={<button type="button" className="btn btn--sm" onClick={() => host.openDecisions()}>Arbitrer</button>}>
            {decisions.length ? (
              <ul className="cc-list">
                {decisions.map((d) => (
                  <li key={d.id}>
                    <button type="button" className="cc-link" onClick={() => host.openDecisions()}>
                      {d.title}
                      <div className="meta">{d.impact}</div>
                    </button>
                    <span className={`pill pill--risk-${d.risk}`}>{d.durable ? 'Durable' : d.risk === 'high' ? 'Élevé' : d.risk === 'medium' ? 'Modéré' : 'Faible'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-muted">Aucune proposition en attente.</p>
            )}
            <h3 className="section-title">Recommandations</h3>
            <Feed items={g.state.feed.recommendations.slice(-3).reverse()} now={g.now} empty="Aucune recommandation." />
          </Panel>

          <Panel className="cc__span-4" title="Sécurité" aside={<span className={`pill ${openIncidents.length ? 'pill--risk-high' : 'pill--risk-low'}`}>{openIncidents.length} ouvert(s)</span>}>
            {incidents.length ? (
              <ul className="cc-list">
                {incidents.slice(0, 5).map((i) => (
                  <li key={i.id}>
                    <span>
                      {g.canViewConfidential ? i.summary : 'Détails confidentiels masqués'}
                      <div className="meta">
                        {fmtRelative(i.ts, g.now)} · gravité {i.severity}
                      </div>
                    </span>
                    <span className={`pill ${i.state === 'open' ? 'pill--risk-high' : ''}`}>{i.state === 'open' ? 'Ouvert' : 'Résolu'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-muted">Aucun incident enregistré.</p>
            )}
            <h3 className="section-title">Mises à jour détectées</h3>
            <Feed items={g.state.feed.updates.slice(-3).reverse()} now={g.now} empty="Aucune mise à jour détectée." />
          </Panel>

          <Panel className="cc__span-4" title="Skills et connecteurs">
            <div className="cc-inv">
              <div>
                <b>{skills.filter((s) => s.status === 'active').length}</b>
                <span>skills actifs</span>
              </div>
              <div>
                <b>{skills.reduce((s, x) => s + x.improvements, 0)}</b>
                <span>améliorations</span>
              </div>
              <div>
                <b>{skills.filter((s) => s.status === 'disabled').length}</b>
                <span>désactivés</span>
              </div>
            </div>
            <ul className="cc-list">
              {connectors.map((c) => (
                <li key={c.id}>
                  <span>
                    {c.name}
                    <div className="meta">depuis {fmtRelative(c.since, g.now)}</div>
                  </span>
                  <StatusPill status={c.status === 'connected' ? 'validating' : c.status === 'degraded' ? 'waiting' : 'error'} compact />
                </li>
              ))}
              {!connectors.length && <li className="t-muted">Aucun connecteur suivi par cette source.</li>}
            </ul>
            <h3 className="section-title">Automatisations</h3>
            <Feed items={g.state.feed.automations.slice(-3).reverse()} now={g.now} empty="Aucune automatisation enregistrée." />
          </Panel>

          <Panel className="cc__span-12" title="Historique des modifications et interventions">
            {changes.length ? (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Modification</th>
                      <th>Origine</th>
                      <th>Donnée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map((c) => (
                      <tr key={c.id}>
                        <td className="num" style={{ whiteSpace: 'nowrap' }}>
                          {fmtTime(c.ts, true)}
                        </td>
                        <td>{c.summary}</td>
                        <td>{c.type === 'config.changed' ? 'Configuration' : c.type.startsWith('skill') ? 'Skill' : 'Intervention'}</td>
                        <td>
                          <NatureBadge nature={c.nature} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="t-muted">Aucune modification enregistrée.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

const NATURE_SHORT: Record<DataNature, string> = { real: 'Mesuré', estimated: 'Estimé', demo: 'Démo', unavailable: 'Indisponible', planned: 'Planifié', historical: 'Historique' };

function Kpi({ label, value, sub, nature, unavailable, hero }: { label: string; value: string | null; sub?: string; nature: DataNature; unavailable?: string; hero?: boolean }) {
  return (
    <div className={`cc-kpi ${hero ? 'cc-kpi--hero' : ''}`}>
      <span className="cc-kpi__label">{label}</span>
      <span className="cc-kpi__value" data-unavailable={value == null}>
        {value ?? unavailable ?? 'Indisponible'}
      </span>
      {sub && value != null && <span className="cc-kpi__sub">{sub}</span>}
      <NatureBadge nature={nature} />
    </div>
  );
}

function TaskList({ tasks, now, onSelect, showError }: { tasks: TaskRuntime[]; now: number; onSelect: (agentId: string) => void; showError?: boolean }) {
  const idx = useCatalogIndex();
  if (!tasks.length) return <p className="t-small t-muted">Rien à afficher.</p>;
  return (
    <ul className="cc-list">
      {tasks.map((t) => (
        <li key={t.id}>
          <button type="button" className="cc-link" onClick={() => t.agentId && onSelect(t.agentId)}>
            {t.title}
            <div className="meta">
              {idx.agents.get(t.agentId ?? '')?.name ?? '—'} · {idx.departments.get(t.departmentId ?? '')?.name ?? '—'}
              {showError && t.errors.length ? ` · ${t.errors[t.errors.length - 1]}` : ''}
            </div>
          </button>
          <span className="t-micro t-muted num" style={{ whiteSpace: 'nowrap' }}>
            {t.status === 'pending' ? 'en attente' : t.status === 'paused' ? 'suspendue' : t.endedAt ? fmtRelative(t.endedAt, now) : fmtDuration(now - (t.startedAt ?? t.createdAt))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Feed({ items, now, empty }: { items: Array<{ id: string; ts: number; summary: string }>; now: number; empty: string }) {
  if (!items.length) return <p className="t-small t-muted">{empty}</p>;
  return (
    <ul className="cc-list">
      {items.map((i) => (
        <li key={i.id}>
          <span>{i.summary}</span>
          <span className="meta">{fmtRelative(i.ts, now)}</span>
        </li>
      ))}
    </ul>
  );
}
