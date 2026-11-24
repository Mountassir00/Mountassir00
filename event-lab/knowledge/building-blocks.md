# Bibliothèque de briques fonctionnelles — v0.2 (proposition)

> Source structurée : `building-blocks.json` (conforme à `schemas/building-block.schema.json`). 70 briques, 13 types, 4 à 7 briques par type.
> Chaque brique décrit une **logique** générique. Les exemples d'origine citent des événements réels sans en reprendre nom commercial, identité visuelle ni élément protégé ; `ip_note` précise ce qui ne doit pas être repris.
> Les attributs 0–5 et l'adéquation aux directions sont des **jugements d'expert prudents** (`jugement_expert`, docs/07 §1.4), à recalibrer après chaque événement réel (docs/07 §10).

## 1. Conventions de notation

| Attribut | 0 | 5 |
|---|---|---|
| novelty | pratique standard dans la discipline cible | sans équivalent identifié dans un tournoi amateur |
| ux_gain | aucun effet sur le parcours | supprime une friction majeure (attente, incompréhension) |
| complexity | aucune préparation | outil, formation et tests indispensables |
| cost | négligeable | poste majeur du budget |
| media | aucun moment partageable | moment filmable conçu pour les réseaux |
| revenue | aucune recette | source de recette principale |
| inclusion | excluant | inclusion conçue dans la règle elle-même |
| eco_impact | forte empreinte (objets jetables, électronique) | impact très faible |
| portability | dépend d'un lieu ou d'une personne | transposable partout sans adaptation |

`requirements.budget_tier_min` suit les paliers T0 (< 5 k€) à T4 (> 1 M€) ; `min_area_m2` = 165 correspond à un terrain de 3x3 (15 × 11 m), hors dégagements et public. Les relations `compatible_with` et `incompatible_with` ont été rendues symétriques et contrôlées (aucun identifiant orphelin, aucune paire à la fois compatible et incompatible).

## 2. Catalogue par type

