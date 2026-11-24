# EVENT LAB — Portefeuille de 10 concepts (v0.2, 2026-11-24)

> **Note de l'orchestrateur (v0.2.0).** Les fiches de ce portefeuille sont les versions *concept* (0.1.0), notées indépendamment. LA GRILLE 3x3 a ensuite été développée en blueprint (`blueprints/la-grille-3x3/`, version 0.2.0) avec un budget détaillé, des variantes et un plan de continuité : sa note y est de **62/100 (C)** après relecture croisée, contre 61 ici. L'écart de résultat financier entre la fiche concept et le blueprint vient du périmètre de recettes (le blueprint détaille partenaires et subventions, tous encore hypothétiques) ; dans les deux cas, la configuration standard est déficitaire au scénario central et la configuration économique est la seule recommandée pour une première édition.


Statut : **brouillon** (`draft`, maturité `concept`, version `0.1.0` pour chaque concept). Évaluation **prévisionnelle** : aucune donnée réelle. Confiance de 0,30 à 0,38 sur 1 : les écarts de 1 à 3 points entre concepts voisins ne sont pas significatifs.

## Ce qui a été fait, et ses limites

- 10 configurations `concepts/<id>.json` conformes à `schemas/event-config.schema.json`, validées par `jsonschema` 4.26 (draft 2020-12, contrôle des formats actif). Aucune erreur.
- `score.py` calcule score, grade, confiance, gains par critère et score atteignable (docs/07 §1), évalue les portes éliminatoires (§1.5), écrit `evaluation.computed` et `evaluation.gates` dans chaque fichier, et vérifie la viabilité par un contrôle financier simplifié (§7.1). Résultats dans `scores-summary.json` et `scores-table.md`. Relancer : `python3 score.py`.
- **Recherche web** : environ 40 recherches faites, puis le budget de recherche de la session a été épuisé. Trois concepts créés ensuite (`repar-arene`, `coop-12`, et pour partie `hors-bureau`) et quatre noms n'ont donc **pas** pu faire l'objet d'une vérification web d'originalité ou d'homonymie. C'est indiqué dans chaque fiche.
- **Lecture directe des pages** : bloquée par le réseau de la session pour service-public.fr, legifrance.gouv.fr, cnil.fr, culture.gouv.fr et lexisnexis.com. Chaque source citée est une URL réelle **renvoyée par l'outil de recherche avec un résumé de son contenu** ; aucune page n'a été ouverte directement. Chaque source porte une mention `verification` dans le JSON.
- **Juridique** : les textes sont nommés (Code du sport, Code de la santé publique, etc.) **sans URL**, car aucune source officielle n'a pu être ouverte. Toutes les références d'articles sont marquées « à vérifier ».
- Tous les montants sont des **estimations** ou des **hypothèses** de l'ordre de grandeur, avec leur raisonnement dans le JSON (`certainty`, `hypotheses`). Aucun devis.

## 1. Tableau de synthèse

| Rang | id | Nom | Directions | Discipline | Score | Grade | Confiance | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | `la-joute` | LA JOUTE | premium, communautaire | aucune (hors sport) | 77 | B | 0,37 | sous réserve |
| 2 | `genese` | GENÈSE | expérimental, communautaire | sport à inventer | 70 | B | 0,34 | sous réserve |
| 3 | `carre-fest` | CARRÉ FEST | premium, accessible | aucune (hors sport) | 69 | B | 0,35 | sous réserve |
| 4 | `repar-arene` | RÉPAR'ARÈNE *(remplace draft-night)* | communautaire, hybride | aucune (hors sport) | 67 | B | 0,30 | sous réserve |
| 5 | `coop-12` | CO-OP 12 *(remplace cap-12)* | accessible, hybride | esport | 66 | B | 0,32 | sous réserve |
| 6 | `hors-bureau` | HORS-BUREAU *(remplace pit-crew-cup)* | optimisé, communautaire | multi-épreuves | 64 | C | 0,35 | sous réserve |
| 7 | `level-up-run` | LEVEL UP RUN (nom à changer) | hybride, communautaire | course, marche | 64 | C | 0,34 | sous réserve |
| 8 | `silent-arena` | SILENT ARENA | expérimental, hybride | foot à 5 de nuit | 64 | C | 0,34 | sous réserve |
| 9 | `padel-royale` | PADEL ROYALE | optimisé | padel | 62 | C | 0,37 | sous réserve |
| 10 | `la-grille-3x3` | LA GRILLE 3x3 | accessible, optimisé | basket 3x3 | 61 | C | 0,34 | sous réserve |

Scores exacts : 76,9 · 69,5 · 69,2 · 66,6 · 65,6 · 64,1 · 64,1 · 63,8 · 62,2 · 61,1 (arrondi au demi supérieur).

**Couverture** : les 6 directions sont couvertes (accessible : 3 concepts ; optimisé : 3 ; premium : 2 ; expérimental : 2 ; hybride : 4 ; communautaire : 5). **Trois concepts hors sport** : la-joute, carre-fest, repar-arene.

**Verdict « sous réserve » pour les dix.** Aucun risque de sécurité n'est bloquant et tous les risques critiques ont un plan de continuité. En revanche, **aucun point réglementaire obligatoire n'est vérifié**. La règle §1.5 est appliquée « au stade blueprint », puisque ce portefeuille sert de porte d'entrée au blueprint. Aucun concept n'est éligible sans réserve, et c'est l'état réel du dossier.

### Contrôle financier (§7.1 simplifié : dérive des coûts 15/5/0 %, contingence 10 %)

| id | Prudent | Central | Ambitieux | Dépenses fixes de base | Périmètre modélisé |
|---|---|---|---|---|---|
| la-joute | +286 € | +1 305 € | +1 814 € | 9 260 € | un programme entreprise |
| genese | −366 € | +1 404 € | +2 290 € | 16 100 € | un programme de 8 semaines |
| carre-fest | −242 € | +344 € | +637 € | 5 330 € | une location de kit (côté loueur) |
| repar-arene | −464 € | +485 € | +1 210 € | 5 900 € | un épisode d'une série |
| coop-12 | −5 216 € | −2 019 € | +330 € | 6 700 € | une édition |
| hors-bureau | −5 659 € | +1 822 € | +8 537 € | 12 850 € | une saison de 7 soirées |
| level-up-run | −6 470 € | −2 973 € | +1 930 € | 6 000 € | une édition |
| silent-arena | −5 851 € | −1 395 € | +1 840 € | 8 600 € | une soirée |
| padel-royale | −457 € | +21 € | +486 € | 780 € | une soirée de club |
| la-grille-3x3 (standard ≈ 11 k€) | −10 889 € | −6 440 € | −1 940 € | 10 900 € | une journée |
| la-grille-3x3 [économique ≈ 6 k€] | −4 564 € | −665 € | +3 560 € | 5 900 € | une journée |
| la-grille-3x3 [premium ≈ 24 k€] | −27 460 € | −19 770 € | −12 150 € | 24 000 € | une journée |

**Lecture** : les concepts commandés (la-joute, genese, repar-arene, carre-fest) paraissent équilibrés **seulement si** le client signe avant l'engagement des dépenses, à un prix qui n'a été testé auprès de personne. Pour la note de viabilité, une règle unique s'applique : la note de base est lue sur le résultat §7.1, puis on retire 1,5 point si la recette principale dépend d'un prix ou d'un acheteur non testé, et 0,5 point de plus en cas de risque d'investissement.

