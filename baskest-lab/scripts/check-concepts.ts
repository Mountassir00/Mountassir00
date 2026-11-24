/**
 * Vérification des 16 concepts initiaux au simulateur (100 tirages chacun).
 * Usage : npx tsx scripts/check-concepts.ts
 */
import { analyzeFormat } from '../src/core/simulation/analysis';
import { CONCEPTS } from '../src/data/concepts';

const rows = CONCEPTS.map((c) => {
  const r = analyzeFormat(c.format, { runs: 100, seed: c.id });
  return {
    id: c.id,
    verdict: r.verdict,
    avgMin: r.avgMatchMinutes,
    p95: r.p95MatchMinutes,
    pBest: r.pBestWins,
    tau: r.kendallTau,
    close: r.closeGameRate,
    games: `${r.gamesPerTeam.min}-${r.gamesPerTeam.max}`,
    issues: [...r.dominantStrategies.map((d) => `dominante:${d.strategy}`), ...r.unfairSituations, ...r.manipulationRisks, ...r.notes]
      .map((x) => x.slice(0, 90))
      .join(' | '),
  };
});
console.table(rows.map(({ issues: _i, ...r }) => r));
for (const r of rows) if (r.issues) console.log(`- ${r.id}: ${r.issues}`);
