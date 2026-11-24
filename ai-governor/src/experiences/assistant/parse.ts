/**
 * Deterministic French intent parser — keywords + entity extraction.
 * No model, no network: the same question always gives the same reading,
 * and the UI shows exactly what was understood.
 */
import type { Catalog } from '@sdk';

export type IntentId =
  | 'help' | 'compare' | 'recap' | 'decisions' | 'cache' | 'incidents' | 'errors' | 'pending' | 'running' | 'cost' | 'tokens'
  | 'latency' | 'quality' | 'connectors' | 'skills' | 'quota' | 'tasks' | 'models' | 'agents' | 'entity';

export const INTENT_LABEL: Record<IntentId, string> = {
  help: 'Aide', compare: 'Comparaison', recap: 'Récapitulatif', decisions: 'Décisions', cache: 'Cache et économies', incidents: 'Incidents',
  errors: 'Erreurs', pending: 'Tâches en attente', running: 'Tâches en cours', cost: 'Coût', tokens: 'Tokens', latency: 'Latence', quality: 'Qualité',
  connectors: 'Connecteurs', skills: 'Skills', quota: 'Quota', tasks: 'Tâches', models: 'Modèles', agents: 'Agents', entity: 'Fiche',
};

export type PeriodKind = 'today' | 'yesterday' | 'dayBefore' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'days' | 'hours' | 'default';

export interface PeriodSpec {
  kind: PeriodKind;
  n?: number;
  from: number;
  to: number;
  label: string;
  /** Short label for chips, e.g. "7 j". */
  short: string;
}

