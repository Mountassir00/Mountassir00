import type { Catalog } from '../catalog';
import type { OperationsPort } from '../commands';
import type { DataNature, GovEvent } from '../events/schema';

/**
 * A data source feeds the store with events and a catalog. Sources declare
 * what they can and cannot observe, so the UI can state visibility limits
 * instead of filling gaps.
 */
export interface DataSource {
  id: string;
  label: string;
  kind: 'demo' | 'claude-code-import' | 'anthropic-usage-api' | 'otel' | 'custom';
  defaultNature: DataNature;
  capabilities: {
    live: boolean;
    commands: boolean;
    history: boolean;
  };
  visibility: {
    observable: string[];
    notObservable: string[];
  };
  catalog(): Catalog;
  load(now: number): Promise<GovEvent[]>;
  /** Push-based live updates (no polling). Returns an unsubscribe function. */
  subscribe?(push: (events: GovEvent[]) => void): () => void;
  operations?: OperationsPort;
}

/** Sources that are designed but need the operational backend to run. */
export interface PlannedSource {
  id: string;
  label: string;
  status: 'requires-backend' | 'planned';
  why: string;
  observable: string[];
  notObservable: string[];
}

export const PLANNED_SOURCES: PlannedSource[] = [
  {
    id: 'anthropic-usage-api',
    label: 'API Usage & Cost d’Anthropic',
    status: 'requires-backend',
    why: "Nécessite une clé d'administration : elle ne doit jamais être stockée dans le navigateur. À brancher sur le moteur opérationnel (serveur).",
    observable: ['Tokens par modèle, jour et clé API', 'Coûts facturés (dépense vérifiée)', 'Activité par espace de travail'],
    notObservable: ['Contenu des requêtes', 'Activité claude.ai (web, mobile, bureau)'],
  },
  {
    id: 'claude-code-otel',
    label: 'Télémétrie OpenTelemetry de Claude Code',
    status: 'requires-backend',
    why: 'Claude Code exporte métriques et événements via OTLP : il faut un collecteur (serveur) qui relaie vers le journal d’événements.',
    observable: ['Sessions, tokens, coûts estimés par Claude Code', 'Décisions d’outils et permissions', 'Durées d’API'],
    notObservable: ['Raisonnement interne des modèles'],
  },
  {
    id: 'claude-ai-apps',
    label: 'claude.ai (web, bureau, mobile)',
    status: 'planned',
    why: "Aucune API publique ne fournit l'activité détaillée des conversations claude.ai d’un compte individuel. Seule une saisie manuelle ou un export est envisageable.",
    observable: [],
    notObservable: ['Tokens', 'Coûts par conversation', 'Outils utilisés'],
  },
  {
    id: 'other-providers',
    label: 'Autres fournisseurs IA',
    status: 'planned',
    why: 'Chaque fournisseur expose (ou non) une API d’usage. Adaptateurs à écrire fournisseur par fournisseur.',
    observable: ['Selon le fournisseur'],
    notObservable: ['Selon le fournisseur'],
  },
];
