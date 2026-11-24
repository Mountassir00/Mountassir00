import { VERDICT_LABELS } from '../simulation/analysis';
import type {
  Budget,
  CompetitionFormat,
  Concept,
  ErrorCategory,
  FairnessReport,
  Layout,
  OpsPlan,
  RuleOutcome,
  RuleResult,
  Schedule,
  ScenarioResult,
} from '../model';

/**
 * Règles de conception issues de l'Observatoire des erreurs (exigence §5).
 * Chaque erreur documentée (src/data/errors.ts) pointe vers une ou plusieurs
 * règles ; chaque règle est vérifiée AUTOMATIQUEMENT sur tout concept généré
 * ou modifié. Les seuils sont des choix de conception explicites, révisables
 * après chaque audit post-événement (exigence §22).
 */

export interface RuleContext {
  concept: Concept;
  ops: OpsPlan;
  fairness?: FairnessReport;
  schedule?: Schedule;
  dayEndMinutes?: number;
  budget?: Budget;
  scenarios?: ScenarioResult[];
  layout?: Layout;
  outdoor?: boolean;
}

export interface DesignRule {
  id: string;
  key: string;
  label: string;
  category: ErrorCategory;
  threshold: string;
  check: (c: RuleContext) => { outcome: RuleOutcome; message: string; fix?: string };
}

const ok = (message: string) => ({ outcome: 'ok' as const, message });
const warn = (message: string, fix?: string) => ({ outcome: 'alerte' as const, message, fix });
const block = (message: string, fix?: string) => ({ outcome: 'bloquant' as const, message, fix });
const na = (message: string) => ({ outcome: 'non_evaluable' as const, message });

const hasMinors = (c: Concept) =>
  c.audiences.some((a) => a === 'enfants' || a === 'jeunes') ||
  (c.format.composition ?? []).some((r) => r.kind === 'age');

