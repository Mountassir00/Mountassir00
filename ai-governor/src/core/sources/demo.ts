/**
 * Demo source — deterministic synthetic activity, ALWAYS tagged `nature: 'demo'`.
 *
 * It exists so the four experiences can be evaluated before real data is
 * connected. Nothing here is presented as a real operation: every event
 * carries `nature: 'demo'` and the shell shows a permanent demo banner.
 *
 * History (30 days) is generated up to "now"; the steps of tasks that are
 * still in flight are emitted in real time by the live loop, plus a light
 * stream of new tasks, so live animations reflect an actual (synthetic)
 * schedule rather than random motion.
 */
import type { AgentDef, DepartmentDef } from '../catalog';
import type { Command, OperationsPort } from '../commands';
import { EVENT_SCHEMA_VERSION, type AgentStatus, type GovEvent, type NodeRef } from '../events/schema';
import { estimateCost } from '../pricing';
import { AGENTS, DEMO_CATALOG, DEPARTMENTS } from './demoCatalog';
import type { DataSource } from './types';

const DAY = 86_400_000;
const MIN = 60_000;
const SEC = 1000;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;
const between = (r: Rng, a: number, b: number) => a + (b - a) * r();
const int = (r: Rng, a: number, b: number) => Math.floor(between(r, a, b + 1));
const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];

const TITLES: Record<string, string[]> = {
  executive: ['Arbitrage des priorités de la semaine', 'Synthèse des propositions en attente', 'Revue des dépenses avec la direction'],
  routing: ['Router une tâche de synthèse', 'Router une classification', 'Réévaluer le modèle pour l’extraction'],
  tokens: ['Compresser l’historique de session', 'Détecter les sorties superflues', 'Mesurer le taux de cache'],
  context: ['Résumer le contexte projet', 'Purger les résultats d’outils anciens', 'Préparer le contexte d’une session longue'],
  skills: ['Améliorer le skill de rédaction', 'Tester le skill PDF sur 12 cas', 'Corriger un cas limite du skill veille'],
  connectors: ['Vérifier l’état des MCP', 'Contrôler les droits du connecteur Drive', 'Tester la latence GitHub'],
  instructions: ['Auditer les consignes système', 'Détecter les contradictions de consignes', 'Vérifier la cohérence des préférences'],
  quality: ['Contrôle qualité d’un rapport', 'Vérifier les citations d’une synthèse', 'Relire une réponse client'],
  finance: ['Rapprocher les coûts de la journée', 'Projeter la dépense du mois', 'Calculer les économies de la semaine'],
  research: ['Veille : nouveaux modèles et tarifs', 'Lire les notes de version des outils', 'Comparer deux connecteurs MCP'],
  security: ['Scanner les journaux à la recherche de secrets', 'Revue des permissions des connecteurs', 'Contrôler les accès inhabituels'],
  automation: ['Rapport quotidien', 'Nettoyage des fichiers temporaires', 'Relance des tâches planifiées'],
  benchmark: ['Comparer Sonnet et Haiku sur l’extraction', 'Banc d’essai de latence', 'Évaluer un nouveau prompt'],
  evolution: ['Proposer une amélioration du routage', 'Bilan mensuel des optimisations', 'Identifier un skill à créer'],
  archive: ['Archiver les sessions de la veille', 'Indexer la documentation', 'Compacter le journal'],
};

const PER_DAY: Record<string, number> = {
  executive: 2, routing: 6, tokens: 4, context: 3, skills: 2, connectors: 3, instructions: 1, quality: 4,
  finance: 2, research: 2, security: 3, automation: 3, benchmark: 1, evolution: 1, archive: 2,
};

const PROJECTS = DEMO_CATALOG.projects;

