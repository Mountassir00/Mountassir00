# 01 — Cahier des charges fonctionnel

> Version du document : 0.1 — 2026-11-24 — brouillon soumis au porteur.
> Références : `docs/00-brief-initial.md` (brief, cité « brief §n »), `docs/07-algorithmes.md` (contrat du moteur, cité « A§n »), `schemas/*.schema.json`. Documents liés : `04-maquettes-ux-ui.md`, `05-workflows-utilisateurs.md`.
> Ce document décrit **l'outil** EVENT LAB, pas un événement. Aucun chiffre de marché n'y figure. Les valeurs cibles (performances, délais) sont des **exigences fixées par ce document**, à confirmer par le porteur. Elles ne décrivent aucun résultat observé.

---

## 1. Objet et contexte

**Objet.** Spécifier les fonctions d'EVENT LAB, système de R&D événementielle qui transforme une veille sourcée en concepts notés, simulés et documentés (EVENT BLUEPRINT), reproductibles par une équipe tierce.

**Contexte (hypothèses validées par le porteur).**
- **H1** : EVENT LAB est un studio de formats événementiels, utilisé en interne puis commercialisé sous licence.
- **H2** : le premier blueprint porte sur un format sportif amateur urbain, dans une ville française moyenne, sur un lieu existant, avec un budget de 10 à 30 k€.
- **H3** : le MVP se compose de la documentation et d'une application web statique sans serveur (JS vanilla en modules ES, données JSON dans le dépôt, `localStorage`). La veille est assurée par des tâches planifiées Claude Code qui versent des fiches JSON dans le dépôt.

**Ce que l'outil n'est pas.** L'outil n'est ni une billetterie, ni un logiciel de gestion de foule, ni un organisme de contrôle. Ses implantations et simulations sont des aides au dimensionnement. Elles ne valent **jamais** validation réglementaire ou technique (brief §8, A§5).

## 2. Objectifs mesurables de l'outil

| # | Objectif | Indicateur | Cible (exigence) | Mesure |
|---|---|---|---|---|
| O1 | Produire vite des pistes exploitables | Délai entre un brief saisi et 6 directions comparables | ≤ 15 min, dont ≤ 2 s de calcul | Horodatage brief → sauvegarde du concept |
| O2 | Garantir la traçabilité des informations | Part des affirmations de veille publiées qui portent un statut et une source | 100 % | Script de validation sur `knowledge/watch/` |
| O3 | Interdire la fabrication | Chiffres de blueprint sans étiquette fait/estimation/hypothèse | 0 | Contrôle à l'export |
| O4 | Protéger les versions validées | Versions `validated` dont l'empreinte a changé | 0 | Contrôle d'intégrité au chargement |
| O5 | Rendre les dossiers repris par un tiers | Sections obligatoires du blueprint complètes avant validation | 100 % (liste F-215) | Indicateur de complétude |
| O6 | Rendre la veille exploitable | Délai médian entre collecte et décision humaine (publiée/rejetée) | ≤ 7 jours | `collected_at` → date de publication |
| O7 | Fiabiliser les décisions | Concepts présentés sans verdict des portes | 0 | Revue des écrans et exports |

## 3. Utilisateurs et rôles

Le MVP est **mono-utilisateur** : une même personne endosse successivement les rôles, sans contrôle d'accès. Les rôles servent à la matrice RACI (doc 05) et au modèle de droits de la V1.

| Rôle | Besoins principaux | MVP | V1 |
|---|---|---|---|
| **Porteur / directeur de projet** | Arbitrer, approuver les versions, voir les verdicts et les risques, piloter le portefeuille | Utilisateur unique | Approbateur, administrateur |
| **Chef de production** | Lieu, programme, simulations, budget, rétroplanning, plans de continuité | Utilisateur unique | Éditeur des blueprints |
| **Analyste veille** | Qualifier les fiches, dédupliquer, publier, extraire briques et erreurs | Revue des fiches via git et l'appli | Gestionnaire de la file de validation |
| **Contributeur créatif** | Briefs, générateur, transpositions, mécaniques, médias, gamification | Utilisateur unique | Éditeur des concepts (sans approbation) |
| **Partenaire licencié** | Recevoir un paquet de format, l'adapter à son lieu, renvoyer ses retours | Reçoit des exports et renvoie du JSON | Accès restreint à ses adaptations |
| **Lecteur externe** (sponsor, collectivité) | Lire une synthèse fiable, sans données internes sensibles | Reçoit des PDF | Lien de lecture seule |

## 4. Conventions

### 4.1 Statut des fonctionnalités (règle 4)

| Étiquette | Abrév. | Définition |
|---|---|---|
| **Opérationnel** | Op. | Fonctionne réellement dans le MVP, avec les données réelles du dépôt ou de l'utilisateur |
| **Simulé** | Sim. | Logique réelle, données de démonstration (fictives et signalées comme telles) |
| **Externe requis** | Ext. | Dépend d'un service ou d'un outil tiers (tâche planifiée Claude Code, accès web, juridique, etc.) |
| **Prévu V1 / Prévu V2** | V1 / V2 | Hors MVP. L'interface peut l'afficher désactivé, avec une explication |

Le statut indiqué est le **statut cible en fin de phase**. Le statut réel de chaque version est consigné dans `CHANGELOG.md`.

### 4.2 Nature des valeurs

Toute valeur affichée se rattache à l'un de trois **niveaux de certitude** (code visuel : doc 04 §6) :

| Niveau | Valeurs du schéma regroupées |
|---|---|
| **Ferme** | `claims.status = fait_verifie` ; `expenses.certainty = devis` ; `revenues.certainty = secured` ; `evidence = donnees_reelles` |
| **Estimé** | `estimation` ; `probable` ; `benchmark_source` |
| **Supposé** | `hypothese` ; `hypothetical` ; `jugement_expert` ; paramètres `[param]` (A, préambule) |

Une **valeur calculée** hérite du niveau le plus faible de ses entrées et l'affiche (« calculé, dépend de n hypothèses »).

### 4.3 Données du MVP

| Couche | Contenu | Accès depuis l'appli |
|---|---|---|
| **Référentiel du dépôt** | `knowledge/building-blocks.json`, `knowledge/errors.json`, `knowledge/watch/*.json` (+ `index.json`), `knowledge/watch/_inbox/` (fiches à valider), `portfolio/<id>/<version>.json`, `blueprints/<id>/<version>/`, paramètres par défaut | Lecture seule (`fetch`) |
| **Espace de travail local** | Brouillons, versions créées localement, paramètres surchargés, préférences | `localStorage`, préfixe `eventlab:` |

Le navigateur ne peut pas écrire dans le dépôt. Un objet créé localement en sort par un **export JSON**, qui est ensuite commité. Un navigateur ne peut pas lister un dossier : chaque dossier lu par l'appli possède un `index.json`, régénéré par script. Les chemins ci-dessus sont une proposition. Si le doc 02 (architecture) en fixe d'autres, le doc 02 prévaut.

## 5. Périmètre par module

### 5.1 Les 17 modules du brief §16

