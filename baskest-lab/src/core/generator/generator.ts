import type {
  Audience,
  CompositionRule,
  Concept,
  Innovation,
  Mechanic,
  MechanicInstance,
  Objective,
  TeamSize,
  VenueType,
} from '../model';
import { createRng, pick, shuffle, type Rng } from '../rng';
import { analyzeConcept, type ConceptAnalysis } from '../pipeline';
import { ARCHETYPES, CONTENT_LIBRARY, EXPERIENCE_LIBRARY, NAME_PARTS, withElam } from './library';

/**
 * Générateur de concepts (exigence §6) : combine archétypes de formats,
 * mécaniques, innovations transposées, parcours spectateur et identité,
 * puis fait passer CHAQUE candidat par la chaîne complète (simulation,
 * planning, budget, implantation, règles, notation). Seuls les meilleurs
 * candidats éligibles sont proposés — avec leurs défauts visibles.
 */

export interface Brief {
  objectives: Objective[];
  audiences: Audience[];
  venueType: VenueType;
  venueId?: string;
  budgetTier: Concept['budgetTier'];
  scale: Concept['scale'];
  teamSizes?: TeamSize[];
  core?: Concept['core'];
  innovationLevel: 1 | 2 | 3 | 4 | 5;
  expectedSpectators: number;
  durationHours: number;
  propertyId?: string;
  count?: number;
  candidates?: number;
  seed?: number | string;
  runs?: number;
}

export interface Libraries {
  mechanics: Mechanic[];
  innovations: Innovation[];
}

const SIMULATED_DEFAULTS: Record<string, MechanicInstance['params']> = {
  handicap_start: { pointsPer100Elo: 1 },
  mercy_rule: { gap: 15 },
  double_points_final_minute: { seconds: 60 },
  joker_card: { seconds: 60 },
  public_zone_bonus: { everySeconds: 240 },
};

const COST_RANK = { tres_faible: 0, faible: 1, moyen: 2, eleve: 3 } as const;
const TIER_MAX_COST = { micro: 1, limite: 1, standard: 2, premium: 3 } as const;

function compositionFor(audiences: Audience[], rng: Rng): CompositionRule[] {
  const out: CompositionRule[] = [];
  if (audiences.includes('femmes'))
    out.push(
      rng() < 0.5
        ? { kind: 'mixite', description: 'Équipes mixtes', constraint: 'Au moins une joueuse sur le terrain en permanence' }
        : { kind: 'mixite', description: 'Tableau féminin dédié', constraint: 'Tableau 100 % féminin avec la même scène que le tableau masculin' },
    );
  if (audiences.includes('pmr'))
    out.push({ kind: 'handicap', description: 'Format inclusif', constraint: 'Une manche en basket fauteuil pour toutes les équipes (valides et handi)' });
  if (audiences.includes('familles') && audiences.includes('jeunes'))
    out.push({ kind: 'age', description: 'Intergénérationnel', constraint: 'Un joueur de moins de 16 ans et un de plus de 40 ans par équipe' });
  if (audiences.includes('eloignes_pratique'))
    out.push({ kind: 'niveau', description: 'Ouvert aux non-licenciés', constraint: 'Maximum 2 licenciés au-delà de la Régionale par équipe' });
  return out;
}

function nameFor(rng: Rng, used: Set<string>): { name: string; tagline: string; motif: string } {
  for (let i = 0; i < 50; i++) {
    const root = pick(rng, NAME_PARTS.roots);
    const head = pick(rng, NAME_PARTS.heads);
    const name = rng() < 0.5 ? `${root} ${head}` : `${head} ${NAME_PARTS.of[root] ?? `de ${root}`}`;
    if (!used.has(name)) {
      used.add(name);
      return { name, tagline: pick(rng, NAME_PARTS.taglines), motif: pick(rng, NAME_PARTS.motifs) };
    }
  }
  return { name: `Concept ${used.size + 1}`, tagline: pick(rng, NAME_PARTS.taglines), motif: pick(rng, NAME_PARTS.motifs) };
}

