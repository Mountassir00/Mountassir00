// EVENT LAB — simulateur financier (docs/07-algorithmes.md §7)

export const SCENARIOS = ['prudent', 'central', 'ambitieux'];

export const DEFAULT_PARAMS = {
  realization: {
    prudent: { secured: 1, probable: 0.5, hypothetical: 0 },
    central: { secured: 1, probable: 0.8, hypothetical: 0.3 },
    ambitieux: { secured: 1, probable: 1, hypothetical: 0.7 },
  },
  overrun: { prudent: 0.15, central: 0.05, ambitieux: 0 },
  contingency: 0.1,
};

const r2 = (x) => Math.round(x * 100) / 100;

function params(config) {
  const p = structuredClone(DEFAULT_PARAMS);
  for (const s of SCENARIOS) {
    const sp = config.scenarios?.[s];
    if (sp?.realization) Object.assign(p.realization[s], sp.realization);
    if (typeof sp?.cost_overrun === 'number') p.overrun[s] = sp.cost_overrun;
  }
  if (typeof config.budget?.contingency_rate === 'number') p.contingency = config.budget.contingency_rate;
  return p;
}

export function volumes(config, scenario, overrides = {}) {
  const A = overrides.attendance ?? config.audience?.attendance?.[scenario] ?? 0;
  const P = overrides.participants ?? config.participants?.count?.[scenario] ?? 0;
  const paying = A * (overrides.paying_share ?? config.audience?.paying_share ?? 1);
  return { A, P, paying };
}

function volumeFor(basis, v) {
  switch (basis) {
    case 'fixed': return 1;
    case 'per_paying_attendee': return v.paying;
    case 'per_attendee': return v.A;
    case 'per_participant': return v.P;
    default: throw new Error(`Base inconnue : ${basis}`);
  }
}

/**
 * Simule un scénario.
 * @param {object} config EventConfig
 * @param {string} scenario prudent | central | ambitieux
 * @param {object} [f] facteurs de sensibilité { attendance, sponsoring, expenses, price } (multiplicateurs, 1 = neutre)
 */
export function simulate(config, scenario, f = {}) {
  const p = params(config);
  const fx = { attendance: 1, sponsoring: 1, expenses: 1, price: 1, ...f };
  const base = volumes(config, scenario);
  const v = { A: base.A * fx.attendance, P: base.P, paying: base.paying * fx.attendance };

  const revenues = (config.budget?.revenues ?? []).map((l) => {
    const k = l.basis === 'fixed' ? p.realization[scenario][l.certainty] ?? 0 : 1;
    let unit = l.unit_amount;
    if (l.stream === 'billetterie' || l.stream === 'inscriptions') unit *= fx.price;
    let amount = unit * volumeFor(l.basis, v) * (l.margin_rate ?? 1) * k;
    if (l.stream === 'sponsoring') amount *= fx.sponsoring;
    return { id: l.id, stream: l.stream, label: l.label, certainty: l.certainty, basis: l.basis, amount: r2(amount), cash_offset_days: l.cash_offset_days ?? 0 };
  });

  const expenses = (config.budget?.expenses ?? []).filter((e) => !(f.excludeOptional && e.optional)).map((e) => {
    const drift = e.certainty === 'devis' ? 0 : p.overrun[scenario];
    const amount = e.amount * volumeFor(e.basis, v) * (1 + drift) * fx.expenses;
    return { id: e.id, category: e.category, label: e.label, certainty: e.certainty, basis: e.basis, optional: !!e.optional, priority: e.priority ?? 2, amount: r2(amount), pay_offset_days: e.pay_offset_days ?? 0 };
  });

  const totalRevenue = revenues.reduce((s, l) => s + l.amount, 0);
  const subtotalExpenses = expenses.reduce((s, l) => s + l.amount, 0);
  const contingency = subtotalExpenses * p.contingency;
  const totalExpenses = subtotalExpenses + contingency;
  const byCertainty = { secured: 0, probable: 0, hypothetical: 0 };
  for (const l of revenues) byCertainty[l.certainty] = r2((byCertainty[l.certainty] ?? 0) + l.amount);

  return {
    scenario,
    volumes: { attendance: v.A, paying: r2(v.paying), participants: v.P },
    revenues, expenses,
    totals: {
      revenue: r2(totalRevenue),
      expenses_before_contingency: r2(subtotalExpenses),
      contingency: r2(contingency),
      expenses: r2(totalExpenses),
      result: r2(totalRevenue - totalExpenses),
      margin_rate: totalRevenue ? r2((totalRevenue - totalExpenses) / totalRevenue) : null,
    },
    revenueByCertainty: byCertainty,
  };
}

