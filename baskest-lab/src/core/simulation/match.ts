import type { MatchRules, MechanicInstance, ShotZone, SimTeam } from '../model';
import { clamp, type Rng } from '../rng';

/**
 * Simulateur de match par possessions.
 *
 * Modèle volontairement simple et explicable (pas une prédiction de résultat
 * réel) : il sert à comparer des RÈGLES entre elles — durée, suspense,
 * équité, stratégies dominantes — pas à prédire qui gagnera.
 *
 * Hypothèses (documentées dans docs/05-moteur-simulation.md) :
 * - durée moyenne d'une possession ≈ 60 % du temps de possession (24 s → 14,4 s,
 *   ordre de grandeur NBA) ; 70 % pour les formats demi-terrain ;
 * - réussite = réussite de base de la zone ± avantage de niveau (tanh de l'écart Elo) ;
 * - balles perdues 12 %, rebond offensif 25 % ;
 * - rendements décroissants : sur-utiliser une zone réduit sa réussite (la défense s'adapte) ;
 * - temps réel = temps de jeu × facteur d'arrêts (1,25 en chrono courant).
 */

export interface MatchResult {
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B';
  playMinutes: number;
  leadChanges: number;
  possessions: number;
  bonusEvents: number;
}

export const DEFAULT_SHOT_MIX: Record<string, number> = {
  inside: 0.5,
  mid: 0.15,
  long: 0.3,
  logo: 0.03,
  power: 0.05,
};

const TURNOVER = 0.12;
const OREB = 0.25;
const SKILL_K = 0.13;
const SATURATION = 0.5;

function param(m: MechanicInstance | undefined, key: string, def: number): number {
  const v = m?.params?.[key];
  return typeof v === 'number' ? v : def;
}

export function normalizedMix(zones: ShotZone[], strategy?: Record<string, number>): number[] {
  const raw = zones.map((z) => Math.max(0, strategy?.[z.id] ?? DEFAULT_SHOT_MIX[z.id] ?? 0.1));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  return raw.map((r) => r / sum);
}

function chooseZone(rng: Rng, zones: ShotZone[], mix: number[]): number {
  let r = rng();
  for (let i = 0; i < zones.length; i++) {
    r -= mix[i];
    if (r <= 0) return i;
  }
  return zones.length - 1;
}

