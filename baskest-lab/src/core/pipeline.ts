import type {
  Budget,
  Concept,
  Court,
  Evaluation,
  FairnessReport,
  FixedBlock,
  Innovation,
  Layout,
  Official,
  OpsPlan,
  RuleResult,
  Schedule,
  ScenarioResult,
  Venue,
} from './model';
import { analyzeFormat } from './simulation/analysis';
import { planSchedule, type ScheduleInput } from './scheduler/scheduler';
import { budgetTemplate } from './finance/templates';
import { runScenarios } from './finance/budget';
import { generateLayout, type LayoutRequest } from './venue/layout';
import { defaultOps, runDesignRules } from './rules/design-rules';
import { evaluateConcept } from './scoring/evaluate';
import { computeMaturity } from './scoring/maturity';
import { ALL_VENUES } from '../data/venues';

/**
 * Chaîne d'analyse complète d'un concept : c'est le cœur de BASK'EST LAB.
 * idée → simulation sportive → programmation → budget → implantation →
 * règles de conception → notation /100 → maturité.
 */

export interface ConceptAnalysis {
  concept: Concept;
  ops: OpsPlan;
  venue: Venue;
  fairness: FairnessReport;
  scheduleInput: ScheduleInput;
  schedule: Schedule;
  budget: Budget;
  scenarios: ScenarioResult[];
  layoutRequest: LayoutRequest;
  layout: Layout;
  rules: RuleResult[];
  evaluation: Evaluation;
}

export interface PipelineOptions {
  runs?: number;
  seed?: number | string;
  innovations?: Innovation[];
  venues?: Venue[];
}

export function venueFor(concept: Concept, venues: Venue[] = ALL_VENUES): Venue {
  return (
    venues.find((v) => v.id === concept.venueId) ??
    venues.find((v) => v.type === concept.venueType && v.id.startsWith('tpl-')) ??
    venues.find((v) => v.type === concept.venueType) ??
    venues.find((v) => v.id === 'tpl-gymnase')!
  );
}

export function buildScheduleInput(concept: Concept, ops: OpsPlan): ScheduleInput {
  const dayEnd = Math.round(concept.durationHours * 60);
  const courts: Court[] = Array.from({ length: ops.courts }, (_, i) => ({
    id: `C${i + 1}`,
    name: i === 0 ? 'Terrain central' : `Terrain ${i + 1}`,
    availability: [{ from: 0, to: dayEnd }],
    showCourt: i === 0,
  }));
  const officials: Official[] = Array.from({ length: ops.officials }, (_, i) => ({
    id: `O${i + 1}`,
    name: `Arbitre ${i + 1}`,
    role: 'arbitre',
    availability: [{ from: 0, to: dayEnd }],
  }));
  const blocks: FixedBlock[] = [
    { id: 'ouverture', label: 'Ouverture & présentation des équipes', kind: 'ceremonie', start: 0, duration: 20, courtId: 'C1' },
  ];
  if (ops.extraBlocks?.length) blocks.push(...ops.extraBlocks);
  else if (dayEnd >= 240) blocks.push({ id: 'pause-show', label: 'Show mi-temps (concours public / partenaire)', kind: 'animation', start: Math.round(dayEnd * 0.45), duration: 20, courtId: 'C1' });
  const nTeams = concept.format.teams * Math.max(1, concept.format.divisions?.length ?? 1);
  const teams = Array.from({ length: nTeams }, (_, i) => ({ id: `T${String(i + 1).padStart(2, '0')}`, name: `Équipe ${i + 1}` }));
  return {
    format: concept.format,
    teams,
    courts,
    officials,
    blocks,
    slotMinutes: ops.slotMinutes,
    minRestMinutes: ops.minRestMinutes,
    officialsPerMatch: concept.format.teamSize >= 4 ? 2 : 1,
    dayEnd,
    maxWaitMinutes: 75,
    opening: ops.opening ?? '13:00',
  };
}

export function analyzeConcept(concept: Concept, opts: PipelineOptions = {}): ConceptAnalysis {
  const runs = opts.runs ?? 150;
  const ops = defaultOps(concept);
  const venue = venueFor(concept, opts.venues);
  const fairness = analyzeFormat(concept.format, { runs, seed: opts.seed ?? concept.id });

  const divs = Math.max(1, concept.format.divisions?.length ?? 1);
  const scheduleInput = buildScheduleInput(concept, ops);
  const schedule = planSchedule(scheduleInput);

  const budget = budgetTemplate({
    label: concept.title,
    scale: concept.budgetTier,
    venueType: concept.venueType,
    spectators: concept.expectedSpectators,
    participants: concept.format.teams * divs * concept.format.rosterSize,
    teams: concept.format.teams * divs,
    hours: concept.durationHours,
    ticketPrice: ops.ticketPrice,
    registrationPerTeam: ops.registrationFee,
    cashPrize: ops.cashPrize,
    volunteers: concept.volunteersNeeded,
    paidShare: ops.ticketPrice === 0 ? 0 : 0.75,
  });
  const scenarios = runScenarios(budget);

  const fullCourts = concept.format.teamSize >= 4 ? Math.min(ops.courts, venue.courts.full || 1) : 0;
  const halfCourts = concept.format.teamSize <= 3 ? ops.courts : 0;
  const layoutRequest: LayoutRequest = {
    variant: concept.objectives.includes('spectacle') && ops.courts === 1 ? 'show' : concept.core === 'communautaire' ? 'festival' : 'tournoi',
    fullCourts,
    halfCourts,
    runOffM: concept.safety.runOffM,
    spectators: concept.expectedSpectators,
    participants: concept.format.teams * divs * concept.format.rosterSize,
    teams: concept.format.teams * divs,
    volunteers: concept.volunteersNeeded,
    partners: ops.partners,
    vipGuests: ops.vipGuests,
  };
  const layout = generateLayout(venue, layoutRequest);

  const rules = runDesignRules({
    concept,
    ops,
    fairness,
    schedule,
    dayEndMinutes: scheduleInput.dayEnd,
    budget,
    scenarios,
    layout,
    outdoor: !venue.indoor,
  });

  const evidence = { ...concept.evidence, simulationRuns: Math.max(concept.evidence.simulationRuns, runs) };
  const updated: Concept = { ...concept, evidence, maturity: computeMaturity(evidence).level, ops };
  const evaluation = evaluateConcept({ concept: updated, fairness, scenarios, rules, layout, innovations: opts.innovations });
  return { concept: updated, ops, venue, fairness, scheduleInput, schedule, budget, scenarios, layoutRequest, layout, rules, evaluation };
}
