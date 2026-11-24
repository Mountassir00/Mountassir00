/**
 * Experience 01 — Control Center (soft dashboard layout).
 * Every figure shows its nature (measured, estimated, demo, unavailable).
 * Unknown figures say "Indisponible" with the reason — never a guess.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  beforeAfter, bucketize, byModel, fmtCompact, fmtInt, fmtPct, fmtRelative, fmtTime, fmtUsd, modelLabel, natureMix,
  useCatalogIndex, useGovernor, PRICE_TABLE_SOURCE, type DataNature, type ExperienceProps, type TaskRuntime,
} from '@sdk';
import { AnimatedNumber, NatureBadge, Segmented, Sparkline, StatusPill } from '@ds';
import { bucketFor, delta, figures, natureOf, type Kind } from './data';
import { DeltaPill, HeroStack, QuickActions, type HeroMetric } from './Hero';
import { CapsuleChart } from './CapsuleChart';
import { Donut, foldSlices } from './Donut';
import { Goals } from './Goals';
import { GChart, GHistory, GPlug, GPuzzle, GRefresh, GShield, GTable } from './glyphs';
import './control-center.css';

type Metric = 'tokens' | 'cost' | 'calls';
type PeriodChip = 'live' | '24h' | '7d' | '30d';

const NATURE_SHORT: Record<DataNature, string> = { real: 'Mesuré', estimated: 'Estimé', demo: 'Démo', unavailable: 'Indisponible', planned: 'Planifié', historical: 'Historique' };
const TASK_STATUS: Record<TaskRuntime['status'], string> = { pending: 'En attente', running: 'En cours', paused: 'Suspendue', succeeded: 'Terminée', failed: 'Échouée', cancelled: 'Annulée' };

export default function ControlCenter({ config, host }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  // Memoised on the store version: the shell's window cache is single-entry, so
  // reading two windows per render would otherwise recompute both every time.
  const events = useMemo(() => g.rangeEvents(), [g.version, g.range.from, g.range.to, g.filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const showEst = config.showEstimates !== false;
  const [metric, setMetric] = useState<Metric>(config.usageChart === 'line' ? 'cost' : 'tokens');
  const [table, setTable] = useState(config.showTables === true);
  const [bars, setBars] = useState(24);
  const onCountHint = useCallback((n: number) => setBars((b) => (Math.abs(b - n) > 2 ? n : b)), []);

  const span = Math.max(60_000, g.range.to - g.range.from);
  const cur = useMemo(() => figures(events), [events]);
  const prev = useMemo(() => figures(g.windowEvents(g.range.from - span, g.range.from)), [g.version, g.range.from, span, g.filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevComparable = prev.u.llmCalls > 0;
  const mix = useMemo(() => natureMix(events), [events]);
  const onlyDemo = (mix.demo ?? 0) > 0 && !mix.real;
  const nat = (k: Kind) => natureOf(k, onlyDemo);
  const hasBilling = g.sources.some((s) => s.id === 'anthropic-usage-api');

  const tasks = useMemo(() => Object.values(g.state.tasks), [g.state.tasks, g.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const running = tasks.filter((t) => t.status === 'running' || t.status === 'paused');
  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const decisions = Object.values(g.state.decisions).filter((d) => d.status === 'pending').sort((a, b) => b.proposedAt - a.proposedAt);
  const quota = Object.values(g.state.quotas)[0];

  const d = (a: number | null, b: number | null) => (prevComparable ? delta(a, b) : null);

  const hero: HeroMetric[] = [
    {
      id: 'cost', label: 'Coût estimé', value: showEst ? cur.cost : null, unavailable: 'Masqué (réglage)', format: (n) => fmtUsd(n),
      delta: d(cur.cost, prev.cost), lowerIsBetter: true, nature: nat('estimated'), tone: 'ink',
      sub: <>{fmtCompact(cur.processed)} tokens · {fmtInt(cur.u.llmCalls)} appels</>,
    },
    {
      id: 'cache', label: 'Servis par le cache', value: cur.u.cacheRead, format: (n) => fmtCompact(n), delta: d(cur.u.cacheRead, prev.u.cacheRead),
      nature: nat('measured'), tone: 'gold', sub: cur.cacheShare != null ? `${fmtPct(cur.cacheShare)} de l’entrée` : 'Aucune entrée',
    },
    {
      id: 'quality', label: 'Qualité moyenne', value: cur.u.qualityAvg, unavailable: 'Aucun contrôle', format: (n) => fmtPct(n), delta: d(cur.u.qualityAvg, prev.u.qualityAvg),
      nature: cur.u.qualityAvg == null ? 'unavailable' : nat('measured'), tone: 'violet', sub: `${fmtInt(cur.u.tasksDone)} tâches terminées`,
    },
  ];

  const bucketMs = bucketFor(span, bars);
  const buckets = useMemo(() => bucketize(events, g.range.from, g.range.to, bucketMs), [events, g.range.from, g.range.to, bucketMs]);
  const timeFmt = useMemo(
    () => (span > 2 * 86_400_000 ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }) : new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })),
    [span],
  );
  const metricValue = (b: (typeof buckets)[number]) => (metric === 'tokens' ? b.tokensIn + b.tokensOut + b.cacheRead + b.cacheWrite : metric === 'cost' ? b.costUsd : b.calls);
  const metricFmt = metric === 'cost' ? (n: number) => fmtUsd(n) : metric === 'tokens' ? fmtCompact : (n: number) => fmtInt(n);
  const points = buckets.map((b) => ({
    t: b.t,
    value: metricValue(b),
    label: timeFmt.format(b.t),
    detail: `${fmtCompact(b.tokensIn + b.tokensOut + b.cacheRead + b.cacheWrite)} tokens, ${fmtUsd(b.costUsd)} estimés, ${b.calls} appels`,
  }));

  const models = useMemo(() => byModel(events), [events]);
  const slices = foldSlices(models.map((m) => ({ key: m.model, label: modelLabel(m.model), value: m.costUsd })));
  const totalModelCost = slices.reduce((s, x) => s + x.value, 0);

  const comparisons = useMemo(() => {
    const ms = g.state.feed.optimizations.filter((o) => o.attrs?.milestone).slice(-3).reverse();
    return ms.map((m) => {
      const agent = m.departmentId === 'tokens' ? 'governor' : m.departmentId === 'routing' ? 'scout' : m.departmentId === 'context' ? 'auditor' : undefined;
      const list = agent ? tasks.filter((t) => t.agentId === agent) : tasks;
      return { m, r: beforeAfter(list, m.ts, 5 * 86_400_000, m.summary), scope: agent ? idx.agents.get(agent)?.name ?? agent : 'Toutes les tâches' };
    });
  }, [g.state.feed.optimizations, tasks, idx.agents]);

  const recent = useMemo(
    () =>
      [...running, ...pendingTasks, ...tasks.filter((t) => t.status === 'succeeded' || t.status === 'failed').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0)).slice(0, 8)].slice(0, 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, g.now],
  );
  const incidents = Object.values(g.state.incidents).sort((a, b) => b.ts - a.ts);
  const openIncidents = incidents.filter((i) => i.state === 'open').length;
  const feed = [...g.state.feed.updates, ...g.state.feed.recommendations].sort((a, b) => b.ts - a.ts).slice(0, 5);
  const changes = [...g.state.feed.changes, ...g.state.feed.interventions].sort((a, b) => b.ts - a.ts).slice(0, 6);
  const skills = Object.values(g.state.skills);
  const connectors = Object.values(g.state.connectors);

  const preset = g.period.preset as PeriodChip | 'custom' | '1h';
  const costSeries = buckets.map((b) => b.costUsd);

  return (
    <div className="cc" data-density={config.density as string}>
      <div className="cc__inner">
        <div className="cc-toolbar">
          <Segmented<PeriodChip>
            raised
            label="Période affichée"
            value={(['live', '24h', '7d', '30d'].includes(preset) ? preset : '24h') as PeriodChip}
            onChange={(v) => host.setPeriod(v)}
            options={[
              { value: 'live', label: 'Direct' },
              { value: '24h', label: '24 h' },
              { value: '7d', label: '7 j' },
              { value: '30d', label: '30 j' },
            ]}
          />
          {g.mode === 'replay' && <span className="pill replay-banner">État au {fmtTime(g.now, true)}</span>}
          <div className="cc-toolbar__mix" aria-label="Nature des données affichées">
            {(Object.keys(mix) as DataNature[]).map((n) => (
              <NatureBadge key={n} nature={n} label={`${NATURE_SHORT[n]} ${fmtPct((mix[n] ?? 0) / Math.max(1, events.length))}`} />
            ))}
            {!events.length && <span className="t-small t-muted">Aucun événement sur la période</span>}
          </div>
        </div>

        <div className="cc__grid">
          <div className="cc-area cc-area--hero">
            <HeroStack metrics={hero} />
            <QuickActions host={host} pending={decisions.length} />
          </div>

          <section className="cc-area cc-area--kpis cc-kpis" aria-label="Indicateurs">
            <Tile
              inverted
              label="Servis par le cache"
              value={cur.cacheShare != null ? fmtPct(cur.cacheShare) : null}
              ratio={cur.cacheShare}
              foot={`${fmtCompact(cur.u.cacheRead)} tokens`}
              nature={nat('measured')}
              reason="Aucune requête modèle"
            />
            <Tile label="Qualité moyenne" value={cur.u.qualityAvg != null ? fmtPct(cur.u.qualityAvg) : null} ratio={cur.u.qualityAvg} foot="Contrôles qualité" nature={cur.u.qualityAvg != null ? nat('measured') : 'unavailable'} reason="Aucun contrôle qualité" />
            <Tile label="Tâches réussies" value={cur.successRate != null ? fmtPct(cur.successRate) : null} ratio={cur.successRate} foot={`${fmtInt(cur.u.tasksDone)} sur ${fmtInt(cur.u.tasksDone + cur.u.tasksFailed)}`} nature={nat('measured')} reason="Aucune tâche terminée" />
            <Tile
              label="Quota consommé"
              value={quota ? fmtPct(quota.usedPct / 100) : null}
              ratio={quota ? quota.usedPct / 100 : null}
              foot={quota ? `${quota.provider} · ${fmtRelative(quota.ts, g.now)}` : undefined}
              nature={quota ? (quota.nature === 'demo' ? 'demo' : 'real') : 'unavailable'}
              reason="Non exposé par la source"
              tone="var(--series-2)"
            />
            <Tile
              label="Erreurs"
              value={fmtInt(cur.u.errors)}
              ratio={cur.errorRate}
              foot={cur.errorRate != null ? `${fmtPct(cur.errorRate, 1)} des appels · ${cur.u.interventions} intervention(s)` : 'Aucun appel'}
              nature={nat('measured')}
              tone="var(--st-error)"
            />
            <Tile
              label="Dépenses réelles · économies vérifiées"
              value={hasBilling ? fmtUsd(cur.u.costMeasured) : null}
              ratio={null}
              foot={hasBilling ? 'Facturation rapprochée' : undefined}
              nature={hasBilling ? nat('measured') : 'unavailable'}
              reason="Indisponible : aucune source de facturation connectée"
              dashed={!hasBilling}
            />
          </section>

          <section className="panel cc-area cc-area--chart" aria-labelledby="cc-chart-title">
            <CardHead
              id="cc-chart-title"
              title={metric === 'tokens' ? 'Tokens traités' : metric === 'cost' ? 'Coût estimé' : 'Appels modèle'}
              sub={`Par tranche de ${fmtSpan(bucketMs)}`}
              aside={
                <div className="cc-head-actions">
                  <Segmented<Metric>
                    size="sm"
                    label="Mesure affichée"
                    value={metric}
                    onChange={setMetric}
                    options={[
                      { value: 'tokens', label: 'Tokens' },
                      { value: 'cost', label: 'Coût' },
                      { value: 'calls', label: 'Appels' },
                    ]}
                  />
                  <button type="button" className="btn btn--sm btn--icon" aria-pressed={table} onClick={() => setTable((v) => !v)} aria-label={table ? 'Afficher le graphique' : 'Afficher le tableau'} title={table ? 'Graphique' : 'Tableau'}>
                    {table ? <GChart size={16} /> : <GTable size={16} />}
                  </button>
                </div>
              }
            />
            {table ? (
              <div className="table-wrap cc-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Intervalle</th>
                      <th className="r">Entrée</th>
                      <th className="r">Sortie</th>
                      <th className="r">Cache lu</th>
                      <th className="r">Cache écrit</th>
                      <th className="r">Appels</th>
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
                        <td className="r">{b.calls}</td>
                        <td className="r">{fmtUsd(b.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!buckets.some((b) => b.calls) && <p className="empty">Aucun appel modèle sur la période.</p>}
              </div>
            ) : (
              <CapsuleChart points={points} format={metricFmt} label={`${metric === 'tokens' ? 'Tokens traités' : metric === 'cost' ? 'Coût estimé' : 'Appels modèle'} par intervalle`} onCountHint={onCountHint} />
            )}
            <div className="cc-chart-foot">
              <NatureBadge nature={metric === 'cost' ? nat('estimated') : nat('measured')} />
              <span className="t-micro t-muted">{metric === 'cost' ? `Tokens × prix catalogue (${PRICE_TABLE_SOURCE.asOf}). ${PRICE_TABLE_SOURCE.caveat}` : 'Somme des entrées, sorties et lectures/écritures de cache.'}</span>
            </div>
          </section>

          <section className="panel cc-area cc-area--donut" aria-labelledby="cc-donut-title">
            <CardHead id="cc-donut-title" title="Coût par modèle" aside={<NatureBadge nature={nat('estimated')} />} />
            {slices.length ? (
              <Donut slices={slices} total={totalModelCost} format={(n) => fmtUsd(n)} centerLabel="Total estimé" label="Coût estimé par modèle" />
            ) : (
              <p className="empty">Aucun appel modèle sur la période et les filtres choisis.</p>
            )}
          </section>

          <div className="cc-area cc-area--minis">
            <MiniCard
              title="Coût estimé"
              value={showEst ? cur.cost : null}
              format={(n) => fmtUsd(n)}
              delta={d(cur.cost, prev.cost)}
              lowerIsBetter
              nature={nat('estimated')}
              foot={<Sparkline values={costSeries} width={120} height={30} color="var(--c-accent)" label="Évolution du coût estimé sur la période" />}
            />
            <MiniCard
              title="Coûts évités estimés"
              value={showEst ? cur.u.avoidedUsd : null}
              format={(n) => fmtUsd(n)}
              delta={d(cur.u.avoidedUsd, prev.u.avoidedUsd)}
              nature={nat('estimated')}
              foot={<span className="t-micro t-muted">Cache et optimisations, au prix catalogue</span>}
            />
          </div>

          <section className="panel cc-area cc-area--goals" aria-labelledby="cc-goals-title">
            <CardHead id="cc-goals-title" title="Objectifs" sub="Vos cibles, comparées à la période affichée" />
            <Goals host={host} f={cur} nature={nat('measured')} />
          </section>

          <section className="panel cc-area cc-area--activity" aria-labelledby="cc-act-title">
            <CardHead id="cc-act-title" title="Activité récente" sub={`${running.length} en cours · ${pendingTasks.length} en attente`} />
            <ul className="cc-rows">
              {recent.map((t) => {
                const dept = t.departmentId ? idx.departments.get(t.departmentId) : undefined;
                const agent = t.agentId ? idx.agents.get(t.agentId) : undefined;
                const when = t.endedAt ?? t.startedAt ?? t.createdAt;
                return (
                  <li key={t.id}>
                    <button type="button" className="cc-row" onClick={() => t.agentId && host.select({ kind: 'agent', id: t.agentId })}>
                      <Initials name={dept?.name ?? '?'} tone={dept?.tone} />
                      <span className="cc-row__text">
                        <b>{t.title}</b>
                        <span>
                          {fmtRelative(when, g.now)} · {agent?.name ?? '—'}
                        </span>
                      </span>
                      <span className="cc-row__end">
                        {t.status === 'succeeded' && t.costUsd > 0 ? (
                          <b className="num">{fmtUsd(t.costUsd, t.costUsd < 1 ? 3 : 2)}</b>
                        ) : (
                          <span className={`pill ${t.status === 'failed' ? 'pill--down' : t.status === 'running' ? 'pill--accent' : t.status === 'succeeded' ? 'pill--up' : ''}`}>{TASK_STATUS[t.status]}</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
              {!recent.length && <li className="empty">Aucune tâche à afficher.</li>}
            </ul>
          </section>

          <section className="panel cc-area cc-area--decisions" aria-labelledby="cc-dec-title">
            <CardHead id="cc-dec-title" title="Propositions GO / NO GO / TEST" aside={<SeeAll onClick={() => host.openDecisions()} label="Tout voir" />} />
            <ul className="cc-rows">
              {decisions.slice(0, 5).map((dd) => (
                <li key={dd.id}>
                  <button type="button" className="cc-row" onClick={() => host.openDecisions()}>
                    <span className="cc-round" data-tone={dd.risk} aria-hidden>
                      {dd.durable ? '!' : dd.risk === 'high' ? '▲' : dd.risk === 'medium' ? '◆' : '●'}
                    </span>
                    <span className="cc-row__text">
                      <b>{dd.title}</b>
                      <span>
                        {dd.impact || 'Impact non précisé'} · {fmtRelative(dd.proposedAt, g.now)}
                      </span>
                    </span>
                    <span className="cc-row__end">
                      <span className={`pill pill--risk-${dd.risk}`}>{dd.durable ? 'Durable' : dd.risk === 'high' ? 'Risque élevé' : dd.risk === 'medium' ? 'Modéré' : 'Faible'}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!decisions.length && <li className="empty">Aucune proposition en attente.</li>}
            </ul>
          </section>

          <section className="panel cc-area cc-area--ba" aria-labelledby="cc-ba-title">
            <CardHead id="cc-ba-title" title="Avant / après optimisation" sub="Coût par tâche réussie, fenêtres de 5 jours" />
            {comparisons.length ? (
              <div className="cc-ba">
                {comparisons.map(({ m, r, scope }) => (
                  <div key={m.id} className="cc-ba__item">
                    <div className="cc-ba__head">
                      <b>{m.summary}</b>
                      <span className="t-micro t-muted">
                        {fmtTime(m.ts, true)} · {scope}
                      </span>
                    </div>
                    {r.sufficient ? (
                      <>
                        <PairBars before={r.before.costPerTask} after={r.after.costPerTask} format={(n) => fmtUsd(n, 3)} label="Coût par tâche" />
                        <div className="cc-ba__foot">
                          <DeltaPill delta={r.deltaCostPct} lowerIsBetter subject="Coût par tâche" />
                          <NatureBadge nature={r.nature === 'demo' ? 'demo' : 'estimated'} />
                          <span className="t-micro t-muted">
                            {r.before.tasks} tâches avant, {r.after.tasks} après. Corrélation observée, pas une preuve de causalité.
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="t-small t-muted">
                        Données insuffisantes ({r.before.tasks} tâches avant, {r.after.tasks} après ; 8 minimum de chaque côté).
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">Aucune optimisation datée dans l’historique chargé.</p>
            )}
          </section>

          <section className="panel cc-area cc-area--security" aria-labelledby="cc-sec-title">
            <CardHead id="cc-sec-title" title="Sécurité" aside={<span className={`pill ${openIncidents ? 'pill--risk-high' : 'pill--risk-low'}`}>{openIncidents} ouvert(s)</span>} />
            <ul className="cc-rows">
              {incidents.slice(0, 4).map((i) => (
                <li key={i.id} className="cc-row cc-row--static">
                  <span className="cc-round" data-tone={i.state === 'open' ? 'high' : 'low'} aria-hidden>
                    <GShield size={18} />
                  </span>
                  <span className="cc-row__text">
                    <b>{g.canViewConfidential ? i.summary : 'Détails confidentiels masqués'}</b>
                    <span>
                      {fmtRelative(i.ts, g.now)} · gravité {i.severity}
                    </span>
                  </span>
                  <span className="cc-row__end">
                    <span className={`pill ${i.state === 'open' ? 'pill--risk-high' : ''}`}>{i.state === 'open' ? 'Ouvert' : 'Résolu'}</span>
                  </span>
                </li>
              ))}
              {!incidents.length && <li className="empty">Aucun incident enregistré.</li>}
            </ul>
          </section>

          <section className="panel cc-area cc-area--updates" aria-labelledby="cc-upd-title">
            <CardHead id="cc-upd-title" title="Mises à jour et recommandations" />
            <ul className="cc-rows">
              {feed.map((f) => (
                <li key={f.id} className="cc-row cc-row--static">
                  <span className="cc-round" data-tone={f.type === 'recommendation' ? 'accent' : 'info'} aria-hidden>
                    <GRefresh size={18} />
                  </span>
                  <span className="cc-row__text">
                    <b>{f.summary}</b>
                    <span>
                      {f.type === 'recommendation' ? 'Recommandation' : 'Mise à jour détectée'} · {fmtRelative(f.ts, g.now)}
                    </span>
                  </span>
                </li>
              ))}
              {!feed.length && <li className="empty">Rien de nouveau.</li>}
            </ul>
          </section>

          <section className="panel cc-area cc-area--skills" aria-labelledby="cc-sk-title">
            <CardHead id="cc-sk-title" title="Skills et connecteurs" aside={<SeeAll onClick={() => host.navigate('sources')} label="Sources" />} />
            <div className="cc-counters">
              <Counter value={skills.filter((s) => s.status === 'active').length} label="skills actifs" icon={<GPuzzle size={18} />} />
              <Counter value={skills.reduce((s, x) => s + x.improvements, 0)} label="améliorations" icon={<GRefresh size={18} />} />
              <Counter value={skills.filter((s) => s.status === 'disabled').length} label="désactivés" icon={<GPuzzle size={18} />} />
            </div>
            <ul className="cc-rows">
              {connectors.map((c) => (
                <li key={c.id} className="cc-row cc-row--static">
                  <span className="cc-round" data-tone={c.status === 'connected' ? 'low' : c.status === 'degraded' ? 'medium' : 'high'} aria-hidden>
                    <GPlug size={18} />
                  </span>
                  <span className="cc-row__text">
                    <b>{c.name}</b>
                    <span>
                      {fmtInt(c.calls)} appels · depuis {fmtRelative(c.since, g.now).replace('il y a ', '')}
                    </span>
                  </span>
                  <span className="cc-row__end">
                    <StatusPill status={c.status === 'connected' ? 'validating' : c.status === 'degraded' ? 'waiting' : 'error'} compact />
                    <span className="t-micro t-soft">{c.status === 'connected' ? 'Connecté' : c.status === 'degraded' ? 'Dégradé' : c.status === 'auth-required' ? 'Accès requis' : 'Déconnecté'}</span>
                  </span>
                </li>
              ))}
              {!connectors.length && <li className="empty">Aucun connecteur suivi par cette source.</li>}
            </ul>
          </section>

          <section className="panel cc-area cc-area--history" aria-labelledby="cc-hist-title">
            <CardHead id="cc-hist-title" title="Historique des modifications" />
            <ul className="cc-rows">
              {changes.map((c) => (
                <li key={c.id} className="cc-row cc-row--static">
                  <span className="cc-round" data-tone="info" aria-hidden>
                    <GHistory size={18} />
                  </span>
                  <span className="cc-row__text">
                    <b>{c.summary}</b>
                    <span>
                      {c.type === 'config.changed' ? 'Configuration' : c.type.startsWith('skill') ? 'Skill' : 'Intervention'} · {fmtTime(c.ts, true)}
                    </span>
                  </span>
                  <span className="cc-row__end">
                    <NatureBadge nature={c.nature} />
                  </span>
                </li>
              ))}
              {!changes.length && <li className="empty">Aucune modification enregistrée.</li>}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function fmtSpan(ms: number) {
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)} h`;
  return `${Math.round(ms / 86_400_000)} j`;
}

function CardHead({ id, title, sub, aside }: { id: string; title: string; sub?: string; aside?: ReactNode }) {
  return (
    <div className="cc-card-head">
      <div>
        <h2 id={id} className="t-h3">
          {title}
        </h2>
        {sub && <p className="t-micro t-muted">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

function SeeAll({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="cc-seeall" onClick={onClick}>
      {label}
      <span aria-hidden>›</span>
    </button>
  );
}

function Tile({ label, value, ratio, foot, nature, reason, inverted, tone, dashed }: {
  label: string; value: string | null; ratio: number | null; foot?: string; nature: DataNature; reason?: string; inverted?: boolean; tone?: string; dashed?: boolean;
}) {
  return (
    <article className="cc-tile" data-inverted={inverted || undefined} data-dashed={dashed || undefined}>
      <span className="cc-tile__value num" data-unavailable={value == null || undefined}>
        {value ?? 'Indisponible'}
      </span>
      <span className="cc-tile__label">{label}</span>
      {value == null ? (
        <span className="cc-tile__reason">{reason}</span>
      ) : ratio != null ? (
        <>
          <div className="cc-bar cc-bar--thin" role="meter" aria-label={`${label} : ${Math.round(ratio * 100)} %`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
            <i style={{ width: `${Math.max(0, Math.min(1, ratio)) * 100}%`, background: tone }} />
          </div>
          <span className="cc-tile__scale num">
            <span>0 %</span>
            <span>{Math.round(ratio * 100)} %</span>
          </span>
        </>
      ) : null}
      {foot && value != null && <span className="cc-tile__foot">{foot}</span>}
      <NatureBadge nature={nature} />
    </article>
  );
}

function MiniCard({ title, value, format, delta: dl, lowerIsBetter, nature, foot }: { title: string; value: number | null; format: (n: number) => string; delta: number | null; lowerIsBetter?: boolean; nature: DataNature; foot: ReactNode }) {
  return (
    <article className="panel cc-mini">
      <div className="cc-mini__top">
        <span className="cc-mini__title">{title}</span>
        <DeltaPill delta={dl} lowerIsBetter={lowerIsBetter} subject={title} />
      </div>
      <b className="cc-mini__value">{value == null ? 'Masqué' : <AnimatedNumber value={value} format={format} />}</b>
      <div className="cc-mini__foot">
        {foot}
        <NatureBadge nature={nature} />
      </div>
    </article>
  );
}

function PairBars({ before, after, format, label }: { before: number; after: number; format: (n: number) => string; label: string }) {
  const max = Math.max(before, after, 1e-9);
  return (
    <div className="cc-pair" role="img" aria-label={`${label} : avant ${format(before)}, après ${format(after)}`}>
      <div className="cc-pair__row">
        <span>Avant</span>
        <div className="cc-pair__track">
          <i className="cc-pair__before" style={{ width: `${Math.max(4, (before / max) * 100)}%` }} />
        </div>
        <b className="num">{format(before)}</b>
      </div>
      <div className="cc-pair__row">
        <span>Après</span>
        <div className="cc-pair__track">
          <i className="cc-pair__after" style={{ width: `${Math.max(4, (after / max) * 100)}%` }} />
        </div>
        <b className="num">{format(after)}</b>
      </div>
    </div>
  );
}

function Counter({ value, label, icon }: { value: number; label: string; icon: ReactNode }) {
  return (
    <div className="cc-counter">
      <span className="cc-counter__icon" aria-hidden>
        {icon}
      </span>
      <b className="num">{value}</b>
      <span>{label}</span>
    </div>
  );
}

function Initials({ name, tone }: { name: string; tone?: string }) {
  const letters = name
    .replace(/Department|Office|Laboratory|Control|Management/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || name.slice(0, 2).toUpperCase();
  return (
    <span className="cc-initials" style={{ background: tone ? `var(--${tone})` : 'var(--c-sunken)' }} aria-hidden>
      {letters}
    </span>
  );
}
