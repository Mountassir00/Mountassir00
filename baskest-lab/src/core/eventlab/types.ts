// EVENT LAB — types dérivés des schémas JSON (event-lab/schemas/*.json).
// Les champs requis par un schéma sont requis ici ; tout le reste est facultatif, comme dans les fichiers.
// Les moteurs acceptent des configurations partielles (`Config`) : c'est le comportement du moteur d'origine,
// qui tolère l'absence de sections (pas de programme, pas de compétition…).

export type ScenarioKey = 'prudent' | 'central' | 'ambitieux';
export type ScenarioNumber = Record<ScenarioKey, number>;

export type Direction = 'accessible' | 'optimise' | 'premium' | 'experimental' | 'hybride' | 'communautaire';

export type BlockType =
  | 'regles'
  | 'qualification'
  | 'recompenses'
  | 'mise_en_scene'
  | 'interaction_public'
  | 'mecanique_jeu'
  | 'experience_digitale'
  | 'scenographie'
  | 'son_lumiere'
  | 'monetisation'
  | 'fidelisation'
  | 'activation_partenaire'
  | 'creation_contenu';

export type SectorFamily =
  | 'sport'
  | 'esport'
  | 'musique_festival'
  | 'spectacle'
  | 'tv_media'
  | 'parc_loisirs'
  | 'exposition_immersive'
  | 'mode_luxe'
  | 'salon_pro'
  | 'activation_marque'
  | 'cinema'
  | 'jeu'
  | 'communautaire'
  | 'universitaire'
  | 'tourisme'
  | 'autre';

export type Reliability = 'A' | 'B' | 'C' | 'D';
export type Tech = 'aucune' | 'sono' | 'ecran' | 'chronometrage' | 'app_web' | 'streaming' | 'eclairage_scenique' | 'capteurs' | 'casques_audio' | 'billetterie_en_ligne';

// ---------------------------------------------------------------- evaluation.schema.json
export type EvidenceLevel = 'donnees_reelles' | 'benchmark_source' | 'jugement_expert';
export type CriterionKey =
  | 'originalite'
  | 'experience_utilisateur'
  | 'faisabilite_technique'
  | 'viabilite_economique'
  | 'potentiel_mediatique'
  | 'reproductibilite'
  | 'adaptabilite_lieux'
  | 'accessibilite_inclusion'
  | 'potentiel_commercial'
  | 'responsabilite_environnementale';

export interface Rating {
  rating: number;
  justification?: string;
  evidence?: EvidenceLevel;
  improvements?: string[];
}
export type Ratings = Record<CriterionKey, Rating>;

export type GateStatus = 'ok' | 'a_verifier' | 'bloquant';
export type GateKey = 'securite' | 'conformite_reglementaire' | 'risques_critiques';
export interface Gate {
  status: GateStatus;
  notes?: string;
}
export type Verdict = 'eligible' | 'sous_reserve' | 'elimine';

export interface Evaluation {
  type: 'previsionnelle' | 'reelle';
  date?: string;
  ratings: Ratings;
  gates?: Partial<Record<GateKey, Gate>>;
  computed?: {
    score?: number;
    grade?: 'A' | 'B' | 'C' | 'D';
    confidence?: number;
    verdict?: Verdict;
    gains?: Record<string, number>;
    score_if_plus_one?: number;
  };
}

// ---------------------------------------------------------------- venue.schema.json
export type SpaceType =
  | 'aire_de_jeu'
  | 'tribune'
  | 'accueil'
  | 'file_attente'
  | 'restauration'
  | 'vip'
  | 'vestiaire'
  | 'sanitaire'
  | 'stockage'
  | 'regie'
  | 'media'
  | 'activation_sponsor'
  | 'secours'
  | 'zone_photo'
  | 'circulation'
  | 'autre';

export interface VenueSpace {
  id: string;
  type: SpaceType;
  label?: string;
  width_m?: number;
  length_m?: number;
  area_m2?: number;
  x_m?: number;
  y_m?: number;
  capacity?: number | null;
  fixed?: boolean;
  standing?: boolean;
  accessible_pmr?: boolean;
}

