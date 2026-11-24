/**
 * Inbox — deterministic derivations used by the code-review style detail.
 * Everything comes from the decision record, the catalog and the event log.
 * Where the governor does not hold the data (e.g. the text of instructions),
 * the derivation says so; in demo mode an illustrative diff is produced and
 * explicitly labelled "simulé".
 */
import { describePolicy, fmtUsd, modelLabel, type Catalog, type ConnectorState, type DataNature, type Decision, type GovEvent, type GovernorState } from '@sdk';

export const DAY = 86_400_000;
export const HOUR = 3_600_000;

export const RISK_LABEL: Record<Decision['risk'], string> = { low: 'Risque faible', medium: 'Risque modéré', high: 'Risque élevé' };
export const REV_LABEL: Record<Decision['reversibility'], string> = { reversible: 'Réversible', partial: 'Partiellement réversible', irreversible: 'Irréversible' };
export const VERDICT_LABEL = { go: 'GO', nogo: 'NO GO', test: 'TEST' } as const;
const CONN_LABEL: Record<ConnectorState['status'], string> = { connected: 'connecté', degraded: 'dégradé', disconnected: 'déconnecté', 'auth-required': 'authentification requise' };

/* ------------------------------------------------------------------ */
/* Changes                                                             */
/* ------------------------------------------------------------------ */

