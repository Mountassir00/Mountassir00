// EVENT LAB — versionnement des configurations (docs/02-architecture-technique.md §5)

const FROZEN = new Set(['validated', 'archived']);

export class FrozenVersionError extends Error {
  constructor(config) {
    super(`La version ${config.version} de « ${config.id} » est ${config.status} : elle ne peut pas être modifiée. Créez une nouvelle version.`);
    this.name = 'FrozenVersionError';
  }
}

export function bump(version, level = 'minor') {
  const [M, m, p] = version.split('.').map(Number);
  if (level === 'major') return `${M + 1}.0.0`;
  if (level === 'minor') return `${M}.${m + 1}.0`;
  if (level === 'patch') return `${M}.${m}.${p + 1}`;
  throw new Error(`Niveau inconnu : ${level}`);
}

export function assertMutable(config) {
  if (FROZEN.has(config.status)) throw new FrozenVersionError(config);
}

/** Applique une modification à un brouillon ; refuse toute modification d'une version figée. */
export function edit(config, mutator) {
  assertMutable(config);
  const next = structuredClone(config);
  mutator(next);
  return next;
}

const today = () => new Date().toISOString().slice(0, 10);

/** Nouvelle version (draft) à partir de n'importe quelle version, sans jamais toucher à la source. */
export function newVersion(config, { level = 'minor', author = 'inconnu', summary = '', decisions = [], date = today() } = {}) {
  const next = structuredClone(config);
  next.version = bump(config.version, level);
  next.status = 'draft';
  next.parent = { id: config.id, version: config.version, relation: 'new_version' };
  next.history = [...(config.history ?? []), { version: next.version, date, author, summary: summary || `Nouvelle version depuis ${config.version}`, decisions, approved_by: null }];
  return next;
}

/** Clone ou adaptation à une autre ville / un autre lieu. */
export function derive(config, { relation = 'clone', newId, venue, city, author = 'inconnu', date = today() } = {}) {
  if (!['clone', 'city_adaptation', 'venue_adaptation'].includes(relation)) throw new Error(`Relation inconnue : ${relation}`);
  const next = structuredClone(config);
  next.id = newId ?? (relation === 'clone' ? `${config.id}-copie` : `${config.id}-${slug(city ?? venue?.city ?? venue?.name ?? 'adaptation')}`);
  next.version = '0.1.0';
  next.status = 'draft';
  next.parent = { id: config.id, version: config.version, relation };
  if (venue) next.venue = venue;
  if (next.evaluation) {
    next.evaluation = { ...next.evaluation, type: 'previsionnelle' };
    delete next.evaluation.computed;
  }
  next.history = [{ version: '0.1.0', date, author, summary: `${relation} de ${config.id}@${config.version}${city ? ` pour ${city}` : ''}`, decisions: [], approved_by: null }];
  return next;
}

const TRANSITIONS = {
  submit: { from: ['draft'], to: 'review' },
  request_changes: { from: ['review'], to: 'draft' },
  approve: { from: ['review'], to: 'validated' },
  archive: { from: ['validated'], to: 'archived' },
};

export function transition(config, action, { actor = 'inconnu', date = today() } = {}) {
  const t = TRANSITIONS[action];
  if (!t) throw new Error(`Action inconnue : ${action}`);
  if (!t.from.includes(config.status)) throw new Error(`Transition « ${action} » impossible depuis « ${config.status} »`);
  const next = structuredClone(config);
  next.status = t.to;
  const h = [...(next.history ?? [])];
  const last = h.findLast?.((x) => x.version === next.version) ?? h.filter((x) => x.version === next.version).pop();
  if (action === 'approve' && last) last.approved_by = actor;
  h.push({ version: next.version, date, author: actor, summary: `Transition ${action} → ${t.to}`, decisions: [], approved_by: action === 'approve' ? actor : null });
  next.history = h;
  return next;
}

/** Différences champ à champ entre deux configurations (chemins JSON). */
export function diff(a, b, path = '') {
  const out = [];
  const isObj = (x) => x && typeof x === 'object';
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) {
    if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path: path || '/', before: a, after: b });
    return out;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (path === '' && k === 'history') continue;
    const p = `${path}/${k}`;
    if (!(k in a)) out.push({ path: p, before: undefined, after: b[k] });
    else if (!(k in b)) out.push({ path: p, before: a[k], after: undefined });
    else out.push(...diff(a[k], b[k], p));
  }
  return out;
}

export function slug(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
