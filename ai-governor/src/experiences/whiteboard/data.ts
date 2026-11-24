/**
 * Data behind the generated frames. Pure functions over SDK selectors and the
 * projected state: nothing is invented, and every block carries its nature.
 */
import { byModel, fmtCompact, fmtInt, fmtPct, fmtUsd, modelLabel, type Catalog, type DataNature, type Decision, type FeedItem, type GovEvent, type GovernorState } from '@sdk';
import type { Board } from './model';

export function natureOfEvents(events: readonly GovEvent[], hasDemo: boolean): DataNature {
  let demo = 0;
  let real = 0;
  for (const e of events) {
    if (e.nature === 'demo') demo++;
    else if (e.nature === 'real') real++;
  }
  if (!events.length) return hasDemo ? 'demo' : 'real';
  if (demo && !real) return 'demo';
  return 'real';
}

export interface CycleCounts {
  created: number;
  pending: number;
  running: number;
  paused: number;
  validating: number;
  checks: number;
  qualityAvg: number | null;
  done: number;
  failed: number;
  successRate: number | null;
  nature: DataNature;
}

/** Task life cycle over the period (events) plus what is in flight now (state). */
export function cycleCounts(events: readonly GovEvent[], state: GovernorState, hasDemo: boolean): CycleCounts {
  let created = 0, checks = 0, qSum = 0, qN = 0, done = 0, failed = 0;
  for (const e of events) {
    if (e.type === 'task.created') created++;
    else if (e.type === 'task.completed') done++;
    else if (e.type === 'task.failed') failed++;
    else if (e.type === 'quality.check') {
      checks++;
      if (e.metrics?.qualityScore != null) {
        qSum += e.metrics.qualityScore;
        qN++;
      }
    }
  }
  let pending = 0, running = 0, paused = 0;
  for (const t of Object.values(state.tasks)) {
    if (t.status === 'pending') pending++;
    else if (t.status === 'running') running++;
    else if (t.status === 'paused') paused++;
  }
  const validating = Object.values(state.agents).filter((a) => a.status === 'validating').length;
  return {
    created, pending, running, paused, validating, checks, qualityAvg: qN ? qSum / qN : null, done, failed,
    successRate: done + failed > 0 ? done / (done + failed) : null,
    nature: natureOfEvents(events, hasDemo),
  };
}

export interface RouteRow {
  model: string;
  label: string;
  calls: number;
  tokens: number;
  costUsd: number;
  share: number;
  agents: string[];
  departments: string[];
}

export interface Routing {
  rows: RouteRow[];
  totalCalls: number;
  /** Tasks finished by deterministic engines (scripts, services): no model involved. */
  deterministicTasks: number;
  deterministicAgents: string[];
  nature: DataNature;
}

export function routing(events: readonly GovEvent[], catalog: Catalog, hasDemo: boolean): Routing {
  const models = byModel(events);
  const total = models.reduce((s, m) => s + m.calls, 0);
  const who = new Map<string, { agents: Set<string>; depts: Set<string> }>();
  const kinds = new Map(catalog.agents.map((a) => [a.id, a.kind]));
  let det = 0;
  const detAgents = new Set<string>();
  for (const e of events) {
    if (e.type === 'llm.call' && e.model) {
      let w = who.get(e.model);
      if (!w) who.set(e.model, (w = { agents: new Set(), depts: new Set() }));
      if (e.actor) w.agents.add(e.actor.id);
      if (e.department) w.depts.add(e.department);
    } else if ((e.type === 'task.completed' || e.type === 'task.failed') && e.actor) {
      const k = kinds.get(e.actor.id);
      if (k === 'script' || k === 'service') {
        det++;
        detAgents.add(e.actor.id);
      }
    }
  }
  return {
    rows: models.map((m) => ({
      model: m.model,
      label: modelLabel(m.model),
      calls: m.calls,
      tokens: m.tokensIn + m.tokensOut + m.cacheRead,
      costUsd: m.costUsd,
      share: total ? m.calls / total : 0,
      agents: [...(who.get(m.model)?.agents ?? [])],
      departments: [...(who.get(m.model)?.depts ?? [])],
    })),
    totalCalls: total,
    deterministicTasks: det,
    deterministicAgents: [...detAgents],
    nature: natureOfEvents(events, hasDemo),
  };
}

