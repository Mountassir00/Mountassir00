// EVENT LAB v0.4 — configuration du serveur (Supabase) et chargement paresseux du client.
//
// Sans VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (fichier .env, voir .env.example),
// l'application reste en MODE LOCAL, exactement comme en v0.3 : le client Supabase n'est
// jamais chargé et aucune requête réseau n'est faite. La démo en un fichier (build:demo)
// est toujours en mode local, même si un .env existe.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccountApi } from '../core/sync/account-supabase';
import type { RemoteApi } from '../core/sync/types';

export interface BackendConfig {
  url: string;
  anonKey: string;
  host: string;
}

function readConfig(): BackendConfig | null {
  // En mode démo, la constante est remplacée à la construction : le reste est éliminé du paquet.
  if (import.meta.env.MODE === 'demo') return null;
  const url = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anonKey) return null;
  try {
    const u = new URL(url);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return null;
    return { url: u.origin, anonKey, host: u.host };
  } catch {
    return null;
  }
}

export const backendConfig: BackendConfig | null = readConfig();

let clientPromise: Promise<SupabaseClient> | null = null;

/** Client Supabase, créé au premier besoin (import dynamique : absent du mode local). */
export function getClient(): Promise<SupabaseClient> | null {
  // Constante remplacée à la construction : en mode démo, l'import dynamique ci-dessous est retiré du paquet.
  if (import.meta.env.MODE === 'demo') return null;
  if (!backendConfig) return null;
  if (!clientPromise) {
    const cfg = backendConfig;
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(cfg.url, cfg.anonKey, {
        auth: {
          // PKCE : le lien e-mail revient avec ?code=… (compatible avec la navigation par #/route)
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'baskest-lab:eventlab:session',
        },
      }),
    );
  }
  return clientPromise;
}

export async function loadAccountApi(): Promise<AccountApi | null> {
  if (import.meta.env.MODE === 'demo') return null;
  const p = getClient();
  if (!p) return null;
  const [db, mod] = await Promise.all([p, import('../core/sync/account-supabase')]);
  return new mod.SupabaseAccountApi(db);
}

export async function loadRemoteApi(): Promise<RemoteApi | null> {
  if (import.meta.env.MODE === 'demo') return null;
  const p = getClient();
  if (!p) return null;
  const [db, mod] = await Promise.all([p, import('../core/sync/remote-supabase')]);
  return new mod.SupabaseRemoteApi(db);
}

/** Adresse de retour du lien e-mail : la page de l'application, sans la partie #/route. */
export function redirectUrl(): string {
  try {
    return `${window.location.origin}${window.location.pathname}`;
  } catch {
    return '';
  }
}
