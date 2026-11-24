import type { Budget, CostLine, PaymentTiming, RevenueLine, VenueType } from '../model';

/**
 * Gabarits de budget par échelle. TOUS les montants unitaires sont des
 * ESTIMATIONS d'ordre de grandeur (France, 2025-2026) à remplacer par des
 * devis réels : ils servent à cadrer une décision, pas à signer un contrat.
 */

export type BudgetScale = 'micro' | 'limite' | 'standard' | 'premium';

export interface TemplateParams {
  label: string;
  scale: BudgetScale;
  venueType: VenueType;
  spectators: number;
  participants: number;
  teams: number;
  hours: number;
  ticketPrice: number; // plein tarif moyen
  registrationPerTeam: number;
  cashPrize: number;
  volunteers: number;
  paidShare?: number;
}

const T = {
  upfront: [{ day: -60, share: 0.3 }, { day: 0, share: 0.7 }] as PaymentTiming[],
  onDay: [{ day: 0, share: 1 }] as PaymentTiming[],
  after: [{ day: 30, share: 1 }] as PaymentTiming[],
  before: [{ day: -30, share: 1 }] as PaymentTiming[],
  comms: [{ day: -45, share: 0.5 }, { day: -15, share: 0.5 }] as PaymentTiming[],
  presale: [{ day: -30, share: 0.2 }, { day: -7, share: 0.35 }, { day: 0, share: 0.45 }] as PaymentTiming[],
  regs: [{ day: -21, share: 0.7 }, { day: -3, share: 0.3 }] as PaymentTiming[],
  sponsor: [{ day: -45, share: 0.5 }, { day: 15, share: 0.5 }] as PaymentTiming[],
  subsidy: [{ day: -20, share: 0.5 }, { day: 90, share: 0.5 }] as PaymentTiming[],
};

const VENUE_RENT: Record<VenueType, number> = {
  terrain_exterieur: 0,
  city_stade: 0,
  gymnase: 300,
  complexe_sportif: 800,
  palais_des_sports: 5000, // hypothèse : tarif à obtenir auprès de la Métropole du Grand Nancy
  arena: 15000,
  place_publique: 400, // redevance d'occupation / AOT (hypothèse)
  centre_commercial: 0, // souvent apporté par le centre (contrepartie visibilité)
  campus: 200,
  espace_temporaire: 2500,
};

const SCALE: Record<BudgetScale, { av: number; comms: number; show: number; staff: number; security: number }> = {
  micro: { av: 0, comms: 150, show: 200, staff: 0, security: 0 },
  limite: { av: 400, comms: 500, show: 600, staff: 0, security: 300 },
  standard: { av: 2500, comms: 1500, show: 2500, staff: 800, security: 1200 },
  premium: { av: 9000, comms: 5000, show: 9000, staff: 3000, security: 4000 },
};

let n = 0;
const id = (p: string) => `${p}-${++n}`;

function cost(category: CostLine['category'], label: string, unitCost: number, quantity = 1, basis: CostLine['basis'] = 'fixe', timing = T.onDay, extra: Partial<CostLine> = {}): CostLine {
  return { id: id('c'), category, label, unitCost, quantity, basis, timing, ...extra };
}

function rev(stream: RevenueLine['stream'], nature: RevenueLine['nature'], label: string, unitAmount: number, quantity = 1, basis: RevenueLine['basis'] = 'fixe', probability = 1, secured = false, timing = T.onDay): RevenueLine {
  return { id: id('r'), stream, nature, label, unitAmount, quantity, basis, probability, secured, timing };
}

