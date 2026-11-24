// EVENT LAB v0.4 — état applicatif des données : espace actif (local ou organisation),
// session, synchronisation. Les pages lisent et écrivent les versions par useRepo().
//
// Mode local (aucun serveur configuré, ou choix de l'utilisateur) : espace « local »,
// identique à la v0.3 (données dans ce navigateur, rien n'est envoyé). Les données de la
// v0.3 y sont reprises au premier lancement (src/core/sync/migrate-v03.ts).
import { useSyncExternalStore } from 'react';
import {
  LocalRepository,
  MemoryKv,
  STORE_PREFIX,
  SyncEngine,
  browserKv,
  migrateV03,
  orgWorkspace,
  workspaceOrg,
  type MigrationReport,
  type SyncReport,
  type WorkspaceId,
  type MemberRole,
} from '../core/sync';
import type { AccountApi, AccountSession, MembershipInfo } from '../core/sync/account-supabase';
import { backendConfig, loadAccountApi, loadRemoteApi } from './backend';

const ACTIVE_ORG_KEY = 'baskest-lab:eventlab:organisation-active';
const PREFER_LOCAL_KEY = 'baskest-lab:eventlab:mode-local';

const browser = browserKv();
const kv = browser ?? new MemoryKv();

export interface AppState {
  configured: boolean;
  host: string | null;
  /** Session lue (ou mode local sans serveur). */
  authReady: boolean;
  session: AccountSession | null;
  memberships: MembershipInfo[];
  activeOrgId: string | null;
  /** L'utilisateur a choisi de rester en mode local malgré un serveur configuré. */
  preferLocal: boolean;
  online: boolean;
  syncing: boolean;
  lastReport: SyncReport | null;
  migration: MigrationReport | null;
  storageAvailable: boolean;
  /** Message d'erreur du lien e-mail (retour ?error=…) ou de l'initialisation. */
  authError: string | null;
  rev: number;
}

const readPref = <T>(k: string, d: T): T => {
  try {
    const raw = kv.getItem(k);
    return raw ? (JSON.parse(raw) as T) : d;
  } catch {
    return d;
  }
};
const writePref = (k: string, v: unknown) => {
  try {
    if (v == null) kv.removeItem(k);
    else kv.setItem(k, JSON.stringify(v));
  } catch {
    /* préférence non enregistrée : sans conséquence */
  }
};

let state: AppState = {
  configured: !!backendConfig,
  host: backendConfig?.host ?? null,
  authReady: !backendConfig,
  session: null,
  memberships: [],
  activeOrgId: readPref<string | null>(ACTIVE_ORG_KEY, null),
  preferLocal: readPref<boolean>(PREFER_LOCAL_KEY, false),
  online: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  syncing: false,
  lastReport: null,
  migration: null,
  storageAvailable: !!browser,
  authError: null,
  rev: 0,
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch, rev: state.rev + 1 };
  emit();
}
export const getState = () => state;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ------------------------------------------------------------------ dépôts par espace
const repos = new Map<WorkspaceId, LocalRepository>();
export function repoFor(w: WorkspaceId): LocalRepository {
  let r = repos.get(w);
  if (!r) {
    r = new LocalRepository(kv, w);
    r.subscribe(() => setState({}));
    repos.set(w, r);
  }
  return r;
}

export function activeWorkspace(s: AppState = state): WorkspaceId {
  if (s.configured && s.session && s.activeOrgId && !s.preferLocal && s.memberships.some((m) => m.organizationId === s.activeOrgId)) return orgWorkspace(s.activeOrgId);
  return 'local';
}
export function activeMembership(s: AppState = state): MembershipInfo | null {
  const org = workspaceOrg(activeWorkspace(s));
  return org ? (s.memberships.find((m) => m.organizationId === org) ?? null) : null;
}
/** Rôle effectif dans l'espace actif ; en mode local, l'utilisateur a tous les droits sur ses données. */
export function activeRole(s: AppState = state): MemberRole {
  return activeMembership(s)?.role ?? 'proprietaire';
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}
/** Dépôt de l'espace actif ; la page se met à jour à chaque modification ou synchronisation. */
export function useRepo(): { repo: LocalRepository; app: AppState; workspace: WorkspaceId; role: MemberRole } {
  const app = useApp();
  const workspace = activeWorkspace(app);
  return { repo: repoFor(workspace), app, workspace, role: activeRole(app) };
}

// ------------------------------------------------------------------ synchronisation
const engines = new Map<string, SyncEngine>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;

