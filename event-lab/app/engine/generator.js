// EVENT LAB — générateur de concepts par combinaison de briques (docs/07-algorithmes.md §2–3)
// Déterministe pour une graine donnée. Produit des SQUELETTES structurés, jamais de chiffres de marché ni de sources.

export const DIRECTIONS = {
  accessible: { label: 'Accessible et économique', slots: ['regles', 'mise_en_scene', 'monetisation'], profile: { cost: -3, complexity: -2, inclusion: 2 } },
  optimise: { label: 'Optimisé par rapport à l’existant', slots: ['regles', 'qualification', 'interaction_public'], profile: { ux_gain: 3, novelty: 1 } },
  premium: { label: 'Premium', slots: ['mise_en_scene', 'scenographie', 'son_lumiere', 'monetisation'], profile: { media: 2, revenue: 3 } },
  experimental: { label: 'Expérimental et disruptif', slots: ['regles', 'mecanique_jeu'], profile: { novelty: 4, complexity: -1 } },
  hybride: { label: 'Hybride physique et digital', slots: ['experience_digitale', 'creation_contenu'], profile: { media: 2, portability: 1 } },
  communautaire: { label: 'Communautaire et participatif', slots: ['interaction_public', 'fidelisation', 'mecanique_jeu'], profile: { inclusion: 2, ux_gain: 2 } },
};
export const OPTIONAL_SLOTS = ['qualification', 'recompenses', 'interaction_public', 'creation_contenu', 'fidelisation', 'activation_partenaire', 'monetisation'];

// Distance de transfert entre familles (07 §3) — valeurs par défaut, surchargées par la matrice de la bibliothèque si fournie.
const NEIGHBOURS = [['sport', 'esport'], ['musique_festival', 'spectacle'], ['tv_media', 'jeu'], ['parc_loisirs', 'exposition_immersive'], ['mode_luxe', 'activation_marque'], ['communautaire', 'universitaire']];
export function transferDistance(source, target, matrix) {
  if (matrix?.[source]?.[target] != null) return matrix[source][target];
  if (!source || !target) return 1;
  if (source === target) return 1; // même famille (la discipline exacte n'est pas connue au niveau brique)
  if (NEIGHBOURS.some(([a, b]) => (a === source && b === target) || (a === target && b === source))) return 2;
  return 3;
}

export function budgetTier(budget) {
  if (budget == null) return null;
  if (budget < 5000) return 0;
  if (budget < 30000) return 1;
  if (budget < 150000) return 2;
  if (budget < 1000000) return 3;
  return 4;
}

// PRNG déterministe (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RENTABLE_TECH = ['sono', 'ecran', 'chronometrage', 'eclairage_scenique', 'casques_audio', 'streaming'];

/** Normalise le brief et pose des hypothèses explicites pour les données manquantes (07 §2.1). */
export function normalizeBrief(brief = {}) {
  const hypotheses = [];
  const b = { ...brief };
  if (b.budget == null) { b.budget = 15000; hypotheses.push('Budget inconnu : hypothèse médiane 15 000 € (scénarios bas 5 000 € / haut 50 000 € à explorer).'); }
  if (b.capacity == null) { b.capacity = 400; hypotheses.push('Capacité inconnue : hypothèse 400 personnes simultanées.'); }
  if (b.staff == null) { b.staff = 20; hypotheses.push('Ressources humaines inconnues : hypothèse 20 personnes (bénévoles compris).'); }
  if (b.setting == null) { b.setting = 'interieur'; hypotheses.push('Type de lieu inconnu : hypothèse intérieur.'); }
  if (b.area_m2 == null) { b.area_m2 = 1000; hypotheses.push('Surface inconnue : hypothèse 1 000 m².'); }
  if (b.innovation == null) { b.innovation = 3; hypotheses.push('Niveau d’innovation non précisé : 3/5.'); }
  if (b.media_ambition == null) b.media_ambition = 3;
  b.tech = new Set([...(b.tech ?? []), 'aucune']);
  b.tier = budgetTier(b.budget);
  return { brief: b, hypotheses };
}

