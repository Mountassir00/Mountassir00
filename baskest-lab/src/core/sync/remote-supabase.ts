// EVENT LAB v0.4 — implémentation Supabase (PostgREST) du contrat RemoteApi.
//
// STATUT : écrite d'après la documentation de supabase-js 2.119.0 et le schéma
// supabase/migrations/ ; NON TESTÉE contre un vrai projet Supabase (aucun projet n'existe
// encore). Les tests automatiques utilisent un faux serveur en mémoire
// (tests/sync/memory-backend.ts) qui applique les mêmes règles que le schéma SQL.
// Points à vérifier sur le projet réel : codes d'erreur renvoyés (PT409, PT423, 42501,
// 23505), pagination par défaut (1 000 lignes), comportement hors ligne de fetch.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConfigStatus, EventConfig } from '../eventlab';
import { RemoteError, type EventOrigin, type RemoteApi, type RemoteErrorKind, type RemoteEvent, type RemoteVersion } from './types';

interface PgError {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/** Traduit une erreur PostgREST / réseau en RemoteError (catégories du contrat). */
export function toRemoteError(error: PgError | null | undefined, status?: number): RemoteError {
  const code = error?.code ?? '';
  const msg = `${error?.message ?? ''} ${error?.details ?? ''}`.trim();
  const kind: RemoteErrorKind =
    status === 0 || /failed to fetch|networkerror|network request failed|load failed|fetch failed|econn|enotfound|timeout/i.test(msg)
      ? 'network'
      : status === 401 || /^PGRST30[0-9]$/.test(code) || /jwt/i.test(msg)
        ? 'auth'
        : code === 'PT409' || /conflit_row_version/.test(msg)
          ? 'conflict'
          : code === 'PT423' || /version_figee|seul un brouillon/.test(msg)
            ? 'frozen'
            : code === '42501' || status === 403
              ? 'denied'
              : code === '23505' && /event_versions_event_id_version_key/.test(msg)
                ? 'duplicate_version'
                : 'invalid';
  return new RemoteError(kind, error?.message || 'Erreur du serveur', code || undefined);
}

const EVENT_COLS = 'id, organization_id, slug, name, origin, row_version, created_at, updated_at';
const VERSION_COLS = 'id, organization_id, event_id, version, status, config, row_version, created_at, updated_at';

interface EventRow {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  origin: EventOrigin;
  row_version: number;
  created_at: string;
  updated_at: string;
}
interface VersionRow {
  id: string;
  organization_id: string;
  event_id: string;
  version: string;
  status: ConfigStatus;
  config: EventConfig;
  row_version: number;
  created_at: string;
  updated_at: string;
}

const ev = (r: EventRow): RemoteEvent => ({ id: r.id, organizationId: r.organization_id, slug: r.slug, name: r.name, origin: r.origin, rowVersion: r.row_version, createdAt: r.created_at, updatedAt: r.updated_at });
const ver = (r: VersionRow): RemoteVersion => ({ id: r.id, organizationId: r.organization_id, eventId: r.event_id, version: r.version, status: r.status, config: r.config, rowVersion: r.row_version, createdAt: r.created_at, updatedAt: r.updated_at });

const PAGE = 1000;

export class SupabaseRemoteApi implements RemoteApi {
  constructor(private db: SupabaseClient) {}

  /** Exécute une requête et lève une RemoteError, y compris quand fetch échoue (hors ligne). */
  private async run<T>(q: PromiseLike<{ data: T | null; error: PgError | null; status: number }>): Promise<T | null> {
    let res: { data: T | null; error: PgError | null; status: number };
    try {
      res = await q;
    } catch (e) {
      throw new RemoteError('network', e instanceof Error ? e.message : String(e));
    }
    if (res.error) throw toRemoteError(res.error, res.status);
    return res.data;
  }

  async ensureEvent(orgId: string, e: { id: string; slug: string; name: string; origin: EventOrigin }): Promise<RemoteEvent> {
    await this.run(this.db.from('events').upsert({ id: e.id, organization_id: orgId, slug: e.slug, name: e.name, origin: e.origin }, { onConflict: 'organization_id,slug', ignoreDuplicates: true }));
    const row = await this.run<EventRow>(this.db.from('events').select(EVENT_COLS).eq('organization_id', orgId).eq('slug', e.slug).maybeSingle());
    if (!row) throw new RemoteError('denied', 'Événement introuvable après création (droits insuffisants ?)');
    return ev(row);
  }

