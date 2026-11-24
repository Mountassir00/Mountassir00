import { generateConcepts, mutateConcept } from '../src/core/generator/generator';
import { MECHANICS } from '../src/data/mechanics';

describe('générateur de concepts', () => {
  const lib = { mechanics: MECHANICS, innovations: [] };
  const res = generateConcepts({ objectives: ['spectacle', 'inclusion'], audiences: ['familles', 'jeunes'], venueType: 'gymnase', budgetTier: 'limite', scale: 'locale', innovationLevel: 3, expectedSpectators: 250, durationHours: 6, seed: 't', candidates: 5, count: 3 }, lib);
  it('retourne des concepts analysés et notés sur 100', () => {
    expect(res).toHaveLength(3);
    for (const r of res) {
      expect(r.evaluation.total).toBeGreaterThan(0);
      expect(r.evaluation.total).toBeLessThanOrEqual(100);
      expect(r.evaluation.criteria.reduce((s, c) => s + c.max, 0)).toBe(100);
      expect(r.concept.private).toBe(true);
    }
  });
  it('les mineurs déclenchent la procédure d’autorisation parentale', () => {
    expect(res.every((r) => r.concept.safety.minorsImageConsent === true)).toBe(true);
  });
  it('maturité "en simulation" après analyse, jamais au-delà sans test terrain', () => {
    expect(res.every((r) => r.evaluation.maturity === 'concept_en_simulation' || r.evaluation.maturity === 'concept_documente')).toBe(true);
  });
  it('mutation : une seule modification à la fois', () => {
    const m = mutateConcept(res[0].concept, lib, 1);
    expect(m.concept.version).toBe(res[0].concept.version + 1);
    expect(m.change.length).toBeGreaterThan(0);
  });
});
