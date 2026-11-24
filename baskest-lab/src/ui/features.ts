import type { FeatureStatus } from '../core/model';
import { ERROR_CASES } from '../data/errors';
import { WATCH_SOURCES } from '../data/watch-sources';
import { BUILDING_BLOCKS, EL_ERRORS, EL_WATCH_SOURCES, PORTFOLIO, UNIFIED_ERRORS, UNIFIED_WATCH } from '../data/eventlab';
import { DESIGN_RULES } from '../core/rules/design-rules';

/**
 * Registre des modules d'EVENT LAB et de leur statut réel (exigence §23) :
 * - operationnel : fonctionne de bout en bout dans l'outil, sans service externe ;
 * - prototype : fonctionne mais sur des données saisies/locales ou avec des limites connues ;
 * - integration : nécessite de brancher un service externe (API, base partagée, planificateur).
 * Source de vérité de la matrice de baskest-lab/docs/16-roadmap.md §1.
 */
export type Space = 'commun' | 'basket' | 'multi';
export type Group = 'Commun' | 'Pilotage' | 'Veille' | 'Création' | 'Simulation' | 'Production' | 'Écosystème' | 'Multisectoriel';

export interface Feature {
  route: string;
  label: string;
  space: Space;
  group: Group;
  status: FeatureStatus;
  note: string;
}

const mergedBk = UNIFIED_ERRORS.reduce((s, u) => s + (u.el && u.bk.length ? u.bk.length : 0), 0);
const mergedEl = UNIFIED_ERRORS.filter((u) => u.el && u.bk.length).length;

