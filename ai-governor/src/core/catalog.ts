/**
 * System catalog — the static-ish topology of the governor: departments,
 * agents (LLM personas, deterministic scripts, services, humans) and the
 * technical nodes they talk to. Supplied by the active data source.
 *
 * A department is a *functional representation*. It points to an engine
 * (`engineId`), and several departments may share one engine: no department
 * implies a permanent LLM agent.
 */
import type { NodeKind } from './events/schema';

export type AgentKind = 'llm' | 'script' | 'service' | 'human';

export interface DepartmentDef {
  id: string;
  name: string;
  mission: string;
  /** Pastel slot in the active theme (p1…p8). */
  tone: PastelSlot;
  /** Group used to cluster departments when there are many. */
  group: string;
  /** Engine (agent or service id) doing the work for this department. */
  engineIds: string[];
  /** Equipment shown in spatial experiences. */
  equipment: EquipmentKind[];
}

export type PastelSlot = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6' | 'p7' | 'p8';

export type EquipmentKind =
  | 'desk' | 'meeting' | 'lab' | 'server' | 'database' | 'board' | 'shield' | 'archive' | 'router' | 'gauge' | 'antenna' | 'conveyor';

export interface AgentDef {
  id: string;
  name: string;
  role: string;
  kind: AgentKind;
  /** Home department (an agent can serve several). */
  departmentIds: string[];
  provider?: string;
  model?: string;
  avatar: AvatarDef;
}

export interface AvatarDef {
  /** Hue 0–360 for the body colour. */
  hue: number;
  /** Small glyph that hints the role. */
  accessory: 'none' | 'glasses' | 'headset' | 'cap' | 'badge' | 'visor' | 'scarf';
  shape: 'round' | 'tall' | 'square';
}

export interface SystemNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** Logical layer used by the System Map layout. */
  layer: 'people' | 'agents' | 'orchestration' | 'models' | 'providers' | 'tools' | 'data';
  provider?: string;
  /** Observability of this node from the governor. */
  visibility: 'full' | 'partial' | 'none';
  note?: string;
}

export interface SystemEdge {
  from: string;
  to: string;
  kind: 'calls' | 'reads' | 'writes' | 'depends' | 'routes';
}

export interface Catalog {
  departments: DepartmentDef[];
  agents: AgentDef[];
  nodes: SystemNode[];
  edges: SystemEdge[];
  projects: string[];
  providers: string[];
}

export const EMPTY_CATALOG: Catalog = { departments: [], agents: [], nodes: [], edges: [], projects: [], providers: [] };

/** Merge two catalogs (sources can be combined); later entries win on id clash. */
export function mergeCatalogs(a: Catalog, b: Catalog): Catalog {
  const byId = <T extends { id: string }>(x: T[], y: T[]) => {
    const m = new Map<string, T>();
    for (const i of x) m.set(i.id, i);
    for (const i of y) m.set(i.id, i);
    return [...m.values()];
  };
  const edgeKey = (e: SystemEdge) => `${e.from}>${e.to}>${e.kind}`;
  const edges = new Map<string, SystemEdge>();
  for (const e of [...a.edges, ...b.edges]) edges.set(edgeKey(e), e);
  return {
    departments: byId(a.departments, b.departments),
    agents: byId(a.agents, b.agents),
    nodes: byId(a.nodes, b.nodes),
    edges: [...edges.values()],
    projects: [...new Set([...a.projects, ...b.projects])],
    providers: [...new Set([...a.providers, ...b.providers])],
  };
}