export const DESIGN_RULES: DesignRule[] = [
  {
    id: 'R01',
    key: 'regles_lisibles',
    label: 'Règles compréhensibles en 30 secondes',
    category: 'reglement_incomprehensible',
    threshold: '≤ 2 règles spéciales par match (≤ 3 si public averti)',
    check: ({ concept }) => {
      const n = concept.format.match.mechanics.length;
      const expert = concept.audiences.every((a) => a === 'passionnes' || a === 'haut_niveau' || a === 'amateurs');
      const max = expert ? 3 : 2;
      return n <= max
        ? ok(`${n} règle(s) spéciale(s) en match.`)
        : warn(`${n} règles spéciales : le public non initié décroche.`, 'Garder les 2 mécaniques les plus spectaculaires ; afficher les règles à l’écran et les faire expliquer par le speaker.');
    },
  },
  {
    id: 'R02',
    key: 'temps_morts_programme',
    label: 'Pas de temps mort sur le terrain principal',
    category: 'temps_morts',
    threshold: 'aucun creux > 10 min sans animation sur le terrain principal',
    check: ({ schedule }) => {
      if (!schedule) return na('Planning non généré.');
      const main = schedule.matches.filter((m) => m.start !== undefined && m.courtId === schedule.matches.find((x) => x.courtId)?.courtId);
      const items = [
        ...main.map((m) => ({ s: m.start!, e: m.start! + m.duration })),
        ...schedule.blocks.filter((b) => !b.courtId || b.courtId === main[0]?.courtId).map((b) => ({ s: b.start, e: b.start + b.duration })),
      ].sort((a, b) => a.s - b.s);
      let maxGap = 0;
      for (let i = 1; i < items.length; i++) maxGap = Math.max(maxGap, items[i].s - Math.max(...items.slice(0, i).map((x) => x.e)));
      return maxGap <= 10
        ? ok(`Creux maximal ${Math.max(0, maxGap)} min sur le terrain principal.`)
        : warn(`Creux de ${maxGap} min sur le terrain principal.`, 'Insérer un concours (tir, dunk, public), une présentation ou une animation sponsor dans le creux.');
    },
  },
  {
    id: 'R03',
    key: 'attente_equipes',
    label: 'Attente des équipes entre deux matchs',
    category: 'organisation_matchs',
    threshold: '≤ 75 min (alerte au-delà)',
    check: ({ schedule }) => {
      if (!schedule) return na('Planning non généré.');
      const w = schedule.stats.maxWait;
      return w <= 75 ? ok(`Attente maximale ${w} min.`) : warn(`Attente maximale ${w} min : les joueurs se démobilisent.`, 'Ajouter un terrain, réordonner les poules ou créer des défis annexes pendant l’attente.');
    },
  },
  {
    id: 'R04',
    key: 'repos_minimum',
    label: 'Temps de récupération des joueurs',
    category: 'organisation_matchs',
    threshold: '≥ 10 min (3x3 / 1c1), ≥ 20 min (5x5) ; bloquant si < 5 min',
    check: ({ schedule, concept }) => {
      if (!schedule) return na('Planning non généré.');
      const need = concept.format.teamSize >= 4 ? 20 : 10;
      const r = schedule.stats.minRest;
      if (r === 0 && schedule.matches.length < 2) return na('Pas assez de matchs.');
      if (r < 5) return block(`Repos minimal ${r} min : risque physique et iniquité.`, `Imposer ${need} min de repos dans le moteur de programmation.`);
      return r >= need ? ok(`Repos minimal ${r} min.`) : warn(`Repos minimal ${r} min (objectif ${need}).`, 'Augmenter le repos minimum ou ajouter un terrain.');
    },
  },
  {
    id: 'R05',
    key: 'marge_retard',
    label: 'Marge anti-retard dans le planning',
    category: 'retards',
    threshold: 'fin prévue ≤ 90 % du créneau disponible',
    check: ({ schedule, dayEndMinutes }) => {
      if (!schedule || !dayEndMinutes) return na('Planning non généré.');
      const ratio = schedule.endsAt / dayEndMinutes;
      return ratio <= 0.9
        ? ok(`Marge de ${Math.round((1 - ratio) * dayEndMinutes)} min.`)
        : warn(`Planning rempli à ${Math.round(ratio * 100)} % : aucun retard absorbable.`, 'Réduire la durée des matchs, supprimer un match de classement ou ouvrir plus tôt.');
    },
  },
  {
    id: 'R06',
    key: 'ambiance_plan',
    label: 'Plan d’ambiance (speaker + musique)',
    category: 'manque_ambiance',
    threshold: 'speaker ET DJ/playlist prévus',
    check: ({ ops }) =>
      ops.speaker && ops.dj ? ok('Speaker et DJ prévus.') : warn('Ambiance non assurée (speaker ou DJ manquant).', 'Prévoir un speaker formé au format et une playlist/DJ calée sur le conducteur.'),
  },
  {
    id: 'R07',
    key: 'inscription_simple',
    label: 'Inscription en ligne simple',
    category: 'inscription',
    threshold: 'en ligne, clôture ≥ J-2, check-in ≤ 3 min/équipe',
    check: ({ ops, concept }) => {
      if (concept.core !== 'match' && concept.core !== 'mixte' && concept.format.teams <= 1) return na('Pas d’inscription d’équipes.');
      const issues: string[] = [];
      if (!ops.registrationOnline) issues.push('inscription non dématérialisée');
      if (ops.registrationCloseDays < 2) issues.push(`clôture à J-${ops.registrationCloseDays}`);
      if (ops.checkInMinutesPerTeam > 3) issues.push(`check-in ${ops.checkInMinutesPerTeam} min/équipe`);
      return issues.length ? warn(`Parcours d’inscription : ${issues.join(', ')}.`, 'Formulaire en ligne unique (paiement + décharge + droit à l’image), clôture J-3, QR code de check-in.') : ok('Inscription en ligne, clôture anticipée, check-in rapide.');
    },
  },
  {
    id: 'R08',
    key: 'flux_entree',
    label: 'Capacité des entrées (files d’attente)',
    category: 'files_attente',
    threshold: '60 % du public entre en 45 min sans saturation',
    check: ({ ops, concept }) => {
      const peak = concept.expectedSpectators * 0.6;
      const capacity = ops.entryPoints * ops.entryThroughputPerMin * 45;
      if (concept.expectedSpectators < 150) return ok('Faible affluence : pas de contrôle d’accès critique.');
      const need = Math.ceil(peak / (ops.entryThroughputPerMin * 45));
      return capacity >= peak
        ? ok(`${ops.entryPoints} point(s) de contrôle pour un pic de ${Math.round(peak)} entrées.`)
        : warn(`File d’attente probable : ${ops.entryPoints} point(s) pour ${need} nécessaires.`, `Ouvrir ${need} files, ouverture des portes 60 min avant, billets QR en prévente.`);
    },
  },
  {
    id: 'R09',
    key: 'visibilite_public',
    label: 'Lisibilité du score et du jeu pour le public',
    category: 'visibilite',
    threshold: 'tableau de score dès 300 spectateurs, écran dès 1 500',
    check: ({ ops, concept }) => {
      const s = concept.expectedSpectators;
      if (s >= 1500 && !ops.screens) return warn('Plus de 1 500 spectateurs sans écran : replays, règles et score illisibles.', 'Louer un écran LED ou utiliser l’écran du lieu ; afficher score, règles, réseaux.');
      if (s >= 300 && !ops.screens) return warn('Score à rendre visible (tableau/écran).');
      return ok('Affichage adapté au public attendu.');
    },
  },
  {
    id: 'R10',
    key: 'ratio_restauration',
    label: 'Restauration dimensionnée',
    category: 'restauration',
    threshold: '1 point de vente / 400 spectateurs (événement ≥ 3 h)',
    check: ({ ops, concept }) => {
      if (concept.durationHours < 3 && concept.expectedSpectators < 300) return ok('Événement court : restauration légère suffisante.');
      const need = Math.max(1, Math.ceil(concept.expectedSpectators / 400));
      return ops.foodPoints >= need ? ok(`${ops.foodPoints} point(s) de vente.`) : warn(`${ops.foodPoints} point(s) de vente pour ${need} nécessaires : files et recettes perdues.`, 'Ajouter des points (food-truck partenaire), paiement sans contact, précommande.');
    },
  },
  {
    id: 'R11',
    key: 'grille_tarifaire',
    label: 'Tarification cohérente',
    category: 'tarification',
    threshold: 'grille avec tarif enfant/famille si public familial',
    check: ({ ops, concept }) => {
      if (ops.ticketPrice === 0) return ok('Entrée gratuite.');
      const fam = concept.audiences.includes('familles') || concept.audiences.includes('enfants');
      return ops.pricingGrid || !fam ? ok('Grille tarifaire définie.') : warn('Public familial sans tarif enfant/famille.', 'Gratuit < 12 ans accompagné, pack famille < 2 pleins tarifs, prévente.');
    },
  },
  {
    id: 'R12',
    key: 'recompenses_motivantes',
    label: 'Récompenses motivantes',
    category: 'recompenses',
    threshold: '≥ 2 types de récompenses (sportive + expérience/visibilité)',
    check: ({ ops }) =>
      ops.rewards.length >= 2 ? ok(`Récompenses : ${ops.rewards.join(', ')}.`) : warn('Récompenses peu motivantes.', 'Combiner trophée/titre, visibilité (highlight, carte joueur), et une passerelle (invitation à un autre format Bask’Est).'),
  },
  {
    id: 'R13',
    key: 'plan_communication',
    label: 'Communication anticipée',
    category: 'communication',
    threshold: 'lancement ≤ J-45',
    check: ({ ops }) =>
      ops.commsStartDay <= -45 ? ok(`Lancement de la communication à J${ops.commsStartDay}.`) : warn(`Communication lancée à J${ops.commsStartDay} : trop tard pour remplir.`, 'Annonce J-60, ouverture billetterie J-45, temps forts J-30/J-14/J-7/J-1.'),
  },
  {
    id: 'R14',
    key: 'interactions_public',
    label: 'Engagement du public',
    category: 'engagement_public',
    threshold: '≥ 3 interactions par heure',
    check: ({ ops }) =>
      ops.interactionsPerHour >= 3 ? ok(`${ops.interactionsPerHour} interactions/heure.`) : warn(`${ops.interactionsPerHour} interaction(s)/heure : public passif.`, 'Votes QR, concours de tir du public, kiss/dance cam, pronostics, MVP du public.'),
  },
  {
    id: 'R15',
    key: 'plan_captation',
    label: 'Stratégie audiovisuelle',
    category: 'audiovisuel',
    threshold: 'plan de captation si objectif spectacle/visibilité ou ≥ 3 contenus',
    check: ({ ops, concept }) => {
      const needs = concept.objectives.includes('spectacle') || concept.objectives.includes('visibilite_partenaires') || concept.content.length >= 3;
      if (!needs) return ok('Captation non critique pour ce format.');
      return ops.captationPlan ? ok('Plan de captation prévu.') : warn('Pas de plan de captation : les meilleurs moments seront perdus.', 'Liste de plans, 1 vidéaste + 1 photographe minimum, droits à l’image collectés à l’inscription.');
    },
  },
  {
    id: 'R16',
    key: 'ratio_benevoles',
    label: 'Bénévoles suffisants et ménagés',
    category: 'benevoles',
    threshold: '≥ 1 bénévole / 50 spectateurs + 1 / 4 équipes ; postes ≤ 4 h',
    check: ({ ops, concept }) => {
      const need = Math.ceil(concept.expectedSpectators / 50 + concept.format.teams / 4) + 3;
      const issues: string[] = [];
      if (concept.volunteersNeeded < need) issues.push(`${concept.volunteersNeeded} bénévoles prévus pour ${need} recommandés`);
      if (ops.volunteerShiftHours > 4) issues.push(`postes de ${ops.volunteerShiftHours} h`);
      return issues.length ? warn(issues.join(' ; ') + '.', 'Fiches de poste, rotations de 4 h max, briefing J-7 et J0, repas et tenue fournis.') : ok(`${concept.volunteersNeeded} bénévoles, postes de ${ops.volunteerShiftHours} h.`);
    },
  },
  {
    id: 'R17',
    key: 'conducteur_minute',
    label: 'Conducteur minute par minute',
    category: 'professionnalisme',
    threshold: 'conducteur partagé à toute l’équipe',
    check: ({ ops }) => (ops.runOfShow ? ok('Conducteur prévu.') : warn('Aucun conducteur : improvisation garantie.', 'Générer le conducteur depuis le Blueprint et le valider en réunion J-7.')),
  },
  {
    id: 'R18',
    key: 'provision_imprevus',
    label: 'Maîtrise des dépenses',
    category: 'surdimensionnement',
    threshold: 'imprévus ≥ 5 % ; scénario prudent déficitaire < 15 % des coûts',
    check: ({ budget, scenarios }) => {
      if (!budget || !scenarios) return na('Budget non simulé.');
      const prudent = scenarios.find((s) => s.name === 'prudent')!;
      if (budget.contingencyRate < 0.05) return warn('Provision pour imprévus < 5 %.');
      if (prudent.result < -0.15 * prudent.totalCosts)
        return warn(`Scénario prudent : déficit de ${Math.round(-prudent.result)} € (${Math.round((-prudent.result / prudent.totalCosts) * 100)} % des coûts).`, 'Point go/no-go à J-30 : n’engager les dépenses variables qu’au-delà d’un seuil de préventes et de partenaires signés.');
      return ok('Exposition financière maîtrisée.');
    },
  },
  {
    id: 'R19',
    key: 'activation_partenaires',
    label: 'Partenaires activés (pas seulement un logo)',
    category: 'sponsoring',
    threshold: '≥ 1 activation par partenaire + bilan post-événement',
    check: ({ ops }) =>
      ops.partners === 0 || ops.sponsorActivations >= ops.partners
        ? ok(`${ops.sponsorActivations} activation(s) pour ${ops.partners} partenaire(s).`)
        : warn(`${ops.sponsorActivations} activation(s) pour ${ops.partners} partenaires.`, 'Associer chaque partenaire à un moment (concours, MVP, temps mort, zone) et livrer un bilan chiffré.'),
  },
  {
    id: 'R20',
    key: 'accessibilite_pmr',
    label: 'Accessibilité',
    category: 'accessibilite',
    threshold: 'mesures d’accessibilité documentées ; accès PMR au lieu',
    check: ({ concept, layout }) => {
      if (layout?.warnings.some((w) => w.includes('PMR'))) return block('Lieu sans accès PMR recensé.', 'Changer de lieu ou aménager un accès PMR validé.');
      return concept.safety.accessibility.length >= 2 ? ok(`${concept.safety.accessibility.length} mesures d’accessibilité.`) : warn('Accessibilité insuffisamment traitée.', 'Places PMR, parcours, toilettes, boucle magnétique / sous-titrage écran, zone calme.');
    },
  },
  {
    id: 'R21',
    key: 'dps_secours',
    label: 'Dispositif de secours',
    category: 'securite',
    threshold: 'DPS dimensionné (référentiel national) dès qu’un public est accueilli',
    check: ({ concept }) => {
      const people = concept.expectedSpectators + concept.format.teams * concept.format.rosterSize;
      if (concept.safety.dps) return ok('DPS prévu (à dimensionner avec une association agréée).');
      if (people > 1500) return block(`${people} personnes sans DPS.`, 'Demander un devis à une association agréée de sécurité civile (calcul RIS).');
      return people > 300 ? warn('Public > 300 sans DPS prévu.', 'Dimensionner le DPS selon le référentiel national.') : warn('Prévoir au minimum un poste de premiers secours et un défibrillateur.');
    },
  },
  {
    id: 'R22',
    key: 'jauge_evacuation',
    label: 'Jauge et évacuation',
    category: 'securite',
    threshold: 'public ≤ capacité / jauge ; dégagements suffisants (indicatif)',
    check: ({ layout, concept }) => {
      if (!layout) return na('Implantation non générée.');
      if (layout.warnings.some((w) => w.startsWith('BLOQUANT — public'))) return block('Public attendu supérieur à la jauge autorisée.');
      if (concept.expectedSpectators > layout.capacity.total) return block(`Capacité estimée ${layout.capacity.total} < ${concept.expectedSpectators} spectateurs attendus.`, 'Réduire la billetterie ou ajouter des tribunes.');
      if (layout.egress.availableExits < layout.egress.requiredExits || layout.egress.availableUP < layout.egress.requiredUP)
        return warn('Dégagements possiblement insuffisants (calcul indicatif).', 'Valider le plan d’évacuation avec le gestionnaire et le chargé de sécurité.');
      return ok('Jauge et dégagements cohérents (indicatif).');
    },
  },
  {
    id: 'R23',
    key: 'droit_image_mineurs',
    label: 'Droit à l’image et données des mineurs',
    category: 'securite',
    threshold: 'autorisation des représentants légaux collectée si mineurs',
    check: ({ concept }) => {
      if (!hasMinors(concept)) return ok('Pas de public mineur ciblé.');
      return concept.safety.minorsImageConsent === true
        ? ok('Autorisations parentales prévues (image + participation).')
        : block('Mineurs sans procédure d’autorisation parentale.', 'Formulaire signé par les représentants légaux, brassard "pas de photo", floutage par défaut.');
    },
  },
  {
    id: 'R24',
    key: 'degagement_terrain',
    label: 'Zones de dégagement autour des terrains',
    category: 'securite',
    threshold: '≥ 2 m (alerte entre 1 et 2 m, bloquant < 1 m)',
    check: ({ concept }) => {
      const r = concept.safety.runOffM;
      if (r < 1) return block(`Dégagement de ${r} m.`, 'Réduire le nombre de terrains ou passer en 3x3.');
      return r >= 2 ? ok(`Dégagement de ${r} m.`) : warn(`Dégagement de ${r} m (recommandé 2 m).`, 'Protections (mousses) sur obstacles, réduire le nombre de terrains.');
    },
  },
  {
    id: 'R25',
    key: 'equite_format',
    label: 'Équité sportive simulée',
    category: 'organisation_matchs',
    threshold: 'verdict de simulation "équilibré"',
    check: ({ fairness }) => {
      if (!fairness) return na('Format non simulé.');
      if (fairness.verdict === 'equilibre') return ok('Format équilibré en simulation.');
      if (fairness.dominantStrategies.length) return block(`Stratégie dominante : ${fairness.dominantStrategies.map((d) => d.strategy).join(', ')}.`, 'Rééquilibrer la valeur des zones ou limiter la mécanique.');
      return warn(`Verdict de simulation : ${VERDICT_LABELS[fairness.verdict]}.`, [...fairness.unfairSituations, ...fairness.manipulationRisks][0]);
    },
  },
  {
    id: 'R26',
    key: 'meteo_repli',
    label: 'Plan météo / canicule',
    category: 'securite',
    threshold: 'plan de repli obligatoire en extérieur',
    check: ({ ops, outdoor }) => {
      if (!outdoor) return ok('Événement en intérieur.');
      return ops.weatherPlan
        ? ok(`Plan météo : ${ops.weatherPlan}`)
        : block('Extérieur sans plan de repli : risque d’annulation (cf. Open Plus 3x3 Nancy annulé pour chaleur en 2026).', 'Repli en gymnase réservé, horaires décalés (matin/soir), ombre, eau, seuil d’annulation.');
    },
  },
];

