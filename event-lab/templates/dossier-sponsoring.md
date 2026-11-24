# Dossier de sponsoring — structure de diapositives

<!--
MODÈLE — dossier partenaires, exporté en PPTX (python-pptx) puis en PDF pour l'envoi. Spécification : docs/08-modeles-documentaires.md §4.4 et section 31 du blueprint.
Format : 16:9 ; 12 diapositives ; une idée par diapositive ; police et couleurs de la section 18 du blueprint.
Pour chaque diapositive : Titre · Message clé (une phrase) · Données (champs EventConfig) · Visuel · Notes de l'orateur.
Règles :
- Audiences annoncées = scénario PRUDENT, ou scénario nommé explicitement sur la diapositive. Statut (fait / estimation / hypothèse) affiché à côté de chaque chiffre.
- Aucun logo de partenaire ou de collectivité sans accord écrit.
- Une version par cible si les offres diffèrent : le prix consenti à un partenaire n'apparaît jamais dans le dossier d'un autre.
- Contreparties mesurables : nombre, durée, emplacement, format.
- Aucune image dont les droits ne sont pas documentés (section 17).
- Mention de confidentialité en pied de chaque diapositive : « Document confidentiel — {{meta.organizer}} — v{{version}} ».
-->

## Diapositive 1 — Couverture

| Élément | Contenu |
|---|---|
| Titre | {{identity.name}} |
| Message clé | {{identity.tagline}} |
| Données | {{meta.city}} · {{meta.event_date}} · {{meta.organizer}} |
| Visuel | Logo principal (visuels/logo/) sur visuel d'ambiance libre de droits |
| Notes de l'orateur | Présentation de l'interlocuteur et objet du rendez-vous. |

## Diapositive 2 — Le concept en 30 secondes

| Élément | Contenu |
|---|---|
| Titre | [À COMPLÉTER : formule courte] |
| Message clé | {{identity.pitch}} |
| Données | Durée {{format.duration_hours}} h · cadence {{format.edition_cadence}} · disciplines {{identity.disciplines\|join}} |
| Visuel | Schéma du déroulé (3 à 5 temps forts) |
| Notes de l'orateur | Raconter le moment le plus fort du point de vue d'un spectateur. |

## Diapositive 3 — Pourquoi ce format

| Élément | Contenu |
|---|---|
| Titre | Ce que le format change |
| Message clé | [À COMPLÉTER : problème résolu pour le public ou le territoire — section 08] |
| Données | 2 ou 3 problématiques de la section 08, avec leur preuve (S-…, W-…) |
| Visuel | Avant / après |
| Notes de l'orateur | Ne citer aucun chiffre sans statut. |

## Diapositive 4 — Publics et audience

| Élément | Contenu |
|---|---|
| Titre | Qui sera là |
| Message clé | [À COMPLÉTER] |
| Données | Spectateurs uniques (scénario prudent) : {{audience.attendance.prudent}} — [statut] · Participants : {{participants.count.prudent}} {{participants.unit}} — [statut] · Segments : {{#each identity.audiences}}{{.segment}} ; {{/each}} |
| Visuel | Personas (section 10), sans photo de personne réelle |
| Notes de l'orateur | Préciser qu'il s'agit du scénario prudent ; présenter le central seulement s'il est demandé, étiqueté. |

## Diapositive 5 — Programme et moments forts

| Élément | Contenu |
|---|---|
| Titre | Le déroulé |
| Message clé | [À COMPLÉTER] |
| Données | Programme public simplifié (section 13.1) · Moments viraux : {{media.viral_moments\|join}} |
| Visuel | Frise horaire |
| Notes de l'orateur | Indiquer les moments où la marque est visible. |

## Diapositive 6 — Visibilité et contenus

| Élément | Contenu |
|---|---|
| Titre | Où la marque sera vue |
| Message clé | [À COMPLÉTER] |
| Données | Canaux : {{media.channels\|join}} · Spots photo : {{media.photo_spots\|join}} · Calendrier éditorial résumé (section 30) |
| Visuel | Maquettes de formats (section 22) |
| Notes de l'orateur | Ne promettre aucune audience de réseau social sans historique mesuré. |

## Diapositive 7 — Offres partenaires

| Élément | Contenu |
|---|---|
| Titre | Devenir partenaire |
| Message clé | [À COMPLÉTER] |
| Données | Tableau des paliers : {{#each sponsor_packages}}{{.name}} — {{.price\|eur}} — {{.quantity}} place(s) — {{.exclusivity}} — {{.counterparts\|join}} ; {{/each}} |
| Visuel | Tableau comparatif des paliers (3 colonnes maximum) |
| Notes de l'orateur | Adapter la version : retirer les paliers non pertinents pour la cible. |

## Diapositive 8 — Activations proposées

| Élément | Contenu |
|---|---|
| Titre | Faire vivre la marque sur place |
| Message clé | [À COMPLÉTER] |
| Données | Briques d'activation : {{#each format.building_blocks where .type=activation_partenaire}}{{.label}} ; {{/each}} · espace dédié, séquence, durée |
| Visuel | Croquis d'implantation de l'espace partenaire (avec la mention « implantation non validée réglementairement ») |
| Notes de l'orateur | Une activation ne doit pas dégrader l'expérience du public (brief §11). |

## Diapositive 9 — Mesure et compte rendu

| Élément | Contenu |
|---|---|
| Titre | Ce que vous recevrez après l'événement |
| Message clé | Chaque contrepartie est mesurée et prouvée. |
| Données | KPIs transmis au partenaire : {{#each kpis}}{{.label}} ; {{/each}} · Délai de remise du compte rendu : [À COMPLÉTER : J+n] |
| Visuel | Gabarit vide du compte rendu partenaire (rubriques sans valeurs) |
| Notes de l'orateur | Engagement de transparence, y compris si un objectif n'est pas atteint. |

## Diapositive 10 — Calendrier et engagements

| Élément | Contenu |
|---|---|
| Titre | Calendrier |
| Message clé | [À COMPLÉTER] |
| Données | Date limite d'engagement · remise des éléments graphiques · installation · bilan (jalons de `milestones[]`) |
| Visuel | Frise J-n → J+n |
| Notes de l'orateur | Préciser les échéances de paiement. |

## Diapositive 11 — Porteur du projet

| Élément | Contenu |
|---|---|
| Titre | Qui organise |
| Message clé | [À COMPLÉTER] |
| Données | {{meta.organizer}} · références vérifiables · partenaires déjà engagés (uniquement avec accord écrit) |
| Visuel | — |
| Notes de l'orateur | — |

## Diapositive 12 — Contact et prochaine étape

| Élément | Contenu |
|---|---|
| Titre | Prochaine étape |
| Message clé | [À COMPLÉTER : action demandée et date] |
| Données | Contact : {{meta.contact_role}} (coordonnées professionnelles génériques) |
| Visuel | Logo |
| Notes de l'orateur | Proposer un rendez-vous de suivi daté. |

---

## Contrôle avant envoi

- [ ] Audiences au scénario prudent ou scénario nommé, avec statut — section 31, C3
- [ ] Prix et quantités identiques à `sponsor_packages[]` et à la ligne de recettes liée — C3
- [ ] Aucun logo de tiers sans accord écrit
- [ ] Aucun prix négocié d'un autre partenaire
- [ ] Droits de chaque image documentés
- [ ] Version (`v{{version}}`) et confidentialité en pied de page
- [ ] Aucun bloc « EXEMPLE FICTIF » ni identifiant `EX-` restant
