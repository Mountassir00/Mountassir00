import type { CompetitionFormat, FairnessReport, MatchRules, SimTeam } from '../model';
import { createRng, normal, round, type Rng } from '../rng';
import { simulateMatch, zoneExpectedValues } from './match';
import { runTournament } from './tournament';

/**
 * Analyse Monte-Carlo d'un format : équité, suspense, durée, stratégies
 * dominantes, risques de manipulation et situations injustes.
 * C'est le "banc d'essai" avant tout passage sur le terrain (exigence §7).
 */

export interface AnalysisOptions {
  runs?: number;
  seed?: number | string;
  /** Écart-type des niveaux (Elo) si les équipes sont générées. 150 ≈ open amateur hétérogène. */
  ratingSpread?: number;
  teams?: SimTeam[];
  closeMargin?: number;
  /** Facteur temps réel / temps de jeu (arrêts, changements). */
  stoppageFactor?: number;
}

export const STRATEGY_ARCHETYPES: Record<string, Record<string, number>> = {
  equilibre: {},
  tout_interieur: { inside: 1, mid: 0.05, long: 0.02, logo: 0, power: 0 },
  tout_exterieur: { inside: 0.1, mid: 0.1, long: 1, logo: 0.1, power: 0.2 },
  chasse_aux_bonus: { inside: 0.2, mid: 0.05, long: 0.3, logo: 0.5, power: 1 },
};

export function syntheticTeams(n: number, spread: number, rng: Rng): SimTeam[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `T${String(i + 1).padStart(2, '0')}`,
    name: `Équipe ${i + 1}`,
    rating: Math.round(normal(rng, 1500, spread)),
  }));
}

function kendallTau(order: string[], truth: string[]): number {
  const pos = new Map(order.map((id, i) => [id, i]));
  let c = 0;
  let d = 0;
  for (let i = 0; i < truth.length; i++)
    for (let j = i + 1; j < truth.length; j++) {
      const a = pos.get(truth[i]);
      const b = pos.get(truth[j]);
      if (a === undefined || b === undefined) continue;
      if (a < b) c++;
      else d++;
    }
  return c + d === 0 ? 0 : (c - d) / (c + d);
}

/** Test des stratégies : à niveau égal, un profil de tir bat-il systématiquement le jeu équilibré ? */
export function strategyDominance(rules: MatchRules, games = 400, seed: number | string = 7) {
  const rng = createRng(seed);
  const out: { strategy: string; winRateVsBalanced: number }[] = [];
  const zoneIds = new Set(rules.zones.map((z) => z.id));
  for (const [name, mix] of Object.entries(STRATEGY_ARCHETYPES)) {
    if (name === 'equilibre') continue;
    // Une stratégie n'a de sens que si elle cible des zones existantes
    if (!Object.keys(mix).some((k) => zoneIds.has(k) && mix[k] >= 0.5)) continue;
    let wins = 0;
    for (let g = 0; g < games; g++) {
      const r = simulateMatch(
        rules,
        { id: 'S', name, rating: 1500, strategy: mix },
        { id: 'B', name: 'equilibre', rating: 1500 },
        rng,
      );
      if (r.winner === 'A') wins++;
    }
    out.push({ strategy: name, winRateVsBalanced: round(wins / games, 3) });
  }
  return out;
}

