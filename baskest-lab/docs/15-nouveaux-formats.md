# 15 — Seize nouveaux formats événementiels

> **Livrables §23-14, §23-16 et §23-17.** Dix formats atypiques, trois concepts à budget limité, trois concepts pour un palais des sports.
>
> **Statut honnête :** les 16 concepts sont au stade **« concept documenté »**. Aucun n'a été testé sur le terrain. Ils ont été passés au **simulateur sportif** (100 tirages chacun, niveaux d'équipes synthétiques) : c'est un banc d'essai des **règles**, pas une preuve que le public viendra. Chaque concept est accompagné d'un **test de validation en 7 jours** pour le confronter au réel avant tout investissement.
>
> Données structurées : `src/data/concepts.ts` (objets `Concept` complets : format jouable par le simulateur, parcours d'expérience, contenus, identité, plan de sécurité). Mécaniques : `src/data/mechanics.ts`. Vérification : `npx tsx scripts/check-concepts.ts`.
>
> **Noms :** propositions ancrées dans la culture de Nancy et de la Lorraine (chardon, mirabelle, Art nouveau, Stanislas). **Aucune vérification de propriété intellectuelle n'a été faite** : la liste des vérifications (INPI, EUIPO, réseaux sociaux, noms de domaine, homonymies) figure dans chaque concept (`identity.nameChecks`) et doit être menée avant toute communication publique.

---

## Vue d'ensemble et résultats de simulation

Durées = minutes **réelles estimées** par match (temps de jeu × facteur d'arrêts : 1,25 en 3x3 et moins, 1,5 en 4x4/5x5). « Meilleure gagne » = probabilité que l'équipe la plus forte remporte l'événement. « Serrés » = part des matchs à faible écart.

| # | Concept | Type | Lieu | Budget | Verdict simulateur | Durée moy. | Meilleure gagne | Serrés | Matchs / équipe |
|---|---|---|---|---|---|---|---|---|---|
| 1 | LE CHARDON — duels 1c1 | Atypique · 1c1 | Gymnase | Limité | Équilibré | 4,7 min | 27 % | 62 % | 3-6 |
| 2 | PAIRES MIRABELLE — 2x2 mixte | Atypique · 2c2 · mixte | Terrain extérieur | Limité | Équilibré | 7,2 min | 37 % | 44 % | 3-6 |
| 3 | LES NOCTURNES — 3x3 score cible | Atypique · 3c3 | Espace temporaire | Standard | Équilibré | 11,8 min | 39 % | 40 % | 3-6 |
| 4 | QUADRA — 4x4 draft mystère | Atypique · 4c4 | Gymnase | Limité | Équilibré | 18,2 min | 54 % | 29 % | 3-5 |
| 5 | LIGNES — 5x5 des quartiers | Atypique · 5c5 | Complexe sportif | Standard | Équilibré | 28,9 min | 52 % | 21 % | 3-5 |
| 6 | RELAIS 1-2-3 — match à étages | Atypique · hybride | Complexe sportif | Limité | Équilibré | 11,9 min | 46 % | 37 % | 3-6 |
| 7 | TRIBU 3G — 3x3 intergénérationnel | Atypique · intergénérationnel | Gymnase | Limité | Équilibré | 9,0 min | 42 % | 52 % | 3-6 |
| 8 | ROUES LIBRES — 3x3 fauteuil pour tous | Atypique · inclusif | Gymnase | Limité | Équilibré | 9,9 min | 52 % | 59 % | 3-5 |
| 9 | SALON NOUVEAU — basket, beat & Art nouveau | Atypique · **hors match** (show) | Espace temporaire | Standard | Équilibré | 2,5 min | 25 % | 68 % | 4 |
| 10 | L'ÉCHELLE DE L'EST — saison des défis | Atypique · **communautaire** | City-stades | Limité | Équilibré | 11,6 min | 55 % | 51 % | 2-10* |
| 11 | CITY TOUR 54 — le roi du city | Budget limité | City-stade | Micro | Équilibré | 8,2 min | 41 % | 48 % | 3-8 |
| 12 | LA VEILLÉE — tournoi nocturne | Budget limité | Gymnase | Limité | Équilibré | 11,4 min | 36 % | 44 % | 4 |
| 13 | PETITS CHARDONS — 2x2 des écoles | Budget limité | Terrain extérieur | Micro | Équilibré | 7,3 min | 42 % | 68 % | 3-6 |
| 14 | VITRINE — showcase & draft des espoirs | Palais | Palais Jean-Weille | Standard | Équilibré | 24,2 min | 56 % | 26 % | 3-4 |
| 15 | NUIT DU PALAIS — 3x3 arena & live | Palais | Palais Jean-Weille | Premium | Équilibré | 11,3 min | 42 % | 40 % | 3-6 |
| 16 | EST CONTRE MONDE — le tri-match | Palais | Palais Jean-Weille | Standard | **Trop aléatoire** (assumé) | 18,2 min | 62 % | 34 % | 2-3 |

\* Simulation avec le plafond réglementaire (1 défi lancé + 1 reçu par semaine) et une échelle initiale classée par niveau. L'écart 2-10 matchs vient des équipes qui défient peu : prévoir un minimum de défis par mois pour rester classé.

**Alerte transversale détectée par le simulateur :** dans tous les formats « poules de 4 puis tableau », **8 à 13 % des matchs se jouent sans enjeu** (qualification déjà acquise ou perdue avant le dernier match). Règle de conception appliquée à tous ces concepts : **programmer simultanément les deux derniers matchs de chaque poule** et attribuer la tête de série du tableau au premier de poule.

---

## A. Dix formats atypiques

### 1. LE CHARDON — duels 1 contre 1
- **Pitch.** 16 duellistes par tableau (féminin et masculin), duels en 11 points ou 5 minutes, horloge de 10 s. Chaque joueur a une « épine » : une carte joker de 45 s pendant laquelle ses paniers comptent double. Walk-out musical choisi par chaque joueur, beatmaker en live. La devise de Nancy, « qui s'y frotte s'y pique », devient une règle du jeu.
- **Format.** Poules de 4 → tableau à 8 avec match pour la 3e place. Mécanique simulée : `joker_card` (45 s).
- **Pourquoi c'est nouveau.** Le 1c1 est en train de devenir un produit à part entière (tendance 2025-2026 relevée dans le benchmark), mais quasi absent des événements régionaux français. La carte joker ajoute une décision stratégique visible par le public.
- **Public.** Passionnés, jeunes, supporters, familles ; deux tableaux pour la mixité.
- **Lieu / budget.** Gymnase, ~350 spectateurs, budget limité.
- **Risques.** Format très physique (récupération : 3 matchs minimum, repos ≥ 10 min) ; effet « gadget » du joker s'il est mal mis en scène ; 62 % de matchs serrés = bon suspense mais forte part d'aléa (la meilleure joueuse ne gagne que 27 % des fois avec des niveaux hétérogènes).
- **Test en 7 jours.** J1-J2 : règlement d'une page + visuel ; J3 : appel à 16 joueurs via 3 clubs et 2 playgrounds ; J5 : session test de 2 h dans un gymnase avec 8 joueurs, chronométrage réel des duels, questionnaire joueurs ; J7 : décision. **Critère de succès :** ≥ 16 inscrits intéressés en 72 h, durée réelle ≤ 7 min par duel, note joueurs ≥ 8/10.

### 2. PAIRES MIRABELLE — 2x2 mixte
- **Pitch.** Une joueuse et un joueur en permanence sur le terrain, matchs de 7 minutes ou 15 points. Toutes les 3 minutes, le public choisit à l'applaudimètre une « zone mirabelle » où les paniers comptent double pendant 60 s.
- **Format.** Poules de 4 → tableau à 8. Mécanique simulée : `public_zone_bonus` (toutes les 180 s).
- **Pourquoi c'est nouveau.** Le 2x2 mixte est rare ; la mixité est garantie par la règle, pas par un « bonus » qui serait condescendant. Le public influence le jeu de façon visible mais limitée.
- **Public.** Femmes, amateurs, étudiants, familles.
- **Lieu / budget.** Terrain extérieur en été (plan chaleur obligatoire), ~250 spectateurs, budget limité.
- **Risques.** Vote du public mobilisé par une communauté (applaudimètre en salle uniquement) ; signalétique lumineuse de la zone indispensable ; météo.
- **Test en 7 jours.** Sondage Instagram + formulaire « trouve ta paire » (J1-J3) ; session test de 2 h avec 6 paires (J5) en mesurant le temps de jeu effectif des joueuses ; décision J7. **Succès :** ≥ 12 paires préinscrites, temps de ballon des joueuses ≥ 40 %.

### 3. LES NOCTURNES — 3x3 au score cible
- **Pitch.** Tournoi 3x3 de 20h à 1h sous projecteurs avec DJ. Après 7 minutes, le chrono s'arrête et une cible est fixée (score du leader + 5) : **chaque match se termine sur un panier gagnant**.
- **Format.** Poules de 4 → tableau à 8 ; fin « Elam » (7 min, +5).
- **Pourquoi c'est nouveau.** La fin au score cible (popularisée par The Basketball Tournament, reprise par la CEBL, la G League et Unrivaled) n'est quasiment jamais utilisée en 3x3 amateur en France.
- **Public.** 18-30 ans, étudiants, passionnés ; tarif famille avant 21h.
- **Lieu / budget.** Halle ou espace temporaire, ~600 spectateurs, budget standard.
- **Risques.** Durée variable (prévoir 3 à 5 min de marge par match : p95 = 14 min) ; nuisances sonores et transports de nuit ; règle à afficher en grand.
- **Test en 7 jours.** Tester la règle de la cible lors d'un créneau 3x3 existant (J3-J5) avec 4 équipes : compréhension par 20 spectateurs interrogés, durée réelle ; prévente « early bird » limitée à 50 billets (J6-J7). **Succès :** ≥ 80 % des spectateurs comprennent la cible, ≥ 50 billets vendus.

### 4. QUADRA — 4x4 draft mystère
- **Pitch.** Inscription individuelle, 8 capitaines, draft en serpentin sur scène, équipes révélées sur place. Puis du 4 contre 4 tout-terrain : plus d'espace que le 5x5, plus de transitions que le 3x3.
- **Format.** 8 équipes, 2 poules de 4 → demi-finales, finale, 3e place ; matchs de 12 min, mort subite.
- **Pourquoi c'est nouveau.** Le 4x4 n'existe dans aucun circuit établi ; la draft transforme un tournoi en spectacle et mélange clubs et quartiers.
- **Public.** Amateurs, passionnés, étudiants.
- **Lieu / budget.** Gymnase, ~250 spectateurs, budget limité.
- **Risques.** Humiliation des derniers choisis (ne jamais annoncer l'ordre complet, « pick surprise » valorisé) ; équilibre des niveaux (chapeaux de niveau) ; draft à huis clos pour les mineurs.
- **Test en 7 jours.** Inscriptions individuelles ouvertes 5 jours sur un formulaire, draft test en visioconférence ou en salle avec 16 joueurs (J6), match test de 12 min en 4x4 (J7). **Succès :** ≥ 40 inscriptions individuelles, note de plaisir de jeu ≥ 8/10.

### 5. LIGNES — 5x5 des quartiers
- **Pitch.** Huit quartiers du Grand Nancy, huit équipes de 10, deux « lignes » de 5 qui alternent toutes les 4 minutes (comme au hockey) : tout le monde joue autant. Matchs de 16 minutes puis score cible (+7). Classement territorial et rivalités racontées en vidéo, encadrées par une charte fair-play et des médiateurs.
- **Format.** 2 poules de 4 → demi-finales, finale, 3e place ; fin « Elam » (16 min, +7).
- **Pourquoi c'est nouveau.** L'alternance de lignes garantit l'équité de temps de jeu et rend le jeu lisible pour les néophytes (signal visible). Le territoire devient l'identité d'équipe.
- **Public.** Jeunes, publics éloignés de la pratique, familles ; fort potentiel pour la politique de la ville.
- **Lieu / budget.** Complexe sportif, ~500 spectateurs, budget standard.
- **Risques.** Tensions entre quartiers (charte, médiateurs, contenus valorisant le respect) ; mobilisation de 10 joueurs par quartier ; durée longue (29 min réelles par match).
- **Test en 7 jours.** Rencontrer 3 structures jeunesse de quartiers (J1-J4), match test inter-quartiers avec changement de ligne (J6), questionnaire joueurs et éducateurs (J7). **Succès :** 3 quartiers capables d'aligner 10 joueurs, aucun incident, adhésion des éducateurs.

### 6. RELAIS 1-2-3 — le match à étages (format hybride)
- **Pitch.** Chaque rencontre se joue en trois étages à score cumulé : 1c1 jusqu'à 7, 2c2 jusqu'à 14, 3c3 jusqu'à 21. Le score ne repart jamais de zéro ; chaque joueur apparaît dans au moins deux étages.
- **Format.** Poules de 4 → tableau à 8. Le simulateur approxime la rencontre par un 3x3 à 21 points (à valider sur le terrain).
- **Pourquoi c'est nouveau.** À notre connaissance, aucun format de basket ne cumule le score à travers des effectifs croissants ; la stratégie (qui joue le 1c1 ?) devient visible.
- **Public.** Passionnés, amateurs, étudiants.
- **Lieu / budget.** Complexe sportif, ~300 spectateurs, budget limité.
- **Risques.** Complexité perçue (vidéo d'explication de 20 s) ; durée plus variable (p95 ≈ 16 min) ; la simulation n'est qu'une approximation.
- **Test en 7 jours.** Deux matchs tests complets entre 4 équipes (J4-J5), chronométrés, filmés, avec 10 spectateurs interrogés sur la compréhension. **Succès :** durée ≤ 18 min, compréhension ≥ 70 %, envie de rejouer ≥ 80 %.

### 7. TRIBU 3G — 3x3 intergénérationnel
- **Pitch.** Une équipe = un·e jeune de 11-15 ans, un·e adulte de 16-44 ans, un·e « sage » de 45 ans et plus (+1 remplaçant). Au moins un jeune et un sage sur le terrain. Matchs de 8 min ou 15 points, horloge de 14 s, arrêt à 10 points d'écart.
- **Format.** Poules de 4 → tableau à 8. Mécanique simulée : `mercy_rule` (10 points).
- **Pourquoi c'est nouveau.** Les tournois familiaux existent, mais rarement avec une contrainte de génération sur le terrain ; ouvre la porte aux tribus d'entreprises (RSE).
- **Public.** Familles, enfants, amateurs, entreprises.
- **Lieu / budget.** Gymnase, ~250 spectateurs, budget limité.
- **Risques.** Sécurité des plus jeunes (contacts) : consignes d'arbitrage spécifiques ; mineurs (autorisations, droit à l'image) ; écarts physiques.
- **Test en 7 jours.** Proposer le format à 2 clubs et 2 entreprises (J1-J3), session test de 3 tribus (J6). **Succès :** 3 tribus constituées en 5 jours, aucun incident, satisfaction ≥ 8/10 chez les trois générations.

### 8. ROUES LIBRES — 3x3 fauteuil pour tous (format inclusif)
- **Pitch.** Tout le monde en fauteuil sportif : joueurs en situation de handicap et joueurs valides dans les mêmes équipes, plafond de points de classification par équipe (joueurs valides classés au maximum). Journée 3x3 puis soirée vitrine. Inspiré du 1er All Star Game de basket fauteuil de la FFH (Bobigny, décembre 2025).
- **Format.** 8 équipes, 2 poules de 4 → demi-finales, finale ; 8 min ou 15 points, horloge de 16 s, arrêt à 10 points d'écart.
- **Pourquoi c'est nouveau.** L'inclusion est présentée comme du spectacle, pas comme une démonstration ; le défi « entreprises en fauteuil » crée un lien direct avec les partenaires.
- **Public.** Personnes en situation de handicap, familles, entreprises, grand public.
- **Lieu / budget.** Gymnase accessible, ~300 spectateurs, budget limité (fauteuils prêtés par un club handisport **à identifier**).
- **Risques.** Disponibilité des fauteuils sportifs (convention de prêt + assurance) ; règles de classification à valider avec des pratiquants ; accessibilité complète (vestiaires, sanitaires, zone de transfert).
- **Test en 7 jours.** Contacter le comité handisport et 2 clubs de basket fauteuil de la région (J1-J3), séance d'essai mixte de 2 h (J6). **Succès :** un club partenaire prêt à prêter ≥ 12 fauteuils, retours positifs des joueurs en situation de handicap (critère prioritaire).

### 9. SALON NOUVEAU — basket, beat & Art nouveau (cœur hors match)
- **Pitch.** Une soirée-spectacle où aucun match n'est l'attraction : concours de tir « au tempo » (le DJ fixe le rythme ; trois spots Bronze/Argent/Or), battles de freestyle ball-handling, panneau de basket peint en direct dans l'esprit de l'École de Nancy, crews de danse, vente caritative des panneaux décorés.
- **Format.** 12 tireurs, course aux points en 4 manches de duels de 2 minutes (approximée au simulateur par un 1c1 chronométré).
- **Pourquoi c'est nouveau.** Relie le basket au patrimoine culturel le plus identifiant de Nancy (Art nouveau) et à la musique ; ouvre des partenariats culturels et des publics non sportifs.
- **Public.** Familles, jeunes, étudiants (écoles d'art), publics éloignés de la pratique, entreprises.
- **Lieu / budget.** Halle ou salle de spectacle, ~800 spectateurs, budget standard.
- **Risques.** Juger le « tir au tempo » de façon fiable (juge dédié, vidéo) ; cadre juridique et fiscal d'une vente aux enchères caritative à vérifier ; ne pas instrumentaliser le patrimoine (partenaires culturels à associer, pas à citer sans accord).
- **Test en 7 jours.** Prototype du tir au tempo avec un DJ et 6 tireurs (J3), vidéo de 30 s publiée (J4), mesure des vues et des réactions, contact de 2 écoles d'art (J5-J7). **Succès :** vidéo ≥ 2× la moyenne de vues du compte, 1 école d'art partante.

### 10. L'ÉCHELLE DE L'EST — la saison des défis (cœur communautaire)
- **Pitch.** Une compétition qui vit entre les événements : les équipes 3x3 s'inscrivent sur une échelle régionale et défient une équipe classée jusqu'à 2 places au-dessus, sur n'importe quel city-stade. Résultats validés par les deux capitaines + photo, arbitre bénévole tiré au sort pour le top 8. Un « Défi Day » mensuel ; finale du top 4 en lever de rideau de l'ASG Grand Est.
- **Format.** 24 équipes, échelle sur 10 semaines ; au plus 1 défi lancé et 1 reçu par semaine.
- **Pourquoi c'est nouveau.** Transforme des événements isolés en **calendrier interconnecté** (exigence §14) à coût quasi nul, et alimente l'ASG en récits.
- **Public.** Amateurs, jeunes, étudiants.
- **Lieu / budget.** City-stades, Défi Days à ~150 spectateurs, budget limité.
- **Risques.** Falsification des résultats (double validation, photo, arbitres tirés au sort) ; couverture d'assurance des défis libres hors manifestation organisée (à vérifier avec l'assureur) ; RGPD du classement (pas de classement public nominatif de mineurs).
- **Test en 7 jours.** Lancer une échelle pilote de 8 équipes sur un formulaire + tableau partagé (J1-J2), 7 jours de défis, mesure du nombre de défis joués et des litiges. **Succès :** ≥ 6 défis joués, 0 litige non résolu.

---

## B. Trois concepts à budget limité

### 11. CITY TOUR 54 — le roi du city
- **Pitch.** Un kit d'événement qui tient dans un utilitaire : en une demi-journée sur le city-stade d'un quartier, 12 équipes 3x3 jouent des poules courtes, puis les 6 meilleures se disputent 30 minutes de « roi du terrain ». Gratuit pour le public. Série d'un roi plafonnée à 3 victoires pour limiter l'attente.
- **Format.** 3 poules de 4 → roi du terrain (6 équipes, 30 min). Le simulateur confirme qu'une phase de poules préalable garantit au moins 3 matchs à chacun (le roi du terrain seul sur un terrain donnait 1 à 14 matchs selon les joueurs).
- **Budget.** Micro : ordre de grandeur **300 à 1 500 € par étape [E]** (sono portable, ballons, médailles, eau, assurance, DPS léger ou PAPS selon le public).
- **Public / lieu.** Jeunes, publics éloignés de la pratique, familles ; city-stade (~120 spectateurs).
- **Risques.** Autorisation d'occupation et voisinage ; chaleur ; sécurité des mineurs ; dégagements réduits sur un city-stade (1,5 m).
- **Test en 7 jours.** Repérer 2 city-stades et 1 structure jeunesse partenaire (J1-J3), mini-étape de 2 h avec 6 équipes (J6). **Succès :** 6 équipes présentes sans relance, ≥ 50 spectateurs, coût réel ≤ 500 €.

### 12. LA VEILLÉE — tournoi nocturne de gymnase
- **Pitch.** Un vendredi soir par mois, 19h-23h30, gymnase municipal : 12 équipes 3x3 en système suisse (4 matchs garantis contre des équipes de niveau proche), playlist collaborative votée par QR code, snacking à petit prix. Un format de prévention par le sport sans en avoir l'air.
- **Format.** Système suisse en 4 rondes, règles 3x3 FIBA (non officiel).
- **Budget.** Limité : ordre de grandeur **800 à 2 000 € par soirée [E]** si la salle est mise à disposition.
- **Public / lieu.** 16-25 ans ; gymnase municipal (~100 spectateurs).
- **Risques.** Horaires tardifs (accord du gestionnaire, adulte référent, retour sécurisé) ; modération de la playlist.
- **Test en 7 jours.** Demande de créneau à la Ville (J1), annonce dans 3 structures jeunesse (J2-J5), soirée pilote raccourcie (J7). **Succès :** ≥ 8 équipes, ≥ 70 % de joueurs prêts à revenir.

### 13. PETITS CHARDONS — 2x2 des écoles
- **Pitch.** Festival de mini-basket pour les 9-12 ans : 16 équipes de 2 (mixité encouragée), paniers abaissés, matchs de 6 minutes ou 10 points, arrêt à 8 points d'écart, médaille pour tous, goûter et stand des clubs locaux.
- **Format.** Poules de 4 → tableau à 8 ; mécanique simulée `mercy_rule` (8 points). 68 % de matchs serrés au simulateur.
- **Budget.** Micro : **300 à 800 € [E]** (matériel prêté par le comité ou les clubs).
- **Public / lieu.** Enfants et familles ; plateau sportif d'école ou terrain extérieur (~150 spectateurs).
- **Risques.** Mineurs (autorisations parentales, droit à l'image signé par les titulaires de l'autorité parentale, contrôle d'honorabilité des encadrants) ; accord de l'établissement scolaire si temps scolaire.
- **Test en 7 jours.** Présenter le format à 2 écoles et 1 club (J1-J4), mini-festival de 8 équipes sur une pause méridienne ou un mercredi (J7). **Succès :** 8 équipes, satisfaction enseignants / parents ≥ 8/10.

---

## C. Trois concepts pour un palais des sports (Palais Jean-Weille)

Contraintes communes : demande d'utilisation au gestionnaire (Métropole du Grand Nancy, présumé) au moins 2 mois avant ; **configuration de tribunes partielle** ; calendrier du club résident (Betclic Élite + FIBA Europe Cup 2026-27) → viser **mai-juin** ; agents de sécurité CNAPS et DPS dimensionné selon le référentiel national (exemple indicatif de la fiche R3 : 6 000 spectateurs assis → DPS de petite envergure).

### 14. VITRINE — showcase & draft live des espoirs
- **Pitch.** Matin en salle annexe : tests mesurés (« combine ») pour 40 U18 proposés par leurs clubs. Après-midi : draft en direct par 4 coachs invités. Soirée : 4 équipes de 10, round-robin en matchs de 16 min et finale, temps de jeu minimum garanti. Clubs, centres de formation et universités en tribune.
- **Format.** 5x5, round-robin à 4 → finale. Peut devenir le « vendredi » d'un All-Star Weekend (lien ASG Grand Est).
- **Budget.** Standard ; ~1 200 spectateurs.
- **Pourquoi c'est nouveau.** Transpose le modèle des showcases (Young Star Game LNB, camps) en événement public régional avec draft.
- **Risques.** **Données de mineurs** (mesures, vidéos) : consentement des titulaires de l'autorité parentale, finalité limitée, pas de classement public des moins de 15 ans, transmission aux clubs uniquement avec accord ; ne pas promettre de débouchés.
- **Test en 7 jours.** Consulter 5 clubs formateurs et 2 coachs (J1-J4) sur l'intérêt et la liste de tests, rédiger la note RGPD (J5), sondage auprès de 20 familles (J6-J7). **Succès :** ≥ 4 clubs prêts à proposer des joueurs, 2 coachs partants.

### 15. NUIT DU PALAIS — 3x3 arena & live
- **Pitch.** Le Palais en mode arena pour une nuit : 16 équipes 3x3 (open et féminin), poules en salle annexe et sur le parquet, tableau final au centre, production de salle (lumière, écran géant loué, DJ puis groupe live), tribunes partielles de 2 500 places, village partenaires dans le hall.
- **Format.** 3x3 FIBA (non officiel), poules de 4 → tableau à 8.
- **Budget.** Premium ; règle de go/no-go : ≥ 60 % des recettes sécurisées à J-30.
- **Pourquoi c'est nouveau.** Prouver qu'un événement associatif peut produire une soirée de niveau arena sur un format court (3x3) qui garantit du rythme.
- **Risques.** Coût fixe élevé (location, technique, sécurité) ; remplissage ; confettis et effets soumis à l'accord du gestionnaire.
- **Test en 7 jours.** Prévente « early bird » de 200 billets (J1-J7) et 3 rendez-vous partenaires avec une offre courtside (J2-J6). **Succès :** ≥ 150 billets vendus et 1 lettre d'intention partenaire ≥ 3 000 €.

### 16. EST CONTRE MONDE — le tri-match
- **Pitch.** Inspiré du format NBA All-Star 2026 (trois équipes, matchs de 12 min sans quart-temps) : « Lorraine », « Reste du Grand Est » et « Monde » (internationaux évoluant dans les clubs de la région), composées par vote du public plafonné et choix des coachs. Round-robin à trois puis finale, mort subite en cas d'égalité. Un tri-match féminin et un masculin dans la soirée.
- **Format.** 5x5, round-robin à 3 → finale. **Évolution possible de l'All Star Game Grand Est.**
- **Simulation.** Verdict « trop aléatoire » : avec trois équipes, la meilleure ne gagne qu'environ 6 fois sur 10. **Assumé** pour un All-Star : les équipes sont composées pour être proches, l'incertitude fait le spectacle ; l'équité se joue dans la composition (jury + vote plafonné).
- **Budget.** Standard ; ~2 000 spectateurs.
- **Risques.** Catégoriser des joueurs par origine peut être mal perçu : présenter « Monde » comme l'équipe des internationaux qui font vivre le basket régional, et valider la formule avec les joueurs concernés ; risque de finale déséquilibrée (constaté en NBA 2026 : 47-21).
- **Test en 7 jours.** Sondage de nom et de format auprès de 30 joueurs N2/N3 et de 100 abonnés (J1-J4), match test de 12 min entre deux équipes (J6). **Succès :** adhésion ≥ 70 % des joueurs sondés, perception positive de la formule « Monde ».

---

## Comment ces concepts entrent dans BASK'EST LAB

- Chaque concept est un objet `Concept` complet : il peut être **simulé** (moteur sportif), **chiffré** (gabarits budgétaires par niveau), **implanté** (configurateur de salles), **noté sur 100** (système de validation) et transformé en **BASK'EST EVENT BLUEPRINT**.
- Passage de maturité : « concept documenté » → « concept en simulation » dès que les tirages sont enregistrés → « prototype » après le test de 7 jours → « événement pilote » après une première édition auditée. **Aucun de ces concepts ne doit être présenté comme un format validé** avant ce parcours.

*Document de conception. Les montants marqués [E] sont des estimations à remplacer par des devis ; les éléments réglementaires sont une information générale, pas un conseil juridique personnalisé.*