export function draftConcept(brief: Brief, lib: Libraries, rng: Rng, index: number, used = new Set<string>()): Concept {
  const sizes = brief.teamSizes?.length ? brief.teamSizes : ([1, 2, 3, 4, 5] as TeamSize[]);
  const archetypes = ARCHETYPES.filter((a) => a.sizes.some((s) => sizes.includes(s)));
  const arch = pick(rng, archetypes);
  const size = pick(rng, arch.sizes.filter((s) => sizes.includes(s)));
  const teams = arch.teams(brief.durationHours, size);
  const format = arch.build(size, teams);

  // Mécaniques de match simulées (lisibilité : 2 max)
  const matchMechs = lib.mechanics.filter((m) => m.simulated);
  const nMatch = brief.innovationLevel >= 4 ? 2 : brief.innovationLevel >= 2 ? 1 : 0;
  const chosen = shuffle(rng, matchMechs)
    .filter((m) => m.id !== 'handicap_start' || brief.audiences.includes('eloignes_pratique') || brief.audiences.includes('pmr'))
    .slice(0, nMatch);
  // Compétition non officielle : les dérogations aux règles FIBA/FFBB sont possibles
  format.match = { ...format.match, official: false, mechanics: chosen.map((m) => ({ id: m.id, params: SIMULATED_DEFAULTS[m.id] ?? {} })) };
  if (brief.innovationLevel >= 3 && rng() < 0.5 && size >= 3) format.match = withElam(format.match, size === 5 ? 9 : 5);

  // Mécaniques de structure / narration (hors match)
  const meta = shuffle(rng, lib.mechanics.filter((m) => !m.simulated)).slice(0, Math.min(3, brief.innovationLevel));
  const composition = compositionFor(brief.audiences, rng);
  if (composition.length) format.composition = composition;

  // Innovations compatibles avec le budget
  const maxCost = TIER_MAX_COST[brief.budgetTier];
  const innovations = shuffle(rng, lib.innovations.filter((x) => COST_RANK[x.cost.tier] <= maxCost))
    .sort((a, b) => b.mediaPotential - a.mediaPotential)
    .slice(0, 12);
  const pickedInnov = shuffle(rng, innovations).slice(0, Math.max(1, Math.min(3, brief.innovationLevel - 1)));

  // Parcours spectateur : 1 moment par phase (2 si budget confortable), filtré par coût
  const costCap = { micro: 0, limite: 1, standard: 2, premium: 3 }[brief.budgetTier];
  const phases = ['arrivee', 'ouverture', 'presentation', 'jeu', 'interruption', 'temps_fort', 'remise', 'apres'] as const;
  const experience = phases.flatMap((ph) => {
    const options = EXPERIENCE_LIBRARY.filter((e) => e.phase === ph && e.cost <= costCap);
    const prefer = options.filter((e) => e.audience?.some((a) => brief.audiences.includes(a)));
    const k = brief.budgetTier === 'premium' || brief.budgetTier === 'standard' ? 2 : 1;
    return shuffle(rng, [...prefer, ...options.filter((o) => !prefer.includes(o))])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, k)
      .map(({ cost: _c, ...m }) => m);
  });

  const content = shuffle(rng, CONTENT_LIBRARY).slice(0, brief.budgetTier === 'micro' ? 4 : 6);
  const id = nameFor(rng, used);
  const minors = brief.audiences.some((a) => a === 'enfants' || a === 'jeunes');
  const outdoor = ['terrain_exterieur', 'city_stade', 'place_publique', 'espace_temporaire'].includes(brief.venueType);
  const core: Concept['core'] = brief.core ?? (brief.objectives.includes('communaute') && rng() < 0.3 ? 'mixte' : 'match');
  const volunteers = Math.ceil(brief.expectedSpectators / 50 + teams / 4) + 3;

  const pitch = [
    `${arch.label} en ${size}c${size} pour ${teams} ${size === 1 ? 'joueurs' : 'équipes'}`,
    chosen.length ? `avec ${chosen.map((m) => m.name.toLowerCase()).join(' et ')}` : 'aux règles épurées',
    meta.length ? `; narration : ${meta.map((m) => m.name.toLowerCase()).join(', ')}` : '',
    pickedInnov.length ? `; inspiré de ${pickedInnov.map((x) => x.origin).join(', ')}` : '',
    '.',
  ].join(' ').replace(/\s+([;.,])/g, '$1');

  return {
    id: `gen-${String(brief.seed ?? 'x')}-${index}`,
    propertyId: brief.propertyId,
    title: id.name,
    pitch,
    identity: {
      name: id.name,
      tagline: id.tagline,
      palette: ['#0B1F3A', '#F26B1D', pick(rng, ['#C9A227', '#2E86AB', '#7FB069', '#E056A0', '#8E7CC3']), '#F5F1E8'],
      motif: id.motif,
      nameChecks: ['Recherche d’antériorité INPI (classes 41, 25, 28)', 'Recherche EUIPO / TMview', 'Disponibilité des comptes Instagram / TikTok / YouTube', 'Nom de domaine .fr / .com'],
    },
    objectives: brief.objectives,
    audiences: brief.audiences,
    venueType: brief.venueType,
    venueId: brief.venueId,
    scale: brief.scale,
    format,
    core,
    experience,
    content,
    innovationIds: pickedInnov.map((x) => x.id),
    budgetTier: brief.budgetTier,
    expectedSpectators: brief.expectedSpectators,
    durationHours: brief.durationHours,
    volunteersNeeded: volunteers,
    safety: {
      dps: brief.expectedSpectators > 0,
      insurance: true,
      authorizations: [
        'Convention de mise à disposition du lieu',
        ...(outdoor ? ['Autorisation d’occupation du domaine public / arrêté municipal'] : []),
        ...(brief.expectedSpectators > 1500 ? ['Déclaration en mairie (manifestation > 1 500 personnes)'] : []),
        'Débit de boissons temporaire (si buvette)',
        'Déclaration SACEM',
      ],
      minorsImageConsent: minors ? true : 'na',
      accessibility: ['Places PMR réservées et accompagnement', 'Parcours sans marche jusqu’aux tribunes et sanitaires', 'Annonces sous-titrées à l’écran'],
      runOffM: 2,
    },
    maturity: 'concept_documente',
    evidence: { documented: true, simulationRuns: 0, prototypeSessions: 0, pilotEditions: 0, editionsMeetingTargets: 0, replications: 0, otherTerritories: 0 },
    tags: ['genere', `archetype:${arch.id}`, ...meta.map((m) => `mech:${m.id}`)],
    createdAt: new Date().toISOString().slice(0, 19),
    version: 1,
    private: true,
  };
}

