import type {
  CompetitionFormat,
  Court,
  Disruption,
  FixedBlock,
  Official,
  Schedule,
  ScheduleConflict,
  ScheduledMatch,
} from '../model';
import { roundRobinRounds, snakeGroups, bracketOrder } from '../simulation/tournament';

/**
 * Moteur de programmation sportive (exigence §10).
 *
 * 1. `buildFixtures` : génère la grille de matchs d'un format (poules,
 *    tableaux, rondes suisses…) avec leurs dépendances.
 * 2. `planSchedule` : affecte terrain, horaire et officiels par un
 *    ordonnancement "au plus tôt" sous contraintes (repos minimum,
 *    disponibilité des terrains et des arbitres, blocs fixes : cérémonies,
 *    animations, interventions sponsors).
 * 3. `detectConflicts` : vérifie un planning (y compris modifié à la main).
 * 4. `reschedule` : réorganise après un retard, une absence ou un terrain
 *    indisponible, sans toucher aux matchs déjà joués.
 */

export interface TeamRef {
  id: string;
  name: string;
}

export interface ScheduleInput {
  format: CompetitionFormat;
  teams: TeamRef[]; // ordonnées par tête de série
  courts: Court[];
  officials: Official[];
  blocks: FixedBlock[];
  /** Durée d'un créneau de match (jeu + arrêts + changement), en minutes. */
  slotMinutes: number;
  minRestMinutes: number;
  officialsPerMatch: number;
  dayEnd: number; // minutes après ouverture
  maxWaitMinutes?: number;
  /** Heure d'ouverture "HH:MM" pour l'affichage. */
  opening?: string;
}

export interface Fixture extends ScheduledMatch {
  deps: string[];
  /** Les dépendances "livrent" une équipe (vainqueur / perdant) → repos obligatoire. */
  depsCarryTeam: boolean;
  priority: number;
}

// ---------------------------------------------------------------------------
// 1. Génération des rencontres
// ---------------------------------------------------------------------------

export function buildFixtures(format: CompetitionFormat, teams: TeamRef[], slot: number): { fixtures: Fixture[]; extraBlocks: FixedBlock[] } {
  const divs = format.divisions ?? [];
  if (divs.length < 2) return buildFixturesSingle(format, teams, slot, '', '');
  // Tableaux parallèles : les équipes sont réparties dans l'ordre, `format.teams` par tableau
  const all: Fixture[] = [];
  const blocks: FixedBlock[] = [];
  divs.forEach((d, i) => {
    const sub = teams.slice(i * format.teams, (i + 1) * format.teams);
    const r = buildFixturesSingle(format, sub, slot, `${d.id}-`, `${d.label} · `);
    // Alternance des tableaux à priorité égale
    r.fixtures.forEach((f) => (f.priority = f.priority * 10 + i));
    all.push(...r.fixtures);
    blocks.push(...r.extraBlocks.map((b) => ({ ...b, id: `${b.id}-${d.id}`, label: `${d.label} · ${b.label}` })));
  });
  return { fixtures: all, extraBlocks: blocks };
}

