// EVENT LAB — variantes de configuration (économique / standard / premium…)
// Une variante est un jeu de surcharges appliqué à une copie de la configuration de base.

/**
 * @param {object} config EventConfig de base
 * @param {string|null} variantId id dans config.variants ; null ou 'standard' = configuration de base
 */
export function applyVariant(config, variantId) {
  if (!variantId || variantId === 'standard') return structuredClone(config);
  const v = (config.variants ?? []).find((x) => x.id === variantId);
  if (!v) throw new Error(`Variante inconnue : ${variantId}`);
  const cfg = structuredClone(config);
  const b = cfg.budget ?? (cfg.budget = { expenses: [], revenues: [] });
  b.expenses = (b.expenses ?? [])
    .map((e) => (v.expense_overrides && e.id in v.expense_overrides ? { ...e, amount: v.expense_overrides[e.id] } : e))
    .filter((e) => !(v.expense_overrides && v.expense_overrides[e.id] === null));
  b.expenses.push(...structuredClone(v.expense_additions ?? []));
  b.revenues = (b.revenues ?? [])
    .map((r) => (v.revenue_overrides && r.id in v.revenue_overrides ? { ...r, unit_amount: v.revenue_overrides[r.id] } : r))
    .filter((r) => !(v.revenue_overrides && v.revenue_overrides[r.id] === null));
  b.revenues.push(...structuredClone(v.revenue_additions ?? []));
  if (v.audience_overrides) cfg.audience = { ...cfg.audience, ...v.audience_overrides };
  if (v.participants_overrides) cfg.participants = { ...cfg.participants, ...v.participants_overrides };
  if (v.venue_overrides) cfg.venue = { ...cfg.venue, ...v.venue_overrides };
  if (Array.isArray(v.program_overrides)) cfg.program = structuredClone(v.program_overrides);
  if (Array.isArray(v.competition_overrides)) cfg.competition = { ...cfg.competition, stages: structuredClone(v.competition_overrides) };
  cfg.active_variant = v.id;
  return cfg;
}

export function variantIds(config) {
  return ['standard', ...(config.variants ?? []).map((v) => v.id)];
}

export function variantLabel(config, id) {
  if (id === 'standard') return 'Configuration standard';
  return (config.variants ?? []).find((v) => v.id === id)?.label ?? id;
}
