---
# Métadonnées hors schéma EventConfig (cf. docs/08-modeles-documentaires.md §6).
# Copier ce fichier en blueprints/<id>/blueprint.src.md, puis renseigner ce bloc.
meta:
  event_config: event.json          # chemin de l'EventConfig, relatif à ce fichier
  venue_file: ""                    # ex. ../../venues/<id>.json ; vide si lieu non retenu
  organizer: ""                     # structure porteuse : raison sociale + forme juridique
  contact_role: ""                  # fonction du contact (pas de nom dans un document diffusable)
  city: ""                          # ville (ou "à déterminer")
  event_date: ""                    # date de J, AAAA-MM-JJ, ou "à définir"
  confidentiality: "interne"        # interne | partenaires | public | licencie
  authors: []                       # rôles ou initiales des rédacteurs
---

<!--
MODE D'EMPLOI DU MODÈLE (à lire, ne pas supprimer : les commentaires HTML ne sont pas exportés)
- Spécification complète : docs/08-modeles-documentaires.md (§2 pour chaque section, §3 règles éditoriales, §5 contrôle qualité).
- {{chemin}} : champ résolu par build-blueprint depuis event.json (EventConfig), {{sim.*}} : sortie de simulation,
  {{meta.*}} : bloc ci-dessus, {{data.*}} : fichiers compagnons de data/, {{build.*}} : métadonnées de génération.
- Ne JAMAIS remplacer un champ {{…}} par une valeur tapée à la main : corriger event.json et régénérer.
- [À COMPLÉTER : …] : texte à rédiger. Aucune occurrence ne doit subsister pour le statut validated.
- Marqueurs de statut obligatoires pour tout chiffre ou fait rédigé : [FAIT S-xx] · [ESTIMATION] (base) · [HYPOTHÈSE H-nn].
- Exemples : uniquement dans des blocs titrés EXEMPLE FICTIF, à supprimer avant passage en review.
- Une section sans objet n'est pas supprimée : écrire « Non applicable — » suivi de la justification.
-->

# EVENT BLUEPRINT — {{identity.name}}

---

## 01. Page de couverture

<!--
Mode : auto. Source : identity, version, status, maturity, evaluation.computed, meta, build.
Qualité : version et statut = event.json ; filigrane = statut ; aucun champ non résolu.
Exports : PDF, DOCX, PPTX (diapositive titre).
-->

# {{identity.name}}

**{{identity.tagline}}**

