// EVENT LAB v0.4 — synchronisation d'un espace d'organisation avec le serveur.
//
// Règles (event-lab/docs/14-socle-saas.md §5) :
//  1. La file d'envoi est rejouée dans l'ordre ; sans réseau, elle s'arrête et tout reste en attente.
//  2. Chaque envoi est idempotent : création par identifiant client (UUID), et en cas de conflit
//     on compare au contenu du serveur (si c'est déjà notre modification, c'est un succès).
//  3. Un conflit (row_version périmée) n'est possible que sur un brouillon : le serveur gagne
//     pour la version concernée, la modification locale est conservée dans une nouvelle version
//     brouillon (« copie de conflit ») et une alerte est créée. Rien n'est perdu.
//  4. Une version validée ou archivée n'est jamais réécrite, ni par l'envoi ni par la lecture.
import type { EventConfig } from '../eventlab';
import { isFrozen, type LocalRepository } from './local-repository';
import { isRemoteError, RemoteError, workspaceOrg, type OutboxOp, type RemoteApi, type RemoteVersion, type VersionRecord, type WorkspaceData } from './types';
import { canonical, nextFreeVersion, sameContent, sameJson } from './util';

export interface SyncReport {
  sent: number;
  remaining: number;
  conflicts: number;
  rejected: number;
  pulled: boolean;
  offline: boolean;
  error: string | null;
}

const MAX_RENUMBER = 5;

export class SyncEngine {
  private running: Promise<SyncReport> | null = null;
  readonly orgId: string;

  constructor(
    private repo: LocalRepository,
    private remote: RemoteApi,
  ) {
    const org = workspaceOrg(repo.workspace);
    if (!org) throw new Error('La synchronisation ne concerne qu’un espace d’organisation.');
    this.orgId = org;
  }

  /** Envoie la file puis relit le serveur. Un seul passage à la fois (les appels concurrents attendent le même). */
  sync(): Promise<SyncReport> {
    if (!this.running) {
      this.running = this.run().finally(() => {
        this.running = null;
      });
    }
    return this.running;
  }

  private async run(): Promise<SyncReport> {
    const report: SyncReport = { sent: 0, remaining: 0, conflicts: 0, rejected: 0, pulled: false, offline: false, error: null };
    try {
      await this.flush(report);
      if (!report.offline) {
        await this.pull();
        report.pulled = true;
      }
    } catch (e) {
      if (isRemoteError(e, 'network', 'auth')) report.offline = true;
      else report.error = e instanceof Error ? e.message : String(e);
    }
    report.remaining = this.repo.pendingCount();
    const err = report.offline ? 'Serveur injoignable : les modifications restent en attente sur cet appareil.' : report.error;
    this.repo.commit((d) => {
      d.lastError = err;
      if (report.pulled) d.lastSyncAt = this.repo.clock();
    });
    return report;
  }

  // ================================================================== envoi
  async flush(report: SyncReport = { sent: 0, remaining: 0, conflicts: 0, rejected: 0, pulled: false, offline: false, error: null }): Promise<SyncReport> {
    while (this.repo.data.outbox.length) {
      const op = this.repo.data.outbox[0];
      try {
        const outcome = await this.apply(op);
        if (outcome === 'conflict') report.conflicts++;
        else if (outcome === 'rejected') report.rejected++;
        else report.sent++;
      } catch (e) {
        if (isRemoteError(e, 'network', 'auth')) {
          report.offline = true;
          break; // l'opération reste en tête de file
        }
        report.rejected++;
        this.dropOp(op.opId, (d) => this.markRejected(d, op, e));
        continue;
      }
    }
    report.remaining = this.repo.pendingCount();
    return report;
  }

  private local(id: string): VersionRecord | undefined {
    return this.repo.data.versions.find((v) => v.id === id);
  }

  /** Retire une opération de la file (et applique les effets locaux associés) en une seule écriture. */
  private dropOp(opId: string, also?: (d: WorkspaceData) => void) {
    this.repo.commit((d) => {
      d.outbox = d.outbox.filter((o) => o.opId !== opId);
      also?.(d);
      this.refreshSyncFlags(d);
    });
  }

  /** Une version sans opération en attente est « synced » (sauf refus déjà signalé). */
  private refreshSyncFlags(d: WorkspaceData) {
    const pending = new Set(d.outbox.flatMap((o) => ('versionId' in o ? [o.versionId] : [])));
    for (const v of d.versions) {
      if (pending.has(v.id)) v.sync = 'pending';
      else if (v.sync === 'pending') v.sync = 'synced';
    }
  }

