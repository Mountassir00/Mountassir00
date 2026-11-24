// Tests du moteur EVENT LAB — valeurs attendues calculées à la main (voir commentaires).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightedScore, grade, confidence, computeGates, verdict, evaluate } from '../scoring.js';
import { simulate, breakeven, cashflow, sensitivity } from '../finance.js';
import { stageStructure, stageDuration } from '../competition.js';
import { queue, lanesNeeded, occupancy, arrivalsFromProfile, densityCheck } from '../flows.js';
import { criticalPath, staffNeeds } from '../staffing.js';
import { newVersion, edit, transition, derive, diff, FrozenVersionError, bump } from '../versioning.js';
import { runIncident } from '../incidents.js';

const R = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { rating: v, justification: 'test' }]));
const sampleRatings = R({ originalite: 3, experience_utilisateur: 3, faisabilite_technique: 4, viabilite_economique: 2, potentiel_mediatique: 3, reproductibilite: 4, adaptabilite_lieux: 3, accessibilite_inclusion: 3, potentiel_commercial: 2, responsabilite_environnementale: 3 });

test('score pondéré : exemple de docs/03 = 61, grade C', () => {
  const { score, raw } = weightedScore(sampleRatings);
  assert.equal(Math.round(raw * 10) / 10, 61);
  assert.equal(score, 61);
  assert.equal(grade(score), 'C');
  assert.equal(grade(80), 'A'); assert.equal(grade(79), 'B'); assert.equal(grade(65), 'B'); assert.equal(grade(64), 'C'); assert.equal(grade(49), 'D');
});

test('note manquante ou hors bornes refusée', () => {
  assert.throws(() => weightedScore({ ...sampleRatings, originalite: { rating: 6 } }));
  const { originalite, ...missing } = sampleRatings;
  assert.throws(() => weightedScore(missing));
});

test('confiance : tout en jugement expert = 0,3 ; tout en données réelles = 1', () => {
  assert.equal(confidence(sampleRatings), 0.3);
  const real = Object.fromEntries(Object.entries(sampleRatings).map(([k, v]) => [k, { ...v, evidence: 'donnees_reelles' }]));
  assert.equal(confidence(real), 1);
});

test('portes : risque sécurité impact 5 / proba 3 sans prévention → éliminé', () => {
  const cfg = { maturity: 'concept', risks: [{ id: 'R1', category: 'securite', description: 'x', probability: 3, impact: 5, prevention: [] }], compliance: [] };
  const g = computeGates(cfg);
  assert.equal(g.securite.status, 'bloquant');
  assert.equal(verdict(g), 'elimine');
});

test('portes : obligatoire à vérifier au stade blueprint → sous réserve ; critique sans plan → éliminé', () => {
  const cfg = { maturity: 'blueprint', risks: [], compliance: [{ id: 'C1', item: 'Déclaration', mandatory: true, status: 'a_verifier' }] };
  assert.equal(verdict(computeGates(cfg)), 'sous_reserve');
  assert.equal(verdict(computeGates({ ...cfg, maturity: 'concept' })), 'eligible');
  const crit = { risks: [{ id: 'R2', category: 'operationnel', description: 'x', probability: 2, impact: 4, critical: true }], compliance: [] };
  assert.equal(computeGates(crit).risques_critiques.status, 'bloquant');
});

test('evaluate : la porte déclarée plus sévère prime', () => {
  const cfg = { evaluation: { ratings: sampleRatings, gates: { securite: { status: 'a_verifier' } } } };
  const e = evaluate(cfg);
  assert.equal(e.score, 61);
  assert.equal(e.verdict, 'sous_reserve');
  assert.equal(e.improvements.top.length, 3);
  assert.equal(e.improvements.top[0].key, 'viabilite_economique'); // gain 15×3/5 = 9
});

// Cas financier :
// dépenses : 1000 fixe (devis) + 2 €/spectateur (estimation) ; recettes : billet 10 €/payant (50 % payants) + sponsor 500 fixe probable
// central : A=200 → billets 1000, sponsor 500×0,8 = 400 → R = 1400
//           D = 1000 + 2×200×1,05 = 1420 ; contingence 142 → 1562 ; résultat −162
// seuil : F = 1000×1,1 − 400 = 700 ; m = 0,5×10 − 2×1,05×1,1 = 2,69 ; A* = ⌈260,2⌉ = 261
const fin = {
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
};

