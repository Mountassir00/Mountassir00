// Indicateur discret de synchronisation, dans la coquille (barre latérale et barre mobile).
import { activeMembership, activeWorkspace, repoFor, useApp, type AppState } from './workspace';

export type SyncTone = 'local' | 'ok' | 'wait' | 'off' | 'alert';

export function syncSummary(app: AppState): { tone: SyncTone; label: string; detail: string } {
  const w = activeWorkspace(app);
  if (w === 'local') {
    const why = !app.configured
      ? 'aucun serveur configuré'
      : !app.authReady
        ? 'lecture de la session…'
        : !app.session
          ? 'non connecté'
          : app.preferLocal
            ? 'choisi par vous'
            : 'aucune organisation choisie';
    return { tone: 'local', label: 'Mode local', detail: `Données sur cet appareil uniquement (${why}).` };
  }
  const repo = repoFor(w);
  const pending = repo.pendingCount();
  const alerts = repo.unseenAlerts().length;
  const org = activeMembership(app)?.organizationName ?? 'organisation';
  if (alerts) return { tone: 'alert', label: alerts > 1 ? `${alerts} alertes` : '1 alerte', detail: `${org} : ${alerts} alerte(s) de synchronisation à examiner (conflit, refus ou renumérotation).` };
  if (!app.online || app.lastReport?.offline) return { tone: 'off', label: pending ? `Hors ligne · ${pending}` : 'Hors ligne', detail: `${org} : serveur injoignable ; ${pending} modification(s) en attente sur cet appareil, envoyées au retour du réseau.` };
  if (app.syncing) return { tone: 'wait', label: 'Synchronisation…', detail: `${org} : envoi et lecture en cours.` };
  if (pending) return { tone: 'wait', label: `${pending} en attente`, detail: `${org} : ${pending} modification(s) pas encore envoyée(s).` };
  const at = repo.data.lastSyncAt;
  return { tone: 'ok', label: 'Synchronisé', detail: `${org} : à jour${at ? ` (dernière synchronisation ${new Date(at).toLocaleString('fr-FR')})` : ''}.` };
}

export function SyncIndicator({ compact = false }: { compact?: boolean }) {
  const app = useApp();
  const s = syncSummary(app);
  return (
    <a className={`sync-pill ${s.tone}${compact ? ' compact' : ''}`} href="#/compte" title={s.detail} aria-label={`Synchronisation : ${s.label}. ${s.detail} Ouvrir Compte et organisation.`}>
      <i aria-hidden="true" />
      <span className={compact ? 'sr-only' : undefined}>{s.label}</span>
    </a>
  );
}
