# MOUNTASSIR AI GOVERNOR — Visual Experience Engine & AI Office

Couche de présentation du système de gouvernance IA : plusieurs interfaces graphiques interchangeables, alimentées par un même journal d'événements, les mêmes permissions et les mêmes commandes.

5 présentations, celles retenues en favori. Ajouter un dossier `src/experiences/<id>/` avec son `manifest.ts` ajoute une vue ; supprimer le dossier la retire (les 16 autres vues construites restent dans la branche `archive/ai-governor-v0.3`, voir `docs/AUDIT.md`, A13).

| Vue | Rendu | Rôle |
|---|---|---|
| **Control Center** (touche 1) | DOM + SVG | Supervision analytique : tokens, coûts estimés/mesurés, économies, qualité, incidents, GO / NO GO / TEST, avant/après |
| **Espace spatial** (touche 2) | WebGL + DOM | IDE spatial : explorateur, scène 3D, terminal, revue des propositions |
| **Kanban des tâches** (touche 3) | DOM | Tâches réelles en colonnes, fiche détaillée |
| **AI Office** (touche 4) | SVG isométrique | Bureau virtuel : départements = pièces, agents = personnages animés selon l’état réel |
| **AI System Map** (touche 5) | SVG isométrique | Cartographie technique : agents, modèles, fournisseurs, MCP, skills, flux enregistrés |

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
- [Captures des 5 vues](docs/SCREENS.md)
- [Audit critique et arbitrages GO / NO GO / TEST](docs/AUDIT.md)
