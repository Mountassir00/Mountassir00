/**
 * Data of the team loop: department groups (catalog `group`), their engines,
 * the real exchanges of the last minutes and each group's production over the
 * active period. Pure derivations — nothing is invented.
 */
import type { AgentDef, Catalog, DataNature, DepartmentDef, GovEvent } from '@sdk';

export interface LoopGroup {
  id: string;
  name: string;
  departments: Array<{ dept: DepartmentDef; engines: AgentDef[] }>;
  engines: AgentDef[];
  deptIds: Set<string>;
}

export function buildGroups(catalog: Catalog): LoopGroup[] {
  const agents = new Map(catalog.agents.map((a) => [a.id, a]));
  const byGroup = new Map<string, LoopGroup>();
  for (const d of catalog.departments) {
    const gid = d.group || 'Autres';
    let g = byGroup.get(gid);
    if (!g) byGroup.set(gid, (g = { id: gid, name: gid, departments: [], engines: [], deptIds: new Set() }));
    const engines = d.engineIds.map((id) => agents.get(id)).filter((a): a is AgentDef => !!a && a.kind !== 'human');
    g.departments.push({ dept: d, engines });
    g.deptIds.add(d.id);
    for (const e of engines) if (!g.engines.includes(e)) g.engines.push(e);
  }
  return [...byGroup.values()];
}

/** Splits groups into two balanced columns (by number of rows), keeping catalog order. */
export function splitColumns(groups: LoopGroup[]): [LoopGroup[], LoopGroup[]] {
  const left: LoopGroup[] = [];
  const right: LoopGroup[] = [];
  let hl = 0;
  let hr = 0;
  for (const g of groups) {
    const h = g.departments.length + 2.2;
    if (hl <= hr) {
      left.push(g);
      hl += h;
    } else {
      right.push(g);
      hr += h;
    }
  }
  return [left, right];
}

const isExchange = (e: GovEvent) => !!e.destination && (e.type === 'flow' || e.type === 'llm.call' || e.type === 'tool.call');

/** Group of an event: its department, else the home department of its actor. */
export function groupIndex(catalog: Catalog, groups: LoopGroup[]) {
  const deptToGroup = new Map<string, string>();
  for (const g of groups) for (const d of g.deptIds) deptToGroup.set(d, g.id);
  const agentToGroup = new Map<string, string>();
  for (const a of catalog.agents) {
    const d = a.departmentIds[0];
    if (d && deptToGroup.has(d)) agentToGroup.set(a.id, deptToGroup.get(d)!);
  }
  return (e: GovEvent): string | undefined => (e.department && deptToGroup.get(e.department)) || (e.actor ? agentToGroup.get(e.actor.id) : undefined);
}

export interface Activity {
  total: number;
  perGroup: Map<string, number>;
  nature: DataNature;
}

export function activity(events: readonly GovEvent[], groupOf: (e: GovEvent) => string | undefined): Activity {
  const perGroup = new Map<string, number>();
  let total = 0;
  let demo = false;
  for (const e of events) {
    if (!isExchange(e)) continue;
    total++;
    if (e.nature === 'demo') demo = true;
    const g = groupOf(e);
    if (g) perGroup.set(g, (perGroup.get(g) ?? 0) + 1);
  }
  return { total, perGroup, nature: demo ? 'demo' : 'real' };
}

export type OutputItem =
  | { kind: 'task'; id: string; ts: number; title: string; deptId?: string; agentId?: string; ok: boolean; costUsd: number; nature: DataNature }
  | { kind: 'optimization'; id: string; ts: number; title: string; deptId?: string; tokensSaved: number; avoidedUsd: number; nature: DataNature }
  | { kind: 'decision'; id: string; ts: number; title: string; deptId?: string; nature: DataNature };

export interface Production {
  items: OutputItem[];
  tasksDone: number;
  tasksFailed: number;
  costUsd: number;
  tokens: number;
  cacheShare: number | null;
  tokensSaved: number;
  avoidedUsd: number;
  decisions: number;
  costNature: DataNature;
  nature: DataNature;
}