export function admissible(block, b) {
  const r = block.requirements ?? {};
  if ((r.budget_tier_min ?? 0) > b.tier) return false;
  if ((r.staff_min ?? 0) > b.staff) return false;
  if ((r.min_area_m2 ?? 0) > b.area_m2) return false;
  if (r.setting && r.setting !== 'indifferent' && b.setting !== 'mixte' && r.setting !== b.setting) return false;
  for (const t of r.tech ?? []) {
    if (b.tech.has(t)) continue;
    if (RENTABLE_TECH.includes(t) && b.tier >= 1) continue; // louable à partir du palier T1
    if (t === 'app_web' || t === 'billetterie_en_ligne') continue; // accessibles à faible coût
    return false;
  }
  return true;
}

export function utility(block, direction, ctx) {
  const prof = DIRECTIONS[direction].profile;
  const a = block.attributes ?? {};
  let u = 0;
  for (const [k, w] of Object.entries(prof)) u += w * (a[k] ?? 0) / 5;
  u += 0.5 * ((block.direction_fit?.[direction] ?? 2.5) / 5);
  const d = transferDistance(block.origin?.sector_family, ctx.targetFamily, ctx.matrix);
  u += (ctx.innovation / 5) * 2 * (d / 3);
  u -= ((5 - ctx.innovation) / 5) * ((a.complexity ?? 2.5) / 5);
  for (const s of ctx.selected) {
    if ((block.incompatible_with ?? []).includes(s.id) || (s.incompatible_with ?? []).includes(block.id)) return -Infinity;
    if ((block.compatible_with ?? []).includes(s.id) || (s.compatible_with ?? []).includes(block.id)) u += 1;
  }
  return u;
}

function softmaxPick(cands, scores, tau, rand) {
  const finite = cands.map((c, i) => [c, scores[i]]).filter(([, s]) => Number.isFinite(s));
  if (!finite.length) return null;
  const max = Math.max(...finite.map(([, s]) => s));
  const w = finite.map(([, s]) => Math.exp((s - max) / tau));
  const tot = w.reduce((x, y) => x + y, 0);
  let r = rand() * tot;
  for (let i = 0; i < finite.length; i++) { r -= w[i]; if (r <= 0) return finite[i][0]; }
  return finite[finite.length - 1][0];
}

const CRIT_MAP = {
  originalite: (a) => a.novelty,
  experience_utilisateur: (a) => a.ux_gain,
  faisabilite_technique: (a) => 5 - a.complexity,
  viabilite_economique: (a) => (a.revenue + (5 - a.cost)) / 2,
  potentiel_mediatique: (a) => a.media,
  reproductibilite: (a) => a.portability,
  adaptabilite_lieux: (a) => a.portability,
  accessibilite_inclusion: (a) => a.inclusion,
  potentiel_commercial: (a) => a.revenue,
  responsabilite_environnementale: (a) => a.eco_impact,
};

/** Pré-notation automatique (07 §2.8) — toujours « jugement_expert », à revoir par un humain. */
export function prescore(blocks) {
  const ratings = {};
  for (const [k, f] of Object.entries(CRIT_MAP)) {
    const vals = blocks.map((b) => f({ novelty: 2.5, ux_gain: 2.5, complexity: 2.5, cost: 2.5, media: 2.5, revenue: 2.5, inclusion: 2.5, eco_impact: 2.5, portability: 2.5, ...(b.attributes ?? {}) }));
    const avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : 2.5;
    ratings[k] = { rating: Math.max(0, Math.min(5, Math.round(avg * 2) / 2)), justification: 'Pré-notation automatique à partir des attributs des briques — à revoir.', evidence: 'jugement_expert' };
  }
  return ratings;
}

const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); const i = [...A].filter((x) => B.has(x)).length; return i / (A.size + B.size - i || 1); };

