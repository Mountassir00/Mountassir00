# BASK'EST LAB — Basketball Event Intelligence & Innovation System

Le laboratoire de recherche et développement événementiel de **Bask'Est**, association de basket créée à Nancy le 19 octobre 2024 (SIREN 940 128 069). Il sert à créer, tester, améliorer, documenter et dupliquer des formats d'événements de basketball, de l'idée jusqu'au dossier complet.

## Démarrer

```bash
cd baskest-lab
npm install
npm run dev          # dashboard sur http://localhost:5173
npm test             # 31 tests des moteurs
npm run blueprint    # régénère le Blueprint phare (MD, HTML, PDF, JSON, SVG, PNG)
npm run exports      # Word, Excel (budget modifiable), PowerPoint, kit opérationnel
npm run build:demo   # dashboard en un seul fichier HTML (dist-demo/index.html)
```

Prérequis : Node 20+, Python 3 avec `python-docx`, `openpyxl`, `python-pptx` pour les exports Office, Chromium/Playwright pour le PDF et les PNG.

## Ce qui est livré

| # | Livrable demandé | Où | Statut |
|---|---|---|---|
| 1 | Architecture complète | [docs/01-architecture.md](docs/01-architecture.md) | Fait |
| 2 | Cahier des charges fonctionnel | [docs/02-cahier-des-charges.md](docs/02-cahier-des-charges.md) | Fait |
| 3 | Modèle de données | [docs/03-modele-de-donnees.md](docs/03-modele-de-donnees.md), [src/core/model.ts](src/core/model.ts), [db/schema.sql](db/schema.sql) | Fait (schéma validé sur PostgreSQL 16) |
| 4 | Maquettes UX/UI | [docs/04-maquettes-ux-ui.md](docs/04-maquettes-ux-ui.md) + l'application | Fait |
| 5 | Stratégie de veille | [docs/06-strategie-veille.md](docs/06-strategie-veille.md) | Fait (collecte automatique = intégration) |
| 6 | Moteur de génération de concepts | [src/core/generator](src/core/generator), [docs/08-moteur-generation.md](docs/08-moteur-generation.md) | Opérationnel |
| 7 | Moteur de simulation sportive | [src/core/simulation](src/core/simulation), [docs/05-moteur-simulation.md](docs/05-moteur-simulation.md) | Opérationnel |
| 8 | Configurateur d'infrastructures | [src/core/venue](src/core/venue), [docs/09-configurateur-infrastructures.md](docs/09-configurateur-infrastructures.md) | Opérationnel (relevés réels à fournir) |
| 9 | Système de notation | [src/core/scoring](src/core/scoring), [docs/10-systeme-notation.md](docs/10-systeme-notation.md) | Opérationnel |
| 10 | Modèles de dossiers événementiels | [src/core/blueprint](src/core/blueprint), [docs/11-modeles-dossiers.md](docs/11-modeles-dossiers.md) | Opérationnel |
| 11 | Stratégie d'intégration à l'écosystème | [docs/12-integration-ecosysteme.md](docs/12-integration-ecosysteme.md), [src/core/integration](src/core/integration) | Contrats prêts, branchements à faire |
| 12 | Roadmap de développement | [docs/16-roadmap.md](docs/16-roadmap.md) | Fait |
| 13 | Audit des événements existants | [docs/13-audit-evenements-existants.md](docs/13-audit-evenements-existants.md) | Fait sur données publiques (partielles) |
| 14 | 10 formats atypiques | [docs/15-nouveaux-formats.md](docs/15-nouveaux-formats.md), [src/data/concepts.ts](src/data/concepts.ts) | Documentés et simulés |
| 15 | 10 innovations immédiates | [docs/14-dix-innovations-immediates.md](docs/14-dix-innovations-immediates.md) | Fait |
| 16 | 3 concepts à budget limité | [docs/15-nouveaux-formats.md](docs/15-nouveaux-formats.md) | Documentés et simulés |
| 17 | 3 concepts pour un palais des sports | [docs/15-nouveaux-formats.md](docs/15-nouveaux-formats.md) | Documentés et simulés |
| 18 | Premier BASK'EST EVENT BLUEPRINT complet | [docs/blueprints/asg-grand-est-2027/](docs/blueprints/asg-grand-est-2027/) | Fait : PDF, Word, Excel, PowerPoint, kit opérationnel, 10 visuels |

Compléments : observatoire des erreurs ([docs/07](docs/07-observatoire-erreurs.md)), recherche sourcée ([docs/research/](docs/research/)) : données publiques Bask'Est et salles de Nancy (R1), benchmark mondial 2025-2026 (R2), cadre réglementaire et financements (R3).

## Le dashboard (19 modules)

Pilotage (tableau de bord, notation, projets et calendrier, analyse post-événement) · Veille (tendances, veille basket et multisport, innovations, erreurs) · Création (générateur, laboratoire, studio) · Simulation (salles, sportif, financier, programmation) · Production (bibliothèque des dossiers) · Écosystème (intégrations et validations, notifications, collaboratif). Statut de chaque module : [docs/01-architecture.md §5](docs/01-architecture.md).

## Règles du système

- **Faits ≠ hypothèses** : chaque donnée externe est marquée vérifiée, probable, estimation, hypothèse ou non trouvée, avec sa source.
- **Privé par défaut** ; aucune publication, dépense, commande ou réservation sans validation explicite.
- **Sécurité, équité et conformité** sont des conditions préalables, indépendantes de la note /100.
- **Maturité sur preuves** : un concept n'est jamais présenté comme « format validé » sans éditions réussies.
- Informations juridiques, fiscales et réglementaires : information générale, pas un conseil personnalisé ; voir les points de vigilance et les experts à consulter dans R3.

## Données manquantes (à fournir par l'association)

Affluence, recettes et dépenses de l'All Star Game Grand Est 2026 ; dates, lieux et résultats des Bask'Cup ; existence et règlement d'une édition de King of the Court ; partenaires et conventions ; bénévoles mobilisés ; statistiques digitales ; retours et incidents. Liste priorisée : module « Tableau de bord » ou [src/data/baskest-events.ts](src/data/baskest-events.ts) (`DATA_REQUESTS`).