| # | Module | Finalité | Fonctions principales | Phase | Statut |
|---|---|---|---|---|---|
| 1 | Dashboard principal | Situation en un écran | Alertes (portes, conformité, sauvegarde), compteurs de veille et de concepts, activité récente | MVP | Op. |
| 2 | Observatoire international | Exploiter la veille | Liste et filtres des fiches, fiche détaillée, affirmations qualifiées, doublons, vue « à valider » | MVP | Op. (lecture) ; collecte Ext. |
| 3 | Bibliothèque d'inspirations | Capitaliser les briques fonctionnelles | 13 types de briques, filtres, fiche, compatibilités, note de propriété intellectuelle | MVP | Op. |
| 4 | Registre des erreurs | Ne pas reproduire les erreurs | Entrées sourcées, causes et niveau de preuve, signes précurseurs, prévention, plan correctif, injection dans les checklists | MVP | Op. |
| 5 | Laboratoire d'idées | Combiner et transposer librement | Combinaison manuelle de briques, fiches de transposition (A§3) | MVP | Op. |
| 6 | Générateur d'événements | Brief → 6 directions | Hypothèses pour les données manquantes, filtrage, remplissage des slots, diversité, pré-notation (A§2) | MVP | Op. ; rédaction par LLM V1 |
| 7 | Configurateur de lieux | Adapter l'événement au lieu | Saisie du lieu, espaces en rectangles, plan 2D SVG, 5 configurations | MVP simplifié | Op. ; import de plans V1 ; 3D V2 |
| 8 | Simulateur logistique | Dimensionner avant d'engager | Durée de compétition, files, occupation, personnel, chemin critique du montage, incidents (A§4–6, §8) | MVP | Op. (données de démo : Sim.) |
| 9 | Studio d'identité visuelle | Produire l'identité du format | Moodboard, palette, logo, déclinaisons | V1 | V1 |
| 10 | Simulateur financier | Tester la viabilité | 3 scénarios, seuil, trésorerie, tornade, classement des recettes (A§7) | MVP | Op. (données de démo : Sim.) |
| 11 | Gestionnaire de projets | Exécuter le rétroplanning | Tâches, responsables, échéances | V1 | V1 |
| 12 | Calendrier | Voir les échéances | Jalons, échéances de conformité, export iCal | V1 | V1 |
| 13 | Bibliothèque documentaire | Produire et ranger les blueprints | Sommaire de 40 sections, complétude, exports | MVP | Op. ; PDF/DOCX/XLSX/PPTX par scripts |
| 14 | Espace de collaboration | Travailler à plusieurs | Commentaires, revues assignées, approbateur distinct de l'auteur | V1 | V1 |
| 15 | Analyse post-événement | Comparer le prévu et le réel | Saisie du réel, écarts, proposition de nouvelle version (A§10) | MVP minimal ; avancé V2 | Op. (minimal) ; V2 |
| 16 | Système de notifications | Ne rien rater | Échéances, fiches à valider, portes bloquantes | V1 (MVP : alertes du dashboard) | V1 |
| 17 | Espace administrateur sécurisé | Gouverner l'accès | Comptes, rôles, journaux d'audit, sauvegardes | V1 | V1 |

> Arbitrage à confirmer par le porteur : le phasage n'attribue pas explicitement l'analyse post-événement **de base**. Ce document la place en MVP avec la priorité *Could*, car elle n'est utile qu'après un premier événement réel.

### 5.2 Modules transverses

| Module | Finalité | Phase | Statut |
|---|---|---|---|
| Notation /100 et portes éliminatoires | Évaluer sans que le score masque un risque bloquant (A§1) | MVP | Op. |
| Versionnement local | Versions immuables, lignée, clonage, adaptation ville/lieu, diff, approbation | MVP | Op. |
| Exports | JSON et Markdown depuis le navigateur ; PDF, DOCX, XLSX et PPTX par scripts (pandoc, LibreOffice, openpyxl, python-pptx) | MVP | Op. (scripts : hors navigateur, outils installés) |
| Paramètres `[param]` | Consulter et surcharger les hypothèses de modélisation, avec traçabilité | MVP | Op. |
| Parcours utilisateurs (brief §10) | Parcours par rôle × avant/pendant/après, frictions, opportunités | MVP | Op. |
| Dimension médiatique (brief §11) | Moments partageables, spots photo, calendrier éditorial par canal | MVP | Op. |
| Gamification (brief §12) | Mécaniques, rôle cible, note d'équité obligatoire | MVP | Op. |
| Données rejetées / import-export | Diagnostiquer les JSON invalides, sauvegarder et restaurer l'espace local | MVP | Op. |

## 6. Exigences fonctionnelles

Format des critères d'acceptation : **Soit** (contexte) / **Quand** (action) / **Alors** (résultat vérifiable). Priorités MoSCoW : M = Must, S = Should, C = Could, W = Won't (MVP). Colonne « Ph./St. » : phase et statut cible.

### 6.1 Socle transverse

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-001 | Au démarrage, charger les index du référentiel et l'espace local, sans aucune requête vers un domaine externe | M | MVP Op. | Soit le dépôt servi en `http://localhost`, Quand j'ouvre l'appli, Alors le dashboard affiche ses compteurs et l'onglet réseau ne montre que des requêtes vers localhost |
| F-002 | Valider chaque objet chargé contre son schéma. Un objet invalide est écarté et listé dans « Données rejetées » avec le chemin et le motif de l'erreur | M | MVP Op. | Soit une fiche sans `sources`, Quand l'appli charge, Alors elle n'apparaît pas dans l'Observatoire et « Données rejetées » affiche `sources : requis` |
| F-003 | Valider dans le navigateur avec un validateur minimal couvrant les mots-clés utilisés par les schémas : `type`, `required`, `enum`, `minimum`/`maximum`, `minItems`, `pattern`, `properties`, `patternProperties`, `additionalProperties`, `items`, `$ref`/`$defs`. La validation complète se fait par script | M | MVP Op. | Soit le jeu de tests de schéma, Quand je l'exécute dans le navigateur puis par script, Alors les deux verdicts coïncident sur chaque cas |
| F-004 | Afficher l'étiquette de statut de chaque fonction (§4.1). Une fonction V1/V2 est visible, désactivée et expliquée | M | MVP Op. | Soit le bouton « Importer un plan PDF », Alors il est désactivé et porte « Prévu V1 », avec une infobulle accessible au clavier |
| F-005 | Afficher le niveau de certitude de toute valeur chiffrée (§4.2), jamais par la seule couleur | M | MVP Op. | Soit une dépense `certainty = hypothese`, Alors son montant s'affiche avec la marque « Supposé » (pictogramme et libellé) |
| F-006 | Afficher une valeur `null` comme « Non renseigné ». Elle est exclue des calculs, avec un avertissement | M | MVP Op. | Soit `business_model = null`, Alors la fiche affiche « Non renseigné » et jamais « 0 » ni un champ vide |
| F-007 | Écran Paramètres : liste des `[param]` d'A, avec la valeur par défaut, la valeur locale, la justification et la date de modification. Retour à la valeur par défaut possible | M | MVP Op. | Soit le débit QR passé de 8 à 6, Quand je relance le simulateur de flux, Alors le résultat change et le rapport affiche « paramètre modifié localement » |
| F-008 | Espace local : persistance, export et import complets en JSON, jauge d'occupation du stockage | M | MVP Op. | Soit 3 concepts locaux, Quand j'exporte puis réimporte dans un navigateur vierge, Alors les 3 concepts et leurs versions sont identiques (empreintes égales) |
| F-009 | Rappel de sauvegarde si des modifications ne sont pas exportées depuis plus de 7 jours | S | MVP Op. | Soit un dernier export à J-8 et une modification, Alors un bandeau du dashboard propose l'export |
| F-010 | Apposer la mention « Aide au dimensionnement — ne vaut pas validation réglementaire ou technique » sur les plans, les simulations de flux et d'occupation et leurs exports | M | MVP Op. | Soit un export du plan, Alors la mention figure en pied de page |
| F-011 | Enregistrer le nom de l'utilisateur local, utilisé pour `history.author` et `approved_by` | M | MVP Op. | Soit un nom non saisi, Quand je crée une version, Alors l'appli demande le nom avant d'enregistrer |
| F-012 | Proposer des liens profonds par route de hachage (`#/concept/<id>/<version>/notation`) | S | MVP Op. | Soit un lien copié, Quand je l'ouvre dans un nouvel onglet, Alors le même écran s'affiche |
| F-013 | Recherche globale (Ctrl+K) dans les fiches, briques, erreurs et concepts | S | MVP Op. | Soit « file d'attente », Alors les résultats sont groupés par type et ouvrables au clavier |

