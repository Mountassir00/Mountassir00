# 02 — Cahier des charges fonctionnel

> BASK'EST LAB — Basketball Event Intelligence & Innovation System de l'association Bask'Est (Nancy).
> Ce document décrit, module par module, ce que l'outil doit faire, comment le vérifier et où il en est.
> Les statuts reprennent **exactement** le registre `src/ui/features.ts` (source de vérité affichée dans l'interface).

## 1. Conventions

| Statut | Signification |
|---|---|
| **Opérationnel** | Fonctionne de bout en bout dans l'outil, sans service externe. |
| **Prototype** | Fonctionne, mais sur des données saisies ou stockées dans le navigateur, ou avec des limites connues. |
| **Dépend d'une intégration** | Nécessite de brancher un service externe (API, base partagée, planificateur, messagerie). |

**Utilisateurs types** (rôles prévus, voir `docs/12-integration-ecosysteme.md`) :

- **Bureau** (présidence, secrétariat) : valide concepts, budgets, publications.
- **Trésorerie** : valide budgets et dépenses.
- **Responsable événement / sportif** : formats, planning, arbitres, publication du programme.
- **Bénévole référent** : tâches, check-lists, commentaires.
- **Partenaire** (lecture seule, futur) : dossier qui le concerne.

Chaque critère d'acceptation est formulé pour être **testable** (test automatisé `tests/*.test.ts` quand il porte sur un moteur, vérification manuelle dans l'interface sinon).

---

## 2. Moteurs (cœur métier, `src/core/`)

Les moteurs sont du TypeScript pur, déterministes (graine aléatoire), sans dépendance au navigateur : ils servent l'interface, les scripts d'export et, demain, une API.

| Moteur | Fichiers | Rôle | Statut |
|---|---|---|---|
| Modèle de données | `model.ts` | Contrat commun de toutes les entités (concept, format, salle, budget, planning, notation…) | Opérationnel |
| Simulation sportive | `simulation/*` | Match par possessions, 7 types de phases, Monte-Carlo d'équité | Opérationnel |
| Programmation | `scheduler/scheduler.ts` | Grille de matchs, affectation terrains/arbitres, conflits, replanification | Opérationnel |
| Finance | `finance/*` | Budget, 3 scénarios, point mort, trésorerie, nature des recettes | Opérationnel |
| Salles | `venue/*` | Implantation 2D, capacités, évacuation/PMR indicatifs, SVG | Opérationnel |
| Règles de conception | `rules/design-rules.ts` | 26 règles issues de l'observatoire des erreurs | Opérationnel |
| Notation et maturité | `scoring/*` | Note /100, portes, échelle de maturité | Opérationnel |
| Générateur | `generator/*` + `pipeline.ts` | Brief → concepts analysés et classés | Opérationnel |
| Studio | `studio/assets.ts` | Maquettes SVG d'identité | Prototype (maquettes à finaliser par un graphiste) |
| Blueprint | `blueprint/*` | Dossier en 8 parties, rendus Markdown/HTML | Opérationnel |
| Audit post-événement | `audit/post-event.ts` | Objectifs vs réalisé, priorités | Opérationnel |
| Veille | `watch/relevance.ts` | Score de pertinence, synthèse hebdomadaire | Prototype (collecte manuelle) |
| Intégrations | `integration/contracts.ts` | Connecteurs en mode simulation + garde-fou d'approbation | Dépend d'une intégration |

**Critères d'acceptation transverses des moteurs**

- `npm test` passe (31 tests au 24/11/2026) ; `npm run typecheck` sans erreur.
- À graine égale, une simulation donne le même résultat (test `est déterministe à graine égale`).
- Un emprunt ne modifie jamais le résultat, seulement la trésorerie (test dédié).
- Un format n'est jamais déclaré « validé » sans au moins 2 éditions réussies (test `maturité`).

---

## 3. Modules du tableau de bord (19)

### Groupe « Pilotage »

#### 3.1 Tableau de bord — `#/accueil` — **Opérationnel**

