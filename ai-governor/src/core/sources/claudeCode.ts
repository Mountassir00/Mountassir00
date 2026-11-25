/**
 * Claude Code transcript importer — first REAL data connection.
 *
 * Parses the JSONL session files Claude Code writes under
 * ~/.claude/projects/<project>/<session>.jsonl, entirely in the browser.
 * Privacy by construction: only metadata is kept (timestamps, model, token
 * usage, tool names, session/project identifiers). Prompts, answers, tool
 * inputs and tool outputs are never read into events.
 *
 * Measured: tokens per API response (deduplicated by message id), models,
 * tool calls, tool errors, sub-agent activity, turn durations.
 * Estimated: costs (tokens × list price) and cache savings.
 */
import type { AgentDef, Catalog, DepartmentDef, PastelSlot, SystemEdge, SystemNode } from '../catalog';
import { EVENT_SCHEMA_VERSION, type GovEvent, type NodeRef } from '../events/schema';
import { estimateCost } from '../pricing';
import type { DataSource } from './types';

interface RawLine {
  type?: string;
  uuid?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  gitBranch?: string;
  isSidechain?: boolean;
  isMeta?: boolean;
  agentId?: string;
  requestId?: string;
  message?: {
    id?: string;
    model?: string;
    role?: string;
    content?: unknown;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number };
    };
  };
}

interface Block {
  type?: string;
  name?: string;
  id?: string;
  tool_use_id?: string;
  is_error?: boolean;
  input?: Record<string, unknown>;
}

const TONES: PastelSlot[] = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];

const SAFE_ID = /[^A-Za-z0-9_.:-]/g;
const safe = (s: string, max = 80) => s.replace(SAFE_ID, '_').slice(0, max);

function projectName(cwd: string | undefined): string {
  if (!cwd) return 'Projet inconnu';
  const parts = cwd.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? 'Projet';
}

/** Classify a tool name into a system node, without reading its input. */
function toolNode(name: string): { ref: NodeRef; label: string } {
  if (name.startsWith('mcp__')) {
    const server = name.split('__')[1] ?? 'mcp';
    return { ref: { kind: 'mcp', id: `mcp-${safe(server)}` }, label: `${server} (MCP)` };
  }
  if (name === 'WebSearch' || name === 'WebFetch') return { ref: { kind: 'connector', id: 'web' }, label: 'Web' };
  if (name === 'Skill') return { ref: { kind: 'skill', id: 'skills' }, label: 'Skills' };
  return { ref: { kind: 'tool', id: `tool-${safe(name)}` }, label: name };
}

export interface ParseStats {
  files: number;
  lines: number;
  badLines: number;
  responses: number;
  duplicatesSkipped: number;
  sessions: number;
  from?: number;
  to?: number;
}

export interface ParsedImport {
  events: GovEvent[];
  catalog: Catalog;
  stats: ParseStats;
}

