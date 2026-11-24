# Architecture — Visual Experience Engine

MOUNTASSIR AI GOVERNOR sépare strictement ce qui **fonctionne** (moteur opérationnel, données, agents, permissions) de ce qui **se montre** (expériences visuelles, thèmes, animations, préférences). Ce dépôt contient la couche de présentation et le socle de données dont elle a besoin ; le moteur opérationnel s'y branchera par deux ports : les **sources de données** et le **port d'opérations**.

## Couches

```
┌──────────────────────────────────────────────────────────────────────┐
│ experiences/   Control Center · AI Office · System Map · Modular ·   │  ← rendus interchangeables
│                Journal (5e, ajoutée sans toucher au reste)           │     (chargés à la demande)
├──────────────────────────────────────────────────────────────────────┤
│ sdk/           hooks en lecture seule + capacité `host`              │  ← SEULE surface visible
│ design-system/ jetons, primitives, graphiques, kit isométrique       │     par une expérience
├──────────────────────────────────────────────────────────────────────┤
│ shell/         navigation, sélecteur de vue, inspecteur, chronologie │  ← contexte partagé qui
│                & replay, décisions, galerie, studio, builder         │     survit aux bascules
├──────────────────────────────────────────────────────────────────────┤
│ engine/        manifeste, registre, thèmes, niveaux de rendu,        │  ← moteur de présentation
│                horloge d'animation, activité, mesures, préférences   │
├──────────────────────────────────────────────────────────────────────┤
│ core/          schéma d'événements, journal (EventStore), projection,│  ← indépendant de React
│                sélecteurs, passerelle de commandes, sources, tarifs  │     et de tout rendu
└──────────────────────────────────────────────────────────────────────┘
          ▲ sources (démo, import Claude Code, futures API)   ▲ port d'opérations
```

Ces frontières sont **vérifiées par test** (`tests/unit/engine.test.ts › architecture boundaries`) :

- une expérience n'importe que `react`, `@sdk`, `@ds` et ses propres fichiers ;
- `core/` n'importe ni React, ni le moteur, ni le shell, ni une expérience ;
- `engine/` n'importe ni le shell ni une expérience ;
- aucun fichier de la couche de présentation n'appelle une API de LLM.

## Flux de données

1. Une **source** (`core/sources/*`) fournit un catalogue (départements, agents, nœuds, dépendances) et des **événements**.
2. Le **journal** (`core/store.ts`) est l'unique point d'entrée : chaque événement est validé (schéma Zod), **expurgé** (`core/security/redact.ts` masque clés et jetons), dédupliqué, trié.
3. La **projection** (`core/projection.ts`) calcule l'état (`GovernorState`) en repliant les événements. Elle est incrémentale en direct et rejouable : `projectAt(t)` reconstruit l'état à n'importe quel instant à partir de points de contrôle tous les 1 500 événements, avec un curseur avant pour la lecture continue.
4. Le **shell** construit un instantané en lecture seule (`GovernorSnapshot`) et le fournit à l'expérience active par contexte React.
5. Une expérience **demande** une action par `host.request(commande, interaction)`. La passerelle (`core/commands.ts`) vérifie dans l'ordre : mode Replay (lecture seule), capacité de la source, permissions du rôle, nature de l'interaction (aucune dépense ni modification durable depuis un glisser, un double-clic ou un geste), puis exige une confirmation proportionnée au risque (aucune, simple, case à cocher, saisie de « CONFIRMER »).

Aucune expérience n'a accès au journal, aux sources ou au port d'opérations : contourner les autorisations depuis une interface est impossible par construction.

## Garanties de la bascule de vue

| Exigence | Mécanisme |
|---|---|
| Aucun redémarrage de tâche | Le `GovernorRuntime` vit hors de React ; les abonnements temps réel appartiennent aux sources, pas aux vues. |
| Aucune perte de données | Le journal est unique et partagé ; une vue ne fait que le lire. |
| Contexte conservé | Période, filtres, sélection (agent, département, nœud, flux), position du replay, décisions en attente et panneaux vivent dans le store du shell (`shell/uiStore.ts`). |
| Aucun appel LLM | La couche de présentation n'a aucun client LLM (test dédié) ; compteur `uiInitiatedModelCalls` exposé au test e2e. |
| Rapidité | Moteurs de rendu chargés à la demande (un chunk par expérience), pré-chargés à l'intention (survol, focus du sélecteur), puis mis en cache. |
| Erreur confinée | Chaque expérience est montée dans une frontière d'erreur : une vue qui plante n'affecte ni les données ni les autres vues. |

## Replay

Le replay est une **lecture** de l'historique : la chronologie déplace une tête de lecture, le shell sert à toutes les expériences la projection à cet instant. Rien n'est ré-exécuté ; la passerelle refuse toute commande tant que le mode est `replay`. Comme toutes les vues lisent le même instantané, le replay est synchronisé partout, y compris lors d'une bascule pendant la lecture.

## Choix techniques de rendu

| Technologie | Verdict | Raison |
|---|---|---|
| **SVG** | Retenu pour les trois scènes isométriques | Quelques centaines d'éléments, netteté à tout zoom, accessibilité native (focus, `aria-label`), animations CSS exécutées par le compositeur, thèmes par variables CSS. |
| **DOM + SVG léger** | Retenu pour le Control Center et le Journal | Tableaux et graphiques simples ; aucune bibliothèque de graphiques (≈ 0 Ko ajouté). |
| Canvas 2D / PixiJS | Réservé | Pertinent au-delà d'environ 500 éléments animés simultanés (ex. import massif de sessions). Pas nécessaire aujourd'hui. |
| WebGL / Three.js | Écarté pour l'existant | Une perspective isométrique 2D suffit au résultat visuel ; un moteur 3D coûterait ≈ 150 Ko et du GPU en continu. Possible pour une future expérience de catégorie B, chargée uniquement quand elle est active. |

## Sobriété graphique

- **Niveaux de rendu** : minimaliste (aucune animation), économique (transitions sur changement d'état, 15 i/s), standard (animations de statut, 30 i/s), haute qualité (tout, 60 i/s). Mode automatique selon l'appareil (mémoire, cœurs, économie de données).
- **Une seule horloge d'animation** (`engine/runtime.ts`) plafonnée en images/s, arrêtée sans abonné.
- **Mise en veille** : onglet masqué ou 90 s d'inactivité ⇒ `html[data-anim=paused]` suspend toutes les animations CSS et l'horloge.
- **Préférence système « réduire les animations »** respectée (et réglable).
- **Pas d'interrogation périodique** : les sources poussent leurs événements ; le shell regroupe les notifications par micro-tâche (une rafale = un rendu). L'heure « en direct » avance par pas de 5 s, jamais par image.
- **Mesures** : HUD optionnel (images/s, tâches longues, mémoire JS si exposée, nœuds DOM, durée de bascule). Le GPU n'est pas mesurable depuis un navigateur : c'est indiqué comme tel.

## Arborescence

```
ai-governor/
  src/core/            domaine (aucune dépendance UI)
  src/engine/          moteur de présentation
  src/sdk/             API des expériences (v1)
  src/design-system/   jetons, primitives, graphiques, iso
  src/shell/           application
  src/experiences/     une expérience = un dossier + une entrée dans index.ts
  tests/unit/          Vitest : domaine, moteur, sécurité, frontières
  tests/e2e/           Playwright : bascule, perf, accessibilité, mobile
  docs/                cette documentation
```