- **Objectif** : donner en un écran l'état du laboratoire, le dossier phare et les données manquantes.
- **Utilisateurs** : bureau, responsables.
- **User stories**
  - En tant que membre du bureau, je veux voir la note et le résultat financier du dossier phare afin de décider où concentrer l'effort.
  - En tant que responsable, je veux la liste priorisée des données que l'association doit fournir afin de compléter l'audit.
- **Règles** : affiche le score /100 du concept phare (All Star Game Grand Est 2027), son résultat réaliste, son point mort, ses conflits de planning, les règles de conception non satisfaites, les propriétés Bask'Est et leur maturité, le décompte des modules par statut.
- **Entrées / sorties** : données internes (`flagship-asg-2027.ts`, `baskest-events.ts`) → indicateurs et liens.
- **Acceptation** : la note affichée est identique à celle du Blueprint généré ; la liste `DATA_REQUESTS` est affichée par priorité ; aucun appel réseau autre que les polices.
- **Pour aller plus loin** : brancher les vraies données de l'édition 2026 (dépend de l'association).

#### 3.2 Tableau de notation — `#/notation` — **Opérationnel**

- **Objectif** : classer tous les concepts sur 100 avec justification, portes préalables et maturité.
- **User stories**
  - En tant que membre du jury, je veux comprendre pourquoi un concept obtient ses points afin de contester ou valider la note.
  - En tant que jury, je veux ajuster une note en la motivant afin d'intégrer une information que le moteur ignore (ex. salle confirmée).
- **Règles** : barème §21 (9 critères, total 100) ; sécurité, équité et conformité hors note ; classement « éligibles d'abord, puis note » ; surcharge impossible sans motif ; surcharge tracée « note ajustée par … : motif ».
- **Acceptation** : la somme des maxima vaut 100 (test) ; un concept avec une porte « non conforme » est marqué non éligible quelle que soit sa note ; le bouton d'ajustement reste désactivé tant que le motif est vide.
- **Pour aller plus loin** : surcharges partagées entre membres (base commune, voir §3.19).

#### 3.3 Projets et calendrier — `#/projets` — **Prototype**

- **Objectif** : transformer un concept en projet daté (rétroplanning, responsables, versions) et construire un calendrier de saison interconnecté.
- **User stories**
  - En tant que responsable, je veux créer un projet à partir d'un concept et d'une date afin d'obtenir automatiquement le rétroplanning J-180 → J+45.
  - En tant que bénévole référent, je veux cocher les tâches faites afin que l'équipe voie l'avancement.
  - En tant que bureau, je veux voir l'historique des modifications afin de savoir qui a changé quoi.
- **Règles** : tâches issues du Blueprint (`data.retroplanning`), dates calculées depuis la date de l'événement ; chaque changement crée une version ; visibilité « privé » par défaut, « publié » seulement par choix explicite.
- **Acceptation** : un projet créé contient toutes les tâches du rétroplanning avec dates réelles ; cocher une tâche ajoute une entrée dans « Gestion des versions ».
- **Limite actuelle (raison du statut prototype)** : stockage dans le navigateur (`localStorage`) ; pas de partage entre postes.
- **Pour passer opérationnel** : base partagée + authentification (phase P1 de la feuille de route).

#### 3.4 Analyse post-événement — `#/post-evenement` — **Opérationnel**

- **Objectif** : comparer objectifs et résultats réels, sortir les 5 priorités de l'édition suivante, documenter la complétude des données de chaque édition.
- **User stories**
  - En tant que bureau, je veux saisir les chiffres réels après l'événement afin d'obtenir les améliorations prioritaires.
  - En tant qu'auditeur, je veux savoir quelles données d'une édition sont vérifiées, probables ou manquantes afin de ne pas tirer de conclusion sur du vide.
