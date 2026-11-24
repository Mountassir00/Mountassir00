// Tests du moteur EVENT LAB — portés à l'identique depuis event-lab/app/engine/tests/engine.test.js (20 tests).
// Valeurs attendues calculées à la main (voir commentaires).
import { weightedScore, grade, confidence, computeGates, verdict, evaluate } from '../src/core/eventlab/scoring';
import { simulate, breakeven, cashflow, sensitivity } from '../src/core/eventlab/finance';
import { stageStructure, stageDuration } from '../src/core/eventlab/competition';
import { queue, lanesNeeded, occupancy, arrivalsFromProfile, densityCheck } from '../src/core/eventlab/flows';
import { criticalPath, staffNeeds } from '../src/core/eventlab/staffing';
import { newVersion, edit, transition, derive, diff, FrozenVersionError, bump } from '../src/core/eventlab/versioning';
import { runIncident } from '../src/core/eventlab/incidents';
import type { Config, CriterionKey, Ratings } from '../src/core/eventlab/types';

/** Les cas de test sont des configurations partielles, comme dans le moteur d'origine. */
const cfg = (x: unknown) => x as Config;

const R = (o: Record<CriterionKey, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { rating: v, justification: 'test' }])) as Ratings;
const sampleRatings = R({ originalite: 3, experience_utilisateur: 3, faisabilite_technique: 4, viabilite_economique: 2, potentiel_mediatique: 3, reproductibilite: 4, adaptabilite_lieux: 3, accessibilite_inclusion: 3, potentiel_commercial: 2, responsabilite_environnementale: 3 });

test('score pondéré : exemple de docs/03 = 61, grade C', () => {
  const { score, raw } = weightedScore(sampleRatings);
  expect(Math.round(raw * 10) / 10).toBe(61);
  expect(score).toBe(61);
  expect(grade(score)).toBe('C');
  expect(grade(80)).toBe('A');
  expect(grade(79)).toBe('B');
  expect(grade(65)).toBe('B');
  expect(grade(64)).toBe('C');
  expect(grade(49)).toBe('D');
});

test('note manquante ou hors bornes refusée', () => {
  expect(() => weightedScore({ ...sampleRatings, originalite: { rating: 6 } })).toThrow();
  const { originalite: _omit, ...missing } = sampleRatings;
  void _omit;
  expect(() => weightedScore(missing)).toThrow();
});

test('confiance : tout en jugement expert = 0,3 ; tout en données réelles = 1', () => {
  expect(confidence(sampleRatings)).toBe(0.3);
  const real = Object.fromEntries(Object.entries(sampleRatings).map(([k, v]) => [k, { ...v, evidence: 'donnees_reelles' as const }])) as Ratings;
  expect(confidence(real)).toBe(1);
});

test('portes : risque sécurité impact 5 / proba 3 sans prévention → éliminé', () => {
  const c = cfg({ maturity: 'concept', risks: [{ id: 'R1', category: 'securite', description: 'x', probability: 3, impact: 5, prevention: [] }], compliance: [] });
  const g = computeGates(c);
  expect(g.securite.status).toBe('bloquant');
  expect(verdict(g)).toBe('elimine');
});

test('portes : obligatoire à vérifier au stade blueprint → sous réserve ; critique sans plan → éliminé', () => {
  const c = cfg({ maturity: 'blueprint', risks: [], compliance: [{ id: 'C1', item: 'Déclaration', mandatory: true, status: 'a_verifier' }] });
  expect(verdict(computeGates(c))).toBe('sous_reserve');
  expect(verdict(computeGates({ ...c, maturity: 'concept' }))).toBe('eligible');
  const crit = cfg({ risks: [{ id: 'R2', category: 'operationnel', description: 'x', probability: 2, impact: 4, critical: true }], compliance: [] });
  expect(computeGates(crit).risques_critiques.status).toBe('bloquant');
});

test('evaluate : la porte déclarée plus sévère prime', () => {
  const c = cfg({ evaluation: { ratings: sampleRatings, gates: { securite: { status: 'a_verifier' } } } });
  const e = evaluate(c);
  expect(e.score).toBe(61);
  expect(e.verdict).toBe('sous_reserve');
  expect(e.improvements.top.length).toBe(3);
  expect(e.improvements.top[0].key).toBe('viabilite_economique'); // gain 15×3/5 = 9
});

