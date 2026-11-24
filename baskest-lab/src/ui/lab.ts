import type { Concept } from '../core/model';
import { analyzeConcept, type ConceptAnalysis } from '../core/pipeline';
import { CONCEPTS } from '../data/concepts';
import { INNOVATIONS } from '../data/innovations';
import { MECHANICS } from '../data/mechanics';
import { ASG_2027 } from '../data/flagship-asg-2027';

/** Données partagées par les pages + cache d'analyse (les moteurs sont déterministes). */
export const LIB = { mechanics: MECHANICS, innovations: INNOVATIONS };
export const BUILTIN_CONCEPTS: Concept[] = [ASG_2027, ...CONCEPTS];

const cache = new Map<string, ConceptAnalysis>();
export function analysisOf(c: Concept, runs = 120): ConceptAnalysis {
  const key = `${c.id}@${c.version}@${runs}@${JSON.stringify(c.format)}@${c.expectedSpectators}@${c.budgetTier}`;
  let a = cache.get(key);
  if (!a) {
    a = analyzeConcept(c, { runs, innovations: INNOVATIONS });
    cache.set(key, a);
  }
  return a;
}

export function loadSavedConcepts(): Concept[] {
  try {
    return JSON.parse(localStorage.getItem('baskest-lab:concepts') ?? '[]') as Concept[];
  } catch {
    return [];
  }
}

export function allConcepts(): Concept[] {
  return [...BUILTIN_CONCEPTS, ...loadSavedConcepts()];
}
