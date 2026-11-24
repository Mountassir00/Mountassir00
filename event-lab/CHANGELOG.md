# EVENT LAB — Journal des modifications

Toutes les évolutions du projet sont consignées ici **avant** de passer à la version suivante.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation [SemVer](https://semver.org/lang/fr/) (`MAJEUR.MINEUR.CORRECTIF`).

## Règle de versionnement (demandée par le porteur du projet)

1. Chaque version est documentée ici (ajouts, modifications, décisions, statut réel des fonctionnalités).
2. Le contenu est commité, puis **figé** dans une archive zip `event-lab/archives/event-lab-vX.Y.Z.zip` (empreinte SHA-256 dans `archives/SHA256SUMS`).
3. Un tag git annoté `vX.Y.Z` pointe sur la version figée.
4. Seulement ensuite, le travail de la version suivante commence.
5. Une version publiée n'est jamais modifiée : toute correction crée une nouvelle version.

Procédure automatisée : `event-lab/scripts/release.sh X.Y.Z "Titre"` (refuse de versionner si l'entrée du journal manque).

Légende des statuts de fonctionnalités :
- **Opérationnel** : fonctionne réellement dans l'environnement actuel.
- **Simulé** : logique réelle, mais données ou intégrations de démonstration.
- **Externe requis** : nécessite une intégration, un compte ou un service tiers non branché.

## Registre des versions

| Version | Date | Titre | Archive |
|---|---|---|---|
| 0.0.0 | 2026-11-24 | Socle de versionnement | `archives/event-lab-v0.0.0.zip` |
| 0.1.0 | 2026-11-24 | Fondations (livrables 1 à 10) | `archives/event-lab-v0.1.0.zip` |
| 0.2.0 | 2026-11-24 | Moteur, portefeuille, connaissances, premier blueprint | `archives/event-lab-v0.2.0.zip` |

---

## [0.2.0] — 2026-11-24 — Moteur, portefeuille, base de connaissances, premier EVENT BLUEPRINT (livrables 11 et 12)

### Ajouté
- **Moteur** `app/engine/` (JavaScript, fonctions pures, partagé navigateur / Node) : notation /100 avec confiance et portes éliminatoires, simulateur financier (3 scénarios, seuil, trésorerie avec point bas intra-journée, tornade), compétition (passages chronométrés, poules, élimination simple et double, suisse), flux (files d'attente, occupation, densité), personnel et chemin critique, incidents (8 types), versionnement (immutabilité, nouvelle version, clone, adaptation, diff), variantes de configuration, générateur de concepts (filtrage, squelettes par direction, tirage reproductible, diversité), validateur de schémas. **28 tests unitaires** sur des cas calculés à la main.
- **Scripts** : `build-blueprint.mjs` (configuration → tableaux → dossier assemblé), `validate.mjs`, `export_xlsx.py` (modèle financier à formules, contrôlé à 0 € d'écart avec le moteur après recalcul LibreOffice), `export-docs.mjs` (PDF via Chromium, DOCX via pandoc), `export_pptx.py` (dossier partenaires), `svg2png.mjs`.
- **Portefeuille** `portfolio/` : 10 concepts notés indépendamment, couvrant les 6 directions dont 3 hors sport ; fiche économique d'une page par concept (problème, client, prix, acquisition, marges, récurrence, avantage, test en 7 jours) ; 3 graines remplacées pour non-originalité (dont 2 recoupant BASK'EST LAB). Classement : la-joute 77 · genese 70 · carre-fest 69 · repar-arene 67 · coop-12 66 · hors-bureau 64 · level-up-run 64 · silent-arena 64 · padel-royale 62 · la-grille-3x3 61 (version concept).
- **Connaissances** `knowledge/` : registre de 28 erreurs sourcées (9 causes établies par rapport officiel, 14 recoupées par la presse, 5 probables ; 112 points de contrôle réutilisables ; 15 règles d'or), bibliothèque de 70 briques fonctionnelles (13 types), matrice de distance de transfert 16 × 16.
- **Premier EVENT BLUEPRINT** `blueprints/la-grille-3x3/` : 40 sections (≈ 50 000 mots), configuration complète, 24 tableaux générés, 5 variantes de lieu (standard, économique, premium, capacité max par plan, secours simulée), 7 plans SVG à l'échelle, identité visuelle originale (15 SVG), 21 fiches de poste, checklist du jour J, règlement prêt à relire, 96 sources ; exports PDF (117 p.), DOCX, XLSX à formules, PPTX.

### Modifié
- Schémas : `stage_ref`, `doors_open_min`, intervenants, jalons identifiés, règle prix × quantité des packs partenaires, organisateur, confidentialité, `source_ref` sur risques / KPIs / recettes, responsable et justificatif des points de conformité, capacités inconnues admises à `null`.
- `07-algorithmes.md` : la compression d'un retard ne touche jamais les phases finales ; les forfaits ne réduisent pas les inscriptions encaissées ; une panne informatique épargne les chronomètres manuels.

### Décisions
- **Notation de LA GRILLE au stade blueprint ramenée de 69 à 62/100** après relecture croisée indépendante : antériorité des concours d'habileté 3x3 et du placement serpentin, attente importante des équipes entre deux matchs, configuration standard déficitaire.
- **Recettes forfaitaires requalifiées en « hypothétiques »** (subvention municipale, partenaires locaux, food trucks) : aucun accord n'existe ; elles ne passeront en « probables » qu'après accord oral.
- **Première édition en configuration économique uniquement**, confirmée à J-60 si son scénario prudent revient à l'équilibre avec des recettes signées ; sinon report. Standard seulement avec partenaire titre signé et trésorerie financée ; premium seulement après deux éditions excédentaires.
- Buvette sans alcool par défaut ; âge minimum 16 ans avec autorisation parentale ; prédiction gratuite ouverte à tous ; publicité payante engagée seulement après le go/no-go de J-30.

### Résultats simulés (prévisionnels, à remplacer par des devis)

| Configuration | Prudent | Central | Ambitieux |
|---|---|---|---|
| Standard | −11,2 k€ | −4,0 k€ | +4,0 k€ |
| Économique | −5,1 k€ | +1,6 k€ | +9,3 k€ |
| Premium | −26,9 k€ | −16,3 k€ | −4,9 k€ |
| Secours (1 terrain) | −12,0 k€ | −5,8 k€ | +1,2 k€ |

### Statut réel
- **Opérationnel** : moteur et tests, génération du blueprint (reproductible à l'identique), exports PDF / DOCX / XLSX / PPTX, validation des 109 objets de connaissance.
- **Simulé** : toutes les données de LA GRILLE (archétype de lieu, montants estimés, fréquentation supposée).
- **Externe requis** : vérification réglementaire auprès des autorités et de l'exploitant ; devis ; lecture intégrale des sources (bloquée par le réseau de la session).

### Limites connues
- Aucune page web n'a pu être ouverte dans cette session (réseau) et le quota de recherche partagé a été épuisé : sources vérifiées par extraits de moteur de recherche ou reprises de BASK'EST LAB avec leur statut d'origine. Originalité non vérifiée pour repar-arene et coop-12 ; noms non vérifiés à l'INPI / EUIPO.
- Le simulateur de compétition utilise les étapes nominales (16 + 8 équipes) même au scénario prudent (18 équipes) ; règle d'effectif réduit décrite dans le texte (§11), non simulée.
- Les tableaux de dimensions de la section 21 décrivent le lieu avant correction (les plans SVG, eux, sont régénérés depuis la configuration corrigée).
- Pas encore de liaison `block_id` entre les briques citées par les concepts et la bibliothèque.

---

## [0.1.0] — 2026-11-24 — Fondations (livrables 1 à 10 du brief §18)

### Ajouté
- `docs/00-brief-initial.md` : brief du porteur, verbatim, comme référence d'origine.
- `docs/01-cahier-des-charges.md` : 17 modules du brief + 8 transverses, 133 exigences fonctionnelles F-xxx (MoSCoW, critères Soit/Quand/Alors), 30 exigences non fonctionnelles, hors périmètre, risques, tableau phase × statut.
- `docs/02-architecture-technique.md` : MVP statique sans serveur, V1 API-first (PostgreSQL managé, RLS, files de tâches), V2 ; rôles ; cycle de vie des versions.
- `docs/03-modele-de-donnees.md` : entités, relations, conventions de stockage MVP, schéma relationnel cible PostgreSQL (immutabilité des versions validées par déclencheur).
- `docs/04-maquettes-ux-ui.md` : 15 écrans dont 12 wireframes, design tokens (contrastes WCAG calculés), polices sous licence SIL OFL vérifiée.
- `docs/05-workflows-utilisateurs.md` : W1 à W7 avec diagrammes et matrices RACI.
- `docs/06-systeme-de-veille.md` : 5 cadences avec prompts de tâches planifiées prêts à l'emploi et expressions cron, qualification fait/estimation/hypothèse, fiabilité A–D, déduplication, grille des 21 dimensions d'analyse, cadre légal, indicateurs, outil `veille_tools.py` (annexe A).
- `docs/07-algorithmes.md` : notation /100 avec ancres et portes éliminatoires, générateur, transposition, simulateurs (compétition, flux, personnel, finance, incidents), déduplication, apprentissage post-événement.
- `docs/08-modeles-documentaires.md` : spécification des 40 sections du blueprint (source, mode, critère de qualité, export), règles éditoriales, contrôle qualité (40 exigences de complétude, 16 cohérences croisées).
- `docs/09-roadmap.md` : MVP / V1 / V2 conditionnés par des portes binaires G1–G4, 90 premiers jours, anti-roadmap.
- `docs/10-couts.md` : registre de 41 prix publics consultés, options porteur / freelance / agence, coût de la veille par LLM, TCO sur 2 ans, point mort du studio, recommandation.
- `schemas/` : 6 schémas JSON (EventConfig, Evaluation, Venue, BuildingBlock, WatchEntry, ErrorEntry).
- `templates/` : modèle de blueprint (40 sections), fiches veille / erreur, bilan post-événement, dossier de sponsoring, manuel de reproduction, 5 CSV (conducteur, rétroplanning, risques, budget, recettes), 6 checklists.
- `knowledge/veille/` : catalogue de 70 sources (66 vues via la recherche web, 4 non vérifiées), README.

### Modifié
- `scripts/release.sh` : le push des tags est désactivé par défaut (refusé par la politique réseau de la session) ; l'archive zip versionnée sur la branche fait foi.
- Schémas consolidés après relecture croisée (22 incohérences relevées par les rédacteurs) : date absolue de J (`event_date`), variantes typées (`kind` : économique, standard, premium, capacité max, secours), identifiant dérivé pour les clones et adaptations, jalons, packs partenaires, sources multiples et fiabilité par source dans la veille, incidents internes sans URL dans le registre, notes au pas de 0,5, champs de montants réels pour le bilan post-événement, types d'espaces alignés entre lieu et événement, valeurs inconnues admises à `null`.
- `07-algorithmes.md` aligné sur le code : bornes des paliers budgétaires, seuil de rentabilité cohérent avec la simulation, une proposition par direction dans le générateur, version de réalisation + proposition améliorée après l'événement.

### Décisions
- **Le marché avant le code** : aucune dépense de développement V1 avant un pilote réel exécuté et 3 organisateurs payants signés (porte G3). Lecture retenue du phasage : « V1 (3–6 mois) » = durée de développement, démarrage conditionné à G3. *Écart par rapport au phasage initial, assumé.*
- **Le studio n'est pas l'organisateur juridique** des événements pilotes : l'association ou la collectivité porte déclarations, assurance, secours et billetterie ; le studio conçoit et coordonne sous convention.

### Statut réel
- **Opérationnel** : schémas, modèles et checklists utilisables à la main ; script de version.
- **Simulé / non encore livré** : moteur et application (v0.2–v0.3).
- **Externe requis** : lecture directe des pages web par la veille (domaines non autorisés par la politique réseau de l'environnement), tâches planifiées non créées.

### Limites connues
- Vérification des sources réglementaires et tarifaires faite par moteur de recherche, sans ouverture des pages (réseau de la session) : chaque texte est à relire avant usage.
- Énumérations de certitude en deux langues (`devis/estimation/hypothese` pour les dépenses, `secured/probable/hypothetical` pour les recettes) : conservées pour ne pas casser les données, à harmoniser lors d'une version majeure.
- Les noms de champs `sim.*` proposés dans `08` seront alignés sur le générateur réel en v0.2.

### Contexte découvert
- Un projet voisin du porteur, **BASK'EST LAB** (PR #3, association Bask'Est, Nancy), couvre déjà en version basket une partie importante de l'outillage (moteurs, dashboard, observatoire des erreurs, blueprint). La consolidation des deux projets est à arbitrer avant toute nouvelle application (v0.3).

---

## [0.0.0] — 2026-11-24 — Socle de versionnement

### État de départ
- Dépôt `Mountassir00/Mountassir00` : uniquement le `README.md` du profil GitHub (non modifié).
- Le projet est isolé dans le dossier `event-lab/` pour ne pas toucher au profil et pouvoir être déplacé tel quel vers un dépôt privé.

### Ajouté
- `CHANGELOG.md` (ce journal) et la règle de versionnement.
- `scripts/release.sh` : commit → archive zip → empreinte SHA-256 → tag annoté → push, avec garde-fous (entrée de journal obligatoire, tag et archive non réécrivables).
- Arborescence vide : `docs/`, `schemas/`, `knowledge/`, `portfolio/`, `blueprints/`, `app/`, `archives/`.

### Décisions et hypothèses de travail (validées par « FONCE »)
- **H1 — Positionnement** : EVENT LAB est un *studio de formats événementiels* utilisé d'abord en interne, puis commercialisé sous licence.
- **H2 — Premier blueprint** : format sportif amateur urbain, ville française moyenne, lieu existant, budget 10–30 k€.
- **H3 — Technique MVP** : documentation + application web statique sans serveur ; veille réalisée par des tâches planifiées plutôt que par un moteur de collecte développé.

### Risque signalé
- Le dépôt de profil est **public** : concepts, modèle économique et blueprints y sont visibles. Recommandation : migrer `event-lab/` vers un dépôt privé avant toute diffusion commerciale.