/** Milestones that make before/after comparisons meaningful (demo). */
const MILESTONES = [
  { dayOffset: -20, id: 'opt-cache', title: 'Cache de prompt (1 h) activé pour le Gouverneur', dept: 'tokens' },
  { dayOffset: -12, id: 'opt-routing', title: 'Veille routée vers Haiku 5.5', dept: 'routing' },
  { dayOffset: -6, id: 'opt-compaction', title: 'Compaction du contexte pour l’Auditrice', dept: 'context' },
];

interface Ctx {
  rng: Rng;
  seq: { n: number };
  out: GovEvent[];
  start: number;
  busyUntil: Map<string, number>;
  meta: Map<string, { deptId: string; agentId: string; title: string }>;
}

function ev(ctx: Ctx, partial: Omit<GovEvent, 'v' | 'id' | 'nature' | 'sourceId' | 'confidentiality'> & Partial<Pick<GovEvent, 'confidentiality'>>): GovEvent {
  const e: GovEvent = {
    v: EVENT_SCHEMA_VERSION,
    id: `demo-${ctx.seq.n++}`,
    nature: 'demo',
    sourceId: 'demo',
    confidentiality: partial.confidentiality ?? 'internal',
    ...partial,
    ts: Math.round(partial.ts),
  };
  ctx.out.push(e);
  return e;
}

const agentRef = (id: string): NodeRef => ({ kind: AGENTS.find((a) => a.id === id)?.kind === 'llm' ? 'agent' : 'service', id });

function modelFor(agent: AgentDef, ts: number, start: number, r: Rng): string | undefined {
  const day = Math.floor((ts - start) / DAY) - 30;
  switch (agent.id) {
    case 'governor':
      return 'claude-opus-5-5';
    case 'auditor':
    case 'skillsmith':
      return 'claude-sonnet-5-5';
    case 'scout':
      return day >= MILESTONES[1].dayOffset ? 'claude-haiku-5-5' : 'claude-sonnet-5-5';
    case 'bench':
      return r() < 0.5 ? 'claude-haiku-5-5' : 'claude-sonnet-5-5';
    default:
      return undefined;
  }
}

const PROMPT: Record<string, [number, number, number, number]> = {
  // [promptMin, promptMax, outMin, outMax]
  governor: [25_000, 90_000, 800, 4000],
  auditor: [10_000, 40_000, 400, 2000],
  skillsmith: [8_000, 30_000, 1000, 5000],
  scout: [5_000, 20_000, 300, 1500],
  bench: [2_000, 8_000, 200, 800],
};

const TOOLS: Record<string, Array<[string, NodeRef]>> = {
  executive: [['planifier', { kind: 'queue', id: 'task-queue' }]],
  routing: [['router', { kind: 'model', id: 'claude-sonnet-5-5' }], ['router', { kind: 'model', id: 'claude-haiku-5-5' }]],
  tokens: [['compresser', { kind: 'database', id: 'event-store' }]],
  context: [['résumer', { kind: 'database', id: 'event-store' }]],
  skills: [['Skill', { kind: 'skill', id: 'skill-writing' }], ['Skill', { kind: 'skill', id: 'skill-pdf' }]],
  connectors: [['healthcheck', { kind: 'mcp', id: 'mcp-github' }], ['healthcheck', { kind: 'mcp', id: 'mcp-notion' }], ['healthcheck', { kind: 'mcp', id: 'mcp-drive' }]],
  instructions: [['Read', { kind: 'database', id: 'prefs-db' }]],
  quality: [['Read', { kind: 'database', id: 'event-store' }]],
  finance: [['requête', { kind: 'database', id: 'event-store' }]],
  research: [['WebSearch', { kind: 'connector', id: 'web-search' }], ['Skill', { kind: 'skill', id: 'skill-research' }]],
  security: [['scanner', { kind: 'queue', id: 'event-bus' }]],
  automation: [['exécuter', { kind: 'queue', id: 'task-queue' }]],
  benchmark: [['évaluer', { kind: 'database', id: 'event-store' }]],
  evolution: [['Read', { kind: 'database', id: 'event-store' }]],
  archive: [['écrire', { kind: 'database', id: 'archive-db' }]],
};

