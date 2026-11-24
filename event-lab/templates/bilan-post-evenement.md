# Bilan post-événement — {{identity.name}} v{{version}}

<!--
MODÈLE — bilan prévu vs réel. Spécification : docs/08-modeles-documentaires.md §4.3 ; formules : docs/07-algorithmes.md §10.
Emplacement : blueprints/<id>/bilans/<version>/bilan.md (+ bilan-donnees.xlsx pour les tableaux d'écarts).
Calendrier [param] : bilan à chaud J+3 (sections 1, 2, 5, 8) ; bilan complet J+30 (toutes sections, après réception des factures) ; proposition de version J+45.
Règles :
- La version exécutée (event.json, statut validated) N'EST PAS MODIFIÉE. Les valeurs réelles sont saisies ici.
- Chaque valeur réelle cite sa source de mesure (export billetterie, relevé bancaire, facture, comptage, questionnaire, chronométrage).
- Une valeur réelle non mesurée est marquée [ESTIMATION] avec sa méthode ; elle n'est jamais présentée comme mesurée.
- Écart relatif = (réel − prévu) / prévu. La colonne « prévu » reprend le scénario central sauf mention contraire.
- Chaque incident significatif donne lieu à une fiche d'erreur (templates/fiche-erreur.md), nouvelle ou enrichie.
- Les paramètres [param] ne sont recalibrés que sur proposition validée par un humain.
-->

## 1. Identification

| Élément | Valeur |
|---|---|
| Événement | {{identity.name}} — v{{version}} |
| Date de J | {{meta.event_date}} |
| Lieu | {{venue.name}} — {{venue.city}} |
| Variante exécutée | {{#if active_variant}}{{active_variant}}{{else}}Configuration de base{{/if}} |
| Rédacteur (rôle) | |
| Date du bilan | |
| Type | à chaud (J+3) / complet (J+30) |

## 2. Synthèse

<!-- Cinq lignes maximum : ce qui a fonctionné, ce qui n'a pas fonctionné, résultat financier réel, incident majeur, recommandation principale. -->

[À COMPLÉTER]

## 3. Fréquentation

| Indicateur | Prudent | Central | Ambitieux | Réel | Écart / central | Source de la mesure |
|---|---|---|---|---|---|---|
| Spectateurs uniques | {{audience.attendance.prudent}} | {{audience.attendance.central}} | {{audience.attendance.ambitieux}} | | | |
| dont payants | | | | | | |
| Participants ({{participants.unit}}) | {{participants.count.prudent}} | {{participants.count.central}} | {{participants.count.ambitieux}} | | | |
| Présence simultanée maximale | {{sim.peak_presence.prudent}} | {{sim.peak_presence.central}} | {{sim.peak_presence.ambitieux}} | | | |
| Durée moyenne de présence (min) | — | {{audience.avg_dwell_min}} | — | | | |

## 4. Finances

### 4.1 Dépenses

| Id | Libellé | Certitude prévue | Prévu (central) | Réel | Écart | Pièce (facture n°) |
|---|---|---|---|---|---|---|
{{#each sim.finance.expense_lines}}
| {{.id}} | {{.label}} | {{.certainty}} | {{.total_central\|eur}} | | | |
{{/each}}
| — | Dépenses non prévues (détailler) | — | 0 € | | | |

### 4.2 Recettes

| Id | Libellé | Certitude prévue | Prévu (central) | Réel | Écart | Pièce (encaissement) |
|---|---|---|---|---|---|---|
{{#each sim.finance.revenue_lines}}
| {{.id}} | {{.label}} | {{.certainty}} | {{.total_central\|eur}} | | | |
{{/each}}

### 4.3 Résultat et trésorerie

| | Prévu (central) | Réel | Écart |
|---|---|---|---|
| Total dépenses | {{sim.finance.central.expenses_total\|eur}} | | |
| Total recettes | {{sim.finance.central.revenues_total\|eur}} | | |
| Résultat | {{sim.finance.central.result\|eur}} | | |
| Besoin de trésorerie maximal | {{sim.finance.cash_need\|eur}} | | |
| Contingence consommée | {{sim.finance.central.contingency\|eur}} | | |

## 5. Programme

| Séquence | Début prévu | Début réel | Fin prévue | Fin réelle | Retard (min) | Cause |
|---|---|---|---|---|---|---|
{{#each sim.program_lines}}
| {{.id}} — {{.label}} | {{.start_min\|hhmm}} | | {{.end_min\|hhmm}} | | | |
{{/each}}

| Étape de compétition | Durée simulée | Durée réelle | Écart | Cause |
|---|---|---|---|---|
{{#each sim.competition.stages}}
| {{.id}} | {{.duration_min}} min | | | |
{{/each}}

## 6. Flux et accueil

| Indicateur | Simulé | Mesuré | Méthode de mesure |
|---|---|---|---|
| Attente maximale à l'entrée (min) | {{sim.flow.max_wait_min}} | | |
| Files ouvertes | {{sim.flow.lanes_required}} | | |
| Heure de pointe de présence | {{sim.flow.peak_at_min\|hhmm}} | | |
| Attente maximale buvette (min) | | | |

## 7. Personnel

| Rôle | Prévu | Présent | Absences | Heures réelles | Remarques |
|---|---|---|---|---|---|
{{#each resources.staff}}
| {{.role}} | {{.count}} | | | | |
{{/each}}

## 8. Incidents

| Heure | Incident | Gravité (mineure, majeure, critique) | Plan activé | Efficacité | Fiche d'erreur créée ou enrichie |
|---|---|---|---|---|---|
| | | | | | E- |

## 9. Satisfaction

| Public | Méthode (questionnaire, entretien, avis publics) | Taille de l'échantillon | Date | Résultat principal | Verbatims anonymisés |
|---|---|---|---|---|---|
| Spectateurs | | | | | |
| Participants | | | | | |
| Bénévoles | | | | | |
| Partenaires | | | | | |

<!-- Indiquer le taux de réponse et les limites de représentativité. Ne pas extrapoler un échantillon non représentatif. -->

## 10. Médias et contenus

| Indicateur | Cible | Réel | Source (statistiques de la plateforme, revue de presse) |
|---|---|---|---|
| | | | |

## 11. Partenaires : contreparties livrées

| Palier ({{#each sponsor_packages}}{{.id}} {{/each}}) | Partenaire | Contrepartie promise | Livrée (oui / non / partiellement) | Preuve (photo, statistique, capture) |
|---|---|---|---|---|
| | | | | |

## 12. Environnement

| Indicateur | Prévu | Réel | Méthode |
|---|---|---|---|
| Déchets (volume ou poids, part triée) | | | |
| Gobelets réutilisables restitués | | | |
| Mode de venue des publics (enquête) | | | |
| Matériel réemployé | | | |

## 13. Indicateurs de performance

| Id | Indicateur | Phase | Cible | Réel | Écart relatif | Source de la mesure |
|---|---|---|---|---|---|---|
{{#each kpis}}
| {{.id}} | {{.label}} | {{.phase}} | {{.target}} {{.unit}} | | | |
{{/each}}

## 14. Évaluation sur données réelles

<!-- Nouvelle évaluation de type "reelle" (schemas/evaluation.schema.json), evidence = donnees_reelles lorsque la note s'appuie sur une mesure. Comparer à l'évaluation prévisionnelle. -->

| Critère | Note prévisionnelle | Note réelle (0–5) | Justification et preuve |
|---|---|---|---|
| Originalité | {{evaluation.ratings.originalite.rating}} | | |
| Expérience utilisateur | {{evaluation.ratings.experience_utilisateur.rating}} | | |
| Faisabilité technique | {{evaluation.ratings.faisabilite_technique.rating}} | | |
| Viabilité économique | {{evaluation.ratings.viabilite_economique.rating}} | | |
| Potentiel médiatique | {{evaluation.ratings.potentiel_mediatique.rating}} | | |
| Reproductibilité | {{evaluation.ratings.reproductibilite.rating}} | | |
| Adaptabilité aux lieux | {{evaluation.ratings.adaptabilite_lieux.rating}} | | |
| Accessibilité et inclusion | {{evaluation.ratings.accessibilite_inclusion.rating}} | | |
| Potentiel commercial | {{evaluation.ratings.potentiel_commercial.rating}} | | |
| Responsabilité environnementale | {{evaluation.ratings.responsabilite_environnementale.rating}} | | |

## 15. Paramètres de modèle à recalibrer `[param]`

| Paramètre (docs/07) | Valeur utilisée | Valeur observée | Valeur proposée | Justification | Validé par (rôle, date) |
|---|---|---|---|---|---|
| Débit contrôle billet (pers/min/file) | | | | | |
| Débit buvette (pers/min/caisse) | | | | | |
| Taux de réalisation des recettes probables | | | | | |
| Dérive des coûts non devisés | | | | | |
| Marge de durée de compétition | | | | | |

## 16. Propositions pour la version suivante

<!-- La version suivante est une nouvelle version draft x.(y+1).0 avec parent = cette version, soumise à approbation (docs/02 §5). -->

| Proposition | Section du blueprint | Champ EventConfig concerné | Justification (renvoi à ce bilan) | Priorité |
|---|---|---|---|---|
| | | | | |

## 17. Sources des données réelles

| Donnée | Source | Date d'extraction | Responsable |
|---|---|---|---|
| Ventes et inscriptions | | | |
| Dépenses et recettes | | | |
| Comptages | | | |
| Questionnaires | | | |
