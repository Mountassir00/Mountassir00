import type {
  Budget,
  BudgetAssumptions,
  CostCategory,
  CostLine,
  RevenueLine,
  RevenueNature,
  ScenarioResult,
} from '../model';
import { round } from '../rng';

/**
 * Simulateur financier (exigence §16).
 *
 * Règles comptables appliquées :
 * - un EMPRUNT n'est jamais une recette : il entre en trésorerie mais pas dans le résultat ;
 * - un APPORT EN NATURE est valorisé des deux côtés (neutre sur le résultat, non décaissé) ;
 * - DONS et SUBVENTIONS sont des produits, mais distingués des recettes commerciales
 *   (fiscalité, contreparties, justification) ;
 * - les imprévus sont calculés sur les coûts décaissés.
 *
 * Ceci est un outil de simulation, pas un conseil comptable ou fiscal :
 * faire valider le budget par le trésorier / un expert-comptable.
 */

export const COST_LABELS: Record<CostCategory, string> = {
  infrastructure: 'Location des infrastructures',
  fluides: 'Fluides (électricité, eau, chauffage)',
  assurance: 'Assurance',
  securite: 'Sécurité',
  secours: 'Secours (DPS)',
  arbitrage: 'Arbitrage et officiels',
  materiel: 'Matériel',
  communication: 'Communication',
  restauration: 'Restauration',
  recompenses: 'Récompenses',
  cash_prize: 'Cash prize',
  transport: 'Transport',
  hebergement: 'Hébergement',
  audiovisuel: 'Audiovisuel',
  personnel: 'Personnel',
  prestataires: 'Prestataires',
  imprevus: 'Imprévus',
};

export const NATURE_LABELS: Record<RevenueNature, string> = {
  commerciale: 'Recettes commerciales',
  don: 'Dons et mécénat',
  subvention: 'Subventions',
  apport: 'Apports (nature / fonds propres)',
  emprunt: 'Emprunts (hors résultat)',
};

type Basis = CostLine['basis'] | RevenueLine['basis'];

export function multiplier(basis: Basis, a: BudgetAssumptions): number {
  switch (basis) {
    case 'fixe':
      return 1;
    case 'par_spectateur':
      return a.spectators;
    case 'par_spectateur_payant':
      return a.spectators * a.paidShare;
    case 'par_participant':
      return a.participants;
    case 'par_equipe':
      return a.teams;
  }
}

export const costAmount = (l: CostLine, a: BudgetAssumptions) => l.unitCost * l.quantity * multiplier(l.basis, a);
export const revenueAmount = (l: RevenueLine, a: BudgetAssumptions) => l.unitAmount * l.quantity * multiplier(l.basis, a);

export interface ScenarioSpec {
  name: ScenarioResult['name'];
  spectatorFactor: number;
  participantFactor: number;
  costOverrun: number; // +x % sur les coûts décaissés
  /** Comment compter une recette incertaine. */
  revenueRule: (l: RevenueLine) => number; // coefficient appliqué
}

export const SCENARIOS: ScenarioSpec[] = [
  {
    name: 'prudent',
    spectatorFactor: 0.6,
    participantFactor: 0.8,
    costOverrun: 0.08,
    revenueRule: (l) => (l.secured || l.probability >= 0.9 ? 1 : 0),
  },
  {
    name: 'realiste',
    spectatorFactor: 1,
    participantFactor: 1,
    costOverrun: 0.03,
    revenueRule: (l) => (l.secured ? 1 : l.probability),
  },
  {
    name: 'ambitieux',
    spectatorFactor: 1.3,
    participantFactor: 1.1,
    costOverrun: 0,
    revenueRule: (l) => (l.secured || l.probability >= 0.3 ? 1 : 0),
  },
];

export function evaluateScenario(budget: Budget, spec: ScenarioSpec, startingCash = 0): ScenarioResult {
  const base = budget.assumptions;
  const a: BudgetAssumptions = {
    ...base,
    spectators: Math.round(base.spectators * spec.spectatorFactor),
    participants: Math.round(base.participants * spec.participantFactor),
    teams: Math.round(base.teams * spec.participantFactor),
  };
  return computeResult(budget, spec, a, startingCash);
}

