<!--
Partie G1 de l'EVENT BLUEPRINT LA GRILLE 3x3 — sections 1 à 12, 14 à 19, 22, 30, 31, 36, 38.
Rédaction : EVENT LAB, 24/11/2026. Chiffres de budget, résultats, seuils et trésorerie : uniquement via les marqueurs de résumé (summary) et les tableaux générés du moteur.
Conventions de statut : « Fait vérifié » (source A ou deux sources B concordantes), « Probable » (une seule source ou source secondaire), « À revérifier » (règle confirmée, texte consolidé non relu), « Estimation » (base de calcul donnée), « Hypothèse » (H-nn = hypotheses[] d'event.json ; G1-x = hypothèse propre à cette partie).
Limite de cette version : aucune page web n'a pu être ouverte par G1 (recherche web épuisée, hôtes hors liste autorisée). Les faits sourcés proviennent d'une recherche documentaire du porteur datée du 24/11/2026, fondée sur des recoupements d'extraits de moteurs de recherche ; chaque source garde son statut d'origine dans G1-sources.json.
-->

## 1. Page de couverture

**EVENT BLUEPRINT — LA GRILLE 3x3**

*Les qualifs décident de ta place. Le terrain décide du reste.*

Tournoi de basket 3x3 amateur d'une journée : qualifications chronométrées le matin, grille de départ révélée à midi, poules et finales l'après-midi.

| | |
|---|---|
| Version | {{config.version}} |
| Date | 24 novembre 2026 |
| Statut | **Brouillon — non validé** |
| Maturité | Blueprint — évaluation prévisionnelle (sur hypothèses) |
| Structure porteuse | Association loi 1901 locale (à désigner). Format, outils et coordination : studio EVENT LAB |
| Ville et lieu | Ville moyenne française, gymnase municipal archétype de 44 × 24 m [HYPOTHÈSE H-01]. Ville pilote candidate : Nancy (section 38) |
| Date de J | À définir |
| Confidentialité | Interne |
| Verdict EVENT LAB | **{{summary.verdictLabel}}** — {{summary.score}}/100, grade {{summary.grade}}, indice de confiance {{summary.confidence}} |

> **SOUS RÉSERVE.** Des points réglementaires obligatoires restent à vérifier (section 2.5). Le score n'autorise pas à lui seul l'engagement de dépenses.

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

> **Dispositifs de sécurité et de secours non validés.** Aucun effectif de secouristes ni d'agents de sécurité n'est calculé par EVENT LAB : leur dimensionnement appartient à une association agréée de sécurité civile et à l'exploitant du lieu.

> **Sources.** Les données de marché de cette version proviennent de recoupements d'extraits de moteurs de recherche datés du 24/11/2026 ; aucune page n'a été relue intégralement. Le statut de chaque source figure en section 39 (fichier G1-sources.json).

---

## 2. Résumé exécutif

### 2.1 Le concept

LA GRILLE 3x3 transforme le matin d'un tournoi amateur, habituellement creux, en compétition à part entière. Chaque équipe joue sa place lors de qualifications chronométrées sur un parcours technique, en trois manches éliminatoires (Q1, Q2, Q3). La grille de départ obtenue est révélée sur écran à 11:35 et fixe, par placement serpentin, les têtes de série des poules de l'après-midi, puis les phases finales désignent les vainqueurs Open et Féminines.

### 2.2 Pour qui

- **Joueuses et joueurs 3x3 amateurs de 16 ans et plus** : 16 équipes Open et 8 équipes Féminines, 3 joueurs + 1 remplaçant, inscription à 60 € par équipe.
- **Familles, amis, public basket local** : entrée à 5 € la journée, gratuite pour les moins de 12 ans.
- **Commerces et entreprises locales** : quatre niveaux de partenariat (section 31).
- **Association organisatrice et collectivité** : un rendez-vous récurrent, documenté, transmissible à une autre équipe.

### 2.3 Pourquoi maintenant

- **Visibilité du 3x3.** Discipline olympique depuis Tokyo 2020 [S-G1-01]. À Paris 2024, le site 3x3 du parc urbain de la Concorde a enregistré un record de décibels lors des finales [S-G1-07] (fait vérifié). Les Jeux de Los Angeles 2028 prévoient une arène dédiée [S-G1-08].
- **Résultats français.** L'équipe de France a remporté la finale de la FIBA 3x3 Women's Series 2026 [S-G1-03] (fait vérifié), ce qui donne un argument concret à la catégorie Féminines.
- **Un créneau en salle.** Le circuit fédéral 3x3 se concentre de mai à juillet en extérieur [S-G1-12] (probable) ; en 2026, l'Open Plus de Nancy a été annulé (motifs rapportés : chaleur et réglementation locale) [S-G1-14] et le Quai 54 a dû se replier en salle [S-G1-24]. Un format conçu pour le gymnase peut se tenir hors saison estivale.

### 2.4 Chiffres clés (simulation v{{config.version}}, configuration standard sauf mention)

| Indicateur | Valeur | Section |
|---|---|---|
| Résultat prudent / central / ambitieux | {{summary.results.prudent}} € / {{summary.results.central}} € / {{summary.results.ambitieux}} € | 29 |
| Recettes et dépenses, scénario central | {{summary.revenueCentral}} € / {{summary.expensesCentral}} € | 28–29 |
| Seuil de rentabilité, scénario central | {{summary.breakevenCentral}} spectateurs uniques | 29 |
| Besoin de trésorerie, scénario central | {{summary.cashNeedCentral}} €, point bas au jour relatif {{summary.cashNeedDay}} (0 = jour J) | 29 |
| Configuration économique : dépenses centrales | {{summary.variants.economique.expensesCentral}} € | 28 |
| Configuration économique : résultat central / prudent | {{summary.variants.economique.results.central}} € / {{summary.variants.economique.results.prudent}} € | 29 |
| Configuration premium : résultat central | {{summary.variants.premium.results.central}} € | 29 |
| Équipe de J | {{summary.volunteers}} bénévoles et {{summary.professionals}} professionnels prévus (secours dimensionnés à part) | 24 |

<!-- @gen:variants -->

### 2.5 Verdict EVENT LAB

**Évaluation prévisionnelle (sur hypothèses)** : **{{summary.score}}/100, grade {{summary.grade}}**, indice de confiance **{{summary.confidence}}** (toutes les notes reposent sur le jugement d'expert ; aucune donnée réelle). Verdict : **{{summary.verdictLabel}}**.

<!-- @gen:gates -->

Actions requises pour lever la réserve « conformité » : convention de mise à disposition du lieu (C-01, J-90) ; effectif autorisé et classement ERP confirmés par écrit, déclaration de la manifestation, exigences médicales arrêtées (C-02, C-04, C-08, J-60) ; assurance, dispositif de secours, buvette, droit à l'image, accessibilité (C-03, C-05, C-07, C-10, C-12, J-30). Le détail figure en sections 26 et 32.

### 2.6 Recommandation EVENT LAB

**Lancer la 1re édition en configuration économique. Ne pas engager la configuration standard sur la base actuelle.**

1. **Pourquoi pas la standard d'emblée.** Dans la simulation v{{config.version}}, la configuration standard est déficitaire au scénario central ({{summary.results.central}} €) et fortement déficitaire au prudent ({{summary.results.prudent}} €). Son seuil de rentabilité ({{summary.breakevenCentral}} spectateurs uniques) est à comparer à la fréquentation centrale supposée de 450 spectateurs [HYPOTHÈSE H-04]. Aucune recette n'est sécurisée à ce stade [HYPOTHÈSE H-07].
2. **Pourquoi l'économique.** C'est la seule configuration excédentaire au scénario central ({{summary.variants.economique.results.central}} €). Sa perte au scénario prudent ({{summary.variants.economique.results.prudent}} €) n'est **pas** acceptable en l'état : elle doit être effacée par des recettes signées avant J-60 (point 3). Elle garde tout ce qui fait le format (qualifications, grille, révélation, poules serpentin, catégorie Féminines) et ne réduit que des postes de confort : sonorisation et vidéoprojection allégées, signalétique et dotations réduites, animation bénévole au lieu d'un speaker professionnel, pas de prestation du studio, de vidéaste, de textiles staff ni de communication payante.
3. **Condition de confirmation de l'économique (go/no-go de J-60).** Le scénario prudent de l'économique étant négatif, la règle de J-60 (« report si même l'économique n'est pas couverte au scénario prudent ») impose qu'à J-60, **une fois les recettes signées ou notifiées reclassées en « sécurisées » et la simulation relancée, le scénario prudent de l'économique soit au moins à l'équilibre**. Leviers : subvention municipale notifiée, partenaires locaux signés, fonds propres affectés. À défaut : report de l'édition.
4. **Passer en standard** (à J-60 pour l'édition 1, ou pour l'édition 2) si, et seulement si : (a) le partenaire titre (4 000 €) est signé avec acompte ; (b) recettes sécurisées + probables ≥ dépenses standard du scénario central ({{summary.expensesCentral}} €), critère du jalon J-60 ; (c) l'effectif autorisé est confirmé par écrit (C-02) ; (d) le besoin de trésorerie ({{summary.cashNeedCentral}} €) est couvert par un financement nommé (avance de l'association, fonds propres ou subvention versée avant J).
5. **Passer en premium** seulement après deux éditions standard mesurées et excédentaires (KPI K03 et K08 atteints), et à condition que **chaque poste premium (mur LED, éclairage scénique, captation, espace invités) soit financé par un contrat signé dédié avant engagement**. Dans la simulation actuelle, le premium est déficitaire au central ({{summary.variants.premium.results.central}} €) et reste négatif même au scénario ambitieux (tableau des variantes ci-dessus).

### 2.7 Risques les plus critiques

| Risque | Probabilité × impact | Responsable | Réponse |
|---|---|---|---|
| R-08 — Sponsoring et subventions inférieurs aux prévisions | 4 × 4 = 16 | Directeur de l'événement | Go/no-go J-60 et J-30, bascule économique, report (section 34) |
| R-01 — Afflux en fin de journée au-delà de l'effectif autorisé | 3 × 5 = 15 | Directeur de l'événement | Comptage continu, fermeture des entrées à 95 %, retransmission dans le hall |
| R-02, R-04, R-13 — Blessure d'un joueur ; retard cumulé ; bénévoles insuffisants | 12 chacun | Resp. compétition / Resp. bénévoles | Secours sur place ; show de mi-parcours compressible ; recrutement à +20 % |

### 2.8 Hypothèses structurantes

1. **H-01 — Lieu.** Gymnase de 44 × 24 m avec deux paniers latéraux utilisables et effectif autorisé supposé de 600 personnes. *Si faux* : implantation et jauge à refaire. *Vérification* : relevé sur place et document de l'exploitant avant J-90.
2. **H-04 — Fréquentation.** 250 / 450 / 700 spectateurs uniques, 70 % payants. *Si faux* : la configuration standard s'éloigne de l'équilibre. *Vérification* : préventes à J-30, enquête d'intention auprès des clubs à J-100.
3. **H-07 — Aucune recette sécurisée.** Partenaires et subventions sont probables ou hypothétiques. *Si faux* (bonne nouvelle) : passage en standard possible à J-60. *Vérification* : conventions signées.

Point d'attention : H-02 (association non assujettie à la TVA) doit être confirmée par l'expert-comptable, car des recettes de parrainage sont de nature commerciale et peuvent changer ce régime (section 31.9).

### 2.9 Décisions attendues

| Décision | Décideur (rôle) | Échéance | Sans décision |
|---|---|---|---|
| Lancer le projet en configuration économique ; désigner les responsables | Bureau de l'association | J-120 | Pas de demande de créneau au gymnase |
| Faire réaliser la recherche d'antériorité du nom et décider du dépôt | Studio EVENT LAB | Avant toute publication (J-110) | Communication publique interdite (section 3.6) |
| Choisir le cadre : tournoi homologué FFBB ou tournoi non officiel | Bureau + comité départemental de basket | J-90 | Conditions médicales, assurance et règlement non arrêtés |
| Désigner le financement du besoin de trésorerie | Trésorier | J-60 | Pas de go possible |
| Go/no-go n°1 (configuration) puis n°2 (dépenses optionnelles) | Bureau de l'association | J-60, J-30 | Report de l'édition |

---

## 3. Nom et identité du concept

### 3.1 Fiche d'identité

| Élément | Contenu |
|---|---|
| Nom | **LA GRILLE 3x3** (forme courte en contexte : LA GRILLE) |
| Signature | *Les qualifs décident de ta place. Le terrain décide du reste.* |
| Pitch (≤ 60 mots) | LA GRILLE 3x3 est un tournoi de basket 3x3 amateur d'une journée. Le matin, chaque équipe joue sa place sur une grille de départ lors de qualifications chronométrées en trois manches éliminatoires. À midi, la grille est révélée sur écran et fixe les poules de l'après-midi. Le suspense commence à 10 h, pas à 13 h. |
| Discipline | Basketball 3x3 |
| Secteurs | Sport amateur, sport urbain |
| Directions créatives | Accessible ; optimisée par rapport à l'existant |
| Objectifs | Rendez-vous 3x3 récurrent et identifiable dans une ville moyenne ; supprimer le temps mort du matin ; équilibre financier dès la 2e édition et format licenciable à d'autres associations |

### 3.2 Signification du nom

Le nom joue sur deux lectures. **La grille de départ** : le classement des qualifications fixe la place de chaque équipe, comme une grille avant une course. **La grille 3 × 3** : neuf cases, trois colonnes de trois, qui rappellent la discipline et donnent la forme du logo (section 16). Le nom doit évoquer le mérite, l'ordre et le suspense ; il ne doit évoquer ni le sport automobile en tant que marque, ni l'enfermement (sens premier de « grille »), ni un jeu d'argent.

### 3.3 Ton

- **Direct et sportif** : phrases courtes, verbes d'action, chiffres réels (temps, places).
- **Tutoiement** pour les joueurs et le public jeune (« ta place ») ; **vouvoiement** pour les collectivités, partenaires et familles dans les documents officiels.
- **Vocabulaire maison** : grille, pole, manche, run, temps retenu, pit wall, placement serpentin. Chaque terme est expliqué une fois par support.
- **Interdits** : superlatifs non sourcés (« le plus grand », « unique »), promesses de visibilité chiffrées non mesurées, humour sur les blessures ou les défaites.

### 3.4 Ce que le concept n'est pas

| LA GRILLE 3x3 n'est pas… | Parce que… |
|---|---|
| Un événement de sport automobile | Seule la logique des qualifications est empruntée ; aucun véhicule, aucune marque ni identité du secteur |
| Un concours d'habileté isolé | Le parcours chronométré a un enjeu sportif : il fixe les poules et les têtes de série |
| Un tournoi professionnel ou une compétition officielle | Sans homologation fédérale, il ne peut se prévaloir d'un caractère officiel ni des marques fédérales [S-G1-09] (à revérifier) |
| Un jeu d'argent | Aucune mise, aucun pari ; la prédiction de la pole est gratuite et ouverte sans achat (section 12) |
| Un show qui raccourcit le jeu | Chaque équipe joue au moins 3 matchs ; les animations occupent les transitions, jamais le temps de jeu |
| Un événement réservé aux licenciés | L'Open accueille licenciés et non-licenciés de 16 ans et plus, sous réserve des conditions médicales retenues (C-08) |

### 3.5 Usages du nom

| Usage | Autorisé | Interdit |
|---|---|---|
| Édition locale | « LA GRILLE 3x3 — Nancy », « LA GRILLE 3x3 — [Ville] 2027 » | Renommer le format (« La Grille de [Club] ») |
| Partenaire titre | « LA GRILLE 3x3 présentée par [Partenaire] » | Fusion du nom du partenaire dans le nom (« La Grille [Marque] ») |
| Classement | « Grille Series » | « Championnat », « Champion de France » ou tout titre réservé aux fédérations délégataires [S-G1-09] (à revérifier) |
| Abréviation | LA GRILLE (en contexte), #LaGrille3x3 (à vérifier) | « LG3 », sigles non validés |
| Traduction | Nom invariable ; signature traduisible | Traduire le nom |
| Partenaires exclus | — | Boissons alcoolisées (enceinte sportive, cadre légal de la publicité à vérifier), opérateurs de paris ou de jeux d'argent (public dès 16 ans) |

### 3.6 Recherche d'antériorité

**Statut : non réalisée.** La recherche web était indisponible lors de la rédaction (quota épuisé, hôtes hors liste autorisée). **Conséquence : diffusion publique du nom et licence interdites tant que la recherche n'est pas faite et consignée** (règle du modèle documentaire, section 03).

| Base à consulter | Requêtes | Date | Résultat |
|---|---|---|---|
| INPI, base des marques [S-G1-57] (non consultée) | « LA GRILLE », « LA GRILLE 3x3 », « GRILLE SERIES », « GRILLE » + classes de services sportifs | à faire | — |
| EUIPO / TMview [S-G1-58] (non consultée) | mêmes requêtes, marques de l'Union et nationales | à faire | — |
| Noms de domaine | lagrille3x3.fr, lagrille3x3.com, grilleseries.fr | à faire | — |
| Réseaux sociaux | @lagrille3x3, #LaGrille3x3, #GrilleSeries | à faire | — |
| Moteurs de recherche | « La Grille 3x3 », « La Grille » + basket, + tournoi, + 3x3 | à faire | — |

**Analyse qualitative (hypothèse G1-a, à faire valider par un conseil en propriété industrielle)** : « grille » est un mot courant (grille de départ, de programmes, tarifaire) et « 3x3 » désigne la discipline ; pris isolément, ils sont peu distinctifs. La distinctivité repose sur l'ensemble nom + marque graphique, d'où la **recommandation d'un dépôt semi-figuratif** (mot-symbole et logo). Le risque d'homonymie régionale est réel : un « All Star Game Grand-Est » sans lien avec l'organisateur actuel aurait existé à Metz vers 2019 (probable, source unique relevée par le porteur), ce qui montre que les noms d'événements locaux ne sont pas exclusifs.

**Recommandation** : dépôt à l'INPI avant la première publication, dans les classes de Nice couvrant l'organisation de compétitions sportives et les vêtements (à confirmer par le conseil) ; extension auprès de l'EUIPO seulement si une licence hors de France est décidée (section 38). Réserver en même temps les noms de domaine et les comptes. Coût à chiffrer par devis ; il relève du studio, pas du budget de l'événement.

---

## 4. Origine de l'idée

### 4.1 Problème observé

| Constat | Statut et preuve |
|---|---|
| Dans beaucoup de tournois amateurs, le matin sert à jouer des poules tirées au sort ou dans l'ordre d'inscription : peu d'enjeu, peu de public, des poules parfois déséquilibrées | **Hypothèse G1-b** (observation de terrain non documentée). Vérification : questionnaire auprès de 10 organisateurs de tournois et des équipes inscrites (zone d'ignorance n°1, section 5.12) |
| Les transitions non scénarisées font décrocher le public, y compris au plus haut niveau | **Fait vérifié** : le format 2025 du All-Star Game NBA a été critiqué pour sa présentation hachée par les temps morts et segments [S-G1-64] |
| Les concours d'habileté individuels s'essoufflent quand l'attente entre deux essais s'allonge | **Fait vérifié** : la FIBA a remplacé en 2026 son concours de dunk individuel par un format par équipes (Dunk Mania) [S-G1-63] |
| Les tournois 3x3 d'été sont exposés au climat | **Fait vérifié** : annulation de l'Open Plus de Nancy 2026 [S-G1-14] ; repli en salle du Quai 54 2026 [S-G1-24] |

### 4.2 Transposition

La logique empruntée est celle des **qualifications par manches éliminatoires** du sport automobile : des séances successives figent progressivement les positions, la dernière séance réunit les plus rapides, et le résultat est publié sous forme de grille de départ (description générale ; règlements sportifs de référence : FIA [S-G1-35]). LA GRILLE en reprend le principe, pas les éléments : le « tour » devient un parcours technique de basket réalisé par équipe ; la grille ne fixe pas un ordre de départ mais **les têtes de série des poules**. Ce choix donne un enjeu au matin et rend le placement des poules lisible et mérité.

### 4.3 Parcours de l'idée dans EVENT LAB

| Étape | Contenu | Référence |
|---|---|---|
| Brief d'entrée | Format sportif amateur urbain, ville française moyenne, lieu existant, budget de 10 à 30 k€ (hypothèse H2 validée par le porteur) | Brief initial, en-tête |
| v0.1.0 | Concept initial du portefeuille de dix concepts | Historique (section 40) |
| v0.2.0 | Passage au stade blueprint : programme minute par minute, compétition paramétrée, ressources, budget, variantes, risques, conformité, KPIs | Historique (section 40) |
| v{{config.version}} (ce document) | Rédaction des sections narratives, identité visuelle, sources | Ce dossier |

| Direction créative (brief §7) | Retenue | Raison |
|---|---|---|
| Accessible et économique | Oui | Seule configuration excédentaire au central (section 2.6) |
| Optimisée par rapport à l'existant | Oui | Le format corrige un défaut identifié des tournois amateurs (le matin) |
| Premium | En option | Déficitaire dans la simulation ; conditionnée à des financements dédiés |
| Expérimentale et disruptive | Non | Les mécaniques aléatoires de type « cartes » s'usent vite et faussent l'équité sportive (section 7) |
| Hybride physique et digitale | Partiellement | Page de scores en direct ; diffusion vidéo réservée au premium |
| Communautaire et participative | Oui | Prédiction gratuite, concours public, Grille Series |

| Paramètre du brief | Valeur | Statut |
|---|---|---|
| Discipline | Basket 3x3 | Choix de conception |
| Localisation | Ville moyenne française ; pilote candidate : Nancy | Hypothèse H-01 ; section 38 |
| Infrastructure | Gymnase existant, deux terrains 3x3 côte à côte | Hypothèse H-01 |
| Participants | 24 équipes (16 Open, 8 Féminines) au central | event.json |
| Capacité | Effectif autorisé supposé de 600 personnes | Hypothèse H-01, à confirmer (C-02) |
| Durée | 10,5 h de J (hors montage J-1) | event.json |
| Niveau d'innovation et ambition médiatique | Non renseignés dans le brief | À fixer à la prochaine version |

---

## 5. Étude de marché

### 5.1 Statut et méthode

- **Méthode** : recherche documentaire du 24/11/2026 (sources fédérales, organisateurs, billetteries, presse), fondée sur des recoupements d'extraits de moteurs de recherche ; aucune page n'a été relue intégralement. Chaque donnée garde son statut d'origine (G1-sources.json).
- **Règle de prudence** : aucun chiffre de cette section ne fonde la jauge ni le budget. Jauge et budget reposent sur les hypothèses H-01 à H-08 d'event.json ; les données ci-dessous servent à les éprouver.
- **Absent** : données nationales de pratique du basket et du 3x3 (baromètre des pratiques sportives, licences par discipline) — non relevées ; à extraire des publications statistiques du ministère des Sports [S-G1-66].

### 5.2 Périmètre

Zone de chalandise retenue pour une édition : **l'agglomération de la ville hôte et les communes à 30 minutes de trajet** [HYPOTHÈSE G1-c]. Raisonnement : le public est d'abord l'entourage des 96 joueurs inscrits au scénario central (24 équipes de 4) et le public basket local ; les équipes acceptent un trajet plus long que les spectateurs. Pour la ville pilote candidate, le département compte 46 clubs de basket recensés par un annuaire [S-G1-44] (probable), ce qui donne un ordre de grandeur du vivier d'équipes et de spectateurs à confirmer avec le comité départemental.

### 5.3 Le 3x3 dans le monde : structuration et visibilité

| Donnée | Statut | Source |
|---|---|---|
| Le 3x3 est une discipline olympique depuis Tokyo 2020 ; règles FIBA 2026 en vigueur depuis le 1er janvier 2026 (modifications portant notamment sur le check-ball) | Fait vérifié, partiellement (texte complet non relu) | [S-G1-01, S-G1-02] |
| Règles de base : demi-terrain, un panier, 3 joueurs + 1 remplaçant, 1 point dans l'arc et 2 points derrière, 10 minutes ou 21 points, horloge des tirs de 12 secondes | Fait vérifié, partiellement | [S-G1-01] |
| Circuits professionnels FIBA : World Tour (équipes de villes, masculin), Women's Series (féminin), Challengers, Coupe du monde | Fait vérifié | [S-G1-04, S-G1-05] |
| Women's Series 2026 : saison record de 25 étapes ; finale remportée par la France | Fait vérifié | [S-G1-03, S-G1-04] |
| Une étape du World Tour s'est tenue à Marseille en 2026 | Fait vérifié | [S-G1-05] |
| Coupe du monde 3x3 2026 à Varsovie : plus de 100 000 visiteurs revendiqués par l'organisateur | Fait vérifié (chiffre déclaratif de l'organisateur) | [S-G1-06] |
| Paris 2024 : 3x3, breaking, BMX freestyle et skate regroupés au parc urbain de la Concorde, avec concerts, DJ et initiations ; record de décibels lors des finales 3x3 | Fait vérifié | [S-G1-61, S-G1-07] |
| Ligue professionnelle féminine de 3x3 (Unrivaled, Miami), saison 2 à 8 équipes en 2026 | Fait vérifié | [S-G1-29] |

### 5.4 Le 3x3 en France : structuration fédérale et calendrier

| Donnée | Statut | Source |
|---|---|---|
| La FFBB organise des tournois 3x3 homologués à plusieurs niveaux (Open Start, Open Plus Access, Open Plus, Superleague, Juniorleague) ; l'homologation passe par la plateforme 3x3 de la FFBB et l'enregistrement du tournoi au classement FIBA 3x3 | À revérifier (règle confirmée, texte non relu) | [S-G1-09, S-G1-10] |
| Les joueurs d'un Open homologué présentent une licence FFBB ou un « Pass Tournoi 3x3 » et un profil FIBA 3x3 validé | À revérifier | [S-G1-09] |
| Superleague Open : 18 Open Plus en 2025 (de mi-mai à mi-juillet), 15 étapes prévues en 2026, 16 annoncées pour 2027 | Probable | [S-G1-12, S-G1-13] |
| Un Open Plus ne peut pas être uniquement masculin ou uniquement féminin | Probable | [S-G1-11] |
| Nancy accueille un Open Plus 3x3 organisé par le comité départemental au parc de la Pépinière (édition 2023 dotée de 2 000 € ; édition 2025 du 27 au 29 juin) | Fait vérifié | [S-G1-15, S-G1-16] |
| L'Open Plus de Nancy 2026 a été annulé (motifs rapportés : chaleur et réglementation locale) | Fait vérifié (titre) ; motifs probables | [S-G1-14] |
| Un tournoi non homologué reste licite, mais ne peut se prévaloir d'un caractère officiel, du classement FIBA ou FFBB, ni des logos fédéraux | À revérifier | [S-G1-09] |

**Conséquence pour LA GRILLE.** Deux cadres possibles, à trancher à J-90 avec le comité départemental : (1) **tournoi non officiel**, libre de ses adaptations (qualifications chronométrées, matchs de poule raccourcis) ; (2) **tournoi homologué** (niveau Open Start par exemple), qui apporte le classement FIBA et une couverture liée au Pass (étendue de la couverture divergente selon les sources) mais dont la compatibilité avec les adaptations du format **n'est pas établie** [HYPOTHÈSE G1-d, à vérifier].

### 5.5 Offre existante et calendrier concurrent (exemple du Grand Est)

| Événement | Organisateur | Période | Public / format | Prix public | Statut | Source |
|---|---|---|---|---|---|---|
| Open Plus 3x3 de Nancy | Comité départemental 54 | Juin (annulé en 2026) | 3x3 homologué en extérieur | non relevé | Fait vérifié | [S-G1-15, S-G1-14] |
| All Star Game Grand Est | Bask'Est (association, Nancy) | 13 juin 2026 | Matchs féminin et masculin de joueurs régionaux, concours, DJ (programme probable) | non relevé | Fait vérifié (date, lieu) | [S-G1-39] |
| Bask'Cup | Bask'Est | Été (1re édition 2025, probable) | Journée ouverte aux plus de 16 ans | non relevé | Fait vérifié (âge) | [S-G1-40] |
| All Stars Game Alsace | Beyond The Bounce (association) | 20–21 juin 2026 (Gries) | Matchs seniors et jeunes, soirée DJ | 5 € à 15 €, VIP 50 € | Probable | [S-G1-19, S-G1-62] |
| NL Contest | Nouvelle Ligne (association, Strasbourg) | 22–24 mai 2026 | Contest avec tournoi de streetball | non relevé | Probable | [S-G1-20] |
| ASA 3x3 Contest | ASA Weyersheim | 13 juin 2026 | Contest 3x3 | non relevé | Probable | [S-G1-21] |

**Lecture.** L'offre régionale se concentre **de mi-mai à fin juin**, souvent en extérieur. LA GRILLE, conçue pour la salle, a intérêt à se placer **hors de ce créneau** (automne ou fin d'hiver), sous réserve de la disponibilité des gymnases [HYPOTHÈSE G1-e].

### 5.6 Publics et demande

| Segment | Ce qui est établi | Ce qui reste supposé |
|---|---|---|
| Joueurs 3x3 amateurs 16–35 ans | Un circuit fédéral actif chaque été [S-G1-12] (probable) ; des contests associatifs réguliers dans la région (tableau 5.5) | Nombre d'équipes mobilisables à 30 minutes ; disposition à jouer un format chronométré le matin |
| Joueuses | Dynamique visible du 3x3 féminin français [S-G1-03] ; un Open Plus doit accueillir les deux sexes [S-G1-11] (probable) | Capacité à remplir 8 équipes Féminines localement |
| Familles et public basket | Les événements de basket associatifs régionaux pratiquent des billets bas (tableau 5.7) | Taux de venue des proches : 250 / 450 / 700 spectateurs [HYPOTHÈSE H-04] |
| Partenaires locaux | Aucune donnée de marché relevée | Volonté de payer de 400 € à 4 000 € (event.json, hypothèse) |

### 5.7 Prix pratiqués

