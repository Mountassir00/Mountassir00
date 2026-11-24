# EVENT LAB

Studio de recherche et développement événementiel, multisectoriel : veille internationale, analyse des réussites et des échecs, innovation par transposition de briques entre secteurs, génération et notation de concepts, simulation, et production de dossiers **EVENT BLUEPRINT** exécutables par une équipe tierce.

> Statut : en construction. L'état exact de chaque version (opérationnel, simulé, externe requis) est dans [CHANGELOG.md](CHANGELOG.md).

## Livrables

| # | Livrable (brief §18) | Où | Version |
|---|---|---|---|
| 1 | Cahier des charges fonctionnel | [docs/01](docs/01-cahier-des-charges.md) | 0.1.0 |
| 2 | Architecture technique | [docs/02](docs/02-architecture-technique.md) | 0.1.0 |
| 3 | Modèle de données | [docs/03](docs/03-modele-de-donnees.md), [schemas/](schemas/) | 0.1.0 |
| 4 | Maquettes UX/UI | [docs/04](docs/04-maquettes-ux-ui.md) | 0.1.0 |
| 5 | Workflows utilisateurs | [docs/05](docs/05-workflows-utilisateurs.md) | 0.1.0 |
| 6 | Système de veille | [docs/06](docs/06-systeme-de-veille.md), [knowledge/veille/](knowledge/veille/) | 0.1.0 |
| 7 | Algorithmes de génération et d'évaluation | [docs/07](docs/07-algorithmes.md) | 0.1.0 |
| 8 | Modèles documentaires | [docs/08](docs/08-modeles-documentaires.md), [templates/](templates/) | 0.1.0 |
| 9 | Roadmap MVP, V1, V2 | [docs/09](docs/09-roadmap.md) | 0.1.0 |
| 10 | Coûts de développement et d'exploitation | [docs/10](docs/10-couts.md) | 0.1.0 |
| 11 | Portefeuille de dix concepts | [portfolio/](portfolio/README.md) | 0.2.0 |
| 12 | Premier EVENT BLUEPRINT (LA GRILLE 3x3) | [blueprints/la-grille-3x3/](blueprints/la-grille-3x3/README.md) | 0.2.0 |
| — | Moteur TypeScript (notation, simulations, générateur) + 28 tests portés + tests de non-régression | [baskest-lab/src/core/eventlab/](../baskest-lab/src/core/eventlab/) | 0.3.0 |
| — | Application EVENT LAB (espaces Basket — Bask'Est et Multisectoriel) | [baskest-lab/](../baskest-lab/README.md) | 0.3.0 |
| — | Démo hors ligne en un seul fichier | [baskest-lab/docs/demo/event-lab-demo.html](../baskest-lab/docs/demo/event-lab-demo.html) | 0.3.0 |
| — | Fusion, plan du pilote LA GRILLE, SaaS et mobile | [docs/11](docs/11-fusion-et-application.md), [docs/12](docs/12-plan-pilote-la-grille-nancy.md), [docs/13](docs/13-saas-et-mobile.md) | 0.3.0 |
| — | Registre de 28 erreurs, 70 briques | [knowledge/](knowledge/) | 0.2.0 |
| — | Socle SaaS : comptes, organisations, rôles, synchronisation hors ligne d'abord des événements et versions ; schéma Supabase en migrations, tests SQL locaux, graine des connaissances (non testé contre un vrai projet Supabase) | [docs/14](docs/14-socle-saas.md), [baskest-lab/supabase/](../baskest-lab/supabase/migrations/) | 0.4.0 |

## Arborescence

| Dossier | Contenu |
|---|---|
| `docs/` | Spécifications et brief d'origine |
| `schemas/` | Schémas JSON des objets métier |
| `templates/` | Modèles de documents, CSV et checklists prêts à l'emploi |
| `knowledge/` | Base de connaissances : veille (sources, fiches), briques, registre des erreurs |
| `portfolio/` | Portefeuille de concepts notés |
| `blueprints/` | Dossiers EVENT BLUEPRINT (configuration, documents, exports) |
| `../baskest-lab/` | Application EVENT LAB et moteur TypeScript (`src/core/eventlab/`) ; l'ancien dossier `app/` (moteur JavaScript) est retiré en v0.3, le renommage du dossier applicatif est reporté (docs/11 §2) |
| `scripts/` | Outils : versionnement, génération et exports |
| `archives/` | Versions figées (zip + empreintes SHA-256) |

## Commandes

Le moteur est en TypeScript (`baskest-lab/src/core/eventlab/`) ; les scripts `scripts/*.ts` s'exécutent avec `tsx` depuis `baskest-lab/` (`npm ci` une fois) :

```bash
cd ../baskest-lab
npx vitest run                                                   # tests (application + moteur EVENT LAB + non-régression du blueprint)
npm run eventlab:validate                                        # validation des JSON contre les schémas
npm run eventlab:blueprint -- ../event-lab/blueprints/la-grille-3x3   # tableaux, summary.json, CSV, BLUEPRINT.md
npm run db:seed:generate                                         # graine SQL des connaissances (supabase/seed.sql) depuis knowledge/ et portfolio/
npm run db:test                                                  # schéma SaaS v0.4 sur un PostgreSQL local jetable (simulation de l'authentification Supabase)
```

## Versionnement

Chaque version est documentée dans le journal, archivée et étiquetée avant de poursuivre : `scripts/release.sh X.Y.Z "Titre"`.