const RISK_ORDER: Record<Decision['risk'], number> = { high: 0, medium: 1, low: 2 };

export function pendingDecisions(state: GovernorState): Decision[] {
  return Object.values(state.decisions)
    .filter((d) => d.status === 'pending')
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || b.proposedAt - a.proposedAt);
}

export interface RecoItem extends FeedItem {
  feed: 'reco' | 'update';
}

export function recoItems(state: GovernorState, max = 8): RecoItem[] {
  return [
    ...state.feed.recommendations.map((f) => ({ ...f, feed: 'reco' as const })),
    ...state.feed.updates.map((f) => ({ ...f, feed: 'update' as const })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, max);
}

/** Departments that appear in the generated frames → the agents serving them. */
export function linkedAgentIds(catalog: Catalog, decisions: Decision[], recos: RecoItem[], route: Routing, showFrames: boolean): string[] {
  if (!showFrames) return [];
  const depts = new Set<string>();
  for (const d of decisions) if (d.departmentId) depts.add(d.departmentId);
  for (const r of recos) if (r.departmentId) depts.add(r.departmentId);
  for (const r of route.rows) for (const d of r.departments) depts.add(d);
  const direct = new Set<string>([...route.rows.flatMap((r) => r.agents), ...route.deterministicAgents]);
  return catalog.agents.filter((a) => a.kind !== 'human' && (direct.has(a.id) || a.departmentIds.some((d) => depts.has(d)))).map((a) => a.id);
}

export interface BoardSummary {
  lines: string[];
  nature: DataNature;
}

/** "Résumer le tableau": counts and lists computed locally, never generated text. */
export function summarize(args: {
  cycle: CycleCounts;
  route: Routing;
  decisions: Decision[];
  recos: RecoItem[];
  board: Board;
  periodLabel: string;
  deptName: (id?: string) => string;
}): BoardSummary {
  const { cycle, route, decisions, recos, board, periodLabel, deptName } = args;
  const lines: string[] = [];
  lines.push(`Période : ${periodLabel}.`);
  lines.push(
    `Cycle des tâches : ${fmtInt(cycle.created)} créées, ${fmtInt(cycle.running + cycle.paused)} en cours, ${fmtInt(cycle.checks)} contrôles qualité, ${fmtInt(cycle.done)} terminées, ${fmtInt(cycle.failed)} échouées` +
      (cycle.successRate != null ? ` (réussite ${fmtPct(cycle.successRate)}).` : '.'),
  );
  if (route.rows.length) {
    const top = route.rows.slice().sort((a, b) => b.calls - a.calls)[0];
    const cost = route.rows.reduce((s, r) => s + r.costUsd, 0);
    lines.push(`Routage : ${fmtInt(route.totalCalls)} appels modèle, dont ${fmtPct(top.share)} vers ${top.label} ; coût estimé ${fmtUsd(cost)} ; ${fmtInt(route.deterministicTasks)} tâches traitées sans modèle.`);
  } else lines.push(`Routage : aucun appel modèle sur la période ; ${fmtInt(route.deterministicTasks)} tâches traitées sans modèle.`);
  if (decisions.length) {
    const high = decisions.filter((d) => d.risk === 'high').length;
    lines.push(`Décisions en attente : ${decisions.length}${high ? `, dont ${high} à risque élevé` : ''}.`);
    for (const d of decisions.slice(0, 4)) lines.push(`• ${d.title} (${deptName(d.departmentId)})`);
  } else lines.push('Décisions en attente : aucune.');
  const recoN = recos.filter((r) => r.feed === 'reco').length;
  const updN = recos.length - recoN;
  lines.push(`Recommandations & mises à jour récentes : ${recoN} recommandation(s), ${updN} mise(s) à jour${recos[0] ? ` ; la dernière : « ${recos[0].summary} »` : ''}.`);
  const count = (k: string) => board.objects.filter((o) => o.kind === k).length;
  lines.push(`Sur le tableau : ${count('sticky')} post-it, ${count('rect')} rectangle(s), ${count('text')} texte(s), ${count('arrow')} flèche(s), ${count('pen')} tracé(s), ${count('comment')} commentaire(s).`);
  return { lines, nature: cycle.nature };
}

export const fmtTokens = (n: number) => `${fmtCompact(n)} tokens`;