// Cas financier :
// dépenses : 1000 fixe (devis) + 2 €/spectateur (estimation) ; recettes : billet 10 €/payant (50 % payants) + sponsor 500 fixe probable
// central : A=200 → billets 1000, sponsor 500×0,8 = 400 → R = 1400
//           D = 1000 + 2×200×1,05 = 1420 ; contingence 142 → 1562 ; résultat −162
// seuil : F = 1000×1,1 − 400 = 700 ; m = 0,5×10 − 2×1,05×1,1 = 2,69 ; A* = ⌈260,2⌉ = 261
const fin = cfg({
  audience: { attendance: { prudent: 100, central: 200, ambitieux: 300 }, paying_share: 0.5 },
  participants: { count: { prudent: 0, central: 0, ambitieux: 0 } },
  budget: {
    contingency_rate: 0.1,
    expenses: [
      { id: 'E1', category: 'lieu', label: 'Lieu', amount: 1000, basis: 'fixed', certainty: 'devis', pay_offset_days: -30 },
      { id: 'E2', category: 'buvette', label: 'Stock', amount: 2, basis: 'per_attendee', certainty: 'estimation', pay_offset_days: -2 },
    ],
    revenues: [
      { id: 'R1', stream: 'billetterie', label: 'Billets', unit_amount: 10, basis: 'per_paying_attendee', certainty: 'probable', cash_offset_days: 0 },
      { id: 'R2', stream: 'sponsoring', label: 'Sponsor', unit_amount: 500, basis: 'fixed', certainty: 'probable', cash_offset_days: 30 },
    ],
  },
});

test('finance : scénario central', () => {
  const s = simulate(fin, 'central');
  expect(s.totals.revenue).toBe(1400);
  expect(s.totals.expenses_before_contingency).toBe(1420);
  expect(s.totals.expenses).toBe(1562);
  expect(s.totals.result).toBe(-162);
  expect(s.revenueByCertainty).toEqual({ secured: 0, probable: 1400, hypothetical: 0 });
});

test('finance : le taux de réalisation ne décote pas les recettes au volume', () => {
  const p = simulate(fin, 'prudent');
  // billets = 10 × 50 payants = 500 (pas ×0,5) ; sponsor = 500 × 0,5 = 250
  expect(p.revenues.find((r) => r.id === 'R1')!.amount).toBe(500);
  expect(p.revenues.find((r) => r.id === 'R2')!.amount).toBe(250);
});

test('finance : seuil de rentabilité = 261 et cohérent avec la simulation', () => {
  const b = breakeven(fin, 'central');
  expect(b.attendance).toBe(261);
  const at = (A: number) => simulate({ ...fin, audience: { ...fin.audience!, attendance: { ...fin.audience!.attendance, central: A } } }, 'central').totals.result;
  expect(at(261) >= 0).toBe(true);
  expect(at(260) < 0).toBe(true);
});

test('finance : trésorerie — besoin maximal avant encaissement du sponsor', () => {
  const c = cashflow(fin, 'central');
  // J-30 : −1100 ; J-2 : −462 → −1562 ; J : +1000 → −562 ; J+30 : +400 → −162
  expect(c.maxNeed).toBe(1562);
  expect(c.maxNeedDay).toBe(-2);
  expect(c.final).toBe(-162);
});

test('finance : tornade triée par amplitude', () => {
  const t = sensitivity(fin);
  expect(t.base).toBe(-162);
  for (let i = 1; i < t.items.length; i++) expect(t.items[i - 1].swing >= t.items[i].swing).toBe(true);
});

test('compétition : poules 24 équipes / 6 poules / 2 terrains = 36 matchs, 18 créneaux', () => {
  const s = stageStructure({ id: 'p', type: 'round_robin', entrants: 24, groups: 6, slot_duration_min: 10, changeover_min: 2, parallel_units: 2 });
  expect(s.matches).toBe(36);
  expect(s.rounds).toBe(3);
  expect(s.slots).toBe(18);
  const d = stageDuration({ id: 'p', type: 'round_robin', entrants: 24, groups: 6, slot_duration_min: 10, changeover_min: 2, parallel_units: 2 });
  expect(d.netMin).toBe(216);
});

test('compétition : élimination directe et poules déséquilibrées', () => {
  expect(stageStructure({ id: 'k', type: 'single_elimination', entrants: 8, parallel_units: 2, slot_duration_min: 12 }).slotsPerRound).toEqual([2, 1, 1]);
  expect(stageStructure({ id: 'k', type: 'single_elimination', entrants: 6, parallel_units: 1, slot_duration_min: 12 }).matches).toBe(5);
  expect(stageStructure({ id: 'r', type: 'round_robin', entrants: 5, groups: 1, parallel_units: 1, slot_duration_min: 10 }).matches).toBe(10);
  expect(stageStructure({ id: 'r', type: 'round_robin', entrants: 10, groups: 3, parallel_units: 1, slot_duration_min: 10 }).matches).toBe(12);
  expect(stageStructure({ id: 't', type: 'time_trial', entrants: 16, parallel_units: 2, slot_duration_min: 1.5 }).slots).toBe(8);
});

test('flux : file d’attente fluide et dimensionnement', () => {
  const arr = [10, 10, 10, 0, 0, 0];
  const q = queue(arr, 1, 5);
  expect(q.maxQueue).toBe(15);
  expect(q.maxQueueAtMin).toBe(2);
  expect(q.maxWaitMin).toBe(3);
  expect(lanesNeeded(arr, 5, 1).lanes).toBe(2);
});

