// EVENT LAB v0.4 — dépôt local (hors ligne d'abord) des événements et de leurs versions.
//
// Toute modification est d'abord appliquée et enregistrée sur l'appareil ; dans un espace
// d'organisation, elle est aussi inscrite dans la file d'envoi (outbox), rejouée par
// SyncEngine au retour du réseau. Les règles du moteur s'appliquent localement
// (src/core/eventlab/versioning.ts) : une version validée ou archivée n'est jamais modifiée.
import { FrozenVersionError, assertMutable, transition as engineTransition, type ConfigStatus, type EventConfig, type TransitionAction } from '../eventlab';
import { type EventOrigin, type EventRecord, type SyncAlert, type VersionRecord, type WorkspaceData, type WorkspaceId, type AlertKind } from './types';
import { SEMVER, SLUG, cmpVersion, nextFreeVersion, uuid as defaultUuid, type KeyValueStore } from './util';

export const STORE_PREFIX = 'baskest-lab:eventlab:depot:v1:';
export const storeKey = (w: WorkspaceId) => `${STORE_PREFIX}${w}`;

const FROZEN = new Set<ConfigStatus>(['validated', 'archived']);
export const isFrozen = (s: ConfigStatus) => FROZEN.has(s);

export class DuplicateVersionError extends Error {
  constructor(slug: string, version: string) {
    super(`La version ${version} de « ${slug} » existe déjà : choisissez un autre numéro.`);
    this.name = 'DuplicateVersionError';
  }
}
export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface RepoOptions {
  now?: () => string;
  uuid?: () => string;
}

export function emptyWorkspace(workspace: WorkspaceId): WorkspaceData {
  return { schema: 1, workspace, events: [], versions: [], outbox: [], alerts: [], lastSyncAt: null, lastError: null };
}

/** Lecture tolérante : un contenu illisible donne un espace vide (le contenu brut reste en place, jamais écrasé sans écriture explicite). */
export function loadWorkspace(kv: KeyValueStore, workspace: WorkspaceId): WorkspaceData {
  try {
    const raw = kv.getItem(storeKey(workspace));
    if (!raw) return emptyWorkspace(workspace);
    const d = JSON.parse(raw) as WorkspaceData;
    if (!d || d.schema !== 1 || !Array.isArray(d.versions) || !Array.isArray(d.events)) return emptyWorkspace(workspace);
    return { ...emptyWorkspace(workspace), ...d, workspace };
  } catch {
    return emptyWorkspace(workspace);
  }
}

export class LocalRepository {
  data: WorkspaceData;
  private listeners = new Set<() => void>();
  private now: () => string;
  private newId: () => string;
  /** Dans un espace d'organisation, chaque modification est inscrite dans la file d'envoi. */
  readonly tracked: boolean;