export interface Venue {
  id: string;
  name: string;
  type?: string;
  city?: string;
  country?: string;
  setting: 'interieur' | 'exterieur' | 'mixte';
  erp?: { type_erp?: string; categorie?: number | null; effectif_autorise?: number | null; document_ref?: string };
  dimensions?: { width_m?: number; length_m?: number; height_m?: number };
  spaces?: VenueSpace[];
  access_points?: { id?: string; kind?: 'entree_public' | 'sortie_secours' | 'acces_technique' | 'acces_pmr' | 'acces_secours'; width_m?: number; unites_de_passage?: number; x_m?: number; y_m?: number }[];
  utilities?: Record<string, number | string | null | undefined>;
  constraints?: Record<string, unknown>;
  [extra: string]: unknown;
}

// ---------------------------------------------------------------- event-config.schema.json
export interface Source {
  id: string;
  title: string;
  publisher?: string;
  url?: string;
  published_at?: string;
  accessed_at?: string;
  reliability?: Reliability;
  [extra: string]: unknown;
}

export interface ProgramItem {
  id: string;
  label: string;
  kind: 'montage' | 'accueil' | 'competition' | 'show' | 'ceremonie' | 'pause' | 'animation' | 'demontage' | 'media';
  start_min: number;
  duration_min: number;
  space?: string;
  depends_on?: string[];
  owner_role?: string;
  cues?: string[];
  critical?: boolean;
  stage_ref?: string;
  speakers?: string[];
}

export type StageType = 'time_trial' | 'round_robin' | 'single_elimination' | 'double_elimination' | 'swiss' | 'battle_royale' | 'custom';
export interface Stage {
  id: string;
  label?: string;
  type: StageType;
  entrants: number;
  groups?: number;
  slot_duration_min: number;
  changeover_min?: number;
  parallel_units: number;
  advance?: number;
  runs_per_entrant?: number;
  rounds?: number;
  rest_min?: number;
  third_place?: boolean;
  grand_final_reset?: boolean;
  tiers?: { label?: string; slots: number; units_open?: number }[];
}

export interface StaffLine {
  role: string;
  count: number;
  status?: 'salarie' | 'prestataire' | 'benevole' | 'partenaire';
  hours?: number;
  cost_per_hour?: number;
  ratio_note?: string;
}
export type EquipmentSource = 'possede' | 'lieu' | 'location' | 'achat' | 'pret_partenaire' | 'sponsor';
export interface EquipmentLine {
  item: string;
  qty: number;
  source?: EquipmentSource;
  unit_cost?: number;
  power_w?: number;
  notes?: string;
  on_generator?: boolean;
}

export type ExpenseBasis = 'fixed' | 'per_attendee' | 'per_participant';
export type RevenueBasis = 'fixed' | 'per_paying_attendee' | 'per_attendee' | 'per_participant';
export type Basis = ExpenseBasis | RevenueBasis;
export type ExpenseCertainty = 'devis' | 'estimation' | 'hypothese';
export type RevenueCertainty = 'secured' | 'probable' | 'hypothetical';
export type RevenueStream = 'billetterie' | 'inscriptions' | 'sponsoring' | 'subvention' | 'restauration' | 'merchandising' | 'premium' | 'digital' | 'licence' | 'autre';

export interface Expense {
  id: string;
  category: string;
  label: string;
  amount: number;
  basis: ExpenseBasis;
  certainty?: ExpenseCertainty;
  optional?: boolean;
  priority?: number;
  pay_offset_days?: number;
  source_ref?: string;
  commit_offset_days?: number;
  actual_amount?: number | null;
}

export interface Revenue {
  id: string;
  stream: RevenueStream;
  label: string;
  unit_amount: number;
  basis: RevenueBasis;
  margin_rate?: number;
  certainty: RevenueCertainty;
  cash_offset_days?: number;
  actual_amount?: number | null;
  source_ref?: string;
}

export interface Budget {
  currency?: string;
  contingency_rate?: number;
  expenses: Expense[];
  revenues: Revenue[];
}

export interface ScenarioParams {
  realization?: Partial<Record<RevenueCertainty, number>>;
  cost_overrun?: number;
}

export interface Risk {
  id: string;
  category: 'securite' | 'reglementaire' | 'operationnel' | 'financier' | 'meteo' | 'technique' | 'reputationnel' | 'juridique' | 'sante' | 'environnement';
  description: string;
  probability: number;
  impact: number;
  critical?: boolean;
  warning_signs?: string[];
  prevention?: string[];
  continuity_plan?: string;
  owner_role?: string;
  status?: 'ouvert' | 'traite' | 'accepte';
  source_ref?: string;
}