/** Plans one task (all of its events, possibly extending into the future). */
function planTask(ctx: Ctx, dept: DepartmentDef, agent: AgentDef, created: number, opts: { title?: string; priority?: string } = {}): string {
  const r = ctx.rng;
  const taskId = `t-${ctx.seq.n}`;
  const project = pick(r, PROJECTS);
  const title = opts.title ?? pick(r, TITLES[dept.id] ?? ['Tâche']);
  const isLlm = agent.kind === 'llm' || agent.id === 'bench';
  const steps = isLlm ? int(r, 2, 5) : int(r, 1, 3);
  const actor = agentRef(agent.id);
  const base = { actor, department: dept.id, project, taskId };
  const busy = ctx.busyUntil.get(agent.id) ?? 0;
  const startTs = Math.max(created + int(r, 2, 40) * SEC, busy + int(r, 3, 20) * SEC);
  ctx.meta.set(taskId, { deptId: dept.id, agentId: agent.id, title });

  ev(ctx, { ...base, ts: created, type: 'task.created', origin: { kind: 'service', id: 'task-queue' }, status: 'pending', summary: title,
    attrs: { title, priority: opts.priority ?? (r() < 0.12 ? 'high' : 'normal'), remainingSteps: steps } });

  const agentStatus: AgentStatus = agent.id === 'scout' ? 'researching' : agent.id === 'auditor' && dept.id !== 'instructions' ? 'validating' : 'working';
  let t = startTs;
  const model = modelFor(agent, t, ctx.start, r);
  ev(ctx, { ...base, ts: t, type: 'task.started', origin: actor, status: 'started', summary: title, model, provider: model ? 'anthropic' : undefined,
    effort: agent.id === 'governor' || agent.id === 'skillsmith' ? 'high' : model ? 'medium' : undefined, attrs: { agentStatus } });

  const day = Math.floor((t - ctx.start) / DAY) - 30;
  const cacheOn = agent.id === 'governor' && day >= MILESTONES[0].dayOffset;
  const compaction = agent.id === 'auditor' && day >= MILESTONES[2].dayOffset;
  const collaborate = agent.id === 'skillsmith' && title.includes('Tester');
  const waits = agent.id === 'governor' && dept.id === 'executive' && r() < 0.5;

  for (let i = 0; i < steps; i++) {
    if (isLlm && model) {
      const [pMin, pMax, oMin, oMax] = PROMPT[agent.id] ?? PROMPT.bench;
      let prompt = int(r, pMin, pMax);
      if (compaction) prompt = Math.round(prompt * 0.62);
      const out = int(r, oMin, oMax);
      const cacheRead = cacheOn && i > 0 ? Math.round(prompt * 0.82) : cacheOn ? Math.round(prompt * 0.5) : 0;
      const cacheWrite = cacheOn && i === 0 ? Math.round(prompt * 0.3) : 0;
      const input = Math.max(200, prompt - cacheRead - cacheWrite);
      const latency = int(r, 2, 22) * SEC + out * 8;
      t += latency;
      const cost = estimateCost(model, { inputTokens: input, outputTokens: out, cacheReadTokens: cacheRead, cacheWrite1hTokens: cacheWrite });
      const failed = r() < 0.015;
      ev(ctx, { ...base, ts: t, type: 'llm.call', origin: actor, destination: { kind: 'model', id: model }, status: failed ? 'failed' : 'succeeded',
        provider: 'anthropic', model, durationMs: latency, summary: failed ? 'Délai dépassé côté fournisseur' : `Appel ${i + 1}/${steps}`,
        metrics: { inputTokens: input, outputTokens: out, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite, costUsd: cost.costUsd,
          costNature: 'estimated', avoidedCostUsd: cost.avoidedByCacheUsd, latencyMs: latency },
        attrs: { remainingSteps: steps - i - 1 } });
    }
    const tools = TOOLS[dept.id] ?? [];
    const nTools = isLlm ? int(r, 0, 2) : int(r, 1, 3);
    for (let k = 0; k < nTools && tools.length; k++) {
      const [tool, dest] = pick(r, tools);
      t += int(r, 1, 15) * SEC;
      const failed = r() < 0.02;
      ev(ctx, { ...base, ts: t, type: 'tool.call', origin: actor, destination: dest, status: failed ? 'failed' : 'succeeded', durationMs: int(r, 200, 6000),
        summary: failed ? `${tool} : erreur ${pick(r, ['403', 'délai', '500'])}` : tool,
        attrs: { tool, skill: dest.kind === 'skill' ? dest.id : null, remainingSteps: steps - i - 1 } });
    }
    if (i === 0 && collaborate) {
      t += 4 * SEC;
      ev(ctx, { ...base, ts: t, type: 'agent.state', origin: actor, status: 'info', summary: 'Teste avec l’Auditrice', attrs: { status: 'collaborating', with: 'auditor', taskId } });
    }
    if (i === 0 && waits) {
      t += 3 * SEC;
      ev(ctx, { ...base, ts: t, type: 'agent.state', origin: actor, status: 'info', summary: 'Attend un arbitrage', attrs: { status: 'waiting', taskId } });
      t += int(r, 40, 160) * SEC;
      ev(ctx, { ...base, ts: t, type: 'agent.state', origin: actor, status: 'info', summary: 'Reprend après arbitrage', attrs: { status: 'working', taskId } });
    }
    t += int(r, 2, 20) * SEC;
  }

  if (dept.id === 'tokens' || dept.id === 'context') {
    const saved = int(r, 4_000, 38_000);
    const est = estimateCost('claude-opus-5-5', { inputTokens: saved });
    ev(ctx, { ...base, ts: t, type: 'optimization.applied', origin: actor, status: 'succeeded', summary: dept.id === 'tokens' ? 'Historique compressé' : 'Contexte résumé',
      metrics: { tokensSaved: saved, avoidedCostUsd: est.costUsd } });
  }

  const failed = r() < 0.05;
  t += int(r, 1, 6) * SEC;
  ev(ctx, { ...base, ts: t, type: failed ? 'task.failed' : 'task.completed', origin: actor, status: failed ? 'failed' : 'succeeded',
    summary: failed ? pick(r, ['Résultat rejeté par le contrôle qualité', 'Connecteur indisponible', 'Quota atteint']) : title, durationMs: t - startTs,
    resultRef: failed ? undefined : `archive://${taskId}` });
  if (isLlm && !failed) {
    ev(ctx, { ...base, ts: t + 2 * SEC, type: 'quality.check', origin: { kind: 'agent', id: 'auditor' }, status: 'succeeded', summary: 'Contrôle qualité',
      metrics: { qualityScore: Math.round(between(r, 0.72, 0.99) * 100) / 100 } });
  }
  ctx.busyUntil.set(agent.id, t);
  return taskId;
}