| Offre comparable | Prix | Inclus | Statut | Source |
|---|---|---|---|---|
| Open Plus FFBB : droit d'inscription recommandé | 120 € par équipe | Tournoi homologué, dotation | Probable | [S-G1-11] |
| Open Start / Open Plus Access : Pass Tournoi 3x3 | 5 € par joueur (en plus de l'inscription fixée par l'organisateur) | Participation hors licence | À revérifier | [S-G1-09] |
| All Star Game Basket Fauteuil (FFH) | Billet à 5 € | Journée 3x3 + soirée All-Star | Fait vérifié | [S-G1-17] |
| All Stars Game Alsace 2026 | 5 € (demi-journée), 9 € (journée), 15 € (2 jours), 50 € (VIP) ; gratuit moins de 5 ans | Boissons incluses selon la formule | Probable | [S-G1-19] |
| Finales 3x3 pro et tournois de quartier | Accès libre (finale SuperLeague Pro à Paris ; tournoi Playin' Paris en gymnase) | — | Fait vérifié (annonces) | [S-G1-60, S-G1-22] |
| **LA GRILLE 3x3** | **60 € par équipe (15 € par joueur) ; entrée 5 €, gratuite moins de 12 ans** | Journée complète, au moins 3 matchs par équipe | Hypothèse (event.json) | — |

**Lecture.** L'inscription à 60 € se situe sous le montant recommandé pour un Open Plus (120 €, probable), qui offre en contrepartie dotation et points FIBA. L'entrée à 5 € est au niveau bas des événements associatifs comparables, mais la concurrence d'événements gratuits existe : la valeur perçue doit venir du programme (qualifications, révélation, finales en salle).

### 5.8 Tendances (2025-2026)

| Tendance | Preuve | Effet sur LA GRILLE |
|---|---|---|
| La fin au score cible s'impose dans les formats courts | Elam Ending au TBT et en G League [S-G1-25, S-G1-65] ; prolongation au score cible au All-Star NBA 2026 [S-G1-33] | Le 3x3 l'intègre déjà (21 points ; 15 en poule). Prolongation « premier à 2 points » retenue (section 12) |
| Croissance et professionnalisation du basket féminin | Women's Series record, titre français [S-G1-03, S-G1-04] ; Unrivaled [S-G1-29] | Catégorie Féminines en finale de soirée, dotation identique à l'Open |
| Les créateurs de contenu amplifient, mais ne portent pas seuls un modèle | Plan social et suspension des ligues France et Allemagne de la Kings League en 2026 [S-G1-31] | Créateurs locaux invités comme relais, sans dépendance |
| Le climat devient une contrainte d'organisation | Annulations et replis en salle en 2026 [S-G1-14, S-G1-24] | Argument fort pour un format de gymnase |
| L'ambiance « festival urbain » autour du 3x3 | Parc urbain de Paris 2024 [S-G1-61] | Speaker, musique, révélation, mais à l'échelle d'un gymnase |

### 5.9 Partenaires et financeurs potentiels

| Organisation | Type | Intérêt supposé | Statut |
|---|---|---|---|
| Commune (service des sports) | Collectivité | Animation sportive jeunesse, mise à disposition du gymnase | Subvention municipale probable (R09, event.json) |
| Intercommunalité, département, région | Collectivités | Rayonnement, jeunesse, pratique féminine | Hypothétique ; dispositifs et calendriers à vérifier sur les sites officiels |
| Comité départemental et ligue régionale de basket | Fédération | Développement du 3x3, relais auprès des clubs, homologation éventuelle | À solliciter |
| Commerces, restaurants, enseignes de sport, banques et assurances locales | Entreprises | Visibilité auprès d'un public jeune local | Hypothétique (section 31) |
| Fondations d'entreprise à vocation sportive ou d'inclusion | Mécénat | Inclusion, jeunesse | Hypothétique ; éligibilité aux reçus fiscaux à sécuriser (section 31.9) |

### 5.10 Marché adressable d'une licence du format

Le marché d'une licence n'est pas documenté : il est **construit sur hypothèses explicites**, à remplacer par des données dès la 2e édition.

| Paramètre | Valeur retenue | Raisonnement |
|---|---|---|
| Structures porteuses crédibles par département | 2 à 4 | **Hypothèse G1-f.** Un département moyen compte plusieurs dizaines de clubs de basket (46 en Meurthe-et-Moselle, probable [S-G1-44]) ; seule une minorité dispose de bénévoles, d'un gymnase à deux paniers latéraux et d'un projet événementiel |
| Départements visés | Métropole hors Île-de-France dense, environ 90 | **Hypothèse G1-g** (le format vise les villes moyennes) |
| Marché adressable (structures) | 180 à 360 | 2 à 4 × 90 |
| Taux d'adoption à 5 ans | 3 % à 5 % | **Hypothèse G1-h** (format nouveau, sans notoriété) |
| Licenciés à 5 ans | 5 à 18 | 180 × 3 % ; 360 × 5 % |
| Redevance « kit » par édition | 450 € | **Hypothèse G1-i** (section 38.5) |
| Recette annuelle du studio (kit seul) | 2 250 € à 8 100 € | 5 à 18 éditions × 450 € |

**Lecture.** La licence seule ne fait pas vivre le studio : sa valeur est de constituer une propriété reconnaissable et un circuit (Grille Series), et de vendre des prestations d'accompagnement. La décision d'investir dans la licence se prend **après** deux éditions mesurées.

### 5.11 Conclusions

1. La demande de 3x3 existe et se structure (circuit fédéral, circuits FIBA, dynamique féminine), mais elle est **estivale et extérieure** : un format de salle a un créneau.
2. Les prix retenus (60 € par équipe, 5 € l'entrée) sont dans la fourchette basse des comparables relevés ; ils ne sont pas un frein, mais ils limitent les recettes de billetterie.
3. La question décisive n'est pas la demande des joueurs mais **la venue du public** et **la signature de partenaires** : ce sont les deux hypothèses qui font basculer le résultat (section 29, sensibilité).

### 5.12 Zones d'ignorance

| Question | Impact | Méthode | Responsable | Échéance |
|---|---|---|---|---|
| 1. Le matin des tournois amateurs est-il réellement perçu comme un temps mort ? | Fondement du concept | Questionnaire court à 10 organisateurs et 30 joueurs | Studio EVENT LAB | J-100 |
| 2. Combien d'équipes à 30 minutes acceptent 60 € pour ce format ? | Recettes R02, remplissage | Pré-inscription sans paiement ouverte à J-100 ; objectif 20 intentions | Responsable compétition | J-75 |
| 3. Quelle part de l'entourage des joueurs vient voir les finales ? | Hypothèse H-04 | Question dans le formulaire d'inscription ; préventes à J-30 | Responsable communication | J-30 |
| 4. Le cadre homologué est-il compatible avec les adaptations ? | Médical, assurance, règlement | Échange écrit avec le comité départemental | Bureau | J-90 |
| 5. Quels gymnases ont deux paniers latéraux utilisables côte à côte ? | Faisabilité de l'implantation | Relevé sur place | Responsable logistique | J-90 |
| 6. Données nationales de pratique du 3x3 | Taille de marché | Extraction des publications statistiques [S-G1-66] | Studio EVENT LAB | Version suivante |

---

## 6. Benchmark des événements existants

Quatorze références réelles, des circuits mondiaux aux tournois de quartier. Les descriptions reprennent uniquement les éléments sourcés ; les analyses (forces, faiblesses, enseignements) sont celles d'EVENT LAB.

| # | Référence | Organisateur, lieu | Format | Innovation | Forces | Faiblesses | LA GRILLE retient / évite | Sources (statut) |
|---|---|---|---|---|---|---|---|---|
| 1 | FIBA 3x3 World Tour | FIBA ; étapes urbaines (Marseille en 2026) | Circuit pro d'équipes de villes, matchs de 10 min enchaînés | Le 3x3 en centre-ville, DJ et speaker en continu | Rythme sans temps mort, lisibilité du score | Équipes peu connues hors du lieu | **Retient** : enchaînement, habillage sonore. **Évite** : dépendance à une infrastructure lourde [S-G1-05] (vérifié) |
| 2 | FIBA 3x3 Women's Series | FIBA ; 25 étapes en 2026 | Circuit pro féminin | Circuit féminin autonome | Saison record, titre français en 2026 | — | **Retient** : une catégorie Féminines à part entière, en finale de soirée [S-G1-03, S-G1-04] (vérifié) |
| 3 | Superleague Open / Open Plus | FFBB et comités ; dont Nancy (parc de la Pépinière) | Tournois homologués, classement FIBA, mi-mai à mi-juillet | Circuit national à étapes | Cadre fédéral, points FIBA, dotation | Exposition au climat (Nancy et Pau annulés en 2026) | **Retient** : compatibilité possible avec un cadre fédéral. **Évite** : le plein air en juin [S-G1-12, S-G1-14, S-G1-15] (probable / vérifié) |
| 4 | Quai 54 | Organisation Quai 54 ; Paris | Streetball sur invitation, 16 équipes masculines et 8 féminines annoncées en 2026 | Lieu iconique, culture urbaine, musique | Notoriété, plateau de joueurs pros | Format extérieur vulnérable : repli en salle en 2026 | **Retient** : la mise en scène et le tournoi féminin intégré. **Évite** : l'invitation (LA GRILLE est ouverte), le plein air [S-G1-23, S-G1-24] (vérifié) |
| 5 | Red Bull Half Court | Red Bull ; qualifications nationales puis finale mondiale (Manille 2026) | 3x3 (3 + 1), base FIBA, 10 min ou 21 points | Parcours « quartier → pays → monde » ; terrains au design soigné | Progression lisible, visuels forts | Information éclatée par pays | **Retient** : le terrain comme objet de design (grille au sol). **Évite** : un dispositif de marque mondiale [S-G1-27, S-G1-28] (vérifié) |
| 6 | The Basketball Tournament (TBT) | TBT ; États-Unis | 16 équipes en 2026, dotation au vainqueur | Elam Ending (fin de match au score cible) | Chaque match se termine sur un panier | Champ restreint en 2026, dotation en argent | **Retient** : la fin au score cible (déjà présente en 3x3). **Évite** : toute dotation en argent [S-G1-25] (vérifié) |
| 7 | BIG3 | BIG3 ; États-Unis | 3 contre 3 sur demi-terrain, anciens joueurs pros, équipes de « marché local » | Règles propres (zones à 4 points, premier à 50 points) | Retournements spectaculaires | Règles éloignées du 3x3 FIBA, modèle de franchises | **Retient** : une identité locale forte. **Évite** : modifier les règles du jeu ; les adaptations de LA GRILLE portent sur la durée, pas sur le basket [S-G1-26] (vérifié, partiel) |
| 8 | Unrivaled | Unrivaled ; Miami | Ligue pro féminine 3x3, 8 équipes en 2026 | Format court, 1 contre 1 vitrine | Saison 2 à 8 équipes | Modèle professionnel hors de portée d'une association (analyse EVENT LAB) | **Retient** : la mise en valeur des joueuses [S-G1-29] (vérifié) |
| 9 | Kings League | Kings League ; football à 7, Espagne puis autres pays | Matchs courts, règles « gamifiées » (cartes secrètes, phase de dé), présidents créateurs de contenu | Règles pensées pour le clip et le streaming | Compréhension immédiate, interactivité | Lassitude, coûts ; ligues France et Allemagne suspendues en 2026 | **Retient** : penser chaque séquence pour la vidéo verticale. **Évite** : le hasard dans le résultat sportif, la dépendance aux créateurs [S-G1-30, S-G1-31] (vérifié) |
| 10 | Baller League | Baller League ; football à 6 en salle (Royaume-Uni, États-Unis) | Effectifs larges, exclusions temporaires, matchs courts | Format télévisuel en salle | Rythme, lisibilité | Dépendance à la diffusion et aux managers célèbres (analyse EVENT LAB) | **Retient** : la salle comme décor maîtrisé [S-G1-32] (vérifié) |
| 11 | NBA All-Star Weekend | NBA ; États-Unis | Concours (Skills, 3 points, dunk), mini-tournoi en 2026 | Épreuves d'habileté chronométrées | Lisibilité d'un parcours technique | Concours sans enjeu sportif | **Retient** : le parcours chronométré lisible. **Évite** : l'exhibition sans conséquence ; chez LA GRILLE, le temps fixe les poules [S-G1-33] (vérifié) |
| 12 | LNB All-Star Game | LNB ; Paris | Match des étoiles, concours de skills en 1 contre 1, sélection par vote du public + jury | Sélection participative | Rendez-vous familial | Match de gala peu disputé | **Retient** : impliquer le public par une mécanique gratuite (prédiction de la pole) [S-G1-34] (vérifié) |
| 13 | All Star Game Basket Fauteuil | Fédération française handisport ; Bobigny (2025, 2026) | Journée de tournois 3x3 + soirée All-Star, billet à 5 € | Sport inclusif présenté comme un spectacle | Prix bas, format reproductible | Jeune, sans recul sur l'affluence | **Retient** : journée participative + soirée spectacle à 5 € ; piste d'une démonstration de basket fauteuil (section 9) [S-G1-17, S-G1-18] (vérifié) |
| 14 | Petits formats associatifs : ASA 3x3 Contest, NL Contest, Playin' Paris, Bask'Cup, All Stars Game Alsace | Associations locales (Weyersheim, Strasbourg, Paris, Nancy, Gries) | Contests et tournois d'une journée, billetterie en ligne, prix bas ou accès libre | Proximité, coût faible | Simplicité, ancrage local | Peu documentés publiquement (affluence, résultats) | **Retient** : la simplicité d'organisation. **Évite** : un matin sans enjeu, des poules non hiérarchisées (hypothèse G1-b) [S-G1-21, S-G1-20, S-G1-22, S-G1-40, S-G1-19] (probable / vérifié) |

### 6.1 Enseignements

1. **Aucune référence relevée n'utilise un classement chronométré pour constituer les poules.** Les épreuves d'habileté existent (lignes 11 et 12), mais elles sont des exhibitions. L'originalité de LA GRILLE tient à la conséquence sportive du chrono, pas au parcours lui-même (constat limité aux références étudiées ; une veille ciblée doit le confirmer).
2. **Le plein air d'été est un risque documenté** (lignes 3 et 4) ; la salle est un avantage concurrentiel, à condition de soigner l'ambiance (lignes 1, 10).
3. **Les mécaniques ludiques s'usent si elles touchent au résultat** (ligne 9) : LA GRILLE limite le jeu au public (prédiction gratuite, concours) et laisse le sport décider.
4. **Le prix bas est la norme associative** (lignes 13, 14) : la valeur doit venir du programme.
5. **La catégorie féminine est un levier**, pas un complément (lignes 2, 4, 8).

---

## 7. Sources d'inspiration

| Source | Secteur | Logique empruntée | Adaptation dans LA GRILLE | Éléments non repris | Source |
|---|---|---|---|---|---|
| Qualifications par manches éliminatoires du sport automobile | Sports mécaniques | Séances successives qui figent les positions ; dernière séance resserrée aux plus rapides ; publication d'une grille | Parcours technique chronométré par équipe ; Q1 et Q2 sur deux stations en parallèle, Q3 un par un sur le terrain central ; la grille fixe les têtes de série | Noms de compétitions, d'écuries et de constructeurs ; logos, livrées, couleurs d'équipes ; habillages et sons identifiables ; terminologie de marque. Le drapeau à damier n'est utilisé que sur la ligne d'arrivée du parcours | Règlements sportifs de référence : FIA [S-G1-35] ; actualité du championnat [S-G1-36] (catalogue ; détail des formats non relu) |
| Révélations en direct et tirages au sort télévisés | Médias | Moment collectif de révélation, suspense, écran géant | Révélation animée de la grille puis du placement serpentin (11:35) | Génériques, habillages, musiques et formats d'émissions | Logique générique, sans source propre |
| Épreuves d'habileté des week-ends All-Star | Basket | Parcours technique chronométré, lisible par le public | Parcours en relais à trois postes, identique pour toutes les équipes | Noms des concours, marques des ligues, sponsors des épreuves | [S-G1-33, S-G1-34] |
| Ligues de football à format court pensées pour le streaming | Sport-divertissement | Chaque séquence conçue pour un clip vertical ; règles lisibles en quelques secondes | Plans de tournage par moment fort (section 30) | Cartes secrètes, dé, toute mécanique aléatoire sur le résultat ; noms et identités des ligues | [S-G1-30, S-G1-32] |
| Fin de match au score cible | Basket (TBT, G League) | Le match se termine sur un panier | Déjà présente en 3x3 (21 points ; 15 en poule) ; prolongation « premier à 2 points » | Nom de la règle, formules de calcul des ligues | [S-G1-25, S-G1-65] |
| Parc urbain des Jeux de Paris 2024 | Événement multisport | Public au plus près du terrain, bande-son continue, sports urbains en festival | Zone debout en front de terrain, speaker et musique, pit wall visible du public | Emblèmes, mascottes, marques olympiques (protégés) | [S-G1-61, S-G1-07] |
| Placement serpentin des têtes de série | Méthode générique de compétition | Répartition équilibrée des forces entre poules | Appliqué à la grille issue des qualifications | — (méthode non protégée) | — |

> Règle : EVENT LAB emprunte des logiques, jamais des marques, des identités visuelles ou des éléments protégés. Aucun logo ni visuel tiers ne figure dans ce dossier.

---

## 8. Problématiques identifiées

| Problématique | Qui la subit | Preuve | Conséquence | Réponse du format (section) | KPI |
|---|---|---|---|---|---|
| Matin sans enjeu, public absent avant 13 h | Joueurs, spectateurs, partenaires | Hypothèse G1-b (à vérifier) | Ambiance faible, visibilité partenaires concentrée sur 2 heures | Qualifications Q1–Q3, révélation à 11:35 (11, 12) | K03, K06 |
| Poules déséquilibrées (tirage ou ordre d'inscription) | Joueurs | Hypothèse G1-b | Matchs à sens unique, finales prévisibles | Placement serpentin selon la grille (11.5) | K06 |
| Attente entre deux matchs | Joueurs | Jugement d'expert (évaluation, critère expérience) : 3 matchs de poule sur 3 h 36 | Ennui, départs anticipés | Créneau fixe par poule (attente de 60 min connue d'avance), heure du prochain match en direct (22) | K06 |
| Transitions non scénarisées | Spectateurs | Critique du All-Star NBA 2025 [S-G1-64] (vérifié) | Décrochage du public | Conducteur minute par minute, show de mi-parcours, entrées par numéro de grille (27) | K04 |
| Concours d'habileté qui s'essoufflent | Spectateurs | Remplacement d'un concours individuel par un format par équipes [S-G1-63] (vérifié) | Attente entre essais | Run plafonné à 90 s, deux stations en parallèle, Q3 seule au centre (12.2, art. 7) | K04 |
| Règles 3x3 peu connues ; règle du check-ball modifiée en 2026 | Spectateurs, arbitres bénévoles | [S-G1-01, S-G1-02] (vérifié, partiel) | Incompréhension, contestations | Règles en 2 minutes, briefing arbitres, speaker pédagogue (12.1) | K06 |
| Contestation des chronos | Joueurs, organisateur | Risque R-10 | Litiges, image | Deux juges par station, vidéo du parcours à J-30, réclamation en 5 min (12.2, art. 7.10) | K06 |
| Événements d'été exposés à la chaleur | Organisateurs | [S-G1-14, S-G1-24] (vérifié) | Annulation, pertes | Format conçu pour la salle (11.6) | — |
| Trésorerie : subventions versées après J | Association | Simulation (section 29) | Avance de fonds | Go/no-go J-60, financement nommé (2.6) | K02 |
| Bénévoles insuffisants le jour J | Organisateur | Risque R-13 | Postes non tenus | Recrutement +20 %, fiches de poste, fidélisation (36) | KPI bénévoles à créer (section 36) |
| Visibilité des partenaires non mesurée | Partenaires | Hypothèse G1-j | Non-renouvellement | Bilan de visibilité chiffré à J+7 (31.8) | K07 |
| Offre gratuite concurrente (finales pro, tournois en accès libre) | Organisateur | [S-G1-60, S-G1-22] (vérifié) | Pression sur le prix d'entrée | Programme à valeur perçue, gratuité moins de 12 ans (9) | K03 |

---

## 9. Proposition de valeur

| Partie prenante | Bénéfice | Alternative actuelle | Différence LA GRILLE | Mesure (KPI) |
|---|---|---|---|---|
| Participant | Jouer dès 10 h avec un enjeu ; une place méritée ; au moins 3 matchs ; une photo d'équipe sur sa place de grille | Tournoi local au matin sans enjeu, poules au hasard | La grille transforme le chrono en avantage sportif ; la pole choisit son terrain | K06 satisfaction, K09 réinscription |
| Spectateur | Des moments forts toutes les 30 à 60 minutes ; règles comprises en 2 minutes ; prix bas | Venir seulement pour les finales ; événements gratuits sans programme | Q3 un par un, révélation, entrée des finalistes, page de scores en direct | K03 spectateurs, K05 attente |
| Bénévole | Un poste défini, une équipe identifiable, un événement « qui a du style » | Tenir la buvette sans voir le jeu | Fiches de poste, rotations, rôles visibles (juges, pit wall), reconnaissance après l'événement | Taux de bénévoles revenant (à ajouter, section 36) |
| Partenaire | Des temps forts nommables (Q3, trophée de la pole, concours public) et un bilan chiffré | Logo sur une banderole | Activation liée à un moment précis ; bilan de visibilité à J+7 | K07 vues, bilan J+7 |
| Lieu et collectivité | Une animation jeunesse et féminine documentée, reproductible, sans alcool | Prêter la salle sans retour | Dossier complet, règles de sécurité écrites, indicateurs | K03, K10 gobelets |
| Organisateur (association) | Un format clé en main, un budget piloté par jalons, un événement transmissible | Réinventer chaque année | Blueprint, conducteur, go/no-go, manuel de reproduction | K02, K08 résultat |

**Différenciation en une phrase** : LA GRILLE est, parmi les références étudiées, le seul tournoi amateur où le matin compte autant que la finale, parce que le chrono décide des poules (limite du constat : section 6.1).

**Inclusion (piste d'amélioration du score)** : une démonstration de basket fauteuil pendant la pause, en partenariat avec un club handisport, reprend une logique éprouvée [S-G1-17] (vérifié) ; à décider à la version suivante.

---

## 10. Publics cibles

### 10.1 Segments

| Segment | Rôle | Motivation | Consentement à payer | Freins |
|---|---|---|---|---|
| Joueurs et joueuses 3x3 amateurs, 16–35 ans, licenciés ou non | Participant | Jouer beaucoup, se mesurer, vivre un « grand événement » | Hypothèse : 15 € par joueur (60 € par équipe) ; sous l'Open Plus recommandé à 120 € (section 5.7) | Inscription non remboursable ; documents pour les 16–17 ans ; concurrence des tournois d'été |
| Familles et amis des joueurs, public basket local | Spectateur | Soutenir, passer un après-midi animé et peu cher | Hypothèse : 5 € la journée, gratuit moins de 12 ans | Événements gratuits concurrents ; durée de la journée |
| Commerces et entreprises locales | Partenaire | Visibilité auprès d'un public jeune local | Hypothèse : 400 € à 4 000 € selon le pack | Audience locale modeste ; absence d'historique |
| Bénévoles du club et de la ville | Bénévole | Contribuer, appartenir à une équipe | — | Journée longue (montage la veille) |
| Élus et partenaires institutionnels | Invité VIP | Politique sportive jeunesse, attractivité | — | Agenda du samedi |
| Presse locale, créateurs de contenu basket | Journaliste / créateur | Sujets visuels, histoires de quartier | — | Pas d'accès privilégié aux moments forts sans organisation |

### 10.2 Volumes

| | Prudent | Central | Ambitieux | Statut |
|---|---|---|---|---|
| Spectateurs uniques | 250 | 450 | 700 | Hypothèse H-04 |
| Équipes | 18 | 24 | 24 | Hypothèse (event.json) ; 24 = capacité du format (16 Open + 8 Féminines) |
| Part payante des spectateurs | 70 % | 70 % | 70 % | Hypothèse H-04 |
| Durée moyenne de présence | 3 h | 3 h | 3 h | Hypothèse H-04 |

Profil d'arrivée supposé : 15 % des spectateurs entre l'ouverture et 11:30, 15 % entre 11:30 et 13:00, 35 % entre 13:00 et 16:30, 35 % entre 16:30 et 18:30 (event.json). La pointe de présence simultanée intervient pendant les finales (section 14, tableau des flux).

### 10.3 Personas (archétypes, non issus d'entretiens)

| Persona | Situation | Attentes | Freins | Canal | Accessibilité |
|---|---|---|---|---|---|
| **Inès, 19 ans, joueuse Open-Féminines** | Étudiante, joue en club et en playground | Jouer contre de bonnes équipes, une catégorie féminine qui ne passe pas en ouverture | Trouver 3 coéquipières disponibles | Instagram, groupe WhatsApp du club | — |
| **Karim, 27 ans, capitaine Open** | Non licencié, joue l'été en extérieur | Un tournoi en salle hors saison, un classement qui récompense la régularité | Prix, documents à fournir | TikTok, bouche-à-oreille | — |
| **Sandrine, 44 ans, mère d'un joueur de 17 ans** | Vient pour les finales avec un enfant de 9 ans | Horaires fiables, places assises, buvette, sécurité | Durée, prix pour la famille | Facebook, e-mail du club | Poussette, besoin de pauses |
| **Marc, 52 ans, commerçant** | Sponsor local potentiel | Être vu par les familles de son quartier, sans formalités | Pas de preuve de retombées | Rencontre directe, LinkedIn | — |
| **Jo, 63 ans, bénévole** | Retraité, ancien arbitre | Un rôle utile et reconnu (juge de station) | Station debout prolongée | Club, mairie | Poste assis possible |

### 10.4 Besoins d'accessibilité attendus

| Besoin | Public concerné | Réponse prévue |
|---|---|---|
| Accès et cheminement de plain-pied, places réservées avec vue dégagée | Personnes en fauteuil, mobilité réduite | Emplacements PMR face au terrain central (8 places, event.json), file prioritaire A (section 19) |
| Information lisible | Personnes malvoyantes, public non francophone | Contrastes AA (section 18), pictogrammes, programme en facile à lire, annonces micro doublées à l'écran |
| Information sonore doublée | Personnes sourdes ou malentendantes | Temps et résultats affichés à l'écran et sur la page de scores |
| Calme et pauses | Personnes sensibles au bruit, jeunes enfants | Hall hors aire de jeu ; volume sonore maîtrisé (directivité, section 20) |
| Accompagnement | Tous | Référent accessibilité identifiable (gilet), réservation PMR à la billetterie |

---

## 11. Description exhaustive du format

### 11.1 Résumé

Journée unique en salle. **Matin** : qualifications chronométrées sur un parcours technique par équipe, en trois manches éliminatoires (Q1, Q2, Q3), qui produisent une grille de départ par catégorie. **Midi** : révélation de la grille sur écran et constitution des poules par placement serpentin. **Après-midi** : 6 poules de 4 (4 Open, 2 Féminines) en règles 3x3 adaptées, quarts de finale Open, demi-finales, finales sur le terrain central, podiums. Cadence : annuelle, avec option de deux éditions par an cumulées dans le classement Grille Series.

### 11.2 Déroulé narratif

| Heure | Phase | Ce que vit le spectateur | Ce que vit l'équipe |
|---|---|---|---|
| J-1 18:00–21:30 | Montage | — | — |
| 09:00–09:45 | Accueil des équipes | — | Contrôle des documents, bracelets, plaque de numéro provisoire (ordre de passage Q1) |
| 09:30 | Ouverture des portes | Entrée, programme d'une page, QR code de la page de scores | — |
| 09:45–10:00 | Briefing capitaines | — | Parcours, règlement, réclamations ; reconnaissance du parcours à pied |
| 10:00–10:10 | Ouverture | Le speaker explique le format ; un bénévole fait une démonstration du parcours | Échauffement |
| 10:10–10:35 | **Q1 Open** (16 équipes, 2 stations) | Deux runs en parallèle toutes les 2 min 30 ; temps à l'écran | Un run ; places 11 à 16 figées |
| 10:35–10:47 | **Q1 Féminines** (8 équipes) | Idem | Places 5 à 8 figées |
| 10:50–11:05 | **Q2 Open** (10 équipes) | Ordre inverse du classement Q1 : le plus rapide passe en dernier | Places 5 à 10 figées ; chaque équipe change de station |
| 11:05–11:17 | **Q3 Féminines** (4 équipes, un par un, terrain central) | Lumière baissée si possible, silence avant chaque départ, jingle de pole | Places 1 à 4 |
| 11:20–11:32 | **Q3 Open** (4 équipes, un par un) | Moment phare, « présenté par » le partenaire titre ; prédiction de la pole close au premier départ | Places 1 à 4 |
| 11:35–11:50 | **Révélation de la grille** | Animation à l'écran, puis placement serpentin poule par poule ; trophée de la pole ; tirage de la prédiction | Photo d'équipe sur son numéro de grille (zone photo) |
| 11:50–13:00 | Pause + concours public « Ta place sur la grille » | Le public court un parcours simplifié sur le terrain 2 ; classement à l'écran | Repas, repos |
| 13:00–16:36 | **Poules** (36 matchs, 2 terrains, créneaux de 12 min) | Deux matchs en permanence ; heure du prochain match de chaque équipe en direct | 3 matchs à 72 min d'intervalle |
| 16:36–17:00 | Show de mi-parcours | Défi public, annonce du tableau final | Récupération |
| 17:00–17:30 | Quarts de finale Open | — | Élimination directe |
| 17:30–18:00 | Demi-finales Open et Féminines | — | — |
| 18:00–18:10 | Entrée des finalistes par numéro de grille | Chaque finaliste est appelé par sa place sur la grille | — |
| 18:10–18:45 | Finales Féminines puis Open, terrain central | Pointe de présence de la journée | — |
| 18:50–19:10 | Podiums, photo officielle sur la grille au sol | — | — |
| 19:10–21:00 | Démontage | — | — |

Horaires issus du programme d'event.json (conducteur complet en section 27).

### 11.3 Catégories et équipes

| Catégorie | Équipes | Composition | Éligibilité |
|---|---|---|---|
| Open | 16 | 3 joueurs + 1 remplaçant ; équipes masculines, féminines ou mixtes | 16 ans révolus le jour J ; autorisation parentale pour les 16–17 ans |
| Féminines | 8 | 3 joueuses + 1 remplaçante | Idem |

Liste d'attente : 4 équipes (toutes catégories), repêchées dans l'ordre d'inscription.

### 11.4 Logique de la grille

| Manche | Open : entrants → qualifiés | Places figées | Féminines : entrants → qualifiées | Places figées | Lieu |
|---|---|---|---|---|---|
| Q1 | 16 → 10 | 11 à 16 | 8 → 4 | 5 à 8 | 2 stations en parallèle (station A sur T1, station B sur T2) |
| Q2 | 10 → 4 | 5 à 10 | — | — | 2 stations, chaque équipe change de station |
| Q3 | 4 → — | 1 à 4 | 4 → — | 1 à 4 | Terrain central T1, un run à la fois |

Chaque manche repart de zéro : seul le temps de la manche en cours classe les équipes encore en lice ; les temps des manches précédentes servent uniquement au départage (règlement, art. 7.8). Le temps d'un run est plafonné à 90 secondes ; une minute de remise en place sépare deux runs sur une station.

### 11.5 Placement serpentin : exemple chiffré

Les places de grille sont réparties par rangées de quatre. Les rangées impaires vont de la poule A à la poule D, les rangées paires de D à A.

| Rangée | Places | Poule A | Poule B | Poule C | Poule D |
|---|---|---|---|---|---|
| 1 (→) | 1 à 4 | **1** | 2 | 3 | 4 |
| 2 (←) | 5 à 8 | 8 | 7 | 6 | 5 |
| 3 (→) | 9 à 12 | 9 | 10 | 11 | 12 |
| 4 (←) | 13 à 16 | 16 | 15 | 14 | 13 |
| **Somme des places** | | **34** | **34** | **34** | **34** |

Poules Open : **A = 1, 8, 9, 16 · B = 2, 7, 10, 15 · C = 3, 6, 11, 14 · D = 4, 5, 12, 13**. La somme identique (34) montre l'équilibre recherché. Féminines (8 → 2 poules) : **E = 1, 4, 5, 8 · F = 2, 3, 6, 7** (somme 18 chacune).

Dans chaque poule, les équipes sont numérotées P1 à P4 selon leur place de grille (P1 = la mieux placée). Ordre des matchs : tour 1 P1–P4 et P2–P3 ; tour 2 P1–P3 et P2–P4 ; tour 3 P1–P2 et P3–P4. Les deux matchs d'une poule se jouent en même temps, un sur chaque terrain ; P1 joue sur le terrain central T1.

### 11.6 Avantage de la pole et des places de tête

| Avantage | Pour qui | Effet |
|---|---|---|
| Trophée de la pole, remis à la révélation | Place 1 de chaque catégorie | Récompense du matin, moment photo |
| Choix du terrain de ses 3 matchs de poule (T1 central ou T2) | Pole Open et pole Féminines | Seule exception à la règle « P1 joue sur T1 » |
| Adversaires de poule les moins bien classés : somme de leurs places 33, contre 32, 31 et 30 pour les places 2, 3 et 4 | Place 1 | Effet du serpentin (11.5) |
| Placement dans la moitié opposée du tableau final à la place 2 | Places 1 et 2 | Les poules A et B ne peuvent se rencontrer qu'en finale (11.7) |
| Dernier départage en poule : la meilleure place de grille | Toutes | Le matin compte jusqu'au bout de l'après-midi |
| Points Grille Series de grille | Toutes les places qualificatives | Section 12.7 |

### 11.7 Organisation de l'après-midi

**Poules : un créneau fixe par poule.** Chaque tour dure 6 créneaux de 12 min. L'ordre des créneaux est identique aux trois tours : A, E, B, F, C, D. Une équipe joue donc toutes les 72 minutes (60 minutes d'attente connues à l'avance), et le public voit une catégorie Féminines toutes les 24 minutes.

| Poule | Tour 1 | Tour 2 | Tour 3 |
|---|---|---|---|
| A | 13:00 | 14:12 | 15:24 |
| E (Féminines) | 13:12 | 14:24 | 15:36 |
| B | 13:24 | 14:36 | 15:48 |
| F (Féminines) | 13:36 | 14:48 | 16:00 |
| C | 13:48 | 15:00 | 16:12 |
| D | 14:00 | 15:12 | 16:24 (fin 16:36) |

**Tableau final Open (les 2 premiers de chaque poule)** : moitié haute QF1 A1–C2 et QF2 D1–B2 ; moitié basse QF3 B1–D2 et QF4 C1–A2 ; demi-finales vainqueur QF1–vainqueur QF2 et vainqueur QF3–vainqueur QF4. **Tableau final Féminines** : demi-finales E1–F2 et F1–E2.

**Recommandation de séquence (écart avec le programme actuel)** : jouer les demi-finales Féminines **avant** les demi-finales Open (17:30 puis 17:45), pour que les vainqueurs des quarts du second créneau (17:15–17:30) ne rejouent pas immédiatement. Les finalistes Féminines gardent 25 minutes de récupération avant leur finale de 18:10. À reporter dans event.json (signalé au coordinateur).

### 11.8 Briques fonctionnelles et séquences qui les portent

| Brique | Séquence ou mécanique |
|---|---|
| Qualifications Q1/Q2/Q3 | Séquences de 10:10 à 11:32 ; règlement art. 7 |
| Placement serpentin | Révélation 11:35 ; section 11.5 |
| Règles 3x3 adaptées | Poules et phases finales ; règlement art. 9 |
| Révélation de la grille sur écran | 11:35–11:50 ; maquette d'écran (section 22) |
| Entrée des finalistes par numéro de grille | 18:00–18:10 |
| Trophée de la pole et choix du terrain | Révélation ; section 11.6 |
| Concours public « Ta place sur la grille » | Pause 11:50–13:00, terrain 2 ; règlement art. 20 |
| Prédiction gratuite de la pole | De la fin de Q2 au premier départ de Q3 ; règlement art. 19 |
| Grille, poules et scores en direct | Page web publique (section 22) |
| Grille au sol, zone photo officielle | Zone PH ; photos après la révélation et aux podiums |
| Pit wall | Zone équipes entre les deux terrains ; tableau d'appel (section 19) |
| Habillage sonore des qualifications | Compte à rebours, top départ, jingle de pole |
| Monétisation | Billetterie, inscriptions, buvette, packs partenaires (section 31) |
| Grille Series, passeport d'équipe | Section 36 ; règlement art. 18 |
| Q3 « présentée par » un partenaire | Pack partenaire titre (section 31) |
| Clips verticaux | Plan de contenus du jour J (section 30.6) |

### 11.9 Étapes de compétition simulées

<!-- @gen:competition -->

### 11.10 Variantes selon la configuration du lieu

| Configuration | Ce qui change | Ce qui ne change pas |
|---|---|---|
| Économique (recommandée en édition 1) | Sono et vidéoprojection allégées ou prêtées, animation bénévole, signalétique et dotations réduites, communication organique, pas de prestation du studio | Q1/Q2/Q3, grille, révélation (écran ou grille physique), serpentin, deux catégories |
| Standard | Speaker professionnel, vidéaste, sono complète, signalétique complète | — |
| Premium | Mur LED, éclairage scénique pour Q3 et finales, captation multicaméra diffusée, espace invités | Le format sportif est identique |
| Capacité maximale autorisée | Quota de billets par créneau horaire, retransmission des finales dans le hall | Plafond fixé par l'exploitant, jamais par EVENT LAB |
| Secours (lieu indisponible, R-15) | 1 terrain, 16 équipes. Pour tenir avant 19:10 : poules de 7 min ou 13 points en créneaux de 10 min et tableau final limité aux demi-finales (proposition à simuler) | Qualifications sur une seule station, grille, serpentin |

### 11.11 Si moins de 24 équipes

Le scénario prudent compte 18 équipes [event.json] : le format doit s'adapter sans improvisation.

| Équipes dans la catégorie | Qualifications | Poules |
|---|---|---|
| Open 14 à 16 | Q1 → 10 en Q2 → 4 en Q3 | 4 poules (poules de 3 si nécessaire) |
| Open 10 à 13 | Q1 → 8 en Q2 → 4 en Q3 | 3 ou 4 poules de 3 ou 4 |
| Open 6 à 9 | Q1 → 4 en Q3 (pas de Q2) | 2 poules |
| Féminines 6 à 8 | Q1 → 4 en Q3 | 2 poules |
| Féminines 4 ou 5 | Q3 seule (une manche, un par un) | 1 poule unique, finale entre les 2 premières |

Le serpentin s'applique de la même façon, rangée par rangée. Toute modification est annoncée au briefing des capitaines et recalculée par le simulateur.

### 11.12 Éléments distinctifs

1. Le chrono du matin a une conséquence sportive : il fixe les poules.
2. Une révélation collective à heure fixe, attendue par toute la salle.
3. Une identité visuelle construite sur la grille au sol, qui sert de décor et de spot photo.
4. Le numéro de grille suit l'équipe toute la journée : appel au pit wall, entrée des finalistes, passeport.
5. Un jeu gratuit pour le public, sans influence sur le résultat sportif.

---

## 12. Règles et mécaniques

### 12.1 Les règles en deux minutes (version publique)

1. **Le matin, on joue sa place.** Chaque équipe fait un parcours chronométré en relais à trois : slalom et panier, haies et tir mi-distance, tir à 2 points et retour. Le meilleur temps gagne.
2. **Trois manches éliminatoires.** Q1 fixe les dernières places, Q2 les places du milieu, Q3 se court un par un et donne la pole. Chaque manche repart de zéro.
3. **La grille fixe les poules.** À 11:35, la grille est révélée et les équipes sont réparties en serpentin : la 1re, la 8e, la 9e et la 16e ensemble, et ainsi de suite.
4. **L'après-midi, on joue au basket 3x3.** Poules en 8 minutes ou 15 points, phases finales en 10 minutes ou 21 points. Pour le reste, règles officielles FIBA 3x3.
5. **La pole a deux avantages** : un trophée et le choix de son terrain de poule. En cas d'égalité parfaite en poule, la meilleure place de grille l'emporte.
6. **Le public joue aussi, gratuitement** : prédire la pole et courir le parcours pendant la pause.

### 12.2 Règlement complet de LA GRILLE 3x3

> Version prête à publier **après** : relecture par un juriste (articles 3, 15 à 17, 19), choix du cadre homologué ou non (article 15.1), insertion des noms, dates et contacts de l'édition. Les références réglementaires sont citées « à revérifier » : elles n'ont pas été relues dans leur version consolidée.

#### Article 1 — Organisateur et objet
LA GRILLE 3x3 est un tournoi de basket 3x3 amateur d'une journée organisé par [association organisatrice, forme juridique, siège], avec la coordination du studio EVENT LAB, le [date] à [lieu]. Le présent règlement s'applique à toutes les équipes, à leurs accompagnants et aux participants des animations ouvertes au public.

#### Article 2 — Catégories et nombre d'équipes
- **Open** : 16 équipes, masculines, féminines ou mixtes.
- **Féminines** : 8 équipes.
- Liste d'attente : 4 équipes, dans l'ordre d'inscription.
- Si une catégorie compte moins d'équipes, le format est adapté selon le tableau de la section 11.11 et annoncé au briefing.

#### Article 3 — Éligibilité
- Avoir **16 ans révolus** le jour du tournoi.
- Pour les joueurs de 16 et 17 ans : **autorisation parentale** signée (modèle fourni), déposée à l'inscription et présentée au contrôle.
- Une même personne ne joue que dans une seule équipe.
- Présenter une pièce d'identité au contrôle des équipes.
- Conditions médicales : article 15.1.

#### Article 4 — Composition des équipes
- 3 joueurs + 1 remplaçant, dont un capitaine, interlocuteur unique de l'organisation.
- La composition peut être modifiée jusqu'à la confirmation de J-3. Le jour J, seul le remplacement d'un joueur blessé ou malade par une personne éligible est accepté, avant le premier run de l'équipe.
- Les noms d'équipe sont validés par l'organisation : sont refusés les noms injurieux, discriminatoires, à caractère publicitaire ou reprenant une marque.

#### Article 5 — Inscription
- Inscription en ligne uniquement, **60 € par équipe**, payés à l'inscription.
- L'inscription est confirmée à réception du paiement et des pièces demandées.
- **Confirmation obligatoire à J-3** par le capitaine. Sans confirmation, la place est proposée à la liste d'attente.
- **Inscription non remboursable**, sauf annulation du tournoi par l'organisateur ou cas de force majeure dûment justifié (blessure ou maladie empêchant l'équipe d'aligner 3 joueurs, avec justificatif).
- Clôture des inscriptions : à J-3 ou dès que les places sont pourvues.

#### Article 6 — Déroulement général
Le programme horaire est publié à J-7 et sur la page de scores. Il peut être modifié le jour J par le responsable compétition pour des raisons de sécurité ou de retard (article 9.4). Chaque équipe joue au moins une manche de qualification et 3 matchs de poule.

#### Article 7 — Qualifications chronométrées

**7.1 Principe.** Le classement des qualifications produit la grille de départ de chaque catégorie. Open : Q1 (16 équipes) fige les places 11 à 16 ; les 10 meilleures courent Q2, qui fige les places 5 à 10 ; les 4 meilleures courent Q3, qui attribue les places 1 à 4. Féminines : Q1 (8 équipes) fige les places 5 à 8 ; les 4 meilleures courent Q3. Seul le temps de la manche en cours classe les équipes encore en lice.

**7.2 Stations et parcours.** Q1 et Q2 se courent sur deux stations identiques (station A sur le terrain 1, station B sur le terrain 2) ; Q3 sur la station A du terrain central. Repères : distances mesurées depuis la ligne de fond, sous le panier ; « gauche » et « droite » s'entendent vus depuis la ligne de départ, face au panier. Les positions sont marquées à l'adhésif et contrôlées au mètre ruban sur les deux stations avant 08:30.

| Élément | Position et dimensions | Rôle |
|---|---|---|
| Ligne de départ et d'arrivée (D/A) | Adhésif de 3 m parallèle à la ligne de fond, à 10 m de celle-ci, côté gauche (de 3 à 6 m à gauche de l'axe du panier) ; cellules ou repères de chronométrage à ses deux extrémités | Départ de J1, arrivée de J3 |
| 5 plots (poste 1) | Alignés à 4,5 m à gauche de l'axe, à 8,5 ; 7,0 ; 5,5 ; 4,0 et 2,5 m de la ligne de fond (écart de 1,5 m) ; sens du slalom indiqué par une flèche au sol | Slalom en dribble de J1 |
| Ligne d'attente de J2 | Adhésif de 1 m à 9 m de la ligne de fond, à 5,5 m à droite de l'axe | Position de J2 au départ |
| 4 haies basses (poste 2) | Hauteur 15 à 20 cm, modèle souple ou à rabat ; sur l'axe situé à 5,5 m à droite, à 8,0 ; 7,0 ; 6,0 et 5,0 m de la ligne de fond | Franchissement sans ballon par J2 |
| Cerceau C2 (poste 2) | Posé au sol, à 4 m à droite de l'axe et à 4 m de la ligne de fond (à l'intérieur de l'arc) | Réception et tir de J2 |
| Cerceau C3 (poste 3) | Posé au sol, dans l'axe du panier, immédiatement derrière l'arc à 2 points | Réception et tir à 2 points de J3 |

**7.3 Déroulement d'un run.**
1. **Départ** : J1, pieds derrière la ligne D/A, ballon en main ; J2 derrière sa ligne d'attente ; J3 debout, au moins un pied dans le cerceau C3. Compte à rebours sonore « 3, 2, 1, top ».
2. **Poste 1 — Slalom et panier (J1)** : slalom en dribble entre les 5 plots dans le sens indiqué, puis tir à l'intérieur de l'arc jusqu'à réussite (3 tentatives maximum). J1 prend son rebond.
3. **Poste 2 — Haies et tir mi-distance (J2)** : J2 ne franchit la première haie qu'une fois le panier de J1 marqué. Il franchit les 4 haies sans ballon, se place avec au moins un pied dans le cerceau C2, reçoit la passe de J1 et tire depuis le cerceau jusqu'à réussite (3 tentatives maximum). J2 prend son rebond, revient dans le cerceau si besoin et passe à J3.
4. **Poste 3 — Tir à 2 points et retour (J3)** : J3 reçoit la passe avec au moins un pied dans le cerceau C3 et tire à 2 points depuis le cerceau jusqu'à réussite (3 tentatives maximum). Il prend le ballon et revient en dribble franchir la ligne D/A.
5. **Arrivée** : le run s'arrête quand J3 franchit la ligne D/A en contrôlant le ballon (en main ou en dribble). Un franchissement sans ballon ne compte pas.

Chaque joueur ne touche le ballon que dans son poste et pour la passe de relais.

**7.4 Chronométrage.**
- Le chronomètre démarre au franchissement de la ligne D/A par J1 et s'arrête au franchissement par J3 avec le ballon.
- Moyen principal : cellules photoélectriques ou chronométrage sur tablette. Moyen de secours permanent : deux chronométreurs manuels par station (les deux juges).
- En chronométrage manuel, le temps brut est la **moyenne des deux chronos**, arrondie au centième.
- **Temps retenu = temps brut + pénalités.** Il est inscrit sur la feuille de run signée par les deux juges, affiché à l'écran et publié sur la page de scores.

**7.5 Pénalités.**

| Faute | Sanction |
|---|---|
| Faux départ (J1 franchit la ligne avant le « top ») | Avertissement ; second faux départ de l'équipe dans la manche : +3 s |
| J2 franchit la première haie avant le panier de J1 | +3 s |
| Plot renversé ou contourné du mauvais côté | +2 s par plot |
| Haie renversée | +2 s par haie |
| Slalom sans dribble (ballon porté ou tenu en marchant) | +2 s |
| Tir pris sans aucun pied dans le cerceau (postes 2 et 3) | Tir non valable, même réussi ; compte comme une tentative |
| 3 tentatives manquées à un poste de tir | +5 s ; le joueur passe directement au relais suivant |
| Joueur qui touche le ballon hors de son poste (sauf passe de relais) | +5 s |
| Ballon sorti de la station | Pas de pénalité ; le joueur du poste concerné le récupère |

**7.6 Plafond de 90 secondes.** À 90 secondes de temps brut, le juge arrête le run. Temps retenu : 90 s + pénalités. Les équipes concernées sont classées après toutes celles qui ont terminé leur run, puis entre elles par nombre de postes validés, puis par pénalités. Une minute de remise en place sépare deux runs sur une station.

**7.7 Ordre de passage et appel.**
- Q1 : ordre et station tirés au sort à J-3, publiés avec la liste définitive ; deux équipes courent en même temps, une par station.
- Q2 : ordre inverse du classement de Q1 (l'équipe la plus rapide passe en dernier) ; chaque équipe court sur la station qu'elle n'a pas utilisée en Q1.
- Q3 : ordre inverse du classement de la manche précédente (Q2 en Open, Q1 en Féminines), un run à la fois sur le terrain central.
- Les équipes sont appelées au pit wall deux runs à l'avance. Une équipe absente à son appel passe en fin de manche ; absente en fin de manche, elle est classée dernière de la manche, sans temps.

**7.8 Égalités** (au centième de seconde de temps retenu).

| Manche | Critère 1 | Critère 2 | Critère 3 |
|---|---|---|---|
| Q1 | Moins de pénalités | Meilleur temps brut | Équipe ayant réalisé le temps la première |
| Q2 | Moins de pénalités en Q2 | Meilleur temps retenu en Q1 | Équipe ayant réalisé le temps la première |
| Q3 | Moins de pénalités en Q3 | Meilleur temps retenu de la manche précédente | Équipe ayant réalisé le temps la première |

**7.9 Incidents et nouveau run.** En cas d'interférence extérieure (objet ou personne dans la station, panne de matériel imputable à l'organisation), le juge arrête le run. Le responsable compétition peut accorder un nouveau run, couru en fin de manche après 5 minutes de récupération. Une panne de chronométrage numérique n'entraîne pas de nouveau run si le chronométrage manuel a fonctionné. Si aucun chronométrage n'est possible sur une station, le plan de continuité R-06 s'applique (concours de tirs de 60 s en remplacement de Q1 et Q2, annoncé au micro).

**7.10 Réclamations.** Seul le capitaine peut réclamer, auprès du responsable compétition au pit wall, **dans les 5 minutes** qui suivent l'affichage du temps contesté. Motifs recevables : erreur de pénalité, erreur de chronométrage, interférence extérieure. Le responsable compétition entend les deux juges, consulte la vidéo du run si elle existe et décide dans les 5 minutes. Sa décision est définitive. Le temps et les pénalités retenus sont annoncés au micro.

**7.11 Composition et matériel.** Trois joueurs par run ; la répartition des postes (J1, J2, J3) est libre et peut changer à chaque manche ; le remplaçant entre entre deux manches. Le ballon est fourni par l'organisation, identique pour toutes les équipes. Une reconnaissance du parcours à pied a lieu pendant le briefing ; il n'y a pas de run d'essai chronométré. La vidéo officielle du parcours est publiée à J-30.

#### Article 8 — Grille et constitution des poules
- La grille de chaque catégorie est publiée à la révélation (11:35) et sur la page de scores.
- Les poules sont constituées par placement serpentin (section 11.5). Open : A = 1, 8, 9, 16 ; B = 2, 7, 10, 15 ; C = 3, 6, 11, 14 ; D = 4, 5, 12, 13. Féminines : E = 1, 4, 5, 8 ; F = 2, 3, 6, 7.
- La pole de chaque catégorie reçoit le trophée de la pole et choisit, à la révélation, le terrain de ses 3 matchs de poule. Dans les autres poules, l'équipe la mieux placée joue sur le terrain central.

#### Article 9 — Règles des matchs
**9.1 Règles applicables.** Les **Règles officielles du jeu 3x3 de la FIBA** en vigueur à la date du tournoi s'appliquent (version 2026 au jour de la rédaction, en vigueur depuis le 1er janvier 2026 [S-G1-01] ; texte officiel à citer avec sa version et sa date dans le règlement publié). Les arbitres et officiels de table sont briefés sur la version applicable, notamment sur la règle du check-ball modifiée en 2026 [S-G1-02].

**9.2 Adaptations propres à LA GRILLE.**

| Sujet | Poules | Phases finales |
|---|---|---|
| Fin du match | 8 minutes de temps de jeu **ou** 15 points (victoire immédiate) | 10 minutes **ou** 21 points |
| Chronomètre | Temps courant ; arrêté seulement sur décision de l'arbitre (blessure, incident) | Temps courant ; arrêté sur ballon mort pendant la dernière minute |
| Temps morts | Aucun | Un temps mort de 30 secondes par équipe |
| Égalité à la fin du temps | Prolongation : la première équipe qui marque 2 points gagne | Idem |
| Horloge des tirs | Selon les règles FIBA ; à défaut d'afficheur, l'officiel de table annonce à voix haute les 5 dernières secondes | Idem |

**9.3 Équipe incomplète.** Une équipe doit présenter 3 joueurs au début du match. Une équipe qui ne peut plus aligner 3 joueurs perd le match par forfait ; elle reste classée et dispute les matchs suivants si elle présente de nouveau 3 joueurs.

**9.4 Retard du programme.** Si le retard dépasse 30 minutes, les matchs de poule restants passent à 7 minutes ou 13 points. Cette règle est rappelée au briefing des capitaines.

#### Article 10 — Classement des poules
Une victoire par forfait compte comme une victoire.
1. Nombre de victoires.
2. Deux équipes à égalité : résultat de leur match.
3. Trois équipes ou plus à égalité : victoires dans les matchs entre elles ; puis moyenne de points marqués par match, matchs gagnés ou perdus par forfait exclus ; puis **meilleure place sur la grille**.

#### Article 11 — Phases finales
- Open : les 2 premiers de chaque poule. Quarts de finale A1–C2, D1–B2, B1–D2, C1–A2 ; demi-finales entre vainqueurs du même côté du tableau (A1–C2 contre D1–B2, B1–D2 contre C1–A2) ; finale sur le terrain central.
- Féminines : les 2 premières de chaque poule. Demi-finales E1–F2 et F1–E2 ; finale sur le terrain central.
- Pas de match pour la 3e place.

#### Article 12 — Forfaits et retards
- Une équipe absente du pit wall **2 minutes** après l'heure de début de son créneau perd le match par forfait.
- Deux forfaits : retrait du tournoi ; ses matchs restants sont perdus par forfait.
- Forfait avant le début de Q1 : remplacement par la liste d'attente, qui reprend la place de l'équipe dans l'ordre de passage. Forfait après Q1 : pas de remplacement ; la poule se joue à 3.
- Aucun remboursement en cas de forfait ou d'exclusion.

#### Article 13 — Arbitrage et réclamations des matchs
- Chaque match est dirigé par un arbitre, assisté d'un officiel de table. Les décisions de fait de l'arbitre sont sans appel.
- Le score est validé à la fin du match par la signature des deux capitaines sur la feuille de match.
- Les réclamations administratives (éligibilité d'un joueur, composition) sont déposées par un capitaine avant le match suivant de l'équipe concernée et tranchées par le responsable compétition. Sa décision est définitive.

#### Article 14 — Comportement
- Respect des adversaires, des arbitres, des juges, des bénévoles et du public.
- Insultes, violences, propos ou gestes discriminatoires : exclusion du match par l'arbitre, puis exclusion du tournoi par le responsable compétition, sans remboursement.
- Alcool interdit aux participants pendant la compétition ; buvette sans alcool.
- Il est interdit aux joueurs, arbitres, juges, bénévoles et organisateurs de parier sur le tournoi (clause de prudence).
- L'organisation peut exclure toute personne mettant en danger la sécurité d'autrui.

#### Article 15 — Santé et sécurité
**15.1 Conditions médicales** (point C-08, à arrêter à J-60 selon le cadre retenu) :
- **Tournoi homologué par la FFBB** : application des règles fédérales (licence en cours de validité ou Pass Tournoi 3x3 et ses conditions) [S-G1-09] (à revérifier).
- **Tournoi non officiel** (cas par défaut) : chaque joueur majeur atteste sur l'honneur l'absence de contre-indication à la pratique du basket en compétition (le questionnaire de santé du sport adulte est recommandé) ; pour les 16–17 ans, un titulaire de l'autorité parentale atteste que le questionnaire de santé du mineur a été rempli avec des réponses toutes négatives, à défaut un certificat médical est fourni. **Aucun questionnaire ni document médical détaillé n'est collecté** : seule l'attestation est conservée. Références : Code du sport, article L231-2-1 [S-G1-47] ; ministère des Sports [S-G1-48] (à revérifier, l'application à un tournoi non fédéral n'étant pas littérale).

**15.2 Sécurité des participants.** Chaussures de salle obligatoires ; bijoux interdits ; échauffement avant Q1 ; eau gratuite au pit wall. Un dispositif de secours dimensionné par une association agréée est présent toute la journée ; un joueur retiré par les secouristes ne reprend pas sans leur accord.

**15.3 Assurance.** L'organisateur est couvert par une assurance de responsabilité civile. Les participants sont invités à vérifier leur propre couverture individuelle accident.

#### Article 16 — Droit à l'image
- La journée est photographiée et filmée par l'organisation pour ses supports (site, réseaux sociaux, presse, bilan aux partenaires). Cette information est affichée à l'entrée et rappelée à l'inscription.
- Chaque joueur indique **individuellement** à l'inscription s'il accepte la diffusion de son image. Un **bracelet rouge « pas d'image »** est remis à ceux qui refusent ; l'organisation ne publie aucune image où ils sont identifiables.
- Joueurs de 16–17 ans : autorisation d'image signée par les titulaires de l'autorité parentale (l'accord des deux parents est recherché) et recueil de l'avis du mineur [S-G1-50] (à revérifier).
- Toute utilisation d'une image par un partenaire (publicité) exige un consentement exprès distinct.
- Durée d'utilisation : 3 ans ; retrait du consentement possible à tout moment pour les publications futures.

#### Article 17 — Données personnelles
- Responsable du traitement : l'association organisatrice. Contact : [adresse dédiée].
- Finalités : gestion des inscriptions et du jour J ; publication des résultats (nom d'équipe, temps, scores) ; Grille Series et passeport d'équipe ; information sur les éditions suivantes (avec accord).
- Données : identité, date de naissance (contrôle d'âge, jamais publiée), contacts du capitaine, attestations (oui/non), choix relatifs à l'image.
- Conservation proposée (à valider) : attestations et autorisations jusqu'à J+30 ; données d'inscription 3 ans après l'édition pour la Grille Series, sauf opposition ; données du jeu de prédiction 1 mois après la remise du lot.
- Droits d'accès, de rectification, d'opposition et d'effacement exercés à l'adresse ci-dessus. Recommandations de la CNIL pour le sport amateur [S-G1-49].

#### Article 18 — Grille Series et passeport d'équipe
- Classement cumulé d'une édition à l'autre, par catégorie, publié avant chaque édition avec son barème. Barème de référence :

| Résultat | Points |
|---|---|
| Place de grille 1 / 2 / 3 / 4 | 10 / 8 / 7 / 6 |
| Place de grille 5 / 6 / 7 / 8 | 5 / 4 / 3 / 2 |
| Place de grille 9 et 10 (Open) | 1 |
| Vainqueur / finaliste | 30 / 22 |
| Demi-finaliste / quart de finaliste (Open) | 16 / 10 |
| 3e / 4e de poule | 6 / 4 |
| Participation (au moins un run et un match joués) | 2 |
| Meilleur temps de Q1 de la catégorie (badge « Meilleur Q1 ») | 2 |

- Une équipe garde ses points d'une édition à l'autre si elle conserve son nom et au moins 2 joueurs de l'édition précédente.
- Égalité au classement : nombre de victoires finales, puis meilleur résultat final, puis meilleure place de grille.
- Passeport d'équipe : page publique avec nom d'équipe, temps, places, résultats et photos autorisées.

#### Article 19 — Prédiction gratuite de la pole
- **Gratuite, sans achat et sans billet** : accessible depuis la page web publique (QR code affiché sur place, lien publié en ligne).
- Une prédiction par personne et par catégorie : l'équipe qui prendra la pole. Ouverture à la publication des 4 qualifiés pour Q3 ; clôture au premier départ de la Q3 de la catégorie.
- Exclus : membres du bureau, juges, arbitres et organisateurs. Les mineurs participent avec l'accord d'un représentant légal, à qui le lot est remis.
- Tirage au sort parmi les bonnes réponses, par le logiciel de la régie, devant le responsable compétition, pendant la révélation. Sans bonne réponse : pas de tirage.
- Dotation : lot en nature d'un partenaire ; nature et valeur indiquées dans le règlement complet du jeu, publié et affiché.
- Cadre légal : les loteries sont interdites par principe (Code de la sécurité intérieure, articles L322-1 et L322-2) [S-G1-46] (à revérifier). Le jeu étant gratuit et ouvert sans achat, l'organisation considère qu'il ne relève pas de cette interdiction : **ce point et le règlement du jeu doivent être validés par un juriste avant publication** (point C-13).

#### Article 20 — Concours public « Ta place sur la grille »
- Gratuit, ouvert à tous, pendant la pause sur le terrain 2. Parcours simplifié : slalom des 5 plots et tir à l'intérieur de l'arc ; temps plafonné à 45 secondes ; pas de haies.
- Catégories : moins de 12 ans (accompagnés d'un adulte), 12–15 ans, 16 ans et plus. Un essai par personne, un second si le temps le permet.
- Chronométrage manuel par un bénévole ; classement à l'écran. Lots symboliques identiques pour chaque catégorie.
- Chaussures adaptées obligatoires ; encadrement par deux bénévoles.

#### Article 21 — Modification, annulation, force majeure
L'organisateur peut modifier le programme pour des raisons de sécurité, de retard ou d'effectif. En cas d'annulation du tournoi par l'organisateur, les inscriptions sont intégralement remboursées. L'organisateur n'est pas responsable des objets perdus ou volés.

Dotations : trophées et lots en nature uniquement, aucune dotation en argent. Leur valeur totale reste inférieure au seuil au-delà duquel une manifestation ouverte aux licenciés doit être autorisée par la fédération délégataire (Code du sport, article L331-5 [S-G1-51], à revérifier).

### 12.3 Départage par étape (synthèse)

| Étape | Critère 1 | Critère 2 | Critère 3 |
|---|---|---|---|
| Q1 Open, Q1 Féminines | Moins de pénalités | Meilleur temps brut | Temps réalisé le premier |
| Q2 Open | Moins de pénalités | Temps retenu Q1 | Temps réalisé le premier |
| Q3 Open, Q3 Féminines | Moins de pénalités | Temps retenu de la manche précédente | Temps réalisé le premier |
| Poules | Victoires | Confrontation directe (2 équipes) ; victoires entre elles puis moyenne de points (3 et plus) | Meilleure place sur la grille |
| Tableaux finals | Élimination directe ; prolongation « premier à 2 points » | — | — |
| Grille Series | Victoires finales | Meilleur résultat final | Meilleure place de grille |

### 12.4 Mécaniques de participation et notes d'équité

| Mécanique | Rôle visé | Description | Note d'équité |
|---|---|---|---|
| Prédiction gratuite de la pole | Spectateur (et tout public en ligne) | Désigner l'équipe en pole avant Q3 ; tirage parmi les bonnes réponses | Gratuit, sans achat ni billet, règlement publié, aucune mise d'argent, aucune influence sur le résultat sportif, exclus les personnes ayant une information privilégiée |
| Grille Series | Participant | Points de grille et de classement final cumulés d'une édition à l'autre ; badges « Pole » et « Meilleur Q1 » | Barème publié avant l'édition, identique pour toutes les équipes ; aucune mécanique payante ; aucun point « bonus » à l'achat |
| Passeport d'équipe | Participant | Page d'équipe conservée d'une édition à l'autre | Données limitées au nom d'équipe et aux résultats ; photos selon consentement |
| Concours « Ta place sur la grille » | Spectateur | Parcours simplifié chronométré pendant la pause | Gratuit, catégories d'âge, lots symboliques identiques |

Interdits de conception : pas de compte à rebours artificiel, pas de rareté inventée, pas de classement public des spectateurs par dépense, pas de récompense conditionnée à une publication sur les réseaux sociaux.

### 12.5 Test de compréhension

| Date | Personnes extérieures | Temps moyen de lecture de 12.1 | Erreurs relevées | Correction |
|---|---|---|---|---|
| À réaliser avant J-75 | 5 joueurs non initiés + 5 parents | Cible : moins de 2 minutes | — | — |

---

## 13. Programme détaillé

Cette section donne la vue d'ensemble de la journée et de la veille, la logique de rythme et les temps forts. Le détail minute par minute, avec les responsables et les tops, est le conducteur généré de la section 27 : **en cas d'écart, le conducteur fait foi**. Les heures citées ici sont les repères de conception d'event.json v0.2.0 [S-G2-01].

### 13.1 La veille (J-1)

| Créneau (repère) | Ce qui est fait | Responsable | Résultat attendu à 21:30 |
|---|---|---|---|
| 18:00 – 18:30 | État des lieux d'entrée contradictoire avec l'exploitant (photos datées du sol, des murs, du matériel du lieu) ; remise des clés et badges ; repérage des issues, du DAE, des tableaux électriques | Responsable logistique | PV d'état des lieux signé |
| 18:30 – 20:30 | Traçage des terrains T1 et T2 à l'adhésif compatible parquet, traçage des deux stations de qualification (annexes/reglement-parcours-qualification.md), pose de la grille au sol (PH) | Responsable logistique + responsable compétition | Terrains et stations contrôlés au mètre, fiche de contrôle signée |
| 19:30 – 21:00 | Montage de l'écran de la grille et de sa structure, PLV, barrières de la zone debout, balisage de l'allée AL | Responsable logistique + régisseur | Écran monté (non câblé si le matériel ne peut pas rester la nuit), allée libre |
| 21:00 – 21:30 | Tour de contrôle (issues dégagées, câbles protégés, rien dans l'aire de jeu), fermeture | Directeur de l'événement | Liste de contrôle J-1 cochée (annexes/checklist-jour-J-la-grille.md) |

La séquence de montage complète et son chemin critique sont en section 25.

### 13.2 Le jour J en six actes

| Acte | Créneau (repère v0.2.0) | Ce qui se joue | Temps fort | Pourquoi à ce moment |
|---|---|---|---|---|
| 0. Mise en route | 07:00 – 09:30 | Montage J, tests son, vidéo, chronométrage et page de scores | Test complet de la chaîne « run → temps → écran → page web » | Tout ce qui est critique doit être éprouvé avant l'arrivée du premier public |
| 1. Accueil | 09:00 – 10:00 | Accueil des équipes (contrôles, bracelets, numéros), ouverture des portes, briefing des capitaines au pit wall | Remise du numéro provisoire à chaque équipe | Les équipes arrivent avant le public ; deux files séparées dans le hall |
| 2. Les qualifications | 10:00 – 11:35 | Démonstration du parcours, Q1 Open et Féminines sur deux stations, Q2 Open, Q3 Féminines puis Q3 Open une par une sur T1 | Q3 : la dernière équipe qui arrache la pole | Le matin, habituellement creux, devient un crescendo : de 16 équipes en parallèle à 4 équipes seules face au public |
| 3. La grille | 11:35 – 13:00 | Révélation animée de la grille, placement serpentin en poules, remise du trophée de la pole, pause et concours public « Ta place sur la grille » | La révélation sur écran | Le climax du matin tombe juste avant le déjeuner : le public reste, la buvette travaille |
| 4. Les poules | 13:00 – 17:00 | 36 matchs sur deux terrains, puis show de mi-parcours et annonce du tableau final | La pole joue sur le terrain qu'elle a choisi ; show de mi-parcours | Long plateau de jeu, ponctué par l'affichage en direct ; le show sert aussi de tampon (section 27) |
| 5. Le dénouement | 17:00 – 19:10 | Quarts Open, demi-finales, entracte avec entrée des finalistes par numéro de grille, finales sur T1, podiums et photo sur la grille | Entrée des finalistes, tirs au buzzer, photo officielle sur la grille | Escalade continue vers les finales au moment du pic de présence simulé (section 32) |
| 6. Restitution | 19:10 – 21:00 | Démontage, nettoyage, état des lieux de sortie | — | Fenêtre de démontage négociée avec le lieu (section 25) |

### 13.3 Logique de rythme

1. **Matin en entonnoir.** Q1 fige les places basses, Q2 les places intermédiaires, Q3 attribue le haut de la grille. À chaque manche, il y a moins d'équipes, plus de tension et plus d'attention sur chacune. Le passage de deux stations en parallèle à une seule équipe sur T1 est le principal ressort dramatique.
2. **Un temps fort par séquence, jamais deux en même temps.** Q3, la révélation, le show de mi-parcours, l'entrée des finalistes et les finales sont placés l'un après l'autre, sur T1 ou devant l'écran, pour que le public, le speaker et la caméra regardent tous au même endroit.
3. **Le show de mi-parcours est à la fois un temps fort et un tampon.** Il absorbe le retard des poules avant le tableau final. Il se raccourcit en premier (section 27).
4. **La finale Féminines précède la finale Open.** C'est le choix d'event.json. Il est discutable (perception d'une hiérarchie) : alterner l'ordre d'une édition à l'autre est une décision ouverte (section 40).

### 13.4 Temps morts à surveiller

- **Entre deux matchs de poule.** Les poules comptent trois tours. Chaque tour occupe six créneaux sur deux terrains (tableau de compétition, section 27). Une équipe joue donc une fois par tour et attend en moyenne cinq créneaux entre deux matchs. C'est la principale faiblesse d'expérience relevée par l'évaluation. Réponses prévues : heure du prochain match de chaque équipe affichée en continu sur l'écran et la page web ; appel des équipes un créneau à l'avance au pit wall ; ordre des matchs construit pour égaliser les attentes entre équipes. À tester : un défi d'habileté libre pour les équipes en attente, s'il existe un panier disponible hors des deux terrains.
- **Pour le public du matin.** Les qualifications occupent toute la matinée (de Q1 à Q3 au conducteur). Le compte à rebours sonore avant chaque run, l'affichage des temps sur l'écran et les commentaires du speaker évitent l'effet « entraînement ».
- **Pendant la pause.** Le concours public occupe T2. T1 reste libre pour l'échauffement encadré des équipes.

### 13.5 Points de vigilance du programme

- **Accueil des équipes et ouverture des portes se chevauchent dans le hall** (09:30 – 09:45). Il faut deux files distinctes : équipes d'un côté, public de l'autre. Sinon, une seule file sert à la fois la vente, le contrôle et le check-in, une erreur fréquente en tournoi associatif.
- **Q1, Q2, les poules et les phases finales occupent les deux terrains** (« T1 + T2 » au conducteur). Le pupitre de chaque station (juges, chronomètres) doit figurer dans la liste de contrôle de chaque terrain.
- **Le démontage se termine à l'heure limite de la fenêtre négociée.** Un retard sur les finales se reporte directement sur la restitution du lieu (sections 25 et 27).

### 13.6 Programme public simplifié (affiche, page web)

| Heure | Au programme |
|---|---|
| 09:30 | Ouverture des portes |
| 10:00 | Lancement et démonstration du parcours |
| 10:10 | Qualifications Q1 et Q2 sur deux stations |
| 11:05 | Q3 : les quatre meilleures équipes, une par une, pour la pole |
| 11:35 | Révélation de la grille de départ |
| 11:50 | Pause et concours « Ta place sur la grille » (ouvert au public) |
| 13:00 | Matchs de poule sur deux terrains |
| 16:36 | Show de mi-parcours et annonce du tableau final |
| 17:00 | Quarts, demi-finales, puis finales (Féminines, puis Open) |
| 18:50 | Podiums et photo officielle sur la grille |

Mention à ajouter sur l'affiche : « Horaires indicatifs, susceptibles d'ajustement le jour même ; horaires en direct sur la page de résultats (QR code). »

---

## 14. Parcours utilisateurs

Simulation des flux d'entrée et de la pointe de présence (simulation indicative de dimensionnement — ne remplace pas l'avis du chargé de sécurité) :

<!-- @gen:flows -->

Lecture : une file de contrôle des billets QR et une file de paiement sur place suffisent dans les trois scénarios ; la pointe de présence intervient pendant les finales. La cible d'attente à l'entrée est de 10 minutes au plus (KPI K05).

### 14.1 Spectateur

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Découverte | Réseaux sociaux, affiche, club du joueur | Format mal compris (« des qualifs au basket ? ») | Vidéo verticale de 20 s en trois plans ; « les règles en deux minutes » | Responsable communication | K03 |
| Avant | Billet | Billetterie en ligne (QR) | Création de compte, frais, achat « au dernier moment » | Billet sans compte ; achat sur place possible (file B) ; gratuité moins de 12 ans affichée partout | Accueil public et billetterie | K05 |
| Avant | Infos pratiques (J-10) | Page infos, e-mail aux acheteurs | Accès, stationnement, PMR, horaires des moments forts | Page unique : accès, PMR sur réservation, horaires de Q3, révélation et finales, buvette sans alcool, eau gratuite | Référent accessibilité | — |
| Pendant | Arrivée | Entrée E1, files A et B | Attente au pic d'arrivée | Panneau d'entrée (SIG-01), relevé de l'attente toutes les 30 min, file prioritaire A | Responsable accueil | K05 |
| Pendant | Orientation | Signalétique, programme d'une page | Deux terrains, où regarder ? | Écran de la grille, speaker, page de scores en direct (QR) | Orientation et placement | — |
| Pendant | Matin | Q1, Q2, Q3, révélation | Peu de monde avant 11 h ; runs courts difficiles à suivre | Horaires fixes de Q3 (11:05, 11:20) et de la révélation (11:35) annoncés partout ; prédiction gratuite | Speaker | K03 |
| Pendant | Pause | Buvette, food trucks, concours public | File unique à 12:00 | 2 caisses, food trucks à l'extérieur, gobelets consignés, eau gratuite | Responsable buvette | K10 |
| Pendant | Poules | Deux terrains, écran, page de scores | Suivre deux matchs en même temps | Scores en direct à l'écran et sur la page ; annonces du speaker à chaque fin de match | Régisseur | — |
| Pendant | Finales | Terrain central, zone debout | Pointe de présence, places assises saturées, chaleur | Zone debout délimitée, comptage entrées-sorties, fermeture des entrées à 95 % de l'effectif, retransmission dans le hall (R-01) | Directeur de l'événement | K03 |
| Pendant | Départ | Hall, sortie | Sortie groupée après les podiums | Annonce de fin, sortie par l'entrée principale, issues de secours toujours dégagées | Responsable accueil | — |
| Après | Souvenirs | Album photo, page de résultats | Photos où l'on ne se trouve pas ; images de personnes ayant refusé | Album public à J+1, respect des bracelets « pas d'image » | Responsable communication | K07 |
| Après | Retour d'expérience | Questionnaire court (J+1) | Faible taux de réponse | 5 questions, lien sur le billet électronique | Responsable communication | KPI spectateurs à créer |

### 14.2 Participant

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Découverte | Club, Instagram, TikTok, bouche-à-oreille | « Pourquoi 60 € ? » | Au moins 1 run et 3 matchs, photo d'équipe, points Grille Series, prix sous les références comparables (section 5.7) | Responsable communication | K01 |
| Avant | Inscription | Formulaire mobile (section 22) | Quatre joueurs à saisir, documents des 16–17 ans | Formulaire en 4 étapes, modèle d'autorisation fourni, dépôt différé possible jusqu'à J-7 | Responsable compétition | K01 |
| Avant | Préparation | Vidéo officielle du parcours (J-30), règlement | Parcours inconnu, peur d'être ridicule | Vidéo commentée, cotes du parcours publiées pour s'entraîner | Responsable compétition | K06 |
| Avant | Confirmation (J-3) | E-mail et SMS au capitaine | Oubli de confirmation | Rappels à J-7 et J-4 ; liste d'attente activée à J-3 | Responsable compétition | — |
| Pendant | Accueil 09:00 | Hall, accréditations | File au contrôle | Documents vérifiés en amont ; contrôle en 2 minutes par équipe ; bracelets par équipe | Accueil équipes et accréditations | — |
| Pendant | Briefing 09:45 | Pit wall | Règles mal comprises | Briefing de 15 min, fiche capitaine d'une page, reconnaissance à pied | Responsable compétition | K06 |
| Pendant | Qualifications | Stations A et B, terrain central | Sentiment d'inéquité entre stations | Kits contrôlés au mètre, changement de station en Q2, deux juges, réclamation en 5 min | Responsable compétition | K06 |
| Pendant | Révélation | Écran, zone photo | Équipes classées 11 à 16 démotivées | Elles jouent 3 matchs comme les autres ; photo sur leur numéro ; points de participation | Speaker | K09 |
| Pendant | Poules | Pit wall, terrains | 60 minutes d'attente entre deux matchs | Créneau fixe connu dès 11:50, heure du prochain match en direct, appel un créneau à l'avance, eau et zone de repos | Responsable compétition | K04 |
| Pendant | Incident | Poste de secours | Blessure, équipe incomplète | Secouristes sur place, remplaçant, règle de l'équipe incomplète (art. 9.3) | Responsable compétition | — |
| Pendant | Finales, podiums | Terrain central, zone photo | Seuls les vainqueurs récompensés | Trophée de la pole, badge Meilleur Q1, photo officielle pour toutes les équipes présentes | Speaker | K06 |
| Après | Résultats | Page de résultats, passeport d'équipe | Résultats tardifs | Résultats publiés le soir même, passeport à J+14 | Responsable communication | — |
| Après | Retour | Questionnaire J+1 | — | Satisfaction et intention de réinscription | Responsable communication | K06, K09 |

### 14.3 Bénévole

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Recrutement (J-100 à J-21) | Club, mairie, plateformes de bénévolat | Rôle flou, crainte de rester à la buvette toute la journée | Fiches de poste d'une page ; rotations ; objectif de recrutement de {{summary.volunteers}} bénévoles + 20 % | Responsable bénévoles | R-13 (seuil J-14) |
| Avant | Planning (J-7) | E-mail, groupe de messagerie | Horaires inconnus | Planning par créneau, contacts par fonction | Responsable bénévoles | — |
| Avant | Formation | Réunion à J-7 | Juges non formés au parcours | 30 min de formation des juges sur une station montée ; fiche des pénalités | Responsable compétition | K04 |
| Pendant | Arrivée | Hall, 07:00 ou selon créneau | Ne pas savoir à qui s'adresser | Point d'accueil bénévoles, signe distinctif, repas prévu | Responsable bénévoles | — |
| Pendant | Poste | Selon fiche | Fatigue (montage la veille + journée) | Équipes de montage distinctes de l'équipe du jour ; pauses planifiées | Responsable bénévoles | — |
| Pendant | Voir le jeu | — | Bénévoles de buvette qui ne voient rien | Rotation pour assister à Q3 ou à une finale | Responsable bénévoles | — |
| Après | Reconnaissance | Message J+1, photo d'équipe, attestation de bénévolat | Oubli des remerciements | Remerciements nominatifs (avec accord), invitation au bilan de J+30 | Directeur de l'événement | KPI bénévoles à créer |

### 14.4 Partenaire

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Premier contact (J-100) | Appel, rendez-vous, dossier (section 31) | Retombées incertaines | Contreparties mesurables, scénario d'audience prudent annoncé | Référent partenaires et invités | — |
| Avant | Signature (avant J-60 pour le titre) | Convention de parrainage | Délais de décision | Calendrier aligné sur les go/no-go ; acompte à la signature | Référent partenaires et invités | K02 |
| Avant | Visuels (J-45 à J-30) | Logo vectoriel, bon à tirer | Fichier inutilisable, retard | Demande du logo vectoriel dès la signature ; BAT validé à J-30 | Responsable communication | — |
| Pendant | Installation | Zone partenaires (SP), 07:00–08:30 | Arrivée tardive, besoin électrique non prévu | Créneau d'installation, réceptionnaire nommé, besoins électriques déclarés à J-14 | Référent partenaires et invités | — |
| Pendant | Temps fort | Q3, trophée de la pole, concours public | Prise de parole trop longue ou mal placée | Texte de 30 secondes préparé, top dans le conducteur | Speaker | — |
| Pendant | Invités | Accueil, places, pit wall pendant les finales | Présence au pit wall gênante pour les équipes | Accès au pit wall accompagné, 2 personnes au maximum, hors zone d'appel | Référent partenaires et invités | — |
| Après | Bilan (J+7) | Bilan de visibilité chiffré | Chiffres non mesurés | Relevés prévus dès J-30 (section 31.8) | Référent partenaires et invités | K07 |
| Après | Renouvellement (J+30) | Rendez-vous | — | Proposition pour l'édition suivante avec priorité | Directeur de l'événement | — |

### 14.5 Journaliste et créateur de contenu

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Information | Communiqué (J-90, J-21) | Sujet perçu comme un tournoi de plus | Angle : « le matin n'est plus un temps mort » ; histoires de joueuses et de bénévoles | Responsable communication | — |
| Avant | Accréditation (J-14) | Formulaire court | — | Fiche presse avec les horaires exacts des moments forts | Responsable communication | — |
| Pendant | Accueil | Hall | Ne pas savoir où se placer | Zones de tournage définies, hors des dégagements de 2 m autour des terrains | Responsable communication | — |
| Pendant | Moments forts | Q3, révélation, finales | Moments ratés, gêne pour les joueurs | Horaires garantis à 5 minutes près ; pas de flash pendant les runs ; pas de tournage dans les stations | Régisseur | — |
| Pendant | Interviews | Pit wall entre deux créneaux | Joueurs sollicités avant leur match | Interviews après le match, jamais pendant l'appel | Responsable compétition | — |
| Après | Matériel | Photos haute définition, résultats | Images de personnes ayant refusé | Sélection respectant les consentements ; résultats publiés le soir | Responsable communication | K07 |

### 14.6 Prestataire (sono, vidéo, chronométrage, secours, sécurité, arbitrage)

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Devis et réservation (J-60 à J-30) | Demande écrite | Engagement avant le go/no-go | Devis à J-60, commande après go ; conditions d'annulation demandées | Directeur de l'événement | K02 |
| Avant | Fiche technique (J-14) | Plan d'implantation, puissance, horaires | Prises insuffisantes, accès inconnu | Relevé du lieu à J-90 (prises, paniers, accès technique TECH) | Responsable logistique | — |
| Pendant | Livraison et montage | Accès technique, J-1 18:00 et J 07:00 | Réceptionnaire absent | Réceptionnaire nommé par livraison, plan de déchargement | Responsable logistique | — |
| Pendant | Tests 08:30 | Régie | Panne découverte trop tard | Test complet son, écran, chronométrage, page de scores ; plan B prêt (R-06, R-07) | Régisseur | K04 |
| Pendant | Exploitation | Contact radio ou téléphone | Consignes contradictoires | Un seul donneur d'ordre par fonction, conducteur partagé | Directeur de l'événement | — |
| Après | Démontage | 19:10–21:00 | Dépassement de la fenêtre du lieu | Ordre de démontage écrit, inventaire de retour | Responsable logistique | — |

### 14.7 Invité VIP (élus, partenaires institutionnels)

| Phase | Étape | Point de contact | Friction anticipée | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|
| Avant | Invitation (J-30) | Courrier ou e-mail | Agenda chargé, venue au mauvais moment | Deux créneaux conseillés : 11:15–11:50 (Q3 et révélation) ou 18:00–19:10 (finales et podiums) | Référent partenaires et invités | — |
| Pendant | Accueil | Hall | Attente, absence d'interlocuteur | Accueil par le référent, places réservées | Référent partenaires et invités | — |
| Pendant | Prise de parole | Podiums | Discours longs qui cassent le rythme | Une prise de parole de 2 minutes maximum, au podium ; remise de trophées | Speaker | K04 |
| Après | Suivi | Remerciements, bilan (J+30) | — | Bilan prévu/réel transmis aux financeurs | Directeur de l'événement | K08 |

### 14.8 Temps morts estimés

| Rôle | Présence | Temps sans activité ni spectacle | Part estimée | Mesure corrective |
|---|---|---|---|---|
| Spectateur (présence moyenne de 3 h) | 180 min | Transitions de 3 min entre les manches du matin ; aucune après 13:00 (deux terrains en continu, show de mi-parcours) | Estimation : moins de 5 % | Chaque transition nommée dans le conducteur ; musique et speaker |
| Participant (09:00 à 19:10) | 610 min | 60 min entre deux matchs de poule (deux fois) et pause de midi, occupées par le spectacle des autres équipes | Estimation : 30 à 40 % sans jouer, mais sous spectacle | Heure du prochain match en direct ; zone de repos ; piste d'un défi d'habileté libre si un espace le permet |
| Bénévole | Selon créneau | Faible (postes en continu) | — | Rotations pour voir les moments forts |

---

## 15. Identité visuelle

### 15.1 Concept graphique : « la grille au sol »

L'identité part d'un objet réel de l'événement : **les emplacements numérotés tracés à l'adhésif sur le parquet**, où chaque équipe se photographie à sa place. Tout en découle :

- **la marque** : neuf emplacements décalés en trois colonnes, le premier (la pole) en jaune ;
- **les numéros de grille**, en capitales lourdes à deux chiffres (01, 07, 16), qui suivent l'équipe toute la journée ;
- **le chrono**, en chiffres à chasse fixe au centième, héros du matin ;
- **un contraste fort** : asphalte et craie, un seul accent chaud (orange signal), le jaune réservé à la pole et aux temps.

Les codes du sport automobile ne sont utilisés que comme **codes génériques** et avec parcimonie : la notion de grille et de pole, une bande de damier limitée à la ligne d'arrivée du parcours. Aucune référence graphique à une écurie, une ligue, un circuit ou un constructeur.

### 15.2 Éléments

| Élément | Description | Fichier | Auteur | Droits |
|---|---|---|---|---|
| Marque (grille 3x3 décalée) | 9 emplacements de 40 × 24 unités, rayon 5, pas de 50 × 34, décalage de colonne de 12 | assets/identite/logo-*.svg, icone.svg | EVENT LAB | Création interne ; licence d'usage à l'association à formaliser |
| Mot-symbole et pastille 3x3 | « LA GRILLE » en Archivo Black ; pastille orange à texte asphalte | idem | EVENT LAB | Idem ; police sous licence libre à confirmer (section 18) |
| Motif « rangée » | Rangée d'emplacements décalés, en bandeau de page ou en fond de visuel | à dériver de la marque | EVENT LAB | Création interne |
| Numéros de grille | 2 chiffres, Archivo Black, craie sur asphalte ou asphalte sur jaune (pole) | signaletique-numero-grille.svg | EVENT LAB | Création interne |
| Iconographie | Pictogrammes au trait de 4 à 6 unités, coins arrondis, formes simples (ballon, gobelet, WC, croix de secours, fauteuil) | signaletique-*.svg | EVENT LAB | Création interne ; les pictogrammes réglementaires de sécurité du lieu ne sont jamais redessinés |
| Style photo | Décrit en section 17 ; aucune banque d'images | — | Photographes de l'édition | Cession de droits à prévoir au contrat du vidéaste |

### 15.3 Règles d'usage et interdits

| Autorisé | Interdit |
|---|---|
| Fonds asphalte ou craie, aplats francs | Dégradés sur la marque, ombres portées, effets 3D, contours ajoutés |
| Orange en aplat, en pastille ou en texte sur fond asphalte | Orange en texte sur fond craie ou blanc (contraste de 2,75:1) |
| Jaune pour la pole, les chronos, le numéro 1 | Jaune pour du texte courant sur fond clair |
| Numéros de grille lisibles à 10 m | Noms d'équipes plus grands que les numéros sur la signalétique d'appel |
| Bande de damier sur la ligne d'arrivée du parcours | Damier en motif de fond, drapeaux, silhouettes de voitures, casques, livrées |
| Photos réelles de l'événement avec consentement | Images de banques montrant des athlètes célèbres, logos de ligues ou de marques non partenaires |

### 15.4 Exemples d'application

| Support | Principe de mise en page | Format |
|---|---|---|
| Affiche | Fond asphalte ; motif « rangée » en haut ; grand titre LA GRILLE 3x3 ; trois horaires clés (Q3, révélation, finales) ; prix ; QR code ; partenaires signés en pied | A3 et A2 portrait |
| Publication carrée | Numéro de grille géant + nom d'équipe + temps | 1080 × 1080 px |
| Format vertical | Chrono plein écran sur le run, incrustation finale « P1 » | 1080 × 1920 px |
| Signalétique | Section 19 | Voir tableau |
| Plaque d'équipe et dossard | Numéro de grille, catégorie, poule (SIG-02) | A3 paysage ; chasubles numérotées en option |

### 15.5 Fichiers sources

assets/identite/ : logo-principal.svg, logo-vertical.svg, logo-monochrome.svg, logo-inverse.svg, icone.svg (+ aperçus PNG), moodboard.svg, palette-typo.svg, signaletique-file-attente.svg, signaletique-numero-grille.svg, signaletique-orientation.svg, signaletique-pmr-secours.svg, signaletique-pit-wall.svg, maquette-live-mobile.svg, maquette-inscription.svg, maquette-ecran-grille.svg. Tous sont des créations originales d'EVENT LAB, sans élément de tiers.

---

## 16. Logo et déclinaisons

| Déclinaison | Fichier SVG | Aperçu PNG | Fonds autorisés | Taille minimale |
|---|---|---|---|---|
| Principale (horizontale) | logo-principal.svg | logo-principal-apercu.png | Craie, blanc, fonds clairs unis | 40 mm de large en impression ; 200 px à l'écran |
| Verticale | logo-vertical.svg | logo-vertical-apercu.png | Craie, blanc, fonds clairs unis | 25 mm de large ; 120 px |
| Monochrome | logo-monochrome.svg | logo-monochrome-apercu.png | Tout fond clair uni ; impression une couleur, gravure, tampon | 40 mm ; 200 px |
| Inversée (négatif) | logo-inverse.svg | logo-inverse-apercu.png | Asphalte, gris ligne, photos sombres peu chargées | 40 mm ; 200 px |
| Icône (avatar, favicon) | icone.svg | icone-apercu.png | Fond asphalte intégré ; recadrage carré ou rond | 32 px (traits épaissis pour les petites tailles) |

| Règle | Valeur |
|---|---|
| Zone de protection | Hauteur d'un emplacement de la marque (notée h, soit environ 1/5 de la hauteur de la marque) sur les quatre côtés |
| Proportions | Fixes ; mise à l'échelle homothétique uniquement |
| Pole | Toujours jaune (ou pleine en monochrome) ; jamais une autre case |
| Propriété | Création originale EVENT LAB (24/11/2026) ; dépôt de marque recommandé (section 3.6) ; licence d'usage à l'association organisatrice et aux licenciés |

**Interdits** : déformer, incliner, recolorer (sauf versions fournies), changer la police, ajouter un contour ou une ombre, placer la version principale sur fond sombre ou photo chargée, déplacer la pole, ajouter un élément (ballon, drapeau, flamme).

**Note de production.** Les fichiers SVG utilisent la police Archivo Black avec repli sur « Arial Black, sans-serif » et une longueur de texte fixée pour stabiliser la mise en page. **Avant impression ou diffusion aux licenciés, vectoriser les textes (conversion en contours) dans la police Archivo Black.** Les aperçus PNG de ce dossier ont été rendus avec une police de repli : ils servent à valider la composition, pas comme fichiers finaux.

---

## 17. Moodboard

Planche originale : assets/identite/moodboard.svg (formes, couleurs et typographie uniquement). **Aucune image protégée** n'est utilisée ; les ambiances photographiques sont décrites en mots, pour briefer photographe et scénographe.

| Ambiance | Description | Intention | Où dans l'événement |
|---|---|---|---|
| Parquet et lignes | Bois clair du gymnase, lignes peintes, adhésif mat posé à la main, reflets des projecteurs | Assumer le gymnase tel qu'il est, sans le déguiser | Terrains, grille au sol |
| Asphalte et craie | Fond sombre granuleux, traits blancs irréguliers, numéros tracés | Culture du playground, sans copier de marque | Fonds d'affiche, écran |
| Grille au sol vue en plongée | Emplacements décalés numérotés, équipes debout sur leur numéro, ombres courtes | L'image signature de chaque édition | Zone photo après la révélation, podiums |
| Chrono | Chiffres jaunes à chasse fixe, centièmes qui défilent, écart à la pole | Faire du temps un personnage | Écran pendant Q1–Q3, clips verticaux |
| Lumière de salle | Salle baissée si possible, un seul cône de lumière sur le terrain central, silence avant le départ | Dramaturgie de la Q3 sans artifice coûteux | Q3, entrée des finalistes |
| Énergie | Orange signal, ballon en mouvement, flou de bras au tir | L'unique accent chaud | Pastille 3x3, moments de jeu |
| Pit wall | Tableau magnétique, numéros à l'appel, équipes en attente | La coulisse visible du public | Zone équipes entre les terrains |
| Typographie | Capitales lourdes, phrases courtes, chiffres à chasse fixe | Lisible à 10 m, sur téléphone comme sur bâche | Tous supports |

**Style photo** : plans larges depuis la tribune (lecture de la grille), ras du sol au départ des runs, plans serrés sur les mains au tir et sur l'écran au moment du temps ; pas de flash pendant les runs ; pas de mise en scène artificielle des joueurs ; consentements respectés (bracelets rouges).

---

## 18. Palette chromatique et typographies

Planche : assets/identite/palette-typo.svg.

### 18.1 Couleurs

| Nom | HEX | RVB | CMJN (indicatif) | Usage |
|---|---|---|---|---|
| Asphalte | #121417 | 18, 20, 23 | 22, 13, 0, 91 | Fonds sombres, textes sur fonds clairs, traits de la marque |
| Craie | #F4F1EA | 244, 241, 234 | 0, 1, 4, 4 | Fonds clairs, textes sur fonds sombres |
| Orange signal | #FF5B1A | 255, 91, 26 | 0, 64, 90, 0 | Accent unique : pastille 3x3, appels à l'action, ballon |
| Jaune pole | #FFC629 | 255, 198, 41 | 0, 22, 84, 0 | Pole, numéro 1, chronos, flèches directionnelles |
| Bleu piste | #2D55E6 | 45, 85, 230 | 80, 63, 0, 10 | Informations pratiques, liens, bandeau QR |
| Gris béton | #8B9099 | 139, 144, 153 | 9, 6, 0, 40 | Textes secondaires sur fond sombre uniquement |
| Gris ligne | #3A3F47 | 58, 63, 71 | 18, 11, 0, 72 | Cartes, séparateurs, fonds secondaires |

Couleurs de sécurité (hors charte, valeurs à aligner sur la signalétique réglementaire du lieu) : vert secours #00843D avec blanc ; bleu accessibilité #0057B8 avec blanc.

CMJN : conversion mathématique depuis le RVB, à remplacer par les valeurs validées sur épreuve de l'imprimeur.

### 18.2 Contrastes mesurés

Ratios calculés par script avec la formule de luminance relative des WCAG 2.x [S-G1-53] (référence non consultée lors de la rédaction : formule à recontrôler avec un outil de mesure). Seuils AA : 4,5:1 pour le texte courant, 3:1 pour le grand texte.

| Texte | Fond | Ratio | AA texte courant | AA grand texte | Statut |
|---|---|---|---|---|---|
| Craie | Asphalte | 16,36:1 | oui | oui | Autorisé (AAA) |
| Asphalte | Craie | 16,36:1 | oui | oui | Autorisé (AAA) |
| Jaune pole | Asphalte | 11,74:1 | oui | oui | Autorisé (AAA) |
| Asphalte | Jaune pole | 11,74:1 | oui | oui | Autorisé (AAA) |
| Craie | Gris ligne | 9,39:1 | oui | oui | Autorisé (AAA) |
| Jaune pole | Gris ligne | 6,74:1 | oui | oui | Autorisé |
| Orange signal | Asphalte | 5,94:1 | oui | oui | Autorisé |
| Asphalte | Orange signal | 5,94:1 | oui | oui | Autorisé |
| Gris béton | Asphalte | 5,75:1 | oui | oui | Autorisé |
| Craie | Bleu piste | 5,24:1 | oui | oui | Autorisé |
| Blanc | Bleu accessibilité #0057B8 | 6,87:1 | oui | oui | Autorisé (signalétique PMR) |
| Blanc | Vert secours #00843D | 4,81:1 | oui | oui | Autorisé (signalétique secours) |
| Jaune pole | Bleu piste | 3,76:1 | non | oui | Grand texte uniquement |
| Gris béton | Craie | 2,84:1 | non | non | **Interdit** |
| Orange signal | Craie | 2,75:1 | non | non | **Interdit** (texte et éléments d'information) |
| Craie | Orange signal | 2,75:1 | non | non | **Interdit** |

Règle complémentaire : aucune information n'est portée par la seule couleur (catégories, statuts, pole) ; un libellé ou un pictogramme l'accompagne toujours.

### 18.3 Typographies

| Famille | Graisses | Usage | Licence | Redistribuable aux licenciés | Repli |
|---|---|---|---|---|---|
| Archivo Black | Une graisse (Black) | Titres, mot-symbole, numéros de grille | SIL Open Font License présumée [S-G1-54] — **à confirmer** | Oui si l'OFL est confirmée | Arial Black, sans-serif |
| Archivo | 400, 600, 800 | Texte courant, interfaces, signalétique | SIL Open Font License présumée [S-G1-55] — **à confirmer** | Idem | Arial, sans-serif |
| IBM Plex Mono | 400, 700 | Chronos, classements, scores (chiffres à chasse fixe) | SIL Open Font License présumée [S-G1-56] — **à confirmer** | Idem | Courier New, monospace |

Tailles minimales : texte courant 16 px à l'écran et 9 pt imprimé ; signalétique : section 19. Les licences n'ont pas pu être vérifiées en ligne lors de la rédaction ; elles doivent l'être avant toute diffusion du kit d'identité (paquet de licence).

---

## 19. Signalétique

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Les emplacements ci-dessous s'appuient sur l'implantation archétype (gymnase de 44 × 24 m, hypothèse H-01). La signalétique de sécurité du lieu (issues, extincteurs, consignes) n'est jamais masquée, déplacée ni remplacée.

### 19.1 Principes du système

1. **Le numéro de grille est la clé de lecture** : appel au pit wall, plaques d'équipe, grille au sol, écran, page de scores utilisent le même numéro.
2. **Un message par panneau**, en capitales Archivo Black pour le titre, Archivo pour le détail.
3. **Contrastes AA au minimum** (section 18.2) ; pictogramme systématique pour les services (secours, PMR, toilettes, buvette).
4. **Lisibilité vérifiée sur place** : chaque panneau est lu à sa distance d'usage par une personne extérieure pendant le montage (hauteur de lettres et de pose à ajuster ; aucune règle chiffrée n'a été vérifiée dans une source pour cette version).
5. **Fixations sans dommage** : pieds, barrières, lests ; adhésifs au sol compatibles avec le parquet sportif uniquement (contrainte du lieu) ; rien de fixé aux équipements de sécurité.

### 19.2 Plan de signalétique

| Id | Type | Espace (implantation archétype) | Message | Format | Support | Qté | Accessibilité | Fixation | Pose / dépose |
|---|---|---|---|---|---|---|---|---|---|
| SIG-01 | Information, flux | Entrée E1 et hall | « ENTRÉE » ; file A billet QR et accès prioritaire ; file B achat sur place ; 5 € la journée, gratuit moins de 12 ans ; QR de la page de scores | 600 × 900 mm | PVC 5 mm | 2 | Craie/asphalte et craie/bleu ; mention de l'accès prioritaire | Pied lesté | Accueil public, J 07:00 / 19:10 |
| SIG-02 | Compétition | Pit wall puis zone photo | Numéro de grille, catégorie, poule, temps retenu, nom d'équipe | A3 paysage (420 × 297 mm) | Carton plume ou PVC 3 mm, numéros réinscriptibles | 24 + 4 de réserve | Numéro de 190 mm de haut | Posé ou tenu | Accueil équipes |
| SIG-03 | Scénographie | Zone photo PH (11 × 4 m) | Grille au sol : 16 emplacements numérotés en deux rangées décalées | Emplacements d'environ 1,20 × 1,60 m, numéros de 50 cm | Adhésif sol compatible parquet | 1 jeu | Zone hors circulation d'évacuation | Collée | Montage J-1 / démontage J |
| SIG-04 | Directionnel | Hall et allée de circulation AL | Terrains 1 · 2 ; buvette · eau gratuite ; toilettes · PMR ; poste de secours | 1 200 × 400 mm | Bâche ou PVC | 3 | Pictogrammes, flèches jaunes sur asphalte | Barrière ou pied | Orientation, J 07:00 |
| SIG-05 | Identification | Terrains T1 et T2 | « TERRAIN 1 — CENTRAL », « TERRAIN 2 » + emplacements partenaires prévus par les packs | 2 000 × 500 mm | Bâche | 2 | Lisible depuis les gradins | Barrières hors dégagement | Montage J-1 |
| SIG-06 | Compétition | Pit wall PW | Tableau d'appel : sur le terrain, appelées, à suivre ; heure | 1 200 × 800 mm | Tableau magnétique ou effaçable | 1 | Numéros de 100 mm | Chevalet | Responsable compétition |
| SIG-07 | Accessibilité | Emplacements PMR (face au terrain central) | « ESPACE PMR — places réservées, vue dégagée » | 400 × 600 mm | PVC | 2 | Blanc sur bleu 6,87:1 | Pied | Référent accessibilité |
| SIG-08 | Service | Sanitaires (à localiser avec l'exploitant) | Toilettes, toilettes PMR | A4 | PVC | 4 | Pictogramme + texte | Adhésif repositionnable | Orientation |
| SIG-09 | Secours | Poste de secours SEC + 2 fléchages | « POSTE DE SECOURS » | 400 × 600 mm | PVC | 3 | Blanc sur vert 4,81:1 | Pied | Avec l'association de secours |
| SIG-10 | Service | Hall, buvette | « BUVETTE — sans alcool · eau gratuite · gobelets consignés » | 1 200 × 600 mm | Bâche | 1 | Prix en grand, pictogrammes | Table, grille | Responsable buvette |
| SIG-11 | Information | Hall et zone debout ZD | « Les règles en deux minutes » + QR de la page de scores | A1 (594 × 841 mm) | Affiche sur carton | 3 | Facile à lire, texte court | Pied ou barrière | Responsable communication |
| SIG-12 | Compétition | Stations A (T1) et B (T2) | Lettre de station ; bande de damier sur la ligne D/A ; flèche de sens du slalom | Panneau A2 + adhésifs | PVC + adhésif sol | 2 jeux | Contraste au sol asphalte/craie | Collé, contrôlé à 08:30 | Responsable compétition |
| SIG-13 | Partenaire | Zone partenaires SP | Mur des partenaires (signés uniquement) | 3 000 × 2 000 mm | Bâche sur structure | 1 | — | Structure autoportante lestée | Référent partenaires |
| SIG-14 | Règle | Accès à l'aire de jeu | « Aucune boisson dans l'aire de jeu » (R-12) | A3 | PVC | 4 | Pictogramme barré | Barrière | Responsable logistique |

### 19.3 Maquettes

| Fichier | Panneau |
|---|---|
| signaletique-file-attente.svg | SIG-01 |
| signaletique-numero-grille.svg | SIG-02 |
| signaletique-orientation.svg | SIG-04 |
| signaletique-pit-wall.svg | SIG-06 |
| signaletique-pmr-secours.svg | SIG-07 et SIG-09 |

Les numéros, équipes et horaires des maquettes sont fictifs et cohérents avec le placement serpentin et la séquence des poules (section 11.7).

---

## 20. Scénographie

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

Le parti pris : **un paddock de course transposé au gymnase**. Le terrain central est la piste, le pit wall l'espace des équipes, l'écran le panneau officiel de la grille, la grille au sol le décor-signature. On ne copie aucune identité de sport mécanique : on reprend leur logique de lecture (numéros, positions, temps, écarts) avec l'identité propre de LA GRILLE (asphalte, jaune pole, orange 3x3 ; voir l'identité visuelle).

### 20.1 Ambiance par zone

| Zone | Intention | Ambiance | Éléments | Ligne de matériel ou de budget |
|---|---|---|---|---|
| HALL — accueil, billetterie, buvette | Comprendre le concept en 10 secondes | Lumineux, informatif, calme | Panneau « Comment marche la grille » (3 pictogrammes : Q1 → Q2 → Q3), programme du jour, QR code de la page de résultats, mur des partenaires, deux files balisées (équipes / public), point info accessibilité | Signalétique (E12, E23) |
| T1 — terrain central | Le « centre court » : Q3, finales, show | Dense, sonorisé, filmé | Afficheur de score visible depuis ZD et TF, bâches de fond sur barrières hors dégagements, aucun visuel adhésif dans l'aire de jeu (glissance) | Signalétique (E12), afficheurs du lieu |
| T2 — terrain 2 | Station de qualification le matin, concours public à midi, poules l'après-midi | Même habillage que T1, en plus sobre | Afficheur de score, nom du partenaire officiel de T2 s'il est vendu | Packs partenaires (R07) |
| PW — pit wall | L'espace des équipes, vu du public | Lisible, ordonné | Bancs numérotés par équipe, « tableau d'appel » du créneau suivant (aimanté, réutilisable), tables de marque, numéros de grille portés par les équipes (dossard ou brassard) | Signalétique (E12) |
| SC — écran de la grille et régie | Le tableau officiel | Fond sombre, chiffres très lisibles | Écran de projection 4 × 3 m (event.json), régie speaker / vidéo, grille magnétique de secours à proximité | Vidéo (E10), grille magnétique (à budgéter, section 23) |
| PH — grille au sol | Le décor-signature et le spot photo | Graphique, photogénique | Seize cases décalées numérotées (case 1 = pole, en jaune), logo du partenaire titre au centre, cadrage photo depuis l'allée | Marquage (E07), signalétique (E12) |
| ZD, PMR, TF — publics | Proximité et visibilité | Énergie, interaction | Barrières habillées (sans masquer la vue des PMR au premier rang), animations du speaker toutes les séquences | Barrières du lieu |
| SP — partenaires | Activation, pas seulement des logos | Vivante, maîtrisée | Stand du partenaire titre (3 × 3 m) avec une activation (défi, lot, photo) ; stands 2 × 2 m des partenaires officiels | Packs partenaires |
| SEC — poste de secours | Visible et identifiable | Neutre | Signalé dès l'entrée, accès toujours libre | Dispositif de secours (E03) |

### 20.2 Le terrain central (T1)

- **Lecture immédiate.** Le score, le temps de jeu et le chrono de tir sont visibles depuis toute la zone debout et les gradins. Si les afficheurs du lieu ne sont pas visibles depuis TF, il faut un afficheur de secours (tablette sur pied face au public).
- **Mise en scène de la Q3.** Une équipe seule sur T1, les autres au pit wall. Compte à rebours sonore, silence demandé par le speaker, temps affiché à l'arrivée, puis classement provisoire mis à jour à l'écran. Le jingle de pole ne sonne que lorsque la pole est mathématiquement acquise, après le dernier run.
- **Pas de décor dans l'aire de jeu.** Aucun adhésif décoratif à l'intérieur des lignes ni dans les dégagements : seules les lignes de jeu sont tracées. Les visuels vont sur les barrières, hors dégagements, et sur la grille au sol (PH).

### 20.3 Le pit wall

Le pit wall est l'espace des équipes **et** un spectacle pour le public. Il est implanté entre les deux terrains (8 × 9 m dans event.json). Le mobilier (bancs, tables) est placé à au moins 2 m des lignes de touche : c'est la règle de conception par défaut d'EVENT LAB, qui n'est pas une règle réglementaire. Le couloir central sert à l'appel des équipes du créneau suivant (section 27). Pendant les finales, les partenaires titre peuvent y être invités (contrepartie du pack), toujours accompagnés et hors dégagements.

### 20.4 L'écran de la grille

| Sujet | Recommandation |
|---|---|
| Contenu | Grille Open (16 lignes) et grille Féminines (8 lignes) : position, numéro d'équipe, temps, écart avec la pole, statut (« figée en Q1 », « qualifiée pour Q2 »…). Entre les séquences : prochains matchs, heure de passage de chaque équipe, résultats, partenaires. |
| Lisibilité | Fond sombre, chiffres en très grand corps, pas plus de 16 lignes par écran ; contraste à vérifier sur place dans la lumière réelle du gymnase lors du test de 08:30. |
| Projection | Face au public, une projection frontale placerait le vidéoprojecteur et ses câbles dans la zone public. Il faut préférer la **rétroprojection** depuis le pit wall (écran adapté et recul à vérifier avec le loueur) ou un écran à LED (configuration premium). |
| Structure | Posée au sol et lestée. Aucune accroche à la charpente sans accord écrit de l'exploitant. Le bas de l'image doit être au-dessus des têtes du public debout : la hauteur est à tester à J-1 depuis le fond de ZD et le haut de TF. |
| Accessibilité | Aucun effet stroboscopique ni clignotement rapide. Chaque annonce importante du speaker est doublée à l'écran (public sourd ou malentendant). Contenu identique sur la page web (QR code). |
| Secours | Grille physique magnétique grand format préparée en parallèle (R-07) et page web de résultats en relais. |

### 20.5 La grille au sol (PH)

- **Implantation.** Zone de 11 × 4 m le long de l'allée, hors aire de jeu (event.json). Seize cases décalées sur deux rangs, comme une grille de départ, numérotées de 1 à 16 ; la case 1 (pole) est en jaune. Le logo du partenaire titre est au centre (contrepartie du pack titre). Voir le plan d'implantation.
- **Usages.** Photo d'équipe avec son numéro juste après la révélation ; podiums et photo officielle en fin de journée (séquence c1) ; contenus verticaux.
- **Matériau.** Adhésif compatible parquet sportif uniquement (contrainte du lieu dans event.json). Il faut tester la pose et le retrait sur une zone peu visible à J-1, en présence de l'exploitant. L'adhérence du support imprimé doit être vérifiée : la zone est piétonne.
- **Point de vigilance.** La grille au sol borde l'allée AL. Pendant les podiums, le public ne doit pas s'arrêter dans l'allée : des bénévoles d'orientation maintiennent l'allée libre, et le public regarde depuis ZD et TF.

### 20.6 Éclairage disponible

- Le lieu dispose de l'éclairage sportif existant (event.json). Aucun éclairage scénique n'est prévu en configuration standard.
- Le top « lumière salle réduite si possible » de la Q3 suppose **l'accord de l'exploitant**. L'éclairage de sécurité, les circulations et les gradins restent toujours éclairés. Certains éclairages de salle mettent plusieurs minutes à se rallumer : il faut vérifier le type de luminaires avec l'exploitant avant toute extinction, même partielle. À défaut, la Q3 se joue en pleine lumière et la tension passe par le son, l'écran et le silence.
- En configuration premium, des pieds d'éclairage scénique (E30) sont posés au sol et lestés, à au moins 2 m des lignes, câbles protégés (plan premium).

### 20.7 Son dans un gymnase réverbérant

Les gymnases réverbèrent fortement. event.json le signale et conseille une sonorisation directive. Recommandations :

1. **Orienter, ne pas pousser.** Placer les deux enceintes près de SC, légèrement surélevées sur pieds, orientées vers ZD et TF avec un angle vers le bas. Ne jamais viser les murs nus ni le plafond. Le caisson reste au sol, à bas niveau.
2. **Priorité à la parole.** Pas de musique sous la voix du speaker pendant les annonces de temps et la révélation. Jingles courts. Micro HF tenu près de la bouche. Égalisation qui coupe les basses de la voix.
3. **Régler avec le public.** Le gymnase vide sonne plus fort que plein. Le réglage de 08:30 doit être repris à l'ouverture des portes, puis au moment du pic de l'après-midi.
4. **Niveau modéré et constant.** Le public compte des familles et des enfants. Des casques anti-bruit sont prêtés au point info (accessibilité). Si la diffusion devait atteindre des niveaux élevés et prolongés, la réglementation applicable aux sons amplifiés est **à vérifier auprès de l'exploitant**.
5. **Droits.** Toute diffusion de musique enregistrée suppose une déclaration préalable à la SACEM (section 32, C-06). Pour les contenus publiés sur les réseaux, utiliser une musique libre de droits ou licenciée par la plateforme [S-G2-25].

### 20.8 Moments forts et spots photo

| Moment | Séquence du programme | Mise en scène | Format vertical prévu |
|---|---|---|---|
| Q3 un par un : la dernière équipe qui arrache la pole | q4, q5 | Compte à rebours, silence, temps à l'écran, jingle de pole | Run complet en plan fixe depuis CAM2 (latéral T1) et réaction du pit wall |
| Révélation de la grille | r1 | Animation de la grille à l'écran, annonce du speaker, placement serpentin en direct | Écran et réactions des équipes (plan inversé) |
| Remise du trophée de la pole | r1 | Remise par le partenaire titre devant l'écran | Photo officielle sur la case 1 de la grille au sol |
| Entrée des finalistes par numéro de grille | s2 | Appel par numéro, entrée depuis le pit wall vers T1 | Plan suiveur depuis le couloir joueurs |
| Tirs au buzzer des finales | f1, f2 | Décompte des dernières secondes par le speaker | Plan large depuis la tribune |

| Spot photo | Espace | Angle de prise de vue | Lumière |
|---|---|---|---|
| Grille au sol (photo d'équipe avec son numéro) | PH | De face depuis l'allée, photographe légèrement en hauteur (escabeau sécurisé hors allée) | Éclairage sportif ; éviter les contre-jours des issues vitrées |
| Mur des podiums | PH ou SP | De face, fond partenaires | Idem |
| Pit wall entre les terrains | PW | Depuis le couloir joueurs, sans entrer dans les dégagements | Idem |

### 20.9 Contraintes matérielles

- **Sol.** Adhésifs compatibles parquet sportif uniquement ; aucune boisson dans l'aire de jeu (event.json).
- **Accroches.** Aucune accroche à la charpente ni aux paniers sans accord écrit de l'exploitant. Structures au sol lestées.
- **Réaction au feu des matériaux** (bâches, kakémonos, habillages de barrières, adhésifs grand format) : **à vérifier avec l'exploitant et le chargé de sécurité**. Les procès-verbaux de réaction au feu sont à demander aux fabricants avant la commande.
- **Signalétique de sécurité.** Aucun visuel ne masque les blocs d'éclairage de sécurité, la signalisation des issues, les extincteurs ou le DAE.
- **Câbles.** Aucun câble au sol dans une circulation sans passe-câble. Aucun câble dans l'aire de jeu.

---

## 21. Plans d'implantation

> **Mise à jour v0.2.0.** Les corrections d'implantation proposées dans cette section ont été appliquées à `event.json` : enveloppe du lieu portée à 44 × 28 m (gradins inclus), zone debout ramenée à 38 m avec portillons, sortie S2 déplacée sur le mur ouest. Les plans SVG ont été régénérés à partir de la configuration corrigée ; les tableaux de dimensions ci-dessous décrivent l'état analysé avant correction.

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

### 21.1 Fichiers

Les plans sont des SVG à l'échelle (1 m = 20 px, 24 px pour le plan de secours, 50 px pour le parcours). Ils portent une échelle graphique, un repère d'orientation, une légende et un cartouche avec la version et l'avertissement. Ils sont **générés depuis event.json** par `assets/plans/generer-plans.mjs` (commande : `node assets/plans/generer-plans.mjs` depuis le dossier du blueprint). Il faut les régénérer après toute modification des espaces.

| Configuration | Fichier | Statut |
|---|---|---|
| Standard | assets/plans/implantation-standard.svg | Produit depuis venue.spaces[] d'event.json |
| Économique | assets/plans/implantation-economique.svg | Produit : même emprise, différences repérées Δ |
| Premium | assets/plans/implantation-premium.svg | Produit : surcouches Δ (hypothèses de conception) |
| Capacité maximale autorisée | assets/plans/implantation-capacite-max.svg | Produit : règle de jauge, sans plafond chiffré tant que l'effectif n'est pas confirmé (C-02) |
| Secours (salle de repli, 1 terrain) | assets/plans/implantation-secours.svg | Produit sur un gabarit hypothétique (HS-01), aucun lieu de repli dans event.json |
| Circulation (public, équipes, technique, évacuation, secours) | assets/plans/circulation.svg | Produit sur la base standard |
| Parcours de qualification (une station) | assets/plans/parcours-qualification.svg | Produit selon l'article 7.2 du règlement (section 12.2), qui fait foi ; fiche technique en annexe |

### 21.2 Lecture du lieu et choix d'implantation

Le lieu est l'archétype d'event.json : plateau de 44 × 24 m, hauteur 7 m, ERP de type X, deux paniers latéraux exploitables côte à côte (hypothèse H-01). Le repère des plans est le suivant : y = 0 au mur des paniers latéraux, x = 0 au mur de l'entrée E1. L'orientation géographique n'est pas connue.

| Choix | Raison |
|---|---|
| Les deux terrains s'appuient sur les paniers latéraux du même mur | Aucun panier mobile à louer ; le public est d'un seul côté, face aux deux terrains et à l'écran. |
| T1 « central » à l'ouest, côté entrée | « Central » désigne le terrain du spectacle (Q3, finales), pas sa position géométrique : T1 est le plus proche de l'entrée, de la grille au sol et du poste de secours. |
| Pit wall entre les deux terrains | Les équipes sont à égale distance des deux terrains ; l'appel du créneau suivant se fait en un seul point ; le public voit les équipes. |
| Écran entre les terrains, face au public | Un seul point de regard pour la grille, les résultats et le speaker. |
| Public debout au front des terrains, gradins derrière | Proximité maximale. Point de vigilance : la vue depuis les premiers rangs de gradins passe au-dessus du public debout. Il faut la vérifier sur place et, si elle est gênante, réduire la zone debout à des tronçons ou la remplacer par des bancs bas. |
| Allée continue d'E1 à S1 | Circulation et évacuation séparées des zones statiques ; aucune file d'attente ne doit s'y former. |
| Grille au sol, secours et partenaires au sud de l'allée | Espaces de passage et d'activation hors aire de jeu ; zone libre conservée devant S2. |

### 21.3 Surfaces et capacités (event.json v0.2.0)

| Espace | Dimensions | Surface | Capacité | Remarque |
|---|---|---|---|---|
| T1 — terrain central | 15 × 11 m | 165 m² | — | Terrain seul, sans dégagements (voir 21.4) |
| T2 — terrain 2 | 15 × 11 m | 165 m² | — | Idem |
| PW — pit wall | 8 × 9 m | 72 m² | — | Mobilier en retrait de 2 m des lignes |
| SC — écran et régie | 6 × 2 m | 12 m² | — | |
| ZD — zone debout | 42 × 4 m | 168 m² | 250 (hypothèse) | Contient l'espace PMR |
| PMR | 5 × 2 m | 10 m² | 8 | Premier rang, vue dégagée |
| AL — allée | 44 × 2 m | 88 m² | — | Largeur à valider |
| PH — grille au sol | 11 × 4 m | 44 m² | — | |
| SEC — poste de secours | 4 × 4 m | 16 m² | — | |
| SP — stands partenaires | 13 × 4 m | 52 m² | — | |
| TF — gradins fixes | 44 × 4 m | 176 m² | 250 (hypothèse) | Placés hors de l'enveloppe 44 × 24 m (voir 21.6) |
| HALL | — | 110 m² | — | Hors aire de jeu, sans coordonnées |

Les espaces positionnés à l'intérieur du plateau (hors TF et HALL) occupent environ 782 m² sur 1 056 m². Le reste correspond aux couloirs latéraux (3 m de chaque côté des terrains), à la bande entre les terrains et la zone debout (2 m) et à la zone libre devant S2.

### 21.4 Dimensions du terrain 3x3

- event.json retient **15 × 11 m** par terrain. Le règlement officiel 3x3 de la FIBA est disponible sur le site de la FIBA [S-G1-01]. Le travail BASK'EST LAB y a confirmé les règles de jeu de base (match de 10 minutes ou 21 points, horloge des tirs de 12 secondes, trois joueurs et un remplaçant, règles 2026 en vigueur depuis le 1er janvier 2026, avec une modification du check-ball). En revanche, **les dimensions du terrain n'ont pas été confirmées** dans les sources disponibles. Elles sont **à vérifier dans le règlement FIBA 3x3 en vigueur et auprès de la FFBB** avant le traçage. Les tracés intérieurs des plans (raquette, arc, panier) sont schématiques.
- **Dégagements.** event.json nomme l'espace requis « Terrain 3x3 réglementaire + dégagements », mais lui donne 15 × 11 m, soit le terrain seul. Dans l'archétype, la ligne de fond est à 1 m du mur des paniers, et les lignes de touche intérieures touchent le pit wall. La règle de conception par défaut d'EVENT LAB (non réglementaire) demande 2 m libres autour de l'aire de jeu. D'où le retrait du mobilier du pit wall et la vérification des protections murales sous les paniers. Les dégagements réglementaires sont **à vérifier** (règlement FIBA 3x3, exploitant). Correction proposée pour event.json (appliquée dans event.json v0.2.0) : distinguer l'aire de jeu et ses dégagements.

### 21.5 Les cinq configurations

**Standard.** Implantation d'event.json : deux terrains, Q1 et Q2 sur deux stations (une par terrain), Q3 et finales sur T1, public debout au front, gradins derrière, stands au sud de l'allée.

**Économique.** Même emprise. Seules la dotation et l'habillage changent :

- Δ1 : écran moins coûteux, prêté ou loué (E10 réduit). Lisibilité à tester depuis le haut des gradins.
- Δ2 : stands limités aux partenaires signés ; un mur des partenaires remplace les stands non vendus.
- Δ3 : grille au sol en adhésif seul.
- Δ4 : buvette à une caisse d'office, la seconde selon l'affluence.
- Δ5 : sonorisation réduite et speaker bénévole.

C'est la configuration recommandée pour une première édition (section 29).

**Premium.** Mur LED à la place de la projection, pieds d'éclairage scénique au sol, quatre positions de caméra (tribune, latérale T1, épaule dans le couloir joueurs, grille au sol), régie de captation dans la bande sud, espace invités dans la partie est des stands. La zone libre devant S2 est conservée. Le matériel premium n'est **pas** décrit dans `resources.equipment[]` (seulement en dépenses) : sa puissance électrique et son poids ne sont pas calculés (correction proposée, section 23).

**Capacité maximale autorisée.** Dans l'archétype, la jauge est limitée par l'**effectif autorisé** du lieu, pas par la surface. Les places physiques (gradins, zone debout et emplacements PMR, capacités d'event.json) dépassent ce que l'effectif supposé laisse aux spectateurs une fois les joueurs et le personnel comptés (règle de calcul ci-dessous). La configuration n'ajoute donc pas de places. Elle sécurise le remplissage :

- Δ1 : stands partenaires sortis du plateau (vers le hall, si sa surface le permet) ; toute la bande sud devient circulation et dégagement.
- Δ2 : portillons traversants dans les barrières de la zone debout.
- Δ3 : comptage continu des entrées et des sorties à E1, avec les seuils d'alerte et de fermeture de R-01.
- Δ4 : bénévoles d'orientation aux deux bouts et au centre de l'allée.

Règle de jauge : **spectateurs présents simultanément ≤ effectif autorisé confirmé par écrit (C-02) − joueurs présents − personnel présent**. La définition exacte (joueurs et personnel inclus ou non) est celle du document de l'exploitant. Elle est à confirmer, car la simulation des flux compte tout le monde (section 32). Rappel : une retransmission « dans le hall » ne crée aucune place si le hall fait partie du même établissement.

**Secours (R-15).** Ce plan sert si le gymnase est indisponible. Il décrit une salle polyvalente de repli avec un seul terrain. Le gabarit minimal recommandé est une hypothèse de conception (HS-01 : 32 × 22 m utiles, sol sportif, hauteur libre compatible avec le basket, à vérifier), à remplacer par le relevé de la salle réelle. S'il n'y a pas de panier fixe, il faut louer un panier mobile 3x3 (poste absent d'event.json). Il n'y a pas de gradins supposés : le public est debout ou sur des bancs bas, dans la limite de l'effectif fixé par l'exploitant de la salle.

*Format de secours resserré à 16 équipes (hypothèse de conception, à valider par le bureau).* Il précise la proposition de la section 11.10 (poules de 7 min ou 13 points en créneaux de 10 min, tableau final limité aux demi-finales, « à simuler »). Avec des poules de 3 en Open, conformes au tableau de la section 11.11, la simulation montre que les quarts de finale tiennent dans la journée. Si la salle de repli ferme plus tôt, on revient à des demi-finales directes :

| Élément | Format standard (event.json) | Format de secours |
|---|---|---|
| Équipes | 24 : Open 16 + Féminines 8 | 16 : Open 12 + Féminines 4 (Open 16 si moins de 4 équipes féminines) |
| Qualifications | 2 stations ; Open Q1 (16) → Q2 (10) → Q3 (4) ; Féminines Q1 (8) → Q3 (4) | 1 station ; Open Q1 (12) fige 9–12 → Q2 (8) fige 5–8 → Q3 (4) attribue 1–4 ; Féminines : manche unique (4) |
| Poules | 6 poules de 4, serpentin, 8 min ou 15 points | Open : 4 poules de 3 (serpentin) ; Féminines : 1 poule de 4 ; matchs en 7 min ou 13 points (format compressé déjà prévu par R-04) |
| Tableau final | Quarts, demies, finale Open ; demies et finale Féminines ; 10 min ou 21 points | Quarts, demies, finale Open ; finale Féminines entre les deux premières de la poule ; 10 min ou 21 points |
| Matchs garantis par équipe | 3 matchs de poule (règlement, art. 6) | 2 matchs de poule (Open), 3 (Féminines) : **dégradation assumée**, contraire à la garantie de l'article 6. Le règlement doit prévoir une clause « configuration de secours », et la bascule doit être annoncée dès qu'elle est décidée |
| Sélection des 16 équipes | — | Ordre d'inscription et de paiement ; les autres sont remboursées ou placées en liste d'attente (décision du bureau, section 40) |

*Programme de secours (durées de conception calculées avec les paramètres de créneau d'event.json, puis recoupées avec le simulateur de compétition sur une configuration de travail ; **à remplacer par la sortie du moteur** dès que la variante de secours sera ajoutée à event.json) :*

| Créneau | Séquence |
|---|---|
| 07:30 – 09:00 | Montage (si le montage de la veille est impossible dans la salle de repli) |
| 09:00 – 09:30 | Tests son, vidéo, chronométrage, page de scores |
| 09:30 – 10:00 | Accueil des équipes ; ouverture des portes à 09:45 |
| 10:00 – 10:10 | Briefing des capitaines (format de secours expliqué) |
| 10:10 – 10:20 | Ouverture et démonstration du parcours |
| 10:20 – 10:50 | Q1 Open (12 runs, une station) |
| 10:50 – 11:00 | Manche unique Féminines (4 runs) |
| 11:00 – 11:20 | Q2 Open (8 runs) |
| 11:20 – 11:30 | Q3 Open (4 runs, un par un) |
| 11:30 – 11:45 | Révélation de la grille et placement serpentin |
| 11:45 – 12:30 | Pause et concours public (compressible) |
| 12:30 – 15:30 | Poules : 18 matchs en créneaux de 10 min sur un terrain |
| 15:30 – 15:55 | Show tampon et annonce du tableau final |
| 15:55 – 16:55 | Quarts de finale Open (4 matchs) |
| 16:55 – 17:25 | Demi-finales Open (2 matchs) |
| 17:25 – 17:35 | Entracte : entrée des finalistes par numéro de grille |
| 17:35 – 17:50 | Finale Féminines |
| 17:55 – 18:10 | Finale Open |
| 18:15 – 18:35 | Podiums et photo sur la grille réduite |
| 18:35 – 20:25 | Démontage et restitution |

La marge de 15 % du simulateur est portée par le show tampon, la pause et les transitions, comme en configuration standard (section 27). Les effets financiers de la bascule (moins d'inscriptions, location de salle et de panier, jauge réduite) **ne sont pas chiffrés** : le moteur ne gère pas encore une variante qui modifie les participants et la compétition (correction proposée).

### 21.6 Points de vigilance relevés sur les plans

| N° | Constat | Conséquence | Action |
|---|---|---|---|
| 1 | La zone debout s'arrête à 1 m des murs (x = 0 → 1 et 43 → 44) | Hors portillons, ce sont les seuls passages entre l'aire de jeu et l'allée, pour les joueurs, le personnel et les secours | Portillons dans les barrières avant et arrière (plans capacité maximale et circulation), ou zone debout raccourcie pour l'aligner sur les couloirs latéraux de 3 m (correction proposée) |
| 2 | La sortie S2 est placée sur la limite y = 24 m, là où event.json fait commencer les gradins TF (y = 24 → 28, hors de l'enveloppe 44 × 24 m) | Géométrie incohérente : soit les gradins sont ailleurs, soit S2 débouche dans les gradins | Relever la position réelle des gradins et des issues ; corriger event.json |
| 3 | Lignes de touche au contact du pit wall, ligne de fond à 1 m du mur | Risque de collision (joueurs contre mobilier ou mur) | Mobilier à 2 m des lignes ; protections murales à vérifier ; dégagements réglementaires à vérifier |
| 4 | Écran face au public | La projection frontale met le projecteur et ses câbles dans la zone public | Rétroprojection depuis le pit wall ou écran à LED |

### 21.7 À relever sur le lieu réel avant de figer l'implantation (jalon J-90)

1. Position, porte-à-faux et hauteur des paniers latéraux ; état des protections murales.
2. Plan d'évacuation officiel : issues, largeurs, nombre d'unités de passage, sens d'ouverture, issues réellement disponibles le jour J.
3. Gradins : position, nombre de places, accès, emplacements PMR existants.
4. Effectif autorisé, type et catégorie d'ERP, avis de la commission de sécurité, arrêté d'homologation de l'enceinte s'il existe (section 32).
5. Électricité : tableaux, circuits disponibles et leur calibre, prises près de SC, de la buvette et des tables de marque.
6. Éclairage : type de luminaires (temps de rallumage), commandes, éclairage de sécurité.
7. Sanitaires (dont PMR), vestiaires, local de stockage, point d'eau, emplacement du DAE et des extincteurs.
8. Accès des livraisons (gabarit de TECH) et des véhicules de secours, point de rassemblement.
9. Couverture réseau mobile et Wi-Fi au niveau de la régie.
10. Surface et forme réelles du hall (deux files, buvette, stands éventuels).

---

## 22. Maquettes digitales

### 22.1 Écrans et statut

| Écran ou support | Fichier | Contenu | Données collectées et finalité | Outil retenu | Statut | Procédure dégradée |
|---|---|---|---|---|---|---|
| Page publique « grille et scores en direct » (mobile) | maquette-live-mobile.svg | Onglets Grille, Poules, Matchs, Mon équipe ; grille par catégorie ; scores ; heure et terrain du prochain match de l'équipe suivie | Aucune donnée personnelle collectée ; l'équipe suivie est mémorisée sur le téléphone uniquement | Page web statique alimentée par un fichier de données publié par la régie | **Simulé** (maquette) ; publication en ligne : **externe requis** (hébergement statique + source de données) | Tableau d'appel du pit wall (SIG-06), annonces micro, feuille de résultats affichée dans le hall toutes les heures |
| Inscription des équipes (mobile) | maquette-inscription.svg | Catégorie, nom d'équipe, capitaine, 4 joueurs, documents des 16–17 ans, attestation santé, consentements, paiement de 60 € | Identité et date de naissance (contrôle d'âge, non publiée) ; contacts du capitaine (organisation) ; attestations oui/non ; choix d'image ; consentement aux informations futures | Plateforme d'inscription et de paiement associative (à choisir ; vérifier frais, contribution éventuelle demandée au payeur et conformité RGPD) | **Externe requis** | Inscription par formulaire papier et virement jusqu'à J-14 |
| Billetterie spectateurs | (sur le même outil) | Billet journée 5 €, gratuit moins de 12 ans, réservation PMR | Nom et e-mail de l'acheteur (envoi du billet) | Même plateforme | **Externe requis** | Vente sur place (file B), liste de contrôle papier |
| Écran de la grille (16:9) | maquette-ecran-grille.svg | Grille Open et Féminines en deux colonnes décalées ; poules par serpentin ; bandeau du prochain créneau ; mention du partenaire titre si signé | Aucune | Page plein écran lancée depuis l'ordinateur de régie, lisant les mêmes données que la page publique, fonctionnant sans internet | **À développer** (module régie) | Grille physique magnétique grand format (R-07), annonce au micro |
| Formats réseaux sociaux | Gabarits à dériver de l'identité (section 15.4) | Numéro de grille, temps, résultat | — | Outil de mise en page au choix | Opérationnel dès que l'identité est vectorisée | — |

### 22.2 Page « grille et scores en direct » : description fonctionnelle

- **Données affichées** : grille de chaque catégorie (place, équipe, temps retenu, manche, poule) ; poules (classement, victoires, points) ; matchs (heure, terrain, équipes, score, statut « à venir / en cours / terminé ») ; carte « Mon équipe » épinglée.
- **Mise à jour** : la régie saisit chaque temps de run et chaque score dans un tableau unique ; la page relit les données toutes les 30 secondes. Objectif : un résultat publié moins de 2 minutes après la fin du run ou du match. L'heure de la dernière mise à jour est toujours visible.
- **Accessibilité** : contrastes de la section 18.2 ; texte de 16 px minimum ; tableaux structurés lisibles par les lecteurs d'écran ; aucune information portée par la seule couleur (la pole est signalée par « P1 » et par sa couleur) ; la mise à jour automatique ne déplace pas la position de lecture et peut être suspendue par l'utilisateur (critère des WCAG relatif aux contenus qui se mettent à jour, à vérifier [S-G1-53]) ; fonctionne sans compte ni application.
- **Sobriété** : page légère (texte, pas de vidéo), utilisable en 4G dans un gymnase chargé.

### 22.3 Inscription : principes

- Quatre étapes courtes (équipe, joueurs, documents, paiement) ; sauvegarde du brouillon.
- **Minimisation** : pas d'adresse postale, pas de donnée de santé (case « attestation fournie »), date de naissance jamais publiée.
- **Consentements séparés** : règlement (obligatoire), image (individuel, facultatif), informations futures (facultatif). Mentions d'information et durées de conservation conformes au règlement, article 17 ; recommandations de la CNIL [S-G1-49].
- Confirmation par e-mail ; rappel de confirmation à J-7 et J-4 ; liste d'attente automatique.

### 22.4 Écran de la grille : principes

- Lisible depuis les gradins : numéros de grille d'environ 6 % de la hauteur de l'image, noms d'équipes en capitales.
- Séquence de la révélation (11:35, 15 min) : grille Féminines places 8 à 1, puis grille Open places 16 à 1 (la pole en dernier), puis répartition en serpentin poule par poule, puis bandeau du premier créneau.
- Le logo du partenaire titre n'apparaît que si le contrat est signé ; aucun autre logo pendant la révélation.

---

## 23. Besoins matériels

<!-- @gen:equipment -->

### 23.1 Lecture

- **Provenance.** Trois familles :
  - le **lieu** (afficheurs, tables, barrières, kit de parcours selon event.json) ;
  - la **location** (sonorisation, vidéoprojection, chronométrage, gobelets) ;
  - l'**achat** (ballons, adhésif).
  
  Les réfrigérateurs sont prêtés par un partenaire. Ce qui est « fourni par le lieu » doit être confirmé par écrit dans la convention (C-01). Un gymnase municipal ne dispose pas toujours de plots, haies basses et cerceaux en double kit identique, ni d'afficheurs 3x3 avec chrono de tir.
- **Fournisseurs types** (aucun fournisseur nommé n'est recommandé) :
  - sonorisation et vidéo : loueur événementiel local ou service technique de la commune ;
  - chronométrage : loueur de chronométrage sportif, club d'athlétisme ou de course à pied local (cellules), ou application de chronométrage sur tablette avec chronos manuels ;
  - ballons et kit de parcours : fournisseur d'équipement de club ou fournisseur officiel en nature (pack SP-FOURNISSEUR) ;
  - gobelets réutilisables : loueur de gobelets consignés ;
  - adhésif : fournisseur d'équipement sportif, avec une référence compatible parquet.
- **Barrières.** event.json prévoit 20 barrières ou longueurs de rubalise. La zone debout mesure 42 m de long et doit être fermée à l'avant et à l'arrière, avec des portillons. Avec des barrières courantes d'environ 2 m (longueur à vérifier auprès du lieu), ce nombre **ne suffit pas** à fermer les deux lignes de la zone debout ni à créer la file d'entrée. Correction proposée : recalculer le besoin en mètres linéaires.

### 23.2 Puissance électrique

- **Total publié par le moteur : {{summary.powerW}} W.** Ce total additionne les puissances unitaires **sans les multiplier par les quantités** (contrôle du code du moteur). Le contrat documentaire prévoit pourtant la somme des « puissance × quantité ». Pour les lignes en quantité 2 (chronométrage, afficheurs, réfrigérateurs), la puissance appelée réelle est donc **supérieure** au total affiché. Écart signalé au studio (correction du moteur, pas d'event.json).
- **Capacité du lieu : inconnue** (`power_kw_available` vide). La contrôle C8 ne peut pas être réalisé tant que l'exploitant n'a pas indiqué les circuits disponibles. event.json exige une puissance minimale du lieu (`venue_requirements.power_kw`) à faire confirmer.
- **Répartition.** Il faut des circuits distincts pour le groupe sonorisation, vidéo et régie près de SC, pour les réfrigérateurs de la buvette dans le hall, et pour les tables de marque. La répartition est à faire valider par l'exploitant. Aucune multiprise en cascade. Les câbles qui traversent une circulation passent sous passe-câble.
- **Groupe électrogène** : quantité 0 dans event.json, à n'envisager que si l'alimentation est jugée fragile. Toute utilisation intérieure est exclue sans avis de l'exploitant (gaz d'échappement).
- **Configuration premium** : mur LED, éclairage scénique et captation ne figurent pas dans `resources.equipment[]`. Leur puissance, à fournir par les loueurs, peut dépasser la capacité d'un gymnase municipal. C'est une condition du choix premium.

### 23.3 Matériel manquant dans event.json (correction proposée)

| Article | Pourquoi | Lien |
|---|---|---|
| Radios (talkies-walkies) pour la direction, la compétition, la régie, l'accueil, la sécurité | Le pilotage du retard et les procédures de continuité supposent une liaison immédiate | Sections 27 et 34 |
| Compteurs manuels d'entrées et de sorties (2 + 1 de secours) | Prévention de R-01 | Section 32 |
| Grille physique magnétique grand format | Mode dégradé de R-07 | Section 34 |
| Deux kits de parcours identiques, achetés et marqués (si le lieu ne les fournit pas) | Équité entre stations (R-10) ; kit de licence | Annexe parcours |
| Chronomètres manuels (2 par station + 1 de secours) | R-06 prévoit deux chronomètres manuels par station | Annexe parcours |
| Passe-câbles, adhésif de câblage, rallonges et multiprises de qualité | Sécurité des circulations | 23.2 |
| Fontaines ou bonbonnes d'eau gratuites et gobelets dédiés | R-03, R-14 | Section 32 |
| Kit « sol » (serpillières, raclette, seau) et bénévole dédié | R-12 | Section 32 |
| Trousse de premiers secours de l'organisateur (en plus du dispositif de secours) ; vérification du DAE du lieu | Premiers gestes avant l'arrivée des secouristes | Section 32 |
| Dossards ou brassards à numéros de grille | Lecture du public ; mise en scène | Section 20 |
| Terminaux de paiement, fonds de caisse, carnets de reçus | Billetterie sur place, buvette | Section 25 |
| Routeur 4G/5G (secours de la page de résultats) | Le Wi-Fi du lieu est « à vérifier » | Section 34 |
| Feuilles de match et fiches de temps papier, imprimées à J-3 | Procédure dégradée | Section 34 |
| Casques anti-bruit en prêt | Accessibilité (enfants, troubles sensoriels) | Section 32 |
| Panier mobile 3x3 (location) | Configuration de secours uniquement | Section 21 |

Chaque article ajouté doit recevoir une quantité, une provenance, une puissance et, s'il est payant, une ligne de dépense devisée.

### 23.4 Kit transportable pour la licence

Ce que le studio fournit ou fait acheter à chaque licencié, pour que l'événement soit identique d'une ville à l'autre :

1. **Deux kits de parcours identiques** dans une malle étiquetée : plots, cerceaux, haies basses, gabarit de traçage avec les coordonnées de l'annexe, ruban de mesure.
2. **Chronométrage** : paire de cellules par station (ou application et tablettes), chronomètres manuels, piles de rechange, fiches de temps.
3. **Identité** : numéros de grille, dossards ou brassards, adhésifs de la grille au sol (seize cases), grille magnétique de secours, kakémonos aux fichiers fournis.
4. **Fichiers** : animation de révélation de la grille, gabarit de la page de résultats, jingles libres de droits (compte à rebours, top départ, pole), modèles de feuilles de match.
5. **Documents** : règlement, fiches de poste, liste de contrôle du jour J, fiches réflexes.

Le volume et le poids de la malle sont à mesurer lors de la première édition. Objectif : un seul véhicule utilitaire, soit la ligne E19 d'event.json.

---

## 24. Ressources humaines

<!-- @gen:staff -->

### 24.1 Effectifs

event.json prévoit **{{summary.volunteers}} bénévoles** et **{{summary.professionals}} intervenants rémunérés ou prestataires**, sans compter les secouristes. Leur effectif est fixé par l'association agréée de sécurité civile qui dimensionne le dispositif, conformément au référentiel national des dispositifs prévisionnels de secours [S-G2-15]. EVENT LAB ne le calcule pas. L'objectif de recrutement est le besoin augmenté de 20 % (jalon J-21), car les absences le jour J sont fréquentes en milieu associatif.

**Équipe cœur.** event.json intègre les responsables cités dans le programme, les risques et le rétroplanning : trésorier, responsables communication, bénévoles, buvette, animation, accueil et logistique. Ce sont des membres du bureau ou d'une commission de l'association, qui peuvent cumuler une autre fonction. Le bureau de l'association figure comme instance de décision, sans être compté dans les effectifs du jour J.

Deux points restent à corriger :

1. **Intitulés.** Quelques intitulés des responsables cités (« Régisseur », « Speaker », « Directeur de l'événement », « Référent partenaires ») diffèrent légèrement de ceux du tableau. Le contrôle C7 exige une correspondance exacte (correction proposée).
2. **Objectif chiffré du jalon J-21.** Son libellé reste calculé sur l'ancien effectif. Il faut le recalculer à partir de l'effectif bénévole actuel, augmenté de 20 % (correction proposée).

Les fiches de poste couvrent tous ces rôles.

### 24.2 Organigramme du jour J

```
Directeur de l'événement (coordination studio) — décide, arbitre, parle aux autorités
├── Responsable compétition — qualifications, poules, tableau final, réclamations (juge-arbitre)
│   ├── Juges de qualifications (2 par station)
│   ├── Officiels de table / chrono de tir (renfort chronométrage possible le matin)
│   └── Arbitres (1 par terrain + 2 en rotation)
├── Régisseur son-vidéo — écran de la grille, page de résultats, tops du conducteur
│   ├── Speaker / animateur
│   └── Vidéaste (prestataire) et photographe (bénévole)
├── Responsable logistique — montage, sol, énergie, démontage, restitution
│   └── Équipe montage / démontage
├── Responsable accueil — hall, files, contrôle, comptage, autorisations parentales
│   ├── Accueil public et billetterie
│   ├── Accueil équipes et accréditations
│   └── Orientation et placement (comptage, allée, portillons)
├── Responsable buvette — caisses, hygiène, sans alcool, consigne des gobelets
├── Responsable bénévoles — planning, pauses, repas, remplacements
├── Référent accessibilité — accueil PMR, handicaps invisibles, zone calme
├── Référent partenaires et invités — stands, contreparties, invités
└── Liaison sécurité : agents de sécurité (prestataire) · secouristes (association agréée)
```

**Permanence.** À chaque instant, un responsable de permanence est joignable à la radio : le directeur de l'événement, ou le responsable compétition pendant ses pauses. La chaîne de décision en cas d'incident est en section 34.

### 24.3 Fiches de poste

Les fiches de poste d'une demi-page sont regroupées dans `annexes/fiches-de-poste.md`. Il y en a une par rôle clé : mission, horaires, briefing, compétences, tenue, référent, consignes de sécurité.

### 24.4 Recrutement et formation des bénévoles

| Échéance | Action | Responsable |
|---|---|---|
| J-100 | Appel à bénévoles : club, quartier, établissements scolaires, plateformes de bénévolat ; missions publiées avec une description claire (une offre sans mission visible ne convertit pas) | Responsable bénévoles |
| J-45 | Affectation provisoire par poste ; repérage des profils clés (table de marque, juges, régie) | Responsable bénévoles + responsable compétition |
| J-21 | Recrutement complet (besoin + 20 %) ; collecte des tailles de t-shirts | Responsable bénévoles |
| J-14 à J-7 | Formation des juges de qualification sur une station montée (au plus tard à J-7, section 14), avec le chronométrage réel si possible et les cas limites de pénalités ; formation de la table de marque aux règles 3x3 en vigueur | Responsable compétition |
| J-7 | Planning par créneaux envoyé, avec la fiche de poste et le plan ; rappel des consignes de sécurité | Responsable bénévoles |
| J, 08:00 | Briefing général de 15 minutes (plan, issues, poste de secours, radio, chaîne d'alerte, consignes mineurs et image), puis briefings par poste | Directeur de l'événement |
| J+1 | Remerciements, questionnaire bénévoles, invitation à l'édition suivante | Responsable bénévoles |

**Rotations.** Plusieurs rôles d'event.json dépassent 10 heures de présence (régisseur, responsable compétition, accueil public). Il faut prévoir des pauses planifiées et, si possible, des binômes qui se relaient. La règle de conception d'EVENT LAB vise des créneaux de 4 heures au plus pour les bénévoles non responsables.

### 24.5 Le bénévolat ne doit pas masquer un emploi (information générale)

- Un bénévole ne perçoit aucune rémunération, ni en espèces ni en nature. Seuls les **frais réels justifiés** peuvent lui être remboursés. Les indemnités forfaitaires sans justificatif, surtout en cas de lien de subordination (horaires imposés, consignes, sanctions), exposent à une **requalification en salaire** [S-G2-39] (statut : confirmé pour les frais, version à revérifier). Les repas, t-shirts et remboursements de frais d'event.json restent dans ce cadre ; aucune « prime » ne doit être versée.
- Les **arbitres et juges** relèvent d'un régime particulier, avec des indemnités et une exonération sous plafond. Les seuils n'ont pas été vérifiés. Il faut **confirmer le régime auprès du comité départemental de basket et de l'expert-comptable** avant de verser les indemnités (E05).
- Le speaker, le vidéaste et les techniciens rémunérés interviennent avec un **contrat ou une facture de prestataire immatriculé**.
- **Honorabilité.** Toute personne qui encadre des mineurs, bénévoles compris, entre dans le champ du contrôle d'honorabilité, étendu notamment aux arbitres et juges par la loi du 8 mars 2024 [S-G2-41, S-G2-42] (statut : confirmé, version à revérifier). Le contrôle est automatique pour les licenciés ; il ne l'est pas pour les bénévoles non licenciés d'un événement ponctuel. Les participants de 16 et 17 ans étant admis, il faut **vérifier auprès du service départemental de la jeunesse et des sports** si des postes de LA GRILLE entrent dans ce champ, et ne placer au contact direct des mineurs que des personnes vérifiées.
- **Sécurité privée.** Les bénévoles peuvent accueillir, contrôler les billets, orienter et compter. Ils ne pratiquent **aucune palpation** : celle-ci est réservée à des agents titulaires d'une carte professionnelle, au-delà d'un seuil de spectateurs rapporté à 300 [S-G2-17] (statut : confirmé, version à revérifier ; les sources anciennes divergent). En cas de doute, consulter un expert (avocat ou préfecture).

---

## 25. Organisation logistique

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

### 25.1 Contraintes du lieu (event.json, à négocier)

| Contrainte | Valeur de conception |
|---|---|
| Horaires d'exploitation | J-1 18:00 → J 21:30 (à négocier) |
| Fenêtres de montage | J-1 18:00 – 21:30 et J 07:00 – 09:00 |
| Fenêtre de démontage | J 19:10 – 21:00 |
| Protection du sol | Adhésifs compatibles parquet sportif uniquement ; aucune boisson dans l'aire de jeu |
| Stockage | Local matériel existant (surface à relever) |
| Internet | À vérifier ; 4G ou 5G suffisante pour la page de scores |

### 25.2 Montage et démontage

<!-- @gen:setup -->

- **Chemin critique.** La durée minimale de montage est de **{{summary.setupMin}} minutes**. Le montage de la veille, celui du jour et les tests s'enchaînent. Dans la version v0.2.0, cette durée **remplit entièrement** les fenêtres de montage négociées : il n'y a **aucune marge**. Toute minute perdue la veille (clés remises en retard, traçage repris) se reporte sur les tests de 08:30, qui sont critiques. Actions :
  - obtenir l'accès J-1 plus tôt ou J dès 06:30 ;
  - tracer les terrains au cordeau avant de poser l'adhésif ;
  - préparer à l'atelier les gabarits de la grille au sol (cases prédécoupées et numérotées) ;
  - câbler la régie la veille si le lieu peut être fermé à clé.
- **Ordre de montage du jour J** : électricité et câblage protégé → sonorisation → écran et régie → chronométrage et cellules → page de résultats → hall (files, billetterie, buvette) → barrières et portillons → contrôle des issues → tests (section 27).
- **Démontage** (19:10 – 21:00). Il commence par ce qui gêne le moins le départ du public : stands et hall. L'aire de jeu ne se démonte qu'après la sortie du dernier spectateur. Ordre :
  1. matériel loué (restitution ou enlèvement prévu) ;
  2. adhésifs, retirés lentement et à plat, avec contrôle du parquet ;
  3. barrières et mobilier du lieu remis à leur emplacement ;
  4. nettoyage ;
  5. tour de contrôle avec l'exploitant.
  
  Comme pour le montage, le démontage d'event.json occupe toute la fenêtre. Un retard des finales empiète sur la restitution. La marge horaire du lieu doit être négociée (section 27).

### 25.3 Livraisons et enlèvements

| Quoi | Fournisseur (type) | Livraison | Enlèvement | Accès | Réceptionnaire |
|---|---|---|---|---|---|
| Sonorisation, micros | Loueur événementiel | J-1 19:30 ou J 07:00 | J 19:30 | TECH | Régisseur |
| Vidéoprojecteur et écran (ou mur LED en premium) | Loueur événementiel | J-1 19:30 (structure) | J 19:30 | TECH | Régisseur |
| Chronométrage (cellules, tablettes) | Loueur ou club partenaire | J-7 (test) puis J-1 | J+1 | TECH | Responsable compétition |
| Gobelets réutilisables | Loueur de gobelets | J-2 | J+1 (lavage selon le contrat) | Hall | Responsable buvette |
| Réfrigérateurs | Partenaire (prêt) | J-1 | J+1 | Hall | Responsable buvette |
| Achats buvette | Grossiste ou partenaire | J-2 (stockage au froid) | — | Hall | Responsable buvette |
| Ballons, adhésif, signalétique, trophées | Achats | J-14 à J-7 (chez l'association) | — | Utilitaire (E19) | Responsable logistique |
| Food trucks | Exploitants | J 10:30 | J 19:30 | Extérieur (titre d'occupation, C-14) | Responsable logistique |

Règle : aucune livraison ni aucun véhicule ne circule dans le bâtiment pendant la présence du public. Tous les fournisseurs reçoivent un créneau, un accès et le nom du réceptionnaire (rôle).

### 25.4 Transport et stockage

- **Utilitaire** (E19) : matériel de l'association et kit LA GRILLE, aller à J-1, retour à J+1. Assurance du véhicule et du matériel transporté à vérifier.
- **Stockage** : local matériel du lieu (à relever), fermé à clé, pour la nuit de J-1. Le matériel de valeur loué (vidéo, chronométrage) ne reste sur place que si le contrat de location et l'assurance le couvrent.
- **Participants** : covoiturage proposé dès l'inscription et stationnement vélo signalé (amélioration environnementale de l'évaluation).

### 25.5 Restitution du lieu

État des lieux d'entrée à J-1 18:00 et de sortie à J 21:00, contradictoires et photographiés. Points à contrôler :

- parquet (traces d'adhésif, rayures) ;
- murs et protections ;
- paniers ;
- mobilier du lieu (tables, barrières : quantités) ;
- sanitaires et vestiaires ;
- poubelles ;
- clés et badges.

Tout dommage est signalé immédiatement à l'exploitant et à l'assureur. La convention de mise à disposition (C-01) précise les obligations de nettoyage et la responsabilité en cas de dommage aux locaux prêtés, que l'assurance responsabilité civile doit couvrir [S-G2-10].

### 25.6 Déchets

Gobelets réutilisables consignés (cible K10). Points de tri balisés dans le hall et près de SP. Eau en fontaine ou en bonbonnes plutôt qu'en bouteilles. Un bénévole est dédié au tri en fin de journée (R-14). Les filières de la commune (bacs, horaires de sortie) sont à demander au service des sports. Les déchets ne restent pas dans le gymnase après le départ de l'équipe.

### 25.7 Restauration des équipes et des bénévoles

- **Bénévoles et officiels** : repas prévus (E17), servis en rotation entre 11:30 et 14:00 dans un espace hors public (vestiaire ou salle annexe à identifier). Eau et collations disponibles toute la journée. Les juges de qualification mangent après la révélation, les arbitres avant 12:45.
- **Équipes** : eau gratuite au pit wall ; repas à la buvette ou aux food trucks pendant la pause. Les horaires de passage sont affichés pour que chaque équipe sache quand elle peut s'absenter.

### 25.8 Buvette : sans alcool par défaut

- **Règle par défaut d'event.json : aucune boisson alcoolisée** (décision de la v0.2.0, risque R-09).
- **Ce que disent les sources consultées** (statut : confirmé, version à revérifier) :
  - Une association qui ouvre une buvette temporaire lors d'une manifestation qu'elle organise doit obtenir une autorisation du maire, dans la limite d'un nombre annuel d'autorisations (cinq selon les fiches consultées), pour les boissons des groupes 1 et 3 [S-G2-20, S-G2-21, S-G2-22].
  - Dans les enceintes sportives, y compris les gymnases, la vente et la distribution d'alcool sont interdites, sauf dérogation temporaire accordée par le maire aux seules associations sportives agréées. Les fiches consultées parlent de dix dérogations par an au plus et de 48 heures au plus [S-G2-23].
  - Une association qui n'est pas agréée sport (par exemple non affiliée à une fédération) n'a pas accès à cette dérogation.
- **Pour LA GRILLE** :
  - demander à la mairie si une buvette **exclusivement sans alcool** exige une autorisation (C-07, échéance J-30) ;
  - toute exception à la règle par défaut est une décision écrite du bureau, prise après vérification de l'agrément et obtention de la dérogation ;
  - aucune visibilité de marque d'alcool sur le site.
- **Hygiène** :
  - produits préemballés ou cuits sur place ;
  - chaîne du froid (réfrigérateurs avec thermomètre) ;
  - information sur les allergènes affichée ;
  - tickets d'achat conservés (traçabilité).
  
  Les règles d'hygiène alimentaire applicables sont **à vérifier auprès de la direction départementale chargée de la protection des populations** si la restauration dépasse une buvette simple.
- **Food trucks** : s'ils stationnent sur le domaine public (parvis, parking municipal), un titre d'occupation est nécessaire [S-G2-40] (C-14). Leur raccordement électrique et leur distance avec l'entrée sont à convenir avec la mairie.

---

## 26. Rétroplanning

<!-- @gen:milestones -->

### 26.1 Les deux points de décision (go / no-go)

**GO / NO-GO n°1 (J-60) : choisir la configuration.**

- **Règle d'event.json** (jalon M06) :
  - **standard** si les recettes sécurisées et probables, en montants nominaux, couvrent les dépenses de la configuration standard au scénario central, que le partenaire titre est signé avec un acompte et que le besoin de trésorerie est couvert par un financement nommé ;
  - **sinon économique** si, après reclassement des recettes signées ou notifiées et nouvelle simulation, le scénario prudent de la configuration économique est au moins à l'équilibre ;
  - **sinon report** ;
  - dans tous les cas, effectif autorisé confirmé par écrit (C-02).
- **Comment l'appliquer.** Il faut d'abord **requalifier chaque recette** avec les preuves disponibles à J-60. Un contrat signé, une subvention notifiée et des inscriptions encaissées deviennent « sécurisées ». Un accord oral fait passer une ligne en « probable » (H-07). Ensuite, on régénère les tableaux et on applique la règle telle qu'elle est écrite.
- **Lecture à la génération v0.2.0.** Aucune recette forfaitaire n'est sécurisée ni probable (H-07). Seules la billetterie, les inscriptions et la buvette sont probables. Elles ne couvrent pas les dépenses de la configuration standard ({{summary.expensesCentral}} € au scénario central). La configuration économique reste négative au scénario prudent ({{summary.variants.economique.results.prudent}} €). Appliquée aujourd'hui, la règle conduirait donc au **report**. C'est voulu : entre J-120 et J-60, il faut **obtenir des accords et des signatures** (commune, partenaires locaux, partenaire titre, préventes, inscriptions payées) pour rendre l'édition possible.
- **Le seuil de décision est fixé à l'avance** et inscrit au procès-verbal du bureau. On ne déplace pas la règle le jour de la décision.

**GO / NO-GO n°2 (J-30) : engager les dépenses optionnelles.**

- **Conditions** :
  - recettes sécurisées au moins égales à la moitié des dépenses engagées (K02) ;
  - assurance, dispositif de secours et buvette confirmés (C-03, C-05, C-07) ;
  - règlement et vidéo du parcours publiés.
- **Si une condition manque** : aucune dépense optionnelle (E14b, E15, E16) n'est engagée, et le bureau décide d'un maintien en configuration économique ou d'un report. Le test K02 se fait à partir du tableau de trésorerie (section 29) et des pièces (contrats, relevés).

### 26.2 Cohérence avec les échéances réglementaires (contrôle C5)

Trois incohérences sont à corriger dans event.json :

1. **Mentions RGPD (C-11, échéance J-45)**. Les inscriptions ouvrent à J-75 : des données personnelles seraient collectées pendant un mois sans information préalable. **C-11 doit passer à J-75 au plus tard**, avant l'ouverture du formulaire [S-G2-33, S-G2-35].
2. **Droit à l'image (C-10, J-30)**. Le consentement se recueille dans le formulaire d'inscription. **C-10 doit passer à J-75.**
3. **Autorisations parentales et attestation de santé des 16–17 ans (C-09, J-7)**. J-7 convient pour la date limite de remise. Les formulaires, eux, doivent être en ligne dès J-75.

### 26.3 Jalons à ajouter (correction proposée)

| Échéance | Jalon | Responsable | Raison |
|---|---|---|---|
| J-120 | Décision : tournoi homologué FFBB (Open 3x3) ou tournoi non officiel ; conséquences sur la licence ou le Pass, l'assurance et les règles médicales | Bureau | Section 32, C-08 [S-G2-36, S-G2-37] |
| J-90 | Réservation de l'association agréée de sécurité civile (devis selon la grille officielle) | Directeur de l'événement | Les fiches consultées conseillent 2 à 3 mois [S-G2-15] |
| J-90 | Copie de l'arrêté d'homologation de l'enceinte s'il existe ; question à l'exploitant sur la zone debout (installation provisoire) et sur l'autorisation d'utilisation exceptionnelle | Directeur de l'événement | Section 32 [S-G2-12, S-G2-14] |
| J-90 | Lieu de repli identifié et réservé sous condition | Directeur de l'événement | R-15 |
| J-60 | Recalcul du budget avec les certitudes requalifiées ; régénération des tableaux | Trésorier | Go / no-go n°1 |
| J-15 | Déclaration SACEM des diffusions musicales | Régisseur | C-06 [S-G2-24, S-G2-25] |
| J-7 | Vérification de la posture Vigipirate en vigueur | Directeur de l'événement | [S-G2-18, S-G2-19] |
| J+10 | Bilan SACEM (recettes, dépenses, œuvres diffusées) | Trésorier | Délai rapporté par les sources consultées [S-G2-24] |

Les modèles de checklist par jalon du studio (`templates/checklists/checklist-J-120-a-J-1.md`, mentionnés dans `docs/08-modeles-documentaires.md`) n'existaient pas encore à la date de rédaction. La checklist propre au jour J est en annexe : `annexes/checklist-jour-J-la-grille.md`.

---

## 27. Conducteur événementiel minute par minute

<!-- @gen:conducteur -->

**Lecture.**

- « T1 + T2 » signale les séquences jouées sur les deux terrains (Q1, Q2, poules, quarts et demi-finales). Les demi-finales Féminines précèdent les demi-finales Open, pour donner plus de repos aux finalistes Open qui sortent des quarts.
- Les colonnes son, lumière, vidéo, micro et intervenants du modèle de conducteur (`docs/08` §4.5) sont à compléter à la main dans le tableur du conducteur.
- Les contacts radio et téléphone figurent dans une annexe à diffusion restreinte, jamais dans ce dossier.

### 27.1 Tableau de compétition et marge

<!-- @gen:competition -->

- **Ce que calcule le moteur.** Pour chaque étape, il calcule le nombre de créneaux, à partir du nombre d'équipes, du format et des terrains en parallèle. Il le multiplie par la durée d'un créneau (match + changement), puis ajoute une **marge de 15 %** : c'est un paramètre de modélisation, pas une norme. Durée nette de toute la compétition : **{{summary.competitionNetMin}} min** ; avec marge : **{{summary.competitionWithMarginMin}} min**.
- **Où se trouve la marge dans le programme.** Les séquences de qualification sont programmées à peu près à leur durée avec marge. En revanche, les **poules et le tableau final sont programmés à leur durée nette**. La marge de ces étapes n'est pas dans leurs créneaux. Elle est portée par les séquences compressibles qui les entourent : le show de mi-parcours (s1), l'entracte (s2), les transitions de quelques minutes entre les séquences et, en dernier recours, la pause du midi (l1) pour le retard du matin.
- **Constat.** À la génération v0.2.0, le show de mi-parcours, seul tampon entre les poules et le tableau final, est **plus court que la marge simulée des poules**. Un retard proche de la marge ne peut donc pas être absorbé par s1 seul : il faut appliquer, sur décision, la règle de compression ci-dessous, dans l'ordre. La marge des quarts, demies et finales n'a pas de tampon propre, hormis l'entracte et les transitions : une prolongation ou un arrêt de jeu se reporte sur les podiums, puis sur le démontage.

### 27.2 Pilotage du retard

**Mesure.** La table de marque de chaque terrain note l'heure réelle de début de chaque créneau. Le retard est l'écart entre cette heure et l'heure prévue au conducteur. Le régisseur le reporte sur le tableau de bord (section 35) à chaque début de séquence et à chaque début de tour de poule.

**Qui décide.**

- Le **directeur de l'événement** décide, sur proposition du **responsable compétition**.
- Le **régisseur** exécute (annonces, écran, tops) ; le **speaker** annonce.
- Aucune autre personne ne modifie le programme.
- Toute décision est horodatée dans la main courante.

**Signaux** (radio, canal direction) :

| Signal | Seuil de retard (repère K04) | Action immédiate |
|---|---|---|
| « Vert » | Inférieur à 5 min | Rien. Rattrapage naturel sur les transitions |
| « Orange » | De 5 à 15 min, ou un créneau de poule qui dépasse 13 min (signe précurseur de R-04) | Accélérer les transitions : équipes appelées deux créneaux à l'avance, échauffement réduit, annonces raccourcies. Préparer la compression du show s1 |
| « Rouge » | Plus de 15 min (au-delà de la cible K04) | Appliquer l'ordre de compression jusqu'à revenir à « orange » ; informer les équipes au pit wall et le public au micro |
| « Rouge 30 » | Plus de 30 min | Format compressé des poules (7 min ou 13 points), annoncé au briefing des capitaines (R-04) ; procédure détaillée en section 34 |

**Ordre de compression** (du premier au dernier levier) :

1. **Transitions et annonces** : prises en temps masqué (équipes déjà en place au coup de sifflet du match précédent).
2. **Show de mi-parcours (s1)** : réduit, puis supprimé. L'annonce du tableau final se fait au micro pendant la dernière rotation de poule.
3. **Entracte (s2)** : réduit à l'appel des finalistes, sans présentation individuelle.
4. **Pause du midi (l1)**, pour un retard pris le matin : raccourcie, sans toucher au repas des bénévoles ni à un temps de repos minimal des équipes. Le concours public est maintenu, mais raccourci.
5. **Format des poules** : 7 min ou 13 points pour le tour restant (déclenchement en « rouge 30 »).
6. **Podiums (c1)** : un seul podium commun avec photo, discours limités au partenaire titre.

**Ne se compressent jamais** :

- les tests techniques (t1) ;
- les finales (f1, f2) ;
- la sécurité (briefing, tour des issues) ;
- le temps de restitution du lieu, sauf accord écrit de l'exploitant pour dépasser la fenêtre ;
- le temps de repos entre deux matchs d'une même équipe.

**Retour à la normale** : quand le retard redevient « vert », on ne rattrape pas au-delà. Les horaires publics ne sont jamais avancés.

### 27.3 Tops sensibles

- **Q3 (q4, q5).** Lumière réduite seulement avec l'accord de l'exploitant (section 20). Silence demandé avant chaque départ. Le jingle de pole n'est lancé qu'après le dernier run et la validation du temps par le juge.
- **Révélation (r1).** Le régisseur ne lance l'animation qu'après la signature de la feuille de classement par le responsable compétition. En cas de réclamation en cours, la révélation attend la décision (cinq minutes au plus, R-10).
- **Finales (f1, f2), séquences critiques.** Un arbitre de réserve est présent, un ballon de match de secours est à la table, et le poste de secours est prévenu du début de chaque finale.

---

## 28. Budget prévisionnel

Les montants sont en euros TTC. L'organisateur supposé est une association non assujettie à la TVA (H-02, à confirmer par son expert-comptable). Toutes les dépenses sont des **estimations ou des hypothèses** à remplacer par des devis (H-06). Dans la v0.2.0, aucune ligne n'a encore la certitude « devis ».

### 28.1 Dépenses

<!-- @gen:budget -->

### 28.2 Recettes

<!-- @gen:revenues -->

### 28.3 Scénarios

<!-- @gen:scenarios -->

### 28.4 Configurations

<!-- @gen:variants -->

### 28.5 Lecture critique

**Postes à faire deviser en premier.** L'ordre combine trois critères : le poids dans le budget, la dépendance à une décision extérieure et le caractère d'hypothèse.

| Rang | Poste | Pourquoi d'abord | Auprès de qui | Avant |
|---|---|---|---|---|
| 1 | E01 Mise à disposition du gymnase (hypothèse) | Conditionne tout le reste. Le tarif associatif, la gratuité éventuelle et les prestations incluses (nettoyage, agent, matériel) sont inconnus | Service des sports de la commune | J-90 (C-01) |
| 2 | E03 Dispositif prévisionnel de secours | Le dimensionnement et le prix relèvent de l'association agréée, à partir de la grille officielle et de l'effectif prévisible déclaré [S-G2-15] | Association agréée de sécurité civile | J-90 |
| 3 | E04 Agents de sécurité / SSIAP | Dépend des exigences de l'exploitant et de la posture Vigipirate. Toute palpation impose une société de sécurité privée autorisée [S-G2-17, S-G2-18] | Exploitant, prestataire autorisé | J-60 |
| 4 | E02 Assurance responsabilité civile | L'attestation est exigée par le lieu et les autorités. La garantie doit couvrir explicitement les locaux prêtés, les bénévoles, les mineurs, la buvette et le matériel confié [S-G2-10] | Assureur ou courtier | J-45 |
| 5 | E18 Droits musicaux (hypothèse) | Un barème SACEM « clubs sport amateurs » existe pour 2025 ; les montants 2026 et les conditions du forfait sont à vérifier sur le site de la SACEM [S-G2-24, S-G2-25] | Délégation régionale SACEM | J-30 |
| 6 | E09, E10 Sonorisation et vidéo | Postes techniques les plus lourds ; la solution de rétroprojection (section 20) change le devis | Loueur événementiel | J-45 |
| 7 | E21 Prestation studio (hypothèse) | Doit être contractualisée, avec son mode de calcul (section 29) | Studio EVENT LAB | J-90 |
| 8 | E05 Arbitres | Barème du comité et régime social et fiscal à confirmer (section 24) | Comité départemental de basket | J-60 |
| 9 | E08 Chronométrage | Location ou prêt par un club ; test obligatoire à J-7 | Loueur, club partenaire | J-45 |

**Hypothèse, estimation : ce qu'il faut retenir.** E01, E18 et E21 sont des hypothèses : aucune base n'existe encore. Les autres lignes sont des estimations de conception. La dérive de coûts du scénario (prudent, central, ambitieux) et la provision pour aléas de 10 % s'appliquent tant qu'une ligne n'est pas devisée. Chaque devis signé fait passer la ligne en « devis » ; il faut alors régénérer.

**Postes absents du budget** (correction proposée, à chiffrer par devis) :

- matériel manquant listé en section 23 : radios, compteurs, grille magnétique, kits de parcours, chronomètres manuels, passe-câbles, eau, kit sol, dossards, terminaux de paiement, routeur ;
- frais de la plateforme de billetterie et de paiement en ligne (modèle économique de la plateforme à vérifier) ;
- coût éventuel de l'homologation FFBB et des pass joueurs si un Open 3x3 homologué est choisi [S-G1-09] ;
- location de la salle de repli et d'un panier mobile (configuration de secours) ;
- nettoyage facturé par la commune s'il n'est pas inclus.

**Ce que changent les configurations** :

- **Économique** :
  - suppression de la prestation studio (E21), du speaker rémunéré (E11), du vidéaste (E15) et des t-shirts (E16) ;
  - réduction de la sonorisation, de la vidéo, de la signalétique, des dotations et de la communication.
  
  Dépenses au scénario central : {{summary.variants.economique.expensesCentral}} €. Résultat central : {{summary.variants.economique.results.central}} €. Résultat prudent : {{summary.variants.economique.results.prudent}} €.
  
  **À lire avec le tableau des ressources humaines.** event.json précise que, dans cette configuration, le speaker et la coordination sont assurés par des bénévoles de l'équipe cœur. Le tableau RH généré reste pourtant celui de la configuration standard, avec ces deux rôles en prestataires, parce que les variantes ne modifient pas les effectifs. Il faut former ces bénévoles avant J-30.
- **Premium** :
  - mur LED, éclairage scénique, captation et diffusion en direct, espace invités, signalétique et communication renforcées ;
  - partenaire titre et recettes premium supposés plus élevés.
  
  Dépenses au scénario central : {{summary.variants.premium.expensesCentral}} €. Résultat central : {{summary.variants.premium.results.central}} €. Le tableau des configurations montre que le résultat reste négatif même au scénario ambitieux. **La configuration premium n'est pas finançable sur ces hypothèses** : elle suppose un financeur dédié et signé.

**Recettes sécurisées, probables, hypothétiques** (classement d'event.json) :

| Certitude | Lignes (v0.2.0) | Peut devenir sécurisée… |
|---|---|---|
| Sécurisées | Aucune (H-07) | — |
| Probables | R01 billetterie, R02 inscriptions, R03 buvette (recettes proportionnelles au public et aux équipes) | R02 au paiement en ligne ; R01 à chaque prévente payée. R03 ne l'est jamais avant J |
| Hypothétiques | R04 food trucks, R05 t-shirts, R06 et R06b partenaire titre (acompte à la signature, solde après l'événement), R07 partenaires officiels, R08 partenaires locaux, R09 subvention municipale, R10 subvention départementale ou régionale (et R11, R12 en premium) | « Probable » dès un accord oral (H-07). « Sécurisée » : R04 et R08 à la convention ou au bon de commande ; R06, R06b et R07 à la signature du contrat ; R09 et R10 à la notification de la subvention |

Deux corrections de modélisation sont proposées :

1. **Préventes.** R01 est entièrement encaissée à J. Les préventes en ligne ne sont pas modélisées, alors qu'elles réduisent le besoin de trésorerie. Il faut scinder R01 en « prévente » (encaissée avant J) et « sur place ».
2. **Inscriptions.** Une inscription payée et non remboursable (R-05) est une recette **sécurisée** : il faut reclasser R02 au fur et à mesure des paiements.

**Prix.** Les prix de 5 € la journée, gratuits pour les moins de 12 ans, et de 60 € par équipe sont cohérents avec les hypothèses de consentement à payer d'event.json. Ils n'ont pas encore été confrontés aux tarifs des tournois et événements locaux, faute de relevé sourcé : à faire avant l'ouverture des ventes (J-75).

---

## 29. Modèle économique

### 29.1 Seuil de rentabilité

<!-- @gen:breakeven -->

En configuration standard, il faut **{{summary.breakevenCentral}} spectateurs uniques** au scénario central pour atteindre l'équilibre. Ce seuil dépasse la fréquentation centrale retenue (H-04). La standard n'est donc pas à l'équilibre au scénario central, d'où le résultat central de {{summary.results.central}} €.

En configuration économique, le seuil (tableau des configurations, section 28) est très inférieur à la fréquentation centrale. Le risque se déplace alors vers la **réalisation des recettes forfaitaires** (partenaires, subventions, redevances), toutes hypothétiques à ce stade (H-07), plus que vers la fréquentation. Au scénario prudent, le seuil de la configuration standard dépasse même la fréquentation ambitieuse (tableau du seuil) : sans recettes forfaitaires, la standard ne s'équilibre pas.

### 29.2 Trésorerie

<!-- @gen:cash -->

**Besoin de trésorerie (configuration standard, scénario central) : {{summary.cashNeedCentral}} €. Point bas : {{summary.cashNeedDay}}.** Il y a deux raisons :

1. Les dépenses tombent avant J (sécurité, secours, sonorisation, vidéo, achats de la buvette) ou le jour J (arbitres, speaker, repas), alors que les recettes arrivent le jour J (billetterie, buvette, partenaires payés sur place) ou après (subventions à J+60 et J+90).
2. Le moteur compte les dépenses du jour J avant les recettes du jour J. Dans les faits, la recette de la journée (espèces, cartes) n'est disponible qu'après dépôt en banque. Le point bas est donc réel.

En configuration économique, le besoin descend à {{summary.variants.economique.cashNeedCentral}} €.

**Comment le financer** (à décider par le bureau avant le go / no-go n°1 ; contrôle C9) :

1. **Préventes en ligne** de billets et d'inscriptions, encaissées avant J (correction de modélisation, section 28).
2. **Acomptes partenaires** : déjà modélisé pour le partenaire titre (acompte de 50 % à la signature, R06). À étendre aux partenaires officiels et locaux : facturation à la signature, part payable avant J-15, inscrite au contrat.
3. **Versement anticipé de la subvention municipale**, ou acompte avant J, à demander à la commune lors du dépôt du dossier (J-120). Il faut connaître les pièces exigées pour un versement avant l'événement.
4. **Avance de l'association** sur ses fonds propres, votée par le bureau, avec un plafond et une date de retour.
5. **Échéances fournisseurs** : paiement à réception de facture après J quand le fournisseur l'accepte. Pas de levier sur la sécurité et le secours.
6. En dernier recours, une facilité bancaire, que l'association doit pouvoir rembourser même au scénario prudent.

Si le besoin n'est pas couvert par un financement **nommé** à J-60, l'édition passe en configuration économique ou est reportée.

### 29.3 Sensibilité (scénario central)

<!-- @gen:sensitivity -->

**Lecture** (ordre constaté à la génération v0.2.0, à relire après chaque régénération) :

- **Les dépenses** pèsent le plus, devant le sponsoring, la fréquentation et les prix. La priorité est de **faire deviser**, de couper les postes optionnels tant que les recettes ne sont pas sécurisées, et d'obtenir du matériel prêté.
- **Le sponsoring** vient ensuite : signer le partenaire titre avant J-60 est le levier commercial principal (R-08).
- **La fréquentation et les prix** pèsent moins. Augmenter le prix d'entrée rapporterait peu et contredirait le positionnement (public familial, accès peu cher). Il est recommandé de garder les prix et de travailler la prévente.

### 29.4 Recommandation de configuration

1. **Première édition en configuration économique.** C'est la seule configuration positive au scénario central, et elle a le besoin de trésorerie le plus faible (tableau des configurations). Sa perte au scénario prudent reste importante ({{summary.variants.economique.results.prudent}} €) : d'où la règle de report du go / no-go n°1 tant que les recettes forfaitaires ne sont pas obtenues.
2. **Options déclenchables au go / no-go n°2 (J-30)** si K02 est atteint : vidéaste (contenus verticaux), t-shirts, communication payante, dans cet ordre (valeur pour les éditions suivantes).
3. **Passage en standard** seulement si, à J-60, les conditions du jalon M06 sont réunies : couverture des dépenses standard par les recettes sécurisées et probables, partenaire titre signé avec acompte, trésorerie financée.
4. **Premium** : pas avant d'avoir mesuré l'audience réelle de deux éditions, et seulement avec un financement dédié signé (partenaire de diffusion, partenaire titre renforcé).

### 29.5 Rémunération du studio

- event.json prévoit une prestation forfaitaire de coordination et de licence (E21, hypothèse H-03), payée à J+30, et supprimée en configuration économique.
- Pour l'édition pilote, plusieurs mécanismes sont à arbitrer entre le studio et le bureau :
  - un forfait réduit, payable seulement si le résultat de l'édition est positif ;
  - la gratuité de la licence pilote contre la remise complète des données de bilan (prévu / réel), qui servent à construire l'offre de licence ;
  - un forfait de licence pour les éditions suivantes.
  
  Aucun montant n'est proposé ici : il dépend du contrat.
- **Transparence** : le studio coordonne l'événement et en est rémunéré. Le bureau garde la décision sur les go / no-go, et la prestation figure au budget présenté aux financeurs.

### 29.6 Ce que l'association gagne

- **Financièrement** : un excédent possible en configuration économique au scénario central ({{summary.variants.economique.results.central}} €), mais une perte possible au scénario prudent ({{summary.variants.economique.results.prudent}} €). Ce montant doit pouvoir être absorbé par les réserves, ou l'édition doit être reportée.
- **Durablement** :
  - une propriété événementielle récurrente (la Grille Series) ;
  - une base de joueurs, de bénévoles et de partenaires ;
  - des contenus réutilisables ;
  - un dossier documenté pour les financeurs ;
  - la possibilité de devenir licencié de référence du format dans sa région.

---

## 30. Stratégie de communication

### 30.1 Positionnement

**« Le tournoi 3x3 où le matin compte. »** LA GRILLE se présente comme le rendez-vous 3x3 en salle de la ville, accessible à tous les niveaux, avec une dramaturgie lisible : qualifs, grille, poules, finales.

Règle de conduite : **l'expérience réelle passe avant la visibilité**. Aucun moment n'est retardé, rejoué ou déplacé pour une caméra ; aucune équipe n'est sollicitée pendant son appel ; les refus d'image sont respectés.

### 30.2 Objectifs

| Phase | Objectif | Indicateur |
|---|---|---|
| Avant | Remplir les 24 places d'équipes | K01 : 20 équipes inscrites et payées à J-14 |
| Avant | Sécuriser les recettes | K02 : recettes sécurisées ≥ 50 % des dépenses engagées à J-30 |
| Pendant | Faire venir le public des finales et des moments forts | K03 : spectateurs uniques ; K05 : attente à l'entrée |
| Après | Produire des contenus durables et des données pour les partenaires | K07 : vues des contenus verticaux à J+7 (cible à fixer après la 1re édition) |
| Après | Faire revenir | K09 : intention de réinscription |

### 30.3 Messages par public

| Public | Message principal | Preuve | Ton |
|---|---|---|---|
| Joueurs et joueuses | « Les qualifs décident de ta place. » Joue dès 10 h, au moins 3 matchs, ta photo sur la grille | Règlement, vidéo du parcours | Tutoiement, défi |
| Joueuses | Une catégorie à part entière, finale en soirée, dotation identique | Programme | Tutoiement |
| Familles et public | Une journée de basket en salle à 5 €, gratuite pour les moins de 12 ans ; trois rendez-vous : Q3 à 11:20, révélation à 11:35, finales à 18:10 | Programme | Vouvoiement, pratique |
| Partenaires | Des temps forts à votre nom et un bilan chiffré à J+7 | Dossier (section 31) | Vouvoiement, factuel |
| Collectivité | Une animation jeunesse et féminine, sans alcool, documentée et reproductible | Blueprint, bilan J+30 | Institutionnel |
| Bénévoles | Un poste clair, une équipe, la meilleure place pour voir la Q3 | Fiches de poste | Chaleureux |

### 30.4 Canaux

| Canal | Public | Rôle | Rythme |
|---|---|---|---|
| Instagram | Joueurs 16–35 ans | Vitrine : portraits, compteur d'équipes, résultats | 2 à 3 publications par semaine de J-45 à J+7 |
| TikTok, YouTube Shorts | Joueurs, jeunes publics | Formats verticaux : parcours, runs, Q3 | 1 à 2 vidéos par semaine, quotidien la dernière semaine |
| Facebook | Familles, clubs, collectivités | Événement, infos pratiques, album | Hebdomadaire |
| LinkedIn | Partenaires, entreprises | Annonces de partenaires, bilan | À chaque signature et au bilan |
| Messageries des clubs | Joueurs licenciés | Appel aux équipes, rappels | J-100, J-75, J-45, J-14 |
| Presse et radio locales | Grand public | Annonce, reportage | J-90, J-21, J-1, J+1 |
| Affichage | Quartier, gymnases, commerces partenaires | Notoriété locale | Pose à J-45, renfort à J-14 |
| E-mail | Inscrits, acheteurs de billets | Informations pratiques, convocation | J-7, J-3, J+1 |

### 30.5 Calendrier éditorial (J-120 à J+30)

| Date relative | Canal | Format | Contenu | Objectif | Responsable |
|---|---|---|---|---|---|
| J-120 | E-mail, rendez-vous | Note d'une page + dossier | Présentation du projet à la collectivité et aux premiers partenaires (aucune date publique avant la convention du lieu) | Lancer la prospection | Directeur de l'événement |
| J-110 | Instagram, TikTok | Création des comptes + 3 visuels d'identité | « Une grille. 24 places. Bientôt. » (après réservation du nom, section 3.6) | Constituer l'audience | Responsable communication |
| J-100 | Messageries des clubs, e-mail | Message + visuel | Appel à manifestation d'intérêt des équipes, sans paiement | Mesurer la demande (zone d'ignorance n°2) | Responsable compétition |
| J-90 | Presse locale | Communiqué court | Date et lieu, après signature de la convention (C-01) | Notoriété | Responsable communication |
| J-90 | Instagram, TikTok, Shorts | Vidéo verticale de 20 s | Le format en trois plans : qualifs → grille → poules | Compréhension | Responsable communication |
| J-75 | Tous canaux, page web | Annonce + lien | Ouverture des inscriptions (60 € par équipe) et de la billetterie (5 €) ; règlement v1 | Inscriptions | Responsable communication |
| J-75 | Facebook | Événement | Infos pratiques familles, gratuité moins de 12 ans | Public familial | Responsable communication |
| J-70 | Instagram | Carrousel | « Les règles en deux minutes » | Compréhension | Responsable compétition |
| J-60 | LinkedIn, Instagram | Publication | Annonce du partenaire titre **si signé** ; aucune promesse d'élément non financé avant le go/no-go | Valoriser le partenaire | Référent partenaires et invités |
| J-55 | TikTok, Reels, Shorts | Vidéo verticale de 30 s | Un joueur ou une joueuse local(e) teste le parcours : premier temps de référence | Défi, viralité | Responsable communication |
| J-45 | Instagram, Facebook | Série hebdomadaire | Compteur réel des équipes inscrites par catégorie (chiffres exacts, pas de fausse rareté) | Inscriptions | Responsable communication |
| J-45 | Affichage | Affiches A3 et A2 | Gymnases, commerces partenaires, mairie, établissements scolaires (avec accord) | Public local | Bénévoles |
| J-30 | YouTube, page web | Vidéo commentée | Vidéo officielle du parcours + règlement définitif (R-10) | Équité, préparation | Responsable compétition |
| J-30 | Instagram, LinkedIn | Carrousel | Présentation des partenaires officiels signés | Partenaires | Référent partenaires et invités |
| J-30 | Réseaux (option) | Publicité ciblée locale | Uniquement après le go/no-go n°2 et en configuration standard | Billetterie | Responsable communication |
| J-21 | Presse locale, radio associative | Interview | Le porteur du projet + une joueuse ; angle « le matin n'est plus un temps mort » | Notoriété | Directeur de l'événement |
| J-21 | Stories | Sondage | « Qui prendra la pole ? » (sans lot à ce stade) | Engagement | Responsable communication |
| J-14 | Instagram, TikTok | Portraits | Une équipe par jour (avec consentement) | Attachement | Responsable communication |
| J-10 | Facebook, messageries | Visuel « infos pratiques » | Accès, horaires, PMR, buvette sans alcool, eau gratuite | Préparation | Référent accessibilité |
| J-7 | E-mail aux équipes | Convocation | Horaires, documents, autorisations parentales, rappel de confirmation | Opérations | Responsable compétition |
| J-3 | Instagram, TikTok, page web | Visuel + vidéo | Ordre de passage de Q1 (tirage) | Suspense | Responsable compétition |
| J-1 | Stories | Coulisses | Montage de la grille au sol | Teasing | Bénévole photo |
| J (08:00) | Stories, Facebook | Visuel | Programme du jour et trois rendez-vous | Venue du public | Responsable communication |
| J (pendant) | Tous | Voir 30.6 | Contenus en direct | Ambiance, contenus | Vidéaste, bénévole photo |
| J (20:00) | Page web, Instagram | Résultats | Palmarès, grilles, liens vers l'album | Information | Responsable communication |
| J+1 | E-mail, réseaux | Album + questionnaire | Photos (consentements respectés) ; questionnaire participants et spectateurs | Mesure (K06, K09) | Responsable communication |
| J+3 | TikTok, Reels, Shorts | Vidéo verticale | Best-of de la Q3 | Visibilité | Vidéaste |
| J+7 | YouTube, LinkedIn | Film court (90 s) + publication | Film de l'édition ; remerciements chiffrés aux partenaires | Partenaires (K07) | Référent partenaires et invités |
| J+14 | Instagram, page web | Visuel | Classement Grille Series et passeports d'équipe en ligne | Fidélisation | Responsable compétition |
| J+30 | Tous | Annonce | Date de l'édition suivante si décidée ; fenêtre de réinscription prioritaire (section 36) | Fidélisation | Directeur de l'événement |

### 30.6 Plan de contenus pendant l'événement

| Heure | Moment | Format | Angle de prise de vue | Diffusion |
|---|---|---|---|---|
| 09:00 | Arrivée des équipes | Stories | Plaques de numéro tenues par les capitaines | Direct |
| 10:00 | Démonstration du parcours | Vertical 15 s | Plongée depuis la tribune (lecture du parcours entier) | J |
| 10:10–11:05 | Q1, Q2 | Vertical 10–15 s par run marquant | Caméra fixe dans l'axe du slalom, hors station ; incrustation du temps au montage | J et J+3 |
| 11:05–11:32 | **Q3** (moment phare) | Vertical 20–30 s | Plan large fixe depuis la tribune + plan serré sur l'écran au moment du temps ; réaction de l'équipe | J (meilleur run) et J+3 (best-of) |
| 11:35 | **Révélation de la grille** | Vertical 30 s | Public face à l'écran, puis l'équipe en pole | J |
| 11:50 | Photo officielle sur la grille au sol | Photo 4:5 et 9:16 | Plongée depuis un escabeau sécurisé, chaque équipe sur son numéro | J+1 (album) |
| 12:00–13:00 | Concours public | Stories | Enfants et parents sur le parcours (avec accord des parents) | Direct |
| 13:00–16:36 | Poules | Vertical 10 s | Paniers au buzzer, victoire à 15 points | J |
| 18:00 | **Entrée des finalistes par numéro de grille** | Vertical 20 s | De dos, vers le terrain et le public | J |
| 18:10–18:45 | Finales | Vertical + photos | Dernier panier, joie, poignées de mains | J et J+7 |
| 18:50 | Podiums | Photos | Grille au sol, trophées, partenaires signés | J+1 |

### 30.7 Règles de tournage

- Personne ne filme dans les stations de qualification ni dans la zone de dégagement de 2 m autour des terrains ; pas de flash pendant les runs.
- Aucun run, match ou annonce n'est rejoué ou retardé pour la vidéo.
- Les personnes portant le bracelet rouge ne sont pas identifiables dans les contenus publiés ; les mineurs ne sont montrés qu'avec autorisation.
- Une seule personne pilote la publication en direct, pour éviter les erreurs de score ou de nom.

### 30.8 Contenus générés par les participants

| Mécanique | Règle | Consentement | Modération |
|---|---|---|---|
| Mot-dièse de l'événement (#LaGrille3x3, à vérifier avant usage) | Libre ; republication par l'organisateur sur demande | Accord explicite de l'auteur avant republication ; accord des parents pour les mineurs | Pas de republication d'images de personnes non consentantes, de propos injurieux ou de blessures |
| Photo d'équipe sur la grille | Chaque équipe reçoit sa photo officielle | Selon les choix d'image de l'inscription | Responsable communication |
| Partage de son temps de run | Carte « mon temps » générée depuis la page de scores (version future) | Données d'équipe publiques uniquement | — |

Aucun avantage sportif ni aucun lot n'est lié à une publication sur les réseaux sociaux.

### 30.9 Relations presse locales

| Média | Angle | Échéance | Responsable |
|---|---|---|---|
| Presse quotidienne régionale | Annonce du nouveau format ; portrait d'une équipe féminine | J-90, J-21 | Responsable communication |
| Radio associative ou locale | Interview du porteur et d'une joueuse | J-21 | Directeur de l'événement |
| Télévision régionale | Reportage le jour J : la Q3 et la révélation (horaires garantis) | Invitation à J-14, rappel à J-1 | Responsable communication |
| Médias basket régionaux, créateurs de contenu | Accès au pit wall entre les créneaux, interviews des finalistes | J-14 | Responsable communication |
| Sites d'agenda locaux | Fiche événement | J-75 | Bénévole |

Le créateur de contenu basket régional est un relais, invité et briefé ; il n'est ni rémunéré à la performance ni associé à une mécanique de jeu.

### 30.10 Budget

Les dépenses de communication et de contenu figurent au budget (section 28). En configuration économique, la communication est organique ; la publicité payante n'est engagée qu'après le go/no-go n°2 (J-30).

---

## 31. Dossier de sponsoring

Structure prévue pour une conversion directe en diapositives (un titre de niveau 3 = une diapositive). Les prix et contreparties sont ceux d'event.json (`sponsor_packages`). Règle : une version par cible ; le prix d'un partenaire n'apparaît jamais dans le dossier d'un autre.

### 31.1 Diapositive 1 — LA GRILLE 3x3, dossier partenaires

- Logo, signature, date et lieu de l'édition.
- Mention : « Document confidentiel — [nom de l'entreprise] ».

### 31.2 Diapositive 2 — Le concept en 20 secondes

- Le matin, chaque équipe joue sa place sur une grille, au chrono.
- À 11:35, la grille est révélée : elle fixe les poules de l'après-midi.
- Le soir, finales Open et Féminines sur le terrain central.

### 31.3 Diapositive 3 — Pourquoi soutenir LA GRILLE

1. **Un public jeune et local**, réuni une journée entière dans une salle de votre ville.
2. **Des temps forts à votre nom** : la Q3, le trophée de la pole, le concours du public, un terrain.
3. **Un engagement visible pour le sport des jeunes et des femmes**, sans alcool, dans un cadre sûr.
4. **Un bilan chiffré à J+7** : vous savez ce que vous avez obtenu.

### 31.4 Diapositive 4 — Qui vous verra

| Public | Volume annoncé | Statut |
|---|---|---|
| Spectateurs uniques sur la journée | **250** (scénario prudent) | Hypothèse H-04 ; mesuré après l'édition (K03) |
| Joueurs et joueuses | 72 à 96 (18 à 24 équipes de 4) | Hypothèse ; capacité du format : 24 équipes |
| Bénévoles et officiels | {{summary.volunteers}} bénévoles prévus | Plan de ressources |
| Audience en ligne | Non annoncée pour la 1re édition | Mesurée à J+7 (K07) ; aucun chiffre promis |

Règle : les audiences annoncées aux partenaires sont celles du **scénario prudent**. Tout autre chiffre est explicitement étiqueté « hypothèse centrale » ou « hypothèse ambitieuse ».

### 31.5 Diapositive 5 — Vos temps forts

| Heure | Temps fort | Pack concerné |
|---|---|---|
| 11:05–11:32 | Q3 Féminines et Q3 Open, un run à la fois | Partenaire titre (« Q3 présentée par ») |
| 11:35 | Révélation de la grille et trophée de la pole | Partenaire titre |
| 11:50–13:00 | Concours public « Ta place sur la grille » | Partenaire officiel |
| 13:00–16:36 | Terrain 2 (36 matchs sur les deux terrains) | Partenaire officiel |
| 16:36–17:00 | Show de mi-parcours : défi public | Partenaire officiel |
| Toute la journée | Mur des partenaires, page web, affiche | Tous |

### 31.6 Diapositive 6 — Les packs

| Pack | Prix | Places | Exclusivité | Contreparties |
|---|---|---|---|---|
| **Partenaire titre** | **4 000 €** | 1 | Exclusivité sectorielle | Dénomination « LA GRILLE 3x3 présentée par [Partenaire] » sur tous les supports ; logo au centre de la grille de départ au sol (zone photo officielle) ; Q3 « présentée par » et remise du trophée de la pole ; logo sur l'écran de la grille à chaque révélation ; stand de 3 × 3 m en zone partenaires ; 4 publications dédiées sur les réseaux de l'événement + mention dans tous les clips verticaux ; 10 invitations, accès au pit wall pendant les finales ; bilan de visibilité chiffré à J+7 |
| **Partenaire officiel** | **1 200 €** | 3 | Une catégorie par partenaire | Nommage d'un temps fort : terrain 2, concours public « Ta place sur la grille » ou show de mi-parcours ; logo sur les bâches de terrain et l'écran entre les créneaux ; stand de 2 × 2 m ; 2 publications dédiées ; 4 invitations ; bilan de visibilité à J+7 |
| **Partenaire local** | **400 €** | 4 | Aucune | Logo sur l'affiche, la page web et le mur des partenaires ; 1 publication collective de remerciement ; 2 invitations |
| **Fournisseur officiel (en nature)** | 0 € | 3 | Une catégorie par fournisseur | Ballons, eau, lots ou matériel en échange d'une visibilité équivalente à un partenaire local ; valeur de la dotation non comptée dans le budget (H-08) |

Correspondance avec le budget : partenaire titre = recette R06, partenaires officiels = R07, partenaires locaux = R08 (section 29). Précisions d'exécution proposées : l'accès au pit wall du partenaire titre se fait accompagné, à 2 personnes au plus et hors de la zone d'appel des équipes ; les publications dédiées sont planifiées au calendrier éditorial (section 30.5).

### 31.7 Diapositive 7 — Activations concrètes

| Partenaire | Activation | Conditions |
|---|---|---|
| Titre | Compte à rebours de la Q3 à l'écran avec le logo ; remise du trophée de la pole par un représentant ; photo officielle de la pole sur le logo au sol ; lot de la prédiction gratuite (en nature) | Aucun message pendant un run ; prise de parole de 30 s maximum à la révélation |
| Titre | Stand de 3 × 3 m : animation sans achat (photo d'équipe ou défi d'adresse si l'espace le permet) | Collecte de données uniquement avec consentement distinct ; aucune donnée du jeu de prédiction transmise sans accord exprès |
| Officiel « Terrain 2 » | Bâche « Terrain 2 — [Partenaire] », annonces du speaker à chaque créneau | Bâches hors de la zone de dégagement |
| Officiel « Concours public » | « Ta place sur la grille présenté par [Partenaire] » ; lots symboliques identiques par catégorie | Gratuit, ouvert à tous |
| Officiel « Show de mi-parcours » | Défi public de 24 minutes à son nom | Contenu validé par le responsable compétition |
| Fournisseur « eau » | Fontaines ou bonbonnes au pit wall et dans le hall (cohérent avec la réduction des déchets, R-14) | Pas de bouteilles individuelles |
| Fournisseur « ballons » | Ballons du parcours et des matchs, mention par le speaker | Ballons identiques pour toutes les équipes |

**Partenaires exclus** : boissons alcoolisées (enceinte sportive, cadre légal de la publicité à vérifier) ; opérateurs de paris ou de jeux d'argent (public dès 16 ans) ; toute marque dont l'activation exigerait de modifier le jeu.

### 31.8 Diapositive 8 — Ce que nous mesurons (bilan à J+7)

| Indicateur | Méthode | Source |
|---|---|---|
| Spectateurs uniques | Billetterie + comptage des gratuits | K03 |
| Passages du logo à l'écran | Journal de la régie (nombre et durée) | Régie |
| Publications dédiées et mentions | Liste datée avec liens | Responsable communication |
| Vues et interactions des contenus | Statistiques des plateformes relevées à J+7 | K07 |
| Photos du partenaire en situation | 10 photos fournies avec droits d'usage | Bénévole photo |
| Retombées presse | Revue de presse | Responsable communication |
| Contacts obtenus au stand | Nombre, avec consentement | Partenaire |

### 31.9 Diapositive 9 — Le cadre de votre soutien

| | Parrainage (packs ci-dessus) | Mécénat (option distincte) |
|---|---|---|
| Nature | Prestation publicitaire : facture émise par l'association | Don sans contrepartie publicitaire ; mention du nom admise |
| Contreparties | Celles du pack | Limitées, en disproportion marquée avec le don |
| Pour l'entreprise | Charge selon son régime (à voir avec son conseil) | Réduction d'impôt de 60 % du don, dans la limite de 20 000 € ou de 0,5 % du chiffre d'affaires hors taxes, le plus élevé des deux [S-G1-52] (taux et plafond vérifiés par sources secondaires concordantes) |
| Pour l'association | Recette de nature commerciale : impact possible sur la TVA et les impôts commerciaux, **à vérifier avec l'expert-comptable** (hypothèse H-02) | Reçu fiscal **seulement si** l'éligibilité de l'association est sécurisée (procédure de rescrit recommandée) |

### 31.10 Diapositive 10 — Calendrier et contact

| Échéance | Étape |
|---|---|
| J-100 | Présentation du projet |
| J-60 | Signature du partenaire titre (condition du passage en configuration standard) |
| J-45 | Signature des partenaires officiels |
| J-30 | Toutes signatures, logos vectoriels reçus, bons à tirer validés |
| J-7 | Brief des activations |
| J | Accueil par le référent partenaires |
| J+7 | Bilan de visibilité |
| J+30 | Rendez-vous de renouvellement |

Contact : référent partenaires et invités (coordonnées dans la version diffusée).

### 31.11 Processus de vente (document interne)

**Prospects types**

| Pack | Profils de prospects | Raison d'acheter |
|---|---|---|
| Titre | Banque ou assurance mutualiste locale, enseigne de sport, entreprise régionale (énergie, BTP, transport), grande surface de la zone | Visibilité jeunesse et ancrage local, temps fort exclusif |
| Officiel | Magasin de sport, réseau de transport, restauration rapide locale, mutuelle santé, auto-école | Un temps fort nommé, un stand |
| Local | Commerces de proximité, professionnels de santé du sport, boulangeries, salles de sport | Soutien au club, présence sur l'affiche |
| Fournisseur | Distributeur d'eau, magasin de sport (ballons), imprimeur (signalétique), boulangerie (repas des bénévoles) | Échange de visibilité contre produits |

**Objectif de pipeline** : 30 contacts qualifiés à J-100 (jalon du rétroplanning) pour 1 titre, 3 officiels, 4 locaux et 3 fournisseurs.

**Argumentaire en trois points** : (1) un format nouveau qui crée des temps forts nommables ; (2) un public jeune et familial, en salle, sur une journée entière ; (3) des engagements mesurés et un bilan chiffré, pas des promesses.

**Script d'appel de 60 secondes**

> « Bonjour, [prénom], je suis [rôle] de [association]. Je vous appelle pour un projet de basket 3x3 qui aura lieu le [date] au [lieu]. Le principe : le matin, chaque équipe joue sa place au chrono, et à 11 h 35 on révèle la grille de départ qui fixe les poules de l'après-midi. C'est un moment très suivi dans la salle, et nous cherchons une entreprise du quartier pour le présenter : la "Q3 présentée par" votre entreprise, avec la remise du trophée de la pole. Nous attendons [250] spectateurs dans notre hypothèse prudente, 24 équipes, et nous vous remettons un bilan chiffré une semaine après. Est-ce que je peux vous envoyer une page de présentation et passer vous voir dix minutes la semaine prochaine ? »

**Relances** : J+3 après le premier contact, envoi de la page de présentation ; J+7, appel ; J+14, dernière relance avec proposition de rendez-vous. Trois relances au maximum, puis le prospect passe en « édition suivante ».

**Calendrier aligné sur les go/no-go**

| Échéance | Action | Lien avec la décision |
|---|---|---|
| J-120 | Dossier prêt (version par cible) | — |
| J-100 à J-75 | Prospection, premiers rendez-vous, signatures des partenaires locaux | Recettes probables à présenter à J-60 |
| Avant J-60 | **Signature du partenaire titre avec acompte** | Critère du go/no-go n°1 : sans titre signé, configuration économique |
| J-60 à J-45 | Signature des partenaires officiels | — |
| Avant J-30 | Toutes signatures et acomptes ; logos reçus | Critère du go/no-go n°2 (K02 ≥ 50 %) |
| J-21 | Bons à tirer de la signalétique | Commande de la signalétique (jalon J-21) |
| J+7, J+30 | Bilan, renouvellement | Préparation de l'édition suivante |

### 31.12 Mesure et bilan de visibilité

Le bilan remis à J+7 reprend le tableau 31.8, avec pour chaque contrepartie du pack : prévu, réalisé, preuve (photo, lien, journal de régie). Une contrepartie non livrée est signalée et compensée à l'édition suivante ou par un avoir, selon la convention.

---

## 32. Plan de sécurité et d'accessibilité prévisionnel

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

Ce plan donne une **information générale** et ne constitue **pas un conseil juridique**. Les règles citées le sont avec leur **statut de vérification**, repris du travail de référence BASK'EST LAB (24/11/2026), qui a confirmé les règles à partir d'extraits indexés de pages officielles, sans relire les textes consolidés. Aucune n'a pu être revérifiée lors de cette rédaction. **Chaque règle doit être confirmée auprès de l'interlocuteur indiqué avant tout engagement.** Il faut consulter un expert (avocat en droit du sport, expert-comptable, préfecture) dès qu'un point engage la responsabilité de l'association.

### 32.1 Données du lieu (à obtenir de l'exploitant)

| Élément | Valeur dans event.json | Statut |
|---|---|---|
| Type d'ERP | X (établissement sportif couvert) | Hypothèse d'archétype |
| Catégorie | Non renseignée | À obtenir |
| Effectif autorisé | Hypothèse de travail (H-01) | À obtenir **par écrit** (C-02), avec sa définition (public seul ou tous les présents) |
| Document de référence | Notice de sécurité, avis de la commission de sécurité | À obtenir |
| Arrêté d'homologation de l'enceinte | Non renseigné | À demander : les sources consultées indiquent qu'une enceinte couverte qui accueille plus de 500 spectateurs doit être homologuée par le préfet. L'arrêté fixe l'effectif par tribune, et toute installation provisoire suppose une autorisation du maire [S-G2-14] (statut : confirmé, version à revérifier ; on ne sait pas si les places debout comptent ni si le seuil est « supérieur à » ou « supérieur ou égal à »). **Les capacités physiques d'event.json (gradins, zone debout, PMR) atteignent ce seuil.** La zone debout est-elle une installation provisoire ? Question à poser à l'exploitant et à la mairie |

### 32.2 Jauge et comptage

- **Règle de jauge** : spectateurs présents simultanément ≤ effectif autorisé confirmé − participants présents − personnel présent, selon la définition retenue par l'exploitant (section 21).
- **Comptage** :
  - deux compteurs manuels à E1 (entrées, sorties), relevés et additionnés toutes les 30 minutes par l'accueil, puis transmis au régisseur (tableau de bord, section 35) ;
  - bracelet journée pour les sorties et retours ;
  - liste nominative du personnel présent (badges) et des équipes enregistrées.
- **Seuils (R-01)** :
  - alerte si les préventes dépassent 80 % de la jauge, ou si le compteur dépasse 85 % de l'effectif autorisé à 17:00 ;
  - **fermeture temporaire des entrées à 95 %**, avec annonce « complet » au micro et sur les réseaux.
- **Quotas de billets par créneau** (prévention de R-01) : billetterie en ligne avec une jauge maximale par vente.

<!-- @gen:flows -->

*Simulation indicative de dimensionnement — ne remplace pas l'avis du chargé de sécurité.*

**Limites de cette simulation** (`docs/07-algorithmes.md` §5) :

- modèle fluide qui suppose un profil d'arrivée et une durée de présence moyenne (hypothèses H-04 d'event.json) ;
- pas de densité par zone, pas de capacité des issues, pas de comportement de foule ;
- le « pic total » additionne spectateurs, joueurs et personnel, alors que la définition de l'effectif du lieu peut être différente ;
- le pic est calculé sur les spectateurs **uniques** de chaque scénario. Un scénario plus haut que l'ambitieux (incident « affluence + 30 % », section 34) rapproche le pic de l'effectif supposé.

**Seul le comptage réel fait foi le jour J.**

### 32.3 Dispositif de secours

- **Qui dimensionne.** Les sources consultées indiquent que le référentiel national des dispositifs prévisionnels de secours (arrêté du 7 novembre 2006) dimensionne les secours **pour le public**, à partir de l'effectif prévisible déclaré par l'organisateur, de l'activité du public, de l'environnement et du délai d'intervention des secours publics. Seules les **associations agréées de sécurité civile** peuvent assurer un tel dispositif [S-G2-15, S-G2-16] (statut : confirmé, version à revérifier). EVENT LAB ne calcule ni le ratio ni l'effectif. La grille peut conclure qu'aucun dispositif n'est imposé ; l'autorité de police peut néanmoins en exiger un. event.json le budgète par prudence (E03). Les joueurs et le personnel ne sont pas comptés dans l'effectif public de la grille : leur couverture relève de l'organisateur.
- **Moyens sur place** :
  - poste de secours SEC (4 × 4 m), signalé et toujours accessible ;
  - DAE du lieu localisé et vérifié lors de l'état des lieux ;
  - trousse de premiers secours de l'organisateur ;
  - point d'eau.
- **Chaîne d'alerte** :
  1. le témoin prévient le bénévole le plus proche ;
  2. message radio « secours » avec le lieu précis (terrain, zone, repère) ;
  3. le chef de poste de l'association agréée engage ses équipiers et décide de l'appel aux secours publics ;
  4. le responsable compétition interrompt le match si nécessaire ;
  5. un bénévole attend les secours extérieurs à l'entrée du bâtiment et les guide (circulation.svg) ;
  6. l'événement est consigné dans la main courante.
- **Accès des véhicules de secours** et itinéraire d'évacuation d'une victime : à définir avec l'exploitant et l'association agréée (hypothèse du plan : par E1 et le hall).

### 32.4 Sécurité incendie et évacuation

- Les **consignes de l'exploitant priment**. Il faut se faire remettre les consignes de sécurité et le plan d'évacuation, et demander qui assure le service de sécurité incendie exigé par le classement du lieu (E04 : agents ou SSIAP selon les exigences de l'exploitant, à confirmer).
- **Dégagements** : allée AL, portillons de la zone debout, zone libre devant S2, couloirs latéraux et issues (E1, S1, S2) libres en permanence. Aucun stockage, aucune file d'attente, aucun câble non protégé. Le nombre et la largeur des dégagements (unités de passage) dépendent de l'effectif et du règlement de sécurité : **valeurs à obtenir de l'exploitant**, aucune n'est vérifiée dans ce dossier.
- **Matériaux** : réaction au feu des bâches, habillages et adhésifs grand format à faire valider par l'exploitant (section 20). Rien ne masque l'éclairage de sécurité, la signalisation, les extincteurs ou le DAE.
- **En cas d'alarme** :
  - arrêt immédiat du jeu et de la musique ;
  - message pré-écrit, lu calmement par le speaker (texte validé avec l'exploitant) ;
  - bénévoles d'orientation à leur poste d'évacuation (bouts d'allée, portillons, issues) ;
  - référent accessibilité et accompagnateurs désignés auprès des personnes à mobilité réduite ;
  - regroupement au point de rassemblement ;
  - contrôle de la présence des équipes (liste d'accueil) et du personnel (badges).
- **Autorisation d'utilisation exceptionnelle.** Si l'usage prévu sort de l'activité habituelle du classement (public debout sur l'aire, affluence inhabituelle, spectacle), une demande d'autorisation au maire peut être nécessaire. Elle comprend le formulaire « GN6 », un plan et une notice de sécurité. Le délai est d'un mois selon le texte et de deux mois dans certaines communes [S-G2-12] (statut : confirmé, version à revérifier ; délai non vérifié). **À vérifier auprès de la mairie dès J-90.**

### 32.5 Sûreté

- Vérifier la **posture Vigipirate** en vigueur avant l'événement [S-G2-18, S-G2-19]. Les sources consultées indiquent un nouveau plan entré en vigueur le 22 juin 2026 et une posture « vigilance renforcée » pour l'été et l'automne 2026 (statut : vérifié 2025-2026). Une nouvelle posture peut avoir été publiée depuis.
- Les bénévoles peuvent accueillir et faire une inspection visuelle des sacs, avec le consentement de leur propriétaire. **Aucune palpation par des bénévoles** : elle est réservée à des agents de sécurité privée habilités [S-G2-17] (section 24).
- Point de contact avec la police municipale ou nationale à établir via la mairie.

### 32.6 Accessibilité

| Sujet | Disposition prévue | Statut |
|---|---|---|
| Accès et cheminement | E1 est aussi l'accès PMR (PMR1). Cheminement hall → E1 → allée AL → emplacements PMR, sans marche ni obstacle, allée libre en permanence | À vérifier sur place ; notice d'accessibilité du lieu à demander (C-12) |
| Emplacements réservés | 8 emplacements au premier rang de la zone debout, au centre, vue dégagée sur T1, T2 et l'écran ; places assises pour les accompagnants à côté | Nombre à confronter aux règles applicables et à la demande réelle (réservation à l'achat du billet, E23) |
| Sanitaires accessibles | Non renseignés dans event.json | À relever ; fléchage depuis le hall |
| Information accessible | Programme en facile à lire et à comprendre (FALC), pictogrammes, grands caractères, contrastes élevés ; annonces du speaker doublées à l'écran ; page web lisible sur téléphone | E23 |
| Handicaps invisibles | Espace calme à l'écart des enceintes (vestiaire ou coin du hall, à définir), casques anti-bruit en prêt au point info, aucune lumière stroboscopique, possibilité de sortir et revenir avec le bracelet, accueil sans justificatif | À organiser par le référent accessibilité |
| Accueil | Référent accessibilité identifié (fiche de poste), briefing de tous les bénévoles d'accueil, place pour les chiens d'assistance | — |
| Participation inclusive | Pas encore de catégorie ni de démonstration de basket fauteuil (piste d'amélioration de l'évaluation, avec un club handisport) | Décision ouverte |

Les obligations d'accessibilité du bâtiment incombent à son propriétaire. L'organisateur répond de l'accessibilité de son **implantation** (installations temporaires, cheminements, places réservées, information). Ce partage de responsabilités n'a pas été vérifié dans une source officielle : **à vérifier auprès de l'exploitant et de la mairie**.

### 32.7 Mineurs

- **Participants de 16 et 17 ans** (âge minimum de 16 ans, décision de la v0.2.0) :
  - **autorisation parentale** signée par un titulaire de l'autorité parentale, avec contacts d'urgence et autorisation d'intervention médicale d'urgence (C-09) ;
  - **attestation parentale relative au questionnaire de santé du mineur**. Le questionnaire lui-même n'est **jamais** collecté [S-G2-28, S-G2-29] (statut : confirmé, version à revérifier ; le texte vise les compétitions autorisées ou organisées par une fédération, son application à un tournoi non officiel n'est pas tranchée) ;
  - **droit à l'image** : depuis la loi du 19 février 2024, les parents protègent en commun l'image de leur enfant. Il faut viser **l'accord des deux parents**, avec une autorisation par finalité (site, réseaux, presse, partenaires) [S-G2-31, S-G2-32] (statut : confirmé, version à revérifier).
- **Spectateurs mineurs** :
  - point de rencontre « enfant perdu » au point info, avec une procédure écrite et une annonce sans nom complet ;
  - jamais un adulte seul avec un mineur dans un vestiaire.
- **Personnes au contact des mineurs** : contrôle d'honorabilité (section 24).

### 32.8 Chaleur et sol

- **Chaleur** :
  - ventilation du gymnase à vérifier avec l'exploitant (édition de printemps ou d'été) ;
  - eau gratuite au pit wall et dans le hall ;
  - pauses d'hydratation autorisées par les arbitres en cas de forte chaleur (R-03).
  
  Le format en salle limite le risque météo. À titre d'exemple, l'Open Plus 3x3 de Nancy, prévu en extérieur, a été annulé en 2026, la chaleur et la réglementation locale étant les motifs rapportés [S-G1-14]. La version plein air envisagée par la cadence « 2 éditions par an » exige un plan chaleur et une salle de repli réservée.
- **Sol** :
  - adhésifs compatibles parquet, testés à J-1 ;
  - aucune boisson dans l'aire de jeu ;
  - bénévole « sol » avec serpillière pendant les poules ;
  - contrôle par l'arbitre avant chaque créneau (R-12) ;
  - tout plot ou cerceau du parcours est retiré de T1 et T2 avant les poules.

### 32.9 Démarches réglementaires

<!-- @gen:compliance -->

**Source, interlocuteur et statut de vérification de chaque démarche :**

| Id | Ce qu'il faut savoir (information générale) | Source consultée | Statut de vérification | Interlocuteur |
|---|---|---|---|---|
| C-01 | Convention écrite : horaires, matériel du lieu, nettoyage, responsabilité en cas de dommage aux locaux prêtés, assurance exigée | — (contrat) | — | Service des sports de la commune |
| C-02 | Effectif, type et catégorie d'ERP par écrit ; arrêté d'homologation de l'enceinte s'il existe ; statut de la zone debout | [S-G2-14, S-G2-12] | Confirmé, version à revérifier | Exploitant ; mairie ; préfecture |
| C-03 | Responsabilité civile obligatoire de l'organisateur, couvrant bénévoles et pratiquants ; **informer les participants** de leur intérêt à souscrire une assurance individuelle accident (case dans le formulaire) | [S-G2-10, S-G2-11] | Confirmé, version à revérifier | Assureur ou courtier |
| C-04 | Déclaration au maire pour les manifestations à but lucratif réunissant plus de 1 500 personnes, entre un an et un mois avant : seuil non atteint dans les trois scénarios (tableau des flux). Autres déclarations locales possibles | [S-G2-13] | Confirmé, version à revérifier | Mairie ; préfecture (polices administratives) |
| C-05 | Dispositif de secours selon le référentiel national, assuré par une association agréée ; convention à joindre au dossier mairie | [S-G2-15, S-G2-16] | Confirmé, version à revérifier | Association agréée de sécurité civile |
| C-06 | Déclaration préalable à la SACEM (qui collecte aussi pour la SPRE), environ 15 jours avant ; bilan des recettes et des œuvres dans les 10 jours après | [S-G2-24, S-G2-25] | Principe confirmé ; montants 2026 à vérifier | Délégation régionale SACEM |
| C-07 | Buvette temporaire : autorisation du maire, groupes 1 et 3, nombre limité par an ; alcool interdit en enceinte sportive sauf dérogation réservée aux associations sportives agréées | [S-G2-20, S-G2-21, S-G2-22, S-G2-23] | Confirmé, version à revérifier | Mairie |
| C-08 | Majeurs : certificat médical **possible** selon le règlement fédéral (compétitions fédérales). Mineurs : attestation parentale du questionnaire de santé. Tournoi non officiel : application non tranchée. Open homologué : licence ou pass FFBB | [S-G2-28, S-G2-29, S-G2-30, S-G2-36] | Confirmé, version à revérifier | FFBB ou comité départemental ; assureur |
| C-09 | Autorisation parentale des 16–17 ans (participation, contacts, intervention médicale d'urgence) | — | Pratique recommandée ; fondement juridique précis non vérifié | Organisateur ; avocat en cas de doute |
| C-10 | Droit à l'image : information des adultes, consentement exprès pour les usages publicitaires ; mineurs : accord des deux parents, autorisation par finalité. **Échéance à avancer à J-75** | [S-G2-31, S-G2-32] | Confirmé, version à revérifier | Organisateur ; CNIL (information) |
| C-11 | RGPD : base légale par traitement, information au moment de la collecte, durées de conservation, minimisation (aucune donnée de santé détaillée : une case « attestation fournie » suffit) ; contrat de sous-traitance avec les plateformes. **Échéance à avancer à J-75** | [S-G2-33, S-G2-34, S-G2-35] | Confirmé pour les recommandations de la CNIL | Organisateur ; CNIL (guides) |
| C-12 | Notice d'accessibilité du lieu ; accessibilité de l'implantation temporaire | — | Non vérifié | Exploitant ; mairie |
| C-13 | Les loteries sont interdites en principe. Une prédiction **gratuite**, sans obligation d'achat, avec règlement écrit, est la forme prudente. event.json la prévoit désormais ouverte à tous, avec ou sans billet (QR code de la page web publique). Si un partenaire organise le jeu, régime des loteries publicitaires | [S-G2-26, S-G2-27] | Confirmé, version à revérifier | Organisateur ; DGCCRF (information) ; avocat |
| C-14 | Occupation du domaine public par les food trucks : titre d'occupation, redevance ou exonération possible pour une association | [S-G2-40] | Existence du régime confirmée ; articles non vérifiés | Mairie (domaine public) |

**Démarches à ajouter à event.json** (correction proposée) :

| Proposition | Objet | Source | Statut | Interlocuteur |
|---|---|---|---|---|
| C-15 | Homologation de l'enceinte et autorisation des installations provisoires (zone debout) | [S-G2-14] | Confirmé, version à revérifier | Exploitant, mairie, préfecture |
| C-16 | Autorisation d'utilisation exceptionnelle de l'ERP (formulaire GN6) si l'usage sort du classement | [S-G2-12] | Confirmé, version à revérifier ; délai non vérifié | Mairie |
| C-17 | Information des participants sur l'assurance individuelle accident (preuve conservée) | [S-G2-10] | Confirmé, version à revérifier | Organisateur, assureur |
| C-18 | Valeur totale des prix (argent et nature, dotations des partenaires comprises) sous le seuil au-delà duquel une manifestation ouverte aux licenciés exige l'autorisation de la fédération délégataire (3 000 € selon les sources consultées) | [S-G1-51] | Confirmé, version à revérifier | FFBB |
| C-19 | Contrôle d'honorabilité des personnes au contact des mineurs, dont arbitres et juges | [S-G2-41, S-G2-42] | Confirmé, version à revérifier | Service départemental jeunesse et sports ; comité |
| C-20 | Posture Vigipirate et mesures de sûreté demandées | [S-G2-18, S-G2-19] | Vérifié 2025-2026 (posture à revérifier) | Préfecture, mairie |
| C-21 | Homologation FFBB si le choix d'un Open 3x3 est fait (pass joueurs, profil FIBA 3x3, délais) | [S-G2-36, S-G2-37] | Confirmé, version à revérifier | FFBB, comité départemental |
| C-22 | Hygiène alimentaire et information sur les allergènes de la buvette | — | Non vérifié | Direction départementale de la protection des populations |

### 32.10 Contacts d'urgence et visas

Les numéros locaux (exploitant, astreinte de la commune, chef de poste de secours, police municipale, référent sécurité) figurent dans une **annexe à diffusion restreinte**, jamais dans ce dossier. Visas avant J-30 : organisateur, exploitant du lieu, chargé de sécurité ou commission selon les exigences locales.

---

## 33. Matrice des risques

<!-- @gen:riskGrid -->

<!-- @gen:risks -->

### 33.1 Les cinq risques majeurs

1. **R-08 — Sponsoring et subventions inférieurs aux prévisions** (criticité la plus élevée).
   - Constat : aucune recette n'est sécurisée et la sensibilité au sponsoring est forte (section 29). Ce risque conditionne l'existence même de l'édition.
   - Signes précurseurs : aucun partenaire titre à J-60 ; recettes sécurisées sous 30 % des dépenses à J-45.
   - Ce qui manque : un **responsable commercial nommé** et un pipeline suivi chaque semaine à partir de J-100, plus la règle de bascule vers la configuration économique, écrite avant les négociations.
2. **R-01 — Afflux au-delà de l'effectif autorisé** (seul risque d'impact 5 en sécurité).
   - Constat : l'effectif est une hypothèse. Tant qu'il n'est pas confirmé par écrit, la probabilité ne peut pas être évaluée sérieusement.
   - Prévention : comptage continu, fermeture à 95 %.
   - Point faible du plan de continuité : la retransmission « dans le hall » ne crée aucune capacité si le hall fait partie du même établissement. Il faut préférer la page web et la diffusion extérieure.
3. **R-02 — Blessure d'un joueur** (probabilité élevée, inhérente au sport).
   - Dégagements insuffisants (1 m derrière la ligne de fond, contact avec le pit wall) : section 21.
   - Le parcours prévoit des haies basses souples ou à rabat (15 à 20 cm), franchies sans ballon (règlement, art. 7.2). Leur tenue est vérifiée au test de J-30, et toute haie déformée est retirée.
   - Échauffement encadré avant Q1.
   - Information des joueurs sur l'assurance individuelle accident (C-17).
4. **R-04 — Retard cumulé du programme.**
   - Le tampon avant le tableau final est plus court que la marge simulée des poules (section 27).
   - La règle de compression et le format compressé doivent être **annoncés au briefing des capitaines**. Un changement de format en cours de journée ne se négocie pas.
5. **R-13 — Bénévoles insuffisants.**
   - Plusieurs rôles d'event.json dépassent dix heures de présence, ce qui augmente le risque de défection et de fatigue.
   - Réponses : recrutement à +20 %, rotations, fiches de poste, polyvalence planifiée (section 34).

**Autres risques critiques ou nouveaux** :

- **R-17 — Édition d'été en extérieur (météo)** : même criticité que R-02, R-04 et R-13, et risque critique. Il ne concerne que la future édition de plein air (cadence « 2 éditions par an »). Il impose des seuils météo écrits, un décideur nommé et un lieu couvert de repli réservé. L'annulation de l'Open Plus 3x3 de Nancy en 2026 en donne un exemple [S-G1-14].
- **R-16 — Têtes de série mal calibrées** (nouveau) : il repose sur l'hypothèse H-09, selon laquelle le classement du parcours reflète le niveau de jeu. Cette hypothèse n'est pas démontrée. Elle sera mesurée après le pilote (indicateur K18 proposé, section 35).
- **R-15 — Gymnase indisponible** : la configuration de secours n'est pas encore modélisée dans event.json (section 21).
- **R-06 — Panne du chronométrage** : le doublon manuel est tenu par les deux juges de chaque station (règlement, art. 7.4). Un renfort par les officiels de table le matin est recommandé, pour que les juges se concentrent sur les pénalités (annexe parcours).

### 33.2 Risques à ajouter (correction proposée)

| Proposition | Catégorie | Description | Prévention | Responsable |
|---|---|---|---|---|
| R-18 | Réputationnel | Erreur de saisie ou de calcul dans la grille révélée (temps inversé, pénalité oubliée) | Double saisie indépendante (juge de station et régie) ; feuille de classement signée par le responsable compétition avant la révélation ; écran figé tant que la feuille n'est pas signée | Responsable compétition |
| R-19 | Réglementaire | Effectif physique (gradins et zone debout) au niveau du seuil d'homologation de l'enceinte ; zone debout non autorisée | Questions C-15 et C-16 posées à J-90 ; zone debout réduite si nécessaire | Directeur de l'événement |
| R-20 | Technique | Coupure électrique du bâtiment (éclairage) | Consignes de l'exploitant ; arrêt du jeu ; calme au micro (mégaphone sur batterie) ; évacuation si l'exploitant la décide | Directeur de l'événement |
| R-21 | Financier | Besoin de trésorerie non couvert avant J | Financement nommé à J-60 (section 29) | Trésorier |
| R-22 | Juridique | Personne non vérifiée au contact de mineurs | Contrôle d'honorabilité (C-19) | Responsable bénévoles |

---

## 34. Plans de continuité

<!-- @gen:continuity -->

### 34.1 Incidents simulés par le moteur

<!-- @gen:incidents -->

**Avis sur les réponses générées.** Certaines réponses du moteur sont **inadaptées en l'état** :

| Incident | Avis | Pourquoi | Réponse retenue |
|---|---|---|---|
| Retard de 30 min au début des poules | **Inadaptée** | Le moteur réduit toutes les séquences non critiques de façon proportionnelle, y compris les poules et les matchs à élimination directe. Or leur durée dépend du nombre de matchs et du format : réduire les quarts ou une demi-finale de quelques minutes n'a pas de sens. Le moteur ne compresse pas non plus le show de mi-parcours en premier | Ordre de compression de la section 27 ; format compressé des poules à partir de 30 min de retard (procédure 1) |
| 3 équipes forfait | **Partiellement adaptée** | La structure est recalculée, mais l'impact financier (perte des inscriptions) contredit la règle « inscription non remboursable » de R-05. Les forfaits sont imputés à la catégorie Open alors qu'ils peuvent toucher les Féminines | Repêchage sur liste d'attente d'abord (impact nul) ; sinon grille adaptée (section 11.11) et poules à 3 (règlement, art. 12 ; procédure 6) |
| Panne informatique | **Incomplète** | Les chronomètres manuels de secours sont retirés avec la ligne de chronométrage, alors qu'ils sont précisément le mode dégradé. Le surcoût en temps du mode manuel n'est pas modélisé (impact nul affiché) | Procédures 2 et 3 |
| Défaillance électrique | **Inadaptée pour une coupure du bâtiment** | Le moteur ne retire que le matériel de l'événement. Une coupure du bâtiment éteint l'éclairage : le jeu s'arrête et la sécurité prime | Si seuls les circuits de l'événement tombent : mode dégradé (micro sur batterie, grille magnétique, chronos manuels). Si le bâtiment est touché : consignes de l'exploitant (R-20) |
| Affluence − 40 % | Adaptée | — | Une caisse de buvette, public regroupé autour de T1, contenus resserrés sur la zone pleine |
| Affluence + 30 % | Adaptée, à compléter | L'impact sur la jauge n'est pas recalculé dans le tableau des flux | Procédure 4 (afflux) ; comptage continu |
| Réduction de budget de 25 % | Adaptée, avec une condition | La suppression de la prestation studio (E21) supprime aussi la coordination du directeur « studio » | Bascule en configuration économique avec un directeur bénévole formé avant J-30 |

### 34.2 Procédures pas à pas

Chaque procédure suit le même schéma : déclencheur observable, décideur, actions dans l'ordre, messages, retour à la normale. Le décideur peut déléguer l'exécution, jamais la décision. Les fiches réflexes d'une page (format A5, classeur de régie) reprennent ces procédures.

**1. Retard de plus de 30 minutes**

- Déclencheur : la table de marque relève un retard supérieur à 30 min au début d'un tour de poule, ou une projection supérieure à 30 min sur l'heure de la première finale.
- Décideur : directeur de l'événement, sur proposition du responsable compétition.
1. Appliquer les leviers 1 à 4 de l'ordre de compression (section 27) s'ils n'ont pas été utilisés.
2. Passer les matchs de poule restants en **7 minutes ou 13 points**. Cette règle a été annoncée au briefing des capitaines, elle ne se négocie pas.
3. Le speaker l'annonce au public, et le pit wall à chaque équipe concernée.
4. Le régisseur met à jour les horaires à l'écran et sur la page web.
5. Prévenir l'exploitant si le démontage risque de dépasser la fenêtre, et demander une prolongation écrite.
6. Noter dans la main courante l'heure, la décision et le retard mesuré.
- Retour à la normale : le format normal reprend au tableau final si le retard repasse sous 15 min.

**2. Panne du chronométrage des qualifications (R-06)**

- Déclencheur : temps électronique absent, incohérent ou contesté sur une station.
- Décideur : responsable compétition (juge-arbitre) ; le régisseur rétablit le matériel.
1. Le run se termine. Les deux juges de la station, chronométreurs manuels permanents (règlement, art. 7.4), donnent leurs temps.
2. Le temps brut retenu est **la moyenne des deux chronos manuels**, arrondie au centième (art. 7.4).
3. Une panne du chronométrage numérique n'entraîne pas de nouveau run si le chronométrage manuel a fonctionné (art. 7.9). Sinon, le responsable compétition peut accorder un nouveau run, couru en fin de manche après 5 minutes de récupération.
4. La manche se poursuit au chronométrage manuel. **Recommandation** à intégrer au règlement : classer toute la manche sur les temps manuels (relevés pour tous les runs), pour ne pas mélanger les précisions (annexe parcours, § 8).
5. Le régisseur tente de rétablir le système pendant les transitions, jamais pendant un run.
6. Si aucun chronométrage n'est possible sur une station, le plan R-06 s'applique (art. 7.9) : Q1 et Q2 sont remplacées par un **concours de tirs** de 60 secondes, annoncé au micro. Le règlement du concours est imprimé dans le classeur de régie.
- Message : « Les temps de cette manche sont pris manuellement par les deux juges ; la procédure est prévue au règlement. »

**3. Panne de l'écran (R-07)**

- Déclencheur : écran noir ou illisible au moment d'un affichage clé.
- Décideur : régisseur ; le directeur est informé.
1. Le speaker prend la main au micro (temps, positions).
2. La **grille magnétique** grand format est mise en place devant SC. Elle est remplie au fil des manches, en doublon, dès 10:10.
3. Le QR code de la page web de résultats est annoncé et affiché.
4. La révélation se fait sur la grille magnétique, numéro par numéro, avec le même suspense.
5. Le régisseur tente le redémarrage pendant la pause ; il ne tente pas de dépannage pendant la révélation.

**4. Afflux au-delà de la jauge (R-01)**

- Déclencheur : le compteur atteint 85 % de l'effectif autorisé confirmé, ou la file extérieure dépasse la cible d'attente (K05).
- Décideur : directeur de l'événement.
1. À 85 % : alerte radio, bénévoles d'orientation renforcés dans l'allée et aux portillons, vérification que les issues sont libres.
2. À 95 % : **fermeture temporaire des entrées**. Annonce « complet » au micro et sur les réseaux. Une entrée n'est autorisée que contre une sortie.
3. Informer la file : pas de promesse d'entrée, résultats en direct sur la page web.
4. Ne jamais ouvrir une zone non prévue ni encombrer l'allée pour « faire de la place ».
5. Main courante : heure, comptage.
- Retour à la normale : réouverture sous 90 % sur décision du directeur.

**5. Blessure (R-02, R-03)**

- Déclencheur : un joueur reste au sol, un arbitre arrête le match, ou un spectateur fait un malaise.
- Décideur : chef de poste de secours pour le soin ; responsable compétition pour le jeu.
1. L'arbitre arrête le jeu, fait éloigner les joueurs et appelle « secours, terrain X » à la radio.
2. Les secouristes interviennent ; personne d'autre ne déplace le blessé.
3. Le speaker demande calme et espace, sans nommer la personne ni commenter.
4. Si le jeu est interrompu sur un terrain, le match suivant peut démarrer sur l'autre terrain.
5. Le joueur blessé est remplacé par le quatrième joueur. Si l'équipe ne compte plus trois joueurs, le match est perdu par forfait et l'équipe garde son classement (R-02).
6. Si un mineur est concerné, ses parents sont prévenus avec les contacts d'urgence du dossier.
7. Main courante et déclaration à l'assureur.

**6. Forfaits d'équipes (R-05)**

- Déclencheur : équipe absente ou incomplète au check-in (09:45), ou forfait annoncé à J-3 ou plus tard.
- Décideur : responsable compétition.
1. Avant J : repêchage dans l'ordre de la liste d'attente (4 équipes).
2. Le jour J avant Q1 : remplacement par la liste d'attente, l'équipe repêchée reprenant la place de l'équipe forfait dans l'ordre de passage (règlement, art. 12). S'il manque encore des équipes, la grille est adaptée selon le tableau « Si moins de 24 équipes » (section 11.11).
3. Après Q1 : pas de remplacement ; la poule concernée se joue à 3 (art. 12). Une équipe absente du pit wall 2 minutes après l'heure de son créneau perd le match par forfait. Deux forfaits entraînent son retrait.
4. Si plusieurs poules sont touchées, on relance le simulateur (section 37) si l'ordinateur de régie le permet, sinon on suit le tableau papier préparé à J-3.
5. Aucun remboursement en cas de forfait (art. 5 et 12), sauf annulation par l'organisateur ou force majeure justifiée.

**7. Défection d'un prestataire**

- Déclencheur : prestataire absent ou injoignable à son heure de livraison, ou annonce de défection.
- Décideur : directeur de l'événement.

| Prestataire | Délai d'alerte | Solution de remplacement |
|---|---|---|
| Sonorisation | Dès J-1 si le matériel n'est pas livré | Sonorisation du lieu ou du club ; enceinte autonome sur batterie et micro HF pour le speaker ; programme acoustique réduit (jingles supprimés) |
| Vidéo | J-1 | Procédure 3 (grille magnétique et page web) |
| Chronométrage | J-7 (test) | Chronos manuels (procédure 2) |
| Arbitres | J-3 (confirmation) | Comité départemental ; arbitres de réserve ; officiels de table qualifiés |
| Speaker | J-1 | Bénévole préparé (textes du conducteur dans le classeur) |
| Secouristes | J-7 | **Pas de remplacement improvisé** : autre association agréée. Si aucun dispositif n'est possible alors que l'autorité l'exige, l'événement ne se tient pas |
| Agents de sécurité | J-7 | Société autorisée de remplacement. Sinon, demander à l'exploitant les conditions minimales d'ouverture |

**8. Gymnase indisponible (R-15)**

- Déclencheur : notification de la commune (travaux, réquisition, conflit de planning), ou constat à l'arrivée.
- Décideur : bureau de l'association si le délai le permet ; directeur de l'événement le jour J.
1. Avant J-30 : activer la salle de repli réservée sous condition, appliquer la configuration de secours (section 21 : un terrain, seize équipes, format resserré), informer les équipes. Celles qui ne peuvent pas être retenues sont remboursées ou placées en liste d'attente, selon la décision du bureau.
2. Entre J-30 et J-2 : même chose, plus un communiqué aux partenaires (contreparties adaptées) et aux spectateurs (remboursement proposé sur demande).
3. Le jour J : si le lieu est inaccessible, **report**. On ne déplace pas un public le jour même vers un lieu non préparé et non autorisé. Message unique sur tous les canaux, remboursement ou validité des billets pour la nouvelle date.
4. Dans tous les cas, la salle de repli doit avoir reçu les autorisations nécessaires (effectif, usage) avant d'accueillir du public.

**Incidents types non couverts ci-dessus** :

- *Météo défavorable* : non applicable au format en salle, sauf pour les déplacements (neige, inondation : décision de report par le bureau). Pour l'édition d'été en extérieur (R-17, risque critique) : bascule sur la configuration de secours en lieu couvert, décidée à J-2 d'après des seuils écrits (chaleur, vent, orage) et par un décideur nommé (directeur de l'événement) ; interruption immédiate en cas d'orage ; report si le repli est indisponible.
- *Affluence inférieure* : une seule caisse, public regroupé autour de T1.
- *Réduction de budget* : configuration économique.

---

## 35. Indicateurs de performance

<!-- @gen:kpis -->

### 35.1 Mesure

| Id | Méthode de mesure | Fréquence | Responsable | Seuil d'alerte | Action si alerte |
|---|---|---|---|---|---|
| K01 | Export de la plateforme d'inscription (équipes payées, par catégorie) | Hebdomadaire de J-75 à J-14, puis quotidienne | Responsable compétition | Sous la cible à J-14 | Relance des clubs et du réseau 3x3 ; ouverture de la liste d'attente ; décision sur la configuration de secours à 16 équipes |
| K02 | Recettes sécurisées (pièces : contrats, relevés) / dépenses engagées (bons de commande signés) | À chaque jalon du rétroplanning, hebdomadaire après J-60 | Trésorier | Sous la cible à J-30 | Go / no-go n°2 : aucune dépense optionnelle |
| K03 | Billets scannés + gratuits comptés à l'entrée (compteur dédié aux moins de 12 ans) | En continu le jour J, consolidé à J+1 | Responsable accueil | — (indicateur de résultat) | — |
| K04 | Écart entre l'heure réelle et l'heure prévue de début de chaque séquence (main courante de la table de marque) | À chaque séquence | Régisseur | Au-delà de la cible | Signaux et compression (section 27) |
| K05 | Attente mesurée dans la file d'entrée (heure d'entrée dans la file d'une personne repère et heure de passage au contrôle) | Toutes les 30 min | Responsable accueil | Au-delà de la cible | Deuxième file ; un bénévole qui scanne les billets dans la file |
| K06 | Questionnaire à J+1 aux capitaines et joueurs : « recommanderiez-vous LA GRILLE ? » (0 à 10) | J+1, relance à J+4 | Responsable communication | Sous la cible | Analyse des réponses ouvertes au bilan de J+30 |
| K07 | Statistiques des plateformes (vues des contenus verticaux à J+7) | J+7 | Responsable communication | — (cible à fixer après la 1re édition) | — |
| K08 | Bilan comptable de l'édition (recettes − dépenses réelles) | J+30, puis J+90 après les subventions | Trésorier | Négatif | Analyse des écarts ligne à ligne ; version suivante |
| K09 | Question dans le questionnaire de J+1 : « vous réinscrirez-vous ? » | J+1 | Responsable communication | Sous la cible | Analyse des freins |
| K10 | Gobelets rendus / gobelets distribués (compte de la consigne) | Fin de journée | Responsable buvette | Sous la cible | Consigne mieux expliquée, points de retour |
| K11 | Équipes de l'édition N inscrites et payées à l'édition N+1 (rapprochement des noms d'équipe ou des capitaines, avec leur accord) | À la clôture des inscriptions de N+1 | Responsable compétition | Sous la cible | Analyse des réponses K06 et K09 ; offre de réengagement (Grille Series) |
| K12 | Bénévoles de N présents à N+1 (liste d'émargement) | Édition N+1 | Responsable bénévoles | Sous la cible | Entretien de sortie ; conditions de mission (rotations, repas, reconnaissance) |
| K13 | Partenaires de N qui signent pour N+1 (conventions) | J-60 de N+1 | Référent partenaires et invités | Sous la cible | Revue du bilan de visibilité ; ajustement des contreparties |
| K14 | Questionnaire spectateurs par QR code à J+1 : « recommanderiez-vous LA GRILLE ? » | J+1 | Responsable communication | Cible à fixer avant l'édition | Analyse des réponses ouvertes |

### 35.2 Objectifs et indicateurs (contrôle C10)

| Objectif d'event.json | Indicateurs | Constat |
|---|---|---|
| Créer un rendez-vous 3x3 récurrent et identifiable | K03, K06, K07, K09, K11, K12, K13, K14 | Couvert |
| Supprimer le temps mort du matin | **Aucun** | **Non couvert** : ajouter K15 « spectateurs présents pendant la Q3 Open, rapportés au pic de la journée » (comptage) et une question sur le matin dans les questionnaires de J+1 |
| Équilibre financier dès la 2e édition ; format licenciable | K02, K08 | Partiellement couvert : ajouter K16 « test de reprise du manuel réalisé par une équipe tierce » (oui ou non, avant la 2e édition) |

Ajouts suggérés :

- **K17** « attente maximale d'une équipe entre deux matchs de poule » (relevée par la table de marque). Il suit la faiblesse d'expérience identifiée en section 13.
- **K18** « corrélation entre le rang de qualification et le classement final ». Il mesure l'hypothèse H-09 et le risque R-16 après le pilote.

### 35.3 Tableau de bord du jour J

Il est tenu par le régisseur dans un tableur sur l'ordinateur de régie, lisible par le directeur. Il est mis à jour aux heures indiquées :

| Indicateur | Mise à jour | Vert | Orange | Rouge |
|---|---|---|---|---|
| Retard du programme (K04) | Chaque séquence | Moins de 5 min | De 5 à 15 min | Plus de 15 min, puis plus de 30 min (section 27) |
| Présence (comptage net) / effectif autorisé confirmé | Toutes les 30 min | Moins de 85 % | De 85 à 95 % | 95 % : fermeture des entrées |
| Attente à l'entrée (K05) | Toutes les 30 min | Sous la cible | Proche de la cible | Au-delà de la cible |
| Interventions de secours | À chaque intervention | 0 | 1 ou plus sans évacuation | Évacuation ou interruption de match |
| Équipes présentes / équipes attendues | 09:45, puis à chaque manche | Toutes | Forfait compensé | Forfait non compensé |
| Stock de la buvette et gobelets disponibles | 12:00, 15:00, 17:00 | Suffisant | Bas | Rupture |
| Incidents techniques ouverts | En continu | 0 | 1 en mode dégradé | Plus d'un, ou un sur une séquence critique |

Les valeurs du jour J sont **reportées dans le bilan post-événement** (`templates/bilan-post-evenement.md` dans le modèle documentaire) et **pas** dans la version validée d'event.json (`docs/08` §6).

---

## 36. Stratégie de fidélisation

Cadence : annuelle, avec option de deux éditions par an (printemps en salle, été en extérieur) cumulées dans le classement Grille Series. Une édition d'été en extérieur n'est envisageable qu'avec une salle de repli réservée sous condition et des seuils météo de décision écrits (annulation de l'Open Plus de Nancy et repli du Quai 54 en 2026 [S-G1-14, S-G1-24]). Briques de fidélisation : Grille Series (points cumulés), passeport d'équipe.

### 36.1 Mécaniques par public

| Public | Mécanique entre éditions | Ce qui est promis | Données conservées (finalité, durée, base) | KPI de retour |
|---|---|---|---|---|
| Participants | **Grille Series** : points de grille et de résultat cumulés (barème au règlement, art. 18) ; badges « Pole » et « Meilleur Q1 » ; **passeport d'équipe** (temps, places, résultats, photos autorisées) | Les points sont conservés si l'équipe garde son nom et au moins 2 joueurs ; le barème est publié avant chaque édition | Nom d'équipe, résultats, contacts du capitaine : 3 ans après l'édition, sauf opposition ; base : exécution de l'inscription et intérêt légitime pour le classement, à valider | K09 intention de réinscription ; **taux de réinscription effectif** (à ajouter) |
| Participants | **Réinscription prioritaire** : fenêtre de 14 jours réservée aux équipes de l'édition précédente avant l'ouverture publique | Annoncée publiquement, même durée pour toutes, places non réservées en douce | Idem | Part des équipes réinscrites dans la fenêtre |
| Participants | **Chrono libre** : séance gratuite de parcours dans un gymnase entre deux éditions, si un créneau est disponible | Aucune ; séance proposée sous réserve | Aucune donnée nouvelle | Participation |
| Spectateurs | Album, film de l'édition, annonce de la date à J+30, rappel à l'ouverture de la billetterie | Information uniquement aux personnes qui l'ont demandé | E-mail de l'acheteur : jusqu'à l'édition suivante si consentement | **Part de spectateurs revenant** (question au questionnaire, à ajouter) |
| Bénévoles | Remerciements nominatifs (avec accord), photo d'équipe, attestation de bénévolat, **priorité de poste** à l'édition suivante, invitation au bilan de J+30 | Choisir son poste en premier | Contacts : 3 ans, avec accord | **Taux de bénévoles revenant** (à ajouter) |
| Partenaires | Bilan à J+7, rendez-vous de renouvellement à J+30, **priorité de catégorie** pendant 60 jours | Exclusivité de catégorie conservée si renouvellement avant la date convenue | Contacts professionnels | **Taux de renouvellement** (à ajouter) |

### 36.2 Communauté entre deux éditions

- **Canaux** : compte Instagram de l'événement (classement, portraits), lettre d'information trimestrielle (3 envois par an au plus), groupe de messagerie des capitaines (logistique uniquement).
- **Contenus** : passeports d'équipe, retour sur les meilleurs temps, rappel des règles avant l'édition, coulisses de la préparation.
- **Pas de manipulation** : pas de série quotidienne, pas de récompense liée au temps passé en ligne, pas de « places presque épuisées » non vraies.

### 36.3 Calendrier après l'événement

| Échéance | Action | Canal | Responsable |
|---|---|---|---|
| J (soir) | Résultats et grilles en ligne | Page web, Instagram | Responsable communication |
| J+1 | Album photo ; questionnaires participants, spectateurs, bénévoles | E-mail, réseaux | Responsable communication |
| J+7 | Film de l'édition ; bilans partenaires | YouTube, e-mail | Référent partenaires et invités |
| J+14 | Classement Grille Series et passeports en ligne | Page web | Responsable compétition |
| J+30 | Bilan prévu/réel ; décision et annonce de l'édition suivante ; réunion des bénévoles | Réunion, réseaux | Directeur de l'événement |
| Ouverture des inscriptions de l'édition suivante (J-75 de N+1) | Fenêtre de réinscription prioritaire de 14 jours, puis ouverture publique | E-mail aux capitaines | Responsable compétition |

### 36.4 Ce que l'équipe de l'édition suivante doit honorer

1. Les points Grille Series acquis et le barème publié.
2. Les passeports d'équipe et leurs données, dans les durées annoncées.
3. La fenêtre de réinscription prioritaire.
4. Les priorités promises aux bénévoles et aux partenaires.

### 36.5 Indicateurs de fidélisation à ajouter à event.json

Taux de réinscription effectif des équipes ; part de spectateurs revenant ; taux de retour des bénévoles ; taux de renouvellement des partenaires. Seul K09 (intention de réinscription, cible 60 % des équipes) existe aujourd'hui.

---

## 37. Manuel de reproduction

Ce manuel s'adresse à une équipe qui n'a jamais rencontré les concepteurs : une association d'une autre ville ou un licencié. Il dit quoi faire, dans quel ordre et avec quels fichiers. Le manuel complet suivra le modèle `templates/manuel-reproduction.md` prévu par le modèle documentaire, qui n'existait pas encore à la date de rédaction.

### 37.1 Les fichiers du kit

| Fichier | Rôle | Qui l'utilise |
|---|---|---|
| `event.json` | Source de vérité : lieu, programme, compétition, ressources, budget, risques, conformité, KPIs, jalons | Chef de projet, trésorier |
| `generated/summary.json`, `generated/sections/*.md` | Résultats des simulations et tableaux du dossier (ne jamais les modifier à la main) | Tous (lecture) |
| `generated/csv/budget.csv`, `recettes.csv` | Budget et recettes, pour le tableur du trésorier | Trésorier |
| `generated/csv/conducteur.csv` | Conducteur du jour J (à compléter : intervenants, tops son, lumière, vidéo, micro) | Régisseur |
| `generated/csv/retroplanning.csv` | Jalons de J-120 à J+60 | Chef de projet |
| `generated/csv/matrice-risques.csv`, `conformite.csv` | Suivi des risques et des démarches | Directeur de l'événement |
| `generated/csv/ressources-humaines.csv`, `materiel.csv` | Recrutement, commandes | Responsables bénévoles et logistique |
| `assets/plans/*.svg` et `generer-plans.mjs` | Plans d'implantation, de circulation et du parcours | Logistique, sécurité, exploitant |
| `annexes/reglement-parcours-qualification.md` | Parcours, chronométrage, juges | Responsable compétition |
| `annexes/fiches-de-poste.md` | Une fiche par rôle clé | Responsable bénévoles |
| `annexes/checklist-jour-J-la-grille.md` | Liste de contrôle du jour J | Directeur, régisseur |
| Dossier BLUEPRINT (PDF) | Lecture d'ensemble, décisions | Bureau, financeurs |

### 37.2 Procédure, dans l'ordre

**Étape 1 — Vérifier les prérequis (J-150).** Il faut :

- un lieu couvert d'au moins la surface minimale d'event.json, avec deux paniers utilisables côte à côte (ou un panier mobile) ;
- une association porteuse avec un bureau qui décide ;
- un noyau de responsables ;
- la capacité de recruter le nombre de bénévoles du tableau RH, plus 20 % ;
- une avance de trésorerie possible (section 29).

Prendre contact avec le studio.

**Étape 2 — Cloner la configuration.** Copier le dossier du blueprint sous un nouvel identifiant. Dans `event.json`, renseigner `parent.relation` (`city_adaptation` pour une autre ville, `venue_adaptation` pour un autre lieu) et remettre `status` à `draft`. Ne jamais modifier une version validée (`docs/08` §3.3).

**Étape 3 — Remplacer le lieu par le relevé réel (J-90).**

- `venue.dimensions` ; `venue.spaces[]` avec les positions mesurées en mètres (x depuis le mur de l'entrée, y depuis le mur des paniers) ;
- `venue.access_points[]` avec leurs largeurs ;
- `venue.erp` avec l'effectif **écrit** de l'exploitant et le document de référence ;
- `venue.utilities` (puissance disponible, sanitaires, internet) ; `venue.constraints` (fenêtres horaires).

**Étape 4 — Adapter la compétition.** Les invariants ne bougent pas (37.4). Les variables se règlent dans `competition.stages[]` :

| Situation | Réglage |
|---|---|
| 1 terrain | Une station de qualification (`parallel_units: 1`), format de secours (section 21) |
| 2 terrains | Configuration de référence |
| 3 ou 4 terrains | Plus de stations en Q1 et Q2 (une par terrain), plus d'équipes possibles ; Q3 toujours un par un sur le terrain central |
| Nombre d'équipes | Poules de 4 de préférence (3 matchs garantis) ; la grille garde les trois manches : Q1 fige le bas de la grille, Q2 le milieu, Q3 attribue les 4 premières places ; placement serpentin |
| Temps disponible | Durées de match des poules et des phases finales (7, 8 ou 10 min ; 13, 15 ou 21 points) |

Ensuite, mettre à jour `program[]` pour que chaque séquence de compétition soit au moins aussi longue que la durée nette simulée, et que la marge soit portée par des séquences compressibles nommées (section 27).

**Étape 5 — Remplacer les montants par des devis locaux.** Passer chaque ligne devisée en `certainty: "devis"`, et chaque recette signée en `secured`. Ajouter les lignes manquantes (sections 23 et 28). Mettre à jour `hypotheses[]`.

**Étape 6 — Relancer les simulations et les contrôles.**

```
node scripts/validate.mjs                                # conformité au schéma
node scripts/build-blueprint.mjs blueprints/<id>         # tableaux, summary.json, CSV, BLUEPRINT.md
node blueprints/<id>/assets/plans/generer-plans.mjs      # plans SVG depuis les nouveaux espaces
```

Les surcouches propres à chaque configuration et le gabarit de la salle de repli sont écrits dans `generer-plans.mjs` : il faut les revoir après tout changement de lieu. Lire ensuite les contrôles C1 à C16 (`docs/08` §5.2), corriger, régénérer, jusqu'à ce qu'il n'y ait plus d'échec bloquant.

**Étape 7 — Préparer (J-120 → J-1)** avec le rétroplanning, les deux go / no-go, les fiches de poste, le règlement et la vidéo du parcours (J-30), et les démarches de la section 32 **adaptées à la réglementation locale**. Le licencié reste seul responsable de ses démarches.

**Étape 8 — Exécuter (J)** avec le conducteur, la checklist et les fiches réflexes.

**Étape 9 — Faire le bilan (J+1 → J+30).** KPIs, bilan prévu / réel, incidents, retour au studio. Le studio propose une version suivante, soumise à approbation.

### 37.3 Points de contrôle qualité du studio

| Point | Échéance | Ce que le studio vérifie | Livrable |
|---|---|---|---|
| CQ1 | J-120 | Configuration clonée valide, hypothèses listées, rôles nommés | Rapport de validation |
| CQ2 | J-90 | Relevé du lieu et plans régénérés ; dégagements, issues et effectif écrits | Plans visés « conception » (jamais « réglementaire ») |
| CQ3 | J-60 | Dossier du go / no-go n°1 : certitudes requalifiées, trésorerie financée | Avis écrit au bureau |
| CQ4 | J-30 | Règlement, vidéo du parcours, kits identiques, démarches obligatoires | Liste de contrôle signée |
| CQ5 | J-7 | Test du chronométrage, de l'écran et de la page web en conditions réelles | Procès-verbal de test |
| CQ6 | J | Respect des invariants (37.4) | Grille de conformité au format |
| CQ7 | J+30 | Bilan complet et données transmises | Bilan et proposition de version |

### 37.4 Invariants du format et variables d'adaptation

| Invariants (ne changent pas sans accord du studio) | Variables (plages admises) |
|---|---|
| Qualifications en trois manches éliminatoires qui figent progressivement la grille ; Q3 un par un sur le terrain central | Nombre de stations (= terrains) ; nombre d'équipes par manche |
| Parcours de qualification identique pour toutes les équipes, deux juges par station, temps et pénalités publiés | Implantation du parcours selon le panier (coordonnées relatives au panier) |
| Révélation de la grille et placement serpentin des poules | Nombre et taille des poules |
| Règles officielles du 3x3 en vigueur, avec des adaptations déclarées avant l'événement | Durées des matchs et scores cibles |
| Grille au sol numérotée et pole identifiée | Habillage, partenaires, langue |
| Sécurité : effectif écrit, dispositif de secours par une association agréée, avertissement réglementaire sur tous les plans | Configuration économique, standard ou premium |

### 37.5 Erreurs à ne pas reproduire

Le registre des erreurs d'EVENT LAB (`knowledge/registre-erreurs.json`) n'existait pas encore. Les erreurs ci-dessous viennent de l'observatoire des erreurs du travail BASK'EST LAB. Elles sont pour la plupart des **schémas récurrents** de l'événementiel sportif amateur (fiabilité « probable », non datés), sauf mention d'une source.

| Erreur | Ce que LA GRILLE fait |
|---|---|
| Planning sans marge et retard en cascade dès le premier créneau | Marge simulée, tampons nommés, ordre de compression, format compressé annoncé au briefing |
| Une seule file pour la billetterie, le contrôle et le check-in | Deux files séparées dans le hall, prévente en ligne |
| Grande salle à moitié vide, ambiance qui s'effondre | Choisir un lieu à la taille du public attendu (scénario central), public concentré au front des terrains |
| Score et programme invisibles pour le public | Afficheurs, écran de la grille, page web en direct |
| Bénévoles absents ou sans mission claire | Fiches de poste, +20 % au recrutement, planning par créneaux, rotations |
| Dépendance à une technologie sans plan B | Chronos manuels, grille magnétique, feuilles papier, page web de relais |
| Terrain collé au public ou à des obstacles | Dégagements, mobilier en retrait, barrières à distance |
| Louer trop grand, trop tôt | Configuration économique et go / no-go financiers |
| Événement extérieur sans repli chaleur | Format en salle ; l'Open Plus 3x3 de Nancy 2026 a été annulé, chaleur et réglementation locale étant les motifs rapportés [S-G1-14] |
| Partenaire réduit à un logo | Une activation par pack et un bilan à J+7 |
| Inscriptions par messages privés, autorisations manquantes | Formulaire unique avec paiement, autorisations parentales, consentements et attestations intégrés |
| Arbitres bénévoles qui appliquent des versions différentes des règles | Briefing commun des arbitres ; règles 3x3 2026 en vigueur (modification du check-ball) à expliquer [S-G1-01] |

Chaque incident de la première édition alimentera le registre des erreurs du studio (`docs/07` §10).

### 37.6 Ville pilote candidate : Nancy

Nancy (Grand Est) et l'association Bask'Est sont la ville et le porteur pilotes candidats. Faits publics :

- Bask'Est est une association déclarée, créée en octobre 2024, dont le siège est à Nancy [S-G1-37] ;
- elle organise déjà des événements de basket, dont une journée ouverte aux personnes de plus de 16 ans, soit le même âge minimum que LA GRILLE [S-G1-40] ;
- le comité départemental de basket organise un Open Plus 3x3 en plein air au parc de la Pépinière [S-G1-15]. L'édition 2026 a été annulée [S-G1-14], ce qui plaide pour un format en salle.

Points d'attention pour le pilote :

- **Taille du lieu.** Le Palais des Sports Jean-Weille compte 6 000 places [S-G1-41]. C'est beaucoup trop pour ce format : il faut un gymnase dont les capacités physiques sont proches de l'archétype.
- **Affiliation.** Il faut vérifier si l'association est affiliée à la FFBB. De cette réponse dépendent l'agrément sport (dérogation buvette), le contrôle d'honorabilité automatisé et l'accès aux financements fédéraux (à confirmer auprès du service départemental de la jeunesse et des sports).

Aucune donnée interne non publique de l'association n'est utilisée dans ce dossier.

---

## 38. Stratégie de développement géographique

### 38.1 Modèle retenu : la licence à des associations locales

Le format est conçu pour être organisé par une association locale avec un accompagnement du studio. Trois modèles ont été comparés :

| Modèle | Conditions | Avantages | Risques | Décision |
|---|---|---|---|---|
| En propre (le studio organise) | Équipe du studio présente dans chaque ville | Contrôle total | Coût fixe, pas d'ancrage local, bénévoles difficiles à mobiliser | Non |
| Partenariat ponctuel | Accord édition par édition | Souplesse | Pas de propriété durable, qualité variable | Pour la ville pilote uniquement |
| **Licence** | Contrat écrit, paquet de licence, charte de conformité | Ancrage local, reproductibilité, propriété du format conservée | Dilution de la qualité (38.6) | **Oui, à partir de la 2e ville** |

### 38.2 Ce que reçoit le licencié, ce que garde le studio

| Le licencié reçoit | Le studio garde |
|---|---|
| Le blueprint de référence (version validée, sans données confidentielles) | La marque, le nom, l'identité visuelle et leurs fichiers sources |
| La configuration (event.json nettoyée) prête à adapter à sa ville et à son lieu | La définition des invariants et leur évolution |
| Le manuel de reproduction et le résultat du test de reprise | Le barème et le classement Grille Series national |
| Les modèles de travail (budget, recettes, conducteur, rétroplanning, risques, checklists) | La validation des adaptations et le contrôle de conformité |
| Le règlement et sa version publique | Les données agrégées et anonymisées des éditions (pour améliorer le format) |
| Le kit d'identité (polices seulement si leur licence le permet) | La négociation des partenaires de dimension nationale |
| Le dossier de sponsoring type (sans prix ni partenaires de l'édition source) | — |
| Les fiches réflexes et le gabarit de bilan | — |

Le contrat de licence (redevance, territoire, durée, propriété intellectuelle) est rédigé par un juriste ; il n'est pas un modèle EVENT LAB.

### 38.3 Contrôle qualité

**Invariants** (vérifiables sur place) : trois manches Q1/Q2/Q3 qui figent des places ; parcours aux cotes du règlement (art. 7.2) et plafond de 90 s ; deux juges par station ; grille révélée à heure fixe (écran ou grille physique) ; placement serpentin ; catégorie Féminines proposée ; prédiction gratuite sans achat si un jeu est organisé ; buvette sans alcool par défaut ; « règles en deux minutes » affichées ; bilan post-événement transmis au studio à J+30.

**Variables admises** (hypothèses de plages, à valider après la ville pilote) : 12 à 32 équipes ; 1 à 4 terrains ; matchs de poule de 7 à 10 minutes ; inscription de 40 à 80 € par équipe ; entrée de 0 à 8 €.

| Contrôle | Échéance | Effet |
|---|---|---|
| Validation de la configuration adaptée (lieu, programme, budget) | J-60 | Accord écrit du studio |
| Vérification de la vidéo du parcours et du règlement local | J-30 | Accord écrit du studio |
| Observation de la Q3 et de la révélation (visite ou vidéo) | J (1re édition du licencié) | Rapport de conformité |
| Bilan prévu/réel transmis | J+30 | Condition du renouvellement |
| Non-conformité grave (invariant supprimé, sécurité) | — | Suspension du droit d'utiliser le nom |

### 38.4 Séquencement

| Phase | Périmètre | Objectif | Condition de passage à la phase suivante |
|---|---|---|---|
| 1. Ville pilote (année 1) | Une ville, configuration économique, porteur local accompagné par le studio | Mesurer les hypothèses H-04 à H-07 et les KPI ; tester le manuel | Résultat ≥ 0 (K08), K06 et K09 atteints, test de reprise du manuel réussi par une personne extérieure |
| 2. Trois villes (année 2) | La ville pilote + 2 villes de la même région, en licence | Classement « Grille Series » régional ; premier licencié autonome | 2 villes sur 3 avec résultat ≥ 0 et rapport de conformité favorable |
| 3. Circuit (année 3 et suivantes) | 6 à 10 villes dans 2 ou 3 régions ; finale régionale ou nationale à étudier (format et budget à simuler séparément) | Propriété reconnaissable, partenaires de dimension régionale | Décision du studio sur données réelles ; au plus 3 nouvelles villes par an |

### 38.5 Prix de licence (hypothèse raisonnée)

| Offre | Contenu | Prix (hypothèse G1-i) | Raisonnement |
|---|---|---|---|
| Ville pilote | Accompagnement complet | Offert | En configuration économique, le poste de coordination du studio (E21) est à zéro |
| **Licence « kit »** | Paquet de licence, accès aux modèles, validation J-60 et J-30, bilan | **450 € par édition**, payés à J+30 | Plafond fixé à 10 % des dépenses centrales de la configuration économique ({{summary.variants.economique.expensesCentral}} €), pour ne pas faire basculer le scénario central d'un licencié ; paiement après J pour ne pas aggraver le besoin de trésorerie |
| Licence « accompagnée » | Kit + coordination de production le jour J | Kit + montant du poste E21 de la configuration standard (section 28) | Réservée aux licenciés en configuration standard |
| Exclusivité territoriale | Un licencié par agglomération | Incluse pour 2 éditions, renouvelable si les contrôles sont favorables | Éviter la concurrence entre licenciés |

Ces montants sont des hypothèses : ils seront recalés sur les coûts réels d'accompagnement mesurés pendant la phase 1.

### 38.6 Critères de choix d'une ville

| Critère | Seuil ou règle | Source de la donnée |
|---|---|---|
| Porteur local | Association déclarée, bureau actif, a déjà organisé un événement public, au moins 15 bénévoles mobilisables (hypothèse) | Registre public, historique d'événements |
| Lieu | Au moins 900 m², deux paniers latéraux utilisables côte à côte, puissance de 9 kW, vestiaires, accès PMR, effectif autorisé confirmé par écrit | Exploitant (exigences d'event.json) |
| Vivier de joueurs | Au moins 30 clubs de basket dans le département ou un circuit 3x3 actif (hypothèse G1-l) | Comité départemental, annuaires |
| Zone de chalandise | En configuration standard, capable de produire au moins {{summary.breakevenCentral}} spectateurs uniques ; en configuration économique, le seuil n'est pas limitant (tableau des variantes, section 2.4) | Données démographiques et historique local |
| Calendrier | Aucun événement 3x3 majeur à 3 semaines près dans un rayon de 60 km | Calendrier de la ligue régionale |
| Financements | Subvention municipale de l'animation sportive probable | Collectivité |
| Accès | Desserte en transport public ou stationnement suffisant | Opérateur de transport |

### 38.7 Ville pilote candidate : Nancy (Grand Est), avec Bask'Est

Seules des informations publiques sont utilisées ; aucune donnée interne de l'association n'a été consultée.

| Critère | Ce qui est établi | Statut | Source |
|---|---|---|---|
| Porteur local | **Bask'Est**, association déclarée créée le 19/10/2024, siège à Nancy | Fait vérifié | [S-G1-37] |
| Projet du porteur | « Association sportive et citoyenne qui utilise le basketball comme outil de lien social, d'inclusion et de dynamisation locale » | Fait vérifié | [S-G1-38] |
| Expérience événementielle | All Star Game Grand Est organisé le 13 juin 2026 au Palais des Sports Jean Weille | Fait vérifié | [S-G1-39] |
| Cohérence avec le format | La Bask'Cup est ouverte aux plus de 16 ans, le même seuil que LA GRILLE | Fait vérifié | [S-G1-40] |
| Écosystème 3x3 | Open Plus 3x3 organisé par le comité départemental au parc de la Pépinière depuis au moins 2023 ; édition 2026 annulée (chaleur, réglementation locale) | Fait vérifié ; motifs probables | [S-G1-15, S-G1-14] |
| Vivier | 46 clubs de basket recensés en Meurthe-et-Moselle | Probable | [S-G1-44] |
| Culture basket | Le SLUC Nancy évolue en Betclic ÉLITE en 2026-2027 | Fait vérifié | [S-G1-43] |
| Lieux | Palais des Sports Jean Weille : 6 000 places assises, accès PMR [S-G1-41] (vérifié) ; grande salle de 44 × 24 m et salle annexe de 36 × 18 m [S-G1-42] (probable) ; desserte par le tram T2 [S-G1-59] (vérifié) | Mixte | [S-G1-41, S-G1-42, S-G1-59] |
| Calendrier régional | Contests et All-Star associatifs concentrés en mai et juin (Strasbourg, Weyersheim, Gries) | Probable | [S-G1-19, S-G1-20, S-G1-21] |

**Lecture.**
1. Nancy réunit un porteur associatif récent mais déjà organisateur, un public basket installé et un écosystème 3x3 estival fragilisé par la chaleur : **le format de salle y répond à un besoin observé**.
2. La grande salle du Palais des Sports aurait les dimensions de l'archétype (44 × 24 m, probable) mais une jauge de 6 000 places, très au-delà du besoin, et un calendrier chargé par le club résident ; **la salle annexe ou un gymnase municipal sont des pistes plus réalistes**, à confirmer par relevé (la possibilité d'y tracer deux terrains 3x3 côte à côte est une hypothèse).
3. Date à viser : **hors de la période mai–juin** déjà chargée en événements associatifs régionaux, et hors des périodes d'occupation maximale des grandes salles [HYPOTHÈSE G1-k] ; à arbitrer avec le calendrier 3x3 de la ligue régionale [S-G1-45].
4. **Question à poser au porteur** (information non publique) : l'affiliation de l'association à la fédération, qui conditionne la dérogation éventuelle pour une buvette dans l'enceinte, l'accès à certains financements fédéraux et le choix du cadre homologué.

**Phase 2 (hypothèse)** : Nancy + deux villes du Grand Est parmi Strasbourg (scène associative active : All-Star Game Alsace lancé en 2025 [S-G1-62], NL Contest [S-G1-20]), Metz et Reims, sous réserve de trouver un porteur local qui remplit les critères de 38.6.

### 38.8 Risques de dilution et parades

| Risque | Signe précurseur | Parade |
|---|---|---|
| Suppression d'un invariant pour économiser (pas de Q3, pas de révélation) | Configuration soumise à J-60 sans Q3 | Validation obligatoire à J-60 ; refus de l'usage du nom |
| Parcours non conforme, contestations | Vidéo du parcours non transmise à J-30 | Contrôle de la vidéo ; kit de marquage standard |
| Incident de sécurité chez un licencié | Effectif autorisé non confirmé à J-60 | Le go/no-go réglementaire reste bloquant ; le studio ne valide pas sans document de l'exploitant |
| Image dégradée par des mécaniques ajoutées (jeux payants, paris, gadgets) | Demande d'ajout d'une mécanique non prévue | Charte : aucune mécanique payante ou aléatoire sur le résultat ; leçon des ligues « gamifiées » dont l'attrait s'est usé [S-G1-31] |
| Expansion plus rapide que les données | Plus de 3 nouvelles villes par an | Plafond de croissance ; passage de phase sur données réelles |
| Concurrence entre licenciés | Deux demandes dans la même agglomération | Exclusivité territoriale |
| Conflits de partenaires (national contre local) | Partenaire local du même secteur qu'un partenaire national | Catégories réservées au niveau national annoncées à l'avance |
| Règles du jeu divergentes d'une ville à l'autre | Règles FIBA mises à jour non répercutées | Mise à jour annuelle du règlement par le studio, briefing des arbitres |
| Données personnelles mal gérées | Absence de mentions d'information | Modèles de mentions et durées fournis ; contrôle à J-30 |

### 38.9 Procédure d'adaptation

Clonage de la configuration avec `parent.relation = city_adaptation` (autre ville) ou `venue_adaptation` (autre lieu) ; remplacement du lieu (`venue`) par les données de l'exploitant ; relance des simulations (programme, flux, finances) ; évaluation repassée en prévisionnelle ; validation du studio à J-60.

## 39. Sources documentaires

<!-- @gen:sources -->

### 39.1 Méthode de vérification

1. **Ce qui a été lu directement.** La configuration (`event.json` v0.2.0), les tableaux générés par le moteur et les documents de méthode du studio [S-G2-01, S-G2-02, S-G2-03]. Le code du moteur a aussi été lu pour expliquer deux écarts : le calcul de la puissance et la réponse aux incidents.
2. **Ce qui n'a pas pu être vérifié en ligne.** Lors de cette rédaction, le quota de recherche web de la session était épuisé, et les sites legifrance.gouv.fr et fiba3x3.com n'étaient pas joignables depuis l'environnement. **Aucune page officielle n'a donc été ouverte pour cette partie.**
3. **D'où viennent les règles citées.** Elles sont reprises du travail de référence BASK'EST LAB (24/11/2026), avec **leurs statuts d'origine, sans les rehausser**. Ce travail a confirmé les règles par recoupement d'extraits indexés de pages officielles, sans lire les textes consolidés :
   - « confirmé, version à revérifier » ;
   - « vérifié 2025-2026 » ;
   - « non vérifié ».
   
   Les sources citées sont les **URL primaires** que ce travail indique. Le champ `verification` de `parts/G2-sources.json` précise le statut de chacune.
4. **Règle d'usage.** Aucun seuil réglementaire, délai ou montant de ce dossier ne doit être appliqué sans avoir été relu dans sa version en vigueur sur le site officiel (Légifrance, Service-public.fr, ministères, CNIL, SACEM, FFBB, FIBA) et confirmé par l'interlocuteur indiqué en section 32. Pour activer la vérification directe, il faut autoriser ces domaines dans les paramètres réseau de l'environnement, puis rouvrir chaque URL et mettre à jour son statut.
5. **Fiabilité.** A pour une source officielle ou primaire, B pour une presse ou étude reconnue, C pour une source secondaire non recoupée, D pour une source déclarative (`docs/07` §9). Les sources de fiabilité C ou D ne fondent aucun chiffre de dimensionnement.

---

## 40. Historique des versions et décisions

<!-- @gen:history -->

### 40.1 Décisions ouvertes à trancher par le bureau de l'association

| N° | Décision | Options | Recommandation du dossier | Échéance |
|---|---|---|---|---|
| D1 | Configuration de la 1re édition | Économique, standard, premium | Économique, avec options déclenchables à J-30 (section 29) | Go / no-go n°1, J-60 |
| D2 | Tournoi homologué FFBB (Open 3x3) ou tournoi non officiel | Homologué (pass joueurs, profil FIBA 3x3, règles fédérales) ou non officiel (règles médicales et assurance à fixer soi-même) | À instruire avec le comité départemental : compatibilité du système de grille avec les règles d'un Open homologué | J-120 |
| D3 | Politique médicale des participants majeurs | Attestation sur l'honneur, questionnaire, certificat | À décider avec l'assureur et selon D2 | J-75 (règlement v1) |
| D4 | Âge minimum | 16 ans avec autorisation parentale (v0.2.0) ou 18 ans | Maintenir 16 ans si les procédures mineurs (section 32) sont tenues | J-75 |
| D5 | Buvette | Sans alcool (v0.2.0) ou dérogation si l'association est agréée | Sans alcool | J-30 |
| D6 | Financement du besoin de trésorerie | Préventes, acomptes, subvention anticipée, avance de l'association | Combinaison écrite, avec un plafond d'avance voté | J-60 |
| D7 | Rémunération du studio pour le pilote | Forfait, forfait conditionnel, licence gratuite contre données | Forfait conditionnel au résultat ou licence gratuite contre données (section 29) | J-90 |
| D8 | Lieu de repli et format de secours | Salle réservée sous condition ; sélection des 16 équipes (ordre d'inscription) ; remboursement des autres | Réserver sous condition ; ordre d'inscription et de paiement | J-90 |
| D9 | Zone debout | Maintien (si autorisée), réduction, remplacement par des bancs bas | Selon les réponses C-15 et C-16 et la vue depuis les gradins | J-90 |
| D10 | Ordre des finales | Féminines puis Open (v0.2.0), ou alternance d'une édition à l'autre | Alternance | J-30 |
| D11 | Gratuité de l'accompagnant d'une personne handicapée | Oui ou non | Oui | J-75 |
| D12 | Durées de conservation des données (inscriptions, attestations, images) | À fixer dans la politique de confidentialité | Durées courtes et écrites (section 32, C-11) | J-75 |
| D13 | Rôle de la grille après le pilote (H-09, R-16) | Garder la grille comme têtes de série, ou ne lui laisser que l'ordre de passage et le choix du terrain | Décider sur la mesure K18 (corrélation entre rang de qualification et classement final) | Bilan J+30 |

Chaque décision est consignée avec sa date et son approbateur dans `history[].decisions` de la version suivante d'event.json. Une version validée n'est jamais modifiée.