function buildFixturesSingle(format: CompetitionFormat, teams: TeamRef[], slot: number, idPrefix: string, labelPrefix: string): { fixtures: Fixture[]; extraBlocks: FixedBlock[] } {
  const fixtures: Fixture[] = [];
  const extraBlocks: FixedBlock[] = [];
  let prevStageIds: string[] = [];
  let entrants = teams.map((t) => t.id);
  let entrantsKnown = true;
  let n = 0;
  const mk = (f: Omit<Fixture, 'id' | 'officials' | 'status' | 'duration'> & { duration?: number }): Fixture => ({
    id: `${idPrefix}M${String(++n).padStart(3, '0')}`,
    officials: [],
    status: 'planifie',
    duration: f.duration ?? slot,
    ...f,
    label: `${labelPrefix}${f.label}`,
  });

  format.stages.forEach((stage, si) => {
    const stageIds: string[] = [];
    const base = si * 1000;
    if (stage.type === 'round_robin') {
      const groups = Math.max(1, stage.groups ?? 1);
      const q = stage.qualifiersPerGroup ?? 2;
      const pools = entrantsKnown
        ? snakeGroups(entrants, groups)
        : snakeGroups(entrants.map((_, i) => `slot${i + 1}`), groups);
      pools.forEach((pool, gi) => {
        const letter = String.fromCharCode(65 + gi);
        roundRobinRounds(pool).forEach((pairs, r) => {
          for (const [a, b] of pairs) {
            const f = mk({
              stageId: stage.id,
              round: r + 1,
              label: `Poule ${letter} · J${r + 1}`,
              home: entrantsKnown ? a : undefined,
              away: entrantsKnown ? b : undefined,
              deps: entrantsKnown ? [] : prevStageIds,
              depsCarryTeam: !entrantsKnown,
              priority: base + r * 10 + gi,
            });
            fixtures.push(f);
            stageIds.push(f.id);
          }
        });
      });
      entrants = pools.flatMap((_, gi) => Array.from({ length: q }, (_, k) => `${k + 1}:${String.fromCharCode(65 + gi)}`));
      entrantsKnown = false;
    } else if (stage.type === 'single_elim') {
      let size = 1;
      while (size < entrants.length) size *= 2;
      const order = bracketOrder(size).map((s) => entrants[s - 1] ?? null);
      let feeders: (string | null)[] = order; // références textuelles (équipe ou "W:Mxx")
      let round = 1;
      const roundNames = (k: number) => (k === 1 ? 'Finale' : k === 2 ? 'Demi-finale' : k === 4 ? 'Quart de finale' : `1/${k}e de finale`);
      while (feeders.length > 1) {
        const next: (string | null)[] = [];
        const matchesInRound = feeders.length / 2;
        for (let i = 0; i < feeders.length; i += 2) {
          const a = feeders[i];
          const b = feeders[i + 1];
          if (a && b) {
            const depA = a.startsWith('W:') ? [a.slice(2)] : [];
            const depB = b.startsWith('W:') ? [b.slice(2)] : [];
            const isTeamA = entrantsKnown && !a.startsWith('W:');
            const isTeamB = entrantsKnown && !b.startsWith('W:');
            const f = mk({
              stageId: stage.id,
              round,
              label: matchesInRound > 1 ? `${roundNames(matchesInRound)} ${i / 2 + 1}` : roundNames(1),
              home: isTeamA ? a : undefined,
              away: isTeamB ? b : undefined,
              homeFrom: isTeamA ? undefined : a,
              awayFrom: isTeamB ? undefined : b,
              deps: [...depA, ...depB, ...(round === 1 && !entrantsKnown ? prevStageIds : [])],
              depsCarryTeam: true,
              priority: base + round * 10,
            });
            fixtures.push(f);
            stageIds.push(f.id);
            next.push(`W:${f.id}`);
          } else next.push(a ?? b);
        }
        feeders = next;
        round++;
      }
      if (stage.thirdPlace) {
        const semis = fixtures.filter((f) => f.stageId === stage.id && f.round === round - 2);
        if (semis.length === 2) {
          const f = mk({
            stageId: stage.id,
            round: round - 1,
            label: 'Match pour la 3e place',
            homeFrom: `L:${semis[0].id}`,
            awayFrom: `L:${semis[1].id}`,
            deps: semis.map((s) => s.id),
            depsCarryTeam: true,
            priority: base + (round - 1) * 10 - 1,
          });
          fixtures.push(f);
          stageIds.push(f.id);
        }
      }
      entrantsKnown = false;
    } else if (stage.type === 'king_of_the_court') {
      const d = stage.kotc?.durationMin ?? 60;
      extraBlocks.push({ id: `B-${stage.id}`, label: `${stage.label} (King of the Court)`, kind: 'concours', start: -1, duration: d });
      entrants = Array.from({ length: Math.min(entrants.length, stage.advance ?? 4) }, (_, i) => `${i + 1}:${stage.id}`);
      entrantsKnown = false;
    } else {
      // Rondes à appariement dynamique : suisse, course aux points, échelle, double élimination
      const count = entrants.length;
      const rounds =
        stage.type === 'double_elim'
          ? Math.ceil(Math.log2(count)) * 2
          : stage.rounds ?? Math.ceil(Math.log2(count)) + 1;
      let prevRound: string[] = entrantsKnown ? [] : prevStageIds;
      let remaining = stage.type === 'double_elim' ? 2 * count - 1 : Infinity;
      for (let r = 1; r <= rounds && remaining > 0; r++) {
        const per = Math.min(Math.floor(count / 2), remaining);
        const ids: string[] = [];
        for (let i = 0; i < per; i++) {
          const f = mk({
            stageId: stage.id,
            round: r,
            label: `${stage.label} · Tour ${r} · ${i + 1}`,
            homeFrom: `R${r}`,
            awayFrom: `R${r}`,
            deps: prevRound,
            depsCarryTeam: true,
            priority: base + r * 10,
          });
          fixtures.push(f);
          ids.push(f.id);
          stageIds.push(f.id);
        }
        remaining -= per;
        prevRound = ids;
      }
      entrants = Array.from({ length: Math.min(entrants.length, stage.advance ?? 4) }, (_, i) => `${i + 1}:${stage.id}`);
      entrantsKnown = false;
    }
    if (stageIds.length) prevStageIds = stageIds;
  });
  return { fixtures, extraBlocks };
}