### 6.2 Veille (brief §3–4)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-020 | Chaque fiche est conforme à `watch-entry` et contient tous les champs du brief §4. Un champ inconnu vaut `null` | M | MVP Op. | Soit une fiche publiée, Quand le script valide, Alors aucune erreur et aucun champ du brief §4 absent (présent, même `null`) |
| F-021 | Des tâches planifiées Claude Code exécutent des consignes versionnées dans le dépôt, font la recherche web et déposent les fiches dans `knowledge/watch/_inbox/` sur une branche dédiée | M | MVP Ext. | Soit une tâche hebdomadaire, Quand elle s'exécute, Alors de nouvelles fiches arrivent dans `_inbox/` avec `cadence = hebdomadaire` et un `collected_at` daté |
| F-022 | Cadences configurables : quotidienne, hebdomadaire, mensuelle, trimestrielle, annuelle et manuelle. Hypothèse d'activation en MVP : hebdomadaire et mensuelle actives, quotidienne désactivée (volume de validation humaine) | S | MVP Ext. | Soit la configuration des cadences, Alors chaque cadence indique son état (active/inactive), ses axes et sa dernière exécution |
| F-023 | Couverture : axes du brief §3 (sport, divertissement, organisations de référence, petits organisateurs). Le dashboard affiche le nombre de fiches par `sector_family` et `organizer_scale`, valeurs nulles comprises | S | MVP Op. | Soit aucune fiche `association`, Alors la couverture affiche « association : 0 » |
| F-024 | Qualification des affirmations : `claims[].status`. `fait_verifie` exige une source de fiabilité A ou deux sources B indépendantes (A§9) | M | MVP Op. | Soit une affirmation `fait_verifie` adossée à une source C, Quand le script valide, Alors la fiche est rejetée avec le motif « fait_verifie exige A ou 2×B » (dépendance D-04) |
| F-025 | Aucun résultat chiffré sans affirmation sourcée : un nombre présent dans `observed_results` ou `business_model` doit être couvert par une affirmation | S | MVP Op. | Soit « 3 000 spectateurs » dans `observed_results` sans affirmation, Quand je publie, Alors un avertissement bloquant apparaît |
| F-026 | La tâche ne liste que des sources effectivement consultées (`accessed_at` = date de consultation). Le script contrôle le format des URL (https) | M | MVP Ext. | Soit une URL non https, Alors rejet par le script |
| F-027 | Déduplication (A§9) : `dedupe_key`, ou Jaccard sur trigrammes ≥ 0,8 avec même pays et dates à ±30 j → proposition de fusion. La fusion conserve toutes les sources et `merged_from`, et retient la fiabilité la plus haute justifiée par une source primaire | M | MVP Op. | Soit deux fiches de même `dedupe_key`, Alors l'appli les signale « doublon potentiel » et la fiche fusionnée liste les deux identifiants dans `merged_from` |
| F-028 | Aucune publication sans validation humaine. Publier = déplacer la fiche de `_inbox/` vers `knowledge/watch/` et régénérer l'index (revue via git en MVP) | M | MVP Op. (manuel) | Soit une fiche dans `_inbox/`, Alors l'Observatoire ne l'affiche que dans l'onglet « À valider » |
| F-029 | Observatoire : filtres par famille, discipline, pays, ville, échelle de l'organisateur, cadence, fiabilité, période, potentiel de transposition et tags. Tri et compteurs ferme/estimé/supposé par fiche | M | MVP Op. | Soit les filtres « sport » et fiabilité ≥ B, Alors seules ces fiches s'affichent et le nombre de résultats est annoncé aux lecteurs d'écran |
| F-030 | Fiche détaillée : tous les champs, affirmations avec leur source, briques extraites, erreurs liées, fusions | M | MVP Op. | Soit une affirmation avec `source_index = 1`, Alors son lien ouvre `sources[1].url` dans un nouvel onglet |
| F-031 | Synthèses trimestrielle et annuelle en Markdown, produites par tâche planifiée à partir des seules fiches publiées. Chaque affirmation renvoie à une fiche | C | MVP Ext. | Soit une synthèse, Alors chaque chiffre cite un identifiant `W-…` existant |
| F-032 | File de validation intégrée à l'appli (publier, corriger, rejeter, motif), avec écriture côté serveur | — | V1 | — |
| F-033 | Avis publics : synthèse paraphrasée et agrégée. Ni nom, ni pseudonyme, ni photo, ni lien vers un profil individuel | M | MVP Op. | Soit une fiche qui mentionne des avis, Quand je la relis, Alors aucune donnée personnelle n'y figure (contrôle de revue) |

### 6.3 Analyse des réussites et des échecs (brief §5)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-040 | Rattacher chaque force et chaque faiblesse d'une fiche à une des 21 dimensions du brief §5, convention de tag `dim:<domain>` (valeurs de `error-entry.domain`) | S | MVP Op. | Soit une faiblesse taguée `dim:files_attente`, Alors elle apparaît dans le filtre « Files d'attente » de l'Observatoire (dépendance D-12) |
| F-041 | Registre conforme à `error-entry`. Le niveau de preuve des causes (`cause_status`) est toujours affiché, « probable » par défaut | M | MVP Op. | Soit `cause_status = probable`, Alors les causes s'affichent sous l'intitulé « Causes probables » |
| F-042 | Filtres du registre : domaine, gravité, échelle, niveau de preuve, texte | M | MVP Op. | Soit « critique » et « billetterie », Alors seules ces entrées s'affichent |
| F-043 | Injecter les `checklist_items` d'une erreur dans la checklist d'un concept (sections 33–34 du blueprint), avec la référence `E-NNN` | S | MVP Op. | Soit E-004 injectée, Alors la checklist du concept affiche ses points suffixés « (E-004) » |
| F-044 | Signaler sur la fiche concept les erreurs pertinentes, selon une table de correspondance `[param]` entre domaines d'erreur, types de briques et types de séquences | C | MVP Op. | Soit un concept avec la technologie `billetterie_en_ligne`, Alors les erreurs du domaine « billetterie » sont proposées |
| F-045 | Créer une entrée depuis une fiche ou un retour post-événement, puis l'exporter en JSON pour commit | M | MVP Op. | Soit « Créer une erreur » depuis W-…, Alors le brouillon reprend la source de la fiche |
| F-046 | Au moins une source par entrée. Pour un incident interne, la source est le chemin du rapport interne dans le dépôt | M | MVP Op. | Soit une entrée sans source, Alors l'export est refusé (dépendance D-11) |

### 6.4 Briques fonctionnelles et transposition (brief §6, A§3)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-050 | Bibliothèque conforme à `building-block` (13 types). Filtres par type, famille d'origine, palier minimal, technologies, cadre et attributs | M | MVP Op. | Soit le filtre « palier ≤ T1 », Alors aucune brique `budget_tier_min ≥ 2` ne s'affiche |
| F-051 | `ip_note` obligatoire pour publier une brique : ce qui est emprunté (logique) et ce qui ne l'est pas (nom, identité, éléments protégés) | M | MVP Op. | Soit une brique sans `ip_note`, Alors l'export est refusé (dépendance D-10) |
| F-052 | Fiche brique : mécanique, origine, exigences, attributs 0–5, `direction_fit`, compatibilités, risques, fiches de veille d'origine | M | MVP Op. | Soit B-regles-x citée dans 2 fiches, Alors la fiche brique liste ces 2 fiches |
| F-053 | Créer et modifier une brique en local, puis l'exporter | S | MVP Op. | Soit une brique créée, Alors elle est utilisable par le générateur dans la même session |
| F-054 | Calculer la nouveauté de transfert : `d/3 × plausibilité`, `d` étant la distance entre familles (0–3) et la plausibilité ∈ {0 ; 0,5 ; 1} saisie par un humain | M | MVP Op. | Soit source `esport`, cible `sport` (d = 2) et plausibilité 0,5, Alors la nouveauté vaut 0,33 |
| F-055 | Fiche de transposition obligatoire : logique empruntée → adaptation → ce qui n'est **pas** repris | M | MVP Op. | Soit « non repris » vide, Quand j'enregistre, Alors refus avec le message (dépendance D-10) |
| F-056 | La matrice de plausibilité et la table des familles voisines sont des paramètres revus humainement | M | MVP Op. | Soit une plausibilité modifiée, Alors le journal des paramètres l'enregistre (dépendance D-06) |
| F-057 | Combinaison manuelle dans le Laboratoire : sélection de briques, blocage des paires incompatibles, pré-score | S | MVP Op. | Soit deux briques déclarées incompatibles, Alors l'ajout de la seconde est refusé avec le motif |