export interface ComplianceItem {
  id: string;
  item: string;
  authority?: string;
  mandatory: boolean;
  status: 'a_verifier' | 'en_cours' | 'conforme' | 'non_conforme' | 'non_applicable';
  deadline_offset_days?: number;
  source_ref?: string;
  owner_role?: string;
  evidence_ref?: string;
}

export interface Kpi {
  id: string;
  label: string;
  target: number | string;
  phase?: 'avant' | 'pendant' | 'apres';
  unit?: string;
  measure?: string;
  actual?: number | string | null;
  source_ref?: string;
}

export interface Variant {
  id: string;
  label: string;
  description?: string;
  kind?: 'economique' | 'standard' | 'premium' | 'capacite_max' | 'secours' | 'autre';
  expense_overrides?: Record<string, number | null>;
  expense_additions?: Expense[];
  revenue_overrides?: Record<string, number | null>;
  revenue_additions?: Revenue[];
  audience_overrides?: Partial<Audience>;
  /** Hors schéma déclaré, utilisé par LA GRILLE (variante de secours) et par le moteur. */
  participants_overrides?: Partial<Participants>;
  venue_overrides?: Partial<Venue>;
  program_overrides?: ProgramItem[];
  /** Hors schéma déclaré : étapes de compétition de remplacement. */
  competition_overrides?: Stage[];
}

export interface Milestone {
  offset_days: number;
  label: string;
  owner_role?: string;
  deliverable?: string;
  go_no_go?: string;
  id?: string;
  status?: 'a_faire' | 'en_cours' | 'fait' | 'bloque';
  depends_on?: string[];
}

export interface HistoryEntry {
  version: string;
  date: string;
  author?: string;
  summary: string;
  decisions?: string[];
  approved_by?: string | null;
}

export interface Audience {
  attendance: ScenarioNumber;
  paying_share?: number;
  arrival_profile?: { from_min: number; to_min: number; share: number }[];
  avg_dwell_min?: number;
  entry_lanes?: number;
  doors_open_min?: number;
}

export interface Participants {
  unit?: 'individu' | 'equipe';
  count: ScenarioNumber;
  team_size?: number;
  categories?: string[];
}

export interface BuildingBlockRef {
  block_id?: string;
  type: BlockType;
  label: string;
  parameters?: Record<string, unknown>;
}

export interface Identity {
  name: string;
  tagline: string;
  pitch?: string;
  disciplines: string[];
  sectors?: string[];
  directions: Direction[];
  objectives?: string[];
  audiences?: { segment: string; role: string; motivation?: string; willingness_to_pay?: string | null }[];
  inspirations?: { source_event: string; source_sector?: string; borrowed_logic: string; adaptation: string; source_ref?: string; not_borrowed?: string }[];
}

export type ConfigStatus = 'draft' | 'review' | 'validated' | 'archived';
export type ParentRelation = 'new_version' | 'clone' | 'city_adaptation' | 'venue_adaptation';

export interface EventConfig {
  id: string;
  version: string;
  status: ConfigStatus;
  maturity?: 'concept' | 'blueprint' | 'executed';
  parent?: { id: string; version: string; relation: ParentRelation } | null;
  identity: Identity;
  format: { summary: string; rules_summary?: string; duration_hours?: number; edition_cadence?: string; building_blocks: BuildingBlockRef[] };
  participants?: Participants;
  audience?: Audience;
  venue_requirements?: Record<string, unknown>;
  venue?: Venue;
  program?: ProgramItem[];
  competition?: { stages: Stage[] };
  resources?: { staff: StaffLine[]; equipment: EquipmentLine[] };
  budget?: Budget;
  scenarios?: Partial<Record<ScenarioKey, ScenarioParams>>;
  risks?: Risk[];
  compliance?: ComplianceItem[];
  kpis?: Kpi[];
  media?: { viral_moments?: string[]; photo_spots?: string[]; channels?: string[] };
  gamification?: { mechanic?: string; target_role?: string; description?: string; fairness_note?: string }[];
  evaluation: Evaluation;
  hypotheses?: string[];
  sources?: Source[];
  history?: HistoryEntry[];
  variants?: Variant[];
  milestones?: Milestone[];
  sponsor_packages?: { id: string; name: string; price: number; quantity: number; revenue_ref?: string | null; exclusivity?: string; counterparts?: string[] }[];
  active_variant?: string;
  event_date?: string | null;
  generation?: { brief?: Record<string, unknown>; seed?: number; engine_version?: string };
  post_event?: Record<string, unknown>;
  evaluations_history?: Evaluation[];
  organizer?: { type?: string; name?: string | null; city?: string | null };
  confidentiality?: 'prive' | 'partenaires' | 'public';
  /** Pré-note du générateur (hors schéma, préfixe x_). */
  x_prescore?: number;
}