export function generateConcepts(brief: Brief, lib: Libraries): ConceptAnalysis[] {
  const rng = createRng(brief.seed ?? 'baskest');
  const used = new Set<string>();
  const n = brief.candidates ?? 8;
  const out: ConceptAnalysis[] = [];
  for (let i = 0; i < n; i++) {
    let c = draftConcept(brief, lib, rng, i, used);
    let a = analyzeConcept(c, { runs: brief.runs ?? 80, innovations: lib.innovations });
    // Auto-réparation : si le planning ne tient pas dans la journée, on réduit le format
    for (let k = 0; k < 4 && a.schedule.conflicts.some((x) => x.kind === 'non_planifie'); k++) {
      const fixed = shrinkFormat(c);
      if (!fixed) break;
      c = fixed;
      a = analyzeConcept(c, { runs: brief.runs ?? 80, innovations: lib.innovations });
    }
    out.push(a);
  }
  return out
    .sort((a, b) => Number(b.evaluation.eligible) - Number(a.evaluation.eligible) || b.evaluation.total - a.evaluation.total)
    .slice(0, brief.count ?? 3);
}

/** Laboratoire créatif : variante d'un concept (une seule modification, pour mesurer son effet). */
export function mutateConcept(c: Concept, lib: Libraries, seed: number | string): { concept: Concept; change: string } {
  const rng = createRng(seed);
  const next: Concept = structuredClone(c);
  next.id = `${c.id}-v${c.version + 1}`;
  next.version = c.version + 1;
  const moves = ['elam', 'mechanic', 'seeding', 'shorter'] as const;
  const move = pick(rng, moves);
  let change = '';
  if (move === 'elam' && next.format.match.end.type !== 'elam') {
    next.format.match = withElam(next.format.match, next.format.teamSize >= 4 ? 9 : 5);
    change = 'Fin de match au score cible (type Elam)';
  } else if (move === 'mechanic') {
    const pool = lib.mechanics.filter((m) => m.simulated && !next.format.match.mechanics.some((x) => x.id === m.id));
    if (next.format.match.mechanics.length >= 2) {
      const removed = next.format.match.mechanics.pop()!;
      change = `Retrait de la mécanique ${removed.id}`;
    } else if (pool.length) {
      const m = pick(rng, pool);
      next.format.match.mechanics.push({ id: m.id, params: SIMULATED_DEFAULTS[m.id] ?? {} });
      change = `Ajout de la mécanique « ${m.name} »`;
    }
  } else if (move === 'seeding') {
    next.format.stages = next.format.stages.map((s) => ({ ...s, seeding: s.seeding === 'random' ? 'snake' : 'random' }));
    change = 'Changement du tirage (têtes de série ↔ aléatoire)';
  } else {
    const e = next.format.match.end;
    if ('minutes' in e) next.format.match.end = { ...e, minutes: Math.max(3, e.minutes - 2) } as typeof e;
    change = 'Matchs raccourcis de 2 minutes';
  }
  return { concept: next, change: change || 'Aucune modification applicable' };
}

/** Réduit un format trop long pour la durée prévue (moins de rondes, puis moins d'équipes). */
export function shrinkFormat(c: Concept): Concept | null {
  const next: Concept = structuredClone(c);
  const dyn = next.format.stages.find((s) => ['swiss', 'points_race', 'ladder'].includes(s.type) && (s.rounds ?? 4) > 3);
  if (dyn) {
    dyn.rounds = (dyn.rounds ?? 4) - 1;
    next.tags = [...new Set([...next.tags, 'auto-ajuste'])];
    next.pitch = next.pitch.replace(/\s*\(format ajusté[^)]*\)/, '') + ` (format ajusté : ${dyn.rounds} rondes pour tenir dans la journée)`;
    return next;
  }
  const step = next.format.teamSize <= 3 ? 4 : 2;
  if (next.format.teams - step < 4) return null;
  next.format.teams -= step;
  next.tags = [...new Set([...next.tags, 'auto-ajuste'])];
  next.pitch = next.pitch.replace(/\s*\(format ajusté[^)]*\)/, '') + ` (format ajusté : ${next.format.teams} équipes pour tenir dans la journée)`;
  return next;
}