export function analyzeFormat(format: CompetitionFormat, opts: AnalysisOptions = {}): FairnessReport {
  const runs = opts.runs ?? 300;
  const rng = createRng(opts.seed ?? 2024);
  const closeMargin =
    opts.closeMargin ??
    (format.match.end.type === 'target' ? Math.max(2, Math.round(format.match.end.points * 0.15)) : 4);
  const stoppage = opts.stoppageFactor ?? (format.teamSize <= 3 ? 1.25 : 1.5);

  let bestWins = 0;
  let top4Wins = 0;
  let tauSum = 0;
  let upsets = 0;
  let close = 0;
  let totalMatches = 0;
  let deadRubbers = 0;
  const durations: number[] = [];
  let gMin = Infinity;
  let gMax = 0;
  let gSum = 0;
  let gCount = 0;
  let waitMaxRatio = 0;

  for (let r = 0; r < runs; r++) {
    const teams = opts.teams ?? syntheticTeams(format.teams, opts.ratingSpread ?? 150, rng);
    const truth = teams
      .slice()
      .sort((a, b) => b.rating - a.rating)
      .map((t) => t.id);
    const rating = new Map(teams.map((t) => [t.id, t.rating]));
    const run = runTournament(format, teams, rng);
    if (run.ranking[0] === truth[0]) bestWins++;
    if (truth.slice(0, 4).includes(run.ranking[0])) top4Wins++;
    tauSum += kendallTau(run.ranking, truth);
    for (const m of run.matches) {
      totalMatches++;
      const lowerWon = rating.get(m.winner)! < rating.get(m.loser)!;
      if (lowerWon) upsets++;
      if (Math.abs(m.scoreA - m.scoreB) <= closeMargin) close++;
      if (!m.stake) deadRubbers++;
      durations.push(m.minutes * stoppage);
    }
    const games = Object.values(run.gamesPerTeam);
    for (const g of games) {
      gMin = Math.min(gMin, g);
      gMax = Math.max(gMax, g);
      gSum += g;
      gCount++;
    }
    const waits = Object.values(run.waitMinutes);
    if (waits.length) {
      const mx = Math.max(...waits);
      const totalTime = run.matches.reduce((s, m) => s + m.minutes, 0);
      waitMaxRatio = Math.max(waitMaxRatio, totalTime ? mx / totalTime : 0);
    }
  }

  durations.sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / Math.max(1, durations.length);
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;

  const report: FairnessReport = {
    runs,
    pBestWins: round(bestWins / runs, 3),
    pTop4Wins: round(top4Wins / runs, 3),
    kendallTau: round(tauSum / runs, 3),
    upsetRate: round(upsets / Math.max(1, totalMatches), 3),
    closeGameRate: round(close / Math.max(1, totalMatches), 3),
    avgMatchMinutes: round(avg, 1),
    p95MatchMinutes: round(p95, 1),
    gamesPerTeam: { min: gMin === Infinity ? 0 : gMin, max: gMax, avg: round(gSum / Math.max(1, gCount), 2) },
    dominantStrategies: [],
    manipulationRisks: [],
    unfairSituations: [],
    verdict: 'equilibre',
    notes: [],
  };

  // --- Stratégies dominantes (exploitation d'une règle) ---
  const strat = strategyDominance(format.match);
  report.dominantStrategies = strat.filter((s) => s.winRateVsBalanced >= 0.58);
  const evs = zoneExpectedValues(format.match);
  const maxEv = Math.max(...evs.map((e) => e.ev));
  const minEv = Math.min(...evs.map((e) => e.ev));
  if (maxEv > minEv * 1.6) {
    const z = evs.find((e) => e.ev === maxEv)!;
    report.notes.push(
      `La zone "${z.zone}" rapporte ${round(maxEv, 2)} pt/tir contre ${round(minEv, 2)} pour la moins rentable : risque de jeu stéréotypé. Réduire sa valeur, limiter son accès (fenêtre de temps) ou réduire sa taille.`,
    );
  }

  // --- Risques de manipulation (structure) ---
  const deadRate = deadRubbers / Math.max(1, totalMatches);
  if (deadRate > 0.08)
    report.manipulationRisks.push(
      `${Math.round(deadRate * 100)} % des matchs se jouent sans enjeu (qualification déjà acquise ou perdue) : risque d'arrangement ou de match "géré". Programmer les derniers matchs de poule simultanément ou ajouter un enjeu (points de classement, tête de série).`,
    );
  const ids = new Set(format.match.mechanics.map((m) => m.id));
  if (ids.has('handicap_start'))
    report.manipulationRisks.push(
      "Handicap de points : incitation à sous-déclarer son niveau (sandbagging). Classer les équipes sur des résultats vérifiables (historique Bask'Est, niveau de championnat).",
    );
  if (ids.has('public_vote_mvp') || ids.has('public_zone_bonus'))
    report.manipulationRisks.push(
      'Vote du public : risque de mobilisation massive d’une communauté. Plafonner le poids du vote, vote en salle uniquement (QR code + billet), ou jury mixte.',
    );
  if (format.stages.some((s) => s.type === 'king_of_the_court'))
    report.manipulationRisks.push(
      'King of the Court : une équipe peut ralentir le jeu pour garder le terrain en fin de créneau. Imposer un score cible ou un temps limite par défi.',
    );

  // --- Situations injustes ---
  if (report.gamesPerTeam.min <= 1)
    report.unfairSituations.push(
      'Certaines équipes ne jouent qu’un seul match : mauvaise expérience joueur (déplacement, inscription payée). Prévoir une consolante ou des poules.',
    );
  if (report.gamesPerTeam.max >= report.gamesPerTeam.min * 3 && report.gamesPerTeam.min > 0)
    report.unfairSituations.push(
      `Écart de temps de jeu important (${report.gamesPerTeam.min} à ${report.gamesPerTeam.max} matchs selon les équipes).`,
    );
  if (waitMaxRatio > 0.6)
    report.unfairSituations.push(
      'File d’attente King of the Court : certaines équipes passent plus de 60 % du temps à attendre. Ouvrir un 2e terrain ou limiter la série du roi.',
    );
  const hasElim = format.stages.some((s) => s.type === 'single_elim');
  if (hasElim) {
    let size = 1;
    const entering = format.stages.length > 1 ? undefined : format.teams;
    if (entering) {
      while (size < entering) size *= 2;
      if (size !== entering)
        report.notes.push(`${size - entering} exemption(s) au 1er tour : avantage aux têtes de série, à annoncer clairement.`);
    }
  }
  if (report.p95MatchMinutes > 0 && report.p95MatchMinutes > report.avgMatchMinutes * 1.6)
    report.notes.push('Durée des matchs très variable : prévoir une limite de temps en plus du score cible.');

  // --- Verdict ---
  const n = format.teams;
  const randomBaseline = 1 / n;
  if (report.dominantStrategies.length || report.unfairSituations.length >= 2) report.verdict = 'desequilibre';
  else if (report.kendallTau < 0.3 || report.pBestWins < randomBaseline * 2) report.verdict = 'trop_aleatoire';
  else if (report.pBestWins > 0.7 && report.closeGameRate < 0.2) report.verdict = 'trop_previsible';
  else report.verdict = 'equilibre';

  return report;
}

/** Compare un format de base à une variante (ex. avec / sans mécanique). */
export function compareFormats(base: CompetitionFormat, variant: CompetitionFormat, opts: AnalysisOptions = {}) {
  const a = analyzeFormat(base, opts);
  const b = analyzeFormat(variant, opts);
  const keys = ['pBestWins', 'kendallTau', 'upsetRate', 'closeGameRate', 'avgMatchMinutes'] as const;
  return {
    base: a,
    variant: b,
    delta: Object.fromEntries(keys.map((k) => [k, round(b[k] - a[k], 3)])) as Record<(typeof keys)[number], number>,
  };
}

export const VERDICT_LABELS: Record<FairnessReport['verdict'], string> = {
  equilibre: 'équilibré',
  trop_aleatoire: 'trop aléatoire',
  trop_previsible: 'trop prévisible',
  desequilibre: 'déséquilibré',
};