// ---------------------------------------------------------------------------
// 2. Ordonnancement
// ---------------------------------------------------------------------------

interface Busy {
  from: number;
  to: number;
}

const overlaps = (a: Busy, b: Busy) => a.from < b.to && b.from < a.to;

function freeAt(busy: Busy[], from: number, dur: number): number {
  let t = from;
  let moved = true;
  while (moved) {
    moved = false;
    for (const b of busy) {
      if (overlaps({ from: t, to: t + dur }, b)) {
        t = b.to;
        moved = true;
      }
    }
  }
  return t;
}

function courtStart(court: Court, busy: Busy[], from: number, dur: number): number | null {
  const windows = court.availability.slice().sort((a, b) => a.from - b.from);
  for (const w of windows) {
    let t = Math.max(from, w.from);
    t = freeAt(busy, t, dur);
    if (t + dur <= w.to) return t;
  }
  return null;
}

export function planSchedule(input: ScheduleInput, frozen: ScheduledMatch[] = [], disabledOfficials: Record<string, number> = {}): Schedule {
  const { fixtures, extraBlocks } = buildFixtures(input.format, input.teams, input.slotMinutes);
  return planFixtures(input, fixtures, extraBlocks, frozen, disabledOfficials);
}

export function planFixtures(
  input: ScheduleInput,
  fixtures: Fixture[],
  extraBlocks: FixedBlock[],
  frozen: ScheduledMatch[] = [],
  disabledOfficials: Record<string, number> = {},
): Schedule {
  const courtBusy = new Map<string, Busy[]>(input.courts.map((c) => [c.id, []]));
  const officialBusy = new Map<string, Busy[]>(input.officials.map((o) => [o.id, []]));
  const officialLoad = new Map<string, number>(input.officials.map((o) => [o.id, 0]));
  const teamReady = new Map<string, number>();
  const teamBusy = new Map<string, Busy[]>();
  const end = new Map<string, number>();
  const blocks: FixedBlock[] = input.blocks.map((b) => ({ ...b }));

  for (const b of blocks) if (b.courtId) courtBusy.get(b.courtId)?.push({ from: b.start, to: b.start + b.duration });

  const frozenIds = new Set(frozen.map((m) => m.id));
  const out: ScheduledMatch[] = [];
  for (const m of frozen) {
    out.push(m);
    if (m.start === undefined) continue;
    const span = { from: m.start, to: m.start + m.duration };
    if (m.courtId) courtBusy.get(m.courtId)?.push(span);
    for (const o of m.officials) {
      officialBusy.get(o)?.push(span);
      officialLoad.set(o, (officialLoad.get(o) ?? 0) + 1);
    }
    for (const t of [m.home, m.away]) if (t) addTeam(t, span);
    end.set(m.id, span.to);
  }

  function addTeam(t: string, span: Busy) {
    teamReady.set(t, Math.max(teamReady.get(t) ?? 0, span.to + input.minRestMinutes));
    const l = teamBusy.get(t) ?? [];
    l.push(span);
    teamBusy.set(t, l);
  }

  const pending = fixtures.filter((f) => !frozenIds.has(f.id));
  const showCourt = input.courts.find((c) => c.showCourt);

  // Blocs "King of the Court" : placés après les rencontres, sur le terrain principal.
  const kotcBlocks = extraBlocks.slice();

  while (pending.length) {
    let best: { f: Fixture; start: number; court: Court; officials: string[] } | null = null;
    for (const f of pending) {
      if (!f.deps.every((d) => end.has(d))) continue;
      let earliest = 0;
      for (const d of f.deps) earliest = Math.max(earliest, end.get(d)! + (f.depsCarryTeam ? input.minRestMinutes : 0));
      for (const t of [f.home, f.away]) if (t) earliest = Math.max(earliest, teamReady.get(t) ?? 0);
      // Les finales vont sur le terrain principal quand il existe
      const isFinalStage = /(^|· )(Finale|Demi)/.test(f.label);
      const candidates = isFinalStage && showCourt ? [showCourt] : input.courts;
      for (const court of candidates) {
        let start = courtStart(court, courtBusy.get(court.id)!, earliest, f.duration);
        if (start === null) continue;
        // Équipes déjà connues : pas de chevauchement
        for (const t of [f.home, f.away]) if (t) start = freeAt(teamBusy.get(t) ?? [], start, f.duration);
        const offs = pickOfficials(input, officialBusy, officialLoad, disabledOfficials, f, start);
        if (!offs) continue;
        const cand = { f, start: offs.start, court, officials: offs.ids };
        const re = courtStart(court, courtBusy.get(court.id)!, cand.start, f.duration);
        if (re === null || re !== cand.start) continue;
        if (
          !best ||
          cand.start < best.start ||
          (cand.start === best.start && f.priority < best.f.priority) ||
          (cand.start === best.start && f.priority === best.f.priority && court.id < best.court.id)
        )
          best = cand;
      }
    }
    if (!best) break; // plus rien de planifiable : signalé comme conflit
    const { f, start, court, officials } = best;
    const span = { from: start, to: start + f.duration };
    courtBusy.get(court.id)!.push(span);
    for (const o of officials) {
      officialBusy.get(o)!.push(span);
      officialLoad.set(o, (officialLoad.get(o) ?? 0) + 1);
    }
    for (const t of [f.home, f.away]) if (t) addTeam(t, span);
    end.set(f.id, span.to);
    out.push({ ...stripFixture(f), courtId: court.id, start, officials });
    pending.splice(pending.indexOf(f), 1);

  }

  for (const f of pending) out.push({ ...stripFixture(f) });

  let cursorEnd = Math.max(0, ...[...end.values()]);
  for (const kb of kotcBlocks) {
    const court = showCourt ?? input.courts[0];
    const start = court ? courtStart(court, courtBusy.get(court.id)!, cursorEnd, kb.duration) ?? cursorEnd : cursorEnd;
    blocks.push({ ...kb, start, courtId: court?.id });
    if (court) courtBusy.get(court.id)!.push({ from: start, to: start + kb.duration });
    cursorEnd = start + kb.duration;
  }

  const matches = out.sort((a, b) => (a.start ?? 1e9) - (b.start ?? 1e9) || a.id.localeCompare(b.id));
  const endsAt = Math.max(cursorEnd, ...matches.map((m) => (m.start ?? 0) + m.duration), ...blocks.map((b) => b.start + b.duration));
  const schedule: Schedule = { matches, blocks, conflicts: [], endsAt, stats: computeStats(matches, input, endsAt), version: 1 };
  schedule.conflicts = detectConflicts(schedule, input);
  return schedule;
}