export function runDesignRules(ctx: RuleContext): RuleResult[] {
  return DESIGN_RULES.map((r) => {
    const res = r.check(ctx);
    return { ruleId: r.id, label: r.label, category: r.category, ...res };
  });
}

export function summarizeRules(results: RuleResult[]) {
  return {
    ok: results.filter((r) => r.outcome === 'ok').length,
    alerte: results.filter((r) => r.outcome === 'alerte').length,
    bloquant: results.filter((r) => r.outcome === 'bloquant').length,
    non_evaluable: results.filter((r) => r.outcome === 'non_evaluable').length,
  };
}

/** Paramètres opérationnels par défaut, conformes aux règles (point de départ ajustable). */
export function defaultOps(concept: Concept): OpsPlan {
  const s = concept.expectedSpectators;
  const outdoor = ['terrain_exterieur', 'city_stade', 'place_publique', 'espace_temporaire'].includes(concept.venueType);
  const isShow = concept.objectives.includes('spectacle');
  const slot = concept.format.teamSize <= 3 ? 15 : 35;
  const usable = concept.durationHours * 60 * 0.75; // 25 % de marge (cérémonies, retards)
  const divs = Math.max(1, concept.format.divisions?.length ?? 1);
  const courts = Math.max(1, Math.min(6, Math.ceil((estimateMatches(concept.format) * divs * slot) / Math.max(60, usable))));
  return {
    commsStartDay: -60,
    registrationOnline: true,
    registrationCloseDays: 3,
    checkInMinutesPerTeam: 2,
    entryPoints: Math.max(1, Math.ceil((s * 0.6) / (8 * 45))),
    entryThroughputPerMin: s > 300 ? 8 : 12,
    speaker: true,
    dj: concept.budgetTier !== 'micro' || isShow,
    screens: s >= 300 && concept.budgetTier !== 'micro',
    interactionsPerHour: isShow ? 4 : 3,
    captationPlan: true,
    runOfShow: true,
    volunteerShiftHours: 4,
    sponsorActivations: concept.budgetTier === 'micro' ? 1 : concept.budgetTier === 'limite' ? 3 : 6,
    pricingGrid: true,
    rewards: ['Trophée / titre', 'Carte joueur et highlight', 'Invitation à un autre format Bask’Est'],
    weatherPlan: outdoor ? 'Repli gymnase pré-réservé ; créneaux 9h-12h / 17h-21h si > 30 °C ; ombre et eau.' : null,
    foodPoints: Math.max(1, Math.ceil(s / 400)),
    slotMinutes: slot,
    minRestMinutes: concept.format.teamSize >= 4 ? 20 : 10,
    courts,
    officials: Math.max(2, courts * 2),
    registrationFee: concept.format.teams > 2 ? (concept.format.teamSize <= 3 ? 40 : 80) : 0,
    ticketPrice: concept.budgetTier === 'micro' ? 0 : concept.budgetTier === 'limite' ? 5 : concept.budgetTier === 'premium' ? 15 : 10,
    cashPrize: 0,
    partners: concept.budgetTier === 'micro' ? 1 : concept.budgetTier === 'limite' ? 3 : 6,
    vipGuests: concept.budgetTier === 'premium' ? 80 : concept.budgetTier === 'standard' ? 30 : 0,
    ...concept.ops,
  };
}

