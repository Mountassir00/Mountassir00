/**
 * Answer engine — turns a parsed question into a short sentence and data
 * artefacts (KPI tiles, charts, tables, lists). Pure and deterministic:
 * every figure comes from the event log or the projected state through the
 * SDK, and carries its nature. Unknown questions get an honest fallback.
 */
import {
  byModel, displaySummary, fmtCompact, fmtDuration, fmtInt, fmtPct, fmtRelative, fmtTime, fmtUsd, modelLabel, STATUS_LABEL, sumUsage,
  type Catalog, type DataNature, type GovEvent, type GovernorState, type UsageTotals,
} from '@sdk';
import { INTENT_LABEL, MORE_SUGGESTIONS, startOfDay, SUGGESTIONS, type IntentId, type Parsed, type PeriodSpec } from './parse';

export type Unit = 'usd' | 'tokens' | 'count' | 'pct' | 'ms';
export type Link = { kind: 'agent' | 'department' | 'task'; id: string } | { kind: 'decisions' };

export interface Kpi {
  label: string;
  value: string;
  sub?: string;
  nature: DataNature;
  delta?: { text: string; good: boolean | null };
}

export type Block =
  | { kind: 'kpis'; items: Kpi[] }
  | { kind: 'columns'; title: string; unit: Unit; nature: DataNature; bucket: 'hour' | 'day'; series: Array<{ key: string; label: string; color: string }>; points: Array<{ t: number; v: Record<string, number> }> }
  | { kind: 'line'; title: string; unit: Unit; nature: DataNature; bucket: 'hour' | 'day'; points: Array<{ t: number; v: number }> }
  | { kind: 'grouped'; title: string; unit: Unit; nature: DataNature; bucket: 'hour' | 'day'; a: { label: string; color: string }; b: { label: string; color: string }; points: Array<{ t: number; a: number; b: number }> }
  | { kind: 'bars'; title: string; unit: Unit; nature: DataNature; rows: Array<{ key: string; label: string; value: number; note?: string; link?: Link }> }
  | { kind: 'table'; title: string; nature: DataNature; columns: Array<{ key: string; label: string; align?: 'r'; narrow?: boolean }>; rows: Array<{ cells: Record<string, string>; link?: Link }> }
  | { kind: 'list'; title: string; nature: DataNature; items: Array<{ label: string; sub?: string; badge?: string; tone?: string; link?: Link }>; empty?: string }
  | { kind: 'note'; text: string; tone?: 'warn' }
  | { kind: 'chips'; title: string; items: string[] };

export interface Answer {
  id: string;
  q: string;
  at: number;
  mode: 'live' | 'replay';
  intent: IntentId | 'fallback';
  understood: string[];
  text: string;
  blocks: Block[];
  nature: DataNature;
  followUps: string[];
  pinned?: boolean;
}