### 6.5 Générateur de concepts (brief §7, A§2)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-070 | Formulaire de brief avec les 16 entrées d'A§2.1, toutes facultatives, unités explicites, `ν` et `μ` sur 1 à 5 | M | MVP Op. | Soit un brief vide, Quand je génère, Alors la génération aboutit sur des hypothèses (F-071) |
| F-071 | Pour chaque entrée absente : 3 hypothèses (basse, médiane, haute) tirées d'un fichier de valeurs par défaut `[param]` justifiées, listées dans `hypotheses` et modifiables. Le jeu de concepts est produit sur l'hypothèse médiane | M | MVP Op. | Soit le budget vide avec le profil H2, Alors l'appli affiche 10 k€ / 20 k€ / 30 k€ (« hypothèse dérivée de H2 ») et génère sur 20 k€ (dépendance D-06) |
| F-072 | Normaliser : palier `T`, capacité humaine `H` (personnes × heures), ensemble `Tech` | M | MVP Op. | Soit un budget de 20 000 €, Alors T = T1 (dépendance D-15 pour les bornes) |
| F-073 | Filtrer les briques admissibles (A§2.3). Le motif d'exclusion est consultable | M | MVP Op. | Soit une brique `budget_tier_min = 2` et T1, Alors elle est exclue avec le motif « palier » |
| F-074 | Produire 6 propositions, **une par direction**, avec les slots obligatoires d'A§2.4 | M | MVP Op. | Soit un brief valide, Alors 6 cartes s'affichent, chacune avec tous ses slots obligatoires remplis ou un motif d'échec |
| F-075 | Calculer l'utilité `U(b)`, tirer par softmax (`τ = 0,3 + 0,2ν`) avec une graine affichée et modifiable | M | MVP Op. | Soit le même brief et la même graine, Quand je régénère, Alors la sortie JSON est strictement identique |
| F-076 | Contrôles de cohérence (durée, personnel, capacité, incompatibilités), au plus 3 réparations, puis abandon motivé | M | MVP Op. | Soit un programme plus long que la durée disponible, Alors le candidat est réparé ou abandonné, et le motif est affiché |
| F-077 | Diversité par MMR (λ = 0,7), distance de Jaccard ≥ 0,5 entre retenus. Si c'est impossible, afficher « diversité insuffisante » sans forcer | M | MVP Op. | Soit deux cartes retenues, Alors leur distance de Jaccard affichée est ≥ 0,5 ou l'avertissement est visible |
| F-078 | Pré-notation automatique (A§2.8) marquée `jugement_expert`. Revue humaine obligatoire avant le passage en `review` | M | MVP Op. | Soit une pré-note non revue, Quand je soumets en revue, Alors refus |
| F-079 | Cartes comparables : mêmes rubriques dans le même ordre (briques par slot, pré-score, verdict provisoire, besoins par rapport aux ressources, alertes) | M | MVP Op. | Soit 6 cartes, Alors chaque rubrique est alignée horizontalement |
| F-080 | Verrouiller une brique et régénérer une seule direction | S | MVP Op. | Soit une brique verrouillée, Quand je régénère la direction, Alors la brique est conservée |
| F-081 | Accepter un événement sans discipline : aucun filtrage par discipline | M | MVP Op. | Soit une discipline vide, Alors la génération aboutit et `identity.disciplines = []` |
| F-082 | Nom et pitch : gabarit en MVP (nom provisoire à renommer) ; rédaction par LLM en V1 (A§2.9), sans chiffres, sources ni retours d'expérience générés | M | MVP Op. ; V1 | Soit un concept généré, Alors son nom est préfixé « Provisoire — » jusqu'au renommage |
| F-083 | Enregistrer une direction comme concept `draft` `0.1.0` (`event-config`), avec le brief, les hypothèses et la graine | M | MVP Op. | Soit « Retenir », Alors le concept apparaît dans Concepts, en statut draft (dépendance D-19) |
| F-084 | Avant revue, documenter l'intérêt pour le public, les participants et l'organisateur (`audiences[].motivation` par rôle) | S | MVP Op. | Soit aucune motivation de rôle `participant`, Quand je soumets en revue, Alors refus |

