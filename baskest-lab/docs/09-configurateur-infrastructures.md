# 09 — Configurateur d'infrastructures

> Code : `src/core/venue/layout.ts` (implantation), `src/core/venue/svg.ts` (rendu), `src/data/venues.ts` (référentiel des lieux).
> Interface : **Configurateur de salles** (`#/salles`). Statut : opérationnel.

> ⚠️ **Avertissement.** Les plans, capacités, unités de passage et places PMR calculés ici sont **indicatifs**. Ils servent à préparer la discussion avec le gestionnaire du lieu, le chargé de sécurité et, si elle est saisie, la commission de sécurité. Ils ne remplacent ni le plan d'évacuation officiel du lieu, ni l'avis d'un bureau de contrôle, ni la réglementation ERP applicable. Information générale, pas un avis réglementaire.

## 1. Modèle d'un lieu (`Venue`)

| Champ | Contenu | Provenance obligatoire |
|---|---|---|
| `floor` | Aire principale exploitable (longueur × largeur, m) | oui (`provenance`) |
| `spaces[]` | Espaces annexes : salle annexe, hall, extérieur, coursive (dimensions) | oui, par espace |
| `courts`, `baskets` | Terrains et paniers disponibles | — |
| `fixedSeats`, `seatsProvenance` | Places assises fixes | oui |
| `authorizedGauge` | Jauge autorisée (si connue) — **prime** sur tout calcul | — |
| `lockerRooms` | Vestiaires | — |
| `accesses[]` | Accès : libellé, largeur (m), accessible PMR | à relever |
| `indoor`, `av` | Intérieur/extérieur ; tableau de score, écran géant, sono, lumière show, wifi | — |
| `constraints[]` | Contraintes connues (club résident, patrimoine, riverains…) | — |
| `sources[]` | Sources publiques | — |

Toute dimension porte un niveau de confiance : **vérifié**, **probable**, **estimation**, **hypothèse**. L'interface l'affiche dans la fiche du lieu.

## 2. Gabarits de terrains

| Terrain | Aire de jeu | Emprise avec dégagement de 2 m |
|---|---|---|
| 5x5 (FIBA) | 28 × 15 m | 32 × 19 m |
| 3x3 (demi-terrain FIBA) | 15 × 11 m | 19 × 15 m |

Le dégagement (`runOffM`) est un paramètre : **alerte** en dessous de 2 m, **bloquant** en dessous de 1 m (règle R24). Les terrains peuvent être tournés de 90° pour tenir dans un espace.

## 3. Algorithme d'implantation (`generateLayout`)

1. **Canevas** : l'aire principale à gauche ; les espaces annexes empilés à droite. Si le lieu a des places fixes, une bande de tribunes de 6 m est dessinée autour de l'aire principale (représentation, pas un relevé).
2. **Terrains d'abord** : 5x5 cherchés dans l'aire principale, puis annexe, puis extérieur ; 3x3 dans principal, annexe, extérieur, hall. En configuration « show », le terrain 5x5 est centré. Chaque placement découpe l'espace libre restant (découpe « guillotine »).
3. **Zones fonctionnelles** par bandes (*shelf packing*) : chaque zone a une surface cible, un côté minimal et un ordre de préférence d'espaces ; elle est posée comme une bande sur toute la hauteur (ou la largeur) du plus grand rectangle libre compatible.
   - zone acceptée si elle obtient **≥ 60 %** de la surface demandée ;
   - alerte si elle obtient **< 95 %** ;
   - zone « non implantée » sinon (avec proposition : extérieur, chapiteau, réduction).
4. **Capacités, évacuation, PMR** (§5).
5. **Flux** dessinés : entrée (accueil → terrain), joueurs (espace joueurs → terrain), secours (poste de secours → terrain), sortie.

### Surfaces cibles des zones (heuristiques du code)

| Zone | Surface cible | Côté min. | Espaces préférés |
|---|---|---|---|
| Régie / table de marque | 12 m² | 2 m | principal |
| Poste de secours | 15 m² (30 m² au-delà de 1 500 spectateurs) | 3 m | principal, hall, annexe, extérieur |
| Accueil / billetterie / contrôle | 20 m² + 0,01 m² par spectateur | 3 m | hall, extérieur, principal |
| Tribunes mobiles (si besoin) | 0,5 m² par place ; places = min(public, 70 % du public) − places fixes | 3 m | principal, extérieur |
| Échauffement | max(60 m², ⌈équipes / 8⌉ × 165 m²) | 8 m | annexe, principal, extérieur |
| Espace joueurs | max(30 m², 1,5 m² par participant) | 4 m | annexe, principal, hall |
| Base bénévoles | max(15 m², 1 m² par bénévole) | 3 m | annexe, hall, principal |
| Restauration | 27 m² par point de vente ; 1 point pour 400 spectateurs (min. 1) | 3 m | hall, extérieur, coursive, principal |
| Village partenaires | 9 m² × 1,5 par stand | 4 m | hall, extérieur, coursive, annexe, principal |
| Zone création de contenu | 30 m² | 4 m | principal, hall, annexe |
| Espace médias | 15 m² (30 m² au-delà de 1 000 spectateurs) | 3 m | principal, hall, annexe |
| Espace VIP | max(20 m², 1,2 m² par invité) | 4 m | principal, annexe, hall |
| Zone d'animation | 60 m² (200 m² en configuration festival) | 5 m | extérieur, hall, annexe, principal |
| Stockage | 20 m² | 3 m | annexe, hall, principal |

