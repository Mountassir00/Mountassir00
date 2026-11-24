# 16 — Feuille de route de développement

> Hypothèse de travail : une association bénévole, peu de temps disponible, budget très limité. La feuille de route privilégie ce qui **produit des résultats réels** (données, tests terrain, partenaires) avant ce qui produit de la technique.
> Les efforts sont exprimés en **jours de travail** (développement ou organisation) ; les coûts sont des **estimations** à vérifier. Si le développement est confié à un prestataire, compter un tarif journalier de marché (ordre de grandeur : plusieurs centaines d'euros par jour — estimation) ; s'il est fait par un bénévole compétent, le coût est surtout du temps.

## 1. Matrice de statut des fonctionnalités (au 24/11/2026, v0.3 EVENT LAB en cours)

Source de vérité : `src/ui/features.ts` (affichée dans l'interface). Depuis la v0.3, l'application s'intitule **EVENT LAB** et compte deux espaces (Basket — Bask'Est ; Multisectoriel) et des modules communs.

| Module | Espace / groupe | Statut | Ce qui manque pour l'étape suivante |
|---|---|---|---|
| Tableau de bord | Commun | Opérationnel | Données réelles 2026 |
| Registre des erreurs (unifié : 45 cas BASK'EST + 28 fiches EVENT LAB → 59 entrées) | Commun | Opérationnel | Incidents réels de Bask'Est |
| Veille et sources (unifiée : 50 + 70 sources → 111 domaines) | Commun | Prototype | Ingestion RSS/API, synthèses planifiées (v0.4) |
| Application mobile (PWA) | Commun | Prototype | Tests sur téléphones réels ; enveloppe Android/iOS (Capacitor), comptes développeur, fiches magasin |
| Tableau de notation | Basket — Pilotage | Opérationnel | Surcharges partagées (base commune) |
| Projets et calendrier | Basket — Pilotage | Prototype | Base partagée + authentification |
| Analyse post-événement | Basket — Pilotage | Opérationnel | Saisie des chiffres réels des éditions |
| Observatoire des tendances | Basket — Veille | Prototype | Actualisation planifiée |
| Bibliothèque des innovations | Basket — Veille | Opérationnel | Mise à jour trimestrielle |
| Générateur de concepts | Basket — Création | Opérationnel | Enrichissement des bibliothèques |
| Laboratoire créatif | Basket — Création | Opérationnel | — |
| Studio de design | Basket — Création | Prototype | Charte validée + gabarits d'impression |
| Configurateur de salles | Basket — Simulation | Opérationnel | Relevés réels des lieux (accès, jauges) |
| Simulateur sportif | Basket — Simulation | Opérationnel | Calibrage sur matchs réels Bask'Est |
| Simulateur financier | Basket — Simulation | Opérationnel | Devis réels |
| Programmation sportive | Basket — Simulation | Opérationnel | Publication réelle (connecteur) |
| Bibliothèque des dossiers | Basket — Production | Opérationnel | — |
| Intégrations et validations | Basket — Écosystème | Dépend d'une intégration | Premier connecteur réel |
| Notifications | Basket — Écosystème | Prototype | Push / e-mail |
| Espaces collaboratifs | Basket — Écosystème | Dépend d'une intégration | Base partagée + rôles |
| Portefeuille multisectoriel | Multisectoriel | Opérationnel | Données réelles (confiance actuelle 0,30 à 0,37) |
| Studio de configuration | Multisectoriel | Prototype | Versions partagées (base commune), édition de tous les champs, porte « pic d'occupation > effectif autorisé » (07 §1.5) |
| Générateur multisectoriel | Multisectoriel | Prototype | Contrôles de cohérence et réparation (07 §2.6), couche rédactionnelle (07 §2.9) |
| Bibliothèque de briques | Multisectoriel | Opérationnel | Enrichissement par la veille |

Bilan : **14 opérationnels, 8 prototypes, 2 dépendant d'une intégration** (24 modules). Avant la v0.3 : 12 opérationnels, 5 prototypes, 2 dépendant d'une intégration (19 modules).

## 2. P0 — Livré (aujourd'hui)

- Architecture modulaire : moteurs TypeScript purs + dashboard React + scripts d'export.
- Moteurs : simulation sportive (Monte-Carlo), programmation, finance (3 scénarios, trésorerie), salles (plans 2D/3D simplifiée), 26 règles de conception, notation /100 avec portes et maturité, générateur, studio, Blueprint, audit, veille, contrats d'intégration.
- Bases de connaissances : 52 innovations, 45 cas d'erreurs, 50 sources de veille, 25 mécaniques, 10 tendances et 9 signaux faibles, 16 concepts + le dossier phare.
- Recherches sourcées : `docs/research/R1` (Bask'Est et territoire), `R2` (benchmark mondial), `R3` (cadre réglementaire et financements).
- Premier BASK'EST EVENT BLUEPRINT complet : All Star Game Grand Est 2027 (PDF, Word, Excel, PowerPoint, kit opérationnel, visuels).
- 31 tests automatisés.

Limites assumées de P0 : stockage dans le navigateur, données réelles de l'association absentes, montants unitaires estimés, accès du Palais des Sports supposés.

## 3. P1 — Socle et vraies données (0-3 mois)

| Livrable | Effort | Dépendances | Coût estimé | KPI de réussite |
|---|---|---|---|---|
| Saisie des données réelles : ASG 2026, Bask'Cup 2025-2026, King of the Court (s'il a eu lieu) | 2-3 j (association) | Billetweb, HelloAsso, comptes de l'association | 0 € | 100 % des champs « priorité 1 » renseignés |
| Visite technique du Palais des Sports Jean-Weille + fiche de relevé (`docs/09`, §9) | 1 j (association) | RDV gestionnaire | 0 € | Accès, jauge, tarif de mise à disposition confirmés |
| Base partagée + authentification + rôles (schéma `db/schema.sql`) | 5-8 j (dev) | Choix de l'hébergeur | offre gratuite au démarrage | 3 membres du bureau connectés |
| Remplacement du stockage navigateur par la base (projets, concepts, approbations, audits) | 3-4 j (dev) | Base | — | Un projet créé sur un poste visible sur un autre |
| Déploiement du dashboard (hébergement statique) | 0,5 j (dev) | — | gratuit | URL privée accessible au bureau |
| **Premier test terrain** d'un format (prototype) : ex. séance « Les Nocturnes » ou « Le Chardon » avec 8-16 joueurs | 1 j (association) | Gymnase, 4-6 bénévoles | < 200 € (estimation) | Questionnaire joueurs ≥ 8/10 ; durée réelle des matchs mesurée |
| Recalage du simulateur sur les mesures du test (durée réelle, scores) | 1 j (dev) | Test terrain | — | Écart durée simulée / réelle < 15 % |
| Demandes de financement à fort calendrier (contrat de ville, FDVA, collectivités) — dates à vérifier | 3-5 j (association) | Statuts, RNA, budget | 0 € | 2 dossiers déposés |

Risques : manque de temps bénévole (mitigation : un seul référent par chantier, réunions courtes) ; données 2026 incomplètes (mitigation : commencer par la billetterie, la plus fiable) ; dépendance à un seul développeur (mitigation : code documenté, tests).

## 4. P2 — Intégrations utiles (3-6 mois)

| Livrable | Effort | Dépendances | Coût estimé | KPI |
|---|---|---|---|---|
| Connecteur billetterie / inscriptions (création d'événement, import des inscrits) | 4-6 j | Accès API ou exports des outils | selon outil | Inscriptions importées sans ressaisie |
| Publication du programme sur le site après validation | 2-4 j | Site officiel (à créer s'il n'existe pas) | hébergement : faible | Programme publié en < 5 min après validation |
| Export comptable (CSV par nature de recette) | 1-2 j | Choix de l'outil comptable | 0 € | Budget réalisé rapproché des comptes |
| Veille automatisée : ingestion RSS des sources fiables + synthèse hebdomadaire planifiée | 3-5 j | Planificateur, clé API côté serveur | paiement à l'usage (faible) | 1 synthèse/semaine lue par le bureau |
| CRM partenaires léger (offres, contreparties, bilans) | 2-3 j | Outil choisi (tableur partagé possible) | 0-faible | Bilan envoyé à 100 % des partenaires sous 15 jours |
| Audit post-événement de l'ASG 2027 dans l'outil | 1 j (association) | Édition 2027 | 0 € | Audit ≥ 70 % des objectifs → 1re édition « réussie » |

Risques : coût et complexité des API (mitigation : commencer par des exports CSV) ; sur-ingénierie (mitigation : une intégration n'est développée qu'après 2 usages manuels réels).

## 5. P3 — Écosystème et duplication (6-12 mois)

| Livrable | Effort | Dépendances | Coût estimé | KPI |
|---|---|---|---|---|
| Espace joueur mobile (inscription, planning de son équipe, carte de performance) | 10-15 j | P1, consentements RGPD | hébergement faible | 50 % des joueurs utilisent leur espace |
| Classement régional Bask'Est (critères publiés, droit d'opposition) | 4-6 j | Résultats saisis, P1 | — | Classement publié et non contesté |
| Calendrier de saison interconnecté (Échelle de l'Est → Bask'Cup → ASG) | 2-3 j | Formats testés | — | 1 passerelle effective (un qualifié joue l'ASG) |
| Manuel de duplication + licence type pour un club partenaire | 3-5 j (association + conseil juridique) | Format « validé » (2 éditions réussies) | honoraires juridiques à prévoir | 1 édition organisée hors Nancy |
| Dépôt de marque des formats qui marchent | 1-2 j + frais de dépôt | Recherche d'antériorité | frais INPI (à vérifier) | Marques déposées |
| Écrans en direct (scores, votes) | 3-5 j | Connecteur écrans | matériel du lieu | Utilisé sur 1 événement |

Risques : dupliquer trop tôt un format non validé (mitigation : la maturité « format validé » est un prérequis codé) ; protection juridique insuffisante (mitigation : conseil d'un professionnel avant toute licence).

## 6. Indicateurs de pilotage de la feuille de route

| Indicateur | Cible à 3 mois | Cible à 12 mois |
|---|---|---|
| Éditions réelles saisies et auditées | 3 | 6 |
| Formats au niveau « prototype » ou plus | 2 | 4 |
| Formats « validés » | 0 | 1 (ASG si 2 éditions réussies) |
| Partenaires avec bilan chiffré | — | 100 % |
| Temps de préparation d'un dossier partenaire | < 1 h (export) | < 30 min |
| Heures bénévoles par événement | mesurées | −15 % à périmètre égal |

## 7. Les 7 prochains jours (actions pour l'association)

| # | Action | Responsable | Livrable | Critère de réussite |
|---|---|---|---|---|
| 1 | Exporter de Billetweb les chiffres de l'ASG 2026 (billets par tarif, scannés) et lister les dépenses réelles | Trésorerie | Fichier de données ASG 2026 | Affluence et résultat réels connus |
| 2 | Rassembler RNA, statuts, affiliation FFBB éventuelle, comptes réseaux officiels | Secrétariat | Fiche identité administrative | Prérequis subventions et conventions réunis |
| 3 | Demander au gestionnaire du Palais des Sports : jauges par configuration, plan d'évacuation, tarif de mise à disposition, dates disponibles en mai-juin 2027 (risque playoffs) | Responsable événement | Réponse écrite + date de visite | Tarif réel connu (remplace l'hypothèse de 5 000 €) |
| 4 | Relire le Blueprint ASG 2027 (PDF) et corriger les hypothèses (affluence, prix, partenaires pressentis) | Bureau | Liste de corrections | Hypothèses validées ou corrigées |
| 5 | Choisir **un** format à tester (ex. « Le Chardon » 1c1 ou « Les Nocturnes » 3x3) et réserver un créneau de gymnase | Responsable sportif | Créneau réservé | Test planifié sous 30 jours |
| 6 | Contacter 3 partenaires potentiels avec la présentation PowerPoint | Partenariats | 3 rendez-vous | 1 rendez-vous obtenu |
| 7 | Clarifier le statut du « King of the Court » (a-t-il eu lieu ?) | Bureau | Note de 5 lignes | Maturité correcte dans l'outil |

Ce qui ne doit **pas** être fait maintenant : développer des intégrations avant d'avoir les données réelles ; dupliquer un format non testé ; engager des dépenses de l'ASG 2027 avant le point go/no-go (J-30) défini dans le rétroplanning.
