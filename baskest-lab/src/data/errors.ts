import type { ErrorCase, ErrorCategory, Provenance } from '../core/model';

/**
 * BASK'EST LAB — Observatoire des erreurs événementielles (exigence §5).
 *
 * Deux types d'entrées :
 * - incidents DOCUMENTÉS (confidence 'verifie', URL de la source) ;
 * - PATTERNS récurrents observés dans l'événementiel sportif amateur
 *   (confidence 'probable', décrits comme des tendances, pas comme un fait daté).
 *
 * Chaque cas pointe vers des règles de conception (R01 à R26) appliquées
 * automatiquement par le moteur de règles lors de la génération d'événements :
 * R01 regles_lisibles · R02 temps_morts_programme · R03 attente_equipes ·
 * R04 repos_minimum · R05 marge_retard · R06 ambiance_plan · R07 inscription_simple ·
 * R08 flux_entree · R09 visibilite_public · R10 ratio_restauration ·
 * R11 grille_tarifaire · R12 recompenses_motivantes · R13 plan_communication ·
 * R14 interactions_public · R15 plan_captation · R16 ratio_benevoles ·
 * R17 conducteur_minute · R18 provision_imprevus · R19 activation_partenaires ·
 * R20 accessibilite_pmr · R21 dps_secours · R22 jauge_evacuation ·
 * R23 droit_image_mineurs · R24 degagement_terrain · R25 equite_format · R26 meteo_repli.
 */

const ACC = '2026-11-24';
const R1 = 'docs/research/R1-baskest-et-territoire.md';
const R2 = 'docs/research/R2-benchmark-mondial.md';
const R3 = 'docs/research/R3-cadre-reglementaire-financements.md';

const doc = (source: string, note?: string): Provenance => ({ confidence: 'verifie', source, accessedAt: ACC, note });
const pattern = (note: string, source?: string): Provenance => ({ confidence: 'probable', source, accessedAt: source ? ACC : undefined, note });