  private markRejected(d: WorkspaceData, op: OutboxOp, e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const vid = 'versionId' in op ? op.versionId : undefined;
    const v = vid ? d.versions.find((x) => x.id === vid) : undefined;
    if (v) v.sync = 'rejected';
    // Les opérations suivantes sur la même version dépendaient de celle-ci : elles sont retirées aussi.
    if (vid) d.outbox = d.outbox.filter((o) => !('versionId' in o && o.versionId === vid));
    d.alerts.push({ id: this.repo.id(), at: this.repo.clock(), kind: 'refus', message: `Envoi refusé par le serveur${v ? ` (${v.eventSlug} v${v.version})` : ''} : ${msg}. La copie locale est conservée.`, versionId: vid, seen: false });
  }

  private async apply(op: OutboxOp): Promise<'sent' | 'conflict' | 'rejected'> {
    switch (op.kind) {
      case 'create_version':
        return this.applyCreate(op);
      case 'update_draft':
        return this.applyUpdate(op.opId, op.versionId, { status: 'draft', config: op.config });
      case 'transition':
        return this.applyUpdate(op.opId, op.versionId, { status: op.to, config: op.config });
      case 'delete_version':
        return this.applyDeleteVersion(op);
      case 'delete_event':
        return this.applyDeleteEvent(op);
    }
  }