export const FEATURES: Feature[] = [
  // ------------------------------------------------------------------ Commun aux deux espaces
  { route: 'accueil', label: 'Tableau de bord', space: 'commun', group: 'Commun', status: 'operationnel', note: 'Vue d’ensemble des deux espaces : dossier phare basket, blueprint et portefeuille multisectoriels, état réel des modules.' },
  { route: 'erreurs', label: 'Registre des erreurs', space: 'commun', group: 'Commun', status: 'operationnel', note: `Registre unique : ${ERROR_CASES.length} cas BASK’EST + ${EL_ERRORS.length} fiches EVENT LAB = ${UNIFIED_ERRORS.length} entrées (${mergedEl} fiches EVENT LAB fusionnées avec ${mergedBk} cas BASK’EST, sources conservées) ; ${DESIGN_RULES.length} règles appliquées automatiquement aux concepts basket.` },
  { route: 'veille', label: 'Veille et sources', space: 'commun', group: 'Commun', status: 'prototype', note: `Catalogue unique de ${WATCH_SOURCES.length + EL_WATCH_SOURCES.length} sources (${WATCH_SOURCES.length} BASK’EST + ${EL_WATCH_SOURCES.length} EVENT LAB) dédoublonné en ${UNIFIED_WATCH.length} domaines ; signaux saisis à la main. Collecte automatique (RSS, API) et synthèses planifiées = intégration (v0.4).` },
  { route: 'application', label: 'Application mobile (PWA)', space: 'commun', group: 'Commun', status: 'prototype', note: 'Installable depuis le navigateur (manifeste, icônes, service worker hors ligne) quand l’application est servie en HTTPS ; non testée sur appareils physiques ; enveloppe magasin Android/iOS préparée mais non réalisée.' },
  { route: 'compte', label: 'Compte et organisation', space: 'commun', group: 'Commun', status: 'integration', note: 'Socle SaaS v0.4 : connexion (lien e-mail, mot de passe), organisations, rôles, invitations, suppression du compte, synchronisation hors ligne d’abord. Schéma et règles RLS testés sur PostgreSQL local avec une simulation de l’authentification, synchronisation testée avec un faux serveur ; jamais testé contre un vrai projet Supabase (aucun n’est configuré). Sans serveur : mode local, comme en v0.3.' },

  // ------------------------------------------------------------------ Espace Basket — Bask'Est
  { route: 'notation', label: 'Tableau de notation', space: 'basket', group: 'Pilotage', status: 'operationnel', note: 'Note /100, portes sécurité/équité/conformité, maturité, surcharge jury motivée.' },
  { route: 'projets', label: 'Projets et calendrier', space: 'basket', group: 'Pilotage', status: 'prototype', note: 'Projets, rétroplanning, calendrier interconnecté et versions — stockés dans ce navigateur.' },
  { route: 'post-evenement', label: 'Analyse post-événement', space: 'basket', group: 'Pilotage', status: 'operationnel', note: 'Objectifs vs réalisé, priorités ; complétude des données des éditions.' },

  { route: 'tendances', label: 'Observatoire des tendances', space: 'basket', group: 'Veille', status: 'prototype', note: 'Tendances et signaux issus du benchmark ; ajout manuel de signaux avec score de pertinence. Collecte automatique = intégration.' },
  { route: 'innovations', label: 'Bibliothèque des innovations', space: 'basket', group: 'Veille', status: 'operationnel', note: 'Matrice de transposition intersectorielle (52 innovations, filtres).' },

  { route: 'generateur', label: 'Générateur de concepts', space: 'basket', group: 'Création', status: 'operationnel', note: 'Brief → concepts simulés, planifiés, budgétés, implantés et notés.' },
  { route: 'labo', label: 'Laboratoire créatif', space: 'basket', group: 'Création', status: 'operationnel', note: 'Mutations contrôlées et comparaison A/B en simulation.' },
  { route: 'studio', label: 'Studio de design', space: 'basket', group: 'Création', status: 'prototype', note: 'Maquettes SVG (logo, affiche, maillot, billet, accréditation, réseaux, écran) — à finaliser par un graphiste.' },

  { route: 'salles', label: 'Configurateur de salles', space: 'basket', group: 'Simulation', status: 'operationnel', note: 'Plans 2D, variantes, capacité, évacuation et PMR indicatifs, vue 3D simplifiée.' },
  { route: 'simulateur-sportif', label: 'Simulateur sportif', space: 'basket', group: 'Simulation', status: 'operationnel', note: 'Monte-Carlo : équité, suspense, durée, stratégies dominantes, manipulation.' },
  { route: 'simulateur-financier', label: 'Simulateur financier', space: 'basket', group: 'Simulation', status: 'operationnel', note: '3 scénarios, point mort, trésorerie, nature des recettes.' },
  { route: 'programmation', label: 'Programmation sportive', space: 'basket', group: 'Simulation', status: 'operationnel', note: 'Planning terrains/arbitres, conflits, replanification ; publication = intégration avec validation.' },

  { route: 'dossiers', label: 'Bibliothèque des dossiers', space: 'basket', group: 'Production', status: 'operationnel', note: 'BASK’EST EVENT BLUEPRINT (HTML, Markdown, JSON) ; Word/Excel/PowerPoint/PDF via scripts.' },

  { route: 'ecosysteme', label: 'Intégrations et validations', space: 'basket', group: 'Écosystème', status: 'integration', note: 'Connecteurs site, admin, billetterie, CRM, compta, réseaux — mode simulation avec approbation obligatoire.' },
  { route: 'notifications', label: 'Notifications', space: 'basket', group: 'Écosystème', status: 'prototype', note: 'Alertes locales générées par les moteurs ; push/e-mail = intégration.' },
  { route: 'collaboratif', label: 'Espaces collaboratifs', space: 'basket', group: 'Écosystème', status: 'integration', note: 'Rôles, membres, invitations et versions partagées : socle v0.4 (page Compte et organisation), dépend d’un projet Supabase non encore créé. Commentaires et partage des projets basket : non réalisés.' },

  // ------------------------------------------------------------------ Espace Multisectoriel (moteur EVENT LAB)
  { route: 'portefeuille', label: 'Portefeuille multisectoriel', space: 'multi', group: 'Multisectoriel', status: 'operationnel', note: `${PORTFOLIO.length} concepts EVENT LAB notés par le moteur (score recalculé, jamais saisi) ; évaluations prévisionnelles, confiance 0,30 à 0,37 ; ajouts du générateur conservés dans l’espace actif (ce navigateur en mode local, l’organisation si connecté).` },
  { route: 'studio-config', label: 'Studio de configuration', space: 'multi', group: 'Multisectoriel', status: 'prototype', note: 'LA GRILLE 3x3 et les concepts : variantes, scénarios, trésorerie, sensibilité, compétition, flux et incidents recalculés en direct ; versions enregistrées dans l’espace actif (mode local : ce navigateur ; organisation : synchronisées hors ligne d’abord, ce qui dépend d’une intégration Supabase non vérifiée) ; version validée immuable dans l’application comme sur le serveur.' },
  { route: 'generateur-multi', label: 'Générateur multisectoriel', space: 'multi', group: 'Multisectoriel', status: 'prototype', note: `Brief → 6 directions sur ${BUILDING_BLOCKS.length} briques, tirage reproductible, pré-notes automatiques à revoir. Non implémentés : contrôles de cohérence (07 §2.6), couche rédactionnelle (07 §2.9).` },
  { route: 'briques', label: 'Bibliothèque de briques', space: 'multi', group: 'Multisectoriel', status: 'operationnel', note: `${BUILDING_BLOCKS.length} briques (logiques transposables, jamais des marques) avec exigences, attributs, compatibilités et note de propriété intellectuelle.` },
];

export const SPACES: { id: Space; label: string; sub: string; groups: Group[] }[] = [
  { id: 'commun', label: 'Commun', sub: 'Tableau de bord, connaissances partagées', groups: ['Commun'] },
  { id: 'basket', label: 'Basket — Bask’Est', sub: 'Verticale basket (Nancy)', groups: ['Pilotage', 'Veille', 'Création', 'Simulation', 'Production', 'Écosystème'] },
  { id: 'multi', label: 'Multisectoriel', sub: 'Moteur EVENT LAB', groups: ['Multisectoriel'] },
];

/** Ordre des groupes (conservé pour compatibilité). */
export const GROUPS: Group[] = SPACES.flatMap((s) => s.groups);
export const feature = (route: string) => FEATURES.find((f) => f.route === route)!;
