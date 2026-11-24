# 13 — Audit des événements Bask'Est existants

> **Livrable §23-13.** Audit de l'All Star Game Grand Est, de la Bask'Cup et du King of the Court **à partir des données réellement disponibles**, puis 8 versions par événement (exigence §8).
>
> **Base factuelle :** uniquement des sources publiques consultées le 24/11/2026 via moteur de recherche (voir [`research/R1-baskest-et-territoire.md`](research/R1-baskest-et-territoire.md)). Aucune donnée interne de l'association n'a été fournie. Les pages sources n'ont pas pu être ouvertes directement : les faits marqués « probable » sont à confirmer.
>
> **Règle de lecture :** **[V]** = vérifié · **[P]** = probable (source unique ou secondaire) · **[NT]** = non trouvé publiquement · **[E]** = estimation BASK'EST LAB (ordre de grandeur à remplacer par des devis) · **[H]** = hypothèse.
>
> Données structurées correspondantes : `src/data/baskest-events.ts` (`PROPERTIES`, `EDITIONS`, `DATA_REQUESTS`).

---

## 1. Diagnostic d'ensemble (3 constats)

1. **L'audit chiffré est aujourd'hui impossible.** Sur les 14 champs d'audit exigés (§8), aucun indicateur de performance (affluence, recettes réalisées, budget réalisé, satisfaction, digital) n'est public pour aucun des trois événements. Seuls la date, le lieu, la billetterie et le programme annoncé de l'ASG 2026 sont documentés. **Première action : collecter les données internes** (§4 ci-dessous), sinon toute « optimisation » reste une opinion.
2. **Le financement participatif ne porte pas les événements.** La collecte de la Bask'Cup affichait **130 € sur 5 000 €** (3 %, 4 contributeurs, instantané) **[V]** ; celle de l'ASG est terminée avec 1 contributeur sur un instantané **[P]**. Le modèle économique repose donc nécessairement sur d'autres sources (billetterie, partenaires, fonds propres, subventions) — à documenter. Les deux collectes ont des URL quasi identiques, source de confusion pour les donateurs **[P]**.
3. **La marque n'est ni visible ni protégée.** Aucun site officiel ni compte social de Bask'Est n'a été trouvé **[NT]**. « All Star Game Grand-Est » a déjà été utilisé à Metz vers 2019 **[P]** et « King of the Court » est une expression générique : **aucune des trois propriétés n'est aujourd'hui distinctive au sens de la propriété intellectuelle**. C'est un risque (confusion, impossibilité de licencier le format) et un chantier prioritaire.

**Enjeu réel :** transformer trois événements « déclarés » en trois **formats documentés, mesurés et reproductibles** — condition pour obtenir des partenaires, des subventions et, plus tard, des licences.

---

## 2. Ce qui est connu, événement par événement

### 2.1 All Star Game Grand Est — 1re édition

| Champ (§8) | Connu publiquement | Statut |
|---|---|---|
| Date / horaires | Samedi **13 juin 2026, 18h–minuit** (billetterie Billetweb, événement terminé) | [V] |
| Lieu | **Palais des Sports Jean-Weille**, Nancy-Gentilly (6 000 places assises selon sports.gouv.fr ; 6 027 selon Wikipédia) | [V] |
| Programme | Joueuses et joueurs de **N2/N3**, matchs **féminin et masculin**, **concours de tirs et de dunks**, animations, **DJ** | [P] (presse locale, source unique) |
| Objectif déclaré | Mettre en lumière les profils prometteurs auprès des spectateurs, coachs et du monde du basket | [P] |
| Budget | Collecte HelloAsso, objectif **5 000 €**, présentée comme couvrant une partie du budget | [P] |
| Recettes | Collecte terminée (1 contributeur sur un instantané) ; recettes Billetweb inconnues | [P] / [NT] |
| Billetterie | Billetweb ; **tarifs non trouvés** | [V] / [NT] |
| Participants, affluence, partenaires, bénévoles, résultats, digital, retours, incidents | — | [NT] |
| Matériel | Équipements de la salle connus (grande salle ~44 × 24 m [P], salle annexe ~36 × 18 m [P], 12 vestiaires [P], salle de presse, espace restauration [V]) ; matériel propre à l'événement inconnu | [P] |

