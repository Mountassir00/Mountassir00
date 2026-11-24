import type { Mechanic } from '../core/model';

/**
 * Bibliothèque des mécaniques sportives configurables (exigence §7).
 *
 * Convention des effets (−1..+1) utilisés par la notation :
 * - spectacle, equite, lisibilite, joueur, media : +1 = améliore fortement, −1 = dégrade fortement ;
 * - cout : +1 = AUGMENTE fortement le coût / la charge d'organisation, −1 = le réduit.
 *
 * `simulated: true` = la mécanique est réellement implémentée par le moteur de
 * match (src/core/simulation/match.ts) avec exactement cet identifiant. Toutes
 * les autres sont évaluées qualitativement (effets + risques) ou via la
 * structure de compétition (phases du format).
 *
 * `officialCompatible` = utilisable dans une compétition homologuée FFBB/FIBA
 * sans dérogation aux règles de jeu (les mécaniques de structure, de sélection
 * et de narration le sont généralement ; celles qui modifient le score non).
 * À confirmer avec le comité / la ligue pour toute compétition officielle.
 */
export const MECHANICS: Mechanic[] = [
  // -------------------------------------------------------------------------
  // SÉLECTION
  // -------------------------------------------------------------------------
  {
    id: 'draft',
    name: 'Draft en direct',
    category: 'selection',
    description:
      'Les joueurs s’inscrivent individuellement ; des capitaines ou des coachs composent les équipes en public (sur scène, en direct sur les réseaux). Le moment de la draft devient un temps fort du programme.',
    params: [
      { key: 'mode', label: 'Ordre de choix', type: 'select', default: 'serpentin', options: ['serpentin', 'classique', 'loterie'] },
      { key: 'picksPerTeam', label: 'Choix par équipe', type: 'number', default: 4, min: 1, max: 10 },
      { key: 'public', label: 'Draft publique (scène / live)', type: 'boolean', default: true },
    ],
    effects: { spectacle: 0.6, equite: 0.4, lisibilite: 0.2, joueur: 0.3, media: 0.8, cout: 0.1 },
    risks: [
      'Humiliation des joueurs choisis en dernier : ne pas annoncer l’ordre complet, finir par des choix "surprise" valorisés.',
      'Collusion entre capitaines et amis : tirage au sort de l’ordre de choix, choix chronométré.',
      'Mineurs : la draft publique expose l’image et la valeur perçue d’enfants — draft à huis clos pour les moins de 15 ans.',
    ],
    incompatibleWith: ['equipes_mysteres'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Draft NBA / WNBA, drafts des ligues de créateurs (Kings League), ASG Alsace (vote du public).',
  },
  {
    id: 'capitaines',
    name: 'Système de capitaines',
    category: 'selection',
    description:
      'Les meilleurs joueurs (classement Bask’Est, vote ou invitation) deviennent capitaines et choisissent leurs coéquipiers ; ils portent la parole de l’équipe (micro du speaker, interview, choix tactiques spéciaux).',
    params: [
      { key: 'captains', label: 'Nombre de capitaines', type: 'number', default: 8, min: 2, max: 32 },
      { key: 'selection', label: 'Désignation', type: 'select', default: 'classement', options: ['classement', 'vote_public', 'invitation'] },
    ],
    effects: { spectacle: 0.4, equite: 0.2, lisibilite: 0.3, joueur: 0.4, media: 0.5, cout: 0 },
    risks: ['Capitaines qui ne s’engagent pas sur toute la journée : charte d’engagement signée.', 'Vote public manipulé : plafonner son poids.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'NBA All-Star Game (capitaines 2018-2023), Kings League (présidents).',
  },
  {
    id: 'equipes_mysteres',
    name: 'Équipes mystères',
    category: 'selection',
    description:
      'Les compositions sont tenues secrètes et révélées sur place (check-in, présentation ou tirage public). Crée de la surprise et casse les équipes "toutes faites".',
    params: [{ key: 'revealMoment', label: 'Moment de révélation', type: 'select', default: 'presentation', options: ['check-in', 'presentation', 'tirage_public'] }],
    effects: { spectacle: 0.4, equite: 0.3, lisibilite: -0.1, joueur: 0.2, media: 0.4, cout: 0 },
    risks: ['Incompatibilités de niveau dans une même équipe : équilibrer par chapeaux de niveau.', 'Frustration des groupes d’amis : proposer un tableau "équipes constituées" en parallèle.'],
    incompatibleWith: ['draft', 'rivalites_narratives'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Tirages au sort de coupes nationales, émissions TV à révélation.',
  },

  // -------------------------------------------------------------------------
  // STRUCTURE
  // -------------------------------------------------------------------------
  {
    id: 'divisions',
    name: 'Système de divisions',
    category: 'structure',
    description:
      'Les équipes sont réparties en divisions de niveau homogène (ex. Élite, Challenger, Découverte) avec leurs propres récompenses. Chaque équipe joue des matchs serrés.',
    params: [
      { key: 'count', label: 'Nombre de divisions', type: 'number', default: 3, min: 2, max: 5 },
      { key: 'teamsPerDivision', label: 'Équipes par division', type: 'number', default: 8, min: 4, max: 32 },
    ],
    effects: { spectacle: 0.2, equite: 0.7, lisibilite: 0.2, joueur: 0.6, media: 0, cout: 0.1 },
    risks: ['Sous-déclaration du niveau pour gagner une division inférieure : placement sur résultats vérifiables.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Divisions des circuits 3x3 FFBB (Open Plus / Open Start), ligues amateurs.',
  },
  {
    id: 'qualifications',
    name: 'Qualifications',
    category: 'structure',
    description:
      'Des événements qualificatifs (city-stades, clubs, territoires) attribuent des places pour l’événement principal. Transforme un événement isolé en saison.',
    params: [
      { key: 'qualifierEvents', label: 'Événements qualificatifs', type: 'number', default: 4, min: 1, max: 20 },
      { key: 'spotsPerQualifier', label: 'Places par qualificatif', type: 'number', default: 2, min: 1, max: 8 },
    ],
    effects: { spectacle: 0.3, equite: 0.5, lisibilite: 0.3, joueur: 0.5, media: 0.4, cout: 0.4 },
    risks: ['Charge d’organisation multipliée : qualificatifs "légers" (kit standard, 2 bénévoles).', 'Qualifiés qui ne viennent pas : liste d’attente et caution.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Circuits FIBA 3x3 / Superleague FFBB, Red Bull Half Court (qualifs nationales → finale mondiale).',
  },
  {
    id: 'barrages',
    name: 'Barrages / play-in',
    category: 'structure',
    description:
      'Des matchs de barrage entre les équipes classées juste sous la ligne de qualification donnent un second souffle et suppriment les matchs sans enjeu.',
    params: [{ key: 'teams', label: 'Équipes en barrage', type: 'number', default: 4, min: 2, max: 8 }],
    effects: { spectacle: 0.5, equite: 0.2, lisibilite: 0.1, joueur: 0.3, media: 0.3, cout: 0.1 },
    risks: ['Allonge la journée : prévoir le créneau dans le conducteur.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Play-in NBA, play-in Betclic Élite.',
  },
  {
    id: 'promotion_relegation',
    name: 'Promotion et relégation',
    category: 'structure',
    description:
      'D’une édition (ou d’un tour) à l’autre, les meilleures équipes montent de division et les dernières descendent. Donne un enjeu à tous les classements.',
    params: [
      { key: 'up', label: 'Montées', type: 'number', default: 2, min: 1, max: 4 },
      { key: 'down', label: 'Descentes', type: 'number', default: 2, min: 1, max: 4 },
    ],
    effects: { spectacle: 0.3, equite: 0.4, lisibilite: 0.1, joueur: 0.4, media: 0.3, cout: 0 },
    risks: ['Nécessite une continuité d’équipes d’une édition à l’autre : base de données joueurs.', 'Équipes qui changent de nom pour effacer une relégation : identifiant d’équipe persistant.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Football européen, ligues de quartier.',
  },
  {
    id: 'double_elimination',
    name: 'Double élimination',
    category: 'structure',
    description: 'Une équipe n’est éliminée qu’après deux défaites (tableau des vainqueurs et tableau des perdants). Garantit au moins deux matchs à chacun.',
    params: [{ key: 'grandFinalReset', label: 'Finale "reset" si le finaliste invaincu perd', type: 'boolean', default: true }],
    effects: { spectacle: 0.2, equite: 0.6, lisibilite: -0.3, joueur: 0.6, media: 0.1, cout: 0.2 },
    risks: ['Lisibilité faible pour le public : afficher le tableau en grand et l’expliquer.', 'Durée totale ≈ 2 × élimination directe.'],
    incompatibleWith: ['competition_par_points'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Esport, tournois de combat.',
  },
  {
    id: 'competition_par_points',
    name: 'Compétition par points',
    category: 'structure',
    description:
      'Chaque match rapporte des points de classement (victoire, écart, bonus offensif) qui s’accumulent sur la journée ou la saison. Plus personne n’est éliminé au premier match.',
    params: [
      { key: 'win', label: 'Points par victoire', type: 'number', default: 3, min: 1, max: 5 },
      { key: 'bonusOffense', label: 'Bonus si ≥ 21 points marqués', type: 'boolean', default: true },
    ],
    effects: { spectacle: 0.1, equite: 0.5, lisibilite: 0.2, joueur: 0.5, media: 0.1, cout: 0 },
    risks: ['Calculs incompréhensibles pour le public : classement en direct sur écran / QR code.'],
    incompatibleWith: ['double_elimination'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Rugby (point de bonus offensif), courses par points.',
  },
  {
    id: 'systeme_defis',
    name: 'Système de défis (échelle)',
    category: 'structure',
    description:
      'Les équipes sont classées sur une échelle ; chacune peut défier une équipe classée jusqu’à N places au-dessus. Une victoire fait échanger les places. Idéal pour une saison ouverte entre événements.',
    params: [
      { key: 'maxRankGap', label: 'Écart maximal de défi', type: 'number', default: 2, min: 1, max: 5 },
      { key: 'windowDays', label: 'Délai pour accepter un défi (jours)', type: 'number', default: 7, min: 2, max: 21 },
    ],
    effects: { spectacle: 0.2, equite: 0.4, lisibilite: 0.4, joueur: 0.6, media: 0.5, cout: -0.2 },
    risks: ['Résultats déclaratifs falsifiés : double validation des capitaines + photo du score + arbitre bénévole tiré au sort.', 'Refus de défi pour protéger sa place : défi accepté par défaut après le délai.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Échelles de squash / tennis de club, ladders esport.',
  },

  // -------------------------------------------------------------------------
  // SCORING
  // -------------------------------------------------------------------------
  {
    id: 'points_bonus',
    name: 'Zones de points bonus',
    category: 'scoring',
    description:
      'Des zones marquées au sol valent plus (ex. cercle à 4 points). Crée des tirs spectaculaires et des retournements. Valeur ET réussite attendue doivent être simulées pour éviter le jeu stéréotypé.',
    params: [
      { key: 'zonePoints', label: 'Valeur de la zone', type: 'number', default: 4, min: 2, max: 5 },
      { key: 'zones', label: 'Nombre de zones', type: 'number', default: 2, min: 1, max: 4 },
    ],
    effects: { spectacle: 0.6, equite: -0.2, lisibilite: 0.2, joueur: 0.2, media: 0.6, cout: 0.1 },
    risks: ['Stratégie dominante si la valeur attendue (points × réussite) dépasse nettement les autres tirs : vérifier au simulateur.', 'Marquage au sol non autorisé sur certains parquets : adhésifs amovibles validés par le gestionnaire.'],
    incompatibleWith: ['public_zone_bonus'],
    simulated: false,
    officialCompatible: false,
    inspiration: 'BIG3 (cercles à 4 points), tir du logo.',
  },
  {
    id: 'objectifs_intermediaires',
    name: 'Objectifs intermédiaires',
    category: 'scoring',
    description:
      'Un objectif en cours de match (première équipe à 7 points, à 3 paniers primés…) rapporte un avantage (possession, point de classement, choix du côté). Crée des micro-enjeux toutes les 2-3 minutes.',
    params: [
      { key: 'milestone', label: 'Seuil (points)', type: 'number', default: 7, min: 3, max: 15 },
      { key: 'reward', label: 'Récompense', type: 'select', default: 'point_classement', options: ['point_classement', 'possession', 'choix_cote'] },
    ],
    effects: { spectacle: 0.4, equite: 0, lisibilite: -0.1, joueur: 0.2, media: 0.3, cout: 0 },
    risks: ['Surcharge de règles : maximum 1 objectif intermédiaire par match.'],
    simulated: false,
    officialCompatible: false,
    inspiration: 'Esport (objectifs de carte), points de bonus du rugby.',
  },
  {
    id: 'handicap_start',
    name: 'Départ handicap (points d’avance)',
    category: 'scoring',
    description:
      'L’équipe la moins bien classée commence avec des points d’avance proportionnels à l’écart de niveau (comme le handicap au golf). Rend possibles des matchs entre niveaux très différents (inclusif, intergénérationnel).',
    params: [{ key: 'pointsPer100Elo', label: 'Points offerts par 100 points d’écart', type: 'number', default: 1, min: 0.5, max: 3 }],
    effects: { spectacle: 0.3, equite: 0.5, lisibilite: -0.2, joueur: 0.4, media: 0.1, cout: 0 },
    risks: ['Sandbagging (sous-déclaration du niveau) : classement sur résultats vérifiables.', 'Peut être vécu comme condescendant : présenter comme un "bonus de défi", pas une aumône.'],
    simulated: true,
    officialCompatible: false,
    inspiration: 'Handicap au golf, courses à handicap.',
  },
  {
    id: 'mercy_rule',
    name: 'Règle de mansuétude (mercy rule)',
    category: 'scoring',
    description:
      'Le match s’arrête dès qu’un écart de N points est atteint. Protège les jeunes et les débutants des humiliations, et libère du temps de terrain.',
    params: [{ key: 'gap', label: 'Écart d’arrêt', type: 'number', default: 15, min: 5, max: 40 }],
    effects: { spectacle: -0.1, equite: 0.2, lisibilite: 0.4, joueur: 0.4, media: -0.1, cout: -0.1 },
    risks: ['Écart trop faible = matchs écourtés et frustration ; le tester au simulateur selon le score cible.'],
    simulated: true,
    officialCompatible: false,
    inspiration: 'Baseball / softball jeunes, règles de mini-basket.',
  },

  // -------------------------------------------------------------------------
  // TEMPS
  // -------------------------------------------------------------------------
  {
    id: 'matchs_chronometres',
    name: 'Matchs courts chronométrés',
    category: 'temps',
    description:
      'Matchs courts à chrono courant (8-12 min, sans quart-temps), éventuellement combinés à un score cible. Densifie le spectacle et fiabilise le planning.',
    params: [
      { key: 'minutes', label: 'Durée (min)', type: 'number', default: 10, min: 4, max: 20 },
      { key: 'runningClock', label: 'Chrono courant', type: 'boolean', default: true },
    ],
    effects: { spectacle: 0.4, equite: -0.1, lisibilite: 0.4, joueur: 0, media: 0.3, cout: -0.2 },
    risks: ['Matchs plus aléatoires (moins de possessions) : compenser par des poules plutôt qu’une élimination directe.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'FIBA 3x3 (10 min), NBA All-Star 2026 (matchs de 12 min).',
  },
  {
    id: 'elam_ending',
    name: 'Fin au score cible (Elam)',
    category: 'temps',
    description:
      'Après un temps donné, le chrono s’arrête et une cible = score du leader + N est fixée ; le match se termine forcément sur un panier. Gérée nativement par le moteur via MatchRules.end = { type: "elam" }.',
    params: [
      { key: 'minutes', label: 'Temps avant cible (min)', type: 'number', default: 8, min: 4, max: 40 },
      { key: 'plus', label: 'Points ajoutés au leader', type: 'number', default: 7, min: 3, max: 25 },
    ],
    effects: { spectacle: 0.6, equite: 0.2, lisibilite: -0.1, joueur: 0.3, media: 0.5, cout: 0 },
    risks: ['Règle peu intuitive : afficher la cible en grand et la faire annoncer par le speaker.', 'Durée variable : prévoir 3-5 min de marge par match.'],
    simulated: false,
    officialCompatible: false,
    inspiration: 'The Basketball Tournament (depuis 2017), CEBL "Target Score", Unrivaled, G League (prolongations).',
  },
  {
    id: 'phases_speciales',
    name: 'Phases spéciales',
    category: 'temps',
    description:
      'Séquences annoncées où une règle change (ex. "minute de feu" : défense à 2, tirs lointains bonifiés ; "golden basket" en prolongation). Une seule phase spéciale par match, annoncée en lumière et en son.',
    params: [
      { key: 'type', label: 'Type de phase', type: 'select', default: 'minute_de_feu', options: ['minute_de_feu', 'golden_basket', 'possession_bonus'] },
      { key: 'durationSec', label: 'Durée (s)', type: 'number', default: 60, min: 20, max: 180 },
    ],
    effects: { spectacle: 0.6, equite: -0.2, lisibilite: -0.2, joueur: 0.2, media: 0.6, cout: 0.1 },
    risks: ['Accumulation de règles spéciales = public perdu (erreur "règlement incompréhensible").'],
    simulated: false,
    officialCompatible: false,
    inspiration: 'Kings League (règles spéciales), Power Play du hockey.',
  },
  {
    id: 'double_points_final_minute',
    name: 'Dernière minute à points doubles',
    category: 'temps',
    description: 'Dans les N dernières secondes du temps réglementaire, chaque panier compte double. Maintient le suspense jusqu’au bout dans les matchs chronométrés.',
    params: [{ key: 'seconds', label: 'Fenêtre (s)', type: 'number', default: 60, min: 20, max: 180 }],
    effects: { spectacle: 0.6, equite: -0.3, lisibilite: 0.3, joueur: 0.1, media: 0.5, cout: 0 },
    risks: ['Augmente l’aléa : l’équipe la plus forte gagne moins souvent (mesurer au simulateur).'],
    incompatibleWith: ['joker_card', 'elam_ending'],
    simulated: true,
    officialCompatible: false,
    inspiration: 'Formats TV à "manche finale" doublée.',
  },
  {
    id: 'joker_card',
    name: 'Carte joker',
    category: 'scoring',
    description:
      'Chaque équipe dispose d’une carte à usage unique : pendant N secondes ses paniers comptent double. Elle est jouée ostensiblement (carte levée, jingle, éclairage). Crée des décisions stratégiques visibles.',
    params: [{ key: 'seconds', label: 'Durée du joker (s)', type: 'number', default: 60, min: 20, max: 120 }],
    effects: { spectacle: 0.7, equite: -0.2, lisibilite: 0.2, joueur: 0.3, media: 0.7, cout: 0 },
    risks: ['Effet "gadget" si mal mis en scène.', 'Cumul avec d’autres multiplicateurs : interdit (incompatibilités).'],
    incompatibleWith: ['double_points_final_minute', 'public_zone_bonus'],
    simulated: true,
    officialCompatible: false,
    inspiration: 'Kings League (cartes "armes secrètes"), UTS au tennis (cartes bonus).',
  },

  // -------------------------------------------------------------------------
  // NARRATION
  // -------------------------------------------------------------------------
  {
    id: 'rivalites_narratives',
    name: 'Rivalités narratives',
    category: 'narration',
    description:
      'Des confrontations sont scénarisées à l’avance (quartier contre quartier, revanche de l’édition précédente, duel de capitaines) et racontées en contenus avant l’événement.',
    params: [{ key: 'featuredMatches', label: 'Affiches scénarisées', type: 'number', default: 3, min: 1, max: 8 }],
    effects: { spectacle: 0.5, equite: 0, lisibilite: 0.3, joueur: 0.3, media: 0.8, cout: 0.1 },
    risks: ['Dérive vers l’hostilité entre quartiers ou communautés : charte fair-play, contenus valorisant le respect, médiateurs.'],
    incompatibleWith: ['equipes_mysteres'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Derbys, "storylines" des ligues de créateurs, Drive to Survive (F1).',
  },
  {
    id: 'competition_en_saison',
    name: 'Compétition en saison',
    category: 'narration',
    description:
      'Les événements Bask’Est deviennent des étapes d’une saison (points, classement, finale). Un joueur venu une fois a une raison de revenir.',
    params: [
      { key: 'stages', label: 'Étapes', type: 'number', default: 5, min: 2, max: 20 },
      { key: 'finalAt', label: 'Finale', type: 'select', default: 'asg-grand-est', options: ['asg-grand-est', 'bask-cup', 'evenement_dedie'] },
    ],
    effects: { spectacle: 0.3, equite: 0.3, lisibilite: 0.2, joueur: 0.6, media: 0.6, cout: 0.3 },
    risks: ['Base de données joueurs et règles de points stables et publiques indispensables.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Circuits FIBA 3x3, Formule 1, saisons esport.',
  },
  {
    id: 'classement_individuel',
    name: 'Classement individuel',
    category: 'narration',
    description:
      'Chaque joueur a une cote (type Elo) mise à jour à chaque match joué dans un événement Bask’Est, avec une carte de joueur partageable. Critères publics et vérifiables.',
    params: [
      { key: 'kFactor', label: 'Facteur K (réactivité de la cote)', type: 'number', default: 24, min: 8, max: 48 },
      { key: 'minGames', label: 'Matchs minimum pour être classé', type: 'number', default: 5, min: 1, max: 20 },
    ],
    effects: { spectacle: 0.1, equite: 0.3, lisibilite: 0.2, joueur: 0.7, media: 0.6, cout: 0.2 },
    risks: ['RGPD : base légale, information, durée de conservation ; consentement parental sous 15 ans.', 'Classement public de mineurs : à éviter ou anonymiser.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Classement FIBA 3x3 individuel, cotes Elo, cartes de joueurs NBA 2K.',
  },
  {
    id: 'classement_territorial',
    name: 'Classement territorial',
    category: 'narration',
    description:
      'Les résultats des joueurs et équipes alimentent un classement par territoire (quartier, ville, département du Grand Est). Fierté locale et argument pour les collectivités partenaires.',
    params: [{ key: 'level', label: 'Maille', type: 'select', default: 'departement', options: ['quartier', 'ville', 'departement'] }],
    effects: { spectacle: 0.3, equite: 0.1, lisibilite: 0.3, joueur: 0.3, media: 0.5, cout: 0.1 },
    risks: ['Territoires sous-représentés pénalisés : points pondérés par participation, pas seulement par victoires.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'Classement des nations FIBA 3x3, "State of Origin" (rugby).',
  },

  // -------------------------------------------------------------------------
  // PUBLIC
  // -------------------------------------------------------------------------
  {
    id: 'public_zone_bonus',
    name: 'Zone bonus choisie par le public',
    category: 'public',
    description:
      'Toutes les N secondes, le public choisit (applaudimètre, vote QR code) une zone de tir qui compte double pendant 60 secondes. Le public influence le match de façon visible mais limitée.',
    params: [{ key: 'everySeconds', label: 'Fréquence (s)', type: 'number', default: 240, min: 90, max: 600 }],
    effects: { spectacle: 0.6, equite: -0.2, lisibilite: -0.1, joueur: 0.1, media: 0.6, cout: 0.1 },
    risks: ['Mobilisation massive d’une communauté : vote en salle uniquement, applaudimètre plutôt que vote en ligne.', 'Signalétique lumineuse de la zone indispensable.'],
    incompatibleWith: ['points_bonus', 'joker_card'],
    simulated: true,
    officialCompatible: false,
    inspiration: 'Votes interactifs des émissions TV, Kings League (participation des fans).',
  },
  {
    id: 'public_vote_mvp',
    name: 'Vote du public (MVP, sélections)',
    category: 'public',
    description:
      'Le public vote pour le MVP, les sélectionnés d’un All-Star ou le "moment de la journée". Crée de l’engagement avant, pendant et après l’événement.',
    params: [
      { key: 'weight', label: 'Poids du vote public (%)', type: 'number', default: 50, min: 0, max: 100 },
      { key: 'channel', label: 'Canal', type: 'select', default: 'qr_billet', options: ['qr_billet', 'reseaux_sociaux', 'applaudimetre'] },
    ],
    effects: { spectacle: 0.3, equite: -0.2, lisibilite: 0.4, joueur: 0.3, media: 0.8, cout: 0 },
    risks: ['Mobilisation de communautés / faux comptes : vote lié au billet, plafond de poids, jury mixte.', 'Mineurs : pas de vote public nominatif sur des moins de 15 ans.'],
    simulated: false,
    officialCompatible: true,
    inspiration: 'NBA / WNBA All-Star (vote des fans), All Star Game Alsace (vote du public), All Star Game Basket Fauteuil FFH (équipe Monde choisie par les fans).',
  },
];

export const MECHANICS_BY_ID: Record<string, Mechanic> = Object.fromEntries(MECHANICS.map((m) => [m.id, m]));
