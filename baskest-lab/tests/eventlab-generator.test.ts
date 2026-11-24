// Tests du générateur, des variantes et du validateur EVENT LAB — portés à l'identique depuis
// event-lab/app/engine/tests/generator.test.js (8 tests).
import { generate, admissible, normalizeBrief, budgetTier, transferDistance, rng } from '../src/core/eventlab/generator';
import { applyVariant } from '../src/core/eventlab/variants';
import { validate } from '../src/core/eventlab/validate';
import type { BlockType, BuildingBlock, Config, SectorFamily } from '../src/core/eventlab/types';

const TYPES: BlockType[] = ['regles', 'qualification', 'recompenses', 'mise_en_scene', 'interaction_public', 'mecanique_jeu', 'experience_digitale', 'scenographie', 'son_lumiere', 'monetisation', 'fidelisation', 'activation_partenaire', 'creation_contenu'];
const FAMILIES: SectorFamily[] = ['sport', 'esport', 'tv_media', 'jeu', 'musique_festival'];
const blocks: BuildingBlock[] = TYPES.flatMap((t, i) =>
  [0, 1, 2].map((k) => ({
    id: `B-${t}-${k}`,
    type: t,
    name: `${t} ${k}`,
    mechanic: 'test',
    ip_note: 'test',
    origin: { sector_family: FAMILIES[(i + k) % FAMILIES.length] },
    requirements: { budget_tier_min: k === 2 ? 3 : 0, staff_min: 1, tech: k === 1 ? ['ecran' as const] : ['aucune' as const], setting: 'indifferent' as const },
    attributes: { novelty: k + 2, ux_gain: 3, complexity: k + 1, cost: k + 1, media: 3, revenue: 2 + k, inclusion: 3, eco_impact: 3, portability: 4 - k },
  })),
);

test('paliers budgétaires', () => {
  expect(budgetTier(4999)).toBe(0);
  expect(budgetTier(5000)).toBe(1);
  expect(budgetTier(150000)).toBe(3);
  expect(budgetTier(2e6)).toBe(4);
});

test('hypothèses explicites pour les données manquantes', () => {
  const { hypotheses, brief } = normalizeBrief({});
  expect(hypotheses.length >= 5).toBe(true);
  expect(brief.tier).toBe(1);
});

test('filtrage : une brique hors budget est exclue', () => {
  const { brief } = normalizeBrief({ budget: 10000 });
  expect(admissible(blocks.find((b) => b.id === 'B-regles-2')!, brief)).toBe(false);
  expect(admissible(blocks.find((b) => b.id === 'B-regles-1')!, brief)).toBe(true); // écran louable dès T1
  const { brief: t0 } = normalizeBrief({ budget: 1000 });
  expect(admissible(blocks.find((b) => b.id === 'B-regles-1')!, t0)).toBe(false);
});

test('distance de transfert', () => {
  expect(transferDistance('sport', 'sport')).toBe(1);
  expect(transferDistance('sport', 'esport')).toBe(2);
  expect(transferDistance('tv_media', 'sport')).toBe(3);
  expect(transferDistance('tv_media', 'sport', { tv_media: { sport: 2 } })).toBe(2);
});

test('génération reproductible, 6 directions, diversité', () => {
  const a = generate({ budget: 20000, discipline: 'basketball 3x3', sector_family: 'sport' }, blocks, { seed: 7 });
  const b = generate({ budget: 20000, discipline: 'basketball 3x3', sector_family: 'sport' }, blocks, { seed: 7 });
  expect(a.concepts.map((c) => c.format.summary)).toEqual(b.concepts.map((c) => c.format.summary));
  expect(a.concepts.length >= 5).toBe(true);
  const dirs = new Set(a.concepts.map((c) => c.identity.directions[0]));
  expect(dirs.size).toBe(a.concepts.length);
  for (const c of a.concepts) expect(c.format.building_blocks.every((x) => x.block_id && !x.block_id.endsWith('-2'))).toBe(true);
  const c = generate({ budget: 20000 }, blocks, { seed: 8 });
  expect(a.concepts.map((x) => x.format.summary)).not.toEqual(c.concepts.map((x) => x.format.summary));
});

test('rng déterministe', () => {
  const r1 = rng(1);
  const r2 = rng(1);
  expect(r1()).toBe(r2());
});

test('variantes : surcharges, ajouts et suppressions sans toucher à la base', () => {
  const base = {
    budget: { expenses: [{ id: 'E1', amount: 100 }, { id: 'E2', amount: 50 }], revenues: [{ id: 'R1', unit_amount: 10 }] },
    variants: [{ id: 'v', label: 'V', expense_overrides: { E1: 40, E2: null }, expense_additions: [{ id: 'E3', amount: 5 }], revenue_overrides: { R1: 20 } }],
  } as unknown as Config;
  const v = applyVariant(base, 'v');
  expect(v.budget!.expenses.map((e) => [e.id, e.amount])).toEqual([
    ['E1', 40],
    ['E3', 5],
  ]);
  expect(v.budget!.revenues[0].unit_amount).toBe(20);
  expect(base.budget!.expenses[0].amount).toBe(100);
  expect(() => applyVariant(base, 'inconnue')).toThrow();
});

test('validateur : requis, enum, type, $ref', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { enum: ['x', 'y'] }, b: { $ref: '#/$defs/n' } }, $defs: { n: { type: 'number', minimum: 0 } } };
  expect(validate(schema, { a: 'x', b: 1 }).valid).toBe(true);
  const r = validate(schema, { a: 'z', b: -1 });
  expect(r.errors.length).toBe(2);
  expect(validate(schema, {}).errors[0].message).toBe('Champ requis manquant : a');
});
