/**
 * Common event schema — the single contract every experience reads from.
 *
 * Rules:
 *  - Events are immutable facts. Visual layers never create operational events;
 *    they can only *request* commands through the command gateway.
 *  - Every event carries its `nature` so the UI can never present demo or
 *    estimated data as a measured operation.
 *  - Message content, prompts and tool inputs are never stored: only metadata.
 */
import { z } from 'zod';

export const EVENT_SCHEMA_VERSION = 1 as const;

/** Where a piece of information comes from — shown on every metric. */
export const DATA_NATURES = ['real', 'planned', 'estimated', 'historical', 'demo', 'unavailable'] as const;
export type DataNature = (typeof DATA_NATURES)[number];

export const CONFIDENTIALITY = ['public', 'internal', 'confidential', 'restricted'] as const;
export type Confidentiality = (typeof CONFIDENTIALITY)[number];

export const EVENT_STATUSES = ['pending', 'started', 'running', 'succeeded', 'failed', 'cancelled', 'paused', 'info'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const NODE_KINDS = [
  'agent', 'service', 'model', 'provider', 'connector', 'mcp', 'skill', 'database', 'queue', 'process', 'user', 'department', 'tool',
] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export const EVENT_TYPES = [
  'task.created', 'task.started', 'task.completed', 'task.failed', 'task.paused', 'task.resumed', 'task.priority',
  'agent.state',
  'llm.call',
  'tool.call',
  'flow',
  'skill.installed', 'skill.updated', 'skill.disabled',
  'connector.status',
  'optimization.applied',
  'decision.proposed', 'decision.resolved',
  'security.incident',
  'update.detected',
  'recommendation',
  'config.changed',
  'automation.run',
  'quality.check',
  'quota.updated',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const AGENT_STATUSES = [
  'working', 'waiting', 'collaborating', 'researching', 'validating', 'error', 'paused', 'idle', 'offline',
] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

const scalar = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

export const nodeRefSchema = z.object({
  kind: z.enum(NODE_KINDS),
  id: z.string().min(1).max(200),
});
export type NodeRef = z.infer<typeof nodeRefSchema>;

export const metricsSchema = z
  .object({
    inputTokens: z.number().nonnegative(),
    outputTokens: z.number().nonnegative(),
    cacheReadTokens: z.number().nonnegative(),
    cacheWriteTokens: z.number().nonnegative(),
    /** Tokens not sent/billed at full price thanks to an optimisation, when measurable. */
    tokensSaved: z.number().nonnegative(),
    costUsd: z.number().nonnegative(),
    /** measured = from a billing source; estimated = tokens × list price. */
    costNature: z.enum(['measured', 'estimated']),
    avoidedCostUsd: z.number().nonnegative(),
    latencyMs: z.number().nonnegative(),
    qualityScore: z.number().min(0).max(1),
    quotaUsedPct: z.number().min(0).max(100),
  })
  .partial();
export type EventMetrics = z.infer<typeof metricsSchema>;

export const govEventSchema = z.object({
  v: z.literal(EVENT_SCHEMA_VERSION),
  id: z.string().min(1).max(200),
  ts: z.number().int().nonnegative(),
  type: z.enum(EVENT_TYPES),
  origin: nodeRefSchema,
  destination: nodeRefSchema.optional(),
  /** Agent or service concerned by the event. */
  actor: nodeRefSchema.optional(),
  project: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  taskId: z.string().max(200).optional(),
  status: z.enum(EVENT_STATUSES),
  durationMs: z.number().nonnegative().optional(),
  provider: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  effort: z.string().max(30).optional(),
  metrics: metricsSchema.optional(),
  /** Pointer to a result stored elsewhere (never the result itself). */
  resultRef: z.string().max(500).optional(),
  confidentiality: z.enum(CONFIDENTIALITY),
  nature: z.enum(DATA_NATURES),
  /** Short operational summary, already redacted. Never a model's private reasoning. */
  summary: z.string().max(280).optional(),
  attrs: z.record(z.string(), scalar).optional(),
  /** Which data source produced this event. */
  sourceId: z.string().min(1).max(100),
});
export type GovEvent = z.infer<typeof govEventSchema>;

export type ValidationResult =
  | { ok: true; event: GovEvent }
  | { ok: false; error: string };

export function validateEvent(input: unknown): ValidationResult {
  const r = govEventSchema.safeParse(input);
  if (r.success) return { ok: true, event: r.data };
  const first = r.error.issues[0];
  return { ok: false, error: `${first?.path.join('.') || '(racine)'}: ${first?.message ?? 'invalide'}` };
}

/** Human labels — the UI must always say where a number comes from. */
export const NATURE_LABEL: Record<DataNature, string> = {
  real: 'Mesuré',
  planned: 'Planifié',
  estimated: 'Estimé',
  historical: 'Historique',
  demo: 'Démo',
  unavailable: 'Indisponible',
};

export const STATUS_LABEL: Record<AgentStatus, string> = {
  working: 'Au travail',
  waiting: 'En attente',
  collaborating: 'En collaboration',
  researching: 'En recherche',
  validating: 'En validation',
  error: 'En erreur',
  paused: 'Suspendu',
  idle: 'Disponible',
  offline: 'Hors ligne',
};