  // ------------------------------------------------------------------ création
  private async applyCreate(op: Extract<OutboxOp, { kind: 'create_version' }>): Promise<'sent' | 'conflict' | 'rejected'> {
    const v = this.local(op.versionId);
    if (!v) {
      this.dropOp(op.opId);
      return 'sent';
    }
    const ev = this.repo.data.events.find((e) => e.id === v.eventId);
    if (!ev) throw new RemoteError('invalid', 'Événement local introuvable');
    const remoteEv = await this.remote.ensureEvent(this.orgId, { id: ev.id, slug: ev.slug, name: ev.name, origin: ev.origin });
    if (remoteEv.id !== ev.id || ev.rowVersion !== remoteEv.rowVersion) {
      // Même événement créé ailleurs (même slug) : on adopte l'identifiant du serveur.
      this.repo.commit((d) => {
        const e = d.events.find((x) => x.id === ev.id)!;
        d.versions.forEach((x) => {
          if (x.eventId === ev.id) x.eventId = remoteEv.id;
        });
        e.id = remoteEv.id;
        e.rowVersion = remoteEv.rowVersion;
        e.name = remoteEv.name;
      });
    }
    let config = op.config;
    let status = op.status;
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await this.remote.insertVersion(this.orgId, { id: op.versionId, eventId: remoteEv.id, version: config.version, status, config });
        this.dropOp(op.opId, (d) => {
          const x = d.versions.find((y) => y.id === op.versionId)!;
          x.rowVersion = r.rowVersion;
          // Si la ligne existait déjà (rejeu d'un envoi dont la réponse s'était perdue), le serveur fait foi
          if (!sameJson(r.config, x.config) && !d.outbox.some((o) => 'versionId' in o && o.versionId === x.id)) {
            x.config = r.config;
            x.status = r.status;
          }
        });
        return 'sent';
      } catch (e) {
        if (!isRemoteError(e, 'duplicate_version') || attempt >= MAX_RENUMBER) throw e;
        // Le numéro a été pris ailleurs pendant que cet appareil était hors ligne : les deux versions
        // sont conservées, la nôtre reçoit le prochain numéro libre.
        const remoteNums = (await this.remote.listVersions(this.orgId)).filter((x) => x.eventId === remoteEv.id).map((x) => x.version);
        const before = config.version;
        const next = nextFreeVersion([...remoteNums, ...this.repo.takenVersions(v.eventSlug)], before);
        config = renumber(config, before, next);
        status = config.status;
        this.repo.commit((d) => {
          const x = d.versions.find((y) => y.id === op.versionId)!;
          x.version = next;
          x.config = renumber(x.config, before, next);
          x.note = `Renumérotée ${before} → ${next} : le numéro ${before} a été pris sur un autre appareil.`;
          const o = d.outbox.find((y) => y.opId === op.opId);
          if (o && o.kind === 'create_version') o.config = config;
          d.outbox.forEach((y) => {
            if ((y.kind === 'update_draft' || y.kind === 'transition') && y.versionId === op.versionId) y.config = renumber(y.config, before, next);
          });
          d.alerts.push({ id: this.repo.id(), at: this.repo.clock(), kind: 'renumerotation', message: `${v.eventSlug} : votre version ${before} devient ${next}, car ${before} existait déjà sur le serveur. Les deux versions sont conservées.`, versionId: op.versionId, seen: false });
        });
      }
    }
  }

  // ------------------------------------------------------------------ modification (brouillon ou transition)
  private async applyUpdate(opId: string, versionId: string, patch: { status: VersionRecord['status']; config: EventConfig }): Promise<'sent' | 'conflict' | 'rejected'> {
    const v = this.local(versionId);
    if (!v || v.rowVersion == null) {
      // La création n'a jamais abouti (refus déjà signalé) : rien à modifier côté serveur.
      this.dropOp(opId);
      return 'sent';
    }
    try {
      const r = await this.remote.updateVersion(versionId, patch, v.rowVersion);
      this.dropOp(opId, (d) => {
        d.versions.find((x) => x.id === versionId)!.rowVersion = r.rowVersion;
      });
      return 'sent';
    } catch (e) {
      if (!isRemoteError(e, 'conflict', 'frozen', 'denied', 'not_found')) throw e;
      const remote = await this.remote.getVersion(versionId);
      // Idempotence : notre modification est déjà sur le serveur (réponse perdue lors d'un envoi précédent).
      if (remote && remote.status === patch.status && sameJson(remote.config, patch.config)) {
        this.dropOp(opId, (d) => {
          d.versions.find((x) => x.id === versionId)!.rowVersion = remote.rowVersion;
        });
        return 'sent';
      }
      if (isRemoteError(e, 'denied') && remote && remote.rowVersion === v.rowVersion) {
        // Pas un conflit : le rôle ne permet pas cette action. Le serveur fait foi, l'alerte l'explique.
        this.resolveWithRemote(opId, v, remote, patch.config, 'refus', `Action refusée par le serveur (droits insuffisants pour votre rôle) sur ${v.eventSlug} v${v.version}.`);
        return 'rejected';
      }
      this.resolveWithRemote(opId, v, remote, patch.config, 'conflit', remote ? `Conflit sur ${v.eventSlug} v${v.version} : la version a changé sur un autre appareil (statut serveur : ${remote.status}).` : `Conflit sur ${v.eventSlug} v${v.version} : la version a été supprimée sur un autre appareil.`);
      return 'conflict';
    }
  }

  /**
   * Le serveur gagne pour la version concernée ; si notre contenu diffère, il est conservé
   * dans une nouvelle version brouillon envoyée à la suite (copie de conflit).
   */
  private resolveWithRemote(opId: string, v: VersionRecord, remote: RemoteVersion | null, mine: EventConfig, kind: 'conflit' | 'refus', message: string) {
    const needCopy = !remote || !sameContent(remote.config, mine);
    this.repo.commit((d) => {
      // Les opérations suivantes sur cette version reposaient sur l'état local abandonné.
      d.outbox = d.outbox.filter((o) => o.opId !== opId && !('versionId' in o && o.versionId === v.id));
      const idx = d.versions.findIndex((x) => x.id === v.id);
      if (remote) {
        Object.assign(d.versions[idx], { version: remote.version, status: remote.status, config: remote.config, rowVersion: remote.rowVersion, sync: 'synced', deleted: false, note: undefined });
      } else {
        d.versions.splice(idx, 1);
      }
      let copyId: string | undefined;
      if (needCopy) {
        const taken = [...d.versions.filter((x) => x.eventSlug === v.eventSlug).map((x) => x.version), ...(remote ? [remote.version] : [])];
        const num = remote ? nextFreeVersion(taken, remote.version) : taken.includes(v.version) ? nextFreeVersion(taken, v.version) : v.version;
        const at = this.repo.clock();
        const copyCfg: EventConfig = {
          ...structuredClone(mine),
          version: num,
          status: 'draft',
          parent: remote ? { id: v.eventSlug, version: remote.version, relation: 'new_version' } : (mine.parent ?? null),
          history: [...(mine.history ?? []), { version: num, date: at.slice(0, 10), author: 'synchronisation', summary: `Copie de conflit de la v${v.version} (modification faite sur cet appareil)`, decisions: [], approved_by: null }],
        };
        copyId = this.repo.id();
        d.versions.push({ id: copyId, eventId: v.eventId, eventSlug: v.eventSlug, version: num, status: 'draft', config: copyCfg, rowVersion: null, createdAt: at, updatedAt: at, sync: 'pending', note: `Copie de conflit de la v${v.version}` });
        d.outbox.push({ opId: this.repo.id(), at, kind: 'create_version', versionId: copyId, status: 'draft', config: structuredClone(copyCfg) });
      }
      d.alerts.push({
        id: this.repo.id(),
        at: this.repo.clock(),
        kind: remote && !needCopy && kind === 'conflit' ? 'transition_non_appliquee' : kind,
        message: needCopy ? `${message} Votre modification est conservée dans un nouveau brouillon v${d.versions.find((x) => x.id === copyId)?.version}.` : `${message} Le contenu était identique : rien n’est perdu.`,
        versionId: remote ? v.id : undefined,
        copyVersionId: copyId,
        seen: false,
      });
      this.refreshSyncFlags(d);
    });
  }

  // ------------------------------------------------------------------ suppressions
  private async applyDeleteVersion(op: Extract<OutboxOp, { kind: 'delete_version' }>): Promise<'sent' | 'conflict' | 'rejected'> {
    const v = this.local(op.versionId);
    if (!v || v.rowVersion == null) {
      this.dropOp(op.opId, (d) => {
        d.versions = d.versions.filter((x) => x.id !== op.versionId);
      });
      return 'sent';
    }
    try {
      await this.remote.deleteVersion(op.versionId, v.rowVersion);
      this.dropOp(op.opId, (d) => {
        d.versions = d.versions.filter((x) => x.id !== op.versionId);
      });
      return 'sent';
    } catch (e) {
      if (!isRemoteError(e, 'conflict', 'frozen', 'denied')) throw e;
      const remote = await this.remote.getVersion(op.versionId);
      this.dropOp(op.opId, (d) => {
        const x = d.versions.find((y) => y.id === op.versionId);
        if (x && remote) Object.assign(x, { version: remote.version, status: remote.status, config: remote.config, rowVersion: remote.rowVersion, deleted: false, sync: 'synced' });
        else if (x) d.versions = d.versions.filter((y) => y.id !== op.versionId);
        d.alerts.push({ id: this.repo.id(), at: this.repo.clock(), kind: 'suppression_annulee', message: `Suppression de ${v.eventSlug} v${v.version} annulée : ${isRemoteError(e, 'conflict') ? 'le brouillon a été modifié sur un autre appareil' : isRemoteError(e, 'frozen') ? 'la version est figée sur le serveur' : 'droits insuffisants'}. La version est restaurée.`, versionId: op.versionId, seen: false });
      });
      return 'conflict';
    }
  }

  private async applyDeleteEvent(op: Extract<OutboxOp, { kind: 'delete_event' }>): Promise<'sent' | 'conflict' | 'rejected'> {
    const ev = this.repo.data.events.find((e) => e.id === op.eventId);
    const known = new Set(this.repo.data.versions.filter((v) => v.eventId === op.eventId).map((v) => v.id));
    const remoteVersions = (await this.remote.listVersions(this.orgId)).filter((v) => v.eventId === op.eventId);
    const unknown = remoteVersions.filter((v) => !known.has(v.id));
    const restore = (message: string) =>
      this.dropOp(op.opId, (d) => {
        d.events.forEach((e) => {
          if (e.id === op.eventId) e.deleted = false;
        });
        d.versions.forEach((v) => {
          if (v.eventId === op.eventId) v.deleted = false;
        });
        for (const r of remoteVersions) if (!d.versions.some((v) => v.id === r.id)) d.versions.push(fromRemote(r, ev?.slug ?? r.config.id));
        d.alerts.push({ id: this.repo.id(), at: this.repo.clock(), kind: 'suppression_annulee', message, seen: false });
      });
    if (unknown.length || remoteVersions.some((v) => v.status !== 'draft')) {
      // Ne jamais effacer par cascade une version que cet appareil n'a pas vue.
      restore(`Suppression de « ${ev?.slug ?? 'événement'} » annulée : d’autres versions existent sur le serveur. L’événement est restauré.`);
      return 'conflict';
    }
    try {
      await this.remote.deleteEvent(op.eventId);
    } catch (e) {
      if (!isRemoteError(e, 'frozen', 'denied', 'conflict')) throw e;
      restore(`Suppression de « ${ev?.slug ?? 'événement'} » refusée par le serveur : ${e.message}. L’événement est restauré.`);
      return 'conflict';
    }
    this.dropOp(op.opId, (d) => {
      d.versions = d.versions.filter((v) => v.eventId !== op.eventId);
      d.events = d.events.filter((e) => e.id !== op.eventId);
    });
    return 'sent';
  }

  // ================================================================== lecture du serveur
  async pull(): Promise<void> {
    const [events, versions] = await Promise.all([this.remote.listEvents(this.orgId), this.remote.listVersions(this.orgId)]);
    this.repo.commit((d) => {
      const pending = new Set(d.outbox.flatMap((o) => ('versionId' in o ? [o.versionId] : [])));
      const pendingEvents = new Set(d.outbox.flatMap((o) => (o.kind === 'delete_event' ? [o.eventId] : [])));
      // Événements
      for (const re of events) {
        const byId = d.events.find((e) => e.id === re.id);
        const bySlug = d.events.find((e) => e.slug === re.slug && e.id !== re.id);
        if (bySlug && !byId) {
          // Créé ici hors ligne et ailleurs en parallèle : on adopte l'identifiant du serveur.
          d.versions.forEach((v) => {
            if (v.eventId === bySlug.id) v.eventId = re.id;
          });
          bySlug.id = re.id;
        }
        const e = d.events.find((x) => x.id === re.id);
        if (e) {
          if (!pendingEvents.has(e.id)) Object.assign(e, { slug: re.slug, name: re.name, origin: re.origin, rowVersion: re.rowVersion, updatedAt: re.updatedAt, deleted: false });
        } else d.events.push({ id: re.id, slug: re.slug, name: re.name, origin: re.origin, rowVersion: re.rowVersion, createdAt: re.createdAt, updatedAt: re.updatedAt });
      }
      const slugOf = new Map(d.events.map((e) => [e.id, e.slug]));
      // Versions
      const remoteIds = new Set(versions.map((v) => v.id));
      for (const rv of versions) {
        const local = d.versions.find((v) => v.id === rv.id);
        if (!local) {
          d.versions.push(fromRemote(rv, slugOf.get(rv.eventId) ?? rv.config.id));
          continue;
        }
        if (pending.has(rv.id) || local.deleted) continue; // l'envoi en attente décidera (conflit éventuel)
        if (isFrozen(local.status) && local.rowVersion != null && canonical(local.config) !== canonical(rv.config) && !(local.status === 'validated' && rv.status === 'archived')) {
          // Invariant : une version figée ne change jamais. On ne réécrit pas la copie locale.
          d.alerts.push({ id: this.repo.id(), at: this.repo.clock(), kind: 'integrite', message: `${local.eventSlug} v${local.version} : la version figée du serveur diffère de la copie de cet appareil ; la copie locale n’est pas réécrite. Signalez-le à un administrateur.`, versionId: local.id, seen: false });
          continue;
        }
        Object.assign(local, { eventId: rv.eventId, version: rv.version, status: rv.status, config: rv.config, rowVersion: rv.rowVersion, updatedAt: rv.updatedAt, sync: 'synced' });
      }
      // Versions disparues du serveur (supprimées ailleurs) : retirées si rien n'est en attente ;
      // une version figée disparue (organisation purgée, accès retiré) est gardée localement.
      d.versions = d.versions.filter((v) => {
        if (v.rowVersion == null || remoteIds.has(v.id) || pending.has(v.id)) return true;
        if (isFrozen(v.status)) {
          if (v.sync !== 'rejected') {
            v.sync = 'rejected';
            v.note = 'Absente du serveur (accès retiré ou organisation supprimée) : copie conservée sur cet appareil.';
          }
          return true;
        }
        return false;
      });
      const liveEventIds = new Set([...events.map((e) => e.id)]);
      d.events = d.events.filter((e) => e.rowVersion == null || liveEventIds.has(e.id) || pendingEvents.has(e.id) || d.versions.some((v) => v.eventId === e.id));
      this.refreshSyncFlags(d);
    });
  }
}

function fromRemote(rv: RemoteVersion, slug: string): VersionRecord {
  return { id: rv.id, eventId: rv.eventId, eventSlug: slug, version: rv.version, status: rv.status, config: rv.config, rowVersion: rv.rowVersion, createdAt: rv.createdAt, updatedAt: rv.updatedAt, sync: 'synced' };
}

/** Change le numéro d'une version qui n'a jamais atteint le serveur (historique compris). */
function renumber(c: EventConfig, from: string, to: string): EventConfig {
  const n = structuredClone(c);
  n.version = to;
  n.history = (n.history ?? []).map((h) => (h.version === from ? { ...h, version: to } : h));
  return n;
}
