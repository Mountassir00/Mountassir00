// EVENT LAB — données multisectorielles importées depuis event-lab/ (source unique, aucune copie).
// Les fichiers JSON sont lus à la compilation (imports JSON relatifs) : modifier event-lab/ suffit,
// l'application et les scripts lisent les mêmes fichiers.
import type { BuildingBlock, ErrorEntry, EventConfig, WatchCatalogSource } from '../core/eventlab/types';
import { unifyErrors, unifyWatchSources } from '../core/knowledge/unify';
import { ERROR_CASES } from './errors';
import { WATCH_SOURCES } from './watch-sources';

import grilleEvent from '../../../event-lab/blueprints/la-grille-3x3/event.json';
import { summary as grilleSummary, version as grilleSummaryVersion, generated_at as grilleSummaryDate } from '../../../event-lab/blueprints/la-grille-3x3/generated/summary.json';
import buildingBlocks from '../../../event-lab/knowledge/building-blocks.json';
import errorRegistry from '../../../event-lab/knowledge/registre-erreurs.json';
import watchCatalog from '../../../event-lab/knowledge/veille/sources.json';
import carreFest from '../../../event-lab/portfolio/concepts/carre-fest.json';
import coop12 from '../../../event-lab/portfolio/concepts/coop-12.json';
import genese from '../../../event-lab/portfolio/concepts/genese.json';
import horsBureau from '../../../event-lab/portfolio/concepts/hors-bureau.json';
import laGrille from '../../../event-lab/portfolio/concepts/la-grille-3x3.json';
import laJoute from '../../../event-lab/portfolio/concepts/la-joute.json';
import levelUpRun from '../../../event-lab/portfolio/concepts/level-up-run.json';
import padelRoyale from '../../../event-lab/portfolio/concepts/padel-royale.json';
import reparArene from '../../../event-lab/portfolio/concepts/repar-arene.json';
import silentArena from '../../../event-lab/portfolio/concepts/silent-arena.json';

/** Les JSON sont validés contre les schémas par `npm run eventlab:validate` ; le typage est donc une assertion. */
const as = <T,>(x: unknown) => x as T;

/** Blueprint LA GRILLE 3x3 (event-lab/blueprints/la-grille-3x3/event.json). */
export const GRILLE_BLUEPRINT = as<EventConfig>(grilleEvent);
/** Résumé chiffré publié avec le blueprint (generated/summary.json) : sert de contrôle d'égalité dans le studio. */
export const GRILLE_SUMMARY_REF = { version: grilleSummaryVersion as string, generatedAt: grilleSummaryDate as string, summary: grilleSummary };

/** Portefeuille multisectoriel : 10 concepts (event-lab/portfolio/concepts/*.json). */
export const PORTFOLIO = as<EventConfig[]>([carreFest, coop12, genese, horsBureau, laGrille, laJoute, levelUpRun, padelRoyale, reparArene, silentArena]);

/** Bibliothèque de 70 briques (event-lab/knowledge/building-blocks.json). */
export const BUILDING_BLOCKS = as<BuildingBlock[]>(buildingBlocks);

/** Registre EVENT LAB : 28 entrées (event-lab/knowledge/registre-erreurs.json). */
export const EL_ERRORS = as<ErrorEntry[]>(errorRegistry);

/** Catalogue de veille EVENT LAB : 70 sources (event-lab/knowledge/veille/sources.json). */
export const EL_WATCH_SOURCES = as<WatchCatalogSource[]>(watchCatalog);

/** Registre unique (45 cas BASK'EST + 28 fiches EVENT LAB, doublons fusionnés). */
export const UNIFIED_ERRORS = unifyErrors(ERROR_CASES, EL_ERRORS);

/** Catalogue de veille unique (50 + 70 sources), dédoublonné par domaine. */
export const UNIFIED_WATCH = unifyWatchSources(WATCH_SOURCES, EL_WATCH_SOURCES);

/** Chemins des fichiers sources, affichés dans l'interface pour la traçabilité. */
export const EVENTLAB_FILES = {
  blueprint: 'event-lab/blueprints/la-grille-3x3/event.json',
  summary: 'event-lab/blueprints/la-grille-3x3/generated/summary.json',
  portfolio: 'event-lab/portfolio/concepts/*.json',
  blocks: 'event-lab/knowledge/building-blocks.json',
  errors: 'event-lab/knowledge/registre-erreurs.json',
  watch: 'event-lab/knowledge/veille/sources.json',
};