---

## 2. Fiches concepts (par rang)

### 2.1 LA JOUTE — 77/100 (B), confiance 0,37

- **Problème** : les concours d'éloquence sont nombreux mais suivent un format long et statique, une suite de discours. Les entreprises veulent faire travailler la prise de parole autrement qu'en formation théorique (hypothèse, non sourcée).
- **Client et volonté de payer** : entreprises de 200 à 5 000 salariés (RH, formation, communication interne), 10 à 15 k€ par programme (hypothèse) ; associations étudiantes et écoles, licence de 300 à 800 € par saison (hypothèse) ; soirées publiques à 10–15 € (hypothèse). Seul signal de demande sourcé : une demi-finale universitaire mise en scène en « arène » a réuni environ 450 spectateurs et plus de 2 500 personnes en direct ([Thotis Media](https://thotismedia.com/demi-finale-concours-paris1-sorbonne/), fiabilité C).
- **Valeur et différenciation** : la grammaire complète des soirées de combat (affiche, pesée filmée, entrée musicale, trois rounds dont un corps-à-corps, trois juges et cartons sur 10, décision partagée, ceinture) en combats de 12 minutes. Existant : [Eloquentia](https://www.paris.fr/evenements/finale-eloquentia-le-plus-grand-concours-de-prise-de-parole-108059), la [Joute des Associations](https://www.lepetitjuriste.fr/la-joute-des-associations-par-les-titans-de-leloquence/), la [Coupe de Débat du Grand Paris](https://www.univ-paris8.fr/La-Coupe-de-Debat-du-Grand-Paris). **Le plus proche** : un projet à Sarcelles qui alterne rounds de boxe et rounds d'éloquence, décrit dans une [page dont l'adresse évoque un « eloquence ring »](https://www.lexisnexis.com/blogs/fr-juridique/b/actualite/posts/ibrahim-konate-eloquence-ring). Je n'ai pas pu lire cette page : **une antériorité possible reste à lever avant toute chose**.
- **Offre, positionnement, prix** : programme entreprise à 12 k€ HT (4 ateliers de coaching, puis un gala de 5 combats, 10 orateurs, 10 clips), positionné premium B2B ; ligue campus sous licence ; soirées publiques billetées. Prix non testés.
- **Acquisition** : LinkedIn (clips de répliques), réseaux RH, associations d'éloquence comme relais de talents. Coût d'acquisition (hypothèse) : 500 à 1 500 € par client entreprise, soit 1 à 2 jours de prospection et une part de pilote de démonstration.
- **Coûts et marges** : environ 9,3 k€ de dépenses par programme (coachs 2,2 k€, technique 1,8 k€, vidéo 1,5 k€, direction de projet 1,5 k€, maître de cérémonie, juges, scénographie). Résultat calculé : +1,3 k€ au central, +0,3 k€ au prudent, soit une marge brute d'environ 20 % avant contingence.
- **Récurrence et licence** : championnat annuel interne, saisons de ligue campus, licence aux associations. La montée en charge bute sur les talents (maîtres de cérémonie, coachs, juges) : il faut un programme de formation.
- **Barrières et avantage** : protection juridique faible. L'avantage tient au réseau de juges et de coachs formés, à la bibliothèque de clips et au classement des orateurs.
- **Première version commercialisable** : une soirée publique de 4 combats avec une association d'éloquence locale, filmée. Elle sert de démonstration à un premier programme entreprise vendu à prix pilote.
- **Test en 7 jours** : tourner 1 h de combats d'essai avec une association, monter 2 clips, et envoyer une offre d'une page à 40 responsables RH ou formation de la région. **Succès** : au moins 4 rendez-vous de découverte et 1 demande de devis. En parallèle, une page de préinscription à une soirée publique gratuite : **succès** à 60 inscrits.
- **Nom** : aucun événement unique nommé « La Joute » n'a été trouvé, mais le mot est très courant (« joute oratoire », « Joute des Associations »). Le nom est peu distinctif et donc difficile à protéger : en prévoir un plus distinctif. Vérification INPI/EUIPO avant tout usage commercial.

### 2.2 GENÈSE — 70/100 (B), confiance 0,34

- **Problème** : les démarches participatives jeunesse produisent rarement un résultat tangible et médiatisable (hypothèse). Les sports établis n'attirent pas certains jeunes (hypothèse non sourcée).
- **Client et volonté de payer** : villes (services jeunesse, sport, participation citoyenne), 20 k€ par programme (hypothèse) ; marques et agences, 20 à 40 k€ (hypothèse). Aucun prix de marché sourcé.
- **Valeur et différenciation** : en 8 semaines, une communauté vote un module de règles par semaine. Chaque vote est suivi d'un test filmé en gymnase, dans les limites d'une « constitution » de sécurité et d'inclusion qui ne se vote pas, et le programme se conclut par un tournoi fondateur. Existant : [Speedgate](https://www.cbc.ca/radio/spark/spark-438-1.5122430/introducing-speedgate-the-world-s-first-ai-designed-sport-1.5122435), conçu avec l'IA (2019) ; [OneGoal.Football](https://pressreleases.responsesource.com/newsroom/OneGoalFootball/release/94561), qui annonce des règles issues des joueurs (communiqué, fiabilité D) ; [Fan Controlled Football](https://en.wikipedia.org/wiki/Fan_Controlled_Football), où les fans votaient les actions, en sommeil après deux saisons ; [Qontrol Ball](https://www.uu.nl/en/news/researchers-and-students-design-entirely-new-sport), conçu par des universitaires. **Aucun programme identique trouvé.**
- **Offre et prix** : programme clé en main à 20 k€ HT, avec une option de rencontre inter-villes des sports inventés.
- **Acquisition** : démarchage des villes et réponse aux appels à projets participatifs ; agences pour les marques. Coût d'acquisition (hypothèse) : 2 à 4 k€ par contrat, car le cycle de vente public est long.
- **Coûts et marges** : environ 16,1 k€ (animation de communauté 4,8 k€, feuilleton vidéo 3,2 k€, tournoi 4 k€, direction de programme 2 k€). Résultat : +1,4 k€ au central, −0,4 k€ au prudent.
- **Récurrence et licence** : faible par construction, puisque chaque ville invente un seul sport. Une récurrence est possible par la rencontre inter-villes et le catalogue. La méthode se duplique, mais chaque programme mobilise 8 semaines d'animation.
- **Barrières** : méthode, marque et catalogue. La protection est faible et le règlement est publié sous licence ouverte.
- **Première version** : pilote de 4 semaines dans un établissement scolaire ou un centre social.
- **Test en 7 jours** : avec une association jeunesse, 3 sondages en stories sur un premier module de règles et une séance de test de 2 h. **Succès** : au moins 150 votants, 20 testeurs présents, et 70 % des testeurs qui veulent continuer.
- **Nom** : non vérifié (budget de recherche épuisé). C'est un mot courant, les homonymes sont très probables : c'est un nom de travail.

### 2.3 CARRÉ FEST — 69/100 (B), confiance 0,35

- **Problème** : les fêtes locales manquent de qualité d'expérience. Louer une scénographie coûte cher, et les bénévoles n'ont pas de méthode d'exploitation (hypothèses).
- **Client et volonté de payer** : communes de 3 000 à 50 000 habitants, comités des fêtes, CSE, bailleurs sociaux. Prix hypothétiques : 3,5 k€ (Essentiel) et 6,5 k€ (Standard) le week-end. Signal de marché sourcé : des communes achètent déjà un kit culturel standardisé dont le coût minimum annoncé est d'environ 40 000 € ([Micro-Folies, ministère de la Culture](https://www.culture.gouv.fr/regions/Drac-Provence-Alpes-Cote-d-Azur/politique-et-actions-culturelles/micro-folies) ; montant tiré du résumé de recherche, page exacte à confirmer).
- **Différenciation** : existent déjà les kits d'événement prêtés par des villes ([Arlington](https://downtownarlington.org/do-business/the-creator-club/event-in-a-box), 75 $ pour sono, tente et micros ; [Surrey](https://surrey.ca/community/17127.aspx)), les catalogues de matériel mutualisé ([Fontenay-Trésigny](https://fontenay-tresigny.fr/wp-content/uploads/2026/04/Catalogue-Materiel-Mutualise-2026.pdf)), le prêt de scène départemental ([Gironde](https://www.gironde.fr/sites/default/files/2025-12/A5-BrochurePrez-2026-25112025-WEB.pdf)) et un [kit de micro-festival de voisinage](https://www.trendhunter.com/trends/festival-kit1). CARRÉ FEST ajoute la scénographie de festival, le manuel d'exploitation et des thèmes renouvelés. L'innovation porte sur le modèle, peu sur l'expérience.
- **Offre et prix** : trois formules (300, 550 et 800 personnes) en location au week-end ; licence avec achat du kit et abonnement annuel aux thèmes et à la formation.
- **Acquisition** : démarchage des communes et intercommunalités, bouche-à-oreille entre élus, salons d'élus (non vérifié). Coût d'acquisition (hypothèse) : 500 à 1 000 € par client, avec un fort réachat attendu d'une année sur l'autre.
- **Coûts et marges (côté loueur)** : amortissement de 1,3 k€ par location (kit d'environ 55 k€, hypothèse sans devis, sur 3 ans et 14 locations par an), deux techniciens sur 3 jours (1,7 k€), transport, entretien. Résultat par location : +0,3 k€ au central, −0,2 k€ au prudent. **Tout repose sur le taux d'utilisation**, dans une saison concentrée de mai à septembre.
- **Récurrence et licence** : c'est le concept le plus proche d'un **actif physique licenciable avec effet de réseau**, sur le modèle Micro-Folie : thèmes annuels, réachat, formation.
- **Barrières** : le coût du kit et la logistique freinent aussi les concurrents. L'avantage tient à la qualité de conception et au réseau d'utilisateurs.
- **Première version** : formule Essentiel montée avec du matériel loué ou réemployé (investissement inférieur à 10 k€, hypothèse), pour 3 locations pilotes. **Ne pas fabriquer le kit Standard sans 8 week-ends prévendus.**
- **Test en 7 jours** : planche d'ambiance et grille de prix envoyées à 40 communes et associations d'un département, plus 5 appels. **Succès** : 3 demandes de devis datées et 1 acompte ou devis signé.
- **Nom** : non vérifié (la recherche a été refusée, budget épuisé). Vérification INPI/EUIPO à faire.

### 2.4 RÉPAR'ARÈNE — 67/100 (B), confiance 0,30 — *remplace draft-night*

- **Problème** : la réparation reste peu visible et peu désirable. Les collectivités chargées de prévenir les déchets ont besoin d'actions visibles et mesurables (hypothèse).
- **Client et volonté de payer** : intercommunalités et syndicats de déchets, bailleurs sociaux, médiathèques. Hypothèse : 7 000 € par épisode dans un contrat de 4 épisodes. Aucun prix sourcé.
- **Différenciation** : les ateliers de réparation participatifs ne sont pas compétitifs ; ici, six duos amateur-artisan s'affrontent en trois manches, avec pronostic du public, gros plan sur écran et **pesée publique des objets sauvés**. **Originalité non vérifiée sur le web** (budget épuisé) : c'est la première tâche avant toute suite.
- **Offre et prix** : série de 4 à 6 épisodes par an et une finale ; le kit, l'animation et les tutoriels sont fournis.
- **Acquisition** : élus et services de prévention des déchets, chambres des métiers comme co-portage. Coût d'acquisition (hypothèse) : 1 à 2 k€ par contrat public.
- **Coûts et marges** : environ 5,9 k€ par épisode (coordination 1,2 k€, indemnités des duos 0,9 k€, vidéo 0,8 k€…). Résultat : +0,5 k€ au central, −0,5 k€ au prudent.
- **Récurrence** : séries annuelles ; licence possible aux réseaux de réparation et aux collectivités.
- **Barrières** : relations avec les artisans et les collectivités, barème et contenus. **Point dur** : la responsabilité en cas de dommage causé ensuite par un objet réparé. Il faut l'avis d'un assureur et d'un juriste avant le premier épisode.
- **Première version** : un épisode pilote cofinancé dans une médiathèque.
- **Test en 7 jours** : présenter le concept à 3 collectivités compétentes en prévention des déchets et lancer un appel aux objets sur un quartier. **Succès** : 1 lettre d'intention et au moins 24 objets inscrits.
- **Nom** : non vérifié. Ne pas utiliser la marque d'un réseau d'ateliers de réparation existant.

### 2.5 CO-OP 12 — 66/100 (B), confiance 0,32 — *remplace cap-12*

- **Problème** : les animations inclusives séparent souvent les publics ou se limitent à de la découverte ; une compétition mixte paraît injuste sans règle d'équilibrage.
- **Client et volonté de payer** : médiathèques et services numériques des communes, 6 k€ par édition (hypothèse) ; missions handicap des entreprises, 5 à 10 k€ (hypothèse).
- **Différenciation** : la logique de plafond de points des sports paralympiques collectifs est transposée à l'esport. En basket fauteuil, chaque joueur est classé de 1 à 5 points, l'équipe est plafonnée et les joueuses bénéficient d'une concession de 1,5 point en équipe mixte ([British Wheelchair Basketball](https://britishwheelchairbasketball.co.uk/be-involved/motability-scheme-inspire-leagues/)) ; une ligue australienne a relevé le plafond à 15 points pour ouvrir l'accès ([Basketball Victoria](https://api.basketballvictoria.com.au/api/assets/3l4q54zl8n6swok0)). Ici, la valeur d'un joueur dépend de son **mode de jeu** (manette adaptée, aides activées), de son âge et de son expérience, **jamais d'un diagnostic** : on évite ainsi de collecter des données de santé (hypothèse juridique à confirmer). **Originalité non vérifiée sur le web.**
- **Offre** : après-midi clé en main (8 postes, manettes adaptées, commentaire, diffusion) ; version entreprise.
- **Acquisition** : réseaux de médiathèques, associations esport, missions handicap. Coût d'acquisition (hypothèse) : 800 à 1 500 € par client.
- **Coûts et marges** : environ 6,7 k€ par édition. Résultat : −2,0 k€ au central. L'équilibre suppose environ 7,5 k€ signés, un montant élevé pour une médiathèque : **la version entreprise est la seule piste solvable**.
- **Récurrence** : trimestrielle par médiathèque, annuelle en entreprise.
- **Barrières** : barème co-conçu avec des associations, ce qui en fait la légitimité. **Risque juridique propre** : les droits d'usage public du jeu vidéo choisi, à vérifier auprès de l'éditeur.
- **Première version** : un après-midi dans une médiathèque partenaire avec 10 équipes.
- **Test en 7 jours** : deux ateliers de 2 h où 16 joueurs mêlant âges et manettes adaptées appliquent le barème. **Succès** : au moins 80 % jugent la composition équitable et au plus 10 % se disent mal à l'aise avec le barème.
- **Nom** : non vérifié. « Co-op » est un terme courant du jeu vidéo.

### 2.6 HORS-BUREAU — 64/100 (C), confiance 0,35 — *remplace pit-crew-cup*

- **Problème** : les zones d'activités sont désertes après 18 h. Les challenges inter-entreprises existants sont ponctuels, se tiennent en centre-ville ou sont numériques, et ils excluent souvent les salariés non sportifs.
- **Client et volonté de payer** : entreprises d'une même zone, 1 200 € par équipe et par saison (hypothèse) ; associations de zone et clubs d'entreprises, 2 000 € (hypothèse). La demande pour les formats voisins est attestée : [718 équipes et 2 872 participants](https://grandpoitiers.fr/information-transversale/actualites/defi-inter-entreprises-bravo-aux-entreprises-participantes-40083/pdf) à un défi inter-entreprises en 2023 ; une [28e édition](https://www.lagazettefrance.fr/article/beauvais-accueillera-le-1er-octobre-la-28e-edition-du-defi-inter-entreprises) à Beauvais.
- **Différenciation** : existent déjà la [League of Défense](https://www.defense-92.fr/animation/league-of-defense-le-challenge-completement-barre-pour-souder-les-salaries-de-la-defense-81296), [Faites vos jeux en entreprise](https://www.medef.com/actualites-download/faites-vos-jeux-en-entreprise-1), les [olympiades à points cumulés](https://www.inovallee.com/wp-content/uploads/2026/07/CALCUL-DES-POINTS.pdf) et l'[EPISOD Corporate Challenge](https://corporatechallenge.episod.com/sites/default/files/pdf/reglement_corporate_challenge_mars_2026.pdf). HORS-BUREAU se joue **sur le parking de la zone**, en saison de 6 soirées, avec un kit mobile et une règle empruntée au contre-la-montre par équipes (le score est pris sur le 4e coéquipier). L'écart avec l'existant reste limité, et la vérification d'un format identique est incomplète.
- **Offre** : saison de printemps ou d'automne de 7 soirées de 3 h, avec un kit de contenus LinkedIn par entreprise.
- **Acquisition** : association de zone (prévente), CCI, RH sur LinkedIn. Coût d'acquisition (hypothèse) : 300 à 600 € par entreprise, mutualisé par l'association de zone.
- **Coûts et marges** : 12,9 k€ de coûts fixes par saison. Résultat : +1,8 k€ au central (12 équipes), −5,7 k€ au prudent (8 équipes). **Règle de décision : go/no-go à J-30 avec 10 équipes payées**, location du kit non engagée avant.
- **Récurrence et licence** : deux saisons par an ; licence à des animateurs régionaux. C'est le meilleur profil récurrent B2B du portefeuille.
- **Barrières** : relation avec les associations de zone, kit et données de saison.
- **Première version** : une saison de 8 à 10 entreprises dans une zone.
- **Test en 7 jours** : présenter l'offre à une association de zone et l'envoyer à 40 RH ou CSE de la zone. **Succès** : 5 entreprises signent une lettre d'intention au prix affiché.
- **Nom** : non vérifié. « Hors bureau » est une expression courante.

### 2.7 LEVEL UP RUN — 64/100 (C), confiance 0,34

- **Problème** : les courses ludiques ponctuelles fidélisent peu, et les non-coureurs sont rebutés par le chronomètre.
- **Client et volonté de payer** : participants à 10 € par édition (hypothèse) ; villes et offices de tourisme à 4 k€ par édition (hypothèse, aucun acheteur contacté) ; commerces partenaires.
- **Différenciation** : une progression (XP, niveaux, quêtes, points « boss » tenus par des clubs) qui persiste **entre éditions physiques**, sans classement au temps. Existant : l'application [District](https://apps.apple.com/us/app/id1488277931) (points de contrôle et XP), la [District Race](https://www.trendhunter.com/trends/district-race), la plateforme QR [Seeker XP](https://seeker.io/xp), les jalons d'assiduité de [parkrun](https://en.wikipedia.com/wiki/Parkrun).
- **Offre** : 4 éditions par an et une licence logicielle aux villes.
- **Acquisition** : clubs de course, réseaux de la ville, commerces. Coût d'acquisition (hypothèse) : 3 à 6 € par participant.
- **Coûts et marges** : 6 k€ de coûts fixes par édition. Résultat : −3,0 k€ au central (300 participants) ; l'équilibre n'arrive qu'à 600 participants ou avec un contrat ville.
- **Récurrence** : forte en principe, puisque la persistance des profils crée un coût de sortie. Elle reste à démontrer.
- **Barrières** : données de progression et bibliothèque de quêtes.
- **Première version** : uniquement sur une plateforme QR existante, sans développement.
- **Test en 7 jours** : un « alpha » d'une heure dans un parc avec 10 QR et un formulaire sans code. **Succès** : 25 participants, au moins 60 % qui veulent revenir pour le niveau 2, et une médiane d'au moins 8 points validés sur 10.
- **Nom** : **indisponible en pratique**. Plusieurs défis de course s'appellent déjà « Level Up » ([WCR](https://findarace.com/us/events/level-up-wcr-10th-anniversary-virtual-challenge), [Global Run Club](https://grc.worldmarathonmajors.com/events/level-up-with-the-majors-challenge), [PAC-MAN Level Up](https://www.bibrave.com/races/pac-man-virtual-challenge-level-up-2022-reviews/15978)). Il faut renommer.

### 2.8 SILENT ARENA — 64/100 (C), confiance 0,34

- **Problème** : les événements sportifs nocturnes sont refusés ou écourtés en zone dense à cause du bruit.
- **Client et volonté de payer** : villes (jeunesse, politique de la ville), 9 à 10 k€ par soirée (hypothèse) ; spectateurs à 0–3 € plus caution. Signal de prix : une soirée de retransmission sportive en casques louait le casque 10 $ ([Bungalower](https://bungalower.com/2023/02/08/silent-super-bowl-tip-toes-into-ace-cafe-this-weekend/)).
- **Différenciation** : les casques multicanaux existent en événement sportif ([Quiet Events](https://www.quietevents.com/collections/sporting-events), source prestataire D), tout comme l'audio de l'arbitre pour les spectateurs au rugby ([World Rugby](https://www.world.rugby/the-game/game-systems/match-technology/referee-communications)). SILENT ARENA est conçu entièrement pour le silence : arbitrage lumineux, canal commentaire, canal arbitre et coach, canal d'audiodescription. **Limite reconnue par le prestataire lui-même** : le bruit de la foule et les règles locales s'appliquent toujours ([page bruit](https://www.quietevents.com/collections/noise-ordinances-silent-disco-events)). C'est le risque critique R1.
- **Offre** : soirée clé en main ou série estivale de 4 à 8 soirées.
- **Acquisition** : services municipaux. Coût d'acquisition (hypothèse) : 1 à 2 k€ par ville signée.
- **Coûts et marges** : environ 8,6 k€ par soirée. Résultat : −1,4 k€ au central tant que la prestation n'est que probable.
- **Récurrence** : séries estivales ; partenariat possible avec un loueur de casques.
- **Barrières** : faibles. L'avantage tient au savoir-faire d'arbitrage lumineux et de commentaire.
- **Test en 7 jours** : 20 casques loués pour un match de foot à 5 commenté, avec 40 invités sur un city-stade, plus 3 rendez-vous avec des services municipaux. **Succès** : au moins 60 % des invités gardent le casque plus de 60 minutes, la satisfaction atteint 4/5 ou plus, et 1 service municipal manifeste un intérêt écrit.
- **Nom** : aucun événement « Silent Arena » trouvé en une recherche. Terme anglais générique ; vérification INPI/EUIPO.

### 2.9 PADEL ROYALE — 62/100 (C), confiance 0,37

- **Problème** : les soirées americano des clubs se ressemblent toutes ; les clubs veulent remplir les heures creuses et fidéliser.
- **Client et volonté de payer** : joueurs à 35 € la soirée (hypothèse) ; clubs à 100–200 € par soirée ou 49–99 € par mois de licence (hypothèse).
- **Différenciation** : **le cœur du format existe déjà** : rotation et classement individuel de l'[americano](https://www.padel.fyi/articles/americano/) et du [mexicano](https://skedge-web.web.app/resources/mexicano-format), pistes hiérarchisées du [King of the Court](https://www.padelbrowser.com/blog/padel-tournament-formats-americano-king-of-the-court), élimination par rotations du [tournoi progressif luxembourgeois](https://padel.flt.lu/media/69bd203fc1038_reglement-officiel-tournoi-progressif.pdf), court central du [One Point Challenge Tour](https://www.sortiraparis.com/en/what-to-do-in-paris/sport-wellness/articles/349160-one-point-challenge-tour-a-padel-tournament-and-festival-in-a-knockout-format-on-ile-de-puteaux). Le seul ajout est la fermeture des pistes par paliers avec repêchage.
- **Coûts et marges** : à peine à l'équilibre au central (+21 €), −44 % au prudent.
- **Récurrence** : mensuelle par club, mais **la licence n'est pas crédible** : une règle de jeu se copie sans coût et des logiciels de rotation existent déjà ([WeCourts](https://wecourts.featurebase.app/en/changelog/live-results)).
- **Seule barrière envisageable** : un classement individuel inter-clubs persistant.
- **Test en 7 jours** : une soirée pilote dans un club à 35 € et 10 entretiens de gérants. **Succès** : 16 inscrits payants, et au moins 3 gérants prêts à payer 50 € ou plus par mois.
- **Nom** : aucun événement « Padel Royale » trouvé. « Battle royale » est un titre d'œuvre et un genre de jeu vidéo : vérifier les droits antérieurs.

### 2.10 LA GRILLE 3x3 — 61/100 (C), confiance 0,34 (blueprint imposé)

- **Problème** : dans les tournois 3x3 amateurs, les poules sont tirées au sort ou formées sur un niveau déclaré, ce qui produit des poules déséquilibrées (hypothèse), et le matin est sans enjeu.
- **Client et volonté de payer** : l'association organisatrice ; les équipes paient 60 € et les spectateurs 5 € (paramètres imposés). La FFBB laisse l'organisateur fixer librement le droit d'engagement ([guide Open Plus Access](https://www.3x3ffbb.com/uploads/2026-01-07-7-3X3-DEVT-Guide-Open-Plus-Access-25-26-VF-695f71ca6ed7f.pdf)). Aucun prix de marché sourcé.
- **Différenciation** : le placement serpentin ([FIBA](https://www.fiba.basketball/3x3worldcup/2018/competition-format)) et les concours d'habileté avec qualifications ([FIBA 2014](https://www.fiba.basketball/en/news/2014-3x3wc-system-of-competition)) existent. Les qualifications éliminatoires Q1/Q2/Q3 qui produisent la grille des poules n'ont pas été trouvées sous forme identique. **Faiblesse de fond** : le temps de parcours mesure l'habileté, pas le niveau de match.
- **Offre** : format et coordination EVENT LAB à 1,5 k€ (hypothèse), dans un budget standard d'environ 11 k€.
- **Acquisition** : relais des clubs et du comité départemental, réseaux sociaux locaux. Coût d'acquisition (hypothèse) : 5 à 10 € par équipe.
- **Coûts et marges** : **déficitaire dans les trois scénarios en configuration standard** (−6,4 k€ au central) tant que partenaires et subvention restent hypothétiques. **Il faut environ 8 k€ de recettes externes signées pour équilibrer le central.** La configuration économique (environ 6 k€) donne −0,7 k€ au central. La configuration premium (environ 24 k€) n'est envisageable qu'avec environ 20 k€ de sponsoring.
- **Récurrence et licence** : édition annuelle et kit licenciable aux associations. La valeur tient à l'outil de chronométrage et de grille, pas à la règle.
- **Première version** : une édition en configuration économique.
- **Test en 7 jours** : page de préinscription relayée par 5 clubs, avec un acompte de 10 €, et 15 commerces sollicités. **Succès** : 12 équipes préinscrites, au moins 60 % des répondants qui jugent les qualifications attractives, et 3 engagements partenaires d'au moins 500 € chacun.
- **Nom** : aucun tournoi 3x3 « La Grille » trouvé. « Grille » est un mot générique : vérification INPI/EUIPO.

---

## 3. Classement final et recommandation

**Classement par score** : la-joute 77 · genese 70 · carre-fest 69 · repar-arene 67 · coop-12 66 · hors-bureau 64 · level-up-run 64 · silent-arena 64 · padel-royale 62 · la-grille-3x3 61.

**Ordre recommandé, en raisonnant en actif économique** (récurrence, licence, effet de levier, asymétrie de risque). Il diffère du classement par score sur deux points, expliqués ci-dessous.

1. **LA JOUTE — poursuivre en premier.** Un pilote coûte moins de 2 k€ (hypothèse) et les acheteurs B2B sont solvables. Le concept combine récurrence annuelle, déclinaison campus licenciable et contenus qui font de l'acquisition. Le risque est très asymétrique : on perd une soirée, on peut gagner des contrats récurrents. Préalable de 48 h : lever l'antériorité « eloquence ring ».
2. **CARRÉ FEST — valider sans fabriquer.** C'est le seul actif physique licenciable avec effet de réseau, et un marché communal pour des kits existe (Micro-Folie). Sur le papier, c'est le meilleur levier à long terme. L'investissement (environ 55 k€, hypothèse) rend le risque défavorable tant que la demande n'est pas prouvée : 8 week-ends prévendus avant toute fabrication.
3. **HORS-BUREAU — test B2B.** Il est noté en C, mais c'est le meilleur profil de revenu récurrent B2B, avec un risque borné par le go/no-go à 10 équipes. Je le place devant genese et coop-12 pour cette raison.
4. **RÉPAR'ARÈNE — sous condition.** Faible coût, acheteurs publics avec une mission, et un indicateur mesurable (le kilo d'objets sauvés). À poursuivre seulement après une recherche d'antériorité et l'avis d'un assureur sur la responsabilité.
5. **LA GRILLE 3x3 — mener le blueprint comme pilote opérationnel, pas comme pari économique.** Elle arrive dernière au score et elle est déficitaire en configuration standard. Elle reste un choix défendable pour éprouver la chaîne EVENT LAB (format, blueprint, exécution), à risque faible et borné, **à condition** de basculer en configuration économique sans 8 k€ de recettes externes signées à J-45. Si le porteur cherche le meilleur pari business, ce n'est pas celui-ci.

**Sur commande uniquement** (pas d'investissement sans client signé) : **GENÈSE**, deuxième au score grâce à l'originalité et au potentiel médiatique, mais sans aucune recette autonome ni récurrence : c'est un très bon produit de commande, un mauvais pari d'investissement ; **SILENT ARENA**, si une ville le demande ; **CO-OP 12**, dans sa version entreprise, après vérification des droits du jeu.

**Mettre en attente** : **LEVEL UP RUN** (déficit au central, développement logiciel, nom indisponible ; à rouvrir si une ville signe).

**Abandonner comme produit** : **PADEL ROYALE**. Le format est copiable sans coût et la licence n'est pas crédible. Il peut au mieux servir de contenu gratuit pour un club partenaire.

---

## 4. Remplacements effectués et recoupements

| Graine | Décision | Motif (sources) | Remplacé par |
|---|---|---|---|
| `pit-crew-cup` | **Abandonnée** | Le team building « arrêt au stand » est vendu à l'identique par de nombreux prestataires : [Red Bull Ring](https://www.redbullring.com/en/business/incentives-teambuilding/non-vehicle-incentives/pit-stop-game/), [Eventurous](https://www.eventurous.co.uk/outdoor-team-building/pitstop-challenge/) (jusqu'à 300 personnes), [Daytona](https://daytona.co.uk/team-building), [Chillisauce](https://chillisauce.com/events/do-team-challenges/go-5e3d2dfd06038327d8914f78). | `hors-bureau` (marché B2B conservé, modèle récurrent par saison) |
| `draft-night` | **Retirée et archivée** (`remplaces/draft-night.json`, statut `archived`) | Recoupe l'existant interne du porteur, « QUADRA — 4x4 draft mystère » et « VITRINE — showcase & draft live », ainsi que l'existant externe : [ligue amateur à draft de Detroit, 47e saison](https://comeplaydetroit.leaguelab.com/league/99463/details), [draft de la Kings League France](https://fr.soccerway.com/actualites/80-joueurs-draftes-des-stars-du-football-des-influenceurs-la-kings-league-est-lancee-en-france/p04ZPYJ8), [draft du Young Star Game LNB](https://www.sortiraparis.com/en/what-to-do-in-paris/sport-wellness/articles/335199-young-star-game-meilleurs-espoirs-basket-francais-levallois). | `repar-arene` (hors sport) |
| `cap-12` | **Remplacée** (jamais publiée en fichier) | Recoupe l'existant interne du porteur en basket, « ROUES LIBRES — 3x3 fauteuil pour tous » et « TRIBU 3G — 3x3 intergénérationnel ». La logique de plafond existe aussi en basket fauteuil ([BWB](https://britishwheelchairbasketball.co.uk/be-involved/motability-scheme-inspire-leagues/)). | `coop-12` (logique transposée à l'esport, hors basket) |

**Recoupements partiels avec l'existant interne BASK'EST LAB.** Seuls les titres et la courte description communiqués par l'orchestrateur ont été utilisés, sans aucune donnée interne.
- `silent-arena` et « La Veillée — tournoi nocturne de gymnase », « Les Nocturnes — 3x3 au score cible » : discipline déplacée vers le foot à 5 ; le concept devient une couche « silence » applicable à tout tournoi de nuit, y compris ces deux formats (synergie possible).
- `hors-bureau` et « L'Échelle de l'Est — saison des défis » : logique de saison partagée ; public, lieu et épreuves distincts, sans basket.
- `level-up-run` et « L'Échelle de l'Est », « CITY TOUR 54 » : logique de progression saisonnière partagée ; discipline et mécanique distinctes.
- `la-grille-3x3` : aucun recoupement identifié sur les titres. Le concept reste dans le même champ, le basket, que le portefeuille BASK'EST.

**Différenciations conservées** : `padel-royale` (fermeture des pistes et repêchage, ajout modeste) ; `la-joute` (dramaturgie complète du combat ; antériorité à lever) ; `silent-arena` ; `level-up-run` ; `carre-fest` ; `genese` (aucun équivalent trouvé).

---

## 5. Juridique : information générale, à faire valider

Aucune source officielle n'a pu être ouverte dans la session : les domaines service-public.fr, legifrance.gouv.fr et cnil.fr sont bloqués. Les points ci-dessous sont des **pistes à vérifier**, pas des avis juridiques. Ils sont détaillés concept par concept dans `compliance` (statut `a_verifier`).

| Thème | Point à vérifier | Concepts | Expert à consulter |
|---|---|---|---|
| Manifestations sportives | Assurance RC de l'organisateur (Code du sport, art. L321-1) ; autorisation de la fédération délégataire si l'événement est ouvert aux licenciés avec prix au-delà d'un seuil (art. L331-5) ; certificat ou questionnaire de santé des non-licenciés ; manifestations sur la voie publique | grille, padel, silent, hors-bureau, level-up, genese | avocat en droit du sport, fédération, assureur |
| Secours et lieux | Dispositif prévisionnel de secours (référentiel national) ; effectif autorisé ERP (types X, PA, chapiteaux et structures) ; rassemblements festifs et seuils de déclaration | tous ; carre-fest en priorité ([guide du ministère de la Culture, non lu](https://www.culture.gouv.fr/Media/Medias-creation-rapide/Guide_Rassemblements_Festifs_2021.pdf)) | préventionniste, commission de sécurité, association agréée |
| Buvettes | Autorisations temporaires en nombre limité ; restrictions sur l'alcool dans les installations sportives (Code de la santé publique) | grille, silent, carre-fest, hors-bureau | mairie, juriste |
| Jeux-concours | Pronostics et votes avec lots : gratuité totale et règlement, sinon risque de loterie prohibée ; concours d'adresse avec inscription payante | grille, draft (archivé), repar, coop-12, genese | avocat en droit des jeux |
| Mineurs | Autorisations parentales, droit à l'image, consentement numérique (âge légal en France à vérifier), présence de nuit | silent, la-joute (établissements scolaires), level-up, genese, coop-12 | juriste, chef d'établissement |
| Handicap et accessibilité | Accessibilité PMR des lieux ; **données de santé** (catégorie particulière du RGPD) : CO-OP 12 est conçu pour ne pas en collecter, ce qui reste à confirmer | coop-12, carre-fest | délégué à la protection des données, associations spécialisées |
| Données | Profils persistants, évaluations de joueurs, votes : base légale, minimisation, conservation | level-up, genese, coop-12 | DPO |
| Bruit | Bruits de voisinage la nuit, sons amplifiés (applicabilité au casque à vérifier) | silent, carre-fest, hors-bureau | mairie, ARS, juriste |
| Droit social | Accident d'un salarié pendant une activité inter-entreprises | hors-bureau | avocat en droit social |
| Responsabilité | Dommage causé ensuite par un objet réparé | repar-arene | assureur, avocat |
| Propriété intellectuelle | Noms (INPI, EUIPO), musique (Sacem), droits d'usage public des jeux vidéo | tous ; coop-12 en priorité | conseil en propriété industrielle |

---

## 6. Sources (60 URL dans les concepts actifs, plus 5 dans le concept archivé)

Fiabilité : A officielle ou primaire · B presse ou étude · C secondaire · D déclaratif. Toutes ont été obtenues via l'outil de recherche le 2026-11-24, sans ouverture directe de la page.

| Fiab. | Titre — éditeur | URL | Concepts |
|---|---|---|---|
| A | Guide Open Plus Access 3x3 2025-26 — FFBB | <https://www.3x3ffbb.com/uploads/2026-01-07-7-3X3-DEVT-Guide-Open-Plus-Access-25-26-VF-695f71ca6ed7f.pdf> | la-grille |
| A | FIBA 3x3 World Cup 2018 — Competition format | <https://www.fiba.basketball/3x3worldcup/2018/competition-format> | la-grille |
| A | 2014 FIBA 3x3 World Championships — system of competition | <https://www.fiba.basketball/en/news/2014-3x3wc-system-of-competition> | la-grille |
| A | FIBA 3x3 Challengers 2018 — Competition format | <https://www.fiba.basketball/3x3challengers/2018/competition-format> | la-grille |
| C | Americano — padel.fyi | <https://www.padel.fyi/articles/americano/> | padel |
| C | Mexicano format — Skedge | <https://skedge-web.web.app/resources/mexicano-format> | padel |
| C | Padel tournament formats — Padelbrowser | <https://www.padelbrowser.com/blog/padel-tournament-formats-americano-king-of-the-court> | padel |
| A | Règlement tournoi progressif — Fédération luxembourgeoise de tennis | <https://padel.flt.lu/media/69bd203fc1038_reglement-officiel-tournoi-progressif.pdf> | padel |
| B | One Point Challenge Tour — Sortiraparis | <https://www.sortiraparis.com/en/what-to-do-in-paris/sport-wellness/articles/349160-one-point-challenge-tour-a-padel-tournament-and-festival-in-a-knockout-format-on-ile-de-puteaux> | padel |
| D | Changelog live results — WeCourts | <https://wecourts.featurebase.app/en/changelog/live-results> | padel |
| D | Sporting Events — Quiet Events | <https://www.quietevents.com/collections/sporting-events> | silent |
| D | Noise ordinances — Quiet Events | <https://www.quietevents.com/collections/noise-ordinances-silent-disco-events> | silent |
| D | US Open Fan Week Silent Disco — Quiet Events | <https://www.quietevents.com/blogs/quiet-events-blog/us-open-fan-week-introduces-their-first-silent-disco-party> | silent |
| A | Referee communications — World Rugby | <https://www.world.rugby/the-game/game-systems/match-technology/referee-communications> | silent |
| B | Referee link available for fans — ESPN | <https://www.espn.com.au/rugby/story/_/id/15347938/referee-link-available-fans> | silent |
| C | Silent Super Bowl — Bungalower | <https://bungalower.com/2023/02/08/silent-super-bowl-tip-toes-into-ace-cafe-this-weekend/> | silent |
| B | Paralympics fans learn when to be silent — ABC News (AP) | <https://abcnews.go.com/Sports/wireStory/paralympics-fans-learn-silent-make-noise-sports-visually-113321910> | silent |
| A | Finale Eloquentia — Ville de Paris | <https://www.paris.fr/evenements/finale-eloquentia-le-plus-grand-concours-de-prise-de-parole-108059> | la-joute |
| C | La joute des Associations — Le Petit Juriste | <https://www.lepetitjuriste.fr/la-joute-des-associations-par-les-titans-de-leloquence/> | la-joute |
| C | Demi-finale concours Paris 1 — Thotis Media | <https://thotismedia.com/demi-finale-concours-paris1-sorbonne/> | la-joute |
| C | « Eloquence ring » / Boxe avec les Maux — LexisNexis (non lu) | <https://www.lexisnexis.com/blogs/fr-juridique/b/actualite/posts/ibrahim-konate-eloquence-ring> | la-joute |
| A | Coupe de Débat du Grand Paris — Université Paris 8 | <https://www.univ-paris8.fr/La-Coupe-de-Debat-du-Grand-Paris> | la-joute |
| C | Associations d'éloquence — Le Monde des Grandes Écoles | <https://www.mondedesgrandesecoles.fr/associations-deloquence-elles-ont-les-moyens-de-vous-faire-parler/> | la-joute |
| A | Défi inter-entreprises — Grand Poitiers | <https://grandpoitiers.fr/information-transversale/actualites/defi-inter-entreprises-bravo-aux-entreprises-participantes-40083/pdf> | hors-bureau |
| B | 28e Défi inter-entreprises Beauvais — La Gazette France | <https://www.lagazettefrance.fr/article/beauvais-accueillera-le-1er-octobre-la-28e-edition-du-defi-inter-entreprises> | hors-bureau |
| C | League of Défense — Defense-92 | <https://www.defense-92.fr/animation/league-of-defense-le-challenge-completement-barre-pour-souder-les-salaries-de-la-defense-81296> | hors-bureau |
| A | Faites vos jeux en entreprise — MEDEF | <https://www.medef.com/actualites-download/faites-vos-jeux-en-entreprise-1> | hors-bureau |
| A | Olympiades, calcul des points — Inovallée | <https://www.inovallee.com/wp-content/uploads/2026/07/CALCUL-DES-POINTS.pdf> | hors-bureau |
| A | Règlement Corporate Challenge 2026 — EPISOD | <https://corporatechallenge.episod.com/sites/default/files/pdf/reglement_corporate_challenge_mars_2026.pdf> | hors-bureau |
| A | Pit Stop Game — Red Bull Ring | <https://www.redbullring.com/en/business/incentives-teambuilding/non-vehicle-incentives/pit-stop-game/> | hors-bureau (remplacement) |
| A | Pitstop Challenge — Eventurous | <https://www.eventurous.co.uk/outdoor-team-building/pitstop-challenge/> | hors-bureau (remplacement) |
| A | Team building — Daytona | <https://daytona.co.uk/team-building> | hors-bureau (remplacement) |
| A | Pit Stop Challenge — Chillisauce | <https://chillisauce.com/events/do-team-challenges/go-5e3d2dfd06038327d8914f78> | hors-bureau (remplacement) |
| A | District: The Running Game — App Store | <https://apps.apple.com/us/app/id1488277931> | level-up |
| C | District Race — Trend Hunter | <https://www.trendhunter.com/trends/district-race> | level-up |
| D | Seeker XP | <https://seeker.io/xp> | level-up |
| C | Parkrun — Wikipédia | <https://en.wikipedia.com/wiki/Parkrun> | level-up |
| C | Level Up WCR Challenge — Findarace | <https://findarace.com/us/events/level-up-wcr-10th-anniversary-virtual-challenge> | level-up (homonymie) |
| A | Level Up with the Majors — Global Run Club | <https://grc.worldmarathonmajors.com/events/level-up-with-the-majors-challenge> | level-up (homonymie) |
| C | PAC-MAN Level Up 2022 — BibRave | <https://www.bibrave.com/races/pac-man-virtual-challenge-level-up-2022-reviews/15978> | level-up (homonymie) |
| B | Speedgate — CBC Radio | <https://www.cbc.ca/radio/spark/spark-438-1.5122430/introducing-speedgate-the-world-s-first-ai-designed-sport-1.5122435> | genese |
| B | Speedgate — Engadget | <https://www.engadget.com/2019/04/15/ai-sport-speedgate/> | genese |
| D | OneGoal.Football — communiqué ResponseSource | <https://pressreleases.responsesource.com/newsroom/OneGoalFootball/release/94561> | genese |
| C | Fan Controlled Football — Wikipédia | <https://en.wikipedia.org/wiki/Fan_Controlled_Football> | genese |
| B | Fans pick the plays — Smithsonian | <https://www.smithsonianmag.com/innovation/interactive-football-league-fans-pick-plays-180973154/> | genese |
| A | Qontrol Ball — Universiteit Utrecht | <https://www.uu.nl/en/news/researchers-and-students-design-entirely-new-sport> | genese |
| C | Submit your new sport — Topend Sports | <https://www.topendsports.com/sport/new/submit.htm> | genese |
| A | Inspire Leagues — British Wheelchair Basketball | <https://britishwheelchairbasketball.co.uk/be-involved/motability-scheme-inspire-leagues/> | coop-12 |
| A | Plafond 15 points — Basketball Victoria | <https://api.basketballvictoria.com.au/api/assets/3l4q54zl8n6swok0> | coop-12 |
| B | Évaluation Mixed Ability Sport — White Rose eprints | <https://eprints.whiterose.ac.uk/id/eprint/201400/7/%E2%80%98Just%20Another%20Outing%20in%20a%20Boat%E2%80%99%20Findings%20from%20the%20Evaluation%20of%20the%20Mixed%20Ability%20Sport%20Development%20Programme.pdf> | coop-12 |
| A | Compétition et classification — Mon Parcours Handicap | <https://www.monparcourshandicap.gouv.fr/sport/competition-et-classification-de-quoi-parle-t> | coop-12 |
| A | Micro-Folies — DRAC PACA | <https://www.culture.gouv.fr/regions/Drac-Provence-Alpes-Cote-d-Azur/politique-et-actions-culturelles/micro-folies> | carre-fest |
| A | Charte d'adhésion Micro-Folies — ministère de la Culture | <https://www.culture.gouv.fr/Media/Medias-creation-rapide/Charte-d-adhesion-au-reseau-Micro-Folies> | carre-fest |
| A | Event in a Box — Downtown Arlington | <https://downtownarlington.org/do-business/the-creator-club/event-in-a-box> | carre-fest |
| A | Neighbourhood Event Equipment — City of Surrey | <https://surrey.ca/community/17127.aspx> | carre-fest |
| C | Festival kit (Lantern Company) — Trend Hunter | <https://www.trendhunter.com/trends/festival-kit1> | carre-fest |
| A | Catalogue matériel mutualisé — Fontenay-Trésigny | <https://fontenay-tresigny.fr/wp-content/uploads/2026/04/Catalogue-Materiel-Mutualise-2026.pdf> | carre-fest |
| A | Scènes d'été en Gironde 2026 | <https://www.gironde.fr/sites/default/files/2025-12/A5-BrochurePrez-2026-25112025-WEB.pdf> | carre-fest |
| A | Guide des rassemblements festifs 2021 — ministère de la Culture (non lu) | <https://www.culture.gouv.fr/Media/Medias-creation-rapide/Guide_Rassemblements_Festifs_2021.pdf> | carre-fest |
| B | Organiser un festival — MAIF | <https://www.maif.fr/associationsetcollectivites/associations/guides-manifestations/organiser-festival> | carre-fest |
| A | Men's Draft Basketball, Season 47 — Come Play Detroit | <https://comeplaydetroit.leaguelab.com/league/99463/details> | draft-night (archivé) |
| B | Kings League France, 80 joueurs draftés — Soccerway | <https://fr.soccerway.com/actualites/80-joueurs-draftes-des-stars-du-football-des-influenceurs-la-kings-league-est-lancee-en-france/p04ZPYJ8> | draft-night (archivé) |
| C | Kings League Draft — Spieltimes | <https://www.spieltimes.io/news/kings-league-draft-how-does-it-work-where-to-watch-live> | draft-night (archivé) |
| B | Young Star Game 2026 — Sortiraparis | <https://www.sortiraparis.com/en/what-to-do-in-paris/sport-wellness/articles/335199-young-star-game-meilleurs-espoirs-basket-francais-levallois> | draft-night (archivé) |
| A | Adult Basketball Player Registration — Minneapolis Parks | <https://teamsideline.com/sites/minneapolisparks/program/116032/Adult-Basketball-Player-Registration-Fall-2026> | draft-night (archivé) |

---

## 7. Points non vérifiés (à traiter avant tout passage en `review`)

1. **Originalité** de `repar-arene` et `coop-12`, et vérification complète de `hors-bureau` : non recherchées sur le web, budget épuisé.
2. **Antériorité « eloquence ring »** pour `la-joute` : page LexisNexis non lisible.
3. **Noms** non vérifiés : GENÈSE, CARRÉ FEST, RÉPAR'ARÈNE, CO-OP 12, HORS-BUREAU. Aucune vérification INPI/EUIPO n'a été faite pour aucun nom.
4. **Tous les prix** (12 k€, 20 k€, 6,5 k€, 7 k€, 1 200 €/équipe, 35 €, 10 €…) et **tous les coûts** : hypothèses ou estimations sans devis.
5. **Toutes les références juridiques** (articles du Code du sport, du Code de la santé publique, de la sécurité intérieure, RGPD, décret de 2017 sur les sons amplifiés) : citées de mémoire, à vérifier sur Légifrance. Aucune source officielle n'a été ouverte.
6. **Contenu exact des sources** : connu par les résumés de l'outil de recherche ; à relire avant citation externe. C'est vrai en particulier du montant de 40 000 € attribué au dispositif Micro-Folie et du règlement en vigueur du basket fauteuil en France.
7. **Hypothèse centrale de LA GRILLE 3x3** (le temps de parcours est corrélé au niveau de jeu) : non démontrée.
8. **Existant interne BASK'EST LAB** : seuls les titres et leur courte description ont été pris en compte ; les recoupements réels sont à confirmer avec le porteur.

## Fichiers

- `concepts/*.json` : 10 concepts actifs (validés, champs `computed` calculés)
- `remplaces/draft-night.json` : concept retiré, statut `archived`
- `score.py` : notation, portes, contrôle financier, validation de schéma
- `scores-summary.json`, `scores-table.md` : sorties du calcul
