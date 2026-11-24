# 08 — Moteur de génération de concepts

> Code : `src/core/generator/generator.ts`, `src/core/generator/library.ts`, `src/core/pipeline.ts`.
> Interface : modules **Générateur de concepts** (`#/generateur`) et **Laboratoire créatif** (`#/labo`). Statut : opérationnel.

Le générateur ne « trouve pas d'idées » au sens créatif : il **combine** des briques documentées (formats, mécaniques, innovations transposées, moments d'expérience, contenus, noms) puis fait passer **chaque** candidat par toute la chaîne d'analyse. Il ne propose que les meilleurs, avec leurs défauts visibles. La créativité humaine reste en amont (enrichir les bibliothèques) et en aval (choisir, retoucher, tester sur le terrain).

## 1. Vue d'ensemble

```
Brief ──► draftConcept() ×N ──► analyzeConcept() ──► auto-réparation ──► classement ──► top K
            (combinatoire)       (chaîne complète)     (shrinkFormat)      (éligibles,
                                                                            puis note)
```

| Étape | Fonction | Ce qui se passe |
|---|---|---|
| 1 | `draftConcept(brief, lib, rng, i)` | Construit un `Concept` complet à partir du brief et des bibliothèques. |
| 2 | `analyzeConcept(concept, { runs })` | Simulation Monte-Carlo, planning, budget, implantation, 26 règles, note /100, maturité. |
| 3 | `shrinkFormat(concept)` | Si le planning contient des matchs « non planifiés », réduit le format et ré-analyse (4 essais max). |
| 4 | tri | Éligibles d'abord, puis note décroissante. |
| 5 | `slice(0, count)` | Garde `count` concepts (3 par défaut) parmi `candidates` (8 par défaut). |

Le tirage est **déterministe** : la graine (`seed`) fixe toutes les combinaisons. Changer la graine propose d'autres concepts ; garder la graine permet de reproduire exactement un résultat présenté au bureau.

## 2. Le brief

