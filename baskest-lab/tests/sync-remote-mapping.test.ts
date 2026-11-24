// v0.4 — traduction des erreurs PostgREST / réseau en catégories du contrat RemoteApi.
// Les formes d'erreur viennent de la documentation de supabase-js / PostgREST ; elles restent
// à confirmer sur un vrai projet (event-lab/docs/14-socle-saas.md §9).
import { toRemoteError } from '../src/core/sync/remote-supabase';

test.each([
  [{ message: 'TypeError: Failed to fetch', code: '' }, 0, 'network'],
  [{ message: 'JWT expired', code: 'PGRST301' }, 401, 'auth'],
  [{ message: 'conflit_row_version : event_versions a changé (version lue 1, version actuelle 2)', code: 'PT409' }, 409, 'conflict'],
  [{ message: 'version_figee : la version 1.0.0 de « x » est validated, elle ne peut pas être modifiée', code: 'PT423' }, 423, 'frozen'],
  [{ message: 'new row violates row-level security policy for table "event_versions"', code: '42501' }, 403, 'denied'],
  [{ message: 'duplicate key value violates unique constraint "event_versions_event_id_version_key"', code: '23505' }, 409, 'duplicate_version'],
  [{ message: 'duplicate key value violates unique constraint "event_versions_pkey"', code: '23505' }, 409, 'invalid'],
  [{ message: 'transition_interdite : draft -> validated', code: 'PT400' }, 400, 'invalid'],
] as const)('%o (HTTP %i) → %s', (err, status, kind) => {
  const e = toRemoteError(err, status);
  expect(e.kind).toBe(kind);
  expect(e.message).toBe(err.message);
});
