// EVENT LAB — unification des bases de connaissances BASK'EST LAB et EVENT LAB.
// Fonctions pures : aucune donnée n'est copiée ni réécrite, les fiches d'origine sont conservées intactes
// dans chaque entrée unifiée (champs `bk`, `el`, `entries`).
import type { ErrorCase, WatchSource } from '../model';
import type { ErrorEntry, WatchCatalogSource } from '../eventlab/types';

export type Origin = 'baskest' | 'eventlab';
export const ORIGIN_LABEL: Record<Origin, string> = { baskest: 'BASK’EST LAB', eventlab: 'EVENT LAB' };

const normUrl = (u: string) => {
  try {
    const p = new URL(u);
    return `${p.hostname.toLowerCase().replace(/^www\./, '')}${p.pathname.replace(/\/+$/, '')}`;
  } catch {
    return u.trim().toLowerCase();
  }
};

/** Domaine d'une URL, sans « www. » (clé de dédoublonnage de la veille). */
export function domainOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return u.trim().toLowerCase();
  }
}

// ---------------------------------------------------------------- Registre des erreurs

export type MergeReason = 'sources_communes' | 'meme_incident';

export interface UnifiedErrorSource {
  url?: string;
  title?: string;
  publisher?: string;
  /** EVENT LAB : fiabilité A–D ; BASK'EST : « vérifié » ou « probable ». */
  reliability?: string;
  note?: string;
  origins: Origin[];
}

export interface UnifiedError {
  key: string;
  origins: Origin[];
  title: string;
  /** Catégories BASK'EST et domaine EVENT LAB (clés brutes, sans traduction). */
  themes: string[];
  severity?: ErrorEntry['severity'];
  el?: ErrorEntry;
  bk: ErrorCase[];
  merge?: { reason: MergeReason; note: string };
  sources: UnifiedErrorSource[];
  ruleIds: string[];
}

/**
 * Rapprochements « même incident » vérifiés à la lecture des deux fiches (même événement, même date) :
 * documentation indépendante dans les deux registres, sources différentes. Liste fermée, revue humaine.
 */
export const SAME_INCIDENT_PAIRS: { el: string; bk: string; incident: string }[] = [
  { el: 'E-001', bk: 'err-files-stade-de-france-2022', incident: 'Finale de la Ligue des champions, Stade de France, 28 mai 2022' },
  { el: 'E-002', bk: 'err-securite-wembley-2021', incident: 'Finale de l’Euro 2020, Wembley, 11 juillet 2021' },
  { el: 'E-003', bk: 'err-securite-astroworld', incident: 'Astroworld Festival, Houston, novembre 2021' },
  { el: 'E-004', bk: 'err-securite-love-parade', incident: 'Love Parade, Duisbourg, 24 juillet 2010' },
  { el: 'E-010', bk: 'err-professionnalisme-fyre', incident: 'Fyre Festival, 2017' },
  { el: 'E-011', bk: 'err-restauration-woodstock-99', incident: 'Woodstock 1999' },
];

const BK_CONFIDENCE: Record<string, string> = { verifie: 'vérifié', probable: 'probable', estimation: 'estimation', hypothese: 'hypothèse', non_trouve: 'non trouvé' };
function bkSource(c: ErrorCase): UnifiedErrorSource {
  return { url: c.source.source, reliability: `${BK_CONFIDENCE[c.source.confidence] ?? c.source.confidence} (BASK’EST)`, note: c.source.note, origins: ['baskest'] };
}

function mergeSources(list: UnifiedErrorSource[]): UnifiedErrorSource[] {
  const out: UnifiedErrorSource[] = [];
  for (const s of list) {
    const k = s.url && /^https?:/.test(s.url) ? normUrl(s.url) : null;
    const prev = k ? out.find((o) => o.url && /^https?:/.test(o.url) && normUrl(o.url) === k) : undefined;
    if (prev) {
      prev.title ??= s.title;
      prev.publisher ??= s.publisher;
      prev.reliability = [prev.reliability, s.reliability].filter(Boolean).join(' ; ');
      prev.note = [prev.note, s.note].filter(Boolean).join(' ; ') || undefined;
      for (const o of s.origins) if (!prev.origins.includes(o)) prev.origins.push(o);
    } else out.push({ ...s, origins: [...s.origins] });
  }
  return out;
}

