# EVENT LAB

Système de recherche et développement événementiel : veille internationale, analyse des réussites et des échecs, innovation intersectorielle, génération et notation de concepts, simulation, et production de dossiers **EVENT BLUEPRINT** exécutables par une équipe tierce.

> Statut : en construction. Voir [CHANGELOG.md](CHANGELOG.md) pour l'état exact de chaque version.

## Arborescence

| Dossier | Contenu |
|---|---|
| `docs/` | Spécifications (cahier des charges, architecture, modèle de données, UX, workflows, veille, algorithmes, modèles documentaires, roadmap, coûts) |
| `schemas/` | Schémas JSON des objets métier (configuration d'événement, fiche de veille, erreur, notation) |
| `knowledge/` | Base de connaissances : briques fonctionnelles, registre des erreurs, fiches de veille |
| `portfolio/` | Portefeuille de concepts originaux notés |
| `blueprints/` | Dossiers EVENT BLUEPRINT complets (sources, exports, tableaux, visuels) |
| `app/` | Application MVP (web statique, sans serveur) |
| `scripts/` | Outils : versionnement, génération des exports |
| `archives/` | Versions figées (zip + empreintes SHA-256) |

## Versionnement

Chaque version est documentée, archivée et étiquetée avant de poursuivre : `scripts/release.sh X.Y.Z "Titre"`.
