// Faux serveur en mémoire pour les tests de synchronisation.
// Il applique les mêmes règles que supabase/migrations/ (testées séparément sur PostgreSQL par
// npm run db:test) : isolation par organisation, rôles, row_version, immutabilité des versions
// validées ou archivées, transitions autorisées, numéro de version unique par événement.
// Ce n'est pas Supabase : aucun réseau, aucune authentification réelle.
import type { ConfigStatus, EventConfig } from '../../src/core/eventlab';
import { RemoteError, ROLE_RANK, type EventOrigin, type MemberRole, type RemoteApi, type RemoteEvent, type RemoteVersion } from '../../src/core/sync/types';
import { sameContent } from '../../src/core/sync/util';

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const ALLOWED: Record<string, MemberRole> = { 'draft>review': 'editeur', 'review>draft': 'administrateur', 'review>validated': 'administrateur', 'validated>archived': 'administrateur' };

export class MemoryBackend {
  events = new Map<string, RemoteEvent>();
  versions = new Map<string, RemoteVersion>();
  roles = new Map<string, MemberRole>(); // `${org}|${user}` -> rôle
  online = true;
  /** Applique la prochaine écriture de ce type puis simule une coupure avant la réponse (réponse perdue). */
  dropResponseOf: 'ensureEvent' | 'insertVersion' | 'updateVersion' | 'deleteVersion' | null = null;
  calls: string[] = [];
  private clock = 0;
  private tick = () => new Date(Date.UTC(2026, 10, 24, 12, 0, this.clock++)).toISOString();

  setRole(org: string, user: string, role: MemberRole) {
    this.roles.set(`${org}|${user}`, role);
  }
  private role(org: string, user: string): MemberRole | null {
    return this.roles.get(`${org}|${user}`) ?? null;
  }

