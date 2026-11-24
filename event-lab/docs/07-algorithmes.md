# 07 — Algorithmes de génération, d'évaluation et de simulation

> Ce document est le **contrat** du moteur (`baskest-lab/src/core/eventlab/`, TypeScript, depuis v0.3 ; auparavant `app/engine/` en JavaScript). Toute formule implémentée doit correspondre à ce texte ; toute modification de formule passe par une nouvelle version du document et du journal.
> Les paramètres numériques par défaut (taux de réalisation, débits, ratios) sont des **hypothèses de modélisation configurables**, pas des normes. Ils sont signalés `[param]`.

## Sommaire
1. Notation des concepts (/100) et portes éliminatoires
2. Générateur de concepts (combinaison de briques)
3. Moteur de transposition intersectorielle
4. Simulateur de compétition (durées)
5. Simulateur de flux (files d'attente, occupation)
6. Besoins en personnel et chemin critique du montage
7. Simulateur financier (scénarios, seuil, trésorerie, sensibilité)
8. Simulateur d'incidents et plans de continuité
9. Déduplication et fiabilité de la veille
10. Apprentissage post-événement (prévu vs réel)

---

## 1. Notation des concepts

### 1.1 Grille et pondération

| Code | Critère | Poids |
|---|---|---|
| `originalite` | Originalité | 12 |
| `experience_utilisateur` | Expérience utilisateur | 15 |
| `faisabilite_technique` | Faisabilité technique | 15 |
| `viabilite_economique` | Viabilité économique | 15 |
| `potentiel_mediatique` | Potentiel médiatique | 10 |
| `reproductibilite` | Reproductibilité | 10 |
| `adaptabilite_lieux` | Adaptabilité aux lieux | 8 |
| `accessibilite_inclusion` | Accessibilité et inclusion | 5 |
| `potentiel_commercial` | Potentiel commercial | 5 |
| `responsabilite_environnementale` | Responsabilité environnementale | 5 |
| | **Total** | **100** |

### 1.2 Formule

Chaque critère reçoit une note `r ∈ [0 ; 5]` (pas de 0,5) **justifiée par écrit**.

```
score = Σ_i  w_i × r_i / 5          (arrondi à l'entier)
```

Grade : **A** ≥ 80 · **B** 65–79 · **C** 50–64 · **D** < 50.

### 1.3 Ancres de notation (rubrique)

Une note sans ancre correspondante est refusée en revue.

| Critère | 1 | 3 | 5 |
|---|---|---|---|
| Originalité | Format existant reproduit à l'identique | Combinaison nouvelle de briques connues dans la discipline | Mécanique sans équivalent identifié dans la discipline **et** transposition intersectorielle cohérente |
| Expérience utilisateur | Temps morts > 30 % du temps de présence, règles opaques | Parcours fluide, temps morts 10–30 %, règles compréhensibles en < 2 min | Chaque rôle (spectateur, participant, bénévole) a un parcours conçu, temps morts < 10 %, moments forts rythmés |
| Faisabilité technique | Dépend d'une technologie non maîtrisée ou d'un lieu rare | Matériel standard en location, 1–2 points techniques à sécuriser | Matériel courant, compétences disponibles localement, plan B pour chaque point technique |
| Viabilité économique | Déficit au scénario central | Équilibre au scénario central, déficit limité au prudent | Excédent au central, perte prudente < 10 % du budget, ≥ 40 % des recettes sécurisées avant J-30 |
| Potentiel médiatique | Aucun moment partageable identifié | 2–3 moments forts filmables, décor identifiable | Moments viraux conçus (format vertical, révélations, suspense), contenu généré par les participants intégré |
| Reproductibilité | Dépend d'une personne ou d'un lieu unique | Reproductible avec le concepteur présent | Manuel de reproduction suffisant pour une équipe tierce, kit matériel standardisé |
| Adaptabilité aux lieux | Un seul type de lieu possible | 2–3 types de lieux avec adaptations notables | Configurations documentées économique → capacité maximale, intérieur/extérieur |
| Accessibilité et inclusion | Aucun aménagement | Accès PMR prévu, tarif réduit | Participation inclusive conçue dans le format (catégories, règles, accompagnement), pas seulement l'accès |
| Potentiel commercial | Une seule source de recettes | 3–4 sources, offre sponsor standard | Propriété licenciable, offres partenaires différenciées, revenus récurrents possibles |
| Responsabilité environnementale | Jetable, déplacements non traités | Gobelets réutilisables, tri, matériel loué | Mobilités douces incitées, matériel réemployé, mesure de l'empreinte prévue |

Les notes 2 et 4 sont intermédiaires. Une note 0 signifie « critère non traité ».

### 1.4 Indice de confiance

Chaque note porte un niveau de preuve : `donnees_reelles` (poids 1), `benchmark_source` (0,6), `jugement_expert` (0,3).

```
confiance = Σ_i w_i × preuve_i / 100      ∈ [0,3 ; 1]
```

Une évaluation `previsionnelle` dépasse rarement 0,6. Une évaluation `reelle` exige les données post-événement.

### 1.5 Portes éliminatoires (indépendantes du score)

| Porte | Règle automatique | Statut |
|---|---|---|
| Sécurité | Un risque `categorie ∈ {securite, sante}` avec `impact = 5` et `probabilite ≥ 3`, sans mesure de prévention | `bloquant` |
| Conformité réglementaire | Un point `compliance.mandatory = true` en `non_conforme` | `bloquant` |
| | Un point obligatoire en `a_verifier` à moins de 30 jours de J (ou au stade blueprint) | `a_verifier` |
| Risques critiques | Un risque `critical = true` sans `continuity_plan` | `bloquant` |

Verdict : un `bloquant` ⇒ **éliminé** (quel que soit le score) ; un `a_verifier` ⇒ **sous réserve** ; sinon **éligible**.

Précisions (v0.1.0) :
- « Jours avant J » se calcule à partir de `event_date` ; à défaut de date, la règle des 30 jours s'applique dès `maturity = blueprint` (un blueprint est réputé exécutable).
- Un point obligatoire `en_cours` est traité comme `a_verifier`.
- Un risque `critical` reste bloquant sans plan de continuité, **même** s'il est marqué `accepte` : accepter un risque n'est pas le traiter.
- Lorsqu'un lieu et un programme sont connus, un pic d'occupation simulé (§5) supérieur à l'effectif autorisé déclenche la porte Sécurité en `bloquant` (implémentation prévue avec le configurateur de lieu, v0.3).

### 1.6 Recommandations d'amélioration

Gain potentiel par critère : `g_i = w_i × (5 − r_i) / 5`. Les trois critères au plus fort `g_i` reçoivent en priorité les actions listées dans `improvements` ; le moteur affiche le score atteignable si chaque note gagne +1.

---

## 2. Générateur de concepts

### 2.1 Entrées (brief)
Discipline (ou aucune), objectif principal, localisation, infrastructure, budget, participants, capacité, durée, public, ressources humaines, matériel, partenaires, contraintes techniques, niveau d'innovation souhaité `ν ∈ {1..5}`, objectifs économiques, ambition médiatique `μ ∈ {1..5}`.
Toute entrée absente est remplacée par **trois hypothèses** (basse, médiane, haute) et le générateur produit un jeu de concepts par hypothèse médiane, en listant les hypothèses dans `hypotheses`.

### 2.2 Normalisation
- Palier budgétaire `T` (bornes basses incluses, hautes exclues) : T0 < 5 k€ ≤ T1 < 30 k€ ≤ T2 < 150 k€ ≤ T3 < 1 M€ ≤ T4.
- Données absentes : hypothèses médianes par défaut, listées dans `hypotheses` — budget 15 k€, capacité 400, 20 personnes, intérieur, 1 000 m², innovation 3/5 ; le jeu « bas / haut » est proposé à l'utilisateur pour relancer la génération.
- Capacité humaine `H` = Σ (personnes × heures disponibles).
- Équipements disponibles → ensemble `Tech` (sono, écran, chronométrage…).

### 2.3 Filtrage des briques
Une brique `b` est admissible si :
`b.budget_tier_min ≤ T` ∧ `b.staff_min ≤ effectif (personnes)` ∧ `b.tech ⊆ Tech ∪ louable(T)` ∧ `b.setting compatible` ∧ `b.min_area_m2 ≤ surface`.

- `louable(T)` = {sono, écran, chronométrage, éclairage scénique, casques audio, streaming} dès T1 ; `app_web` et `billetterie_en_ligne` toujours accessibles (coût marginal faible).
- Compatibilité de cadre : une brique `indifferent` convient à tout lieu ; un lieu `mixte` accepte les briques `interieur` et `exterieur`.

### 2.4 Squelette par direction
Six directions, chacune avec des emplacements (slots) obligatoires et un profil de pondération :

| Direction | Slots obligatoires | Profil (poids des attributs) |
|---|---|---|
| Accessible et économique | règles, mise en scène, monétisation | coût −3, complexité −2, inclusion +2 |
| Optimisé (vs existant) | règles, qualification, interaction public | ux_gain +3, novelty +1 |
| Premium | mise en scène, scénographie, son/lumière, monétisation | media +2, revenue +3, coût +0 |
| Expérimental / disruptif | règles, mécanique de jeu | novelty +4, complexité −1 |
| Hybride physique-digital | expérience digitale, création de contenu | media +2, portability +1 |
| Communautaire / participatif | interaction public, fidélisation, mécanique de jeu | inclusion +2, ux_gain +2 |

### 2.5 Remplissage des slots
Pour chaque slot, score d'utilité d'une brique admissible :

```
U(b) = Σ_a profil_a × attr_a(b)            (adéquation à la direction)
     + 0,5 × direction_fit(b)
     + ν/5 × 2 × nouveauté_transfert(b)     (cf. §3)
     + 1 × compat(b, sélection)             (+1 si listée compatible, −∞ si incompatible)
     − (5 − ν) / 5 × complexité(b)
```

Sélection par tirage **softmax** à température `τ = 0,3 + 0,2 × ν` avec graine fixée (reproductible). Les slots facultatifs sont remplis tant que le budget et `H` le permettent.

### 2.6 Contrôles de cohérence
Rejet si : durée du programme > durée disponible ; besoins en personnel (§6, en personnes × heures) > `H` ; effectif estimé > capacité ; paire de briques incompatibles. Le candidat est réparé (suppression de la brique la plus coûteuse) au plus 3 fois, puis abandonné.

### 2.7 Diversité
Le générateur tire `N = 4` candidats par direction [param] (24 pour les 6 directions) et retient **un concept par direction** par sélection gloutonne (MMR) : `argmax λ × pré-score − (1 − λ) × max Jaccard(blocs, déjà retenus)`, `λ = 0,7` [param]. Un candidat trop proche d'un concept déjà retenu (Jaccard > 0,5) est écarté ; si aucun candidat d'une direction ne respecte ce seuil, la direction est signalée « sans proposition distincte » plutôt que remplie par un doublon.

### 2.8 Pré-notation automatique
Note provisoire par critère à partir des attributs agrégés des briques (moyenne pondérée par l'importance du slot), arrondie au 0,5, marquée `jugement_expert` et **toujours revue par un humain** avant passage en `review`.

### 2.9 Couche rédactionnelle (V1)
Un modèle de langage rédige nom, pitch et description à partir du squelette **structuré**. Sortie validée contre `event-config.schema.json`. Interdiction de générer chiffres de marché, sources ou retours d'expérience : ces champs restent vides tant qu'ils ne sont pas alimentés par la veille.

---

## 3. Moteur de transposition intersectorielle

Taxonomie des familles (voir `watch-entry.sector_family`). Distance de transfert `d(source, cible)` :
0 = même discipline · 1 = même famille · 2 = familles voisines (sport ↔ esport, festival ↔ spectacle, tv ↔ jeu) · 3 = familles éloignées.

```
nouveauté_transfert = d / 3 × plausibilité
plausibilité ∈ {0 ; 0,5 ; 1}   (matrice de compatibilité mécanique, revue humaine)
```

La plausibilité nulle (ex. mécanique de vitesse pure appliquée à une discipline sans chronométrage possible) annule la nouveauté : on ne récompense pas l'innovation artificielle.

Chaque transposition produit une fiche : logique empruntée → adaptation → ce qui n'est **pas** repris (nom, identité, éléments protégés).

---

## 4. Simulateur de compétition

Pour chaque étape `s` avec `n` entrants, durée d'un créneau `d`, changement `c`, unités parallèles `p` :

| Type | Nombre de créneaux `M` | Tours séquentiels |
|---|---|---|
| `time_trial` (passages chronométrés) | `n × passages` | 1 |
| `round_robin` en `g` poules | `g × k(k−1)/2`, `k = ⌈n/g⌉` | `k − 1` (k pair) ou `k` (k impair) |
| `single_elimination` | `n − 1` (+1 petite finale) | `⌈log2 n⌉` |
| `double_elimination` | `2n − 2` (ou `2n − 1`) | `≈ 2⌈log2 n⌉` |
| `swiss` | `⌊n/2⌋ × rondes` | rondes |
| `battle_royale` | défini par paliers (unités fermées à chaque palier) | paliers |

```
durée(s) = Σ_tours ⌈M_tour / p⌉ × (d + c)  ×  (1 + marge)      marge = 0,15 [param]
```

Contrainte de repos : un même participant ne joue pas deux créneaux consécutifs si `repos_min > c` ; sinon le simulateur insère un créneau tampon. Sorties : durée par étape, heure de fin, taux d'occupation des terrains, temps d'attente moyen d'un participant entre deux passages.

---

## 5. Simulateur de flux

Modèle fluide minute par minute (suffisant pour du dimensionnement, pas pour de la sécurité de foule) :

```
λ(t) = effectif × part_arrivées(t)                 (profil d'arrivée)
capacité_service = guichets × μ                    (μ en personnes/min/guichet)
Q(t+1) = max(0, Q(t) + λ(t) − capacité_service)
attente_max ≈ max_t Q(t) / capacité_service
```

Débits par défaut [param] : contrôle billet QR 8 pers/min/file ; contrôle billet + sac 3 pers/min/file ; buvette 1,5 pers/min/caisse.
Dimensionnement : nombre minimal de files tel que `attente_max ≤ cible` (10 min par défaut).

Occupation : `P(t) = Σ arrivées − Σ départs` (départ = arrivée + temps de présence moyen). Densité par zone `P_z / surface_z`.
Alertes **indicatives** : > 2 pers/m² en zone debout (orange), > effectif autorisé du lieu (rouge, bloquant). Le simulateur **ne remplace pas** l'avis du chargé de sécurité ni la réglementation ERP / préfectorale.

---

## 6. Personnel et montage

Besoins par fonction = max(planchers fixes, effectif / ratio) [param, à adapter] :

| Fonction | Ratio indicatif par défaut |
|---|---|
| Accueil / contrôle | 1 par file ouverte + 1 superviseur |
| Orientation / placement | 1 pour 150 spectateurs |
| Buvette | 1 par caisse + 1 par préparation |
| Compétition (arbitrage, table, chrono) | selon règlement × unités parallèles |
| Sécurité / secours | **dimensionnement réglementaire externe** (référentiel DPS, prestataire agréé) — jamais calculé par l'outil |

Montage : méthode du chemin critique (CPM) sur les tâches `program[kind=montage]` et leurs `depends_on` ; sortie : durée minimale, marge par tâche, tâches critiques.

---

## 7. Simulateur financier

### 7.1 Recettes et dépenses par scénario `σ ∈ {prudent, central, ambitieux}`

```
A_σ = spectateurs · P_σ = participants · payants = A_σ × paying_share

Recette(l, σ) = unit_amount × volume(l, σ) × margin_rate × k(l, σ)
   volume = 1 (fixed) | payants | A_σ | P_σ  selon basis
   k(l, σ) = réalisation(certitude_l, σ)   si basis = fixed (sponsors, subventions, forfaits)
           = 1                             sinon (l'incertitude est déjà portée par le volume du scénario :
                                                   appliquer aussi le taux serait une double décote)

Dépense(e, σ) = amount × volume(e, σ) × (1 + dérive_σ si certitude ≠ devis)

Résultat_σ = Σ Recettes − Σ Dépenses × (1 + contingence)
```

Taux de réalisation par défaut [param] :

| Certitude | Prudent | Central | Ambitieux |
|---|---|---|---|
| Sécurisée (signée/encaissée) | 1,0 | 1,0 | 1,0 |
| Probable (accord oral, reconduction) | 0,5 | 0,8 | 1,0 |
| Hypothétique (à prospecter) | 0,0 | 0,3 | 0,7 |

Dérive des coûts non devisés : prudent +15 %, central +5 %, ambitieux 0 % [param]. Contingence : 10 % [param].

### 7.2 Seuil de rentabilité (en spectateurs)

Même scénario `σ` que §7.1 (central par défaut), mêmes dérives, marges et provision. Avec `d(e)` = dérive du scénario si la dépense n'est pas devisée, `c = 1 + contingence` :

```
F = Σ_fixes amount·(1+d)·c + P · Σ_par_participant amount·(1+d)·c
    − Σ_recettes_fixes unit·margin·réalisation(σ) − P · Σ_recettes_par_participant unit·margin
m = paying_share · Σ_par_payant unit·margin + Σ_par_spectateur unit·margin − Σ_dépenses_par_spectateur amount·(1+d)·c
A* = ⌈F / m⌉          (F ≤ 0 : couvert sans spectateur ; m ≤ 0 : « pas de seuil — chaque spectateur supplémentaire coûte »)
```

Par construction, `Résultat_σ(A) = m·A − F` : le seuil est cohérent avec la simulation (test unitaire dédié).

### 7.3 Trésorerie
Chaque ligne a un décalage `pay_offset_days` / `cash_offset_days` relatif à J. Le moteur trie les flux par date et calcule le solde cumulé ; **besoin de trésorerie = −min(solde cumulé)**. Les subventions sont par défaut encaissées après J (+60 j) [param], ce qui crée souvent le pic de besoin.

### 7.4 Sensibilité
Variation unitaire de chaque facteur, toutes choses égales par ailleurs, sur le scénario central : fréquentation ±20 %, sponsoring ±30 %, dépenses ±15 %, prix ±10 % [param]. Sortie : diagramme en tornade (Δ résultat) et élasticité `(ΔR/R) / (Δx/x)`.

### 7.5 Classement des recettes
Affichage systématique des recettes en trois colonnes : **sécurisées / probables / hypothétiques**, et du ratio « recettes sécurisées / dépenses engagées » à chaque jalon du rétroplanning.

---

## 8. Simulateur d'incidents

Chaque incident est une transformation de la configuration, suivie d'une nouvelle simulation :

| Incident | Transformation | Réponse proposée (issue de `risks[].continuity_plan`) |
|---|---|---|
| Retard du programme (+x min) | Décale les séquences dépendantes ; compresse les séquences `critical = false` jusqu'à −30 % | Ordre de compression, séquences supprimables |
| Désistement de participants (−k) | Recalcule le tableau de compétition | Repêchage liste d'attente, format de poule réduit |
| Absence d'un prestataire | Retire les équipements/staff de la source concernée | Fournisseur de secours, mode dégradé |
| Panne informatique | Désactive les briques `experience_digitale`, chronométrage numérique | Procédure papier, chrono manuel |
| Défaillance électrique | Retire tout équipement `power_w > 0` sauf `on_generator = true` | Groupe de secours, programme acoustique |
| Météo défavorable | Bascule vers la variante `kind = secours` (lieu de repli, programme resserré) | Repli intérieur, report, assurance |
| Affluence −x % / +x % | Modifie `A_σ` ; recalcule flux, personnel, finances | Ouverture de files, jauge, communication |
| Réduction de budget −x % | Supprime les dépenses `optional` puis par `priority` décroissante | Liste des postes coupés et impact sur la note |

Sortie : écart sur durée, attente, densité, résultat financier ; liste des actions de continuité.

---

## 9. Veille : déduplication et fiabilité

- Clé `dedupe_key = slug(nom) | slug(organisateur) | année`.
- Deux fiches sont fusionnées si clé identique, **ou** similarité de titre (Jaccard sur trigrammes) ≥ 0,8 et même pays et dates à ±30 j.
- La fiche fusionnée conserve toutes les sources (`merged_from`) et prend la fiabilité **la plus haute justifiée par une source primaire**.
- Fiabilité : A source officielle/primaire · B presse ou étude reconnue · C secondaire non recoupée · D déclaratif. Un chiffre clé n'est marqué `fait_verifie` que s'il provient d'une source A, ou de deux sources B indépendantes.

---

## 10. Apprentissage post-événement

```
écart_kpi = (réel − prévu) / prévu
biais_moyen(paramètre) = moyenne des écarts sur les N derniers événements comparables
```

- Les paramètres `[param]` (débits, taux de réalisation, dérives) sont recalibrés **sur proposition** : le moteur propose une nouvelle valeur, un humain valide.
- Un événement `validated` n'est jamais modifié. Après l'événement : (1) une **version de réalisation** `x.(y+1).0`, `maturity = executed`, enregistre les données réelles (`actual_amount`, `kpis[].actual`, `post_event`, évaluation `reelle`, la prévisionnelle passant dans `evaluations_history`) ; (2) le moteur propose une **version améliorée** `draft x.(y+2).0` avec la liste des changements, soumise à approbation (workflow W6 de `05-workflows-utilisateurs.md`).
- Les incidents réels alimentent le registre des erreurs (nouvelle entrée ou enrichissement d'une entrée existante).
