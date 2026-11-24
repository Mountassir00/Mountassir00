import { budgetTemplate } from '../src/core/finance/templates';
import { runScenarios, evaluateScenario, SCENARIOS } from '../src/core/finance/budget';
import { generateLayout, requiredExits, widthToUP, requiredPmrPlaces } from '../src/core/venue/layout';
import { PALAIS_JEAN_WEILLE } from '../src/data/venues';
import { computeMaturity } from '../src/core/scoring/maturity';
import type { Budget } from '../src/core/model';

describe('finance', () => {
  const b = budgetTemplate({ label: 't', scale: 'standard', venueType: 'palais_des_sports', spectators: 1800, participants: 40, teams: 4, hours: 6, ticketPrice: 10, registrationPerTeam: 0, cashPrize: 0, volunteers: 35 });
  it('produit 3 scénarios ordonnés', () => {
    const [p, r, a] = runScenarios(b);
    expect(p.result).toBeLessThan(r.result);
    expect(r.result).toBeLessThan(a.result);
  });
  it('un emprunt n’est jamais une recette', () => {
    const withLoan: Budget = { ...b, revenues: [...b.revenues, { id: 'l', stream: 'emprunts', nature: 'emprunt', label: 'Prêt', basis: 'fixe', unitAmount: 5000, quantity: 1, probability: 1, secured: true, timing: [{ day: -60, share: 1 }] }] };
    const r0 = evaluateScenario(b, SCENARIOS[1]);
    const r1 = evaluateScenario(withLoan, SCENARIOS[1]);
    expect(r1.result).toBe(r0.result);
    expect(r1.minCash).toBeGreaterThan(r0.minCash);
  });
  it('point mort cohérent : plus de public = meilleur résultat', () => {
    const r = runScenarios(b)[1];
    expect(r.breakEvenSpectators).not.toBeNull();
  });
});

describe('configurateur de salles', () => {
  it('implante un terrain 5x5 au Palais Jean-Weille avec 2 m de dégagement', () => {
    const l = generateLayout(PALAIS_JEAN_WEILLE, { variant: 'show', fullCourts: 1, halfCourts: 0, runOffM: 2, spectators: 2500, participants: 40, teams: 4, volunteers: 40, partners: 6, vipGuests: 50 });
    expect(l.zones.some((z) => z.type === 'terrain')).toBe(true);
    expect(l.unplaced.filter((u) => u.startsWith('Terrain'))).toHaveLength(0);
    expect(l.capacity.seated).toBeGreaterThanOrEqual(6000);
  });
  it('règles d’évacuation indicatives', () => {
    expect(requiredExits(800)).toBe(2);
    expect(requiredExits(2600)).toBe(6);
    expect(widthToUP(1.4)).toBe(2);
    expect(widthToUP(1.8)).toBe(3);
    expect(requiredPmrPlaces(300)).toBe(7);
  });
});

describe('maturité', () => {
  it('ne déclare jamais un format validé sans éditions réussies', () => {
    const m = computeMaturity({ documented: true, simulationRuns: 5000, prototypeSessions: 3, pilotEditions: 1, editionsMeetingTargets: 1, replications: 0, otherTerritories: 0 });
    expect(m.level).toBe('evenement_pilote');
    expect(m.next?.level).toBe('format_valide');
  });
  it('les niveaux sont cumulatifs', () => {
    expect(computeMaturity({ documented: true, simulationRuns: 0, prototypeSessions: 0, pilotEditions: 2, editionsMeetingTargets: 2, replications: 0, otherTerritories: 0 }).level).toBe('concept_documente');
  });
});
