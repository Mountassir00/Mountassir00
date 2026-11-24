/**
 * BASK'EST LAB — Modèle de données central.
 *
 * Toutes les entités du système sont définies ici. Les moteurs (simulation,
 * programmation, finance, salles, notation, génération, blueprint) ne
 * manipulent que ces types : c'est le contrat commun entre modules, UI,
 * base de données (voir db/schema.sql) et intégrations externes.
 *
 * Convention : chaque donnée factuelle importée de l'extérieur porte une
 * `Provenance` (vérifiée / estimée / hypothèse) pour ne jamais confondre
 * un fait et une supposition.
 */

// ---------------------------------------------------------------------------
// Transverse
// ---------------------------------------------------------------------------

export type ID = string;
export type ISODate = string; // 2026-11-24
export type ISODateTime = string; // 2026-11-24T14:30:00

export type Confidence = 'verifie' | 'probable' | 'estimation' | 'hypothese' | 'non_trouve';

export interface Provenance {
  confidence: Confidence;
  source?: string; // URL ou référence interne
  accessedAt?: ISODate;
  note?: string;
}

/** Statut de chaque fonctionnalité de l'outil (exigence §23). */
export type FeatureStatus = 'operationnel' | 'prototype' | 'integration';

export interface Range {
  min: number;
  max: number;
}

// ---------------------------------------------------------------------------
// Organisation, marque mère et propriétés événementielles
// ---------------------------------------------------------------------------

export interface BrandSystem {
  motherBrand: string; // Bask'Est
  /** Signature commune obligatoire sur toutes les propriétés ("by Bask'Est"). */
  endorsement: string;
  palette: Record<string, string>;
  typography: { display: string; text: string; mono?: string };
  /** Éléments graphiques invariants (ex. la "flèche Est", le chardon). */
  invariants: string[];
}

export interface EventProperty {
  id: ID;
  name: string; // "All Star Game Grand Est"
  shortName: string;
  tagline?: string;
  kind: 'competition' | 'spectacle' | 'communautaire' | 'inclusif' | 'jeunesse' | 'hybride';
  brand: Partial<BrandSystem> & { accent: string; motif?: string };
  status: 'existant' | 'concept' | 'archive';
  maturity: MaturityLevel;
  editions: ID[];
  description: string;
}

// ---------------------------------------------------------------------------
// Éditions réelles (base documentaire historique — exigence §8)
// ---------------------------------------------------------------------------

export interface MoneyLine {
  label: string;
  amount: number; // € TTC sauf mention
  provenance?: Provenance;
}

export interface Edition {
  id: ID;
  propertyId: ID;
  number: number;
  date?: ISODate;
  venueId?: ID;
  budgetPlanned?: number;
  revenues: MoneyLine[];
  expenses: MoneyLine[];
  participants?: number;
  attendance?: number;
  ticketsSold?: number;
  ticketPrices?: { label: string; price: number }[];
  partners: { name: string; tier?: string; contribution?: number; inKind?: boolean }[];
  volunteers?: number;
  programme?: string[];
  sportResults?: { label: string; winner: string; score?: string }[];
  digital?: Partial<DigitalKpis>;
  feedback?: { source: string; nps?: number; satisfaction?: number; verbatims?: string[] };
  incidents: IncidentRecord[];
  equipment?: string[];
  /** Ce qui est connu vs à fournir par l'association. */
  dataCompleteness: Record<string, Provenance>;
}

export interface DigitalKpis {
  followersGained: number;
  reach: number;
  views: number;
  engagementRate: number; // 0..1
  ugcPosts: number;
  topContentViews: number;
}

export interface IncidentRecord {
  at?: ISODateTime;
  category: ErrorCategory;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  resolution?: string;
}

// ---------------------------------------------------------------------------
// Formats et mécaniques sportives (exigences §6 et §7)
// ---------------------------------------------------------------------------

export type TeamSize = 1 | 2 | 3 | 4 | 5;

