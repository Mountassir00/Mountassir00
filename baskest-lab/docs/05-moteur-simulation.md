# 05 — Moteurs de simulation sportive et de programmation

Code : `src/core/simulation/` et `src/core/scheduler/`. Tests : `tests/simulation.test.ts`, `tests/scheduler.test.ts`.

> Le simulateur compare des **règles** entre elles (durée, suspense, équité, exploitation). Il ne prédit pas le résultat d'un match réel.

## 1. Simulateur de match (par possessions)

| Hypothèse | Valeur | Justification |
|---|---|---|
| Durée moyenne d'une possession | 60 % du temps de possession (70 % en demi-terrain) | 24 s → 14,4 s : ordre de grandeur NBA (≈ 100 possessions/équipe/48 min) |
| Réussite d'un tir | réussite de la zone ± avantage de niveau `0,13 × tanh(Δelo/400)` | Une équipe +200 Elo gagne ≈ 82 % des matchs 3x3 (4 000 matchs simulés) |
| Pertes de balle / rebond offensif | 12 % / 25 % | Ordres de grandeur amateurs |
| **Adaptation défensive** | réussite × (1 − 0,5 × sur-utilisation de la zone) | Sans elle, le modèle « croit » qu'on peut ne tirer qu'à 2 pts en 3x3 |
| Temps réel / temps de jeu | ×1,25 (3x3, 1c1) ; ×1,5 (4c4, 5c5) | Arrêts, changements |

Calibrage vérifié (tests) : en 3x3 FIBA (10 min ou 21 pts, 12 s), le vainqueur marque ≈ 20 points en ≈ 9,3 min de jeu ; en 5x5 sur 20 min, ≈ 47 points.

**Zones de tir** : préréglages 3x3 (1 / 2 pts), 5x5 (2 / 3 pts) et zone bonus (ex. 4 pts) ; toutes les valeurs sont modifiables dans l'interface.

**Fins de match** : temps ; score cible ; temps ou score (le premier) ; **Elam** (temps puis score cible = leader + N) ; prolongation mort subite ou « premier à 2 points » (FIBA 3x3).

**Mécaniques simulées** : `handicap_start` (avance au score selon l'écart de niveau), `mercy_rule`, `double_points_final_minute` (Money Time), `joker_card` (60 s de points doubles, une fois), `public_zone_bonus` (le public choisit une zone double toutes les 4 min). Les 20 autres mécaniques de la bibliothèque (draft, divisions, barrages, promotion/relégation, capitaines, équipes mystères, rivalités, classements…) sont évaluées qualitativement (effets, risques) et via la structure de compétition.

## 2. Moteur de compétition

Phases enchaînables : **poules** (serpentin, méthode du cercle, départage victoires → différence → points), **élimination directe** (têtes de série 1 vs N, exemptions, petite finale), **double élimination** (appariement par bilan, finale avec « reset »), **système suisse**, **course aux points**, **échelle de défis** (1 défi lancé et 1 reçu par ronde), **King of the Court** (le vainqueur reste, bonus de série, temps d'attente mesuré). Les phases à classement qualifient `advance` équipes (4 par défaut). Les **tableaux parallèles** (féminin / masculin) partagent le même format.

## 3. Analyse Monte-Carlo (`analyzeFormat`)

Sur N tournois (150 à 2 000) avec niveaux tirés selon un écart-type paramétrable (150 Elo ≈ open amateur hétérogène) :

| Indicateur | Lecture |
|---|---|
| P(la meilleure équipe gagne), P(top 4 gagne) | Méritocratie du format |
| τ de Kendall (classement final vs niveau réel) | < 0,3 = trop aléatoire |
| Taux de surprises | Matchs gagnés par l'équipe la moins forte |
| Matchs serrés | Écart ≤ 15 % du score cible (ou ≤ 4 pts) : suspense |
| Durée moyenne et p95 | Alimente la programmation |
| Matchs par équipe (min-max) | Expérience joueur (≥ 3 visé) |
| **Stratégies dominantes** | Profils « tout intérieur », « tout extérieur », « chasse aux bonus » contre jeu équilibré à niveau égal : ≥ 58 % de victoires = règle exploitable |
| Valeur attendue par zone | Zone > 1,6 × la moins rentable = jeu stéréotypé probable |
| **Matchs sans enjeu** | Énumération des résultats possibles du dernier tour de poule : > 8 % = risque d'arrangement |
| Risques de manipulation | Handicap (sous-déclaration du niveau), vote du public (mobilisation), King of the Court (jeu ralenti) |
| Situations injustes | Équipes à un seul match, écart de temps de jeu ×3, attente > 60 % du temps (KOTC) |

**Verdict** : `déséquilibré` (stratégie dominante ou ≥ 2 situations injustes) ; `trop aléatoire` (τ < 0,3 ou P(meilleure) < 2/N) ; `trop prévisible` (P(meilleure) > 70 % et < 20 % de matchs serrés) ; sinon `équilibré`.

Exemples (vérifiés par les tests) : l'Open 3x3 à 16 équipes (poules + tableau) est **équilibré** mais 11 % des derniers matchs de poule sont sans enjeu ; le King of the Court 1c1 sur un seul terrain est **déséquilibré** (de 1 à 14 matchs selon les joueurs) ; une zone à 6 points à 30 % de réussite est détectée comme **exploitable**.

`compareFormats(base, variante)` mesure l'effet d'**une** modification (Laboratoire créatif).

## 4. Moteur de programmation

1. **Génération des rencontres** (`buildFixtures`) avec dépendances : « 1:A » (1er de la poule A), « W:M012 » (vainqueur du match 12), rondes suisses dépendant de la ronde précédente.
2. **Ordonnancement au plus tôt** sous contraintes : disponibilités des terrains, blocs fixes (ouverture, show, temps sponsor, concours), repos minimum (aussi entre un match et le match qu'il alimente), arbitres disponibles non liés aux équipes, répartition de charge des arbitres, finales et demi-finales sur le terrain principal.
3. **Détection des conflits** (`detectConflicts`), y compris sur un planning modifié à la main : équipe sur deux matchs, repos insuffisant, arbitre en double, arbitre lié à une équipe, terrain indisponible ou occupé par un bloc, hors horaires, match non programmable, attente excessive.
4. **Réorganisation en direct** (`reschedule`) après retard, terrain indisponible, forfait ou absence d'arbitre : les matchs commencés ne bougent pas, le reste est replanifié, la liste des matchs déplacés est produite, et la publication **exige une validation** (`requiresApproval: true`).
5. **Charge de publication** (`publicationPayload`) pour le site, les écrans et les espaces joueurs (connecteur à brancher).

Exemple testé : 16 équipes 3x3, 4 terrains, 8 arbitres → 31 matchs sans conflit en 3 h 30 ; un terrain indisponible 2 h replanifie 16 matchs sans conflit bloquant.

## 5. Limites connues

- Le modèle ne simule pas les joueurs individuellement (pas de fautes personnelles, de fatigue, de rotation) : les règles de composition (mixité, âge) sont évaluées qualitativement.
- Les réussites par zone sont des hypothèses de calibrage : à recaler avec les statistiques des éditions Bask'Est (feuilles de match).
- La double élimination est simulée « par bilan », ce qui est fidèle à l'esprit du format mais pas à un tableau gagnants/perdants figé.
