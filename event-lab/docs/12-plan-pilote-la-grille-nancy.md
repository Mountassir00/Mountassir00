# 12 — Plan du pilote : LA GRILLE 3x3 avec Bask'Est (Nancy)

> Décision du porteur (2026-11-24) : premier pilote terrain = LA GRILLE 3x3, avec l'association Bask'Est. Ce plan s'appuie uniquement sur le blueprint v0.2.0 et sur des informations publiques. **Il ne contient aucune donnée interne à l'association** : ces données sont à apporter par le bureau.
>
> Rappel de la position EVENT LAB : LA GRILLE est un **pilote opérationnel**, pas un pari économique (62/100, configuration économique seule recommandée). Le pilote sert à prouver la méthode (configuration → simulation → exécution → bilan prévu/réel), à tester l'hypothèse H-09 et à créer le premier cas de référence vendable.

## 1. Deux écarts avec la roadmap à arbitrer maintenant

| Porte G1 (docs/09) | Situation de LA GRILLE | Proposition |
|---|---|---|
| Blueprint noté **≥ 65/100** | 62/100 (C) | Ne pas abaisser le seuil. Le gain vient du terrain : des recettes **signées** font passer la viabilité de 1,5 à 3 (+4,5 points → environ 67/100). Le pilote doit donc franchir le seuil par des faits, pas par une renotation. |
| Budget de l'événement **10 à 30 k€** | Configuration recommandée ≈ 7,7 k€ | Remplacer le critère par « budget conforme à la configuration retenue au go/no-go de J-60 ». Le seuil de 10 k€ venait de l'hypothèse H2, posée avant la simulation. **Décision du porteur requise** (modification de la roadmap = nouvelle version tracée). |

## 2. Les 7 premiers jours (test de validation)

Objectif : savoir en une semaine si le format attire des équipes et des partenaires, **avant** toute dépense.

| Jour | Action | Responsable | Livrable | Indicateur de validation |
|---|---|---|---|---|
| J1 | Présenter LA GRILLE au bureau de Bask'Est (dossier PDF + simulateur) ; recueillir les données internes manquantes (affluences passées, partenaires existants, bénévoles disponibles) | Porteur | Compte rendu, liste des données | Accord de principe du bureau pour tester |
| J1-J2 | Page de préinscription (HelloAsso ou équivalent) avec acompte de 10 € par équipe, déduit de l'inscription | Porteur + bénévole | Page en ligne | Page publiée |
| J2-J5 | Relais par 5 clubs et le comité départemental ; publication de la vidéo de démonstration du parcours (60 s, format vertical) | Porteur | Messages envoyés, vidéo | 12 équipes préinscrites avec acompte |
| J2-J6 | Sollicitation de 15 commerces et entreprises locales avec le dossier partenaires (PPTX) | Porteur | Liste de prospection | 3 engagements ≥ 500 € (oraux ou écrits) |
| J3 | Demande de créneau et des données du lieu (effectif autorisé, paniers, prises, sorties) à l'exploitant | Porteur | Courriel daté | Réponse reçue ou relance planifiée |
| J5 | Questionnaire court aux préinscrits : intérêt pour les qualifications chronométrées | Porteur | Résultats | ≥ 60 % jugent les qualifications attractives |
| J7 | Bilan : saisir les recettes requalifiées dans `event.json` (probable / sécurisée), relancer la simulation | Porteur | Nouvelle version de la configuration | Décision : continuer, ajuster ou arrêter |

**Règle d'arrêt** : moins de 6 équipes préinscrites et aucun engagement partenaire à J7 → on n'engage pas l'édition. On garde le format et on le retente ou on bascule sur le concept suivant du portefeuille.

## 3. Les 30 jours suivants

1. **Entretiens de découverte** (porte G1) : 15 entretiens, avec au moins 3 types d'organisateurs (associations, clubs, collectivités, agences), pour tester trois ancres de prix pour le studio : licence du format, prestation de coordination et kit matériel. Les réactions sont consignées dans une grille.
2. **Convention de pilote** avec Bask'Est. Elle fixe les rôles (l'association organise juridiquement, le studio conçoit et coordonne), la date J, le lieu et la rémunération du studio, même réduite.
3. **Conformité** : ouvrir les démarches marquées J-120 et J-90 dans `event.json` (décision d'homologation fédérale, réservation du dispositif de secours, questions à l'exploitant sur l'homologation et l'utilisation exceptionnelle du lieu).
4. **Relecture externe** du blueprint par un professionnel (critère de G1) : un organisateur de tournoi 3x3, un arbitre ou un responsable de salle.
5. **Version de la configuration après le test** : nouvelle version de LA GRILLE avec le lieu réel (remplace l'archétype), les recettes requalifiées et la notation mise à jour. Elle est versionnée, jamais modifiée en silence.

## 4. Tableau de bord du pilote (chaque lundi)

| Indicateur | Cible | Source |
|---|---|---|
| Équipes préinscrites avec acompte | 12 à J7, 20 à J-14 de l'événement | Billetterie |
| Recettes signées ou notifiées | ≥ dépenses de la configuration économique au scénario prudent, à J-60 | `event.json` après requalification |
| Entretiens de découverte menés | 15 avant la porte G1 | Comptes rendus |
| Organisateurs du pipeline avec un besoin daté | ≥ 3 | Fiches pipeline |
| Note du blueprint | ≥ 65/100 avec des recettes signées | Moteur de notation |

## 5. Ce qui reste à la charge du porteur

Toutes les prises de contact, signatures et démarches administratives. EVENT LAB prépare les documents, recalcule les scénarios et versionne les décisions. Il ne contacte personne et ne publie rien sans demande explicite.