export interface ParamChange {
  label: string;
  before: string;
  after: string;
  nature?: DataNature;
}
export interface DiffLine {
  kind: 'ctx' | 'add' | 'del' | 'hunk';
  text: string;
  a?: number;
  b?: number;
}
export interface Changes {
  kind: 'text' | 'params';
  /** True when the content is illustrative (demo data). */
  simulated: boolean;
  /** For text diffs, when the governor cannot see the text. */
  unavailable?: string;
  target: string;
  params: ParamChange[];
  diff: DiffLine[];
  added: number;
  removed: number;
  source: string;
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function modelsIn(text: string, catalog: Catalog): string[] {
  const t = norm(text);
  const found: Array<{ id: string; at: number }> = [];
  for (const n of catalog.nodes) {
    if (n.kind !== 'model') continue;
    const at = t.indexOf(norm(n.label));
    if (at >= 0) found.push({ id: n.id, at });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

function engineOf(d: Decision, catalog: Catalog): string | undefined {
  const dept = catalog.departments.find((x) => x.id === d.departmentId);
  return dept?.engineIds.find((e) => e !== 'you');
}

/** Topics an instruction rewrite may touch, detected in the proposal text. */
const TOPICS: Array<{ key: string; words: string[]; conflict: [string, string]; merged: string }> = [
  { key: 'ton', words: ['ton'], conflict: ['Adopte un ton chaleureux et familier.', 'Reste strictement formel en toutes circonstances.'], merged: 'Ton : professionnel et direct, chaleureux sans familiarité.' },
  { key: 'longueur', words: ['longueur', 'long', 'court'], conflict: ['Sois toujours exhaustif et détaillé.', 'Réponds en trois phrases au maximum.'], merged: 'Longueur : synthèse d’abord (3 phrases), détails sur demande.' },
  { key: 'format', words: ['format', 'markdown', 'liste'], conflict: ['Utilise des listes à puces partout.', 'N’utilise jamais de listes.'], merged: 'Format : listes uniquement pour les étapes et les comparaisons.' },
  { key: 'langue', words: ['langue', 'anglais', 'francais'], conflict: ['Réponds dans la langue de la question.', 'Réponds toujours en français.'], merged: 'Langue : celle de la question, français par défaut.' },
];

function instructionDiff(d: Decision): DiffLine[] {
  const text = norm(`${d.title} ${d.rationale} ${d.impact}`);
  const hit = TOPICS.filter((t) => t.words.some((w) => text.includes(w)));
  const topics = hit.length ? hit : TOPICS.slice(0, 2);
  const lines: DiffLine[] = [{ kind: 'hunk', text: `@@ consignes système · ${topics.map((t) => t.key).join(', ')} @@` }];
  let a = 12;
  let b = 12;
  lines.push({ kind: 'ctx', text: 'Tu es le Gouverneur : tu orchestres les agents et proposes les arbitrages.', a: a++, b: b++ });
  for (const t of topics) {
    lines.push({ kind: 'del', text: t.conflict[0], a: a++ });
    lines.push({ kind: 'del', text: t.conflict[1], a: a++ });
  }
  for (const t of topics) lines.push({ kind: 'add', text: t.merged, b: b++ });
  lines.push({ kind: 'add', text: 'En cas de conflit entre consignes, la plus récente validée par la direction prévaut.', b: b++ });
  lines.push({ kind: 'ctx', text: 'Cite tes sources dès que tu t’appuies sur un document.', a: a++, b: b++ });
  return lines;
}

export function changesOf(d: Decision, catalog: Catalog, state: GovernorState): Changes {
  const simulated = d.nature === 'demo';
  const text = `${d.title} ${d.impact} ${d.rationale}`;
  const t = norm(text);
  const source = simulated ? 'Diff simulé pour la démo, dérivé du titre, de la justification et de l’impact de la proposition.' : 'Dérivé du titre, de la justification et de l’impact de la proposition.';

  if (d.durable) {
    const engine = engineOf(d, catalog);
    const target = `Consignes système${t.includes('gouverneur') ? ' du Gouverneur' : engine ? ` (${catalog.agents.find((a) => a.id === engine)?.name ?? engine})` : ''}`;
    if (!simulated) {
      return {
        kind: 'text', simulated, target, params: [], diff: [], added: 0, removed: 0, source,
        unavailable: 'Le texte des consignes n’est jamais transmis au gouverneur (métadonnées uniquement) : le diff exact n’est pas disponible. Consultez la proposition dans l’outil source.',
      };
    }
    const diff = instructionDiff(d);
    return { kind: 'text', simulated, target, params: [], diff, added: diff.filter((l) => l.kind === 'add').length, removed: diff.filter((l) => l.kind === 'del').length, source };
  }

  const params: ParamChange[] = [];
  const models = modelsIn(text, catalog);
  let target = 'Configuration du gouverneur';

  if (t.includes('banc d') || t.includes('benchmark') || / vs /.test(t)) {
    target = 'Banc d’essai';
    const scope = /sur (les |le |la |l')?([^.,;]+)/i.exec(d.title)?.[2];
    params.push({ label: 'Comparaison planifiée', before: 'aucune', after: models.length ? models.map((m) => modelLabel(m)).join(' vs ') : d.title });
    if (scope) params.push({ label: 'Périmètre', before: '—', after: scope.trim() });
    params.push({ label: 'Routage en production', before: 'inchangé', after: 'inchangé (test isolé)' });
  } else if (d.departmentId === 'routing' || t.includes('router') || t.includes('routage')) {
    target = 'Règles de routage des modèles';
    const scope = /router (l[ae] |les |l')?(.+?) vers/i.exec(d.title)?.[2] ?? 'tâches concernées';
    const engine = t.includes('veille') ? 'scout' : engineOf(d, catalog);
    const before = (engine && (state.agents[engine]?.model ?? catalog.agents.find((a) => a.id === engine)?.model)) || undefined;
    const after = models[models.length - 1];
    params.push({ label: `Modèle · ${scope}`, before: before ? modelLabel(before) : 'modèle actuel', after: after ? modelLabel(after) : 'nouveau modèle' });
    params.push({ label: 'Règle', before: 'routage par défaut', after: `${scope} → ${after ? modelLabel(after) : '?'}` });
  } else if (t.includes('cache')) {
    target = 'Cache de prompt';
    const ttl = /(\d+)\s*(h|min)\b/i.exec(d.title);
    params.push({ label: 'Cache de prompt', before: 'désactivé', after: `activé${ttl ? ` (durée ${ttl[1]} ${ttl[2]})` : ''}` });
    params.push({ label: 'Préfixe mis en cache', before: '—', after: 'consignes + contexte stable' });
  } else if (t.includes('connect') || Object.values(state.connectors).some((c) => t.includes(norm(c.name)))) {
    const c = Object.values(state.connectors).find((x) => t.includes(norm(x.name)));
    target = c ? `Connecteur ${c.name}` : 'Connecteurs';
    params.push({ label: c ? `État de ${c.name}` : 'État du connecteur', before: c ? CONN_LABEL[c.status] : 'inconnu', after: 'reconnecté (nouveau jeton)', nature: c ? c.nature : 'unavailable' });
    const pause = /(\d+)\s*min/i.exec(d.impact);
    if (pause) params.push({ label: 'Interruption prévue', before: '—', after: `${pause[1]} min` });
  } else if (t.includes('relance') || t.includes('automati')) {
    target = 'Planificateur';
    params.push({ label: 'Relance automatique des échecs', before: 'désactivée', after: 'activée' });
    params.push({ label: 'Déclencheur', before: '—', after: 'échec transitoire (délai, 5xx)' });
  } else {
    const verb = /^(activer|désactiver|desactiver|réduire|augmenter)\s+(.+)$/i.exec(d.title);
    params.push(
      verb
        ? { label: verb[2], before: /^activer/i.test(verb[1]) ? 'désactivé' : 'actuel', after: /^activer/i.test(verb[1]) ? 'activé' : verb[1].toLowerCase() }
        : { label: 'Proposition', before: 'état actuel', after: d.title },
    );
  }
  if (d.costDeltaUsd != null && d.costDeltaUsd !== 0) params.push({ label: 'Dépense supplémentaire', before: fmtUsd(0), after: `${d.costDeltaUsd > 0 ? '+' : ''}${fmtUsd(d.costDeltaUsd)}`, nature: 'estimated' });
  return { kind: 'params', simulated, target, params, diff: [], added: params.length, removed: params.length, source };
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

export interface Check {
  id: string;
  label: string;
  state: 'pass' | 'warn' | 'fail' | 'info' | 'unknown';
  value: string;
  detail?: string;
  nature?: DataNature;
}

const CONFIRM_TEXT = { none: 'aucune confirmation', simple: 'confirmation simple', explicit: 'confirmation explicite', typed: 'saisie de « CONFIRMER »' } as const;

/** Read from the gateway's own policy (describePolicy), so the label can never drift from what will be asked. */
export function confirmationFor(d: Decision, verdict: 'go' | 'test' | 'nogo'): string {
  return CONFIRM_TEXT[describePolicy({ type: 'decision.resolve', decisionId: d.id, verdict, durable: d.durable, costDeltaUsd: d.costDeltaUsd }).confirm];
}

export function checksOf(d: Decision): Check[] {
  const out: Check[] = [];
  out.push({ id: 'risk', label: 'Niveau de risque', state: d.risk === 'low' ? 'pass' : d.risk === 'medium' ? 'warn' : 'fail', value: RISK_LABEL[d.risk], detail: 'Évalué par le proposeur, repris tel quel.' });
  out.push({ id: 'rev', label: 'Réversibilité', state: d.reversibility === 'reversible' ? 'pass' : d.reversibility === 'partial' ? 'warn' : 'fail', value: REV_LABEL[d.reversibility] });
  out.push({ id: 'durable', label: 'Changement durable des instructions', state: d.durable ? 'warn' : 'pass', value: d.durable ? 'Oui — journalisé, réversible seulement par une nouvelle décision' : 'Non' });
  if (d.costDeltaUsd != null && d.costDeltaUsd !== 0)
    out.push({ id: 'cost', label: 'Écart de coût', state: d.costDeltaUsd > 0 ? 'warn' : 'pass', value: `${d.costDeltaUsd > 0 ? '+' : ''}${fmtUsd(d.costDeltaUsd)}`, nature: 'estimated', detail: 'Estimation du proposeur (tokens × tarif catalogue).' });
  else out.push({ id: 'cost', label: 'Écart de coût', state: 'unknown', value: 'Non chiffré en dollars', nature: 'unavailable', detail: d.impact ? `Impact annoncé : ${d.impact}` : 'La proposition n’annonce pas de coût.' });
  out.push({ id: 'quality', label: 'Impact sur la qualité', state: 'unknown', value: 'Indisponible', nature: 'unavailable', detail: 'Aucun contrôle qualité n’est rattaché à cette proposition. Un verdict TEST permet de le mesurer sur un périmètre limité.' });
  out.push({ id: 'perm', label: 'Permission requise', state: 'info', value: 'Arbitrer les décisions (rôle Propriétaire)', detail: 'Vérifiée par la passerelle au moment de l’action.' });
  out.push({ id: 'confirm', label: 'Confirmation demandée', state: 'info', value: `GO : ${confirmationFor(d, 'go')} · TEST : ${confirmationFor(d, 'test')} · NO GO : ${confirmationFor(d, 'nogo')}` });
  return out;
}

/* ------------------------------------------------------------------ */
/* Objects touched                                                     */
/* ------------------------------------------------------------------ */

export interface TouchedObject {
  id: string;
  label: string;
  kind: string;
  group: string;
  mark: 'M' | 'A' | 'L';
  note?: string;
}

const KIND_LABEL: Record<string, string> = {
  agent: 'agent LLM', service: 'service', model: 'modèle', provider: 'fournisseur', connector: 'connecteur', mcp: 'serveur MCP', skill: 'skill', database: 'base', queue: 'file', process: 'processus', user: 'personne', department: 'département', tool: 'outil',
};

export function objectsOf(d: Decision, catalog: Catalog, state: GovernorState): TouchedObject[] {
  const out = new Map<string, TouchedObject>();
  const t = norm(`${d.title} ${d.impact} ${d.rationale}`);
  const dept = catalog.departments.find((x) => x.id === d.departmentId);
  if (dept) out.set(`dept:${dept.id}`, { id: `dept:${dept.id}`, label: dept.name, kind: 'département', group: 'Organisation', mark: 'M', note: dept.mission });
  const engines = dept?.engineIds.filter((e) => e !== 'you') ?? [];
  for (const id of engines) {
    const a = catalog.agents.find((x) => x.id === id);
    if (a) out.set(`agent:${id}`, { id: `agent:${id}`, label: a.name, kind: a.kind === 'llm' ? 'agent LLM' : a.kind === 'script' ? 'script' : 'service', group: 'Moteurs', mark: d.durable && t.includes(norm(a.name)) ? 'M' : 'L', note: a.role });
  }
  if (t.includes('gouverneur') && !out.has('agent:governor')) {
    const a = catalog.agents.find((x) => x.id === 'governor');
    if (a) out.set('agent:governor', { id: 'agent:governor', label: a.name, kind: 'agent LLM', group: 'Moteurs', mark: d.durable ? 'M' : 'L', note: a.role });
  }
  for (const n of catalog.nodes) {
    const label = norm(n.label.replace(/\s*\(.*\)\s*/, ''));
    if (label.length > 3 && t.includes(label) && !out.has(`agent:${n.id}`))
      out.set(`node:${n.id}`, { id: `node:${n.id}`, label: n.label, kind: KIND_LABEL[n.kind] ?? n.kind, group: 'Ressources', mark: 'M' });
  }
  for (const c of Object.values(state.connectors)) {
    if (t.includes(norm(c.name)) && !out.has(`node:${c.id}`)) out.set(`node:${c.id}`, { id: `node:${c.id}`, label: c.name, kind: 'connecteur', group: 'Ressources', mark: 'M', note: CONN_LABEL[c.status] });
  }
  if (d.durable) out.set('node:prefs-db', { id: 'node:prefs-db', label: 'Préférences et consignes', kind: 'base', group: 'Ressources', mark: 'M', note: 'Consignes système versionnées' });
  if (t.includes('banc') || t.includes('benchmark')) out.set('new:bench-run', { id: 'new:bench-run', label: 'Exécution de banc d’essai', kind: 'tâche', group: 'Ressources', mark: 'A', note: 'Créée seulement si GO ou TEST' });
  // Direct dependencies of the engines (read only).
  for (const e of catalog.edges) {
    if (!engines.includes(e.from)) continue;
    const n = catalog.nodes.find((x) => x.id === e.to);
    if (!n || out.has(`node:${n.id}`) || out.has(`agent:${n.id}`)) continue;
    if ([...out.values()].filter((o) => o.mark === 'L' && o.group === 'Dépendances').length >= 4) break;
    out.set(`node:${n.id}`, { id: `node:${n.id}`, label: n.label, kind: KIND_LABEL[n.kind] ?? n.kind, group: 'Dépendances', mark: 'L' });
  }
  return [...out.values()];
}

/* ------------------------------------------------------------------ */
/* Related events                                                      */
/* ------------------------------------------------------------------ */

const RELATED = new Set<GovEvent['type']>(['recommendation', 'connector.status', 'security.incident', 'update.detected', 'config.changed', 'optimization.applied', 'task.failed', 'skill.updated']);

function lowerBound(events: readonly GovEvent[], ts: number) {
  let lo = 0;
  let hi = events.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (events[mid].ts < ts) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function relatedEvents(d: Decision, events: readonly GovEvent[], now: number, limit = 6): { before: GovEvent[]; resolution?: GovEvent } {
  const from = d.proposedAt - 3 * DAY;
  const to = Math.min(now, d.resolvedAt ?? now);
  const before: GovEvent[] = [];
  let resolution: GovEvent | undefined;
  for (let i = lowerBound(events, from); i < events.length && events[i].ts <= now; i++) {
    const e = events[i];
    if (e.type === 'decision.resolved' && e.attrs?.decisionId === d.id) resolution = e;
    if (e.ts > to) continue;
    if (!RELATED.has(e.type) || e.department !== d.departmentId) continue;
    before.push(e);
  }
  return { before: before.slice(-limit), resolution };
}

export function shortDecisionId(id: string) {
  return id.replace(/^dec-/, '');
}