function computeResult(budget: Budget, spec: ScenarioSpec, a: BudgetAssumptions, startingCash: number): ScenarioResult {
  const flows: { day: number; amount: number }[] = [];
  let cashCosts = 0;
  let inKindValue = 0;
  for (const l of budget.costs) {
    const amt = costAmount(l, a) * (l.inKind ? 1 : 1 + spec.costOverrun);
    if (l.inKind) inKindValue += amt;
    else {
      cashCosts += amt;
      for (const t of l.timing) flows.push({ day: t.day, amount: -amt * t.share });
    }
  }
  const contingency = cashCosts * budget.contingencyRate;
  cashCosts += contingency;
  flows.push({ day: -7, amount: -contingency * 0.5 }, { day: 0, amount: -contingency * 0.5 });

  const byNature: Record<RevenueNature, number> = { commerciale: 0, don: 0, subvention: 0, apport: 0, emprunt: 0 };
  let secured = 0;
  let topSponsor = 0;
  for (const l of budget.revenues) {
    const amt = revenueAmount(l, a) * spec.revenueRule(l);
    byNature[l.nature] += amt;
    if (l.secured) secured += amt;
    if (l.stream === 'sponsoring' || l.stream === 'mecenat') topSponsor = Math.max(topSponsor, amt);
    // Les apports en nature ne transitent pas par la trésorerie
    const inKindRevenue = l.nature === 'apport' && l.stream === 'apports' && /nature/i.test(l.label);
    if (!inKindRevenue) for (const t of l.timing) flows.push({ day: t.day, amount: amt * t.share });
  }
  const operatingRevenue = byNature.commerciale + byNature.don + byNature.subvention + byNature.apport;
  const totalCosts = cashCosts + inKindValue;
  const result = operatingRevenue - totalCosts;

  // Trésorerie : solde cumulé jour par jour (événement = J0)
  flows.sort((x, y) => x.day - y.day);
  const cashflow: { day: number; balance: number }[] = [];
  let bal = startingCash;
  let minCash = startingCash;
  let minCashDay = flows[0]?.day ?? 0;
  const days = [...new Set(flows.map((f) => f.day))].sort((x, y) => x - y);
  for (const d of days) {
    for (const f of flows) if (f.day === d) bal += f.amount;
    cashflow.push({ day: d, balance: round(bal, 0) });
    if (bal < minCash) {
      minCash = bal;
      minCashDay = d;
    }
  }

  const totalRevenues = operatingRevenue;
  const dependency = {
    subsidyShare: totalRevenues ? round(byNature.subvention / totalRevenues, 3) : 0,
    topSponsorShare: totalRevenues ? round(topSponsor / totalRevenues, 3) : 0,
    securedShare: totalRevenues ? round(secured / totalRevenues, 3) : 0,
  };

  const alerts: string[] = [];
  if (result < 0) alerts.push(`Déficit de ${fmtEur(-result)} dans le scénario ${spec.name}.`);
  if (budget.contingencyRate < 0.05) alerts.push('Provision pour imprévus < 5 % des coûts : risque élevé de dérapage.');
  if (dependency.subsidyShare > 0.4) alerts.push(`Dépendance aux subventions : ${Math.round(dependency.subsidyShare * 100)} % des produits.`);
  if (dependency.topSponsorShare > 0.3) alerts.push(`Concentration : un seul partenaire pèse ${Math.round(dependency.topSponsorShare * 100)} % des produits.`);
  if (dependency.securedShare < 0.5) alerts.push(`Seulement ${Math.round(dependency.securedShare * 100)} % des produits sont sécurisés (signés / votés).`);
  if (minCash < 0) alerts.push(`Besoin de trésorerie de ${fmtEur(-minCash)} au plus bas (J${minCashDay >= 0 ? '+' : ''}${minCashDay}). Négocier acomptes partenaires, préventes ou report de paiement.`);
  if (byNature.emprunt > 0) alerts.push(`${fmtEur(byNature.emprunt)} d'emprunt : à rembourser, exclu du résultat.`);

  return {
    name: spec.name,
    assumptions: a,
    totalCosts: round(totalCosts, 0),
    cashCosts: round(cashCosts, 0),
    inKindValue: round(inKindValue, 0),
    totalRevenues: round(totalRevenues, 0),
    revenuesByNature: Object.fromEntries(Object.entries(byNature).map(([k, v]) => [k, round(v, 0)])) as Record<RevenueNature, number>,
    result: round(result, 0),
    margin: totalRevenues ? round(result / totalRevenues, 3) : 0,
    breakEvenSpectators: breakEven(budget, spec, a),
    cashflow,
    minCash: round(minCash, 0),
    minCashDay,
    dependency,
    alerts,
  };
}

