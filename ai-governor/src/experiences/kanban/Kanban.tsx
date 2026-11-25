/**
 * Kanban des tâches — the real tasks of the governor in status columns.
 *
 * Columns are the projected task status (never a manual state). Moving a card
 * maps to a gateway command: drop into « Suspendues » → task.pause (allowed
 * from a drag: no spend), drop a suspended card into « En cours » →
 * task.resume with interaction 'drag' (the gateway refuses: a resume can
 * spend, so it needs an explicit click), anything else is explained, never
 * faked. Keyboard: Space picks a card, arrows choose the column, Enter drops.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  displaySummary, fmtCompact, fmtInt, fmtUsd, modelLabel, PERIOD_LABEL, useCatalogIndex, useGovernor,
  type ExperienceProps, type GovEvent, type HostApi, type Interaction, type TaskRuntime,
} from '@sdk';
import { ExplorerTree, IconChevron, IconClose, IconFilter, IconPlus, IconSearch, IconSidebar, LogTerminal, NatureBadge, Segmented, type LogLine, type TreeNode } from '@ds';
import { Card } from './Card';
import { Detail } from './Detail';
import {
  COL_LABEL, COLS, colOf, dropHint, GROUPING_LABEL, lanesOf, newIndex, planMove, shortId, SORT_LABEL, sortTasks, stepsOf, tasksForBoard, updateIndex,
  type Col, type Grouping, type SortKey, type StepInfo,
} from './data';
import './kanban.css';

type Density = 'comfortable' | 'compact';
type Hint = { id: number; tone: 'ok' | 'warn' | 'info'; text: string; taskId?: string; action?: string };

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

function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ w: 1200, h: 800 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const GROUPINGS: Grouping[] = ['status', 'department', 'agent', 'priority'];
const SORTS: SortKey[] = ['recent', 'priority', 'cost'];

export default function Kanban({ host, config, device }: ExperienceProps) {
  const g = useGovernor();
  const idx = useCatalogIndex();
  const root = useRef<HTMLDivElement>(null);
  const { w: width, h: height } = useSize(root);
  const mode: 'narrow' | 'medium' | 'wide' = device === 'mobile' || width < 700 ? 'narrow' : width < 1000 ? 'medium' : 'wide';
  const replay = g.mode === 'replay';

  const [grouping, setGrouping] = useLocalPref<Grouping>(host, 'grouping', (config.defaultGrouping as Grouping) ?? 'status');
  const [sort, setSort] = useLocalPref<SortKey>(host, 'sort', 'recent');
  const [density, setDensity] = useLocalPref<Density>(host, 'density', (config.density as Density) ?? 'comfortable');
  const [explorerPref, setExplorer] = useLocalPref<boolean | null>(host, 'explorer', null);
  const [logPref, setLogOpen] = useLocalPref<boolean | null>(host, 'log', null);
  // Auto: the log docks under the board only when there is room for both.
  const logOpen = logPref ?? (config.showLog !== false && height >= 760);
  const explorerOpen = explorerPref ?? (config.showExplorer !== false && width >= 1500);
  const [scope, setScope] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() => (g.selection?.kind === 'task' ? g.selection.id : null));
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [drag, setDrag] = useState<{ id: string; from: Col } | null>(null);
  const [over, setOver] = useState<Col | null>(null);
  const [picked, setPicked] = useState<{ id: string; from: Col; target: Col } | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [mobileCol, setMobileCol] = useState<Col | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [logTab, setLogTab] = useState('all');
  const compact = density === 'compact';
  const maxCards = Math.max(5, Number(config.maxCards ?? 30));

  // A task selected elsewhere (inspector, search) opens its fiche here.
  useEffect(() => {
    if (g.selection?.kind === 'task' && g.state.tasks[g.selection.id]) setSelectedId(g.selection.id);
  }, [g.selection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint((h) => (h?.id === hint.id ? null : h)), hint.tone === 'warn' ? 9000 : 6000);
    return () => clearTimeout(id);
  }, [hint]);

  const showHint = useCallback((tone: Hint['tone'], text: string, taskId?: string, action?: string) => {
    setHint({ id: Date.now(), tone, text, taskId, action });
  }, []);

  /* ---------- data ---------- */
  const ix = useRef(newIndex());
  const byTask = useMemo(() => updateIndex(ix.current, g.allEvents()).byTask, [g.version]); // eslint-disable-line react-hooks/exhaustive-deps
  const steps = useMemo(() => {
    const cache = new Map<string, StepInfo>();
    return (t: TaskRuntime) => {
      let s = cache.get(t.id);
      if (!s) cache.set(t.id, (s = stepsOf(t, byTask.get(t.id), g.now)));
      return s;
    };
  }, [byTask, g.version, g.now]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodTasks = useMemo(() => tasksForBoard(g.state.tasks, g.range, g.filters), [g.version, g.state, g.range.from, g.range.to, g.filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const agentName = useCallback((id?: string) => (id ? idx.agents.get(id)?.name ?? id : '—'), [idx]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(() => {
    return periodTasks.filter((t) => {
      if (scope !== 'all') {
        const d = t.departmentId ? idx.departments.get(t.departmentId) : undefined;
        if (scope.startsWith('d:') && t.departmentId !== scope.slice(2)) return false;
        if (scope.startsWith('g:') && d?.group !== scope.slice(2)) return false;
      }
      if (!q) return true;
      const d = t.departmentId ? idx.departments.get(t.departmentId)?.name : '';
      return `${shortId(t.id)} ${t.id} ${t.title} ${agentName(t.agentId)} ${d} ${t.project ?? ''}`.toLowerCase().includes(q);
    });
  }, [periodTasks, scope, q, idx, agentName]);

  const cols = useMemo(() => COLS.filter((c) => (c.id !== 'succeeded' || config.showDone !== false) && (c.id !== 'failed' || config.showFailed !== false)), [config.showDone, config.showFailed]);
  const counts = useMemo(() => {
    const m: Record<Col, number> = { pending: 0, running: 0, paused: 0, succeeded: 0, failed: 0 };
    for (const t of visible) m[colOf(t)]++;
    return m;
  }, [visible]);
  const lanes = useMemo(() => lanesOf(visible, grouping, idx.departments, idx.agents), [visible, grouping, idx]);
  const split = useCallback(
    (list: TaskRuntime[]) => {
      const m = new Map<Col, TaskRuntime[]>(COLS.map((c) => [c.id, []]));
      for (const t of sortTasks(list, sort)) m.get(colOf(t))!.push(t);
      return m;
    },
    [sort],
  );
  const laneCols = useMemo(() => lanes.map((l) => ({ lane: l, cols: split(l.tasks) })), [lanes, split]);
  const totalCost = useMemo(() => visible.reduce((s, t) => s + t.costUsd, 0), [visible]);

  const selected = selectedId ? g.state.tasks[selectedId] : undefined;
  const open = useCallback(
    (id: string) => {
      setSelectedId((cur) => (cur === id && mode !== 'narrow' ? null : id));
    },
    [mode],
  );
  const close = useCallback(() => setSelectedId(null), []);

  /* ---------- moves ---------- */
  const move = useCallback(
    async (t: TaskRuntime, to: Col, interaction: Interaction) => {
      const from = colOf(t);
      if (from === to) return;
      if (replay) {
        showHint('info', 'Replay : vous consultez l’état passé, le tableau est en lecture seule.');
        return;
      }
      const plan = planMove(from, to);
      if (plan.kind === 'invalid') {
        showHint('info', `${COL_LABEL[from]} → ${COL_LABEL[to]} : ${plan.reason}`, t.id, plan.reason.includes('Relancer') ? 'open' : undefined);
        host.announce(plan.reason);
        return;
      }
      const res = await host.request(plan.kind === 'pause' ? { type: 'task.pause', taskId: t.id } : { type: 'task.resume', taskId: t.id }, interaction);
      if (res.status === 'executed') showHint('ok', `${shortId(t.id)} ${plan.kind === 'pause' ? 'suspendue' : 'reprise'}.`, t.id);
      else if (res.status === 'denied' && plan.kind === 'resume' && interaction === 'drag')
        showHint('warn', 'Reprise refusée par glisser-déposer : reprendre peut consommer des tokens, la passerelle exige un clic explicite et une confirmation. Utilisez « Reprendre » dans la fiche.', t.id, 'open');
      else if (res.status === 'denied' && res.reason !== 'Annulé par l’utilisateur') showHint('warn', res.reason, t.id);
    },
    [host, replay, showHint],
  );

  const onDragStart = useCallback((e: DragEvent<HTMLDivElement>, t: TaskRuntime, col: Col) => {
    e.dataTransfer.setData('text/plain', t.id);
    e.dataTransfer.effectAllowed = 'move';
    setDrag({ id: t.id, from: col });
  }, []);
  const onDragEnd = useCallback(() => {
    setDrag(null);
    setOver(null);
  }, []);
  const dropProps = (col: Col) => ({
    onDragOver: (e: DragEvent) => {
      if (!drag) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (over !== col) setOver(col);
    },
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setOver((o) => (o === col ? null : o));
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      const id = drag?.id ?? e.dataTransfer.getData('text/plain');
      setDrag(null);
      setOver(null);
      const t = id ? g.state.tasks[id] : undefined;
      if (t) void move(t, col, 'drag');
    },
  });

  const colIds = cols.map((c) => c.id);
  const onCardKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>, t: TaskRuntime, col: Col) => {
      const key = e.key;
      if (picked && picked.id === t.id) {
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          const i = colIds.indexOf(picked.target);
          const next = colIds[Math.max(0, Math.min(colIds.length - 1, i + (key === 'ArrowRight' ? 1 : -1)))];
          setPicked({ ...picked, target: next });
          if (mode === 'narrow') setMobileCol(next);
          const h = dropHint(picked.from, next);
          host.announce(`Cible : ${COL_LABEL[next]}${h ? ` — ${h.text}` : ' — colonne d’origine'}`);
        } else if (key === 'Enter' || key === ' ') {
          const target = picked.target;
          setPicked(null);
          if (target === picked.from) host.announce('Carte reposée à sa place.');
          else void move(t, target, 'keyboard');
        } else if (key === 'Escape') {
          setPicked(null);
          if (mode === 'narrow') setMobileCol(picked.from);
          host.announce('Déplacement annulé.');
        } else return;
        e.preventDefault();
        return;
      }
      if (key === ' ') {
        if (replay) host.announce('Replay : lecture seule.');
        else {
          setPicked({ id: t.id, from: col, target: col });
          host.announce(`${shortId(t.id)} saisie. Flèches gauche et droite pour choisir une colonne, Entrée pour déposer, Échap pour annuler.`);
        }
      } else if (key === 'Enter') open(t.id);
      else if (key === 'ArrowDown' || key === 'ArrowUp') {
        const list = [...(e.currentTarget.closest('[data-drop]')?.querySelectorAll<HTMLElement>('.kb-card') ?? [])];
        const i = list.indexOf(e.currentTarget);
        list[i + (key === 'ArrowDown' ? 1 : -1)]?.focus();
      } else if (key === 'ArrowLeft' || key === 'ArrowRight') {
        const cells = [...(e.currentTarget.closest('[data-row]')?.querySelectorAll<HTMLElement>('[data-drop]') ?? [])];
        const ci = cells.findIndex((c) => c.contains(e.currentTarget));
        const step = key === 'ArrowRight' ? 1 : -1;
        for (let k = ci + step; k >= 0 && k < cells.length; k += step) {
          const c = cells[k].querySelector<HTMLElement>('.kb-card');
          if (c) {
            c.focus();
            break;
          }
        }
      } else return;
      e.preventDefault();
    },
    [picked, colIds.join(), mode, host, move, open, replay], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ---------- palette commands ---------- */
  useEffect(
    () =>
      host.provideCommands([
        ...GROUPINGS.map((gr) => ({ id: `group-${gr}`, label: `Kanban : grouper par ${GROUPING_LABEL[gr].toLowerCase()}`, keyword: 'kanban', run: () => setGrouping(gr) })),
        { id: 'density', label: 'Kanban : basculer la densité des cartes', keyword: 'kanban', run: () => setDensity(density === 'compact' ? 'comfortable' : 'compact') },
        { id: 'log', label: 'Kanban : afficher ou masquer le journal de la tâche', keyword: 'kanban', run: () => setLogOpen(!logOpen) },
      ]),
    [host, setGrouping, setDensity, setLogOpen, density, logOpen],
  );

  /* ---------- pieces ---------- */
  const card = (t: TaskRuntime, col: Col) => (
    <Card
      key={t.id}
      t={t}
      col={col}
      agent={t.agentId ? idx.agents.get(t.agentId) : undefined}
      dept={t.departmentId ? idx.departments.get(t.departmentId) : undefined}
      steps={steps(t)}
      compact={compact}
      selected={t.id === selectedId}
      picked={picked?.id === t.id}
      canDrag={!replay && mode !== 'narrow'}
      onOpen={open}
      onKey={onCardKey}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  );

  const cellCards = (list: TaskRuntime[], col: Col, key: string, cap: number) => {
    const lim = limits[key] ?? cap;
    return (
      <>
        {list.slice(0, lim).map((t) => card(t, col))}
        {list.length > lim && (
          <button type="button" className="kb-more" onClick={() => setLimits((l) => ({ ...l, [key]: lim + cap }))}>
            Afficher {Math.min(cap, list.length - lim)} de plus <span className="t-muted">({list.length - lim} masquée(s))</span>
          </button>
        )}
      </>
    );
  };

  const dropState = (col: Col) => {
    const from = drag?.from ?? (picked ? picked.from : null);
    const target = drag ? over : picked?.target ?? null;
    const h = from ? dropHint(from, col) : null;
    return { 'data-over': target === col || undefined, 'data-drop-ok': h?.ok, hintText: target === col ? h?.text : undefined };
  };

  const colHead = (c: (typeof COLS)[number], count: number) => (
    <header className="kb-col__head" style={{ ['--tone' as string]: c.tone }}>
      <i className="kb-col__dot" aria-hidden />
      <h3>{c.label}</h3>
      <span className="kb-count num" aria-label={`${count} tâche(s)`}>
        {count}
      </span>
    </header>
  );

  const statusBoard = (
    <div className="kb-cols" data-row>
      {cols.map((c) => {
        const list = laneCols[0]?.cols.get(c.id) ?? [];
        const ds = dropState(c.id);
        return (
          <section key={c.id} className="kb-col" data-col={c.id} data-drop aria-label={`${c.label} : ${list.length} tâche(s)`} data-over={ds['data-over']} data-drop-ok={ds['data-drop-ok']} {...dropProps(c.id)}>
            {colHead(c, list.length)}
            {ds.hintText && <div className="kb-drop-hint" data-ok={ds['data-drop-ok']}>{ds.hintText}</div>}
            <div className="kb-col__body">
              {list.length ? cellCards(list, c.id, `all:${c.id}`, maxCards) : <p className="kb-empty">{q || scope !== 'all' ? 'Aucune carte ne correspond à la recherche ou au filtre.' : c.empty}</p>}
            </div>
          </section>
        );
      })}
    </div>
  );

  const [closedLanes, setClosedLanes] = useState<Record<string, boolean>>({});
  const laneBoard = (
    <div className="kb-lanes" style={{ ['--ncol' as string]: cols.length }}>
      <div className="kb-lanes__head">
        {cols.map((c) => (
          <div key={c.id} className="kb-col kb-col--headonly">
            {colHead(c, counts[c.id])}
          </div>
        ))}
      </div>
      {laneCols.map(({ lane, cols: m }) => {
        const isOpen = !closedLanes[lane.id];
        return (
          <section key={lane.id} className="kb-lane" aria-label={`${lane.label} : ${lane.tasks.length} tâche(s)`}>
            <button type="button" className="kb-lane__head" aria-expanded={isOpen} onClick={() => setClosedLanes((s) => ({ ...s, [lane.id]: isOpen }))}>
              <IconChevron size={12} style={{ transform: isOpen ? 'rotate(90deg)' : undefined }} />
              {lane.tone && <i className="kb-lane__sw" style={{ background: lane.tone }} aria-hidden />}
              {lane.hue != null && <i className="kb-lane__sw kb-lane__sw--round" style={{ background: `hsl(${lane.hue} 58% 45%)` }} aria-hidden />}
              <span className="kb-lane__label">{lane.label}</span>
              <span className="kb-count num">{lane.tasks.length}</span>
              <span className="kb-lane__mini t-micro t-muted" title={`Répartition : ${cols.map((c) => c.label.toLowerCase()).join(' · ')}`}>
                {cols.map((c) => `${(m.get(c.id) ?? []).length}`).join(' · ')}
              </span>
            </button>
            {isOpen && (
              <div className="kb-lane__row" data-row>
                {cols.map((c) => {
                  const list = m.get(c.id) ?? [];
                  const ds = dropState(c.id);
                  return (
                    <div key={c.id} className="kb-cell" data-col={c.id} data-drop aria-label={`${lane.label}, ${c.label} : ${list.length}`} data-over={ds['data-over']} data-drop-ok={ds['data-drop-ok']} {...dropProps(c.id)}>
                      {cellCards(list, c.id, `${lane.id}:${c.id}`, Math.min(maxCards, 6))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {!laneCols.length && <p className="kb-empty">Aucune tâche ne correspond.</p>}
    </div>
  );

  /* ---------- explorer ---------- */
  const tree = useMemo<TreeNode[]>(() => {
    const per = new Map<string, { all: number; active: number }>();
    for (const t of periodTasks) {
      const k = t.departmentId ?? '—';
      const v = per.get(k) ?? { all: 0, active: 0 };
      v.all++;
      if (t.status === 'running' || t.status === 'paused' || t.status === 'pending') v.active++;
      per.set(k, v);
    }
    const groups = new Map<string, TreeNode[]>();
    for (const d of g.catalog.departments) {
      const v = per.get(d.id) ?? { all: 0, active: 0 };
      const node: TreeNode = {
        id: `d:${d.id}`,
        label: d.name,
        hint: d.mission,
        icon: <i className="kb-tree-sw" style={{ background: `var(--${d.tone})` }} />,
        badge: (
          <>
            {v.active > 0 && <i className="kb-tree-live" title={`${v.active} active(s)`} />}
            <span className="num">{v.all}</span>
          </>
        ),
      };
      if (!groups.has(d.group)) groups.set(d.group, []);
      groups.get(d.group)!.push(node);
    }
    return [
      { id: 'all', label: 'Toutes les tâches', badge: <span className="num">{periodTasks.length}</span> },
      ...[...groups.entries()].map(([gname, children]) => ({ id: `g:${gname}`, label: gname, children })),
    ];
  }, [periodTasks, g.catalog.departments]);
  const scopeLabel = scope === 'all' ? null : scope.startsWith('d:') ? idx.departments.get(scope.slice(2))?.name : scope.slice(2);

  const explorer = (
    <div className="kb-explorer">
      <ExplorerTree title="Départements" nodes={tree} selectedId={scope} onSelect={(id) => setScope(id)} />
      <p className="kb-explorer__note t-micro t-muted">Filtre local du tableau. Les filtres globaux (fournisseur, modèle, projet…) restent dans « Filtrer ».</p>
    </div>
  );

  /* ---------- log terminal ---------- */
  const selSteps = selected ? steps(selected) : undefined;
  const logLines = useMemo<LogLine[]>(() => {
    if (!selected || !selSteps) return [];
    return selSteps.events
      .filter((e) => logTab === 'all' || e.status === 'failed')
      .slice(-200)
      .map((e) => logLine(e, agentName, idx.agents.get(e.actor?.id ?? '')?.avatar.hue, g.canViewConfidential));
  }, [selected, selSteps, logTab, agentName, idx, g.canViewConfidential]);
  const errCount = selSteps ? selSteps.events.filter((e) => e.status === 'failed').length : 0;
  const terminal = selected && (
    <LogTerminal
      tabs={[
        { id: 'all', label: `Journal · ${shortId(selected.id)}`, count: selSteps?.events.length },
        { id: 'errors', label: 'Erreurs', count: errCount },
      ]}
      active={logTab}
      onTab={setLogTab}
      lines={logLines}
      emptyText={logTab === 'errors' ? 'Aucune erreur pour cette tâche.' : 'Aucun événement.'}
      toolbar={
        mode !== 'narrow' && (
          <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={() => setLogOpen(false)} aria-label="Masquer le journal">
            <IconChevron size={14} style={{ transform: 'rotate(90deg)' }} />
          </button>
        )
      }
    />
  );

  /* ---------- header ---------- */
  const activeFilters = g.filters.providers.length + g.filters.models.length + g.filters.projects.length + g.filters.departments.length + g.filters.agents.length + g.filters.categories.length;
  const newCardHelp = 'Les tâches sont créées par les agents et le moteur opérationnel, jamais depuis le tableau : aucune commande de création n’existe.';
  const toolbar = (
    <div className="kb-toolbar" role="toolbar" aria-label="Outils du tableau">
      {mode !== 'narrow' && (
        <button type="button" className="btn btn--sm kb-tbtn" aria-pressed={explorerOpen} onClick={() => setExplorer(!explorerOpen)} aria-label="Explorateur des départements" title="Explorateur des départements">
          <IconSidebar size={15} />
          <span className="kb-tbtn__lbl">Départements</span>
        </button>
      )}
      <button type="button" className="btn btn--sm kb-tbtn" onClick={() => host.openFilters()} aria-label={`Filtrer${activeFilters ? ` (${activeFilters} filtre(s) actif(s))` : ''}`} title="Filtres globaux">
        <IconFilter size={15} />
        <span className="kb-tbtn__lbl">Filtrer</span>
        {activeFilters > 0 && <span className="kb-badge num">{activeFilters}</span>}
      </button>
      <label className="kb-select">
        <span>Grouper par</span>
        <select value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)}>
          {GROUPINGS.map((x) => (
            <option key={x} value={x}>
              {GROUPING_LABEL[x]}
            </option>
          ))}
        </select>
      </label>
      <label className="kb-select">
        <span>Trier</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {SORTS.map((x) => (
            <option key={x} value={x}>
              {SORT_LABEL[x]}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <button type="button" className="btn btn--sm kb-tbtn" aria-pressed={logOpen} onClick={() => setLogOpen(!logOpen)} aria-label={`Journal des événements de ${shortId(selected.id)}`} title={`Journal des événements de ${shortId(selected.id)}`}>
          <TermGlyph />
          <span className="kb-tbtn__lbl">Journal</span>
        </button>
      )}
      <Segmented
        size="sm"
        label="Densité des cartes"
        value={density}
        onChange={(v) => setDensity(v)}
        options={[
          { value: 'comfortable', label: <DensityGlyph dense={false} />, title: 'Cartes confortables' },
          { value: 'compact', label: <DensityGlyph dense />, title: 'Cartes compactes' },
        ]}
      />
    </div>
  );
  const topEnd = (
    <div className="kb-top__end">
      <label className="kb-search">
        <IconSearch size={15} />
        <span className="sr-only">Rechercher dans le tableau</span>
        <input type="search" placeholder="Rechercher une carte…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <span className="kb-new">
        <button type="button" className="btn btn--sm btn--primary kb-new__btn" aria-disabled="true" aria-describedby="kb-new-help" onClick={() => showHint('info', newCardHelp)}>
          <IconPlus size={14} /> Nouvelle carte
        </button>
        <span id="kb-new-help" role="tooltip" className="kb-tip">
          {newCardHelp}
        </span>
      </span>
    </div>
  );

  const running = counts.running;
  const head = (
    <div className="kb-top">
      <div className="kb-top__row">
      <div className="kb-head__title">
        <h2>Tableau des tâches</h2>
        <span className="kb-live" data-mode={g.mode}>
          <i aria-hidden />
          {replay ? 'Replay' : 'Direct'}
        </span>
        {g.hasDemo && <NatureBadge nature="demo" />}
      </div>
      {topEnd}
      </div>
      <div className="kb-top__row">
      <p className="kb-head__meta t-micro">
        <span>Période : {PERIOD_LABEL[g.period.preset] ?? 'personnalisée'}</span>
        <span>
          {fmtInt(visible.length)} tâche(s){scopeLabel ? ` · ${scopeLabel}` : ''}
          {q ? ` · « ${query} »` : ''}
        </span>
        <span>{running} en cours</span>
        <span>
          Coût {fmtUsd(totalCost)} <NatureBadge nature="estimated" />
        </span>
      </p>
      {toolbar}
      </div>
    </div>
  );

  const summary = `Tableau des tâches, ${visible.length} tâche(s) : ${cols.map((c) => `${counts[c.id]} ${c.label.toLowerCase()}`).join(', ')}.`;
  const hintBox = hint && (
    <div className="kb-hint" data-tone={hint.tone} role="status">
      <span className="kb-hint__txt">{hint.text}</span>
      {hint.action === 'open' && hint.taskId && (
        <button type="button" className="btn btn--sm" onClick={() => { setSelectedId(hint.taskId!); setHint(null); }}>
          Ouvrir la fiche
        </button>
      )}
      <button type="button" className="btn btn--sm btn--icon btn--ghost" onClick={() => setHint(null)} aria-label="Fermer le message">
        <IconClose size={13} />
      </button>
    </div>
  );

  const detail = (sheet: boolean) =>
    selected && (
      <Detail
        t={selected}
        agent={selected.agentId ? idx.agents.get(selected.agentId) : undefined}
        dept={selected.departmentId ? idx.departments.get(selected.departmentId) : undefined}
        agentName={agentName}
        steps={steps(selected)}
        now={g.now}
        replay={replay}
        canViewConfidential={g.canViewConfidential}
        host={host}
        onClose={close}
        sheet={sheet}
        log={sheet && <section className="kb-sec kb-sheet-log"><h3 className="kb-sec__title">Journal</h3><div className="kb-sheet-log__term">{terminal}</div></section>}
      />
    );

  /* ---------- narrow (phones) ---------- */
  if (mode === 'narrow') {
    const firstWithCards = cols.find((c) => counts[c.id] > 0)?.id ?? cols[0].id;
    const activeCol = mobileCol && colIds.includes(mobileCol) ? mobileCol : counts.running ? 'running' : firstWithCards;
    return (
      <div ref={root} className="kb kb--narrow" data-density={density}>
        <p className="sr-only">{summary}</p>
        <span id="kb-move-help" className="sr-only">Entrée : ouvrir la fiche. Espace : saisir la carte, flèches gauche et droite pour choisir la colonne, Entrée pour déposer, Échap pour annuler.</span>
        <div className="kb-m-head">
          <div className="kb-m-head__row">
            <h2>Tâches</h2>
            <span className="kb-live" data-mode={g.mode}>
              <i aria-hidden />
              {replay ? 'Replay' : 'Direct'}
            </span>
            {g.hasDemo && <NatureBadge nature="demo" />}
            <span className="kb-m-head__end">
              <button type="button" className="icon-btn kb-m-ib" onClick={() => host.openFilters()} aria-label={`Filtrer${activeFilters ? ` (${activeFilters} actif(s))` : ''}`}>
                <IconFilter size={17} />
                {activeFilters > 0 && <span className="badge-count">{activeFilters}</span>}
              </button>
              <button type="button" className="icon-btn kb-m-ib" aria-expanded={optionsOpen} aria-controls="kb-m-options" onClick={() => setOptionsOpen(!optionsOpen)} aria-label="Options du tableau">
                <SlidersGlyph />
              </button>
            </span>
          </div>
          <label className="kb-search kb-search--m">
            <IconSearch size={15} />
            <span className="sr-only">Rechercher dans le tableau</span>
            <input type="search" placeholder="Rechercher une carte…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          {optionsOpen && (
            <div id="kb-m-options" className="kb-m-options">
              <label className="kb-select">
                <span>Grouper</span>
                <select value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)}>
                  {GROUPINGS.map((x) => (
                    <option key={x} value={x}>
                      {GROUPING_LABEL[x]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="kb-select">
                <span>Trier</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  {SORTS.map((x) => (
                    <option key={x} value={x}>
                      {SORT_LABEL[x]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="kb-select">
                <span>Département</span>
                <select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="all">Tous</option>
                  {g.catalog.departments.map((d) => (
                    <option key={d.id} value={`d:${d.id}`}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <Segmented size="sm" label="Densité des cartes" value={density} onChange={(v) => setDensity(v)} options={[{ value: 'comfortable', label: 'Confort' }, { value: 'compact', label: 'Compact' }]} />
              <p className="t-micro t-muted kb-m-options__note">{newCardHelp}</p>
            </div>
          )}
          <div className="kb-switch" role="tablist" aria-label="Colonnes">
            {cols.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={activeCol === c.id}
                data-target={picked && picked.target === c.id ? (dropHint(picked.from, c.id)?.ok ?? 'self') : undefined}
                style={{ ['--tone' as string]: c.tone }}
                onClick={() => setMobileCol(c.id)}
              >
                <i aria-hidden />
                {c.label}
                <span className="num">{counts[c.id]}</span>
              </button>
            ))}
          </div>
        </div>
        {hintBox}
        <div className="kb-m-list" role="tabpanel" aria-label={COL_LABEL[activeCol]} data-row>
          {picked && <p className="kb-m-picked t-micro">Carte saisie : choisissez une colonne avec ← →, Entrée pour déposer.</p>}
          {laneCols.map(({ lane, cols: m }) => {
            const list = m.get(activeCol) ?? [];
            if (!list.length && grouping !== 'status') return null;
            return (
              <section key={lane.id} className="kb-m-lane" data-drop>
                {grouping !== 'status' && (
                  <h3 className="kb-m-lane__head">
                    {lane.tone && <i className="kb-lane__sw" style={{ background: lane.tone }} aria-hidden />}
                    {lane.label} <span className="num t-muted">{list.length}</span>
                  </h3>
                )}
                {list.length ? cellCards(list, activeCol, `${lane.id}:${activeCol}:m`, maxCards) : <p className="kb-empty">{COLS.find((c) => c.id === activeCol)?.empty}</p>}
              </section>
            );
          })}
          {grouping !== 'status' && counts[activeCol] === 0 && <p className="kb-empty">{COLS.find((c) => c.id === activeCol)?.empty}</p>}
        </div>
        {selected && (
          <div className="kb-sheet" role="dialog" aria-modal="false" aria-label={`Fiche ${shortId(selected.id)}`}>
            {detail(true)}
          </div>
        )}
      </div>
    );
  }

  /* ---------- medium / wide ---------- */
  const showSide = !!selected && mode === 'wide';
  const showLog = !!selected && logOpen;
  const mainCol = explorerOpen && mode === 'wide' ? 2 : 1;
  const gridCols = [explorerOpen && mode === 'wide' ? '236px' : '', 'minmax(0, 1fr)', showSide ? 'minmax(320px, 360px)' : ''].filter(Boolean).join(' ');
  return (
    <div ref={root} className="kb" data-mode={mode} data-density={density} data-side={showSide || undefined} data-dragging={drag ? 'true' : undefined}>
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
      <span id="kb-move-help" className="sr-only">
        Entrée : ouvrir la fiche. Espace : saisir la carte, flèches gauche et droite pour choisir la colonne, Entrée pour déposer, Échap pour annuler.
      </span>
      <div className="kb__grid" style={{ gridTemplateColumns: gridCols, gridTemplateRows: showLog ? 'minmax(0, 1fr) 196px' : 'minmax(0, 1fr)' }}>
        {explorerOpen && mode === 'wide' && (
          <aside className="kb-panel kb-panel--explorer" aria-label="Explorateur des départements" style={{ gridColumn: 1, gridRow: '1 / -1' }}>
            {explorer}
          </aside>
        )}
        <section className="kb-panel kb-main" aria-label="Tableau" style={{ gridColumn: mainCol, gridRow: 1 }}>
          {head}
          {picked && (
            <p className="kb-picked t-micro" role="status">
              {shortId(picked.id)} saisie — cible : <b>{COL_LABEL[picked.target]}</b>. ← → pour changer, Entrée pour déposer, Échap pour annuler.
            </p>
          )}
          {hintBox}
          <div className="kb-board">{grouping === 'status' ? statusBoard : laneBoard}</div>
        </section>
        {showSide && (
          <aside className="kb-panel kb-panel--side" aria-label="Fiche de la carte" style={{ gridColumn: mainCol + 1, gridRow: '1 / -1' }}>
            {detail(false)}
          </aside>
        )}
        {showLog && (
          <section className="kb-panel kb-panel--log" aria-label="Journal de la tâche" style={{ gridColumn: mainCol, gridRow: 2 }}>
            {terminal}
          </section>
        )}
      </div>
      {explorerOpen && mode === 'medium' && (
        <aside className="kb-panel kb-overlay kb-overlay--left" aria-label="Explorateur des départements">
          <button type="button" className="btn btn--sm btn--icon btn--ghost kb-overlay__x" onClick={() => setExplorer(false)} aria-label="Fermer l’explorateur">
            <IconClose size={14} />
          </button>
          {explorer}
        </aside>
      )}
      {selected && mode === 'medium' && <aside className="kb-panel kb-overlay kb-overlay--right" aria-label="Fiche de la carte">{detail(false)}</aside>}
    </div>
  );
}

function DensityGlyph({ dense }: { dense: boolean }): ReactNode {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden focusable="false">
      {dense ? (
        <path d="M2.5 3h11M2.5 6.3h11M2.5 9.6h11M2.5 13h11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <>
          <rect x="2.5" y="2.5" width="11" height="4.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="2.5" y="9" width="11" height="4.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </>
      )}
    </svg>
  );
}

function TermGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden focusable="false">
      <rect x="2.5" y="3.5" width="15" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="m6 8 2.5 2L6 12M10.5 12.5H14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SlidersGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden focusable="false">
      <path d="M3.5 6h7M14.5 6h2M3.5 14h2M9.5 14h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12.5" cy="6" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="7.5" cy="14" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function logLine(e: GovEvent, agentName: (id?: string) => string, hue: number | undefined, conf: boolean): LogLine {
  const level: LogLine['level'] =
    e.status === 'failed' ? 'error' : e.type === 'task.completed' ? 'success' : e.type === 'task.paused' || e.attrs?.status === 'waiting' ? 'warn' : 'info';
  let text: string;
  if (e.type === 'llm.call') {
    const tok = (e.metrics?.inputTokens ?? 0) + (e.metrics?.outputTokens ?? 0) + (e.metrics?.cacheReadTokens ?? 0);
    text = `${displaySummary(e, conf)} · ${modelLabel(e.model)} · ${fmtCompact(tok)} tokens${e.metrics?.costUsd ? ` · ${fmtUsd(e.metrics.costUsd)} (${e.metrics.costNature === 'measured' ? 'mesuré' : 'estimé'})` : ''}`;
  } else if (e.type === 'tool.call') {
    text = `outil ${String(e.attrs?.tool ?? '')} → ${e.destination?.id ?? '?'}${e.status === 'failed' ? ` : ${displaySummary(e, conf)}` : ''}`;
  } else {
    text = `${e.type} · ${displaySummary(e, conf)}`;
  }
  const actor = e.origin.kind === 'user' ? 'vous' : agentName(e.actor?.id ?? e.origin.id);
  return { id: e.id, ts: e.ts, tag: actor, color: hue != null ? `hsl(${hue} 62% var(--kb-tag-l))` : 'var(--c-ink-muted)', level, text };
}
