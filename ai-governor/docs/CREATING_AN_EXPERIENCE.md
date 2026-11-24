# Créer une nouvelle expérience visuelle

Deux catégories, à identifier avant tout développement (le *Custom Experience Builder* fait ce tri automatiquement à partir des références).

| | Catégorie A — nouveau thème | Catégorie B — nouvelle expérience |
|---|---|---|
| Quoi | Couleurs, typographie, fond, formes, densité, paramètres graphiques d'un moteur existant | Nouveaux composants, nouvelle disposition ou nouveau moteur de rendu |
| Comment | Experience Studio ou Builder → **variante** (données pures) | Un dossier de code (découvert automatiquement), installé par revue de code |
| Code | Aucun | Oui (TypeScript/React) |
| Import/export | Fichier JSON validé (variantes, thèmes) | Jamais par fichier : uniquement via le dépôt |
| Publication | Brouillon → « Valider » dans la galerie | Revue de code + validation GO / NO GO / TEST |

## Catégorie B en 6 étapes

### 1. Créer le dossier

```
src/experiences/ma-vue/
  manifest.ts      export const definitions: ExperienceDefinition[]   (étape 4)
  MaVue.tsx        export default function MaVue(props: ExperienceProps)
  ma-vue.css       styles préfixés (.mv-…)
```

Imports autorisés : `react`, `@sdk`, `@ds`, `@ds/<sous-module>` (ex. `@ds/three` pour les scènes 3D), et les fichiers du dossier ; `manifest.ts` peut en plus importer `../thumbs` (aides `wrap`, `box`, `placeholder` pour dessiner la vignette). Le test `architecture boundaries` échoue sinon.

### 2. Lire les données (lecture seule)

```tsx
import { useGovernor, useCatalogIndex, recentFlows, type ExperienceProps } from '@sdk';

export default function MaVue({ host, config, quality, device }: ExperienceProps) {
  const g = useGovernor();          // état projeté (direct ou replay), catalogue, période, filtres, sélection
  const idx = useCatalogIndex();    // index agents / départements / nœuds
  const events = g.rangeEvents();   // événements de la période, filtres appliqués
  const flows = recentFlows(g.windowEvents(g.now - 600_000, g.now), g.now, 600_000);
  // …
}
```

- `g.state.agents[id].status` est **le seul** pilote légitime d'une animation d'agent.
- `g.mode === 'replay'` : afficher l'état passé, ne proposer aucune action.
- `g.hasDemo` / `nature` des événements : toujours montrer la nature des données (`<NatureBadge>`).

### 3. Interagir via `host`

```tsx
host.select({ kind: 'agent', id });            // ouvre l'inspecteur, persiste entre les vues
host.request({ type: 'task.pause', taskId }, 'click'); // passe par permissions + confirmation
host.openDecisions();                          // centre GO / NO GO / TEST
host.setLocal('order', ids);                   // préférences propres à la vue
host.announce('Plateforme déplacée');           // lecteur d'écran
```

Ne jamais déclencher `host.request` depuis un glisser, un double-clic ou un geste : la passerelle refuse toute dépense ou modification durable issue d'une interaction ambiguë.

### 4. Déclarer le manifeste

Dans `src/experiences/ma-vue/manifest.ts` (aucune autre inscription : `src/experiences/index.ts` découvre tout dossier qui contient un `manifest.ts`). Un même dossier peut déclarer plusieurs vues qui partagent le code (ex. `modular-office` déclare la grille et le hub via le paramètre `arrangement`).

