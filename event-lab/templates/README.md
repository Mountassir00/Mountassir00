# Modèles documentaires EVENT LAB — mode d'emploi

Ces modèles permettent à une équipe, y compris extérieure au studio, de produire le dossier **EVENT BLUEPRINT** d'un événement et ses documents d'exploitation. La spécification complète (contenu de chaque section, sources des données, règles éditoriales, contrôle qualité) est dans [`docs/08-modeles-documentaires.md`](../docs/08-modeles-documentaires.md). Les schémas de données de référence sont dans [`schemas/`](../schemas/).

> Statut : les modèles sont utilisables à la main dès maintenant. Le générateur `scripts/build-blueprint` (résolution automatique des champs `{{…}}`, simulations, exports PDF/DOCX/XLSX/PPTX) est **prévu, non développé**.

## 1. Contenu du dossier

| Fichier | Usage | Données liées | Spécification |
|---|---|---|---|
| `BLUEPRINT-TEMPLATE.md` | Dossier EVENT BLUEPRINT en 40 sections | `event.json` (EventConfig) | 08 §2 |
| `fiche-veille.md` | Saisie ou relecture d'une fiche de veille | `schemas/watch-entry.schema.json` | 08 §4.1 |
| `fiche-erreur.md` | Entrée du registre des erreurs | `schemas/error-entry.schema.json` | 08 §4.2 |
| `bilan-post-evenement.md` | Bilan prévu / réel après l'événement | EventConfig exécuté + données réelles | 08 §4.3 |
| `dossier-sponsoring.md` | Structure des 12 diapositives du dossier partenaires (PPTX) | `sponsor_packages[]`, `audience`, `media` | 08 §4.4 |
| `manuel-reproduction.md` | Manuel pour une équipe qui reproduit le format | EventConfig + rédigé | 08 §4.10 |
| `conducteur.csv` | Conducteur minute par minute | `program[]` | 08 §4.5 |
| `retroplanning.csv` | Jalons et points go/no-go | `milestones[]` + 2 colonnes de suivi | 08 §4.6 |
| `matrice-risques.csv` | Matrice des risques | `risks[]` | 08 §4.7 |
| `budget.csv` | Dépenses prévisionnelles | `budget.expenses[]` | 08 §2, section 28 |
| `recettes.csv` | Recettes prévisionnelles | `budget.revenues[]` | 08 §2, section 29 |
| `checklists/checklist-J-120-a-J-1.md` | Préparation par jalon | `milestones[]`, `compliance[]` | 08 §4.9 |
| `checklists/checklist-jour-J.md` | Ouverture, pendant, fermeture | conducteur, fiches réflexes | 08 §4.9 |
| `checklists/checklist-securite-accessibilite.md` | Démarches et contrôles de sécurité et d'accessibilité, sources officielles | `compliance[]`, `venue.erp` | 08 §4.9, section 32 |
| `checklists/checklist-benevoles.md` | Recrutement, préparation, jour J, reconnaissance | `resources.staff[status=benevole]` | 08 §4.9 |
| `checklists/checklist-sponsors.md` | Du démarchage au compte rendu | `sponsor_packages[]`, `budget.revenues[]` | 08 §4.9 |
| `checklists/checklist-post-evenement.md` | Clôture, bilan, nouvelle version | bilan | 08 §4.9 |

## 2. Démarrer un blueprint

1. Créer le dossier `blueprints/<id>/` (`<id>` = identifiant en minuscules et tirets, identique à `event.json → id`).
2. Créer `blueprints/<id>/event.json`, valide contre `schemas/event-config.schema.json` (exemple minimal : `docs/03-modele-de-donnees.md` §6).
3. Copier `BLUEPRINT-TEMPLATE.md` en `blueprints/<id>/blueprint.src.md` et renseigner le bloc `meta` en tête (organisateur, ville, date de J, confidentialité).
4. Copier les CSV utiles dans `blueprints/<id>/data/`, les remplir, puis reporter leurs lignes dans `event.json` (le JSON fait foi ensuite).
5. Rédiger les sections manuelles et semi-automatiques directement dans `blueprint.src.md`, à la place des marqueurs `[À COMPLÉTER : …]`.
6. Contrôler avec la checklist de complétude et les cohérences croisées (`docs/08` §5), puis passer la version en `review`.