  /** Client de l'API pour un utilisateur donné (comme un appareil connecté avec ce compte). */
  client(user: string): RemoteApi {
    const b = this;
    const gate = (name: string) => {
      b.calls.push(`${user}:${name}`);
      if (!b.online) throw new RemoteError('network', 'Failed to fetch');
    };
    const after = <T>(v: T, op?: MemoryBackend['dropResponseOf']): T => {
      if (op && b.dropResponseOf === op) {
        b.dropResponseOf = null;
        throw new RemoteError('network', 'Connexion coupée avant la réponse');
      }
      return clone(v);
    };
    const need = (org: string, min: MemberRole) => {
      const r = b.role(org, user);
      if (!r || ROLE_RANK[r] < ROLE_RANK[min]) throw new RemoteError('denied', 'new row violates row-level security policy', '42501');
    };
    const visible = (org: string) => !!b.role(org, user);
    return {
      async ensureEvent(org, e: { id: string; slug: string; name: string; origin: EventOrigin }) {
        gate('ensureEvent');
        need(org, 'lecteur');
        let found = [...b.events.values()].find((x) => x.organizationId === org && x.slug === e.slug);
        if (!found) {
          need(org, 'editeur');
          const at = b.tick();
          found = { id: e.id, organizationId: org, slug: e.slug, name: e.name, origin: e.origin, rowVersion: 1, createdAt: at, updatedAt: at };
          b.events.set(found.id, found);
        }
        return after(found, 'ensureEvent');
      },
      async insertVersion(org, v: { id: string; eventId: string; version: string; status: ConfigStatus; config: EventConfig }) {
        gate('insertVersion');
        const existing = b.versions.get(v.id);
        if (existing && visible(existing.organizationId)) return after(existing); // idempotence par identifiant
        need(org, ['draft', 'review'].includes(v.status) ? 'editeur' : 'administrateur');
        const ev = b.events.get(v.eventId);
        if (!ev || ev.organizationId !== org || v.config.id !== ev.slug) throw new RemoteError('invalid', 'config.id doit être le slug de l’événement', 'PT400');
        if (v.config.version !== v.version || v.config.status !== v.status) throw new RemoteError('invalid', 'config incohérente', '23514');
        if ([...b.versions.values()].some((x) => x.eventId === v.eventId && x.version === v.version)) throw new RemoteError('duplicate_version', 'duplicate key value violates unique constraint "event_versions_event_id_version_key"', '23505');
        const at = b.tick();
        const row: RemoteVersion = { id: v.id, organizationId: org, eventId: v.eventId, version: v.version, status: v.status, config: clone(v.config), rowVersion: 1, createdAt: at, updatedAt: at };
        b.versions.set(row.id, row);
        return after(row, 'insertVersion');
      },
      async updateVersion(id, patch: { status: ConfigStatus; config: EventConfig }, expected: number) {
        gate('updateVersion');
        const cur = b.versions.get(id);
        if (!cur || !visible(cur.organizationId)) throw new RemoteError('not_found', 'Version introuvable');
        const r = b.role(cur.organizationId, user)!;
        const editorScope = ROLE_RANK[r] >= ROLE_RANK.editeur && cur.status === 'draft';
        if (!editorScope && ROLE_RANK[r] < ROLE_RANK.administrateur) {
          // RLS : la ligne n'est pas modifiable par ce rôle (0 ligne) → expliqué comme dans remote-supabase.ts
          if (cur.rowVersion !== expected) throw new RemoteError('conflict', 'conflit_row_version', 'PT409');
          if (cur.status === 'validated' || cur.status === 'archived') throw new RemoteError('frozen', 'version_figee', 'PT423');
          throw new RemoteError('denied', 'Droits insuffisants', '42501');
        }
        if (cur.status === 'validated' || cur.status === 'archived') {
          const archiving = cur.status === 'validated' && patch.status === 'archived' && sameContent(cur.config, patch.config);
          if (!archiving) throw new RemoteError('frozen', 'version_figee : la version ne peut pas être modifiée', 'PT423');
        }
        if (cur.rowVersion !== expected) throw new RemoteError('conflict', 'conflit_row_version', 'PT409');
        if (patch.status !== cur.status) {
          const need2 = ALLOWED[`${cur.status}>${patch.status}`];
          if (!need2) throw new RemoteError('invalid', `transition_interdite : ${cur.status} -> ${patch.status}`, 'PT400');
          if (!sameContent(cur.config, patch.config)) throw new RemoteError('invalid', 'le contenu ne peut pas changer pendant une transition', 'PT400');
          if (ROLE_RANK[r] < ROLE_RANK[need2]) throw new RemoteError('denied', 'droits_insuffisants', '42501');
        } else if (cur.status !== 'draft' && !sameContent(cur.config, patch.config)) {
          throw new RemoteError('frozen', 'seul un brouillon est modifiable', 'PT423');
        }
        if (patch.config.status !== patch.status || patch.config.version !== cur.version) throw new RemoteError('invalid', 'config incohérente', '23514');
        const next: RemoteVersion = { ...cur, status: patch.status, config: clone(patch.config), rowVersion: cur.rowVersion + 1, updatedAt: b.tick() };
        b.versions.set(id, next);
        return after(next, 'updateVersion');
      },
      async deleteVersion(id, expected: number) {
        gate('deleteVersion');
        const cur = b.versions.get(id);
        if (!cur || !visible(cur.organizationId)) return after('absent' as const);
        if (cur.status === 'validated' || cur.status === 'archived') throw new RemoteError('frozen', 'version_figee', 'PT423');
        if (cur.rowVersion !== expected) throw new RemoteError('conflict', 'conflit_row_version', 'PT409');
        need(cur.organizationId, cur.status === 'draft' ? 'editeur' : 'administrateur');
        b.versions.delete(id);
        return after('deleted' as const, 'deleteVersion');
      },
      async deleteEvent(eventId) {
        gate('deleteEvent');
        const ev = b.events.get(eventId);
        if (!ev || !visible(ev.organizationId)) return after('absent' as const);
        need(ev.organizationId, 'editeur');
        const vs = [...b.versions.values()].filter((v) => v.eventId === eventId);
        if (vs.some((v) => v.status === 'validated' || v.status === 'archived')) throw new RemoteError('frozen', 'version_figee', 'PT423');
        vs.forEach((v) => b.versions.delete(v.id));
        b.events.delete(eventId);
        return after('deleted' as const);
      },
      async getVersion(id) {
        gate('getVersion');
        const cur = b.versions.get(id);
        return cur && visible(cur.organizationId) ? clone(cur) : null;
      },
      async listEvents(org) {
        gate('listEvents');
        return visible(org) ? clone([...b.events.values()].filter((e) => e.organizationId === org)) : [];
      },
      async listVersions(org) {
        gate('listVersions');
        return visible(org) ? clone([...b.versions.values()].filter((v) => v.organizationId === org)) : [];
      },
    };
  }
}
