import type { Concept } from '../core/model';
import type { BlueprintExtras } from '../core/blueprint/types';

/**
 * PREMIER BASK'EST EVENT BLUEPRINT — All Star Game Grand Est, édition 2 (2027).
 *
 * Point de départ RÉEL : 1re édition le samedi 13 juin 2026, 18h-minuit,
 * Palais des Sports Jean-Weille (sources publiques, docs/research/R1).
 * Les chiffres de l'édition 2026 (affluence, budget, recettes) ne sont pas
 * publics : les objectifs ci-dessous sont des HYPOTHÈSES à recaler dès que
 * l'association fournit ses données (module « Analyse post-événement »).
 */

export const ASG_2027: Concept = {
  id: 'asg-grand-est-2027',
  propertyId: 'asg-grand-est',
  title: 'All Star Game Grand Est 2027',
  pitch:
    'La nuit des étoiles du basket de l’Est, version 2 : deux tableaux à parité (féminin et masculin) de 4 équipes de All-Stars N1-N3 draftées en direct, demi-finales et finales au score cible (chaque match se termine sur un panier), concours à 3 points mixte, dunk contest par équipes, finale « Road to ASG » qui qualifie les champions de la Bask’Cup et de l’Échelle de l’Est, et un public qui décide de la zone bonus. Même lieu, même créneau 18h-minuit et même ADN que l’édition 2026 — avec un format plus lisible, plus d’enjeu et une saison qui y mène.',
  identity: {
    name: 'All Star Game Grand Est',
    tagline: 'Les étoiles de l’Est.',
    palette: ['#0B1A33', '#C9A227', '#F26B1D', '#F7F5F0'],
    motif: 'grille de la place Stanislas',
    nameChecks: [
      'Recherche d’antériorité INPI sur « All Star Game Grand Est » (un événement homonyme a existé à Metz vers 2019) — envisager un signe distinctif déposable (ex. logo + « by Bask’Est »)',
      '« All-Star » est un terme d’usage courant : la protection portera sur l’ensemble (nom + logo), pas sur le mot seul',
      'Disponibilité des comptes @asggrandest / équivalents sur Instagram, TikTok, YouTube',
      'Nom de domaine dédié ou sous-page du site Bask’Est',
    ],
  },
  objectives: ['spectacle', 'detection', 'communaute', 'visibilite_partenaires', 'territoire'],
  audiences: ['familles', 'enfants', 'passionnes', 'supporters', 'entreprises', 'vip', 'femmes', 'jeunes', 'pmr'],
  venueType: 'palais_des_sports',
  venueId: 'palais-jean-weille',
  scale: 'regionale',
  format: {
    id: 'asg-2027-format',
    name: 'Mini-tournoi All-Star à 4 équipes, deux tableaux',
    teamSize: 5,
    rosterSize: 8,
    teams: 4,
    divisions: [
      { id: 'F', label: 'Féminin' },
      { id: 'H', label: 'Masculin' },
    ],
    stages: [{ id: 'allstar', type: 'single_elim', label: 'Demi-finales et finale', seeding: 'draft' }],
    match: {
      teamSize: 5,
      end: { type: 'elam', minutes: 10, plus: 9 },
      shotClockSec: 24,
      zones: [
        { id: 'inside', label: 'Raquette (2 pts)', points: 2, baseMake: 0.55 },
        { id: 'mid', label: 'Mi-distance (2 pts)', points: 2, baseMake: 0.4 },
        { id: 'long', label: 'Tir à 3 pts', points: 3, baseMake: 0.34 },
      ],
      overtime: 'none',
      mechanics: [{ id: 'public_zone_bonus', params: { everySeconds: 240 } }],
      official: false,
    },
    composition: [
      { kind: 'mixite', description: 'Parité des tableaux', constraint: 'Tableau féminin et tableau masculin au même format, sur la même scène, en alternance aux heures de grande écoute' },
      { kind: 'niveau', description: 'All-Stars sélectionnés', constraint: 'Joueuses et joueurs de N1 à N3 / Régionale élite du Grand Est, sélection par un comité + 2 places par vote du public + 1 place « Road to ASG »' },
    ],
  },
  core: 'mixte',
  experience: [
    { phase: 'arrivee', label: 'Allée des clubs', description: 'Haie de maillots des clubs du Grand Est à l’entrée ; chaque club présent a son drapeau. Bracelets colorés par département.' },
    { phase: 'arrivee', label: 'Check-in sans attente', description: 'Billet QR (contrôle + vote + jeu concours), portes à 17h, tram T2 conseillé.' },
    { phase: 'ouverture', label: 'Ouverture lumière + DJ', description: 'Noir salle, compte à rebours écran, mix DJ 5 min, hymne par un artiste nancéien.' },
    { phase: 'presentation', label: 'Walkout des Étoiles', description: 'Chaque All-Star entre sur sa musique, annonce speaker + carte joueur à l’écran ; révélation de la draft.' },
    { phase: 'jeu', label: 'Speaker pédagogue + règles à l’écran', description: 'Les deux règles spéciales (score cible, zone du public) expliquées en 3 pictos avant chaque match.', audience: ['familles', 'enfants'] },
    { phase: 'jeu', label: 'Zone du public', description: 'Toutes les 4 minutes, le public vote (QR, en salle uniquement) la zone qui compte double pendant 60 s.' },
    { phase: 'jeu', label: 'Audiodescription et sous-titrage', description: 'Zone avec commentaire audio, annonces sous-titrées à l’écran, places PMR en bord de parquet.', audience: ['pmr'] },
    { phase: 'interruption', label: 'Skills challenge des écoles de basket', description: '10 minutes de parcours pour les U9-U11 des clubs partenaires.', audience: ['enfants', 'familles'] },
    { phase: 'interruption', label: 'Tir du public', description: 'Un spectateur tiré au sort tente un tir du rond central : lot partenaire.' },
    { phase: 'temps_fort', label: 'Dunk contest par équipes', description: 'Trois duos de dunkeurs, jury mixte (anciens joueurs + vote public plafonné).' },
    { phase: 'temps_fort', label: 'Finale « Road to ASG »', description: '3x3 de 15 min entre le champion de la Bask’Cup et le leader de l’Échelle de l’Est : la saison Bask’Est trouve son sommet.' },
    { phase: 'remise', label: 'Trophée Art nouveau', description: 'Trophée verre et métal réalisé avec un artisan / une école d’art de Nancy ; MVP du public ; prix du fair-play.' },
    { phase: 'apres', label: 'Meet & greet', description: '20 minutes de photos et dédicaces avec les enfants.', audience: ['enfants', 'familles'] },
    { phase: 'apres', label: 'Carte souvenir numérique', description: 'Chaque All-Star reçoit sa carte de performance et son highlight sous 48 h.' },
    { phase: 'apres', label: 'Afterwork partenaires', description: 'Espace partenaires avec les joueurs après les finales.', audience: ['entreprises', 'vip'] },
  ],
  content: [
    { moment: 'Walkout des Étoiles', platform: 'tiktok', format: 'Reel 15 s par joueur (32 contenus)', viralPotential: 4 },
    { moment: 'Dunk contest', platform: 'instagram', format: 'Reel multi-angles + ralenti', viralPotential: 5 },
    { moment: 'Panier de la victoire (score cible)', platform: 'instagram', format: 'Reel buzzer + réaction tribune', viralPotential: 5 },
    { moment: 'Draft révélée', platform: 'youtube', format: 'Vidéo « Draft Night » 6 min', viralPotential: 3 },
    { moment: 'Cartes joueurs', platform: 'instagram', format: 'Carrousel cartes de performance partageables', viralPotential: 4 },
    { moment: 'Road to ASG', platform: 'youtube', format: 'Mini-série « La route vers les étoiles » (4 épisodes)', viralPotential: 3 },
    { moment: 'Bilan partenaires', platform: 'linkedin', format: 'Étude de cas chiffrée par partenaire', viralPotential: 2 },
  ],
  innovationIds: ['inn-elam-score-cible', 'inn-draft-live-legendes', 'inn-walkout-entrees', 'inn-dunk-mania-equipes', 'inn-feminin-prime-time', 'inn-cartes-joueurs-2k'],
  budgetTier: 'standard',
  expectedSpectators: 1500,
  durationHours: 6,
  volunteersNeeded: 40,
  safety: {
    dps: true,
    insurance: true,
    authorizations: [
      'Convention de mise à disposition du Palais des Sports Jean-Weille (gestionnaire : Métropole du Grand Nancy — à confirmer)',
      'Déclaration en mairie si effectif > 1 500 personnes (au moins 1 mois avant)',
      'Agents de sécurité privée habilités pour les palpations (> 300 spectateurs)',
      'Débit de boissons temporaire / buvette selon les règles applicables aux enceintes sportives',
      'Déclaration SACEM (DJ, musiques de walkout)',
      'Autorisations parentales pour les enfants du skills challenge (participation + image)',
    ],
    minorsImageConsent: true,
    accessibility: [
      'Places PMR en bord de parquet et accompagnement à la demande',
      'Parcours sans marche jusqu’aux tribunes et sanitaires accessibles',
      'Annonces sous-titrées sur écran et zone d’audiodescription',
      'Zone calme (hypersensibilité sensorielle) pendant les séquences lumière/son',
    ],
    runOffM: 2,
  },
  maturity: 'evenement_pilote',
  evidence: { documented: true, simulationRuns: 0, prototypeSessions: 1, pilotEditions: 1, editionsMeetingTargets: 0, replications: 0, otherTerritories: 0 },
  tags: ['flagship', 'palais', 'passerelle', 'blueprint'],
  createdAt: '2026-11-24T00:00:00',
  version: 2,
  private: true,
  ops: {
    opening: '18:00',
    courts: 1,
    officials: 4,
    slotMinutes: 30,
    minRestMinutes: 20,
    ticketPrice: 10,
    registrationFee: 0,
    cashPrize: 0,
    partners: 8,
    vipGuests: 60,
    entryPoints: 3,
    screens: true,
    foodPoints: 4,
    sponsorActivations: 9,
    interactionsPerHour: 4,
    extraBlocks: [
      { id: 'walkout', label: 'Walkout des Étoiles + révélation de la draft', kind: 'ceremonie', start: 20, duration: 15, courtId: 'C1' },
      { id: 'skills', label: 'Skills challenge des écoles de basket', kind: 'animation', start: 95, duration: 10, courtId: 'C1' },
      { id: 'trois-points', label: 'Concours à 3 points mixte', kind: 'concours', start: 165, duration: 25, courtId: 'C1' },
      { id: 'show', label: 'Show mi-temps (DJ, danse, tir du public)', kind: 'sponsor', start: 190, duration: 15, courtId: 'C1' },
      { id: 'road', label: 'Finale « Road to ASG » 3x3 (Bask’Cup vs Échelle de l’Est)', kind: 'concours', start: 205, duration: 15, courtId: 'C1' },
      { id: 'dunk', label: 'Dunk contest par équipes', kind: 'concours', start: 220, duration: 25, courtId: 'C1' },
    ],
  },
};