- **Règles** : 10 indicateurs (fréquentation, résultat, satisfaction, engagement, qualité sportive, attente maximale, incidents, satisfaction partenaires, charge bénévole, qualité d'organisation) ; sens « plus haut = mieux » ou inverse ; statut atteint / proche (±10 %) / manqué ; édition « réussie » si ≥ 70 % des objectifs atteints (compte pour le passage à « format validé »).
- **Acceptation** : modifier un réalisé met à jour l'écart et les priorités sans rechargement ; les éditions issues de `EDITIONS` affichent leurs 14 champs de complétude.

### Groupe « Veille »

#### 3.5 Observatoire des tendances — `#/tendances` — **Prototype**

- **Objectif** : présenter les tendances 2025-2026 et les signaux faibles, avec preuves et traduction pour Bask'Est.
- **User story** : en tant que responsable, je veux savoir ce qui change dans le basket-spectacle afin de ne pas concevoir un format déjà dépassé.
- **Règles** : 10 tendances avec force (signal / confirmée / forte), innovations liées ; 9 signaux faibles avec fiabilité (vérifié / annonce / source unique) et lien.
- **Source** : `docs/research/R2-benchmark-mondial.md` (relevé du 24/11/2026).
- **Limite** : contenu figé à la date du relevé. **Pour passer opérationnel** : actualisation planifiée (voir §3.6).

#### 3.6 Veille basket et multisport — `#/veille` — **Prototype**

- **Objectif** : organiser la veille (sources qualifiées, cadence) et qualifier les signaux repérés.
- **User stories**
  - En tant que veilleur, je veux ajouter un signal (titre, lien, résumé, secteur, mots-clés) afin qu'il soit noté automatiquement.
  - En tant que bureau, je veux télécharger la synthèse hebdomadaire afin de décider quels signaux passent au laboratoire.
- **Règles** : 50 sources (`watch-sources.ts`) réparties basket / multisport, fiabilité 1-5, cadence quotidienne / hebdomadaire / mensuelle ; pertinence = fonction des mots-clés Bask'Est et du secteur (`scoreWatchItem`) ; statuts nouveau → qualifié → transposé / écarté.
- **Acceptation** : un signal ajouté apparaît avec un score entre 0 et 100 % ; la synthèse Markdown liste les 10 signaux les plus pertinents.
- **Pour passer opérationnel** : ingestion RSS/API, synthèse planifiée (quotidienne, hebdomadaire, mensuelle) — dépend d'un planificateur et éventuellement d'une API de résumé (voir `docs/06-strategie-veille.md`, `docs/12`).

#### 3.7 Bibliothèque des innovations — `#/innovations` — **Opérationnel**

- **Objectif** : matrice de transposition intersectorielle (§4) consultable et filtrable.
- **User story** : en tant que concepteur, je veux filtrer les innovations par secteur, événement, coût et « applicable dès la prochaine édition » afin de choisir ce que je peux tester vite.
- **Règles** : 52 innovations, 16 secteurs ; chaque fiche contient origine, fonctionnement, valeur ajoutée, adaptation basket, coût (niveau + fourchette en €), ressources, limites, risques, potentiel médiatique, événements bénéficiaires, fiabilité/source ; tri par priorité (`innovationPriority`).
- **Acceptation** : les 10 innovations « immédiates » sont filtrables ; un filtre sans résultat affiche un message d'action.

#### 3.8 Registre des erreurs — `#/erreurs` — **Opérationnel**

- **Objectif** : observatoire des causes d'échec (§5) converties en règles appliquées automatiquement.
- **User story** : en tant que concepteur, je veux savoir quelle règle protège contre quelle erreur afin de comprendre une alerte.
- **Règles** : 45 cas, 20 catégories (≥ 2 par catégorie), 26 règles R01-R26 ; chaque cas pointe vers ≥ 1 règle.
- **Acceptation** : chaque règle affiche le nombre de cas qui la justifient ; aucune catégorie vide (`errorCoverage()`).

### Groupe « Création »

#### 3.9 Générateur de concepts — `#/generateur` — **Opérationnel**

- **Objectif** : passer d'un brief à des concepts complets, analysés et notés (§6). Détail : `docs/08-moteur-generation.md`.
- **User stories**
  - En tant que bureau, je veux décrire objectifs, publics, lieu, budget, formats autorisés, affluence, durée et niveau d'audace afin d'obtenir 3 concepts argumentés.
  - En tant que concepteur, je veux voir les défauts de chaque concept (alertes de règles, résultat financier) afin de ne pas être séduit par une idée bancale.
- **Règles** : 8 candidats par défaut, 3 retenus ; ≤ 2 mécaniques de match ; innovations filtrées par coût selon le budget ; auto-réduction si le planning ne tient pas ; classement « éligibles d'abord ».
- **Acceptation** : chaque résultat a une note ≤ 100, une maturité au plus « concept en simulation » (jamais au-delà sans test terrain) ; les publics « enfants/jeunes » déclenchent l'autorisation parentale (tests `generator.test.ts`) ; un concept enregistré reste privé.

#### 3.10 Laboratoire créatif — `#/labo` — **Opérationnel**

- **Objectif** : tester une modification de règle à la fois et mesurer son effet.
- **User story** : en tant que concepteur, je veux comparer un format et sa variante sur 200 tournois simulés afin de garder la variante seulement si elle améliore le suspense sans casser l'équité.
- **Règles** : une seule modification par variante (fin au score cible, ajout/retrait de mécanique, tirage, durée) ; comparaison sur 5 indicateurs ; verdict avant/après.
- **Acceptation** : la variante a un numéro de version +1 et un libellé de changement non vide (test).

#### 3.11 Studio de design — `#/studio` — **Prototype**

- **Objectif** : donner à chaque format une identité propre, endossée « by Bask'Est » (§12).
- **User story** : en tant que responsable communication, je veux modifier nom, signature, motif et palette afin de voir immédiatement logo, affiche, maillot, billet, accréditation, visuel réseaux et habillage écran.
- **Règles** : 7 maquettes SVG téléchargeables ; textes échappés ; taille de texte adaptative ; liste des vérifications de propriété intellectuelle (INPI, EUIPO/TMview, réseaux, domaine) ; système de marque mère présenté comme **proposition** (aucune charte officielle trouvée publiquement).
- **Limite (raison du statut)** : maquettes de direction artistique, pas des fichiers d'impression ; pas de génération d'images photographiques.
- **Pour passer opérationnel** : validation de la charte par l'association + gabarits d'impression (CMJN, fonds perdus) par un graphiste.

### Groupe « Simulation »

#### 3.12 Configurateur de salles — `#/salles` — **Opérationnel**

- **Objectif** : implantation automatique des terrains et des zones pour 10 types de lieux (§9). Détail : `docs/09-configurateur-infrastructures.md`.
- **User story** : en tant que responsable logistique, je veux voir le plan du Palais des Sports Jean-Weille en configuration show, tournoi ou hybride afin de préparer la visite technique.
- **Règles** : dégagement ≥ 2 m recommandé (alerte < 2 m, bloquant < 1 m) ; zones dimensionnées selon le public ; capacité, unités de passage et places PMR **indicatives** ; plan SVG téléchargeable ; vue 3D simplifiée.
- **Acceptation** : au Palais, un terrain 5x5 tient avec 2 m de dégagement et ≥ 6 000 places assises (test) ; toute alerte « BLOQUANT » est affichée en rouge.

#### 3.13 Simulateur sportif — `#/simulateur-sportif` — **Opérationnel**

- **Objectif** : tester les mécaniques en simulation avant le terrain (§7) : équité, suspense, durée, stratégies dominantes, manipulation.
- **User stories**
  - En tant que responsable sportif, je veux changer la valeur d'un tir et voir si une stratégie devient dominante afin d'éviter une règle exploitable.
  - En tant que concepteur, je veux consulter la bibliothèque des 25 mécaniques (dont 5 simulées) afin de composer un format.
- **Règles** : 50 à 2 000 tournois ; hétérogénéité des niveaux réglable ; verdict équilibré / trop aléatoire / trop prévisible / déséquilibré ; stratégie dominante = ≥ 58 % de victoires à niveau égal contre un jeu équilibré.
- **Acceptation** : Open 3x3 16 équipes → « équilibré », ≥ 3 matchs par équipe ; King of the Court 1 terrain → situation injuste détectée ; zone à 6 points → stratégie dominante détectée (tests).

#### 3.14 Simulateur financier — `#/simulateur-financier` — **Opérationnel**

- **Objectif** : budget complet (17 postes), 3 scénarios, point mort, trésorerie avant l'événement (§16).
- **User stories**
  - En tant que trésorier, je veux modifier les coûts unitaires et la probabilité des recettes afin de voir le résultat prudent / réaliste / ambitieux.
  - En tant que bureau, je veux connaître la trésorerie à avancer et la date du point bas afin de négocier acomptes et préventes.
- **Règles** : recettes commerciales, dons, subventions, apports et emprunts jamais confondus ; emprunt hors résultat ; apport en nature neutre ; imprévus sur coûts décaissés ; alertes (déficit, imprévus < 5 %, subventions > 40 %, partenaire > 30 %, produits sécurisés < 50 %, trésorerie négative) ; export CSV.
- **Acceptation** : prudent < réaliste < ambitieux (test) ; ajouter un emprunt ne change pas le résultat mais améliore la trésorerie (test).

#### 3.15 Programmation sportive — `#/programmation` — **Opérationnel**

- **Objectif** : moteur de programmation (§10).
- **User stories**
  - En tant que responsable sportif, je veux un planning terrains/arbitres qui respecte repos et cérémonies afin de publier un programme fiable.
  - Le jour J, en tant que responsable, je veux simuler un retard, un terrain indisponible, un forfait ou l'absence d'un arbitre afin d'obtenir une réorganisation à valider.
- **Règles** : ordonnancement « au plus tôt » sous contraintes ; finales et demi-finales sur le terrain central ; un arbitre lié à une équipe ne l'arbitre pas ; les matchs commencés ne bougent pas ; toute réorganisation porte `requiresApproval: true` ; la publication passe par la file de validation.
- **Acceptation** : Open 3x3 16 équipes / 4 terrains → 31 matchs, 0 conflit, repos ≥ 15 min ; aucun match sur le terrain central pendant la cérémonie ; un doublon d'équipe introduit à la main est détecté ; replanification sans match dans la fenêtre d'indisponibilité (tests).

### Groupe « Production »

#### 3.16 Bibliothèque des dossiers — `#/dossiers` — **Opérationnel**

- **Objectif** : un BASK'EST EVENT BLUEPRINT par concept (§18). Détail : `docs/11-modeles-dossiers.md`.
- **User story** : en tant que bureau, je veux télécharger le dossier d'un concept (HTML imprimable en PDF, Markdown, JSON, visuels SVG) afin de le présenter à un partenaire ou à une collectivité.
- **Règles** : 8 parties, environ 75 sections ; aperçu dans un cadre isolé (`sandbox`) ; exports Word / Excel / PowerPoint / PDF par scripts (`npm run blueprint`, `npm run exports`).
- **Acceptation** : le Blueprint du dossier phare contient 75 sections et 10 visuels ; la note affichée correspond à celle du tableau de notation.

### Groupe « Écosystème »

#### 3.17 Intégrations et validations — `#/ecosysteme` — **Dépend d'une intégration**

- **Objectif** : relier l'outil au site, au dashboard administratif, à la billetterie, au CRM, à la comptabilité, aux réseaux sociaux et à la base de résultats (§20). Détail : `docs/12-integration-ecosysteme.md`.
- **User story** : en tant que responsable événement, je veux approuver ou refuser une demande de publication afin qu'aucune information ne sorte sans validation.
- **Règles** : 8 connecteurs en mode simulation (« à brancher ») ; connecteur sensible = approbation obligatoire (`requireApproval`) ; file de validation avec rôle requis.
- **Acceptation** : un connecteur sensible appelé sans approbation lève `ApprovalRequiredError` ; une demande issue de la programmation apparaît « en attente ».
- **Pour passer opérationnel** : implémenter au moins un connecteur réel (phase P2).

#### 3.18 Notifications — `#/notifications` — **Prototype**

- **Objectif** : informer des événements produits par les moteurs (concept enregistré, demande de publication…).
- **Règles** : notifications locales, marquables comme lues ; lien vers le module concerné.
- **Pour passer opérationnel** : notifications push / e-mail (intégration).

#### 3.19 Espaces collaboratifs — `#/collaboratif` — **Dépend d'une intégration**

- **Objectif** : commentaires, rôles, historique partagé.
- **Règles prévues** : 5 rôles (bureau, trésorerie, responsable événement, bénévole référent, partenaire en lecture) ; sécurité par ligne dans la base.
- **Pour passer opérationnel** : base Postgres (schéma `db/schema.sql`) + authentification + remplacement de `useLocal` par le client de la base.

---

## 4. Exigences non fonctionnelles

| Exigence | Règle | Vérification |
|---|---|---|
| **Confidentialité par défaut** (§20) | Tout concept et projet naît « privé » (`private: true`, `visibility: 'prive'`). La publication est un acte volontaire. | Test `generator.test.ts` ; sélecteur de visibilité. |
| **Validation des actions sensibles** (§20) | Aucune publication, dépense, commande, réservation ou modification opérationnelle sensible sans `ApprovalRequest` approuvée. | `requireApproval` ; `RescheduleResult.requiresApproval = true`. |
| **Traçabilité des données** | Toute donnée factuelle externe porte une `Provenance` (vérifié / probable / estimation / hypothèse / non trouvé) ; les montants unitaires sont des estimations à remplacer par des devis. | Champs `provenance`, `dataCompleteness`, notes des lignes de budget. |
| **Honnêteté de la maturité** | Une idée ne peut pas être présentée comme format validé sans éditions réelles réussies. | `computeMaturity` (niveaux cumulatifs) + tests. |
| **RGPD** | Base légale par traitement ; mineurs : accord des représentants légaux (image + participation) ; durées de conservation ; classements à critères transparents, droit d'opposition. Aucune donnée personnelle de bénévoles ou de joueurs dans le dépôt public. | Règle R23 (bloquante) ; revue du dépôt. |
| **Accessibilité** | Contraste suffisant, focus clavier visible, lignes de tableau activables au clavier, libellés de champs, `prefers-reduced-motion` respecté, mise en page jusqu'à 390 px sans défilement horizontal. | Capture mobile (`scripts/screenshots.cjs` contrôle le débordement). |
| **Performance** | Analyse complète d'un concept < 100 ms ; génération de 8 candidats ≈ 0,3-0,5 s sur un ordinateur portable. | Mesures `scripts/gen-probe.ts`. |
| **Hors ligne** | Fonctionne sans serveur ni compte : application statique (`npm run build`) ou fichier HTML unique (`npm run build:demo`). Seules les polices sont chargées depuis Google Fonts (repli système sinon). | Build statique. |
| **Déterminisme** | Mêmes entrées + même graine = mêmes résultats (reproductibilité des simulations présentées aux partenaires). | Test dédié. |
| **Langue** | Interface et documents en français. | Revue. |
| **Information juridique** | Toute section juridique, fiscale ou réglementaire précise qu'il s'agit d'information générale, pas d'un conseil personnalisé, et renvoie vers mairie, préfecture, gestionnaire, expert-comptable ou avocat. | Blueprint, partie juridique. |

## 5. Hors périmètre (assumé)

- Prédire le résultat sportif réel d'une équipe : le simulateur compare des **règles**, pas des équipes.
- Remplacer la validation d'un plan par la commission de sécurité, le gestionnaire du lieu ou un bureau de contrôle.
- Engager une dépense, une réservation ou une publication automatiquement.