/**
 * Génère des squelettes de concepts.
 * @param {object} brief entrées du §2.1 (discipline, sector_family, budget, capacity, staff, setting, area_m2, tech[], innovation 1–5, media_ambition 1–5, objective…)
 * @param {Array} blocks bibliothèque de briques
 * @param {object} [opts] { seed, perDirection, directions, matrix, lambda }
 */
export function generate(brief, blocks, opts = {}) {
  const { brief: b, hypotheses } = normalizeBrief(brief);
  const seed = opts.seed ?? 42;
  const rand = rng(seed);
  const directions = opts.directions ?? Object.keys(DIRECTIONS);
  const perDirection = opts.perDirection ?? 4;
  const lambda = opts.lambda ?? 0.7;
  const pool = blocks.filter((x) => admissible(x, b));
  const tau = 0.3 + 0.2 * b.innovation;
  const results = [];
  const skipped = []; // directions sans proposition distincte (07 §2.7)

  for (const dir of directions) {
    const cands = [];
    for (let n = 0; n < perDirection; n++) {
      const selected = [];
      const ctx = { innovation: b.innovation, targetFamily: b.sector_family ?? 'sport', matrix: opts.matrix, selected };
      const slots = [...DIRECTIONS[dir].slots, ...OPTIONAL_SLOTS.filter((s) => !DIRECTIONS[dir].slots.includes(s))];
      const missing = [];
      for (const [i, slot] of slots.entries()) {
        const mandatory = i < DIRECTIONS[dir].slots.length;
        if (!mandatory && selected.length >= 7) break;
        const options = pool.filter((x) => x.type === slot && !selected.includes(x));
        if (!options.length) { if (mandatory) missing.push(slot); continue; }
        const pick = softmaxPick(options, options.map((o) => utility(o, dir, ctx)), tau, rand);
        if (pick) selected.push(pick);
        else if (mandatory) missing.push(slot);
      }
      if (missing.length) continue;
      const ratings = prescore(selected);
      const pre = Object.entries(ratings).reduce((s, [k, r]) => s + ({ originalite: 12, experience_utilisateur: 15, faisabilite_technique: 15, viabilite_economique: 15, potentiel_mediatique: 10, reproductibilite: 10, adaptabilite_lieux: 8, accessibilite_inclusion: 5, potentiel_commercial: 5, responsabilite_environnementale: 5 }[k] * r.rating) / 5, 0);
      cands.push({ direction: dir, blocks: selected, ratings, prescore: Math.round(pre) });
    }
    // Diversité (MMR) : on garde le meilleur candidat de la direction, distinct des concepts déjà retenus
    let best = null, bestVal = -Infinity;
    for (const c of cands) {
      const sim = Math.max(0, ...results.map((r) => jaccard(c.blocks.map((x) => x.id), r.blocks.map((x) => x.id))));
      if (sim > 0.5) continue;
      const v = lambda * (c.prescore / 100) - (1 - lambda) * sim;
      if (v > bestVal) { bestVal = v; best = c; }
    }
    if (best) results.push(best);
    else skipped.push(dir);
  }

  return {
    seed, hypotheses, admissibleBlocks: pool.length, skippedDirections: skipped,
    concepts: results.map((c, i) => ({
      id: `gen-${seed}-${i + 1}`,
      version: '0.1.0', status: 'draft', maturity: 'concept', parent: null,
      identity: { name: `Concept ${DIRECTIONS[c.direction].label}`, tagline: 'À nommer', disciplines: b.discipline ? [b.discipline] : [], directions: [c.direction], objectives: b.objective ? [b.objective] : [] },
      format: { summary: c.blocks.map((x) => x.name).join(' + '), building_blocks: c.blocks.map((x) => ({ block_id: x.id, type: x.type, label: x.name })) },
      evaluation: { type: 'previsionnelle', ratings: c.ratings },
      hypotheses: [...hypotheses],
      generation: { brief: { ...brief }, seed },
      x_prescore: c.prescore,
    })),
  };
}