export const ASG_2027_EXTRAS: BlueprintExtras = {
  edition: 'Édition 2 — 2027',
  date: 'Samedi 12 juin 2027, 18h-minuit (proposition)',
  dateISO: '2027-06-12',
  city: 'Nancy',
  venueLabel: 'Palais des Sports Jean-Weille, Nancy-Gentilly',
  organiser: 'Association Bask’Est (SIREN 940 128 069), Nancy',
  overrides: {
    resume: {
      mode: 'prepend',
      blocks: [
        {
          kind: 'p',
          text: 'Le 13 juin 2026, Bask’Est a organisé la première édition de l’All Star Game Grand Est au Palais des Sports Jean-Weille. L’édition 2 a un objectif simple : transformer un premier succès d’estime en rendez-vous annuel installé, rentable et reproductible — le sommet d’une saison Bask’Est (Bask’Cup, Échelle de l’Est, formats de quartier) plutôt qu’un événement isolé.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          text: 'Les données de l’édition 2026 (affluence, recettes, dépenses, partenaires, retours) ne sont pas publiques : les objectifs et budgets de ce dossier sont des hypothèses à recaler dès que l’association les saisit dans BASK’EST LAB.',
        },
      ],
    },
    marche: {
      mode: 'prepend',
      blocks: [
        {
          kind: 'table',
          head: ['Fait', 'Source', 'Fiabilité'],
          rows: [
            ['Édition 1 : samedi 13 juin 2026, 18h-minuit, Palais des Sports Jean-Weille, billetterie Billetweb', 'billetweb.fr', 'vérifié'],
            ['Programme 2026 : joueuses et joueurs N2/N3, matchs féminin et masculin, concours de tirs et de dunks, DJ', 'RCN Radio (source unique)', 'probable'],
            ['Palais des Sports Jean-Weille : ≈ 6 000 places, accès tram T2', 'sports.gouv.fr, Wikipédia', 'vérifié'],
            ['Collecte HelloAsso de la Bask’Cup : 130 € sur 5 000 € au moment du relevé', 'helloasso.com', 'probable (instantané)'],
            ['All Star Game Alsace 2026 (Gries) : billets observés 5-15 €, pass VIP 50 €', 'recherche', 'probable'],
            ['LNB All-Star Game : prochaine édition le 2 janvier 2027 (Paris)', 'benchmark R2', 'vérifié'],
          ],
        },
      ],
    },
    concurrence: {
      mode: 'append',
      blocks: [
        {
          kind: 'callout',
          tone: 'warn',
          text: 'Risque calendrier : juin = période de playoffs Betclic Élite. Si le SLUC Nancy joue les playoffs, le Palais peut être indisponible. Négocier une date de repli (fin mai / fin juin) dès la demande de mise à disposition.',
        },
      ],
    },
    croissance: {
      mode: 'prepend',
      blocks: [
        {
          kind: 'table',
          head: ['Saison', 'Ce qui mène à l’ASG'],
          rows: [
            ['Septembre-mars', 'L’Échelle de l’Est (défis 3x3 sur les city-stades) + vote du public pour 2 places All-Star'],
            ['Avril-mai', 'Bask’Cup : le champion gagne sa place en finale « Road to ASG »'],
            ['Juin', 'All Star Game Grand Est : sommet de la saison'],
            ['Juillet-août', 'City Tour 54 dans les quartiers (formats courts, gratuits)'],
          ],
        },
      ],
    },
  },
};