```ts
import type { ExperienceDefinition } from '@sdk';
import { wrap, box } from '../thumbs';

export const definitions: ExperienceDefinition[] = [{
  manifest: {
    id: 'ma-vue', name: 'Ma vue', description: '…', version: '0.1.0',
    family: 'workspace',                    // dashboard | workspace | scene-3d | scene-2d | tool : groupe du lanceur
    thumbnail: wrap(box(…)),                // SVG statique (affiché via <img>, aucun script possible)
    renderer: 'svg',                        // dom | svg | canvas2d | webgl
    status: 'prototype',
    graphics: [                             // paramètres exposés au Studio, validés et bornés
      { type: 'number', key: 'gap', label: 'Espacement', default: 2, min: 1, max: 4, step: 0.5, group: 'Disposition' },
    ],
    components: ['IsoBox', 'ZoomPan'],
    layout: { kind: 'scene', zoomPan: true, minimap: true, minWidth: 320 }, // kind: grid | scene | list | workspace ; immersive: true masque la chronologie
    accessibility: { keyboard: true, screenReaderSummary: true, reducedMotion: 'full', contrast: 'AA' },
    dependencies: { sdk: '^1.0.0', libraries: [] },
    performance: { cost: 'medium', maxNodes: 300, targetFps: 30, animated: true },
    devices: { desktop: 'full', tablet: 'full', mobile: 'adapted', fallbackId: 'ledger' },
    createdAt: '2026-11-24',
  },
  load: () => import('./MaVue'),            // chunk séparé, chargé seulement si la vue est active
}];
```

Rien d'autre à modifier : le lanceur (touche G), la galerie, le studio, l'inspecteur, la chronologie, la recherche et les tests de bout en bout prennent la vue en compte automatiquement. L'ordre par défaut est la liste `ORDER` de `src/experiences/index.ts` (les dossiers absents de la liste suivent par ordre alphabétique).

**Retirer une vue** : la désactiver dans la Galerie (réversible, par utilisateur) ou supprimer son dossier (définitif ; aucune autre ligne à toucher). Les favoris et préférences qui la mentionnaient sont ignorés au chargement suivant.

**Commandes de vue** : `host.provideCommands([...])` ajoute des actions propres à la vue dans la recherche (Ctrl K) ; elles disparaissent quand on change de vue.

### 5. Respecter la sobriété

**Scènes 3D.** Three.js n'est accessible que par le kit `@ds/three` (`import { THREE, ThreeStage, … } from '@ds/three'`) ; importer `three` directement fait échouer le test de frontières. Le kit rend **à la demande** (`stage.invalidate()`), plafonne le ratio de pixels et les images/s selon la qualité, coupe ombres et carte d'environnement en `minimal`/`eco`, s'arrête quand l'onglet est masqué et affiche un repli si WebGL manque. Mode d'emploi complet : `src/design-system/three/README.md`. La disposition de l'espace (`useSpatialLayout(host)`) est partagée entre l'Espace spatial, le Bureau 3D, le QG 3D et l'Éditeur spatial ; elle est réactive : une modification dans l'éditeur apparaît aussitôt dans les autres vues. Pour toute autre donnée de présentation partagée : `useShared(host, clé, défaut)`.

**Horloge partagée.** `useAnimationFrame` ne tourne qu'aux niveaux `subtle` (standard, 30 i/s max) et `ambient` (élevé, 60 i/s max), et seulement tant qu'une vue y est abonnée. À `subtle`, n'animez que des indicateurs d'état et des flux réels ; réservez les mouvements décoratifs (corps, rotation lente) à `ambient`.

- Pas de boucle `requestAnimationFrame` propre : animations CSS (gouvernées par `html[data-motion]`, suspendues par `html[data-anim=paused]`) ou `useAnimationFrame` (horloge partagée et plafonnée).
- Respecter `quality.level` (`minimal` = aucune animation, formes simplifiées).
- Mémoïser la disposition sur le catalogue et la configuration ; ne re-rendre que ce qui dépend de l'état.

### 6. Vérifier

```bash
npm run check        # types + tests unitaires (dont frontières) + build
npm run test:e2e     # bascule, contexte, perf, accessibilité (axe), mobile
```

Critères d'acceptation : aucune violation axe grave, bascule < 400 ms, aucune erreur JS, pas de défilement horizontal sur mobile, résumé accessible pour lecteur d'écran.

## Sécurité des expériences externes

- Un fichier importé ne peut contenir que des **données** déclaratives validées (schéma strict, couleurs littérales, polices d'une liste fermée, bornes numériques). Contenu exécutable, `url(…)`, `@import`, gestionnaires d'événements : refusés.
- Les variantes importées arrivent **en brouillon** et doivent être validées.
- Une expérience avec du code s'installe par le dépôt (revue de code, tests, build), jamais à l'exécution.
