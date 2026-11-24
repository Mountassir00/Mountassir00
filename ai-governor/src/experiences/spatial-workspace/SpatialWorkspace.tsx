/**
 * Espace spatial — IDE-like workspace around a 3D office.
 *
 *  left    Explorateur: departments → engines (status, activity letter), system nodes
 *  center  3D office from the shared spatial layout (robots = LLM agents, consoles =
 *          scripts, drones = services, the human at desk 01), real flows, labels, minimap
 *  right   context: selected agent / department / node, or the "Revue" of pending
 *          decisions (GO / NO GO / TEST through host.request)
 *  bottom  terminal: operational lines, events, agent logs, problems + task aside
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DockLayout, ExplorerTree, LogTerminal, Meter, NatureBadge, Notice, StatusPill, type DockSizes, type TreeNode,
} from '@ds';
import { hueCss, useScenePalette, useSpatialLayout, type CameraPreset } from '@ds/three';
import {
  fmtCompact, fmtRelative, fmtUsd, modelLabel, STATUS_LABEL, useGovernor, type AgentDef, type Decision, type ExperienceProps, type GovernorState,
} from '@sdk';
import { activityLetter, aggregateStatus, CONTEXT_WINDOW, fmtTokens, lastContext, makeNames, slug, statusOf, taskProgress, terminalTabs } from './data';
import { SceneToolbar, SpatialScene3D, type SceneHandle } from './Scene';
import './spatial-workspace.css';

const RISK_LABEL = { low: 'Risque faible', medium: 'Risque moyen', high: 'Risque élevé' } as const;
const REV_LABEL = { reversible: 'Réversible', partial: 'Partiellement réversible', irreversible: 'Irréversible' } as const;
type Verdict = Exclude<Decision['status'], 'pending'>;
const KIND_LABEL: Record<AgentDef['kind'], string> = { llm: 'Agent IA', script: 'Script déterministe', service: 'Service', human: 'Humain' };
const NODE_GROUPS: Array<{ id: string; label: string; kinds: string[] }> = [
  { id: 'models', label: 'Modèles', kinds: ['model', 'provider'] },
  { id: 'connectors', label: 'Connecteurs & MCP', kinds: ['mcp', 'connector'] },
  { id: 'skills', label: 'Skills', kinds: ['skill'] },
  { id: 'data', label: 'Bases de données', kinds: ['database'] },
  { id: 'queues', label: 'Files & bus', kinds: ['queue'] },
];

function Dot({ status, title }: { status: string; title?: string }) {
  return <i className="sw-dot" style={{ ['--dot' as string]: `var(--st-${status})` }} title={title} aria-hidden />;
}

export default function SpatialWorkspace({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();
  const { state, catalog, now, selection, mode } = g;
  const palette = useScenePalette();
  const { layout } = useSpatialLayout(host);
  const names = useMemo(() => makeNames(catalog), [catalog]);
  const scene = useRef<SceneHandle | null>(null);

  const [showFlows, setShowFlows] = useState<boolean>(() => host.getLocal('showFlows', config.showFlows !== false));
  const [showLabels, setShowLabels] = useState<boolean>(() => host.getLocal('showLabels', config.showLabels !== false));
  const [preset, setPreset] = useState<CameraPreset>(() => host.getLocal<CameraPreset>('preset', (config.cameraPreset as CameraPreset) ?? 'iso'));
  const [tab, setTab] = useState('terminal');
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const flowWindowMin = typeof config.flowWindowMin === 'number' ? config.flowWindowMin : 10;
  const robotScale = typeof config.robotScale === 'number' ? config.robotScale : 1;

  // narrow container → simplified scene (the dock turns panels into tabs below 640 px)
  const root = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(device === 'mobile');
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 640));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const simplified = narrow || device === 'mobile' || quality.level === 'minimal';

  const persist = <T,>(key: string, set: (v: T) => void) => (v: T) => {
    set(v);
    host.setLocal(key, v);
  };
  const setFlows = persist('showFlows', setShowFlows);
  const setLabels = persist('showLabels', setShowLabels);
  const setCam = persist('preset', setPreset);

  // command palette entries
  const live = useRef({ showFlows, showLabels });
  live.current = { showFlows, showLabels };
  useEffect(
    () =>
      host.provideCommands([
        { id: 'fit', label: 'Recadrer la vue', keyword: 'vue:recadrer', run: () => scene.current?.fit() },
        { id: 'governor', label: 'Centrer sur le Gouverneur', keyword: 'vue:gouverneur', run: () => { scene.current?.focusAgent('governor'); host.select({ kind: 'agent', id: 'governor' }); } },
        { id: 'flows', label: 'Afficher / masquer les flux', keyword: 'vue:flux', run: () => setFlows(!live.current.showFlows) },
        { id: 'labels', label: 'Afficher / masquer les étiquettes', keyword: 'vue:étiquettes', run: () => setLabels(!live.current.showLabels) },
      ]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [host],
  );

  /* ---------------- explorer ---------------- */
  const flowsByNode = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of g.windowEvents(now - flowWindowMin * 60_000, now)) if (e.destination && (e.type === 'llm.call' || e.type === 'tool.call')) m.set(e.destination.id, (m.get(e.destination.id) ?? 0) + 1);
    return m;
  }, [g, now, flowWindowMin]);

  const tree = useMemo<TreeNode[]>(() => {
    const deptNodes: TreeNode[] = catalog.departments.map((d) => {
      const engines = d.engineIds.map((id) => catalog.agents.find((a) => a.id === id)).filter((a): a is AgentDef => !!a);
      const running = Object.values(state.tasks).filter((t) => t.departmentId === d.id && t.status === 'running').length;
      const st = aggregateStatus(state, d.engineIds);
      return {
        id: `d:${d.id}`,
        label: d.name,
        hint: d.mission,
        defaultOpen: false,
        badge: (
          <>
            {running > 0 && <span className="sw-count" title={`${running} tâche(s) en cours`}>{running}</span>}
            <Dot status={st} title={STATUS_LABEL[st]} />
          </>
        ),
        children: engines.map((a) => {
          const rt = state.agents[a.id];
          const s = rt?.status ?? 'idle';
          const letter = a.kind === 'human' ? { letter: null, title: '' } : activityLetter(rt?.lastEventTs, now);
          return {
            id: `a:${d.id}:${a.id}`,
            label: a.name,
            hint: `${a.role} — ${KIND_LABEL[a.kind]}`,
            icon: <span className="sw-avatar" style={{ ['--hue' as string]: hueCss(a.avatar.hue, palette.scheme) }} aria-hidden>{a.name[0]}</span>,
            badge: (
              <>
                {letter.letter && (
                  <span className={`sw-letter sw-letter--${letter.letter}`} title={letter.title}>
                    {letter.letter}
                    <span className="sr-only"> : {letter.title}</span>
                  </span>
                )}
                {a.kind !== 'human' && <Dot status={s} title={STATUS_LABEL[s]} />}
              </>
            ),
          };
        }),
      };
    });
    const sys: TreeNode[] = NODE_GROUPS.map((grp) => {
      const nodes = catalog.nodes.filter((n) => grp.kinds.includes(n.kind));
      return {
        id: `s:${grp.id}`,
        label: grp.label,
        defaultOpen: grp.id === 'models',
        badge: <span className="sw-count">{nodes.length}</span>,
        children: nodes.map((n) => {
          const conn = state.connectors[n.id];
          const calls = flowsByNode.get(n.id) ?? 0;
          const connStatus = conn ? (conn.status === 'connected' ? 'validating' : conn.status === 'degraded' ? 'waiting' : 'error') : null;
          return {
            id: `n:${n.id}`,
            label: n.label,
            hint: n.note ?? (n.visibility === 'none' ? 'Non observable' : n.visibility === 'partial' ? 'Observabilité partielle' : undefined),
            badge: (
              <>
                {calls > 0 && <span className="sw-count" title={`${calls} appel(s) sur ${flowWindowMin} min`}>{calls}</span>}
                {connStatus && <Dot status={connStatus} title={conn!.status === 'connected' ? 'Connecté' : conn!.status === 'degraded' ? 'Dégradé' : 'Authentification requise'} />}
                {n.visibility === 'none' && <span className="sw-letter" title="Non observable par API">—</span>}
              </>
            ),
          };
        }),
      };
    }).filter((x) => x.children!.length);
    return [
      { id: 'g:depts', label: 'Départements', badge: <span className="sw-count">{catalog.departments.length}</span>, children: deptNodes },
      { id: 'g:sys', label: 'Système', children: sys },
    ];
  }, [catalog, state, now, palette.scheme, flowsByNode, flowWindowMin]);

  const selectedTreeId = useMemo(() => {
    if (!selection) return null;
    if (selection.kind === 'department') return `d:${selection.id}`;
    if (selection.kind === 'node') return `n:${selection.id}`;
    if (selection.kind === 'agent') {
      const a = catalog.agents.find((x) => x.id === selection.id);
      return a ? `a:${a.departmentIds[0]}:${a.id}` : null;
    }
    return null;
  }, [selection, catalog]);

  const onTreeSelect = (id: string) => {
    const [k, ...rest] = id.split(':');
    if (k === 'd') {
      host.select({ kind: 'department', id: rest[0] });
      scene.current?.focusPrimitive(rest[0]);
    } else if (k === 'a') {
      const aid = rest[1];
      host.select({ kind: 'agent', id: aid });
      scene.current?.focusAgent(aid);
    } else if (k === 'n') {
      host.select({ kind: 'node', id: rest[0] });
      scene.current?.focusPrimitive(rest[0]);
    }
  };

  /* ---------------- terminal ---------------- */
  const termEvents = useMemo(() => g.windowEvents(now - 30 * 60_000, now), [g, now]);
  const problemsDay = useMemo(() => g.windowEvents(now - 86_400_000, now).filter((e) => e.status === 'failed').length, [g, now]);
  const agentColor = useMemo(() => {
    const m = new Map(catalog.agents.map((a) => [a.id, hueCss(a.avatar.hue, palette.scheme)]));
    return (id: string) => m.get(id) ?? 'var(--c-ink-muted)';
  }, [catalog, palette.scheme]);
  const lines = useMemo(() => terminalTabs(termEvents, names, g.canViewConfidential, state.tasks, agentColor, agentFilter), [termEvents, names, g.canViewConfidential, state.tasks, agentColor, agentFilter]);
  const tabLines = tab === 'events' ? lines.all : tab === 'agents' ? lines.agents : tab === 'problems' ? lines.problems : lines.terminal;

  const selectedAgent = selection?.kind === 'agent' ? catalog.agents.find((a) => a.id === selection.id) : undefined;
  const asideAgent = selectedAgent ?? catalog.agents.find((a) => a.id === 'governor');

  const terminal = (
    <LogTerminal
      tabs={[
        { id: 'terminal', label: 'Terminal' },
        { id: 'events', label: 'Événements' },
        { id: 'agents', label: 'Journaux d’agents' },
        { id: 'problems', label: 'Problèmes', count: lines.problems.length },
      ]}
      active={tab}
      onTab={setTab}
      lines={tabLines}
      emptyText={tab === 'problems' ? 'Aucun échec sur les 30 dernières minutes.' : 'Aucun événement sur les 30 dernières minutes.'}
      toolbar={
        tab === 'agents' ? (
          <label className="sw-filter">
            <span className="sr-only">Filtrer par agent</span>
            <select className="select" value={agentFilter ?? ''} onChange={(e) => setAgentFilter(e.target.value || null)}>
              <option value="">Tous les agents</option>
              {catalog.agents.filter((a) => a.kind !== 'human').map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="sw-term-note">
            30 min · {problemsDay} échec(s) sur 24 h <NatureBadge nature={g.hasDemo ? 'demo' : 'real'} />
          </span>
        )
      }
      aside={asideAgent ? <TaskAside agent={asideAgent} state={state} events={termEvents} /> : undefined}
    />
  );

  /* ---------------- right panel ---------------- */
  const right = selection?.kind === 'agent' && selectedAgent ? (
    <AgentPanel agent={selectedAgent} host={host} onFocus={() => scene.current?.focusAgent(selectedAgent.id)} />
  ) : selection?.kind === 'department' ? (
    <DepartmentPanel id={selection.id} host={host} />
  ) : selection?.kind === 'node' ? (
    <NodePanel id={selection.id} flowWindowMin={flowWindowMin} />
  ) : (
    <ReviewPanel host={host} />
  );

  const sizes = host.getLocal<Partial<DockSizes>>('dock', {});
  return (
    <div ref={root} className="sw" data-scheme={palette.scheme}>
      <DockLayout
        className="sw-dock"
        sizes={sizes}
        onSizes={(s) => queueMicrotask(() => host.setLocal('dock', s))}
        centerLabel="Scène"
        left={{
          id: 'explorer',
          label: 'Explorateur',
          size: 236,
          content: (
            <div className="sw-explorer">
              <ExplorerTree title="Espace" nodes={tree} selectedId={selectedTreeId} onSelect={onTreeSelect} />
              <p className="sw-explorer__legend">
                <span className="sw-letter sw-letter--M" aria-hidden>M</span> activité &lt; 10 min · <span className="sw-letter sw-letter--I" aria-hidden>I</span> inactif &gt; 1 h · pastille = statut
              </p>
            </div>
          ),
        }}
        right={{ id: 'context', label: selection ? 'Contexte' : 'Revue', size: 318, content: right }}
        bottom={{ id: 'terminal', label: 'Terminal', size: 214, content: terminal }}
        center={
          <div className="sw-center">
            <SpatialScene3D
              host={host}
              quality={quality}
              device={device}
              layout={layout}
              showLabels={showLabels}
              showFlows={showFlows}
              preset={preset}
              flowWindowMin={flowWindowMin}
              robotScale={robotScale}
              simplified={simplified}
              handleRef={scene}
            />
            <SceneToolbar preset={preset} setPreset={setCam} showFlows={showFlows} setShowFlows={setFlows} showLabels={showLabels} setShowLabels={setLabels} onFit={() => scene.current?.fit()} />
            {mode === 'replay' && <div className="sw-replay">Replay : état au {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(now)} — lecture seule</div>}
          </div>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Task aside (terminal)                                               */
/* ------------------------------------------------------------------ */

function TaskAside({ agent, state, events }: { agent: AgentDef; state: GovernorState; events: ReturnType<ReturnType<typeof useGovernor>['windowEvents']> }) {
  const g = useGovernor();
  const rt = state.agents[agent.id];
  const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
  const progress = task ? taskProgress(g.allEvents(), task.id, task.remainingSteps) : null;
  void events;
  return (
    <div className="sw-aside">
      <div className="sw-aside__head">
        <span className="sw-avatar" style={{ ['--hue' as string]: hueCss(agent.avatar.hue) }} aria-hidden>{agent.name[0]}</span>
        <b>{agent.name}</b>
        <StatusPill status={rt?.status ?? 'idle'} compact />
      </div>
      <dl className="kv sw-kv">
        <dt>Tâche</dt>
        <dd>{task?.title ?? 'Aucune tâche en cours'}</dd>
        <dt>Branche</dt>
        <dd className="mono">{task ? `${slug(task.project)}/${slug(task.departmentId)}` : '—'}</dd>
        <dt>Statut</dt>
        <dd>{rt ? STATUS_LABEL[rt.status] : 'Aucun événement'}</dd>
        <dt>Progression</dt>
        <dd>
          {progress != null ? (
            <span className="sw-progress">
              <Meter value={progress} label={`Progression de la tâche : ${Math.round(progress * 100)} %`} tone="var(--st-working)" />
              <span className="num">{Math.round(progress * 100)} %</span>
            </span>
          ) : (
            <span className="t-muted">{task ? 'Étapes non déclarées' : '—'}</span>
          )}
        </dd>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Right panels                                                         */
/* ------------------------------------------------------------------ */

function AgentPanel({ agent, host, onFocus }: { agent: AgentDef; host: ExperienceProps['host']; onFocus: () => void }) {
  const g = useGovernor();
  const { state, now, mode } = g;
  const rt = state.agents[agent.id];
  const task = rt?.currentTaskId ? state.tasks[rt.currentTaskId] : undefined;
  const ctx = useMemo(() => (agent.kind === 'llm' ? lastContext(g.allEvents(), agent.id, now) : null), [g, agent, now]);
  const recent = useMemo(() => {
    const out = [];
    const ev = g.windowEvents(now - 86_400_000, now);
    for (let i = ev.length - 1; i >= 0 && out.length < 8; i--) if (ev[i].actor?.id === agent.id) out.push(ev[i]);
    return out;
  }, [g, agent, now]);
  const names = useMemo(() => makeNames(g.catalog), [g.catalog]);
  const natures = rt?.nature ?? (g.hasDemo ? 'demo' : 'real');
  return (
    <div className="sw-panel">
      <div className="sw-panel__title">
        <span className="sw-avatar sw-avatar--lg" style={{ ['--hue' as string]: hueCss(agent.avatar.hue) }} aria-hidden>{agent.name[0]}</span>
        <div>
          <h2 className="t-h3">{agent.name}</h2>
          <p className="t-micro t-muted">{agent.role}</p>
        </div>
      </div>
      <div className="sw-chips">
        <span className="pill">{KIND_LABEL[agent.kind]}</span>
        {agent.kind === 'llm' && <span className="pill pill--accent">{modelLabel(rt?.model ?? agent.model)}</span>}
        <StatusPill status={rt?.status ?? 'idle'} />
      </div>
      <dl className="kv sw-kv">
        <dt>Tâche en cours</dt>
        <dd>{task ? task.title : 'Aucune'}</dd>
        {task && (
          <>
            <dt>Projet</dt>
            <dd>{task.project ?? '—'}</dd>
          </>
        )}
        <dt>Contexte</dt>
        <dd>
          {agent.kind !== 'llm' ? (
            <span className="t-muted">Sans objet : {KIND_LABEL[agent.kind].toLowerCase()}, aucun appel de modèle</span>
          ) : ctx?.tokens != null ? (
            <span className="sw-ctx-block">
              <Meter value={ctx.tokens} max={CONTEXT_WINDOW} label="Fenêtre de contexte utilisée" tone="var(--st-working)" />
              <span>
                {fmtTokens(ctx.tokens)} / 1 M · dernier appel {ctx.ts ? fmtRelative(ctx.ts, now) : ''} <NatureBadge nature={ctx.nature} />
              </span>
              <small className="t-muted">Fenêtre de 1 M tokens : hypothèse du catalogue pour la famille 5.5.</small>
            </span>
          ) : (
            <span>
              Indisponible <NatureBadge nature="unavailable" /> <small className="t-muted">aucun appel de modèle enregistré</small>
            </span>
          )}
        </dd>
        <dt>Consommation</dt>
        <dd>
          {rt ? (
            <>
              {fmtCompact(rt.tokensIn + rt.cacheRead)} entrée · {fmtCompact(rt.tokensOut)} sortie · {fmtUsd(rt.costUsd)} <NatureBadge nature={natures === 'demo' ? 'demo' : 'estimated'} />
            </>
          ) : (
            'Aucune'
          )}
        </dd>
        <dt>Tâches</dt>
        <dd>
          {rt ? `${rt.tasksDone} terminée(s) · ${rt.errors} erreur(s)` : '—'}
        </dd>
      </dl>
      <div className="sw-actions">
        <button type="button" className="btn btn--sm" onClick={onFocus}>
          Centrer la vue
        </button>
        {task && task.status === 'running' && (
          <button type="button" className="btn btn--sm" disabled={mode === 'replay'} onClick={() => host.request({ type: 'task.pause', taskId: task.id }, 'click')}>
            Suspendre la tâche
          </button>
        )}
        {task && task.status === 'paused' && (
          <button type="button" className="btn btn--sm" disabled={mode === 'replay'} onClick={() => host.request({ type: 'task.resume', taskId: task.id }, 'click')}>
            Reprendre
          </button>
        )}
      </div>
      <h3 className="section-title">Activité récente</h3>
      {recent.length ? (
        <ol className="sw-activity">
          {recent.map((e) => (
            <li key={e.id} data-failed={e.status === 'failed' || undefined}>
              <span className="t-muted num">{fmtRelative(e.ts, now)}</span>
              <span>
                {e.type === 'llm.call'
                  ? `Appel ${modelLabel(e.model)} · ${fmtTokens((e.metrics?.inputTokens ?? 0) + (e.metrics?.cacheReadTokens ?? 0) + (e.metrics?.outputTokens ?? 0))} tokens`
                  : e.type === 'tool.call'
                    ? `${String(e.attrs?.tool ?? 'Outil')} → ${names.node(e.destination?.id)}`
                    : e.summary ?? e.type}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="t-muted t-small">Aucun événement sur 24 h.</p>
      )}
    </div>
  );
}

function DepartmentPanel({ id, host }: { id: string; host: ExperienceProps['host'] }) {
  const { state, catalog, now } = useGovernor();
  const d = catalog.departments.find((x) => x.id === id);
  if (!d) return <div className="sw-panel"><Notice>Département introuvable dans le catalogue actif.</Notice></div>;
  const engines = d.engineIds.map((e) => catalog.agents.find((a) => a.id === e)).filter((a): a is AgentDef => !!a);
  const tasks = Object.values(state.tasks).filter((t) => t.departmentId === id && (t.status === 'running' || t.status === 'paused' || t.status === 'pending'));
  const pending = Object.values(state.decisions).filter((x) => x.status === 'pending' && x.departmentId === id);
  const doneDay = Object.values(state.tasks).filter((t) => t.departmentId === id && t.status === 'succeeded' && (t.endedAt ?? 0) >= now - 86_400_000).length;
  return (
    <div className="sw-panel">
      <div className="sw-panel__title">
        <span className="sw-tone" style={{ background: `var(--${d.tone})` }} aria-hidden />
        <div>
          <h2 className="t-h3">{d.name}</h2>
          <p className="t-micro t-muted">{d.mission}</p>
        </div>
      </div>
      <h3 className="section-title">Moteurs</h3>
      <ul className="sw-list">
        {engines.map((a) => (
          <li key={a.id}>
            <button type="button" className="sw-row" onClick={() => host.select({ kind: 'agent', id: a.id })}>
              <span className="sw-avatar" style={{ ['--hue' as string]: hueCss(a.avatar.hue) }} aria-hidden>{a.name[0]}</span>
              <span className="sw-row__main">
                <b>{a.name}</b>
                <small className="t-muted">{KIND_LABEL[a.kind]}</small>
              </span>
              {a.kind !== 'human' && <StatusPill status={statusOf(state, a.id)} compact />}
            </button>
          </li>
        ))}
      </ul>
      <h3 className="section-title">Tâches ouvertes · {tasks.length}</h3>
      {tasks.length ? (
        <ul className="sw-list">
          {tasks.slice(0, 6).map((t) => (
            <li key={t.id} className="sw-task">
              <span className={`pill ${t.status === 'running' ? 'pill--accent' : ''}`}>{t.status === 'running' ? 'En cours' : t.status === 'paused' ? 'En pause' : 'En file'}</span>
              <span>{t.title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-muted t-small">Aucune tâche ouverte.</p>
      )}
      <dl className="kv sw-kv">
        <dt>Terminées · 24 h</dt>
        <dd className="num">{doneDay}</dd>
        <dt>Décisions en attente</dt>
        <dd className="num">{pending.length}</dd>
      </dl>
    </div>
  );
}

function NodePanel({ id, flowWindowMin }: { id: string; flowWindowMin: number }) {
  const g = useGovernor();
  const n = g.catalog.nodes.find((x) => x.id === id);
  const calls = useMemo(() => g.windowEvents(g.now - flowWindowMin * 60_000, g.now).filter((e) => e.destination?.id === id || e.origin.id === id).length, [g, id, flowWindowMin]);
  if (!n) return <div className="sw-panel"><Notice>Nœud introuvable dans le catalogue actif.</Notice></div>;
  const conn = g.state.connectors[id];
  return (
    <div className="sw-panel">
      <h2 className="t-h3">{n.label}</h2>
      <p className="t-micro t-muted">{n.note ?? `Nœud ${n.kind}`}</p>
      <dl className="kv sw-kv">
        <dt>Type</dt>
        <dd>{n.kind}</dd>
        <dt>Observabilité</dt>
        <dd>{n.visibility === 'full' ? 'Complète' : n.visibility === 'partial' ? 'Partielle' : 'Aucune (non observable)'}</dd>
        {conn && (
          <>
            <dt>État</dt>
            <dd>{conn.status === 'connected' ? 'Connecté' : conn.status === 'degraded' ? 'Dégradé' : conn.status === 'auth-required' ? 'Authentification requise' : 'Déconnecté'} depuis {fmtRelative(conn.since, g.now)}</dd>
          </>
        )}
        <dt>Échanges · {flowWindowMin} min</dt>
        <dd>
          {n.visibility === 'none' ? 'Indisponible' : calls} <NatureBadge nature={n.visibility === 'none' ? 'unavailable' : g.hasDemo ? 'demo' : 'real'} />
        </dd>
      </dl>
    </div>
  );
}

function ReviewPanel({ host }: { host: ExperienceProps['host'] }) {
  const { state, catalog, now, mode } = useGovernor();
  const pending = Object.values(state.decisions)
    .filter((d) => d.status === 'pending')
    .sort((a, b) => b.proposedAt - a.proposedAt);
  const resolved = Object.values(state.decisions)
    .filter((d) => d.status !== 'pending' && (d.resolvedAt ?? 0) >= now - 7 * 86_400_000)
    .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0))
    .slice(0, 3);
  const [busy, setBusy] = useState<string | null>(null);
  const act = async (d: Decision, verdict: Verdict) => {
    setBusy(d.id);
    try {
      await host.request({ type: 'decision.resolve', decisionId: d.id, verdict, durable: d.durable, costDeltaUsd: d.costDeltaUsd }, 'click');
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="sw-panel">
      <div className="sw-review__head">
        <h2 className="t-h3">Revue</h2>
        <span className="badge-count" aria-label={`${pending.length} proposition(s) en attente`}>{pending.length}</span>
      </div>
      <p className="t-micro t-muted">Propositions en attente d’arbitrage. Rien n’est appliqué sans votre GO, NO GO ou TEST.</p>
      {mode === 'replay' && <Notice tone="warn">Mode Replay : lecture seule. Revenez en direct pour arbitrer.</Notice>}
      {pending.length === 0 && <div className="empty">Aucune proposition en attente.</div>}
      {pending.map((d) => {
        const dept = catalog.departments.find((x) => x.id === d.departmentId);
        const by = catalog.agents.find((a) => a.id === d.proposedBy);
        return (
          <article key={d.id} className="sw-pr" aria-labelledby={`pr-${d.id}`}>
            <header className="sw-pr__head">
              <span className="sw-pr__state">Ouverte</span>
              <span className="mono t-muted">#{d.id}</span>
            </header>
            <h3 id={`pr-${d.id}`} className="sw-pr__title">{d.title}</h3>
            <p className="sw-pr__meta">
              <span className="mono">{dept ? slug(dept.name) : 'general'}</span> → <span className="mono">main</span> · proposé par {by?.name ?? 'inconnu'} · {fmtRelative(d.proposedAt, now)}
            </p>
            <div className="sw-chips">
              <span className={`pill pill--risk-${d.risk}`}>{RISK_LABEL[d.risk]}</span>
              <span className="pill">{REV_LABEL[d.reversibility]}</span>
              {d.durable && <span className="pill pill--risk-high">Durable</span>}
            </div>
            <dl className="sw-pr__body">
              <dt>Justification</dt>
              <dd>{d.rationale || '—'}</dd>
              <dt>Impact</dt>
              <dd>{d.impact || '—'}</dd>
              <dt>Coût</dt>
              <dd>
                {d.costDeltaUsd != null ? (
                  <>
                    <span className={d.costDeltaUsd > 0 ? 'sw-diff sw-diff--add' : 'sw-diff sw-diff--del'}>{d.costDeltaUsd > 0 ? '+' : ''}{fmtUsd(d.costDeltaUsd)}</span> <NatureBadge nature={d.nature === 'demo' ? 'demo' : 'estimated'} label={d.nature === 'demo' ? 'Démo' : 'Estimé'} />
                  </>
                ) : (
                  <span className="t-muted">Aucun surcoût déclaré</span>
                )}
              </dd>
            </dl>
            <div className="verdict" role="group" aria-label={`Arbitrer : ${d.title}`}>
              <button type="button" className="btn go" disabled={mode === 'replay' || busy === d.id} onClick={() => act(d, 'go')}>GO</button>
              <button type="button" className="btn nogo" disabled={mode === 'replay' || busy === d.id} onClick={() => act(d, 'nogo')}>NO GO</button>
              <button type="button" className="btn test" disabled={mode === 'replay' || busy === d.id} onClick={() => act(d, 'test')}>TEST</button>
            </div>
          </article>
        );
      })}
      {resolved.length > 0 && (
        <>
          <h3 className="section-title">Arbitrées récemment</h3>
          <ul className="sw-list">
            {resolved.map((d) => (
              <li key={d.id} className="sw-task">
                <span className={`pill ${d.status === 'go' ? 'pill--up' : d.status === 'nogo' ? 'pill--down' : 'pill--risk-medium'}`}>{d.status === 'go' ? 'GO' : d.status === 'nogo' ? 'NO GO' : 'TEST'}</span>
                <span>{d.title}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="btn btn--sm sw-more" onClick={() => host.openDecisions()}>
        Ouvrir le centre des décisions
      </button>
    </div>
  );
}
