import type { Audience, CompetitionFormat, ContentHook, ExperienceMoment, MatchRules, TeamSize } from '../model';
import { RULES_1V1, RULES_5X5_SHORT, RULES_FIBA_3X3, ZONES_3X3, ZONES_5X5 } from '../simulation/presets';

/** Bibliothèques combinatoires du générateur de concepts. */

export function rulesFor(size: TeamSize): MatchRules {
  switch (size) {
    case 1:
      return { ...RULES_1V1, mechanics: [] };
    case 2:
      return { teamSize: 2, end: { type: 'time_or_target', minutes: 7, points: 15 }, shotClockSec: 12, zones: ZONES_3X3, overtime: 'first_to_2', mechanics: [], official: false };
    case 3:
      return { ...RULES_FIBA_3X3, mechanics: [] };
    case 4:
      return { teamSize: 4, end: { type: 'time', minutes: 12 }, shotClockSec: 18, zones: ZONES_5X5, overtime: 'sudden_death', mechanics: [], official: false };
    case 5:
      return { ...RULES_5X5_SHORT, mechanics: [] };
  }
}

export interface FormatArchetype {
  id: string;
  label: string;
  sizes: TeamSize[];
  build: (size: TeamSize, teams: number) => CompetitionFormat;
  /** Nombre d'équipes conseillé selon l'affluence prévue et la durée. */
  teams: (hours: number, size: TeamSize) => number;
}

const fmt = (id: string, name: string, size: TeamSize, teams: number, stages: CompetitionFormat['stages']): CompetitionFormat => ({
  id,
  name,
  teamSize: size,
  rosterSize: size === 1 ? 1 : size + (size >= 4 ? 3 : 1),
  teams,
  stages,
  match: rulesFor(size),
});

export const ARCHETYPES: FormatArchetype[] = [
  {
    id: 'poules_tableau',
    label: 'Poules puis tableau final',
    sizes: [2, 3, 4],
    teams: (h, s) => (s <= 3 ? Math.min(24, Math.max(8, Math.floor(h * 4) - (Math.floor(h * 4) % 4))) : 8),
    build: (s, n) =>
      fmt('poules_tableau', 'Poules + tableau', s, n, [
        { id: 'poules', type: 'round_robin', label: 'Poules', groups: Math.max(2, Math.floor(n / 4)), qualifiersPerGroup: 2, seeding: 'snake' },
        { id: 'tableau', type: 'single_elim', label: 'Tableau final' },
      ]),
  },
  {
    id: 'kotc',
    label: 'King of the Court (le vainqueur reste)',
    sizes: [1, 2],
    teams: () => 12,
    build: (s, n) =>
      fmt('kotc', 'Règne + finale', s, n, [
        { id: 'regne', type: 'king_of_the_court', label: 'Règne', kotc: { durationMin: 40, pointsPerWin: 1, streakBonus: 1 } },
        { id: 'finale', type: 'single_elim', label: 'Final 4' },
      ]),
  },
  {
    id: 'suisse_final4',
    label: 'Système suisse puis Final Four',
    sizes: [1, 2, 3, 4, 5],
    teams: (_h, s) => (s >= 4 ? 8 : 16),
    build: (s, n) =>
      fmt('suisse_final4', 'Suisse + Final Four', s, n, [
        { id: 'suisse', type: 'swiss', label: 'Rondes suisses', rounds: 4, seeding: 'random' },
        { id: 'final4', type: 'single_elim', label: 'Final Four' },
      ]),
  },
  {
    id: 'double_elim',
    label: 'Double élimination (droit à l’erreur)',
    sizes: [2, 3, 5],
    teams: (_h, s) => (s === 5 ? 6 : 12),
    build: (s, n) => fmt('double_elim', 'Double élimination', s, n, [{ id: 'de', type: 'double_elim', label: 'Double élimination', seeding: 'rating' }]),
  },
  {
    id: 'echelle',
    label: 'Échelle de défis',
    sizes: [1, 2],
    teams: () => 10,
    build: (s, n) =>
      fmt('echelle', 'Échelle + finale', s, n, [
        { id: 'echelle', type: 'ladder', label: 'Échelle de défis', rounds: 3 },
        { id: 'finale', type: 'single_elim', label: 'Finale des 4 premiers' },
      ]),
  },
  {
    id: 'course_points',
    label: 'Course aux points (chaque panier compte)',
    sizes: [2, 3, 4],
    teams: () => 10,
    build: (s, n) =>
      fmt('course_points', 'Course aux points + finale', s, n, [
        { id: 'course', type: 'points_race', label: 'Course aux points', rounds: 4 },
        { id: 'finale', type: 'single_elim', label: 'Final Four' },
      ]),
  },
  {
    id: 'showcase',
    label: 'Mini-tournoi showcase (3-4 équipes)',
    sizes: [4, 5],
    teams: () => 4,
    build: (s, n) => fmt('showcase', 'Mini-tournoi showcase', s, n, [{ id: 'show', type: 'single_elim', label: 'Demi-finales et finale', thirdPlace: true }]),
  },
];

