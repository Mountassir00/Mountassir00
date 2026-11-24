/**
 * Boucle d'équipe — your organisation as a loop. You and the Governor sit on a
 * rounded track in the middle; each department group (catalog `group`) is a
 * card listing its departments and engines with their live status. Dots
 * travel along the track only while real exchanges happened in the last
 * minutes. Selecting a card focuses it and shows what it produced.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  fmtCompact, fmtInt, fmtPct, fmtRelative, fmtUsd, useCatalogIndex, useGovernor, PERIOD_LABEL, STATUS_LABEL,
  type AgentDef, type AgentStatus, type ExperienceProps,
} from '@sdk';
import { IconArrowUpRight, IconCheck, IconClose, IconDecision, IconGovernor, IconAlert, IconStar, NatureBadge, StatusPill } from '@ds';
import { activity, buildGroups, groupIndex, production, splitColumns, stadium, stadiumH, type LoopGroup, type OutputItem } from './data';
import './loop.css';

const ACTIVE = new Set<AgentStatus>(['working', 'collaborating', 'researching', 'validating']);

interface Geo {
  w: number;
  h: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  cards: Record<string, { y: number; x: number; side: 'left' | 'right' }>;
}

export default function Loop({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const windowMin = Math.max(1, Math.round(Number(config.activityWindow ?? 5)));
  const lap = Math.max(4, Number(config.dotSpeed ?? 14));
  const showConnectors = config.showConnectors !== false;
  const limit = Math.max(3, Math.round(Number(config.outputs ?? 6)));

  const groups = useMemo(() => buildGroups(g.catalog), [g.catalog]);
  const [left, right] = useMemo(() => splitColumns(groups), [groups]);
  const groupOf = useMemo(() => groupIndex(g.catalog, groups), [g.catalog, groups]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const act = useMemo(() => activity(g.windowEvents(g.now - windowMin * 60_000, g.now), groupOf), [g.version, g.now, windowMin, groupOf, g.filters]);

  const [focus, setFocus] = useState<string | null>(() => host.getLocal<string | null>('focus', null));
  const setFocusP = useCallback(
    (id: string | null) => {
      setFocus(id);
      host.setLocal('focus', id);
      if (id) host.announce(`Production de ${id} affichée`);
    },
    [host],
  );
  const focused = groups.find((x) => x.id === focus) ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const prod = useMemo(() => (focused ? production(g.rangeEvents(), focused.deptIds, groupOf, focused.id, limit) : null), [focused, g.version, g.range.from, g.range.to, g.filters, groupOf, limit]);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusP(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, setFocusP]);

  useEffect(
    () =>
      host.provideCommands([
        ...groups.map((x) => ({ id: `loop.focus.${x.id}`, label: `Boucle : production du groupe ${x.name}`, keyword: 'boucle', run: () => setFocusP(x.id) })),
        { id: 'loop.unfocus', label: 'Boucle : vue d’ensemble', keyword: 'boucle', run: () => setFocusP(null) },
      ]),
    [host, groups, setFocusP],
  );

  const pending = Object.values(g.state.decisions).filter((d) => d.status === 'pending').length;
  const gov = g.state.agents.governor;
  const motion = quality.motion === 'subtle' || quality.motion === 'ambient';
  const animate = motion && !quality.suspended && act.total > 0;
  const dots = act.total === 0 ? 0 : Math.min(6, Math.max(1, Math.ceil(Math.sqrt(act.total))));
  const mobile = device === 'mobile';

  const stageRef = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
  const measure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const sr = stage.getBoundingClientRect();
    const track = stage.querySelector<HTMLElement>('.lp-center');
    if (!track) return;
    const tr = track.getBoundingClientRect();
    const half = Math.min(52, tr.width / 2 - 6);
    const cx = tr.left - sr.left + tr.width / 2;
    const cards: Geo['cards'] = {};
    stage.querySelectorAll<HTMLElement>('[data-group]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const side = el.dataset.side === 'right' ? 'right' : 'left';
      cards[el.dataset.group!] = { y: r.top - sr.top + r.height / 2, x: side === 'left' ? r.right - sr.left : r.left - sr.left, side };
    });
    setGeo({ w: sr.width, h: stage.scrollHeight, x1: cx - half, x2: cx + half, y1: 10, y2: Math.max(200, stage.scrollHeight - 10), cards });
  }, []);
  useLayoutEffect(() => {
    if (mobile) return;
    measure();
    const stage = stageRef.current;
    if (!stage) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(stage);
    stage.querySelectorAll('[data-group]').forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [measure, mobile, groups, focus]);

  const statusOf = (a: AgentDef) => g.state.agents[a.id]?.status ?? null;
  const activeAgents = Object.values(g.state.agents).filter((a) => ACTIVE.has(a.status)).length;

  const summary = `Boucle d’équipe : vous et le Gouverneur au centre, ${groups.length} groupes autour (${groups.map((x) => x.name).join(', ')}). ${activeAgents} agents actifs. ${
    act.total ? `${act.total} échanges réels sur les ${windowMin} dernières minutes.` : `Aucun échange depuis ${windowMin} minutes.`
  } ${pending} décision(s) en attente.`;

  const card = (grp: LoopGroup, side: 'left' | 'right') => (
    <GroupCard
      key={grp.id}
      grp={grp}
      side={side}
      flows={act.perGroup.get(grp.id) ?? 0}
      focus={focus}
      onFocus={() => setFocusP(focus === grp.id ? null : grp.id)}
      statusOf={statusOf}
      onAgent={(id) => host.select({ kind: 'agent', id })}
      onDept={(id) => host.select({ kind: 'department', id })}
      windowMin={windowMin}
      prod={mobile && focus === grp.id ? prod : null}
      onClose={() => setFocusP(null)}
      host={host}
      now={g.now}
      periodLabel={PERIOD_LABEL[g.period.preset]}
      idx={idx}
    />
  );

  const loopCaption = act.total ? `${fmtInt(act.total)} échange${act.total > 1 ? 's' : ''} · ${windowMin} min` : `Calme · ${windowMin} min`;

  return (
    <div className="lp" data-density={config.density === 'compact' ? 'compact' : 'comfortable'} data-mobile={mobile ? 'true' : undefined} data-focus={focus ? 'true' : undefined} data-quality={quality.level}>
      <p className="sr-only">{summary}</p>
      {mobile ? (
        <>
          <MobileStrip
            dots={dots}
            animate={animate}
            lap={lap}
            caption={loopCaption}
            pending={pending}
            govStatus={gov?.status ?? null}
            onYou={() => host.openDecisions()}
            onGov={() => host.select({ kind: 'agent', id: 'governor' })}
            nature={act.nature}
          />
          <div className="lp-stack">{groups.map((x) => card(x, 'left'))}</div>
        </>
      ) : (
        <div className="lp-stage" ref={stageRef}>
          {geo && (
            <svg className="lp-svg" width={geo.w} height={geo.h} aria-hidden>
              {showConnectors &&
                Object.entries(geo.cards).map(([id, c]) => {
                  const lineX = c.side === 'left' ? geo.x1 : geo.x2;
                  const on = (act.perGroup.get(id) ?? 0) > 0;
                  const dim = focus && focus !== id;
                  const d = `M${c.x},${c.y} H${lineX}`;
                  return (
                    <g key={id} className="lp-conn" data-on={on ? 'true' : undefined} data-dim={dim ? 'true' : undefined}>
                      <path d={d} className="lp-conn__base" />
                      {on && <path d={d} className="lp-conn__flow" data-animate={animate ? 'true' : undefined} />}
                      <circle cx={lineX} cy={c.y} r={on ? 4.5 : 3.5} className="lp-conn__node" />
                    </g>
                  );
                })}
              <path d={stadium(geo.x1, geo.x2, geo.y1, geo.y2)} className="lp-track" />
              {dots > 0 && (
                <path
                  d={stadium(geo.x1, geo.x2, geo.y1, geo.y2)}
                  pathLength={100}
                  className="lp-dots"
                  data-animate={animate ? 'true' : undefined}
                  strokeDasharray={`0.001 ${100 / dots - 0.001}`}
                  style={{ ['--lp-period' as string]: `${-100 / dots}px`, animationDuration: `${lap / dots}s` }}
                />
              )}
              <path d={`M${geo.x1},${(geo.y1 + geo.y2) / 2} H${geo.x2}`} className="lp-spoke" />
            </svg>
          )}
          <div className="lp-col lp-col--left">{left.map((x) => card(x, 'left'))}</div>
          <div className="lp-center">
            <button type="button" className="lp-you" onClick={() => host.openDecisions()} aria-label={`Vous — ${pending} décision(s) en attente, ouvrir les décisions`}>
              <span>Vous</span>
              {pending > 0 && <span className="lp-you__n">{pending}</span>}
            </button>
            <button type="button" className="lp-hub" data-active={gov && ACTIVE.has(gov.status) ? 'true' : undefined} onClick={() => host.select({ kind: 'agent', id: 'governor' })} aria-label={`Gouverneur, ${gov ? STATUS_LABEL[gov.status] : 'statut non observé'} — inspecter`}>
              <span className="lp-hub__tile">
                <IconGovernor size={26} />
              </span>
              <span className="lp-hub__name">Gouverneur</span>
              {gov ? <StatusPill status={gov.status} /> : <span className="lp-muted">Non observé</span>}
            </button>
            <span className="lp-caption" data-on={act.total ? 'true' : undefined}>
              <i aria-hidden />
              {loopCaption}
              <NatureBadge nature={act.total ? act.nature : 'unavailable'} label={act.total ? undefined : 'Aucun flux'} />
            </span>
          </div>
          <div className="lp-col lp-col--right">{right.map((x) => card(x, 'right'))}</div>
          {focused && prod && (
            <ProductionPanel
              grp={focused}
              prod={prod}
              side={left.includes(focused) ? 'right' : 'left'}
              onClose={() => setFocusP(null)}
              host={host}
              now={g.now}
              periodLabel={PERIOD_LABEL[g.period.preset]}
              idx={idx}
            />
          )}
        </div>
      )}
    </div>
  );
}

type Idx = ReturnType<typeof useCatalogIndex>;

function GroupCard({
  grp, side, flows, focus, onFocus, statusOf, onAgent, onDept, windowMin, prod, onClose, host, now, periodLabel, idx,
}: {
  grp: LoopGroup;
  side: 'left' | 'right';
  flows: number;
  focus: string | null;
  onFocus: () => void;
  statusOf: (a: AgentDef) => AgentStatus | null;
  onAgent: (id: string) => void;
  onDept: (id: string) => void;
  windowMin: number;
  prod: ReturnType<typeof production> | null;
  onClose: () => void;
  host: ExperienceProps['host'];
  now: number;
  periodLabel: string;
  idx: Idx;
}) {
  const isFocus = focus === grp.id;
  const dim = !!focus && !isFocus;
  const busy = grp.engines.filter((a) => {
    const s = statusOf(a);
    return s && ACTIVE.has(s);
  }).length;
  return (
    <>
      <article className="lp-card" data-group={grp.id} data-side={side} data-focus={isFocus ? 'true' : undefined} data-dim={dim ? 'true' : undefined} data-on={flows > 0 ? 'true' : undefined}>
        <button type="button" className="lp-card__head" onClick={onFocus} aria-expanded={isFocus} aria-label={`${grp.name} : ${isFocus ? 'fermer la production' : 'voir ce que le groupe a produit'}`}>
          <span className="lp-card__title">{grp.name}</span>
          <span className="lp-card__meta">
            {grp.departments.length} pôle{grp.departments.length > 1 ? 's' : ''} · {grp.engines.length} agent{grp.engines.length > 1 ? 's' : ''}
          </span>
          <IconArrowUpRight size={15} className="lp-card__go" />
        </button>
        <ul className="lp-rows">
          {grp.departments.map(({ dept, engines }) => (
            <li key={dept.id} className="lp-row">
              <button type="button" className="lp-dept" onClick={() => onDept(dept.id)} aria-label={`Inspecter le département ${dept.name}`}>
                <i className="lp-tone" style={{ background: `var(--${dept.tone})` }} aria-hidden />
                <span>{dept.name}</span>
              </button>
              <span className="lp-engines">
                {engines.map((a) => {
                  const s = statusOf(a);
                  return (
                    <button key={a.id} type="button" className="lp-agent" style={{ ['--sc' as string]: s ? `var(--st-${s})` : 'var(--c-line)' }} data-active={s && ACTIVE.has(s) ? 'true' : undefined} onClick={() => onAgent(a.id)} aria-label={`${a.name} : ${s ? STATUS_LABEL[s] : 'statut non observé'} — inspecter`} title={s ? STATUS_LABEL[s] : 'Statut non observé'}>
                      <i aria-hidden />
                      {a.name}
                    </button>
                  );
                })}
                {!engines.length && <span className="lp-muted">Aucun moteur</span>}
              </span>
            </li>
          ))}
        </ul>
        <footer className="lp-card__foot">
          <span>
            {busy ? `${busy} au travail` : 'Au repos'} · {flows ? `${flows} échange${flows > 1 ? 's' : ''} / ${windowMin} min` : 'aucun échange récent'}
          </span>
        </footer>
      </article>
      {prod && <ProductionPanel grp={grp} prod={prod} side="inline" onClose={onClose} host={host} now={now} periodLabel={periodLabel} idx={idx} />}
    </>
  );
}

function ProductionPanel({ grp, prod, side, onClose, host, now, periodLabel, idx }: { grp: LoopGroup; prod: ReturnType<typeof production>; side: 'left' | 'right' | 'inline'; onClose: () => void; host: ExperienceProps['host']; now: number; periodLabel: string; idx: Idx }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: side !== 'inline' });
    if (side === 'inline') ref.current?.scrollIntoView({ block: 'nearest', behavior: document.documentElement.dataset.motion === 'none' ? 'auto' : 'smooth' });
  }, [grp.id, side]);
  const open = (it: OutputItem) => {
    if (it.kind === 'task') host.select({ kind: 'task', id: it.id });
    else if (it.kind === 'decision') host.select({ kind: 'decision', id: it.id });
    else if (it.deptId) host.select({ kind: 'department', id: it.deptId });
  };
  const deptName = (id?: string) => (id ? idx.departments.get(id)?.name ?? id : '');
  return (
    <section ref={ref} tabIndex={-1} className="lp-prod" data-side={side} aria-label={`Production du groupe ${grp.name}`}>
      <header className="lp-prod__head">
        <div>
          <span className="lp-prod__kicker">Production · {periodLabel}</span>
          <h2 className="t-h2">{grp.name}</h2>
        </div>
        <button type="button" className="icon-btn lp-prod__close" onClick={onClose} aria-label="Fermer la production (Échap)">
          <IconClose size={16} />
        </button>
      </header>
      <dl className="lp-prod__kpis">
        <div>
          <dt>Tâches</dt>
          <dd className="num">
            {fmtInt(prod.tasksDone)}
            {prod.tasksFailed > 0 && <small className="lp-bad"> +{prod.tasksFailed} échec{prod.tasksFailed > 1 ? 's' : ''}</small>}
          </dd>
        </div>
        <div>
          <dt>Coût</dt>
          <dd className="num" title={prod.costUsd > 0 ? fmtUsd(prod.costUsd, 4) : undefined}>{prod.costUsd > 0 ? fmtUsd(prod.costUsd) : '—'}</dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd className="num">{prod.tokens > 0 ? fmtCompact(prod.tokens) : '—'}</dd>
        </div>
        <div>
          <dt>Cache</dt>
          <dd className="num">{prod.cacheShare != null ? fmtPct(prod.cacheShare) : '—'}</dd>
        </div>
      </dl>
      {prod.tokens === 0 && (
        <p className="lp-muted lp-prod__why">Coût, tokens et cache indisponibles : aucun appel modèle de ce groupe sur la période (moteurs déterministes ou au repos).</p>
      )}
      <div className="lp-prod__nat">
        <NatureBadge nature={prod.costNature} label={prod.costNature === 'demo' ? 'Démo' : prod.costNature === 'real' ? 'Coût facturé' : 'Coût estimé (prix catalogue)'} />
        {prod.tokensSaved > 0 && (
          <span className="pill pill--up">
            {fmtCompact(prod.tokensSaved)} tokens économisés · {fmtUsd(prod.avoidedUsd)}
          </span>
        )}
      </div>
      <h3 className="lp-prod__sub">Dernières réalisations</h3>
      {!prod.items.length ? (
        <p className="lp-muted lp-prod__empty">Rien de produit sur la période « {periodLabel} ». Élargissez la période pour remonter plus loin.</p>
      ) : (
        <ol className="lp-outs">
          {prod.items.map((it) => (
            <li key={`${it.kind}-${it.id}`}>
              <button type="button" className="lp-out" data-kind={it.kind} data-bad={it.kind === 'task' && !it.ok ? 'true' : undefined} onClick={() => open(it)}>
                <span className="lp-out__icon" aria-hidden>
                  {it.kind === 'task' ? it.ok ? <IconCheck size={14} /> : <IconAlert size={14} /> : it.kind === 'decision' ? <IconDecision size={14} /> : <IconStar size={14} />}
                </span>
                <span className="lp-out__txt">
                  <b>{it.title}</b>
                  <small>
                    {it.kind === 'task' ? (it.ok ? 'Tâche terminée' : 'Tâche échouée') : it.kind === 'decision' ? 'Proposition soumise' : 'Optimisation'}
                    {it.deptId ? ` · ${deptName(it.deptId)}` : ''}
                    {it.kind === 'task' && it.agentId ? ` · ${idx.agents.get(it.agentId)?.name ?? it.agentId}` : ''} · {fmtRelative(it.ts, now)}
                  </small>
                </span>
                <span className="lp-out__val num">
                  {it.kind === 'task' ? (it.costUsd > 0 ? fmtUsd(it.costUsd, 3) : '—') : it.kind === 'optimization' ? (it.tokensSaved ? `−${fmtCompact(it.tokensSaved)}` : '—') : ''}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {prod.decisions > 0 && (
        <button type="button" className="btn btn--sm lp-prod__dec" onClick={() => host.openDecisions()}>
          <IconDecision size={15} /> Ouvrir les décisions
        </button>
      )}
    </section>
  );
}

function MobileStrip({ dots, animate, lap, caption, pending, govStatus, onYou, onGov, nature }: { dots: number; animate: boolean; lap: number; caption: string; pending: number; govStatus: AgentStatus | null; onYou: () => void; onGov: () => void; nature: 'demo' | 'real' | 'estimated' | 'planned' | 'historical' | 'unavailable' }) {
  const W = 360;
  const H = 64;
  const path = stadiumH(8, W - 8, 14, H - 14);
  return (
    <div className="lp-strip">
      <svg className="lp-strip__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <path d={path} className="lp-track" vectorEffect="non-scaling-stroke" />
        {dots > 0 && (
          <path
            d={path}
            pathLength={100}
            className="lp-dots"
            data-animate={animate ? 'true' : undefined}
            strokeDasharray={`0.001 ${100 / dots - 0.001}`}
            style={{ ['--lp-period' as string]: `${-100 / dots}px`, animationDuration: `${lap / dots}s` }}
          />
        )}
      </svg>
      <button type="button" className="lp-you lp-you--strip" onClick={onYou} aria-label={`Vous — ${pending} décision(s) en attente`}>
        <span>Vous</span>
        {pending > 0 && <span className="lp-you__n">{pending}</span>}
      </button>
      <span className="lp-caption lp-caption--strip" data-on={dots ? 'true' : undefined}>
        <i aria-hidden />
        {caption}
        <NatureBadge nature={dots ? nature : 'unavailable'} label={dots ? undefined : 'Aucun flux'} />
      </span>
      <button type="button" className="lp-hub lp-hub--strip" onClick={onGov} aria-label={`Gouverneur, ${govStatus ? STATUS_LABEL[govStatus] : 'statut non observé'}`}>
        <span className="lp-hub__tile">
          <IconGovernor size={18} />
        </span>
        <i className="lp-hub__dot" style={{ background: govStatus ? `var(--st-${govStatus})` : 'var(--c-line)' }} aria-hidden />
      </button>
    </div>
  );
}