**Lecture critique (sans données de résultat) :**
- **Forces :** salle emblématique (le SLUC y joue depuis 1976 ; l'All-Star Game LNB 1990 s'y est tenu **[P]**), format reconnu (All-Star + concours + DJ), mise en avant de joueurs N2/N3 sans équivalent local, créneau de fin de saison cohérent avec la disponibilité probable de la salle.
- **Risques structurels identifiés :** une salle de 6 000 places pour une 1re édition associative crée un **risque de salle vide** (ambiance et image) et un coût fixe élevé ; la concurrence directe de l'**ASG Alsace** une semaine plus tard (19-21 juin 2026, Gries) pour les mêmes joueurs N2/N3 **[P]** ; la coïncidence avec une fête municipale le même jour à Nancy **[P]** ; un nom non exclusif.
- **Ce qu'il faut savoir pour conclure :** affluence réelle vs configuration de tribune, résultat financier, part des recettes sécurisées avant J-30, durée des temps morts, retombées digitales.

### 2.2 Bask'Cup

| Champ (§8) | Connu publiquement | Statut |
|---|---|---|
| Éditions | 1re édition en **2025** (article du 27/07/2025) ; nouvelle édition annoncée (« La Bask'Cup revient sur Nancy ») | [P] / [V] (titre de la collecte) |
| Résultat 2025 | **Team Cameroun** vainqueur « en outsider » | [P] |
| Conditions | Ouvert aux personnes de **plus de 16 ans** ; événement « convivial, sportif et inclusif » | [V] / [P] |
| Financement | Collecte **130 € / 5 000 €** (instantané) ; fonds affectés à matériel, sécurité, animations, récompenses | [V] / [P] |
| Date, lieu, format, nombre d'équipes, affluence, partenaires, bénévoles, digital, retours, incidents | — | [NT] |

**Lecture critique :** le nom « Team Cameroun » suggère des équipes identifiées à des pays ou communautés **[H]**. Si c'est le cas, c'est un **atout narratif fort** (une « coupe des nations » locale, très rare en France à cette échelle) **et un point de vigilance** (rivalités, charte fair-play, médiation). La faiblesse de la collecte en ligne indique que la communauté des participants n'est pas (encore) mobilisée comme financeur : il faut lui proposer des contreparties (inscription, maillot, visibilité) plutôt qu'un don.

### 2.3 King of the Court

| Champ (§8) | Connu publiquement | Statut |
|---|---|---|
| Existence d'une édition, date, lieu, règlement, participants, résultats | Aucune trace publique | [NT] |

**Lecture critique :** la propriété est citée par l'association elle-même mais n'existe pas publiquement. Elle est classée **« idée »** dans BASK'EST LAB tant qu'aucune édition n'est documentée. Le simulateur montre que le format « roi du terrain » sur **un seul terrain** est structurellement déséquilibré : sur 12 joueurs pendant 45 minutes, certains ne jouent qu'**un match** quand d'autres en jouent **14**, et une partie des joueurs passe plus de 60 % du temps à attendre (verdict « déséquilibre », voir `formatKingOfTheCourt` dans `src/core/simulation/presets.ts`). Les versions ci-dessous corrigent ce défaut.

---

## 3. Huit versions par événement (exigence §8)

Chaque version **préserve l'identité** de l'événement (indiquée en tête). Coûts = **[E]** ordres de grandeur France 2025-2026 issus du gabarit `src/core/finance/templates.ts`, à remplacer par des devis. Impacts attendus = hypothèses à mesurer avec les indicateurs du §5.

### 3.1 All Star Game Grand Est

*Identité à préserver : vitrine des meilleurs joueurs et joueuses régionaux (N2/N3), matchs féminin et masculin, concours de tirs et de dunks, ambiance DJ en soirée, salle emblématique de Nancy.*

| # | Version | Ce qui change | Justification | Coût [E] | Impact attendu |
|---|---|---|---|---|---|
| 1 | **Optimisée à budget constant** | Tribune partielle face caméras (public concentré), match féminin en prime time (20h-21h), fin de match au score cible (cible = leader + 7) ou mort subite en prolongation, entrées individuelles des joueurs (walk-out), sélection par vote du public plafonné à 30 % + jury, bracket de pronostics sur les concours | Réallocation : ~10-15 % du budget communication basculé vers la captation et les contenus. Les mécaniques ajoutées sont gratuites (règlement, speaker, lumière existante) | **0 € net** (réallocation) | Salle perçue pleine, moments viraux garantis (dernier panier), engagement pré-événement par le vote, meilleure valeur pour les partenaires |
| 2 | **Coût réduit** | Salle annexe du Palais (≈ 36 × 18 m, tribune de 100 places + gradins mobiles) ou gymnase de 500 places ; 1 match F + 1 match M + 1 concours ; sono au lieu d'un show lumière ; captation par des étudiants en audiovisuel | Diminue le coût fixe et le risque de salle vide tant que l'affluence réelle n'est pas connue | **3 000 – 7 000 €** au total | Risque financier faible ; spectacle et prestige réduits ; densité de public élevée = meilleure ambiance perçue |
| 3 | **Premium** | Production arena : écran LED loué, show lumière, bracelets lumineux synchronisés (ou alternative low-cost : lampes de téléphone dirigées par le speaker), hospitalités courtside, diffusion multi-caméras, match des célébrités locales | Monétiser l'hospitalité et la visibilité ; nécessite **≥ 60 % des recettes sécurisées à J-30** (règle de go/no-go) | **35 000 – 60 000 €** | Recettes partenaires et hospitalités ×3 à ×5 [H] ; notoriété régionale ; risque financier élevé si sponsoring non signé |
| 4 | **Petites infrastructures** | « ASG de poche » en gymnase de 300-500 places : format tri-match à 3 équipes en matchs de 12 min (cf. concept EST CONTRE MONDE), concours entre les matchs, billet à 5 € | Rend l'ASG organisable n'importe où dans le Grand Est, y compris hors Nancy | **2 500 – 5 000 €** | Salle pleine, prix accessible, format court et lisible |
| 5 | **Grandes enceintes** | « All-Star Weekend » sur 2-3 jours : vendredi VITRINE (showcase espoirs U18), samedi ASG + concours, dimanche 3x3 Open + finale de L'ÉCHELLE DE L'EST | Rentabiliser une location lourde sur plusieurs jours et multiplier les publics | **45 000 – 90 000 €** | Événement de référence régional ; dépend d'une jauge réelle prouvée en édition 1 et 2 |
| 6 | **Exportable** | Kit « All Star Game [territoire] by Bask'Est » : règlement, conducteur, identité, gabarit budget, kit réseaux sociaux ; éditions territoriales (Metz, Reims, Strasbourg…) dont les meilleurs joueurs alimentent l'ASG de Nancy | Faire de l'ASG un circuit. Avec l'ASG Alsace (association Beyond The Bounce), privilégier **un partenariat** (match inter-territoires) plutôt qu'une concurrence de dates | **2 000 – 4 000 €** pour produire le kit (+ temps bénévole) | Rayonnement régional ; revenus de licence possibles **à terme** (hypothèse, non testée) |
| 7 | **Nouvelles mécaniques** | Tri-match « Lorraine / Reste du Grand Est / Monde » (concept EST CONTRE MONDE) ; draft en direct des équipes par deux figures locales ; prolongation en mort subite ; concours de dunk par équipes | S'inspire des formats qui ont relancé les All-Star en 2025-2026 (NBA 2026 : +87 % d'audience avec un format à 3 équipes [V, cf. R2]) | **0 – 1 500 €** (scénographie, trophée) | Suspense : 3 matchs sur 4 à une possession près dans le format NBA de référence ; à vérifier au simulateur et sur le terrain |
| 8 | **Expérience digitale immersive** | Cartes joueurs « type jeu vidéo » mises à jour en direct, vote MVP par QR code lié au billet, live stream avec habillage (score, cible), filtre réalité augmentée « deviens All-Star », highlights personnalisés envoyés aux joueurs le lendemain | Prolonger l'événement avant/après, créer des contenus partageables par les joueurs eux-mêmes (diffusion gratuite) | **1 500 – 8 000 €** | Portée digitale ×2 à ×4 [H] ; données d'audience valorisables auprès des partenaires (RGPD respecté) |

