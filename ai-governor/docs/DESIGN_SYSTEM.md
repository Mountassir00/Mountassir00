# Design system — « Plan d'atelier »

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
| Icônes | 35 icônes au trait 1,5 px dessinées pour le produit |

## Mouvement

- Le mouvement **encode un état enregistré**, jamais une décoration : un agent ne s'anime que si son statut l'indique.
- `html[data-motion]` : `none` (minimaliste), `state` (transitions ponctuelles — économique ou réduction des mouvements), `ambient` (boucles de statut — standard, haute qualité).
- `html[data-anim=paused]` : tout est suspendu (onglet masqué, inactivité).

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
