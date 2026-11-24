# Checklist de préparation — J-120 à J-1

<!--
MODÈLE — points de contrôle par jalon, cohérents avec templates/retroplanning.csv (mêmes libellés de jalons et points go/no-go).
Format d'un point : - [ ] Action vérifiable — responsable (rôle) — preuve attendue — référence (section du blueprint, checklist, source).
Les échéances sont des recommandations de planification [param] : elles sont placées AVANT les délais légaux relevés dans
checklist-securite-accessibilite.md (§B et §N). Le délai qui fait foi est celui confirmé par l'autorité locale.
Les points issus du registre des erreurs (checklist_items des fiches E-…) sont ajoutés en fin de jalon avec leur identifiant.
Une préparation plus courte que J-120 est possible : reporter alors chaque point au plus tard avant son échéance légale.
-->

| Élément | Valeur |
|---|---|
| Événement / version | |
| Date de J | |
| Responsable de la checklist (rôle) | |

## J-120 — Cadrage

- [ ] Confirmer le lieu et les dates par écrit avec l'exploitant — directeur de projet — accord écrit — section 21
- [ ] Obtenir le document ERP du lieu (type, catégorie, effectif autorisé) — directeur de projet — `venue.erp.document_ref` — checklist sécurité §A
- [ ] Recenser les démarches applicables (B1 à B13) et renseigner `compliance[]` : autorité, obligatoire, échéance, source — directeur de projet — section 32.3 — checklist sécurité §B
- [ ] Identifier la fédération concernée et lire son règlement (conditions médicales, autorisation si prix > 3 000 € pour une manifestation ouverte aux licenciés) — responsable compétition — règlement fédéral — B11, B12
- [ ] Désigner les responsables de chaque rôle clé (projet, trésorerie, compétition, sécurité, accueil, communication, partenariats, bénévoles, régie) — directeur de projet — organigramme — section 24
- [ ] Vérifier la disponibilité du nom (recherche d'antériorité) — directeur de projet — section 03.3

## J-110 — Budget et financement

- [ ] Chiffrer `budget.csv` et `recettes.csv` avec une certitude par ligne — trésorier — fichiers à jour — sections 28, 29
- [ ] Simuler les trois scénarios, le seuil de rentabilité et le besoin de trésorerie — trésorier — section 29
- [ ] Identifier le financement du besoin de trésorerie — trésorier — décision écrite — C9
- [ ] Préparer les dossiers de subvention et noter leurs dates de versement — trésorier — dossiers déposés — `cash_offset_days`

## J-100 — Secours et sécurité

- [ ] Contacter une association agréée de sécurité civile et lui transmettre programme, plans et effectifs — responsable sécurité — courriel daté — checklist sécurité §C
- [ ] Demander un devis d'assurance responsabilité civile couvrant organisateur, bénévoles et participants — directeur de projet — devis — B10

## J-90 — Démarches à délai long · GO/NO-GO 1

- [ ] Déposer les démarches dont le délai relevé est d'au moins deux mois : utilisation exceptionnelle de l'ERP (B6), dérogation boissons en enceinte sportive (B8), manifestation sportive sur la voie publique avec classement (B2), occupation du domaine public (B5) — directeur de projet — accusés de dépôt — checklist sécurité §B
- [ ] Lancer le démarchage des partenaires avec le dossier de sponsoring — responsable partenariats — PPTX + liste de cibles — checklist-sponsors.md
- [ ] **GO/NO-GO 1** — lieu confirmé par écrit ET toutes les démarches à délai d'au moins deux mois déposées — directeur de projet — décision dans `history[].decisions`

## J-75 — Participants

- [ ] Publier le règlement et ouvrir les inscriptions — responsable compétition — règlement en ligne — section 12
- [ ] Vérifier que le formulaire d'inscription contient les mentions sur les données personnelles et l'image (contenu à vérifier auprès de la CNIL ou d'un conseil) — responsable compétition — formulaire
- [ ] Prévoir la liste d'attente — responsable compétition — RSK-02

## J-60 — Billetterie, bénévoles · GO/NO-GO 2

- [ ] Ouvrir la billetterie avec une jauge plafonnée sous l'effectif autorisé — responsable billetterie — paramétrage — C4
- [ ] Indiquer sur la billetterie un contact pour les besoins d'accessibilité — responsable billetterie — checklist sécurité §K
- [ ] Publier les fiches de poste bénévoles et lancer le recrutement — coordinateur bénévoles — checklist-benevoles.md
- [ ] Déposer la demande de buvette temporaire (B7) si non encore faite, en vérifiant le délai local — directeur de projet — accusé de dépôt
- [ ] **GO/NO-GO 2** — ratio recettes sécurisées / dépenses engagées ≥ seuil fixé par l'organisateur — trésorier — ratio calculé — `07` §7.5

## J-45 — Engagements

- [ ] Signer les devis du matériel et des prestataires critiques ; passer leurs lignes en certitude `devis` — régisseur général — devis signés — section 28
- [ ] Identifier un fournisseur de secours pour chaque prestation critique — régisseur général — notes `resources.equipment[]` — RSK-03
- [ ] Déposer les déclarations à délai d'un mois (B1 si plus de 1 500 personnes, B4 si applicable, B2 sans classement) — directeur de projet — récépissés — checklist sécurité §B
- [ ] Lancer la campagne d'annonce — chargé de communication — calendrier éditorial — section 30
- [ ] Signer la convention avec l'association de secours — responsable sécurité — convention — checklist sécurité §C

## J-30 — GO/NO-GO 3 conformité

- [ ] Mettre à jour le statut de chaque point `compliance[]` — directeur de projet — section 32.3
- [ ] Faire valider le plan d'implantation par l'exploitant — directeur de projet — plan visé — section 21
- [ ] Vérifier les préventes par rapport au scénario prudent — responsable billetterie — export billetterie — RSK-07
- [ ] **GO/NO-GO 3** — aucun point de conformité obligatoire en `a_verifier` ou `non_conforme` — directeur de projet — porte « conformité » (`07` §1.5)

## J-21 — Programme et droits

- [ ] Finaliser le programme et le conducteur (transitions nommées, responsables, tops) — régisseur général — `conducteur.csv` — section 27
- [ ] Déposer la demande d'autorisation de diffusion musicale (délai relevé : au moins 15 jours avant) — chargé de production — accusé Sacem — B9
- [ ] Rédiger les fiches réflexes des plans de continuité — directeur de projet — `annexes/fiches-reflexes/` — section 34

## J-15 — Assurance et accessibilité

- [ ] Recevoir l'attestation d'assurance et la transmettre aux autorités qui l'exigent (délai relevé pour B2 : au plus tard six jours avant) — directeur de projet — attestation — B10
- [ ] Vérifier le cheminement accessible, les places réservées et les sanitaires accessibles — responsable accueil — checklist sécurité §K
- [ ] Commander la signalétique — chargé de production — bon de commande — section 19

## J-14 — Équipes

- [ ] Former et briefer les bénévoles (rôle, horaires, consignes de sécurité, accueil des personnes handicapées) — coordinateur bénévoles — émargement — checklist-benevoles.md
- [ ] Former les arbitres au règlement — responsable compétition — émargement

## J-7 — GO/NO-GO 4 opérationnel

- [ ] Obtenir la confirmation écrite de chaque prestataire (horaire, accès, contact) — régisseur général — confirmations
- [ ] Confirmer les participants ; activer la liste d'attente si nécessaire — responsable compétition — liste à jour — RSK-02
- [ ] Vérifier les effectifs présents par rôle par rapport aux besoins — coordinateur bénévoles — C13
- [ ] Exporter hors ligne les listes (participants, billets, bénévoles) — responsable billetterie — fichiers et impressions — RSK-04
- [ ] **GO/NO-GO 4** — prestataires confirmés ET effectifs ≥ besoins ET dispositif de secours confirmé — directeur de projet — décision écrite

## J-3 — Météo et configuration

- [ ] Consulter le bulletin météo et décider la configuration (base ou secours) selon le critère écrit — directeur de projet — décision — RSK-06
- [ ] Informer participants et public des consignes pratiques (horaires, accès, accessibilité, interdits) — chargé de communication — message envoyé

## J-1 — Montage et contrôles

- [ ] Réaliser l'état des lieux d'entrée contradictoire — régisseur général — état des lieux signé
- [ ] Monter selon le plan visé ; contrôler qu'aucune issue ni dégagement n'est obstrué — régisseur général — contrôle signé — checklist sécurité §D
- [ ] Tester son, lumière, vidéo, chronométrage, réseau, radios et la procédure papier de secours — régisseur général — fiche de test — RSK-04, RSK-05
- [ ] Vérifier la puissance appelée par rapport à la puissance disponible — régisseur général — C8
- [ ] Tenir le briefing général (programme, rôles, consignes de sécurité, fiches réflexes, contacts) — directeur de projet — émargement
- [ ] Imprimer conducteur, fiches réflexes, plans, listes — régisseur général — classeur de régie

## Points issus du registre des erreurs

<!-- Injectés automatiquement : - [ ] (E-NNN) point de checklist — jalon -->
