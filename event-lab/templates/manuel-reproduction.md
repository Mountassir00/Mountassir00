# Manuel de reproduction — {{identity.name}}

<!--
MODÈLE — manuel destiné à une équipe qui n'a jamais rencontré les concepteurs (autre ville, licencié). Spécification : docs/08-modeles-documentaires.md §4.10 ; synthèse en section 37 du blueprint.
Emplacement : blueprints/<id>/annexes/manuel-reproduction.md. Exports : PDF, DOCX.
Règles :
- Écrire pour un lecteur extérieur : pas de sous-entendu, pas de jargon interne non défini (voir glossaire).
- Distinguer strictement INVARIANTS (ne se modifient pas sans accord écrit du studio) et VARIABLES (adaptables dans une plage).
- Chaque invariant doit être vérifiable sur place par un contrôleur (critère observable).
- Renvoyer aux sections du blueprint plutôt que dupliquer les tableaux ; les chiffres viennent d'event.json.
- Les démarches réglementaires sont locales : ce manuel liste ce qui est à vérifier, il ne remplace ni les autorités ni le chargé de sécurité.
- Critère de qualité : test de reprise réalisé (§14) avant toute diffusion.
-->

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

| Élément | Valeur |
|---|---|
| Format | {{identity.name}} — {{identity.tagline}} |
| Version de référence | v{{version}} ({{status}}) |
| Blueprint de référence | {{build.id}} |
| Contact studio (rôle) | {{meta.contact_role}} |

## 0. Comment utiliser ce manuel

