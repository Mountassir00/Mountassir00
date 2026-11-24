/**
 * Équipe d'agents — a status board of every agent (LLM personas, scripts,
 * services, people): status, current task and progress, token throughput,
 * cost of the day, errors and last activity. Sortable, filterable, with an
 * optional card grid. Clicking an agent opens the shared inspector.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  fmtCompact, fmtInt, fmtRelative, fmtTime, fmtUsd, modelLabel, useGovernor, STATUS_LABEL,
  type AgentKind, type DataNature, type ExperienceProps,
} from '@sdk';
import { IconAlert, IconCheck, IconGallery, IconMenu, NatureBadge, Segmented, Sparkline, StatusPill } from '@ds';
import { AgentAvatar } from './avatar';
import {
  ACTIVE, buildBoard, groupOf, KIND_LABEL, SORT_LABEL, sortRows, STATUS_GROUP_LABEL, WAITING,
  type AgentRow, type SortKey, type StatusGroup,
} from './data';
import './agents-board.css';

type ViewMode = 'table' | 'cards';
const KINDS: AgentKind[] = ['llm', 'script', 'service', 'human'];
const GROUPS: StatusGroup[] = ['all', 'active', 'waiting', 'error', 'idle'];

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(1200);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export default function AgentsBoard({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const windowMin = Math.round(Number(config.throughputWindow ?? 15)) || 15;
  const showHumans = config.showHumans !== false;
  const showSpark = config.showSparklines !== false && quality.level !== 'minimal';
  const [rootRef, width] = useWidth<HTMLDivElement>();

  const [view, setView] = useState<ViewMode>(() => host.getLocal<ViewMode>('view', config.defaultView === 'cards' ? 'cards' : 'table'));
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>(() => host.getLocal('sort', { key: 'status' as SortKey, dir: 1 as 1 | -1 }));
  const [group, setGroup] = useState<StatusGroup>(() => host.getLocal<StatusGroup>('group', 'all'));
  const [kinds, setKinds] = useState<AgentKind[]>(() => host.getLocal<AgentKind[]>('kinds', []));
  const [dept, setDept] = useState<string>(() => host.getLocal<string>('dept', ''));

  const persist = <T,>(key: string, set: (v: T) => void) => (v: T) => {
    set(v);
    host.setLocal(key, v);
  };
  const changeView = persist<ViewMode>('view', setView);
  const changeGroup = persist<StatusGroup>('group', setGroup);
  const changeDept = persist<string>('dept', setDept);
  const toggleKind = (k: AgentKind) => {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k];
    setKinds(next);
    host.setLocal('kinds', next);
  };
  const sortBy = (key: SortKey) => {
    const next = { key, dir: (sort.key === key ? -sort.dir : key === 'name' || key === 'status' ? 1 : -1) as 1 | -1 };
    setSort(next);
    host.setLocal('sort', next);
  };

  useEffect(
    () =>
      host.provideCommands([
        { id: 'agents-board.cards', label: 'Équipe d’agents : afficher en cartes', keyword: 'vue:cartes', run: () => changeView('cards') },
        { id: 'agents-board.table', label: 'Équipe d’agents : afficher en tableau', keyword: 'vue:tableau', run: () => changeView('table') },
        { id: 'agents-board.errors', label: 'Équipe d’agents : n’afficher que les agents en erreur', keyword: 'filtre:erreur', run: () => changeGroup('error') },
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => buildBoard(g, windowMin, showHumans), [g.version, g.now, g.range.from, g.range.to, g.filters, windowMin, showHumans]);
  const counts = useMemo(() => {
    const c: Record<StatusGroup, number> = { all: data.rows.length, active: 0, waiting: 0, error: 0, idle: 0 };
    for (const r of data.rows) c[groupOf(r.status)]++;
    return c;
  }, [data]);

  const rows = useMemo(() => {
    const list = data.rows.filter(
      (r) => (group === 'all' || groupOf(r.status) === group) && (!kinds.length || kinds.includes(r.kind)) && (!dept || r.departments.some((d) => d.id === dept)),
    );
    return sortRows(list, sort.key, sort.dir);
  }, [data, group, kinds, dept, sort]);

  const narrow = width < 760 || device === 'mobile';
  const mode: ViewMode = narrow ? 'cards' : view;
  const selected = g.selection?.kind === 'agent' ? g.selection.id : null;
  const statusNature: DataNature = g.hasDemo ? 'demo' : 'real';
  const motion = quality.motion !== 'none' && !quality.suspended;
  const select = (r: AgentRow) => {
    host.select({ kind: 'agent', id: r.id });
    host.announce(`${r.name} sélectionné`);
  };

  const active = data.rows.filter((r) => r.status && ACTIVE.has(r.status)).length;
  const waiting = data.rows.filter((r) => r.status && WAITING.has(r.status)).length;
  const errors = data.rows.filter((r) => r.status === 'error').length;

  return (
    <div ref={rootRef} className="ab" data-density={config.density === 'compact' ? 'compact' : 'comfortable'} data-narrow={narrow ? 'true' : undefined}>
      <p className="sr-only" aria-live="polite">
        {`Équipe de ${data.rows.length} agents : ${active} actifs, ${waiting} en attente, ${errors} en erreur, ${data.runningTasks} tâches en cours, débit de ${fmtInt(data.totalTpm)} tokens par minute sur ${windowMin} minutes.`}
      </p>
      <div className="ab__inner">
        <section className="ab-kpis" aria-label="Indicateurs de l’équipe">
          <Kpi label="Agents actifs" value={fmtInt(active)} sub={`sur ${fmtInt(data.rows.length)} suivis`} tone="working" nature={statusNature} />
          <Kpi label="En attente" value={fmtInt(waiting)} sub="arbitrage, pause" tone="waiting" nature={statusNature} />
          <Kpi label="En erreur" value={fmtInt(errors)} sub={errors ? 'à examiner' : 'tout va bien'} tone="error" nature={statusNature} />
          <Kpi label="Tâches en cours" value={fmtInt(data.runningTasks)} sub="dont suspendues" tone="collaborating" nature={statusNature} />
          <Kpi
            label="Débit de tokens"
            value={fmtCompact(data.totalTpm)}
            unit="/ min"
            sub={`sur ${windowMin} min`}
            tone="researching"
            nature={data.tokensNature}
          />
        </section>

        <div className="ab-toolbar">
          <div className="ab-toolbar__row">
            <div className="ab-chips" role="group" aria-label="Filtrer par statut">
              {GROUPS.map((k) => (
                <button key={k} type="button" className="chip" aria-pressed={group === k} onClick={() => changeGroup(group === k && k !== 'all' ? 'all' : k)}>
                  {k !== 'all' && <i className="ab-dot" data-g={k} aria-hidden />}
                  {STATUS_GROUP_LABEL[k]}
                  <span className="ab-chip-n">{counts[k]}</span>
                </button>
              ))}
            </div>
            <div className="ab-toolbar__end">
              {g.mode === 'replay' && <span className="pill replay-banner">État au {fmtTime(g.now, true)}</span>}
              {!narrow && (
                <Segmented<ViewMode>
                  size="sm"
                  raised
                  label="Présentation"
                  value={view}
                  onChange={changeView}
                  options={[
                    { value: 'table', label: <><IconMenu size={15} /> Tableau</>, title: 'Tableau' },
                    { value: 'cards', label: <><IconGallery size={15} /> Cartes</>, title: 'Cartes' },
                  ]}
                />
              )}
            </div>
          </div>
          <div className="ab-toolbar__row">
            <div className="ab-chips" role="group" aria-label="Filtrer par type">
              {KINDS.filter((k) => showHumans || k !== 'human').map((k) => (
                <button key={k} type="button" className="chip" aria-pressed={kinds.includes(k)} onClick={() => toggleKind(k)}>
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <label className="ab-select">
              <span className="sr-only">Filtrer par département</span>
              <select className="select" value={dept} onChange={(e) => changeDept(e.target.value)}>
                <option value="">Tous les départements</option>
                {g.catalog.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'cards' && (
              <label className="ab-select">
                <span className="sr-only">Trier par</span>
                <select
                  className="select"
                  value={`${sort.key}:${sort.dir}`}
                  onChange={(e) => {
                    const [k, d] = e.target.value.split(':');
                    const next = { key: k as SortKey, dir: (Number(d) === -1 ? -1 : 1) as 1 | -1 };
                    setSort(next);
                    host.setLocal('sort', next);
                  }}
                >
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                    <option key={k} value={`${k}:${k === 'name' || k === 'status' ? 1 : -1}`}>
                      Tri : {SORT_LABEL[k].toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="ab-count" aria-hidden>
              {rows.length} affiché{rows.length > 1 ? 's' : ''} sur {data.rows.length}
            </span>
          </div>
        </div>

        {!rows.length ? (
          <div className="panel ab-empty">
            <p className="t-h3">Aucun agent ne correspond à ces filtres.</p>
            <button type="button" className="btn btn--sm" onClick={() => { changeGroup('all'); setKinds([]); host.setLocal('kinds', []); changeDept(''); }}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : mode === 'table' ? (
          <div className="panel ab-table-wrap">
            <table className="table ab-table">
              <caption className="sr-only">Statut des agents, trié par {SORT_LABEL[sort.key].toLowerCase()}</caption>
              <thead>
                <tr>
                  <Th k="name" sort={sort} onSort={sortBy}>Agent</Th>
                  <th scope="col">Type</th>
                  <Th k="status" sort={sort} onSort={sortBy}>Statut</Th>
                  <Th k="progress" sort={sort} onSort={sortBy}>Tâche en cours</Th>
                  <Th k="tpm" sort={sort} onSort={sortBy} right nature={data.tokensNature}>Tokens / min</Th>
                  <Th k="cost" sort={sort} onSort={sortBy} right nature={data.costNature}>Coût du jour</Th>
                  <Th k="errors" sort={sort} onSort={sortBy} right>Erreurs</Th>
                  <Th k="last" sort={sort} onSort={sortBy} right>Activité</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-selected={selected === r.id ? 'true' : undefined} data-g={groupOf(r.status)} onClick={() => select(r)}>
                    <td>
                      <button type="button" className="ab-who" onClick={(e) => { e.stopPropagation(); select(r); }} aria-label={`Inspecter ${r.name}`}>
                        <AgentAvatar def={r.def} kind={r.kind} status={r.status} pulse={motion && !!r.status && ACTIVE.has(r.status)} />
                        <span className="ab-who__txt">
                          <b>{r.name}</b>
                          <small>{deptLine(r)}</small>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="ab-kind">{KIND_LABEL[r.kind]}</span>
                      {r.model && <small className="ab-sub">{modelLabel(r.model)}</small>}
                    </td>
                    <td>
                      <StatusCell r={r} now={g.now} />
                    </td>
                    <td className="ab-task-cell">
                      <TaskCell r={r} motion={motion} />
                    </td>
                    <td className="r">
                      <div className="ab-tpm">
                        {showSpark && r.tpm > 0 && <Sparkline values={r.spark} width={64} height={20} color={`var(--st-${r.status && ACTIVE.has(r.status) ? r.status : 'idle'})`} label={`Tokens par minute de ${r.name} sur ${windowMin} min`} />}
                        <span className="num">{r.tpm > 0 ? fmtCompact(r.tpm) : r.kind === 'llm' ? '0' : '—'}</span>
                      </div>
                    </td>
                    <td className="r num">{r.costToday > 0 ? fmtUsd(r.costToday, r.costToday < 1 ? 3 : 2) : '—'}</td>
                    <td className="r">
                      {r.errors > 0 ? <span className="pill pill--down">{fmtInt(r.errors)}</span> : <span className="ab-zero">0</span>}
                    </td>
                    <td className="r ab-last" title={r.lastTs ? fmtTime(r.lastTs, true) : undefined}>
                      {r.lastTs ? fmtRelative(r.lastTs, g.now) : 'Indisponible'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TableFoot data={data} />
          </div>
        ) : (
          <>
            <ul className="ab-cards" aria-label="Agents">
              {rows.map((r) => (
                <li key={r.id}>
                  <AgentCard r={r} now={g.now} selected={selected === r.id} onSelect={() => select(r)} motion={motion} showSpark={showSpark} windowMin={windowMin} />
                </li>
              ))}
            </ul>
            <TableFoot data={data} />
          </>
        )}
      </div>
    </div>
  );
}

function deptLine(r: AgentRow) {
  if (!r.departments.length) return r.role;
  const names = r.departments.map((d) => d.name);
  return names.length > 2 ? `${names.slice(0, 2).join(' · ')} +${names.length - 2}` : names.join(' · ');
}

function Kpi({ label, value, unit, sub, tone, nature }: { label: string; value: string; unit?: string; sub: string; tone: string; nature: DataNature }) {
  return (
    <div className="ab-kpi" style={{ ['--sc' as string]: `var(--st-${tone})` }}>
      <div className="ab-kpi__row">
        <span className="ab-kpi__label">
          <i className="ab-kpi__dot" aria-hidden />
          {label}
        </span>
        <span className="ab-kpi__nat">
          <NatureBadge nature={nature} />
        </span>
      </div>
      <div className="ab-kpi__row ab-kpi__row--value">
        <span className="ab-kpi__value num">
          {value}
          {unit && <small> {unit}</small>}
        </span>
        <span className="ab-kpi__sub">{sub}</span>
      </div>
    </div>
  );
}

function Th({ k, sort, onSort, children, right, nature }: { k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; children: ReactNode; right?: boolean; nature?: DataNature }) {
  const on = sort.key === k;
  return (
    <th scope="col" className={right ? 'r' : undefined} aria-sort={on ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="ab-th" data-on={on ? 'true' : undefined} onClick={() => onSort(k)} aria-label={`Trier par ${SORT_LABEL[k].toLowerCase()}`}>
        <span>{children}</span>
        <i aria-hidden>{on ? (sort.dir === 1 ? '↑' : '↓') : '↕'}</i>
      </button>
      {nature && (
        <span className="ab-th-nat">
          <NatureBadge nature={nature} />
        </span>
      )}
    </th>
  );
}

function StatusCell({ r, now }: { r: AgentRow; now: number }) {
  if (!r.status) {
    return (
      <span className="ab-untracked" title="Aucun événement de statut pour cet acteur : son état n’est pas observé">
        Non observé
      </span>
    );
  }
  return (
    <div className="ab-status">
      <StatusPill status={r.status} />
      {r.statusSince != null && <small className="ab-sub">depuis {fmtRelative(r.statusSince, now).replace('il y a ', '')}</small>}
    </div>
  );
}

function TaskCell({ r, motion }: { r: AgentRow; motion: boolean }) {
  if (!r.task) return <span className="ab-sub ab-notask">{r.status === 'error' ? 'Dernière tâche en échec' : 'Aucune tâche en cours'}</span>;
  const pct = r.progress ? r.progress.done / r.progress.total : null;
  return (
    <div className="ab-task">
      <span className="ab-task__title" title={r.task.title}>
        {r.task.title}
      </span>
      <ProgressBar pct={pct} status={r.status} motion={motion} label={`Progression de « ${r.task.title} »`} />
      <small className="ab-sub">
        {r.progress ? `${r.progress.done}/${r.progress.total} étapes` : 'Progression indisponible (étapes non annoncées)'}
        {r.task.priority === 'high' || r.task.priority === 'critical' ? ' · priorité haute' : ''}
      </small>
    </div>
  );
}

function ProgressBar({ pct, status, motion, label }: { pct: number | null; status: AgentRow['status']; motion: boolean; label: string }) {
  const sc = `var(--st-${status ?? 'idle'})`;
  if (pct == null)
    return (
      <div className="ab-bar" data-indeterminate="true" data-motion={motion ? 'true' : undefined} style={{ ['--sc' as string]: sc }} role="progressbar" aria-label={label} aria-valuetext="Progression indisponible">
        <i />
      </div>
    );
  const p = Math.max(0.04, Math.min(1, pct));
  return (
    <div className="ab-bar" style={{ ['--sc' as string]: sc }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)}>
      <i style={{ width: `${p * 100}%` }} />
    </div>
  );
}

function AgentCard({ r, now, selected, onSelect, motion, showSpark, windowMin }: { r: AgentRow; now: number; selected: boolean; onSelect: () => void; motion: boolean; showSpark: boolean; windowMin: number }) {
  return (
    <article className="ab-card" data-selected={selected ? 'true' : undefined} data-g={groupOf(r.status)} style={{ ['--sc' as string]: `var(--st-${r.status ?? 'offline'})` }}>
      <button type="button" className="ab-card__hit" onClick={onSelect} aria-label={`Inspecter ${r.name}, ${r.status ? STATUS_LABEL[r.status] : 'statut non observé'}`} />
      <header className="ab-card__head">
        <AgentAvatar def={r.def} kind={r.kind} status={r.status} size={42} pulse={motion && !!r.status && ACTIVE.has(r.status)} />
        <div className="ab-card__who">
          <b>{r.name}</b>
          <small>
            {KIND_LABEL[r.kind]}
            {r.model ? ` · ${modelLabel(r.model)}` : ''}
          </small>
        </div>
        {r.status ? <StatusPill status={r.status} /> : <span className="ab-untracked">Non observé</span>}
      </header>
      <div className="ab-card__task">
        <TaskCell r={r} motion={motion} />
      </div>
      <dl className="ab-card__stats">
        <div>
          <dt>Tokens / min</dt>
          <dd className="num">{r.tpm > 0 ? fmtCompact(r.tpm) : '—'}</dd>
        </div>
        <div>
          <dt>Coût du jour</dt>
          <dd className="num" title={r.costToday > 0 ? fmtUsd(r.costToday, 4) : undefined}>{r.costToday > 0 ? fmtUsd(r.costToday) : '—'}</dd>
        </div>
        <div>
          <dt>Erreurs</dt>
          <dd className="num" data-bad={r.errors > 0 ? 'true' : undefined}>
            {fmtInt(r.errors)}
          </dd>
        </div>
      </dl>
      <footer className="ab-card__foot">
        {showSpark && r.tpm > 0 ? (
          <Sparkline values={r.spark} width={96} height={22} color={`var(--st-${r.status && ACTIVE.has(r.status) ? r.status : 'idle'})`} label={`Tokens par minute sur ${windowMin} min`} />
        ) : (
          <span />
        )}
        <span className="ab-sub" title={r.lastTs ? fmtTime(r.lastTs, true) : undefined}>
          {r.lastTs ? fmtRelative(r.lastTs, now) : 'Activité indisponible'}
        </span>
      </footer>
      <span className="ab-card__nat">
        <NatureBadge nature={r.natureTokens} />
      </span>
    </article>
  );
}

function TableFoot({ data }: { data: ReturnType<typeof buildBoard> }) {
  const allOk = !data.rows.some((r) => r.status === 'error');
  return (
    <p className="ab-foot">
      {allOk ? <IconCheck size={15} /> : <IconAlert size={15} />}
      <span>{allOk ? 'Aucun agent en erreur.' : 'Au moins un agent est en erreur.'}</span>
      <span className="t-muted">
        Débit mesuré sur les {data.windowMin} dernières minutes (appels modèle) · coût du jour depuis minuit · erreurs sur la période affichée · progression = étapes annoncées par la tâche.
      </span>
      <NatureBadge nature={data.costNature} label={data.costNature === 'demo' ? 'Coûts de démonstration' : data.costNature === 'real' ? 'Coûts facturés' : 'Coûts estimés (prix catalogue)'} />
    </p>
  );
}
