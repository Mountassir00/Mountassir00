import type {
  Audience,
  CompetitionFormat,
  Concept,
  ContentHook,
  ExperienceMoment,
  MatchRules,
  MaturityEvidence,
  SafetyPlan,
  ShotZone,
} from '../core/model';
import { RULES_1V1, RULES_FIBA_3X3, ZONES_3X3, ZONES_5X5 } from '../core/simulation/presets';

/**
 * Bibliothèque initiale de concepts BASK'EST LAB (exigence §23, livrables 14, 16, 17).
 *
 * - 10 formats atypiques (tag 'atypique')
 * - 3 concepts à budget limité (tag 'budget_limite')
 * - 3 concepts pour un palais des sports (tag 'palais', Palais des Sports Jean-Weille)
 *
 * Tous sont au stade "concept documenté" : AUCUN n'a été testé sur le terrain.
 * Les effectifs, publics et budgets sont des hypothèses de conception à confronter
 * au simulateur, au simulateur financier et à un test réel (cf. docs/15-nouveaux-formats.md).
 * Les noms sont des propositions : vérifications de propriété intellectuelle listées
 * dans `identity.nameChecks` à mener AVANT toute communication publique.
 */

const CREATED = '2026-11-24T00:00:00';

const EVIDENCE: MaturityEvidence = {
  documented: true,
  simulationRuns: 0,
  prototypeSessions: 0,
  pilotEditions: 0,
  editionsMeetingTargets: 0,
  replications: 0,
  otherTerritories: 0,
};

const NAVY = '#0B1A33';

function nameChecks(name: string): string[] {
  return [
    `INPI (data.inpi.fr) : recherche d’antériorité sur « ${name} » en classes 41 (activités sportives et culturelles), 25 (vêtements), 9/38 (contenus numériques, diffusion)`,
    'EUIPO / TMview : marques identiques ou similaires enregistrées dans l’Union européenne',
    'Réseaux sociaux : disponibilité des identifiants Instagram, TikTok, YouTube, LinkedIn',
    'Noms de domaine : disponibilité .fr et .com',
    'Recherche web : homonymies d’événements sportifs existants (risque de confusion)',
  ];
}

interface SafetyOpts {
  minors?: boolean;
  publicSpace?: boolean;
  outdoor?: boolean;
  bar?: boolean;
  bigCrowd?: boolean;
  prizeOver3000?: boolean;
  runOffM?: number;
  extraAuth?: string[];
  extraAccess?: string[];
}

function safety(o: SafetyOpts = {}): SafetyPlan {
  const auth = [
    'Assurance responsabilité civile organisateur (Code du sport L321-1) et information des participants sur l’assurance individuelle accident (L321-4)',
    'Convention de mise à disposition du lieu (gestionnaire) et respect de l’effectif maximal admis',
    'Dispositif prévisionnel de secours dimensionné selon le référentiel national DPS (association agréée de sécurité civile)',
    'Déclaration de la manifestation en mairie',
    'Droits musicaux (SACEM) pour la musique diffusée',
  ];
  if (o.publicSpace) auth.push('Autorisation d’occupation temporaire du domaine public + arrêté municipal (circulation, horaires, sonorisation)');
  if (o.outdoor) auth.push('Plan chaleur / intempéries : ombre, eau, horaires décalés, repli couvert (cf. annulation de l’Open Plus 3x3 de Nancy 2026 pour chaleur)');
  if (o.minors) {
    auth.push('Mineurs : autorisation parentale, attestation relative au questionnaire de santé, autorisation de droit à l’image signée par les titulaires de l’autorité parentale');
    auth.push('Contrôle d’honorabilité des bénévoles encadrant des mineurs');
  }
  if (o.bar) auth.push('Buvette : autorisation municipale de débit de boissons temporaire (boissons des groupes autorisés uniquement ; alcool interdit dans l’enceinte sportive sauf dérogation)');
  if (o.bigCrowd) auth.push('Agents de sécurité privée titulaires d’une carte CNAPS pour le contrôle d’accès / palpations ; posture Vigipirate en vigueur');
  if (o.prizeOver3000) auth.push('Prix > 3 000 € ouverts à des licenciés : autorisation fédérale (FFBB) préalable');
  auth.push(...(o.extraAuth ?? []));
  return {
    dps: true,
    insurance: true,
    authorizations: auth,
    minorsImageConsent: o.minors ? true : 'na',
    accessibility: [
      'Cheminement et entrée accessibles aux personnes à mobilité réduite',
      'Emplacements PMR réservés avec accompagnant, bonne visibilité',
      'Sanitaires adaptés et signalétique contrastée',
      'Règlement et programme en version « facile à lire et à comprendre » (FALC)',
      'Annonces speaker doublées à l’écran (sous-titrage) pour les personnes sourdes ou malentendantes',
      ...(o.extraAccess ?? []),
    ],
    runOffM: o.runOffM ?? 2,
  };
}

const e = (phase: ExperienceMoment['phase'], label: string, description: string, audience?: Audience[]): ExperienceMoment => ({
  phase,
  label,
  description,
  audience,
});

const h = (moment: string, platform: ContentHook['platform'], format: string, viralPotential: ContentHook['viralPotential']): ContentHook => ({
  moment,
  platform,
  format,
  viralPotential,
});

// --- Zones de tir spécifiques -------------------------------------------------

const ZONES_FAUTEUIL: ShotZone[] = [
  { id: 'inside', label: 'Intérieur de l’arc (1 pt)', points: 1, baseMake: 0.4 },
  { id: 'long', label: 'Au-delà de l’arc (2 pts)', points: 2, baseMake: 0.22 },
];

const ZONES_MINI: ShotZone[] = [
  { id: 'inside', label: 'Près du panier (1 pt)', points: 1, baseMake: 0.36 },
  { id: 'long', label: 'Ligne étoile (2 pts)', points: 2, baseMake: 0.16 },
];

const ZONES_SHOW: ShotZone[] = [
  { id: 'inside', label: 'Spot Bronze (1 pt)', points: 1, baseMake: 0.55 },
  { id: 'long', label: 'Spot Argent (2 pts)', points: 2, baseMake: 0.38 },
  { id: 'logo', label: 'Spot Or — logo central (3 pts)', points: 3, baseMake: 0.2 },
];

const rules3x3 = (over: Partial<MatchRules> = {}): MatchRules => ({ ...RULES_FIBA_3X3, official: false, ...over });

const poolsThenBracket = (id: string, groups: number, q = 2, thirdPlace = false) => [
  { id: `${id}-poules`, type: 'round_robin' as const, label: 'Poules', groups, qualifiersPerGroup: q, seeding: 'snake' as const },
  { id: `${id}-tableau`, type: 'single_elim' as const, label: 'Tableau final', thirdPlace },
];

function fmt(id: string, name: string, f: Omit<CompetitionFormat, 'id' | 'name'>): CompetitionFormat {
  return { id: `fmt-${id}`, name, ...f };
}

// =============================================================================
// A. DIX FORMATS ATYPIQUES
// =============================================================================

