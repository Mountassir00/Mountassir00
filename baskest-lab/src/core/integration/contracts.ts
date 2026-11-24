import type { ApprovalRequest, Concept, FeatureStatus, Project, Schedule } from '../model';
import type { ScenarioResult } from '../model';

/**
 * Contrats d'intégration avec l'écosystème digital Bask'Est (exigence §20).
 * Chaque connecteur est une interface : l'implémentation réelle dépend des
 * outils choisis par l'association (site, billetterie, CRM, comptabilité…).
 * Règle d'or : aucune publication, dépense, commande, réservation ou
 * modification opérationnelle sensible sans approbation explicite.
 */

export interface Connector<TIn, TOut = void> {
  id: string;
  label: string;
  status: FeatureStatus;
  sensitive: boolean;
  send(payload: TIn, approval?: ApprovalRequest): Promise<TOut>;
}

export interface WebsitePublication {
  slug: string;
  title: string;
  html: string;
  schedule?: ReturnType<typeof import('../scheduler/scheduler').publicationPayload>;
}

export interface AdminProjectHandoff {
  project: Project;
  concept: Concept;
  budget: ScenarioResult;
  registrations: { teams: number; fee: number; closesDaysBefore: number };
  staffing: { volunteers: number; roles: string[] };
  communication: { launchDay: number; channels: string[] };
}

export class ApprovalRequiredError extends Error {
  constructor(public readonly action: ApprovalRequest['action']) {
    super(`Action « ${action} » : approbation requise avant exécution.`);
  }
}

/** Garde-fou commun à tous les connecteurs sensibles. */
export function requireApproval(action: ApprovalRequest['action'], approval?: ApprovalRequest) {
  if (!approval || approval.status !== 'approuve' || approval.action !== action) throw new ApprovalRequiredError(action);
}

/** Connecteur "bac à sable" : prépare la charge utile sans rien envoyer (mode par défaut). */
export function dryRunConnector<T>(id: string, label: string, sensitive: boolean): Connector<T, { preview: T }> {
  return {
    id,
    label,
    status: 'integration',
    sensitive,
    async send(payload, approval) {
      if (sensitive) requireApproval('publication', approval);
      return { preview: payload };
    },
  };
}

export const CONNECTORS = {
  site: dryRunConnector<WebsitePublication>('site', 'Site officiel Bask’Est', true),
  admin: dryRunConnector<AdminProjectHandoff>('admin', 'Dashboard administratif', true),
  screens: dryRunConnector<Schedule>('screens', 'Écrans de l’événement', true),
  ticketing: dryRunConnector<{ eventId: string; prices: { label: string; price: number }[] }>('ticketing', 'Billetterie (HelloAsso / Billetweb)', true),
  crm: dryRunConnector<{ partners: string[] }>('crm', 'CRM partenaires', false),
  accounting: dryRunConnector<{ budgetId: string; lines: unknown[] }>('accounting', 'Comptabilité', true),
  social: dryRunConnector<{ platform: string; caption: string; media?: string }>('social', 'Réseaux sociaux', true),
  results: dryRunConnector<{ matches: unknown[] }>('results', 'Base de résultats', false),
};
