import type { CompetitionFormat, MatchRules, SimTeam, StageSpec } from '../model';
import { shuffle, type Rng } from '../rng';
import { simulateMatch } from './match';

/**
 * Moteur de compétition : enchaîne les phases d'un format (poules, élimination
 * directe, double élimination, système suisse, King of the Court, échelle,
 * course aux points) et produit un classement final + l'historique des matchs.
 */

export interface PlayedMatch {
  stageId: string;
  round: number;
  a: string;
  b: string;
  scoreA: number;
  scoreB: number;
  winner: string;
  loser: string;
  minutes: number;
  leadChanges: number;
  stake: boolean; // le résultat change-t-il quelque chose ? (détection des matchs sans enjeu)
}

export interface TournamentRun {
  ranking: string[]; // ids, du 1er au dernier
  matches: PlayedMatch[];
  gamesPerTeam: Record<string, number>;
  points: Record<string, number>; // points de classement (KOTC / course)
  waitMinutes: Record<string, number>; // KOTC : temps passé dans la file
}

interface Ctx {
  rng: Rng;
  rules: MatchRules;
  byId: Map<string, SimTeam>;
  matches: PlayedMatch[];
  games: Record<string, number>;
  points: Record<string, number>;
  wait: Record<string, number>;
}

function play(ctx: Ctx, stageId: string, round: number, a: string, b: string, stake = true): PlayedMatch {
  const r = simulateMatch(ctx.rules, ctx.byId.get(a)!, ctx.byId.get(b)!, ctx.rng);
  const winner = r.winner === 'A' ? a : b;
  const m: PlayedMatch = {
    stageId,
    round,
    a,
    b,
    scoreA: r.scoreA,
    scoreB: r.scoreB,
    winner,
    loser: winner === a ? b : a,
    minutes: r.playMinutes,
    leadChanges: r.leadChanges,
    stake,
  };
  ctx.matches.push(m);
  ctx.games[a] = (ctx.games[a] ?? 0) + 1;
  ctx.games[b] = (ctx.games[b] ?? 0) + 1;
  return m;
}

const byRating = (ctx: Ctx) => (x: string, y: string) => ctx.byId.get(y)!.rating - ctx.byId.get(x)!.rating;

function seedOrder(ctx: Ctx, ids: string[], seeding: StageSpec['seeding']): string[] {
  if (seeding === 'random' || seeding === 'draft') return shuffle(ctx.rng, ids);
  return ids.slice().sort(byRating(ctx));
}

/** Répartition serpentin dans les poules (1-8-9-16 / 2-7-10-15…). */
export function snakeGroups<T>(items: T[], groups: number): T[][] {
  const out: T[][] = Array.from({ length: groups }, () => []);
  items.forEach((it, i) => {
    const row = Math.floor(i / groups);
    const col = i % groups;
    out[row % 2 === 0 ? col : groups - 1 - col].push(it);
  });
  return out;
}

/** Rondes de round-robin (méthode du cercle). */
export function roundRobinRounds(ids: string[]): [string, string][][] {
  const list = ids.slice();
  if (list.length % 2 === 1) list.push('__BYE__');
  const n = list.length;
  const rounds: [string, string][][] = [];
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const x = list[i];
      const y = list[n - 1 - i];
      if (x !== '__BYE__' && y !== '__BYE__') pairs.push(r % 2 === 0 ? [x, y] : [y, x]);
    }
    rounds.push(pairs);
    list.splice(1, 0, list.pop()!);
  }
  return rounds;
}

interface Standing {
  id: string;
  w: number;
  l: number;
  diff: number;
  pf: number;
}

function standingsOf(ids: string[], ms: PlayedMatch[]): Standing[] {
  const st = new Map(ids.map((id) => [id, { id, w: 0, l: 0, diff: 0, pf: 0 }]));
  for (const m of ms) {
    const A = st.get(m.a);
    const B = st.get(m.b);
    if (!A || !B) continue;
    A.pf += m.scoreA;
    B.pf += m.scoreB;
    A.diff += m.scoreA - m.scoreB;
    B.diff += m.scoreB - m.scoreA;
    if (m.winner === m.a) {
      A.w++;
      B.l++;
    } else {
      B.w++;
      A.l++;
    }
  }
  return [...st.values()].sort((x, y) => y.w - x.w || y.diff - x.diff || y.pf - x.pf);
}