### 6.6 Adaptation aux infrastructures (brief §8)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-100 | Saisir le lieu selon `venue` : type, ERP déclaré (`effectif_autorise`, `document_ref`), dimensions, équipements, contraintes, documents (chemins) | M | MVP Op. | Soit un lieu sans `effectif_autorise`, Alors le calcul de capacité maximale affiche « Non renseigné — à obtenir de l'exploitant » |
| F-101 | Saisir les espaces en rectangles (x, y, largeur, longueur, type, capacité, fixe) et les points d'accès | M | MVP Op. | Soit un espace de 20 × 15 m, Alors sa surface calculée vaut 300 m² |
| F-102 | Plan 2D SVG à l'échelle (grille de 1 m, échelle graphique). Déplacement à la souris **et** par saisie numérique ou flèches du clavier (pas de 0,5 m). Détection des chevauchements et des débords | M | MVP Op. | Soit un rectangle qui déborde de l'emprise, Alors son contour passe en alerte et un message textuel le signale |
| F-103 | Analyser l'adéquation : surfaces, capacité, accès PMR, sanitaires, puissance (Σ `power_w` contre `power_kw_available`), internet, stockage, horaires et créneaux de montage et démontage, par rapport à `venue_requirements` | M | MVP Op. | Soit un besoin de 12 kW pour 9 kW disponibles, Alors l'écart s'affiche en alerte |
| F-104 | Cinq configurations (économique, standard, premium, capacité maximale, secours), pré-remplies par les règles du doc 05 W3 puis ajustées manuellement | M | MVP Op. | Soit un concept et un lieu, Alors les 5 configurations existent et chacune affiche capacité, surface utilisée et alertes (dépendance D-02) |
| F-105 | Capacité maximale = min(`effectif_autorise` − personnel s'il est compté, Σ capacités des espaces publics). L'hypothèse « personnel compté ou non » est affichée | M | MVP Op. | Soit 800 autorisés, 60 personnels comptés et 900 places d'espaces, Alors la capacité maximale vaut 740 [supposé] |
| F-106 | Configuration de secours obligatoire pour un lieu `exterieur` ou `mixte`. Elle est utilisée par l'incident météo | M | MVP Op. | Soit un lieu extérieur sans configuration de secours, Alors la porte de conformité passe « à vérifier » avec ce motif |
| F-107 | Schéma de circulation : tracés manuels (entrée → zones → sortie) | C | MVP Op. | Soit un tracé, Alors il s'exporte avec le plan |
| F-108 | Export du plan en SVG depuis le navigateur, avec la mention F-010 | M | MVP Op. | Soit l'export, Alors le fichier SVG contient la mention et l'échelle |
| F-109 | Import de photos et de plans PDF avec calibration manuelle | — | V1 | — |
| F-110 | Visualisation 3D | — | V2 | — |

### 6.7 Simulateurs (brief §9, A§4–6, §8)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-120 | Durée de compétition par étape selon le type (A§4), marge de 0,15 `[param]`, résultat arrondi à la minute supérieure. Sorties : durée par étape, heure de fin, occupation des terrains, attente moyenne entre deux passages | M | MVP Op. | Soit une élimination directe à 16 entrants, 2 terrains, 10 + 2 min, Alors durée = (4+2+1+1) × 12 × 1,15 = 110,4 → **111 min** |
| F-121 | Créneau tampon si `repos_min > c` (A§4). Paliers saisis manuellement pour `battle_royale` et `custom` | S | MVP Op. | Soit un repos de 15 min et un changement de 2 min, Alors des créneaux tampons sont insérés et comptés (dépendance D-08) |
| F-122 | Files d'attente par modèle fluide minute par minute (A§5). Nombre minimal de files pour une attente ≤ 10 min `[param]` | M | MVP Op. | Soit 600 personnes, 50 % en 30 min puis 50 % en 90 min, 1 file QR à 8 pers/min, Alors attente max = 60/8 = 7,5 min et 1 file suffit |
| F-123 | Occupation `P(t)` et densité par zone. Alerte orange au-delà de 2 pers/m² en zone debout, alerte rouge au-delà de l'effectif autorisé. Répartition par zone saisie comme hypothèse | M | MVP Op. | Soit `P(t)` > `effectif_autorise`, Alors une alerte rouge « bloquant » s'affiche sur la courbe et dans le bandeau (dépendances D-09, D-13) |
| F-124 | Mention permanente : « dimensionnement, pas sécurité de foule — ne remplace ni le chargé de sécurité ni la réglementation ERP/préfectorale » | M | MVP Op. | Soit l'écran Occupation, Alors la mention est visible sans défilement |
| F-125 | Personnel par fonction (A§6). Ligne « Sécurité / secours » sans calcul : « dimensionnement réglementaire externe (référentiel DPS, prestataire agréé) » | M | MVP Op. | Soit n'importe quel effectif, Alors la ligne Sécurité n'affiche aucun nombre calculé |
| F-126 | Chemin critique du montage sur `program[kind = montage]` et `depends_on` : durée minimale, marges, tâches critiques. Détection des cycles | M | MVP Op. | Soit A(60) → B(30), A → C(90), B et C → D(30), Alors durée = 180 min, chemin critique A-C-D, marge de B = 60 min |
| F-127 | Consommation électrique cumulée par rapport à la puissance disponible | S | MVP Op. | Voir F-103 |
| F-128 | Les 8 incidents d'A§8, paramétrables (ampleur), appliqués comme transformation de la configuration puis nouvelle simulation | M | MVP Op. | Soit « défaillance électrique », Alors tout équipement `power_w > 0` hors groupe est retiré et les briques dépendantes sont signalées (dépendance D-14) |
| F-129 | Plans de continuité : afficher les `risks[].continuity_plan` concernés. Un risque `critical` sans plan est signalé et alimente la porte « risques critiques » | M | MVP Op. | Soit un risque critique sans plan, Alors la porte passe `bloquant` |
| F-130 | Tableau avant/après incident : durée, attente, densité, résultat financier, actions | M | MVP Op. | Soit un incident appliqué, Alors chaque indicateur affiche sa valeur de base, sa nouvelle valeur et l'écart |
| F-131 | Part de temps morts par rôle (spectateur, participant) : minutes de présence sans séquence `competition`, `show`, `ceremonie` ou `animation`. Ce calcul alimente l'ancre « expérience utilisateur » | S | MVP Op. | Soit 40 min sans séquence sur 200 min de présence, Alors temps morts = 20 % |

### 6.8 Parcours, dimension médiatique, gamification (brief §10–12)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-150 | Parcours par rôle (8 rôles d'`audiences.role`) × phase (avant, pendant, après) : étapes, points de friction, opportunités | S | MVP Op. | Soit le rôle `benevole`, Alors je peux saisir ses étapes « avant » (dépendance D-16) |
| F-151 | Alerter quand un rôle déclaré dans `audiences` n'a pas de parcours | S | MVP Op. | Soit `sponsor` déclaré sans parcours, Alors une alerte apparaît dans l'onglet Parcours |
| F-152 | Moments partageables, spots photo et canaux (`media`), chacun rattaché à une séquence du programme | S | MVP Op. | Soit un moment sans séquence, Alors il est marqué « non planifié » |
| F-153 | Calendrier éditorial avant, pendant et après, par canal (Instagram, TikTok, YouTube, LinkedIn, autres) : date relative à J, format, contenu, responsable | S | MVP Op. | Soit 3 publications saisies, Alors elles s'exportent dans la section 30 du blueprint (dépendance D-16) |
| F-154 | Garde-fou : signaler une séquence `media` qui allonge le temps mort spectateur | C | MVP Op. | Soit une séquence `media` sans action pour le public, Alors le temps mort recalculé et un avertissement s'affichent |
| F-155 | Gamification : mécanique, rôle cible, description et `fairness_note` obligatoire. Liste d'équité : règles compréhensibles, accès gratuit aux prédictions, pas de récompense aléatoire payante, pas d'urgence artificielle | M | MVP Op. | Soit une mécanique sans `fairness_note`, Quand je soumets en revue, Alors refus |

### 6.9 Modèle économique (brief §13, A§7)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-170 | Saisir dépenses et recettes selon le schéma (base, certitude, option, priorité, décalages) | M | MVP Op. | Soit une recette sans `certainty`, Alors l'enregistrement est refusé |
| F-171 | Trois scénarios (A§7.1) avec les taux de réalisation `[param]` | M | MVP Op. | Soit un sponsor forfaitaire `probable` de 1 000 €, Alors 500 / 800 / 1 000 € |
| F-172 | Pas de double décote : taux de réalisation appliqué aux seules recettes `fixed` | M | MVP Op. | Soit une billetterie `per_paying_attendee` `probable`, Alors son montant = prix × payants du scénario, sans taux |
| F-173 | Dérive des coûts non devisés (+15 / +5 / 0 %) et contingence de 10 % | M | MVP Op. | Soit une dépense `estimation` de 1 000 €, Alors prudent = 1 000 × 1,15 × 1,10 = 1 265 € |
| F-174 | Seuil de rentabilité `A*` (A§7.2). Si `m ≤ 0` : « pas de seuil — chaque spectateur supplémentaire coûte » | M | MVP Op. | Soit 12 000 € de fixes, 5 000 € de recettes fixes sécurisées, P = 0, 80 % de payants à 10 € et 1 €/spectateur, Alors A* = 8 200 / 6,9 = 1 188,4 → **1 189** (dépendance D-07) |
| F-175 | Trésorerie : flux datés relativement à J, solde cumulé, besoin = −min. Subvention encaissée par défaut à J+60 | M | MVP Op. | Soit −5 000 € à J-30, +4 000 € à J, +3 000 € à J+60, Alors besoin = 5 000 €, atteint à J-30 |
| F-176 | Sensibilité : fréquentation ±20 %, sponsoring ±30 %, dépenses ±15 %, prix ±10 %. Tornade et élasticités | M | MVP Op. | Soit le scénario central, Alors 4 barres triées par amplitude décroissante, avec le tableau équivalent |
| F-177 | Recettes en trois colonnes (sécurisées, probables, hypothétiques). Ratio « sécurisées / dépenses engagées » par jalon | M (colonnes) / S (ratio) | MVP Op. | Soit le tableau des recettes, Alors la somme des trois colonnes est égale au total (dépendance D-05 pour les jalons) |
| F-178 | Volet commercial structuré : politique tarifaire, stratégie de billetterie, offres de sponsoring par niveau, merchandising, restauration, premium, digital, licence, duplication géographique | S | MVP Op. | Soit l'export du blueprint, Alors les sections 28, 29 et 31 sont alimentées (dépendance D-16) |
| F-179 | Exporter le budget en XLSX par script, avec formules visibles | M | MVP Op. (hors navigateur) | Soit le script, Alors le classeur contient un onglet par scénario et un onglet trésorerie |
| F-180 | Intégrations billetterie (HelloAsso, Weezevent, Billetweb…), CRM, comptabilité, emailing | — | V1 Ext. | Modalités (API, export CSV) à vérifier service par service |

### 6.10 Notation et portes (brief §14, A§1)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-190 | Grille de 10 critères pondérés (A§1.1). Le score est calculé, jamais saisi | M | MVP Op. | Soit toutes les notes à 3, Alors score = 60 et grade C |
| F-191 | Notes de 0 à 5 par pas de 0,5, justification obligatoire, ancres 1/3/5 affichées à côté de la note | M | MVP Op. | Soit une note sans justification, Quand je soumets en revue, Alors refus (dépendance D-17) |
| F-192 | Grade : A ≥ 80, B 65–79, C 50–64, D < 50 | M | MVP Op. | Soit un score de 79, Alors grade B |
| F-193 | Indice de confiance (A§1.4) | M | MVP Op. | Soit toutes les preuves en `jugement_expert`, Alors confiance = 0,30 |
| F-194 | Portes calculées automatiquement depuis `risks` et `compliance` (A§1.5), avec le verdict éligible, sous réserve ou éliminé | M | MVP Op. | Soit un risque `sante` d'impact 5 et de probabilité 3 sans prévention, et un score de 92, Alors verdict **éliminé** |
| F-195 | Primauté du verdict : aucun score sans son verdict. Un concept éliminé affiche son score grisé, après la mention « Éliminé » | M | MVP Op. | Soit un concept éliminé, Alors le lecteur d'écran annonce le verdict avant le score |
| F-196 | Améliorations : les 3 critères au plus fort gain `g_i`, et le score atteignable si chaque note gagne +1 (plafonnée à 5) | M | MVP Op. | Soit l'expérience utilisateur notée 2, Alors g = 15 × 3 / 5 = 9 points |
| F-197 | Type `previsionnelle` ou `reelle`. Une évaluation `reelle` n'est possible que sur une version `executed` dont les KPI réels sont saisis | M | MVP Op. | Soit une version `concept`, Alors le type `reelle` est indisponible |
| F-198 | Écart de notes entre deux versions, critère par critère | S | MVP Op. | Voir F-235 |

### 6.11 EVENT BLUEPRINT et exports (brief §15)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-210 | Sommaire des 40 sections avec, pour chacune, l'état (vide, partiel, complet, prévu V1) et la source des données (champ du schéma ou texte rédigé) | M | MVP Op. | Soit un blueprint neuf, Alors 40 lignes s'affichent avec leur état |
| F-211 | Générer le blueprint en Markdown : sections calculées depuis la configuration, sections rédigées en saisie libre | M | MVP Op. | Soit l'export Markdown, Alors les sections 21, 28 et 33 contiennent les tableaux issus de la configuration |
| F-212 | Exporter la configuration (JSON) et le dossier (Markdown) depuis le navigateur | M | MVP Op. | Soit l'export JSON, Alors il valide contre `event-config` |
| F-213 | Scripts du dépôt : PDF et DOCX (pandoc, LibreOffice), XLSX (openpyxl : budget, personnel, matériel, checklists, rétroplanning), PPTX (python-pptx : synthèse) | M | MVP Op. (hors navigateur) | Soit un JSON exporté, Quand j'exécute le script, Alors les 4 fichiers sont produits dans `blueprints/<id>/<version>/exports/` |
| F-214 | Fournir les éléments séparés : configuration, budget, checklists, planning, plan SVG | S | MVP Op. | Soit un paquet, Alors chaque élément est un fichier distinct |
| F-215 | Une version `maturity = blueprint` ne passe en `validated` que si les sections 2, 11–14, 20–21, 23–28, 32–34, 37 et 40 sont complètes | M | MVP Op. | Soit la section 34 vide, Alors « Valider » est désactivé avec le motif |
| F-216 | Sections 15 à 18 (identité visuelle) : intentions rédigées en MVP. Aucune reprise de marque ou d'identité existante | S | MVP Op. ; studio V1 | Soit la section 16, Alors l'écran indique « Logo : Prévu V1 » |
| F-217 | Section 40 générée depuis `history` et la lignée | M | MVP Op. | Soit 3 versions, Alors la section 40 les liste avec leurs décisions et approbateurs |
| F-218 | Chaque export porte l'identifiant, la version, le statut, le verdict, la date, la mention F-010 et la légende des niveaux de certitude | M | MVP Op. | Soit un PDF, Alors l'en-tête contient ces éléments |
| F-219 | Section 39 : sources agrégées, avec leur fiabilité | M | MVP Op. | Soit 5 sources, Alors la section 39 les liste avec A/B/C/D |

### 6.12 Versionnement et architecture (brief §16)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-230 | Statuts `draft` → `review` → `validated` → `archived`, retour `review` → `draft`, abandon `draft` → `archived`. Toute autre transition est refusée | M | MVP Op. | Soit une version `validated`, Alors le retour en `draft` est impossible |
| F-231 | Immutabilité : une version `validated` n'est pas modifiable. Son empreinte SHA-256 (JSON canonique) est stockée et contrôlée à chaque chargement | M | MVP Op. | Soit un fichier validé altéré à la main, Quand l'appli charge, Alors l'alerte « version altérée » s'affiche et l'édition reste bloquée |
| F-232 | Nouvelle version depuis une version validée : `draft` `x.(y+1).0`, `parent.relation = new_version`, entrée d'historique | M | MVP Op. | Soit 1.2.0 validée, Alors « Nouvelle version » crée 1.3.0 draft, avec parent 1.2.0 |
| F-233 | Clonage : nouvel `id`, version `0.1.0`, `parent.relation = clone` | M | MVP Op. | Soit un clone, Alors l'original est inchangé (même empreinte) |
| F-234 | Adaptation ville ou lieu par assistant : champs dépendants du lieu à revoir, conformité remise en `a_verifier`, notation remise en prévisionnelle, `adaptabilite_lieux` à re-noter | M | MVP Op. | Soit une adaptation, Alors tous les points `compliance` sont `a_verifier` et le verdict est au mieux « sous réserve » (dépendance D-03) |
| F-235 | Diff entre deux versions par chemin JSON (ajouts, suppressions, modifications), écarts chiffrés et écart de score | M | MVP Op. | Soit 1.2.0 et 1.3.0, Alors le diff liste chaque champ modifié avec son ancienne et sa nouvelle valeur |
| F-236 | Approbation par checklist (portes non bloquantes, notes justifiées, hypothèses listées, sources présentes, F-215), `approved_by` et date. En MVP, auto-approbation sur confirmation explicite ; en V1, approbateur distinct de l'auteur | M | MVP Op. | Soit une porte `bloquant`, Alors « Valider » est refusé |
| F-237 | Archivage en lecture seule, masqué par défaut | S | MVP Op. | Soit le filtre « afficher les archivés », Alors la version réapparaît |
| F-238 | Import d'une version : même `id` et `version` avec une empreinte différente → refus, sans écrasement | M | MVP Op. | Soit un import en conflit, Alors un message de conflit s'affiche et rien n'est modifié |
| F-239 | Backend API-first (Supabase/Postgres + Auth + RLS + Storage, ou équivalent), comptes, 6 rôles, collaboration, gestionnaire de projets, calendrier, notifications, administration sécurisée | — | V1 | — |
| F-240 | Multi-organisation, place de marché de licences | — | V2 | — |

### 6.13 Apprentissage continu (brief §17, A§10)

| ID | Exigence | Prio | Ph./St. | Critère d'acceptation |
|---|---|---|---|---|
| F-250 | Créer une version de réalisation (`maturity = executed`) depuis la version validée exécutée, et y saisir les KPI réels et les montants réels | C | MVP Op. | Soit 1.2.0 validée, Alors la saisie du réel crée 1.3.0 `executed`, sans toucher 1.2.0 (dépendance D-11) |
| F-251 | Écarts `(réel − prévu) / prévu` par KPI et par ligne budgétaire (appariement par `id`) | C | MVP Op. | Soit 1 000 spectateurs prévus et 800 réels, Alors écart = −20 % |
| F-252 | Recalibrage proposé : pour un `[param]` observé (débit, taux de réalisation), le moteur propose une valeur ; un humain valide ; le journal des paramètres l'enregistre | C | MVP Op. (manuel) ; statistique V2 | Soit un débit observé de 6 pers/min, Alors une proposition 8 → 6 attend validation |
| F-253 | La proposition améliorée est une nouvelle version `draft`, soumise à approbation. Jamais de modification silencieuse | M | MVP Op. | Soit une proposition, Alors aucune version validée n'est modifiée (empreintes inchangées) |
| F-254 | Les incidents réels créent ou enrichissent une entrée du registre des erreurs | C | MVP Op. | Soit un incident saisi, Alors un brouillon `E-NNN` pré-rempli est proposé |
| F-255 | Analyse post-événement avancée, recalibrage statistique sur N événements comparables | — | V2 | — |

## 7. Exigences non fonctionnelles

| ID | Domaine | Exigence (MVP sauf mention) |
|---|---|---|
| NF-001 | Performance | Premier affichage ≤ 3 s, servi en localhost, sur le jeu de référence : 500 fiches, 300 briques, 100 erreurs, 50 versions |
| NF-002 | Performance | Recalcul d'un simulateur ≤ 300 ms après modification (saisie temporisée à 250 ms) |
| NF-003 | Performance | Génération des 6 directions ≤ 2 s, avec N candidats `[param]` par direction |
| NF-004 | Performance | Plan 2D fluide jusqu'à 100 rectangles |
| NF-005 | Hors ligne | Aucune ressource externe à l'exécution : polices, scripts et icônes sont embarqués dans `app/` |
| NF-006 | Hors ligne | Exécution via un serveur statique local (`python3 -m http.server`). L'ouverture en `file://` n'est pas prise en charge : les navigateurs traitent les chargements `file://` comme des requêtes d'origine différente, ce qui provoque des erreurs CORS ([MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Tools_and_setup/set_up_a_local_testing_server)) |
| NF-007 | Stockage | Le `localStorage` est limité à 5 MiB par origine ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)). Alerte à 4 MiB, blocage des créations à 4,5 MiB avec proposition d'export |
| NF-008 | Stockage | Le navigateur peut effacer les données locales : l'export régulier (F-008, F-009) est la seule garantie |
| NF-009 | RGPD | Minimisation (RGPD art. 5.1.c ; [CNIL](https://www.cnil.fr/fr/minimiser-les-donnees-collectees)) : le MVP ne traite que les noms des membres de l'équipe (`author`, `approved_by`). Aucune donnée de participant, de spectateur ou d'auteur d'avis |
| NF-010 | RGPD | Avis publics : synthèses agrégées sans donnée identifiante (F-033) |
| NF-011 | RGPD | Aucun traceur, cookie ni outil de mesure d'audience dans le MVP |
| NF-012 | RGPD (V1) | Hébergement dans l'UE, registre des traitements, contrat de sous-traitance, durées de conservation, exercice des droits |
| NF-013 | Accessibilité | Conformité visée RGAA 4.1.2, fondé sur WCAG 2.1 niveaux A et AA ([référentiel](https://accessibilite.numerique.gouv.fr/)). Contrastes : texte ≥ 4,5:1 (grand texte ≥ 3:1), composants et graphiques ≥ 3:1 ([WCAG 2.1, 1.4.3 et 1.4.11](https://www.w3.org/TR/WCAG21/)) |
| NF-014 | Accessibilité | Navigation complète au clavier, focus visible. Le plan 2D est utilisable sans souris (F-102) |
| NF-015 | Accessibilité | Chaque graphique (radar, tornade, trésorerie, occupation) a un tableau de données équivalent. Aucune information portée par la seule couleur |
| NF-016 | Accessibilité | Zoom à 200 % sans perte. Résultats recalculés annoncés par une région `aria-live="polite"`. Respect de `prefers-reduced-motion` |
| NF-017 | Sécurité | Les données sont rendues par `textContent` ou des nœuds DOM, jamais par `innerHTML` sur une donnée. Liens limités aux schémas `http`/`https`, avec `rel="noopener noreferrer"`. CSP `default-src 'self'` |
| NF-018 | Sécurité | Aucun secret dans le dépôt. Les fiches issues du web sont traitées comme non fiables (affichage seul, jamais exécutées) |
| NF-019 | Sécurité | Le dépôt est public : migrer vers un dépôt privé avant tout contenu commercial (risque déjà consigné dans `CHANGELOG.md`) |
| NF-020 | Sécurité (V1) | Authentification, RLS par rôle, double authentification pour l'administration, journal d'audit |
| NF-021 | Sauvegarde | Référentiel : historique git, et archives zip avec empreintes SHA-256 par `scripts/release.sh` |
| NF-022 | Sauvegarde | Espace local : export horodaté `eventlab-workspace-AAAAMMJJ-HHMM.json`. Import validé, sans écrasement d'une version validée (F-238) |
| NF-023 | Traçabilité | Chaque version porte une entrée `history` (auteur, date, résumé, décisions, approbateur). Chaque modification de paramètre est journalisée |
| NF-024 | Immutabilité | Empreinte SHA-256 de chaque version validée, calculée par l'API Web Crypto, disponible en contexte sécurisé. `http://localhost` en est un ([MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)) |
| NF-025 | Interopérabilité | JSON Schema 2020-12, dates ISO 8601, montants en euros décimaux, identifiants stables (`W-`, `E-`, `B-`, slugs) |
| NF-026 | Interopérabilité | Exports ouverts (JSON, Markdown, SVG). Exports bureautiques par scripts |
| NF-027 | Maintenabilité | Moteur `app/engine/` en fonctions pures sans DOM, exécutable dans le navigateur et par script. Tests unitaires reprenant les cas chiffrés de ce document. Aucune étape de compilation |
| NF-028 | Compatibilité | Deux dernières versions majeures de Firefox, Chrome, Edge et Safari sur ordinateur. Lecture sur Safari iOS et Chrome Android |
| NF-029 | Reproductibilité | Générateur à graine : même brief et même graine → même sortie |
| NF-030 | Langue | Interface en français. Nombres au format fr-FR, en euros |

## 8. Hors périmètre (toutes phases sauf mention)

- Vente de billets, encaissement, gestion des inscrits (l'outil s'intègre à des billetteries en V1, il n'en est pas une).
- Validation réglementaire, dimensionnement de la sécurité et des secours, simulation de foule à visée de sécurité.
- Exécution live de mécaniques de gamification auprès du public : l'outil les conçoit, il ne les opère pas.
- Collecte de données personnelles de participants ou de spectateurs.
- Collecte automatique publiée sans validation humaine. Extraction contraire aux conditions d'utilisation des sites.
- Génération d'images, de logos ou d'identités en MVP (studio V1). Copie de marques ou d'identités existantes, quelle que soit la phase.
- Multi-utilisateur, droits d'accès et édition mobile en MVP.

## 9. Contraintes

- Pile imposée en MVP : HTML, CSS, JS vanilla en modules ES, JSON, `localStorage`. Aucun serveur applicatif, aucune dépendance distante.
- Le navigateur n'écrit pas dans le dépôt : tout transfert passe par un export puis un commit.
- La veille dépend des tâches planifiées Claude Code (disponibilité, coût, accès web) : statut *Externe requis*.
- Les scripts d'export exigent pandoc, LibreOffice et Python (openpyxl, python-pptx) sur le poste.
- Le dépôt est actuellement public (NF-019).
- Règle de versionnement du porteur : documentation dans `CHANGELOG.md` et archive avant chaque nouvelle version.

## 10. Hypothèses

| # | Hypothèse | Conséquence si elle est fausse |
|---|---|---|
| HY-1 | Un seul utilisateur actif en MVP | Conflits d'édition non gérés → avancer la V1 |
| HY-2 | Les volumes restent dans le jeu de référence NF-001 | Dépassement du `localStorage` → IndexedDB ou V1 |
| HY-3 | Les paramètres `[param]` d'A sont des points de départ, revus par le porteur avant le premier blueprint | Simulations trompeuses → bandeau « paramètres non revus » |
| HY-4 | Les valeurs par défaut des briefs (F-071) sont fournies par le porteur, avec justification ; seul le budget découle de H2 | Sans elles, la génération exige un brief complet |
| HY-5 | Les tâches planifiées peuvent consulter les sources web et écrire sur une branche du dépôt | Veille manuelle (`cadence = manuelle`) |

## 11. Risques projet

| # | Risque | Prob. | Impact | Mesure |
|---|---|---|---|---|
| RP-1 | Dérive du périmètre : la V1 entre dans le MVP | Élevée | Élevé | Statuts visibles (F-004), MoSCoW, recette MVP stricte |
| RP-2 | Sources ou chiffres inventés dans les fiches automatiques | Moyenne | Critique | Validation humaine (F-028), règles F-024 à F-026, rejet par script |
| RP-3 | Perte de l'espace local | Moyenne | Élevé | Export, rappel (F-009), versions validées commitées |
| RP-4 | Plans ou simulations pris pour une validation | Moyenne | Critique | Mentions (F-010, F-124), sécurité jamais calculée (F-125) |
| RP-5 | Atteinte à la propriété intellectuelle via les briques | Faible | Élevé | `ip_note` et « non repris » obligatoires (F-051, F-055) |
| RP-6 | Auto-approbation en MVP | Certaine | Moyen | Checklist bloquante (F-236), approbateur distinct en V1 |
| RP-7 | Écarts entre schémas et contrat du moteur (§12) | Avérée | Moyen | Arbitrage avant le développement de la v0.3 |
| RP-8 | Exposition du dépôt public | Avérée | Élevé | NF-019 |

Probabilité et impact sont des jugements qualitatifs de l'auteur, sans mesure.

## 12. Dépendances de schéma à arbitrer

Ces exigences supposent des champs absents ou ambigus. Ce document ne modifie pas les schémas : l'arbitrage revient au porteur et au doc 03.

| # | Constat | Exigences concernées |
|---|---|---|
| D-01 | `event-config` n'a pas de date absolue de J : la règle « à moins de 30 jours de J » d'A§1.5 n'est pas calculable | F-194 |
| D-02 | Pas d'objet « configurations » ni d'implantation (position des espaces de l'événement dans le lieu). `venue_requirements.spaces` n'a pas de coordonnées | F-104, F-106, F-128 |
| D-03 | `id` « commun à toutes les adaptations » : les numéros de version entrent en collision entre adaptations parallèles. Proposition : `id` dérivé `<id>--<ville>` | F-234 |
| D-04 | `claims.source_index` est unique alors que la règle exige deux sources B. Les sources de `watch-entry` n'ont pas de fiabilité propre | F-024 |
| D-05 | Pas de jalons ni de rétroplanning, pas de date d'engagement des dépenses | F-177, section 26 |
| D-06 | Pas de schéma pour les paramètres `[param]`, la matrice de plausibilité, `louable(T)` et les valeurs par défaut des briefs | F-007, F-056, F-071 |
| D-07 | A§7.2 n'applique pas la contingence aux dépenses par participant (A§7.1 si). Le scénario de référence et le traitement des recettes fixes non sécurisées ne sont pas précisés | F-174 |
| D-08 | `competition.stages` n'a ni passages, ni rondes, ni repos, ni petite finale, ni paliers | F-120, F-121 |
| D-09 | Pas de nombre de guichets ni de répartition par zone. Ambiguïté de `effectif_autorise` (public seul ou public + personnel) | F-122, F-123 |
| D-10 | `ip_note` facultative. `inspirations` n'a pas de champ « non repris » | F-051, F-055 |
| D-11 | Pas de montant réel par ligne, ni de certitude `reel`. Une seule `evaluation` par version. `error-entry.sources.url` est obligatoire, même pour un incident interne | F-046, F-250 |
| D-12 | Pas de grille structurée des 21 dimensions du brief §5 dans `watch-entry` | F-040 |
| D-13 | L'alerte rouge d'A§5 (effectif dépassé) ne fait pas partie des portes d'A§1.5 | F-123, F-194 |
| D-14 | Personnel sans prestataire, équipements sans indication de groupe électrogène | F-128 |
| D-15 | Bornes des paliers budgétaires non exclusives (30 k€ : T1 ou T2 ?) | F-072 |
| D-16 | Pas de champs pour les parcours, le calendrier éditorial, le volet commercial ni les sections rédigées du blueprint | F-150, F-153, F-178, F-211 |
| D-17 | `ratings` accepte toute clé en minuscules (`additionalProperties` inopérant). Le pas de 0,5 n'est pas contraint | F-191 |
| D-18 | Statut de revue absent de `watch-entry` : la publication est portée par le dossier (`_inbox/` → `watch/`) | F-028 |
| D-19 | Pas de champ pour le brief source ni pour la graine du générateur. Convention provisoire : texte dans `history[0].decisions` | F-075, F-083 |
| D-20 | Pas de champ pour les invariants du format (règles et briques non modifiables) et les paramètres adaptables, nécessaires à l'adaptation et à la licence (doc 05, W7) | F-234 |
| D-21 | Une version de réalisation suivie d'une proposition améliorée donne `x.(y+2).0`, alors qu'A§10 prévoit `x.(y+1).0` pour la proposition | F-250, F-253 |

## 13. Indicateurs de succès de l'outil (recette MVP)

| Indicateur | Seuil de recette |
|---|---|
| Tous les cas chiffrés de ce document passent en test automatique | 100 % |
| Un premier blueprint H2 franchit F-215 et s'exporte dans les 6 formats | Oui |
| Lecture croisée : une personne extérieure au projet reformule le format et le programme à partir du seul PDF | Oui, sans question bloquante |
| Audit d'accessibilité interne sur les 12 écrans du doc 04 | Aucune non-conformité sur les contrastes, le clavier et les alternatives aux graphiques |
| Fiches publiées avec affirmations qualifiées et sourcées | 100 % |
| Versions validées altérées et non détectées | 0 |

## 14. Synthèse : fonctionnalité → phase → statut

| Fonctionnalité | Phase | Statut |
|---|---|---|
| Dashboard et alertes | MVP | Opérationnel |
| Collecte de veille par tâches planifiées | MVP | Externe requis |
| Observatoire (lecture, filtres, doublons, vue « à valider ») | MVP | Opérationnel |
| Validation humaine des fiches (git + appli en lecture) | MVP | Opérationnel (manuel) |
| File de validation intégrée | V1 | Prévu V1 |
| Synthèses trimestrielle et annuelle | MVP | Externe requis |
| Registre des erreurs et injection dans les checklists | MVP | Opérationnel |
| Bibliothèque de briques | MVP | Opérationnel |
| Transposition intersectorielle | MVP | Opérationnel |
| Générateur 6 directions et pré-notation | MVP | Opérationnel |
| Rédaction des concepts par LLM | V1 | Prévu V1 |
| Notation /100, confiance, portes, améliorations | MVP | Opérationnel |
| Configurateur de lieu (rectangles, plan 2D, 5 configurations) | MVP | Opérationnel |
| Import de plans PDF et photos avec calibration | V1 | Prévu V1 |
| Configurateur 3D | V2 | Prévu V2 |
| Simulateurs compétition, files, occupation, personnel, montage | MVP | Opérationnel (données de démo : Simulé) |
| Simulateur d'incidents et plans de continuité | MVP | Opérationnel |
| Simulateur financier (scénarios, seuil, trésorerie, tornade) | MVP | Opérationnel (données de démo : Simulé) |
| Parcours, médias, calendrier éditorial, gamification | MVP | Opérationnel |
| Blueprint : sommaire, complétude, export JSON et Markdown | MVP | Opérationnel |
| Exports PDF, DOCX, XLSX, PPTX par scripts | MVP | Opérationnel (hors navigateur) |
| Versionnement, immutabilité, diff, clonage, adaptation | MVP | Opérationnel |
| Paramètres `[param]` et journal | MVP | Opérationnel |
| Analyse post-événement minimale | MVP (Could) | Opérationnel |
| Recalibrage statistique, analyse avancée | V2 | Prévu V2 |
| Studio d'identité visuelle | V1 | Prévu V1 |
| Gestionnaire de projets, calendrier, notifications | V1 | Prévu V1 |
| Comptes, rôles, collaboration, administration sécurisée | V1 | Prévu V1 |
| Backend API-first | V1 | Prévu V1 |
| Intégrations billetterie, CRM, comptabilité, emailing | V1 | Externe requis — Prévu V1 |
| Multi-organisation SaaS, place de marché de licences | V2 | Prévu V2 |

## Sources (consultées le 2026-11-24)

- W3C, *WCAG 2.1*, critères 1.4.3 et 1.4.11 : https://www.w3.org/TR/WCAG21/. Texte vérifié dans le dépôt source du W3C (`w3c/wcag`, `guidelines/sc/20/contrast-minimum.html`, `guidelines/sc/21/non-text-contrast.html`).
- DINUM, *RGAA* : https://accessibilite.numerique.gouv.fr/. Version 4.1.2 fondée sur WCAG 2.1 A/AA, constatée par recherche web. Le site officiel n'était pas joignable depuis l'environnement de rédaction : la version en vigueur est à reconfirmer avant la recette.
- MDN, *How do you set up a local testing server?* et *Storage quotas and eviction criteria*, *Secure contexts* (URL ci-dessus). Texte vérifié dans le dépôt `mdn/content`.
- CNIL, *Minimiser les données collectées* : https://www.cnil.fr/fr/minimiser-les-donnees-collectees. Repérée par recherche web, non consultée directement.