/** Nombre de spectateurs nécessaires pour équilibrer (toutes autres hypothèses égales). */
export function breakEven(budget: Budget, spec: ScenarioSpec, a: BudgetAssumptions): number | null {
  const at = (s: number) => {
    const r = computeResultLite(budget, spec, { ...a, spectators: s });
    return r;
  };
  const r0 = at(0);
  const r1 = at(1000);
  const slope = (r1 - r0) / 1000;
  if (slope <= 0) return r0 >= 0 ? 0 : null;
  const s = -r0 / slope;
  return s <= 0 ? 0 : Math.ceil(s);
}

function computeResultLite(budget: Budget, spec: ScenarioSpec, a: BudgetAssumptions): number {
  let costs = 0;
  let inKind = 0;
  for (const l of budget.costs) {
    const amt = costAmount(l, a) * (l.inKind ? 1 : 1 + spec.costOverrun);
    if (l.inKind) inKind += amt;
    else costs += amt;
  }
  costs *= 1 + budget.contingencyRate;
  let rev = 0;
  for (const l of budget.revenues) if (l.nature !== 'emprunt') rev += revenueAmount(l, a) * spec.revenueRule(l);
  return rev - costs - inKind;
}

export function runScenarios(budget: Budget, startingCash = 0): ScenarioResult[] {
  return SCENARIOS.map((s) => evaluateScenario(budget, s, startingCash));
}

export function costsByCategory(budget: Budget, a = budget.assumptions): Record<CostCategory, number> {
  const out = Object.fromEntries(Object.keys(COST_LABELS).map((k) => [k, 0])) as Record<CostCategory, number>;
  for (const l of budget.costs) out[l.category] += costAmount(l, a);
  out.imprevus += budget.costs.filter((l) => !l.inKind).reduce((s, l) => s + costAmount(l, a), 0) * budget.contingencyRate;
  for (const k of Object.keys(out) as CostCategory[]) out[k] = round(out[k], 0);
  return out;
}

export function fmtEur(x: number): string {
  return `${Math.round(x).toLocaleString('fr-FR').replace(/ | /g, ' ')} €`;
}

/** Grille tarifaire cohérente (évite l'erreur "tarification incohérente"). */
export function pricingGrid(fullPrice: number) {
  const r = (x: number) => Math.max(0, Math.round(x));
  return [
    { label: 'Moins de 12 ans', price: 0, note: 'Gratuit accompagné : lève le frein familial' },
    { label: 'Licenciés / étudiants', price: r(fullPrice * 0.6) },
    { label: 'Plein tarif', price: r(fullPrice) },
    { label: 'Pack famille (2 adultes + enfants)', price: r(fullPrice * 1.6), note: 'Moins cher que 2 pleins tarifs' },
    { label: 'Prévente (J-30 à J-7)', price: r(fullPrice * 0.8), note: 'Sécurise la trésorerie et réduit la file' },
    { label: 'Courtside / Premium', price: r(fullPrice * 4), note: 'Places bord terrain + accès zone joueurs' },
  ];
}
