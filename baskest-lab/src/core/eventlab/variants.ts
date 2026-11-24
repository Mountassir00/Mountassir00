// EVENT LAB — variantes de configuration (économique / standard / premium…)
// Une variante est un jeu de surcharges appliqué à une copie de la configuration de base.
import type { Audience, Budget, Config, Participants, Venue } from './types';

/**
 * @param variantId id dans config.variants ; null ou 'standard' = configuration de base
 */
export function applyVariant<T extends Config>(config: T, variantId: string | null | undefined): T {
  if (!variantId || variantId === 'standard') return structuredClone(config);
  const v = (config.variants ?? []).find((x) => x.id === variantId);
  if (!v) throw new Error(`Variante inconnue : ${variantId}`);
  const cfg = structuredClone(config);
  const b: Budget = cfg.budget ?? (cfg.budget = { expenses: [], revenues: [] });
  b.expenses = (b.expenses ?? [])
    .map((e) => (v.expense_overrides && e.id in v.expense_overrides ? { ...e, amount: v.expense_overrides[e.id] as number } : e))
    .filter((e) => !(v.expense_overrides && v.expense_overrides[e.id] === null));
  b.expenses.push(...structuredClone(v.expense_additions ?? []));
  b.revenues = (b.revenues ?? [])
    .map((r) => (v.revenue_overrides && r.id in v.revenue_overrides ? { ...r, unit_amount: v.revenue_overrides[r.id] as number } : r))
    .filter((r) => !(v.revenue_overrides && v.revenue_overrides[r.id] === null));
  b.revenues.push(...structuredClone(v.revenue_additions ?? []));
  if (v.audience_overrides) cfg.audience = { ...cfg.audience, ...v.audience_overrides } as Audience;
  if (v.participants_overrides) cfg.participants = { ...cfg.participants, ...v.participants_overrides } as Participants;
  if (v.venue_overrides) cfg.venue = { ...cfg.venue, ...v.venue_overrides } as Venue;
  if (Array.isArray(v.program_overrides)) cfg.program = structuredClone(v.program_overrides);
  if (Array.isArray(v.competition_overrides)) cfg.competition = { ...cfg.competition, stages: structuredClone(v.competition_overrides) };
  cfg.active_variant = v.id;
  return cfg;
}

export function variantIds(config: Config): string[] {
  return ['standard', ...(config.variants ?? []).map((v) => v.id)];
}

export function variantLabel(config: Config, id: string): string {
  if (id === 'standard') return 'Configuration standard';
  return (config.variants ?? []).find((v) => v.id === id)?.label ?? id;
}