function governanceTimeline(ctx: Ctx, start: number, now: number) {
  const r = ctx.rng;
  const at = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now + dayOffset * DAY);
    d.setHours(hour, minute, 0, 0);
    return d.getTime();
  };
  const sys: NodeRef = { kind: 'service', id: 'governor' };

  for (const [skill, name, ver] of [
    ['skill-writing', 'Rédaction', '1.2.0'], ['skill-pdf', 'PDF', '2.0.1'], ['skill-research', 'Veille', '0.9.0'],
    ['skill-brand', 'Charte graphique', '1.0.0'], ['skill-invoices', 'Factures', '1.1.0'], ['skill-legacy-export', 'Export ancien format', '0.4.0'],
  ] as const) {
    ev(ctx, { ts: start + int(r, 1, 30) * MIN, type: 'skill.installed', origin: sys, actor: { kind: 'agent', id: 'skillsmith' }, department: 'skills', status: 'succeeded',
      summary: `Skill « ${name} » installé`, attrs: { skill, name, version: ver } });
  }
  for (const [day, skill, ver, msg] of [
    [-24, 'skill-pdf', '2.1.0', 'Skill PDF : extraction des tableaux corrigée'],
    [-15, 'skill-writing', '1.3.0', 'Skill rédaction : ton plus concis'],
    [-8, 'skill-research', '1.0.0', 'Skill veille : sources officielles priorisées'],
    [-3, 'skill-writing', '1.4.0', 'Skill rédaction : règles de citation'],
  ] as const) {
    ev(ctx, { ts: at(day, 15), type: 'skill.updated', origin: sys, actor: { kind: 'agent', id: 'skillsmith' }, department: 'skills', status: 'succeeded', summary: msg, attrs: { skill, version: ver } });
  }
  ev(ctx, { ts: at(-10, 11), type: 'skill.disabled', origin: { kind: 'user', id: 'you' }, department: 'skills', status: 'succeeded', summary: 'Skill « Export ancien format » désactivé (inutilisé depuis 30 jours)', attrs: { skill: 'skill-legacy-export' } });

  for (const [id, name, status, day] of [
    ['mcp-github', 'GitHub', 'connected', -30], ['mcp-drive', 'Drive', 'connected', -30], ['web-search', 'Recherche web', 'connected', -30],
    ['mcp-notion', 'Notion', 'connected', -30], ['mcp-notion', 'Notion', 'degraded', -4], ['mcp-notion', 'Notion', 'auth-required', -1],
  ] as const) {
    ev(ctx, { ts: day === -30 ? start + 5 * MIN : at(day, 9, 30), type: 'connector.status', origin: { kind: 'service', id: 'connector-hub' }, destination: { kind: id.startsWith('mcp') ? 'mcp' : 'connector', id },
      department: 'connectors', status: status === 'connected' ? 'succeeded' : 'failed', summary: `${name} : ${status === 'connected' ? 'connecté' : status === 'degraded' ? 'dégradé' : 'authentification requise'}`,
      attrs: { status, name } });
  }

  for (const m of MILESTONES) {
    ev(ctx, { ts: at(m.dayOffset - 2, 10), type: 'recommendation', origin: { kind: 'agent', id: 'governor' }, actor: { kind: 'agent', id: 'governor' }, department: 'evolution', status: 'info',
      summary: `Recommandation : ${m.title.toLowerCase()}` });
    ev(ctx, { ts: at(m.dayOffset, 9), type: 'config.changed', origin: { kind: 'user', id: 'you' }, department: m.dept, status: 'succeeded', summary: m.title, attrs: { milestone: m.id, durable: true } });
    ev(ctx, { ts: at(m.dayOffset, 9, 1), type: 'optimization.applied', origin: { kind: 'service', id: 'optimizer' }, actor: { kind: 'service', id: 'optimizer' }, department: m.dept, status: 'succeeded',
      summary: m.title, attrs: { milestone: m.id } });
  }

  const decisions: Array<{ day: number; id: string; title: string; rationale: string; impact: string; risk: string; rev: string; durable?: boolean; cost?: number; verdict?: string; dept: string }> = [
    { day: -22, id: 'dec-cache', title: 'Activer le cache de prompt 1 h', rationale: 'Les appels du Gouverneur répètent 80 % du même préfixe.', impact: '≈ −60 % de coût d’entrée estimé', risk: 'low', rev: 'reversible', verdict: 'go', dept: 'tokens' },
    { day: -14, id: 'dec-haiku', title: 'Router la veille vers Haiku 5.5', rationale: 'Tâches de lecture simples, qualité stable au banc d’essai.', impact: '≈ −90 % de coût sur la veille', risk: 'medium', rev: 'reversible', verdict: 'test', dept: 'routing' },
    { day: -9, id: 'dec-autorerun', title: 'Relance automatique des tâches échouées', rationale: 'Les échecs transitoires représentent 40 % des erreurs.', impact: 'Dépense supplémentaire possible', risk: 'high', rev: 'reversible', cost: 4.2, verdict: 'nogo', dept: 'automation' },
    { day: -2, id: 'dec-instructions', title: 'Réécrire les consignes système du Gouverneur', rationale: 'Trois consignes se contredisent sur le ton et la longueur.', impact: 'Modification durable des instructions', risk: 'high', rev: 'partial', durable: true, dept: 'instructions' },
    { day: -1, id: 'dec-notion', title: 'Révoquer et reconnecter Notion', rationale: 'Le jeton a expiré ; le connecteur renvoie 401.', impact: 'Interruption de 5 min des tâches Notion', risk: 'medium', rev: 'reversible', dept: 'connectors' },
    { day: 0, id: 'dec-bench', title: 'Banc d’essai Sonnet vs Opus sur les synthèses', rationale: 'Vérifier si Sonnet 5.5 suffit pour les synthèses longues.', impact: 'Coût du test estimé', risk: 'medium', rev: 'reversible', cost: 1.8, dept: 'benchmark' },
  ];
  for (const d of decisions) {
    const ts = Math.min(at(d.day, 10, 30), now - 30 * MIN);
    ev(ctx, { ts, type: 'decision.proposed', origin: { kind: 'agent', id: 'governor' }, actor: { kind: 'agent', id: 'governor' }, department: d.dept, status: 'pending', summary: d.title,
      attrs: { decisionId: d.id, title: d.title, rationale: d.rationale, impact: d.impact, risk: d.risk, reversibility: d.rev, durable: d.durable ?? false, costDeltaUsd: d.cost ?? null } });
    if (d.verdict) {
      ev(ctx, { ts: ts + 3 * 3_600_000, type: 'decision.resolved', origin: { kind: 'user', id: 'you' }, department: d.dept, status: 'succeeded', summary: `${d.verdict.toUpperCase()} : ${d.title}`, attrs: { decisionId: d.id, verdict: d.verdict } });
    }
  }

  for (const [day, sev, state, msg] of [
    [-19, 'medium', 'resolved', 'Clé API détectée dans un journal d’outil — masquée à l’ingestion'],
    [-7, 'low', 'resolved', 'Connexion inhabituelle au connecteur Drive'],
    [-1, 'high', 'open', 'Connecteur Notion : 14 refus d’authentification en 1 h'],
  ] as const) {
    const id = `inc-${day}`;
    ev(ctx, { ts: at(day, 14), type: 'security.incident', origin: { kind: 'service', id: 'sentinel' }, actor: { kind: 'service', id: 'sentinel' }, department: 'security', status: 'failed', summary: msg,
      confidentiality: 'confidential', attrs: { incidentId: id, severity: sev, state: 'open' } });
    if (state === 'resolved')
      ev(ctx, { ts: at(day, 16), type: 'security.incident', origin: { kind: 'service', id: 'sentinel' }, actor: { kind: 'service', id: 'sentinel' }, department: 'security', status: 'succeeded', summary: msg,
        confidentiality: 'confidential', attrs: { incidentId: id, severity: sev, state: 'resolved' } });
  }

  for (const [day, msg] of [
    [-26, 'Nouvelle version de Claude Code disponible'], [-17, 'Claude Sonnet 5.5 : baisse du tarif de lecture cache'],
    [-5, 'Mise à jour du serveur MCP GitHub'], [-1, 'Nouvelle version du skill PDF proposée par la communauté'],
  ] as const) {
    ev(ctx, { ts: at(day, 8, 15), type: 'update.detected', origin: { kind: 'agent', id: 'scout' }, actor: { kind: 'agent', id: 'scout' }, department: 'research', status: 'info', summary: msg });
  }

  for (let d = -30; d <= 0; d++) {
    const ts = at(d, 8);
    if (ts > now) break;
    ev(ctx, { ts, type: 'automation.run', origin: { kind: 'service', id: 'scheduler' }, actor: { kind: 'service', id: 'scheduler' }, department: 'automation', status: r() < 0.05 ? 'failed' : 'succeeded', summary: 'Rapport quotidien 8 h' });
    ev(ctx, { ts: ts + 5 * MIN, type: 'quota.updated', origin: { kind: 'service', id: 'ledger' }, provider: 'anthropic', status: 'info', summary: 'Quota mensuel',
      metrics: { quotaUsedPct: Math.min(100, Math.round(((d + 31) / 31) * 64 + between(r, -2, 2))) } });
  }
}