/** Qualification invariante quel que soit le résultat des matchs restants ? (victoires seules) */
function qualificationLocked(
  ids: string[],
  played: PlayedMatch[],
  remaining: [string, string][],
  qualifiers: number,
  team: string,
): 'qualifie' | 'elimine' | 'ouvert' {
  const outcomes = 1 << Math.min(remaining.length, 10);
  let alwaysIn = true;
  let alwaysOut = true;
  for (let mask = 0; mask < outcomes; mask++) {
    const wins = new Map(ids.map((id) => [id, 0]));
    for (const m of played) wins.set(m.winner, (wins.get(m.winner) ?? 0) + 1);
    remaining.forEach(([x, y], i) => {
      const w = mask & (1 << i) ? x : y;
      wins.set(w, (wins.get(w) ?? 0) + 1);
    });
    const mine = wins.get(team)!;
    const better = [...wins.values()].filter((v) => v > mine).length;
    const equal = [...wins.values()].filter((v) => v === mine).length - 1;
    const surelyIn = better + equal < qualifiers;
    const surelyOut = better >= qualifiers;
    if (!surelyIn) alwaysIn = false;
    if (!surelyOut) alwaysOut = false;
  }
  return alwaysIn ? 'qualifie' : alwaysOut ? 'elimine' : 'ouvert';
}

function runRoundRobin(ctx: Ctx, stage: StageSpec, ids: string[]): { advancing: string[]; rest: string[] } {
  const groups = Math.max(1, stage.groups ?? 1);
  const q = stage.qualifiersPerGroup ?? Math.ceil(ids.length / groups / 2);
  const seeded = seedOrder(ctx, ids, stage.seeding ?? 'snake');
  const pools = snakeGroups(seeded, groups);
  const firsts: string[][] = [];
  const rest: string[] = [];
  for (const pool of pools) {
    const rounds = roundRobinRounds(pool);
    const played: PlayedMatch[] = [];
    rounds.forEach((pairs, r) => {
      const isLast = r === rounds.length - 1;
      for (const [a, b] of pairs) {
        let stake = true;
        if (isLast && groups >= 1 && q < pool.length) {
          const remaining = pairs.filter((p) => p[0] !== a || p[1] !== b);
          // Enjeu pour au moins une des deux équipes ?
          const la = qualificationLocked(pool, played, [[a, b], ...remaining], q, a);
          const lb = qualificationLocked(pool, played, [[a, b], ...remaining], q, b);
          stake = la === 'ouvert' || lb === 'ouvert';
        }
        played.push(play(ctx, stage.id, r + 1, a, b, stake));
      }
    });
    const st = standingsOf(pool, played).map((s) => s.id);
    firsts.push(st.slice(0, q));
    rest.push(...st.slice(q));
  }
  // Ordre de qualification : tous les 1ers, puis tous les 2es… (croisement)
  const advancing: string[] = [];
  for (let k = 0; k < q; k++) for (const f of firsts) if (f[k]) advancing.push(f[k]);
  return { advancing, rest };
}

/** Tableau à élimination directe avec têtes de série (1 vs N) et exemptions. */
function runSingleElim(ctx: Ctx, stage: StageSpec, ids: string[]): string[] {
  let size = 1;
  while (size < ids.length) size *= 2;
  const seeds = ids.slice(); // déjà ordonnés par la phase précédente (ou par niveau)
  const order = bracketOrder(size);
  let slots: (string | null)[] = order.map((s) => seeds[s - 1] ?? null);
  const eliminatedByRound: string[][] = [];
  let round = 1;
  while (slots.length > 1) {
    const next: (string | null)[] = [];
    const out: string[] = [];
    for (let i = 0; i < slots.length; i += 2) {
      const a = slots[i];
      const b = slots[i + 1];
      if (a && b) {
        const m = play(ctx, stage.id, round, a, b);
        next.push(m.winner);
        out.push(m.loser);
      } else next.push(a ?? b);
    }
    eliminatedByRound.push(out);
    slots = next;
    round++;
  }
  const champion = slots[0]!;
  const ranking = [champion];
  for (let r = eliminatedByRound.length - 1; r >= 0; r--) {
    ranking.push(...eliminatedByRound[r].sort(byRating(ctx)));
  }
  if (stage.thirdPlace && eliminatedByRound.length >= 2) {
    const semisLosers = eliminatedByRound[eliminatedByRound.length - 2];
    if (semisLosers.length === 2) {
      const m = play(ctx, stage.id, round, semisLosers[0], semisLosers[1]);
      ranking.splice(2, 2, m.winner, m.loser);
    }
  }
  return ranking;
}

