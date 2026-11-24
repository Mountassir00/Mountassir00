/**
 * QG 3D — an explorable headquarters on one level.
 *
 * Wings per pole (catalog groups) along corridors, one room per department
 * furnished for its trade, and common spaces: lounge (agents whose REAL status
 * is idle), meeting room (agents collaborating on one task), model room, test
 * gym (Benchmark Laboratory) and reception (Connector Department).
 *
 * Overview: isometric cut-away model (low walls, far façades kept). Double
 * click a room (or pick it in the list / on the plan) = soft flight there.
 * Visit: eye level with real walls and ceiling, WASD/ZQSD + arrows or drag,
 * collisions against walls; 0 / Échap / button = back to the overview.
 *
 * Every figure reflects `state.agents[id].status` only; agents move between
 * rooms (through doors and corridors) only when that status or their task
 * changes. Tubes are drawn only for real flows of the last 10 minutes.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { IconClose, IconFit, IconMenu, NatureBadge, PlanMinimap, Segmented, StatusPill, type PlanItem } from '@ds';
import { SceneLabels, THREE, ThreeStage, useScenePalette, type PickHit, type SceneLabel, type ScenePalette, type Stage3D } from '@ds/three';
import {
  fmtCompact, fmtUsd, modelLabel, recentFlows, STATUS_LABEL, useGovernor, type AgentDef, type AgentStatus, type Catalog, type ExperienceProps, type FlowView, type GovernorState,
} from '@sdk';
import { HQController, type FigureStatus, type FlowPairSpec, type Mode, type Settings } from './controller';
import { COMMONS_WING, planBuilding, toPlan, type Building, type Space } from './plan';
import { computePlacements, currentTask, REASON_LABEL, type Placement } from './placement';
import './hq-3d.css';

const FLOW_WINDOW = 10 * 60_000;
const FLOW_COLORS = { llm: '#4f8dff', tools: '#22c3b4', data: '#9b6bff', failed: '#ff5a64' };
const ACTIVE: AgentStatus[] = ['working', 'researching', 'validating', 'collaborating'];
const KIND_LABEL: Record<AgentDef['kind'], string> = { llm: 'Agent IA', script: 'Script déterministe', service: 'Service', human: 'Humain' };

type Density = 'essential' | 'balanced' | 'full';
type Ambience = 'auto' | 'day' | 'evening';

const short = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const HELP: Record<Mode, string> = {
  overview:
    'Vue d’ensemble du QG. Glisser pour tourner, clic droit ou Maj + glisser pour déplacer, molette ou pincement pour zoomer. Double-clic sur une pièce pour s’y rendre. Touche V pour entrer en visite, 0 pour recadrer.',
  visit:
    'Visite à hauteur d’yeux. Z Q S D ou W A S D pour avancer et se décaler, flèches gauche et droite pour tourner, glisser pour regarder. Au doigt : glisser horizontalement pour regarder, verticalement pour avancer, pincer pour zoomer. Double-clic sur le sol pour y aller. 0 ou Échap pour revenir à la vue d’ensemble.',
};

export default function HQ3D({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const { state, catalog, now, selection } = g;
  const palette = useScenePalette();
  const rootRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState<Stage3D | null>(null);
  const [ctl, setCtl] = useState<HQController | null>(null);
  const [built, setBuilt] = useState(0);
  const [mode, setMode] = useState<Mode>('overview');
  const [place, setPlace] = useState<{ id: string; name: string } | null>(null);
  const [view, setView] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [width, setWidth] = useState(1200);
  const [listOpen, setListOpen] = useState<boolean | null>(null);

  // settings (Studio)
  const ambience = (['auto', 'day', 'evening'].includes(String(config.ambience)) ? config.ambience : 'auto') as Ambience;
  const density = (['essential', 'balanced', 'full'].includes(String(config.labelDensity)) ? config.labelDensity : 'balanced') as Density;
  const speed = typeof config.cameraSpeed === 'number' ? Math.min(2, Math.max(0.5, config.cameraSpeed)) : 1;
  const ceiling = config.ceilingInVisit !== false;
  const defaultMode: Mode = config.defaultMode === 'visit' ? 'visit' : 'overview';
  const hour = new Date(now).getHours();
  const evening = ambience === 'evening' || (ambience === 'auto' && (hour >= 19 || hour < 7));

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = width < 760;
  const phone = device === 'mobile' || width < 520;
  const simplified = phone || quality.level === 'minimal';
  const showList = listOpen ?? (!narrow && width >= 1080);

  const building = useMemo(() => planBuilding(catalog), [catalog]);
  const humanDepts = useMemo(() => new Set(catalog.agents.filter((a) => a.kind === 'human').map((a) => a.departmentIds[0])), [catalog]);

  /* ---------------- controller ---------------- */
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const tapRef = useRef<(hit: PickHit | null, double: boolean, floor: { x: number; z: number } | null) => void>(() => undefined);
  useEffect(() => {
    if (!stage) return;
    const c = new HQController(stage, {
      onPlace: setPlace,
      onView: setView,
      onMode: (m) => {
        setMode(m);
        setListOpen(m === 'visit' ? false : null);
        host.announce(m === 'visit' ? 'Mode visite : Z Q S D ou flèches pour se déplacer, 0 pour revenir à la vue d’ensemble.' : 'Vue d’ensemble du QG.');
      },
      onTap: (hit, dbl, floor) => tapRef.current(hit, dbl, floor),
    });
    setCtl(c);
    return () => {
      c.dispose();
      setCtl(null);
    };
  }, [stage, host]);

  // agenda of the meeting room (real collaborations only)
  const agenda = useMemo(() => {
    const byTask = new Map<string, string[]>();
    for (const a of catalog.agents) {
      const rt = state.agents[a.id];
      if (rt?.status !== 'collaborating') continue;
      const k = rt.currentTaskId ?? '—';
      byTask.set(k, [...(byTask.get(k) ?? []), a.name]);
    }
    return [...byTask.entries()].map(([tid, names]) => ({ title: state.tasks[tid]?.title ?? 'Tâche non précisée', names }));
  }, [state, catalog]);
  const agendaRef = useRef(agenda);
  agendaRef.current = agenda;
  const agendaSig = JSON.stringify(agenda);

  const qualityTier = quality.level === 'high' ? 'h' : quality.level === 'standard' ? 's' : 'l';
  const portrait = phone || width < 560;
  const insetLeft = showList && !phone ? 266 : 0;
  const insetTop = phone ? 70 : 48;
  const insets = useMemo(() => ({ left: insetLeft, top: insetTop, portrait }), [insetLeft, insetTop, portrait]);
  const insetsRef = useRef(insets);
  insetsRef.current = insets;
  useEffect(() => {
    if (!ctl || !stage) return;
    stage.setPalette(palette);
    ctl.frameHome(insetsRef.current, false);
    ctl.settings = { speed, ceiling };
    ctl.build(building, catalog, {
      evening,
      simplified,
      humanDepts,
      modelNodeExists: !!building.models?.nodeId,
      boardTextureWidth: qualityTier === 'h' ? 512 : qualityTier === 's' ? 384 : 256,
      drawAgenda: (ctx, w, h, p) => drawAgenda(ctx, w, h, p, agendaRef.current),
    });
    ctl.applyAmbience(evening);
    setBuilt((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctl, stage, building, catalog, palette, evening, simplified, humanDepts, qualityTier]);

  // re-frame the overview when the room list opens or closes
  const prevInsets = useRef(insets);
  useEffect(() => {
    if (prevInsets.current === insets) return;
    prevInsets.current = insets;
    if (ctl?.scene) ctl.frameHome(insets, 'animate');
  }, [ctl, insets]);

  // default mode (Studio) on first build
  const firstMode = useRef(true);
  useEffect(() => {
    if (!ctl || !built || !firstMode.current) return;
    firstMode.current = false;
    if (defaultMode === 'visit') ctl.enterVisit();
  }, [ctl, built, defaultMode]);

  useEffect(() => {
    ctl?.setSettings({ speed, ceiling } satisfies Settings);
  }, [ctl, speed, ceiling]);
  useEffect(() => {
    ctl?.applyAmbience(evening);
  }, [ctl, quality, evening]);

  /* ---------------- data → scene ---------------- */
  // previous result: agents keep their post while they stay in a room
  const prevPlacements = useRef<Map<string, Placement> | undefined>(undefined);
  const placements = useMemo(() => {
    const next = computePlacements(state, catalog, building, prevPlacements.current);
    prevPlacements.current = next;
    return next;
  }, [state, catalog, building]);
  const statuses = useMemo(() => {
    const m = new Map<string, FigureStatus>();
    for (const a of catalog.agents) {
      const rt = state.agents[a.id];
      m.set(a.id, { status: rt?.status ?? 'offline', known: !!rt, partnerId: rt?.collaboratingWith });
    }
    return m;
  }, [state, catalog]);

  const winEvents = useMemo(() => g.windowEvents(now - FLOW_WINDOW, now), [g, now]);
  const flows = useMemo(() => recentFlows(winEvents, now, FLOW_WINDOW), [winEvents, now]);
  const flowPairs = useMemo(() => pairFlows(flows, building, catalog, placements), [flows, building, catalog, placements]);

  useEffect(() => {
    if (!ctl || !built) return;
    ctl.setAgents(placements, statuses);
  }, [ctl, built, placements, statuses]);
  useEffect(() => {
    if (!ctl || !built) return;
    ctl.setFlows(flowPairs, true);
  }, [ctl, built, flowPairs]);
  useEffect(() => {
    if (!ctl || !built) return;
    ctl.redrawBoards();
  }, [ctl, built, agendaSig]);

  /* ---------------- selection & hover ---------------- */
  const spaceOfSelection = (sel: typeof selection): Space | undefined => {
    if (!sel) return undefined;
    if (sel.kind === 'department') return building.byDept.get(sel.id);
    if (sel.kind === 'node' && building.models?.nodeId === sel.id) return building.models;
    return undefined;
  };
  useEffect(() => {
    if (!ctl || !stage || !built) return;
    const sp = spaceOfSelection(selection);
    ctl.highlight('select', sp ?? null);
    stage.setHalo('select', selection?.kind === 'agent' ? stage.picker.find({ kind: 'agent', id: selection.id }) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctl, stage, built, selection, building]);

  const onHover = (hit: PickHit | null) => {
    if (!ctl || !stage) return;
    if (hit && ctl.occluded({ x: hit.point.x, z: hit.point.z })) hit = null;
    if (hit?.selection.kind === 'agent') {
      setHover(hit.selection.id);
      ctl.highlight('hover', null);
      return;
    }
    setHover(null);
    stage.setHalo('hover', null);
    const sp = hit ? spaceOfSelection(hit.selection as typeof selection) : undefined;
    ctl.highlight('hover', sp ?? null);
  };

  tapRef.current = (hit, dbl, floor) => {
    if (!ctl) return;
    if (dbl) {
      if (floor) ctl.goToPoint(floor);
      return;
    }
    if (hit) host.select(hit.selection);
    else if (selection) host.select(null);
  };

  const goTo = (s: Space) => {
    if (!ctl) return;
    ctl.goToSpace(s.id);
    if (s.deptId) host.select({ kind: 'department', id: s.deptId });
    else if (s.nodeId && building.models?.id === s.id) host.select({ kind: 'node', id: s.nodeId });
    host.announce(mode === 'visit' ? `En route vers ${s.name}` : `Vue sur ${s.name}`);
    if (phone) setListOpen(false);
  };

  // command palette
  const live = useRef({ ctl, building });
  live.current = { ctl, building };
  useEffect(
    () =>
      host.provideCommands([
        { id: 'hq-overview', label: 'QG : vue d’ensemble', keyword: 'qg:ensemble', run: () => live.current.ctl?.enterOverview() },
        { id: 'hq-visit', label: 'QG : visiter (hauteur d’yeux)', keyword: 'qg:visite', run: () => live.current.ctl?.enterVisit() },
        { id: 'hq-lounge', label: 'QG : aller au salon', keyword: 'qg:salon', run: () => live.current.building.lounge && live.current.ctl?.goToSpace(live.current.building.lounge.id) },
        { id: 'hq-meeting', label: 'QG : aller en salle de réunion', keyword: 'qg:réunion', run: () => live.current.building.meeting && live.current.ctl?.goToSpace(live.current.building.meeting.id) },
        { id: 'hq-spatial', label: 'Ouvrir l’Espace spatial', keyword: 'vue:spatial', run: () => host.openView('spatial-workspace') },
      ]),
    [host],
  );

  /* ---------------- derived for overlays ---------------- */
  const present = useMemo(() => {
    const m = new Map<string, AgentDef[]>();
    for (const a of catalog.agents) {
      const p = placements.get(a.id);
      if (!p) continue;
      m.set(p.spaceId, [...(m.get(p.spaceId) ?? []), a]);
    }
    return m;
  }, [catalog, placements]);

  const counts = useMemo(() => {
    let work = 0;
    let lounge = 0;
    let wait = 0;
    let err = 0;
    let rest = 0;
    let unknown = 0;
    for (const a of catalog.agents) {
      if (a.kind === 'human') continue;
      const rt = state.agents[a.id];
      if (!rt) {
        unknown++;
        continue;
      }
      if (rt.status === 'error') err++;
      else if (rt.status === 'waiting' || rt.status === 'paused') wait++;
      else if (ACTIVE.includes(rt.status)) work++;
      else if (placements.get(a.id)?.reason === 'lounge') lounge++;
      else rest++;
    }
    return { work, lounge, wait, err, rest, unknown };
  }, [catalog, state, placements]);

  const labels = useMemo<SceneLabel[]>(() => {
    if (!ctl || !built) return [];
    const out: SceneLabel[] = [];
    if (mode === 'overview')
      for (const s of building.spaces) {
        const here = present.get(s.id) ?? [];
        const st = aggregate(state, here);
        const sel = s.deptId ? { kind: 'department' as const, id: s.deptId } : s.nodeId && s.role === 'models' ? { kind: 'node' as const, id: s.nodeId } : undefined;
        out.push({
          id: `room:${s.id}`,
          position: ctl.scene?.rooms.get(s.id)?.anchor ?? [s.center.x, 1.4, s.center.z],
          title: s.name,
          subtitle: s.role === 'department' ? s.caption : s.caption,
          status: st ?? undefined,
          statusLabel: st ? STATUS_LABEL[st] : undefined,
          count: here.length ? String(here.length) : undefined,
          description: here.length ? `${here.length} présent(s) : ${here.map((a) => a.name).join(', ')}` : 'Personne',
          priority: 2,
          selection: sel,
          selected: !!sel && selection?.kind === sel.kind && selection.id === sel.id,
        });
      }
    for (const a of catalog.agents) {
      const rt = state.agents[a.id];
      const st: AgentStatus = rt?.status ?? 'offline';
      const task = currentTask(state, a.id);
      const pl = placements.get(a.id);
      let subtitle: string;
      if (a.kind === 'human') subtitle = 'Direction · à son bureau';
      else if (!rt) subtitle = 'aucun événement';
      else subtitle = `${STATUS_LABEL[st].toLowerCase()}${task ? ` · ${short(task.title, 28)}` : pl?.reason === 'lounge' ? ' · au salon' : ''}`;
      const active = rt && (ACTIVE.includes(st) || st === 'waiting');
      let priority = 1.2;
      if (st === 'error' && rt) priority = 3;
      else if (density === 'full') priority = 2.3;
      else if (density === 'balanced') priority = active ? (a.kind === 'llm' ? 2.3 : 2.1) : a.kind === 'llm' ? 1.4 : 1;
      else priority = active && a.kind === 'llm' ? 1.5 : 0.6;
      const selected = selection?.kind === 'agent' && selection.id === a.id;
      out.push({
        id: `ag:${a.id}`,
        position: () => ctl.agentAnchor(a.id),
        title: a.name,
        subtitle,
        status: a.kind === 'human' ? undefined : rt ? st : 'offline',
        statusLabel: a.kind === 'human' ? 'Humain' : rt ? STATUS_LABEL[st] : 'Aucun événement',
        priority,
        selection: { kind: 'agent', id: a.id },
        selected,
      });
    }
    return out;
  }, [ctl, built, mode, building, present, state, catalog, placements, density, selection]);

  const plan = useMemo<PlanItem[]>(() => {
    const items: PlanItem[] = [];
    const rect = (id: string, r: { x0: number; z0: number; x1: number; z1: number }, color: string, label: string) => {
      const p = toPlan(building, { x: r.x0, z: r.z0 });
      items.push({ id, kind: 'room', x: p.x, y: p.y, w: r.x1 - r.x0, h: r.z1 - r.z0, color, label });
    };
    for (const c of building.corridors) rect(c.id, c.rect, 'var(--c-sunken)', c.name);
    for (const pa of building.passages) rect(pa.id, pa.rect, 'var(--c-sunken)', pa.name);
    for (const s of building.spaces) rect(s.id, s.rect, `color-mix(in oklab, var(--${s.tone}) 82%, var(--c-raised))`, s.name);
    if (ctl)
      for (const a of catalog.agents) {
        if (a.kind !== 'llm' && a.kind !== 'human') continue;
        const pos = ctl.figureTarget(a.id);
        if (!pos) continue;
        const p = toPlan(building, { x: pos.x, z: pos.z });
        const st = state.agents[a.id]?.status ?? 'offline';
        items.push({ id: `ag:${a.id}`, kind: 'agent', x: p.x, y: p.y, color: a.kind === 'human' ? 'var(--c-ink-soft)' : `var(--st-${st})`, label: a.name });
      }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [building, ctl, built, placements, state, catalog]);

  const pickPlan = (id: string) => {
    if (!ctl) return;
    if (id.startsWith('ag:')) {
      const aid = id.slice(3);
      host.select({ kind: 'agent', id: aid });
      ctl.focusAgent(aid);
      return;
    }
    const s = building.byId.get(id);
    if (s) return goTo(s);
    const c = building.corridors.find((x) => x.id === id) ?? building.passages.find((x) => x.id === id);
    if (c) ctl.goToPoint({ x: (c.rect.x0 + c.rect.x1) / 2, z: (c.rect.z0 + c.rect.z1) / 2 });
  };

  /* ---------------- hover card ---------------- */
  const hoverDef = hover ? catalog.agents.find((a) => a.id === hover) : undefined;

  /* ---------------- screen-reader summary ---------------- */
  const summary = useMemo(() => {
    const where = (a: AgentDef) => {
      const p = placements.get(a.id);
      const s = p ? building.byId.get(p.spaceId) : undefined;
      const rt = state.agents[a.id];
      return `${a.name} (${rt ? STATUS_LABEL[rt.status].toLowerCase() : 'aucun événement'}) ${p ? REASON_LABEL[p.reason] : ''}${s ? `, ${s.name}` : ''}`;
    };
    const wings = building.wings.map((w) => `${w.name} : ${w.spaceIds.map((id) => building.byId.get(id)?.name).join(', ')}`).join(' ; ');
    return `QG sur un niveau de ${Math.round(building.width)} × ${Math.round(building.depth)} m, ${building.spaces.length} pièces reliées par ${building.corridors.length} couloirs. Ailes : ${wings}. ${catalog.agents.map(where).join(' ; ')}. ${flows.length} échanges réels sur les 10 dernières minutes. Mode ${mode === 'visit' ? 'visite' : 'vue d’ensemble'}.`;
  }, [building, catalog, placements, state, flows.length, mode]);

  const minimapOn = !phone && width >= 640;
  return (
    <div ref={rootRef} className="hq" data-mode={mode} data-phone={phone || undefined} data-list={showList || undefined}>
      <div className="hq-viewport">
        <ThreeStage
          quality={quality}
          label={mode === 'visit' ? `QG 3D, visite : ${place?.name ?? ''}` : 'QG 3D, vue d’ensemble'}
          help={HELP[mode]}
          camera={{ fov: 30, minDistance: 6, maxDistance: 150 }}
          onStage={setStage}
          onHover={onHover}
          onClick={(hit, e) => ctl?.tap(hit, e.clientX, e.clientY)}
          onPalette={() => ctl?.applyAmbience(evening)}
        >
          {(st) => (
            <>
              <SceneLabels
                stage={st}
                labels={labels}
                farDistance={density === 'essential' ? 24 : phone ? 30 : 38}
                onSelect={(sel) => host.select(sel)}
                onHover={(l) => setHover(l?.selection?.kind === 'agent' ? l.selection.id : null)}
                avoid={() => {
                  const r = rootRef.current;
                  return r ? [...r.querySelectorAll('.hq-strip, .hq-list, .hq-minimap, .hq-toolbar, .hq-place')] : [];
                }}
              />
            </>
          )}
        </ThreeStage>
      </div>
      {hoverDef && ctl && stage && (
        <FloatingCard stage={stage} position={() => ctl.agentAnchor(hoverDef.id)}>
          <HoverCard agent={hoverDef} state={state} placement={placements.get(hoverDef.id)} building={building} hasDemo={g.hasDemo} />
        </FloatingCard>
      )}

      {/* status strip */}
      <div className="hq-strip" role="group" aria-label="Agents par statut">
        <span className="hq-chip" style={{ '--c': 'var(--st-working)' } as CSSProperties}>
          <i aria-hidden />
          <b className="num">{counts.work}</b> au travail
        </span>
        <span className="hq-chip" style={{ '--c': 'var(--st-idle)' } as CSSProperties} title="Agents IA dont le statut réel est « disponible » : ils sont représentés au salon.">
          <i aria-hidden />
          <b className="num">{counts.lounge}</b> au salon
        </span>
        <span className="hq-chip" style={{ '--c': 'var(--st-waiting)' } as CSSProperties}>
          <i aria-hidden />
          <b className="num">{counts.wait}</b> en attente
        </span>
        <span className="hq-chip" data-alert={counts.err > 0 || undefined} style={{ '--c': 'var(--st-error)' } as CSSProperties}>
          <i aria-hidden />
          <b className="num">{counts.err}</b> en erreur
        </span>
        <span className="hq-strip__flows" title="Échanges réels (appels de modèles, d’outils, flux de données) sur les 10 dernières minutes">
          <b className="num">{flows.length}</b> flux · 10 min
        </span>
        {(counts.rest > 0 || counts.unknown > 0) && (
          <span className="hq-strip__muted">
            {counts.rest > 0 && `${counts.rest} au repos à poste fixe`}
            {counts.rest > 0 && counts.unknown > 0 && ' · '}
            {counts.unknown > 0 && `${counts.unknown} sans événement`}
          </span>
        )}
        <NatureBadge nature={g.hasDemo ? 'demo' : 'real'} />
        {g.mode === 'replay' && <span className="hq-strip__replay">Replay · lecture seule</span>}
      </div>

      {mode === 'visit' && place && (
        <div className="hq-place" aria-live="polite">
          <i aria-hidden />
          {place.name}
        </div>
      )}

      {/* room list (sidebar / sheet) */}
      {showList && (
        <nav className="hq-list" aria-label="Pièces du QG">
          <div className="hq-list__head">
            <b>Pièces</b>
            <span className="t-muted">{building.spaces.length}</span>
            <button type="button" className="hq-icon" aria-label="Fermer la liste des pièces" onClick={() => setListOpen(false)}>
              <IconClose size={14} />
            </button>
          </div>
          <div className="hq-list__scroll">
            {building.wings.map((w) => (
              <section key={w.id} className="hq-wing" aria-label={w.name === COMMONS_WING ? w.name : `Pôle ${w.name}`}>
                <h3>{w.name === COMMONS_WING ? w.name : `Pôle ${w.name}`}</h3>
                <ul>
                  {w.spaceIds.map((id) => {
                    const s = building.byId.get(id)!;
                    const here = present.get(id) ?? [];
                    const st = aggregate(state, here);
                    const current = place?.id === id;
                    const sel = spaceOfSelection(selection)?.id === id;
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          className="hq-room"
                          aria-current={current ? 'location' : undefined}
                          data-selected={sel || undefined}
                          aria-label={`${mode === 'visit' ? 'Aller à' : 'Voir'} ${s.name}${s.role !== 'department' && s.caption ? `, ${s.caption}` : ''} : ${here.length} présent(s)${st ? `, ${STATUS_LABEL[st]}` : ''}`}
                          onClick={() => goTo(s)}
                        >
                          <i className="hq-room__tone" style={{ background: `var(--${s.tone})` }} aria-hidden />
                          <span className="hq-room__name">
                            {s.name}
                            {s.role !== 'department' && s.caption && <small>{s.caption}</small>}
                          </span>
                          {here.length > 0 && <span className="hq-room__count num">{here.length}</span>}
                          {st && <i className="hq-dot" style={{ '--c': `var(--st-${st})` } as CSSProperties} aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </nav>
      )}

      {minimapOn && (
        <div className="hq-minimap">
          <PlanMinimap
            items={plan}
            bounds={{ x: 0, y: 0, w: building.width, h: building.depth }}
            iso={false}
            title={mode === 'visit' ? `Plan · ${place?.name ?? ''}` : 'Plan du QG'}
            view={view}
            onPick={pickPlan}
            footer={
              <>
                <span>{building.spaces.length} pièces · {building.wings.length - 1} pôles</span>
                <span>{mode === 'visit' ? 'Vous êtes ici' : 'Cadre = vue'}</span>
              </>
            }
          />
        </div>
      )}

      {/* toolbar */}
      <div className="hq-toolbar" role="toolbar" aria-label="Exploration du QG">
        <button type="button" className="hq-tool" aria-pressed={showList} aria-label={showList ? 'Masquer la liste des pièces' : 'Afficher la liste des pièces'} onClick={() => setListOpen(!showList)}>
          <IconMenu size={16} />
          {!phone && <span>Pièces</span>}
        </button>
        <Segmented<Mode>
          size="sm"
          label="Mode d’exploration"
          value={mode}
          onChange={(m) => (m === 'visit' ? ctl?.enterVisit(selectionSpace(selection, building)?.id) : ctl?.enterOverview())}
          options={[
            { value: 'overview', label: phone ? 'Ensemble' : 'Vue d’ensemble', title: 'Vue d’ensemble (0)' },
            { value: 'visit', label: 'Visite', title: 'Visite à hauteur d’yeux (V)' },
          ]}
        />
        <button type="button" className="hq-tool" aria-label="Retour à la vue d’ensemble (0)" title="Vue d’ensemble (0)" onClick={() => ctl?.enterOverview()}>
          <IconFit size={16} />
        </button>
        {mode === 'visit' && !phone && <span className="hq-toolbar__hint">Z Q S D · flèches · glisser · 0</span>}
      </div>

      <p className="sr-only">{summary}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hover card                                                           */
/* ------------------------------------------------------------------ */

/**
 * Like the kit's <Anchored>, but rendered OUTSIDE the canvas container (whose
 * `contain: strict` makes a stacking context), so the card floats above the
 * HQ overlays (room list, plan). Positioned after each rendered frame.
 */
function FloatingCard({ stage, position, children }: { stage: Stage3D; position: () => { x: number; y: number; z: number }; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef(position);
  pos.current = position;
  useEffect(() => {
    const out = { x: 0, y: 0, visible: false, depth: 0 };
    const v = new THREE.Vector3();
    const place = () => {
      const el = ref.current;
      const host = el?.parentElement;
      if (!el || !host) return;
      const p = pos.current();
      stage.project(v.set(p.x, p.y, p.z), out);
      const cr = stage.canvas.getBoundingClientRect();
      const hr = host.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const ax = cr.left - hr.left + out.x;
      const ay = cr.top - hr.top + out.y;
      const x = Math.min(hr.width - w - 8, Math.max(8, ax - w / 2));
      let y = ay - h - 18;
      if (y < 8) y = ay + 30;
      el.style.visibility = out.visible ? 'visible' : 'hidden';
      el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    };
    const off = stage.onFrame(place);
    stage.invalidate();
    return off;
  }, [stage]);
  return (
    <div ref={ref} className="hq-float" style={{ visibility: 'hidden' }}>
      {children}
    </div>
  );
}

function HoverCard({ agent, state, placement, building, hasDemo }: { agent: AgentDef; state: GovernorState; placement?: Placement; building: Building; hasDemo: boolean }) {
  const rt = state.agents[agent.id];
  const task = currentTask(state, agent.id);
  const room = placement ? building.byId.get(placement.spaceId) : undefined;
  const nature = rt?.nature === 'real' ? 'estimated' : rt?.nature === 'demo' || hasDemo ? 'demo' : 'estimated';
  return (
    <div className="hq-card" role="tooltip">
      <div className="hq-card__head">
        <b>{agent.name}</b>
        <span className="t-muted">{agent.kind === 'llm' ? modelLabel(rt?.model ?? agent.model) : KIND_LABEL[agent.kind]}</span>
      </div>
      {agent.kind !== 'human' && (rt ? <StatusPill status={rt.status} /> : <span className="hq-card__none">Aucun événement reçu</span>)}
      <dl>
        <dt>Pièce</dt>
        <dd>
          {room?.name ?? '—'}
          {placement && placement.reason !== 'fixed' && placement.reason !== 'seat' && <span className="t-muted"> · {REASON_LABEL[placement.reason]}</span>}
        </dd>
        <dt>Tâche</dt>
        <dd>{task ? task.title : 'Aucune'}</dd>
        <dt>Consommation</dt>
        <dd>
          {agent.kind === 'human' ? (
            <span className="t-muted">Sans objet</span>
          ) : !rt ? (
            <span>
              Indisponible <NatureBadge nature="unavailable" />
            </span>
          ) : rt.llmCalls > 0 ? (
            <span className="hq-card__use">
              {fmtCompact(rt.tokensIn + rt.cacheRead)} entrée · {fmtCompact(rt.tokensOut)} sortie · {fmtUsd(rt.costUsd)} <NatureBadge nature={nature} />
            </span>
          ) : (
            <span className="hq-card__use">
              Aucun appel de modèle · {rt.toolCalls} appel(s) d’outil <NatureBadge nature={hasDemo ? 'demo' : 'real'} />
            </span>
          )}
        </dd>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const RANK: Record<AgentStatus, number> = { error: 9, waiting: 8, collaborating: 7, working: 6, researching: 6, validating: 6, paused: 3, idle: 2, offline: 1 };

function aggregate(state: GovernorState, agents: AgentDef[]): AgentStatus | null {
  let best: AgentStatus | null = null;
  for (const a of agents) {
    if (a.kind === 'human') continue;
    const s = state.agents[a.id]?.status;
    if (!s) continue;
    if (!best || RANK[s] > RANK[best]) best = s;
  }
  return best;
}

function selectionSpace(sel: { kind: string; id: string } | null, b: Building): Space | undefined {
  if (sel?.kind === 'department') return b.byDept.get(sel.id);
  return undefined;
}

/** Real flows → room pairs. Agents are where they stand; nodes go to the room that serves them. */
function pairFlows(flows: FlowView[], b: Building, catalog: Catalog, placements: Map<string, Placement>): FlowPairSpec[] {
  const nodes = new Map(catalog.nodes.map((n) => [n.id, n]));
  const agents = new Map(catalog.agents.map((a) => [a.id, a]));
  const nodeSpace = new Map<string, string | undefined>();
  const resolve = (id: string): string | undefined => {
    const p = placements.get(id);
    if (p) return p.spaceId;
    if (nodeSpace.has(id)) return nodeSpace.get(id);
    const n = nodes.get(id);
    let s: string | undefined;
    if (n) {
      if ((n.kind === 'model' || n.kind === 'provider') && b.models) s = b.models.id;
      else if ((n.kind === 'mcp' || n.kind === 'connector') && b.reception?.deptId) s = b.reception.id;
      else if (n.kind === 'user') s = catalog.agents.filter((a) => a.kind === 'human').map((a) => placements.get(a.id)?.spaceId).find(Boolean);
      if (!s) {
        // the room of an agent linked to this node in the catalog
        for (const e of catalog.edges) {
          const other = e.from === id ? e.to : e.to === id ? e.from : null;
          if (other && agents.has(other)) {
            const a = agents.get(other)!;
            s = a.departmentIds.map((d) => b.byDept.get(d)?.id).find(Boolean);
            if (s) break;
          }
        }
      }
    }
    nodeSpace.set(id, s);
    return s;
  };
  const m = new Map<string, { from: string; to: string; count: number; failed: number; llm: number; tools: number; data: number; last: number }>();
  for (const f of flows) {
    const a = resolve(f.from);
    const c = resolve(f.to);
    if (!a || !c || a === c) continue;
    const key = `${a}>${c}`;
    let p = m.get(key);
    if (!p) m.set(key, (p = { from: a, to: c, count: 0, failed: 0, llm: 0, tools: 0, data: 0, last: 0 }));
    p.count++;
    if (f.status === 'failed') p.failed++;
    if (f.kind === 'requête modèle') p.llm++;
    else if (f.kind === 'appel outil') p.tools++;
    else p.data++;
    p.last = Math.max(p.last, f.ts);
  }
  return [...m.entries()]
    .sort((x, y) => y[1].last - x[1].last)
    .slice(0, 14)
    .map(([key, p]) => ({
      key,
      from: p.from,
      to: p.to,
      color: p.failed > 0 && p.failed >= p.count / 2 ? FLOW_COLORS.failed : p.llm >= p.tools && p.llm >= p.data ? FLOW_COLORS.llm : p.tools >= p.data ? FLOW_COLORS.tools : FLOW_COLORS.data,
      level: Math.min(1, 0.35 + Math.log10(1 + p.count) / 1.6),
    }));
}

/** Meeting-room board: the real collaborations in progress. */
function drawAgenda(ctx: CanvasRenderingContext2D, w: number, h: number, p: ScenePalette, agenda: Array<{ title: string; names: string[] }>) {
  const s = w / 384;
  const ink = p.scheme === 'dark' ? '#eef0f6' : '#15171d';
  const muted = p.scheme === 'dark' ? '#a9afbf' : '#5b606c';
  ctx.fillStyle = p.scheme === 'dark' ? 'rgba(20,24,34,0.82)' : 'rgba(255,255,255,0.9)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink;
  ctx.font = `700 ${Math.round(17 * s)}px ${p.css.font}`;
  ctx.fillText('Ordre du jour', 16 * s, 28 * s);
  ctx.fillStyle = muted;
  ctx.font = `500 ${Math.round(11 * s)}px ${p.css.font}`;
  ctx.fillText('Collaborations en cours (statut réel)', 16 * s, 46 * s);
  if (!agenda.length) {
    ctx.fillStyle = muted;
    ctx.font = `500 ${Math.round(13 * s)}px ${p.css.font}`;
    ctx.fillText('Aucune collaboration en cours', 16 * s, 82 * s);
    return;
  }
  let y = 74 * s;
  for (const item of agenda.slice(0, 3)) {
    ctx.fillStyle = p.css.status.collaborating;
    ctx.beginPath();
    ctx.arc(20 * s, y - 5 * s, 4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    ctx.font = `650 ${Math.round(13 * s)}px ${p.css.font}`;
    ctx.fillText(short(item.title, 38), 30 * s, y);
    ctx.fillStyle = muted;
    ctx.font = `500 ${Math.round(11 * s)}px ${p.css.font}`;
    ctx.fillText(item.names.join(' · '), 30 * s, y + 15 * s);
    y += 38 * s;
  }
}
