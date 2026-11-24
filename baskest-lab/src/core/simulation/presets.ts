import type { CompetitionFormat, MatchRules, ShotZone } from '../model';

/**
 * Préréglages de règles. Les valeurs de réussite sont des ordres de grandeur
 * amateurs/semi-pros (hypothèses de calibrage), pas des statistiques officielles.
 */

export const ZONES_3X3: ShotZone[] = [
  { id: 'inside', label: 'Intérieur de l’arc (1 pt)', points: 1, baseMake: 0.48 },
  { id: 'long', label: 'Au-delà de l’arc (2 pts)', points: 2, baseMake: 0.3 },
];

export const ZONES_5X5: ShotZone[] = [
  { id: 'inside', label: 'Raquette (2 pts)', points: 2, baseMake: 0.55 },
  { id: 'mid', label: 'Mi-distance (2 pts)', points: 2, baseMake: 0.4 },
  { id: 'long', label: 'Tir à 3 pts', points: 3, baseMake: 0.34 },
];

/** Exemple de zone bonus "type BIG3" (cercles à 4 points). */
export const ZONES_POWER: ShotZone[] = [
  ...ZONES_5X5,
  { id: 'power', label: 'Cercle bonus (4 pts)', points: 4, baseMake: 0.25 },
];

export const RULES_FIBA_3X3: MatchRules = {
  teamSize: 3,
  end: { type: 'time_or_target', minutes: 10, points: 21 },
  shotClockSec: 12,
  zones: ZONES_3X3,
  overtime: 'first_to_2',
  mechanics: [],
  official: true,
};

export const RULES_5X5_SHORT: MatchRules = {
  teamSize: 5,
  end: { type: 'time', minutes: 20 },
  shotClockSec: 24,
  zones: ZONES_5X5,
  overtime: 'sudden_death',
  mechanics: [],
  official: false,
};

export const RULES_1V1: MatchRules = {
  teamSize: 1,
  end: { type: 'time_or_target', minutes: 5, points: 11 },
  shotClockSec: 10,
  zones: ZONES_3X3,
  overtime: 'sudden_death',
  mechanics: [],
  official: false,
};

export function format3x3Open(teams = 16): CompetitionFormat {
  return {
    id: 'fmt-3x3-open',
    name: 'Open 3x3 — poules + tableau',
    teamSize: 3,
    rosterSize: 4,
    teams,
    stages: [
      { id: 'poules', type: 'round_robin', label: 'Poules', groups: Math.max(1, Math.floor(teams / 4)), qualifiersPerGroup: 2, seeding: 'snake' },
      { id: 'tableau', type: 'single_elim', label: 'Tableau final', thirdPlace: false },
    ],
    match: RULES_FIBA_3X3,
  };
}

export function formatKingOfTheCourt(players = 12): CompetitionFormat {
  return {
    id: 'fmt-kotc',
    name: 'King of the Court 1c1',
    teamSize: 1,
    rosterSize: 1,
    teams: players,
    stages: [
      { id: 'regne', type: 'king_of_the_court', label: 'Règne', kotc: { durationMin: 45, pointsPerWin: 1, streakBonus: 1 } },
    ],
    match: { ...RULES_1V1, end: { type: 'time_or_target', minutes: 3, points: 5 } },
  };
}