/**
 * Registre unique : chaque fiche EVENT LAB est fusionnée avec
 * 1) les cas BASK'EST dont elle est issue (tag `source:baskest-lab` et au moins une URL de source commune) ;
 * 2) le cas BASK'EST décrivant le même incident (SAME_INCIDENT_PAIRS).
 * Les cas BASK'EST restants et les fiches EVENT LAB restantes sont repris tels quels.
 */
export function unifyErrors(bkCases: ErrorCase[], elEntries: ErrorEntry[], sameIncident = SAME_INCIDENT_PAIRS): UnifiedError[] {
  const used = new Set<string>();
  const out: UnifiedError[] = [];
  for (const e of elEntries) {
    const elUrls = new Set(e.sources.filter((s) => s.url).map((s) => normUrl(s.url!)));
    let matched: ErrorCase[] = [];
    let merge: UnifiedError['merge'];
    if ((e.tags ?? []).includes('source:baskest-lab')) {
      matched = bkCases.filter((c) => !used.has(c.id) && c.source.source && elUrls.has(normUrl(c.source.source)));
      if (matched.length) merge = { reason: 'sources_communes', note: `Fiche EVENT LAB importée de l’observatoire BASK’EST (tag source:baskest-lab) ; ${matched.length} cas BASK’EST partagent au moins une source.` };
    }
    if (!matched.length) {
      const pair = sameIncident.find((p) => p.el === e.id);
      const c = pair && bkCases.find((x) => x.id === pair.bk && !used.has(x.id));
      if (pair && c) {
        matched = [c];
        merge = { reason: 'meme_incident', note: `Même incident documenté indépendamment dans les deux registres (${pair.incident}) ; rapprochement vérifié à la lecture des fiches.` };
      }
    }
    matched.forEach((c) => used.add(c.id));
    const sources = mergeSources([
      ...e.sources.map((s) => ({ url: s.url ?? s.internal_ref, title: s.title, publisher: s.publisher, reliability: s.reliability ? `fiabilité ${s.reliability} (EVENT LAB)` : undefined, origins: ['eventlab' as Origin] })),
      ...matched.map(bkSource),
    ]);
    out.push({
      key: matched.length ? [e.id, ...matched.map((c) => c.id)].join('+') : e.id,
      origins: matched.length ? ['eventlab', 'baskest'] : ['eventlab'],
      title: e.title,
      themes: [...new Set([e.domain, ...matched.map((c) => c.category)])],
      severity: e.severity,
      el: e,
      bk: matched,
      merge,
      sources,
      ruleIds: [...new Set(matched.flatMap((c) => c.ruleIds))],
    });
  }
  for (const c of bkCases) {
    if (used.has(c.id)) continue;
    out.push({ key: c.id, origins: ['baskest'], title: c.title, themes: [c.category], bk: [c], sources: [bkSource(c)], ruleIds: c.ruleIds });
  }
  return out;
}

// ---------------------------------------------------------------- Catalogue de veille

export type UnifiedWatchEntry = { origin: 'baskest'; src: WatchSource } | { origin: 'eventlab'; src: WatchCatalogSource };

export interface UnifiedWatchSource {
  domain: string;
  origins: Origin[];
  names: string[];
  entries: UnifiedWatchEntry[];
}

/** Catalogue unique dédoublonné par domaine (sans « www. ») ; toutes les fiches et URL d'origine sont conservées. */
export function unifyWatchSources(bk: WatchSource[], el: WatchCatalogSource[]): UnifiedWatchSource[] {
  const map = new Map<string, UnifiedWatchSource>();
  const add = (e: UnifiedWatchEntry) => {
    const d = domainOf(e.src.url);
    const cur = map.get(d) ?? { domain: d, origins: [], names: [], entries: [] };
    if (!cur.origins.includes(e.origin)) cur.origins.push(e.origin);
    if (!cur.names.includes(e.src.name)) cur.names.push(e.src.name);
    cur.entries.push(e);
    map.set(d, cur);
  };
  bk.forEach((src) => add({ origin: 'baskest', src }));
  el.forEach((src) => add({ origin: 'eventlab', src }));
  return [...map.values()];
}