export function budgetTemplate(p: TemplateParams): Budget {
  const s = SCALE[p.scale];
  const big = p.spectators > 1500;
  const dpsCost = p.spectators < 300 ? 300 : p.spectators < 1500 ? 800 : p.spectators < 5000 ? 2200 : 4500;
  const costs: CostLine[] = [
    cost('infrastructure', 'Location / mise à disposition du lieu', VENUE_RENT[p.venueType], 1, 'fixe', T.upfront, {
      note: 'Hypothèse — demander la convention de mise à disposition (souvent réduite pour les associations).',
    }),
    cost('fluides', 'Fluides et ménage', p.venueType === 'palais_des_sports' || p.venueType === 'arena' ? 600 : 80, 1, 'fixe', T.after),
    cost('assurance', 'Extension RC organisateur pour l’événement', p.scale === 'micro' ? 80 : big ? 600 : 250, 1, 'fixe', T.before, {
      note: 'Obligation légale (Code du sport L321-1). Vérifier le contrat annuel de l’association.',
    }),
    cost('securite', 'Agents de sécurité (APS)', 30, Math.ceil(p.spectators / 250) * p.hours, 'fixe', T.after, {
      note: '≈ 30 €/h HT par agent (estimation) ; ratio à valider avec le gestionnaire du lieu.',
    }),
    cost('secours', 'Dispositif prévisionnel de secours (DPS)', dpsCost, 1, 'fixe', T.after, {
      note: 'Dimensionné selon le référentiel national DPS ; devis association agréée de sécurité civile.',
    }),
    cost('arbitrage', 'Arbitres et officiels de table', 45, Math.max(2, Math.ceil(p.teams / 3)), 'fixe', T.onDay),
    cost('materiel', 'Ballons, chasubles, chronos, scoring', p.scale === 'micro' ? 120 : 450, 1, 'fixe', T.before),
    cost('materiel', 'Tribunes / paniers mobiles (location)', p.venueType === 'place_publique' || p.venueType === 'espace_temporaire' ? 2500 : 0, 1, 'fixe', T.upfront),
    cost('communication', 'Affiches, flyers, signalétique', s.comms * 0.5, 1, 'fixe', T.comms),
    cost('communication', 'Publicité réseaux sociaux ciblée', s.comms * 0.5, 1, 'fixe', T.comms),
    cost('restauration', 'Repas et boissons bénévoles / officiels', 10, p.volunteers + 6, 'fixe', T.onDay),
    cost('restauration', 'Achats buvette (coût marchandises)', 2.2, 1, 'par_spectateur', T.onDay, { note: '≈ 45 % du panier moyen (estimation).' }),
    cost('recompenses', 'Trophées, médailles, lots', p.scale === 'micro' ? 150 : p.scale === 'premium' ? 1500 : 500, 1, 'fixe', T.before),
    cost('cash_prize', 'Cash prize', p.cashPrize, 1, 'fixe', T.onDay),
    cost('transport', 'Déplacements joueurs invités / logistique', p.scale === 'premium' ? 1500 : p.scale === 'standard' ? 400 : 0, 1, 'fixe', T.onDay),
    cost('hebergement', 'Hébergement invités', p.scale === 'premium' ? 1200 : p.scale === 'standard' ? 300 : 0, 1, 'fixe', T.before),
    cost('audiovisuel', 'Sono, DJ, lumière, écran', s.show, 1, 'fixe', T.upfront),
    cost('audiovisuel', 'Captation vidéo + photo', s.av, 1, 'fixe', T.after),
    cost('personnel', 'Personnel rémunéré (régie, technicien du lieu)', s.staff, 1, 'fixe', T.after),
    cost('prestataires', 'Billetterie en ligne et frais de paiement', 0.04 * p.ticketPrice, 1, 'par_spectateur', T.onDay, {
      note: 'Plateformes associatives parfois gratuites pour l’organisateur (contribution volontaire du payeur).',
    }),
    cost('prestataires', 'SACEM / droits musicaux', p.scale === 'micro' ? 60 : 250, 1, 'fixe', T.after),
    cost('securite', 'Sécurité incendie (SSIAP) si exigé par le lieu', big ? 35 * p.hours * 2 : 0, 1, 'fixe', T.after),
    cost('materiel', 'Matériel prêté par partenaires (valorisé)', p.scale === 'micro' ? 0 : 800, 1, 'fixe', T.onDay, { inKind: true }),
  ].filter((l) => l.unitCost * l.quantity > 0 || l.basis !== 'fixe');

  const revenues: RevenueLine[] = [
    rev('billetterie', 'commerciale', 'Billetterie (panier moyen)', p.ticketPrice, 1, 'par_spectateur_payant', 1, false, T.presale),
    rev('inscriptions', 'commerciale', 'Inscriptions équipes', p.registrationPerTeam, 1, 'par_equipe', 1, false, T.regs),
    rev('restauration', 'commerciale', 'Buvette / snacking (panier moyen)', 5, 1, 'par_spectateur', 0.9, false, T.onDay),
    rev('merchandising', 'commerciale', 'Merchandising (marge nette)', 0.6, 1, 'par_spectateur', 0.7, false, T.onDay),
    rev('sponsoring', 'commerciale', 'Partenaire principal (naming)', p.scale === 'premium' ? 8000 : p.scale === 'standard' ? 3000 : p.scale === 'limite' ? 1000 : 300, 1, 'fixe', 0.6, false, T.sponsor),
    rev('sponsoring', 'commerciale', 'Partenaires officiels (pack)', p.scale === 'premium' ? 2500 : p.scale === 'standard' ? 800 : 300, p.scale === 'micro' ? 1 : 4, 'fixe', 0.5, false, T.sponsor),
    rev('subventions', 'subvention', 'Subvention collectivité (manifestation sportive)', p.scale === 'premium' ? 6000 : p.scale === 'standard' ? 2500 : p.scale === 'limite' ? 800 : 0, 1, 'fixe', 0.5, false, T.subsidy),
    rev('hospitalites', 'commerciale', 'Hospitalités / courtside', p.scale === 'premium' ? 60 : p.scale === 'standard' ? 35 : 0, p.scale === 'premium' ? 80 : 30, 'fixe', 0.6, false, T.presale),
    rev('dons', 'don', 'Dons (cagnotte en ligne)', p.scale === 'micro' ? 150 : 500, 1, 'fixe', 0.6, false, T.before),
    rev('apports', 'apport', 'Matériel prêté par partenaires (apport en nature)', p.scale === 'micro' ? 0 : 800, 1, 'fixe', 1, true, T.onDay),
  ].filter((l) => l.unitAmount * l.quantity > 0);

  return {
    id: `budget-${p.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    label: p.label,
    assumptions: { spectators: p.spectators, participants: p.participants, teams: p.teams, paidShare: p.paidShare ?? 0.75 },
    costs,
    revenues,
    contingencyRate: p.scale === 'micro' ? 0.1 : 0.08,
  };
}