function stripFixture(f: Fixture): ScheduledMatch {
  const { deps: _d, depsCarryTeam: _c, priority: _p, ...m } = f;
  return m;
}

function pickOfficials(
  input: ScheduleInput,
  busy: Map<string, Busy[]>,
  load: Map<string, number>,
  disabled: Record<string, number>,
  f: Fixture,
  from: number,
): { start: number; ids: string[] } | null {
  const need = input.officialsPerMatch;
  if (need === 0) return { start: from, ids: [] };
  const eligible = input.officials.filter(
    (o) => o.role === 'arbitre' && (!o.affiliatedTeamId || (o.affiliatedTeamId !== f.home && o.affiliatedTeamId !== f.away)),
  );
  if (eligible.length < need) return null;
  // Cherche le premier instant ≥ from où `need` arbitres sont libres et disponibles
  const candidatesT = new Set<number>([from]);
  for (const o of eligible) for (const b of busy.get(o.id) ?? []) if (b.to > from) candidatesT.add(b.to);
  for (const o of eligible) for (const w of o.availability) if (w.from > from) candidatesT.add(w.from);
  const times = [...candidatesT].sort((a, b) => a - b);
  for (const t of times) {
    const free = eligible.filter((o) => {
      if (disabled[o.id] !== undefined && t + f.duration > disabled[o.id]) return false;
      const inWindow = o.availability.some((w) => t >= w.from && t + f.duration <= w.to);
      return inWindow && !(busy.get(o.id) ?? []).some((b) => overlaps(b, { from: t, to: t + f.duration }));
    });
    if (free.length >= need) {
      free.sort((a, b) => (load.get(a.id) ?? 0) - (load.get(b.id) ?? 0) || a.id.localeCompare(b.id));
      return { start: t, ids: free.slice(0, need).map((o) => o.id) };
    }
  }
  return null;
}

