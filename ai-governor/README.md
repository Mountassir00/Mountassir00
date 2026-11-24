# MOUNTASSIR AI GOVERNOR — Visual Experience Engine & AI Office

Couche de présentation du système de gouvernance IA : plusieurs interfaces graphiques interchangeables, alimentées par un même journal d'événements, les mêmes permissions et les mêmes commandes.

21 présentations, rangées par famille dans le lanceur (touche **G**). Ajouter un dossier `src/experiences/<id>/` avec son `manifest.ts` ajoute une vue ; supprimer le dossier la retire.

| Famille | Vue | Rendu | Rôle |
|---|---|---|---|
| Tableaux de bord | **Control Center** | DOM + SVG | Supervision analytique : tokens, coûts estimés/mesurés, économies, qualité, incidents, GO / NO GO / TEST, avant/après |
| | **Journal opérationnel** | DOM | Fil textuel accessible et sobre |
| | **Équipe d’agents** | DOM | Statut de chaque agent d’un coup d’œil (tâche, modèle, consommation) |
| | **Vision** | DOM | Fenêtres de verre flottantes : commandes du jour, flux, activité, agents, notifications |
| | **Boucle d’équipe** | SVG | L’organisation en boucle autour de vous et du Gouverneur |
| | **Brief du matin** | DOM | Ce qui s’est passé, ce qui attend, ce qui coûte |
| Espaces de travail | **Espace spatial** | WebGL + DOM | IDE spatial : explorateur, scène 3D, terminal, revue des propositions |
| Scènes 3D | **Bureau 3D** | WebGL | Pièce fermée, robots placés selon leur tâche réelle, menu radial, fiches d’objet |
| | **QG 3D** | WebGL | Bâtiment explorable (une aile par pôle), salon, salle de réunion, visite au clavier ou au doigt |
| | **Constellation** / **Sphère réseau** | Canvas 2D (projection 3D) | Particules et nœuds : l’activité réelle comme un ciel |
| Scènes 2D | **AI Office** | SVG isométrique | Bureau virtuel : départements = pièces, agents = personnages animés selon l’état réel |
| | **AI System Map** | SVG isométrique | Cartographie technique : agents, modèles, fournisseurs, MCP, skills, flux enregistrés |
| | **AI Modular Office** / **Hub central** | SVG isométrique | Plateformes par département, en grille ou en anneau autour de la direction |
| | **Siège** | SVG isométrique | Immeuble de nuit, un étage par pôle, fenêtres allumées selon le statut réel |
| Outils | **Kanban des tâches** | DOM | Tâches réelles en colonnes, fiche détaillée |
| | **Boîte de réception** | DOM | Propositions à arbitrer présentées comme une revue, historique, autopilote |
| | **Tableau blanc** | SVG + DOM | Diagrammes générés depuis les données, notes, formes |
| | **Assistant** | DOM | Questions en langage courant, réponses calculées localement (aucun appel à un LLM) |
| | **Éditeur spatial** | WebGL | Disposition de l’espace : brouillon, validation, publication vers les vues 3D |

Autour : lanceur et favoris (contexte conservé à chaque bascule), inspecteur d'agent, chronologie et replay synchronisé, centre GO / NO GO / TEST, galerie, Experience Studio, Custom Experience Builder, sources de données (dont l'import réel des sessions Claude Code), réglages de sobriété.

## Démarrer

```bash
cd ai-governor
npm install           # .npmrc active legacy-peer-deps (contournement d'un bug npm 10.9)
npm run dev           # http://localhost:5173
npm run check         # types + tests unitaires + build
npm run build && npm run test:e2e   # bascule, perf, accessibilité, mobile
```

Les données affichées par défaut sont **des données de démonstration** (bandeau permanent). Pour des données réelles : *Données → Connecter Claude Code*, puis déposer les fichiers `~/.claude/projects/<projet>/*.jsonl` (lus localement, contenu ignoré).

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — couches, flux de données, replay, garanties de bascule, choix de rendu, sobriété
- [Architecture UX et wireframes](docs/UX_ARCHITECTURE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Schéma d'événements](docs/EVENT_SCHEMA.md)
- [Sources de données et limites de visibilité](docs/DATA_SOURCES.md)
- [Créer une nouvelle expérience](docs/CREATING_AN_EXPERIENCE.md)
- [Tests de performance et d'accessibilité](docs/TESTING.md)
- [Captures des 21 vues](docs/SCREENS.md)
- [Audit critique et arbitrages GO / NO GO / TEST](docs/AUDIT.md)
