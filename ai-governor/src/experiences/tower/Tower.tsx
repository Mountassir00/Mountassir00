/**
 * « Siège » — the governor as a building at night (or a pastel day).
 * One floor per pole (catalog group), one facade section per department,
 * windows lit only from the recorded status of the engines standing there,
 * an elevator shaft that carries dots only for recorded inter-floor
 * exchanges. Click a floor to open its isometric plan; click an engine or a
 * room to inspect it. No activity is simulated.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { IconChevron, IconSidebar, ZoomPan, type ZoomBucket, type ZoomPanHandle } from '@ds';
import {
  PERIOD_LABEL, recentFlows, sumUsage, useGovernor,
  type AgentStatus, type DataNature, type ExperienceProps, type GovEvent,
} from '@sdk';
import { Building, type FloorTally } from './Building';
import { FloorPlan, type RoomLive } from './FloorPlan';
import { planGeom, towerGeom } from './geometry';
import { AutopilotBlock, FloorDetails, TallyDots, type FloorUsage } from './Panel';
import { bayPlan, buildFloors, inferAutomations, isActive, levelLabel, levelLong, shaftRuns, standingOf, type Floor, type Light } from './model';
import './tower.css';

const FLOW_WINDOW = 10 * 60_000;
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function subscribeScheme(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-scheme'] });
  return () => mo.disconnect();
}
const readScheme = () => (document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light');

export default function Tower({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const { catalog, state, selection, filters } = g;
  const mobile = device === 'mobile';

  /* ---------- configuration ---------- */
  const bays = Math.round(num(config.bays, 8));
  const floorH = num(config.floorHeight, 1.5);
  const showShaft = config.showShaft !== false;
  const scheme = useSyncExternalStore(subscribeScheme, readScheme, () => 'light' as const);
  const amb = config.ambiance === 'day' ? 'day' : config.ambiance === 'night' ? 'night' : scheme === 'dark' ? 'night' : 'day';
  const night = amb === 'night';
  const minimal = quality.level === 'minimal';
  const ride: 'none' | 'once' | 'loop' = quality.suspended || quality.motion === 'none' ? 'none' : quality.motion === 'state' ? 'once' : 'loop';

  /* ---------- structure (memoised on catalog + config) ---------- */
  const floors = useMemo(() => buildFloors(catalog), [catalog]);
  const geom = useMemo(() => towerGeom(floors, bays, floorH, showShaft), [floors, bays, floorH, showShaft]);
  const agentsById = useMemo(() => new Map(catalog.agents.map((a) => [a.id, a])), [catalog]);
  const deptById = useMemo(() => new Map(catalog.departments.map((d) => [d.id, d])), [catalog]);
  const floorOfDept = useMemo(() => {
    const m = new Map<string, Floor>();
    for (const f of floors) for (const d of f.depts) m.set(d.id, f);
    return m;
  }, [floors]);

  const [floorId, setFloorIdState] = useState<string | null>(() => host.getLocal<string | null>('floor', null));
  const floor = floorId ? floors.find((f) => f.id === floorId) ?? null : null;
  const [panelOpen, setPanelOpen] = useState(() => host.getLocal<boolean>('panel', true));
  const [sheet, setSheet] = useState(false);
  const [bucket, setBucket] = useState<ZoomBucket>('mid');
  const [legend, setLegend] = useState(false);
  const zp = useRef<ZoomPanHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selfSelect = useRef(false);

  // Focus follows navigation (opened floor → back button; back → the floor we came from).
  const focusAfterNav = useRef<string | null | undefined>(undefined);
  const openFloor = useCallback(
    (id: string | null) => {
      setFloorIdState((prev) => {
        focusAfterNav.current = id ? '__back' : prev;
        return id;
      });
      host.setLocal('floor', id);
      const f = id ? floors.find((x) => x.id === id) : null;
      host.announce(f ? `${levelLong(f)} : ${f.id}, ${plural(f.depts.length, 'département', 'départements')}.` : 'Vue d’ensemble de l’immeuble.');
    },
    [floors, host],
  );

  useEffect(() => {
    const target = focusAfterNav.current;
    if (target === undefined) return;
    focusAfterNav.current = undefined;
    const t = setTimeout(() => {
      const root = rootRef.current;
      const el = target === '__back' ? root?.querySelector<HTMLElement>('.tw-back') : target ? root?.querySelector<HTMLElement>(`[data-floor="${CSS.escape(target)}"]`) : null;
      el?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [floorId]);

  const togglePanel = () => {
    const next = !panelOpen;
    setPanelOpen(next);
    host.setLocal('panel', next);
  };

  /* ---------- live data ---------- */
  const statusOf = useCallback((id: string): AgentStatus => state.agents[id]?.status ?? 'idle', [state]);
  const standing = useMemo(() => standingOf(catalog, state), [catalog, state]);

  const baysByFloor = useMemo(() => {
    const m = new Map<string, ReturnType<typeof bayPlan>>();
    for (const f of floors) m.set(f.id, bayPlan(f.depts, f.role === 'roof' && geom.pent ? geom.pent.w : geom.N, standing, (id) => state.agents[id]?.status));
    return m;
  }, [floors, geom, standing, state]);

  const tallies = useMemo(() => {
    const m = new Map<string, FloorTally>();
    for (const f of floors) m.set(f.id, { work: 0, wait: 0, error: 0, pending: 0 });
    for (const a of catalog.agents) {
      const d = standing.get(a.id);
      const f = d ? floorOfDept.get(d) : undefined;
      if (!f) continue;
      const t = m.get(f.id)!;
      const s = statusOf(a.id);
      if (isActive(s)) t.work++;
      else if (s === 'waiting') t.wait++;
      else if (s === 'error') t.error++;
    }
    for (const dec of Object.values(state.decisions)) {
      if (dec.status !== 'pending' || !dec.departmentId) continue;
      const f = floorOfDept.get(dec.departmentId);
      if (f) m.get(f.id)!.pending++;
    }
    return m;
  }, [floors, catalog, standing, floorOfDept, statusOf, state.decisions]);

  const runs = useMemo(() => {
    const evs = g.windowEvents(g.now - FLOW_WINDOW, g.now);
    const flows = recentFlows(evs, g.now, FLOW_WINDOW);
    return shaftRuns(catalog, floors, standing, flows, evs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.version, g.now, catalog, floors, standing]);

  const minute = Math.floor(g.now / 60_000);
  const automations = useMemo(
    () => inferAutomations(g.allEvents(), g.now, catalog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g.version, minute, catalog],
  );

  const floorDeptIds = useMemo(() => new Set(floor?.depts.map((d) => d.id) ?? []), [floor]);

  const floorTasks = useMemo(() => {
    if (!floor) return [];
    const order = { running: 0, paused: 1, pending: 2 } as Record<string, number>;
    return Object.values(state.tasks)
      .filter((t) => t.departmentId && floorDeptIds.has(t.departmentId) && (t.status === 'running' || t.status === 'paused' || t.status === 'pending'))
      .sort((a, b) => order[a.status] - order[b.status] || (b.startedAt ?? b.createdAt) - (a.startedAt ?? a.createdAt));
  }, [floor, floorDeptIds, state.tasks]);

  const floorDecisions = useMemo(
    () => (floor ? Object.values(state.decisions).filter((d) => d.status === 'pending' && d.departmentId && floorDeptIds.has(d.departmentId)).sort((a, b) => b.proposedAt - a.proposedAt) : []),
    [floor, floorDeptIds, state.decisions],
  );

  const usage = useMemo<FloorUsage | null>(() => {
    if (!floor) return null;
    const evs = g.rangeEvents().filter((e: GovEvent) => e.department && floorDeptIds.has(e.department));
    const totals = sumUsage(evs);
    let nature: DataNature = 'real';
    const calls = evs.filter((e) => e.type === 'llm.call');
    if (calls.some((e) => e.nature === 'demo')) nature = 'demo';
    else if (totals.costEstimated > 0) nature = 'estimated';
    return { totals, nature, periodLabel: PERIOD_LABEL[g.period.preset] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floor, floorDeptIds, g.version, g.range.from, g.range.to, g.period.preset]);

  const roomLive = useMemo(() => {
    const m = new Map<string, RoomLive>();
    if (!floor) return m;
    for (const d of floor.depts) m.set(d.id, { running: 0, pending: 0, decisions: 0, incidents: 0 });
    for (const t of Object.values(state.tasks)) {
      const r = t.departmentId ? m.get(t.departmentId) : undefined;
      if (!r) continue;
      if (t.status === 'running' || t.status === 'paused') r.running++;
      else if (t.status === 'pending') r.pending++;
    }
    for (const d of Object.values(state.decisions)) if (d.status === 'pending' && d.departmentId && m.has(d.departmentId)) m.get(d.departmentId)!.decisions++;
    for (const i of Object.values(state.incidents)) if (i.state === 'open' && i.departmentId && m.has(i.departmentId)) m.get(i.departmentId)!.incidents++;
    return m;
  }, [floor, state.tasks, state.decisions, state.incidents]);

  /* ---------- selection ---------- */
  const selectedAgent = selection?.kind === 'agent' ? selection.id : undefined;
  const selectedDept = selection?.kind === 'department' ? selection.id : selectedAgent ? standing.get(selectedAgent) : undefined;
  const highlighted = selectedDept ? floorOfDept.get(selectedDept)?.id : undefined;
  const select = (sel: Parameters<typeof host.select>[0]) => {
    selfSelect.current = true;
    host.select(sel);
  };
  const deptDim = (id: string) => filters.departments.length > 0 && !filters.departments.includes(id);
  const agentDim = (id: string) => filters.agents.length > 0 && !filters.agents.includes(id);

  // A selection made elsewhere (inspector, search) brings its floor into view when a floor is open.
  const selKey = selection ? `${selection.kind}:${selection.id}` : '';
  useEffect(() => {
    if (selfSelect.current) {
      selfSelect.current = false;
      return;
    }
    if (!floor || !highlighted || highlighted === floor.id) return;
    openFloor(highlighted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  /* ---------- view commands (Ctrl K) ---------- */
  useEffect(() => {
    return host.provideCommands([
      { id: 'tower:overview', label: 'Siège : vue d’ensemble de l’immeuble', keyword: 'siège', run: () => openFloor(null) },
      ...[...floors].reverse().map((f) => ({ id: `tower:floor:${f.id}`, label: `Siège : ouvrir ${levelLong(f).toLowerCase()} (${f.id})`, keyword: 'étage', run: () => openFloor(f.id) })),
    ]);
  }, [host, floors, openFloor]);

  /* ---------- accessible texts ---------- */
  const ariaFor = useCallback(
    (f: Floor) => {
      const t = tallies.get(f.id) ?? { work: 0, wait: 0, error: 0, pending: 0 };
      const parts = [
        `${levelLong(f)} — pôle ${f.id}`,
        plural(f.depts.length, 'département', 'départements') + ` (${f.depts.map((d) => d.name).join(', ')})`,
        t.work ? plural(t.work, 'moteur actif', 'moteurs actifs') : 'aucun moteur actif',
        t.wait ? `${t.wait} en attente` : '',
        t.error ? `${t.error} en erreur` : '',
        t.pending ? plural(t.pending, 'décision à arbitrer', 'décisions à arbitrer') : '',
        'Entrée pour ouvrir l’étage',
      ];
      return parts.filter(Boolean).join(', ');
    },
    [tallies],
  );

  const agentName = (id?: string) => (id ? agentsById.get(id)?.name ?? id : 'Non attribuée');
  const deptName = (id?: string) => (id ? deptById.get(id)?.name ?? id : '—');
  const levelName = (lvl: number) => (lvl >= floors.length ? 'liaison modèles (toit)' : floors[lvl] ? `${levelLong(floors[lvl]).toLowerCase()} (${floors[lvl].id})` : '?');

  const floorIndex = floor ? floors.indexOf(floor) : -1;
  const goStep = (dir: 1 | -1) => {
    const next = floors[floorIndex + dir];
    if (next) openFloor(next.id);
  };
  const shaftLinks = floor ? runs.filter((r) => r.from === floor.index || r.to === floor.index).reduce((s, r) => s + r.count, 0) : 0;

  const onRootKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape' && floor && !e.defaultPrevented) {
      e.preventDefault();
      openFloor(null);
    }
  };

  // Phone: zoom the floor plan to the first room instead of fitting a tiny whole floor.
  const plan = useMemo(() => (floor ? planGeom(floor) : null), [floor]);
  useEffect(() => {
    if (!mobile || !plan) return;
    const t = setTimeout(() => {
      const el = stageRef.current;
      if (!el) return;
      const { width } = el.getBoundingClientRect();
      const r = plan.rooms[0];
      if (!r) return;
      const k = Math.min(1.1, (width - 20) / ((r.w + r.d) * 32 + 40));
      const cx = ((r.x + r.w / 2) - (r.y + r.d / 2)) * 32;
      const cy = ((r.x + r.w / 2) + (r.y + r.d / 2)) * 16 - 10;
      zp.current?.centerOn(cx, cy, k);
    }, 140);
    return () => clearTimeout(t);
  }, [mobile, plan]);

  if (!floors.length) {
    return (
      <div className="tw-empty-state">
        <div>
          <h2 className="t-h2">Aucun département à loger</h2>
          <p>Connectez une source de données (page Données) : chaque pôle deviendra un étage de l’immeuble.</p>
        </div>
      </div>
    );
  }

  const panelProps = {
    floor,
    floors,
    tallies,
    tasks: floorTasks,
    decisions: floorDecisions,
    usage,
    automations,
    now: g.now,
    replay: g.mode === 'replay',
    agentName,
    deptName,
    selectedDept,
    onOpenFloor: (id: string) => openFloor(id),
    onSelectDept: (id: string) => select({ kind: 'department', id }),
    onSelectTask: (id: string) => select({ kind: 'task', id }),
    onOpenDecisions: () => host.openDecisions(),
  };

  const scene = floor && plan ? (
    <ZoomPan
      key={`plan-${floor.id}`}
      ref={zp}
      bounds={plan.bounds}
      label={`Plan de l’étage ${floor.id}`}
      showMinimap={false}
      onZoomBucket={setBucket}
      onBackgroundClick={() => select(null)}
      defs={<PoolDefs />}
      maxZoom={2.6}
    >
      <g className="tw-world" data-amb={amb}>
        <FloorPlan
          floor={floor}
          geom={plan}
          agents={agentsById}
          standing={standing}
          statusOf={statusOf}
          deptName={(id) => deptById.get(id)?.name ?? ''}
          rooms={roomLive}
          selectedAgent={selectedAgent}
          selectedDept={selection?.kind === 'department' ? selection.id : undefined}
          dimDept={deptDim}
          dimAgent={agentDim}
          night={night}
          pools={night && !minimal}
          showLabels={bucket !== 'far'}
          shaftLinks={shaftLinks}
          onSelectAgent={(id) => select({ kind: 'agent', id })}
          onSelectDept={(id) => select({ kind: 'department', id })}
        />
      </g>
    </ZoomPan>
  ) : (
    <ZoomPan key="overview" ref={zp} bounds={geom.bounds} label="Immeuble du siège : un étage par pôle" showMinimap={false} onZoomBucket={setBucket} onBackgroundClick={() => select(null)} defs={<SpillDefs />} maxZoom={2.6}>
      <g className="tw-world" data-amb={amb}>
        <Building
          geom={geom}
          floors={floors}
          bays={baysByFloor}
          tallies={tallies}
          runs={runs}
          showShaft={showShaft}
          night={night}
          glow={night && !minimal && quality.level !== 'eco'}
          near={bucket === 'near'}
          ride={ride}
          highlighted={highlighted}
          dimmedDepts={deptDim}
          onOpen={(id) => openFloor(id)}
          ariaFor={ariaFor}
        />
      </g>
    </ZoomPan>
  );

  const crumbs = (
    <nav className="tw-crumbs" aria-label="Fil d’Ariane">
      {floor ? (
        <>
          <button type="button" className="btn btn--sm tw-back" onClick={() => openFloor(null)} aria-label="Retour à l’immeuble">
            <IconChevron size={16} style={{ transform: 'rotate(180deg)' }} />
            <span className="hide-mobile-inline">Immeuble</span>
          </button>
          <span className="tw-crumbs__here" aria-current="page">
            <span className="tw-crumbs__lvl">{levelLabel(floor)}</span>
            {floor.id}
          </span>
          <span className="tw-crumbs__steps">
            <button type="button" className="btn btn--sm btn--icon" onClick={() => goStep(1)} disabled={floorIndex >= floors.length - 1} aria-label="Étage supérieur">
              <IconChevron size={16} style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <button type="button" className="btn btn--sm btn--icon" onClick={() => goStep(-1)} disabled={floorIndex <= 0} aria-label="Étage inférieur">
              <IconChevron size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </span>
        </>
      ) : (
        <>
          <span className="tw-crumbs__here" aria-current="page">
            Siège
          </span>
          <span className="tw-crumbs__sub">{plural(floors.length, 'pôle', 'pôles')} · {plural(catalog.departments.length, 'département', 'départements')}</span>
          <button type="button" className="btn btn--sm btn--ghost" aria-expanded={legend} onClick={() => setLegend((v) => !v)}>
            Légende
          </button>
        </>
      )}
    </nav>
  );

  const summary = (
    <div className="sr-only">
      <h2>Siège</h2>
      <p>
        Immeuble de {plural(floors.length, 'étage', 'étages')}, un par pôle : du toit ({floors[floors.length - 1]?.id}) au rez-de-chaussée ({floors[0]?.id}). Chaque fenêtre correspond au moteur
        d’un département : éclairée s’il travaille, ambre s’il attend, rouge s’il est en erreur, éteinte au repos. L’ascenseur ne transporte que les échanges enregistrés dans les
        dix dernières minutes.
      </p>
      <ul>
        {[...floors].reverse().map((f) => (
          <li key={f.id}>
            {ariaFor(f).replace(', Entrée pour ouvrir l’étage', '')}.{' '}
            {f.depts
              .map((d) => {
                const here = catalog.agents.filter((a) => standing.get(a.id) === d.id);
                return `${d.name} : ${here.length ? here.map((a) => `${a.name} ${statusText(statusOf(a.id))}`).join(', ') : 'personne'}`;
              })
              .join(' ; ')}
          </li>
        ))}
      </ul>
      <p>
        {runs.length
          ? `Échanges entre étages : ${runs.map((r) => `${levelName(r.from)} vers ${levelName(r.to)} (${r.count}${r.failed ? `, dont ${r.failed} en échec` : ''})`).join(' ; ')}.`
          : 'Aucun échange entre étages dans les dix dernières minutes.'}
      </p>
    </div>
  );

  /* ---------- phone ---------- */
  if (mobile) {
    return (
      <div ref={rootRef} className="tw-root tw-root--mobile" data-amb={amb} data-suspended={quality.suspended || undefined} onKeyDown={onRootKey}>
        <div className="tw-sky" aria-hidden data-stars={night && !minimal ? 'on' : undefined} />
        {floor ? (
          <>
            <div className="tw-mstage" ref={stageRef}>
              {scene}
            </div>
            <div className="tw-mtop">{crumbs}</div>
          </>
        ) : (
          <MobileTower floors={floors} bays={baysByFloor} tallies={tallies} ariaFor={ariaFor} onOpen={(id) => openFloor(id)} night={night} highlighted={highlighted} runs={runs.reduce((s, r) => s + r.count, 0)} />
        )}
        <section className="tw-sheet" data-open={sheet || undefined} aria-label={floor ? `Détails : ${floor.id}` : 'Autopilote'}>
          <button type="button" className="tw-sheet__handle" aria-expanded={sheet} onClick={() => setSheet((v) => !v)}>
            <i aria-hidden className="tw-sheet__grip" />
            <span>
              {floor
                ? `${plural(floorTasks.length, 'tâche', 'tâches')} · ${plural(floorDecisions.length, 'décision', 'décisions')} à arbitrer`
                : `Autopilote · ${plural(automations.length, 'automatisation', 'automatisations')}`}
            </span>
            <IconChevron size={16} style={{ transform: sheet ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
          </button>
          {sheet && <div className="tw-sheet__body">{floor ? <FloorDetails {...panelProps} /> : <AutopilotBlock automations={automations} now={g.now} />}</div>}
        </section>
        {summary}
      </div>
    );
  }

  /* ---------- desktop / tablet ---------- */
  return (
    <div ref={rootRef} className="tw-root" data-amb={amb} data-panel={panelOpen ? 'open' : 'closed'} data-device={device} data-suspended={quality.suspended || undefined} onKeyDown={onRootKey}>
      <div className="tw-sky" aria-hidden data-stars={night && !minimal ? 'on' : undefined} />
      <div className="tw-stage" ref={stageRef}>
        {scene}
        <div className="tw-toolbar">{crumbs}</div>
        {legend && !floor && <Legend />}
        {!panelOpen && (
          <button type="button" className="btn btn--sm btn--raised tw-panel-open" onClick={togglePanel} aria-expanded={false} aria-controls="tw-panel">
            <IconSidebar size={16} /> Détails
          </button>
        )}
      </div>
      {panelOpen && (
        <aside className="tw-panel" id="tw-panel" aria-label={floor ? `Étage ${floor.id}` : 'Immeuble'}>
          <header className="tw-panel__head">
            <div>
              <span className="tw-panel__kicker">{floor ? levelLong(floor) : 'Vue d’ensemble'}</span>
              <h2 className="t-h2">{floor ? floor.id : 'Siège'}</h2>
              {floor && <TallyDots t={tallies.get(floor.id) ?? { work: 0, wait: 0, error: 0, pending: 0 }} />}
            </div>
            <button type="button" className="icon-btn tw-panel__close" onClick={togglePanel} aria-label="Replier le panneau" aria-controls="tw-panel">
              <IconSidebar size={18} />
            </button>
          </header>
          <div className="tw-panel__body">
            <FloorDetails {...panelProps} />
          </div>
        </aside>
      )}
      {summary}
    </div>
  );
}

function statusText(s: AgentStatus) {
  return { working: 'au travail', waiting: 'en attente', collaborating: 'en collaboration', researching: 'en recherche', validating: 'en validation', error: 'en erreur', paused: 'suspendu', idle: 'au repos', offline: 'hors ligne' }[s];
}

function SpillDefs() {
  return (
    <>
      {(['work', 'wait', 'error'] as const).map((k) => (
        <linearGradient key={k} id={`tw-spill-${k}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: `var(--tw-win-${k})`, stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: `var(--tw-win-${k})`, stopOpacity: 0.45 }} />
        </linearGradient>
      ))}
    </>
  );
}

function PoolDefs() {
  return (
    <radialGradient id="tw-pool">
      <stop offset="0" style={{ stopColor: 'var(--tw-win-work)', stopOpacity: 0.32 }} />
      <stop offset="1" style={{ stopColor: 'var(--tw-win-work)', stopOpacity: 0 }} />
    </radialGradient>
  );
}

function Legend() {
  const win = (light: Light) => (
    <svg width={18} height={22} viewBox="0 0 18 22" aria-hidden className="tw-legend__win" data-light={light}>
      <rect x={2} y={2} width={14} height={18} rx={2} className="tw-legend__glass" />
      {light === 'wait' && <rect x={2} y={2} width={14} height={8} rx={2} className="tw-legend__blind" />}
      {light === 'error' && <path d="M3 3 15 19M15 3 3 19" className="tw-legend__x" />}
    </svg>
  );
  return (
    <div className="tw-legend" role="note" aria-label="Légende">
      {win('work')}
      <span>Fenêtre éclairée : le moteur du département travaille (état enregistré).</span>
      {win('wait')}
      <span>Ambre, store à demi baissé : en attente (souvent un arbitrage).</span>
      {win('error')}
      <span>Rouge barrée : en erreur.</span>
      {win('off')}
      <span>Éteinte : au repos, ou moteur partagé travaillant à un autre poste.</span>
      <svg width={18} height={22} viewBox="0 0 18 22" aria-hidden>
        <line x1={9} y1={2} x2={9} y2={20} className="tw-legend__rail" />
        <circle cx={9} cy={8} r={3.2} className="tw-legend__dot" />
      </svg>
      <span>Ascenseur : un point par échange enregistré entre deux étages (10 dernières minutes). L’antenne relie aux modèles.</span>
    </div>
  );
}

/* ---------- phone overview: a vertical cross-section ---------- */

function MobileTower({ floors, bays, tallies, ariaFor, onOpen, night, highlighted, runs }: {
  floors: Floor[];
  bays: Map<string, ReturnType<typeof bayPlan>>;
  tallies: Map<string, FloorTally>;
  ariaFor: (f: Floor) => string;
  onOpen: (id: string) => void;
  night: boolean;
  highlighted?: string;
  runs: number;
}) {
  return (
    <div className="tw-mlist" data-night={night || undefined}>
      <header className="tw-mhead">
        <h2 className="t-h2">Siège</h2>
        <p className="t-small t-muted">
          {plural(floors.length, 'étage', 'étages')}, un par pôle. Touchez un étage pour l’ouvrir.
          {runs ? ` ${plural(runs, 'échange', 'échanges')} entre étages (10 min).` : ' Aucun échange entre étages (10 min).'}
        </p>
      </header>
      <ol className="tw-mfloors">
        {[...floors].reverse().map((f) => {
          const list = bays.get(f.id) ?? [];
          const t = tallies.get(f.id) ?? { work: 0, wait: 0, error: 0, pending: 0 };
          return (
            <li key={f.id} data-role={f.role}>
              <button type="button" className="tw-mfloor" data-floor={f.id} onClick={() => onOpen(f.id)} aria-label={ariaFor(f)} data-highlighted={highlighted === f.id || undefined}>
                <span className="tw-mfloor__lvl">{levelLabel(f)}</span>
                <span className="tw-mfloor__body">
                  <span className="tw-mfloor__name">{f.id}</span>
                  <span className="tw-mfacade" aria-hidden>
                    {list.map((b) => (
                      <i key={b.index} data-light={b.light} style={{ ['--tone' as string]: `var(--${b.dept.tone})` }} title={b.dept.name} />
                    ))}
                  </span>
                  <TallyDots t={t} />
                </span>
                <IconChevron size={18} />
              </button>
            </li>
          );
        })}
      </ol>
      <div className="tw-mground" aria-hidden />
    </div>
  );
}