export interface Parsed {
  raw: string;
  norm: string;
  intent: IntentId | null;
  period: PeriodSpec;
  explicitPeriod: boolean;
  agents: string[];
  departments: string[];
  models: string[];
  by: 'model' | 'agent' | 'department' | null;
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[^a-z0-9'$%/\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const DAY = 86_400_000;
const HOUR = 3_600_000;

export function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
export function startOfWeek(t: number) {
  const d = new Date(startOfDay(t));
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}
function startOfMonth(t: number) {
  const d = new Date(startOfDay(t));
  d.setDate(1);
  return d.getTime();
}

/** Resolves a period from the text; `fallback` is the period selected in the shell. */
export function parsePeriod(norm: string, now: number, fallback: { from: number; to: number; label: string; short: string }): { period: PeriodSpec; explicit: boolean } {
  const mk = (kind: PeriodKind, from: number, to: number, label: string, short: string, n?: number) => ({ period: { kind, from, to, label, short, n }, explicit: true });
  const sod = startOfDay(now);
  if (/avant[- ]hier/.test(norm)) return mk('dayBefore', sod - 2 * DAY, sod - DAY, 'avant-hier', 'avant-hier');
  const today = /aujourd'?\s?hui|\bce jour\b|\bdepuis ce matin\b|\bce matin\b/.test(norm);
  // "Compare aujourd'hui à hier": today is the period, yesterday the comparison base.
  if (/\bhier\b/.test(norm) && !today) return mk('yesterday', sod - DAY, sod, 'hier', 'hier');
  if (today) return mk('today', sod, now, 'aujourd’hui', 'aujourd’hui');
  if (/(semaine (derniere|precedente|passee)|la semaine d'avant)/.test(norm) && !/cette semaine/.test(norm)) {
    const sow = startOfWeek(now);
    return mk('lastWeek', sow - 7 * DAY, sow, 'la semaine dernière', 'sem. dernière');
  }
  if (/cette semaine|semaine en cours/.test(norm)) return mk('thisWeek', startOfWeek(now), now, 'cette semaine (depuis lundi)', 'cette semaine');
  if (/ce mois|mois en cours/.test(norm)) return mk('thisMonth', startOfMonth(now), now, 'ce mois-ci', 'ce mois');
  const h = /(\d{1,3})\s*(?:dernieres?\s*)?(?:heures?|h)\b/.exec(norm);
  if (h) {
    const n = Math.max(1, Math.min(24 * 90, Number(h[1])));
    return mk('hours', now - n * HOUR, now, n === 1 ? 'la dernière heure' : `les ${n} dernières heures`, `${n} h`, n);
  }
  if (/derniere heure/.test(norm)) return mk('hours', now - HOUR, now, 'la dernière heure', '1 h', 1);
  const d = /(\d{1,3})\s*(?:derniers?\s*)?(?:jours?|j)\b/.exec(norm);
  if (d) {
    const n = Math.max(1, Math.min(365, Number(d[1])));
    return mk('days', now - n * DAY, now, n === 1 ? 'les dernières 24 h' : `les ${n} derniers jours`, `${n} j`, n);
  }
  if (/\bmois\b/.test(norm)) return mk('days', now - 30 * DAY, now, 'les 30 derniers jours', '30 j', 30);
  if (/\bsemaine\b|\bhebdo/.test(norm)) return mk('days', now - 7 * DAY, now, 'les 7 derniers jours', '7 j', 7);
  if (/\bjournee\b|\b24 ?h\b/.test(norm)) return mk('hours', now - 24 * HOUR, now, 'les dernières 24 h', '24 h', 24);
  return { period: { kind: 'default', from: fallback.from, to: fallback.to, label: fallback.label, short: fallback.short }, explicit: false };
}

const RULES: Array<[IntentId, RegExp]> = [
  ['help', /^(aide|help|\?+)$|que (peux|sais)[- ]tu|qu'est[- ]ce que tu (peux|sais)|quelles? questions?|comment (ca|tu) marche|tu sais faire|exemples?/],
  ['compare', /compar|par rapport|\bvs\b|versus|evolution|progress|difference|ecart/],
  ['recap', /s'?est[- ]il passe|ce qui s'?est passe|quoi de neuf|\bresume\b|resumer|bilan|recap|synthese|faits? marquants?|nouveautes|quoi de nouveau/],
  ['decisions', /decision|arbitr|go ?\/? ?no ?go|\bvalider\b|approuv|propositions?/],
  ['cache', /\bcache|econom|evite|evites|epargn/],
  ['incidents', /incident|securit|secrets?\b|alertes?|menace/],
  ['errors', /erreur|echec|echou|plant|panne|bloque|en defaut|probleme|rate\b/],
  ['pending', /en attente|a faire|file d'attente|\bfile\b|pending|attendent|backlog/],
  ['running', /en cours|qui travaill|travaillent|occupes?|actifs?|actives?|en train/],
  ['cost', /\bcout|coute|couter|depens|factur|budget|\$|dollars?|\bprix\b|euros?|cher\b/],
  ['tokens', /token|jeton|consomm/],
  ['latency', /latence|lent|lenteur|rapide|temps de reponse|duree moyenne/],
  ['quality', /qualite|\bscore|fiabilit/],
  ['connectors', /connecteur|\bmcp\b|integration/],
  ['skills', /\bskills?\b|competence/],
  ['quota', /quota|limite d'usage|plafond/],
  ['tasks', /taches?|terminee|reussie|realisee|faites?\b|accompli/],
  ['models', /modeles?|routage|\bopus\b|\bsonnet\b|\bhaiku\b|fournisseur/],
  ['agents', /\bagents?\b|statuts?|equipe|qui fait/],
];

const DEPT_ALIASES: Record<string, { bare: string[]; qualified: string[] }> = {
  executive: { bare: ['direction', 'executive office'], qualified: ['executive'] },
  routing: { bare: ['model routing'], qualified: ['routage'] },
  tokens: { bare: ['token management', 'gestion des tokens'], qualified: ['tokens'] },
  context: { bare: ['context management', 'gestion du contexte'], qualified: ['contexte'] },
  skills: { bare: ['skill laboratory', 'laboratoire des skills'], qualified: ['skills', 'laboratoire'] },
  connectors: { bare: ['connector department'], qualified: ['connecteurs'] },
  instructions: { bare: ['instruction audit', 'audit des consignes', 'consignes'], qualified: ['instructions'] },
  quality: { bare: ['quality control'], qualified: ['qualite', 'controle qualite'] },
  finance: { bare: ['financial control', 'finance', 'comptabilite', 'controle financier'], qualified: ['finances'] },
  research: { bare: ['research department', 'veille technologique'], qualified: ['recherche', 'veille'] },
  security: { bare: ['cybersecurity', 'cybersecurite'], qualified: ['securite'] },
  automation: { bare: ['automation department', 'automatisation', 'automatisations'], qualified: ['automation'] },
  benchmark: { bare: ['benchmark laboratory', 'benchmark'], qualified: ['banc d\'essai'] },
  evolution: { bare: ['evolution department', 'amelioration continue'], qualified: ['evolution'] },
  archive: { bare: ['archive department', 'archives'], qualified: ['archive'] },
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (s: string) => new RegExp(`(^|[^a-z0-9])${esc(s)}($|[^a-z0-9])`);

export interface EntityIndex {
  agents: Array<{ id: string; re: RegExp }>;
  departments: Array<{ id: string; re: RegExp }>;
  models: Array<{ id: string; re: RegExp }>;
}

/** Built once per catalog. */
export function buildEntityIndex(catalog: Catalog): EntityIndex {
  const agents = catalog.agents
    .filter((a) => a.kind !== 'human')
    .flatMap((a) => [...new Set([normalize(a.name), normalize(a.id)])].filter((n) => n.length > 2).map((n) => ({ id: a.id, re: word(n) })));
  const departments = catalog.departments.flatMap((d) => {
    const al = DEPT_ALIASES[d.id];
    const bare = [...new Set([normalize(d.name), ...(al?.bare ?? [])])];
    const out = bare.map((n) => ({ id: d.id, re: word(n) }));
    for (const q of al?.qualified ?? []) out.push({ id: d.id, re: new RegExp(`(departement|pole|service|equipe|dept)\\s+(de la |du |des |de l'|d'|de )?${esc(q)}\\b`) });
    return out;
  });
  const models = catalog.nodes
    .filter((n) => n.kind === 'model')
    .flatMap((n) => {
      const label = normalize(n.label);
      const family = label.split(' ')[0];
      return [...new Set([label, normalize(n.id), family])].filter((x) => x.length > 2).map((x) => ({ id: n.id, re: word(x) }));
    });
  return { agents, departments, models };
}

export function parse(raw: string, now: number, ents: EntityIndex, fallback: { from: number; to: number; label: string; short: string }): Parsed {
  const norm = normalize(raw);
  const { period, explicit } = parsePeriod(norm, now, fallback);
  const hit = (list: Array<{ id: string; re: RegExp }>) => [...new Set(list.filter((e) => e.re.test(norm)).map((e) => e.id))];
  const agents = hit(ents.agents);
  const departments = hit(ents.departments);
  const models = hit(ents.models);
  let intent: IntentId | null = null;
  for (const [id, re] of RULES) {
    if (re.test(norm)) {
      intent = id;
      break;
    }
  }
  // "Tâches en attente" vs "décisions en attente": decisions already wins by order.
  // A bare model or agent name without a metric opens its card.
  if ((intent === 'models' && models.length === 1 && !/par modele|routage|compar/.test(norm)) || (!intent && (agents.length || departments.length || models.length))) intent = 'entity';
  if (intent === 'agents' && agents.length === 1) intent = 'entity';
  if (intent === 'running' && /\bagents?\b/.test(norm)) intent = 'agents';
  const by = /par modeles?|selon le modele|par moteur/.test(norm) ? 'model' : /par agents?/.test(norm) ? 'agent' : /par (departements?|poles?|services?)/.test(norm) ? 'department' : null;
  return { raw, norm, intent, period, explicitPeriod: explicit, agents, departments, models, by };
}

export const SUGGESTIONS = [
  'Coût de la semaine',
  'Agents en erreur',
  'Tokens par modèle sur 7 jours',
  'Tâches en attente',
  'Économies du cache',
  'Que s’est-il passé hier ?',
  'Compare cette semaine à la précédente',
];

export const MORE_SUGGESTIONS = [
  'Décisions en attente',
  'Coût par agent sur 30 jours',
  'Latence par modèle',
  'Qualité des résultats cette semaine',
  'Gouverneur',
  'Incidents de sécurité',
  'État des connecteurs',
  'Tâches terminées aujourd’hui',
];
