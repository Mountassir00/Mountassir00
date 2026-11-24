# Checklist post-événement — J+1 à J+45

<!--
MODÈLE — clôture, bilan et apprentissage. Bilan : templates/bilan-post-evenement.md ; principes : docs/07 §10, docs/08 §4.3.
Format d'un point : - [ ] Action vérifiable — responsable (rôle) — preuve attendue — référence.
Règle : la version exécutée n'est jamais modifiée ; les améliorations sont proposées dans une nouvelle version draft soumise à approbation.
Échéances [param] : J+3 bilan à chaud, J+30 bilan complet, J+45 proposition de version.
-->

| Élément | Valeur |
|---|---|
| Événement / version exécutée | |
| Responsable du bilan (rôle) | |

## J+1 à J+3 — À chaud

- [ ] Rassembler conducteur annoté, main courante, relevés de jauge et de files, relevé des caisses — directeur de projet — dossier `bilans/<version>/`
- [ ] Rédiger le bilan à chaud (sections 1, 2, 5 et 8 du bilan) — directeur de projet — `bilan.md`
- [ ] Ouvrir une fiche d'erreur pour chaque incident significatif, ou enrichir une fiche existante — directeur de projet — fiches `E-…` — `templates/fiche-erreur.md`
- [ ] Envoyer les questionnaires de satisfaction (spectateurs, participants, bénévoles, partenaires) — chargé de communication — envoi daté
- [ ] Publier les résultats et les contenus prévus après l'événement — chargé de communication — section 30
- [ ] Remercier bénévoles, partenaires, prestataires, exploitant et autorités — directeur de projet

## J+10 — Obligations et restitutions

- [ ] Transmettre à la Sacem le programme des œuvres diffusées (délai relevé : dans les 10 jours suivant la manifestation — à vérifier) — chargé de production — accusé de transmission — B9
- [ ] Restituer le matériel loué ou prêté et vérifier l'inventaire de retour — régisseur général — bons de retour
- [ ] Signaler tout dommage au lieu ou au matériel à l'assureur si nécessaire — directeur de projet — déclaration

## J+30 — Bilan complet

- [ ] Rapprocher chaque dépense et chaque recette prévues de leur montant réel, pièce à l'appui — trésorier — bilan §4, `bilan-donnees.xlsx`
- [ ] Remettre aux partenaires le compte rendu des contreparties — responsable partenariats — checklist-sponsors.md §6
- [ ] Analyser la satisfaction (taux de réponse, limites de représentativité) — chargé de communication — bilan §9
- [ ] Renseigner la valeur réelle de chaque KPI avec sa source de mesure — directeur de projet — bilan §13
- [ ] Établir l'évaluation sur données réelles (type `reelle`) et la comparer à l'évaluation prévisionnelle — directeur de projet — bilan §14
- [ ] Proposer le recalibrage des paramètres `[param]` (valeur observée, valeur proposée, justification) — directeur de projet — bilan §15 ; validation humaine requise
- [ ] Préparer les justificatifs demandés par les financeurs (subventions) — trésorier — dossiers de justification
- [ ] Supprimer ou archiver les données personnelles selon les durées annoncées — directeur de projet — trace
- [ ] Si l'événement est reproduit sous licence : transmettre le bilan au studio — directeur de projet — manuel de reproduction §12

## J+45 — Apprentissage

- [ ] Créer la version draft `x.(y+1).0` avec `parent.relation = new_version` et la liste des changements proposés — directeur de projet — nouvelle version — `02` §5
- [ ] Mettre à jour le registre des erreurs et, si utile, les fiches de veille et les briques — analyste veille — `knowledge/`
- [ ] Soumettre la nouvelle version à approbation — directeur de projet — statut `review`
- [ ] Archiver le dossier de l'édition (exports, bilan, preuves) — directeur de projet — `bilans/<version>/`, `exports/<version>/`