export interface ShotZone {
  id: string; // 'inside' | 'mid' | 'long' | 'logo' | 'power'
  label: string;
  points: number;
  /** Probabilité de base de réussite à niveau égal (0..1). */
  baseMake: number;
}

export interface MatchRules {
  teamSize: TeamSize;
  /** Fin du match : temps, score cible, Elam, ou premier des deux. */
  end:
    | { type: 'time'; minutes: number }
    | { type: 'target'; points: number; maxMinutes?: number }
    | { type: 'elam'; minutes: number; plus: number }
    | { type: 'time_or_target'; minutes: number; points: number };
  shotClockSec: number;
  zones: ShotZone[];
  freeThrowPoints?: number;
  overtime?: 'sudden_death' | 'first_to_2' | 'none';
  /** Mécaniques actives pendant le match (ids de la bibliothèque). */
  mechanics: MechanicInstance[];
  /** Officiel ou non : conditionne les dérogations possibles aux règles FIBA/FFBB. */
  official: boolean;
}

export type StageType =
  | 'round_robin'
  | 'single_elim'
  | 'double_elim'
  | 'swiss'
  | 'king_of_the_court'
  | 'ladder'
  | 'points_race';

export interface StageSpec {
  id: string;
  type: StageType;
  label: string;
  groups?: number; // poules
  qualifiersPerGroup?: number;
  rounds?: number; // swiss / points race
  seeding?: 'rating' | 'random' | 'snake' | 'draft';
  /** King of the Court : durée du "règne" et points par victoire. */
  kotc?: { durationMin: number; pointsPerWin: number; streakBonus?: number };
  thirdPlace?: boolean;
  /** Nombre de qualifiés pour la phase suivante (suisse, échelle, KOTC, course aux points). Défaut : 4. */
  advance?: number;
}

export interface CompetitionFormat {
  id: ID;
  name: string;
  teamSize: TeamSize;
  rosterSize: number;
  teams: number;
  stages: StageSpec[];
  match: MatchRules;
  /** Matchs à effectifs mixtes, intergénérationnels, inclusifs… */
  composition?: CompositionRule[];
  /** Tableaux parallèles au format identique (ex. féminin / masculin) : `teams` s'entend PAR tableau. */
  divisions?: { id: string; label: string }[];
}

export interface CompositionRule {
  kind: 'mixite' | 'age' | 'handicap' | 'niveau' | 'territoire' | 'libre';
  description: string;
  constraint?: string; // ex. "au moins 1 joueuse sur le terrain"
}

export type MechanicCategory =
  | 'selection' // draft, capitaines, équipes mystères
  | 'structure' // divisions, barrages, promotion/relégation, double élimination
  | 'scoring' // points bonus, zones, objectifs intermédiaires
  | 'temps' // matchs chronométrés, phases spéciales
  | 'narration' // rivalités, saison, classement territorial
  | 'public'; // interaction avec le public

