// EVENT LAB v0.4 — couche de données hors ligne d'abord : types et contrats.
// Documentation : event-lab/docs/14-socle-saas.md §5 (synchronisation et conflits).
import type { ConfigStatus, EventConfig, TransitionAction } from '../eventlab';

/** Espace de travail : « local » (données de cet appareil, jamais envoyées) ou une organisation. */
export type WorkspaceId = 'local' | `org:${string}`;
export const orgWorkspace = (orgId: string): WorkspaceId => `org:${orgId}`;
export const workspaceOrg = (w: WorkspaceId): string | null => (w.startsWith('org:') ? w.slice(4) : null);

export type EventOrigin = 'studio' | 'generateur' | 'import';

/**
 * État de synchronisation d'une version sur cet appareil :
 * - local : espace local, jamais envoyé ;
 * - pending : modification locale en attente d'envoi ;
 * - synced : identique à la dernière lecture du serveur ;
 * - rejected : le serveur a refusé l'envoi (droits, validation) ; la copie locale est conservée.
 */
export type SyncState = 'local' | 'pending' | 'synced' | 'rejected';

export interface EventRecord {
  /** UUID généré sur l'appareil (identique côté serveur une fois envoyé). */
  id: string;
  /** EventConfig.id : identifiant stable commun à toutes les versions. */
  slug: string;
  name: string;
  origin: EventOrigin;
  /** Dernière row_version connue du serveur ; null tant que l'événement n'a jamais été envoyé. */
  rowVersion: number | null;
  createdAt: string;
  updatedAt: string;
  /** Suppression demandée hors ligne, pas encore confirmée par le serveur. */
  deleted?: boolean;
}

export interface VersionRecord {
  id: string;
  eventId: string;
  eventSlug: string;
  version: string;
  status: ConfigStatus;
  config: EventConfig;
  rowVersion: number | null;
  createdAt: string;
  updatedAt: string;
  sync: SyncState;
  /** Remarque lisible (renumérotation, copie de conflit, migration…). */
  note?: string;
  deleted?: boolean;
}

/** Opération de la file d'envoi (persistante, rejouée dans l'ordre au retour du réseau). */
export type OutboxOp =
  | { opId: string; at: string; kind: 'create_version'; versionId: string; status: ConfigStatus; config: EventConfig }
  | { opId: string; at: string; kind: 'update_draft'; versionId: string; config: EventConfig }
  | { opId: string; at: string; kind: 'transition'; versionId: string; action: TransitionAction; to: ConfigStatus; config: EventConfig }
  | { opId: string; at: string; kind: 'delete_version'; versionId: string }
  | { opId: string; at: string; kind: 'delete_event'; eventId: string };

export type AlertKind = 'conflit' | 'renumerotation' | 'refus' | 'suppression_annulee' | 'integrite' | 'transition_non_appliquee';

export interface SyncAlert {
  id: string;
  at: string;
  kind: AlertKind;
  message: string;
  versionId?: string;
  /** Copie locale conservée (nouvelle version brouillon) quand les deux versions divergent. */
  copyVersionId?: string;
  seen: boolean;
}

export interface WorkspaceData {
  schema: 1;
  workspace: WorkspaceId;
  events: EventRecord[];
  versions: VersionRecord[];
  outbox: OutboxOp[];
  alerts: SyncAlert[];
  lastSyncAt: string | null;
  lastError: string | null;
}

// ---------------------------------------------------------------------------- serveur

export interface RemoteEvent {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  origin: EventOrigin;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface RemoteVersion {
  id: string;
  organizationId: string;
  eventId: string;
  version: string;
  status: ConfigStatus;
  config: EventConfig;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * - network : pas de réseau ou serveur injoignable (l'opération reste dans la file) ;
 * - auth : session expirée ou absente (idem) ;
 * - conflict : row_version périmée ;
 * - frozen : version validée ou archivée ;
 * - denied : droits insuffisants (RLS) ;
 * - duplicate_version : numéro de version déjà pris pour cet événement ;
 * - not_found, invalid : ligne absente, données refusées.
 */
export type RemoteErrorKind = 'network' | 'auth' | 'conflict' | 'frozen' | 'denied' | 'duplicate_version' | 'not_found' | 'invalid';

export class RemoteError extends Error {
  constructor(
    public kind: RemoteErrorKind,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'RemoteError';
  }
}
export const isRemoteError = (e: unknown, ...kinds: RemoteErrorKind[]): e is RemoteError => e instanceof RemoteError && (!kinds.length || kinds.includes(e.kind));

/** Contrat minimal du serveur pour une organisation (implémentations : Supabase, faux serveur des tests). */
export interface RemoteApi {
  /** Crée l'événement s'il n'existe pas (même organisation et même slug), puis le renvoie. */
  ensureEvent(orgId: string, e: { id: string; slug: string; name: string; origin: EventOrigin }): Promise<RemoteEvent>;
  /** Idempotent par id : si la ligne existe déjà, la renvoie telle quelle. */
  insertVersion(orgId: string, v: { id: string; eventId: string; version: string; status: ConfigStatus; config: EventConfig }): Promise<RemoteVersion>;
  /** Refuse (conflict) si row_version a changé depuis expectedRowVersion. */
  updateVersion(id: string, patch: { status: ConfigStatus; config: EventConfig }, expectedRowVersion: number): Promise<RemoteVersion>;
  /** 'absent' si la ligne n'existe plus (idempotent). */
  deleteVersion(id: string, expectedRowVersion: number): Promise<'deleted' | 'absent'>;
  deleteEvent(eventId: string): Promise<'deleted' | 'absent'>;
  getVersion(id: string): Promise<RemoteVersion | null>;
  listEvents(orgId: string): Promise<RemoteEvent[]>;
  listVersions(orgId: string): Promise<RemoteVersion[]>;
}

export type MemberRole = 'lecteur' | 'editeur' | 'administrateur' | 'proprietaire';
export const ROLE_RANK: Record<MemberRole, number> = { lecteur: 0, editeur: 1, administrateur: 2, proprietaire: 3 };
export const ROLE_LABEL: Record<MemberRole, string> = { lecteur: 'Lecteur', editeur: 'Éditeur', administrateur: 'Administrateur', proprietaire: 'Propriétaire' };
export const atLeast = (role: MemberRole | null | undefined, min: MemberRole) => !!role && ROLE_RANK[role] >= ROLE_RANK[min];