/** Ordre standard des têtes de série dans un tableau de taille 2^k. */
export function bracketOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

/**
 * Double élimination "par bilan" : à chaque tour, les équipes à 0 défaite
 * s'affrontent entre elles, celles à 1 défaite entre elles ; 2 défaites =
 * éliminé. Grande finale avec "bracket reset" si le finaliste invaincu perd.
 */
function runDoubleElim(ctx: Ctx, stage: StageSpec, ids: string[]): string[] {
  const losses = new Map(ids.map((id) => [id, 0]));
  const eliminated: string[] = [];
  let round = 1;
  const alive = () => ids.filter((id) => losses.get(id)! < 2);
  while (alive().length > 2 && round < 50) {
    for (const bucket of [0, 1]) {
      const pool = alive()
        .filter((id) => losses.get(id) === bucket)
        .sort(byRating(ctx));
      // Appariement haut/bas du groupe
      const pairs: [string, string][] = [];
      const p = pool.slice();
      while (p.length >= 2) pairs.push([p.shift()!, p.pop()!]);
      for (const [a, b] of pairs) {
        if (alive().length <= 2) break;
        const m = play(ctx, stage.id, round, a, b);
        losses.set(m.loser, losses.get(m.loser)! + 1);
        if (losses.get(m.loser) === 2) eliminated.push(m.loser);
      }
    }
    round++;
  }
  const finalists = alive().sort((x, y) => losses.get(x)! - losses.get(y)!);
  if (finalists.length === 1) return [finalists[0], ...eliminated.reverse()];
  let [w, l] = finalists;
  let m = play(ctx, stage.id, round, w, l);
  if (losses.get(m.winner)! > losses.get(m.loser)! && losses.get(m.loser) === 0) {
    // Le finaliste venu du tableau perdant gagne : match décisif (reset)
    m = play(ctx, stage.id, round + 1, w, l);
  }
  w = m.winner;
  l = m.loser;
  return [w, l, ...eliminated.reverse()];
}

function runSwiss(ctx: Ctx, stage: StageSpec, ids: string[], byPoints = false): string[] {
  const rounds = stage.rounds ?? Math.ceil(Math.log2(ids.length)) + 1;
  const met = new Set<string>();
  const played: PlayedMatch[] = [];
  for (let r = 1; r <= rounds; r++) {
    const st = byPoints
      ? ids.slice().sort((x, y) => (ctx.points[y] ?? 0) - (ctx.points[x] ?? 0))
      : standingsOf(ids, played).map((s) => s.id);
    const pool = r === 1 ? seedOrder(ctx, ids, stage.seeding ?? 'random') : st;
    const used = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      const a = pool[i];
      if (used.has(a)) continue;
      let b = pool.find((x, j) => j > i && !used.has(x) && !met.has(key(a, x)));
      if (!b) b = pool.find((x, j) => j > i && !used.has(x));
      if (!b) continue;
      used.add(a);
      used.add(b);
      met.add(key(a, b));
      const m = play(ctx, stage.id, r, a, b);
      played.push(m);
      if (byPoints) {
        ctx.points[a] = (ctx.points[a] ?? 0) + m.scoreA;
        ctx.points[b] = (ctx.points[b] ?? 0) + m.scoreB;
      }
    }
  }
  return byPoints
    ? ids.slice().sort((x, y) => (ctx.points[y] ?? 0) - (ctx.points[x] ?? 0))
    : standingsOf(ids, played).map((s) => s.id);
}

const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * King of the Court : le vainqueur reste sur le terrain, le perdant retourne
 * en fin de file. Points par victoire + bonus de série. Mesure aussi le temps
 * d'attente (problème classique de ce format).
 */