| | |
|---|---|
| Version | {{version}} |
| Statut | {{status}} |
| Maturité | {{maturity}} |
| Variante appliquée | {{#if active_variant}}{{active_variant}}{{else}}Configuration de base{{/if}} |
| Structure porteuse | {{meta.organizer}} |
| Ville | {{meta.city}} |
| Lieu | {{#if venue.name}}{{venue.name}}{{else}}Lieu à déterminer{{/if}} |
| Date de J | {{meta.event_date}} |
| Confidentialité | {{meta.confidentiality}} |
| Verdict des portes éliminatoires | **{{evaluation.computed.verdict}}** |
| Généré le | {{build.date}} — {{build.id}} |

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

---

## 02. Résumé exécutif

<!--
Mode : semi-auto. Chiffres, portes et risques générés ; synthèse et décisions rédigées.
Qualité : 1 page A4 hors tableau des portes ; chiffres identiques aux sections 28-29 ; verdict affiché à côté du score.
Si une porte est "bloquant" : le générateur ajoute le bandeau « PROJET ÉLIMINÉ EN L'ÉTAT ». Si "a_verifier" : « SOUS RÉSERVE ».
Exports : PDF, DOCX, PPTX (pitch).
-->

### 2.1 Portes éliminatoires

| Porte | Statut | Motif | Action requise | Échéance |
|---|---|---|---|---|
| Sécurité | {{evaluation.gates.securite.status}} | {{evaluation.gates.securite.notes}} | [À COMPLÉTER : action] | [À COMPLÉTER : J-n] |
| Conformité réglementaire | {{evaluation.gates.conformite_reglementaire.status}} | {{evaluation.gates.conformite_reglementaire.notes}} | [À COMPLÉTER : action] | [À COMPLÉTER : J-n] |
| Risques critiques | {{evaluation.gates.risques_critiques.status}} | {{evaluation.gates.risques_critiques.notes}} | [À COMPLÉTER : action] | [À COMPLÉTER : J-n] |
| **Verdict** | **{{evaluation.computed.verdict}}** | — | — | — |

### 2.2 Le concept

{{identity.pitch}}

[À COMPLÉTER : trois phrases — ce que vivent les participants, ce que vivent les spectateurs, ce qui rend le format différent.]

### 2.3 Chiffres clés

| Indicateur | Prudent | Central | Ambitieux | Section |
|---|---|---|---|---|
| Participants ({{participants.unit}}) | {{participants.count.prudent}} | {{participants.count.central}} | {{participants.count.ambitieux}} | 10 |
| Spectateurs uniques | {{audience.attendance.prudent}} | {{audience.attendance.central}} | {{audience.attendance.ambitieux}} | 10 |
| Dépenses totales, contingence incluse | {{sim.finance.prudent.expenses_total\|eur}} | {{sim.finance.central.expenses_total\|eur}} | {{sim.finance.ambitieux.expenses_total\|eur}} | 28 |
| Recettes totales | {{sim.finance.prudent.revenues_total\|eur}} | {{sim.finance.central.revenues_total\|eur}} | {{sim.finance.ambitieux.revenues_total\|eur}} | 29 |
| **Résultat** | **{{sim.finance.prudent.result\|eur}}** | **{{sim.finance.central.result\|eur}}** | **{{sim.finance.ambitieux.result\|eur}}** | 29 |

| Indicateur | Valeur | Section |
|---|---|---|
| Durée de l'événement | {{format.duration_hours}} h | 11 |
| Seuil de rentabilité | {{sim.finance.breakeven_attendance}} spectateurs | 29 |
| Besoin de trésorerie (point bas à {{sim.finance.cash_low_day\|jrel}}) | {{sim.finance.cash_need\|eur}} | 29 |
| Recettes sécurisées / probables / hypothétiques (central) | {{sim.finance.revenues_by_certainty.secured\|eur}} / {{sim.finance.revenues_by_certainty.probable\|eur}} / {{sim.finance.revenues_by_certainty.hypothetical\|eur}} | 29 |
| Score | {{evaluation.computed.score}}/100 — grade {{evaluation.computed.grade}} | — |
| Indice de confiance | {{evaluation.computed.confidence}} | — |
| Type d'évaluation | {{evaluation.type}} | — |

### 2.4 Risques les plus critiques

| Risque | Criticité | Responsable | Plan |
|---|---|---|---|
{{#each sim.risks_top3}}
| {{.id}} — {{.description}} | {{.criticite}} ({{.classe}}) | {{.owner_role}} | Section 34 |
{{/each}}

### 2.5 Hypothèses structurantes

<!-- Choisir les trois hypothèses de hypotheses[] dont l'invalidation changerait la décision. Citer leur rang H-nn. -->

1. [À COMPLÉTER : H-nn — énoncé — conséquence si fausse — comment la vérifier]
2. [À COMPLÉTER]
3. [À COMPLÉTER]

### 2.6 Décisions attendues

| Décision | Décideur (rôle) | Échéance | Conséquence d'une absence de décision |
|---|---|---|---|
| | | | |

---

## 03. Nom et identité du concept

<!--
Mode : semi-auto. Source : identity.*. Antériorité rédigée.
Qualité : pitch ≤ 60 mots ; recherche d'antériorité datée et sourcée, sinon mention « non réalisée — interdit de diffusion publique et de licence ».
Exports : PDF, DOCX.
-->

| Élément | Contenu |
|---|---|
| Nom | {{identity.name}} |
| Accroche | {{identity.tagline}} |
| Pitch | {{identity.pitch}} |
| Disciplines | {{#if identity.disciplines}}{{identity.disciplines\|join}}{{else}}Sans discipline{{/if}} |
| Secteurs | {{identity.sectors\|join}} |
| Directions créatives | {{identity.directions\|join}} |
| Objectifs | {{identity.objectives\|join}} |

### 3.1 Signification du nom

[À COMPLÉTER : ce que le nom évoque, pourquoi il a été choisi, ce qu'il ne doit pas évoquer.]

### 3.2 Usages du nom

| Usage | Autorisé | Interdit |
|---|---|---|
| Nom d'une édition locale | [À COMPLÉTER : ex. « {{identity.name}} — Ville »] | |
| Abréviation | | |
| Traduction | | |

### 3.3 Recherche d'antériorité

<!-- Bases consultées, requêtes, date, résultat. Ne pas conclure à la disponibilité juridique : seul un conseil en propriété industrielle peut le faire. -->

| Base consultée | Requête | Date | Résultat | Source |
|---|---|---|---|---|
| | | | | |

---

## 04. Origine de l'idée

<!--
Mode : semi-auto. Source : parent, history[0], identity.inspirations[], format.building_blocks[].block_id, hypotheses[].
Qualité : chaque constat renvoie à W-…, E-…, S-… ou porte [HYPOTHÈSE H-nn].
Exports : PDF, DOCX.
-->

| Élément | Valeur |
|---|---|
| Version d'origine | {{history.0.version}} — {{history.0.date\|date}} |
| Lignée | {{#if parent}}{{parent.relation}} de {{parent.id}} v{{parent.version}}{{else}}Création originale{{/if}} |
| Briques mobilisées | {{#each format.building_blocks}}{{.block_id}} ({{.type}}) ; {{/each}} |

### 4.1 Brief d'entrée

| Paramètre du générateur (07 §2.1) | Valeur | Statut |
|---|---|---|
| Discipline | | |
| Objectif principal | | |
| Localisation | | |
| Infrastructure | | |
| Budget | | |
| Participants | | |
| Capacité | | |
| Durée | | |
| Public cible | | |
| Niveau d'innovation ν (1–5) | | |
| Ambition médiatique μ (1–5) | | |

### 4.2 Constats déclencheurs

| Constat | Preuve (W-, E-, S- ou H-) |
|---|---|
| | |

### 4.3 Directions étudiées

| Direction | Retenue | Raison |
|---|---|---|
| | | |

---

## 05. Étude de marché

<!--
Mode : manuel. Source : rédigé + sources[] + hypotheses[].
Qualité : 100 % des chiffres avec marqueur de statut ; chiffres qui conditionnent jauge ou budget appuyés sur une source A ou B, sinon hypothèse reprise en section 02 ; chaque donnée datée.
Interdit : tout chiffre de marché sans source.
Exports : PDF, DOCX.
-->

### 5.1 Périmètre

[À COMPLÉTER : zone de chalandise (communes, rayon ou temps de trajet) et justification.]

### 5.2 Offre existante

| Événement ou offre locale | Organisateur | Période | Public | Prix | Source |
|---|---|---|---|---|---|
| | | | | | |

### 5.3 Demande

| Donnée | Valeur | Statut | Date | Source |
|---|---|---|---|---|
| | | | | |

### 5.4 Prix pratiqués

| Offre comparable | Prix | Ce qui est inclus | Date | Source |
|---|---|---|---|---|
| | | | | |

### 5.5 Partenaires et financeurs potentiels

| Organisation | Type (collectivité, entreprise, fondation, fédération) | Intérêt supposé | Statut | Source |
|---|---|---|---|---|
| | | | | |

### 5.6 Conclusions

[À COMPLÉTER]

### 5.7 Zones d'ignorance

| Question non résolue | Impact sur la décision | Méthode pour lever le doute | Responsable | Échéance |
|---|---|---|---|---|
| | | | | |

---

## 06. Benchmark des événements existants

<!--
Mode : semi-auto. Source : fiches de veille knowledge/veille/… citées par identifiant W-… ; sources[].
Qualité : ≥ 5 comparables dont 2 de petite échelle [param] ; chaque ligne avec fiche W- ou source S- ; aucune cellule chiffrée sans statut.
Exports : PDF, DOCX, XLSX (onglet Benchmark).
-->

| Événement | Organisateur | Pays / ville | Format | Public | Modèle économique | Forces | Faiblesses | Logique reprise | Écueil évité | Fiche | Fiabilité |
|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | W- | |

### 6.1 Enseignements

[À COMPLÉTER : trois à cinq enseignements, chacun rattaché à une ou plusieurs lignes du tableau.]

---

## 07. Sources d'inspiration

<!--
Mode : auto. Source : identity.inspirations[] ; ip_note des briques.
Qualité : colonne « éléments non repris » non vide ; aucun logo ni visuel tiers dans le dossier.
Exports : PDF, DOCX.
-->

| Événement source | Secteur | Logique empruntée | Adaptation | Éléments non repris | Source |
|---|---|---|---|---|---|
{{#each identity.inspirations}}
| {{.source_event}} | {{.source_sector}} | {{.borrowed_logic}} | {{.adaptation}} | [À COMPLÉTER : nom, identité visuelle, signes protégés non repris] | {{.source_ref}} |
{{/each}}

> Règle : EVENT LAB emprunte des logiques, jamais des marques, identités visuelles ou éléments protégés.

---

## 08. Problématiques identifiées

<!--
Mode : manuel (description et gravité reprises du registre si un E-… est cité).
Qualité : chaque problématique a une réponse (section) et un KPI existant.
Exports : PDF, DOCX.
-->

| Problématique | Qui la subit | Preuve | Conséquence | Réponse du format (section) | KPI |
|---|---|---|---|---|---|
| | | E- / W- / S- | | | K- |

---

## 09. Proposition de valeur

<!--
Mode : semi-auto. Source : identity.audiences[].motivation, identity.objectives, kpis[].
Qualité : chaque bénéfice relié à un KPI ; aucun superlatif sans source.
Exports : PDF, DOCX, PPTX (sponsoring).
-->

| Partie prenante | Bénéfice | Alternative actuelle | Différence | Mesure (KPI) |
|---|---|---|---|---|
| Spectateur | | | | |
| Participant | | | | |
| Bénévole | | | | |
| Sponsor | | | | |
| Lieu / collectivité | | | | |
| Organisateur | | | | |

Motivations déclarées par segment :

| Segment | Rôle | Motivation |
|---|---|---|
{{#each identity.audiences}}
| {{.segment}} | {{.role}} | {{.motivation}} |
{{/each}}

---

## 10. Publics cibles

<!--
Mode : semi-auto. Source : identity.audiences[], audience.*, participants.*.
Qualité : Σ arrival_profile.share = 1 (± 0,01) ; 3 scénarios ; prudent ≤ central ≤ ambitieux ; chaque volume sourcé ou hypothèse.
Exports : PDF, DOCX, XLSX.
-->

### 10.1 Segments

| Segment | Rôle | Motivation | Consentement à payer |
|---|---|---|---|
{{#each identity.audiences}}
| {{.segment}} | {{.role}} | {{.motivation}} | {{.willingness_to_pay}} |
{{/each}}

### 10.2 Volumes

| | Prudent | Central | Ambitieux | Statut / source |
|---|---|---|---|---|
| Spectateurs uniques | {{audience.attendance.prudent}} | {{audience.attendance.central}} | {{audience.attendance.ambitieux}} | [À COMPLÉTER] |
| Participants ({{participants.unit}}) | {{participants.count.prudent}} | {{participants.count.central}} | {{participants.count.ambitieux}} | [À COMPLÉTER] |

| Paramètre | Valeur |
|---|---|
| Part payante | {{audience.paying_share\|pct}} |
| Taille d'équipe | {{participants.team_size}} |
| Catégories | {{participants.categories\|join}} |
| Durée moyenne de présence | {{audience.avg_dwell_min}} min |

### 10.3 Profil d'arrivée

| De (min après ouverture) | À | Part des arrivées |
|---|---|---|
{{#each audience.arrival_profile}}
| {{.from_min}} | {{.to_min}} | {{.share\|pct}} |
{{/each}}

### 10.4 Personas

<!-- Un persona par rôle principal : situation, attentes, freins, besoins d'accessibilité, canal d'information. Pas de photo de personne réelle. -->

[À COMPLÉTER]

### 10.5 Besoins d'accessibilité attendus

| Besoin | Public concerné | Réponse prévue (section) |
|---|---|---|
| | | |

---

## 11. Description exhaustive du format

<!--
Mode : semi-auto. Source : format.*, competition.stages[] ; déroulé rédigé.
Qualité : chaque brique rattachée à une séquence ou une mécanique ; aucune paire incompatible (07 §2.6).
Exports : PDF, DOCX.
-->

{{format.summary}}

| Paramètre | Valeur |
|---|---|
| Durée | {{format.duration_hours}} h |
| Cadence des éditions | {{format.edition_cadence}} |

### 11.1 Déroulé narratif

<!-- Raconter l'événement phase par phase, du point de vue d'un spectateur puis d'un participant. Renvoyer aux séquences P-… du programme. -->

[À COMPLÉTER]

### 11.2 Briques fonctionnelles

| Brique | Type | Libellé | Paramètres | Séquence ou mécanique qui la porte |
|---|---|---|---|---|
{{#each format.building_blocks}}
| {{.block_id}} | {{.type}} | {{.label}} | {{.parameters}} | [À COMPLÉTER : P-… ou mécanique] |
{{/each}}

### 11.3 Étapes de compétition

| Étape | Type | Entrants | Poules | Créneau (min) | Changement (min) | Unités parallèles | Qualifiés |
|---|---|---|---|---|---|---|---|
{{#each competition.stages}}
| {{.id}} — {{.label}} | {{.type}} | {{.entrants}} | {{.groups}} | {{.slot_duration_min}} | {{.changeover_min}} | {{.parallel_units}} | {{.advance}} |
{{/each}}

### 11.4 Variantes de configuration

<!-- variants[] : surcharges de budget, recettes et audience. Décrire ici ce qui change dans le format lui-même (le programme est commun à toutes les variantes, cf. docs/08 §6). Attendu au minimum : économique, premium, capacité maximale autorisée, secours. -->

| Variante | Libellé | Description | Ce qui change dans le format |
|---|---|---|---|
| base | Configuration de base | — | — |
{{#each variants}}
| {{.id}} | {{.label}} | {{.description}} | [À COMPLÉTER] |
{{/each}}

### 11.5 Éléments distinctifs

[À COMPLÉTER]

---

## 12. Règles et mécaniques

<!--
Mode : semi-auto. Source : format.rules_summary, competition.stages[], gamification[], briques regles/qualification/recompenses/mecanique_jeu ; règlement complet dans annexes/reglement.md.
Qualité : départage par étape ; fairness_note par mécanique ; test de compréhension consigné ; conditions médicales conformes au règlement fédéral (à vérifier).
Exports : PDF, DOCX ; règlement PDF séparé.
-->

### 12.1 Les règles en deux minutes (version publique)

{{format.rules_summary}}

### 12.2 Règlement complet

Voir `annexes/reglement.md`. Rubriques obligatoires :

| Rubrique | Article du règlement | Statut |
|---|---|---|
| Éligibilité et catégories | | |
| Inscription et pièces à fournir | | |
| Conditions médicales (licence, certificat ou questionnaire selon la fédération — à vérifier) | | |
| Déroulement par étape | | |
| Système de points | | |
| Départage | | |
| Sanctions | | |
| Réclamations | | |
| Forfaits et remplacements | | |
| Arbitrage | | |
| Sécurité des participants | | |
| Droit à l'image et données personnelles | | |

### 12.3 Départage par étape

| Étape | Critère 1 | Critère 2 | Critère 3 |
|---|---|---|---|
{{#each competition.stages}}
| {{.id}} — {{.label}} | | | |
{{/each}}

### 12.4 Mécaniques de participation

| Mécanique | Rôle visé | Description | Note d'équité |
|---|---|---|---|
{{#each gamification}}
| {{.mechanic}} | {{.target_role}} | {{.description}} | {{.fairness_note}} |
{{/each}}

### 12.5 Test de compréhension

| Date | Nombre de personnes extérieures | Temps moyen de lecture | Erreurs de compréhension relevées | Correction apportée |
|---|---|---|---|---|
| | | | | |

---

## 13. Programme détaillé

<!--
Mode : auto. Source : program[] hors montage/démontage, sim.competition, sim.program.
Qualité : C1 satisfait ; aucune séquence sans espace ; aucun chevauchement non justifié dans un même espace.
Exports : PDF, DOCX, XLSX, CSV.
-->

| Début | Fin | Durée | Séquence | Type | Espace | Critique |
|---|---|---|---|---|---|---|
{{#each sim.program_lines where .kind not in [montage,demontage]}}
| {{.start_min\|hhmm}} | {{.end_min\|hhmm}} | {{.duration_min}} min | {{.id}} — {{.label}} | {{.kind}} | {{.space}} | {{.critical\|yesno}} |
{{/each}}

| Contrôle | Valeur |
|---|---|
| Première séquence | {{sim.program.first_min\|hhmm}} |
| Dernière séquence (fin) | {{sim.program.last_min\|hhmm}} |
| Amplitude | {{sim.program.span_min}} min (durée prévue : {{format.duration_hours}} h) |
| Durée simulée de la compétition (marge incluse) | {{sim.competition.total_min}} min |

| Étape | Durée simulée | Fin simulée | Occupation des unités | Attente moyenne d'un participant |
|---|---|---|---|---|
{{#each sim.competition.stages}}
| {{.id}} | {{.duration_min}} min | {{.end_min\|hhmm}} | {{.occupancy_rate\|pct}} | {{.avg_wait_min}} min |
{{/each}}

### 13.1 Programme public simplifié

[À COMPLÉTER : version affichable, 6 à 10 lignes maximum.]

---

## 14. Parcours utilisateurs

<!--
Mode : manuel (attente simulée insérée automatiquement).
Qualité : 7 rôles couverts ou exclus avec justification ; chaque friction a une réponse et un responsable ; attente max simulée ≤ cible.
Un tableau par rôle : spectateur, participant, bénévole, sponsor, journaliste, prestataire, VIP.
Exports : PDF, DOCX.
-->

Attente maximale simulée à l'entrée : **{{sim.flow.max_wait_min}} min** avec {{sim.flow.lanes_required}} file(s) — simulation indicative de dimensionnement, ne remplace pas l'avis du chargé de sécurité.

### 14.1 Spectateur

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| Découverte | avant | | | | | | | |
| Billetterie | avant | | | | | | | |
| Arrivée et accueil | pendant | | | | | | | |
| Orientation | pendant | | | | | | | |
| Spectacle | pendant | | | | | | | |
| Restauration | pendant | | | | | | | |
| Départ | pendant | | | | | | | |
| Souvenirs et résultats | après | | | | | | | |

### 14.2 Participant

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| Inscription | avant | | | | | | | |
| Préparation | avant | | | | | | | |
| Accréditation | pendant | | | | | | | |
| Échauffement | pendant | | | | | | | |
| Compétition | pendant | | | | | | | |
| Récompenses | pendant | | | | | | | |
| Résultats et contenus | après | | | | | | | |

### 14.3 Bénévole

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

### 14.4 Sponsor

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

### 14.5 Journaliste

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

### 14.6 Prestataire

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

### 14.7 Invité VIP

| Étape | Phase | Point de contact | Action | Attente | Friction potentielle | Réponse | Responsable | KPI |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

### 14.8 Temps morts estimés

| Rôle | Temps de présence | Temps sans activité ni spectacle | Part | Mesure corrective |
|---|---|---|---|---|
| | | | | |

---

## 15. Identité visuelle

<!--
Mode : manuel. Fichiers dans visuels/.
Qualité : fichiers sources éditables fournis ; droits documentés par élément ; aucune ressemblance volontaire avec une identité tierce.
Exports : PDF ; SVG et PNG séparés.
-->

### 15.1 Concept graphique

[À COMPLÉTER]

### 15.2 Éléments

| Élément | Description | Fichier | Auteur | Droits (création interne, cession, licence) |
|---|---|---|---|---|
| Motif | | visuels/ | | |
| Iconographie | | visuels/ | | |
| Style photo | | — | | |

### 15.3 Règles d'usage et interdits

| Autorisé | Interdit |
|---|---|
| | |

### 15.4 Exemples d'application

| Support | Fichier gabarit | Format |
|---|---|---|
| Affiche | | |
| Publication réseau social (carré, vertical) | | |
| Signalétique | | |
| Dossard ou tenue | | |

---

## 16. Logo et déclinaisons

<!--
Mode : manuel. Fichiers dans visuels/logo/.
Qualité : SVG + PNG par déclinaison ; lisibilité vérifiée à taille minimale ; propriété des droits documentée.
Exports : SVG, PNG, PDF.
-->

| Déclinaison | Fichier SVG | Fichier PNG | Fonds autorisés | Taille minimale |
|---|---|---|---|---|
| Principale | visuels/logo/ | visuels/logo/ | | |
| Horizontale | | | | |
| Verticale | | | | |
| Monochrome | | | | |
| Négatif | | | | |
| Avatar / favicon | | | | |

| Règle | Valeur |
|---|---|
| Zone de protection | [À COMPLÉTER : ex. hauteur de la lettre X] |
| Propriété des droits | [À COMPLÉTER : auteur, contrat de cession] |

Interdits : [À COMPLÉTER : déformation, recoloration, ombres, fonds chargés…]

---

## 17. Moodboard

<!--
Mode : manuel. Fichiers dans visuels/moodboard/.
Qualité : crédit et statut de droits par image ; aucune image sous droits dans un export destiné à des tiers (mention « usage interne »).
Exports : PDF (interne).
-->

| Image | Intention | Crédit | Droits | Diffusion |
|---|---|---|---|---|
| visuels/moodboard/ | | | | interne / externe |

---

## 18. Palette chromatique et typographies

<!--
Mode : manuel. Fichier visuels/palette.svg.
Qualité : contrastes WCAG 2.1 AA mesurés (4,5:1 texte courant ; 3:1 grand texte) ; licence de chaque police compatible avec la diffusion aux licenciés.
Exports : PDF, DOCX, SVG.
-->

### 18.1 Couleurs

| Nom | HEX | RVB | CMJN | Usage |
|---|---|---|---|---|
| | | | | |

### 18.2 Couples texte / fond autorisés

| Texte | Fond | Ratio de contraste mesuré | Conforme AA texte courant | Outil de mesure |
|---|---|---|---|---|
| | | | | |

### 18.3 Typographies

| Famille | Graisses | Usage | Licence | Redistribuable aux licenciés | Alternative libre |
|---|---|---|---|---|---|
| | | | | | |

---

## 19. Signalétique

<!--
Mode : semi-auto. Liste des espaces et accès générée ; messages rédigés.
Qualité : ≥ 1 panneau par espace public et par accès ; signalétique de sécurité du lieu ni masquée ni remplacée.
Exports : PDF, XLSX.
-->

Espaces et accès à signaler (générés) :

| Espace ou accès | Type | Libellé |
|---|---|---|
{{#each venue_requirements.spaces}}
| {{.id}} | {{.type}} | {{.label}} |
{{/each}}
{{#each venue.access_points}}
| {{.id}} | {{.kind}} | — |
{{/each}}

Plan de signalétique :

| Id | Type (directionnel, information, règles, sécurité, partenaire) | Espace | Message exact | Format | Support | Qté | Accessibilité (pictogramme, contraste, hauteur) | Fixation | Pose / dépose |
|---|---|---|---|---|---|---|---|---|---|
| SIG-01 | | | | | | | | | |

---

## 20. Scénographie

<!--
Mode : semi-auto. Source : media.photo_spots, media.viral_moments, briques scenographie/son_lumiere/mise_en_scene, resources.equipment[], venue.constraints.floor_protection.
Qualité : chaque élément rattaché à une ligne de matériel (et à une dépense si payant) ; chaque moment viral rattaché à une séquence.
Exports : PDF, DOCX, SVG.
-->

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

### 20.1 Intentions par espace

| Espace | Intention | Ambiance (renvoi moodboard) |
|---|---|---|
{{#each venue_requirements.spaces}}
| {{.id}} — {{.label}} | | |
{{/each}}

### 20.2 Éléments scénographiques

| Élément | Espace | Fiche technique (dimensions, poids, alimentation) | Ligne de matériel | Réaction au feu des matériaux | Contraintes (accroche, sol) |
|---|---|---|---|---|---|
| | | | | à vérifier avec l'exploitant et le chargé de sécurité | |

Protection des sols exigée par le lieu : {{venue.constraints.floor_protection}}

### 20.3 Moments forts et spots photo

| Moment viral | Séquence du programme | Mise en scène | Format vertical prévu |
|---|---|---|---|
{{#each media.viral_moments}}
| {{.}} | [À COMPLÉTER : P-…] | | |
{{/each}}

| Spot photo | Espace | Angle de prise de vue | Lumière |
|---|---|---|---|
{{#each media.photo_spots}}
| {{.}} | | | |
{{/each}}

---

## 21. Plans d'implantation

<!--
Mode : semi-auto (SVG généré depuis venue.spaces[] x_m/y_m si présents ; sinon plan dessiné).
Qualité : échelle et cotes ; Σ surfaces ≤ surface du lieu ; accès et issues déclarés par l'exploitant reportés et non obstrués ; avertissement sur chaque plan ; configuration sans données = « non produite ».
Exports : SVG, PDF.
-->

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

<!-- Un plan par variante de variants[] + la configuration de base. Configurations attendues : économique, standard, premium, capacité maximale autorisée, secours. Variante sans données suffisantes : statut « non produite ». -->

| Configuration | Fichier | Présence simultanée max. (central) | Statut |
|---|---|---|---|
| Base | visuels/plans/base.svg | {{sim.peak_presence.central}} | |
{{#each sim.variants}}
| {{.id}} — {{.label}} | visuels/plans/{{.id}}.svg | {{.peak_presence}} | |
{{/each}}

### 21.1 Lieu

| Élément | Valeur |
|---|---|
| Lieu | {{venue.name}} ({{venue.type}}) — {{venue.city}} |
| Cadre | {{venue.setting}} |
| Dimensions | {{venue.dimensions.width_m}} m × {{venue.dimensions.length_m}} m × {{venue.dimensions.height_m}} m (h) |

### 21.2 Espaces

| Espace | Type | Dimensions (m) | Surface (m²) | Capacité | Position (x ; y) | Fixe |
|---|---|---|---|---|---|---|
{{#each venue.spaces}}
| {{.id}} — {{.label}} | {{.type}} | {{.width_m}} × {{.length_m}} | {{.area_m2}} | {{.capacity}} | {{.x_m}} ; {{.y_m}} | {{.fixed\|yesno}} |
{{/each}}

### 21.3 Accès

| Accès | Type | Largeur (m) | Unités de passage déclarées | Position (x ; y) |
|---|---|---|---|---|
{{#each venue.access_points}}
| {{.id}} | {{.kind}} | {{.width_m}} | {{.unites_de_passage}} | {{.x_m}} ; {{.y_m}} |
{{/each}}

### 21.4 Alertes de densité (indicatives)

{{#each sim.flow.density_alerts}}
- {{.}}
{{/each}}

---

## 22. Maquettes digitales

<!--
Mode : manuel. Fichiers dans visuels/maquettes/.
Qualité : chaque écran indique outil et statut (opérationnel / simulé / externe requis) ; finalité et consentement de chaque donnée collectée (règles à vérifier auprès de la CNIL) ; procédure dégradée liée à la section 34.
Exports : PDF, PNG.
-->

| Écran ou support | Fichier | Contenu | Données collectées et finalité | Outil retenu | Statut | Procédure dégradée |
|---|---|---|---|---|---|---|
| Page événement | | | | | | |
| Inscription participants | | | | | | |
| Billetterie | | | | | | |
| Résultats en direct | | | | | | |
| Écran sur site | | | | | | |
| Formats réseaux sociaux | | | | | | |

Briques digitales du format :

{{#each format.building_blocks where .type=experience_digitale}}
- {{.label}}
{{/each}}

---

## 23. Besoins matériels

<!--
Mode : auto. Source : resources.equipment[], venue.utilities.power_kw_available, venue_requirements.power_kw.
Qualité : C2 et C8 satisfaits ; chaque article d'une séquence critique a une solution de secours (colonne notes).
Exports : PDF, XLSX, CSV.
-->

| Article | Qté | Provenance | Coût unitaire | Coût total | Puissance unitaire (W) | Puissance totale (kW) | Notes / secours |
|---|---|---|---|---|---|---|---|
{{#each sim.equipment_lines}}
| {{.item}} | {{.qty}} | {{.source}} | {{.unit_cost\|eur}} | {{.total_cost\|eur}} | {{.power_w}} | {{.total_power_kw}} | {{.notes}} |
{{/each}}

| Contrôle énergie | Valeur |
|---|---|
| Puissance totale appelée | {{sim.power_kw_total}} kW |
| Puissance disponible déclarée par le lieu | {{venue.utilities.power_kw_available}} kW |
| Puissance requise (exigence du format) | {{venue_requirements.power_kw}} kW |
| Prises disponibles | {{venue.utilities.power_outlets}} |

---

## 24. Ressources humaines

<!--
Mode : semi-auto. Source : resources.staff[], sim.staff.required[], program[].owner_role ; fiches dans annexes/fiches-poste/.
Qualité : C7 (chaque owner_role existe) ; effectifs ≥ besoins simulés ; une fiche de poste par rôle.
Sécurité et secours : dimensionnement EXTERNE (référentiel DPS, prestataire ou association agréée) — jamais calculé par l'outil.
Exports : PDF, DOCX, XLSX.
-->

| Rôle | Effectif | Besoin simulé | Statut | Heures / pers. | Heures totales | Coût horaire | Coût total | Note de ratio |
|---|---|---|---|---|---|---|---|---|
{{#each sim.staff_lines}}
| {{.role}} | {{.count}} | {{.required}} | {{.status}} | {{.hours}} | {{.total_hours}} | {{.cost_per_hour\|eur}} | {{.total_cost\|eur}} | {{.ratio_note}} |
{{/each}}

### 24.1 Organigramme de J

[À COMPLÉTER : schéma hiérarchique et fonctionnel ; un responsable de permanence identifié à chaque heure.]

### 24.2 Planning de présence

| Rôle | Arrivée | Briefing | Pause | Départ |
|---|---|---|---|---|
| | | | | |

### 24.3 Fiches de poste

| Rôle | Fichier | Validée |
|---|---|---|
{{#each resources.staff}}
| {{.role}} | annexes/fiches-poste/ | |
{{/each}}

---

## 25. Organisation logistique

<!--
Mode : semi-auto. Source : venue.constraints, program[kind ∈ {montage, demontage}], resources.equipment[], sim.setup.
Qualité : sim.setup.min_duration_min ≤ fenêtre de montage ; chaque livraison a un créneau et un réceptionnaire.
Exports : PDF, XLSX.
-->

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

| Contrainte du lieu | Valeur |
|---|---|
| Horaires d'exploitation | {{venue.constraints.opening_hours}} |
| Fenêtre de montage | {{venue.constraints.setup_window}} |
| Fenêtre de démontage | {{venue.constraints.teardown_window}} |
| Limites sonores | {{venue.constraints.noise_limits}} |
| Exposition météo | {{venue.constraints.weather_exposure}} |
| Stockage disponible | {{venue.utilities.storage_m2}} m² |
| Points d'eau | {{venue.utilities.water_points}} |
| Internet | {{venue.utilities.internet}} |

### 25.1 Montage et démontage

| Début | Fin | Tâche | Espace | Responsable | Dépend de |
|---|---|---|---|---|---|
{{#each sim.program_lines where .kind in [montage,demontage]}}
| {{.start_min\|hhmm}} | {{.end_min\|hhmm}} | {{.id}} — {{.label}} | {{.space}} | {{.owner_role}} | {{.depends_on\|join}} |
{{/each}}

Durée minimale de montage (chemin critique) : **{{sim.setup.min_duration_min}} min**. Tâches critiques : {{sim.setup.critical_tasks\|join}}.

### 25.2 Livraisons et enlèvements

| Quoi | Fournisseur | Livraison (J-n, heure) | Enlèvement | Accès | Réceptionnaire (rôle) |
|---|---|---|---|---|---|
{{#each resources.equipment where .source in [location,achat,pret_partenaire,sponsor]}}
| {{.item}} ({{.qty}}) | {{.source}} | | | | |
{{/each}}

### 25.3 Autres flux

| Sujet | Organisation | Responsable |
|---|---|---|
| Transports (matériel, équipes, participants) | | |
| Restauration des équipes | | |
| Déchets et tri | | |
| Clés, badges et accès | | |
| Inventaire de retour | | |

---

## 26. Rétroplanning

<!--
Mode : semi-auto. Source : milestones[] + colonnes de suivi de data/retroplanning.csv + échéances générées [auto] depuis compliance[].deadline_offset_days, budget.expenses[].pay_offset_days, budget.revenues[].cash_offset_days.
Points de contrôle détaillés : templates/checklists/checklist-J-120-a-J-1.md.
Qualité : C5 ; ≥ 2 points go/no-go (financier, réglementaire) avec critère vérifiable ; aucun jalon sans responsable.
Exports : XLSX, CSV, PDF (Gantt), ICS (V1).
-->

<!-- sim.milestone_lines[] = milestones[] (event.json) + colonnes de suivi dependances/statut de data/retroplanning.csv (clé : label) + échéances [auto]. -->

| Échéance | Jalon | Responsable | Livrable | Dépendances | Statut | Critère go/no-go |
|---|---|---|---|---|---|---|
{{#each sim.milestone_lines}}
| {{.offset_days\|jrel}} | {{.label}} | {{.owner_role}} | {{.deliverable}} | {{.dependances}} | {{.statut}} | {{.go_no_go}} |
{{/each}}

Échéances réglementaires [auto] :

| Échéance | Point de conformité | Autorité | Obligatoire | Statut |
|---|---|---|---|---|
{{#each compliance}}
| {{.deadline_offset_days\|jrel}} | {{.id}} — {{.item}} | {{.authority}} | {{.mandatory\|yesno}} | {{.status}} |
{{/each}}

Décaissements et encaissements [auto] :

| Jour | Mouvement | Montant | Solde cumulé |
|---|---|---|---|
{{#each sim.finance.cashflow}}
| {{.day\|jrel}} | {{.label}} | {{.amount\|eur}} | {{.balance\|eur}} |
{{/each}}

---

## 27. Conducteur événementiel minute par minute

<!--
Mode : auto. Source : program[] (toutes séquences, montage et démontage compris). Tops répartis par préfixe SON: / LUM: / VID: / MIC: (docs/08 §4.5).
Colonnes intervenants et notes : complétées dans data/conducteur.csv après génération.
Qualité : aucun intervalle sans séquence (transitions nommées) ; chaque séquence critique a un responsable et un plan de continuité ; fin ≤ fenêtre d'exploitation.
Contacts radio/téléphone : annexe à diffusion restreinte.
Exports : XLSX, CSV, PDF paysage.
-->

| Début | Fin | Durée | Séquence | Espace | Responsable | Intervenants | Son | Lumière | Vidéo | Micro | Notes | Critique |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
{{#each sim.program_lines}}
| {{.start_min\|hhmm}} | {{.end_min\|hhmm}} | {{.duration_min}} | {{.id}} — {{.label}} | {{.space}} | {{.owner_role}} | | {{.cues_son}} | {{.cues_lum}} | {{.cues_vid}} | {{.cues_mic}} | {{.cues_other}} | {{.critical\|yesno}} |
{{/each}}

---

## 28. Budget prévisionnel

<!--
Mode : auto. Source : budget.*, scenarios.*.cost_overrun, sim.finance.
Qualité : certitude sur chaque ligne ; chaque ligne "devis" a un source_ref ; contingence séparée ; totaux XLSX = totaux PDF.
Montants {{budget.currency}}, TTC sauf mention contraire (traitement HT/TTC à confirmer par l'expert-comptable de la structure).
Exports : XLSX (formules vivantes + onglet Paramètres), PDF, CSV.
-->

| Paramètre | Valeur |
|---|---|
| Devise | {{budget.currency}} |
| Taux de contingence | {{budget.contingency_rate\|pct}} |
| Dérive des coûts non devisés — prudent / central / ambitieux | {{scenarios.prudent.cost_overrun\|pct}} / {{scenarios.central.cost_overrun\|pct}} / {{scenarios.ambitieux.cost_overrun\|pct}} |

### 28.1 Détail des dépenses

| Id | Catégorie | Libellé | Base | Montant unitaire | Prudent | Central | Ambitieux | Certitude | Optionnel | Priorité | Décaissement | Source |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
{{#each sim.finance.expense_lines}}
| {{.id}} | {{.category}} | {{.label}} | {{.basis}} | {{.amount\|eur}} | {{.total_prudent\|eur}} | {{.total_central\|eur}} | {{.total_ambitieux\|eur}} | {{.certainty}} | {{.optional\|yesno}} | {{.priority}} | {{.pay_offset_days\|jrel}} | {{.source_ref}} |
{{/each}}

### 28.2 Synthèse par catégorie

| Catégorie | Prudent | Central | Ambitieux |
|---|---|---|---|
{{#each sim.finance.by_category}}
| {{.category}} | {{.total_prudent\|eur}} | {{.total_central\|eur}} | {{.total_ambitieux\|eur}} |
{{/each}}
| Contingence | {{sim.finance.prudent.contingency\|eur}} | {{sim.finance.central.contingency\|eur}} | {{sim.finance.ambitieux.contingency\|eur}} |
| **Total dépenses** | **{{sim.finance.prudent.expenses_total\|eur}}** | **{{sim.finance.central.expenses_total\|eur}}** | **{{sim.finance.ambitieux.expenses_total\|eur}}** |

### 28.3 Ordre de réduction en cas de baisse de budget

<!-- Généré par 07 §8 : postes optionnels d'abord, puis priorité 3, puis 2. Commenter l'impact sur l'expérience et sur la note. -->

[À COMPLÉTER : impact de la suppression des postes optionnels et de priorité 3.]

---

## 29. Modèle économique

<!--
Mode : semi-auto. Source : budget.revenues[], scenarios.*.realization, audience.paying_share, sim.finance ; politique tarifaire rédigée.
Qualité : 3 scénarios ; recettes en 3 colonnes de certitude ; aucune subvention encaissée avant J sans pièce ; paramètres de calcul affichés.
Exports : XLSX, PDF, PPTX.
-->

### 29.1 Recettes

| Id | Flux | Libellé | Montant unitaire | Base | Marge | Certitude | Prudent | Central | Ambitieux | Encaissement |
|---|---|---|---|---|---|---|---|---|---|---|
{{#each sim.finance.revenue_lines}}
| {{.id}} | {{.stream}} | {{.label}} | {{.unit_amount\|eur}} | {{.basis}} | {{.margin_rate\|pct}} | {{.certainty}} | {{.total_prudent\|eur}} | {{.total_central\|eur}} | {{.total_ambitieux\|eur}} | {{.cash_offset_days\|jrel}} |
{{/each}}

| Recettes (scénario central) | Sécurisées | Probables | Hypothétiques |
|---|---|---|---|
| Montant | {{sim.finance.revenues_by_certainty.secured\|eur}} | {{sim.finance.revenues_by_certainty.probable\|eur}} | {{sim.finance.revenues_by_certainty.hypothetical\|eur}} |

### 29.2 Taux de réalisation appliqués `[param]`

| Certitude | Prudent | Central | Ambitieux |
|---|---|---|---|
| Sécurisée | {{scenarios.prudent.realization.secured\|pct}} | {{scenarios.central.realization.secured\|pct}} | {{scenarios.ambitieux.realization.secured\|pct}} |
| Probable | {{scenarios.prudent.realization.probable\|pct}} | {{scenarios.central.realization.probable\|pct}} | {{scenarios.ambitieux.realization.probable\|pct}} |
| Hypothétique | {{scenarios.prudent.realization.hypothetical\|pct}} | {{scenarios.central.realization.hypothetical\|pct}} | {{scenarios.ambitieux.realization.hypothetical\|pct}} |

### 29.3 Résultats

| | Prudent | Central | Ambitieux |
|---|---|---|---|
| Recettes | {{sim.finance.prudent.revenues_total\|eur}} | {{sim.finance.central.revenues_total\|eur}} | {{sim.finance.ambitieux.revenues_total\|eur}} |
| Dépenses (contingence incluse) | {{sim.finance.prudent.expenses_total\|eur}} | {{sim.finance.central.expenses_total\|eur}} | {{sim.finance.ambitieux.expenses_total\|eur}} |
| **Résultat** | **{{sim.finance.prudent.result\|eur}}** | **{{sim.finance.central.result\|eur}}** | **{{sim.finance.ambitieux.result\|eur}}** |

| Indicateur | Valeur |
|---|---|
| Seuil de rentabilité | {{sim.finance.breakeven_attendance}} spectateurs (part payante {{audience.paying_share\|pct}}) |
| Besoin de trésorerie | {{sim.finance.cash_need\|eur}} au plus bas à {{sim.finance.cash_low_day\|jrel}} |
| Financement du besoin de trésorerie | [À COMPLÉTER : fonds propres, avance, subvention versée avant J — C9] |

### 29.4 Résultat par variante de configuration (scénario central)

| Variante | Dépenses | Recettes | Résultat |
|---|---|---|---|
| Base | {{sim.finance.central.expenses_total\|eur}} | {{sim.finance.central.revenues_total\|eur}} | {{sim.finance.central.result\|eur}} |
{{#each sim.variants}}
| {{.id}} — {{.label}} | {{.expenses_total\|eur}} | {{.revenues_total\|eur}} | {{.result\|eur}} |
{{/each}}

### 29.5 Sensibilité (scénario central)

| Facteur | Variation | Δ résultat | Élasticité |
|---|---|---|---|
{{#each sim.finance.sensitivity}}
| {{.factor}} | | {{.delta_result\|eur}} | {{.elasticity}} |
{{/each}}

### 29.6 Politique tarifaire et billetterie

| Tarif | Public | Prix | Justification (consentement à payer, comparables S-…) | Quota |
|---|---|---|---|---|
| | | | | |

[À COMPLÉTER : ouverture des ventes, paliers, tarifs réduits et solidaires, gratuité, outil de billetterie et ses frais (à vérifier auprès du fournisseur).]

### 29.7 Licence et duplication

[À COMPLÉTER : ce qui est licenciable (renvoi section 37), conditions de duplication (renvoi section 38).]

---

## 30. Stratégie de communication

<!--
Mode : semi-auto. Source : media.channels, media.viral_moments, media.photo_spots, kpis[phase=avant].
Qualité : chaque moment viral rattaché à une séquence ; chaque publication a un responsable ; ≥ 1 KPI de communication par phase.
Ne jamais sacrifier l'expérience réelle à la visibilité (brief §11).
Exports : PDF, DOCX, XLSX (calendrier).
-->

| Élément | Contenu |
|---|---|
| Canaux | {{media.channels\|join}} |
| Objectifs | [À COMPLÉTER] |
| Cibles | [À COMPLÉTER] |
| Messages clés | [À COMPLÉTER] |

### 30.1 Calendrier éditorial

| Échéance | Phase | Canal | Format (vertical, carré, article, newsletter) | Contenu | Responsable | KPI |
|---|---|---|---|---|---|---|
| J- | avant | | | | | |
| J | pendant | | | | | |
| J+ | après | | | | | |

### 30.2 Contenus générés par les participants

| Mécanique | Règle de participation | Consentement (image, données) | Modération |
|---|---|---|---|
| | | | |

### 30.3 Relations presse

| Média | Angle | Échéance | Responsable |
|---|---|---|---|
| | | | |

### 30.4 Indicateurs de communication

| KPI | Cible | Mesure |
|---|---|---|
{{#each kpis where .phase=avant}}
| {{.id}} — {{.label}} | {{.target}} {{.unit}} | {{.measure}} |
{{/each}}

---

## 31. Dossier de sponsoring

<!--
Mode : semi-auto. Dossier complet : PPTX généré depuis templates/dossier-sponsoring.md.
Source : sponsor_packages[], budget.revenues[stream=sponsoring], briques activation_partenaire, identity.audiences[role=sponsor], audience.attendance.prudent, media.*, kpis[], resources.equipment[source=sponsor].
Qualité : C3 ; audiences annoncées = scénario prudent ou scénario étiqueté ; aucun logo de partenaire non signé.
Exports : PPTX, PDF.
-->

### 31.1 Offres

<!-- sponsor_packages[] : contreparties mesurables (nombre, durée, emplacement). price × quantity doit égaler unit_amount de la ligne de recettes liée (C3). -->

| Id | Palier | Prix | Quantité | Exclusivité | Contreparties | Ligne de recettes liée |
|---|---|---|---|---|---|---|
{{#each sponsor_packages}}
| {{.id}} | {{.name}} | {{.price\|eur}} | {{.quantity}} | {{.exclusivity}} | {{.counterparts\|join}} | {{.revenue_ref}} |
{{/each}}

| Activation proposée | Palier | Espace | Séquence | Coût pour l'organisateur |
|---|---|---|---|---|
| | | | | |

### 31.2 Recettes de sponsoring prévues

| Id | Libellé | Montant | Certitude | Encaissement |
|---|---|---|---|---|
{{#each budget.revenues where .stream=sponsoring}}
| {{.id}} | {{.label}} | {{.unit_amount\|eur}} | {{.certainty}} | {{.cash_offset_days\|jrel}} |
{{/each}}

### 31.3 Apports en nature

| Article | Qté | Valorisation | Traitement (valorisé en recette et dépense, ou non valorisé) |
|---|---|---|---|
{{#each resources.equipment where .source=sponsor}}
| {{.item}} | {{.qty}} | | |
{{/each}}

### 31.4 Audience annoncée aux partenaires

Spectateurs uniques, scénario prudent : **{{audience.attendance.prudent}}** — statut : [À COMPLÉTER : FAIT / ESTIMATION / HYPOTHÈSE].

### 31.5 Pipeline de démarchage

| Partenaire ciblé | Secteur | Palier visé | État (sécurisé, probable, hypothétique) | Prochaine action | Échéance | Responsable |
|---|---|---|---|---|---|---|
| | | | | | | |

---

## 32. Plan de sécurité et d'accessibilité prévisionnel

<!--
Mode : semi-auto. Source : venue.erp, venue.access_points[], venue_requirements.spaces[], compliance[], risks[category ∈ {securite, sante}], sim.peak_presence, resources.staff[].
Liste des démarches à vérifier et sources officielles : templates/checklists/checklist-securite-accessibilite.md.
Qualité : avertissement présent ; chaque point obligatoire avec autorité, statut, échéance, source ; aucun dimensionnement de sécurité ou de secours calculé par l'outil ; C4.
Exports : PDF, DOCX.
-->

> **IMPLANTATION NON VALIDÉE RÉGLEMENTAIREMENT.** Ce document est une aide à la conception produite à partir de données déclaratives. Il ne vaut ni autorisation, ni avis de sécurité, ni validation technique. L'effectif admissible, l'implantation définitive, les dégagements, le dispositif de sécurité et de secours relèvent de l'exploitant du lieu, du chargé de sécurité, des prestataires agréés et des autorités compétentes (mairie, préfecture, commission de sécurité).

### 32.1 Données du lieu (déclarées par l'exploitant)

| Élément | Valeur |
|---|---|
| Type ERP | {{venue.erp.type_erp}} |
| Catégorie | {{venue.erp.categorie}} |
| Effectif autorisé | {{venue.erp.effectif_autorise}} |
| Document de référence | {{venue.erp.document_ref}} |

### 32.2 Présence simultanée prévue

| | Prudent | Central | Ambitieux |
|---|---|---|---|
| Présence simultanée maximale (public + participants + personnel) | {{sim.peak_presence.prudent}} | {{sim.peak_presence.central}} | {{sim.peak_presence.ambitieux}} |
| Effectif autorisé | {{venue.erp.effectif_autorise}} | {{venue.erp.effectif_autorise}} | {{venue.erp.effectif_autorise}} |

Simulation indicative de dimensionnement — ne remplace pas l'avis du chargé de sécurité.

### 32.3 Démarches réglementaires

| Id | Démarche | Autorité | Obligatoire | Statut | Échéance | Source |
|---|---|---|---|---|---|---|
{{#each compliance}}
| {{.id}} | {{.item}} | {{.authority}} | {{.mandatory\|yesno}} | {{.status}} | {{.deadline_offset_days\|jrel}} | {{.source_ref}} |
{{/each}}

### 32.4 Dispositif prévisionnel de secours

| Élément | Valeur |
|---|---|
| Effectif prévisible déclaré (sous la responsabilité de l'organisateur) | [À COMPLÉTER] |
| Association agréée de sécurité civile contactée | [À COMPLÉTER : nom de la structure, date de contact] |
| Dimensionnement retenu (fourni par l'association, grille cosignée) | [À COMPLÉTER — ne pas calculer] |
| Poste de secours (espace) | {{#each venue_requirements.spaces where .type=secours}}{{.id}} {{/each}} |

### 32.5 Évacuation, sûreté et contrôle d'accès

[À COMPLÉTER : renvoi aux plans de la section 21 ; organisation du contrôle d'accès ; consignes en cas d'évacuation, validées par l'exploitant.]

### 32.6 Accessibilité

| Sujet | Disposition prévue | Espaces concernés | Statut |
|---|---|---|---|
| Accès et cheminements PMR | | {{#each venue_requirements.spaces where .accessible_pmr=true}}{{.id}} {{/each}} | |
| Sanitaires accessibles | Sanitaires PMR déclarés par le lieu : {{venue.utilities.toilets_pmr}} | | |
| Places réservées en tribune | | | |
| Information accessible (gros caractères, pictogrammes, langage simple) | | | |
| Accompagnement et accueil | | | |
| Participation inclusive (catégories, règles adaptées) | | | |

### 32.7 Risques sécurité et santé

| Id | Description | P | I | Prévention | Responsable |
|---|---|---|---|---|---|
{{#each risks where .category in [securite,sante]}}
| {{.id}} | {{.description}} | {{.probability}} | {{.impact}} | {{.prevention\|join}} | {{.owner_role}} |
{{/each}}

### 32.8 Contacts d'urgence

<!-- Annexe à diffusion restreinte : numéros locaux à vérifier, contacts de l'exploitant, du chargé de sécurité, de l'association de secours. -->

### 32.9 Visas

| Rôle | Nom | Date | Visa |
|---|---|---|---|
| Organisateur | | | |
| Exploitant du lieu | | | |
| Chargé de sécurité | | | |

---

## 33. Matrice des risques

<!--
Mode : auto. Source : risks[], sim.risks[] (criticité = P × I ; classes [param] 1-4 faible, 5-9 modérée, 10-16 élevée, 20-25 très élevée).
Qualité : ≥ 1 risque par catégorie applicable ou « non applicable » justifié ; un responsable par risque ; chaque risque critique a un plan (porte éliminatoire).
Exports : XLSX, CSV, PDF, SVG (carte de chaleur).
-->

| Id | Catégorie | Description | P | I | Criticité | Critique | Signes précurseurs | Prévention | Plan de continuité | Responsable | Statut |
|---|---|---|---|---|---|---|---|---|---|---|---|
{{#each sim.risks}}
| {{.id}} | {{.category}} | {{.description}} | {{.probability}} | {{.impact}} | {{.criticite}} ({{.classe}}) | {{.critical\|yesno}} | {{.warning_signs\|join}} | {{.prevention\|join}} | {{.continuity_plan}} | {{.owner_role}} | {{.status}} |
{{/each}}

Carte de chaleur : `exports/<version>/matrice-risques.svg`.

| Catégorie | Couverte | Justification si non applicable |
|---|---|---|
| securite | | |
| reglementaire | | |
| operationnel | | |
| financier | | |
| meteo | | |
| technique | | |
| reputationnel | | |
| juridique | | |
| sante | | |
| environnement | | |

---

## 34. Plans de continuité

<!--
Mode : semi-auto. Source : risks[].continuity_plan / warning_signs / owner_role, sim.incidents[] ; fiches réflexes dans annexes/fiches-reflexes/.
Qualité : les 8 incidents types (07 §8) traités ou « non applicable » justifié ; décideur et déclencheur par plan ; chaque séquence critique couverte.
Exports : PDF, DOCX ; fiches réflexes PDF A5.
-->

### 34.1 Incidents types simulés

| Incident | Δ durée | Δ attente | Δ résultat | Actions proposées |
|---|---|---|---|---|
{{#each sim.incidents}}
| {{.incident}} | {{.delta_duration_min}} min | {{.delta_wait_min}} min | {{.delta_result\|eur}} | {{.actions\|join}} |
{{/each}}

### 34.2 Plans par incident

| Incident | Déclencheur observable | Décideur (rôle) | Actions immédiates (ordre) | Message public / participants / partenaires / autorités | Mode dégradé | Retour à la normale | Fiche réflexe |
|---|---|---|---|---|---|---|---|
| Retard du programme | | | | | | | |
| Désistement de participants | | | | | | | |
| Absence d'un prestataire | | | | | | | |
| Panne informatique | | | | | | | |
| Défaillance électrique | | | | | | | |
| Météo défavorable | | | | | | | |
| Affluence inférieure ou supérieure | | | | | | | |
| Réduction de budget | | | | | | | |

### 34.3 Plans des risques critiques

| Risque | Plan de continuité | Signes précurseurs | Responsable |
|---|---|---|---|
{{#each risks where .critical=true}}
| {{.id}} — {{.description}} | {{.continuity_plan}} | {{.warning_signs\|join}} | {{.owner_role}} |
{{/each}}

### 34.4 Séquences critiques du programme

| Séquence | Plan de repli |
|---|---|
{{#each program where .critical=true}}
| {{.id}} — {{.label}} | [À COMPLÉTER : renvoi fiche réflexe] |
{{/each}}

---

## 35. Indicateurs de performance

<!--
Mode : auto. Source : kpis[].
Qualité : chaque objectif couvert (C10) ; méthode de mesure par KPI ; cible chiffrée ou binaire.
La colonne « réel » reste vide dans le blueprint : les valeurs réelles vont dans le bilan post-événement (docs/08 §4.3).
Exports : XLSX, PDF.
-->

| Id | Indicateur | Phase | Cible | Unité | Méthode de mesure | Responsable de la mesure |
|---|---|---|---|---|---|---|
{{#each kpis}}
| {{.id}} | {{.label}} | {{.phase}} | {{.target}} | {{.unit}} | {{.measure}} | [À COMPLÉTER : rôle] |
{{/each}}

| Objectif | KPI associés |
|---|---|
{{#each identity.objectives}}
| {{.}} | [À COMPLÉTER : K-…] |
{{/each}}

---

## 36. Stratégie de fidélisation

<!--
Mode : semi-auto. Source : format.edition_cadence, gamification[], briques fidelisation.
Qualité : ≥ 1 KPI de fidélisation ; chaque mécanique a une note d'équité et n'est pas manipulatrice (brief §12).
Exports : PDF, DOCX.
-->

Cadence des éditions : {{format.edition_cadence}}

Briques de fidélisation : {{#each format.building_blocks where .type=fidelisation}}{{.label}} ; {{/each}}

| Public | Mécanique entre éditions | Ce qui est promis | Données conservées (finalité, durée, consentement) | KPI de retour |
|---|---|---|---|---|
| Participants | | | | |
| Spectateurs | | | | |
| Bénévoles | | | | |
| Partenaires | | | | |

### 36.1 Calendrier après l'événement

| Échéance | Action | Canal | Responsable |
|---|---|---|---|
| J+1 | | | |
| J+7 | | | |
| J+30 | | | |
| Annonce de l'édition suivante | | | |

---

## 37. Manuel de reproduction

<!--
Mode : semi-auto. Synthèse ici ; manuel complet à produire avec templates/manuel-reproduction.md.
Qualité : invariants vérifiables sur place ; plage pour chaque variable ; test de reprise daté.
Exports : PDF, DOCX (document séparé).
-->

| Élément | Contenu |
|---|---|
| Manuel complet | annexes/manuel-reproduction.md |
| Invariants (résumé) | [À COMPLÉTER] |
| Variables d'adaptation (résumé) | [À COMPLÉTER] |
| Prérequis minimaux | Surface ≥ {{venue_requirements.min_area_m2}} m² ; cadre {{venue_requirements.setting}} ; puissance {{venue_requirements.power_kw}} kW ; internet : {{venue_requirements.internet}} |
| Test de reprise | [À COMPLÉTER : date, profil du testeur, résultat] |

---

## 38. Stratégie de développement géographique

<!--
Mode : manuel. Source : rédigé + parent + sim.finance.breakeven_attendance.
Qualité : données de ville sourcées ou marquées hypothèse ; seuil de rentabilité confronté à chaque ville candidate.
Exports : PDF, DOCX.
-->

### 38.1 Critères de choix

| Critère | Seuil ou règle | Source de la donnée |
|---|---|---|
| Zone de chalandise compatible avec le seuil de rentabilité ({{sim.finance.breakeven_attendance}} spectateurs) | | |
| Lieu compatible avec les prérequis (section 37) | | |
| Offre concurrente à la même période | | |
| Partenaires locaux identifiés | | |
| Porteur local (association, club, collectivité) | | |

### 38.2 Villes candidates

| Ville | Données clés (statut, source) | Lieu possible | Porteur local | Score sur la grille | Décision |
|---|---|---|---|---|---|
| | | | | | |

### 38.3 Modèle de déploiement

| Modèle | Conditions | Avantages | Risques |
|---|---|---|---|
| En propre | | | |
| Partenariat | | | |
| Licence | | | |

### 38.4 Procédure d'adaptation

Clonage de la configuration avec `parent.relation = city_adaptation` (autre ville) ou `venue_adaptation` (autre lieu) ; remplacement de `venue` ; relance des simulations ; notation repassée en prévisionnelle (`02` §5).

---

## 39. Sources documentaires

<!--
Mode : auto. Source : sources[] + index des appels [S-…].
Qualité : C11 ; toute source listée est citée ; date de consultation pour toute URL.
Fiabilité : A officiel/primaire · B presse ou étude reconnue · C secondaire non recoupée · D déclaratif.
Exports : PDF, DOCX, CSV, JSON.
-->

| Id | Titre | Éditeur | URL | Publiée le | Consultée le | Fiabilité |
|---|---|---|---|---|---|---|
{{#each sources}}
| {{.id}} | {{.title}} | {{.publisher}} | {{.url}} | {{.published_at}} | {{.accessed_at}} | {{.reliability}} |
{{/each}}

### 39.1 Hypothèses

| Rang | Hypothèse |
|---|---|
{{#each hypotheses}}
| H-{{@rank}} | {{.}} |
{{/each}}

<!-- {{@rank}} : rang de l'élément dans la liste, base 1, sur deux chiffres (H-01, H-02…). -->

---

## 40. Historique des versions et décisions

<!--
Mode : auto. Source : history[], parent, diff champ à champ avec la version précédente.
Qualité : entrée pour la version courante ; validated ⇒ approved_by renseigné ; aucune entrée antérieure modifiée.
Exports : PDF, DOCX.
-->

| Version | Date | Auteur | Résumé | Décisions | Approuvé par |
|---|---|---|---|---|---|
{{#each history}}
| {{.version}} | {{.date\|date}} | {{.author}} | {{.summary}} | {{.decisions\|join}} | {{.approved_by}} |
{{/each}}

Lignée : {{#if parent}}{{parent.relation}} de {{parent.id}} v{{parent.version}}{{else}}version d'origine{{/if}}.

Différences avec la version précédente : `checks/diff-<version-precedente>-<version>.md` (généré).

---

*{{identity.name}} — v{{version}} ({{status}}) — généré le {{build.date}} — confidentialité : {{meta.confidentiality}} — {{build.id}}*
