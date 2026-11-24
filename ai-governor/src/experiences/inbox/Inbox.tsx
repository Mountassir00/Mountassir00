/**
 * Boîte de réception — proposals waiting for a verdict, presented like a code
 * review (conversation, changes, checks, touched objects, GO / TEST / NO GO),
 * the history of verdicts, and the "autopilot": recurring jobs inferred from
 * real automation.run events. Verdicts go through host.request (permissions,
 * replay lock, confirmation proportional to risk — typed CONFIRMER for a
 * durable change of instructions). Nothing is decided locally.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconArrowUpRight, IconCheck, IconChevron, NatureBadge } from '@ds';
import { fmtRelative, useGovernor, type Decision, type ExperienceProps, type HostApi } from '@sdk';
import { Autopilot } from './Autopilot';
import { jobsOf } from './autopilot';
import { Avatar, Review, StatePill, type SubTab } from './Review';
import { RISK_LABEL, relatedEvents, shortDecisionId } from './review';
import './inbox.css';

type Tab = 'pending' | 'history' | 'autopilot';

function useLocalPref<T>(host: HostApi, key: string, fallback: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => host.getLocal<T>(key, fallback));
  const set = useCallback(
    (next: T) => {
      setV(next);
      host.setLocal(key, next);
    },
    [host, key],
  );
  return [v, set];
}

function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(1200);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

export default function Inbox({ host, config, device }: ExperienceProps) {
  const g = useGovernor();
  const root = useRef<HTMLDivElement>(null);
  const width = useWidth(root);
  const narrow = device === 'mobile' || width < 760;
  const replay = g.mode === 'replay';
  const [tab, setTab] = useLocalPref<Tab>(host, 'tab', (config.defaultTab as Tab) ?? 'pending');
  const [selId, setSelId] = useState<string | null>(() => (g.selection?.kind === 'decision' ? g.selection.id : null));
  const [sub, setSub] = useState<SubTab>('conv');
  const [moreOpen, setMoreOpen] = useState(false);
  const showRelated = config.showRelated !== false;
  const compact = config.compactList === true;

  useEffect(() => {
    if (g.selection?.kind === 'decision' && g.state.decisions[g.selection.id]) {
      setSelId(g.selection.id);
      setTab(g.state.decisions[g.selection.id].status === 'pending' ? 'pending' : 'history');
    }
  }, [g.selection]); // eslint-disable-line react-hooks/exhaustive-deps

  const deptFilter = g.filters.departments;
  const decisions = useMemo(
    () => Object.values(g.state.decisions).filter((d) => !deptFilter.length || (d.departmentId && deptFilter.includes(d.departmentId))),
    [g.version, g.state, deptFilter], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // Longest wait first, like a triage queue.
  const pending = useMemo(() => decisions.filter((d) => d.status === 'pending').sort((a, b) => a.proposedAt - b.proposedAt), [decisions]);
  const history = useMemo(() => decisions.filter((d) => d.status !== 'pending').sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)), [decisions]);
  const jobs = useMemo(() => jobsOf(g.allEvents(), g.now), [g.version, g.now]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = tab === 'history' ? history : pending;
  const explicit = selId ? g.state.decisions[selId] : undefined;
  // Wide: always show something; once a verdict lands, the next pending proposal comes up.
  const current: Decision | undefined = narrow ? explicit : (explicit && list.some((d) => d.id === explicit.id) ? explicit : list[0]);
  const related = useMemo(
    () => (current ? relatedEvents(current, g.allEvents(), g.now) : { before: [] }),
    [current?.id, current?.status, g.version, g.now], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const recos = useMemo(() => [...g.state.feed.recommendations, ...g.state.feed.updates].sort((a, b) => b.ts - a.ts).slice(0, 12), [g.version]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(
    () =>
      host.provideCommands([
        { id: 'pending', label: 'Boîte de réception : propositions à arbitrer', keyword: 'inbox', run: () => setTab('pending') },
        { id: 'history', label: 'Boîte de réception : historique des arbitrages', keyword: 'inbox', run: () => setTab('history') },
        { id: 'autopilot', label: 'Boîte de réception : autopilote (tâches récurrentes)', keyword: 'inbox', run: () => setTab('autopilot') },
      ]),
    [host, setTab],
  );

  const pick = (id: string) => {
    setSelId(id);
    setSub('conv');
  };

  const tabs: Array<{ id: Tab; label: string; n: number; alert?: boolean }> = [
    { id: 'pending', label: 'À arbitrer', n: pending.length, alert: pending.length > 0 },
    { id: 'history', label: 'Historique', n: history.length },
    { id: 'autopilot', label: 'Autopilote', n: jobs.length },
  ];

  const header = (
    <header className="ib-head">
      <div className="ib-head__titles">
        <h2>Boîte de réception</h2>
        <p className="t-small t-muted">Seul ce qui attend votre arbitrage est en haut. Le reste attend dessous, sans bloquer personne.</p>
      </div>
      <div className="ib-head__end">
        {g.hasDemo && <NatureBadge nature="demo" />}
        {replay && <span className="pill pill--risk-medium">Replay · lecture seule</span>}
        <button type="button" className="btn btn--sm btn--raised" onClick={() => host.openDecisions()}>
          Centre de décision <IconArrowUpRight size={14} />
        </button>
      </div>
      <div className="ib-tabs" role="tablist" aria-label="Boîte de réception">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="ib-tabs__n num" data-alert={t.alert || undefined}>
              {t.n}
            </span>
          </button>
        ))}
      </div>
    </header>
  );

  const masterList = (
    <div className="ib-list" data-compact={compact || undefined}>
      {tab === 'pending' && (
        <p className="ib-list__intro t-micro">{pending.length ? 'Le travail attend votre décision · la plus ancienne en premier' : ''}</p>
      )}
      {tab === 'pending' && !pending.length && (
        <div className="ib-clear">
          <span className="ib-clear__ic">
            <IconCheck size={18} />
          </span>
          <div>
            <b>Rien n’attend votre arbitrage.</b>
            <p className="t-small t-muted">Les agents vous solliciteront ici dès qu’une proposition demandera votre décision.</p>
          </div>
        </div>
      )}
      {tab === 'history' && !history.length && <p className="ib-empty t-small">Aucun arbitrage dans l’historique chargé.</p>}
      <ul aria-label={tab === 'pending' ? 'Propositions à arbitrer' : 'Propositions arbitrées'}>
        {list.map((d) => {
          const agent = g.catalog.agents.find((a) => a.id === d.proposedBy);
          const dept = g.catalog.departments.find((x) => x.id === d.departmentId);
          const sel = current?.id === d.id && !narrow;
          return (
            <li key={d.id}>
              <button type="button" className="ib-item" data-selected={sel || undefined} aria-current={sel ? 'true' : undefined} data-risk={d.risk} onClick={() => pick(d.id)}>
                <span className="ib-item__top">
                  {tab === 'pending' ? (
                    <span className="ib-item__flag" data-risk={d.risk}>
                      {d.durable ? 'Modifie les instructions' : d.risk === 'high' ? 'Risque élevé' : 'Votre arbitrage'}
                    </span>
                  ) : (
                    <StatePill d={d} />
                  )}
                  <span className="ib-mono t-micro t-muted">#{shortDecisionId(d.id)}</span>
                  <span className="ib-item__age t-micro">{fmtRelative(tab === 'history' && d.resolvedAt ? d.resolvedAt : d.proposedAt, g.now)}</span>
                </span>
                <span className="ib-item__title">{d.title}</span>
                {!compact && (
                  <span className="ib-item__meta">
                    <Avatar agent={agent} name={agent?.name ?? d.proposedBy ?? '?'} size={18} />
                    <span className="ib-item__who">{agent?.name ?? d.proposedBy ?? 'Système'}</span>
                    {dept && (
                      <span className="ib-chip" style={{ ['--tone' as string]: `var(--${dept.tone})` }}>
                        {dept.name}
                      </span>
                    )}
                    <span className={`pill pill--risk-${d.risk} ib-item__risk`}>{cap(RISK_LABEL[d.risk].replace('Risque ', ''))}</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {tab === 'pending' && (
        <section className="ib-more">
          <button type="button" className="ib-more__head" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>
            <IconChevron size={12} style={{ transform: moreOpen ? 'rotate(90deg)' : undefined }} />
            <span>Non bloquant · recommandations et mises à jour</span>
            <span className="ib-tabs__n num">{recos.length}</span>
          </button>
          {moreOpen && (
            <ul className="ib-more__list">
              {recos.map((r) => (
                <li key={r.id}>
                  <span className="t-small">{r.summary}</span>
                  <span className="t-micro t-muted">
                    {r.type === 'recommendation' ? 'Recommandation' : 'Mise à jour'} · {fmtRelative(r.ts, g.now)}
                  </span>
                </li>
              ))}
              {!recos.length && <li className="t-micro t-muted">Rien à lire pour le moment.</li>}
              <li className="t-micro t-muted">À lire seulement : rien ne s’arrête en attendant. Une recommandation devient arbitrable quand elle est proposée.</li>
            </ul>
          )}
        </section>
      )}
    </div>
  );

  const review = current && (
    <Review
      d={current}
      catalog={g.catalog}
      state={g.state}
      related={related}
      now={g.now}
      replay={replay}
      canViewConfidential={g.canViewConfidential}
      host={host}
      tab={sub}
      onTab={setSub}
      onBack={narrow ? () => setSelId(null) : undefined}
      showRelated={showRelated}
    />
  );

  const autopilot = <Autopilot jobs={jobs} catalog={g.catalog} now={g.now} conf={g.canViewConfidential} stripLength={Number(config.runStrip ?? 30)} />;
  const summary = `Boîte de réception : ${pending.length} proposition(s) à arbitrer, ${history.length} arbitrée(s), ${jobs.length} automatisation(s).`;

  if (narrow) {
    const detailOpen = tab !== 'autopilot' && !!current;
    return (
      <div ref={root} className="ib ib--narrow">
        <p className="sr-only">{summary}</p>
        {detailOpen ? (
          <div className="ib-m-detail">{review}</div>
        ) : (
          <div className="ib-m-scroll">
            {header}
            {tab === 'autopilot' ? autopilot : masterList}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={root} className="ib">
      <p className="sr-only">{summary}</p>
      <div className="ib__frame">
        {header}
        {tab === 'autopilot' ? (
          <div className="ib__auto">{autopilot}</div>
        ) : (
          <div className="ib__split">
            <aside className="ib-panel ib-panel--list" aria-label="Liste des propositions">
              {masterList}
            </aside>
            <section className="ib-panel ib-panel--detail" aria-label="Revue de la proposition">
              {review ?? (
                <div className="ib-placeholder">
                  <IconCheck size={22} />
                  <p>{tab === 'pending' ? 'Aucune proposition ouverte. Tout est clair.' : 'Sélectionnez un arbitrage passé.'}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
