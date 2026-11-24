# MOUNTASSIR AI GOVERNOR — Visual Experience Engine & AI Office

Couche de présentation du système de gouvernance IA : plusieurs interfaces graphiques interchangeables, alimentées par un même journal d'événements, les mêmes permissions et les mêmes commandes.

| Expérience | Rendu | Rôle |
|---|---|---|
| **Control Center** | DOM + SVG | Supervision analytique : tokens, coûts estimés/mesurés, économies, qualité, tâches, incidents, skills, connecteurs, GO / NO GO / TEST, avant/après optimisation |
| **AI Office** | SVG isométrique | Bureau virtuel : départements = pièces, agents LLM = personnages, scripts/services = consoles, animations pilotées par l'état réel |
| **AI System Map** | SVG isométrique | Cartographie technique : agents, modèles, fournisseurs, MCP, skills, files, bases ; flux réellement enregistrés ; mode technique |
| **AI Modular Office** | SVG isométrique | Plateformes par département, reliées, réorganisables, regroupées quand le système grandit |
| **Journal opérationnel** | DOM | 5e expérience ajoutée sans toucher au moteur : fil textuel accessible et sobre |

Autour : sélecteur de vue (contexte conservé), inspecteur d'agent, chronologie et replay synchronisé, centre GO / NO GO / TEST, galerie, Experience Studio, Custom Experience Builder, sources de données (dont l'import réel des sessions Claude Code), réglages de sobriété.

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
- [Audit critique et arbitrages GO / NO GO / TEST](docs/AUDIT.md)