export interface AnswerCtx {
  now: number;
  mode: 'live' | 'replay';
  window: (from: number, to: number) => readonly GovEvent[];
  state: GovernorState;
  catalog: Catalog;
  hasDemo: boolean;
  canViewConfidential: boolean;
  /** Timestamp of the first event in the log: a comparison needs history before the period. */
  firstTs: number;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
const COLORS = ['var(--series-1)', 'var(--series-4)', 'var(--series-3)', 'var(--series-2)', 'var(--st-researching)', 'var(--st-error)'];

/* ---------------- helpers ---------------- */

let seq = 0;
const newId = () => `a-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const fmtUnit = (u: Unit, n: number) =>
  u === 'usd' ? fmtUsd(n, n < 1 && n > 0 ? 3 : 2) : u === 'tokens' ? fmtCompact(n) : u === 'pct' ? fmtPct(n) : u === 'ms' ? fmtDuration(n) : fmtInt(n);

function natureOf(events: readonly GovEvent[], hasDemo: boolean): DataNature {
  let demo = 0;
  let real = 0;
  for (const e of events) {
    if (e.nature === 'demo') demo++;
    else if (e.nature === 'real') real++;
  }
  if (!events.length) return hasDemo ? 'demo' : 'real';
  return demo && !real ? 'demo' : 'real';
}
const costNature = (u: UsageTotals, base: DataNature): DataNature => (base === 'demo' ? 'demo' : u.costMeasured > 0 && u.costEstimated === 0 ? 'real' : 'estimated');

function deltaOf(cur: number | null, prev: number | null, lowerIsBetter: boolean): Kpi['delta'] | undefined {
  if (cur == null || prev == null || prev <= 0 || !Number.isFinite(cur)) return undefined;
  const d = (cur - prev) / prev;
  if (Math.abs(d) < 0.005) return { text: 'stable', good: null };
  return { text: `${d > 0 ? '+' : '−'}${fmtPct(Math.abs(d))}`, good: lowerIsBetter ? d < 0 : d > 0 };
}

const trendWord = (cur: number, prev: number) => {
  if (prev <= 0) return '';
  const d = (cur - prev) / prev;
  if (Math.abs(d) < 0.02) return ', stable par rapport à la période précédente';
  return `, ${d > 0 ? 'en hausse' : 'en baisse'} de ${fmtPct(Math.abs(d))} par rapport à la période précédente`;
};

function filterEntities(events: readonly GovEvent[], p: Parsed): readonly GovEvent[] {
  if (!p.agents.length && !p.departments.length && !p.models.length) return events;
  return events.filter(
    (e) =>
      (!p.agents.length || (e.actor && p.agents.includes(e.actor.id))) &&
      (!p.departments.length || (e.department && p.departments.includes(e.department))) &&
      (!p.models.length || (e.model && p.models.includes(e.model))),
  );
}

interface BucketRow {
  t: number;
  cost: number;
  tokIn: number;
  tokOut: number;
  cacheRead: number;
  cacheWrite: number;
  calls: number;
  errors: number;
  done: number;
  failed: number;
  avoided: number;
  qSum: number;
  qN: number;
  byModel: Record<string, { cost: number; tokens: number }>;
}

/** Buckets aligned on local hours or local midnights (charts read in the user's day). */
function bucketsOf(events: readonly GovEvent[], from: number, to: number): { unit: 'hour' | 'day'; rows: BucketRow[] } {
  const unit: 'hour' | 'day' = to - from <= 50 * HOUR ? 'hour' : 'day';
  const starts: number[] = [];
  if (unit === 'hour') {
    const d = new Date(from);
    d.setMinutes(0, 0, 0);
    for (let t = d.getTime(); t < to; t += HOUR) starts.push(t);
  } else {
    const d = new Date(startOfDay(from));
    while (d.getTime() < to) {
      starts.push(d.getTime());
      d.setDate(d.getDate() + 1);
    }
  }
  const rows: BucketRow[] = starts.map((t) => ({ t, cost: 0, tokIn: 0, tokOut: 0, cacheRead: 0, cacheWrite: 0, calls: 0, errors: 0, done: 0, failed: 0, avoided: 0, qSum: 0, qN: 0, byModel: {} }));
  let i = 0;
  for (const e of events) {
    if (e.ts < from || e.ts > to) continue;
    while (i < starts.length - 1 && e.ts >= starts[i + 1]) i++;
    while (i > 0 && e.ts < starts[i]) i--;
    const r = rows[i];
    if (!r) continue;
    const m = e.metrics;
    if (e.type === 'llm.call') {
      r.calls++;
      r.cost += m?.costUsd ?? 0;
      r.tokIn += m?.inputTokens ?? 0;
      r.tokOut += m?.outputTokens ?? 0;
      r.cacheRead += m?.cacheReadTokens ?? 0;
      r.cacheWrite += m?.cacheWriteTokens ?? 0;
      r.avoided += m?.avoidedCostUsd ?? 0;
      if (e.model) {
        const b = (r.byModel[e.model] ??= { cost: 0, tokens: 0 });
        b.cost += m?.costUsd ?? 0;
        b.tokens += (m?.inputTokens ?? 0) + (m?.outputTokens ?? 0) + (m?.cacheReadTokens ?? 0) + (m?.cacheWriteTokens ?? 0);
      }
    } else if (e.type === 'task.completed') r.done++;
    else if (e.type === 'task.failed') r.failed++;
    else if (e.type === 'optimization.applied') r.avoided += m?.avoidedCostUsd ?? 0;
    else if (e.type === 'quality.check' && m?.qualityScore != null) {
      r.qSum += m.qualityScore;
      r.qN++;
    }
    if (e.status === 'failed') r.errors++;
  }
  return { unit, rows };
}

/** "depuis 3 min" / "à l’instant" — keeps sentences grammatical. */
export function since(ts: number, now: number) {
  const r = fmtRelative(ts, now);
  return r.startsWith('il y a ') ? `depuis ${r.slice(7)}` : r;
}

function previousWindow(p: PeriodSpec): { from: number; to: number; label: string } {
  if (p.kind === 'thisWeek') return { from: p.from - 7 * DAY, to: p.to - 7 * DAY, label: 'la semaine précédente à la même heure' };
  if (p.kind === 'today') return { from: p.from - DAY, to: p.to - DAY, label: 'hier à la même heure' };
  if (p.kind === 'yesterday' || p.kind === 'dayBefore') return { from: p.from - DAY, to: p.to - DAY, label: 'la veille' };
  if (p.kind === 'lastWeek') return { from: p.from - 7 * DAY, to: p.to - 7 * DAY, label: 'la semaine d’avant' };
  const span = p.to - p.from;
  return { from: p.from - span, to: p.from, label: 'la période précédente de même durée' };
}

const taskStatus: Record<string, string> = { pending: 'En attente', running: 'En cours', paused: 'Suspendue', succeeded: 'Terminée', failed: 'Échouée', cancelled: 'Annulée' };

/* ---------------- main entry ---------------- */

export function answer(p: Parsed, ctx: AnswerCtx): Answer {
  const base: Omit<Answer, 'text' | 'blocks' | 'nature' | 'followUps' | 'intent'> = {
    id: newId(),
    q: p.raw.trim(),
    at: ctx.now,
    mode: ctx.mode,
    understood: understood(p, ctx.catalog),
  };
  if (!p.intent) return { ...base, ...fallback(p) };
  const all = ctx.window(p.period.from, p.period.to);
  const events = filterEntities(all, p);
  const nat = natureOf(events.length ? events : all, ctx.hasDemo);
  const r = RESOLVERS[p.intent](p, ctx, events, nat);
  return { ...base, intent: p.intent, nature: nat, ...r };
}

type Resolved = Pick<Answer, 'text' | 'blocks' | 'followUps'> & { nature?: DataNature };
type Resolver = (p: Parsed, ctx: AnswerCtx, events: readonly GovEvent[], nat: DataNature) => Resolved;

export function understood(p: Parsed, catalog: Catalog): string[] {
  const out: string[] = [];
  if (p.intent) out.push(INTENT_LABEL[p.intent]);
  out.push(p.explicitPeriod ? p.period.short : `${p.period.short} (période affichée)`);
  for (const a of p.agents) out.push(catalog.agents.find((x) => x.id === a)?.name ?? a);
  for (const d of p.departments) out.push(catalog.departments.find((x) => x.id === d)?.name ?? d);
  for (const m of p.models) out.push(modelLabel(m));
  if (p.by) out.push(p.by === 'model' ? 'par modèle' : p.by === 'agent' ? 'par agent' : 'par département');
  return out;
}

function fallback(p: Parsed): Pick<Answer, 'intent' | 'text' | 'blocks' | 'nature' | 'followUps'> {
  return {
    intent: 'fallback',
    nature: 'unavailable',
    text: `Je ne sais pas répondre à « ${p.raw.trim().slice(0, 80)} » à partir de vos données. Je ne fais que des calculs locaux sur le journal d’événements, sans modèle d’IA : je ne devine pas et je n’invente rien.`,
    blocks: [
      { kind: 'note', text: 'Je reconnais des mesures (coût, tokens, cache, erreurs, latence, qualité, quota), des listes (tâches en attente ou en cours, décisions, incidents, connecteurs, skills, agents), des périodes (aujourd’hui, hier, cette semaine, N jours, N heures) et des noms d’agents, de départements ou de modèles.' },
      { kind: 'chips', title: 'Essayez par exemple', items: [...SUGGESTIONS.slice(0, 4), ...MORE_SUGGESTIONS.slice(0, 4)] },
    ],
    followUps: [],
  };
}

const scopeText = (p: Parsed, ctx: AnswerCtx) => {
  const names = [
    ...p.agents.map((a) => ctx.catalog.agents.find((x) => x.id === a)?.name ?? a),
    ...p.departments.map((d) => ctx.catalog.departments.find((x) => x.id === d)?.name ?? d),
    ...p.models.map(modelLabel),
  ];
  return names.length ? ` pour ${names.join(', ')}` : '';
};
const Cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const noHistory = (ctx: AnswerCtx) => ` (pas de comparaison : l’historique commence le ${fmtTime(ctx.firstTs, true)})`;
const fmtBucket = (unit: 'hour' | 'day') => (unit === 'hour' ? 'heure' : 'jour');

/* ---------------- resolvers ---------------- */

const RESOLVERS: Record<IntentId, Resolver> = {
  help: () => ({
    text: 'Posez une question en français sur vos agents, vos coûts ou vos tâches. Je calcule la réponse localement à partir du journal d’événements, sans modèle d’IA ni dépense, et j’indique toujours la nature des chiffres.',
    blocks: [
      { kind: 'chips', title: 'Questions fréquentes', items: SUGGESTIONS },
      { kind: 'chips', title: 'Autres exemples', items: MORE_SUGGESTIONS },
      { kind: 'note', text: 'Périodes comprises : aujourd’hui, hier, avant-hier, cette semaine, la semaine dernière, ce mois-ci, « 7 jours », « 12 heures ». Sans période, la période affichée dans la barre du bas est utilisée.' },
    ],
    followUps: [],
  }),

  cost(p, ctx, events, nat) {
    const u = sumUsage(events);
    const cost = u.costEstimated + u.costMeasured;
    const prevW = previousWindow(p.period);
    const comparable = prevW.from >= ctx.firstTs;
    const prev = sumUsage(filterEntities(ctx.window(prevW.from, prevW.to), p));
    const prevCost = comparable ? prev.costEstimated + prev.costMeasured : 0;
    const cn = costNature(u, nat);
    const kpis: Kpi[] = [
      { label: 'Coût estimé', value: fmtUsd(cost), sub: `${fmtInt(u.llmCalls)} appels modèle`, nature: cn, delta: comparable ? deltaOf(cost, prevCost, true) : undefined },
      { label: 'Coût par tâche terminée', value: u.tasksDone ? fmtUsd(cost / u.tasksDone, 3) : 'Indisponible', sub: u.tasksDone ? `${fmtInt(u.tasksDone)} tâches` : 'Aucune tâche terminée', nature: u.tasksDone ? cn : 'unavailable' },
      { label: 'Coût évité (cache, optimisations)', value: fmtUsd(u.avoidedUsd), sub: 'Estimé au prix catalogue', nature: nat === 'demo' ? 'demo' : 'estimated' },
      u.costMeasured > 0
        ? { label: 'Dépense facturée', value: fmtUsd(u.costMeasured), sub: 'Rapprochée de la facturation', nature: nat === 'demo' ? 'demo' : 'real' }
        : { label: 'Dépense facturée', value: 'Indisponible', sub: 'Aucune source de facturation connectée', nature: 'unavailable' },
    ];
    const { unit, rows } = bucketsOf(events, p.period.from, p.period.to);
    const blocks: Block[] = [{ kind: 'kpis', items: kpis }];
    if (p.by === 'model' || p.models.length > 1) {
      const models = byModel(events);
      blocks.push(columnsByModel(rows, models.map((m) => m.model), 'cost', `Coût estimé par ${fmtBucket(unit)} et par modèle`, unit, cn));
      blocks.push({ kind: 'bars', title: 'Coût par modèle', unit: 'usd', nature: cn, rows: models.map((m) => ({ key: m.model, label: modelLabel(m.model), value: m.costUsd, note: `${fmtInt(m.calls)} appels` })) });
    } else {
      blocks.push({ kind: 'columns', title: `Coût estimé par ${fmtBucket(unit)}`, unit: 'usd', nature: cn, bucket: unit, series: [{ key: 'cost', label: 'Coût estimé', color: 'var(--series-1)' }], points: rows.map((r) => ({ t: r.t, v: { cost: r.cost } })) });
      if (p.by === 'agent' || p.by === 'department') blocks.push(breakdown(events, p.by, ctx, 'cost', cn));
    }
    return {
      text: `${Cap(p.period.label)}${scopeText(p, ctx)}, le coût estimé est de ${fmtUsd(cost)} pour ${fmtInt(u.llmCalls)} appels modèle${comparable ? trendWord(cost, prevCost) : noHistory(ctx)}.${u.costMeasured ? '' : ' Aucune facture n’est connectée : il s’agit du prix catalogue appliqué aux tokens.'}`,
      blocks,
      followUps: ['Coût par modèle sur 7 jours', 'Coût par agent sur 30 jours', 'Économies du cache', 'Compare cette semaine à la précédente'],
      nature: cn,
    };
  },

  tokens(p, ctx, events, nat) {
    const u = sumUsage(events);
    const total = u.tokensIn + u.tokensOut + u.cacheRead + u.cacheWrite;
    const prevW = previousWindow(p.period);
    const comparable = prevW.from >= ctx.firstTs;
    const prev = sumUsage(filterEntities(ctx.window(prevW.from, prevW.to), p));
    const prevTotal = comparable ? prev.tokensIn + prev.tokensOut + prev.cacheRead + prev.cacheWrite : 0;
    const { unit, rows } = bucketsOf(events, p.period.from, p.period.to);
    const blocks: Block[] = [
      {
        kind: 'kpis',
        items: [
          { label: 'Tokens traités', value: fmtCompact(total), sub: `${fmtInt(u.llmCalls)} appels`, nature: nat, delta: comparable ? deltaOf(total, prevTotal, true) : undefined },
          { label: 'Entrée', value: fmtCompact(u.tokensIn), nature: nat },
          { label: 'Sortie', value: fmtCompact(u.tokensOut), nature: nat },
          { label: 'Lus depuis le cache', value: fmtCompact(u.cacheRead), sub: u.tokensIn + u.cacheRead ? `${fmtPct(u.cacheRead / (u.tokensIn + u.cacheRead))} de l’entrée` : undefined, nature: nat },
        ],
      },
    ];
    const models = byModel(events);
    if (p.by === 'model' || p.models.length > 1 || /modele/.test(p.norm)) {
      blocks.push(columnsByModel(rows, models.map((m) => m.model), 'tokens', `Tokens par ${fmtBucket(unit)} et par modèle`, unit, nat));
      blocks.push({
        kind: 'table',
        title: 'Détail par modèle',
        nature: nat,
        columns: [
          { key: 'm', label: 'Modèle' },
          { key: 'calls', label: 'Appels', align: 'r' },
          { key: 'tok', label: 'Tokens', align: 'r' },
          { key: 'cache', label: 'Cache', align: 'r', narrow: true },
          { key: 'cost', label: 'Coût estimé', align: 'r', narrow: true },
        ],
        rows: models.map((m) => ({
          cells: { m: modelLabel(m.model), calls: fmtInt(m.calls), tok: fmtCompact(m.tokensIn + m.tokensOut + m.cacheRead), cache: m.cacheHitRate != null ? fmtPct(m.cacheHitRate) : '—', cost: fmtUsd(m.costUsd) },
        })),
      });
    } else {
      blocks.push({
        kind: 'columns',
        title: `Tokens par ${fmtBucket(unit)}`,
        unit: 'tokens',
        nature: nat,
        bucket: unit,
        series: [
          { key: 'in', label: 'Entrée', color: 'var(--series-1)' },
          { key: 'out', label: 'Sortie', color: 'var(--series-4)' },
          { key: 'cr', label: 'Cache lu', color: 'var(--series-2)' },
          { key: 'cw', label: 'Cache écrit', color: 'var(--series-3)' },
        ],
        points: rows.map((r) => ({ t: r.t, v: { in: r.tokIn, out: r.tokOut, cr: r.cacheRead, cw: r.cacheWrite } })),
      });
      if (p.by === 'agent' || p.by === 'department') blocks.push(breakdown(events, p.by, ctx, 'tokens', nat));
    }
    const top = models[0] ? models.slice().sort((a, b) => b.tokensIn + b.tokensOut + b.cacheRead - (a.tokensIn + a.tokensOut + a.cacheRead))[0] : null;
    return {
      text: `${Cap(p.period.label)}${scopeText(p, ctx)}, ${fmtCompact(total)} tokens ont été traités${comparable ? trendWord(total, prevTotal) : noHistory(ctx)}.${top ? ` ${modelLabel(top.model)} en consomme le plus.` : ''}`,
      blocks,
      followUps: ['Économies du cache', 'Coût par modèle sur 7 jours', 'Latence par modèle'],
    };
  },

  errors(p, ctx, events, nat) {
    const inError = Object.values(ctx.state.agents).filter((a) => a.status === 'error');
    const u = sumUsage(events);
    const calls = u.llmCalls + u.toolCalls;
    const failures = events.filter((e) => e.status === 'failed' && (e.type === 'task.failed' || e.type === 'llm.call' || e.type === 'tool.call' || e.type === 'automation.run')).slice(-8).reverse();
    const agentName = (id?: string) => (id ? ctx.catalog.agents.find((a) => a.id === id)?.name ?? id : '—');
    const blocks: Block[] = [
      {
        kind: 'list',
        title: 'Agents en erreur maintenant',
        nature: nat,
        items: inError.map((a) => ({ label: agentName(a.id), sub: `En erreur ${since(a.statusSince, ctx.now)} · ${fmtInt(a.errors)} erreur(s) cumulée(s)`, tone: 'error', badge: STATUS_LABEL.error, link: { kind: 'agent', id: a.id } })),
        empty: 'Aucun agent n’est en erreur en ce moment.',
      },
      {
        kind: 'kpis',
        items: [
          { label: 'Erreurs sur la période', value: fmtInt(u.errors), sub: calls ? `${fmtPct(u.errors / calls, 1)} des appels` : 'Aucun appel', nature: nat },
          { label: 'Tâches échouées', value: fmtInt(u.tasksFailed), sub: u.tasksDone + u.tasksFailed ? `sur ${fmtInt(u.tasksDone + u.tasksFailed)} terminées` : undefined, nature: nat },
        ],
      },
      {
        kind: 'table',
        title: 'Derniers échecs',
        nature: nat,
        columns: [
          { key: 't', label: 'Heure', narrow: true },
          { key: 'a', label: 'Agent' },
          { key: 's', label: 'Détail' },
        ],
        rows: failures.map((e) => ({
          cells: { t: fmtTime(e.ts, true), a: agentName(e.actor?.id), s: displaySummary(e, ctx.canViewConfidential) || e.type },
          link: e.actor ? { kind: 'agent', id: e.actor.id } : undefined,
        })),
      },
    ];
    return {
      text: inError.length
        ? `${inError.length} agent(s) en erreur maintenant : ${inError.map((a) => agentName(a.id)).join(', ')}. ${Cap(p.period.label)}, ${fmtInt(u.errors)} erreur(s) et ${fmtInt(u.tasksFailed)} tâche(s) échouée(s).`
        : `Aucun agent n’est en erreur en ce moment. ${Cap(p.period.label)}, ${fmtInt(u.errors)} erreur(s) et ${fmtInt(u.tasksFailed)} tâche(s) échouée(s) ont été enregistrées.`,
      blocks,
      followUps: ['Incidents de sécurité', 'Tâches en attente', 'Que s’est-il passé hier ?'],
      nature: nat,
    };
  },

  pending(p, ctx, _events, nat) {
    const tasks = Object.values(ctx.state.tasks);
    const pending = tasks.filter((t) => t.status === 'pending' && scoped(t, p)).sort((a, b) => a.createdAt - b.createdAt);
    const waiting = Object.values(ctx.state.agents).filter((a) => a.status === 'waiting');
    const running = tasks.filter((t) => (t.status === 'running' || t.status === 'paused') && scoped(t, p));
    const agentName = (id?: string) => (id ? ctx.catalog.agents.find((a) => a.id === id)?.name ?? id : 'Non attribuée');
    const decisions = Object.values(ctx.state.decisions).filter((d) => d.status === 'pending').length;
    return {
      text: pending.length
        ? `${pending.length} tâche(s) en attente de démarrage${scopeText(p, ctx)}, la plus ancienne créée ${fmtRelative(pending[0].createdAt, ctx.now)}. ${running.length} en cours.`
        : `Aucune tâche n’attend de démarrer${scopeText(p, ctx)}. ${running.length} tâche(s) sont en cours${waiting.length ? ` et ${waiting.length} agent(s) attendent un arbitrage` : ''}.`,
      blocks: [
        {
          kind: 'kpis',
          items: [
            { label: 'En attente', value: fmtInt(pending.length), nature: nat },
            { label: 'En cours', value: fmtInt(running.filter((t) => t.status === 'running').length), nature: nat },
            { label: 'Suspendues', value: fmtInt(running.filter((t) => t.status === 'paused').length), nature: nat },
            { label: 'Décisions à arbitrer', value: fmtInt(decisions), nature: nat },
          ],
        },
        {
          kind: 'list',
          title: 'Tâches en attente',
          nature: nat,
          items: pending.slice(0, 12).map((t) => ({ label: t.title, sub: `${agentName(t.agentId)} · créée ${fmtRelative(t.createdAt, ctx.now)}${t.requiresApproval ? ' · approbation requise' : ''}`, badge: t.priority === 'high' || t.priority === 'critical' ? 'Priorité haute' : undefined, link: { kind: 'task', id: t.id } })),
          empty: 'File vide : aucune tâche en attente.',
        },
        {
          kind: 'list',
          title: 'En cours',
          nature: nat,
          items: running.slice(0, 8).map((t) => ({ label: t.title, sub: `${agentName(t.agentId)} · ${taskStatus[t.status]}${t.startedAt ? ` · démarrée ${fmtRelative(t.startedAt, ctx.now)}` : ''}`, tone: t.status === 'paused' ? 'paused' : 'working', link: { kind: 'task', id: t.id } })),
          empty: 'Aucune tâche en cours.',
        },
      ],
      followUps: ['Décisions en attente', 'Agents en erreur', 'Tâches terminées aujourd’hui'],
    };
  },

  running(p, ctx, events, nat) {
    const r = RESOLVERS.pending(p, ctx, events, nat);
    const tasks = Object.values(ctx.state.tasks).filter((t) => (t.status === 'running' || t.status === 'paused') && scoped(t, p));
    return { ...r, text: `${tasks.length} tâche(s) en cours${scopeText(p, ctx)} (dont ${tasks.filter((t) => t.status === 'paused').length} suspendue(s)).`, blocks: [r.blocks[0], r.blocks[2], r.blocks[1]] };
  },

  cache(p, ctx, events, nat) {
    const u = sumUsage(events);
    const share = u.tokensIn + u.cacheRead > 0 ? u.cacheRead / (u.tokensIn + u.cacheRead) : null;
    const opts = events.filter((e) => e.type === 'optimization.applied');
    const { unit, rows } = bucketsOf(events, p.period.from, p.period.to);
    const est: DataNature = nat === 'demo' ? 'demo' : 'estimated';
    return {
      text: share != null
        ? `${Cap(p.period.label)}${scopeText(p, ctx)}, ${fmtPct(share)} des tokens d’entrée ont été servis par le cache (${fmtCompact(u.cacheRead)} tokens). Coût évité estimé : ${fmtUsd(u.avoidedUsd)}, dont ${fmtInt(opts.length)} optimisation(s) appliquée(s).`
        : `${Cap(p.period.label)}, aucun appel modèle : rien n’a pu être servi par le cache.`,
      blocks: [
        {
          kind: 'kpis',
          items: [
            { label: 'Part servie par le cache', value: share != null ? fmtPct(share) : 'Indisponible', sub: share != null ? 'des tokens d’entrée' : 'Aucun appel modèle', nature: share != null ? nat : 'unavailable' },
            { label: 'Tokens lus en cache', value: fmtCompact(u.cacheRead), nature: nat },
            { label: 'Coût évité', value: fmtUsd(u.avoidedUsd), sub: 'Prix catalogue', nature: est },
            { label: 'Tokens économisés', value: fmtCompact(u.tokensSaved), sub: `${fmtInt(u.optimizations)} optimisation(s)`, nature: nat },
          ],
        },
        { kind: 'line', title: `Coût évité par ${fmtBucket(unit)}`, unit: 'usd', nature: est, bucket: unit, points: rows.map((r) => ({ t: r.t, v: r.avoided })) },
        {
          kind: 'list',
          title: 'Optimisations appliquées',
          nature: nat,
          items: opts.slice(-6).reverse().map((e) => ({ label: displaySummary(e, ctx.canViewConfidential) || 'Optimisation', sub: `${fmtTime(e.ts, true)}${e.metrics?.tokensSaved ? ` · ${fmtCompact(e.metrics.tokensSaved)} tokens économisés` : ''}`, link: e.department ? { kind: 'department', id: e.department } : undefined })),
          empty: 'Aucune optimisation sur la période.',
        },
      ],
      followUps: ['Coût de la semaine', 'Tokens par modèle sur 7 jours', 'Compare cette semaine à la précédente'],
    };
  },

  recap(p, ctx, events, nat) {
    const u = sumUsage(events);
    const cost = u.costEstimated + u.costMeasured;
    const notable = events.filter((e) => ['decision.proposed', 'decision.resolved', 'security.incident', 'config.changed', 'skill.updated', 'skill.installed', 'skill.disabled', 'connector.status', 'update.detected', 'recommendation'].includes(e.type) || (e.type === 'optimization.applied' && e.attrs?.milestone));
    const label: Record<string, string> = {
      'decision.proposed': 'Décision proposée', 'decision.resolved': 'Décision arbitrée', 'security.incident': 'Sécurité', 'config.changed': 'Configuration', 'skill.updated': 'Skill',
      'skill.installed': 'Skill', 'skill.disabled': 'Skill', 'connector.status': 'Connecteur', 'update.detected': 'Mise à jour', recommendation: 'Recommandation', 'optimization.applied': 'Optimisation',
    };
    const { unit, rows } = bucketsOf(events, p.period.from, p.period.to);
    return {
      text: `${Cap(p.period.label)}${scopeText(p, ctx)} : ${fmtInt(u.tasksDone)} tâche(s) terminée(s), ${fmtInt(u.tasksFailed)} échouée(s), ${fmtInt(u.llmCalls)} appels modèle pour ${fmtUsd(cost)} estimés. ${notable.length ? `${notable.length} fait(s) marquant(s).` : 'Aucun fait marquant.'}`,
      blocks: [
        {
          kind: 'kpis',
          items: [
            { label: 'Tâches terminées', value: fmtInt(u.tasksDone), nature: nat },
            { label: 'Tâches échouées', value: fmtInt(u.tasksFailed), nature: nat },
            { label: 'Coût estimé', value: fmtUsd(cost), nature: costNature(u, nat) },
            { label: 'Qualité moyenne', value: u.qualityAvg != null ? fmtPct(u.qualityAvg) : 'Indisponible', sub: u.qualityAvg != null ? undefined : 'Aucun contrôle', nature: u.qualityAvg != null ? nat : 'unavailable' },
          ],
        },
        {
          kind: 'list',
          title: 'Faits marquants',
          nature: nat,
          items: notable.slice(-10).reverse().map((e) => ({ label: displaySummary(e, ctx.canViewConfidential) || e.type, sub: `${fmtTime(e.ts, true)}`, badge: label[e.type], tone: e.type === 'security.incident' ? 'error' : undefined, link: e.type.startsWith('decision') ? { kind: 'decisions' } : e.department ? { kind: 'department', id: e.department } : undefined })),
          empty: 'Rien de notable sur la période : uniquement l’activité courante des agents.',
        },
        { kind: 'columns', title: `Tâches par ${fmtBucket(unit)}`, unit: 'count', nature: nat, bucket: unit, series: [{ key: 'done', label: 'Terminées', color: 'var(--series-3)' }, { key: 'failed', label: 'Échouées', color: 'var(--st-error)' }], points: rows.map((r) => ({ t: r.t, v: { done: r.done, failed: r.failed } })) },
      ],
      followUps: ['Agents en erreur', 'Décisions en attente', 'Coût de la semaine'],
    };
  },

  compare(p, ctx, events, nat) {
    const prevW = previousWindow(p.period);
    if (prevW.from < ctx.firstTs) {
      return {
        text: `Comparaison impossible : il faudrait des données sur ${prevW.label}, or l’historique disponible commence le ${fmtTime(ctx.firstTs, true)}. Choisissez une période plus courte.`,
        blocks: [{ kind: 'chips', title: 'Essayez', items: ['Compare cette semaine à la précédente', 'Compare aujourd’hui à hier', 'Compare les 7 derniers jours'] }],
        followUps: [],
        nature: 'unavailable',
      };
    }
    const prevEv = filterEntities(ctx.window(prevW.from, prevW.to), p);
    const a = sumUsage(events);
    const b = sumUsage(prevEv);
    const costA = a.costEstimated + a.costMeasured;
    const costB = b.costEstimated + b.costMeasured;
    const tok = (u: UsageTotals) => u.tokensIn + u.tokensOut + u.cacheRead + u.cacheWrite;
    const rate = (u: UsageTotals) => (u.llmCalls + u.toolCalls ? u.errors / (u.llmCalls + u.toolCalls) : null);
    const cache = (u: UsageTotals) => (u.tokensIn + u.cacheRead ? u.cacheRead / (u.tokensIn + u.cacheRead) : null);
    const per = (u: UsageTotals) => (u.tasksDone ? (u.costEstimated + u.costMeasured) / u.tasksDone : null);
    const rowsDef: Array<{ label: string; a: number | null; b: number | null; fmt: (n: number) => string; lower: boolean; pts?: boolean }> = [
      { label: 'Coût estimé', a: costA, b: costB, fmt: (n) => fmtUsd(n), lower: true },
      { label: 'Coût par tâche', a: per(a), b: per(b), fmt: (n) => fmtUsd(n, 3), lower: true },
      { label: 'Appels modèle', a: a.llmCalls, b: b.llmCalls, fmt: fmtInt, lower: true },
      { label: 'Tokens traités', a: tok(a), b: tok(b), fmt: fmtCompact, lower: true },
      { label: 'Tâches terminées', a: a.tasksDone, b: b.tasksDone, fmt: fmtInt, lower: false },
      { label: 'Tâches échouées', a: a.tasksFailed, b: b.tasksFailed, fmt: fmtInt, lower: true },
      { label: 'Taux d’erreur', a: rate(a), b: rate(b), fmt: (n) => fmtPct(n, 1), lower: true, pts: true },
      { label: 'Part servie par le cache', a: cache(a), b: cache(b), fmt: (n) => fmtPct(n), lower: false, pts: true },
      { label: 'Qualité moyenne', a: a.qualityAvg, b: b.qualityAvg, fmt: (n) => fmtPct(n), lower: false, pts: true },
    ];
    const diff = (r: (typeof rowsDef)[number]) => {
      if (r.a == null || r.b == null) return '—';
      if (r.pts) {
        const d = (r.a - r.b) * 100;
        return `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1).replace('.', ',')} pt`;
      }
      if (r.b === 0) return r.a === 0 ? 'stable' : 'nouveau';
      const d = (r.a - r.b) / r.b;
      return Math.abs(d) < 0.005 ? 'stable' : `${d > 0 ? '+' : '−'}${fmtPct(Math.abs(d))}`;
    };
    const cn = costNature(a, nat);
    const prevBuckets = bucketsOf(prevEv, prevW.from, prevW.to).rows;
    const curBuckets = bucketsOf(events, p.period.from, p.period.to);
    const n = Math.max(curBuckets.rows.length, prevBuckets.length);
    return {
      text: `${Cap(p.period.label)}${scopeText(p, ctx)} par rapport à ${prevW.label} : coût ${costB > 0 ? `${costA >= costB ? 'en hausse' : 'en baisse'} de ${fmtPct(Math.abs(costA - costB) / costB)}` : 'sans base de comparaison'}, ${fmtInt(a.tasksDone)} tâches terminées contre ${fmtInt(b.tasksDone)}.`,
      blocks: [
        {
          kind: 'kpis',
          items: [
            { label: 'Coût estimé', value: fmtUsd(costA), sub: `contre ${fmtUsd(costB)}`, nature: cn, delta: deltaOf(costA, costB, true) },
            { label: 'Tâches terminées', value: fmtInt(a.tasksDone), sub: `contre ${fmtInt(b.tasksDone)}`, nature: nat, delta: deltaOf(a.tasksDone, b.tasksDone, false) },
            { label: 'Tokens traités', value: fmtCompact(tok(a)), sub: `contre ${fmtCompact(tok(b))}`, nature: nat, delta: deltaOf(tok(a), tok(b), true) },
          ],
        },
        {
          kind: 'table',
          title: `Comparaison : ${p.period.short} et ${prevW.label}`,
          nature: nat,
          columns: [
            { key: 'm', label: 'Mesure' },
            { key: 'a', label: 'Période', align: 'r' },
            { key: 'b', label: 'Précédente', align: 'r' },
            { key: 'd', label: 'Écart', align: 'r' },
          ],
          rows: rowsDef.map((r) => ({ cells: { m: r.label, a: r.a == null ? '—' : r.fmt(r.a), b: r.b == null ? '—' : r.fmt(r.b), d: diff(r) } })),
        },
        {
          kind: 'grouped',
          title: `Coût estimé par ${fmtBucket(curBuckets.unit)} : période et précédente`,
          unit: 'usd',
          nature: cn,
          bucket: curBuckets.unit,
          a: { label: 'Précédente', color: 'var(--c-ink-muted)' },
          b: { label: 'Période', color: 'var(--series-1)' },
          points: Array.from({ length: n }, (_, i) => ({ t: curBuckets.rows[i]?.t ?? (prevBuckets[i]?.t ?? 0) + (p.period.from - prevW.from), a: prevBuckets[i]?.cost ?? 0, b: curBuckets.rows[i]?.cost ?? 0 })),
        },
      ],
      followUps: ['Coût de la semaine', 'Que s’est-il passé hier ?', 'Économies du cache'],
    };
  },

  decisions(_p, ctx, _events, nat) {
    const all = Object.values(ctx.state.decisions);
    const pending = all.filter((d) => d.status === 'pending').sort((a, b) => (a.risk === 'high' ? -1 : 0) - (b.risk === 'high' ? -1 : 0) || b.proposedAt - a.proposedAt);
    const resolved = all.filter((d) => d.status !== 'pending').sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)).slice(0, 4);
    const dept = (id?: string) => (id ? ctx.catalog.departments.find((d) => d.id === id)?.name ?? id : '—');
    const risk = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' } as const;
    return {
      text: pending.length ? `${pending.length} décision(s) attendent votre arbitrage, dont ${pending.filter((d) => d.risk === 'high').length} à risque élevé.` : 'Aucune décision n’attend d’arbitrage.',
      blocks: [
        {
          kind: 'list',
          title: 'En attente d’arbitrage',
          nature: pending[0]?.nature ?? nat,
          items: pending.map((d) => ({ label: d.title, sub: `${dept(d.departmentId)} · ${d.impact || d.rationale}${d.costDeltaUsd ? ` · +${fmtUsd(d.costDeltaUsd)} estimé` : ''}`, badge: risk[d.risk], tone: d.risk === 'high' ? 'error' : d.risk === 'medium' ? 'waiting' : 'validating', link: { kind: 'decisions' } })),
          empty: 'Rien à arbitrer.',
        },
        {
          kind: 'list',
          title: 'Derniers arbitrages',
          nature: nat,
          items: resolved.map((d) => ({ label: d.title, sub: `${d.status.toUpperCase()} · ${d.resolvedAt ? fmtRelative(d.resolvedAt, ctx.now) : ''}`, link: { kind: 'decisions' } })),
          empty: 'Aucun arbitrage enregistré.',
        },
      ],
      followUps: ['Tâches en attente', 'Que s’est-il passé hier ?'],
    };
  },

  incidents(_p, ctx, _events, nat) {
    const list = Object.values(ctx.state.incidents).sort((a, b) => (a.state === 'open' ? -1 : 1) - (b.state === 'open' ? -1 : 1) || b.ts - a.ts);
    const open = list.filter((i) => i.state === 'open');
    const sev = { low: 'Faible', medium: 'Moyenne', high: 'Élevée', critical: 'Critique' } as const;
    return {
      text: open.length ? `${open.length} incident(s) de sécurité ouvert(s) sur ${list.length} enregistré(s).` : `Aucun incident ouvert (${list.length} enregistré(s), tous résolus).`,
      blocks: [
        {
          kind: 'list',
          title: 'Incidents',
          nature: list[0]?.nature ?? nat,
          items: list.slice(0, 10).map((i) => ({
            label: ctx.canViewConfidential ? i.summary : 'Détails confidentiels masqués',
            sub: `${i.state === 'open' ? 'Ouvert' : 'Résolu'} · gravité ${sev[i.severity].toLowerCase()} · ${fmtTime(i.ts, true)}`,
            badge: i.state === 'open' ? 'Ouvert' : undefined,
            tone: i.state === 'open' ? 'error' : 'validating',
            link: i.departmentId ? { kind: 'department', id: i.departmentId } : undefined,
          })),
          empty: 'Aucun incident enregistré.',
        },
      ],
      followUps: ['Agents en erreur', 'État des connecteurs'],
    };
  },

  latency(p, ctx, events, nat) {
    const models = byModel(events).filter((m) => m.latencyAvgMs != null);
    const u = sumUsage(events);
    return {
      text: u.latencyAvgMs != null ? `${Cap(p.period.label)}${scopeText(p, ctx)}, un appel modèle prend en moyenne ${fmtDuration(u.latencyAvgMs)}.` : 'Aucune latence mesurée sur la période.',
      blocks: [
        { kind: 'kpis', items: [{ label: 'Latence moyenne', value: u.latencyAvgMs != null ? fmtDuration(u.latencyAvgMs) : 'Indisponible', sub: `${fmtInt(u.llmCalls)} appels`, nature: u.latencyAvgMs != null ? nat : 'unavailable' }] },
        { kind: 'bars', title: 'Latence moyenne par modèle', unit: 'ms', nature: nat, rows: models.map((m) => ({ key: m.model, label: modelLabel(m.model), value: m.latencyAvgMs ?? 0, note: `${fmtInt(m.calls)} appels` })) },
      ],
      followUps: ['Tokens par modèle sur 7 jours', 'Qualité des résultats cette semaine'],
    };
  },

  quality(p, ctx, events, nat) {
    const u = sumUsage(events);
    const { unit, rows } = bucketsOf(events, p.period.from, p.period.to);
    const checks = events.filter((e) => e.type === 'quality.check').length;
    return {
      text: u.qualityAvg != null ? `${Cap(p.period.label)}${scopeText(p, ctx)}, la qualité moyenne mesurée est de ${fmtPct(u.qualityAvg)} sur ${fmtInt(checks)} contrôle(s).` : `Aucun contrôle qualité ${p.period.label}.`,
      blocks: [
        {
          kind: 'kpis',
          items: [
            { label: 'Qualité moyenne', value: u.qualityAvg != null ? fmtPct(u.qualityAvg) : 'Indisponible', sub: u.qualityAvg != null ? undefined : 'Aucun contrôle', nature: u.qualityAvg != null ? nat : 'unavailable' },
            { label: 'Contrôles', value: fmtInt(checks), nature: nat },
            { label: 'Tâches réussies', value: u.tasksDone + u.tasksFailed ? fmtPct(u.tasksDone / (u.tasksDone + u.tasksFailed)) : 'Indisponible', nature: u.tasksDone + u.tasksFailed ? nat : 'unavailable' },
          ],
        },
        { kind: 'line', title: `Qualité moyenne par ${fmtBucket(unit)}`, unit: 'pct', nature: nat, bucket: unit, points: rows.filter((r) => r.qN).map((r) => ({ t: r.t, v: r.qSum / r.qN })) },
      ],
      followUps: ['Agents en erreur', 'Compare cette semaine à la précédente'],
    };
  },

  connectors(_p, ctx, _events, nat) {
    const list = Object.values(ctx.state.connectors);
    const label = { connected: 'Connecté', degraded: 'Dégradé', disconnected: 'Déconnecté', 'auth-required': 'Authentification requise' } as const;
    const bad = list.filter((c) => c.status !== 'connected');
    return {
      text: list.length ? `${list.length} connecteur(s) suivis, ${bad.length ? `${bad.length} à surveiller : ${bad.map((c) => c.name).join(', ')}` : 'tous connectés'}.` : 'Aucun connecteur déclaré par la source.',
      blocks: [
        {
          kind: 'list',
          title: 'Connecteurs',
          nature: list[0]?.nature ?? nat,
          items: list.map((c) => ({ label: c.name, sub: `${label[c.status]} ${since(c.since, ctx.now)} · ${fmtInt(c.calls)} appel(s)`, tone: c.status === 'connected' ? 'validating' : c.status === 'degraded' ? 'waiting' : 'error', badge: c.status === 'connected' ? undefined : label[c.status] })),
          empty: 'Aucun connecteur.',
        },
      ],
      followUps: ['Incidents de sécurité', 'Agents en erreur'],
    };
  },

  skills(_p, ctx, _events, nat) {
    const list = Object.values(ctx.state.skills).sort((a, b) => b.uses - a.uses);
    return {
      text: `${list.filter((s) => s.status === 'active').length} skill(s) actif(s) sur ${list.length}.`,
      blocks: [
        {
          kind: 'table',
          title: 'Skills',
          nature: list[0]?.nature ?? nat,
          columns: [
            { key: 'n', label: 'Skill' },
            { key: 'v', label: 'Version', narrow: true },
            { key: 's', label: 'Statut' },
            { key: 'u', label: 'Utilisations', align: 'r' },
          ],
          rows: list.map((s) => ({ cells: { n: s.name, v: s.version, s: s.status === 'active' ? 'Actif' : 'Désactivé', u: fmtInt(s.uses) } })),
        },
      ],
      followUps: ['Que s’est-il passé hier ?'],
    };
  },

  quota(_p, ctx) {
    const q = Object.values(ctx.state.quotas);
    return {
      text: q.length ? q.map((x) => `Quota ${x.provider} : ${fmtPct(x.usedPct / 100)} consommé (relevé ${fmtRelative(x.ts, ctx.now)}).`).join(' ') : 'Le quota n’est pas exposé par la source de données.',
      blocks: [{ kind: 'kpis', items: q.length ? q.map((x) => ({ label: `Quota ${x.provider}`, value: fmtPct(x.usedPct / 100), sub: `Relevé ${fmtRelative(x.ts, ctx.now)}`, nature: x.nature === 'demo' ? 'demo' : 'real' })) : [{ label: 'Quota', value: 'Indisponible', sub: 'Non exposé par la source', nature: 'unavailable' }] }],
      followUps: ['Coût de la semaine'],
      nature: q[0]?.nature === 'demo' ? 'demo' : q.length ? 'real' : 'unavailable',
    };
  },

  tasks(p, ctx, events, nat) {
    const u = sumUsage(events);
    const { unit, rows } = bucketsOf(events, p.period.from, p.period.to);
    const done = events.filter((e) => e.type === 'task.completed').slice(-6).reverse();
    return {
      text: `${Cap(p.period.label)}${scopeText(p, ctx)}, ${fmtInt(u.tasksDone)} tâche(s) terminée(s) et ${fmtInt(u.tasksFailed)} échouée(s)${u.tasksDone + u.tasksFailed ? ` (réussite ${fmtPct(u.tasksDone / (u.tasksDone + u.tasksFailed))})` : ''}.`,
      blocks: [
        {
          kind: 'kpis',
          items: [
            { label: 'Terminées', value: fmtInt(u.tasksDone), nature: nat },
            { label: 'Échouées', value: fmtInt(u.tasksFailed), nature: nat },
            { label: 'Taux de réussite', value: u.tasksDone + u.tasksFailed ? fmtPct(u.tasksDone / (u.tasksDone + u.tasksFailed)) : 'Indisponible', nature: u.tasksDone + u.tasksFailed ? nat : 'unavailable' },
          ],
        },
        { kind: 'columns', title: `Tâches par ${fmtBucket(unit)}`, unit: 'count', nature: nat, bucket: unit, series: [{ key: 'done', label: 'Terminées', color: 'var(--series-3)' }, { key: 'failed', label: 'Échouées', color: 'var(--st-error)' }], points: rows.map((r) => ({ t: r.t, v: { done: r.done, failed: r.failed } })) },
        {
          kind: 'list',
          title: 'Dernières terminées',
          nature: nat,
          items: done.map((e) => ({ label: displaySummary(e, ctx.canViewConfidential) || 'Tâche', sub: `${ctx.catalog.agents.find((a) => a.id === e.actor?.id)?.name ?? '—'} · ${fmtTime(e.ts, true)}`, link: e.taskId ? { kind: 'task', id: e.taskId } : undefined })),
          empty: 'Aucune tâche terminée sur la période.',
        },
      ],
      followUps: ['Tâches en attente', 'Agents en erreur', 'Coût par tâche cette semaine'],
    };
  },

  models(p, ctx, events, nat) {
    const models = byModel(events);
    const total = models.reduce((s, m) => s + m.calls, 0);
    const cn = costNature(sumUsage(events), nat);
    return {
      text: models.length ? `${Cap(p.period.label)}${scopeText(p, ctx)}, ${fmtInt(total)} appels répartis sur ${models.length} modèle(s) ; ${modelLabel(models[0].model)} représente le plus gros coût.` : 'Aucun appel modèle sur la période.',
      blocks: [
        { kind: 'bars', title: 'Coût estimé par modèle', unit: 'usd', nature: cn, rows: models.map((m) => ({ key: m.model, label: modelLabel(m.model), value: m.costUsd, note: `${fmtInt(m.calls)} appels · ${total ? fmtPct(m.calls / total) : '—'}` })) },
        {
          kind: 'table',
          title: 'Détail par modèle',
          nature: nat,
          columns: [
            { key: 'm', label: 'Modèle' },
            { key: 'c', label: 'Appels', align: 'r' },
            { key: 't', label: 'Tokens', align: 'r' },
            { key: 'h', label: 'Cache', align: 'r', narrow: true },
            { key: 'l', label: 'Latence', align: 'r', narrow: true },
            { key: 'e', label: 'Erreurs', align: 'r', narrow: true },
          ],
          rows: models.map((m) => ({ cells: { m: modelLabel(m.model), c: fmtInt(m.calls), t: fmtCompact(m.tokensIn + m.tokensOut + m.cacheRead), h: m.cacheHitRate != null ? fmtPct(m.cacheHitRate) : '—', l: m.latencyAvgMs != null ? fmtDuration(m.latencyAvgMs) : '—', e: fmtInt(m.errors) } })),
        },
      ],
      followUps: ['Tokens par modèle sur 7 jours', 'Latence par modèle', 'Coût par modèle sur 30 jours'],
    };
  },

  agents(p, ctx, events, nat) {
    const done = new Map<string, number>();
    const cost = new Map<string, number>();
    for (const e of events) {
      if (!e.actor) continue;
      if (e.type === 'task.completed') done.set(e.actor.id, (done.get(e.actor.id) ?? 0) + 1);
      if (e.type === 'llm.call') cost.set(e.actor.id, (cost.get(e.actor.id) ?? 0) + (e.metrics?.costUsd ?? 0));
    }
    const agents = ctx.catalog.agents.filter((a) => a.kind !== 'human' && (!p.departments.length || a.departmentIds.some((d) => p.departments.includes(d))));
    const active = agents.filter((a) => {
      const s = ctx.state.agents[a.id]?.status;
      return s && s !== 'idle' && s !== 'offline';
    });
    return {
      text: `${active.length} agent(s) actif(s) sur ${agents.length}${scopeText(p, ctx)}. ${agents.filter((a) => ctx.state.agents[a.id]?.status === 'error').length} en erreur.`,
      blocks: [
        {
          kind: 'table',
          title: 'Agents',
          nature: nat,
          columns: [
            { key: 'n', label: 'Agent' },
            { key: 's', label: 'Statut' },
            { key: 't', label: 'Tâche actuelle', narrow: true },
            { key: 'd', label: 'Terminées', align: 'r' },
            { key: 'c', label: 'Coût estimé', align: 'r', narrow: true },
          ],
          rows: agents.map((a) => {
            const rt = ctx.state.agents[a.id];
            const task = rt?.currentTaskId ? ctx.state.tasks[rt.currentTaskId]?.title : undefined;
            return { cells: { n: a.name, s: rt ? STATUS_LABEL[rt.status] : 'Sans activité', t: task ?? '—', d: fmtInt(done.get(a.id) ?? 0), c: a.kind === 'llm' ? fmtUsd(cost.get(a.id) ?? 0) : 'sans modèle' }, link: { kind: 'agent', id: a.id } };
          }),
        },
      ],
      followUps: ['Agents en erreur', 'Coût par agent sur 30 jours', 'Gouverneur'],
    };
  },

  entity(p, ctx, events, nat) {
    if (p.agents.length) {
      const id = p.agents[0];
      const def = ctx.catalog.agents.find((a) => a.id === id)!;
      const rt = ctx.state.agents[id];
      const u = sumUsage(events);
      const current = rt?.currentTaskId ? ctx.state.tasks[rt.currentTaskId] : undefined;
      const recent = Object.values(ctx.state.tasks).filter((t) => t.agentId === id).sort((a, b) => (b.endedAt ?? b.startedAt ?? b.createdAt) - (a.endedAt ?? a.startedAt ?? a.createdAt)).slice(0, 6);
      return {
        text: `${def.name} (${def.role}) est ${rt ? STATUS_LABEL[rt.status].toLowerCase() : 'sans activité enregistrée'}${current ? `, sur « ${current.title} »` : ''}. ${Cap(p.period.label)} : ${fmtInt(u.tasksDone)} tâche(s) terminée(s)${def.kind === 'llm' ? `, ${fmtUsd(u.costEstimated + u.costMeasured)} estimés` : ', aucun modèle utilisé (moteur déterministe)'}.`,
        blocks: [
          {
            kind: 'kpis',
            items: [
              { label: 'Statut', value: rt ? STATUS_LABEL[rt.status] : 'Sans activité', sub: rt ? since(rt.statusSince, ctx.now) : undefined, nature: rt ? (rt.nature === 'demo' ? 'demo' : 'real') : 'unavailable' },
              { label: 'Tâches terminées', value: fmtInt(u.tasksDone), sub: `${fmtInt(u.tasksFailed)} échouée(s)`, nature: nat },
              def.kind === 'llm'
                ? { label: 'Coût estimé', value: fmtUsd(u.costEstimated + u.costMeasured), sub: `${fmtInt(u.llmCalls)} appels · ${modelLabel(rt?.model ?? def.model)}`, nature: costNature(u, nat) }
                : { label: 'Coût modèle', value: 'Aucun', sub: 'Moteur déterministe', nature: nat },
              { label: 'Erreurs', value: fmtInt(u.errors), nature: nat },
            ],
          },
          {
            kind: 'list',
            title: 'Tâches récentes',
            nature: nat,
            items: recent.map((t) => ({ label: t.title, sub: `${taskStatus[t.status]} · ${fmtRelative(t.endedAt ?? t.startedAt ?? t.createdAt, ctx.now)}`, tone: t.status === 'failed' ? 'error' : t.status === 'running' ? 'working' : undefined, link: { kind: 'task', id: t.id } })),
            empty: 'Aucune tâche enregistrée.',
          },
          { kind: 'list', title: 'Ouvrir', nature: nat, items: [{ label: `Fiche de ${def.name} dans l’inspecteur`, link: { kind: 'agent', id } }] },
        ],
        followUps: [`Coût du ${def.name} sur 7 jours`, 'Agents en erreur', 'Tâches en attente'],
      };
    }
    if (p.departments.length) {
      const id = p.departments[0];
      const d = ctx.catalog.departments.find((x) => x.id === id)!;
      const u = sumUsage(events);
      const agents = ctx.catalog.agents.filter((a) => a.departmentIds.includes(id));
      return {
        text: `${d.name} — ${d.mission}. ${Cap(p.period.label)} : ${fmtInt(u.tasksDone)} tâche(s) terminée(s), ${fmtInt(u.tasksFailed)} échouée(s), ${fmtUsd(u.costEstimated + u.costMeasured)} estimés.`,
        blocks: [
          {
            kind: 'kpis',
            items: [
              { label: 'Tâches terminées', value: fmtInt(u.tasksDone), nature: nat },
              { label: 'Échouées', value: fmtInt(u.tasksFailed), nature: nat },
              { label: 'Coût estimé', value: fmtUsd(u.costEstimated + u.costMeasured), nature: costNature(u, nat) },
            ],
          },
          { kind: 'list', title: 'Agents du département', nature: nat, items: agents.map((a) => ({ label: a.name, sub: `${a.role} · ${ctx.state.agents[a.id] ? STATUS_LABEL[ctx.state.agents[a.id].status] : 'sans activité'}`, tone: ctx.state.agents[a.id]?.status, link: { kind: 'agent', id: a.id } })) },
          { kind: 'list', title: 'Ouvrir', nature: nat, items: [{ label: `${d.name} dans l’inspecteur`, link: { kind: 'department', id } }] },
        ],
        followUps: ['Agents en erreur', 'Coût de la semaine'],
      };
    }
    const id = p.models[0];
    const m = byModel(events).find((x) => x.model === id);
    return {
      text: m ? `${modelLabel(id)} ${p.period.label} : ${fmtInt(m.calls)} appels, ${fmtCompact(m.tokensIn + m.tokensOut + m.cacheRead)} tokens, ${fmtUsd(m.costUsd)} estimés.` : `${modelLabel(id)} n’a reçu aucun appel ${p.period.label}.`,
      blocks: m
        ? [
            {
              kind: 'kpis',
              items: [
                { label: 'Appels', value: fmtInt(m.calls), nature: nat },
                { label: 'Coût estimé', value: fmtUsd(m.costUsd), nature: nat === 'demo' ? 'demo' : 'estimated' },
                { label: 'Cache', value: m.cacheHitRate != null ? fmtPct(m.cacheHitRate) : 'Indisponible', nature: m.cacheHitRate != null ? nat : 'unavailable' },
                { label: 'Latence moyenne', value: m.latencyAvgMs != null ? fmtDuration(m.latencyAvgMs) : 'Indisponible', nature: m.latencyAvgMs != null ? nat : 'unavailable' },
              ],
            },
          ]
        : [],
      followUps: ['Tokens par modèle sur 7 jours', 'Latence par modèle'],
    };
  },
};

function scoped(t: { agentId?: string; departmentId?: string }, p: Parsed) {
  return (!p.agents.length || (t.agentId && p.agents.includes(t.agentId))) && (!p.departments.length || (t.departmentId && p.departments.includes(t.departmentId)));
}

function columnsByModel(rows: BucketRow[], models: string[], metric: 'cost' | 'tokens', title: string, unit: 'hour' | 'day', nature: DataNature): Block {
  const top = models.slice(0, 5);
  return {
    kind: 'columns',
    title,
    unit: metric === 'cost' ? 'usd' : 'tokens',
    nature,
    bucket: unit,
    series: top.map((m, i) => ({ key: m, label: modelLabel(m), color: COLORS[i % COLORS.length] })),
    points: rows.map((r) => ({ t: r.t, v: Object.fromEntries(top.map((m) => [m, r.byModel[m]?.[metric] ?? 0])) })),
  };
}

function breakdown(events: readonly GovEvent[], by: 'agent' | 'department', ctx: AnswerCtx, metric: 'cost' | 'tokens', nature: DataNature): Block {
  const m = new Map<string, { v: number; calls: number }>();
  for (const e of events) {
    if (e.type !== 'llm.call') continue;
    const key = by === 'agent' ? e.actor?.id : e.department;
    if (!key) continue;
    const r = m.get(key) ?? { v: 0, calls: 0 };
    r.v += metric === 'cost' ? e.metrics?.costUsd ?? 0 : (e.metrics?.inputTokens ?? 0) + (e.metrics?.outputTokens ?? 0) + (e.metrics?.cacheReadTokens ?? 0) + (e.metrics?.cacheWriteTokens ?? 0);
    r.calls++;
    m.set(key, r);
  }
  const name = (id: string) => (by === 'agent' ? ctx.catalog.agents.find((a) => a.id === id)?.name : ctx.catalog.departments.find((d) => d.id === id)?.name) ?? id;
  return {
    kind: 'bars',
    title: `${metric === 'cost' ? 'Coût estimé' : 'Tokens'} par ${by === 'agent' ? 'agent' : 'département'}`,
    unit: metric === 'cost' ? 'usd' : 'tokens',
    nature,
    rows: [...m]
      .sort((a, b) => b[1].v - a[1].v)
      .slice(0, 10)
      .map(([id, r]) => ({ key: id, label: name(id), value: r.v, note: `${fmtInt(r.calls)} appels`, link: { kind: by === 'agent' ? 'agent' : 'department', id } })),
  };
}

/** Plain-text version for the clipboard. */
export function answerToText(a: Answer): string {
  const lines = [`Q : ${a.q}`, a.text, ''];
  for (const b of a.blocks) {
    if (b.kind === 'kpis') for (const k of b.items) lines.push(`• ${k.label} : ${k.value}${k.sub ? ` (${k.sub})` : ''} [${k.nature}]`);
    else if (b.kind === 'table') {
      lines.push(`${b.title}`);
      lines.push(b.columns.map((c) => c.label).join('\t'));
      for (const r of b.rows) lines.push(b.columns.map((c) => r.cells[c.key] ?? '').join('\t'));
    } else if (b.kind === 'list') {
      lines.push(b.title);
      for (const i of b.items) lines.push(`• ${i.label}${i.sub ? ` — ${i.sub}` : ''}`);
      if (!b.items.length && b.empty) lines.push(b.empty);
    } else if (b.kind === 'bars') {
      lines.push(b.title);
      for (const r of b.rows) lines.push(`• ${r.label} : ${fmtUnit(b.unit, r.value)}`);
    } else if (b.kind === 'columns' || b.kind === 'line' || b.kind === 'grouped') lines.push(`${b.title} (graphique)`);
    else if (b.kind === 'note') lines.push(b.text);
    lines.push('');
  }
  lines.push(`Calculé localement le ${fmtTime(a.at, true)}, sans modèle d’IA.`);
  return lines.join('\n').trim();
}