export function simulateAll(config) {
  return Object.fromEntries(SCENARIOS.map((s) => [s, simulate(config, s)]));
}

/** Seuil de rentabilité en spectateurs uniques (07 §7.2), participants fixés au scénario. */
export function breakeven(config, scenario = 'central') {
  const p = params(config);
  const share = config.audience?.paying_share ?? 1;
  const P = config.participants?.count?.[scenario] ?? 0;
  const c = 1 + p.contingency;
  const drift = (e) => (e.certainty === 'devis' ? 0 : p.overrun[scenario]);
  let F = 0, m = 0;
  for (const e of config.budget?.expenses ?? []) {
    const amt = e.amount * (1 + drift(e)) * c;
    if (e.basis === 'fixed') F += amt;
    else if (e.basis === 'per_participant') F += amt * P;
    else if (e.basis === 'per_attendee') m -= amt;
  }
  for (const l of config.budget?.revenues ?? []) {
    const unit = l.unit_amount * (l.margin_rate ?? 1);
    if (l.basis === 'fixed') F -= unit * (p.realization[scenario][l.certainty] ?? 0);
    else if (l.basis === 'per_participant') F -= unit * P;
    else if (l.basis === 'per_paying_attendee') m += unit * share;
    else if (l.basis === 'per_attendee') m += unit;
  }
  if (F <= 0) return { scenario, attendance: 0, fixedGap: r2(F), unitMargin: r2(m), note: 'Couvert sans spectateur' };
  if (m <= 0) return { scenario, attendance: null, fixedGap: r2(F), unitMargin: r2(m), note: 'Pas de seuil : chaque spectateur supplémentaire coûte plus qu’il ne rapporte' };
  return { scenario, attendance: Math.ceil(F / m), fixedGap: r2(F), unitMargin: r2(m) };
}

/** Plan de trésorerie (07 §7.3) : flux triés par date relative à J, solde cumulé, besoin maximal. */
export function cashflow(config, scenario = 'central') {
  const sim = simulate(config, scenario);
  const p = params(config);
  const flows = [
    ...sim.expenses.map((e) => ({ day: e.pay_offset_days, label: e.label, amount: -e.amount * (1 + p.contingency) })),
    ...sim.revenues.map((r) => ({ day: r.cash_offset_days, label: r.label, amount: r.amount })),
  ].sort((a, b) => a.day - b.day || a.amount - b.amount);
  let cum = 0, min = 0, minDay = null;
  const timeline = flows.map((fl) => {
    cum += fl.amount;
    if (cum < min) { min = cum; minDay = fl.day; }
    return { ...fl, amount: r2(fl.amount), cumulative: r2(cum) };
  });
  return { scenario, timeline, maxNeed: r2(-min), maxNeedDay: minDay, final: r2(cum) };
}

/** Sensibilité (07 §7.4) : tornade sur le scénario central. */
export function sensitivity(config, scenario = 'central', ranges = { attendance: 0.2, sponsoring: 0.3, expenses: 0.15, price: 0.1 }) {
  const base = simulate(config, scenario).totals.result;
  const labels = { attendance: 'Fréquentation', sponsoring: 'Sponsoring', expenses: 'Dépenses', price: 'Prix (billets, inscriptions)' };
  const items = Object.entries(ranges).map(([k, d]) => {
    const low = simulate(config, scenario, { [k]: 1 - d }).totals.result;
    const high = simulate(config, scenario, { [k]: 1 + d }).totals.result;
    const elasticity = base !== 0 ? r2(((high - base) / Math.abs(base)) / d) : null;
    return { factor: k, label: labels[k], range: d, low: r2(low - base), high: r2(high - base), swing: r2(Math.abs(high - low)), elasticity };
  });
  items.sort((a, b) => b.swing - a.swing);
  return { scenario, base: r2(base), items };
}