### Règles de compétition (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-regles-score-cible-ou-temps` | **Match court à score cible ou temps limite** — Le match s'arrête au premier des deux événements : une équipe atteint le score cible, ou le temps limite expire. | sport — FIBA 3x3 : match de 10 minutes, arrêté dès qu'une équipe atteint 21 points | T0 · 2 · 165 m² | 1 / 4 / 1 / 1 / 2 / 0 / 3 / 5 / 5 | Acc. (5) |
| `B-regles-horloge-tir-courte` | **Horloge d'attaque courte** — Une équipe dispose d'un temps court pour tenter un tir ; au-delà, elle perd le ballon. | sport — FIBA 3x3 : horloge de tir de 12 secondes | T0 · 1 · 165 m² | 1 / 3 / 2 / 1 / 2 / 0 / 2 / 5 / 4 | Opt. (5) |
| `B-regles-fin-a-score-cible` | **Fin de match à score cible** — À un moment défini (fin du temps réglementaire ou dernière minute), le chronomètre est arrêté et un score cible est fixé (score du leader + N points) ; la première équipe qui l'atteint gagne. | sport — The Basketball Tournament (TBT), tournoi américain à élimination directe | T0 · 2 · 165 m² | 3 / 4 / 2 / 1 / 4 / 1 / 3 / 5 / 5 | Acc., Opt., Exp., Com. (4) |
| `B-regles-plafond-classification` | **Plafond de points de classification par équipe** — Chaque participant reçoit une valeur selon son niveau (fonctionnel, âge, expérience) ; la somme des valeurs des joueurs présents sur le terrain ne doit pas dépasser un plafond. | sport — Basket en fauteuil (IWBF) : plafond de 14 points de classification pour les cinq joueurs sur le terrain | T0 · 1 · 165 m² | 4 / 3 / 3 / 1 / 3 / 0 / 5 / 5 / 4 | Com. (5) |
| `B-regles-equipes-mixtes` | **Équipes mixtes à composition imposée** — La composition des équipes est contrainte (mixité de genre, d'âge ou de niveau, participants avec et sans handicap), avec des règles qui garantissent le temps de jeu de chacun. | sport — Athlétisme : relais mixte 4 × 400 m aux Jeux olympiques de Tokyo 2020 | T0 · 0 · 0 m² | 2 / 3 / 1 / 0 / 3 / 1 / 5 / 5 / 5 | Acc., Com. (5) |

### Système de qualification (6)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-qualification-parcours-chronometre` | **Parcours d'habileté chronométré** — Chaque participant ou équipe réalise seul un parcours standardisé (dribble, passe, tir) chronométré ; chaque faute (tir manqué, plot touché) ajoute une pénalité de temps. | sport — NBA All-Star : épreuve d'habileté chronométrée | T0 · 3 · 200 m² | 2 / 4 / 2 / 1 / 4 / 1 / 4 / 5 / 5 | Acc. (5) |
| `B-qualification-elimination-par-manches` | **Qualifications chronométrées à élimination par manches** — Plusieurs manches chronométrées se succèdent ; à l'issue de chacune, les moins rapides sont éliminés et classés, les autres repartent de zéro. | sport — Formule 1 : qualifications en trois manches à élimination | T0 · 3 · 200 m² | 4 / 4 / 3 / 2 / 4 / 1 / 3 / 5 / 4 | Opt. (5) |
| `B-qualification-placement-serpentin` | **Placement en serpentin des têtes de série** — Les équipes classées sont réparties dans les poules en serpentin (1-2-3-4 puis 4-3-2-1, etc.) pour équilibrer le niveau moyen des poules ; le classement de qualification devient l'enjeu du placement. | sport — Pratique courante de répartition des têtes de série en poules (sports collectifs, e-sport) | T0 · 1 · 0 m² | 1 / 3 / 1 / 0 / 1 / 0 / 3 / 5 / 5 | Acc. (5) |
| `B-qualification-systeme-suisse` | **Phase en système suisse** — À chaque ronde, chacun affronte un adversaire au bilan identique, sans élimination immédiate ; après un nombre fixe de rondes, un seuil de victoires qualifie et un seuil de défaites élimine. | jeu — Échecs : tournois et Olympiade en système suisse | T0 · 1 · 165 m² | 2 / 4 / 3 / 0 / 2 / 0 / 4 / 5 / 5 | Opt. (5) |
| `B-qualification-derniere-chance` | **Tournoi de la dernière chance** — Les équipes éliminées en phase principale rejouent un mini-tournoi dont le vainqueur récupère une dernière place qualificative. | esport — Valorant Champions Tour : tournoi de la dernière chance (Last Chance Qualifier) | T0 · 1 · 165 m² | 3 / 4 / 2 / 1 / 3 / 1 / 4 / 5 / 5 | Com. (5) |
| `B-qualification-qualifs-a-distance` | **Qualifications ouvertes à distance** — Des qualifications ouvertes se déroulent à distance (en ligne pour l'e-sport ; vidéo ou application de chronométrage pour un défi physique standardisé) avant une phase finale en présentiel. | esport — Fortnite World Cup 2019 : qualifications en ligne ouvertes | T1 · 2 · 0 m² | 4 / 3 / 3 / 2 / 3 / 2 / 4 / 4 / 5 | Hyb. (5) |

### Récompenses (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-recompenses-maillot-leader` | **Signe distinctif du leader** — Le leader d'un classement porte un signe distinctif (maillot, dossard, brassard) qui change de propriétaire dès qu'il est dépassé. | sport — Tour de France : maillot du leader du classement général | T0 · 0 · 0 m² | 2 / 3 / 1 / 1 / 4 / 2 / 3 / 4 / 5 | Acc., Opt., Com. (4) |
| `B-recompenses-finale-tout-ou-rien` | **Finale unique décisive** — Une saison ou une phase à points sert à se qualifier pour une finale unique où le titre se joue sur une seule performance, indépendamment des points accumulés. | sport — Ligue de diamant d'athlétisme : finales décisives en fin de saison | T0 · 0 · 0 m² | 2 / 3 / 1 / 1 / 4 / 2 / 2 / 5 / 5 | Opt., Prem. (4) |
| `B-recompenses-trophee-defi` | **Trophée en jeu à défendre** — Le détenteur remet le trophée en jeu à chaque défi ; quiconque le bat en devient détenteur. | sport — Rugby (Nouvelle-Zélande) : Ranfurly Shield, trophée remis en jeu par son détenteur | T0 · 0 · 0 m² | 3 / 3 / 1 / 1 / 4 / 1 / 3 / 5 / 5 | Acc., Com. (5) |
| `B-recompenses-medaille-finisher` | **Récompense de participation pour tous** — Tout participant qui termine reçoit une récompense identique : la valeur tient à la complétion, pas au rang. | sport — Marathons et courses sur route : médaille remise à chaque arrivant | T0 · 1 · 0 m² | 0 / 3 / 0 / 2 / 2 / 1 / 5 / 2 / 5 | Com. (5) |
| `B-recompenses-mvp-vote-mixte` | **Distinction individuelle à vote mixte** — Une distinction individuelle (meilleur joueur, plus beau geste) est attribuée par un vote qui combine public, participants et jury, chaque collège ayant un poids publié. | sport — NBA All-Star : sélection des titulaires par un vote combinant fans, joueurs et médias | T0 · 1 · 0 m² | 2 / 3 / 2 / 0 / 3 / 1 / 3 / 5 / 5 | Com. (5) |

### Mise en scène (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-mise_en_scene-ceremonie-entree` | **Cérémonie d'entrée individuelle** — Chaque participant ou équipe entre seul, annoncé par un speaker, sur une musique choisie, par un parcours défini jusqu'à l'aire de jeu. | sport — Sports de combat (UFC, boxe) : entrée des combattants en musique | T0 · 2 · 0 m² | 2 / 4 / 2 / 1 / 5 / 1 / 3 / 5 / 5 | Prem. (5) |
| `B-mise_en_scene-revelation-tableau` | **Révélation publique du tableau** — Le tableau (poules, appariements) est dévoilé lors d'un moment public scénarisé, tirage en direct ou dévoilement progressif, avec les réactions des équipes filmées. | sport — Basket universitaire américain (NCAA) : émission de dévoilement du tableau final | T0 · 2 · 50 m² | 2 / 3 / 2 / 1 / 5 / 1 / 3 / 5 / 5 | Hyb. (5) |
| `B-mise_en_scene-grille-depart` | **Grille de départ présentée** — Avant la phase finale, les participants sont alignés physiquement dans l'ordre de leur classement de qualification ; le speaker présente chaque position. | sport — Formule 1 et sports mécaniques : grille de départ dans l'ordre des qualifications | T0 · 2 · 165 m² | 4 / 3 / 1 / 0 / 4 / 1 / 3 / 5 / 5 | Acc., Opt., Prem., Exp., Com. (4) |
| `B-mise_en_scene-face-a-face` | **Face-à-face d'avant-match** — Avant un match clé, capitaines ou équipes se font face devant le public et les caméras (déclaration courte, échange encadré par un animateur). | sport — Sports de combat : pesées publiques et face-à-face avant les combats | T0 · 1 · 30 m² | 3 / 2 / 1 / 0 / 5 / 1 / 2 / 5 / 5 | Prem., Exp., Hyb. (4) |
| `B-mise_en_scene-podium` | **Cérémonie de podium** — Les trois premiers sont récompensés sur un podium à hauteurs différenciées, avec musique, remise de récompense et photo officielle. | sport — Jeux olympiques : cérémonies de remise des médailles | T0 · 2 · 20 m² | 0 / 3 / 1 / 1 / 3 / 1 / 3 / 4 / 5 | Acc. (5) |

### Interactions avec le public (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-interaction_public-vote-public-jury` | **Vote public pondéré par un jury** — Le résultat d'une épreuve d'appréciation (créativité, style) combine un vote du public et une note de jury selon une pondération publiée ; les résultats sont révélés progressivement. | tv_media — Concours Eurovision de la chanson : combinaison du vote du public et des jurys nationaux | T1 · 2 · 0 m² | 2 / 3 / 3 / 2 / 4 / 2 / 3 / 5 / 4 | Hyb., Com. (5) |
| `B-interaction_public-bonus-fans` | **Bonus attribué par le vote des fans** — Les fans votent avant ou pendant l'événement ; les participants les plus votés reçoivent un avantage limité et encadré (temps mort supplémentaire, choix du côté), sans effet majeur sur l'équité sportive. | sport — Formula E : avantage de puissance temporaire attribué par vote des fans pendant plusieurs saisons | T1 · 1 · 0 m² | 4 / 3 / 3 / 1 / 4 / 2 / 2 / 5 / 4 | Exp., Hyb. (5) |
| `B-interaction_public-concours-public` | **Concours ouvert au public pendant les pauses** — Pendant les pauses, des spectateurs inscrits ou tirés au sort relèvent un défi court (tir de loin, lancers chronométrés) avec un lot. | sport — Salles de basket professionnel : concours de tir du milieu de terrain pendant les temps morts | T0 · 1 · 0 m² | 1 / 4 / 1 / 1 / 4 / 2 / 4 / 5 / 5 | Acc., Com. (5) |
| `B-interaction_public-predictions-gratuites` | **Jeu de prédictions gratuit** — Avant et pendant l'événement, le public pronostique gratuitement (qualifiés, vainqueurs, scores) ; points, classement des pronostiqueurs et lots non monétaires. | esport — Tournois majeurs de Counter-Strike : défi de pronostics | T0 · 1 · 0 m² | 2 / 3 / 2 / 1 / 3 / 2 / 4 / 5 / 5 | Hyb., Com. (5) |
| `B-interaction_public-coup-de-coeur` | **Coup de cœur qualifiant du jury** — Un membre du jury dispose d'un unique droit de qualifier directement un candidat, utilisable une seule fois et de façon visible. | tv_media — Émissions de télécrochet de la franchise « Got Talent » : bouton de qualification directe | T0 · 1 · 0 m² | 3 / 2 / 1 / 0 / 5 / 1 / 3 / 5 / 5 | Acc., Prem., Exp., Hyb. (4) |

### Mécaniques de jeu (7)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-mecanique_jeu-carte-secrete` | **Carte stratégique secrète** — Chaque équipe dispose d'une carte à usage unique, choisie ou tirée avant le match et révélée à son activation (par exemple : paniers comptant double pendant une minute). | sport — Kings League (football à 7) : cartes secrètes à effet temporaire | T0 · 1 · 0 m² | 4 / 3 / 3 / 0 / 5 / 1 / 3 / 5 / 5 | Exp. (5) |
| `B-mecanique_jeu-zone-qui-se-reduit` | **Espace de jeu qui se réduit par paliers** — L'espace ou les ressources diminuent par paliers à heure fixe (terrains fermés, zones réduites) ; les participants restants doivent se regrouper. | jeu — Jeux vidéo de type battle royale : zone de jeu qui se resserre | T1 · 4 · 600 m² | 5 / 3 / 4 / 2 / 4 / 1 / 2 / 5 / 3 | Exp. (5) |
| `B-mecanique_jeu-joker-activable` | **Joker activable à coût** — Chaque participant doit ou peut activer une fois un dispositif (zone joker, tracé alternatif, temps fort) qui procure un avantage temporaire au prix d'un détour ou d'un risque. | sport — Formula E : mode d'attaque activé en passant par une zone hors trajectoire | T0 · 1 · 165 m² | 4 / 3 / 3 / 0 / 4 / 1 / 3 / 5 / 4 | Exp. (5) |
| `B-mecanique_jeu-gagnant-reste` | **Le gagnant reste sur le terrain** — Le vainqueur d'un match court reste sur le terrain et affronte le challenger suivant ; chaque victoire en tant que tenant rapporte des points. | sport — Terrains de basket de rue : règle du « gagnant reste » | T0 · 1 · 165 m² | 3 / 4 / 2 / 0 / 3 / 0 / 4 / 5 / 5 | Acc., Com. (5) |
| `B-mecanique_jeu-handicap` | **Système de handicap équilibrant** — Chaque participant reçoit un handicap (points ou temps d'avance) calculé sur ses performances passées, pour que des niveaux différents aient une chance réelle de gagner. | sport — Golf : système de handicap mondial | T0 · 1 · 0 m² | 3 / 3 / 3 / 0 / 2 / 0 / 5 / 5 / 4 | Com. (5) |
| `B-mecanique_jeu-draft` | **Draft de constitution des équipes** — Des participants inscrits individuellement sont répartis en équipes par choix alternés de capitaines (ou dans l'ordre inverse d'un classement), lors d'un moment public. | sport — NBA : draft annuelle des joueurs | T0 · 1 · 30 m² | 3 / 3 / 2 / 0 / 4 / 1 / 4 / 5 / 5 | Com. (5) |
| `B-mecanique_jeu-enigme-compte-a-rebours` | **Épreuve à énigmes en temps limité avec indices à coût** — Une équipe dispose d'un temps limité pour résoudre une suite d'énigmes ; elle peut demander des indices qui coûtent du temps ou des points. | jeu — Escape games : salles à énigmes en temps limité avec indices | T0 · 2 · 20 m² | 3 / 4 / 3 / 2 / 3 / 2 / 4 / 4 / 4 | Exp., Com. (4) |

### Expérience digitale (4)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-experience_digitale-file-virtuelle` | **File virtuelle par créneaux** — Au lieu d'attendre physiquement, le visiteur réserve un créneau (page web, QR code ou ticket papier) et revient à l'heure indiquée ; la file physique est remplacée par une file temporelle. | parc_loisirs — Parcs à thème : files virtuelles par créneaux sur les attractions les plus demandées | T1 · 1 · 0 m² | 2 / 5 / 3 / 2 / 1 / 2 / 4 / 4 / 4 | Opt. (5) |
| `B-experience_digitale-resultats-live` | **Résultats, tableaux et suivi en direct** — Une page web publique affiche en temps réel programme, tableaux, scores et classements ; chaque participant voit son prochain horaire et son terrain. | sport — Grands marathons : suivi des coureurs par puce et application | T0 · 1 · 0 m² | 1 / 5 / 2 / 1 / 2 / 1 / 4 / 5 / 5 | Opt., Hyb. (5) |
| `B-experience_digitale-sans-especes` | **Paiement sans espèces** — Paiement par bracelet, carte ou mobile pour la restauration et la boutique, avec remboursement automatique du solde non utilisé. | musique_festival — Grands festivals de musique : bracelets RFID d'accès et de paiement (par exemple Tomorrowland) | T2 · 2 · 0 m² | 1 / 4 / 3 / 3 / 1 / 3 / 2 / 3 / 3 | Opt., Prem., Hyb. (4) |
| `B-experience_digitale-programme-personnalise` | **Programme personnel et alertes** — Chaque visiteur compose son programme (matchs de son équipe, concerts, ateliers) et reçoit des rappels ; l'organisateur obtient une estimation de l'affluence par séquence. | musique_festival — Applications officielles des grands festivals de musique (programme personnel et alertes) | T1 · 1 · 0 m² | 1 / 4 / 2 / 2 / 1 / 1 / 3 / 5 / 5 | Hyb. (5) |

### Scénographie (6)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-scenographie-terrain-place-publique` | **Terrain posé sur une place publique** — Le terrain est installé au cœur de l'espace public (place, parvis, parc), visible des passants, plutôt que dans une salle fermée. | sport — Jeux olympiques de Paris 2024 : parc urbain de la Concorde (basket 3x3, BMX freestyle, breaking, skateboard) | T1 · 4 · 400 m² | 2 / 4 / 3 / 3 / 5 / 2 / 4 / 3 / 3 | Com. (5) |
| `B-scenographie-zones-thematiques` | **Zones thématiques à identité propre** — Le site est découpé en zones à identité propre (décor, musique, activité), reliées par un parcours ; chaque zone a une fonction (compétition, détente, initiation, restauration). | musique_festival — Tomorrowland : scènes à décor thématique | T1 · 3 · 1000 m² | 2 / 4 / 3 / 3 / 4 / 2 / 4 / 3 / 3 | Prem. (5) |
| `B-scenographie-tunnel-entree` | **Tunnel d'entrée des participants** — Un passage scénarisé (couloir, arche, rideau) relie la zone d'attente des participants à l'aire de jeu ; il structure l'entrée et sert de décor vidéo. | sport — Stades de football : tunnel d'entrée des joueurs | T1 · 1 · 20 m² | 2 / 3 / 2 / 2 / 4 / 1 / 3 / 3 / 4 | Prem. (5) |
| `B-scenographie-village-fans` | **Village ouvert autour de la compétition** — Un espace ouvert autour de la compétition réunit restauration, partenaires, animations et écran, accessible aussi aux non-billettés ; le temps de présence s'allonge et l'espace sert de point de rassemblement. | sport — Coupe du monde de football : espaces officiels pour les supporters (Fan Festival) | T1 · 4 · 800 m² | 1 / 4 / 3 / 3 / 3 / 4 / 4 / 3 / 3 | Com. (5) |
| `B-scenographie-arene-modulaire` | **Arène modulaire à tribunes temporaires** — Tribunes temporaires, barrières et habillage en kit autour d'un terrain standard, montables en quelques heures et réutilisables d'une étape à l'autre. | sport — Événements FIBA 3x3 : terrain et tribunes temporaires en site urbain | T2 · 6 · 600 m² | 1 / 4 / 3 / 4 / 4 / 3 / 3 / 3 / 4 | Prem. (5) |
| `B-scenographie-parcours-narratif` | **Parcours narratif en salles successives** — Le public traverse une suite d'espaces, chacun portant un chapitre d'un récit (décor, son, consigne) ; la circulation est à sens unique et cadencée par créneaux. | exposition_immersive — Expositions immersives à parcours scénarisé en salles successives | T1 · 3 · 200 m² | 3 / 4 / 3 / 3 / 4 / 3 / 3 / 3 / 3 | Prem. (5) |

### Animation sonore et lumineuse (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-son_lumiere-noir-projecteur` | **Séquence noir salle et poursuite** — Coupure de la lumière ambiante, poursuite sur la personne annoncée, musique et voix du speaker : un pic d'attention de quelques secondes. | sport — Salles de basket professionnel : présentation des équipes dans le noir | T1 · 2 · 0 m² | 1 / 3 / 2 / 2 / 4 / 0 / 2 / 4 / 3 | Prem. (5) |
| `B-son_lumiere-casques-silencieux` | **Diffusion au casque sans fil** — Le son est diffusé dans des casques sans fil sur plusieurs canaux ; chacun choisit son canal (musique, commentaire, audiodescription) et règle son volume. | musique_festival — Festivals de musique : soirées « silent disco » | T1 · 2 · 50 m² | 2 / 4 / 2 / 3 / 3 / 2 / 4 / 3 / 4 | Exp., Com. (4) |
| `B-son_lumiere-bracelets-lumineux` | **Bracelets lumineux pilotés** — Des bracelets à LED distribués au public s'allument selon un pilotage central ; la foule devient une surface lumineuse synchronisée avec le spectacle. | musique_festival — Tournées de stade de groupes pop-rock : bracelets LED pilotés (par exemple Coldplay) | T3 · 3 · 0 m² | 2 / 3 / 3 / 4 / 5 / 1 / 3 / 1 / 3 | Prem. (5) |
| `B-son_lumiere-dj-speaker` | **DJ et speaker en continu** — Un DJ et un animateur micro assurent bande-son et commentaire continus pendant les matchs et les transitions, sans silence entre les séquences. | sport — Événements FIBA 3x3 : DJ et speaker présents en continu | T0 · 2 · 10 m² | 1 / 4 / 1 / 2 / 3 / 0 / 3 / 4 / 5 | Acc. (5) |
| `B-son_lumiere-signature-sonore` | **Signature sonore des moments clés** — Un son court et reconnaissable accompagne chaque moment clé (panier décisif, record, qualification), créant un réflexe d'attention et une identité sonore. | sport — Hockey sur glace nord-américain : sirène de but dans les patinoires | T0 · 1 · 0 m² | 1 / 3 / 1 / 0 / 3 / 0 / 2 / 5 / 5 | Acc., Prem. (4) |

### Monétisation (6)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-monetisation-paliers-annonces` | **Paliers de prix annoncés à l'avance** — Les prix évoluent selon un calendrier ou des quotas publiés dès l'ouverture des ventes (prévente, normal, dernier moment) ; l'acheteur sait à l'avance quand et comment le prix change. | musique_festival — Festivals de musique : tarifs de prévente à quota annoncé | T0 · 0 · 0 m² | 0 / 3 / 1 / 0 / 1 / 4 / 3 / 5 / 5 | Acc., Opt. (4) |
| `B-monetisation-gratuit-plus-premium` | **Accès gratuit et espaces premium payants** — L'accès de base est gratuit (bord du terrain, place publique) ; des expériences premium à capacité limitée sont vendues : tribune assise, accès coulisses, restauration, rencontre avec les participants. | sport — Courses cyclistes sur route : spectacle gratuit au bord de la route, hospitalités payantes | T1 · 3 · 50 m² | 1 / 4 / 2 / 2 / 3 / 4 / 5 / 4 / 4 | Prem. (5) |
| `B-monetisation-pack-inscription-equipe` | **Inscription d'équipe avec pack inclus** — Les équipes paient une inscription incluant un pack (maillots, repas, photos, accès au direct) ; la valeur perçue augmente et une recette est sécurisée avant J. | communautaire — Tournois amateurs de basket 3x3 et de football à 5 : frais d'inscription par équipe avec dotation | T0 · 1 · 0 m² | 1 / 3 / 1 / 2 / 1 / 4 / 2 / 3 / 5 | Acc. (4) |
| `B-monetisation-precommande-a-seuil` | **Prévente à seuil de déclenchement** — L'événement n'est confirmé que si un seuil de préventes ou d'inscriptions est atteint à une date fixée ; sinon, remboursement intégral automatique. | communautaire — Plateformes de financement participatif : projets culturels et événementiels à seuil de déclenchement | T0 · 1 · 0 m² | 3 / 2 / 2 / 0 / 2 / 3 / 3 / 5 / 5 | Acc., Com. (5) |
| `B-monetisation-serie-limitee` | **Objet souvenir en série limitée** — Un objet propre à l'édition (maillot, affiche, pin's) est produit en quantité annoncée et numérotée, disponible uniquement sur place ou pendant une courte période. | mode_luxe — Mode urbaine : sorties d'articles en quantités limitées | T1 · 1 · 10 m² | 1 / 2 / 1 / 2 / 3 / 3 / 2 / 2 / 5 | Prem. (4) |
| `B-monetisation-experience-sur-rendez-vous` | **Expérience premium en petit groupe sur réservation** — Une offre premium est vendue en très petits groupes et sur réservation horaire (visite des coulisses, échauffement au bord du terrain, place au premier rang avec hôte) ; la rareté et l'attention personnelle font la valeur, plus que le décor. | mode_luxe — Maisons de luxe : présentations privées sur rendez-vous | T1 · 1 · 0 m² | 2 / 4 / 2 / 1 / 3 / 4 / 2 / 5 / 5 | Prem. (5) |

### Fidélisation (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-fidelisation-passeport-progression` | **Passeport de progression multi-éditions** — Chaque participant ou spectateur possède un passeport (papier ou web) qui collecte tampons ou niveaux : épreuves réalisées, éditions suivies, défis réussis. | jeu — Jeux vidéo : niveaux et récompenses saisonnières | T0 · 1 · 0 m² | 3 / 4 / 2 / 1 / 3 / 2 / 4 / 4 / 5 | Com. (5) |
| `B-fidelisation-classement-saison` | **Classement de saison sur plusieurs étapes** — Plusieurs étapes (villes, dates) attribuent des points selon le résultat ; un classement cumulé désigne les qualifiés d'une finale de saison. | sport — Tennis masculin : classement annuel menant au tournoi de fin de saison | T0 · 1 · 0 m² | 2 / 3 / 2 / 1 / 3 / 3 / 3 / 4 / 5 | Opt., Prem., Hyb., Com. (4) |
| `B-fidelisation-rendez-vous-recurrent` | **Rendez-vous récurrent gratuit animé par des bénévoles** — Un rendez-vous court, gratuit, au même lieu et à la même heure chaque semaine ou chaque mois, chronométré et animé par des bénévoles ; chacun suit sa progression personnelle. | communautaire — parkrun : 5 km chronométrés gratuits chaque samedi, organisés par des bénévoles | T0 · 3 · 0 m² | 2 / 4 / 2 / 0 / 2 / 0 / 5 / 5 / 5 | Acc., Com. (5) |
| `B-fidelisation-souvenir-numerique` | **Souvenir numérique personnalisé** — Après l'événement, chaque participant reçoit par lien unique un contenu personnel : résultat, photos où il apparaît, extrait vidéo, attestation. | sport — Courses sur route : attestations de finisher et photos téléchargeables | T1 · 1 · 0 m² | 2 / 4 / 3 / 2 / 4 / 2 / 4 / 5 / 5 | Hyb. (5) |
| `B-fidelisation-temple-renommee` | **Temple de la renommée de l'événement** — Un lieu ou une page conserve vainqueurs, records et figures marquantes de chaque édition ; les anciens vainqueurs sont invités à l'édition suivante. | sport — Basket : Naismith Memorial Basketball Hall of Fame | T0 · 1 · 0 m² | 1 / 2 / 1 / 0 / 2 / 0 / 3 / 5 / 5 | Com. (5) |

### Activations partenaires (5)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-activation_partenaire-zone-defi` | **Zone défi animée par un partenaire** — Un partenaire anime un défi accessible (précision, vitesse, habileté) lié à son univers, avec classement du jour et lots ; il gagne du temps de contact qualifié, l'événement gagne une animation. | activation_marque — Villages partenaires des grandes courses et des festivals : stands d'animation de marques | T1 · 2 · 30 m² | 1 / 3 / 2 / 2 / 3 / 4 / 4 / 3 / 5 | Opt., Com. (4) |
| `B-activation_partenaire-caravane` | **Caravane partenaire avant la compétition** — Avant le passage ou le début de la compétition, un cortège ou une parade de partenaires anime le parcours et occupe l'attente du public. | sport — Tour de France : caravane publicitaire précédant les coureurs | T2 · 6 · 0 m² | 2 / 3 / 3 / 3 / 3 / 4 / 3 / 1 / 3 | Opt., Prem., Com. (3) |
| `B-activation_partenaire-moment-presente` | **Moment de jeu présenté par un partenaire** — Un moment bref et récurrent du programme (temps mort, concours, action du jour) est associé à un partenaire, annoncé au micro et affiché, sans interrompre le jeu. | sport — Sports professionnels nord-américains : séquences de match associées à un sponsor | T0 · 1 · 0 m² | 0 / 2 / 1 / 0 / 2 / 4 / 3 / 5 / 5 | Acc., Prem., Hyb. (4) |
| `B-activation_partenaire-stage-jeunes` | **Stage d'initiation financé par un partenaire** — En marge de l'événement, un partenaire finance un stage d'initiation gratuit (jeunes, publics éloignés de la pratique) encadré par des participants ou des éducateurs ; l'impact local devient mesurable. | sport — NBA et FIBA : camps Basketball Without Borders | T1 · 3 · 165 m² | 1 / 3 / 2 / 2 / 3 / 3 / 5 / 4 / 5 | Com. (5) |
| `B-activation_partenaire-rendez-vous-programmes` | **Rendez-vous d'affaires programmés entre partenaires** — Avant l'événement, partenaires, collectivités et exposants réservent des rendez-vous courts à horaires fixes sur une page dédiée ; l'événement devient aussi un lieu de mise en relation, ce qui augmente la valeur de l'offre partenaire. | salon_pro — Salons professionnels : rendez-vous d'affaires préprogrammés entre exposants et visiteurs | T0 · 1 · 30 m² | 2 / 3 / 2 / 1 / 1 / 4 / 3 / 5 / 5 | Opt., Prem., Hyb. (4) |

### Création de contenu (6)

| Id | Brique | Origine (famille — exemple) | Palier · staff · surface | N / UX / Cx / Coût / Média / Rev / Incl / Éco / Port | Directions les plus adaptées |
|---|---|---|---|---|---|
| `B-creation_contenu-clips-verticaux` | **Extraits verticaux produits en direct** — Une cellule légère (1 à 2 personnes, smartphone stabilisé) filme, monte et publie au format vertical les actions marquantes dans les minutes qui suivent, selon une liste de moments prévue (entrées, paniers décisifs, réactions). | sport — Ligues sportives et e-sportives : extraits verticaux publiés pendant les matchs | T0 · 2 · 0 m² | 1 / 2 / 2 / 1 / 5 / 2 / 3 / 5 / 5 | Acc., Hyb. (5) |
| `B-creation_contenu-micro-pov` | **Joueur micro et caméra embarquée** — Un participant porte un micro ou une petite caméra pendant un match ; le contenu restitue le point de vue et les échanges du terrain. | sport — Football américain : séquences de joueurs équipés de micros | T1 · 1 · 0 m² | 2 / 2 / 2 / 2 / 4 / 1 / 3 / 5 / 5 | Hyb. (5) |
| `B-creation_contenu-serie-coulisses` | **Série documentaire en coulisses** — Une série courte (épisodes avant, pendant, après) suit quelques participants et l'organisation ; elle crée de l'attachement et fait exister l'événement toute l'année. | sport — Formule 1 : série documentaire en coulisses diffusée sur une plateforme de streaming | T1 · 2 · 0 m² | 2 / 2 / 3 / 3 / 5 / 2 / 3 / 5 / 4 | Prem., Hyb. (5) |
| `B-creation_contenu-spots-photo` | **Spots photo signatures** — Des points photo conçus (décor, cadrage, éclairage, fond partenaire discret) sont placés sur le parcours pour concentrer les prises de vue sans encombrer les circulations. | musique_festival — Coachella : installations artistiques monumentales | T0 · 0 · 10 m² | 1 / 3 / 1 / 2 / 5 / 2 / 4 / 3 / 5 | Acc., Prem., Hyb., Com. (4) |
| `B-creation_contenu-defi-ugc` | **Défi de contenu généré par le public** — Le public est invité à publier un contenu selon une consigne simple (geste, réplique, mot-clé) ; les meilleurs sont diffusés sur l'écran ou récompensés. | activation_marque — Défis à mot-clé lancés par des événements et des marques sur les réseaux sociaux | T0 · 1 · 0 m² | 1 / 2 / 2 / 1 / 4 / 1 / 3 / 5 / 5 | Hyb., Com. (5) |
| `B-creation_contenu-direct-commente` | **Direct commenté avec habillage statistique** — Diffusion en direct avec commentateurs, incrustation du score, du chronomètre et de statistiques simples ; une régie légère suffit. | esport — E-sport : diffusions commentées avec habillage statistique | T1 · 3 · 10 m² | 1 / 3 / 3 / 3 / 4 / 3 / 4 / 4 / 4 | Hyb. (5) |

## 3. Kit « tournoi 3x3 amateur à qualifications chronométrées »

Assemblage de référence pour le premier blueprint (format sportif amateur urbain, budget T1). Toutes les briques ci-dessous sont admissibles à partir de T0 ou T1.

| Séquence | Brique | Rôle dans le format | Palier |
|---|---|---|---|
| Avant J | `B-monetisation-pack-inscription-equipe` — Inscription d'équipe avec pack inclus | inscription par équipe avec pack ; paliers publiés (`B-monetisation-paliers-annonces`). | T0 |
| Avant J | `B-fidelisation-passeport-progression` — Passeport de progression multi-éditions | passeport ouvert dès l'inscription, tamponné à chaque épreuve et édition. | T0 |
| Avant J | `B-interaction_public-predictions-gratuites` — Jeu de prédictions gratuit | pronostics gratuits sur les qualifiés, sans mise ni gain en argent. | T0 |
| Qualifications | `B-qualification-parcours-chronometre` — Parcours d'habileté chronométré | chaque équipe passe un parcours d'habileté chronométré (deux parcours en parallèle). | T0 |
| Qualifications | `B-qualification-elimination-par-manches` — Qualifications chronométrées à élimination par manches | deux ou trois manches à élimination pour fixer l'ordre de tête (durée à simuler, docs/07 §4). | T0 |
| Qualifications | `B-experience_digitale-resultats-live` — Résultats, tableaux et suivi en direct | temps et classement en direct sur une page web, doublés d'un tableau papier. | T0 |
| Transition | `B-mise_en_scene-grille-depart` — Grille de départ présentée | alignement des équipes dans l'ordre des temps, présentées par le speaker. | T0 |
| Transition | `B-qualification-placement-serpentin` — Placement en serpentin des têtes de série | répartition des équipes en poules en serpentin selon le classement. | T0 |
| Transition | `B-mise_en_scene-revelation-tableau` — Révélation publique du tableau | dévoilement du tableau sur écran ou panneau, réactions filmées. | T0 |
| Phase finale | `B-mise_en_scene-ceremonie-entree` — Cérémonie d'entrée individuelle | entrée des équipes en musique (durée bornée), par un tunnel simple (`B-scenographie-tunnel-entree`) qui ne coupe aucun cheminement du public. | T0 |
| Phase finale | `B-regles-score-cible-ou-temps` — Match court à score cible ou temps limite | matchs de 10 minutes ou 21 points, horloge de tir courte (`B-regles-horloge-tir-courte`). | T0 |
| Phase finale | `B-son_lumiere-dj-speaker` — DJ et speaker en continu | DJ et speaker en continu, aucune transition muette. | T0 |
| Phase finale | `B-interaction_public-concours-public` — Concours ouvert au public pendant les pauses | concours de tir ouvert au public pendant les pauses (règlement de jeu-concours si lot). | T0 |
| Phase finale | `B-qualification-derniere-chance` — Tournoi de la dernière chance | mini-tournoi de repêchage pour les éliminés des qualifications. | T0 |
| Finale | `B-regles-fin-a-score-cible` — Fin de match à score cible | fin à score cible en finale uniquement, cible affichée en grand. | T0 |
| Finale | `B-mise_en_scene-podium` — Cérémonie de podium | podium immédiatement après la finale, avec toutes les catégories. | T0 |
| Contenu | `B-creation_contenu-clips-verticaux` — Extraits verticaux produits en direct | cellule de deux personnes : entrées, paniers décisifs, réactions publiés en vertical dans les minutes qui suivent. | T0 |
| Après J | `B-fidelisation-souvenir-numerique` — Souvenir numérique personnalisé | lien personnel : temps de qualification, photos, extrait vidéo. | T1 |
| Après J | `B-fidelisation-classement-saison` — Classement de saison sur plusieurs étapes | si plusieurs étapes : points cumulés vers une finale de saison. | T0 |

Incompatibilités à respecter dans ce kit : `B-interaction_public-bonus-fans`, `B-interaction_public-vote-public-jury` et `B-interaction_public-coup-de-coeur` ne doivent jamais influencer les qualifications chronométrées ; `B-mecanique_jeu-gagnant-reste` est incompatible avec le placement en serpentin (format sans poules). Une seule mécanique « spectaculaire » de type carte ou joker par format (voir E-018). Le kit ne dispense ni du plan de sécurité, ni des autorisations d'occupation du domaine public, ni du repli canicule (E-008).

## 4. Matrice de distance de transfert entre familles (docs/07 §3)

Proposition pour `d(source, cible)` au niveau des familles de `sector_family`. Rappel : 0 = même discipline (calculé au niveau de la discipline, donc absent de cette matrice) ; 1 = même famille ; 2 = familles voisines ; 3 = familles éloignées. `nouveauté_transfert = d / 3 × plausibilité`. La matrice est symétrique.

Abréviations : spo = sport · esp = esport · fes = musique_festival · spe = spectacle · tv = tv_media · par = parc_loisirs · imm = exposition_immersive · mod = mode_luxe · sal = salon_pro · act = activation_marque · cin = cinema · jeu = jeu · com = communautaire · uni = universitaire · tou = tourisme · aut = autre.

| | spo | esp | fes | spe | tv | par | imm | mod | sal | act | cin | jeu | com | uni | tou | aut |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **spo** | 1 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 2 |
| **esp** | 2 | 1 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 2 |
| **fes** | 3 | 3 | 1 | 2 | 3 | 2 | 2 | 3 | 3 | 2 | 3 | 3 | 2 | 3 | 2 | 2 |
| **spe** | 3 | 3 | 2 | 1 | 2 | 2 | 2 | 2 | 3 | 3 | 2 | 3 | 3 | 3 | 3 | 2 |
| **tv** | 3 | 2 | 3 | 2 | 1 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 2 |
| **par** | 3 | 3 | 2 | 2 | 3 | 1 | 2 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2 | 2 |
| **imm** | 3 | 3 | 2 | 2 | 3 | 2 | 1 | 3 | 3 | 2 | 2 | 2 | 3 | 3 | 2 | 2 |
| **mod** | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 1 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 2 |
| **sal** | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 1 | 2 | 3 | 3 | 3 | 2 | 3 | 2 |
| **act** | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 2 | 2 | 1 | 3 | 3 | 3 | 3 | 3 | 2 |
| **cin** | 3 | 3 | 3 | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 1 | 3 | 3 | 3 | 3 | 2 |
| **jeu** | 3 | 2 | 3 | 3 | 2 | 2 | 2 | 3 | 3 | 3 | 3 | 1 | 3 | 3 | 3 | 2 |
| **com** | 2 | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 1 | 2 | 3 | 2 |
| **uni** | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 3 | 2 | 1 | 3 | 2 |
| **tou** | 3 | 3 | 2 | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 1 | 2 |
| **aut** | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 1 |

### Justification

Critère retenu : deux familles sont **voisines (2)** lorsqu'elles partagent au moins deux des trois structures suivantes — la relation entre participants et public, la forme de compétition ou de progression, l'organisation spatiale et temporelle du site. Sinon elles sont **éloignées (3)**. Ce critère évite de récompenser des transferts entre familles qui se ressemblent déjà.

| Relation | Justification |
|---|---|
| sport ↔ esport | compétitions, tableaux, qualifications, arbitrage et diffusion commentée identiques (cité par docs/07). |
| sport ↔ communautaire, sport ↔ universitaire | l'essentiel du sport amateur est associatif ou universitaire : mêmes publics, mêmes bénévoles, mêmes lieux. |
| esport ↔ jeu, esport ↔ tv_media | l'e-sport hérite des mécaniques du jeu vidéo et vit de la diffusion commentée. |
| musique_festival ↔ spectacle, parc_loisirs, exposition_immersive | programmation sur scène, zones, parcours et immersion communs (festival ↔ spectacle cité par docs/07). |
| musique_festival ↔ activation_marque, communautaire, tourisme | les festivals accueillent la plupart des activations de marque, prolongent les fêtes locales et structurent des séjours. |
| spectacle ↔ tv_media, cinema, mode_luxe | même écriture scénique et narrative ; le défilé de mode est un spectacle chorégraphié. |
| tv_media ↔ jeu, cinema | jeux télévisés et mécaniques de jeu (tv ↔ jeu cité par docs/07) ; production audiovisuelle commune avec le cinéma. |
| parc_loisirs ↔ exposition_immersive, jeu, tourisme | files, parcours, attractions et énigmes ; destination touristique. |
| exposition_immersive ↔ cinema, activation_marque, tourisme | récit audiovisuel, pop-up de marque et fréquentation touristique. |
| mode_luxe ↔ activation_marque, salon_pro | présentations privées, salons de la mode et activations de marque partagent invitations, rendez-vous et scénographie de stand. |
| salon_pro ↔ universitaire | conférences, ateliers et rendez-vous structurent les deux formats. |
| autre | 2 avec toute famille et 1 sur la diagonale : une brique non classée ne doit pas obtenir la nouveauté maximale ; on la classe avant de la récompenser. |
| Paires à 3 notables | sport ↔ tv_media, spectacle, jeu, parc_loisirs, festival, mode, salon : ce sont précisément les transferts cités par le brief (vote télévisé, dramaturgie du combat appliquée aux présentations, progression de jeu vidéo, files virtuelles des parcs, zones de festival) ; ils reçoivent la nouveauté maximale, sous réserve de plausibilité. |

### Limites et proposition d'évolution

- 43 des 70 briques ont une origine sportive et la cible du premier blueprint est sportive : avec une seule famille « sport », un transfert Formule 1 → basket 3x3 vaut d = 1, comme un transfert basket 5x5 → basket 3x3. Proposition (non appliquée, à valider) : des sous-familles sportives (collectif, raquette, mécanique, combat, endurance, urbain et glisse, adapté et paralympique) avec d = 1,5 entre sous-familles différentes.
- La matrice ne mesure que la distance ; la **plausibilité** (0 ; 0,5 ; 1) reste une revue humaine par paire mécanique × discipline cible. Exemple : `B-mecanique_jeu-zone-qui-se-reduit` (jeu → sport) a d = 3 mais une plausibilité faible pour un sport sans élimination naturelle, ce qui annule sa nouveauté.
- Les distances sont un jugement de conception, pas une mesure empirique : à revoir après les premières générations de concepts (diversité obtenue, concepts retenus en revue).

## 5. Répartition des origines

sport 43 · musique_festival 7 · jeu 4 · esport 4 · communautaire 3 · tv_media 2 · mode_luxe 2 · activation_marque 2 · parc_loisirs 1 · exposition_immersive 1 · salon_pro 1. Des exemples d'autres familles figurent aussi dans `origin.examples` (télévision, parcs, festivals, jeux vidéo, luxe, salons). Familles encore absentes comme origine principale : spectacle, cinéma, universitaire, tourisme — à compléter par la veille.
