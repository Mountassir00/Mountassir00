# Fiche de veille — W-AAAAMMJJ-slug

<!--
MODÈLE — fiche de veille EVENT LAB. Spécification : docs/08-modeles-documentaires.md §4.1.
Source de vérité : JSON conforme à schemas/watch-entry.schema.json, enregistré dans knowledge/veille/AAAA/MM/W-AAAAMMJJ-slug.json.
Cette fiche Markdown sert à la saisie humaine ou à la relecture ; elle est convertie en JSON (les noms de champs sont indiqués entre crochets).
Règles :
- Ne jamais inventer : un champ inconnu reste vide (null dans le JSON). Pas de statistique, de coût ou de retour d'expérience sans source.
- Chaque affirmation chiffrée est une ligne du tableau « Affirmations qualifiées », avec statut et source.
- Fiabilité : A source officielle ou primaire · B presse ou étude reconnue · C secondaire non recoupée · D déclaratif ou non vérifié.
- « Fait vérifié » exige une source A, ou deux sources B indépendantes (docs/07 §9).
- Aucune donnée personnelle d'auteurs d'avis ou de commentaires.
- Avant d'enregistrer : calculer dedupe_key et chercher une fiche existante avec la même clé (fusion plutôt que doublon).
-->

## 1. Identification

| Champ | Valeur |
|---|---|
| Identifiant [`id`] | W-AAAAMMJJ-slug |
| Clé de dédoublonnage [`dedupe_key`] | slug(nom)\|slug(organisateur)\|année |
| Nom de l'événement [`event_name`] | |
| Organisateur [`organizer`] | |
| Échelle de l'organisateur [`organizer_scale`] | grande_organisation · intermediaire · independant · association · startup · inconnu |
| Pays (ISO 3166-1 alpha-2) [`country`] | |
| Ville [`city`] | |
| Discipline [`discipline`] | |
| Famille sectorielle [`sector_family`] | sport · esport · musique_festival · spectacle · tv_media · parc_loisirs · exposition_immersive · mode_luxe · salon_pro · activation_marque · cinema · jeu · communautaire · universitaire · tourisme · autre |
| Date ou période de l'événement [`event_date`] | AAAA-MM-JJ ou AAAA-MM-JJ/AAAA-MM-JJ |
| Date de publication de l'information [`published_at`] | AAAA-MM-JJ |
| Date de collecte [`collected_at`] | AAAA-MM-JJ |
| Fréquence de veille [`cadence`] | quotidienne · hebdomadaire · mensuelle · trimestrielle · annuelle · manuelle |
| Fiabilité globale [`reliability`] | A · B · C · D |
| Étiquettes [`tags`] | |

## 2. Sources [`sources[]`]

<!-- Au moins une source. Une ligne par source. Index = rang dans la liste, base 0 (utilisé par les affirmations). -->

| Index | Titre [`title`] | Éditeur [`publisher`] | Type [`type`] : officiel · presse · etude · reseau_social · avis_public · blog · autre | URL [`url`] | Consultée le [`accessed_at`] |
|---|---|---|---|---|---|
| 0 | | | | | |

## 3. Description

**Format [`format_description`]** :

**Innovation principale [`main_innovation`]** :

**Public cible [`target_audience`]** :

**Modèle économique, si disponible [`business_model`]** :

**Résultats observés [`observed_results`]** :
<!-- Uniquement des résultats publiés et sourcés. Sinon laisser vide. -->

## 4. Analyse

| Forces [`strengths[]`] | Faiblesses [`weaknesses[]`] |
|---|---|
| | |

**Contraintes de reproduction [`reproduction_constraints[]`]** :
-

## 5. Transposition [`transposition`]

| Champ | Valeur |
|---|---|
| Potentiel (1–5) [`potential`] | |
| Disciplines cibles [`target_disciplines[]`] | |

Idées de transposition [`ideas[]`] (logique uniquement — jamais de reprise de nom, d'identité visuelle ou d'élément protégé) :
-

## 6. Affirmations qualifiées [`claims[]`]

| Affirmation [`text`] | Statut [`status`] : fait_verifie · estimation · hypothese | Source (index) [`source_index`] |
|---|---|---|
| | | |

## 7. Liens

| Champ | Valeur |
|---|---|
| Briques identifiées [`extracted_blocks[]`] | B-<type>-<slug> (existantes) ou « proposition : … » |
| Erreurs liées [`error_refs[]`] | E-NNN |
| Fiches fusionnées [`merged_from[]`] | W-… |

---

> **EXEMPLE FICTIF** (ne pas réutiliser) — ligne d'affirmation correctement qualifiée :
> | « L'édition a réuni 400 participants » | estimation | 0 |
> Justification du statut : chiffre annoncé par l'organisateur (source 0, type officiel, mais déclaratif non recoupé) → `estimation`, et fiabilité de la fiche limitée à C tant qu'aucune seconde source ne le confirme.