export function parseClaudeCodeTranscripts(files: Array<{ name: string; text: string }>, sourceId = 'claude-code'): ParsedImport {
  const events: GovEvent[] = [];
  const stats: ParseStats = { files: files.length, lines: 0, badLines: 0, responses: 0, duplicatesSkipped: 0, sessions: 0 };
  const seenMessages = new Set<string>();
  const departments = new Map<string, DepartmentDef>();
  const agents = new Map<string, AgentDef>();
  const nodes = new Map<string, SystemNode>();
  const edges = new Map<string, SystemEdge>();
  const models = new Set<string>();
  const sessions = new Set<string>();
  let seq = 0;

  const addEdge = (from: string, to: string, kind: SystemEdge['kind']) => edges.set(`${from}>${to}>${kind}`, { from, to, kind });
  const mk = (p: Omit<GovEvent, 'v' | 'id' | 'nature' | 'sourceId' | 'confidentiality'>, idHint?: string): GovEvent => {
    const e: GovEvent = {
      v: EVENT_SCHEMA_VERSION,
      id: `${sourceId}:${idHint ? safe(idHint, 120) : `n${seq}`}:${seq++}`,
      nature: 'real',
      sourceId,
      confidentiality: 'internal',
      ...p,
    };
    events.push(e);
    return e;
  };

  for (const file of files) {
    const lines = file.text.split('\n');
    // Per-file turn tracking.
    let turn: { id: string; start: number; last: number; agentId: string; dept: string; project: string; calls: number; tools: number; n: number } | null = null;
    let turnN = 0;
    const toolNames = new Map<string, string>();

    const closeTurn = () => {
      if (!turn) return;
      mk({ ts: turn.last, type: 'task.completed', origin: { kind: 'agent', id: turn.agentId }, actor: { kind: 'agent', id: turn.agentId },
        taskId: turn.id, department: turn.dept, project: turn.project, status: 'succeeded', durationMs: turn.last - turn.start,
        summary: `Tour ${turn.n} · ${turn.calls} réponse(s) modèle · ${turn.tools} outil(s)` }, `${turn.id}:end`);
      mk({ ts: turn.last + 1, type: 'agent.state', origin: { kind: 'agent', id: turn.agentId }, actor: { kind: 'agent', id: turn.agentId },
        department: turn.dept, project: turn.project, status: 'info', summary: 'En attente de la prochaine demande', attrs: { status: 'waiting', taskId: '' } }, `${turn.id}:wait`);
      turn = null;
    };

    for (const raw of lines) {
      if (!raw.trim()) continue;
      stats.lines++;
      let o: RawLine;
      try {
        o = JSON.parse(raw);
      } catch {
        stats.badLines++;
        continue;
      }
      if (o.type !== 'user' && o.type !== 'assistant') continue;
      const ts = o.timestamp ? Date.parse(o.timestamp) : NaN;
      if (!Number.isFinite(ts)) continue;
      stats.from = Math.min(stats.from ?? ts, ts);
      stats.to = Math.max(stats.to ?? ts, ts);

      const session = safe(o.sessionId ?? file.name.replace(/\.jsonl$/, ''));
      sessions.add(session);
      const project = projectName(o.cwd);
      const deptId = `proj-${safe(project.toLowerCase(), 40)}`;
      if (!departments.has(deptId)) {
        departments.set(deptId, {
          id: deptId, name: project, mission: 'Projet suivi via Claude Code', tone: TONES[departments.size % TONES.length],
          group: 'Projets Claude Code', engineIds: [], equipment: ['desk', 'server'],
        });
      }
      const sub = o.isSidechain === true;
      const agentId = sub ? `cc-${session.slice(0, 8)}-sub-${safe(o.agentId ?? 'agent', 24)}` : `cc-${session.slice(0, 8)}`;
      if (!agents.has(agentId)) {
        const n = agents.size;
        agents.set(agentId, {
          id: agentId,
          name: sub ? `Sous-agent ${session.slice(0, 4)}` : `Session ${session.slice(0, 6)}`,
          role: sub ? 'Sous-agent Claude Code' : 'Session Claude Code',
          kind: 'llm',
          departmentIds: [deptId],
          provider: 'anthropic',
          avatar: { hue: (n * 47) % 360, accessory: sub ? 'headset' : 'visor', shape: sub ? 'round' : 'tall' },
        });
        departments.get(deptId)!.engineIds.push(agentId);
        nodes.set(agentId, { id: agentId, kind: 'agent', label: agents.get(agentId)!.name, layer: 'agents', visibility: 'full' });
      }
      const actor: NodeRef = { kind: 'agent', id: agentId };
      const content = Array.isArray(o.message?.content) ? (o.message!.content as Block[]) : [];

      if (o.type === 'user') {
        const results = content.filter((b) => b?.type === 'tool_result');
        for (const b of results) {
          if (b.is_error) {
            const tool = (b.tool_use_id && toolNames.get(b.tool_use_id)) || 'outil';
            const node = toolNode(tool);
            mk({ ts, type: 'tool.call', origin: actor, actor, destination: node.ref, department: deptId, project, taskId: turn?.id, status: 'failed',
              summary: `${tool} : résultat en erreur`, attrs: { tool } }, `${o.uuid}:err`);
          }
        }
        const isPrompt = !sub && !o.isMeta && results.length === 0 && (typeof o.message?.content === 'string' || content.some((b) => b?.type === 'text'));
        if (isPrompt) {
          closeTurn();
          turnN++;
          const id = `${agentId}:turn-${turnN}`;
          turn = { id, start: ts, last: ts, agentId, dept: deptId, project, calls: 0, tools: 0, n: turnN };
          mk({ ts, type: 'task.created', origin: { kind: 'user', id: 'you' }, actor, taskId: id, department: deptId, project, status: 'pending',
            summary: `Tour ${turnN}`, attrs: { title: `${project} · tour ${turnN}` } }, `${id}:c`);
          mk({ ts, type: 'task.started', origin: actor, actor, taskId: id, department: deptId, project, status: 'started', summary: `Tour ${turnN}` }, `${id}:s`);
        }
        continue;
      }

      // assistant
      const msgId = o.message?.id ?? o.requestId ?? o.uuid ?? `${session}-${ts}`;
      const model = o.message?.model && o.message.model !== '<synthetic>' ? o.message.model : undefined;
      if (turn) turn.last = Math.max(turn.last, ts);
      if (model) {
        models.add(model);
        addEdge(agentId, model, 'calls');
      }
      if (!seenMessages.has(msgId) && o.message?.usage && model) {
        seenMessages.add(msgId);
        stats.responses++;
        const u = o.message.usage;
        const w1h = u.cache_creation?.ephemeral_1h_input_tokens ?? 0;
        const w5m = u.cache_creation?.ephemeral_5m_input_tokens ?? Math.max(0, (u.cache_creation_input_tokens ?? 0) - w1h);
        const cost = estimateCost(model, {
          inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: u.cache_read_input_tokens,
          cacheWrite5mTokens: w5m, cacheWrite1hTokens: w1h,
        });
        if (turn) turn.calls++;
        mk({ ts, type: 'llm.call', origin: actor, actor, destination: { kind: 'model', id: model }, department: deptId, project, taskId: turn?.id,
          status: 'succeeded', provider: 'anthropic', model, summary: 'Réponse du modèle',
          metrics: {
            inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0, cacheReadTokens: u.cache_read_input_tokens ?? 0,
            cacheWriteTokens: (u.cache_creation_input_tokens ?? 0), costNature: 'estimated',
            ...(cost.known ? { costUsd: cost.costUsd, avoidedCostUsd: cost.avoidedByCacheUsd } : {}),
          },
          attrs: { priced: cost.known } }, msgId);
      } else if (seenMessages.has(msgId)) {
        stats.duplicatesSkipped++;
      }
      for (const b of content) {
        if (b?.type !== 'tool_use' || !b.name) continue;
        const name = safe(b.name, 80);
        if (b.id) toolNames.set(b.id, name);
        const node = toolNode(name);
        nodes.set(node.ref.id, { id: node.ref.id, kind: node.ref.kind, label: node.label, layer: 'tools', visibility: 'partial' });
        addEdge(agentId, node.ref.id, 'calls');
        // Only identifiers are read from inputs, never free text.
        const skill = name === 'Skill' && typeof b.input?.skill === 'string' ? safe(b.input.skill as string, 60) : null;
        const subagent = (name === 'Agent' || name === 'Task') && typeof b.input?.subagent_type === 'string' ? safe(b.input.subagent_type as string, 40) : null;
        if (turn) turn.tools++;
        mk({ ts, type: 'tool.call', origin: actor, actor, destination: node.ref, department: deptId, project, taskId: turn?.id, status: 'succeeded',
          summary: skill ? `Skill ${skill}` : subagent ? `Délègue à ${subagent}` : name, attrs: { tool: name, skill, subagent } }, b.id ?? undefined);
        const state = subagent ? 'collaborating' : name === 'WebSearch' || name === 'WebFetch' ? 'researching' : null;
        if (state) mk({ ts, type: 'agent.state', origin: actor, actor, department: deptId, project, status: 'info', summary: state === 'collaborating' ? 'Délègue à un sous-agent' : 'Recherche sur le web',
          attrs: { status: state, taskId: turn?.id ?? '' } });
        else if (turn) mk({ ts, type: 'agent.state', origin: actor, actor, department: deptId, project, status: 'info', summary: 'Travaille', attrs: { status: 'working', taskId: turn.id } });
      }
    }
    closeTurn();
  }

  stats.sessions = sessions.size;
  for (const m of models) nodes.set(m, { id: m, kind: 'model', label: m.replace(/^claude-/, '').replace(/-/g, ' '), layer: 'models', provider: 'anthropic', visibility: 'full' });
  nodes.set('anthropic', { id: 'anthropic', kind: 'provider', label: 'Anthropic API', layer: 'providers', provider: 'anthropic', visibility: 'full' });
  for (const m of models) addEdge(m, 'anthropic', 'depends');
  nodes.set('you', { id: 'you', kind: 'user', label: 'Vous', layer: 'people', visibility: 'full' });
  for (const a of agents.values()) if (!a.id.includes('-sub-')) addEdge('you', a.id, 'calls');
  events.sort((a, b) => a.ts - b.ts);
  return {
    events,
    stats,
    catalog: {
      departments: [...departments.values()],
      agents: [{ id: 'you', name: 'Vous', role: 'Utilisateur', kind: 'human', departmentIds: [...departments.keys()].slice(0, 1), avatar: { hue: 222, accessory: 'badge', shape: 'tall' } }, ...agents.values()],
      nodes: [...nodes.values()],
      edges: [...edges.values()],
      projects: [...new Set([...departments.values()].map((d) => d.name))],
      providers: ['anthropic'],
    },
  };
}

export class ClaudeCodeImportSource implements DataSource {
  readonly kind = 'claude-code-import' as const;
  readonly defaultNature = 'real' as const;
  readonly capabilities = { live: false, commands: false, history: true };
  readonly visibility = {
    observable: [
      'Tokens par réponse (entrée, sortie, lecture et écriture cache) — mesurés',
      'Modèles utilisés, outils appelés, erreurs d’outils, sous-agents',
      'Durée des tours de conversation',
    ],
    notObservable: [
      'Dépense facturée (le coût affiché est estimé au prix catalogue)',
      'Contenu des messages (volontairement ignoré)',
      'Activité hors Claude Code (claude.ai, autres fournisseurs)',
    ],
  };
  readonly id: string;
  readonly label: string;
  private parsed: ParsedImport;

  constructor(parsed: ParsedImport, id = 'claude-code') {
    this.parsed = parsed;
    this.id = id;
    this.label = `Import Claude Code (${parsed.stats.sessions} session${parsed.stats.sessions > 1 ? 's' : ''})`;
  }

  catalog() {
    return this.parsed.catalog;
  }

  async load(): Promise<GovEvent[]> {
    return this.parsed.events;
  }
}