[À COMPLÉTER : ordre de lecture recommandé ; documents à avoir sous la main (blueprint, conducteur, checklists, règlement, kit d'identité) ; qui contacter en cas de doute sur un invariant.]

## 1. Invariants du format

<!-- Ce qui fait que l'événement EST ce format. 8 à 15 invariants. Chaque ligne : critère observable le jour J. -->

| N° | Invariant | Pourquoi il est essentiel | Critère de contrôle sur place | Source (section du blueprint) |
|---|---|---|---|---|
| I-01 | Nom et identité visuelle utilisés selon la charte | Reconnaissance de la propriété | Supports conformes aux sections 15–18 | 15–18 |
| I-02 | Règles de compétition | Équité et identité du format | Règlement appliqué sans modification non autorisée | 12 |
| I-03 | Séquence des temps forts | Rythme et expérience | Ordre des séquences critiques respecté | 13, 27 |
| I-04 | | | | |

## 2. Variables d'adaptation

| Variable | Valeur de référence | Plage admise | Conséquence hors plage | Qui décide |
|---|---|---|---|---|
| Jauge spectateurs | {{audience.attendance.central}} | [À COMPLÉTER] | | |
| Nombre de participants | {{participants.count.central}} | [À COMPLÉTER] | | |
| Durée | {{format.duration_hours}} h | [À COMPLÉTER] | | |
| Budget (palier) | {{sim.finance.central.expenses_total\|eur}} | [À COMPLÉTER] | | |
| Cadre (intérieur / extérieur) | {{venue_requirements.setting}} | [À COMPLÉTER] | | |
| Calendrier (saison, jour, horaires) | | | | |
| Tarifs | | | | |
| Partenaires locaux | | | | |
| Langue | | | | |

## 3. Prérequis minimaux

| Domaine | Exigence minimale | Source |
|---|---|---|
| Lieu : surface | ≥ {{venue_requirements.min_area_m2}} m² | 21, 37 |
| Lieu : énergie | {{venue_requirements.power_kw}} kW | 23 |
| Lieu : réseau | {{venue_requirements.internet}} | 22 |
| Lieu : espaces | {{#each venue_requirements.spaces}}{{.type}} ; {{/each}} | 21 |
| Équipe | [À COMPLÉTER : rôles indispensables et effectifs minimaux] | 24 |
| Compétences | [À COMPLÉTER : arbitrage, régie son, premiers secours fournis par une association agréée…] | 24, 32 |
| Matériel | [À COMPLÉTER : renvoi au kit standard §4] | 23 |
| Trésorerie | Besoin estimé {{sim.finance.cash_need\|eur}} au plus bas | 29 |
| Délai de préparation | J-120 recommandé `[param]` | 26 |

## 4. Kit standard

| Élément | Contenu | Format | Fourni par le studio | À produire localement |
|---|---|---|---|---|
| Kit d'identité | Logo, palette, gabarits | SVG, PNG, PDF | oui | déclinaisons locales |
| Règlement | Complet + version publique | PDF, DOCX | oui | — |
| Modèles de travail | budget, recettes, conducteur, rétroplanning, risques | CSV, XLSX | oui | données locales |
| Checklists | J-120 à J-1, jour J, sécurité, bénévoles, sponsors, post-événement | Markdown, PDF | oui | — |
| Matériel spécifique | [À COMPLÉTER] | | | |

## 5. Procédure de J-120 à J+30

<!-- Renvoyer aux checklists ; ne garder ici que la séquence et les points de décision. -->

| Période | Objectif | Checklist | Point go/no-go |
|---|---|---|---|
| J-120 → J-90 | Lieu, porteur local, démarches lancées | checklist-J-120-a-J-1.md | J-90 |
| J-90 → J-60 | Partenaires, budget engagé, recrutement | checklist-J-120-a-J-1.md, checklist-sponsors.md | J-60 |
| J-60 → J-30 | Communication, inscriptions, prestataires | checklist-J-120-a-J-1.md, checklist-benevoles.md | J-30 |
| J-30 → J-1 | Confirmations, briefings, logistique | checklist-J-120-a-J-1.md, checklist-securite-accessibilite.md | J-7 |
| J | Exploitation | checklist-jour-J.md, conducteur | — |
| J+1 → J+30 | Clôture, bilan, retour au studio | checklist-post-evenement.md | — |

## 6. Configurations selon le lieu

| Configuration | Quand l'utiliser | Ce qui change | Plan |
|---|---|---|---|
{{#each variants}}
| {{.id}} — {{.label}} | {{.description}} | [À COMPLÉTER] | visuels/plans/{{.id}}.svg |
{{/each}}

## 7. Rôles et fiches de poste

| Rôle | Effectif de référence | Fiche de poste | Profil requis |
|---|---|---|---|
{{#each resources.staff}}
| {{.role}} | {{.count}} | annexes/fiches-poste/ | |
{{/each}}

## 8. Règlement et arbitrage

[À COMPLÉTER : renvoi au règlement ; formation des arbitres (durée, contenu) ; cas litigieux fréquents et décision attendue.]

## 9. Conducteur type

Le conducteur de référence est `data/conducteur.csv` (section 27). Séquences critiques à ne pas supprimer :

{{#each program where .critical=true}}
- {{.id}} — {{.label}} ({{.duration_min}} min)
{{/each}}

## 10. Erreurs à ne pas reproduire

| Fiche | Erreur | Prévention | Point de checklist |
|---|---|---|---|
| E- | | | |

## 11. Contrôle de conformité au format

| Invariant | Contrôlé par (rôle) | Moment | Preuve | Conforme |
|---|---|---|---|---|
| I-01 | | | | |

## 12. Retour d'expérience obligatoire

Le bilan post-événement (`templates/bilan-post-evenement.md`) est transmis au studio à J+30 `[param]`, avec : fréquentation, finances ligne à ligne, horaires réels, incidents, satisfaction, contreparties livrées, KPIs. Ces données alimentent la version suivante du format (docs/07 §10).

## 13. Adaptation réglementaire locale

Les démarches dépendent de la commune, du département, du lieu, de l'effectif et du type de manifestation. Partir de `templates/checklists/checklist-securite-accessibilite.md` et vérifier chaque point auprès des autorités locales.

| Démarche | Autorité locale | Contact | Délai confirmé localement | Statut |
|---|---|---|---|---|
| | | | | |

## 14. Test de reprise

<!-- Une personne extérieure au projet reconstitue, avec ce seul manuel, la procédure de J-120 à J+30 et identifie les rôles et invariants. -->

| Date | Profil du testeur | Étapes reconstituées correctement | Questions restées sans réponse | Corrections apportées au manuel |
|---|---|---|---|---|
| | | | | |

## 15. Glossaire

| Terme | Définition |
|---|---|
| J | Jour de l'événement ; J-30 = 30 jours avant, J+10 = 10 jours après |
| Invariant | Élément du format non modifiable sans accord écrit du studio |
| Variante | Configuration (économique, premium, capacité maximale, secours…) définie dans `variants[]` |
| Go/no-go | Point de décision à critère vérifiable, au-delà duquel on engage ou on arrête |
| Séquence critique | Séquence dont l'échec compromet l'événement ; elle a un plan de continuité |
| [param] | Paramètre de modélisation configurable, pas une norme |