export interface DemoOptions {
  seed?: number;
  days?: number;
  /** Mean seconds between new live tasks. */
  liveTaskEverySec?: number;
}

export class DemoSource implements DataSource {
  readonly id = 'demo';
  readonly label = 'Données de démonstration';
  readonly kind = 'demo' as const;
  readonly defaultNature = 'demo' as const;
  readonly capabilities = { live: true, commands: true, history: true };
  readonly visibility = {
    observable: ['Toutes les vues (données synthétiques générées localement)'],
    notObservable: ['Aucune activité réelle : ces chiffres ne décrivent aucune opération exécutée'],
  };

  private schedule: GovEvent[] = [];
  private held = new Map<string, { events: GovEvent[]; pausedAt: number }>();
  private ctx: Ctx;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextSpawn = 0;
  private readonly opts: Required<DemoOptions>;

  constructor(opts: DemoOptions = {}) {
    this.opts = { seed: 20261124, days: 30, liveTaskEverySec: 14, ...opts };
    this.ctx = { rng: mulberry32(this.opts.seed), seq: { n: 1 }, out: [], start: 0, busyUntil: new Map(), meta: new Map() };
  }

  catalog() {
    return DEMO_CATALOG;
  }

  async load(now: number): Promise<GovEvent[]> {
    const ctx = this.ctx;
    ctx.start = now - this.opts.days * DAY;
    ctx.out = [];
    governanceTimeline(ctx, ctx.start, now);
    const r = ctx.rng;
    for (let d = this.opts.days; d >= 0; d--) {
      const dayStart = new Date(now - d * DAY);
      dayStart.setHours(0, 0, 0, 0);
      const weekend = dayStart.getDay() === 0 || dayStart.getDay() === 6;
      const plans: Array<[number, DepartmentDef]> = [];
      for (const dept of DEPARTMENTS) {
        const n = Math.round(PER_DAY[dept.id] * (weekend ? 0.4 : 1) * between(r, 0.6, 1.4));
        for (let i = 0; i < n; i++) plans.push([dayStart.getTime() + between(r, 7.5, 20.5) * 3_600_000, dept]);
      }
      plans.sort((a, b) => a[0] - b[0]);
      for (const [ts, dept] of plans) {
        if (ts > now) continue;
        planTask(ctx, dept, this.engineFor(dept), ts);
      }
    }
    // Make sure something is in flight right now (scheduled steps continue live).
    for (const id of ['governor', 'auditor', 'scout', 'optimizer', 'router']) {
      const dept = DEPARTMENTS.find((d) => d.engineIds.includes(id))!;
      planTask(ctx, dept, AGENTS.find((a) => a.id === id)!, now - int(r, 20, 90) * SEC);
    }
    const all = ctx.out.sort((a, b) => a.ts - b.ts);
    ctx.out = [];
    this.schedule = all.filter((e) => e.ts > now);
    this.nextSpawn = now + this.opts.liveTaskEverySec * SEC;
    return all.filter((e) => e.ts <= now);
  }

