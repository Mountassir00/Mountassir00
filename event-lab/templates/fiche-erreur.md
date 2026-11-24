# Fiche d'erreur — E-NNN

<!--
MODÈLE — registre des erreurs événementielles à ne pas reproduire. Spécification : docs/08-modeles-documentaires.md §4.2.
Source de vérité : knowledge/registre-erreurs.json (tableau d'objets conformes à schemas/error-entry.schema.json).
Règles :
- Au moins une source vérifiable. Une erreur sans source n'entre pas au registre.
- Niveau de preuve des causes [cause_status] : « etablie_rapport_officiel » uniquement si un rapport officiel l'établit ;
  « recoupee_presse » si plusieurs sources de presse indépendantes concordent ; sinon « probable ».
- Décrire des mécanismes, pas des personnes : aucune mise en cause nominative.
- Rédiger prévention, plan correctif et points de checklist comme des actions vérifiables (« Vérifier que… », « Ouvrir… si… »).
- Les points de checklist [checklist_items] sont injectés automatiquement dans les checklists des blueprints liés.
-->

## 1. Identification

| Champ | Valeur |
|---|---|
| Identifiant [`id`] | E-NNN |
| Titre [`title`] | |
| Domaine [`domain`] | inscriptions · billetterie · files_attente · accueil · ambiance · sequencage · temps_morts · regles · visibilite · animations · restauration · accessibilite · securite · benevoles · experience_athletes · satisfaction · communication · sponsors · rentabilite · medias · environnement · gouvernance |
| Gravité [`severity`] | mineure · majeure · critique |
| Échelle concernée [`applies_to_scale[]`] | local · regional · national · international |
| Niveau de preuve des causes [`cause_status`] | etablie_rapport_officiel · recoupee_presse · probable |

## 2. Événements où l'erreur est documentée [`events[]`]

| Nom [`name`] | Date [`date`] | Ville [`city`] | Pays [`country`] |
|---|---|---|---|
| | | | |

## 3. Description [`description`]

<!-- Ce qui s'est passé, de façon factuelle, à partir des sources. -->

## 4. Causes probables [`probable_causes[]`]

-

## 5. Conséquences [`consequences[]`]

-

## 6. Signes précurseurs [`warning_signs[]`]

<!-- Observables avant l'incident, avec si possible un seuil ou un moment (« à J-7, moins de … inscrits »). -->

-

## 7. Mesures préventives [`preventive_measures[]`]

-

## 8. Plan correctif [`corrective_plan[]`]

<!-- Actions à déclencher si l'erreur survient PENDANT l'événement, dans l'ordre. -->

1.

## 9. Points de checklist [`checklist_items[]`]

<!-- Une ligne = une action vérifiable, avec la checklist cible entre crochets : [J-120-a-J-1], [jour-J], [securite-accessibilite], [benevoles], [sponsors], [post-evenement]. -->

- [ ] [checklist cible] Vérifier que …

## 10. Sources [`sources[]`]

| Titre [`title`] | Éditeur [`publisher`] | URL [`url`] | Fiabilité [`reliability`] |
|---|---|---|---|
| | | | |

## 11. Utilisation dans les blueprints

| Blueprint (id@version) | Risque créé ou enrichi (RSK-…) | Checklist enrichie |
|---|---|---|
| | | |

---

> **EXEMPLE FICTIF** (ne pas réutiliser) — formulation correcte d'un point de checklist :
> - [ ] [jour-J] Vérifier à l'ouverture des portes que le nombre de files de contrôle ouvertes est au moins égal à `sim.flow.lanes_required` ; sinon ouvrir la file de réserve et prévenir le responsable accueil.