  async insertVersion(orgId: string, v: { id: string; eventId: string; version: string; status: ConfigStatus; config: EventConfig }): Promise<RemoteVersion> {
    try {
      const row = await this.run<VersionRow>(this.db.from('event_versions').insert({ id: v.id, organization_id: orgId, event_id: v.eventId, version: v.version, status: v.status, config: v.config }).select(VERSION_COLS).single());
      if (!row) throw new RemoteError('invalid', 'Réponse vide du serveur');
      return ver(row);
    } catch (e) {
      // Même identifiant déjà présent : c'est un rejeu de notre propre envoi (idempotence).
      if (e instanceof RemoteError && e.code === '23505' && e.kind !== 'duplicate_version') {
        const existing = await this.getVersion(v.id);
        if (existing) return existing;
      }
      throw e;
    }
  }

  async updateVersion(id: string, patch: { status: ConfigStatus; config: EventConfig }, expectedRowVersion: number): Promise<RemoteVersion> {
    const row = await this.run<VersionRow>(this.db.from('event_versions').update({ status: patch.status, config: patch.config, row_version: expectedRowVersion }).eq('id', id).select(VERSION_COLS).maybeSingle());
    if (row) return ver(row);
    throw await this.explainNoRow(id, expectedRowVersion);
  }

  async deleteVersion(id: string, expectedRowVersion: number): Promise<'deleted' | 'absent'> {
    const rows = await this.run<{ id: string }[]>(this.db.from('event_versions').delete().eq('id', id).eq('row_version', expectedRowVersion).select('id'));
    if (rows && rows.length) return 'deleted';
    const e = await this.explainNoRow(id, expectedRowVersion);
    if (e.kind === 'not_found') return 'absent';
    throw e;
  }

  async deleteEvent(eventId: string): Promise<'deleted' | 'absent'> {
    const rows = await this.run<{ id: string }[]>(this.db.from('events').delete().eq('id', eventId).select('id'));
    if (rows && rows.length) return 'deleted';
    const still = await this.run<{ id: string }>(this.db.from('events').select('id').eq('id', eventId).maybeSingle());
    if (still) throw new RemoteError('denied', 'Suppression de l’événement refusée');
    return 'absent';
  }

  async getVersion(id: string): Promise<RemoteVersion | null> {
    const row = await this.run<VersionRow>(this.db.from('event_versions').select(VERSION_COLS).eq('id', id).maybeSingle());
    return row ? ver(row) : null;
  }

  async listEvents(orgId: string): Promise<RemoteEvent[]> {
    const out: RemoteEvent[] = [];
    for (let from = 0; ; from += PAGE) {
      const rows = (await this.run<EventRow[]>(this.db.from('events').select(EVENT_COLS).eq('organization_id', orgId).order('id').range(from, from + PAGE - 1))) ?? [];
      out.push(...rows.map(ev));
      if (rows.length < PAGE) return out;
    }
  }

  async listVersions(orgId: string): Promise<RemoteVersion[]> {
    const out: RemoteVersion[] = [];
    for (let from = 0; ; from += PAGE) {
      const rows = (await this.run<VersionRow[]>(this.db.from('event_versions').select(VERSION_COLS).eq('organization_id', orgId).order('id').range(from, from + PAGE - 1))) ?? [];
      out.push(...rows.map(ver));
      if (rows.length < PAGE) return out;
    }
  }

  /** Aucune ligne touchée : absente, modifiée ailleurs, figée, ou masquée par les droits. */
  private async explainNoRow(id: string, expected: number): Promise<RemoteError> {
    const cur = await this.getVersion(id);
    if (!cur) return new RemoteError('not_found', 'Version introuvable sur le serveur');
    if (cur.rowVersion !== expected) return new RemoteError('conflict', `conflit_row_version : lue ${expected}, actuelle ${cur.rowVersion}`, 'PT409');
    if (cur.status === 'validated' || cur.status === 'archived') return new RemoteError('frozen', 'version_figee', 'PT423');
    return new RemoteError('denied', 'Droits insuffisants pour cette action', '42501');
  }
}