export function simulateMatch(rules: MatchRules, a: SimTeam, b: SimTeam, rng: Rng): MatchResult {
  const mech = new Map(rules.mechanics.map((m) => [m.id, m]));
  const halfCourt = rules.teamSize <= 3;
  const avgPoss = rules.shotClockSec * (halfCourt ? 0.7 : 0.6);
  const mixA = normalizedMix(rules.zones, a.strategy);
  const mixB = normalizedMix(rules.zones, b.strategy);
  // Adaptation défensive : plus une équipe sur-utilise une zone par rapport à
  // un usage "naturel", plus la défense la ferme (rendements décroissants).
  const natural = normalizedMix(rules.zones, undefined);
  const satA = mixA.map((m, i) => 1 - SATURATION * Math.max(0, m - natural[i]));
  const satB = mixB.map((m, i) => 1 - SATURATION * Math.max(0, m - natural[i]));
  const edge = Math.tanh((a.rating - b.rating) / 400) * SKILL_K;

  let sA = 0;
  let sB = 0;
  // Handicap (format inclusif) : l'équipe la moins bien classée part avec des points.
  const handicap = mech.get('handicap_start');
  if (handicap) {
    const perHundred = param(handicap, 'pointsPer100Elo', 1);
    const gap = Math.round((Math.abs(a.rating - b.rating) / 100) * perHundred);
    if (a.rating < b.rating) sA += gap;
    else sB += gap;
  }

  let t = 0; // secondes de jeu
  let possessions = 0;
  let leadChanges = 0;
  let lastLeader: 'A' | 'B' | null = null;
  let bonusEvents = 0;
  let offense: 'A' | 'B' = rng() < 0.5 ? 'A' : 'B';
  const jokerUsed = { A: false, B: false };
  let jokerActive: { team: 'A' | 'B'; until: number } | null = null;
  let publicBonus: { zone: number; until: number } | null = null;
  let elamTarget: number | null = null;
  let ot: { a: number; b: number } | null = null;

  const end = rules.end;
  const timeLimit =
    end.type === 'time' || end.type === 'elam' || end.type === 'time_or_target'
      ? end.minutes * 60
      : (end.maxMinutes ?? 40) * 60;
  const target = end.type === 'target' || end.type === 'time_or_target' ? end.points : Infinity;
  const mercy = mech.get('mercy_rule');
  const mercyGap = mercy ? param(mercy, 'gap', 20) : Infinity;
  const finalMinute = mech.get('double_points_final_minute');
  const finalWindow = finalMinute ? param(finalMinute, 'seconds', 60) : 0;
  const joker = mech.get('joker_card');
  const jokerSec = joker ? param(joker, 'seconds', 60) : 0;
  const publicZone = mech.get('public_zone_bonus');
  const publicEvery = publicZone ? param(publicZone, 'everySeconds', 240) : 0;
  let nextPublic = publicEvery || Infinity;

  const maxPoss = 2000;
  while (possessions < maxPoss) {
    // Fin de match
    if (elamTarget !== null) {
      if (sA >= elamTarget || sB >= elamTarget) break;
    } else if (end.type === 'elam' && t >= timeLimit) {
      elamTarget = Math.max(sA, sB) + end.plus;
    } else if (end.type !== 'elam') {
      if (sA >= target || sB >= target) break;
      if (t >= timeLimit) {
        if (ot) {
          // Prolongation FIBA 3x3 : première équipe à marquer 2 points
          if (sA - ot.a >= 2 || sB - ot.b >= 2) break;
        } else if (sA !== sB) break;
        else if (!rules.overtime || rules.overtime === 'none') break;
        else if (rules.overtime === 'first_to_2') ot = { a: sA, b: sB };
        // 'sudden_death' : on continue, le premier panier met fin au match
      }
    }
    if (Math.abs(sA - sB) >= mercyGap) break;
    if (t >= timeLimit * 3) break; // garde-fou

    possessions++;
    const dur = clamp(avgPoss * (0.55 + rng() * 0.9), 3, rules.shotClockSec);
    t += dur;

    if (publicZone && t >= nextPublic) {
      publicBonus = { zone: Math.floor(rng() * rules.zones.length), until: t + 60 };
      nextPublic += publicEvery;
      bonusEvents++;
    }
    // Carte joker : utilisée par l'équipe menée en 2e moitié de match.
    if (joker && !jokerActive && t > timeLimit / 2) {
      const trailing: 'A' | 'B' | null = sA < sB ? 'A' : sB < sA ? 'B' : null;
      if (trailing && !jokerUsed[trailing] && rng() < 0.15) {
        jokerUsed[trailing] = true;
        jokerActive = { team: trailing, until: t + jokerSec };
        bonusEvents++;
      }
    }
    if (jokerActive && t > jokerActive.until) jokerActive = null;
    if (publicBonus && t > publicBonus.until) publicBonus = null;

    const isA = offense === 'A';
    let scored = 0;
    let keep = true;
    while (keep) {
      keep = false;
      if (rng() < TURNOVER) break;
      const zi = chooseZone(rng, rules.zones, isA ? mixA : mixB);
      const z = rules.zones[zi];
      const p = clamp(z.baseMake * (isA ? satA[zi] : satB[zi]) + (isA ? edge : -edge), 0.03, 0.95);
      if (rng() < p) {
        let pts = z.points;
        if (publicBonus && publicBonus.zone === zi) pts *= 2;
        if (jokerActive && jokerActive.team === offense) pts *= 2;
        if (finalMinute && timeLimit - t <= finalWindow && t <= timeLimit && end.type !== 'target') pts *= 2;
        scored = pts;
      } else if (rng() < OREB) {
        keep = true; // rebond offensif : nouvelle tentative
      }
    }
    if (isA) sA += scored;
    else sB += scored;

    const leader: 'A' | 'B' | null = sA > sB ? 'A' : sB > sA ? 'B' : lastLeader;
    if (leader && lastLeader && leader !== lastLeader) leadChanges++;
    lastLeader = leader;
    offense = isA ? 'B' : 'A';
  }

  if (sA === sB) {
    // Départage final (lancer décisif) pour garantir un vainqueur
    if (rng() < 0.5 + edge) sA += 1;
    else sB += 1;
  }

  return {
    scoreA: sA,
    scoreB: sB,
    winner: sA > sB ? 'A' : 'B',
    playMinutes: t / 60,
    leadChanges,
    possessions,
    bonusEvents,
  };
}

/** Valeur attendue d'un tir par zone, à niveau égal : détecte les zones "trop rentables". */
export function zoneExpectedValues(rules: MatchRules): { zone: string; ev: number }[] {
  return rules.zones.map((z) => ({ zone: z.id, ev: z.points * z.baseMake }));
}
