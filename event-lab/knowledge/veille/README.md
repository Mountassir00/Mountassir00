# knowledge/veille — fiches de veille

Contrat complet : [`docs/06-systeme-de-veille.md`](../../docs/06-systeme-de-veille.md). Schémas : [`watch-entry`](../../schemas/watch-entry.schema.json), [`error-entry`](../../schemas/error-entry.schema.json).

## Organisation

| Chemin | Contenu | Écrit par |
|---|---|---|
| `sources.json` | Catalogue des sources de veille | Humain |
| `validations.json` | Décisions de validation (`publie`, `rejete`) | Humain uniquement |
| `index.json` | Index généré (fiches + décisions) : ne pas éditer | `veille_tools.py index` |
| `AAAA/MM/W-AAAAMMJJ-slug.json` | Une fiche par fichier | Tâches planifiées, puis humain à la validation |
| `analyses/AAAA/MM/A-<id fiche>.json` | Analyse selon la grille des 21 dimensions (doc 06 §9) | Tâches hebdomadaire et mensuelle |
| `propositions-erreurs/E-PROP-<id fiche>-<n>.json` | Brouillons d'entrées du registre des erreurs | Tâches ; promus par l'humain dans `knowledge/registre-erreurs.json` |
| `digests/AAAA/<cadence>-<période>.md` | Un digest par passage | Tâches planifiées |

Les dossiers sont créés au premier passage qui en a besoin.

## Nommage

- Fiche : `W-AAAAMMJJ-slug.json`. `AAAAMMJJ` = date de **collecte** (heure de Paris) ; `slug` = nom de l'événement sans accents, en minuscules, mots séparés par `-`, 60 caractères au plus (`veille_tools.py slug "Nom"`). Collision le même jour : `-2`, `-3`. Le fichier est rangé dans `AAAA/MM/` de la date de collecte et son nom est égal à son `id`.
- Une nouvelle édition d'un événement = une nouvelle fiche ; lien entre éditions par le tag `serie:<slug>`.
- Digests : `quotidienne-AAAA-MM-JJ.md`, `hebdomadaire-AAAA-Www.md`, `mensuelle-AAAA-MM.md`, `trimestrielle-AAAA-Tn.md`, `annuelle-AAAA.md` (période couverte).
- Tags normalisés : `langue:xx`, `lecture:page` ou `lecture:resultat_recherche`, `lancement`, `incident`, `signal_faible`, `resultat`, `acces:partiel`, `maj:AAAA-MM-JJ`, `analyse:A-…`, `serie:…`, `distinct_de:W-…`.

## Catalogue `sources.json`

Champs : `id`, `name`, `url`, `type`, `sector_families` (valeurs de `watch-entry.sector_family`), `scale`, `language` (ISO 639-1), `country` (ISO 3166-1 alpha-2, `INT` pour une organisation internationale), `cadence_suggeree`, `notes`, `verified_at`, `verification`.

`verification` :
- `verifie` : l'URL (ou, quand la note le précise, le domaine et la rubrique) a été renvoyée par la recherche web le 2026-11-24 avec un contenu correspondant à la description. **Les pages n'ont pas été ouvertes** : la lecture était bloquée par le réseau de la session.
- `non_verifie` : la source n'a pas été confirmée ; ne pas l'utiliser avant contrôle.

Premier contrôle à faire par l'opérateur : ouvrir chaque URL, corriger ou retirer celles qui ne répondent pas, puis mettre à jour `verified_at`.

## Index

`index.json` = `{ generated_at, schema, count, entries[] }`. Chaque entrée reprend les champs utiles au tri (id, chemin, nom, organisateur, pays, famille, échelle, dates, cadence, fiabilité, `dedupe_key`, langue, lecture, petit organisateur) et le **statut** : `a_valider`, `publie`, `rejete`, `fusionne` (avec `merged_into`). Une fiche publiée puis enrichie (`maj:` postérieur à la validation) repasse en `a_valider` avec `revalidation: true`. En cas de conflit git : régénérer, ne pas fusionner à la main.

## Procédure de validation

Délai cible : 14 jours après la collecte.

1. Lister les fiches à valider : `jq '.entries[] | select(.status=="a_valider") | .path' event-lab/knowledge/veille/index.json`.
2. Ouvrir **chaque URL** de `sources` : existence, date, pertinence. Une URL morte ou hors sujet est retirée ; si plus aucune source ne tient, rejeter.
3. Requalifier la fiabilité (doc 06 §7.2) et chaque affirmation (§7.1, §7.3 : chiffre clé = source A lue ou deux sources B indépendantes lues). Remplacer `lecture:resultat_recherche` par `lecture:page`.
4. Supprimer tout texte copié, toute citation de plus de 25 mots et toute donnée personnelle (auteurs d'avis, bénévoles, participants).
5. Vérifier les doublons : `python3 /tmp/veille/veille_tools.py doublons` ; fusionner selon §8.3 ou marquer `distinct_de:<id>` sur les deux fiches.
6. Relire les analyses et les propositions d'erreurs liées ; promouvoir une proposition selon §10.3.
7. Consigner la décision dans `validations.json` :
   ```json
   { "W-AAAAMMJJ-slug": { "status": "publie", "by": "<initiales>", "at": "AAAA-MM-JJ", "note": "<motif si rejet, corrections faites>" } }
   ```
8. Contrôler et régénérer : `python3 /tmp/veille/veille_tools.py validate` (0 erreur), puis `index` ; committer avec un message `veille(validation): <n> publiées, <m> rejetées`.

Outil : extraire `veille_tools.py` de l'annexe A du doc 06 (commande donnée en tête de l'annexe).
