# Design system

## Direction (v0.2, d'après les références fournies)

Interface « application » douce et ergonomique, inspirée des 5 références transmises (applications bancaires et tableaux de bord mobiles, menu latéral repliable) :

- **Fond gris très doux, cartes blanches très arrondies** (20 px ; contrôles en pilule), ombres légères, presque aucun trait.
- **Sélection noire** (blanche en thème sombre) : onglet actif, élément de menu actif, période choisie, bouton principal. **Violet** comme signal (graphiques, focus, liens), vert/rouge réservés aux variations et statuts.
- **Chiffre héros** en gras, **actions rapides** en boutons ronds légendés, **pastilles de variation** (+12 %).
- **Barres arrondies hachurées** avec la barre active pleine et sa valeur en bulle ; **anneau** à segments arrondis ; barres de progression.
- **Menu latéral** repliable (icônes seules ↔ menu complet) avec groupes dépliables, compteurs et sous-éléments ; **capsule de navigation flottante** sur mobile ; **tiroirs** flottants qui deviennent des **feuilles glissantes** (à tirer vers le bas pour fermer) sur téléphone.
- **Dynamique sobre** : pastille glissante des contrôles segmentés, fondu entre vues, nombres qui s'animent au changement, barres qui poussent à l'affichage — tout est désactivé en mode minimaliste ou « réduire les animations ».

### Thèmes intégrés

| Thème | Usage | Fond | Cartes | Sélection | Signal |
|---|---|---|---|---|---|
| **Lumière** (défaut clair) | quotidien | `#ECECEF` | `#FFFFFF` | noir `#111114` | violet `#7B3FE4` |
| **Onyx** (défaut sombre) | soir, OLED | `#050506` | `#151517` | blanc | violet `#A47BFF` |
| **Nexus** | sombre vert translucide (réf. 4) | `#0B1310` + halo | verre flouté | menthe `#46C08F` | menthe |
| Plan d'atelier, Atelier de nuit, Contraste élevé | direction précédente et accessibilité | | | | |

Séries de graphiques validées (daltonisme, contraste) : clair `#7B3FE4 · #D99A00 · #14A06F · #2E7CF6`, sombre `#9A6BFF · #C98500 · #199E70 · #3987E5`.

Typographie : **Plus Jakarta Sans** (interface et chiffres, graisses 400–800), Archivo condensé pour la marque, IBM Plex Mono pour le code.

---

## Direction précédente (v0.1) — « Plan d'atelier »

Une identité propre, née du sujet : un **plan technique** de votre organisation IA. Papier millimétré bleuté, encre marine, contours fins, volumes isométriques pastel, et un **cartouche** — comme sur un dessin industriel — qui dit ce que montre la feuille : quelle vue, quel moment, quelle nature de données.

## Jetons

Tous les jetons sont des variables CSS injectées par le moteur de thèmes (`src/engine/themes.ts`). Un thème est une **donnée validée** : jamais de CSS libre.

| Rôle | Plan d'atelier (clair) | Atelier de nuit (sombre) | Usage |
|---|---|---|---|
| `--c-paper` | `#EEF2F5` | `#0F1A2E` | Fond, scènes |
| `--c-raised` | `#FBFCFD` | `#16243D` | Panneaux, cartes |
| `--c-ink` | `#16203A` | `#E7EDF6` | Texte, contours (encre marine, pas un noir teinté) |
| `--c-ink-muted` | `#5A6580` | `#8F9DB4` | Texte secondaire (≥ 4,5:1) |
| `--c-line` | `#BFC9D6` | `#2E3F5E` | Traits fins |
| `--c-grid` / `--c-grid-major` | `#DDE4EB` / `#CBD5DF` | `#172640` / `#1F3152` | Papier millimétré (pas 24 px, majeur ×5) |
| `--c-accent` | `#3A3FD4` (outremer) | `#8C93FF` | Sélection, focus, action principale |
| `--p1…p8` | menthe, ciel, lilas, abricot, beurre, rose, sauge, eau | versions profondes | Sols des départements |

Troisième thème intégré : **Contraste élevé** (AAA visé). Le Studio contrôle les contrastes (encre/fond, encre discrète/panneau, texte/accent) et avertit sous 4,5:1.

### Couleurs à rôle réservé
- **Statuts d'agent** (`--st-*`) : au travail (bleu), en attente (ambre), collaboration (violet), recherche (sarcelle), validation (vert), erreur (rouge), suspendu, disponible, hors ligne. Toujours accompagnés d'un **pictogramme** et d'un libellé.
- **Nature des données** (`--nat-*`) : codée par **forme** — rond plein (mesuré), rond pointillé (estimé), carré hachuré (démo), rond barré (indisponible).
- **Séries de graphiques** (`--series-1…4`) : palette catégorielle validée (daltonisme : ΔE adjacent ≥ 9,1 en clair, 8,4 en sombre). Contraste < 3:1 de deux teintes en clair ⇒ légende + vue tableau systématiques.

## Typographie

