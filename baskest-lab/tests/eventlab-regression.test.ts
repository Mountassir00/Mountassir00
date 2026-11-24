// Non-régression : le moteur TypeScript reproduit exactement les chiffres du blueprint LA GRILLE 3x3 v0.2.0
// (event-lab/blueprints/la-grille-3x3/generated/summary.json, produit par l'ancien moteur JavaScript)
// et le dossier BLUEPRINT.md assemblé ; il recalcule aussi les notes du portefeuille (scores-summary.json).
import fs from 'node:fs';
import path from 'node:path';
import {
  renderGenerated,
  assembleBlueprint,
  evaluate,
  simulateAll,
  applyVariant,
  variantIds,
  cashflow,
  sensitivity,
  simulateCompetition,
  breakeven,
  type EventConfig,
} from '../src/core/eventlab';

const EL = path.resolve(__dirname, '../../event-lab');
const BP = path.join(EL, 'blueprints/la-grille-3x3');
const read = (p: string) => fs.readFileSync(p, 'utf8');
const config = JSON.parse(read(path.join(BP, 'event.json'))) as EventConfig;
const expected = JSON.parse(read(path.join(BP, 'generated/summary.json')));
/** Normalise comme JSON.stringify (clés undefined retirées, Infinity → null). */
const j = (x: unknown) => JSON.parse(JSON.stringify(x));

test('LA GRILLE 3x3 : résumé chiffré identique à summary.json v0.2.0 (score, seuil, trésorerie, variantes)', () => {
  const { summary } = renderGenerated(config);
  expect(j(summary)).toEqual(expected.summary);
  // Valeurs clés vérifiées explicitement (lisibilité du test)
  expect(summary.score).toBe(62);
  expect(summary.grade).toBe('C');
  expect(summary.verdict).toBe('sous_reserve');
  expect(summary.results).toEqual({ prudent: -11203.19, central: -3997.62, ambitieux: 4021.5 });
  expect(summary.breakevenCentral).toBe(1060);
  expect(summary.cashNeedCentral).toBe(8484.15);
  expect(summary.cashNeedDay).toBe('J+0');
  expect(Object.keys(summary.variants)).toEqual(['standard', 'economique', 'premium', 'secours']);
});

test('LA GRILLE 3x3 : évaluation, 3 scénarios, 4 variantes, trésorerie, sensibilité et compétition identiques', () => {
  expect(j(evaluate(config))).toEqual(expected.evaluation);
  expect(j(simulateAll(config))).toEqual(expected.scenarios);
  expect(j(Object.fromEntries(variantIds(config).map((id) => [id, simulateAll(applyVariant(config, id))])))).toEqual(expected.variants);
  expect(j(cashflow(config, 'central'))).toEqual(expected.cashflow);
  expect(j(sensitivity(config))).toEqual(expected.sensitivity);
  expect(j(simulateCompetition(config))).toEqual(expected.competition);
  for (const id of variantIds(config)) expect(breakeven(applyVariant(config, id), 'central').attendance).toBe(expected.summary.variants[id].breakevenCentral);
});

test('LA GRILLE 3x3 : sections générées et BLUEPRINT.md identiques au dépôt', () => {
  const { sections, summary } = renderGenerated(config);
  for (const [k, v] of Object.entries(sections)) expect(`${v}\n`).toBe(read(path.join(BP, 'generated/sections', `${k}.md`)));
  const { markdown, missing } = assembleBlueprint(read(path.join(BP, 'narrative.md')), sections, summary, config);
  expect(missing).toEqual([]);
  expect(markdown === read(path.join(BP, 'BLUEPRINT.md'))).toBe(true);
});

test('portefeuille : score, grade, confiance et verdict recalculés = scores-summary.json', () => {
  const ref = JSON.parse(read(path.join(EL, 'portfolio/scores-summary.json'))).concepts as { id: string; score: number; grade: string; confidence: number; verdict: string }[];
  expect(ref.length).toBe(10);
  for (const r of ref) {
    const c = JSON.parse(read(path.join(EL, 'portfolio/concepts', `${r.id}.json`))) as EventConfig;
    const e = evaluate(c);
    expect({ id: r.id, score: e.score, grade: e.grade, confidence: e.confidence, verdict: e.verdict }).toEqual({ id: r.id, score: r.score, grade: r.grade, confidence: r.confidence, verdict: r.verdict });
  }
});