  private engineFor(dept: DepartmentDef): AgentDef {
    const id = dept.engineIds.find((x) => x !== 'you') ?? dept.engineIds[0];
    return AGENTS.find((a) => a.id === id)!;
  }

  subscribe(push: (events: GovEvent[]) => void): () => void {
    const tick = () => {
      const now = Date.now();
      if (now >= this.nextSpawn) {
        const dept = pick(this.ctx.rng, DEPARTMENTS);
        this.ctx.out = [];
        planTask(this.ctx, dept, this.engineFor(dept), now);
        this.enqueue(this.ctx.out);
        this.ctx.out = [];
        this.nextSpawn = now + between(this.ctx.rng, 0.5, 1.5) * this.opts.liveTaskEverySec * SEC;
      }
      let i = 0;
      while (i < this.schedule.length && this.schedule[i].ts <= now) i++;
      if (i) push(this.schedule.splice(0, i));
    };
    this.timer = setInterval(tick, 1000);
    return () => {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    };
  }

  private enqueue(events: GovEvent[]) {
    this.schedule.push(...events);
    this.schedule.sort((a, b) => a.ts - b.ts);
  }

  readonly operations: OperationsPort = {
    execute: async (cmd: Command, now: number): Promise<GovEvent[]> => {
      const ctx = this.ctx;
      ctx.out = [];
      const you: NodeRef = { kind: 'user', id: 'you' };
      switch (cmd.type) {
        case 'task.pause': {
          const events = this.schedule.filter((e) => e.taskId === cmd.taskId);
          this.schedule = this.schedule.filter((e) => e.taskId !== cmd.taskId);
          this.held.set(cmd.taskId, { events, pausedAt: now });
          ev(ctx, { ts: now, type: 'task.paused', origin: you, taskId: cmd.taskId, status: 'paused', summary: 'Tâche suspendue par vous' });
          break;
        }
        case 'task.resume': {
          const h = this.held.get(cmd.taskId);
          if (h) {
            const shift = now - h.pausedAt;
            this.enqueue(h.events.map((e) => ({ ...e, ts: e.ts + shift })));
            this.held.delete(cmd.taskId);
          }
          ev(ctx, { ts: now, type: 'task.resumed', origin: you, taskId: cmd.taskId, status: 'running', summary: 'Tâche reprise par vous' });
          break;
        }
        case 'task.priority':
          ev(ctx, { ts: now, type: 'task.priority', origin: you, taskId: cmd.taskId, status: 'info', summary: `Priorité : ${cmd.priority}`, attrs: { priority: cmd.priority } });
          break;
        case 'task.rerun': {
          const meta = ctx.meta.get(cmd.taskId);
          const dept = DEPARTMENTS.find((d) => d.id === meta?.deptId) ?? pick(ctx.rng, DEPARTMENTS);
          const agent = AGENTS.find((a) => a.id === meta?.agentId) ?? this.engineFor(dept);
          planTask(ctx, dept, agent, now, { title: `Nouvelle exécution — ${meta?.title ?? cmd.taskId}` });
          const planned = ctx.out;
          ctx.out = planned.filter((e) => e.ts <= now);
          this.enqueue(planned.filter((e) => e.ts > now));
          break;
        }
        case 'decision.resolve':
          ev(ctx, { ts: now, type: 'decision.resolved', origin: you, status: 'succeeded', summary: `${cmd.verdict.toUpperCase()} : décision ${cmd.decisionId}`,
            attrs: { decisionId: cmd.decisionId, verdict: cmd.verdict } });
          break;
        case 'instructions.modify':
          ev(ctx, { ts: now, type: 'config.changed', origin: you, status: 'succeeded', summary: cmd.summary, attrs: { target: cmd.target, durable: true } });
          break;
      }
      const out = ctx.out;
      ctx.out = [];
      return out;
    },
  };
}