### Mode manuel transitoire (sans générateur)

Tant que `build-blueprint` n'existe pas :
- remplacer chaque champ `{{chemin}}` par la valeur lue dans `event.json`, dans une **copie** `blueprint.md` (ne jamais modifier `blueprint.src.md`, qui reste le modèle rempli) ;
- calculer les valeurs `{{sim.*}}` avec les formules de `docs/07-algorithmes.md` (ou l'application quand elle sera disponible) et indiquer en tête du document : « Valeurs calculées manuellement le JJ/MM/AAAA » ;
- produire les exports avec pandoc (`pandoc blueprint.md -o blueprint.docx`) ou LibreOffice, et ouvrir les CSV dans un tableur.

## 3. Syntaxe des modèles

| Élément | Signification |
|---|---|
| `{{chemin}}` | Champ d'`event.json` (ex. `{{identity.name}}`) |
| `{{chemin\|filtre}}` | Valeur formatée : `eur`, `pct`, `hhmm`, `jrel`, `join`, `count`, `yesno`, `date` |
| `{{#each liste}} … {{/each}}` | Une ligne par élément ; `{{.champ}}` = champ de l'élément |
| `{{#each liste where .champ=valeur}}` | Idem, filtré (`=`, `!=`, `in [a,b]`, `not in [a,b]`) |
| `{{#if chemin}} … {{else}} … {{/if}}` | Bloc conditionnel |
| `{{sim.*}}` | Résultat de simulation (jamais saisi à la main dans `event.json`) |
| `{{meta.*}}` | Bloc `meta` en tête de `blueprint.src.md` |
| `{{data.*}}` | Colonnes hors schéma d'un CSV de `data/` |
| `{{build.*}}` | Date et identifiant de génération |
| `[À COMPLÉTER : …]` | Texte à rédiger ; interdit au statut `validated` |
| `<!-- … -->` | Consigne de rédaction (non exportée) |

Liste complète des sorties `sim.*` : `docs/08` §1.3.

## 4. Règles de rédaction (résumé de `docs/08` §3)

- **Aucun chiffre ni source inventé.** Une donnée inconnue reste vide ou devient une hypothèse explicite (`hypotheses[]`).
- Chaque chiffre rédigé porte son statut : `[FAIT S-xx]`, `[ESTIMATION]` (avec la base de calcul), `[HYPOTHÈSE H-nn]`.
- « Fait vérifié » = source de fiabilité A, ou deux sources B indépendantes.
- Exemples : uniquement dans des blocs titrés **EXEMPLE FICTIF** ; dans les CSV, lignes dont l'identifiant commence par `EX-`. Les supprimer avant usage.
- Rôles plutôt que noms de personnes ; coordonnées nominatives uniquement en annexe à diffusion restreinte.
- Aucun nom, logo ou élément protégé d'un autre événement : on emprunte des logiques, pas des identités.
- Avertissement « implantation non validée réglementairement » sur la couverture, les plans et les sections 20, 25 et 32 (texte exact : `docs/08` §3.5).
- Une version `validated` ne se modifie pas : créer une nouvelle version `draft`.

## 5. Conventions des fichiers CSV

| Règle | Valeur |
|---|---|
| Encodage | UTF-8 |
| Séparateur de colonnes | `;` |
| Séparateur décimal | `.` (point), ex. `0.6` |
| Booléens | `oui` / `non` |
| Listes dans une cellule | éléments séparés par ` \| ` (espace, barre verticale, espace) |
| Cellule vide | valeur inconnue ou à renseigner (jamais « 0 » par défaut) |
| Texte contenant `;` | entre guillemets doubles |
| Échéances relatives | entier en jours, négatif avant J (ex. `-30` = J-30) |
| Heures | `HH:MM` ; la veille de J : `J-1 22:00` |
| Montants | dans la devise de `budget.currency`, TTC sauf mention contraire (à confirmer avec l'expert-comptable de la structure) |
| Lignes d'exemple | identifiant `EX-…` : à supprimer ; l'import doit les rejeter |

Ouvrir dans un tableur : LibreOffice Calc (« Jeu de caractères : UTF-8 », « Séparé par : point-virgule ») ou Excel (Données → À partir d'un fichier texte/CSV → Origine UTF-8, délimiteur point-virgule). Vérifier que le tableur n'a pas converti les décimales ou les heures.

### 5.1 `budget.csv` → `budget.expenses[]`

| Colonne | Champ | Valeurs admises |
|---|---|---|
| `id` | `id` | `D-nn` (convention proposée) |
| `categorie` | `category` | texte libre ; liste proposée ci-dessous |
| `libelle` | `label` | texte |
| `montant` | `amount` | nombre ; montant fixe si `base = fixed`, unitaire sinon |
| `base` | `basis` | `fixed` · `per_attendee` · `per_participant` |
| `certitude` | `certainty` | `devis` · `estimation` · `hypothese` |
| `optionnel` | `optional` | `oui` / `non` |
| `priorite` | `priority` | `1` indispensable · `2` · `3` premier poste coupé |
| `decalage_paiement_J` | `pay_offset_days` | entier relatif à J |
| `source` | `source_ref` | `S-nn` ; obligatoire si `certitude = devis` |

Catégories proposées (le schéma ne les impose pas) : `lieu`, `technique`, `materiel_sportif`, `scenographie`, `signaletique_impression`, `securite_secours`, `personnel`, `benevoles`, `restauration_achats`, `communication`, `recompenses`, `assurance`, `droits_taxes`, `digital_billetterie`, `transport_logistique`, `administratif`, `divers`.

Le fichier contient une liste de postes courants sans montant : supprimer les postes sans objet, en ajouter si besoin, et chiffrer chaque ligne conservée. Les frais calculés par billet vendu doivent être ramenés au spectateur (le schéma n'a pas de base « par spectateur payant » pour les dépenses).

### 5.2 `recettes.csv` → `budget.revenues[]`

| Colonne | Champ | Valeurs admises |
|---|---|---|
| `id` | `id` | `R-nn` |
| `flux` | `stream` | `billetterie` · `inscriptions` · `sponsoring` · `subvention` · `restauration` · `merchandising` · `premium` · `digital` · `licence` · `autre` |
| `libelle` | `label` | texte |
| `montant_unitaire` | `unit_amount` | prix unitaire, ou montant forfaitaire si `base = fixed` |
| `base` | `basis` | `fixed` · `per_paying_attendee` · `per_attendee` · `per_participant` |
| `taux_marge` | `margin_rate` | 0 à 1 (part conservée ; `1` si aucun coût direct) |
| `certitude` | `certainty` | `secured` (signé ou encaissé) · `probable` (accord oral, reconduction) · `hypothetical` (à prospecter) |
| `decalage_encaissement_J` | `cash_offset_days` | entier relatif à J |

Billetterie : une ligne `per_paying_attendee` s'applique à **tous** les spectateurs payants ; avec plusieurs tarifs, utiliser un prix moyen pondéré et documenter la répartition en section 29. Sponsoring : une ligne par palier de `sponsor_packages[]`, avec `montant_unitaire = prix × quantité` (`docs/08` §5.2, C3).

### 5.3 `conducteur.csv` → `program[]`

| Colonne | Champ | Règle |
|---|---|---|
| `heure_debut`, `heure_fin` | `start_min`, `start_min + duration_min` | minutes depuis 00:00 de J converties en `HH:MM` |
| `duree_min` | `duration_min` | entier |
| `sequence` | `id` + `label` | « P-07 — Finale » |
| `espace` | `space` | identifiant d'un espace de `venue_requirements.spaces[]` |
| `responsable` | `owner_role` | rôle existant dans `resources.staff[]` |
| `intervenants` | — | hors schéma, saisi à la main |
| `son`, `lumiere`, `video`, `micro` | `cues[]` | préfixes `SON:`, `LUM:`, `VID:`, `MIC:` |
| `notes` | `cues[]` sans préfixe | |
| `critique` | `critical` | `oui` / `non` |

Le type de séquence (`kind` : montage, accueil, competition, show, ceremonie, pause, animation, demontage, media) n'a pas de colonne : il est renseigné directement dans `event.json`.

### 5.4 `retroplanning.csv` → `milestones[]`

| Colonne | Champ | Règle |
|---|---|---|
| `jalon` | `label` | unique (sert de clé) |
| `echeance_relative_J` | `offset_days` | entier relatif à J |
| `responsable` | `owner_role` | rôle |
| `livrable` | `deliverable` | vérifiable |
| `dependances` | — (suivi) | libellés de jalons séparés par ` \| ` |
| `statut` | — (suivi) | `a_faire` · `en_cours` · `fait` · `bloque` · `go` · `no_go` |
| `go_no_go` | `go_no_go` | critère de décision vérifiable ; vide sinon |

Le fichier contient un rétroplanning type de J-120 à J+45, aligné sur `checklists/checklist-J-120-a-J-1.md`. Les échéances sont des recommandations de planification, placées avant les délais légaux relevés dans la checklist sécurité ; adapter chaque ligne aux délais confirmés par les autorités locales.

### 5.5 `matrice-risques.csv` → `risks[]`

| Colonne | Champ | Règle |
|---|---|---|
| `id` | `id` | `RSK-nn` |
| `categorie` | `category` | `securite` · `reglementaire` · `operationnel` · `financier` · `meteo` · `technique` · `reputationnel` · `juridique` · `sante` · `environnement` |
| `description` | `description` | texte |
| `probabilite_1_5`, `impact_1_5` | `probability`, `impact` | entiers 1 à 5, évalués localement |
| `criticite` | — (calculé) | probabilité × impact ; ne pas saisir |
| `critique` | `critical` | `oui` exige un plan de continuité |
| `signes_precurseurs` | `warning_signs[]` | liste ` \| ` |
| `prevention` | `prevention[]` | liste ` \| ` |
| `plan_continuite` | `continuity_plan` | texte |
| `responsable` | `owner_role` | rôle |
| `statut` | `status` | `ouvert` · `traite` · `accepte` |

Le fichier contient seize risques types (dont les huit incidents de `docs/07` §8) **sans probabilité ni impact** : ces valeurs dépendent du lieu, de la saison et du format et doivent être évaluées par l'équipe. Trois risques sont pré-marqués critiques (affluence supérieure à l'effectif autorisé, blessure d'un participant, autorisation non obtenue) ; ce marquage peut être renforcé, pas retiré sans justification écrite.

## 6. Conventions d'identifiants proposées

| Objet | Format | Exemple |
|---|---|---|
| Dépense | `D-nn` | `D-07` |
| Recette | `R-nn` | `R-03` |
| Risque | `RSK-nn` | `RSK-10` |
| Point de conformité | `C-nn` | `C-04` |
| KPI | `K-nn` | `K-02` |
| Séquence du programme | `P-nn` | `P-12` |
| Palier de sponsoring | `SP-nn` | `SP-01` |
| Source | `S-nn` | `S-15` |
| Hypothèse | `H-nn` (rang dans `hypotheses[]`, base 1) | `H-03` |
| Fiche de veille | `W-AAAAMMJJ-slug` (schéma) | — |
| Fiche d'erreur | `E-NNN` (schéma) | — |
| Brique | `B-<type>-<slug>` (schéma) | — |
| Exemple fictif | préfixe `EX-` | `EX-D-99` |

Seuls les trois derniers formats de fiche et de brique sont imposés par les schémas ; les autres sont des conventions de lisibilité.

## 7. Checklists

Chaque point suit le format : `- [ ] Action vérifiable — responsable (rôle) — preuve attendue — référence`. Cocher un point exige que la preuve existe. Les points issus du registre des erreurs sont ajoutés en fin de checklist avec leur identifiant `E-…`.

La checklist sécurité et accessibilité est **prévisionnelle** : elle liste les démarches à vérifier avec les sources officielles consultées (et leur date), mais la validation appartient aux autorités, à l'exploitant et au chargé de sécurité. Les délais et seuils y sont cités tels que relevés dans les sources ; ceux qui n'ont pas été vérifiés sont signalés « à vérifier auprès de … ». Relire les textes en vigueur avant chaque usage.