export async function syncNow(): Promise<SyncReport | null> {
  const w = activeWorkspace();
  const org = workspaceOrg(w);
  if (!org || !state.session) return null;
  if (!state.online) {
    setState({ lastReport: { sent: 0, remaining: repoFor(w).pendingCount(), conflicts: 0, rejected: 0, pulled: false, offline: true, error: null } });
    return null;
  }
  let engine = engines.get(org);
  if (!engine) {
    const remote = await loadRemoteApi();
    if (!remote) return null;
    engine = new SyncEngine(repoFor(w), remote);
    engines.set(org, engine);
  }
  setState({ syncing: true });
  try {
    const report = await engine.sync();
    setState({ syncing: false, lastReport: report });
    return report;
  } catch (e) {
    setState({ syncing: false, lastReport: { sent: 0, remaining: repoFor(w).pendingCount(), conflicts: 0, rejected: 0, pulled: false, offline: false, error: e instanceof Error ? e.message : String(e) } });
    return null;
  }
}
/** Synchronisation différée (regroupe les modifications rapprochées). */
export function requestSync(delay = 600) {
  if (!workspaceOrg(activeWorkspace())) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncNow();
  }, delay);
}

// ------------------------------------------------------------------ compte
let account: AccountApi | null = null;
export async function getAccount(): Promise<AccountApi | null> {
  if (!account) account = await loadAccountApi();
  return account;
}

export async function refreshMemberships(): Promise<void> {
  const a = await getAccount();
  if (!a || !state.session) return setState({ memberships: [] });
  try {
    const memberships = await a.myMemberships();
    let activeOrgId = state.activeOrgId;
    if (!activeOrgId || !memberships.some((m) => m.organizationId === activeOrgId)) activeOrgId = memberships[0]?.organizationId ?? null;
    writePref(ACTIVE_ORG_KEY, activeOrgId);
    setState({ memberships, activeOrgId });
    requestSync(0);
  } catch {
    /* hors ligne : on garde la dernière liste connue */
  }
}

export function setActiveOrg(orgId: string | null) {
  writePref(ACTIVE_ORG_KEY, orgId);
  setState({ activeOrgId: orgId, preferLocal: false });
  writePref(PREFER_LOCAL_KEY, false);
  requestSync(0);
}
export function setPreferLocal(v: boolean) {
  writePref(PREFER_LOCAL_KEY, v);
  setState({ preferLocal: v });
  if (!v) requestSync(0);
}

/** Efface de cet appareil les copies des espaces d'organisation (pas l'espace local). */
export function forgetOrganizationsOnDevice() {
  for (const k of kv.keys()) if (k.startsWith(`${STORE_PREFIX}org:`)) kv.removeItem(k);
  repos.forEach((r, w) => {
    if (w !== 'local') r.reload();
  });
  engines.clear();
}

export function afterSignOut(clearDevice: boolean) {
  if (clearDevice) forgetOrganizationsOnDevice();
  engines.clear();
  setState({ session: null, memberships: [] });
}

// ------------------------------------------------------------------ démarrage
let started = false;
export function initWorkspace() {
  if (started) return;
  started = true;
  // 1. Reprise des données de la v0.3 dans l'espace local (avant le premier affichage)
  try {
    setState({ migration: migrateV03(kv, repoFor('local')) });
  } catch {
    /* jamais bloquant */
  }
  // 2. Réseau et autres onglets
  try {
    window.addEventListener('online', () => {
      setState({ online: true });
      requestSync(0);
    });
    window.addEventListener('offline', () => setState({ online: false }));
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith(STORE_PREFIX)) repos.forEach((r) => r.reload());
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') requestSync(0);
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') requestSync(0);
    }, 60_000);
  } catch {
    /* environnement sans fenêtre */
  }
  // 3. Session (seulement si un serveur est configuré)
  if (!backendConfig) return;
  const params = new URLSearchParams(window.location.search);
  const urlError = params.get('error_description') || params.get('error');
  void (async () => {
    try {
      const a = await getAccount();
      if (!a) return;
      const session = await a.getSession();
      a.onChange((s) => {
        const changed = s?.userId !== state.session?.userId;
        setState({ session: s });
        if (changed) void refreshMemberships();
      });
      setState({ session, authReady: true, authError: urlError ? `Lien de connexion refusé : ${urlError}` : null });
      if (params.has('code') || urlError) {
        // Retour du lien e-mail : on nettoie l'adresse et on affiche la page du compte
        window.history.replaceState(null, '', `${window.location.pathname}#/compte`);
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      if (session) await refreshMemberships();
    } catch (e) {
      setState({ authReady: true, authError: e instanceof Error ? e.message : String(e) });
    }
  })();
}
