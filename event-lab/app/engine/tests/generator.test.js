import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generate, admissible, normalizeBrief, budgetTier, transferDistance, rng } from '../generator.js';
import { applyVariant } from '../variants.js';
import { validate } from '../validate.js';

const TYPES = ['regles', 'qualification', 'recompenses', 'mise_en_scene', 'interaction_public', 'mecanique_jeu', 'experience_digitale', 'scenographie', 'son_lumiere', 'monetisation', 'fidelisation', 'activation_partenaire', 'creation_contenu'];
const FAMILIES = ['sport', 'esport', 'tv_media', 'jeu', 'musique_festival'];
const blocks = TYPES.flatMap((t, i) => [0, 1, 2].map((k) => ({
  id: `B-${t}-${k}`, type: t, name: `${t} ${k}`, mechanic: 'test',
  origin: { sector_family: FAMILIES[(i + k) % FAMILIES.length] },
  requirements: { budget_tier_min: k === 2 ? 3 : 0, staff_min: 1, tech: k === 1 ? ['ecran'] : ['aucune'], setting: 'indifferent' },
  attributes: { novelty: k + 2, ux_gain: 3, complexity: k + 1, cost: k + 1, media: 3, revenue: 2 + k, inclusion: 3, eco_impact: 3, portability: 4 - k },
})));

test('paliers budgétaires', () => {
  assert.equal(budgetTier(4999), 0); assert.equal(budgetTier(5000), 1); assert.equal(budgetTier(150000), 3); assert.equal(budgetTier(2e6), 4);
});

test('hypothèses explicites pour les données manquantes', () => {
  const { hypotheses, brief } = normalizeBrief({});
  assert.ok(hypotheses.length >= 5);
  assert.equal(brief.tier, 1);
});

test('filtrage : une brique hors budget est exclue', () => {
  const { brief } = normalizeBrief({ budget: 10000 });
  assert.equal(admissible(blocks.find((b) => b.id === 'B-regles-2'), brief), false);
  assert.equal(admissible(blocks.find((b) => b.id === 'B-regles-1'), brief), true); // écran louable dès T1
  const { brief: t0 } = normalizeBrief({ budget: 1000 });
  assert.equal(admissible(blocks.find((b) => b.id === 'B-regles-1'), t0), false);
});

test('distance de transfert', () => {
  assert.equal(transferDistance('sport', 'sport'), 1);
  assert.equal(transferDistance('sport', 'esport'), 2);
  assert.equal(transferDistance('tv_media', 'sport'), 3);
  assert.equal(transferDistance('tv_media', 'sport', { tv_media: { sport: 2 } }), 2);
});

test('génération reproductible, 6 directions, diversité', () => {
  const a = generate({ budget: 20000, discipline: 'basketball 3x3', sector_family: 'sport' }, blocks, { seed: 7 });
  const b = generate({ budget: 20000, discipline: 'basketball 3x3', sector_family: 'sport' }, blocks, { seed: 7 });
  assert.deepEqual(a.concepts.map((c) => c.format.summary), b.concepts.map((c) => c.format.summary));
  assert.ok(a.concepts.length >= 5);
  const dirs = new Set(a.concepts.map((c) => c.identity.directions[0]));
  assert.equal(dirs.size, a.concepts.length);
  for (const c of a.concepts) assert.ok(c.format.building_blocks.every((x) => x.block_id && !x.block_id.endsWith('-2')));
  const c = generate({ budget: 20000 }, blocks, { seed: 8 });
  assert.notDeepEqual(a.concepts.map((x) => x.format.summary), c.concepts.map((x) => x.format.summary));
});

test('rng déterministe', () => {
  const r1 = rng(1), r2 = rng(1);
  assert.equal(r1(), r2());
});

test('variantes : surcharges, ajouts et suppressions sans toucher à la base', () => {
  const base = { budget: { expenses: [{ id: 'E1', amount: 100 }, { id: 'E2', amount: 50 }], revenues: [{ id: 'R1', unit_amount: 10 }] },
    variants: [{ id: 'v', label: 'V', expense_overrides: { E1: 40, E2: null }, expense_additions: [{ id: 'E3', amount: 5 }], revenue_overrides: { R1: 20 } }] };
  const v = applyVariant(base, 'v');
  assert.deepEqual(v.budget.expenses.map((e) => [e.id, e.amount]), [['E1', 40], ['E3', 5]]);
  assert.equal(v.budget.revenues[0].unit_amount, 20);
  assert.equal(base.budget.expenses[0].amount, 100);
  assert.throws(() => applyVariant(base, 'inconnue'));
});

test('validateur : requis, enum, type, $ref', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { enum: ['x', 'y'] }, b: { $ref: '#/$defs/n' } }, $defs: { n: { type: 'number', minimum: 0 } } };
  assert.equal(validate(schema, { a: 'x', b: 1 }).valid, true);
  const r = validate(schema, { a: 'z', b: -1 });
  assert.equal(r.errors.length, 2);
  assert.equal(validate(schema, {}).errors[0].message, 'Champ requis manquant : a');
});
