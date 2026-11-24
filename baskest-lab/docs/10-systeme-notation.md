# 10 — Système de notation et de validation des concepts

> Code : `src/core/scoring/evaluate.ts` (note, portes), `src/core/scoring/maturity.ts` (maturité), `src/core/rules/design-rules.ts` (règles R01-R26).
> Interface : **Tableau de notation** (`#/notation`). Statut : opérationnel.

Principe : chaque concept est noté **sur 100** à partir d'indicateurs **explicites et justifiés** (chaque point est accompagné de ses raisons). La sécurité, l'équité sportive et la conformité ne sont **pas** des points : ce sont des **conditions préalables**. Un concept très bien noté mais non conforme n'est pas éligible.

## 1. Barème (§21)

| Critère | Points |
|---|---|
| Innovation sportive | 12 |
| Expérience spectateur | 15 |
| Expérience joueur | 10 |
| Faisabilité opérationnelle | 15 |
| Rentabilité potentielle | 15 |
| Potentiel médiatique | 10 |
| Reproductibilité | 10 |
| Cohérence avec Bask'Est | 8 |
| Impact territorial et social | 5 |
| **Total** | **100** |

Chaque critère est calculé comme un score entre 0 et 1, multiplié par son maximum et arrondi au dixième. Le total est la somme.

## 2. Indicateurs et formules par critère

Notation : `règle(Rxx)` vaut 1 si la règle est « ok », 0,4 si « alerte », 0 si « bloquant », 0,6 si « non évaluable ».

### Innovation sportive (12)

Score = 0,25 (base)
+ 0,12 × min(3, nombre de mécaniques de match)
+ 0,12 si une phase peu courante (King of the Court, échelle, course aux points, double élimination, suisse)
+ 0,08 si format 2c2 ou 4c4 (rare en compétition)
+ 0,08 si règles de composition (mixité, âge, inclusion, niveau)
+ 0,08 si l'activité centrale n'est pas un match
+ 0,08 si ≥ 2 innovations transposées
− 0,20 si la simulation conclut à un déséquilibre.

### Expérience spectateur (15)

Score = 0,35 × (phases du parcours couvertes / 8)
+ 0,15 × min(1, publics spécifiques traités / 4) (enfants, familles, PMR, entreprises, VIP)
+ 0,20 × min(1, taux de matchs serrés / 0,40) (suspense simulé)
+ 0,05 si la durée moyenne d'un match est entre 4 et 25 min
+ 0,07 × règle(R01 lisibilité) + 0,06 × règle(R02 temps morts) + 0,04 × règle(R09 visibilité) + 0,04 × règle(R10 restauration) + 0,04 × règle(R14 interactions).
(Sans simulation, le bloc suspense est remplacé par 0,10.)

### Expérience joueur (10)

Score = 0,30 (base)
+ 0,25 × min(1, matchs garantis par équipe / 3)
− 0,10 si une situation injuste est détectée (une équipe ne joue qu'un match, écart de temps de jeu, file d'attente)
+ 0,12 × règle(R03 attente) + 0,12 × règle(R04 repos) + 0,08 × règle(R07 inscription) + 0,10 × règle(R12 récompenses)
+ 0,08 si des contenus personnalisés pour les joueurs sont prévus (carte, highlight, portrait).

### Faisabilité opérationnelle (15)