Pas de VIP si 0 invité ; pas de village si 0 partenaire ; toute zone peut être exclue (`exclude`).

## 4. Variantes proposées automatiquement (`suggestLayouts`)

| Variante | Contenu |
|---|---|
| **Show** | 1 terrain 5x5 central |
| **Tournoi** | 3x3 : max(2, ⌊surface de l'aire / 260 m²⌋) terrains |
| **Hybride** | 1 terrain 5x5 + 2 terrains 3x3 si le lieu a une annexe ou un extérieur |
| **Festival** | 2 terrains 3x3 + grande zone d'animation (lieux extérieurs et places publiques) |

Si des terrains ne tiennent pas, le configurateur **réduit** leur nombre jusqu'à ce que tous soient implantés (pas de terrain « fantôme » sur le plan).

## 5. Contrôles indicatifs (inspirés du règlement ERP — à valider)

| Contrôle | Règle appliquée par le code |
|---|---|
| Effectif pris en compte | min(public attendu, jauge autorisée si connue, sinon capacité estimée) + participants + bénévoles |
| Nombre de dégagements | 1 jusqu'à 19 personnes ; 2 jusqu'à 1 000 ; au-delà, 2 + 1 par tranche de 500 (arrondie au supérieur) |
| Unités de passage (UP) | 1 UP pour 100 personnes ; largeur → UP : 0,90 m = 1 UP, 1,40 m = 2 UP, à partir de 1,80 m = largeur / 0,60 |
| Places PMR | 2 jusqu'à 50 places ; +1 par tranche de 50 jusqu'à 1 000 ; au-delà, au moins 20 (nombre fixé par arrêté municipal) |
| Capacité debout | 1 personne/m² sur les zones ouvertes (animation, village) — volontairement prudent |
| Jauge | public > jauge autorisée → **BLOQUANT** ; public > capacité estimée → alerte (règle R22) |
| Accès PMR | aucun accès PMR recensé → **bloquant** (règle R20) |

Ces seuils sont repris des règles usuelles ; leur application exacte à un lieu donné (catégorie d'ERP, type X pour les établissements sportifs couverts, configuration spécifique) relève du gestionnaire et des services compétents. Voir `docs/research/R3-cadre-reglementaire-financements.md` pour le cadre général.

## 6. Rendu

- **2D** : `renderLayoutSvg(layout)` produit un SVG à l'échelle (10 px par mètre par défaut), avec lignes de terrain (raquettes, arcs à 6,75 m, rond central), hachures des espaces, couleurs par type de zone, surfaces en m², flèches de flux, échelle de 10 m et légende. Exporté dans le Blueprint (`assets/plan.svg` et `.png`) et téléchargeable depuis l'interface.
- **3D simplifiée** : bascule d'affichage en perspective (CSS) du même plan, pour la lecture des volumes en réunion. Ce n'est pas une maquette 3D métrée ; une vraie visualisation 3D (billetterie immersive) dépend d'une intégration (voir `docs/12`).

## 7. Le Palais des Sports Jean-Weille (Nancy-Gentilly)

Fiche `PALAIS_JEAN_WEILLE` — état des connaissances au 24/11/2026 (source : `docs/research/R1-baskest-et-territoire.md`).

| Donnée | Valeur utilisée | Niveau |
|---|---|---|
| Capacité | 6 000 places (sports.gouv.fr) ; 6 027 selon Wikipédia | **vérifié** (la jauge autorisée réelle dépend de la configuration validée) |
| Aire principale | 44 × 24 m | **probable** (deux annuaires d'équipements) |
| Salle annexe | 36 × 18 m | **probable** |
| Hall / coursives | 30 × 10 m | **hypothèse** (à relever) |
| Vestiaires | 6 | **probable** |
| Accès et largeurs (5 accès, 1,80 à 6 m) | valeurs saisies pour permettre le calcul | **SUPPOSÉ — à remplacer par le plan d'évacuation officiel** |
| Équipements audiovisuels (tableau de score, sono, pas d'écran géant) | valeurs par défaut | **hypothèse** |
| Accès tram | T2, arrêt « Palais des Sports – Gentilly » | vérifié (R1) |
| Gestionnaire | Métropole du Grand Nancy (probable) | probable |
| Équipements haut niveau | balnéo, kinésithérapie, sauna, musculation 250 m², salle de presse, salle antidopage (fiche Centre de Préparation aux Jeux) | vérifié (R1) |

Contraintes enregistrées : salle du SLUC Nancy (Betclic Élite et FIBA Europe Cup en 2026-27) → disponibilités contraintes, notamment en juin (période de playoffs) ; toute configuration à valider par le gestionnaire.

Résultat pour le dossier phare (configuration show, 1 500 spectateurs, 64 participants, 40 bénévoles, 8 partenaires, 60 VIP) : 6 000 places assises, 198 places debout en zones ouvertes, 20 places PMR à prévoir, 4 dégagements requis pour 5 recensés (supposés), 17 UP requises pour 27 disponibles (supposées), aucune alerte. **Ce résultat ne vaut que si les accès supposés sont confirmés.**

## 8. Gabarits des autres types de lieux

Dimensions **gabarit** (hypothèse) à remplacer par un relevé :

| Type | Gabarit | Particularités enregistrées |
|---|---|---|
| Terrain extérieur | 32 × 19 m, 1 terrain + 2 demi | Météo : plan de repli et plan canicule obligatoires (R26) |
| City-stade | 22 × 12 m, 1 demi-terrain | Revêtement à vérifier ; riverains (horaires, sono) |
| Gymnase municipal | 44 × 24 m, 300 places, 4 vestiaires | Accès 1,80 m + issue 1,40 m |
| Complexe sportif | 44 × 26 m + salle n°2 32 × 20 m, 800 places | 3 accès |
| Arena | 60 × 32 m + coursives 80 × 8 m, 8 000 places | Écran géant, lumière show |
| Place publique | 60 × 40 m, 3 accès larges | Occupation du domaine public, arrêté municipal, site patrimonial possible, tribunes démontables à faire vérifier |
| Centre commercial | 40 × 20 m | Horaires du centre ; sol non sportif (dalles clipsables) |
| Campus | 44 × 24 m + esplanade 40 × 25 m, 200 places | — |
| Espace temporaire | 50 × 35 m | Tout est à apporter : sol, paniers, électricité, sanitaires, éclairage, eau |

## 9. Fiche de relevé à remplir par l'association (visite technique)

À faire pour chaque lieu envisagé, en présence du gestionnaire. Les champs alimentent directement `src/data/venues.ts` (ou la table `venues` de la future base).

**Dimensions et sol**
- [ ] Longueur × largeur de l'aire principale (mur à mur et zone utile hors bancs)
- [ ] Dimensions des espaces annexes (salle annexe, hall, coursives, extérieur)
- [ ] Hauteur sous plafond, obstacles (poteaux, radiateurs, paniers relevables)
- [ ] Type de sol, protections exigées (bâches, interdiction de certains matériels), marquages existants
- [ ] Nombre de paniers fixes et mobiles, terrains tracés

**Public et sécurité**
- [ ] **Jauge autorisée** par configuration (assis, debout, avec tribunes mobiles) — document du gestionnaire
- [ ] **Plan d'évacuation officiel** : nombre et largeur réelle de chaque issue, issues PMR
- [ ] Catégorie ERP / exigences de la commission de sécurité ; présence SSIAP exigée ou non
- [ ] Emplacement du poste de secours, du défibrillateur, accès des secours
- [ ] Places PMR existantes, cheminements, sanitaires accessibles

**Technique**
- [ ] Puissance électrique disponible et emplacement des prises (sono, écran, food-trucks)
- [ ] Réseau : wifi, 4G/5G en salle (billetterie QR, direct, votes)
- [ ] Points d'accroche (bannières, lumière), autorisation d'ancrage au sol
- [ ] Tableau de score, chrono de possession, sono, écran, éclairage (niveaux, commande)
- [ ] Vestiaires (nombre, douches), local arbitres, salle de presse

**Exploitation**
- [ ] Horaires d'accès (montage / démontage), personnel du lieu obligatoire et coût
- [ ] Buvette : autorisation, emplacements, règles propres au lieu
- [ ] Stockage, quai de livraison, stationnement, accès transports en commun
- [ ] Tarif de mise à disposition et conditions (convention, assurance, caution)
- [ ] Calendrier du club résident et dates de repli

Une fois la fiche remplie, passer les champs concernés de « hypothèse » à « vérifié » (avec la date et la source) et relancer l'implantation.