/** Configuration acceptée par les moteurs : toutes les sections sont facultatives. */
export type Config = Partial<EventConfig>;

// ---------------------------------------------------------------- building-block.schema.json
export interface BlockAttributes {
  novelty?: number;
  ux_gain?: number;
  complexity?: number;
  cost?: number;
  media?: number;
  revenue?: number;
  inclusion?: number;
  eco_impact?: number;
  portability?: number;
}

export interface BuildingBlock {
  id: string;
  type: BlockType;
  name: string;
  mechanic: string;
  origin: { sector_family: SectorFamily; examples?: string[] };
  requirements: { budget_tier_min?: number; staff_min?: number; tech?: Tech[]; setting?: 'interieur' | 'exterieur' | 'indifferent'; min_area_m2?: number };
  attributes: BlockAttributes;
  direction_fit?: Partial<Record<Direction, number>>;
  compatible_with?: string[];
  incompatible_with?: string[];
  risks?: string[];
  ip_note: string;
}

// ---------------------------------------------------------------- error-entry.schema.json
export type ErrorDomain =
  | 'inscriptions'
  | 'billetterie'
  | 'files_attente'
  | 'accueil'
  | 'ambiance'
  | 'sequencage'
  | 'temps_morts'
  | 'regles'
  | 'visibilite'
  | 'animations'
  | 'restauration'
  | 'accessibilite'
  | 'securite'
  | 'benevoles'
  | 'experience_athletes'
  | 'satisfaction'
  | 'communication'
  | 'sponsors'
  | 'rentabilite'
  | 'medias'
  | 'environnement'
  | 'gouvernance';

export interface ErrorEntry {
  id: string;
  title: string;
  events?: { name?: string; date?: string; city?: string; country?: string }[];
  domain: ErrorDomain;
  severity: 'mineure' | 'majeure' | 'critique';
  applies_to_scale?: ('local' | 'regional' | 'national' | 'international')[];
  description: string;
  probable_causes: string[];
  cause_status: 'etablie_rapport_officiel' | 'recoupee_presse' | 'probable';
  consequences: string[];
  warning_signs: string[];
  preventive_measures: string[];
  corrective_plan: string[];
  checklist_items?: string[];
  sources: { url?: string; title: string; publisher?: string; reliability?: Reliability; internal_ref?: string }[];
  tags?: string[];
}

// ---------------------------------------------------------------- watch-entry.schema.json
export interface WatchEntry {
  id: string;
  dedupe_key: string;
  event_name: string;
  organizer?: string | null;
  country?: string | null;
  city?: string | null;
  discipline: string;
  sector_family?: SectorFamily;
  organizer_scale?: 'grande_organisation' | 'intermediaire' | 'independant' | 'association' | 'startup' | 'inconnu';
  event_date?: string | null;
  published_at: string;
  collected_at: string;
  cadence: 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'annuelle' | 'manuelle';
  sources: { url: string; title: string; publisher?: string; type?: string; accessed_at: string; reliability?: Reliability; read?: boolean }[];
  format_description: string;
  main_innovation: string;
  reliability: Reliability;
  target_audience?: string | null;
  business_model?: string | null;
  observed_results?: string | null;
  strengths?: string[];
  weaknesses?: string[];
  transposition?: { potential?: number; ideas?: string[]; target_disciplines?: string[] };
  reproduction_constraints?: string[];
  claims?: { text: string; status: 'fait_verifie' | 'estimation' | 'hypothese'; source_indexes?: number[] }[];
  [extra: string]: unknown;
}

/** Entrée du catalogue de sources de veille (knowledge/veille/sources.json, contrat : knowledge/veille/README.md). */
export interface WatchCatalogSource {
  id: string;
  name: string;
  url: string;
  type: string;
  sector_families: SectorFamily[];
  scale: string;
  language: string;
  country: string;
  cadence_suggeree: string;
  notes?: string;
  verified_at?: string;
  verification: 'verifie' | 'non_verifie';
}
