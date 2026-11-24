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
| 0.3.0 | 2026-11-24 | Application fusionnée EVENT LAB × BASK'EST LAB, installable | `archives/event-lab-v0.3.0.zip` |

---

## [0.3.0] — 2026-11-24 — Application fusionnée EVENT LAB × BASK'EST LAB, installable sur téléphone

### Ajouté
- **Fusion** avec BASK'EST LAB (branche intégrée, 31 tests d'origine conservés) : un seul outil nommé EVENT LAB, avec trois blocs de navigation (Commun, Basket — Bask'Est, Multisectoriel). Conception : `docs/11-fusion-et-application.md`.
- **Moteur EVENT LAB porté en TypeScript** (`baskest-lab/src/core/eventlab/`, 11 modules + types). Les 28 tests portés gardent les mêmes valeurs attendues. **4 tests de non-régression** comparent le moteur au blueprint v0.2.0 : 3 scénarios, 4 variantes, notation, trésorerie, sensibilité, compétition, 24 sections, `BLUEPRINT.md`, et les 10 scores du portefeuille. 5 tests portent sur les données. **Total : 68 tests.**
- **Quatre modules multisectoriels** :
  - Portefeuille (opérationnel).
  - Studio de configuration (prototype) : variantes, scénarios, trésorerie, tornade, compétition et flux, incidents en direct, versions locales immuables, différences entre versions.
  - Générateur sur 70 briques (prototype).
  - Bibliothèque de briques (opérationnel).
- **Connaissances unifiées** :
  - Registre des erreurs : 59 entrées. Les 45 + 28 entrées d'origine contiennent 14 recoupements, fusionnés sans perte de source (contrôle automatique).
  - Catalogue de veille : 120 fiches, soit 111 domaines.
- **Application installable (PWA)** :
  - manifeste, icônes originales, service worker hors ligne, méta-balises iOS ;
  - navigation pensée d'abord pour le téléphone : menu repliable, cibles de 44 px, contrastes AA, marges d'encoche ;
  - module « Application mobile » qui indique l'état de l'installation.
- **Démo en un seul fichier** `baskest-lab/docs/demo/event-lab-demo.html` (1,3 Mo, fonctionne hors ligne en local). Elle remplace l'ancienne démo BASK'EST.
- **Documents** :
  - `docs/12-plan-pilote-la-grille-nancy.md` : test en 7 jours, 30 jours, tableau de bord, écarts avec la porte G1 ;
  - `docs/13-saas-et-mobile.md` : architecture SaaS, offres à tester, séquencement v0.3 → v0.6, obligations des stores et du RGPD, risques.

### Modifié
- Scripts : `scripts/build-blueprint.ts` et `scripts/validate.ts` remplacent les versions `.mjs` et s'exécutent depuis `baskest-lab/` (`npm run eventlab:blueprint`, `npm run eventlab:validate`).
- `scripts/release.sh` : l'archive d'une version contient maintenant `event-lab/` **et** l'application `baskest-lab/`. Les captures d'écran en sont exclues, car on les régénère avec `npm run screenshots`.
- `docs/02` et `docs/07` : le contrat du moteur désigne désormais l'implémentation TypeScript.
- Couleurs d'état assombries en thème clair et éclaircies en thème sombre, pour respecter le contraste AA. Le changement s'applique aussi aux pages basket existantes.

### Supprimé
- `app/engine/` (moteur JavaScript et ses tests), `app/package.json`, `scripts/build-blueprint.mjs`, `scripts/validate.mjs`. **Il ne reste qu'une implémentation de chaque moteur.**

### Décisions du porteur
- **Fusion** : un seul outil. EVENT LAB fournit la méthode et le moteur générique ; BASK'EST LAB devient la verticale basket et la base applicative. Le dossier applicatif ne sera renommé que lorsque la structure sera stable.
- **Produit** : EVENT LAB sera un **SaaS** et une **application mobile téléchargeable**, emballée avec **Capacitor** à partir du même code React.
- **Calendrier** : on construit le socle maintenant sur des offres gratuites. Les comptes stores, les offres payantes et le paiement en ligne attendront le premier client payant.
- **Pilote terrain** : LA GRILLE 3x3 avec l'association Bask'Est (Nancy).

### Décision en attente
- **Porte G1** : remplacer le critère « budget 10 à 30 k€ » par « budget conforme à la configuration retenue au go/no-go de J-60 » (la configuration recommandée coûte environ 7,7 k€). Je le recommande, mais il faut l'accord du porteur, et la modification sera tracée dans une nouvelle version. Le seuil de 65/100 est maintenu : LA GRILLE (62) doit le franchir avec des recettes signées, pas par une nouvelle notation.

### Contrôles réalisés
- `tsc --noEmit` : 0 erreur. `vitest` : 68/68. `vite build` et `build:demo` : OK.
- `eventlab:validate` : 109 objets, 0 invalide.
- Régénération du blueprint LA GRILLE : diff vide sur `BLUEPRINT.md` et `generated/`. Les exports XLSX et PPTX régénérés sur une copie sont identiques, à l'horodatage près.
- Contrôle automatisé des pages : 8 pages nouvelles ou modifiées et les 24 modules, en 1440, 400 et 360 px, thèmes clair et sombre. Résultat : 0 erreur console, 0 débordement horizontal, 0 cible tactile sous 44 px. On conserve les captures en 1440 et 360 px (`baskest-lab/docs/screenshots/v0.3/`) ; `rapport.json` cite aussi celles en 400 px, qui n'ont pas été gardées.
- Parcours complet scripté sans erreur :
  - modification, version, soumission, approbation ;
  - refus de modifier une version validée, puis nouvelle version et différences ;
  - rechargement et export ;
  - générateur ;
  - incident météo et bascule sur la variante de secours.

### Statut réel
- **Opérationnel** : moteur TypeScript et tests, scripts de génération et de validation, application web, installation PWA en local, démo hors ligne, portefeuille, bibliothèque de briques, registre unifié. Bilan : 14 modules opérationnels sur 24.
- **Simulé** :
  - données de LA GRILLE et des concepts ;
  - versions du studio enregistrées **dans le navigateur seulement** (pas de compte ni de synchronisation) ;
  - au total, 8 modules sont des prototypes.
- **Externe requis** :
  - backend (v0.4 : le porteur crée le projet) ;
  - emballage Android / iOS (v0.5) ;
  - comptes stores et publication (après le premier client payant) ;
  - collecte automatique de veille (v0.6) ;
  - 2 modules basket qui dépendent d'une intégration.

### Limites connues
- **Écarts entre le moteur et `docs/07`**, portés à l'identique depuis v0.2 et signalés dans l'interface :
  - la porte « pic d'occupation supérieur à l'effectif autorisé » n'est pas implémentée ;
  - les contrôles de cohérence et la couche rédactionnelle du générateur (§2.6 et §2.9) sont absents ;
  - le générateur s'arrête à 7 briques, sans tenir compte du budget ni des heures (§2.5) ;
  - à l'approbation, `approved_by` est inscrit sur la ligne « soumission » de l'historique.
- Six incidents documentés dans les deux registres (Stade de France 2022, Wembley 2021, Astroworld, Love Parade, Fyre, Woodstock 99) sont fusionnés à partir d'une **liste fermée** (`SAME_INCIDENT_PAIRS` dans `src/core/knowledge/unify.ts`). Vider cette liste annule ces fusions.
- Dans la veille, le dédoublonnage par domaine regroupe aussi des rubriques différentes d'un même site. Aucune adresse n'est perdue.
- Le blueprint v0.2.0 n'a pas été modifié, pour que sa régénération reste identique :
  - `narrative.md` cite encore les anciens scripts `.mjs` ;
  - le tableau de trésorerie affiche « -0 € ».

  Ces deux points seront corrigés dans la prochaine version du blueprint. L'application, elle, affiche déjà la valeur corrigée.
- `npm audit` : 2 alertes critiques existaient déjà (vitest / tinypool) ; 4 alertes modérées arrivent avec `vite-plugin-pwa` et ne concernent que la construction.
- Aucun test sur un vrai téléphone : uniquement de l'émulation.
- Les polices viennent de Google Fonts. Pour un fonctionnement hors ligne complet et pour le RGPD, il faudra les héberger localement (prévu en v0.5).
- La PR #3 (BASK'EST LAB seul) fait doublon : son contenu est intégré ici.
- Les tags git restent locaux, car le proxy refuse leur envoi. L'archive zip sur la branche fait référence.

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