- **Archivo** (variable, largeur 62–125 %, graisse 100–900), auto-hébergée. La largeur sert de hiérarchie : titres et cartouche en largeur réduite (78–92 %), texte courant en largeur normale.
- **IBM Plex Mono** uniquement pour ce qui est réellement du code (identifiants, références de résultat).
- Échelle ≈ tierce mineure depuis 14 px : 0,76 · 0,86 · 0,98 · 1,14 · 1,38 · 1,95 rem. Chiffres tabulaires partout où l'on compare.
- Pas de capitales décoratives : casse de phrase.

## Composants partagés (`src/design-system`)

| Famille | Composants |
|---|---|
| Primitives | `NatureBadge`, `StatusPill`, `Panel`, `Segmented`, `Dialog` (piège de focus), `Notice`, `Meter`, `Sparkline`, `CostDots` |
| Graphiques | `StackedColumns`, `LineArea`, `HBars`, `BeforeAfterBars`, `Legend` — un seul axe, marques fines, infobulle au survol |
| Isométrique | `iso()`, `IsoBox`, `IsoTile`, `IsoFloor`, `IsoBackWalls`, mobilier (`Desk`, `MeetingTable`, `Whiteboard`, `ServerRack`, `Cylinder`, `LabBench`, `Antenna`, `Gauge`, `Shield`, `Shelf`, `RouterBox`, `Conveyor`, `Plant`), `IsoFigure` (personnage ou console), `IsoLabel`, `isoRoute`, `IsoFlowPath` |
| Scène | `ZoomPan` (souris, trackpad, tactile, clavier, mini-carte, zoom sémantique) |
| Espace de travail (`@ds`) | `DockLayout` (panneaux redimensionnables et repliables, tailles mémorisées), `ExplorerTree`, `LogTerminal` (journal filtrable, suivi automatique), `PlanMinimap` |
| 3D (`@ds/three`, chargé à la demande) | `Stage3D` (rendu uniquement quand quelque chose change), `CameraRig` (orbite, survol, cadrage), sélection par volumes simplifiés, `MaterialKit` lié au thème, figures `robot` / `console` / `drone` pilotées par le statut réel, mobilier, `FlowNetwork` (flux enregistrés), `SceneLabels` (étiquettes DOM), `SpatialLayout` + `useSpatialLayout` (disposition partagée et réactive entre vues), `buildSpatialScene`, `bakeStatic` (fusion des volumes immobiles). Voir `src/design-system/three/README.md` |
| Icônes | icônes au trait 1,5 px dessinées pour le produit |

## Basculer entre les présentations

Toutes les présentations lisent le même journal, la même sélection, la même période et les mêmes filtres : basculer ne relance rien et n'appelle aucun modèle.

- **Lanceur** (touche **G** ou bouton « Toutes les vues ») : vignettes groupées par famille (tableaux de bord, espaces de travail, scènes 3D, scènes 2D, outils), recherche classée (nom exact, début du nom, nom, puis description), navigation aux flèches, épinglage en favori (☆).
- **Favoris** : ils remplissent le sélecteur de l'en-tête et la barre latérale ; les touches **1 à 9** ouvrent les favoris d'abord, puis les autres vues dans l'ordre du lanceur.
- **Ajouter ou retirer une vue** : un dossier `src/experiences/<id>/` avec son `manifest.ts` est découvert automatiquement ; supprimer le dossier retire la vue (voir `CREATING_AN_EXPERIENCE.md`). Une vue peut aussi être masquée ou désactivée sans toucher au code, depuis la Galerie.

## Mouvement

- Le mouvement **encode un état enregistré**, jamais une décoration : un agent ne s'anime que si son statut l'indique.
- `html[data-motion]` : `none` (minimaliste), `state` (repères ponctuels — économique ou réduction des mouvements), `subtle` (pictogrammes de statut et flux, par paliers — standard), `ambient` (scène complète — haute qualité).
- `html[data-anim=paused]` : tout est suspendu (onglet masqué, inactivité).
- **Horloge partagée** (`useAnimationFrame`) : une seule boucle pour toute l'application, plafonnée par le niveau de qualité (15 / 30 / 60 images/s), active seulement en mouvement `subtle` ou `ambient` et seulement tant qu'une vue y est abonnée. Les scènes 3D ne redessinent qu'à la demande.
- La pastille « En direct » ne pulse qu'en haute qualité : en standard elle reste fixe, pour ne rien coûter au repos.
- **Sobriété adaptative en 3D** : sans accélération graphique (rendu logiciel) ou si la boucle ne tient pas sa cadence, une scène 3D ne s'anime plus qu'aux changements d'état réels, rend en ratio de pixels 1 et sans ombres portées ; un message l'annonce.

## Mise en page

```
┌ rail ┬───────────── barre : marque · sélecteur de vue · bandeau données · filtres · recherche ─┐
│ Vue  │                                                                     │ Inspecteur /     │
│ Gal. │                     scène (expérience active)                       │ Décisions        │
│ Stu. │                                              ┌ cartouche ┐          │ (tiroir droit)   │
│ Créer│                                              └───────────┘          │                  │
│ Don. ├───────────── chronologie : période · densité d'événements · replay ─┤                  │
│ Rég. │                                                                     │                  │
│ Déc. │                                                                     │                  │
└──────┴─────────────────────────────────────────────────────────────────────┴──────────────────┘
```

Mobile : barre de navigation en bas, inspecteur en feuille glissante, chronologie compacte, sélecteur de vue en menu.