export function production(events: readonly GovEvent[], deptIds: Set<string>, groupOf: (e: GovEvent) => string | undefined, groupId: string, limit: number): Production {
  const taskCost = new Map<string, number>();
  const p: Production = { items: [], tasksDone: 0, tasksFailed: 0, costUsd: 0, tokens: 0, cacheShare: null, tokensSaved: 0, avoidedUsd: 0, decisions: 0, costNature: 'estimated', nature: 'real' };
  let tin = 0;
  let cache = 0;
  let measured = false;
  let demo = false;
  const all: OutputItem[] = [];
  for (const e of events) {
    const inGroup = (e.department && deptIds.has(e.department)) || (!e.department && groupOf(e) === groupId);
    if (!inGroup) continue;
    if (e.nature === 'demo') demo = true;
    switch (e.type) {
      case 'llm.call': {
        const m = e.metrics;
        if (!m) break;
        p.costUsd += m.costUsd ?? 0;
        p.tokens += (m.inputTokens ?? 0) + (m.outputTokens ?? 0) + (m.cacheReadTokens ?? 0) + (m.cacheWriteTokens ?? 0);
        tin += m.inputTokens ?? 0;
        cache += m.cacheReadTokens ?? 0;
        if (m.costNature === 'measured') measured = true;
        if (e.taskId) taskCost.set(e.taskId, (taskCost.get(e.taskId) ?? 0) + (m.costUsd ?? 0));
        break;
      }
      case 'task.completed':
      case 'task.failed': {
        const ok = e.type === 'task.completed';
        if (ok) p.tasksDone++;
        else p.tasksFailed++;
        all.push({ kind: 'task', id: e.taskId ?? e.id, ts: e.ts, title: String(e.attrs?.title ?? e.summary ?? e.taskId ?? 'Tâche'), deptId: e.department, agentId: e.actor?.id, ok, costUsd: 0, nature: e.nature });
        break;
      }
      case 'optimization.applied':
        p.tokensSaved += e.metrics?.tokensSaved ?? 0;
        p.avoidedUsd += e.metrics?.avoidedCostUsd ?? 0;
        all.push({ kind: 'optimization', id: e.id, ts: e.ts, title: e.summary ?? 'Optimisation', deptId: e.department, tokensSaved: e.metrics?.tokensSaved ?? 0, avoidedUsd: e.metrics?.avoidedCostUsd ?? 0, nature: e.nature });
        break;
      case 'decision.proposed':
        p.decisions++;
        all.push({ kind: 'decision', id: String(e.attrs?.decisionId ?? e.id), ts: e.ts, title: String(e.attrs?.title ?? e.summary ?? 'Proposition'), deptId: e.department, nature: e.nature });
        break;
    }
  }
  for (const it of all) if (it.kind === 'task') it.costUsd = taskCost.get(it.id) ?? 0;
  // Most recent first, but keep failures and decisions visible among routine completions.
  p.items = all.sort((a, b) => b.ts - a.ts).slice(0, limit);
  p.cacheShare = tin + cache > 0 ? cache / (tin + cache) : null;
  p.costNature = demo ? 'demo' : measured ? 'real' : 'estimated';
  p.nature = demo ? 'demo' : 'real';
  return p;
}

/** Stadium (rounded loop) path, drawn clockwise from the top centre. */
export function stadium(x1: number, x2: number, y1: number, y2: number): string {
  const r = (x2 - x1) / 2;
  const cx = x1 + r;
  if (y2 - y1 < 2 * r) {
    const ry = (y2 - y1) / 2;
    return `M${cx},${y1} A${r},${ry} 0 0 1 ${cx},${y2} A${r},${ry} 0 0 1 ${cx},${y1} Z`;
  }
  return `M${cx},${y1} A${r},${r} 0 0 1 ${x2},${y1 + r} L${x2},${y2 - r} A${r},${r} 0 0 1 ${cx},${y2} A${r},${r} 0 0 1 ${x1},${y2 - r} L${x1},${y1 + r} A${r},${r} 0 0 1 ${cx},${y1} Z`;
}

/** Horizontal stadium for the phone header strip, clockwise from the left centre. */
export function stadiumH(x1: number, x2: number, y1: number, y2: number): string {
  const r = (y2 - y1) / 2;
  const cy = y1 + r;
  return `M${x1},${cy} A${r},${r} 0 0 1 ${x1 + r},${y1} L${x2 - r},${y1} A${r},${r} 0 0 1 ${x2 - r},${y2} L${x1 + r},${y2} A${r},${r} 0 0 1 ${x1},${cy} Z`;
}