export const ERROR_CASES: ErrorCase[] = [
  // ---------------------------------------------------------------- règlement
  {
    id: 'err-reglement-cible-complexe',
    category: 'reglement_incomprehensible',
    title: 'Fin au score cible mal comprise par le public',
    observed:
      'Même les ligues qui l’utilisent depuis 2020 (CEBL) reconnaissent que les fins à score cible « restent complexes » ; la règle est moins intuitive pour un public non initié tant que la cible n’est pas affichée en grand.',
    source: doc('https://cebl.ca/everything-is-different-five-seasons-later-target-score-endings-remain-as-complex-as-ever', `${R2} §A3.`),
    causes: ['Règle annoncée uniquement dans le règlement écrit', 'Cible non affichée', 'Speaker non briefé'],
    consequences: ['Public perdu au moment le plus important', 'Contestations des équipes'],
    prevention: ['Explication en 15 s par le speaker avant chaque match', 'Cible affichée en permanence (écran ou ardoise géante)', 'Fiche règle d’une page remise aux capitaines'],
    ruleIds: ['R01', 'R09'],
  },
  {
    id: 'err-reglement-arbitres-non-formes',
    category: 'reglement_incomprehensible',
    title: 'Arbitres bénévoles appliquant des versions différentes des règles',
    observed:
      'Pattern fréquent en tournoi 3x3 amateur : plusieurs terrains, arbitres bénévoles, règles spéciales ou récemment modifiées (ex. règle du check-ball FIBA 3x3 révisée au 1er janvier 2026) appliquées différemment d’un terrain à l’autre.',
    source: pattern('Pattern récurrent ; changement de règles FIBA 3x3 2026 documenté dans R2 §A7.', 'https://www.fiba3x3.basketball/rules'),
    causes: ['Pas de briefing arbitres', 'Règles spéciales trop nombreuses', 'Mise à jour réglementaire non diffusée'],
    consequences: ['Sentiment d’injustice', 'Retards dus aux discussions', 'Image amateur'],
    prevention: ['Briefing arbitres de 20 min obligatoire avant ouverture', 'Maximum 3 règles spéciales par format', 'Arbitre référent qui tranche les litiges'],
    ruleIds: ['R01', 'R25'],
  },
  {
    id: 'err-reglement-trop-de-gimmicks',
    category: 'reglement_incomprehensible',
    title: 'Empilement de règles « gimmick » qui s’usent vite',
    observed:
      'La Kings League, construite sur des règles gamifiées (cartes, dé, penalty du président), a connu en 2026 une forte baisse d’audience, un plan de licenciement et la suspension des ligues France et Allemagne ; la nouveauté s’use vite.',
    source: doc('https://www.merca2.es/2026/06/12/ere-kings-league-despidos-pique-cierre-2396126/', `${R2} §B1.`),
    causes: ['Effet nouveauté pris pour une valeur durable', 'Règles ajoutées sans mesure de leur effet'],
    consequences: ['Lassitude du public', 'Perte de lisibilité sportive'],
    prevention: ['Une seule mécanique « fun » par format, testée en simulation', 'Mesurer l’effet (sondage, rétention) avant de la reconduire'],
    ruleIds: ['R01', 'R25'],
  },

  // -------------------------------------------------------------- temps morts
  {
    id: 'err-temps-morts-presentation-tv',
    category: 'temps_morts',
    title: 'Présentation hachée par les temps morts et segments',
    observed:
      'All-Star NBA 2025 : le nouveau format a été critiqué pour sa « mauvaise présentation » (temps morts, segments TV entre les matchs) qui a éclipsé le jeu.',
    source: doc('https://www.cbssports.com/nba/news/2025-nba-all-star-game-stephen-curry-leads-ogs-to-title-but-poor-presentation-overshadows-new-format/live/', `${R2} §A1.`),
    causes: ['Transitions non scénarisées', 'Segments trop longs entre les matchs'],
    consequences: ['Baisse d’attention et d’ambiance', 'Image négative du format'],
    prevention: ['Conducteur minute par minute', 'Aucune transition > 5 min sans animation', 'Animations prêtes pour chaque interruption'],
    ruleIds: ['R02', 'R17', 'R14'],
  },
  {
    id: 'err-temps-morts-concours-individuel',
    category: 'temps_morts',
    title: 'Concours de dunk individuel qui s’essouffle',
    observed:
      'Le concours de dunk NBA est jugé en perte de vitesse (ratés en série, attente entre les essais) ; la FIBA a remplacé en 2026 le concours individuel par un show par équipes (Dunk Mania) pour résoudre ce problème.',
    source: doc('https://www.fiba.basketball/en/news/fiba-3x3-world-cup-2026-introduces-dunk-mania-a-new-era-of-dunk-contests', `${R2} §A24.`),
    causes: ['Essais illimités', 'Pas de limite de temps', 'Niveau des participants hétérogène'],
    consequences: ['Public qui décroche', 'Débordement du programme'],
    prevention: ['Limite de temps par essai (60 s) et nombre d’essais', 'Format par équipes', 'Pré-sélection des dunkers'],
    ruleIds: ['R02', 'R06'],
  },

  // ---------------------------------------------------- organisation des matchs
  {
    id: 'err-organisation-cible-trop-courte',
    category: 'organisation_matchs',
    title: 'Format trop court : « pas assez de basket »',
    observed: 'All-Star NBA 2025 : la cible de 40 points a été jugée trop courte, avec des avis mitigés sur le format.',
    source: doc('https://www.espn.com/nba/story/_/id/43885669/nba-all-star-2025-new-format-draws-mixed-reviews-next', `${R2} §A1.`),
    causes: ['Calibrage du format sans test', 'Priorité à la durée TV'],
    consequences: ['Frustration du public venu « voir du basket »', 'Joueurs peu engagés'],
    prevention: ['Simuler la durée et le suspense des matchs avant validation', 'Comparer plusieurs cibles / durées'],
    ruleIds: ['R25', 'R03'],
  },
  {
    id: 'err-organisation-matchs-sans-enjeu',
    category: 'organisation_matchs',
    title: 'Matchs de poule sans enjeu et équipes qui ne jouent qu’une fois',
    observed:
      'Pattern classique des tournois à poules : derniers matchs de poule sans enjeu (qualification déjà acquise), ou élimination directe d’emblée qui renvoie chez elles des équipes ayant payé l’inscription après un seul match.',
    source: pattern('Pattern documenté par le simulateur BASK’EST LAB (analyse Monte-Carlo des formats).'),
    causes: ['Structure de compétition non simulée', 'Pas de consolante'],
    consequences: ['Risque d’arrangement', 'Mauvaise expérience joueur', 'Désinscription l’année suivante'],
    prevention: ['Minimum 3 matchs garantis par équipe', 'Derniers matchs de poule simultanés', 'Tableau consolante'],
    ruleIds: ['R25', 'R03', 'R04'],
  },

  // ------------------------------------------------------------------ retards
  {
    id: 'err-retards-cascade',
    category: 'retards',
    title: 'Retard en cascade dès le premier créneau',
    observed:
      'Pattern très fréquent en tournoi amateur : check-in lent, premier match lancé avec 20-30 min de retard, aucune marge dans le planning, finale décalée de plus d’une heure et public parti.',
    source: pattern('Pattern récurrent de l’événementiel sportif amateur.'),
    causes: ['Planning sans marge', 'Check-in le matin même', 'Matchs qui débordent sans limite de temps'],
    consequences: ['Finale devant des tribunes vides', 'Dépassement des horaires du lieu (coût, conflit)', 'Bénévoles épuisés'],
    prevention: ['Marge de 10 % minimum dans le planning', 'Check-in en ligne la veille', 'Limite de temps sur chaque match', 'Replanification assistée par le moteur'],
    ruleIds: ['R05', 'R17', 'R03'],
  },
  {
    id: 'err-retards-relocalisation-chaleur',
    category: 'retards',
    title: 'Événement extérieur relocalisé en urgence (canicule)',
    observed:
      'Quai 54, juillet 2026 : après une première journée au stade Émile-Anthoine, la vigilance rouge canicule a forcé le déménagement au Clichy Hall.',
    source: doc('https://www.basketeurope.com/un-quai-54-delocalise-mais-nadir-hifi-encore-vainqueur-et-mvp/', `${R2} §A14.`),
    causes: ['Exposition climatique d’un événement estival en extérieur'],
    consequences: ['Programme bouleversé', 'Jauge réduite', 'Coûts imprévus'],
    prevention: ['Salle de repli réservée sous condition dès la conception', 'Seuil de déclenchement météo écrit', 'Horaires décalés (matin/soirée)'],
    ruleIds: ['R26', 'R05'],
  },

  // --------------------------------------------------------- manque d'ambiance
  {
    id: 'err-ambiance-grande-salle-vide',
    category: 'manque_ambiance',
    title: 'Grande salle à moitié vide',
    observed:
      'Pattern : un événement associatif dans une salle de plusieurs milliers de places (ex. Palais des Sports Jean-Weille, 6 000 places) avec quelques centaines de spectateurs dispersés : l’ambiance s’effondre et les images paraissent vides.',
    source: pattern(`Hypothèse H-B3 de ${R1} (tribune très surdimensionnée pour un événement associatif).`),
    causes: ['Jauge surdimensionnée', 'Placement libre dans toutes les tribunes'],
    consequences: ['Ambiance faible', 'Contenus vidéo peu flatteurs', 'Sentiment d’échec'],
    prevention: ['Configuration réduite (une tribune + tribunes mobiles autour du terrain)', 'Placement concentré face caméra', 'Objectif d’affluence réaliste'],
    ruleIds: ['R06', 'R09'],
  },
  {
    id: 'err-ambiance-gala-sans-enjeu',
    category: 'manque_ambiance',
    title: 'Match de gala sans défense ni enjeu',
    observed:
      'All-Star LNB 2025 : Team France 165 – Team Monde 159, match de gala très peu défendu ; à l’inverse, la NBA a relancé l’intérêt en 2026 avec des matchs courts et compétitifs.',
    source: doc('https://lnb.fr/fr/news/les-equipes-du-all-star-game-betclic-elite-2025-sont-enfin-revelees', `${R2} §A11, §A1.`),
    causes: ['Aucun enjeu pour les joueurs', 'Format long'],
    consequences: ['Spectacle répétitif', 'Public passif'],
    prevention: ['Enjeu réel (dotation au profit d’une cause, identité « nous contre eux »)', 'Matchs courts', 'Mécanique de fin au score cible'],
    ruleIds: ['R06', 'R25'],
  },

  // -------------------------------------------------------------- inscription
  {
    id: 'err-inscription-messagerie',
    category: 'inscription',
    title: 'Inscriptions par messages privés et listes manuelles',
    observed:
      'Pattern : inscriptions recueillies par messagerie, paiement sur place, listes recopiées à la main ; le jour J, équipes manquantes, doublons, licences ou autorisations parentales absentes.',
    source: pattern('Pattern récurrent des tournois amateurs.'),
    causes: ['Absence de formulaire unique', 'Paiement non lié à l’inscription'],
    consequences: ['No-shows (places perdues)', 'Mineurs sans autorisation', 'Check-in interminable'],
    prevention: ['Formulaire unique avec paiement en ligne', 'Clôture J-2', 'Autorisations parentales et consentement image intégrés au formulaire'],
    ruleIds: ['R07', 'R23'],
  },
  {
    id: 'err-inscription-conditions-oubliees',
    category: 'inscription',
    title: 'Conditions de participation non vérifiées (âge, mixité, santé)',
    observed:
      'Exemples de conditions faciles à oublier : la Bask’Cup est ouverte aux plus de 16 ans ; le cahier des charges FFBB Open Plus interdit un tournoi uniquement masculin ou uniquement féminin ; l’attestation de santé des mineurs doit être recueillie sans collecter le questionnaire.',
    source: doc('https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy', `${R1} §A.3 et §D.1 ; ${R3} §A13.`),
    causes: ['Formulaire sans contrôle', 'Règles fédérales non intégrées'],
    consequences: ['Refus d’homologation', 'Risque juridique', 'Exclusion le jour J'],
    prevention: ['Champs obligatoires et contrôles automatiques dans le formulaire', 'Checklist réglementaire par format'],
    ruleIds: ['R07', 'R23'],
  },

  // ---------------------------------------------------------- files d'attente
  {
    id: 'err-files-stade-de-france-2022',
    category: 'files_attente',
    title: 'Goulots d’étranglement à l’entrée (finale de Ligue des champions 2022)',
    observed:
      'Stade de France, 28 mai 2022 : entrées saturées, faux billets, points de contrôle sous-dimensionnés, coup d’envoi retardé et usage de gaz lacrymogène sur des supporters ; un rapport indépendant a pointé l’organisation des accès.',
    source: doc('https://en.wikipedia.org/wiki/2022_UEFA_Champions_League_final', 'Incident largement documenté (rapport indépendant UEFA, Sénat).'),
    causes: ['Points de contrôle insuffisants', 'Contrôle billet manuel', 'Information des flux défaillante'],
    consequences: ['Mise en danger du public', 'Retard du coup d’envoi', 'Crise d’image majeure'],
    prevention: ['Calcul du débit d’entrée vs pic d’arrivée', 'Billets QR et contrôle multi-files', 'Ouverture des portes tôt avec animation'],
    ruleIds: ['R08', 'R22'],
  },
  {
    id: 'err-files-controle-manuel',
    category: 'files_attente',
    title: 'Une seule file pour billetterie, contrôle et inscriptions',
    observed:
      'Pattern associatif : une table unique à l’entrée gère la vente de billets, le contrôle, le check-in des joueurs et les questions ; file de 30 min au moment du pic.',
    source: pattern('Pattern récurrent.'),
    causes: ['Absence de séparation des flux', 'Vente sur place majoritaire'],
    consequences: ['Spectateurs qui renoncent', 'Retard des matchs'],
    prevention: ['Flux séparés (joueurs / prévente / vente sur place)', 'Prévente avec avantage tarifaire', 'Check-in joueurs dans une autre entrée'],
    ruleIds: ['R08', 'R07'],
  },

  // ------------------------------------------------------------------ visibilité
  {
    id: 'err-visibilite-score-invisible',
    category: 'visibilite',
    title: 'Score et programme invisibles pour le public',
    observed:
      'Pattern : plusieurs terrains en simultané sans tableau d’affichage, programme affiché sur une feuille A4 ; le public ne sait ni où regarder ni qui gagne.',
    source: pattern('Pattern récurrent ; l’affichage de la cible est aussi pointé pour l’Elam Ending (R2 §A3).'),
    causes: ['Pas d’affichage par terrain', 'Pas d’écran programme'],
    consequences: ['Public perdu', 'Moins de consommation de contenus', 'Moins d’ambiance'],
    prevention: ['Affichage de score par terrain (même une ardoise)', 'Programme en temps réel (écran / page web)', 'Terrain show unique pour les matchs clés'],
    ruleIds: ['R09', 'R01'],
  },
  {
    id: 'err-visibilite-tribunes-mal-placees',
    category: 'visibilite',
    title: 'Tribunes trop loin ou d’un seul côté',
    observed:
      'Pattern : public placé en hauteur dans une grande salle ou d’un seul côté du terrain ; à l’inverse, le 3x3 de Paris 2024 a enregistré un record de décibels avec un public au plus près du terrain.',
    source: pattern('Pattern ; contre-exemple documenté en R2 §B8.', 'https://olympics.com/en/news/jo-paris-2024-record-decibels-ambiance-exceptionnelle-finales-basketball-3x3-parc-urbain'),
    causes: ['Implantation non pensée pour le public'],
    consequences: ['Ambiance diluée', 'Images vides'],
    prevention: ['Tribunes mobiles autour du terrain show', 'Placement face caméra', 'Respect du dégagement de 2 m'],
    ruleIds: ['R09', 'R24'],
  },

  // ------------------------------------------------------------- restauration
  {
    id: 'err-restauration-woodstock-99',
    category: 'restauration',
    title: 'Eau et nourriture insuffisantes et trop chères (Woodstock ’99)',
    observed:
      'Woodstock ’99 : chaleur extrême, bouteilles d’eau vendues très cher, points d’eau insuffisants ; l’exaspération du public a contribué aux débordements.',
    source: doc('https://en.wikipedia.org/wiki/Woodstock_%2799', 'Incident largement documenté.'),
    causes: ['Sous-dimensionnement des points d’eau', 'Prix abusifs', 'Chaleur'],
    consequences: ['Malaises', 'Colère du public', 'Crise de réputation durable'],
    prevention: ['Eau gratuite accessible', 'Ratio de points de restauration par spectateur', 'Prix affichés et raisonnables'],
    ruleIds: ['R10', 'R11', 'R26'],
  },
  {
    id: 'err-restauration-file-mi-temps',
    category: 'restauration',
    title: 'Une seule buvette saturée à la pause',
    observed: 'Pattern : un seul point de vente, paiement en espèces, 30-40 min de file à la pause ; spectateurs qui ratent la reprise, ventes perdues.',
    source: pattern('Pattern récurrent ; R2 §B11 (cashless et précommande).'),
    causes: ['Un seul point de vente', 'Paiement lent', 'Pas de précommande'],
    consequences: ['Recettes perdues', 'Frustration', 'Tribunes vides à la reprise'],
    prevention: ['1 point de vente pour 400 spectateurs', 'Paiement sans contact', 'Précommande', 'Pause décalée par terrain'],
    ruleIds: ['R10', 'R08'],
  },

  // ------------------------------------------------------------- tarification
  {
    id: 'err-tarification-dynamique',
    category: 'tarification',
    title: 'Prix qui évoluent sans transparence',
    observed:
      'Vente des billets de la tournée de reformation d’Oasis (2024) : la tarification dynamique a provoqué une forte polémique au Royaume-Uni et une enquête de l’autorité de la concurrence.',
    source: pattern('Incident médiatisé ; détails non revérifiés dans cette session.', 'https://www.gov.uk/government/news/cma-launches-investigation-into-ticketmaster-over-oasis-concert-sales'),
    causes: ['Prix non annoncés à l’avance', 'Hausse en cours de vente'],
    consequences: ['Sentiment d’abus', 'Atteinte à l’image'],
    prevention: ['Grille tarifaire publiée et stable', 'Avantage clair à la prévente plutôt que hausse', 'Tarifs famille et jeunes'],
    ruleIds: ['R11'],
  },
  {
    id: 'err-tarification-incoherente',
    category: 'tarification',
    title: 'Grille incohérente (famille plus chère que deux billets, pas de tarif enfant)',
    observed:
      'Pattern associatif : un tarif unique ou des formules incohérentes ; les références régionales montrent des grilles lisibles (ex. ASG Alsace 2026 : 5 à 15 €, VIP 50 €, gratuit moins de 5 ans).',
    source: pattern(`Pattern ; référence régionale ${R1} §D.1 (tarifs ASG Alsace, probable).`, 'https://www.helloasso.com/associations/beyond-the-bounce/evenements/all-stars-game-2026'),
    causes: ['Tarifs fixés sans benchmark', 'Pas de réflexion sur les publics'],
    consequences: ['Familles découragées', 'Recettes sous-optimales'],
    prevention: ['Grille type : gratuit < 12 ans, réduit, plein, famille < 2 pleins, prévente, premium', 'Benchmark régional systématique'],
    ruleIds: ['R11'],
  },

  // -------------------------------------------------------------- récompenses
  {
    id: 'err-recompenses-cash-non-autorise',
    category: 'recompenses',
    title: 'Dotation en argent annoncée sans autorisation ni cadre fiscal',
    observed:
      'Règle : au-delà de 3 000 € de prix dans une manifestation ouverte aux licenciés, une autorisation de la fédération délégataire est requise (Code du sport L331-5, A331-1) ; les prize money ont aussi des conséquences sociales et fiscales.',
    source: { confidence: 'probable', source: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025276085', accessedAt: ACC, note: `${R3} §A11 (CONFIRMÉ, version à revérifier).` },
    causes: ['Effet d’annonce', 'Méconnaissance des règles'],
    consequences: ['Annulation de la dotation', 'Risque juridique et fiscal', 'Perte de crédibilité'],
    prevention: ['Valider toute dotation (fédération, expert-comptable) avant annonce', 'Privilégier lots et expériences'],
    ruleIds: ['R12'],
  },
  {
    id: 'err-recompenses-peu-motivantes',
    category: 'recompenses',
    title: 'Récompenses génériques ou réservées au seul vainqueur',
    observed:
      'Pattern : une coupe pour le vainqueur, rien pour les autres ; aucun souvenir pour les participants, aucune récompense individuelle (MVP, meilleur défenseur, fair-play).',
    source: pattern('Pattern récurrent.'),
    causes: ['Budget récompenses négligé', 'Pas de réflexion sur l’expérience joueur'],
    consequences: ['Faible fidélisation', 'Pas de contenu « remise » partageable'],
    prevention: ['Souvenir pour chaque participant (photo, carte joueur numérique)', '3 à 5 trophées individuels', 'Remise scénarisée'],
    ruleIds: ['R12'],
  },

  // ----------------------------------------------------------- communication
  {
    id: 'err-communication-collecte-peu-relayee',
    category: 'communication',
    title: 'Collecte en ligne peu relayée et pages en doublon',
    observed:
      'Signal interne : la collecte « La Bask’Cup revient sur Nancy » affichait 130 € sur 5 000 € (instantané indexé, 4 contributeurs) ; deux collectes ont des URL quasi identiques, ce qui peut gêner la communication.',
    source: doc('https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy/widget/1', `${R1} §A.3, hypothèse H-A3.`),
    causes: ['Collecte non intégrée à un plan de communication', 'Contreparties peu attractives', 'Doublon d’URL'],
    consequences: ['Objectif de financement manqué', 'Signal de faible mobilisation'],
    prevention: ['Plan de communication J-45 avec temps forts', 'Contreparties concrètes', 'Une URL unique par campagne'],
    ruleIds: ['R13'],
  },
  {
    id: 'err-communication-homonymie-calendrier',
    category: 'communication',
    title: 'Nom non exclusif et date proche d’un événement comparable',
    observed:
      'Un autre « All Star Game Grand-Est » s’est tenu à Metz vers 2019, et l’ASG Alsace 2026 avait lieu une semaine après l’ASG Grand Est (13 juin 2026) : risque de confusion et de concurrence sur les mêmes joueurs et publics.',
    source: pattern(`${R1} hypothèses H-A6 et H-D2.`, 'https://letsgometz.com/immersion-au-coeur-du-all-star-game-grand-est/'),
    causes: ['Pas de veille calendrier', 'Pas de vérification de nom'],
    consequences: ['Confusion de marque', 'Joueurs et public partagés'],
    prevention: ['Veille calendrier régionale', 'Vérifications INPI/EUIPO et réseaux avant de figer un nom', 'Coordination ou circuit avec les événements voisins'],
    ruleIds: ['R13'],
  },

  // ------------------------------------------------------ engagement du public
  {
    id: 'err-engagement-influenceurs',
    category: 'engagement_public',
    title: 'Tribunes « confisquées » au profit d’influenceurs',
    observed: 'NBA Paris Games 2025 : l’afflux d’influenceurs en tribunes, mobilisés par une agence, a été critiqué au détriment des vrais fans.',
    source: pattern(`Source unique (info.fr) citée en ${R2} §A25.`, 'https://info.fr/nba-paris-games-critiques-afflux-influenceurs-tribunes/'),
    causes: ['Stratégie de visibilité qui ignore la communauté'],
    consequences: ['Ressentiment des fans', 'Authenticité perdue'],
    prevention: ['Quota de places réservé aux licenciés et familles', 'Créateurs comme amplificateurs, pas comme public principal'],
    ruleIds: ['R14', 'R06'],
  },
  {
    id: 'err-engagement-public-passif',
    category: 'engagement_public',
    title: 'Public spectateur passif pendant des heures',
    observed:
      'Pattern : aucun moment où le public agit (vote, concours, pronostic, défi) ; à l’inverse, le bracket de March Madness transforme chaque spectateur en joueur.',
    source: pattern('Pattern ; contre-exemple R2 §A6.'),
    causes: ['Programme pensé uniquement pour les joueurs'],
    consequences: ['Départs anticipés', 'Peu de contenus UGC'],
    prevention: ['Au moins une interaction public toutes les 20 min', 'Bracket challenge, vote MVP, défis spectateurs'],
    ruleIds: ['R14'],
  },

  // ------------------------------------------------------------- audiovisuel
  {
    id: 'err-audiovisuel-audience-tv',
    category: 'audiovisuel',
    title: 'Salles pleines mais audience vidéo en baisse',
    observed: 'Unrivaled saison 2 (2026) : billetterie +204 % et salles pleines, mais audiences TV en baisse.',
    source: doc('https://africa.espn.com/wnba/story/_/id/48146436/unrivaled-sells-arenas-sees-ratings-dip-2nd-season', `${R2} §A5.`),
    causes: ['Expérience en salle ≠ produit vidéo', 'Concurrence de programmes'],
    consequences: ['Valeur partenaire limitée hors salle'],
    prevention: ['Plan de captation pensé pour les formats courts', 'KPI vidéo distincts des KPI billetterie'],
    ruleIds: ['R15'],
  },
  {
    id: 'err-audiovisuel-aucun-plan',
    category: 'audiovisuel',
    title: 'Aucun plan de captation, musique protégée, contenus inexploitables',
    observed:
      'Pattern : filmé « à l’arrache » par quelques téléphones, aucun plan des moments clés, vidéos coupées par les plateformes pour musique protégée, autorisations image absentes pour les mineurs.',
    source: pattern(`Pattern ; obligations droit à l’image et SACEM en ${R3} §A10, §A14.`),
    causes: ['Pas de responsable contenu', 'Pas de liste de plans', 'Droits non anticipés'],
    consequences: ['Aucun highlight publiable', 'Rien à montrer aux partenaires'],
    prevention: ['Responsable contenu désigné', 'Shot list des moments clés', 'Consentements image à l’inscription', 'Musique libre de droits pour les montages'],
    ruleIds: ['R15', 'R23'],
  },

  // ---------------------------------------------------------------- bénévoles
  {
    id: 'err-benevoles-no-show',
    category: 'benevoles',
    title: 'Bénévoles absents ou sans mission claire',
    observed:
      'Pattern : 20 à 30 % d’absences le jour J, rôles flous, bénévoles debout 10 h sans pause. Signal Bask’Est : 23 bénévoles avaient proposé leur aide sur JeVeuxAider, sans mission visible au moment de l’indexation.',
    source: pattern(`Pattern récurrent ; signal ${R1} §A.2 (instantané, probable).`, 'https://www.jeveuxaider.gouv.fr/organisations/34821-baskest'),
    causes: ['Pas de fiches de poste', 'Pas de planning de rotation', 'Offre de bénévolat non convertie'],
    consequences: ['Postes vacants (sécurité, buvette, table)', 'Épuisement', 'Turnover'],
    prevention: ['Fiches de poste + créneaux de 4 h max', 'Sur-recrutement de 20 %', 'Missions publiées sur les plateformes de bénévolat'],
    ruleIds: ['R16', 'R17'],
  },
  {
    id: 'err-benevoles-honorabilite',
    category: 'benevoles',
    title: 'Encadrants de mineurs non vérifiés',
    observed:
      'Obligation : les personnes encadrant des mineurs, bénévoles compris, sont soumises au contrôle d’honorabilité (Code du sport L212-9, loi 2024-201) ; pour une structure non affiliée, la procédure n’est pas automatisée.',
    source: { confidence: 'probable', source: 'https://www.sports.gouv.fr/sites/default/files/2023-01/guide-honorabilit-des-b-n-voles-3844.pdf', accessedAt: ACC, note: `${R3} §A19 (CONFIRMÉ, version à revérifier).` },
    causes: ['Méconnaissance de l’obligation', 'Recrutement de dernière minute'],
    consequences: ['Risque pour les mineurs', 'Responsabilité de l’association'],
    prevention: ['Procédure d’honorabilité intégrée au recrutement', 'Pas de poste au contact des mineurs sans vérification'],
    ruleIds: ['R16', 'R23'],
  },

  // ------------------------------------------------------- professionnalisme
  {
    id: 'err-professionnalisme-fyre',
    category: 'professionnalisme',
    title: 'Promesse marketing sans capacité de livraison (Fyre Festival)',
    observed:
      'Fyre Festival (2017) : un événement « de luxe » promu massivement par des influenceurs s’est effondré faute d’infrastructures (hébergement, nourriture, sécurité) ; l’organisateur a été condamné pour fraude.',
    source: doc('https://en.wikipedia.org/wiki/Fyre_Festival', 'Incident largement documenté.'),
    causes: ['Communication avant la faisabilité', 'Absence de rétroplanning et de go/no-go'],
    consequences: ['Annulation', 'Poursuites', 'Réputation détruite'],
    prevention: ['Go/no-go écrit à J-30 sur critères', 'Ne rien promettre qui ne soit contractualisé', 'Rétroplanning et responsables nommés'],
    ruleIds: ['R17', 'R18', 'R05'],
  },
  {
    id: 'err-professionnalisme-panne-tech',
    category: 'professionnalisme',
    title: 'Dépendance à une technologie sans plan B',
    observed:
      'Wimbledon 2025 : le système électronique de lignes a été désactivé par erreur sur un côté du court (le club s’est excusé, « erreur humaine »), puis une panne a imposé de rejouer un point.',
    source: doc('https://www.skysports.com/tennis/news/32498/13393402/wimbledon-officials-apologise-to-players-after-line-calling-technology-turned-off-in-malfunction-on-centre-court', `${R2} §B6.`),
    causes: ['Pas de procédure dégradée', 'Opérateurs non formés'],
    consequences: ['Décisions contestées', 'Image d’amateurisme'],
    prevention: ['Procédure manuelle de secours pour chaque outil (scoring, écran, billetterie)', 'Test technique la veille'],
    ruleIds: ['R17', 'R05'],
  },

  // ------------------------------------------------------- surdimensionnement
  {
    id: 'err-surdim-kings-league',
    category: 'surdimensionnement',
    title: 'Expansion trop rapide et coûts fixes trop lourds',
    observed:
      'Kings League 2026 : après plus de 60 M€ investis à l’international, perte de 7,6 M€, plan de licenciement de 41 salariés et suspension des ligues France et Allemagne ; « de l’argent a été brûlé » selon le CEO.',
    source: doc('https://en.ara.cat/economy/gerard-pique-s-kings-league-wants-to-lay-off-half-of-its-workers_1_5764708.html', `${R2} §B1.`),
    causes: ['Croissance avant preuve de rentabilité', 'Dépendance à l’audience des créateurs'],
    consequences: ['Arrêt d’activités', 'Licenciements'],
    prevention: ['Montée en échelle conditionnée aux résultats d’édition (maturité)', 'Coûts fixes minimaux', 'Provision pour imprévus'],
    ruleIds: ['R18'],
  },
  {
    id: 'err-surdim-big3-expansion',
    category: 'surdimensionnement',
    title: 'Objectifs d’expansion annoncés puis repoussés',
    observed:
      'BIG3 : objectif de 16 équipes repoussé (12 visées d’ici 2027), environ la moitié seulement des franchises vendues, litige NFT en cours.',
    source: doc('https://frontofficesports.com/big3-fighting-suit-over-nfts-amid-plans-to-take-league-public/', `${R2} §A13.`),
    causes: ['Modèle économique fondé sur des ventes futures'],
    consequences: ['Crédibilité entamée', 'Instabilité'],
    prevention: ['N’annoncer que ce qui est financé', 'Scénario prudent comme référence budgétaire'],
    ruleIds: ['R18'],
  },
  {
    id: 'err-surdim-salle-trop-grande',
    category: 'surdimensionnement',
    title: 'Louer trop grand, trop tôt',
    observed:
      'Pattern associatif : réservation d’une grande salle et de prestations premium (écran LED, captation multi-caméras) avant d’avoir sécurisé les recettes ; le déficit est porté par les bénévoles.',
    source: pattern('Pattern récurrent ; seuil de rentabilité calculé par le simulateur financier.'),
    causes: ['Ambition non adossée à des recettes signées', 'Absence de scénario prudent'],
    consequences: ['Déficit', 'Trésorerie négative avant l’événement'],
    prevention: ['Part de recettes sécurisées ≥ 50 % avant engagement', 'Prestations premium en option conditionnelle'],
    ruleIds: ['R18'],
  },

  // ----------------------------------------------------------------- sponsoring
  {
    id: 'err-sponsoring-logo-seulement',
    category: 'sponsoring',
    title: 'Partenaire réduit à un logo sur l’affiche',
    observed:
      'Pattern : contreparties limitées au logo, aucune activation sur place, aucun bilan ; le partenaire ne renouvelle pas.',
    source: pattern('Pattern récurrent du sponsoring local.'),
    causes: ['Offre partenaire générique', 'Pas de reporting'],
    consequences: ['Non-renouvellement', 'Prix du partenariat tiré vers le bas'],
    prevention: ['Au moins une activation par partenaire (stand, défi, remise de prix)', 'Bilan partenaire chiffré à J+15'],
    ruleIds: ['R19'],
  },
  {
    id: 'err-sponsoring-mecenat-confusion',
    category: 'sponsoring',
    title: 'Confusion parrainage / mécénat et reçus fiscaux irréguliers',
    observed:
      'Règle : le parrainage est une prestation commerciale (facture, TVA éventuelle), le mécénat un don (réduction d’impôt de 60 % pour l’entreprise, contreparties limitées) ; un reçu fiscal délivré sans éligibilité expose l’association à une amende.',
    source: { confidence: 'probable', source: 'https://www.economie.gouv.fr/entreprises/mecenat-donnez-des-oeuvres-dinteret-general-et-obtenez-une-reduction-dimpot', accessedAt: ACC, note: `${R3} §B1 (taux et plafond vérifiés 2025-2026 ; détails à confirmer).` },
    causes: ['Contrat unique mélangeant visibilité et don', 'Éligibilité non vérifiée (rescrit)'],
    consequences: ['Redressement', 'Amende fiscale', 'Partenaire mis en difficulté'],
    prevention: ['Deux contrats distincts', 'Rescrit mécénat avant tout reçu fiscal', 'Validation par un expert-comptable'],
    ruleIds: ['R19'],
  },

  // -------------------------------------------------------------- accessibilité
  {
    id: 'err-accessibilite-pmr-oubliee',
    category: 'accessibilite',
    title: 'Accès PMR pensé pour le bâtiment, pas pour l’événement',
    observed:
      'Pattern : bâtiment accessible (le Palais Jean-Weille a fait l’objet de travaux d’accessibilité achevés en 2023) mais implantation de l’événement qui bloque les cheminements, sans places PMR réservées en tribune ni sanitaires accessibles fléchés.',
    source: pattern(`Pattern ; travaux Ad’AP du Palais en ${R1} §B.1 (probable).`, 'https://www.grandnancy.eu/fileadmin/fichiers/VIVRE_ET_HABITER/Solidarite/2023_07_ADAP_bilan_signed.pdf'),
    causes: ['Implantation non vérifiée', 'Personnel non informé'],
    consequences: ['Exclusion de spectateurs', 'Non-conformité', 'Contradiction avec la mission inclusive'],
    prevention: ['Places PMR réservées et signalées', 'Cheminement de 1,40 m maintenu', 'Bénévole référent accessibilité'],
    ruleIds: ['R20'],
  },
  {
    id: 'err-accessibilite-exterieur',
    category: 'accessibilite',
    title: 'Événement extérieur sur sol non praticable',
    observed:
      'Pattern : 3x3 sur pelouse, gravier ou pavés, sans plancher ni cheminement stabilisé ; fauteuils, poussettes et personnes âgées ne peuvent pas accéder aux tribunes et à la buvette.',
    source: pattern(`Pattern ; obligations accessibilité ${R3} §A17.`),
    causes: ['Choix du site sans critère d’accessibilité'],
    consequences: ['Public exclu', 'Image contraire aux valeurs inclusives'],
    prevention: ['Cheminements stabilisés', 'Zone PMR en tribune', 'Sanitaire adapté'],
    ruleIds: ['R20'],
  },

  // ------------------------------------------------------------------- sécurité
  {
    id: 'err-securite-astroworld',
    category: 'securite',
    title: 'Mouvement de foule face à la scène (Astroworld 2021)',
    observed:
      'Astroworld Festival, Houston, 5 novembre 2021 : un mouvement de foule a fait 10 morts ; l’absence de capacité à arrêter le show et la densité de la fosse ont été pointées.',
    source: doc('https://en.wikipedia.org/wiki/Astroworld_Festival_crowd_crush', 'Incident largement documenté.'),
    causes: ['Densité non contrôlée', 'Chaîne de décision d’arrêt floue'],
    consequences: ['Décès', 'Poursuites judiciaires'],
    prevention: ['Jauge et densité maximales par zone', 'Procédure d’arrêt du spectacle', 'Secours positionnés'],
    ruleIds: ['R22', 'R21'],
  },
  {
    id: 'err-securite-love-parade',
    category: 'securite',
    title: 'Accès unique pour l’entrée et la sortie (Love Parade 2010)',
    observed: 'Love Parade, Duisbourg, 24 juillet 2010 : une bousculade dans le tunnel d’accès unique a fait 21 morts.',
    source: doc('https://en.wikipedia.org/wiki/Love_Parade_disaster', 'Incident largement documenté.'),
    causes: ['Entrée et sortie sur le même cheminement', 'Capacité du site sous-estimée'],
    consequences: ['Décès', 'Fin de l’événement'],
    prevention: ['Flux entrée/sortie séparés', 'Calcul des dégagements selon l’effectif', 'Validation par les autorités'],
    ruleIds: ['R22', 'R08'],
  },
  {
    id: 'err-securite-wembley-2021',
    category: 'securite',
    title: 'Intrusions de personnes sans billet (finale de l’Euro 2020 à Wembley)',
    observed: 'Finale de l’Euro 2020, Wembley, 11 juillet 2021 : des milliers de personnes sans billet ont forcé les accès ; un rapport indépendant (Casey Review) a analysé les défaillances.',
    source: doc('https://en.wikipedia.org/wiki/UEFA_Euro_2020_final', 'Incident largement documenté.'),
    causes: ['Rassemblement massif aux abords', 'Périmètre de sécurité insuffisant'],
    consequences: ['Mise en danger', 'Sanctions'],
    prevention: ['Périmètre et filtrage dimensionnés', 'Coordination avec les autorités', 'Agents CNAPS au-delà de 300 spectateurs pour les palpations'],
    ruleIds: ['R22', 'R21'],
  },
  {
    id: 'err-securite-chaleur-nancy',
    category: 'securite',
    title: 'Tournoi 3x3 extérieur annulé (chaleur, réglementation locale)',
    observed:
      'Open Plus 3x3 de Nancy 2026 (Comité 54, Parc de la Pépinière) : annulé, la FFBB annonçant « Les Opens Plus de Pau et Nancy annulés » ; motifs rapportés : chaleur et réglementation locale.',
    source: doc('https://www.ffbb.com/actualites/les-opens-plus-de-pau-et-nancy-annules', `${R1} §D.1 (titre vérifié ; motifs probables).`),
    causes: ['Exposition climatique en juin', 'Arrêtés locaux en période de canicule'],
    consequences: ['Annulation sans report', 'Pertes pour les équipes et partenaires'],
    prevention: ['Salle de repli réservée sous condition', 'Horaires décalés', 'Ombre, eau, pauses fraîcheur', 'Seuils météo de décision écrits'],
    ruleIds: ['R26', 'R21'],
  },
  {
    id: 'err-securite-degagement-terrain',
    category: 'securite',
    title: 'Terrain collé au public ou à des obstacles',
    observed:
      'Pattern : terrain 3x3 implanté sans zone de dégagement (bancs, barrières, poteaux, premiers rangs à moins d’un mètre) ; collisions joueurs/spectateurs.',
    source: pattern('Pattern récurrent ; recommandation de 2 m de dégagement intégrée au configurateur de salles.'),
    causes: ['Recherche de proximité sans contrainte de sécurité', 'Espace insuffisant'],
    consequences: ['Blessures', 'Mise en cause de l’organisateur (RC)'],
    prevention: ['Dégagement de 2 m minimum', 'Protections sur les obstacles', 'Implantation validée avant montage'],
    ruleIds: ['R24'],
  },
];

/** Nombre de cas par catégorie (contrôle de couverture de l'observatoire). */
export function errorCoverage(): Record<ErrorCategory, number> {
  const out = {} as Record<ErrorCategory, number>;
  for (const e of ERROR_CASES) out[e.category] = (out[e.category] ?? 0) + 1;
  return out;
}