const chardon: Concept = {
  id: 'cpt-chardon-1c1',
  title: 'Le Chardon — duels 1 contre 1',
  pitch:
    'Seize duellistes, un seul panier, aucun endroit où se cacher. Chaque duel se joue en 11 points ou 5 minutes, et chaque joueur possède une « épine » : une carte joker de 45 secondes pendant laquelle ses paniers comptent double. Walk-out musical choisi par chaque duelliste, beatmaker en live, speaker au bord du terrain. Deux tableaux (féminin et masculin) le même soir. « Qui s’y frotte s’y pique » : la devise de Nancy devient une règle du jeu.',
  identity: {
    name: 'Le Chardon',
    tagline: 'Qui s’y frotte s’y pique.',
    palette: [NAVY, '#7B5EA7', '#F26B1D', '#F7F5F0'],
    motif: 'Chardon stylisé dont les épines dessinent les 8 coutures d’un ballon ; arène circulaire au sol.',
    nameChecks: nameChecks('Le Chardon'),
  },
  objectives: ['spectacle', 'detection', 'communaute'],
  audiences: ['passionnes', 'jeunes', 'supporters', 'familles', 'femmes'],
  venueType: 'gymnase',
  scale: 'regionale',
  format: fmt('chardon-1c1', 'Duels 1c1 — poules de 4 puis tableau à 8', {
    teamSize: 1,
    rosterSize: 1,
    teams: 16,
    stages: poolsThenBracket('chardon', 4, 2, true),
    match: { ...RULES_1V1, mechanics: [{ id: 'joker_card', params: { seconds: 45 } }] },
    composition: [{ kind: 'mixite', description: 'Deux tableaux de 16 (féminin / masculin) joués en alternance sur le même terrain.' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Allée des épines', 'Entrée par un couloir lumineux violet ; chaque spectateur reçoit un bracelet "épine" qui sert de vote pour le duel de la soirée.', ['familles', 'enfants']),
    e('ouverture', 'Tirage public des poules', 'Les 32 duellistes tirent leur poule sur scène ; les têtes de série sont annoncées comme des boxeurs.'),
    e('presentation', 'Walk-out', 'Chaque duelliste entre sur la musique de son choix, fiche joueur projetée (taille, club, devise).', ['passionnes', 'supporters']),
    e('jeu', 'Arène 1c1', 'Terrain unique en "arène" : public à 3 m, speaker qui commente chaque possession, beatmaker qui accélère le tempo dans la dernière minute.'),
    e('interruption', 'Minute des enfants', 'Entre deux duels : des enfants défient un duelliste éliminé sur 3 possessions (lancer de ballon mousse pour les plus jeunes).', ['enfants', 'familles']),
    e('temps_fort', 'L’épine', 'Quand un joueur lève sa carte joker : lumière violette, jingle, compteur 45 s à l’écran.'),
    e('remise', 'Couronne de chardon', 'Trophée en métal découpé (chardon), ceinture brodée pour les vainqueurs des deux tableaux.'),
    e('apres', 'Carte de duelliste', 'Chaque participant reçoit sa carte de performance partageable (stats, meilleur moment vidéo).', ['jeunes']),
    e('arrivee', 'Accueil PMR', 'Places PMR au premier rang de l’arène, accompagnateur gratuit, programme FALC.', ['pmr']),
  ],
  content: [
    h('Walk-out des duellistes', 'tiktok', 'Vidéo verticale 15 s, ralenti + nom à l’écran', 5),
    h('Épine jouée dans la dernière minute', 'instagram', 'Reel 20 s avec compteur incrusté', 5),
    h('Duel complet de la finale', 'youtube', 'Match intégral + commentaire', 3),
    h('Portrait du vainqueur', 'linkedin', 'Post texte + photo : parcours, club, partenaires', 2),
  ],
  innovationIds: ['inn-1v1-circuit', 'inn-walkout-entrees', 'inn-feminin-prime-time'],
  budgetTier: 'limite',
  expectedSpectators: 350,
  durationHours: 5,
  volunteersNeeded: 14,
  safety: safety({ bar: true, runOffM: 2 }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '1c1', 'joker', 'mixite_tableaux', 'musique'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const mirabelle: Concept = {
  id: 'cpt-mirabelle-2x2',
  title: 'Paires Mirabelle — 2x2 mixte',
  pitch:
    'Le duo comme unité de jeu : chaque équipe aligne une joueuse et un joueur, en permanence. Matchs de 7 minutes ou 15 points sur demi-terrain. Toutes les 3 minutes, le public éclaire une « zone mirabelle » (applaudimètre) où les paniers comptent double pendant 60 secondes. Format court, lisible, pensé pour les fins d’après-midi d’été et pour donner autant de ballons aux joueuses qu’aux joueurs.',
  identity: {
    name: 'Paires Mirabelle',
    tagline: 'À deux, c’est plus sucré.',
    palette: [NAVY, '#F4C430', '#F26B1D', '#F7F5F0'],
    motif: 'Deux mirabelles formant un "2" ; ronds de couleur au sol pour les zones bonus.',
    nameChecks: nameChecks('Paires Mirabelle'),
  },
  objectives: ['inclusion', 'communaute', 'spectacle'],
  audiences: ['femmes', 'amateurs', 'familles', 'etudiants', 'jeunes'],
  venueType: 'terrain_exterieur',
  scale: 'locale',
  format: fmt('mirabelle-2x2', '2x2 mixte — poules de 4 puis tableau à 8', {
    teamSize: 2,
    rosterSize: 3,
    teams: 16,
    stages: poolsThenBracket('mirabelle', 4, 2),
    match: {
      teamSize: 2,
      end: { type: 'time_or_target', minutes: 7, points: 15 },
      shotClockSec: 12,
      zones: ZONES_3X3,
      overtime: 'first_to_2',
      mechanics: [{ id: 'public_zone_bonus', params: { everySeconds: 180 } }],
      official: false,
    },
    composition: [{ kind: 'mixite', description: 'Une joueuse et un joueur sur le terrain en permanence', constraint: '1 F + 1 H à tout moment ; remplaçant de l’un ou l’autre sexe' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Village mirabelle', 'Stand de jus de mirabelle et tartes (producteur local à solliciter), coin ombre et brumisateurs.', ['familles', 'enfants']),
    e('ouverture', 'Présentation des paires', 'Chaque duo tire au sort une "devise de paire" écrite par le public sur un mur d’ardoises.'),
    e('jeu', 'Zones mirabelle', 'Trois ronds jaunes au sol ; quand le public en choisit un à l’applaudimètre, il s’allume (LED au sol ou plots lumineux).'),
    e('interruption', 'Défi parent-enfant', 'Entre deux matchs, une paire parent-enfant tente 5 tirs dans la zone mirabelle.', ['enfants', 'familles']),
    e('temps_fort', 'Finale au coucher du soleil', 'Finale programmée à l’heure dorée, playlist choisie par les finalistes.'),
    e('remise', 'Cagettes dorées', 'Trophée en forme de cagette de mirabelles en bois doré ; lots de producteurs locaux.'),
    e('apres', 'Apéro des paires', 'Moment convivial sans alcool entre joueurs et public ; photo de groupe.', ['amateurs']),
    e('arrivee', 'Accès PMR', 'Cheminement stabilisé jusqu’au bord du terrain, places assises ombragées réservées.', ['pmr']),
  ],
  content: [
    h('Panier en zone mirabelle', 'tiktok', 'Clip 10 s avec effet lumineux jaune', 4),
    h('Duos mixtes', 'instagram', 'Carrousel portraits "qui fait quoi dans la paire"', 3),
    h('Défi parent-enfant', 'instagram', 'Reel émotion 20 s', 4),
    h('Bilan mixité', 'linkedin', 'Post chiffres : temps de jeu joueuses, nouvelles inscrites', 2),
  ],
  innovationIds: ['inn-contenu-chaque-match', 'inn-cartes-joueurs-2k'],
  budgetTier: 'limite',
  expectedSpectators: 250,
  durationHours: 5,
  volunteersNeeded: 10,
  safety: safety({ outdoor: true, publicSpace: true, bar: true }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '2c2', 'mixte', 'exterieur', 'public_interactif'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const nocturnes: Concept = {
  id: 'cpt-nocturnes-3x3',
  title: 'Les Nocturnes — 3x3 au score cible',
  pitch:
    'Un tournoi 3x3 qui commence quand les autres finissent : 20h-1h, sous projecteurs, avec DJ. Chaque match dure 7 minutes puis passe en « cible » : score du leader + 5. Chaque match se termine donc sur un panier gagnant — fini les fins de match qui s’éteignent. Entre les rencontres, battles de DJ et de danse. Inspiré de la fin « Elam » popularisée par The Basketball Tournament, adaptée au 3x3.',
  identity: {
    name: 'Les Nocturnes',
    tagline: 'Le dernier panier gagne. Toujours.',
    palette: [NAVY, '#2E86AB', '#F26B1D', '#E9EDF5'],
    motif: 'Lune pleine en forme de ballon, faisceaux de projecteurs en diagonale (flèche Est).',
    nameChecks: nameChecks('Les Nocturnes'),
  },
  objectives: ['spectacle', 'communaute', 'revenus'],
  audiences: ['jeunes', 'etudiants', 'passionnes', 'amateurs'],
  venueType: 'espace_temporaire',
  scale: 'regionale',
  format: fmt('nocturnes-3x3', '3x3 Elam — poules de 4 puis tableau à 8', {
    teamSize: 3,
    rosterSize: 4,
    teams: 16,
    stages: poolsThenBracket('nocturnes', 4, 2),
    match: rules3x3({ end: { type: 'elam', minutes: 7, plus: 5 }, overtime: 'none' }),
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Tunnel lumineux', 'Entrée par une arche de lumière, bracelet LED remis au contrôle (couleur = poule soutenue).', ['jeunes']),
    e('ouverture', 'Allumage', 'Extinction totale, compte à rebours du public, allumage des projecteurs sur le terrain central.'),
    e('jeu', 'Cible affichée', 'La cible (ex. « 17 ») s’affiche en grand dès la 7e minute ; le speaker annonce chaque point qui manque.'),
    e('interruption', 'Battles', 'Battles de danse et sets de DJ de 5 minutes entre les matchs du terrain central.'),
    e('temps_fort', 'Panier de minuit', 'Le match en cours à minuit pile est joué « lumières éteintes » sauf le panier (spot unique) — mise en scène, sans modifier la règle.'),
    e('remise', 'Trophée lune', 'Trophée en résine phosphorescente.'),
    e('apres', 'Afterhours playlist', 'Playlist de la soirée publiée sur les plateformes de streaming ; photos dans la nuit.', ['etudiants']),
    e('arrivee', 'Famille et PMR (début de soirée)', 'Tarif famille avant 21h, zone calme et places PMR près de la sortie avec éclairage de cheminement.', ['familles', 'pmr', 'enfants']),
  ],
  content: [
    h('Panier gagnant à la cible', 'tiktok', 'Compilation des "game winners" de la nuit', 5),
    h('Allumage des projecteurs', 'instagram', 'Reel 15 s plan large + son du public', 4),
    h('Battles entre les matchs', 'tiktok', 'Clips danse 20 s', 4),
    h('After-movie', 'youtube', 'Film 3 min', 3),
  ],
  innovationIds: ['inn-elam-score-cible', 'inn-public-lumiere', 'inn-grammaire-3x3-festival'],
  budgetTier: 'standard',
  expectedSpectators: 600,
  durationHours: 5,
  volunteersNeeded: 22,
  safety: safety({ bar: true, bigCrowd: false, extraAuth: ['Horaires de nuit : accord du gestionnaire, transport retour (navettes / derniers trams), gestion du bruit'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '3c3', 'elam', 'nocturne', 'musique'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const quadra: Concept = {
  id: 'cpt-quadra-4x4',
  title: 'QUADRA — 4x4 draft mystère',
  pitch:
    'Inscription individuelle, équipes révélées sur place. 40 joueuses et joueurs, 8 capitaines désignés au classement, une draft en serpentin jouée sur scène en ouverture. Puis un format rare : du 4 contre 4 tout-terrain, plus d’espace que le 5x5, plus de transitions que le 3x3. Matchs de 12 minutes, mort subite en prolongation. Le format idéal pour mélanger les clubs et les quartiers.',
  identity: {
    name: 'QUADRA',
    tagline: 'Quatre inconnus. Une équipe.',
    palette: [NAVY, '#3BA272', '#F4C430', '#F7F5F0'],
    motif: 'Carré divisé en 4 quadrants, chacun portant un chiffre de draft.',
    nameChecks: nameChecks('QUADRA'),
  },
  objectives: ['communaute', 'spectacle', 'detection'],
  audiences: ['amateurs', 'passionnes', 'etudiants', 'jeunes'],
  venueType: 'gymnase',
  scale: 'locale',
  format: fmt('quadra-4x4', '4x4 tout-terrain — 2 poules de 4, demi-finales, finale', {
    teamSize: 4,
    rosterSize: 5,
    teams: 8,
    stages: poolsThenBracket('quadra', 2, 2, true),
    match: { teamSize: 4, end: { type: 'time', minutes: 12 }, shotClockSec: 20, zones: ZONES_5X5, overtime: 'sudden_death', mechanics: [], official: false },
    composition: [{ kind: 'niveau', description: 'Draft en serpentin avec chapeaux de niveau pour équilibrer les équipes.' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Check-in mystère', 'Chaque joueur reçoit un maillot neutre et un numéro ; les spectateurs reçoivent une grille pour pronostiquer la draft.', ['familles']),
    e('ouverture', 'Draft sur scène', '8 capitaines choisissent en serpentin, chrono de 30 s par choix, le dernier choix est présenté comme "pick surprise".'),
    e('presentation', 'Remise des couleurs', 'Les équipes reçoivent leur maillot de couleur et choisissent un nom en 2 minutes.'),
    e('jeu', '4x4', 'Matchs de 12 minutes sur terrain complet, 2 terrains en parallèle.'),
    e('interruption', 'Pronostics', 'Le public qui a le mieux pronostiqué la draft gagne un ballon dédicacé.', ['enfants', 'familles']),
    e('temps_fort', 'Mort subite', 'En cas d’égalité : premier panier gagne, lumière concentrée sur le terrain.'),
    e('remise', 'Trophée QUADRA', 'Quatre pièces de trophée assemblées : une par joueur titulaire.'),
    e('apres', 'Fiche "ma draft"', 'Chaque joueur reçoit son rang de draft, ses stats, et une invitation à la prochaine édition.', ['amateurs']),
    e('arrivee', 'PMR', 'Places PMR en bord de terrain côté banc, programme en FALC.', ['pmr']),
  ],
  content: [
    h('Draft en direct', 'tiktok', 'Live / clips des choix et réactions', 5),
    h('Pick surprise', 'instagram', 'Reel réaction du dernier choisi', 4),
    h('Mort subite', 'instagram', 'Clip 10 s', 4),
    h('Récit de la journée', 'youtube', 'Format vlog 8 min', 3),
  ],
  innovationIds: ['inn-draft-live-legendes', 'inn-kings-de-effectif'],
  budgetTier: 'limite',
  expectedSpectators: 250,
  durationHours: 6,
  volunteersNeeded: 12,
  safety: safety({ bar: true }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '4c4', 'draft', 'capitaines', 'equipes_mysteres'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const lignes: Concept = {
  id: 'cpt-lignes-5x5',
  title: 'LIGNES — 5x5 des quartiers',
  pitch:
    'Huit quartiers du Grand Nancy, huit équipes de 10. Chaque équipe joue avec deux « lignes » de 5 qui alternent obligatoirement toutes les 4 minutes, comme au hockey : tout le monde joue autant, le banc devient une stratégie. Matchs de 16 minutes puis score cible (leader + 7). Un classement territorial et des rivalités racontées en vidéo avant l’événement donnent l’enjeu ; une charte fair-play et des médiateurs encadrent la fierté de quartier.',
  identity: {
    name: 'LIGNES',
    tagline: 'Dix joueurs. Un quartier.',
    palette: [NAVY, '#E8743B', '#5B6B8C', '#F7F5F0'],
    motif: 'Lignes parallèles de terrain qui se transforment en plan de ville stylisé.',
    nameChecks: nameChecks('LIGNES'),
  },
  objectives: ['territoire', 'inclusion', 'communaute'],
  audiences: ['jeunes', 'eloignes_pratique', 'familles', 'supporters'],
  venueType: 'complexe_sportif',
  scale: 'locale',
  format: fmt('lignes-5x5', '5x5 à lignes alternées — 2 poules de 4, demi-finales, finale', {
    teamSize: 5,
    rosterSize: 10,
    teams: 8,
    stages: poolsThenBracket('lignes', 2, 2, true),
    match: { teamSize: 5, end: { type: 'elam', minutes: 16, plus: 7 }, shotClockSec: 24, zones: ZONES_5X5, overtime: 'none', mechanics: [], official: false },
    composition: [
      { kind: 'territoire', description: 'Joueurs résidant ou licenciés dans le quartier représenté (justificatif simple).' },
      { kind: 'libre', description: 'Deux lignes de 5 qui alternent toutes les 4 minutes au signal sonore ; une ligne peut être féminine.' },
    ],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Couleurs de quartier', 'Chaque tribune porte la couleur d’un quartier ; écharpes réalisées par des ateliers jeunesse.', ['familles', 'jeunes']),
    e('ouverture', 'Parade des quartiers', 'Les 8 équipes entrent derrière une bannière dessinée par les habitants.'),
    e('presentation', 'Fiche quartier', 'Vidéo de 30 s par quartier tournée en amont (lieux, figures, terrains).'),
    e('jeu', 'Changement de ligne', 'Signal lumineux et sonore toutes les 4 minutes : les 5 sortent, les 5 entrent — moment lisible pour les néophytes.'),
    e('interruption', 'Initiation', 'Atelier "première balle" pour les enfants et les adultes éloignés de la pratique, animé par des éducateurs.', ['enfants', 'eloignes_pratique']),
    e('temps_fort', 'Cible finale', 'Affichage de la cible, public debout.'),
    e('remise', 'Coupe des quartiers', 'Trophée en forme de plan de la métropole, nom du quartier gravé.'),
    e('apres', 'Classement territorial', 'Points cumulés par quartier publiés ; le quartier hôte de la prochaine édition est le dernier du classement (rotation solidaire).'),
    e('arrivee', 'PMR et familles', 'Tribune famille, places PMR, espace calme pour personnes sensibles au bruit.', ['pmr', 'familles']),
  ],
  content: [
    h('Fiches quartiers', 'instagram', 'Série de 8 Reels avant l’événement', 4),
    h('Changements de ligne', 'tiktok', 'Clip timelapse des 10 joueurs', 3),
    h('Finale', 'youtube', 'Résumé 5 min', 3),
    h('Impact social', 'linkedin', 'Post bilan : participants, quartiers, partenaires', 3),
  ],
  innovationIds: ['inn-tournoi-invitation-show', 'inn-hype-man-surnoms', 'inn-terrain-design'],
  budgetTier: 'standard',
  expectedSpectators: 500,
  durationHours: 7,
  volunteersNeeded: 24,
  safety: safety({ minors: true, extraAuth: ['Médiateurs / éducateurs référents par quartier ; charte fair-play signée par chaque équipe'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '5c5', 'lignes', 'classement_territorial', 'rivalites_narratives', 'qpv'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const relais: Concept = {
  id: 'cpt-relais-123',
  title: 'RELAIS 1-2-3 — le match à étages',
  pitch:
    'Un format hybride inédit : chaque rencontre se joue en trois étages avec un score qui se cumule. Étage 1 : 1 contre 1 jusqu’à 7. Étage 2 : 2 contre 2 jusqu’à 14. Étage 3 : 3 contre 3 jusqu’à 21. Le score ne repart jamais de zéro : un retard pris en 1c1 doit être comblé à deux puis à trois. Chaque joueur doit apparaître dans au moins deux étages. Le simulateur modélise la rencontre comme un 3x3 à 21 points (approximation à valider sur le terrain).',
  identity: {
    name: 'RELAIS 1-2-3',
    tagline: 'Un, puis deux, puis trois. Jusqu’au bout.',
    palette: [NAVY, '#E056A0', '#F4C430', '#F7F5F0'],
    motif: 'Trois marches d’escalier formant un "E" fléché.',
    nameChecks: nameChecks('Relais 1-2-3'),
  },
  objectives: ['spectacle', 'communaute', 'detection'],
  audiences: ['passionnes', 'amateurs', 'jeunes', 'etudiants'],
  venueType: 'complexe_sportif',
  scale: 'regionale',
  format: fmt('relais-123', 'Relais 1-2-3 (proxy 3x3 à 21) — poules de 4 puis tableau à 8', {
    teamSize: 3,
    rosterSize: 4,
    teams: 16,
    stages: poolsThenBracket('relais', 4, 2),
    match: rules3x3({ end: { type: 'time_or_target', minutes: 15, points: 21 } }),
    composition: [{ kind: 'libre', description: 'Score cumulé sur 3 étages (1c1 → 7, 2c2 → 14, 3c3 → 21) ; chaque joueur dans au moins 2 étages.' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Escalier d’accueil', 'Signalétique en trois marches ; règle expliquée en 20 secondes par une vidéo en boucle.', ['familles']),
    e('presentation', 'Ordre de passage', 'Les capitaines annoncent publiquement qui joue le 1c1 : premier choix stratégique visible.'),
    e('jeu', 'Changement d’étage', 'À 7 puis à 14, sirène, changement d’effectif, le score reste affiché.'),
    e('interruption', 'Mini-relais enfants', 'Relais de tirs 1-2-3 pour les enfants entre deux matchs.', ['enfants']),
    e('temps_fort', 'Remontada', 'Le speaker met en avant les équipes qui remontent un retard du 1c1.'),
    e('remise', 'Podium à étages', 'Podium en trois marches, médailles en trois couches.'),
    e('apres', 'Stats par étage', 'Chaque équipe reçoit son "profil" (meilleur étage, pire étage) pour progresser.'),
    e('arrivee', 'PMR', 'Places PMR face au terrain central, sanitaires adaptés.', ['pmr']),
  ],
  content: [
    h('Changement d’étage', 'tiktok', 'Clip split-screen 1c1 → 2c2 → 3c3', 5),
    h('Remontada', 'instagram', 'Reel avec graphique de score', 4),
    h('Explication du format', 'youtube', 'Short pédagogique 45 s', 3),
  ],
  innovationIds: ['inn-points-croissants', 'inn-f1-sprint'],
  budgetTier: 'limite',
  expectedSpectators: 300,
  durationHours: 6,
  volunteersNeeded: 14,
  safety: safety({ bar: true }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', 'hybride', '1c1', '2c2', '3c3', 'score_cumule', 'proxy_simulation'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const tribu: Concept = {
  id: 'cpt-tribu-3g',
  title: 'TRIBU 3G — 3x3 intergénérationnel',
  pitch:
    'Une équipe = trois générations : un·e jeune de 11 à 15 ans, un·e adulte de 16 à 44 ans, un·e « sage » de 45 ans et plus (+ un remplaçant libre). Sur le terrain, la tribu doit toujours compter au moins un jeune et un sage. Matchs de 8 minutes ou 15 points, horloge de 14 s, règle de mansuétude à 10 points d’écart pour protéger les plus jeunes. Familles, clubs, entreprises et associations de quartier composent leurs tribus.',
  identity: {
    name: 'TRIBU 3G',
    tagline: 'Trois âges. Un même panier.',
    palette: [NAVY, '#3BA272', '#F26B1D', '#F4C430'],
    motif: 'Trois cercles concentriques (anneaux d’arbre) formant un ballon.',
    nameChecks: nameChecks('TRIBU 3G'),
  },
  objectives: ['inclusion', 'communaute', 'jeunesse'],
  audiences: ['familles', 'enfants', 'amateurs', 'eloignes_pratique', 'entreprises'],
  venueType: 'gymnase',
  scale: 'locale',
  format: fmt('tribu-3g', '3x3 intergénérationnel — poules de 4 puis tableau à 8', {
    teamSize: 3,
    rosterSize: 4,
    teams: 16,
    stages: poolsThenBracket('tribu', 4, 2),
    match: rules3x3({ end: { type: 'time_or_target', minutes: 8, points: 15 }, shotClockSec: 14, mechanics: [{ id: 'mercy_rule', params: { gap: 10 } }] }),
    composition: [{ kind: 'age', description: '1 joueur 11-15 ans, 1 joueur 16-44 ans, 1 joueur 45 ans et plus', constraint: 'Au moins 1 jeune et 1 sage sur le terrain à tout moment' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Arbre des tribus', 'Chaque tribu accroche sa photo sur un grand arbre généalogique du basket.', ['familles']),
    e('ouverture', 'Serment des trois âges', 'Le plus jeune et le plus âgé de la salle lancent le tournoi ensemble.'),
    e('jeu', '3x3 adapté', 'Horloge de 14 s, mansuétude à 10 points : matchs serrés et sans humiliation.'),
    e('interruption', 'Défi des grands-parents', 'Concours de lancers francs à la cuillère (lancer par en dessous) ouvert au public.', ['familles', 'enfants']),
    e('temps_fort', 'Panier du benjamin', 'Le speaker valorise chaque panier des 11-15 ans (jingle dédié).'),
    e('remise', 'Médailles pour tous', 'Médaille pour chaque participant, trophée pour la tribu gagnante et prix "fair-play".'),
    e('apres', 'Goûter des tribus', 'Goûter partagé, photo de tribu imprimée sur place.', ['enfants', 'familles']),
    e('arrivee', 'Accessibilité', 'Places PMR, prêt de sièges pour les seniors, zone calme.', ['pmr']),
  ],
  content: [
    h('Panier du benjamin', 'instagram', 'Reel émotion avec réaction de la tribu', 4),
    h('Portraits de tribus', 'instagram', 'Carrousel 3 générations', 3),
    h('Défi des grands-parents', 'tiktok', 'Clip humoristique', 4),
    h('Bilan intergénérationnel', 'linkedin', 'Post RSE pour entreprises partenaires (tribus d’entreprise)', 3),
  ],
  innovationIds: ['inn-presentation-sportive', 'inn-micro-arbitre-speaker'],
  budgetTier: 'limite',
  expectedSpectators: 250,
  durationHours: 6,
  volunteersNeeded: 14,
  safety: safety({ minors: true }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '3c3', 'intergenerationnel', 'mercy_rule', 'famille'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const rouesLibres: Concept = {
  id: 'cpt-roues-libres',
  title: 'ROUES LIBRES — 3x3 fauteuil pour tous',
  pitch:
    'Tout le monde en fauteuil sportif : joueurs en situation de handicap et joueurs valides dans les mêmes équipes, avec un plafond de points de classification par équipe sur le terrain (principe du basket fauteuil, joueurs valides classés au maximum). Journée 3x3 puis soirée vitrine avec les meilleurs joueurs de la région. Inspiré du premier All Star Game de basket fauteuil de la Fédération Française Handisport (Bobigny, décembre 2025), présenté comme du spectacle à part entière, pas comme une démonstration. Fauteuils prêtés par un club handisport partenaire (à identifier).',
  identity: {
    name: 'ROUES LIBRES',
    tagline: 'Même hauteur, même panier.',
    palette: [NAVY, '#2E86AB', '#C9A227', '#F7F5F0'],
    motif: 'Roue de fauteuil dont les rayons forment les lignes d’un ballon.',
    nameChecks: nameChecks('Roues Libres'),
  },
  objectives: ['inclusion', 'spectacle', 'visibilite_partenaires'],
  audiences: ['pmr', 'familles', 'amateurs', 'eloignes_pratique', 'entreprises'],
  venueType: 'gymnase',
  scale: 'regionale',
  format: fmt('roues-libres', '3x3 fauteuil mixte — 2 poules de 4, demi-finales, finale', {
    teamSize: 3,
    rosterSize: 4,
    teams: 8,
    stages: poolsThenBracket('roues', 2, 2, true),
    match: rules3x3({ end: { type: 'time_or_target', minutes: 8, points: 15 }, shotClockSec: 16, zones: ZONES_FAUTEUIL, mechanics: [{ id: 'mercy_rule', params: { gap: 10 } }] }),
    composition: [{ kind: 'handicap', description: 'Tous les joueurs en fauteuil sportif', constraint: 'Plafond de points de classification par équipe sur le terrain ; joueurs valides classés au maximum' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Accueil universel', 'Parcours entièrement accessible, accueil en langue des signes sur un créneau, boucle magnétique au point d’accueil.', ['pmr', 'familles']),
    e('ouverture', 'Essai pour tous', '30 minutes d’essai de fauteuil ouvert au public avant les matchs.', ['enfants', 'familles', 'eloignes_pratique']),
    e('presentation', 'Classification expliquée', 'Une vidéo de 60 s explique les points de classification ; affichée aussi en FALC.'),
    e('jeu', '3x3 fauteuil', 'Matchs de 8 minutes, commentaires techniques pour comprendre les placements.'),
    e('interruption', 'Défi entreprises', 'Les partenaires s’affrontent en fauteuil sur 3 possessions.', ['entreprises']),
    e('temps_fort', 'Soirée vitrine', 'Match des meilleurs joueurs de la journée, sélectionnés par un jury mixte (public + coachs).'),
    e('remise', 'Trophées', 'Trophées remis par des joueurs en fauteuil ; prix du public.'),
    e('apres', 'Licence découverte', 'Orientation vers les clubs de basket fauteuil de la région (à identifier) pour une séance d’essai.'),
  ],
  content: [
    h('Valide vs fauteuil', 'tiktok', 'Clip "j’ai essayé" avec un joueur valide', 5),
    h('Action spectaculaire', 'instagram', 'Reel ralenti contact / tir en fauteuil', 4),
    h('Portrait joueur', 'youtube', 'Mini-documentaire 4 min', 4),
    h('Engagement inclusion', 'linkedin', 'Post partenaires : défi entreprises', 4),
  ],
  innovationIds: ['inn-asg-fauteuil-inclusif', 'inn-presentation-sportive'],
  budgetTier: 'limite',
  expectedSpectators: 300,
  durationHours: 8,
  volunteersNeeded: 18,
  safety: safety({ runOffM: 3, extraAuth: ['Convention de prêt des fauteuils sportifs + assurance du matériel prêté'], extraAccess: ['Vestiaires et sanitaires adaptés en nombre suffisant pour les joueurs', 'Zone de transfert fauteuil de ville → fauteuil sportif'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', '3c3', 'inclusif', 'handibasket', 'basket_fauteuil'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const salonNouveau: Concept = {
  id: 'cpt-salon-nouveau',
  title: 'SALON NOUVEAU — basket, beat & Art nouveau',
  pitch:
    'Ici, aucun match n’est l’attraction principale. Une soirée-spectacle où le basket rencontre la musique et l’héritage Art nouveau de Nancy : concours de tir « au tempo » (le DJ fixe le rythme, trois spots Bronze/Argent/Or), battles de freestyle ball-handling jugées par un jury et le public, création en direct d’un panneau de basket peint dans l’esprit de l’École de Nancy, crews de danse. La compétition de tir se joue en 4 manches de duels de 2 minutes, classement aux points cumulés.',
  identity: {
    name: 'SALON NOUVEAU',
    tagline: 'Le basket comme un art décoratif.',
    palette: [NAVY, '#C9A227', '#3BA272', '#F7F5F0'],
    motif: 'Arabesques végétales Art nouveau enroulées autour d’un cercle de panier.',
    nameChecks: nameChecks('Salon Nouveau'),
  },
  objectives: ['spectacle', 'communaute', 'visibilite_partenaires', 'revenus'],
  audiences: ['familles', 'jeunes', 'etudiants', 'eloignes_pratique', 'entreprises'],
  venueType: 'espace_temporaire',
  scale: 'regionale',
  format: fmt('salon-nouveau', 'Concours de tir au tempo — course aux points en 4 manches', {
    teamSize: 1,
    rosterSize: 1,
    teams: 12,
    stages: [{ id: 'salon-manches', type: 'points_race', label: 'Manches de tir', rounds: 4, seeding: 'random' }],
    match: { teamSize: 1, end: { type: 'time', minutes: 2 }, shotClockSec: 6, zones: ZONES_SHOW, overtime: 'none', mechanics: [], official: false },
    composition: [{ kind: 'libre', description: 'Concours de tir : la "rencontre" est un duel de 2 minutes côte à côte ; le simulateur l’approxime par un 1c1 chronométré.' }],
  }),
  core: 'show',
  experience: [
    e('arrivee', 'Galerie', 'Entrée par une galerie de panneaux de basket décorés par des étudiants en art (appel à projets).', ['familles', 'etudiants']),
    e('ouverture', 'Ouverture musicale', 'Set d’ouverture, premiers tirs synchronisés au beat.'),
    e('jeu', 'Tir au tempo', 'Duels de tir de 2 minutes : seuls les tirs lâchés dans la fenêtre du beat comptent (validés par un juge).'),
    e('interruption', 'Battles freestyle', 'Battles de ball-handling 1 contre 1 jugées par jury + applaudimètre.', ['jeunes']),
    e('temps_fort', 'Panneau dévoilé', 'Le panneau peint en direct est dévoilé et installé ; premier tir symbolique par un enfant du public.', ['enfants']),
    e('remise', 'Prix des arts', 'Prix du tir, prix du freestyle, prix du public pour la création.'),
    e('apres', 'Vente aux enchères', 'Mise aux enchères caritative des panneaux décorés (règles des ventes caritatives à vérifier).', ['entreprises']),
    e('arrivee', 'Accessibilité', 'Places assises PMR proches de la scène, gilets vibrants / visualisation du rythme sur écran pour les personnes sourdes (si budget).', ['pmr']),
  ],
  content: [
    h('Tir sur le beat', 'tiktok', 'Clip synchronisé musique/tir', 5),
    h('Création du panneau', 'instagram', 'Timelapse 30 s', 5),
    h('Battles', 'tiktok', 'Clips 15 s', 4),
    h('Mécénat culturel', 'linkedin', 'Post partenaires culture + sport', 3),
  ],
  innovationIds: ['inn-show-mi-temps', 'inn-maillot-edition-artiste', 'inn-hybride-basket-echecs'],
  budgetTier: 'standard',
  expectedSpectators: 800,
  durationHours: 5,
  volunteersNeeded: 24,
  safety: safety({ bar: true, extraAuth: ['Si vente aux enchères : vérifier le cadre des ventes caritatives et la fiscalité des recettes'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', 'hors_match', 'concours', 'musique', 'culture', 'art_nouveau', 'proxy_simulation'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const echelle: Concept = {
  id: 'cpt-echelle-est',
  title: 'L’ÉCHELLE DE L’EST — la saison des défis',
  pitch:
    'Une compétition qui vit entre les événements. Les équipes 3x3 s’inscrivent sur une échelle régionale et peuvent défier une équipe classée jusqu’à deux places au-dessus, sur n’importe quel city-stade, pendant une fenêtre d’une semaine. Victoire = échange de places. Résultats validés par les deux capitaines + photo du score, arbitre bénévole tiré au sort pour les défis du top 8. Un « Défi Day » mensuel dans une ville différente du Grand Est ; les 4 premières équipes jouent la finale lors de l’All Star Game Grand Est. Règlement : au plus 1 défi lancé et 1 défi reçu par équipe et par semaine, saison de 10 semaines. Ordre initial de l’échelle établi sur le niveau déclaré et vérifiable (classement Bask’Est, championnat) : simulé « équilibré » sur 10 semaines.',
  identity: {
    name: 'L’Échelle de l’Est',
    tagline: 'Monte. Défie. Tiens ta place.',
    palette: [NAVY, '#F26B1D', '#7FB069', '#F7F5F0'],
    motif: 'Échelle dont les barreaux forment la flèche Est.',
    nameChecks: nameChecks('L’Échelle de l’Est'),
  },
  objectives: ['communaute', 'territoire', 'detection', 'jeunesse'],
  audiences: ['amateurs', 'jeunes', 'etudiants', 'passionnes'],
  venueType: 'city_stade',
  scale: 'regionale',
  propertyId: 'asg-grand-est',
  format: fmt('echelle-est', 'Échelle de défis 3x3 — 10 semaines', {
    teamSize: 3,
    rosterSize: 4,
    teams: 24,
    stages: [{ id: 'echelle', type: 'ladder', label: 'Échelle de la saison (10 semaines)', rounds: 10, seeding: 'rating' }],
    match: rules3x3(),
  }),
  core: 'communautaire',
  experience: [
    e('arrivee', 'Inscription en ligne', 'Inscription d’équipe en 3 minutes, charte fair-play acceptée, photo d’équipe.', ['jeunes']),
    e('ouverture', 'Ouverture de saison', 'Lancement en direct sur les réseaux : tirage de l’ordre initial de l’échelle.'),
    e('jeu', 'Défis', 'Défis joués sur city-stades, score photographié et validé par les deux capitaines.'),
    e('temps_fort', 'Défi Day mensuel', 'Une ville différente chaque mois : défis en série, DJ, initiation pour les enfants du quartier.', ['enfants', 'familles']),
    e('interruption', 'Défi du public', 'Lors des Défi Days, un spectateur peut défier un joueur sur 3 tirs.'),
    e('remise', 'Finale à l’ASG', 'Le top 4 joue la finale en lever de rideau de l’All Star Game Grand Est.'),
    e('apres', 'Classement permanent', 'Classement en ligne, carte d’équipe partageable, historique des défis.'),
    e('arrivee', 'Accessibilité', 'City-stades sélectionnés pour leur accessibilité ; Défi Days avec places PMR et sanitaires adaptés.', ['pmr']),
  ],
  content: [
    h('Défi lancé', 'tiktok', 'Vidéo de défi face caméra (format "call-out")', 5),
    h('Résultats de la semaine', 'instagram', 'Story + post classement hebdomadaire', 4),
    h('Défi Day', 'youtube', 'Résumé mensuel 5 min', 3),
  ],
  innovationIds: ['inn-pass-saison', 'inn-bracket-challenge', 'inn-cartes-joueurs-2k'],
  budgetTier: 'limite',
  expectedSpectators: 150,
  durationHours: 4,
  volunteersNeeded: 8,
  safety: safety({ outdoor: true, publicSpace: true, extraAuth: ['Défis hors événement : rappeler que les défis libres ne sont pas couverts comme une manifestation organisée — vérifier avec l’assureur', 'RGPD : classement d’équipes, information des joueurs, pas de classement public nominatif de mineurs'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['atypique', 'hors_match', 'saison', 'systeme_defis', 'classement_territorial', 'communautaire', 'defis_plafonnes', 'incertitude_voulue'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

// =============================================================================
// B. TROIS CONCEPTS À BUDGET LIMITÉ
// =============================================================================

const cityTour: Concept = {
  id: 'cpt-city-tour-54',
  title: 'CITY TOUR 54 — le roi du city',
  pitch:
    'Un kit d’événement qui tient dans un utilitaire : en une demi-journée sur le city-stade d’un quartier, 12 équipes 3x3 jouent des poules courtes, puis les 6 meilleures se disputent 30 minutes de « roi du terrain » (le vainqueur reste, le perdant retourne dans la file, 1 point par victoire). Gratuit pour le public, inscription à prix symbolique, sono portable, ballons, médailles, eau. Reproductible chaque samedi dans un quartier différent. Pour limiter l’attente propre au format "roi du terrain", la série d’un roi est plafonnée à 3 victoires.',
  identity: {
    name: 'CITY TOUR 54',
    tagline: 'Ton quartier. Ton terrain. Ta couronne.',
    palette: [NAVY, '#F26B1D', '#7B5EA7', '#F7F5F0'],
    motif: 'Couronne en grillage de city-stade.',
    nameChecks: nameChecks('City Tour 54'),
  },
  objectives: ['communaute', 'territoire', 'jeunesse', 'inclusion'],
  audiences: ['jeunes', 'eloignes_pratique', 'familles', 'amateurs'],
  venueType: 'city_stade',
  scale: 'locale',
  format: fmt('city-tour-54', '3x3 — 3 poules de 4 puis roi du terrain (6 équipes, 30 min)', {
    teamSize: 3,
    rosterSize: 4,
    teams: 12,
    stages: [
      { id: 'city-poules', type: 'round_robin', label: 'Poules', groups: 3, qualifiersPerGroup: 2, seeding: 'snake' },
      { id: 'city-roi', type: 'king_of_the_court', label: 'Roi du terrain', kotc: { durationMin: 30, pointsPerWin: 1, streakBonus: 0 } },
    ],
    match: rules3x3({ end: { type: 'time_or_target', minutes: 8, points: 15 } }),
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Installation visible', 'Arche gonflable et sono installées dès 13h ; les enfants du quartier aident à poser les drapeaux.', ['enfants']),
    e('ouverture', 'Mot du quartier', 'Ouverture par un jeune du quartier, règles expliquées en 30 secondes au micro.'),
    e('jeu', 'Poules express', 'Matchs de 8 minutes ou 15 points, tableau des scores sur une ardoise géante.'),
    e('interruption', 'Atelier tir', 'Atelier tir pour les 6-12 ans animé par un bénévole.', ['enfants', 'familles']),
    e('temps_fort', 'Roi du terrain', '30 minutes de "le vainqueur reste" ; chaque roi est annoncé au micro.'),
    e('remise', 'Couronne', 'Couronne en carton doré + médailles pour tous les joueurs.'),
    e('apres', 'Rendez-vous suivant', 'Annonce du prochain quartier, inscription par QR code.'),
    e('arrivee', 'Accessibilité', 'City-stade choisi avec accès de plain-pied ; chaises pour les seniors et les PMR.', ['pmr']),
  ],
  content: [
    h('Couronnement du roi', 'tiktok', 'Clip 15 s avec couronne', 4),
    h('Quartier à l’honneur', 'instagram', 'Reel 30 s du quartier', 3),
    h('Classement du tour', 'instagram', 'Post récapitulatif mensuel', 2),
  ],
  innovationIds: ['inn-parc-urbain', 'inn-lieu-insolite', 'inn-challenge-video'],
  budgetTier: 'micro',
  expectedSpectators: 120,
  durationHours: 4,
  volunteersNeeded: 8,
  safety: safety({ outdoor: true, publicSpace: true, minors: true, runOffM: 1.5 }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['budget_limite', '3c3', 'king_of_the_court', 'qpv', 'reproductible', 'serie_roi_plafonnee'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const veillee: Concept = {
  id: 'cpt-veillee',
  title: 'LA VEILLÉE — tournoi nocturne de gymnase',
  pitch:
    'Un vendredi soir par mois, de 19h à 23h30, un gymnase municipal devient le rendez-vous des 16-25 ans : 12 équipes 3x3 en système suisse (4 matchs garantis pour chaque équipe, adversaires de niveau proche à chaque ronde), playlist collaborative votée par QR code, snacking à petit prix. Coût réduit au minimum : salle mise à disposition, arbitrage par des jeunes formés, récompenses en nature. Un format "prévention par le sport" sans en avoir l’air.',
  identity: {
    name: 'La Veillée',
    tagline: 'Le vendredi, on joue tard.',
    palette: [NAVY, '#4F9DA6', '#F4C430', '#F7F5F0'],
    motif: 'Lampe de veilleur dont la flamme est un ballon.',
    nameChecks: nameChecks('La Veillée'),
  },
  objectives: ['jeunesse', 'communaute', 'inclusion'],
  audiences: ['jeunes', 'etudiants', 'eloignes_pratique', 'amateurs'],
  venueType: 'gymnase',
  scale: 'locale',
  format: fmt('veillee', '3x3 système suisse — 4 rondes', {
    teamSize: 3,
    rosterSize: 4,
    teams: 12,
    stages: [{ id: 'veillee-suisse', type: 'swiss', label: 'Rondes suisses', rounds: 4, seeding: 'random' }],
    match: rules3x3(),
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Accueil', 'Accueil par des jeunes bénévoles, vestiaire sécurisé, eau gratuite.', ['jeunes']),
    e('ouverture', 'Playlist', 'Chaque équipe ajoute un titre à la playlist (modération des paroles).'),
    e('jeu', 'Rondes suisses', 'Après chaque ronde, nouvel appariement affiché : on joue toujours contre une équipe de son niveau.'),
    e('interruption', 'Concours 1 minute', 'Concours de tir d’une minute ouvert à tous (y compris non-inscrits).', ['eloignes_pratique']),
    e('temps_fort', 'Ronde 4', 'Les deux équipes invaincues jouent le dernier match sur le terrain central.'),
    e('remise', 'Récompenses utiles', 'Bons d’achat sport, places de match SLUC (à solliciter), maillots.'),
    e('apres', 'Retour sécurisé', 'Fin à 23h30 avec rappel des transports ; grands frères / médiateurs présents.'),
    e('arrivee', 'Accessibilité', 'Gymnase accessible, places PMR, accueil des familles en début de soirée.', ['pmr', 'familles']),
  ],
  content: [
    h('Ambiance du vendredi', 'tiktok', 'Clip 15 s plan large + playlist', 4),
    h('Invaincus de la soirée', 'instagram', 'Post photo + stats', 3),
    h('Impact jeunesse', 'linkedin', 'Bilan trimestriel pour partenaires et collectivités', 3),
  ],
  innovationIds: ['inn-watch-party', 'inn-cashless-leger'],
  budgetTier: 'limite',
  expectedSpectators: 100,
  durationHours: 4.5,
  volunteersNeeded: 8,
  safety: safety({ extraAuth: ['Horaires tardifs : accord du gestionnaire, présence d’un adulte référent, procédure en cas d’incident'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['budget_limite', '3c3', 'suisse', 'nocturne', 'prevention'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const petitsChardons: Concept = {
  id: 'cpt-petits-chardons',
  title: 'PETITS CHARDONS — 2x2 des écoles',
  pitch:
    'Un festival de mini-basket pour les 9-12 ans sur le plateau sportif d’une école ou un terrain extérieur : 16 équipes de 2 (mixité encouragée : une fille et un garçon, ou deux filles), paniers abaissés, matchs de 6 minutes ou 10 points, règle de mansuétude à 8 points. Chaque enfant joue au moins 3 matchs et repart avec une médaille. Budget minimal : matériel prêté par le comité ou les clubs, goûter, médailles.',
  identity: {
    name: 'Petits Chardons',
    tagline: 'Les grands joueurs commencent petits.',
    palette: [NAVY, '#7B5EA7', '#F4C430', '#F7F5F0'],
    motif: 'Petit chardon souriant en forme de ballon.',
    nameChecks: nameChecks('Petits Chardons'),
  },
  objectives: ['jeunesse', 'inclusion', 'communaute'],
  audiences: ['enfants', 'familles', 'eloignes_pratique'],
  venueType: 'terrain_exterieur',
  scale: 'locale',
  format: fmt('petits-chardons', 'Mini-basket 2x2 — poules de 4 puis tableau à 8', {
    teamSize: 2,
    rosterSize: 3,
    teams: 16,
    stages: poolsThenBracket('petits-chardons', 4, 2),
    match: {
      teamSize: 2,
      end: { type: 'time_or_target', minutes: 6, points: 10 },
      shotClockSec: 15,
      zones: ZONES_MINI,
      overtime: 'sudden_death',
      mechanics: [{ id: 'mercy_rule', params: { gap: 8 } }],
      official: false,
    },
    composition: [
      { kind: 'age', description: '9 à 12 ans (CM1 à 6e)' },
      { kind: 'mixite', description: 'Mixité encouragée : 1 fille + 1 garçon, ou 2 filles' },
    ],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Passeport du petit chardon', 'Chaque enfant reçoit un passeport tamponné à chaque match joué.', ['enfants']),
    e('ouverture', 'Échauffement géant', 'Échauffement en musique avec tous les enfants et les parents.', ['familles']),
    e('jeu', 'Mini-basket', 'Paniers à 2,60 m, ballons taille 5, arbitrage pédagogique par des jeunes arbitres.'),
    e('interruption', 'Parents au panier', 'Défi parents : lancers francs sous les encouragements des enfants.', ['familles']),
    e('temps_fort', 'Finales', 'Finales sous les applaudissements de tous ; speaker qui cite chaque prénom (avec accord).'),
    e('remise', 'Médaille pour tous', 'Médaille identique pour tous + diplôme ; trophée fair-play.'),
    e('apres', 'Goûter et clubs', 'Goûter, stand des clubs locaux pour une séance d’essai gratuite.'),
    e('arrivee', 'Accessibilité', 'Accès PMR au bord du terrain, enfants en situation de handicap intégrés aux équipes (adaptations au cas par cas).', ['pmr']),
  ],
  content: [
    h('Premier panier', 'instagram', 'Reel émotion (enfants avec autorisation d’image des deux parents)', 4),
    h('Bilan festival', 'linkedin', 'Post pour écoles, collectivités, partenaires', 3),
    h('Album photo', 'instagram', 'Album privé partagé aux familles (lien non public)', 2),
  ],
  innovationIds: ['inn-contenu-chaque-match', 'inn-presentation-sportive'],
  budgetTier: 'micro',
  expectedSpectators: 150,
  durationHours: 4,
  volunteersNeeded: 12,
  safety: safety({ minors: true, outdoor: true, runOffM: 1.5, extraAuth: ['Si sur temps ou site scolaire : accord de l’établissement / de l’inspection'] }),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['budget_limite', '2c2', 'mini_basket', 'jeunes', 'mercy_rule', 'mineurs'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

// =============================================================================
// C. TROIS CONCEPTS POUR UN PALAIS DES SPORTS (Jean-Weille)
// =============================================================================

const palaisSafety = (minors = false) =>
  safety({
    bar: true,
    bigCrowd: true,
    minors,
    extraAuth: [
      'Demande d’utilisation à la Métropole du Grand Nancy (gestionnaire présumé) au moins 2 mois avant, configuration de tribunes partielle validée',
      'Calendrier du club résident (Betclic Élite + FIBA Europe Cup 2026-27) : viser fin de saison (mai-juin)',
    ],
  });

const vitrine: Concept = {
  id: 'cpt-vitrine-espoirs',
  title: 'VITRINE — showcase & draft live des espoirs',
  pitch:
    'La journée où les jeunes talents du Grand Est sont vus. Matin dans la salle annexe : « combine » de tests mesurés (détente, vitesse, adresse) pour 40 joueuses et joueurs U18 proposés par leurs clubs. Après-midi : draft en direct sur le parquet central par 4 coachs invités. Soirée : 4 équipes de 10, round-robin en matchs de 16 minutes et finale, temps de jeu minimum garanti pour chaque joueur. Clubs, centres de formation et universités invités en tribune.',
  identity: {
    name: 'VITRINE',
    tagline: 'Être vu. Être choisi.',
    palette: [NAVY, '#C9A227', '#E9EDF5', '#F26B1D'],
    motif: 'Cadre de vitrine Art nouveau autour d’un joueur en silhouette.',
    nameChecks: nameChecks('Vitrine'),
  },
  propertyId: 'asg-grand-est',
  objectives: ['detection', 'jeunesse', 'spectacle', 'visibilite_partenaires'],
  audiences: ['jeunes', 'passionnes', 'familles', 'supporters', 'haut_niveau'],
  venueType: 'palais_des_sports',
  venueId: 'palais-jean-weille',
  scale: 'regionale',
  format: fmt('vitrine', '5x5 — round-robin à 4 puis finale', {
    teamSize: 5,
    rosterSize: 10,
    teams: 4,
    stages: [
      { id: 'vitrine-rr', type: 'round_robin', label: 'Round-robin', groups: 1, qualifiersPerGroup: 2, seeding: 'draft' },
      { id: 'vitrine-finale', type: 'single_elim', label: 'Finale' },
    ],
    match: { teamSize: 5, end: { type: 'time', minutes: 16 }, shotClockSec: 24, zones: ZONES_5X5, overtime: 'sudden_death', mechanics: [], official: false },
    composition: [
      { kind: 'age', description: 'U18 proposés par leurs clubs (une session féminine et une session masculine)' },
      { kind: 'libre', description: 'Temps de jeu minimum garanti par joueur (rotation imposée)' },
    ],
  }),
  core: 'mixte',
  experience: [
    e('arrivee', 'Accueil familles et recruteurs', 'Accueil séparé pour les clubs / recruteurs (accréditation) et pour les familles.', ['familles']),
    e('ouverture', 'Combine en public', 'Tests mesurés en salle annexe, résultats affichés en direct (sans classement public des moins de 15 ans).'),
    e('presentation', 'Draft live', 'Les 4 coachs draftent sur le parquet ; chaque joueur reçoit son maillot des mains de son coach.', ['supporters']),
    e('jeu', 'Matchs vitrine', 'Matchs de 16 minutes, rotations imposées, commentaire avec statistiques à l’écran.'),
    e('interruption', 'Questions aux coachs', 'Mini-interviews des coachs entre les matchs ; ateliers dribble pour les enfants en tribune.', ['enfants']),
    e('temps_fort', 'Finale + MVP', 'Finale puis vote MVP (jury de coachs 70 %, public 30 % via QR du billet).'),
    e('remise', 'Dossier joueur', 'Chaque joueur reçoit son dossier (mesures, vidéo, stats) — transmis aux clubs uniquement avec accord.'),
    e('apres', 'Passerelles', 'Mise en relation avec clubs, centres de formation, universités (avec consentement).'),
    e('arrivee', 'Accessibilité', 'Places PMR en tribune basse, entrée de plain-pied, programme FALC.', ['pmr']),
  ],
  content: [
    h('Combine', 'tiktok', 'Clips de tests (détente, vitesse) — avec autorisation', 4),
    h('Draft', 'instagram', 'Reel réaction du choix', 5),
    h('Highlights joueurs', 'youtube', 'Mixtapes individuelles (accord parental pour les mineurs)', 4),
    h('Passerelles', 'linkedin', 'Post clubs / universités partenaires', 3),
  ],
  innovationIds: ['inn-draft-live-legendes', 'inn-co-streaming', 'inn-cartes-joueurs-2k'],
  budgetTier: 'standard',
  expectedSpectators: 1200,
  durationHours: 10,
  volunteersNeeded: 35,
  safety: palaisSafety(true),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['palais', '5c5', 'detection', 'draft', 'mineurs', 'rgpd_sensible'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const nuitPalais: Concept = {
  id: 'cpt-nuit-palais',
  title: 'NUIT DU PALAIS — 3x3 arena & live',
  pitch:
    'Le Palais des Sports en mode arena pour une nuit : 16 équipes 3x3 (open et féminin), poules sur deux demi-terrains en salle annexe et un demi-terrain sur le parquet central, puis tableau final au centre, sous une production de salle (lumière, écran géant loué, DJ puis groupe live à la mi-temps du tableau). Tribunes partielles (2 500 places), billet familial, village partenaires dans le hall. Objectif : prouver qu’un événement associatif peut produire une soirée de niveau arena.',
  identity: {
    name: 'NUIT DU PALAIS',
    tagline: 'Une nuit. Un palais. Seize équipes.',
    palette: [NAVY, '#C9A227', '#E63946', '#F7F5F0'],
    motif: 'Coupole de palais stylisée dont l’arc est la ligne à 2 points du 3x3.',
    nameChecks: nameChecks('Nuit du Palais'),
  },
  objectives: ['spectacle', 'revenus', 'visibilite_partenaires', 'communaute'],
  audiences: ['familles', 'jeunes', 'supporters', 'entreprises', 'vip', 'passionnes'],
  venueType: 'palais_des_sports',
  venueId: 'palais-jean-weille',
  scale: 'regionale',
  format: fmt('nuit-palais', '3x3 FIBA — poules de 4 puis tableau à 8 (finale au centre)', {
    teamSize: 3,
    rosterSize: 4,
    teams: 16,
    stages: poolsThenBracket('nuit-palais', 4, 2, false),
    match: { ...RULES_FIBA_3X3, official: false },
  }),
  core: 'mixte',
  experience: [
    e('arrivee', 'Hall village', 'Village partenaires et restauration dans le hall, animations enfants, billetterie dématérialisée sans file.', ['familles', 'enfants']),
    e('ouverture', 'Show d’ouverture', 'Noir complet, projection sur le parquet, entrée des 16 équipes.'),
    e('presentation', 'Équipes au centre', 'Chaque équipe présentée 20 s à l’écran géant.'),
    e('jeu', 'Trois terrains', 'Écran qui bascule entre les terrains ; QR code pour suivre tous les scores.'),
    e('interruption', 'Live music', 'Groupe live pendant la pause avant les demi-finales.'),
    e('temps_fort', 'Finales au centre', 'Finales open et féminine sous les projecteurs, tribune famille en face caméra.'),
    e('remise', 'Podium arena', 'Podium au centre, confettis (si autorisés par le gestionnaire), chèques symboliques.'),
    e('apres', 'Contenus', 'Photos et highlights disponibles dès le lendemain ; offre billet pour l’ASG suivant.'),
    e('arrivee', 'Accessibilité', 'Plateformes PMR de la salle, accompagnateur gratuit, espace calme.', ['pmr']),
    e('jeu', 'Expérience VIP', 'Courtside partenaires avec accès zone joueurs encadré.', ['vip', 'entreprises']),
  ],
  content: [
    h('Show d’ouverture', 'tiktok', 'Plan large du noir à la lumière', 5),
    h('Finales', 'youtube', 'Diffusion live des finales', 4),
    h('Coulisses', 'instagram', 'Stories vestiaires / village', 3),
    h('Bilan partenaires', 'linkedin', 'Retombées et chiffres', 3),
  ],
  innovationIds: ['inn-projection-terrain', 'inn-public-lumiere', 'inn-bracelets-zones'],
  budgetTier: 'premium',
  expectedSpectators: 2500,
  durationHours: 7,
  volunteersNeeded: 60,
  safety: palaisSafety(false),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['palais', '3c3', 'arena', 'production', 'musique'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

const estMonde: Concept = {
  id: 'cpt-est-contre-monde',
  title: 'EST CONTRE MONDE — le tri-match',
  pitch:
    'Inspiré du nouveau format du NBA All-Star Game 2026 (trois équipes, matchs de 12 minutes sans quart-temps), adapté au Grand Est : « Lorraine », « Reste du Grand Est » et « Monde » (joueuses et joueurs internationaux évoluant dans les clubs de la région), composées par vote du public et choix des coachs. Round-robin à trois, puis finale entre les deux premières équipes ; mort subite en cas d’égalité. Un tri-match féminin et un tri-match masculin dans la même soirée. Format pensé comme évolution possible de l’All Star Game Grand Est. Note simulation : avec seulement trois équipes, le simulateur classe le format « trop aléatoire » (la meilleure équipe gagne environ 6 fois sur 10) ; c’est assumé pour un All-Star dont les équipes sont composées pour être proches — l’incertitude est le spectacle, l’équité se joue dans la composition (jury + vote plafonné).',
  identity: {
    name: 'EST CONTRE MONDE',
    tagline: 'Trois équipes. Une seule couronne.',
    palette: [NAVY, '#C9A227', '#2E86AB', '#F26B1D'],
    motif: 'Triangle de trois flèches convergeant vers un ballon.',
    nameChecks: nameChecks('Est contre Monde'),
  },
  propertyId: 'asg-grand-est',
  objectives: ['spectacle', 'revenus', 'visibilite_partenaires', 'territoire'],
  audiences: ['supporters', 'passionnes', 'familles', 'entreprises', 'vip', 'femmes'],
  venueType: 'palais_des_sports',
  venueId: 'palais-jean-weille',
  scale: 'regionale',
  format: fmt('est-monde', 'Tri-match 5x5 — round-robin à 3 puis finale', {
    teamSize: 5,
    rosterSize: 10,
    teams: 3,
    stages: [
      { id: 'tri-rr', type: 'round_robin', label: 'Round-robin à 3', groups: 1, qualifiersPerGroup: 2, seeding: 'random' },
      { id: 'tri-finale', type: 'single_elim', label: 'Finale' },
    ],
    match: { teamSize: 5, end: { type: 'time', minutes: 12 }, shotClockSec: 24, zones: ZONES_5X5, overtime: 'sudden_death', mechanics: [], official: false },
    composition: [{ kind: 'territoire', description: 'Lorraine / Reste du Grand Est / Monde (internationaux des clubs du Grand Est) ; un tri-match féminin et un masculin' }],
  }),
  core: 'match',
  experience: [
    e('arrivee', 'Trois tribunes', 'Le public choisit sa tribune (Lorraine, Grand Est, Monde) à l’entrée : écharpe de couleur offerte.', ['familles', 'supporters']),
    e('ouverture', 'Hymnes revisités', 'Trois hymnes courts revisités par un DJ local.'),
    e('presentation', 'Line-ups', 'Présentation des 30 joueurs par équipe, cartes joueurs à l’écran.'),
    e('jeu', 'Matchs de 12 minutes', 'Chrono courant, aucun quart-temps ; enjeu lisible : l’équipe éliminée est annoncée en direct.'),
    e('interruption', 'Concours', 'Concours de tirs et de dunks entre les matchs (format historique de l’ASG conservé).', ['enfants', 'familles']),
    e('temps_fort', 'Mort subite', 'En cas d’égalité : premier panier gagnant, toute la salle debout.'),
    e('remise', 'Couronne de l’Est', 'Trophée tri-face (une face par équipe), MVP élu public + jury.'),
    e('apres', 'Rencontre joueurs', 'Séance de dédicaces encadrée sur le parquet.', ['enfants']),
    e('arrivee', 'Accessibilité', 'Places PMR dans chacune des trois tribunes.', ['pmr']),
  ],
  content: [
    h('Choix de tribune', 'instagram', 'Story sondage avant l’événement', 4),
    h('Mort subite', 'tiktok', 'Clip du panier gagnant', 5),
    h('Match intégral', 'youtube', 'Rediffusion des 4 matchs', 3),
    h('Diversité des talents', 'linkedin', 'Post partenaires : la région et le monde', 3),
  ],
  innovationIds: ['inn-mini-tournoi-3-equipes', 'inn-walkout-entrees', 'inn-pass-partenaire-courtside'],
  budgetTier: 'standard',
  expectedSpectators: 2000,
  durationHours: 6,
  volunteersNeeded: 45,
  safety: palaisSafety(false),
  maturity: 'concept_documente',
  evidence: { ...EVIDENCE },
  tags: ['palais', '5c5', 'evolution_asg', 'tri_match', 'mort_subite', 'incertitude_voulue'],
  createdAt: CREATED,
  version: 1,
  private: true,
};

export const CONCEPTS: Concept[] = [
  // A. Formats atypiques
  chardon,
  mirabelle,
  nocturnes,
  quadra,
  lignes,
  relais,
  tribu,
  rouesLibres,
  salonNouveau,
  echelle,
  // B. Budget limité
  cityTour,
  veillee,
  petitsChardons,
  // C. Palais des sports
  vitrine,
  nuitPalais,
  estMonde,
];

export const CONCEPTS_BY_ID: Record<string, Concept> = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));