function computeStats(matches: ScheduledMatch[], input: ScheduleInput, endsAt: number) {
  const byTeam = new Map<string, ScheduledMatch[]>();
  for (const m of matches)
    for (const t of [m.home, m.away])
      if (t && m.start !== undefined) byTeam.set(t, [...(byTeam.get(t) ?? []), m]);
  let maxWait = 0;
  let minRest = Infinity;
  let restSum = 0;
  let restN = 0;
  for (const ms of byTeam.values()) {
    ms.sort((a, b) => a.start! - b.start!);
    for (let i = 1; i < ms.length; i++) {
      const gap = ms[i].start! - (ms[i - 1].start! + ms[i - 1].duration);
      maxWait = Math.max(maxWait, gap);
      minRest = Math.min(minRest, gap);
      restSum += gap;
      restN++;
    }
  }
  const played = matches.filter((m) => m.start !== undefined).reduce((s, m) => s + m.duration, 0);
  const capacity = input.courts.reduce(
    (s, c) => s + c.availability.reduce((x, w) => x + Math.max(0, Math.min(w.to, endsAt) - w.from), 0),
    0,
  );
  return {
    maxWait,
    // Sans paire mesurable (équipes encore inconnues), le repos minimum est garanti par construction
    minRest: minRest === Infinity ? input.minRestMinutes : minRest,
    courtUtilization: capacity ? Math.round((played / capacity) * 100) / 100 : 0,
    avgRest: restN ? Math.round(restSum / restN) : 0,
  };
}

// ---------------------------------------------------------------------------
// 3. Détection des conflits
// ---------------------------------------------------------------------------