test('flux : occupation glissante et profil d’arrivée', () => {
  const o = occupancy([1, 1, 1, 1], 2);
  expect(o.peak).toBe(2);
  expect(o.peakAtMin).toBe(1);
  const a = arrivalsFromProfile(100, [{ from_min: 0, to_min: 10, share: 0.6 }, { from_min: 10, to_min: 20, share: 0.4 }]);
  expect(Math.round(a.reduce((s, x) => s + x, 0))).toBe(100);
  expect(a[0]).toBe(6);
  expect(a[15]).toBe(4);
  expect(densityCheck({ people: 650, areaM2: 1000, authorizedCapacity: 600 }).alerts[0].level).toBe('rouge');
});

test('personnel : chemin critique', () => {
  const r = criticalPath([
    { id: 'A', duration: 2 },
    { id: 'B', duration: 3, depends_on: ['A'] },
    { id: 'C', duration: 1, depends_on: ['A'] },
    { id: 'D', duration: 2, depends_on: ['B', 'C'] },
  ]);
  expect(r.totalDuration).toBe(7);
  expect(r.criticalPath).toEqual(['A', 'B', 'D']);
  expect(r.rows.find((x) => x.id === 'C')!.slack).toBe(2);
  expect(() => criticalPath([{ id: 'A', duration: 1, depends_on: ['B'] }, { id: 'B', duration: 1, depends_on: ['A'] }])).toThrow();
  expect(staffNeeds({ peakPresent: 300, entryLanes: 2 }).rows.find((x) => x.fn.startsWith('Sécurité'))!.count).toBe(null);
});

test('versionnement : une version validée est immuable', () => {
  const v = cfg({ id: 'x', version: '1.0.0', status: 'validated', history: [] });
  expect(() =>
    edit(v, (c) => {
      c.version = '9.9.9';
    }),
  ).toThrow(FrozenVersionError);
  const n = newVersion(v, { author: 't', summary: 's', date: '2026-11-24' });
  expect(n.version).toBe('1.1.0');
  expect(n.status).toBe('draft');
  expect(n.parent).toEqual({ id: 'x', version: '1.0.0', relation: 'new_version' });
  expect(v.status).toBe('validated'); // source intacte
  expect(bump('1.2.3', 'major')).toBe('2.0.0');
  expect(bump('1.2.3', 'patch')).toBe('1.2.4');
});

test('versionnement : cycle de vie, adaptation et diff', () => {
  let c = cfg({ id: 'x', version: '0.1.0', status: 'draft', history: [{ version: '0.1.0', date: 'd', summary: 's' }], evaluation: { type: 'reelle' } });
  c = transition(c, 'submit', { actor: 'a', date: 'd' });
  expect(c.status).toBe('review');
  c = transition(c, 'approve', { actor: 'directeur', date: 'd' });
  expect(c.status).toBe('validated');
  expect(() => transition(c, 'submit')).toThrow();
  const adapt = derive(c, { relation: 'city_adaptation', city: 'Saint-Étienne', date: 'd' });
  expect(adapt.id).toBe('x-saint-etienne');
  expect(adapt.evaluation!.type).toBe('previsionnelle');
  const d = diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 }, e: 4 });
  expect(d.map((x) => x.path).sort()).toEqual(['/b/c', '/e']);
});

test('incidents : réduction de budget épargne les postes indispensables', () => {
  const c = structuredClone(fin);
  c.budget!.expenses.push({ id: 'E3', category: 'com', label: 'Pub', amount: 300, basis: 'fixed', certainty: 'estimation', optional: true, priority: 3 });
  c.budget!.expenses[0].priority = 1;
  const r = runIncident(c, { type: 'budget_cut', rate: 0.2 });
  expect(r.actions.some((a) => a.includes('Pub'))).toBe(true);
  expect(r.actions.some((a) => a.includes('Lieu'))).toBe(false);
  expect(r.impact.financialResultDelta > 0).toBe(true);
});

test('incidents : retard compensé par compression des séquences non critiques', () => {
  const c = cfg({
    program: [
      { id: 's1', label: 'Poules', kind: 'competition', stage_ref: 'p', start_min: 600, duration_min: 100 },
      { id: 's2', label: 'Show', kind: 'show', start_min: 700, duration_min: 30 },
      { id: 's3', label: 'Finale', kind: 'competition', stage_ref: 'k', start_min: 730, duration_min: 20 },
    ],
    competition: { stages: [{ id: 'p', type: 'round_robin', entrants: 8, groups: 2, slot_duration_min: 10, parallel_units: 2 }, { id: 'k', type: 'single_elimination', entrants: 4, slot_duration_min: 12, parallel_units: 1 }] },
    budget: { expenses: [], revenues: [] },
  });
  const r = runIncident(c, { type: 'delay', minutes: 20, fromMin: 600 });
  expect(r.details.residualDelayMin).toBe(0);
  const fin2 = r.config.program!.find((s) => s.id === 's3')!;
  expect(fin2.start_min).toBe(730); // la finale garde son horaire
  expect(fin2.duration_min).toBe(20); // et n'est jamais compressée
  expect(r.config.program!.find((s) => s.id === 's2')!.duration_min).toBe(21); // le show absorbe d'abord (−9)
});