/** Fin de match spectaculaire (score cible type Elam) — inspirée de TBT / NBA. */
export function withElam(r: MatchRules, plus = 7): MatchRules {
  const minutes = r.end.type === 'target' ? 8 : 'minutes' in r.end ? Math.max(4, r.end.minutes - 2) : 8;
  return { ...r, end: { type: 'elam', minutes, plus } };
}

export const EXPERIENCE_LIBRARY: (ExperienceMoment & { cost: 0 | 1 | 2 | 3 })[] = [
  { phase: 'arrivee', label: 'Allée des clubs', description: 'Haie de maillots des clubs du Grand Est à l’entrée ; chaque club présent a son drapeau.', cost: 0 },
  { phase: 'arrivee', label: 'Bracel’Est', description: 'Bracelet coloré par quartier / ville d’origine : le public devient une carte vivante du territoire.', cost: 1 },
  { phase: 'arrivee', label: 'Check-in sans attente', description: 'QR code unique (billet + vote + jeu concours), portes ouvertes 60 min avant.', cost: 1 },
  { phase: 'ouverture', label: 'Ouverture lumière + DJ', description: 'Noir salle, lumière sur le terrain, mix DJ de 5 min, compte à rebours écran.', cost: 2 },
  { phase: 'ouverture', label: 'Hymne du quartier', description: 'Un artiste local (rap, beatbox, fanfare) ouvre l’événement.', cost: 1 },
  { phase: 'presentation', label: 'Walkout individuel', description: 'Chaque joueur entre sur la musique de son choix, annonce speaker + carte joueur à l’écran (codes des sports de combat).', cost: 1 },
  { phase: 'presentation', label: 'Draft en direct', description: 'Les capitaines choisissent leurs coéquipiers sur scène, le public vote le dernier choix.', cost: 0 },
  { phase: 'jeu', label: 'Speaker pédagogue', description: 'Le speaker explique chaque règle spéciale au moment où elle s’active ; règles affichées en 3 pictos.', cost: 0, audience: ['familles', 'enfants'] },
  { phase: 'jeu', label: 'Score sur écran + réseaux', description: 'Score live et classement projetés, QR code vers le direct.', cost: 1 },
  { phase: 'jeu', label: 'Audiodescription / sous-titrage', description: 'Commentaire audio dans une zone dédiée et sous-titrage des annonces à l’écran.', cost: 1, audience: ['pmr'] },
  { phase: 'interruption', label: 'Tir du public', description: 'Un spectateur tiré au sort tente un tir depuis le logo : lot partenaire à la clé.', cost: 0, audience: ['familles', 'supporters'] },
  { phase: 'interruption', label: 'Mini-basket sur le parquet', description: 'Les enfants des écoles de basket jouent 3 min pendant les pauses.', cost: 0, audience: ['enfants', 'familles'] },
  { phase: 'interruption', label: 'Battle danse / freestyle', description: 'Danseurs ou freestylers ballon pendant les temps morts.', cost: 1 },
  { phase: 'temps_fort', label: 'Money Time', description: 'Dernière minute à points doublés annoncée par un signal lumière/son.', cost: 0 },
  { phase: 'temps_fort', label: 'Concours de dunk / tir', description: 'Concours notés par un jury mixte (anciens joueurs + public via QR).', cost: 1 },
  { phase: 'remise', label: 'Trophée Art nouveau', description: 'Trophée conçu avec un artisan / école d’art du territoire (verre, métal), remis par un partenaire et un jeune du club.', cost: 2 },
  { phase: 'remise', label: 'MVP du public', description: 'Vote QR des spectateurs, résultat affiché en direct (vote plafonné, en salle uniquement).', cost: 0 },
  { phase: 'apres', label: 'Meet & greet', description: '20 min de rencontre joueurs / enfants, photos et dédicaces.', cost: 0, audience: ['enfants', 'familles'] },
  { phase: 'apres', label: 'Carte souvenir numérique', description: 'Chaque participant reçoit sa carte de performance + highlight sous 48 h.', cost: 1 },
  { phase: 'apres', label: 'Afterwork partenaires', description: 'Espace partenaires / entreprises avec les joueurs après la finale.', cost: 1, audience: ['entreprises', 'vip'] },
];