export function detectConflicts(s: Schedule, input: ScheduleInput): ScheduleConflict[] {
  const c: ScheduleConflict[] = [];
  const placed = s.matches.filter((m) => m.start !== undefined && m.status !== 'forfait' && m.status !== 'annule');
  for (const m of s.matches)
    if (m.start === undefined && m.status === 'planifie')
      c.push({ kind: 'non_planifie', matchIds: [m.id], message: `${m.label} n'a pas pu être programmé (terrain, arbitres ou horaires insuffisants).`, severity: 'bloquant' });

  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const A = { from: a.start!, to: a.start! + a.duration };
      const B = { from: b.start!, to: b.start! + b.duration };
      const teamsA = [a.home, a.away].filter(Boolean);
      const shared = [b.home, b.away].filter((t) => t && teamsA.includes(t));
      if (shared.length) {
        if (overlaps(A, B))
          c.push({ kind: 'equipe_double', matchIds: [a.id, b.id], message: `Équipe ${shared[0]} programmée sur deux matchs simultanés.`, severity: 'bloquant' });
        else {
          const gap = A.from < B.from ? B.from - A.to : A.from - B.to;
          if (gap < input.minRestMinutes)
            c.push({ kind: 'repos_insuffisant', matchIds: [a.id, b.id], message: `Repos de ${gap} min pour ${shared[0]} (minimum ${input.minRestMinutes}).`, severity: 'alerte' });
        }
      }
      if (overlaps(A, B)) {
        const sharedOff = a.officials.filter((o) => b.officials.includes(o));
        if (sharedOff.length)
          c.push({ kind: 'arbitre_double', matchIds: [a.id, b.id], message: `Officiel ${sharedOff[0]} affecté à deux matchs simultanés.`, severity: 'bloquant' });
        if (a.courtId && a.courtId === b.courtId)
          c.push({ kind: 'terrain_indisponible', matchIds: [a.id, b.id], message: `Deux matchs sur ${a.courtId} au même moment.`, severity: 'bloquant' });
      }
    }

  const offById = new Map(input.officials.map((o) => [o.id, o]));
  for (const m of placed) {
    for (const o of m.officials) {
      const off = offById.get(o);
      if (off?.affiliatedTeamId && (off.affiliatedTeamId === m.home || off.affiliatedTeamId === m.away))
        c.push({ kind: 'arbitre_partial', matchIds: [m.id], message: `${off.name} arbitre une équipe à laquelle il est lié.`, severity: 'bloquant' });
    }
    const court = input.courts.find((x) => x.id === m.courtId);
    if (court && !court.availability.some((w) => m.start! >= w.from && m.start! + m.duration <= w.to))
      c.push({ kind: 'terrain_indisponible', matchIds: [m.id], message: `${m.label} est programmé hors disponibilité de ${court.name}.`, severity: 'bloquant' });
    for (const b of s.blocks)
      if (b.courtId && b.courtId === m.courtId && overlaps({ from: b.start, to: b.start + b.duration }, { from: m.start!, to: m.start! + m.duration }))
        c.push({ kind: 'terrain_indisponible', matchIds: [m.id], message: `${m.label} chevauche « ${b.label} ».`, severity: 'bloquant' });
    if (m.start! + m.duration > input.dayEnd)
      c.push({ kind: 'hors_horaires', matchIds: [m.id], message: `${m.label} finit après la fermeture (${fmtTime(m.start! + m.duration, input.opening)}).`, severity: 'alerte' });
  }
  if (input.maxWaitMinutes && s.stats.maxWait > input.maxWaitMinutes)
    c.push({ kind: 'attente_excessive', matchIds: [], message: `Attente maximale entre deux matchs : ${s.stats.maxWait} min (objectif ≤ ${input.maxWaitMinutes}).`, severity: 'alerte' });
  return c;
}

// ---------------------------------------------------------------------------
// 4. Réorganisation en direct
// ---------------------------------------------------------------------------

export interface RescheduleResult {
  schedule: Schedule;
  moved: { id: string; label: string; before: string; after: string }[];
  forfeits: string[];
  /** Les modifications doivent être validées avant publication (§20). */
  requiresApproval: true;
}