export interface MechanicParam {
  key: string;
  label: string;
  type: 'number' | 'boolean' | 'select';
  default: number | boolean | string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface Mechanic {
  id: string;
  name: string;
  category: MechanicCategory;
  description: string;
  params: MechanicParam[];
  /** Effet attendu sur les indicateurs (−1..+1) pour la notation. */
  effects: Partial<Record<'spectacle' | 'equite' | 'lisibilite' | 'joueur' | 'media' | 'cout', number>>;
  risks: string[];
  incompatibleWith?: string[];
  /** Simulable par le moteur (sinon évaluation qualitative uniquement). */
  simulated: boolean;
  officialCompatible: boolean;
  inspiration?: string;
}

export interface MechanicInstance {
  id: string;
  params?: Record<string, number | boolean | string>;
}

// ---------------------------------------------------------------------------
// Simulation (exigence §7)
// ---------------------------------------------------------------------------

export interface SimTeam {
  id: ID;
  name: string;
  /** Force relative (Elo-like). 1500 = moyenne. */
  rating: number;
  /** Profil de tir : poids par zone (normalisés par le moteur). */
  strategy?: Record<string, number>;
}

export interface FairnessReport {
  runs: number;
  pBestWins: number; // probabilité que la meilleure équipe gagne
  pTop4Wins: number;
  kendallTau: number; // corrélation classement final / force réelle (−1..1)
  upsetRate: number; // % matchs gagnés par l'équipe la moins forte
  closeGameRate: number; // % matchs à écart ≤ seuil
  avgMatchMinutes: number;
  p95MatchMinutes: number;
  gamesPerTeam: { min: number; max: number; avg: number };
  dominantStrategies: { strategy: string; winRateVsBalanced: number }[];
  manipulationRisks: string[];
  unfairSituations: string[];
  verdict: 'equilibre' | 'trop_aleatoire' | 'trop_previsible' | 'desequilibre';
  notes: string[];
}

// ---------------------------------------------------------------------------
// Salles et infrastructures (exigence §9)
// ---------------------------------------------------------------------------

export type VenueType =
  | 'terrain_exterieur'
  | 'city_stade'
  | 'gymnase'
  | 'complexe_sportif'
  | 'palais_des_sports'
  | 'arena'
  | 'place_publique'
  | 'centre_commercial'
  | 'campus'
  | 'espace_temporaire';

export interface Venue {
  id: ID;
  name: string;
  type: VenueType;
  city: string;
  /** Surface exploitable au sol (m). */
  floor: { length: number; width: number; provenance: Provenance };
  courts: { full: number; half: number };
  baskets: number;
  fixedSeats: number;
  seatsProvenance?: Provenance;
  authorizedGauge?: number;
  lockerRooms: number;
  accesses: { label: string; widthM: number; pmr: boolean }[];
  indoor: boolean;
  av: { scoreboard: boolean; giantScreen: boolean; sound: boolean; lightingShow: boolean; wifi: boolean };
  partnerSpacesM2?: number;
  /** Espaces annexes (salle annexe, hall, esplanade) utilisables pour les zones. */
  spaces?: VenueSpace[];
  constraints: string[];
  notes?: string;
  sources?: Provenance[];
}

export interface VenueSpace {
  id: string;
  name: string;
  kind: 'annexe' | 'hall' | 'exterieur' | 'coursive';
  length: number;
  width: number;
  provenance: Provenance;
}

export type ZoneType =
  | 'terrain'
  | 'tribune'
  | 'tribune_mobile'
  | 'echauffement'
  | 'joueurs'
  | 'benevoles'
  | 'village_partenaires'
  | 'restauration'
  | 'vip'
  | 'contenu'
  | 'medias'
  | 'animation'
  | 'accueil'
  | 'secours'
  | 'regie'
  | 'stockage'
  | 'circulation';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutZone extends Rect {
  id: string;
  type: ZoneType;
  label: string;
  capacity?: number;
  spaceId: string;
  /** Surface demandée vs obtenue (m²). */
  requestedM2?: number;
}

export interface LayoutSpace extends Rect {
  id: string;
  name: string;
  kind: 'principal' | VenueSpace['kind'];
}

export interface Layout {
  venueId: ID;
  variant: string;
  floor: { length: number; width: number };
  spaces: LayoutSpace[];
  canvas: { width: number; height: number };
  zones: LayoutZone[];
  flows: { from: [number, number]; to: [number, number]; kind: 'entree' | 'sortie' | 'joueurs' | 'secours' }[];
  capacity: { seated: number; standing: number; total: number; pmrPlacesRequired: number };
  egress: { requiredExits: number; availableExits: number; requiredUP: number; availableUP: number };
  warnings: string[];
  unplaced: string[];
}

// ---------------------------------------------------------------------------
// Programmation sportive (exigence §10)
// ---------------------------------------------------------------------------

export interface Court {
  id: ID;
  name: string;
  /** Minutes depuis l'ouverture pendant lesquelles le terrain est utilisable. */
  availability: { from: number; to: number }[];
  showCourt?: boolean;
}

export interface Official {
  id: ID;
  name: string;
  role: 'arbitre' | 'table' | 'speaker';
  availability: { from: number; to: number }[];
  /** Équipe à laquelle il est lié (ne peut pas l'arbitrer). */
  affiliatedTeamId?: ID;
  maxConsecutive?: number;
}

export interface FixedBlock {
  id: string;
  label: string;
  kind: 'ceremonie' | 'animation' | 'sponsor' | 'pause' | 'concours';
  start: number;
  duration: number;
  courtId?: ID; // bloque ce terrain
}

export interface ScheduledMatch {
  id: ID;
  stageId: string;
  round: number;
  label: string;
  home?: ID; // undefined tant que dépendance non résolue
  away?: ID;
  homeFrom?: string; // "W:M12" vainqueur du match 12, "1:A" premier poule A
  awayFrom?: string;
  courtId?: ID;
  start?: number; // minutes depuis ouverture
  duration: number;
  officials: ID[];
  status: 'planifie' | 'en_cours' | 'termine' | 'forfait' | 'annule';
}

export interface ScheduleConflict {
  kind:
    | 'equipe_double'
    | 'repos_insuffisant'
    | 'arbitre_double'
    | 'arbitre_partial'
    | 'terrain_indisponible'
    | 'hors_horaires'
    | 'non_planifie'
    | 'attente_excessive';
  matchIds: ID[];
  message: string;
  severity: 'bloquant' | 'alerte';
}

export interface Schedule {
  matches: ScheduledMatch[];
  blocks: FixedBlock[];
  conflicts: ScheduleConflict[];
  endsAt: number;
  stats: { maxWait: number; minRest: number; courtUtilization: number; avgRest: number };
  version: number;
}

export type Disruption =
  | { kind: 'retard'; courtId: ID; from: number; minutes: number }
  | { kind: 'terrain_indisponible'; courtId: ID; from: number; to: number }
  | { kind: 'absence_equipe'; teamId: ID }
  | { kind: 'absence_officiel'; officialId: ID; from: number };

// ---------------------------------------------------------------------------
// Économie (exigence §16)
// ---------------------------------------------------------------------------

export type CostCategory =
  | 'infrastructure'
  | 'fluides'
  | 'assurance'
  | 'securite'
  | 'secours'
  | 'arbitrage'
  | 'materiel'
  | 'communication'
  | 'restauration'
  | 'recompenses'
  | 'cash_prize'
  | 'transport'
  | 'hebergement'
  | 'audiovisuel'
  | 'personnel'
  | 'prestataires'
  | 'imprevus';

export type RevenueStream =
  | 'billetterie'
  | 'inscriptions'
  | 'sponsoring'
  | 'mecenat'
  | 'subventions'
  | 'restauration'
  | 'merchandising'
  | 'hospitalites'
  | 'loges'
  | 'experiences_premium'
  | 'activations'
  | 'licences'
  | 'dons'
  | 'apports'
  | 'emprunts';

/** Nature comptable : à ne jamais confondre (exigence §16). */
export type RevenueNature = 'commerciale' | 'don' | 'subvention' | 'apport' | 'emprunt';

/** Quand la ligne est payée/encaissée, en jours relatifs à J (négatif = avant). */
export interface PaymentTiming {
  day: number;
  share: number; // 0..1
}

export interface CostLine {
  id: string;
  category: CostCategory;
  label: string;
  /** fixe = indépendant du public ; variable = par spectateur ou par participant. */
  basis: 'fixe' | 'par_spectateur' | 'par_participant' | 'par_equipe';
  unitCost: number;
  quantity: number;
  inKind?: boolean; // apport en nature (valorisé, non décaissé)
  timing: PaymentTiming[];
  note?: string;
}

export interface RevenueLine {
  id: string;
  stream: RevenueStream;
  nature: RevenueNature;
  label: string;
  basis: 'fixe' | 'par_spectateur' | 'par_spectateur_payant' | 'par_participant' | 'par_equipe';
  unitAmount: number;
  quantity: number;
  /** Probabilité d'obtention (sponsor non signé, subvention non votée…). */
  probability: number;
  secured: boolean;
  timing: PaymentTiming[];
  note?: string;
}

export interface BudgetAssumptions {
  spectators: number;
  participants: number;
  teams: number;
  paidShare: number; // part des spectateurs payants
}

export interface Budget {
  id: ID;
  label: string;
  assumptions: BudgetAssumptions;
  costs: CostLine[];
  revenues: RevenueLine[];
  contingencyRate: number;
}

export interface ScenarioResult {
  name: 'prudent' | 'realiste' | 'ambitieux';
  assumptions: BudgetAssumptions;
  totalCosts: number;
  cashCosts: number;
  inKindValue: number;
  totalRevenues: number;
  revenuesByNature: Record<RevenueNature, number>;
  result: number;
  margin: number;
  breakEvenSpectators: number | null;
  cashflow: { day: number; balance: number }[];
  minCash: number;
  minCashDay: number;
  dependency: { subsidyShare: number; topSponsorShare: number; securedShare: number };
  alerts: string[];
}

// ---------------------------------------------------------------------------
// Observatoire des erreurs et règles de conception (exigence §5)
// ---------------------------------------------------------------------------

export type ErrorCategory =
  | 'reglement_incomprehensible'
  | 'temps_morts'
  | 'organisation_matchs'
  | 'retards'
  | 'manque_ambiance'
  | 'inscription'
  | 'files_attente'
  | 'visibilite'
  | 'restauration'
  | 'tarification'
  | 'recompenses'
  | 'communication'
  | 'engagement_public'
  | 'audiovisuel'
  | 'benevoles'
  | 'professionnalisme'
  | 'surdimensionnement'
  | 'sponsoring'
  | 'accessibilite'
  | 'securite';

export interface ErrorCase {
  id: string;
  category: ErrorCategory;
  title: string;
  observed: string; // incident observé (factuel ou pattern documenté)
  source: Provenance;
  causes: string[];
  consequences: string[];
  prevention: string[];
  ruleIds: string[];
}

export type RuleOutcome = 'ok' | 'alerte' | 'bloquant' | 'non_evaluable';

export interface RuleResult {
  ruleId: string;
  label: string;
  category: ErrorCategory;
  outcome: RuleOutcome;
  message: string;
  fix?: string;
}

// ---------------------------------------------------------------------------
// Veille et innovations (exigences §3 et §4)
// ---------------------------------------------------------------------------

export type Sector =
  | 'basketball'
  | 'f1'
  | 'football'
  | 'kings_league'
  | 'combat'
  | 'tennis'
  | 'rugby'
  | 'olympisme'
  | 'esport'
  | 'jeu_video'
  | 'festival'
  | 'television'
  | 'concert'
  | 'immersif'
  | 'mode'
  | 'luxe';

export interface Innovation {
  id: string;
  title: string;
  sector: Sector;
  origin: string; // organisation / événement d'origine
  howItWorks: string;
  valueAdded: string;
  basketballAdaptation: string;
  cost: { tier: 'tres_faible' | 'faible' | 'moyen' | 'eleve'; range: Range; note?: string };
  resources: string[];
  limits: string[];
  risks: string[];
  mediaPotential: 1 | 2 | 3 | 4 | 5;
  applicableTo: ID[]; // propriétés Bask'Est
  immediate: boolean; // applicable dès la prochaine édition
  provenance: Provenance;
}

export interface WatchSource {
  id: string;
  name: string;
  url: string;
  kind: 'officiel' | 'media' | 'reseau_social' | 'newsletter' | 'base_de_donnees' | 'communaute';
  topics: string[];
  frequency: 'quotidienne' | 'hebdomadaire' | 'mensuelle';
  reliability: 1 | 2 | 3 | 4 | 5;
}

export interface WatchItem {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  publishedAt: ISODate;
  summary: string;
  sector: Sector;
  tags: string[];
  relevance: number; // 0..1, calculé
  status: 'nouveau' | 'qualifie' | 'transpose' | 'ecarte';
}

// ---------------------------------------------------------------------------
// Concepts, notation, maturité (exigences §6, §21)
// ---------------------------------------------------------------------------

export type MaturityLevel =
  | 'idee'
  | 'concept_documente'
  | 'concept_en_simulation'
  | 'prototype'
  | 'evenement_pilote'
  | 'format_valide'
  | 'format_reproductible'
  | 'format_exportable';

export type Audience =
  | 'enfants'
  | 'familles'
  | 'passionnes'
  | 'supporters'
  | 'entreprises'
  | 'vip'
  | 'pmr'
  | 'jeunes'
  | 'femmes'
  | 'etudiants'
  | 'amateurs'
  | 'haut_niveau'
  | 'eloignes_pratique';

export type Objective =
  | 'spectacle'
  | 'inclusion'
  | 'jeunesse'
  | 'detection'
  | 'communaute'
  | 'revenus'
  | 'visibilite_partenaires'
  | 'territoire';

export interface ExperienceMoment {
  phase: 'arrivee' | 'ouverture' | 'presentation' | 'jeu' | 'interruption' | 'temps_fort' | 'remise' | 'apres';
  label: string;
  description: string;
  audience?: Audience[];
}

export interface ContentHook {
  moment: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin';
  format: string;
  viralPotential: 1 | 2 | 3 | 4 | 5;
}

export interface ConceptIdentity {
  name: string;
  tagline: string;
  palette: string[];
  motif: string;
  nameChecks: string[]; // vérifications PI à mener (INPI, EUIPO, réseaux, domaine)
}

export interface Concept {
  id: ID;
  propertyId?: ID; // rattachement à une propriété existante
  title: string;
  pitch: string;
  identity: ConceptIdentity;
  objectives: Objective[];
  audiences: Audience[];
  venueType: VenueType;
  venueId?: ID;
  scale: 'locale' | 'regionale' | 'nationale';
  format: CompetitionFormat;
  /** Activité centrale : un concept peut ne pas reposer sur un match (§6). */
  core: 'match' | 'concours' | 'show' | 'communautaire' | 'mixte';
  experience: ExperienceMoment[];
  content: ContentHook[];
  innovationIds: string[];
  budgetTier: 'micro' | 'limite' | 'standard' | 'premium';
  expectedSpectators: number;
  durationHours: number;
  volunteersNeeded: number;
  safety: SafetyPlan;
  maturity: MaturityLevel;
  evidence: MaturityEvidence;
  tags: string[];
  createdAt: ISODateTime;
  version: number;
  private: boolean; // privé tant que non publié volontairement (§20)
  /** Paramètres opérationnels (générés par défaut, ajustables). */
  ops?: Partial<OpsPlan>;
}

/** Paramètres opérationnels vérifiés par les règles de conception (R01-R26). */
export interface OpsPlan {
  commsStartDay: number; // J-x (négatif)
  registrationOnline: boolean;
  registrationCloseDays: number; // clôture J-x
  checkInMinutesPerTeam: number;
  entryPoints: number;
  entryThroughputPerMin: number; // personnes / min / point de contrôle
  speaker: boolean;
  dj: boolean;
  screens: boolean;
  interactionsPerHour: number;
  captationPlan: boolean;
  runOfShow: boolean;
  volunteerShiftHours: number;
  sponsorActivations: number;
  pricingGrid: boolean;
  rewards: string[];
  weatherPlan: string | null;
  foodPoints: number;
  slotMinutes: number;
  minRestMinutes: number;
  courts: number;
  officials: number;
  registrationFee: number;
  ticketPrice: number;
  cashPrize: number;
  partners: number;
  vipGuests: number;
  /** Heure d'ouverture "HH:MM" du programme. */
  opening?: string;
  /** Séquences fixes supplémentaires (concours, shows, matchs exhibition…). */
  extraBlocks?: FixedBlock[];
}

export interface SafetyPlan {
  dps: boolean; // dispositif prévisionnel de secours prévu
  insurance: boolean; // RC organisateur
  authorizations: string[];
  minorsImageConsent: boolean | 'na';
  accessibility: string[];
  runOffM: number; // zone de dégagement autour des terrains
}

export interface MaturityEvidence {
  documented: boolean;
  simulationRuns: number;
  prototypeSessions: number; // tests terrain à petite échelle
  pilotEditions: number; // éditions réelles auditées
  editionsMeetingTargets: number;
  replications: number; // éditions par une autre équipe / un autre site
  otherTerritories: number;
}

export type CriterionKey =
  | 'innovation_sportive'
  | 'experience_spectateur'
  | 'experience_joueur'
  | 'faisabilite'
  | 'rentabilite'
  | 'potentiel_mediatique'
  | 'reproductibilite'
  | 'coherence_baskest'
  | 'impact_territorial';

export type GateStatus = 'conforme' | 'a_verifier' | 'non_conforme';

export interface Evaluation {
  conceptId: ID;
  criteria: { key: CriterionKey; label: string; max: number; points: number; reasons: string[] }[];
  total: number;
  gates: { safety: GateStatus; fairness: GateStatus; compliance: GateStatus; details: string[] };
  eligible: boolean;
  grade: 'A' | 'B' | 'C' | 'D';
  maturity: MaturityLevel;
  nextMaturitySteps: string[];
  overrides?: { key: CriterionKey; points: number; by: string; reason: string }[];
}

// ---------------------------------------------------------------------------
// Projets, versions, notifications, collaboration (exigences §19, §20)
// ---------------------------------------------------------------------------

export interface Project {
  id: ID;
  conceptId: ID;
  name: string;
  stage: 'conception' | 'validation' | 'production' | 'exploitation' | 'bilan';
  owner: string;
  eventDate?: ISODate;
  tasks: ProjectTask[];
  versions: VersionEntry[];
  visibility: 'prive' | 'equipe' | 'publie';
}

export interface ProjectTask {
  id: ID;
  title: string;
  due: number; // J-x (négatif)
  owner: string;
  done: boolean;
  deliverable?: string;
  kpi?: string;
}

export interface VersionEntry {
  version: number;
  at: ISODateTime;
  author: string;
  summary: string;
}

export interface Notification {
  id: ID;
  at: ISODateTime;
  level: 'info' | 'alerte' | 'action';
  message: string;
  link?: string;
  read: boolean;
}

/** Toute action sensible passe par une demande d'approbation (§20). */
export interface ApprovalRequest {
  id: ID;
  action: 'publication' | 'depense' | 'commande' | 'reservation' | 'modification_operationnelle';
  payload: unknown;
  requestedBy: string;
  requiredRole: 'president' | 'tresorier' | 'bureau' | 'responsable_evenement';
  status: 'en_attente' | 'approuve' | 'refuse';
}

// ---------------------------------------------------------------------------
// Post-événement (exigence §22)
// ---------------------------------------------------------------------------

export interface PostEventTargets {
  attendance: number;
  result: number; // résultat financier
  satisfaction: number; // /10
  engagement: number; // vues ou interactions
  sportQuality: number; // /10
  maxWaitMin: number;
  incidents: number;
  partnerSatisfaction: number; // /10
  volunteerHours: number;
  organisationQuality: number; // /10
}

export type PostEventActuals = PostEventTargets;

export interface AuditLine {
  key: keyof PostEventTargets;
  label: string;
  target: number;
  actual: number;
  gapPct: number;
  status: 'atteint' | 'proche' | 'manque';
  higherIsBetter: boolean;
}