export const CONTENT_LIBRARY: ContentHook[] = [
  { moment: 'Walkout des joueurs', platform: 'tiktok', format: 'Reel 15 s : entrée + nom + stat', viralPotential: 4 },
  { moment: 'Tir décisif / buzzer', platform: 'instagram', format: 'Reel ralenti + réaction du banc', viralPotential: 5 },
  { moment: 'Dunks', platform: 'tiktok', format: 'Compilation multi-angles', viralPotential: 5 },
  { moment: 'Réactions du public', platform: 'instagram', format: 'Story / carrousel tribunes', viralPotential: 3 },
  { moment: 'Draft en direct', platform: 'youtube', format: 'Vidéo longue « Draft Night »', viralPotential: 3 },
  { moment: 'Cartes joueurs', platform: 'instagram', format: 'Carrousel cartes de performance partageables', viralPotential: 4 },
  { moment: 'Coulisses bénévoles', platform: 'linkedin', format: 'Post « derrière l’événement » + chiffres d’impact', viralPotential: 2 },
  { moment: 'Bilan partenaires', platform: 'linkedin', format: 'Étude de cas partenaire (portée, activation)', viralPotential: 2 },
  { moment: 'Interview vainqueurs', platform: 'youtube', format: 'Short 60 s', viralPotential: 3 },
  { moment: 'Challenge public', platform: 'tiktok', format: 'Challenge reproductible (#BaskEstChallenge)', viralPotential: 4 },
  { moment: 'Mini-documentaire', platform: 'youtube', format: 'Doc 8-12 min « Une saison Bask’Est »', viralPotential: 3 },
];

export const NAME_PARTS = {
  roots: ['Stan', 'Chardon', 'Mirabelle', 'Lorraine', 'Gentilly', 'Grand Est', 'Meurthe', 'Est', 'Moselle', 'Pépinière'],
  heads: ['Clash', 'Run', 'Court', 'Duel', 'Royale', 'Series', 'Jam', 'Session', 'Crown', 'Rumble', 'Throne', 'Block'],
  taglines: [
    'Qui s’y frotte s’y pique.',
    'Le basket de l’Est, version show.',
    'Joue pour ton quartier.',
    'Un terrain, une couronne.',
    'Ici, chaque panier compte.',
    'Le parquet appartient à ceux qui osent.',
  ],
  /** Complément « de … » correctement accordé pour chaque racine. */
  of: {
    Stan: 'de Stan',
    Chardon: 'du Chardon',
    Mirabelle: 'de la Mirabelle',
    Lorraine: 'de Lorraine',
    Gentilly: 'de Gentilly',
    'Grand Est': 'du Grand Est',
    Meurthe: 'de la Meurthe',
    Est: 'de l’Est',
    Moselle: 'de la Moselle',
    Pépinière: 'de la Pépinière',
  } as Record<string, string>,
  motifs: ['chardon stylisé', 'arabesques Art nouveau', 'croix de Lorraine géométrique', 'grille de la place Stanislas', 'flèche Est'],
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
  enfants: 'Enfants',
  familles: 'Familles',
  passionnes: 'Passionnés',
  supporters: 'Supporters',
  entreprises: 'Entreprises',
  vip: 'VIP',
  pmr: 'Personnes en situation de handicap',
  jeunes: 'Jeunes',
  femmes: 'Femmes',
  etudiants: 'Étudiants',
  amateurs: 'Joueurs amateurs',
  haut_niveau: 'Haut niveau',
  eloignes_pratique: 'Publics éloignés de la pratique',
};