### 3.2 Bask'Cup

*Identité à préserver : tournoi convivial et inclusif, ouvert dès 16 ans, « réunion du basket » à Nancy, équipes porteuses d'une identité collective (pays / communautés — à confirmer).*

| # | Version | Ce qui change | Justification | Coût [E] | Impact attendu |
|---|---|---|---|---|---|
| 1 | **Optimisée à budget constant** | Poules de 4 puis tableau (≥ 3 matchs garantis par équipe), **derniers matchs de poule joués simultanément** (le simulateur mesure 8 à 13 % de matchs sans enjeu sinon), score en direct par QR code, speaker sur le terrain central, coin familles, fiches de poste bénévoles | Supprime les matchs sans enjeu et les temps morts, première cause d'ennui dans les tournois | **0 € net** | Plus de matchs disputés jusqu'au bout ; meilleure expérience joueur |
| 2 | **Coût réduit** | Version plein air sur un terrain extérieur ou city-stade (autorisation d'occupation + plan chaleur, cf. annulation de l'Open Plus de Nancy 2026), matériel prêté (comité, clubs) | Réduire la dépendance à la location de salle | **800 – 2 000 €** | Accès gratuit pour le public, visibilité urbaine ; risque météo |
| 3 | **Premium** | « Bask'Cup des Nations » : cérémonie d'ouverture avec drapeaux et percussions, village culinaire des associations de diaspora, finale au Palais des Sports, diffusion live, dotation en matériel ou bourse sportive | Valoriser l'identité multiculturelle comme spectacle et comme argument partenaires (diversité, cohésion) | **12 000 – 25 000 €** | Affluence familles et communautés ; partenaires RSE ; **vigilance** : charte fair-play, médiateurs, pas de rivalités identitaires mises en scène de façon hostile |
| 4 | **Petites infrastructures** | Gymnase avec 2 terrains 3x3, 12 équipes, 1 journée, buvette associative | Version « socle » reproductible chaque année | **1 500 – 3 000 €** | Faible risque, format maîtrisé |
| 5 | **Grandes enceintes** | Palais (grande salle + annexe) : 32 équipes 3x3 en poules sur 4 demi-terrains, finale 5x5 sur le parquet central | Si la demande d'inscription dépasse 24 équipes | **15 000 – 30 000 €** | Événement phare estival ; seulement si la jauge joueurs est prouvée |
| 6 | **Exportable** | Qualificatifs « Bask'Cup [ville] » dans d'autres villes du Grand Est ; les vainqueurs viennent à Nancy | Faire de Nancy la finale d'un circuit | **500 – 1 500 € par étape** | Territorialisation, argument Région / Département |
| 7 | **Nouvelles mécaniques** | Divisions (Élite / Challenger) pour des matchs serrés, fin au score cible pour les finales, tournoi annexe « équipes mêlées » (draft de joueurs de toutes les équipes) pour la cohésion | Équilibrer les niveaux, créer des moments de fraternité sportive | **0 – 500 €** | Matchs plus serrés (mesurable : % de matchs à moins de 4 points d'écart) |
| 8 | **Expérience digitale immersive** | Tableau interactif avec pronostics (lot pour le meilleur pronostic), page par équipe, cartes joueurs, clips « mon match » envoyés aux équipes | Engagement des communautés avant et après, sans coût de production lourd | **500 – 3 000 €** | Mobilisation des réseaux des participants (diffusion organique) |

### 3.3 King of the Court

*Identité à préserver (hypothèse, à confirmer par l'association) : format « le vainqueur reste », duel individuel ou petit effectif, titre de « roi » ou « reine » du terrain.*

| # | Version | Ce qui change | Justification | Coût [E] | Impact attendu |
|---|---|---|---|---|---|
| 1 | **Optimisée à budget constant** | Phase de poules d'abord (≥ 3 matchs garantis), puis 30-45 min de « roi du terrain » pour les qualifiés ; **série d'un roi plafonnée à 3 victoires** (il sort avec un bonus) ; défis limités dans le temps | Corrige le défaut mesuré au simulateur (1 à 14 matchs selon les joueurs, attente > 60 %) | **0 €** | Temps de jeu équitable, rythme plus élevé |
| 2 | **Coût réduit** | Tournée de city-stades (concept CITY TOUR 54) : kit transportable, gratuit pour le public | Format naturellement adapté à la rue | **300 – 1 500 € par étape** | Ancrage dans les quartiers, recrutement de joueurs pour les autres événements |
| 3 | **Premium** | Soirée « Couronne » en 1c1 : walk-outs, beatmaker, arène circulaire, diffusion live (cf. concept LE CHARDON) | Le 1c1 devient un produit à part entière en 2025-2026 (tendance relevée dans le benchmark) | **8 000 – 20 000 €** | Contenus très viraux (duels) ; billetterie spectacle |
| 4 | **Petites infrastructures** | Gymnase 1 terrain, 16 joueurs, 2 tableaux (F / M) | Format soirée associative | **800 – 2 500 €** | Accessible et reproductible |
| 5 | **Grandes enceintes** | Trois « trônes » simultanés (trois demi-terrains), puis finale « roi des rois » au centre | Multiplier les terrains supprime la file d'attente, principal défaut du format | **10 000 – 25 000 €** | Jauge joueurs ×3 ; spectacle continu |
| 6 | **Exportable** | Qualifications dans les playgrounds du Grand Est (modèle des tournées 1c1 de marques), finale à Nancy | Format très léger à dupliquer | **300 – 800 € par qualificatif** | Circuit régional, classement individuel |
| 7 | **Nouvelles mécaniques** | Carte joker (45 s de points doubles), échelle de défis entre événements, classement individuel type Elo | Créer une continuité et des décisions stratégiques visibles | **0 – 500 €** | Engagement des joueurs entre les événements |
| 8 | **Expérience digitale immersive** | « Tracker du trône » en direct (qui règne, depuis combien de temps), cartes joueurs, classement en ligne | Rendre lisible un format rapide et confus pour le public | **500 – 2 500 €** | Compréhension du public, contenus récurrents |

**Point de propriété intellectuelle :** avant toute version commerciale, donner au King of the Court un **nom distinctif** (déposable) et garder « King of the Court » comme description du format.

---

## 4. Données à fournir par l'association (par ordre de priorité)

| Priorité | Donnée | Pour quoi faire |
|---|---|---|
| 1 | **ASG 2026** : billets scannés et entrées réelles, configuration de tribune, export Billetweb (ventes par tarif et par date), budget réalisé ligne à ligne, recettes par source | Calculer le seuil de rentabilité réel, dimensionner l'édition 2 |
| 1 | **Identité administrative** : numéro RNA, statuts, bureau, affiliation FFBB éventuelle, comptes sociaux officiels | Subventions, conventions de salle, mécénat, homologations |
| 1 | **Bask'Cup 2025 et suivante** : dates, lieux, format, nombre d'équipes, résultats, recettes, dépenses | Audit du tournoi |
| 2 | **King of the Court** : édition(s) réelle(s) ? règlement, date, lieu, participants | Statut de la propriété |
| 2 | **Partenaires** : liste, montants, apports en nature, contreparties livrées, conventions (Métropole / DESL, Ville, CD54) | Valeur sponsoring, renouvellements |
| 2 | **Bénévoles** : nombre, rôles, heures, présence réelle | Dimensionnement, valorisation comptable du bénévolat |
| 3 | **Digital** : abonnés, portée, vues avant / pendant / après | Preuve de valeur média |
| 3 | **Retours et incidents** : questionnaires, verbatims, main courante | Observatoire des erreurs (§5) |

La saisie se fait dans BASK'EST LAB (module « Analyse post-événement ») ou directement dans `src/data/baskest-events.ts` (`EDITIONS[].dataCompleteness` passe alors de `non_trouve` à `verifie`).

---

## 5. Indicateurs de suivi proposés (à mesurer dès la prochaine édition)

| Indicateur | Cible indicative [H] | Mesure |
|---|---|---|
| Taux de remplissage de la configuration de tribune choisie | ≥ 80 % | Billets scannés / places ouvertes |
| Résultat financier | ≥ 0 € dans le scénario réaliste | Budget réalisé |
| Part des recettes sécurisées à J-30 | ≥ 60 % | Conventions signées / total |
| Temps mort maximal sans action sur le terrain central | ≤ 5 min | Conducteur + chronométrage |
| Attente maximale d'une équipe entre deux matchs | ≤ 60 min | Planning réel |
| Satisfaction spectateurs / joueurs | ≥ 8/10 | Questionnaire QR code |
| Contenus publiés pendant les 7 jours suivants | ≥ 15 | Calendrier éditorial |
| Incidents de sécurité / blessures | 0 grave | Main courante |

---

## 6. Recommandation

1. **Avant toute nouvelle édition : collecter les données de l'ASG 2026** (priorité 1) et les saisir. Sans elles, BASK'EST LAB ne peut que simuler.
2. **Pour l'ASG 2027 : version 1 (budget constant) + version 7 (tri-match) en test**, en configuration de tribune réduite, avec une règle de go/no-go à J-30 (≥ 60 % des recettes sécurisées).
3. **Bask'Cup : version 4 (socle reproductible) + version 1**, et documenter le format.
4. **King of the Court : prouver d'abord le format en CITY TOUR 54** (coût faible) avant toute soirée premium.
5. **Lancer les vérifications de propriété intellectuelle** sur les trois noms et réserver les identifiants sociaux.

*Ce document est une analyse de conception, pas un conseil juridique, fiscal ou comptable. Les montants sont des estimations à remplacer par des devis.*