| Champ | Type | Effet |
|---|---|---|
| `objectives` | spectacle, inclusion, jeunesse, détection, communauté, revenus, visibilité partenaires, territoire | Repris dans le concept ; pèse sur la cohérence Bask'Est et l'impact ; « spectacle » oriente vers une implantation « show ». |
| `audiences` | 13 publics (enfants, familles, PMR, femmes, éloignés de la pratique…) | Règles de composition, moments d'expérience ciblés, autorisation parentale si enfants/jeunes. |
| `venueType` / `venueId` | 10 types de lieux | Lieu de référence pour l'implantation et le coût de location. |
| `budgetTier` | micro, limité, standard, premium | Filtre les innovations et les moments d'expérience par coût ; gabarit budgétaire. |
| `scale` | locale, régionale, nationale | Reproductibilité. |
| `teamSizes` | 1 à 5 | Formats autorisés. |
| `core` | match, concours, show, communautaire, mixte | Activité centrale (un concept peut ne pas reposer sur un match). |
| `innovationLevel` | 1 à 5 | Nombre de mécaniques et d'innovations (voir §3.2). |
| `expectedSpectators`, `durationHours` | nombres | Dimensionnement (bénévoles, terrains, restauration, contrôle d'accès). |
| `candidates`, `count`, `seed`, `runs` | nombres | 8 candidats, 3 retenus, 80 tournois simulés par candidat par défaut. |

## 3. Bibliothèques combinatoires

### 3.1 Archétypes de formats (`ARCHETYPES`)

| Id | Structure | Tailles | Équipes par défaut |
|---|---|---|---|
| `poules_tableau` | Poules (serpentin, 2 qualifiés/poule) puis élimination directe | 2c2, 3c3, 4c4 | 3x3 et moins : 4 × durée (h), entre 8 et 24, multiple de 4 ; 4c4 : 8 |
| `kotc` | King of the Court 40 min (1 pt/victoire, +1 dès 3 victoires de suite) puis Final 4 | 1c1, 2c2 | 12 |
| `suisse_final4` | 4 rondes suisses puis Final Four | 1 à 5 | 8 (4c4, 5c5) ou 16 |
| `double_elim` | Double élimination (deux défaites pour sortir) | 2c2, 3c3, 5c5 | 6 (5c5) ou 12 |
| `echelle` | Échelle de défis (3 rondes) puis finale des 4 premiers | 1c1, 2c2 | 10 |
| `course_points` | Course aux points (4 rondes) puis Final Four | 2c2, 3c3, 4c4 | 10 |
| `showcase` | Demi-finales, finale et 3e place | 4c4, 5c5 | 4 |

Règles de match par taille (`rulesFor`) : 1c1 (5 min ou 11 pts, 10 s), 2c2 (7 min ou 15 pts, 12 s), 3c3 (règles FIBA 3x3 : 10 min ou 21 pts, 12 s), 4c4 (12 min, 18 s), 5c5 (20 min, 24 s). Effectif : 1 en 1c1, taille + 1 jusqu'au 3c3, taille + 3 en 4c4/5c5.

### 3.2 Mécaniques (`src/data/mechanics.ts`, 25 au total)

- **Mécaniques de match simulées** (5) : `handicap_start`, `mercy_rule`, `double_points_final_minute`, `joker_card`, `public_zone_bonus`.
  - Nombre retenu : 0 si audace = 1 ; 1 si audace = 2 ou 3 ; 2 si audace ≥ 4. **Jamais plus de 2 par match** (règle R01 : lisibilité pour le public).
  - `handicap_start` n'est tiré que si le brief vise des publics éloignés de la pratique ou PMR (risque de sous-déclaration du niveau sinon).
  - Paramètres par défaut : 1 pt d'avance par 100 points d'écart de niveau ; arrêt à 15 points d'écart ; 60 s à points doubles ; 60 s de joker ; zone bonus toutes les 240 s.
- **Fin au score cible (type Elam)** : si audace ≥ 3 et taille ≥ 3, une chance sur deux ; cible = leader + 5 (+9 en 5c5).
- **Mécaniques de structure et de narration** (draft, divisions, barrages, capitaines, équipes mystères, rivalités, saison, classements…) : jusqu'à `min(3, audace)` tirées, enregistrées dans les étiquettes `mech:<id>` et décrites dans le pitch.
- Toute compétition générée est **non officielle** (`official: false`) : les dérogations aux règles FIBA/FFBB sont assumées et doivent être acceptées par les participants à l'inscription.

### 3.3 Innovations transposées (`src/data/innovations.ts`, 52)

Filtre par coût selon le budget :

| Budget | Coût maximal des innovations | Innovations éligibles (au 24/11/2026) |
|---|---|---|
| micro, limité | très faible ou faible | 42 (22 très faibles + 20 faibles) |
| standard | jusqu'à moyen | 50 |
| premium | toutes | 52 |

Parmi les éligibles, les 12 au plus fort potentiel médiatique forment le vivier ; le générateur en retient `max(1, min(3, audace − 1))`.

### 3.4 Parcours spectateur (`EXPERIENCE_LIBRARY`, 20 moments)

Huit phases : arrivée, ouverture, présentation, jeu, interruption, temps fort, remise, après. Pour chaque phase, le générateur retient 1 moment (micro, limité) ou 2 (standard, premium), en privilégiant ceux qui ciblent les publics du brief, parmi ceux dont le coût est compatible (plafond 0 en micro, 1 en limité, 2 en standard, 3 en premium).

> Limite connue : en budget **micro**, aucune option d'« ouverture » n'a un coût nul ; la phase reste vide et le critère « expérience spectateur » le reflète. À compléter dans la bibliothèque (ex. « ouverture a cappella par une chorale de quartier »).

### 3.5 Contenus (`CONTENT_LIBRARY`, 11 accroches)

4 accroches en budget micro, 6 sinon, réparties sur Instagram, TikTok, YouTube et LinkedIn, chacune avec un potentiel viral de 1 à 5 (walkouts, tir décisif, dunks, cartes joueurs, coulisses bénévoles, bilan partenaires, mini-documentaire…).

### 3.6 Nommage et identité

- Racines ancrées Nancy / Lorraine / Grand Est : Stan, Chardon, Mirabelle, Lorraine, Gentilly, Grand Est, Meurthe, Est, Moselle, Pépinière.
- Têtes : Clash, Run, Court, Duel, Royale, Series, Jam, Session, Crown, Rumble, Throne, Block.
- Deux patrons : « Chardon Clash » ou « Clash du Chardon » (complément accordé : « de l'Est », « de la Mirabelle », « du Grand Est »…). Pas de doublon dans une même génération.
- Signature tirée d'une liste (« Qui s'y frotte s'y pique. », « Joue pour ton quartier. »…), motif graphique (chardon stylisé, arabesques Art nouveau, croix de Lorraine géométrique, grille de la place Stanislas, flèche Est), palette autour du bleu nuit et de l'orange ballon.
- **Vérifications de propriété intellectuelle** systématiquement listées : antériorité INPI (classes 41, 25, 28), EUIPO/TMview, disponibilité des comptes réseaux, nom de domaine. Le générateur ne vérifie pas lui-même la disponibilité d'un nom.

### 3.7 Valeurs par défaut opérationnelles

- Bénévoles = ⌈spectateurs / 50 + équipes / 4⌉ + 3.
- Sécurité : DPS prévu dès qu'un public est attendu, RC organisateur, dégagement 2 m, autorisations listées (convention de lieu ; occupation du domaine public en extérieur ; déclaration en mairie au-delà de 1 500 personnes ; buvette ; SACEM), autorisation parentale si mineurs, 3 mesures d'accessibilité.
- Paramètres d'exploitation (`defaultOps`) : communication lancée à J-60, inscription en ligne close à J-3, check-in 2 min/équipe, terrains dimensionnés sur le nombre estimé de matchs (`estimateMatches`) avec 25 % de marge, etc. Voir `src/core/rules/design-rules.ts`.

## 4. Chaîne d'analyse (`analyzeConcept`)

Pour chaque candidat :

1. **Simulation** : `analyzeFormat` (80 tournois par défaut dans le générateur, 150 dans l'interface, 500 pour un Blueprint).
2. **Planning** : terrains, arbitres (1 par match jusqu'au 3c3, 2 au-delà), bloc d'ouverture de 20 min, show mi-temps si la journée dure ≥ 4 h, tableaux parallèles (féminin/masculin) si le format en déclare.
3. **Budget** : gabarit selon le palier et le type de lieu, 3 scénarios.
4. **Implantation** : variante « show » si spectacle sur un terrain, « festival » si communautaire, « tournoi » sinon.
5. **Règles** : R01 à R26.
6. **Notation et maturité** : la preuve « simulation » est mise à jour (`simulationRuns`) ; la maturité ne peut pas dépasser « concept en simulation » sans test terrain.

## 5. Auto-réparation (`shrinkFormat`)

Si le planning ne tient pas dans la durée prévue (conflit `non_planifie`) :

1. une phase suisse / course aux points / échelle de plus de 3 rondes perd une ronde ;
2. sinon, le nombre d'équipes baisse de 4 (≤ 3c3) ou de 2 (4c4, 5c5), sans descendre sous 4.

Le pitch indique « format ajusté : … » et l'étiquette `auto-ajuste` est ajoutée. 4 essais au maximum.

## 6. Classement et lecture des résultats

- Les concepts **non éligibles** (une porte sécurité, équité ou conformité « non conforme ») passent après les éligibles, même mieux notés.
- Chaque résultat affiche : note /100 et portes, pitch, verdict de simulation, nombre de matchs et de terrains, résultat financier réaliste, bénévoles, barres par critère, alertes de règles.
- Lecture conseillée : écarter d'abord les concepts avec une alerte de sécurité ; regarder ensuite la rentabilité (souvent le critère le plus faible d'un petit événement) ; enfin choisir sur l'innovation et l'expérience.

## 7. Laboratoire créatif

- `mutateConcept(concept, lib, seed)` applique **une seule** modification : fin au score cible ; ajout d'une mécanique simulée (ou retrait si déjà 2) ; inversion du tirage (têtes de série ↔ aléatoire) ; matchs raccourcis de 2 minutes. Version +1.
- `compareFormats(base, variante)` simule 200 tournois de chaque et compare : probabilité que la meilleure équipe gagne, τ de Kendall (méritocratie), taux de surprises, matchs serrés, durée moyenne.
- Repères de décision : garder une variante qui augmente le suspense sans faire tomber τ sous 0,3 ; se méfier d'un taux de surprises > 35 % ; toute stratégie dominante bloque le concept.

## 8. Limites (à connaître avant de présenter un résultat)

- Le simulateur compare des **règles**, il ne prédit pas des équipes réelles (niveaux synthétiques, hypothèses de réussite par zone).
- Les montants des budgets sont des **estimations** d'ordre de grandeur ; le résultat financier d'un concept généré n'engage rien tant que les devis ne sont pas reçus.
- Le texte (pitch, signatures) est assemblé à partir de gabarits : il doit être retravaillé avant toute diffusion.
- Les mécaniques de narration (draft, rivalités…) ne sont pas simulées ; leur effet est qualitatif.
- Aucun nom n'est vérifié juridiquement par l'outil.

## 9. Étendre le moteur

| Pour ajouter… | Modifier | Contrôle |
|---|---|---|
| un archétype de format | `ARCHETYPES` (library.ts) | `npm test` + vérifier le verdict dans le Simulateur sportif |
| une mécanique simulée | `simulateMatch` (match.ts) + `SIMULATED_DEFAULTS` + `mechanics.ts` (`simulated: true`) | test de non-régression et test de stratégie dominante |
| une innovation | `src/data/innovations.ts` (tous les champs de la matrice, provenance) | filtre par coût |
| un moment d'expérience / un contenu | `EXPERIENCE_LIBRARY`, `CONTENT_LIBRARY` (indiquer le coût 0-3) | critère « expérience spectateur » |
| une racine de nom | `NAME_PARTS.roots` + `NAME_PARTS.of` | pas de donnée personnelle (pas de nom de rue de siège, pas de nom de personne) |

## 10. Enrichissement par l'API Claude (intégration optionnelle, non implémentée)

Objectif : rédiger un pitch, une signature et des variantes de texte plus naturels **à partir** du concept calculé, sans jamais modifier les chiffres.

Interface proposée (à créer dans `src/core/integration/`) :

```ts
interface NarrativeEnricher {
  enrich(input: {
    concept: Concept;            // concept déjà analysé (lecture seule)
    evaluation: Evaluation;      // note, portes, justifications
    tone: 'partenaires' | 'grand_public' | 'institutionnel';
  }): Promise<{ pitch: string; tagline: string; altNames: string[]; warnings: string[] }>;
}
```

Garde-fous :

- Appel **côté serveur** uniquement (clé API jamais dans le navigateur), statut « dépend d'une intégration ».
- Le modèle reçoit les faits calculés et doit les reprendre tels quels ; une vérification automatique compare chiffres, dates et lieux du texte produit avec le concept et rejette toute divergence.
- Aucune donnée personnelle envoyée (pas de noms de joueurs, bénévoles ou mineurs).
- Les noms proposés passent par les mêmes vérifications de propriété intellectuelle.
- Le texte enrichi est une **proposition** : validation humaine avant toute diffusion (même circuit d'approbation que les publications).
- Coût et modèle à évaluer au moment du branchement (voir `docs/12-integration-ecosysteme.md`).
