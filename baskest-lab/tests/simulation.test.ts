import { simulateMatch } from '../src/core/simulation/match';
import { analyzeFormat, strategyDominance } from '../src/core/simulation/analysis';
import { runTournament, bracketOrder, roundRobinRounds, snakeGroups } from '../src/core/simulation/tournament';
import { format3x3Open, formatKingOfTheCourt, RULES_5X5_SHORT, RULES_FIBA_3X3, ZONES_5X5 } from '../src/core/simulation/presets';
import { createRng } from '../src/core/rng';
import type { MatchRules } from '../src/core/model';

const even = (id: string) => ({ id, name: id, rating: 1500 });

describe('simulateMatch', () => {
  it('3x3 FIBA : scores et durées réalistes (≈ 21 pts, ≤ 10 min de jeu)', () => {
    const rng = createRng(1);
    const res = Array.from({ length: 300 }, () => simulateMatch(RULES_FIBA_3X3, even('a'), even('b'), rng));
    const avgWinner = res.reduce((s, r) => s + Math.max(r.scoreA, r.scoreB), 0) / res.length;
    expect(avgWinner).toBeGreaterThan(15);
    expect(avgWinner).toBeLessThanOrEqual(22);
    expect(res.every((r) => r.scoreA !== r.scoreB)).toBe(true);
  });

  it('est déterministe à graine égale', () => {
    const a = simulateMatch(RULES_5X5_SHORT, even('a'), even('b'), createRng(9));
    const b = simulateMatch(RULES_5X5_SHORT, even('a'), even('b'), createRng(9));
    expect(a).toEqual(b);
  });

  it('la meilleure équipe gagne plus souvent', () => {
    const rng = createRng(3);
    let wins = 0;
    for (let i = 0; i < 400; i++) if (simulateMatch(RULES_FIBA_3X3, { id: 'f', name: 'f', rating: 1700 }, even('b'), rng).winner === 'A') wins++;
    expect(wins / 400).toBeGreaterThan(0.65);
  });

  it('Elam : le match se termine au score cible', () => {
    const rules: MatchRules = { ...RULES_5X5_SHORT, end: { type: 'elam', minutes: 8, plus: 9 } };
    const r = simulateMatch(rules, even('a'), even('b'), createRng(5));
    expect(Math.max(r.scoreA, r.scoreB)).toBeGreaterThan(Math.min(r.scoreA, r.scoreB));
  });
});

describe('structures de compétition', () => {
  it('round-robin : chaque paire se rencontre une fois', () => {
    const rounds = roundRobinRounds(['a', 'b', 'c', 'd', 'e']);
    const pairs = rounds.flat().map(([x, y]) => [x, y].sort().join());
    expect(new Set(pairs).size).toBe(10);
  });
  it('tableau : têtes de série 1 et 2 ne se croisent qu’en finale', () => {
    const o = bracketOrder(8);
    expect(o.indexOf(1) < 4).not.toBe(o.indexOf(2) < 4);
  });
  it('serpentin équilibré', () => {
    expect(snakeGroups([1, 2, 3, 4, 5, 6, 7, 8], 2)).toEqual([[1, 4, 5, 8], [2, 3, 6, 7]]);
  });
  it('un tournoi produit un classement complet', () => {
    const teams = Array.from({ length: 16 }, (_, i) => ({ id: `T${i}`, name: `T${i}`, rating: 1500 + i * 10 }));
    const run = runTournament(format3x3Open(16), teams, createRng(2));
    expect(new Set(run.ranking).size).toBe(16);
    expect(run.matches.length).toBe(24 + 7);
  });
});

describe('analyse d’équité', () => {
  it('Open 3x3 : équilibré, au moins 3 matchs par équipe', () => {
    const r = analyzeFormat(format3x3Open(16), { runs: 120 });
    expect(r.verdict).toBe('equilibre');
    expect(r.gamesPerTeam.min).toBeGreaterThanOrEqual(3);
  });
  it('King of the Court 1 terrain : déséquilibre de temps de jeu détecté', () => {
    const r = analyzeFormat(formatKingOfTheCourt(12), { runs: 120 });
    expect(r.unfairSituations.length).toBeGreaterThan(0);
  });
  it('détecte une zone bonus surpayée (exploitation de règle)', () => {
    const rules: MatchRules = { ...RULES_5X5_SHORT, zones: [...ZONES_5X5, { id: 'power', label: 'Zone 6 pts', points: 6, baseMake: 0.3 }] };
    const dom = strategyDominance(rules, 300);
    expect(dom.some((d) => d.strategy === 'chasse_aux_bonus' && d.winRateVsBalanced > 0.58)).toBe(true);
  });
});