test('finance : scénario central', () => {
  const s = simulate(fin, 'central');
  assert.equal(s.totals.revenue, 1400);
  assert.equal(s.totals.expenses_before_contingency, 1420);
  assert.equal(s.totals.expenses, 1562);
  assert.equal(s.totals.result, -162);
  assert.deepEqual(s.revenueByCertainty, { secured: 0, probable: 1400, hypothetical: 0 });
});

test('finance : le taux de réalisation ne décote pas les recettes au volume', () => {
  const p = simulate(fin, 'prudent');
  // billets = 10 × 50 payants = 500 (pas ×0,5) ; sponsor = 500 × 0,5 = 250
  assert.equal(p.revenues.find((r) => r.id === 'R1').amount, 500);
  assert.equal(p.revenues.find((r) => r.id === 'R2').amount, 250);
});

test('finance : seuil de rentabilité = 261 et cohérent avec la simulation', () => {
  const b = breakeven(fin, 'central');
  assert.equal(b.attendance, 261);
  const at = (A) => simulate({ ...fin, audience: { ...fin.audience, attendance: { ...fin.audience.attendance, central: A } } }, 'central').totals.result;
  assert.ok(at(261) >= 0);
  assert.ok(at(260) < 0);
});

test('finance : trésorerie — besoin maximal avant encaissement du sponsor', () => {
  const c = cashflow(fin, 'central');
  // J-30 : −1100 ; J-2 : −462 → −1562 ; J : +1000 → −562 ; J+30 : +400 → −162
  assert.equal(c.maxNeed, 1562);
  assert.equal(c.maxNeedDay, -2);
  assert.equal(c.final, -162);
});

test('finance : tornade triée par amplitude', () => {
  const t = sensitivity(fin);
  assert.equal(t.base, -162);
  for (let i = 1; i < t.items.length; i++) assert.ok(t.items[i - 1].swing >= t.items[i].swing);
});

test('compétition : poules 24 équipes / 6 poules / 2 terrains = 36 matchs, 18 créneaux', () => {
  const s = stageStructure({ id: 'p', type: 'round_robin', entrants: 24, groups: 6, slot_duration_min: 10, changeover_min: 2, parallel_units: 2 });
  assert.equal(s.matches, 36); assert.equal(s.rounds, 3); assert.equal(s.slots, 18);
  const d = stageDuration({ id: 'p', type: 'round_robin', entrants: 24, groups: 6, slot_duration_min: 10, changeover_min: 2, parallel_units: 2 });
  assert.equal(d.netMin, 216);
});

test('compétition : élimination directe et poules déséquilibrées', () => {
  assert.deepEqual(stageStructure({ id: 'k', type: 'single_elimination', entrants: 8, parallel_units: 2, slot_duration_min: 12 }).slotsPerRound, [2, 1, 1]);
  assert.equal(stageStructure({ id: 'k', type: 'single_elimination', entrants: 6, parallel_units: 1, slot_duration_min: 12 }).matches, 5);
  assert.equal(stageStructure({ id: 'r', type: 'round_robin', entrants: 5, groups: 1, parallel_units: 1, slot_duration_min: 10 }).matches, 10);
  assert.equal(stageStructure({ id: 'r', type: 'round_robin', entrants: 10, groups: 3, parallel_units: 1, slot_duration_min: 10 }).matches, 12);
  assert.equal(stageStructure({ id: 't', type: 'time_trial', entrants: 16, parallel_units: 2, slot_duration_min: 1.5 }).slots, 8);
});

test('flux : file d’attente fluide et dimensionnement', () => {
  const arr = [10, 10, 10, 0, 0, 0];
  const q = queue(arr, 1, 5);
  assert.equal(q.maxQueue, 15); assert.equal(q.maxQueueAtMin, 2); assert.equal(q.maxWaitMin, 3);
  assert.equal(lanesNeeded(arr, 5, 1).lanes, 2);
});

test('flux : occupation glissante et profil d’arrivée', () => {
  const o = occupancy([1, 1, 1, 1], 2);
  assert.equal(o.peak, 2); assert.equal(o.peakAtMin, 1);
  const a = arrivalsFromProfile(100, [{ from_min: 0, to_min: 10, share: 0.6 }, { from_min: 10, to_min: 20, share: 0.4 }]);
  assert.equal(Math.round(a.reduce((s, x) => s + x, 0)), 100);
  assert.equal(a[0], 6); assert.equal(a[15], 4);
  assert.equal(densityCheck({ people: 650, areaM2: 1000, authorizedCapacity: 600 }).alerts[0].level, 'rouge');
});