  constructor(
    private kv: KeyValueStore,
    readonly workspace: WorkspaceId,
    opts: RepoOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date().toISOString());
    this.newId = opts.uuid ?? defaultUuid;
    this.tracked = workspace !== 'local';
    this.data = loadWorkspace(kv, workspace);
  }

  // ------------------------------------------------------------------ persistance et abonnement
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  /** Relit le stockage (autre onglet, autre instance). */
  reload() {
    this.data = loadWorkspace(this.kv, this.workspace);
    this.emit();
  }
  emit() {
    this.listeners.forEach((l) => l());
  }
  /** Écrit l'espace ; lève StorageError si le stockage est plein ou indisponible (l'état en mémoire est alors restauré). */
  commit(mutate: (d: WorkspaceData) => void): void {
    const before = JSON.stringify(this.data);
    mutate(this.data);
    try {
      this.kv.setItem(storeKey(this.workspace), JSON.stringify(this.data));
    } catch (e) {
      this.data = JSON.parse(before) as WorkspaceData;
      const quota = e instanceof Error && /quota/i.test(e.name + e.message);
      throw new StorageError(quota ? 'Stockage de l’appareil plein : exportez puis supprimez des versions.' : 'Stockage de l’appareil indisponible : la modification n’a pas été enregistrée.');
    }
    this.emit();
  }

  // ------------------------------------------------------------------ lecture
  events(): EventRecord[] {
    return this.data.events.filter((e) => !e.deleted);
  }
  eventBySlug(slug: string): EventRecord | undefined {
    return this.data.events.find((e) => e.slug === slug && !e.deleted);
  }
  versions(slug?: string): VersionRecord[] {
    return this.data.versions.filter((v) => !v.deleted && (slug == null || v.eventSlug === slug)).sort((a, b) => cmpVersion(a.version, b.version));
  }
  version(id: string): VersionRecord | undefined {
    return this.data.versions.find((v) => v.id === id && !v.deleted);
  }
  /** Numéros déjà pris pour un événement (y compris suppressions en attente). */
  takenVersions(slug: string): string[] {
    return this.data.versions.filter((v) => v.eventSlug === slug).map((v) => v.version);
  }
  nextVersion(slug: string, base: string): string {
    return nextFreeVersion(this.takenVersions(slug), base);
  }
  pendingCount(): number {
    return this.data.outbox.length;
  }
  unseenAlerts(): SyncAlert[] {
    return this.data.alerts.filter((a) => !a.seen);
  }

  // ------------------------------------------------------------------ écriture
  /** Crée l'événement s'il n'existe pas encore sur cet appareil (envoyé au serveur avec sa première version). */
  ensureEvent(input: { slug: string; name: string; origin?: EventOrigin }): EventRecord {
    const found = this.eventBySlug(input.slug);
    if (found) return found;
    if (!SLUG.test(input.slug)) throw new Error(`Identifiant d’événement invalide : « ${input.slug} »`);
    const at = this.now();
    const ev: EventRecord = { id: this.newId(), slug: input.slug, name: input.name.trim() || input.slug, origin: input.origin ?? 'studio', rowVersion: null, createdAt: at, updatedAt: at };
    this.commit((d) => {
      d.events = d.events.filter((e) => !(e.slug === ev.slug && e.deleted));
      d.events.push(ev);
    });
    return ev;
  }

  /**
   * Enregistre une nouvelle version (le numéro doit être libre). Le statut est celui de la
   * configuration : brouillon en usage courant ; un import peut apporter d'autres statuts,
   * que le serveur acceptera ou refusera selon le rôle.
   */
  createVersion(config: EventConfig, opts: { origin?: EventOrigin; eventName?: string; note?: string; sync?: VersionRecord['sync'] } = {}): VersionRecord {
    if (!SLUG.test(String(config.id))) throw new Error(`Identifiant d’événement invalide : « ${String(config.id)} »`);
    if (!SEMVER.test(String(config.version))) throw new Error(`Numéro de version invalide : « ${String(config.version)} »`);
    if (this.takenVersions(config.id).includes(config.version)) throw new DuplicateVersionError(config.id, config.version);
    const ev = this.ensureEvent({ slug: config.id, name: opts.eventName ?? config.identity?.name ?? config.id, origin: opts.origin });
    const at = this.now();
    const rec: VersionRecord = {
      id: this.newId(),
      eventId: ev.id,
      eventSlug: config.id,
      version: config.version,
      status: config.status ?? 'draft',
      config: structuredClone({ ...config, status: config.status ?? 'draft' }),
      rowVersion: null,
      createdAt: at,
      updatedAt: at,
      sync: opts.sync ?? (this.tracked ? 'pending' : 'local'),
      note: opts.note,
    };
    this.commit((d) => {
      d.versions.push(rec);
      if (this.tracked) d.outbox.push({ opId: this.newId(), at, kind: 'create_version', versionId: rec.id, status: rec.status, config: structuredClone(rec.config) });
    });
    return rec;
  }

  /** Modifie un brouillon en place. Refus (FrozenVersionError) pour une version validée ou archivée. */
  updateDraft(id: string, config: EventConfig): VersionRecord {
    const rec = this.require(id);
    assertMutable(rec.config);
    if (rec.status !== 'draft') throw new Error(`Seul un brouillon est modifiable (statut : ${rec.status}).`);
    if (config.id !== rec.eventSlug || config.version !== rec.version) throw new Error('L’identifiant et le numéro d’une version ne changent pas.');
    const next = structuredClone({ ...config, status: 'draft' as const });
    const at = this.now();
    this.commit((d) => {
      const r = d.versions.find((v) => v.id === id)!;
      r.config = next;
      r.updatedAt = at;
      if (this.tracked) {
        r.sync = 'pending';
        // Regroupement : la dernière opération en attente pour cette version porte le contenu le plus récent
        const last = [...d.outbox].reverse().find((o) => 'versionId' in o && o.versionId === id);
        if (last && (last.kind === 'create_version' || last.kind === 'update_draft')) last.config = structuredClone(next);
        else d.outbox.push({ opId: this.newId(), at, kind: 'update_draft', versionId: id, config: structuredClone(next) });
      }
    });
    return this.require(id);
  }

  /** Transition de statut par le moteur (submit, request_changes, approve, archive). */
  transition(id: string, action: TransitionAction, actor: string, date?: string): VersionRecord {
    const rec = this.require(id);
    const next = engineTransition(rec.config, action, { actor, date: date ?? this.now().slice(0, 10) });
    const at = this.now();
    this.commit((d) => {
      const r = d.versions.find((v) => v.id === id)!;
      r.config = next;
      r.status = next.status;
      r.updatedAt = at;
      if (this.tracked) {
        r.sync = 'pending';
        d.outbox.push({ opId: this.newId(), at, kind: 'transition', versionId: id, action, to: next.status, config: structuredClone(next) });
      }
    });
    return this.require(id);
  }

  /** Supprime un brouillon (jamais une version figée). */
  deleteVersion(id: string): void {
    const rec = this.require(id);
    if (isFrozen(rec.status)) throw new FrozenVersionError(rec.config);
    if (rec.status !== 'draft') throw new Error('Seul un brouillon peut être supprimé ; demandez d’abord des modifications.');
    this.commit((d) => {
      const neverSent = d.outbox.some((o) => o.kind === 'create_version' && o.versionId === id);
      if (!this.tracked || neverSent) {
        d.outbox = d.outbox.filter((o) => !('versionId' in o && o.versionId === id));
        d.versions = d.versions.filter((v) => v.id !== id);
      } else {
        d.versions.find((v) => v.id === id)!.deleted = true;
        d.outbox.push({ opId: this.newId(), at: this.now(), kind: 'delete_version', versionId: id });
      }
    });
  }

  /** Supprime un événement et ses brouillons ; refusé s'il contient une version qui n'est pas un brouillon. */
  deleteEvent(eventId: string): void {
    const ev = this.data.events.find((e) => e.id === eventId && !e.deleted);
    if (!ev) return;
    const vs = this.data.versions.filter((v) => v.eventId === eventId && !v.deleted);
    const blocking = vs.find((v) => v.status !== 'draft');
    if (blocking) throw isFrozen(blocking.status) ? new FrozenVersionError(blocking.config) : new Error('Cet événement a une version en revue : demandez d’abord des modifications.');
    this.commit((d) => {
      const ids = new Set(d.versions.filter((v) => v.eventId === eventId).map((v) => v.id));
      const neverSent = ev.rowVersion == null && !d.versions.some((v) => ids.has(v.id) && v.rowVersion != null);
      d.outbox = d.outbox.filter((o) => !('versionId' in o && ids.has(o.versionId)));
      if (!this.tracked || neverSent) {
        d.versions = d.versions.filter((v) => !ids.has(v.id));
        d.events = d.events.filter((e) => e.id !== eventId);
      } else {
        d.versions.forEach((v) => {
          if (ids.has(v.id)) v.deleted = true;
        });
        d.events.find((e) => e.id === eventId)!.deleted = true;
        d.outbox.push({ opId: this.newId(), at: this.now(), kind: 'delete_event', eventId });
      }
    });
  }

  addAlert(kind: AlertKind, message: string, extra: Partial<SyncAlert> = {}): SyncAlert {
    const a: SyncAlert = { id: this.newId(), at: this.now(), kind, message, seen: false, ...extra };
    this.commit((d) => {
      d.alerts.push(a);
      if (d.alerts.length > 200) d.alerts = d.alerts.slice(-200);
    });
    return a;
  }
  markAlertsSeen(): void {
    this.commit((d) => d.alerts.forEach((a) => (a.seen = true)));
  }

  private require(id: string): VersionRecord {
    const r = this.version(id);
    if (!r) throw new Error('Version introuvable sur cet appareil.');
    return r;
  }

  /** Identifiants et horloge du dépôt (utilisés par la synchronisation et la migration). */
  id(): string {
    return this.newId();
  }
  clock(): string {
    return this.now();
  }
}
