import type { FeatureStatus } from '../core/model';

/**
 * Registre des modules du dashboard et de leur statut réel (exigence §23) :
 * - operationnel : fonctionne de bout en bout dans l'outil, sans service externe ;
 * - prototype : fonctionne mais sur des données saisies/locales ou avec des limites connues ;
 * - integration : nécessite de brancher un service externe (API, base partagée, planificateur).
 */
export interface Feature {
  route: string;
  label: string;
  group: 'Pilotage' | 'Veille' | 'Création' | 'Simulation' | 'Production' | 'Écosystème';
  status: FeatureStatus;
  note: string;
}

export const FEATURES: Feature[] = [
  { route: 'accueil', label: 'Tableau de bord', group: 'Pilotage', status: 'operationnel', note: 'Vue d’ensemble, concepts, alertes.' },
  { route: 'notation', label: 'Tableau de notation', group: 'Pilotage', status: 'operationnel', note: 'Note /100, portes sécurité/équité/conformité, maturité, surcharge jury motivée.' },
  { route: 'projets', label: 'Projets et calendrier', group: 'Pilotage', status: 'prototype', note: 'Projets, rétroplanning, calendrier interconnecté et versions — stockés dans ce navigateur.' },
  { route: 'post-evenement', label: 'Analyse post-événement', group: 'Pilotage', status: 'operationnel', note: 'Objectifs vs réalisé, priorités ; complétude des données des éditions.' },

  { route: 'tendances', label: 'Observatoire des tendances', group: 'Veille', status: 'prototype', note: 'Tendances et signaux issus du benchmark ; ajout manuel de signaux avec score de pertinence. Collecte automatique = intégration.' },
  { route: 'veille', label: 'Veille basket et multisport', group: 'Veille', status: 'prototype', note: '50 sources qualifiées, cadence ; ingestion RSS/API et synthèses planifiées = intégration.' },
  { route: 'innovations', label: 'Bibliothèque des innovations', group: 'Veille', status: 'operationnel', note: 'Matrice de transposition intersectorielle (52 innovations, filtres).' },
  { route: 'erreurs', label: 'Registre des erreurs', group: 'Veille', status: 'operationnel', note: '45 cas, 20 catégories, converties en 26 règles appliquées automatiquement.' },

  { route: 'generateur', label: 'Générateur de concepts', group: 'Création', status: 'operationnel', note: 'Brief → concepts simulés, planifiés, budgétés, implantés et notés.' },
  { route: 'labo', label: 'Laboratoire créatif', group: 'Création', status: 'operationnel', note: 'Mutations contrôlées et comparaison A/B en simulation.' },
  { route: 'studio', label: 'Studio de design', group: 'Création', status: 'prototype', note: 'Maquettes SVG (logo, affiche, maillot, billet, accréditation, réseaux, écran) — à finaliser par un graphiste.' },

  { route: 'salles', label: 'Configurateur de salles', group: 'Simulation', status: 'operationnel', note: 'Plans 2D, variantes, capacité, évacuation et PMR indicatifs, vue 3D simplifiée.' },
  { route: 'simulateur-sportif', label: 'Simulateur sportif', group: 'Simulation', status: 'operationnel', note: 'Monte-Carlo : équité, suspense, durée, stratégies dominantes, manipulation.' },
  { route: 'simulateur-financier', label: 'Simulateur financier', group: 'Simulation', status: 'operationnel', note: '3 scénarios, point mort, trésorerie, nature des recettes.' },
  { route: 'programmation', label: 'Programmation sportive', group: 'Simulation', status: 'operationnel', note: 'Planning terrains/arbitres, conflits, replanification ; publication = intégration avec validation.' },

  { route: 'dossiers', label: 'Bibliothèque des dossiers', group: 'Production', status: 'operationnel', note: 'BASK’EST EVENT BLUEPRINT (HTML, Markdown, JSON) ; Word/Excel/PowerPoint/PDF via scripts.' },

  { route: 'ecosysteme', label: 'Intégrations et validations', group: 'Écosystème', status: 'integration', note: 'Connecteurs site, admin, billetterie, CRM, compta, réseaux — mode simulation avec approbation obligatoire.' },
  { route: 'notifications', label: 'Notifications', group: 'Écosystème', status: 'prototype', note: 'Alertes locales générées par les moteurs ; push/e-mail = intégration.' },
  { route: 'collaboratif', label: 'Espaces collaboratifs', group: 'Écosystème', status: 'integration', note: 'Commentaires, rôles et partage nécessitent une base partagée (ex. Supabase, schéma fourni).' },
];

export const GROUPS: Feature['group'][] = ['Pilotage', 'Veille', 'Création', 'Simulation', 'Production', 'Écosystème'];
export const feature = (route: string) => FEATURES.find((f) => f.route === route)!;