Score = 0,30 × palier de budget (micro 1 ; limité 0,85 ; standard 0,65 ; premium 0,40)
+ 0,20 × bénévoles nécessaires (≤ 20 : 1 ; ≤ 40 : 0,75 ; ≤ 70 : 0,5 ; au-delà : 0,25)
+ 0,30 × max(0, 1 − 0,35 × règles bloquantes − 0,06 × alertes)
+ 0,15 × max(0, 1 − 0,25 × zones non implantées) (0,08 si pas d'implantation)
− 0,05 si palais des sports ou arena (disponibilité contrainte)
+ 0,05 si l'événement dure ≤ 8 h.

### Rentabilité potentielle (15)

À partir des scénarios du simulateur financier :
Score = 0,40 × clamp((marge réaliste + 0,20) / 0,40)
+ 0,25 × clamp((résultat prudent / charges prudentes + 0,30) / 0,30)
+ 0,15 × clamp(1,2 − point mort / public attendu) (0,05 si point mort non calculable)
+ 0,10 × (1 − clamp(part des subventions / 0,50))
+ 0,10 × clamp(part des produits sécurisés / 0,60).
Une marge réaliste de −20 % ou moins donne 0 sur le premier terme ; +20 % ou plus donne le maximum.

### Potentiel médiatique (10)

Score = 0,35 × min(1, séquences à fort potentiel / 6) + 0,30 × (potentiel viral moyen / 5) + 0,10 × (plateformes couvertes / 4)
+ 0,15 × (potentiel médiatique moyen des innovations transposées / 5) (0,05 si aucune)
+ 0,10 × règle(R15 plan de captation).

### Reproductibilité (10)

Score = 0,35 × type de lieu (gymnase, city-stade 1 ; extérieur 0,9 ; campus, complexe 0,85 ; centre commercial 0,7 ; place publique 0,6 ; palais des sports 0,5 ; espace temporaire 0,5 ; arena 0,3)
+ 0,25 × palier de budget (micro 1 ; limité 0,85 ; standard 0,6 ; premium 0,35)
+ 0,15 × bénévoles (≤ 25 : 1 ; ≤ 50 : 0,6 ; au-delà : 0,3)
+ 0,10 × (≤ 2 mécaniques : 1 ; sinon 0,6)
+ 0,15 × échelle (locale 1 ; régionale 0,8 ; nationale 0,6).

### Cohérence avec Bask'Est (8)

Score = 0,50 × min(1, objectifs alignés avec la mission / 3) (inclusion, jeunesse, communauté, territoire, spectacle, détection — mission publiée : « le basketball comme outil de lien social, d'inclusion et de dynamisation locale »)
+ 0,25 si l'identité est ancrée dans le territoire (Nancy, Lorraine, Grand Est, Stan, chardon, mirabelle…)
+ 0,15 si le concept est rattaché à une propriété Bask'Est ou sert de passerelle
+ 0,10 (base).

### Impact territorial et social (5)

Score = 0,60 × min(1, publics prioritaires / 3) (éloignés de la pratique, femmes, PMR, jeunes, enfants, familles, étudiants)
+ 0,25 si l'objectif « territoire » ou « inclusion » est retenu
+ 0,15 si l'accès est gratuit ou le budget micro.

> Ces pondérations sont des **choix de conception** explicites, pas des vérités. Elles sont révisables après chaque audit post-événement (exigence §22) : si un critère prédit mal le succès réel, on ajuste sa formule et on le documente ici.

## 3. Conditions préalables (portes)

| Porte | « Non conforme » si… | « À vérifier » si… |
|---|---|---|
| **Sécurité** | une règle bloquante parmi R04 (repos), R20 (accessibilité), R21 (DPS), R22 (jauge/évacuation), R24 (dégagement), R26 (plan météo en extérieur) | une de ces règles n'est pas évaluable, ou aucun DPS n'est prévu |
| **Équité** | la simulation détecte une stratégie dominante (≥ 58 % de victoires à niveau égal contre un jeu équilibré) | format non simulé, ou verdict autre qu'« équilibré » (trop aléatoire, trop prévisible, déséquilibré sans stratégie dominante) |
| **Conformité** | pas d'assurance RC organisateur (obligation légale, Code du sport L321-1) ; règle R23 bloquante (mineurs sans autorisation des représentants légaux) ; compétition déclarée officielle avec des règles non FIBA/FFBB | aucune autorisation listée (lieu, mairie/préfecture, buvette, SACEM) |

**Éligible** = aucune porte « non conforme ». **Grade** : A ≥ 80, B ≥ 65, C ≥ 50, D en dessous.

Le classement met toujours les éligibles avant les non éligibles.

## 4. Ajustement par un jury

Un membre du jury peut fixer la note d'un critère (entre 0 et son maximum) **à condition de la motiver**. L'ajustement :

- remplace la valeur calculée pour ce critère ;
- est tracé : « note ajustée par *jury Bask'Est* : *motif* » dans les justifications et dans le Blueprint ;
- ne modifie **jamais** les portes (une porte non conforme ne se « rattrape » pas par une note) ;
- est réversible (« Revenir à la note calculée »).

Exemples de motifs légitimes : salle confirmée par écrit, partenaire signé, retour d'un test terrain.

## 5. Échelle de maturité

Les niveaux sont **cumulatifs** : on ne saute pas une étape, même avec beaucoup de preuves au niveau supérieur.

| Niveau | Preuve exigée |
|---|---|
| Idée | — |
| Concept documenté | Fiche concept complète (format, public, lieu, budget, sécurité) |
| Concept en simulation | ≥ 100 simulations Monte-Carlo du format |
| Prototype | ≥ 1 test terrain à petite échelle (séance, joueurs réels) |
| Événement pilote | ≥ 1 édition réelle auditée |
| Format validé | ≥ 2 éditions atteignant leurs objectifs (audit ≥ 70 % des objectifs) |
| Format reproductible | ≥ 1 édition réussie par une autre équipe / un autre lieu avec le manuel |
| Format exportable | ≥ 1 édition dans un autre territoire (licence / partenariat) |

Garde-fous : un concept généré n'atteint au mieux que « concept en simulation » ; « King of the Court » reste au niveau « idée » tant qu'aucune édition réelle n'est documentée ; un test automatisé vérifie qu'un format n'est jamais « validé » avec moins de 2 éditions réussies.

## 6. Exemple : All Star Game Grand Est 2027 (dossier phare)

Calcul réel du 24/11/2026 (`analyzeConcept(ASG_2027, { runs: 500 })`). Hypothèses : 1 500 spectateurs, billet à 10 €, budget standard, Palais des Sports Jean-Weille, deux tableaux (féminin/masculin) de 4 équipes, fin au score cible, zone bonus choisie par le public.

| Critère | Points | Justifications produites par le moteur |
|---|---|---|
| Innovation sportive | 7,3 / 12 | 1 mécanique de match non standard ; règles de composition (parité, sélection) ; activité centrale « mixte » ; 6 innovations transposées |
| Expérience spectateur | 13,6 / 15 | 8/8 phases du parcours conçues ; parcours enfants, familles, PMR, entreprises, VIP ; 21 % de matchs serrés |
| Expérience joueur | 7,8 / 10 | au moins 1 match garanti par équipe ; situation injuste détectée (les perdants des demi-finales ne jouent qu'un match) ; contenus personnalisés |
| Faisabilité opérationnelle | 11,7 / 15 | budget standard ; 40 bénévoles ; 1 alerte de conception ; grande salle à disponibilité contrainte |
| Rentabilité potentielle | 4,0 / 15 | marge réaliste −5 % ; résultat prudent −13 553 € ; point mort à 1 624 spectateurs |
| Potentiel médiatique | 9,0 / 10 | 7 séquences, potentiel moyen 3,7/5 ; innovations à 4,3/5 |
| Reproductibilité | 6,3 / 10 | lieu de type palais des sports |
| Cohérence avec Bask'Est | 8,0 / 8 | 4 objectifs alignés ; ancrage territorial ; rattaché à l'écosystème |
| Impact territorial et social | 4,3 / 5 | publics prioritaires : femmes, PMR, jeunes, enfants, familles |
| **Total** | **72 / 100 — grade B** | |

- **Portes** : sécurité conforme, équité conforme, conformité conforme → **éligible**.
- **Maturité** : événement pilote (l'édition 2026 a eu lieu ; elle n'est pas encore auditée avec des chiffres). Prochaine étape : « format validé » = 2 éditions atteignant leurs objectifs.
- **Simulation** (500 tournois) : la meilleure équipe gagne dans 57 % des cas, τ de Kendall 0,63, durée réelle moyenne 20,7 min par match (p95 24,5), verdict équilibré. Risque signalé : vote du public à plafonner (vote en salle, QR lié au billet).
- **Seule règle en alerte** : R18 (exposition financière) — scénario prudent déficitaire de 13 553 € (53 % des coûts).

**Lecture.** Le concept est solide sur le spectacle, le média et l'ancrage, mais **la rentabilité est le point faible** : à 1 500 spectateurs et 10 €, le scénario réaliste perd 1 181 € et le point mort est à 1 624 spectateurs. Leviers prioritaires avant validation : signer des partenaires avant d'engager les dépenses (point go/no-go à J-30), obtenir le tarif réel de mise à disposition du Palais (5 000 € est une hypothèse), recaler l'affluence sur les chiffres réels de l'édition 2026.

## 7. Réviser le système

- Après chaque événement, comparer la note prévue et l'audit réel (module Analyse post-événement).
- Si un critère est systématiquement mal corrélé au succès réel, ajuster sa formule dans `evaluate.ts`, relancer `npm test` et consigner le changement (date, raison) dans ce document.
- Toute nouvelle règle de conception doit être reliée à au moins un cas de l'observatoire des erreurs (`src/data/errors.ts`).