test('personnel : chemin critique', () => {
  const r = criticalPath([
    { id: 'A', duration: 2 }, { id: 'B', duration: 3, depends_on: ['A'] },
    { id: 'C', duration: 1, depends_on: ['A'] }, { id: 'D', duration: 2, depends_on: ['B', 'C'] },
  ]);
  assert.equal(r.totalDuration, 7);
  assert.deepEqual(r.criticalPath, ['A', 'B', 'D']);
  assert.equal(r.rows.find((x) => x.id === 'C').slack, 2);
  assert.throws(() => criticalPath([{ id: 'A', duration: 1, depends_on: ['B'] }, { id: 'B', duration: 1, depends_on: ['A'] }]));
  assert.equal(staffNeeds({ peakPresent: 300, entryLanes: 2 }).rows.find((x) => x.fn.startsWith('Sécurité')).count, null);
});

test('versionnement : une version validée est immuable', () => {
  const v = { id: 'x', version: '1.0.0', status: 'validated', history: [] };
  assert.throws(() => edit(v, (c) => { c.version = '9.9.9'; }), FrozenVersionError);
  const n = newVersion(v, { author: 't', summary: 's', date: '2026-11-24' });
  assert.equal(n.version, '1.1.0'); assert.equal(n.status, 'draft');
  assert.deepEqual(n.parent, { id: 'x', version: '1.0.0', relation: 'new_version' });
  assert.equal(v.status, 'validated'); // source intacte
  assert.equal(bump('1.2.3', 'major'), '2.0.0'); assert.equal(bump('1.2.3', 'patch'), '1.2.4');
});

test('versionnement : cycle de vie, adaptation et diff', () => {
  let c = { id: 'x', version: '0.1.0', status: 'draft', history: [{ version: '0.1.0', date: 'd', summary: 's' }], evaluation: { type: 'reelle' } };
  c = transition(c, 'submit', { actor: 'a', date: 'd' });
  assert.equal(c.status, 'review');
  c = transition(c, 'approve', { actor: 'directeur', date: 'd' });
  assert.equal(c.status, 'validated');
  assert.throws(() => transition(c, 'submit'));
  const adapt = derive(c, { relation: 'city_adaptation', city: 'Saint-Étienne', date: 'd' });
  assert.equal(adapt.id, 'x-saint-etienne'); assert.equal(adapt.evaluation.type, 'previsionnelle');
  const d = diff({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 }, e: 4 });
  assert.deepEqual(d.map((x) => x.path).sort(), ['/b/c', '/e']);
});

test('incidents : réduction de budget épargne les postes indispensables', () => {
  const cfg = structuredClone(fin);
  cfg.budget.expenses.push({ id: 'E3', category: 'com', label: 'Pub', amount: 300, basis: 'fixed', certainty: 'estimation', optional: true, priority: 3 });
  cfg.budget.expenses[0].priority = 1;
  const r = runIncident(cfg, { type: 'budget_cut', rate: 0.2 });
  assert.ok(r.actions.some((a) => a.includes('Pub')));
  assert.ok(!r.actions.some((a) => a.includes('Lieu')));
  assert.ok(r.impact.financialResultDelta > 0);
});

test('incidents : retard compensé par compression des séquences non critiques', () => {
  const cfg = { program: [
    { id: 's1', label: 'Poules', kind: 'competition', stage_ref: 'p', start_min: 600, duration_min: 100 },
    { id: 's2', label: 'Show', kind: 'show', start_min: 700, duration_min: 30 },
    { id: 's3', label: 'Finale', kind: 'competition', stage_ref: 'k', start_min: 730, duration_min: 20 },
  ], competition: { stages: [{ id: 'p', type: 'round_robin', entrants: 8, groups: 2, slot_duration_min: 10, parallel_units: 2 }, { id: 'k', type: 'single_elimination', entrants: 4, slot_duration_min: 12, parallel_units: 1 }] },
  budget: { expenses: [], revenues: [] } };
  const r = runIncident(cfg, { type: 'delay', minutes: 20, fromMin: 600 });
  assert.equal(r.details.residualDelayMin, 0);
  const fin2 = r.config.program.find((s) => s.id === 's3');
  assert.equal(fin2.start_min, 730); // la finale garde son horaire
  assert.equal(fin2.duration_min, 20); // et n'est jamais compressée
  assert.equal(r.config.program.find((s) => s.id === 's2').duration_min, 21); // le show absorbe d'abord (−9)
});
