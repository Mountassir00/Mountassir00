/**
 * AI Modular Office — each department is a floating miniature platform,
 * linked to the others by cables that light up only on recorded exchanges.
 * Re-arrangeable (pure preference), grows automatically when a module joins,
 * and folds into group plates so it stays readable as the system grows.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { IsoFlowPath, ZoomPan, iso, toneVar, type ZoomBucket, type ZoomPanHandle } from '@ds';
import { PERIOD_LABEL, departmentLoad, recentFlows, useGovernor, type AgentDef, type AgentStatus, type DataNature, type DepartmentDef, type ExperienceProps } from '@sdk';
import {
  HUB_R, PD, PW, activeLinks, buildItems, cablePath, hubBounds, hubCatalog, hubSpokeStates, neighbourSlot, orderedDepartments, pairKey, pickHubDept, placeHub, placeItems,
  sceneBounds, spineBranch, spokeEnds, staticLinks,
  type DeptLink, type HubPlacement, type LayoutMode, type Placed,
} from './layout';
import { Caption, ClusterPlate, EmptySlot, Platform, isActive, topFace, type Chip, type FigureSpec } from './parts';
import { HubPlatform, TaskStatusPanel, Walkway, inwardCaption, unIso } from './hub';
import './modular-office.css';

const FLOW_WINDOW = 15 * 60_000;
const MAX_FIGURES = 3;

type Arrow = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';
const ARROWS: Arrow[] = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export default function ModularOffice({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const { catalog, state, selection, filters } = g;

  const gap = typeof config.gap === 'number' ? config.gap : 2;
  const thickness = typeof config.thickness === 'number' ? config.thickness : 0.3;
  const groupingCfg = (config.grouping as string) ?? 'auto';
  const showLinks = config.showLinks !== false;
  const showIndicators = config.showIndicators !== false;
  const mode: LayoutMode = device === 'mobile' ? 'columns' : 'diamond';
  /** Hub arrangement: the orchestrator's office in the centre, the departments in a ring around it. */
  const hubMode = config.arrangement === 'hub';

  const [order, setOrder] = useState<string[]>(() => host.getLocal<string[]>('order', []));
  const [reorganizing, setReorganizing] = useState(false);
  const [picked, setPicked] = useState<{ id: string; original: string[] } | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [bucket, setBucket] = useState<ZoomBucket>('mid');
  const [legend, setLegend] = useState(false);
  const zp = useRef<ZoomPanHandle>(null);
  const hitRefs = useRef(new Map<string, SVGGElement | null>());
  const selfSelect = useRef(false);

  const nDepts = catalog.departments.length;
  // The hub keeps every department on its ring at any zoom; it only folds into poles on phones (or when asked).
  const groupingActive =
    !reorganizing &&
    (groupingCfg === 'always' ||
      (groupingCfg === 'auto' && (hubMode ? device === 'mobile' && nDepts > 6 : (nDepts > 12 && bucket === 'far') || (device === 'mobile' && nDepts > 6))));
  const far = bucket === 'far';
  const detail: 'full' | 'reduced' | 'minimal' = quality.level === 'minimal' ? 'minimal' : quality.level === 'eco' ? 'reduced' : 'full';

  /* ---------- layout (memoised; independent from live data) ---------- */
  const hubDept = useMemo(() => (hubMode ? pickHubDept(catalog) : undefined), [hubMode, catalog]);
  const { slots, newIds } = useMemo(() => orderedDepartments(hubMode ? hubCatalog(catalog, hubDept?.id) : catalog, order), [hubMode, catalog, hubDept, order]);
  const groups = useMemo(() => [...new Set(catalog.departments.map((d) => d.group))], [catalog]);
  const items = useMemo(() => buildItems(slots, newIds, groupingActive, expanded), [slots, newIds, groupingActive, expanded]);
  // Folded groups seen from afar get wider corridors so their (enlarged) captions breathe.
  const layoutGap = groupingActive && far && device !== 'mobile' ? gap + 3 : gap;
  const hubPlace = useMemo<HubPlacement | null>(
    () => (hubMode ? placeHub(items, device === 'mobile' ? 'columns' : 'ring', gap, reorganizing ? items.length + 1 : 0) : null),
    [hubMode, items, device, gap, reorganizing],
  );
  const gridPlaced = useMemo(() => (hubMode ? [] : placeItems(items, mode, layoutGap, reorganizing ? items.length + 1 : 0).placed), [hubMode, items, mode, layoutGap, reorganizing]);
  const placed = hubPlace ? hubPlace.placed : gridPlaced;
  // Bounds cover the ungrouped layout too, so folding into groups on zoom-out never changes
  // the scene extent (which would refit the view and undo the zoom).
  const bucketDriven = groupingCfg === 'auto' && device !== 'mobile' && !hubMode;
  const bounds = useMemo(() => {
    if (hubPlace) return hubBounds(hubPlace, thickness * 1.5);
    if (!bucketDriven) return sceneBounds(placed, thickness * 1.5);
    const full = placeItems(buildItems(slots, newIds, false, new Set()), mode, gap, reorganizing ? slots.length + 1 : 0).placed;
    const a = sceneBounds(placed, thickness * 1.5);
    const b = sceneBounds(full, thickness * 1.5);
    return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
  }, [hubPlace, bucketDriven, placed, slots, newIds, mode, gap, reorganizing, thickness]);
  const byKey = useMemo(() => new Map(placed.map((p) => [p.item.key, p])), [placed]);
  const deptItemKey = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of placed) {
      if (p.item.kind === 'dept') m.set(p.item.dept.id, p.item.key);
      if (p.item.kind === 'cluster') for (const d of p.item.depts) m.set(d.id, p.item.key);
    }
    return m;
  }, [placed]);
  const links = useMemo(() => staticLinks(catalog), [catalog]);

  /* ---------- live data (recomputed on new events / replay time) ---------- */
  const live = useMemo(() => {
    const deptIds = new Set(catalog.departments.map((d) => d.id));
    const standing = new Map<string, string>();
    const here = new Map<string, AgentDef[]>();
    const owners = new Map<string, AgentDef[]>();
    for (const a of catalog.agents) {
      const rt = state.agents[a.id];
      const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
      const home = task?.departmentId && deptIds.has(task.departmentId) ? task.departmentId : a.departmentIds.find((d) => deptIds.has(d));
      if (!home) continue;
      standing.set(a.id, home);
      here.set(home, [...(here.get(home) ?? []), a]);
      for (const d of a.departmentIds) if (deptIds.has(d)) owners.set(d, [...(owners.get(d) ?? []), a]);
    }
    const tasks = new Map<string, { running: number; paused: number; pending: number }>();
    for (const t of Object.values(state.tasks)) {
      if (!t.departmentId || (t.status !== 'running' && t.status !== 'paused' && t.status !== 'pending')) continue;
      const c = tasks.get(t.departmentId) ?? { running: 0, paused: 0, pending: 0 };
      c[t.status === 'running' ? 'running' : t.status === 'paused' ? 'paused' : 'pending']++;
      tasks.set(t.departmentId, c);
    }
    const load = new Map(departmentLoad(state, catalog).map((l) => [l.dept.id, l]));
    const flows = recentFlows(g.windowEvents(g.now - FLOW_WINDOW, g.now), g.now, FLOW_WINDOW);
    const active = activeLinks(catalog, flows, state, standing);
    const spokes = hubDept ? hubSpokeStates(catalog, hubDept.id, flows, g.windowEvents(g.now - FLOW_WINDOW, g.now), state, standing) : new Map<string, 'active' | 'error'>();
    return { standing, here, owners, tasks, load, active, spokes };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g.version, g.now, catalog, state, hubDept]);

  const statusOf = useCallback((id: string): AgentStatus => state.agents[id]?.status ?? 'idle', [state]);

  /* ---------- selection & centring ---------- */
  const selKey = selection ? `${selection.kind}:${selection.id}` : '';
  const pendingCenter = useRef<string | null>(null);
  useEffect(() => {
    if (!selection) return;
    if (selfSelect.current) {
      selfSelect.current = false;
      return;
    }
    const deptId = selection.kind === 'department' ? selection.id : selection.kind === 'agent' ? live.standing.get(selection.id) : undefined;
    if (!deptId) return;
    pendingCenter.current = deptId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selKey]);

  // The selected department stays visible: its group unfolds when folding kicks in (search, zoom-out, resize).
  const selectedGroup = useMemo(() => {
    const deptId = selection?.kind === 'department' ? selection.id : selection?.kind === 'agent' ? live.standing.get(selection.id) : undefined;
    return deptId ? catalog.departments.find((d) => d.id === deptId)?.group : undefined;
  }, [selection, live.standing, catalog]);
  const foldedByUser = useRef<string | null>(null);
  useEffect(() => {
    foldedByUser.current = null;
  }, [selKey]);
  useEffect(() => {
    if (selectedGroup && groupingActive && !expanded.has(selectedGroup) && foldedByUser.current !== selectedGroup) setExpanded((s) => new Set(s).add(selectedGroup));
  }, [selectedGroup, groupingActive, expanded]);

  useEffect(() => {
    const deptId = pendingCenter.current;
    if (!deptId) return;
    const key = deptItemKey.get(deptId);
    const p = key ? byKey.get(key) : undefined;
    if (!p || p.item.kind !== 'dept') return;
    pendingCenter.current = null;
    const t = setTimeout(() => zp.current?.centerOn(p.sx, p.sy), 80);
    return () => clearTimeout(t);
  }, [selKey, deptItemKey, byKey]);

  const select = (sel: Parameters<typeof host.select>[0]) => {
    selfSelect.current = true;
    host.select(sel);
  };

  /* ---------- reorganisation (a preference, never a command) ---------- */
  const currentIds = useCallback(() => placed.map((p) => (p.item.kind === 'dept' ? p.item.dept.id : '')), [placed]);

  const persist = (ids: string[]) => {
    const trimmed = [...ids];
    while (trimmed.length && trimmed[trimmed.length - 1] === '') trimmed.pop();
    setOrder(trimmed);
    host.setLocal('order', trimmed);
  };

  const nameOf = (id: string) => catalog.departments.find((d) => d.id === id)?.name ?? id;

  const moveTo = (id: string, slot: number) => {
    const ids = currentIds();
    const from = ids.indexOf(id);
    if (from < 0 || slot === from) return;
    while (ids.length <= slot) ids.push('');
    [ids[from], ids[slot]] = [ids[slot], ids[from]];
    persist(ids);
    host.announce(`${nameOf(id)} déplacé à l’emplacement ${slot + 1}${ids[from] ? `, échangé avec ${nameOf(ids[from])}` : ''}.`);
  };

  useEffect(() => {
    if (picked) requestAnimationFrame(() => hitRefs.current.get(picked.id)?.focus());
  }, [order, picked]);

  const activateDept = (d: DepartmentDef, slot: number) => {
    if (!reorganizing) {
      select({ kind: 'department', id: d.id });
      return;
    }
    if (!picked) {
      setPicked({ id: d.id, original: currentIds() });
      host.announce(`${d.name} sélectionné. Flèches pour déplacer, Entrée pour poser, Échap pour annuler.`);
    } else if (picked.id === d.id) {
      setPicked(null);
      host.announce(`${d.name} posé.`);
    } else {
      moveTo(picked.id, slot);
      setPicked(null);
    }
  };

  const onDeptKey = (d: DepartmentDef, slot: number) => (e: KeyboardEvent<SVGGElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activateDept(d, slot);
    } else if (reorganizing && picked?.id === d.id && (ARROWS as string[]).includes(e.key)) {
      e.preventDefault();
      const target = neighbourSlot(placed, slot, e.key as Arrow);
      if (target != null) moveTo(d.id, target);
    } else if (e.key === 'Escape' && picked) {
      e.preventDefault();
      e.stopPropagation();
      persist(picked.original);
      setPicked(null);
      host.announce('Déplacement annulé.');
    }
  };

  const toggleCluster = (group: string) => {
    setExpanded((s) => new Set(s).add(group));
    host.announce(`Groupe ${group} déplié.`);
  };

  const resetLayout = () => {
    persist([]);
    setPicked(null);
    host.announce('Disposition réinitialisée.');
  };

  /* ---------- derived view models ---------- */
  const selectedDept = selection?.kind === 'department' ? selection.id : selection?.kind === 'agent' ? live.standing.get(selection.id) : undefined;
  const deptFiltered = (id: string) => filters.departments.length > 0 && !filters.departments.includes(id);
  const agentFiltered = (id: string) => filters.agents.length > 0 && !filters.agents.includes(id);
  const figureScale = device === 'mobile' ? 0.9 : 0.75;

  const chipsFor = (id: string): Chip[] => {
    if (!showIndicators) return [];
    const l = live.load.get(id);
    const t = live.tasks.get(id);
    const out: Chip[] = [];
    const running = (t?.running ?? 0) + (t?.paused ?? 0);
    if (running) out.push({ key: 'run', glyph: '▶', value: String(running), tone: 'var(--st-working)', title: plural(running, 'tâche en cours', 'tâches en cours') });
    if (t?.pending) out.push({ key: 'pend', glyph: '…', value: String(t.pending), tone: 'var(--c-ink-muted)', title: plural(t.pending, 'tâche en attente', 'tâches en attente') });
    if (l?.errors) out.push({ key: 'err', glyph: '!', value: String(l.errors), tone: 'var(--st-error)', title: plural(l.errors, 'agent en erreur', 'agents en erreur') });
    if (l?.pendingDecisions) out.push({ key: 'dec', glyph: '◆', value: String(l.pendingDecisions), tone: 'var(--st-waiting)', title: plural(l.pendingDecisions, 'décision en attente', 'décisions en attente') });
    if (l?.openIncidents) out.push({ key: 'inc', glyph: '▲', value: String(l.openIncidents), tone: 'var(--st-error)', title: plural(l.openIncidents, 'incident ouvert', 'incidents ouverts') });
    return out;
  };

  const clusterTotals = (depts: DepartmentDef[]) => {
    const sum = (f: (id: string) => number) => depts.reduce((acc, d) => acc + f(d.id), 0);
    return {
      active: sum((id) => live.load.get(id)?.active ?? 0),
      errors: sum((id) => live.load.get(id)?.errors ?? 0),
      decisions: sum((id) => live.load.get(id)?.pendingDecisions ?? 0),
    };
  };

  const clusterChips = (depts: DepartmentDef[]): Chip[] => {
    if (!showIndicators) return [];
    const { active, errors, decisions } = clusterTotals(depts);
    return [
      ...(active ? [{ key: 'act', glyph: '●', value: String(active), tone: 'var(--st-working)', title: plural(active, 'agent actif', 'agents actifs') }] : []),
      ...(errors ? [{ key: 'err', glyph: '!', value: String(errors), tone: 'var(--st-error)', title: plural(errors, 'agent en erreur', 'agents en erreur') }] : []),
      ...(decisions ? [{ key: 'dec', glyph: '◆', value: String(decisions), tone: 'var(--st-waiting)', title: plural(decisions, 'décision en attente', 'décisions en attente') }] : []),
    ];
  };

  const ariaFor = (d: DepartmentDef) => {
    const l = live.load.get(d.id);
    const t = live.tasks.get(d.id);
    const parts = [
      `${d.name} — ${d.mission}`,
      plural(l?.agents.length ?? 0, 'agent', 'agents'),
      `${l?.active ?? 0} actif${(l?.active ?? 0) > 1 ? 's' : ''}`,
      plural((t?.running ?? 0) + (t?.paused ?? 0), 'tâche en cours', 'tâches en cours'),
      t?.pending ? plural(t.pending, 'tâche en attente', 'tâches en attente') : '',
      l?.errors ? plural(l.errors, 'agent en erreur', 'agents en erreur') : '',
      l?.pendingDecisions ? plural(l.pendingDecisions, 'décision en attente', 'décisions en attente') : '',
      l?.openIncidents ? plural(l.openIncidents, 'incident ouvert', 'incidents ouverts') : '',
    ].filter(Boolean);
    if (reorganizing) parts.push(picked?.id === d.id ? 'Sélectionné pour déplacement : flèches pour déplacer, Entrée pour poser' : 'Entrée pour déplacer');
    return parts.join(', ');
  };

  /* ---------- links ---------- */
  const linkEls = useMemo(() => {
    if (!showLinks || hubMode) return [];
    const pairs = new Map<string, { a: Placed; b: Placed; kind: DeptLink['kind']; state: 'idle' | 'active' | 'error'; depts: Set<string> }>();
    const consider = (l: DeptLink, st: 'idle' | 'active' | 'error') => {
      const ka = deptItemKey.get(l.a);
      const kb = deptItemKey.get(l.b);
      if (!ka || !kb || ka === kb) return;
      const a = byKey.get(ka);
      const b = byKey.get(kb);
      if (!a || !b) return;
      const k = pairKey(ka, kb);
      const prev = pairs.get(k);
      const rank = { idle: 0, active: 1, error: 2 } as const;
      if (prev) {
        prev.depts.add(l.a).add(l.b);
        if (rank[st] > rank[prev.state]) prev.state = st;
        return;
      }
      const [first, second] = a.slot <= b.slot ? [a, b] : [b, a];
      pairs.set(k, { a: first, b: second, kind: l.kind, state: st, depts: new Set([l.a, l.b]) });
    };
    for (const l of links) consider(l, live.active.get(pairKey(l.a, l.b)) ?? 'idle');
    for (const [k, st] of live.active) {
      const [a, b] = k.split('|');
      consider({ a, b, kind: 'flow' }, st);
    }
    return [...pairs.values()].map((p, i) => ({ ...p, key: `${p.a.item.key}>${p.b.item.key}`, lane: ((i % 5) - 2) * 0.14 }));
  }, [showLinks, hubMode, links, live.active, deptItemKey, byKey]);

  /* ---------- hub: walkways, centre, task status ---------- */
  const spokeEls = useMemo(() => {
    if (!hubPlace) return [];
    const rank = { idle: 0, active: 1, error: 2 } as const;
    return hubPlace.placed.flatMap((p) => {
      const it = p.item;
      if (it.kind === 'empty') return [];
      const depts = it.kind === 'dept' ? [it.dept.id] : it.depts.map((d) => d.id);
      let st: 'idle' | 'active' | 'error' = 'idle';
      for (const id of depts) {
        const v = live.spokes.get(id) ?? 'idle';
        if (rank[v] > rank[st]) st = v;
      }
      return [{ key: it.key, p, depts, state: st }];
    });
  }, [hubPlace, live.spokes]);

  const hubFigures: FigureSpec[] = useMemo(() => {
    if (!hubDept) return [];
    return (live.here.get(hubDept.id) ?? [])
      .map((a) => ({ a, s: statusOf(a.id), ts: state.agents[a.id]?.lastEventTs ?? 0 }))
      .sort((x, y) => Number(isActive(y.s)) - Number(isActive(x.s)) || y.ts - x.ts)
      .slice(0, 3)
      .map(({ a, s: st }) => ({ agent: a, status: st, selected: selection?.kind === 'agent' && selection.id === a.id, dimmed: filters.agents.length > 0 && !filters.agents.includes(a.id) }));
  }, [hubDept, live.here, statusOf, state.agents, selection, filters.agents]);

  // Collapsed by default: the four counters stay visible without hiding the right side of the ring.
  const [taskPanelOpen] = useState(() => host.getLocal<boolean>('taskPanel', false));
  const taskNature: DataNature = useMemo(() => {
    const ts = Object.values(state.tasks);
    if (!ts.length) return 'unavailable';
    return ts.some((t) => t.nature === 'demo') ? 'demo' : 'real';
  }, [state.tasks]);

  const drawOrder = useMemo(() => [...placed].sort((a, b) => a.x + a.y - (b.x + b.y) || a.x - b.x), [placed]);

  /* ---------- render ---------- */
  if (!nDepts) {
    return (
      <div className="mo-empty-state">
        <div>
          <h2 className="t-h2">Aucun département à afficher</h2>
          <p>Connectez une source de données (page Données) : chaque module intégré apparaîtra ici comme une plateforme.</p>
        </div>
      </div>
    );
  }

  const minimap = (
    <g>
      {placed.map((p) =>
        p.item.kind === 'empty' ? null : (
          <polygon key={p.item.key} points={topFace(p.x, p.y)} style={{ fill: p.item.kind === 'dept' ? toneVar(p.item.dept.tone) : 'var(--c-sunken)', stroke: 'var(--c-ink-soft)', strokeWidth: 1, vectorEffect: 'non-scaling-stroke' }} />
        ),
      )}
    </g>
  );

  return (
    <div className="mo-root" data-hub={hubMode || undefined}>
      <ZoomPan
        ref={zp}
        bounds={bounds}
        label={hubMode ? 'Hub central : le bureau de direction au centre, les départements en anneau' : 'Bureau modulaire : plateformes des départements'}
        minimap={minimap}
        showMinimap={device !== 'mobile' && !hubMode}
        onZoomBucket={setBucket}
        onBackgroundClick={() => {
          if (picked) {
            setPicked(null);
            return;
          }
          if (!reorganizing) select(null);
        }}
      >
        <g className="mo-links">
          {linkEls.map((l) => {
            const dim = (selectedDept && !l.depts.has(selectedDept)) || [...l.depts].some(deptFiltered);
            const z = -thickness * 0.5;
            return (
              <g key={l.key} className="mo-link" data-kind={l.kind}>
                <IsoFlowPath d={cablePath(l.a, l.b, mode, layoutGap, z, l.lane)} state={dim ? 'dim' : l.state} label={undefined} />
              </g>
            );
          })}
        </g>
        {hubPlace && hubPlace.R > 0 && (
          <ellipse className="mo-ringtrack" cx={hubPlace.hub.sx} cy={hubPlace.hub.sy} rx={hubPlace.R * 45.25} ry={hubPlace.R * 22.63} aria-hidden />
        )}
        {hubPlace && showLinks && (
          <g className="mo-spokes">
            {spokeEls.map((sp) => {
              const dim = (!!selectedDept && selectedDept !== hubDept?.id && !sp.depts.includes(selectedDept)) || sp.depts.every(deptFiltered);
              const ends = spokeEnds(hubPlace, sp.p);
              const A = iso(ends.a[0], ends.a[1], -0.04);
              const B = iso(ends.b[0], ends.b[1], -0.04);
              const d = device === 'mobile' ? spineBranch(hubPlace, sp.p) : `M${A[0].toFixed(1)},${A[1].toFixed(1)} L${B[0].toFixed(1)},${B[1].toFixed(1)}`;
              return (
                <g key={sp.key} className="mo-spoke" data-state={dim ? 'dim' : sp.state}>
                  {device !== 'mobile' && <Walkway a={ends.a} b={ends.b} />}
                  <IsoFlowPath d={d} state={dim ? 'dim' : sp.state} />
                </g>
              );
            })}
          </g>
        )}
        {hubPlace && hubDept && (
          <HubPlatform
            dept={hubDept}
            cx={hubPlace.hub.x}
            cy={hubPlace.hub.y}
            figures={hubFigures}
            active={hubFigures.some((f) => isActive(f.status))}
            traffic={spokeEls.some((sp) => sp.state !== 'idle')}
            selected={selection?.kind === 'department' && selection.id === hubDept.id}
            dimmed={deptFiltered(hubDept.id)}
            shadows={quality.shadows}
            far={far}
            figureScale={figureScale}
            ariaLabel={`Centre du hub. ${ariaFor(hubDept)}`}
            hitRef={(el) => void hitRefs.current.set(hubDept.id, el)}
            onActivate={() => !reorganizing && select({ kind: 'department', id: hubDept.id })}
            onKey={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && !reorganizing) {
                e.preventDefault();
                select({ kind: 'department', id: hubDept.id });
              }
            }}
            onSelectAgent={(id) => select({ kind: 'agent', id })}
          />
        )}
        {drawOrder.map((p) => {
          const it = p.item;
          if (it.kind === 'empty') {
            return reorganizing ? (
              <EmptySlot key={it.key} x={p.x} y={p.y} index={p.slot} armed={!!picked} onActivate={() => picked && (moveTo(picked.id, p.slot), setPicked(null))} />
            ) : null;
          }
          if (it.kind === 'cluster') {
            const members = it.depts.map((d) => ({ dept: d, active: live.load.get(d.id)?.active ?? 0, errors: live.load.get(d.id)?.errors ?? 0 }));
            const { active, errors, decisions } = clusterTotals(it.depts);
            return (
              <ClusterPlate
                key={it.key}
                group={it.group}
                depts={members}
                x={p.x}
                y={p.y}
                thickness={thickness}
                shadows={quality.shadows}
                dimmed={filters.departments.length > 0 && it.depts.every((d) => deptFiltered(d.id))}
                selected={!!selectedDept && it.depts.some((d) => d.id === selectedDept)}
                ariaLabel={`Groupe ${it.group} : ${plural(it.depts.length, 'département', 'départements')} (${it.depts.map((d) => d.name).join(', ')}), ${plural(active, 'agent actif', 'agents actifs')}${errors ? `, ${plural(errors, 'agent en erreur', 'agents en erreur')}` : ''}${decisions ? `, ${plural(decisions, 'décision en attente', 'décisions en attente')}` : ''}. Entrée pour déplier.`}
                hitRef={(el) => void hitRefs.current.set(it.key, el)}
                onActivate={() => toggleCluster(it.group)}
                onKey={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCluster(it.group);
                  }
                }}
              />
            );
          }
          const d = it.dept;
          const standingHere = (live.here.get(d.id) ?? [])
            .map((a) => ({ a, s: statusOf(a.id), ts: state.agents[a.id]?.lastEventTs ?? 0 }))
            .sort((x, y) => Number(isActive(y.s)) - Number(isActive(x.s)) || y.ts - x.ts);
          const shown = standingHere.slice(0, MAX_FIGURES);
          const figures: FigureSpec[] = shown.map(({ a, s }) => ({
            agent: a,
            status: s,
            selected: selection?.kind === 'agent' && selection.id === a.id,
            dimmed: agentFiltered(a.id),
          }));
          const owners = live.owners.get(d.id) ?? [];
          const deskCount = Math.max(1, Math.min(MAX_FIGURES, Math.max(owners.length, figures.length)));
          const desks = Array.from({ length: deskCount }, (_, i) => ({ active: !!figures[i] && isActive(figures[i].status) }));
          return (
            <Platform
              key={it.key}
              dept={d}
              x={p.x}
              y={p.y}
              lift={picked?.id === d.id ? 0.5 : 0}
              thickness={thickness}
              desks={desks}
              figures={figures}
              overflow={standingHere.length - shown.length}
              tasks={live.tasks.get(d.id) ?? { running: 0, paused: 0, pending: 0 }}
              selected={selection?.kind === 'department' && selection.id === d.id}
              picked={picked?.id === d.id}
              dimmed={deptFiltered(d.id)}
              far={far}
              detail={detail}
              shadows={quality.shadows}
              floorGrid
              showLabels
              figureScale={figureScale}
              reorganizing={reorganizing}
              ariaLabel={ariaFor(d)}
              hitRef={(el) => void hitRefs.current.set(d.id, el)}
              onActivate={() => activateDept(d, p.slot)}
              onKey={onDeptKey(d, p.slot)}
              onSelectAgent={(id) => select({ kind: 'agent', id })}
            />
          );
        })}
        <g className="mo-captions">
          {hubPlace && hubDept && (() => {
            const sc = far ? 1.35 : 1;
            const [wx, wy] = unIso(hubPlace.hub.sx, hubPlace.hub.sy + HUB_R * 22.63 * 0.34);
            return <Caption key="hub" x={wx} y={wy} dy={0} title={hubDept.name} chips={chipsFor(hubDept.id)} far={far} scale={sc} selected={selectedDept === hubDept.id} />;
          })()}
          {drawOrder.map((p) => {
            const it = p.item;
            if (it.kind === 'empty') return null;
            if (hubPlace && device !== 'mobile') {
              // Ring: the caption sits on the hub side of its platform, so neighbours on the ring never collide.
              const sc = far ? 1.35 : 1;
              const title = it.kind === 'cluster' ? `${it.group} · ${it.depts.length}` : it.dept.name;
              const chips = it.kind === 'cluster' ? clusterChips(it.depts) : chipsFor(it.dept.id);
              const withChips = chips.length > 0 && !far;
              const halfW = (Math.max(title.length * 7.6, chips.length * 44) / 2) * sc;
              const halfH = (withChips ? 46 : 24) / 2 * sc;
              const c = inwardCaption(p.sx, p.sy, hubPlace.hub.sx, hubPlace.hub.sy, halfW, halfH);
              const [wx, wy] = unIso(c.x, c.y - halfH);
              return (
                <Caption
                  key={it.key}
                  x={wx}
                  y={wy}
                  dy={0}
                  title={title}
                  chips={chips}
                  isNew={it.kind === 'dept' ? it.isNew : undefined}
                  far={it.kind === 'cluster' ? false : far}
                  scale={sc}
                  selected={it.kind === 'dept' ? selectedDept === it.dept.id : !!selectedDept && it.depts.some((d) => d.id === selectedDept)}
                />
              );
            }
            if (it.kind === 'cluster') {
              return (
                <Caption key={it.key} x={p.x + PW} y={p.y + PD} dy={thickness * 1.5 * 32} title={`${it.group} · ${it.depts.length}`} chips={clusterChips(it.depts)} far={false} scale={far ? 1.9 : 1} />
              );
            }
            const lift = picked?.id === it.dept.id ? 0.5 : 0;
            return (
              <Caption
                key={it.key}
                x={p.x + PW}
                y={p.y + PD}
                dy={(thickness - lift) * 32}
                title={it.dept.name}
                chips={chipsFor(it.dept.id)}
                isNew={it.isNew}
                far={far}
                scale={far ? 1.8 : 1}
                selected={selectedDept === it.dept.id}
              />
            );
          })}
        </g>
      </ZoomPan>

      <div className="mo-toolbar" role="toolbar" aria-label="Outils du bureau modulaire">
        {!reorganizing ? (
          <>
            <button type="button" className="btn btn--sm" aria-pressed={false} onClick={() => { setReorganizing(true); host.announce('Mode réorganisation : choisissez une plateforme puis sa nouvelle place.'); }}>
              Réorganiser
            </button>
            {groupingActive && (
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => {
                  const fold = expanded.size > 0;
                  if (fold) foldedByUser.current = selectedGroup ?? null;
                  setExpanded(fold ? new Set() : new Set(groups));
                  host.announce(fold ? 'Groupes repliés.' : 'Tous les groupes dépliés.');
                }}
              >
                {expanded.size > 0 ? 'Tout regrouper' : 'Tout déplier'}
              </button>
            )}
            <button type="button" className="btn btn--sm btn--ghost" aria-expanded={legend} onClick={() => setLegend((v) => !v)}>
              Légende
            </button>
          </>
        ) : (
          <>
            <span className="mo-toolbar__hint" role="status">
              {picked ? `« ${nameOf(picked.id)} » : choisissez sa nouvelle place (flèches, Entrée, Échap).` : 'Choisissez une plateforme à déplacer.'}
            </span>
            <button type="button" className="btn btn--sm btn--ghost" onClick={resetLayout} disabled={!order.length}>
              Réinitialiser la disposition
            </button>
            <button type="button" className="btn btn--sm btn--primary" onClick={() => { setReorganizing(false); setPicked(null); host.announce('Disposition enregistrée.'); }}>
              Terminer
            </button>
          </>
        )}
      </div>

      {legend && !reorganizing && <Legend hub={hubMode} />}

      {hubMode && (
        <TaskStatusPanel
          tasks={state.tasks}
          from={g.range.from}
          to={g.range.to}
          now={g.now}
          nature={taskNature}
          periodLabel={PERIOD_LABEL[g.period.preset]}
          agentName={(id) => (id ? catalog.agents.find((a) => a.id === id)?.name ?? id : 'Non attribuée')}
          deptName={(id) => (id ? nameOf(id) : '—')}
          selectedTask={selection?.kind === 'task' ? selection.id : undefined}
          onSelect={(id) => select({ kind: 'task', id })}
          initialOpen={taskPanelOpen}
          onOpenChange={(v) => host.setLocal('taskPanel', v)}
          mobile={device === 'mobile'}
        />
      )}

      <div className="sr-only">
        <h2>{hubMode ? 'Hub central' : 'Bureau modulaire'}</h2>
        {hubMode && hubDept && (
          <p>
            Au centre, {hubDept.name} ({ariaFor(hubDept)}). Les autres départements sont disposés en anneau, regroupés par pôle, chacun relié au centre par une passerelle.
            {spokeEls.some((sp) => sp.state !== 'idle')
              ? ` Passerelles actives (échanges enregistrés, 15 min) : ${spokeEls.filter((sp) => sp.state !== 'idle').map((sp) => `${sp.depts.map(nameOf).join(', ')}${sp.state === 'error' ? ' (échec)' : ''}`).join(' ; ')}.`
              : ' Aucune passerelle active : aucun échange enregistré avec le centre dans les 15 dernières minutes.'}
          </p>
        )}
        <p>
          {plural(nDepts, 'département', 'départements')} représentés par des plateformes. Les personnages sont des agents IA, les machines des scripts ou services ; les
          cubes représentent les tâches en cours ou en attente. Les liaisons s’animent uniquement lors d’échanges enregistrés.
        </p>
        <ul>
          {slots.filter((d): d is DepartmentDef => !!d).map((d) => (
            <li key={d.id}>{ariaFor(d)}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Legend({ hub }: { hub: boolean }) {
  const sw = (fill: string, dashed = false) => (
    <svg width={22} height={16} viewBox="-11 -10 22 16" aria-hidden>
      <path d="M0 -8 L9 -3.5 L0 1 L-9 -3.5 Z" style={{ fill, stroke: 'var(--c-ink)', strokeOpacity: 0.6, strokeDasharray: dashed ? '2 2' : undefined }} />
    </svg>
  );
  return (
    <div className="mo-legend" role="note" aria-label="Légende">
      {sw('var(--p3)')}
      <span>Plateforme : un département (vue fonctionnelle, pas un agent dédié).</span>
      <svg width={22} height={22} viewBox="-11 -18 22 22" aria-hidden>
        <rect x={-5} y={-14} width={10} height={12} rx={4} style={{ fill: 'hsl(250 46% 62%)', stroke: 'var(--c-ink)', strokeOpacity: 0.6 }} />
      </svg>
      <span>Personnage : agent IA (modèle) ou vous. Machine : script ou service déterministe.</span>
      {sw('color-mix(in oklab, var(--st-working) 55%, var(--c-raised))')}
      <span>Cube : une tâche en cours (bleu), suspendue (gris) ou en attente (pointillés). Six au plus.</span>
      <svg width={22} height={10} viewBox="0 0 22 10" aria-hidden>
        <path d="M1 5 H21" style={{ stroke: 'var(--st-working)', strokeWidth: 2.5, strokeDasharray: '2 5', strokeLinecap: 'round' }} />
      </svg>
      <span>
        {hub
          ? 'Passerelle éclairée : échange enregistré avec le centre (appel, tâche confiée par la file, collaboration) dans les 15 dernières minutes. Éteinte : aucun échange.'
          : 'Liaison animée : échange enregistré dans les 15 dernières minutes. Immobile : dépendance déclarée.'}
      </span>
      <span style={{ fontWeight: 700, textAlign: 'center' }}>◆</span>
      <span>Pastilles : tâches (▶), en attente (…), erreurs (!), décisions (◆), incidents (▲).</span>
      <span />
      <span className="t-muted">Plateformes séparées : {PW}×{PD} cases, réorganisables sans effet sur le fonctionnement.</span>
    </div>
  );
}