export function reschedule(current: Schedule, input: ScheduleInput, disruption: Disruption, now: number): RescheduleResult {
  const courts = input.courts.map((c) => ({ ...c, availability: c.availability.map((w) => ({ ...w })) }));
  const blocks = current.blocks.map((b) => ({ ...b }));
  const disabled: Record<string, number> = {};
  const forfeits: string[] = [];
  let absentTeam: string | undefined;

  if (disruption.kind === 'retard') {
    blocks.push({ id: `retard-${disruption.courtId}-${now}`, label: `Retard ${disruption.minutes} min`, kind: 'pause', start: disruption.from, duration: disruption.minutes, courtId: disruption.courtId });
  } else if (disruption.kind === 'terrain_indisponible') {
    blocks.push({ id: `indispo-${disruption.courtId}-${now}`, label: 'Terrain indisponible', kind: 'pause', start: disruption.from, duration: disruption.to - disruption.from, courtId: disruption.courtId });
  } else if (disruption.kind === 'absence_officiel') {
    disabled[disruption.officialId] = disruption.from;
  } else {
    absentTeam = disruption.teamId;
  }

  // Figés : matchs commencés ou terminés (début < now).
  const frozen = current.matches.filter((m) => m.start !== undefined && m.start < now);
  const frozenIds = new Set(frozen.map((m) => m.id));
  const { fixtures, extraBlocks } = buildFixtures(input.format, input.teams, input.slotMinutes);
  for (const f of fixtures) {
    if (absentTeam && (f.home === absentTeam || f.away === absentTeam) && !frozenIds.has(f.id)) {
      // Forfait : match "terminé" immédiatement, l'adversaire est qualifié
      frozen.push({ ...stripFixture(f), start: now, duration: 0, status: 'forfait', courtId: undefined, officials: [] });
      frozenIds.add(f.id);
      forfeits.push(f.id);
    }
  }
  const inputNext: ScheduleInput = { ...input, courts, blocks: blocks.filter((b) => !b.id.startsWith('B-')) };
  // Aucun match à replanifier ne peut commencer avant `now`
  for (const c of inputNext.courts)
    c.availability = c.availability.map((w) => ({ from: Math.max(w.from, now), to: w.to })).filter((w) => w.to > w.from);
  const next = planFixtures(inputNext, fixtures, extraBlocks, frozen, disabled);
  // Conflits recalculés avec les disponibilités d'origine (les matchs figés restent légitimes)
  next.conflicts = detectConflicts(next, { ...input, blocks });
  next.version = current.version + 1;

  const before = new Map(current.matches.map((m) => [m.id, m]));
  const moved = next.matches
    .filter((m) => {
      const b = before.get(m.id);
      return b && (b.start !== m.start || b.courtId !== m.courtId) && m.status !== 'forfait';
    })
    .map((m) => {
      const b = before.get(m.id)!;
      return {
        id: m.id,
        label: m.label,
        before: `${fmtTime(b.start ?? 0, input.opening)} ${b.courtId ?? '—'}`,
        after: `${fmtTime(m.start ?? 0, input.opening)} ${m.courtId ?? '—'}`,
      };
    });
  return { schedule: next, moved, forfeits, requiresApproval: true };
}

export function fmtTime(min: number, opening = '09:00'): string {
  const [h, m] = opening.split(':').map(Number);
  const t = h * 60 + m + Math.round(min);
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Charge de publication vers site / écrans / espaces joueurs (dépend d'une intégration). */
export function publicationPayload(s: Schedule, input: ScheduleInput) {
  const name = new Map(input.teams.map((t) => [t.id, t.name]));
  return {
    version: s.version,
    generatedAt: new Date().toISOString(),
    matches: s.matches
      .filter((m) => m.start !== undefined)
      .map((m) => ({
        id: m.id,
        label: m.label,
        time: fmtTime(m.start!, input.opening),
        court: input.courts.find((c) => c.id === m.courtId)?.name ?? m.courtId,
        home: m.home ? name.get(m.home) : m.homeFrom,
        away: m.away ? name.get(m.away) : m.awayFrom,
        status: m.status,
      })),
    blocks: s.blocks.map((b) => ({ label: b.label, time: fmtTime(b.start, input.opening), duration: b.duration })),
  };
}
