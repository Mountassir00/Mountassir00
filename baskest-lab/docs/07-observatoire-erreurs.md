# 07 — Observatoire des erreurs événementielles

> Exigence couverte : §5. Données : `src/data/errors.ts` (45 cas, 20 catégories, 2 à 5 cas par catégorie).
> Les cas sont de deux natures : **incidents documentés** (fiabilité « vérifié », URL de la source) et **patterns récurrents** de l'événementiel sportif amateur (fiabilité « probable », décrits comme des tendances et non comme des faits datés).

## Statut

| Fonctionnalité | Statut |
|---|---|
| Base de connaissances des erreurs (cas, sources, causes, conséquences, prévention) | **Opérationnel** |
| Conversion en règles de conception R01 à R26 | **Opérationnel** (référentiel) ; application automatique par le moteur de règles `src/core/rules/` |
| Alimentation par les audits post-événement Bask'Est | **Prototype** : gabarit d'incident dans le modèle de données (`IncidentRecord`), à alimenter après chaque édition |
| Veille automatique d'incidents | **Dépendant d'une intégration** (cf. `docs/06-strategie-veille.md`) |

## 1. Méthode

1. **Collecter** les cas : incidents publics documentés (presse, rapports officiels), patterns observés dans l'amateur, et **main courante des événements Bask'Est** (priorité : l'expérience propre de l'association vaut plus qu'un cas étranger).
2. **Qualifier** : source, date, niveau de confiance. Un pattern n'est jamais présenté comme un incident daté.
3. **Analyser** : causes probables (méthode des « 5 pourquoi »), conséquences (sportives, financières, réputationnelles, humaines).
4. **Prévenir** : mesures concrètes, chiffrées si possible.
5. **Convertir en règle** : chaque mesure récurrente devient une **règle de conception** avec un **seuil mesurable** et une **sévérité** (alerte / bloquant).
6. **Appliquer** : le moteur de règles vérifie automatiquement chaque concept, planning, budget et implantation générés ; une règle bloquante empêche de classer le concept comme « conforme ».
7. **Réviser** après chaque événement : nouveaux cas, seuils ajustés selon les données réelles de Bask'Est.

> Les seuils ci-dessous sont des **valeurs par défaut** issues de bonnes pratiques et des cas étudiés ; ils sont paramétrables. La référence exécutable reste le moteur de règles. Les seuils réglementaires (évacuation, PMR, DPS) sont **indicatifs** : la validation appartient au gestionnaire du lieu, au chargé de sécurité, à la commission de sécurité et à l'association agréée de sécurité civile.

## 2. Les 20 catégories : synthèse

| Catégorie | Cas | Enseignement principal | Règles |
|---|---|---|---|
| Règlement incompréhensible | 3 | Une règle non affichée n'existe pas pour le public ; arbitres bénévoles à briefer ; limiter les « gimmicks » | R01, R09, R25 |
| Temps morts | 2 | Toute transition doit être scénarisée ; concours individuels à limiter dans le temps | R02, R06, R14, R17 |
| Organisation des matchs | 2 | Simuler durée, suspense et enjeux avant de valider un format ; 3 matchs minimum par équipe | R03, R04, R25 |
| Retards | 2 | Marge de 10 % et limite de temps par match ; repli météo réservé | R03, R05, R17, R26 |
| Manque d'ambiance | 2 | Jauge adaptée (ne pas « perdre » 400 personnes dans 6 000 places) ; enjeu réel | R06, R09, R25 |
| Inscription | 2 | Formulaire unique avec paiement, contrôles et autorisations intégrés | R07, R23 |
| Files d'attente | 2 | Dimensionner le débit d'entrée sur le pic d'arrivée ; séparer les flux | R07, R08, R22 |
| Visibilité | 2 | Score et programme lisibles depuis les tribunes ; public au plus près | R01, R09, R24 |
| Restauration | 2 | Eau accessible, 1 point de vente pour 400 spectateurs, paiement rapide | R08, R10, R11, R26 |
| Tarification | 2 | Grille stable, lisible, famille et jeunes ; prévente avantageuse | R11 |
| Récompenses | 2 | Souvenir pour tous, trophées individuels, dotations validées juridiquement | R12 |
| Communication | 2 | Plan à J-45, URL unique, vérification du nom et du calendrier régional | R13 |
| Engagement du public | 2 | Une interaction toutes les 20 min ; créateurs = amplificateurs, pas public | R06, R14 |
| Audiovisuel | 2 | Plan de captation et droits (image, musique) anticipés | R15, R23 |
| Bénévoles | 2 | Fiches de poste, créneaux de 4 h max, sur-recrutement, honorabilité | R16, R17, R23 |
| Professionnalisme | 2 | Go/no-go écrit, procédures dégradées pour chaque outil | R05, R17, R18 |
| Surdimensionnement | 3 | Monter en échelle sur preuves ; recettes sécurisées avant engagement | R18 |
| Sponsoring | 2 | Activation + bilan pour chaque partenaire ; mécénat et parrainage séparés | R19 |
| Accessibilité | 2 | Accessibilité de l'implantation, pas seulement du bâtiment | R20 |
| Sécurité | 5 | Densité, flux séparés, secours, dégagement, chaleur | R21, R22, R24, R26 |

## 3. Table de conversion : erreur → règle de conception → seuil appliqué automatiquement

| Règle | Nom | Erreurs prévenues | Seuil par défaut appliqué | Sévérité | Donnée contrôlée |
|---|---|---|---|---|---|
| **R01** | regles_lisibles | Règlement incompréhensible, visibilité | ≤ 3 règles spéciales par format public ; résumé des règles ≤ 280 caractères ; règle de fin affichée | Alerte | Concept (format, mécaniques) |
| **R02** | temps_morts_programme | Temps morts | Aucun créneau > 10 min sans action ni animation sur le terrain principal | Alerte | Planning + conducteur |
| **R03** | attente_equipes | Organisation, retards | Attente entre deux matchs d'une équipe ≤ 60 min (alerte), > 90 min (bloquant) | Alerte / bloquant | Planning |
| **R04** | repos_minimum | Organisation des matchs | Repos ≥ 10 min (3x3, 1x1) et ≥ 20 min (5x5) entre deux matchs d'une même équipe | Bloquant | Planning |
| **R05** | marge_retard | Retards, professionnalisme | Marge ≥ 10 % de la durée de compétition ; limite de temps sur chaque match | Alerte | Planning + règles de match |
| **R06** | ambiance_plan | Manque d'ambiance, temps morts | Speaker + musique prévus ; ≥ 1 temps fort scénarisé par heure ; jauge ouverte adaptée au public attendu | Alerte | Concept (expérience) + implantation |
| **R07** | inscription_simple | Inscription, files d'attente | Inscription en ligne avec paiement, clôture ≥ 48 h avant ; check-in ≤ 2 min par équipe | Alerte | Concept (process) |
| **R08** | flux_entree | Files d'attente, restauration | Débit des points de contrôle ≥ arrivées du pic de 30 min ; flux joueurs / public séparés | Alerte | Implantation + affluence |
| **R09** | visibilite_public | Visibilité, ambiance | Affichage du score par terrain ; terrain « show » pour les matchs clés ; tribunes à proximité | Alerte | Implantation + moyens AV |
| **R10** | ratio_restauration | Restauration | ≥ 1 point de vente pour 400 spectateurs ; eau gratuite accessible | Alerte | Implantation |
| **R11** | grille_tarifaire | Tarification | Tarif enfant/jeune, pack famille < 2 pleins tarifs, prévente ≤ plein tarif, grille publiée | Alerte | Budget (recettes) |
| **R12** | recompenses_motivantes | Récompenses | Souvenir pour 100 % des participants ; ≥ 3 récompenses individuelles ; toute dotation > 3 000 € soumise à autorisation fédérale | Alerte / bloquant | Concept + budget |
| **R13** | plan_communication | Communication | Plan de communication démarrant ≥ J-45 ; une URL unique par campagne ; nom vérifié (INPI/EUIPO, réseaux) | Alerte | Projet (rétroplanning) |
| **R14** | interactions_public | Engagement, temps morts | ≥ 1 interaction public toutes les 20 min (vote, défi, pronostic, concours) | Alerte | Conducteur |
| **R15** | plan_captation | Audiovisuel | Si objectif média : responsable contenu + liste de plans + consentements image | Alerte | Concept (contenus) |
| **R16** | ratio_benevoles | Bénévoles | Effectif bénévole ≥ besoin calculé (≈ 1 pour 40 spectateurs + 2 par terrain + équipes fixes) ; créneaux ≤ 4 h ; +20 % de recrutement | Alerte | Concept (ressources humaines) |
| **R17** | conducteur_minute | Professionnalisme, retards, bénévoles | Conducteur minute par minute et organigramme existants avant J-7 | Alerte | Blueprint opérationnel |
| **R18** | provision_imprevus | Surdimensionnement, professionnalisme | Imprévus ≥ 5 % des coûts décaissés (recommandé 8-10 %) ; recettes sécurisées ≥ 50 % avant engagement ferme | Alerte | Budget |
| **R19** | activation_partenaires | Sponsoring | ≥ 1 activation par partenaire ; bilan chiffré à J+15 ; contrats parrainage / mécénat distincts | Alerte | Budget + plan partenaires |
| **R20** | accessibilite_pmr | Accessibilité | ≥ 1 accès PMR ; places PMR réservées (indicatif : 2 jusqu'à 50 places, +1 par tranche de 50, ≥ 20 au-delà de 1 000) ; cheminements dégagés | Bloquant si aucun accès PMR | Lieu + implantation |
| **R21** | dps_secours | Sécurité | DPS prévu pour tout événement ouvert au public, dimensionné selon le référentiel national (RNMSC-DPS) | Bloquant | Concept (plan de sécurité) |
| **R22** | jauge_evacuation | Sécurité, files d'attente | Public ≤ jauge autorisée (bloquant) ; dégagements et unités de passage conformes (indicatif : 1 UP pour 100 personnes) | Bloquant / alerte | Lieu + implantation |
| **R23** | droit_image_mineurs | Inscription, audiovisuel, bénévoles | Si mineurs : autorisation parentale + consentement image des deux parents + honorabilité des encadrants | Bloquant | Concept (public) + process |
| **R24** | degagement_terrain | Sécurité, visibilité | Zone de dégagement ≥ 2 m (alerte en dessous), < 1 m bloquant | Alerte / bloquant | Implantation |
| **R25** | equite_format | Organisation, règlement | Simulation du format : ≥ 3 matchs par équipe ; matchs sans enjeu < 8 % ; aucune stratégie gagnant ≥ 58 % à niveau égal ; verdict « équilibré » | Alerte / bloquant | Simulateur sportif |
| **R26** | meteo_repli | Sécurité, retards, restauration | Tout événement extérieur : solution de repli réservée + seuils météo de décision écrits + plan chaleur (eau, ombre, horaires) | Bloquant en extérieur | Concept (lieu) |

## 4. Cas détaillés par catégorie


### Règlement incompréhensible

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Fin au score cible mal comprise par le public** | Même les ligues qui l’utilisent depuis 2020 (CEBL) reconnaissent que les fins à score cible « restent complexes » ; la règle est moins intuitive pour un public non initié tant que la cible n’est pas affichée en grand. ([source](https://cebl.ca/everything-is-different-five-seasons-later-target-score-endings-remain-as-complex-as-ever)) | vérifié | Règle annoncée uniquement dans le règlement écrit ; Cible non affichée ; Speaker non briefé | Public perdu au moment le plus important ; Contestations des équipes | Explication en 15 s par le speaker avant chaque match ; Cible affichée en permanence (écran ou ardoise géante) ; Fiche règle d’une page remise aux capitaines | R01, R09 |
| **Arbitres bénévoles appliquant des versions différentes des règles** | Pattern fréquent en tournoi 3x3 amateur : plusieurs terrains, arbitres bénévoles, règles spéciales ou récemment modifiées (ex. règle du check-ball FIBA 3x3 révisée au 1er janvier 2026) appliquées différemment d’un terrain à l’autre. ([source](https://www.fiba3x3.basketball/rules)) | probable | Pas de briefing arbitres ; Règles spéciales trop nombreuses ; Mise à jour réglementaire non diffusée | Sentiment d’injustice ; Retards dus aux discussions ; Image amateur | Briefing arbitres de 20 min obligatoire avant ouverture ; Maximum 3 règles spéciales par format ; Arbitre référent qui tranche les litiges | R01, R25 |
| **Empilement de règles « gimmick » qui s’usent vite** | La Kings League, construite sur des règles gamifiées (cartes, dé, penalty du président), a connu en 2026 une forte baisse d’audience, un plan de licenciement et la suspension des ligues France et Allemagne ; la nouveauté s’use vite. ([source](https://www.merca2.es/2026/06/12/ere-kings-league-despidos-pique-cierre-2396126/)) | vérifié | Effet nouveauté pris pour une valeur durable ; Règles ajoutées sans mesure de leur effet | Lassitude du public ; Perte de lisibilité sportive | Une seule mécanique « fun » par format, testée en simulation ; Mesurer l’effet (sondage, rétention) avant de la reconduire | R01, R25 |

### Temps morts

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Présentation hachée par les temps morts et segments** | All-Star NBA 2025 : le nouveau format a été critiqué pour sa « mauvaise présentation » (temps morts, segments TV entre les matchs) qui a éclipsé le jeu. ([source](https://www.cbssports.com/nba/news/2025-nba-all-star-game-stephen-curry-leads-ogs-to-title-but-poor-presentation-overshadows-new-format/live/)) | vérifié | Transitions non scénarisées ; Segments trop longs entre les matchs | Baisse d’attention et d’ambiance ; Image négative du format | Conducteur minute par minute ; Aucune transition > 5 min sans animation ; Animations prêtes pour chaque interruption | R02, R17, R14 |
| **Concours de dunk individuel qui s’essouffle** | Le concours de dunk NBA est jugé en perte de vitesse (ratés en série, attente entre les essais) ; la FIBA a remplacé en 2026 le concours individuel par un show par équipes (Dunk Mania) pour résoudre ce problème. ([source](https://www.fiba.basketball/en/news/fiba-3x3-world-cup-2026-introduces-dunk-mania-a-new-era-of-dunk-contests)) | vérifié | Essais illimités ; Pas de limite de temps ; Niveau des participants hétérogène | Public qui décroche ; Débordement du programme | Limite de temps par essai (60 s) et nombre d’essais ; Format par équipes ; Pré-sélection des dunkers | R02, R06 |

### Organisation des matchs

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Format trop court : « pas assez de basket »** | All-Star NBA 2025 : la cible de 40 points a été jugée trop courte, avec des avis mitigés sur le format. ([source](https://www.espn.com/nba/story/_/id/43885669/nba-all-star-2025-new-format-draws-mixed-reviews-next)) | vérifié | Calibrage du format sans test ; Priorité à la durée TV | Frustration du public venu « voir du basket » ; Joueurs peu engagés | Simuler la durée et le suspense des matchs avant validation ; Comparer plusieurs cibles / durées | R25, R03 |
| **Matchs de poule sans enjeu et équipes qui ne jouent qu’une fois** | Pattern classique des tournois à poules : derniers matchs de poule sans enjeu (qualification déjà acquise), ou élimination directe d’emblée qui renvoie chez elles des équipes ayant payé l’inscription après un seul match. | probable | Structure de compétition non simulée ; Pas de consolante | Risque d’arrangement ; Mauvaise expérience joueur ; Désinscription l’année suivante | Minimum 3 matchs garantis par équipe ; Derniers matchs de poule simultanés ; Tableau consolante | R25, R03, R04 |

### Retards

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Retard en cascade dès le premier créneau** | Pattern très fréquent en tournoi amateur : check-in lent, premier match lancé avec 20-30 min de retard, aucune marge dans le planning, finale décalée de plus d’une heure et public parti. | probable | Planning sans marge ; Check-in le matin même ; Matchs qui débordent sans limite de temps | Finale devant des tribunes vides ; Dépassement des horaires du lieu (coût, conflit) ; Bénévoles épuisés | Marge de 10 % minimum dans le planning ; Check-in en ligne la veille ; Limite de temps sur chaque match ; Replanification assistée par le moteur | R05, R17, R03 |
| **Événement extérieur relocalisé en urgence (canicule)** | Quai 54, juillet 2026 : après une première journée au stade Émile-Anthoine, la vigilance rouge canicule a forcé le déménagement au Clichy Hall. ([source](https://www.basketeurope.com/un-quai-54-delocalise-mais-nadir-hifi-encore-vainqueur-et-mvp/)) | vérifié | Exposition climatique d’un événement estival en extérieur | Programme bouleversé ; Jauge réduite ; Coûts imprévus | Salle de repli réservée sous condition dès la conception ; Seuil de déclenchement météo écrit ; Horaires décalés (matin/soirée) | R26, R05 |

### Manque d’ambiance

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Grande salle à moitié vide** | Pattern : un événement associatif dans une salle de plusieurs milliers de places (ex. Palais des Sports Jean-Weille, 6 000 places) avec quelques centaines de spectateurs dispersés : l’ambiance s’effondre et les images paraissent vides. | probable | Jauge surdimensionnée ; Placement libre dans toutes les tribunes | Ambiance faible ; Contenus vidéo peu flatteurs ; Sentiment d’échec | Configuration réduite (une tribune + tribunes mobiles autour du terrain) ; Placement concentré face caméra ; Objectif d’affluence réaliste | R06, R09 |
| **Match de gala sans défense ni enjeu** | All-Star LNB 2025 : Team France 165 – Team Monde 159, match de gala très peu défendu ; à l’inverse, la NBA a relancé l’intérêt en 2026 avec des matchs courts et compétitifs. ([source](https://lnb.fr/fr/news/les-equipes-du-all-star-game-betclic-elite-2025-sont-enfin-revelees)) | vérifié | Aucun enjeu pour les joueurs ; Format long | Spectacle répétitif ; Public passif | Enjeu réel (dotation au profit d’une cause, identité « nous contre eux ») ; Matchs courts ; Mécanique de fin au score cible | R06, R25 |

### Inscription

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Inscriptions par messages privés et listes manuelles** | Pattern : inscriptions recueillies par messagerie, paiement sur place, listes recopiées à la main ; le jour J, équipes manquantes, doublons, licences ou autorisations parentales absentes. | probable | Absence de formulaire unique ; Paiement non lié à l’inscription | No-shows (places perdues) ; Mineurs sans autorisation ; Check-in interminable | Formulaire unique avec paiement en ligne ; Clôture J-2 ; Autorisations parentales et consentement image intégrés au formulaire | R07, R23 |
| **Conditions de participation non vérifiées (âge, mixité, santé)** | Exemples de conditions faciles à oublier : la Bask’Cup est ouverte aux plus de 16 ans ; le cahier des charges FFBB Open Plus interdit un tournoi uniquement masculin ou uniquement féminin ; l’attestation de santé des mineurs doit être recueillie sans collecter le questionnaire. ([source](https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy)) | vérifié | Formulaire sans contrôle ; Règles fédérales non intégrées | Refus d’homologation ; Risque juridique ; Exclusion le jour J | Champs obligatoires et contrôles automatiques dans le formulaire ; Checklist réglementaire par format | R07, R23 |

### Files d’attente

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Goulots d’étranglement à l’entrée (finale de Ligue des champions 2022)** | Stade de France, 28 mai 2022 : entrées saturées, faux billets, points de contrôle sous-dimensionnés, coup d’envoi retardé et usage de gaz lacrymogène sur des supporters ; un rapport indépendant a pointé l’organisation des accès. ([source](https://en.wikipedia.org/wiki/2022_UEFA_Champions_League_final)) | vérifié | Points de contrôle insuffisants ; Contrôle billet manuel ; Information des flux défaillante | Mise en danger du public ; Retard du coup d’envoi ; Crise d’image majeure | Calcul du débit d’entrée vs pic d’arrivée ; Billets QR et contrôle multi-files ; Ouverture des portes tôt avec animation | R08, R22 |
| **Une seule file pour billetterie, contrôle et inscriptions** | Pattern associatif : une table unique à l’entrée gère la vente de billets, le contrôle, le check-in des joueurs et les questions ; file de 30 min au moment du pic. | probable | Absence de séparation des flux ; Vente sur place majoritaire | Spectateurs qui renoncent ; Retard des matchs | Flux séparés (joueurs / prévente / vente sur place) ; Prévente avec avantage tarifaire ; Check-in joueurs dans une autre entrée | R08, R07 |

### Visibilité

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Score et programme invisibles pour le public** | Pattern : plusieurs terrains en simultané sans tableau d’affichage, programme affiché sur une feuille A4 ; le public ne sait ni où regarder ni qui gagne. | probable | Pas d’affichage par terrain ; Pas d’écran programme | Public perdu ; Moins de consommation de contenus ; Moins d’ambiance | Affichage de score par terrain (même une ardoise) ; Programme en temps réel (écran / page web) ; Terrain show unique pour les matchs clés | R09, R01 |
| **Tribunes trop loin ou d’un seul côté** | Pattern : public placé en hauteur dans une grande salle ou d’un seul côté du terrain ; à l’inverse, le 3x3 de Paris 2024 a enregistré un record de décibels avec un public au plus près du terrain. ([source](https://olympics.com/en/news/jo-paris-2024-record-decibels-ambiance-exceptionnelle-finales-basketball-3x3-parc-urbain)) | probable | Implantation non pensée pour le public | Ambiance diluée ; Images vides | Tribunes mobiles autour du terrain show ; Placement face caméra ; Respect du dégagement de 2 m | R09, R24 |

### Restauration

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Eau et nourriture insuffisantes et trop chères (Woodstock ’99)** | Woodstock ’99 : chaleur extrême, bouteilles d’eau vendues très cher, points d’eau insuffisants ; l’exaspération du public a contribué aux débordements. ([source](https://en.wikipedia.org/wiki/Woodstock_%2799)) | vérifié | Sous-dimensionnement des points d’eau ; Prix abusifs ; Chaleur | Malaises ; Colère du public ; Crise de réputation durable | Eau gratuite accessible ; Ratio de points de restauration par spectateur ; Prix affichés et raisonnables | R10, R11, R26 |
| **Une seule buvette saturée à la pause** | Pattern : un seul point de vente, paiement en espèces, 30-40 min de file à la pause ; spectateurs qui ratent la reprise, ventes perdues. | probable | Un seul point de vente ; Paiement lent ; Pas de précommande | Recettes perdues ; Frustration ; Tribunes vides à la reprise | 1 point de vente pour 400 spectateurs ; Paiement sans contact ; Précommande ; Pause décalée par terrain | R10, R08 |

### Tarification

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Prix qui évoluent sans transparence** | Vente des billets de la tournée de reformation d’Oasis (2024) : la tarification dynamique a provoqué une forte polémique au Royaume-Uni et une enquête de l’autorité de la concurrence. ([source](https://www.gov.uk/government/news/cma-launches-investigation-into-ticketmaster-over-oasis-concert-sales)) | probable | Prix non annoncés à l’avance ; Hausse en cours de vente | Sentiment d’abus ; Atteinte à l’image | Grille tarifaire publiée et stable ; Avantage clair à la prévente plutôt que hausse ; Tarifs famille et jeunes | R11 |
| **Grille incohérente (famille plus chère que deux billets, pas de tarif enfant)** | Pattern associatif : un tarif unique ou des formules incohérentes ; les références régionales montrent des grilles lisibles (ex. ASG Alsace 2026 : 5 à 15 €, VIP 50 €, gratuit moins de 5 ans). ([source](https://www.helloasso.com/associations/beyond-the-bounce/evenements/all-stars-game-2026)) | probable | Tarifs fixés sans benchmark ; Pas de réflexion sur les publics | Familles découragées ; Recettes sous-optimales | Grille type : gratuit < 12 ans, réduit, plein, famille < 2 pleins, prévente, premium ; Benchmark régional systématique | R11 |

### Récompenses

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Dotation en argent annoncée sans autorisation ni cadre fiscal** | Règle : au-delà de 3 000 € de prix dans une manifestation ouverte aux licenciés, une autorisation de la fédération délégataire est requise (Code du sport L331-5, A331-1) ; les prize money ont aussi des conséquences sociales et fiscales. ([source](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025276085)) | probable | Effet d’annonce ; Méconnaissance des règles | Annulation de la dotation ; Risque juridique et fiscal ; Perte de crédibilité | Valider toute dotation (fédération, expert-comptable) avant annonce ; Privilégier lots et expériences | R12 |
| **Récompenses génériques ou réservées au seul vainqueur** | Pattern : une coupe pour le vainqueur, rien pour les autres ; aucun souvenir pour les participants, aucune récompense individuelle (MVP, meilleur défenseur, fair-play). | probable | Budget récompenses négligé ; Pas de réflexion sur l’expérience joueur | Faible fidélisation ; Pas de contenu « remise » partageable | Souvenir pour chaque participant (photo, carte joueur numérique) ; 3 à 5 trophées individuels ; Remise scénarisée | R12 |

### Communication

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Collecte en ligne peu relayée et pages en doublon** | Signal interne : la collecte « La Bask’Cup revient sur Nancy » affichait 130 € sur 5 000 € (instantané indexé, 4 contributeurs) ; deux collectes ont des URL quasi identiques, ce qui peut gêner la communication. ([source](https://www.helloasso.com/associations/bask-est/collectes/le-all-star-game-debarque-a-nancy/widget/1)) | vérifié | Collecte non intégrée à un plan de communication ; Contreparties peu attractives ; Doublon d’URL | Objectif de financement manqué ; Signal de faible mobilisation | Plan de communication J-45 avec temps forts ; Contreparties concrètes ; Une URL unique par campagne | R13 |
| **Nom non exclusif et date proche d’un événement comparable** | Un autre « All Star Game Grand-Est » s’est tenu à Metz vers 2019, et l’ASG Alsace 2026 avait lieu une semaine après l’ASG Grand Est (13 juin 2026) : risque de confusion et de concurrence sur les mêmes joueurs et publics. ([source](https://letsgometz.com/immersion-au-coeur-du-all-star-game-grand-est/)) | probable | Pas de veille calendrier ; Pas de vérification de nom | Confusion de marque ; Joueurs et public partagés | Veille calendrier régionale ; Vérifications INPI/EUIPO et réseaux avant de figer un nom ; Coordination ou circuit avec les événements voisins | R13 |

### Engagement du public

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Tribunes « confisquées » au profit d’influenceurs** | NBA Paris Games 2025 : l’afflux d’influenceurs en tribunes, mobilisés par une agence, a été critiqué au détriment des vrais fans. ([source](https://info.fr/nba-paris-games-critiques-afflux-influenceurs-tribunes/)) | probable | Stratégie de visibilité qui ignore la communauté | Ressentiment des fans ; Authenticité perdue | Quota de places réservé aux licenciés et familles ; Créateurs comme amplificateurs, pas comme public principal | R14, R06 |
| **Public spectateur passif pendant des heures** | Pattern : aucun moment où le public agit (vote, concours, pronostic, défi) ; à l’inverse, le bracket de March Madness transforme chaque spectateur en joueur. | probable | Programme pensé uniquement pour les joueurs | Départs anticipés ; Peu de contenus UGC | Au moins une interaction public toutes les 20 min ; Bracket challenge, vote MVP, défis spectateurs | R14 |

### Audiovisuel

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Salles pleines mais audience vidéo en baisse** | Unrivaled saison 2 (2026) : billetterie +204 % et salles pleines, mais audiences TV en baisse. ([source](https://africa.espn.com/wnba/story/_/id/48146436/unrivaled-sells-arenas-sees-ratings-dip-2nd-season)) | vérifié | Expérience en salle ≠ produit vidéo ; Concurrence de programmes | Valeur partenaire limitée hors salle | Plan de captation pensé pour les formats courts ; KPI vidéo distincts des KPI billetterie | R15 |
| **Aucun plan de captation, musique protégée, contenus inexploitables** | Pattern : filmé « à l’arrache » par quelques téléphones, aucun plan des moments clés, vidéos coupées par les plateformes pour musique protégée, autorisations image absentes pour les mineurs. | probable | Pas de responsable contenu ; Pas de liste de plans ; Droits non anticipés | Aucun highlight publiable ; Rien à montrer aux partenaires | Responsable contenu désigné ; Shot list des moments clés ; Consentements image à l’inscription ; Musique libre de droits pour les montages | R15, R23 |

### Bénévoles

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Bénévoles absents ou sans mission claire** | Pattern : 20 à 30 % d’absences le jour J, rôles flous, bénévoles debout 10 h sans pause. Signal Bask’Est : 23 bénévoles avaient proposé leur aide sur JeVeuxAider, sans mission visible au moment de l’indexation. ([source](https://www.jeveuxaider.gouv.fr/organisations/34821-baskest)) | probable | Pas de fiches de poste ; Pas de planning de rotation ; Offre de bénévolat non convertie | Postes vacants (sécurité, buvette, table) ; Épuisement ; Turnover | Fiches de poste + créneaux de 4 h max ; Sur-recrutement de 20 % ; Missions publiées sur les plateformes de bénévolat | R16, R17 |
| **Encadrants de mineurs non vérifiés** | Obligation : les personnes encadrant des mineurs, bénévoles compris, sont soumises au contrôle d’honorabilité (Code du sport L212-9, loi 2024-201) ; pour une structure non affiliée, la procédure n’est pas automatisée. ([source](https://www.sports.gouv.fr/sites/default/files/2023-01/guide-honorabilit-des-b-n-voles-3844.pdf)) | probable | Méconnaissance de l’obligation ; Recrutement de dernière minute | Risque pour les mineurs ; Responsabilité de l’association | Procédure d’honorabilité intégrée au recrutement ; Pas de poste au contact des mineurs sans vérification | R16, R23 |

### Professionnalisme

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Promesse marketing sans capacité de livraison (Fyre Festival)** | Fyre Festival (2017) : un événement « de luxe » promu massivement par des influenceurs s’est effondré faute d’infrastructures (hébergement, nourriture, sécurité) ; l’organisateur a été condamné pour fraude. ([source](https://en.wikipedia.org/wiki/Fyre_Festival)) | vérifié | Communication avant la faisabilité ; Absence de rétroplanning et de go/no-go | Annulation ; Poursuites ; Réputation détruite | Go/no-go écrit à J-30 sur critères ; Ne rien promettre qui ne soit contractualisé ; Rétroplanning et responsables nommés | R17, R18, R05 |
| **Dépendance à une technologie sans plan B** | Wimbledon 2025 : le système électronique de lignes a été désactivé par erreur sur un côté du court (le club s’est excusé, « erreur humaine »), puis une panne a imposé de rejouer un point. ([source](https://www.skysports.com/tennis/news/32498/13393402/wimbledon-officials-apologise-to-players-after-line-calling-technology-turned-off-in-malfunction-on-centre-court)) | vérifié | Pas de procédure dégradée ; Opérateurs non formés | Décisions contestées ; Image d’amateurisme | Procédure manuelle de secours pour chaque outil (scoring, écran, billetterie) ; Test technique la veille | R17, R05 |

### Surdimensionnement

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Expansion trop rapide et coûts fixes trop lourds** | Kings League 2026 : après plus de 60 M€ investis à l’international, perte de 7,6 M€, plan de licenciement de 41 salariés et suspension des ligues France et Allemagne ; « de l’argent a été brûlé » selon le CEO. ([source](https://en.ara.cat/economy/gerard-pique-s-kings-league-wants-to-lay-off-half-of-its-workers_1_5764708.html)) | vérifié | Croissance avant preuve de rentabilité ; Dépendance à l’audience des créateurs | Arrêt d’activités ; Licenciements | Montée en échelle conditionnée aux résultats d’édition (maturité) ; Coûts fixes minimaux ; Provision pour imprévus | R18 |
| **Objectifs d’expansion annoncés puis repoussés** | BIG3 : objectif de 16 équipes repoussé (12 visées d’ici 2027), environ la moitié seulement des franchises vendues, litige NFT en cours. ([source](https://frontofficesports.com/big3-fighting-suit-over-nfts-amid-plans-to-take-league-public/)) | vérifié | Modèle économique fondé sur des ventes futures | Crédibilité entamée ; Instabilité | N’annoncer que ce qui est financé ; Scénario prudent comme référence budgétaire | R18 |
| **Louer trop grand, trop tôt** | Pattern associatif : réservation d’une grande salle et de prestations premium (écran LED, captation multi-caméras) avant d’avoir sécurisé les recettes ; le déficit est porté par les bénévoles. | probable | Ambition non adossée à des recettes signées ; Absence de scénario prudent | Déficit ; Trésorerie négative avant l’événement | Part de recettes sécurisées ≥ 50 % avant engagement ; Prestations premium en option conditionnelle | R18 |

### Sponsoring

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Partenaire réduit à un logo sur l’affiche** | Pattern : contreparties limitées au logo, aucune activation sur place, aucun bilan ; le partenaire ne renouvelle pas. | probable | Offre partenaire générique ; Pas de reporting | Non-renouvellement ; Prix du partenariat tiré vers le bas | Au moins une activation par partenaire (stand, défi, remise de prix) ; Bilan partenaire chiffré à J+15 | R19 |
| **Confusion parrainage / mécénat et reçus fiscaux irréguliers** | Règle : le parrainage est une prestation commerciale (facture, TVA éventuelle), le mécénat un don (réduction d’impôt de 60 % pour l’entreprise, contreparties limitées) ; un reçu fiscal délivré sans éligibilité expose l’association à une amende. ([source](https://www.economie.gouv.fr/entreprises/mecenat-donnez-des-oeuvres-dinteret-general-et-obtenez-une-reduction-dimpot)) | probable | Contrat unique mélangeant visibilité et don ; Éligibilité non vérifiée (rescrit) | Redressement ; Amende fiscale ; Partenaire mis en difficulté | Deux contrats distincts ; Rescrit mécénat avant tout reçu fiscal ; Validation par un expert-comptable | R19 |

### Accessibilité

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Accès PMR pensé pour le bâtiment, pas pour l’événement** | Pattern : bâtiment accessible (le Palais Jean-Weille a fait l’objet de travaux d’accessibilité achevés en 2023) mais implantation de l’événement qui bloque les cheminements, sans places PMR réservées en tribune ni sanitaires accessibles fléchés. ([source](https://www.grandnancy.eu/fileadmin/fichiers/VIVRE_ET_HABITER/Solidarite/2023_07_ADAP_bilan_signed.pdf)) | probable | Implantation non vérifiée ; Personnel non informé | Exclusion de spectateurs ; Non-conformité ; Contradiction avec la mission inclusive | Places PMR réservées et signalées ; Cheminement de 1,40 m maintenu ; Bénévole référent accessibilité | R20 |
| **Événement extérieur sur sol non praticable** | Pattern : 3x3 sur pelouse, gravier ou pavés, sans plancher ni cheminement stabilisé ; fauteuils, poussettes et personnes âgées ne peuvent pas accéder aux tribunes et à la buvette. | probable | Choix du site sans critère d’accessibilité | Public exclu ; Image contraire aux valeurs inclusives | Cheminements stabilisés ; Zone PMR en tribune ; Sanitaire adapté | R20 |

### Sécurité

| Cas | Observé | Fiabilité | Causes | Conséquences | Prévention | Règles |
|---|---|---|---|---|---|---|
| **Mouvement de foule face à la scène (Astroworld 2021)** | Astroworld Festival, Houston, 5 novembre 2021 : un mouvement de foule a fait 10 morts ; l’absence de capacité à arrêter le show et la densité de la fosse ont été pointées. ([source](https://en.wikipedia.org/wiki/Astroworld_Festival_crowd_crush)) | vérifié | Densité non contrôlée ; Chaîne de décision d’arrêt floue | Décès ; Poursuites judiciaires | Jauge et densité maximales par zone ; Procédure d’arrêt du spectacle ; Secours positionnés | R22, R21 |
| **Accès unique pour l’entrée et la sortie (Love Parade 2010)** | Love Parade, Duisbourg, 24 juillet 2010 : une bousculade dans le tunnel d’accès unique a fait 21 morts. ([source](https://en.wikipedia.org/wiki/Love_Parade_disaster)) | vérifié | Entrée et sortie sur le même cheminement ; Capacité du site sous-estimée | Décès ; Fin de l’événement | Flux entrée/sortie séparés ; Calcul des dégagements selon l’effectif ; Validation par les autorités | R22, R08 |
| **Intrusions de personnes sans billet (finale de l’Euro 2020 à Wembley)** | Finale de l’Euro 2020, Wembley, 11 juillet 2021 : des milliers de personnes sans billet ont forcé les accès ; un rapport indépendant (Casey Review) a analysé les défaillances. ([source](https://en.wikipedia.org/wiki/UEFA_Euro_2020_final)) | vérifié | Rassemblement massif aux abords ; Périmètre de sécurité insuffisant | Mise en danger ; Sanctions | Périmètre et filtrage dimensionnés ; Coordination avec les autorités ; Agents CNAPS au-delà de 300 spectateurs pour les palpations | R22, R21 |
| **Tournoi 3x3 extérieur annulé (chaleur, réglementation locale)** | Open Plus 3x3 de Nancy 2026 (Comité 54, Parc de la Pépinière) : annulé, la FFBB annonçant « Les Opens Plus de Pau et Nancy annulés » ; motifs rapportés : chaleur et réglementation locale. ([source](https://www.ffbb.com/actualites/les-opens-plus-de-pau-et-nancy-annules)) | vérifié | Exposition climatique en juin ; Arrêtés locaux en période de canicule | Annulation sans report ; Pertes pour les équipes et partenaires | Salle de repli réservée sous condition ; Horaires décalés ; Ombre, eau, pauses fraîcheur ; Seuils météo de décision écrits | R26, R21 |
| **Terrain collé au public ou à des obstacles** | Pattern : terrain 3x3 implanté sans zone de dégagement (bancs, barrières, poteaux, premiers rangs à moins d’un mètre) ; collisions joueurs/spectateurs. | probable | Recherche de proximité sans contrainte de sécurité ; Espace insuffisant | Blessures ; Mise en cause de l’organisateur (RC) | Dégagement de 2 m minimum ; Protections sur les obstacles ; Implantation validée avant montage | R24 |

## 5. Alimentation par les événements Bask'Est

Après chaque édition, l'audit post-événement enregistre chaque incident (`IncidentRecord` : catégorie, description, gravité de 1 à 5, résolution). Un incident de gravité ≥ 3 ou répété sur deux éditions crée un nouveau cas dans l'observatoire et, si nécessaire, une nouvelle règle ou un seuil ajusté. Les données publiques ne documentent aujourd'hui **aucun incident** des éditions Bask'Est (voir `docs/research/R1-baskest-et-territoire.md`, champ « incidents » : inconnu) : la main courante interne est la première donnée à fournir.

*Document généré à partir de `src/data/errors.ts` le 24/11/2026.*