function runKingOfTheCourt(ctx: Ctx, stage: StageSpec, ids: string[]): string[] {
  const cfg = stage.kotc ?? { durationMin: 60, pointsPerWin: 1, streakBonus: 0 };
  const queue = seedOrder(ctx, ids, stage.seeding ?? 'random');
  let king = queue.shift()!;
  let streak = 0;
  let clock = 0;
  const lastOff = new Map<string, number>(ids.map((id) => [id, 0]));
  const changeover = 0.5; // minutes entre deux défis
  let round = 1;
  while (clock < cfg.durationMin && queue.length) {
    const challenger = queue.shift()!;
    ctx.wait[challenger] = (ctx.wait[challenger] ?? 0) + (clock - (lastOff.get(challenger) ?? 0));
    const m = play(ctx, stage.id, round++, king, challenger);
    clock += m.minutes + changeover;
    if (m.winner === king) {
      streak++;
      ctx.points[king] = (ctx.points[king] ?? 0) + cfg.pointsPerWin + (streak >= 3 ? (cfg.streakBonus ?? 0) : 0);
      queue.push(challenger);
      lastOff.set(challenger, clock);
    } else {
      ctx.points[challenger] = (ctx.points[challenger] ?? 0) + cfg.pointsPerWin;
      queue.push(king);
      lastOff.set(king, clock);
      king = challenger;
      streak = 1;
    }
  }
  return ids.slice().sort((x, y) => (ctx.points[y] ?? 0) - (ctx.points[x] ?? 0) || byRating(ctx)(x, y));
}

/** Échelle de défis : chaque équipe peut défier jusqu'à 2 places au-dessus ; victoire = échange. */
function runLadder(ctx: Ctx, stage: StageSpec, ids: string[]): string[] {
  const ladder = seedOrder(ctx, ids, stage.seeding ?? 'random');
  const rounds = stage.rounds ?? 4;
  for (let r = 1; r <= rounds; r++) {
    // Par ronde : chaque équipe lance au plus un défi et en reçoit au plus un
    const sent = new Set<string>();
    const received = new Set<string>();
    const order = ladder.slice().reverse(); // du bas vers le haut, ordre figé en début de ronde
    for (const challenger of order) {
      if (sent.has(challenger) || received.has(challenger)) continue;
      const pos = ladder.indexOf(challenger);
      if (pos === 0) continue;
      const candidates = [pos - 1, pos - 2].filter((t) => t >= 0 && !received.has(ladder[t]) && !sent.has(ladder[t]));
      if (!candidates.length) continue;
      const target = candidates[Math.floor(ctx.rng() * candidates.length)];
      const defender = ladder[target];
      sent.add(challenger);
      received.add(defender);
      const m = play(ctx, stage.id, r, challenger, defender);
      if (m.winner === challenger) {
        ladder.splice(pos, 1);
        ladder.splice(target, 0, challenger);
      }
    }
  }
  return ladder;
}

export function runTournament(format: CompetitionFormat, teams: SimTeam[], rng: Rng): TournamentRun {
  const ctx: Ctx = {
    rng,
    rules: format.match,
    byId: new Map(teams.map((t) => [t.id, t])),
    matches: [],
    games: Object.fromEntries(teams.map((t) => [t.id, 0])),
    points: {},
    wait: {},
  };
  let current = teams.map((t) => t.id).sort(byRating(ctx));
  const tail: string[] = []; // éliminés avant la dernière phase, du meilleur au moins bon
  format.stages.forEach((stage, si) => {
    const hasNext = si < format.stages.length - 1;
    switch (stage.type) {
      case 'round_robin': {
        const { advancing, rest } = runRoundRobin(ctx, stage, current);
        tail.unshift(...rest);
        current = advancing;
        break;
      }
      case 'single_elim':
        current = runSingleElim(ctx, stage, current);
        break;
      case 'double_elim':
        current = runDoubleElim(ctx, stage, current);
        break;
      case 'swiss':
        current = runSwiss(ctx, stage, current);
        break;
      case 'points_race':
        current = runSwiss(ctx, stage, current, true);
        break;
      case 'king_of_the_court':
        current = runKingOfTheCourt(ctx, stage, current);
        break;
      case 'ladder':
        current = runLadder(ctx, stage, current);
        break;
    }
    // Phases à classement : seuls les `advance` premiers passent à la phase suivante
    if (hasNext && ['swiss', 'points_race', 'ladder', 'king_of_the_court', 'double_elim'].includes(stage.type)) {
      const k = Math.min(current.length, stage.advance ?? 4);
      tail.unshift(...current.slice(k));
      current = current.slice(0, k);
    }
  });
  return {
    ranking: [...current, ...tail],
    matches: ctx.matches,
    gamesPerTeam: ctx.games,
    points: ctx.points,
    waitMinutes: ctx.wait,
  };
}