/** Estimation du nombre de matchs d'un format (dimensionnement des terrains). */
export function estimateMatches(f: CompetitionFormat): number {
  let entrants = f.teams;
  let total = 0;
  for (const st of f.stages) {
    switch (st.type) {
      case 'round_robin': {
        const g = Math.max(1, st.groups ?? 1);
        const per = Math.ceil(entrants / g);
        total += g * ((per * (per - 1)) / 2);
        entrants = g * (st.qualifiersPerGroup ?? 2);
        break;
      }
      case 'single_elim':
        total += Math.max(0, entrants - 1) + (st.thirdPlace ? 1 : 0);
        entrants = 1;
        break;
      case 'double_elim':
        total += Math.max(0, 2 * entrants - 2);
        entrants = 1;
        break;
      case 'swiss':
      case 'points_race':
        total += Math.floor(entrants / 2) * (st.rounds ?? Math.ceil(Math.log2(entrants)) + 1);
        entrants = Math.min(entrants, st.advance ?? 4);
        break;
      case 'ladder':
        total += (entrants - 1) * (st.rounds ?? 4);
        entrants = Math.min(entrants, st.advance ?? 4);
        break;
      case 'king_of_the_court':
        total += Math.ceil((st.kotc?.durationMin ?? 60) / 4);
        entrants = Math.min(entrants, st.advance ?? 4);
        break;
    }
  }
  return total;
}
