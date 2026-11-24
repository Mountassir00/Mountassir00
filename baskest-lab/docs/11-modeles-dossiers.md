# 11 — Modèles de dossiers : le BASK'EST EVENT BLUEPRINT

> Code : `src/core/blueprint/blueprint.ts` (contenu), `src/core/blueprint/render.ts` (Markdown, HTML), `src/core/blueprint/types.ts` (structure), `scripts/generate-blueprint.ts` et `scripts/export_office.py` (exports).
> Interface : **Bibliothèque des dossiers** (`#/dossiers`). Statut : opérationnel.

Un Blueprint est généré **automatiquement** pour tout concept. Il sert à la fois de **cahier des charges**, de **dossier de présentation**, de **manuel d'exploitation** et de **base pour l'édition suivante** (§18). Il est accompagné d'une présentation partenaires, d'un budget modifiable et d'un kit opérationnel.

## 1. Structure : 8 parties, 75 sections

Chaque section est une suite de blocs typés (`p`, `list`, `table`, `kv`, `svg`, `callout`) : le même contenu se rend en Markdown, HTML/PDF, Word et alimente Excel et PowerPoint.

Sources de données :
- **Moteur** : calculé par la chaîne `analyzeConcept` (simulation, planning, budget, implantation, règles, notation).
- **Concept** : saisi dans la fiche concept (pitch, identité, expérience, contenus, sécurité).
- **Base** : bases de connaissances (innovations, recherche, règles).
- **Gabarit** : texte type paramétré par le concept (à relire et adapter).
- **Override** : contenu spécifique fourni via `BlueprintExtras` (ex. faits réels de l'édition 2026 pour le dossier phare).

### Partie stratégique (11 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `resume` | Résumé exécutif | Pitch, fiche d'identité (organisateur, édition, date, lieu, public, durée, budget, note, maturité), avertissement estimations | Concept + moteur |
| `concept` | Présentation du concept | Pitch + 6 moments d'expérience | Concept |
| `objectifs` | Objectifs | Tableau objectif / indicateur / cible + objectifs stratégiques | Moteur + gabarit |
| `proposition_valeur` | Proposition de valeur | Valeur pour spectateurs, joueurs, partenaires, territoire | Gabarit + moteur |
| `positionnement` | Positionnement | Prix, niveau, ton, différenciation (innovations) | Concept + base |
| `marche` | Étude de marché | Faits publics (salle, club, comparables régionaux, climat), hypothèse de prix à tester | Base (R1, R2) + override |
| `benchmark` | Benchmark | Références et adaptation Bask'Est | Base (R2) |
| `inspirations` | Sources d'inspiration | Innovations transposées : origine, adaptation | Base (innovations) |
| `concurrence` | Analyse concurrentielle | Concurrents pour l'attention du public et réponse | Gabarit + override |
| `cibles` | Public cible | Attentes et réponses par public | Concept + gabarit |
| `evaluation` | Évaluation BASK'EST LAB | Barème détaillé, portes, maturité, résultat des 26 règles | Moteur |

### Partie sportive (10 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `reglement` | Règlement complet | Statut officiel/non officiel, articles (format, fin de match, possession, valeur des paniers, mécaniques), composition, déroulement, départage, fair-play, forfait, réclamations | Concept + gabarit |
| `inscription` | Conditions d'inscription | Formulaire unique, tarif, clôture, mineurs, têtes de série, check-in | Moteur (ops) + gabarit |
| `format` | Format des compétitions | Phases, matchs programmés, terrains, créneau, repos | Moteur |
| `scoring` | Système de scoring | Zones, points, réussite de calibrage, mécaniques | Concept |
| `qualifications` | Qualifications | Règle de qualification, passerelles | Concept + gabarit |
| `classements` | Classements | Événement, individuel, contribution au classement régional | Gabarit |
| `calendrier` | Calendrier et programme | Planning heure par heure (jusqu'à 60 matchs) | Moteur (planning) |
| `recompenses` | Récompenses | Récompenses + règle cash prize | Moteur (ops) |
| `arbitrage` | Arbitrage | Effectifs, affectation sans conflit d'intérêts, briefing | Moteur |
| `simulations` | Simulations sportives | Indicateurs Monte-Carlo, verdict, risques détectés | Moteur |

### Partie créative (11 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `naming` | Naming | Nom, signature, endossement, vérifications PI | Concept |
| `logo` | Logo et logotype | Maquette SVG | Studio |
| `da` | Direction artistique | Univers, lumière, musique, photo | Gabarit + concept |
| `charte` | Charte graphique | Palette, typographies, règle d'endossement | Concept |
| `moodboard` | Moodboard | Références visuelles décrites | Gabarit |
| `maillots` | Maillots | Domicile et extérieur (SVG) | Studio |
| `scenographie` | Scénographie | Entrée, terrain central, tunnel, zone contenu, signalétique | Gabarit |
| `trophees` | Trophées et médailles | Trophée artisanal, médailles, prix MVP et fair-play | Gabarit |
| `affiches` | Affiches et visuels digitaux | Affiche A4, visuel réseaux, billet, accréditation (SVG) | Studio |
| `ux` | Maquettes UX/UI | Page événement, espace joueur, écran géant, tableau organisateur | Gabarit |
| `projection` | Visuels de projection | Habillage écran géant (SVG) | Studio |

### Partie opérationnelle (13 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `plans` | Plans du lieu | Plan d'implantation SVG | Moteur (salles) |
| `implantation` | Implantation | Zones, surfaces, capacités, PMR, dégagements, alertes | Moteur (salles) |
| `conducteur` | Conducteur minute par minute | Montage, briefing, ouverture, blocs, débuts de rondes, remise, démontage | Moteur (planning) |
| `retroplanning` | Rétroplanning | J-180 → J+45, responsable, livrable (go/no-go à J-30) | Moteur + gabarit |
| `organigramme` | Organigramme | Pôles, rôles, effectifs | Moteur (ops) |
| `responsabilites` | RACI | Réalise / valide / consulté / informé | Gabarit |
| `fiches_benevoles` | Fiches de poste bénévoles | Mission, horaires (≤ 4 h), profil, brief | Gabarit + ops |
| `inventaire` | Inventaire matériel | Quantités calculées (paniers, ballons, chronos, chasubles, barrières…) | Moteur |
| `prestataires` | Prestataires | Prestation, statut, échéance devis | Gabarit |
| `flux` | Gestion des flux | Entrée, joueurs, secours, sortie, PMR | Moteur (ops) |
| `secours` | Plans de secours | DPS, défibrillateur, évacuation, plan météo, plan B planning | Gabarit + moteur |
| `risques` | Analyse des risques | Risque, probabilité, impact, mesure, responsable (+ règles bloquantes) | Moteur + gabarit |
| `checklists` | Checklists | J-30, J-7, J-1, J0 H-2, J+1, J+15 | Gabarit |

### Partie économique (8 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `budget` | Budget | Charges par poste, produits par nature, 3 scénarios | Moteur (finance) |
| `tresorerie` | Plan de trésorerie | Solde cumulé par jour, trésorerie à avancer | Moteur |
| `seuil` | Seuil de rentabilité | Point mort par scénario | Moteur |
| `tarifs` | Politique tarifaire | Grille cohérente (enfants, famille, prévente, premium) | Moteur |
| `commercial` | Stratégie commerciale | Prévente, packs clubs/entreprises, upsell | Gabarit |
| `sponsoring` | Dossier de sponsoring | 4 offres (titre, officiel, fournisseur, club des supporters), prix selon palier, sponsoring ≠ mécénat | Gabarit paramétré |
| `offres` | Offres partenaires | Contreparties | Gabarit |
| `financements` | Financements potentiels | Dispositifs, pertinence, calendrier à vérifier, avertissement « ne pas déformer l'événement » | Base (R3) |

### Partie médiatique (7 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `digital` | Stratégie digitale | Rôle et formats par plateforme | Gabarit |
| `editorial` | Calendrier éditorial | J-60 → J+14 | Gabarit |
| `captation` | Plan de captation | Moments, plateformes, formats, potentiel, besoins techniques, droit à l'image | Concept + gabarit |
| `storyboards` | Storyboards | Teaser 15 s en 6 plans | Gabarit |
| `videos` | Formats vidéos | Teaser, résumé, portraits, mini-doc, cartes de performance | Gabarit |
| `presse` | Relations presse | Communiqués, cibles, accréditations, kit presse | Gabarit |
| `kpi` | Indicateurs de performance | 9 KPI, cibles, sources | Moteur + gabarit |

### Partie juridique et réglementaire (9 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `autorisations` | Autorisations | Liste du concept + avertissement « information générale » | Concept |
| `assurances` | Assurances | RC organisateur (L321-1), information assurance individuelle (L321-4), exclusions | Base (R3) |
| `donnees` | Protection des données | Bases légales, mineurs de moins de 15 ans, conservation, classements | Base (R3) |
| `image` | Droit à l'image | Autorisations, bracelet « pas de photo », retrait | Base (R3) |
| `conditions` | Conditions de participation | Règlement non officiel, santé, fair-play, remboursement | Gabarit |
| `reglements` | Règlements applicables | Lieu, FIBA/FFBB, ERP, buvette, jeux-concours | Base (R3) |
| `accessibilite` | Accessibilité | Mesures du concept, places PMR indicatives | Concept + moteur |
| `securite` | Obligations de sécurité | Jauge, palpations par agents habilités au-delà de 300 spectateurs, déclaration au-delà de 1 500 personnes, Vigipirate, dégagements | Base (R3) |
| `pi` | Propriété intellectuelle | Dépôt de marque, droit d'auteur, licences, cession des droits créatifs | Gabarit |

### Partie développement (6 sections)

| Id | Section | Contenu | Source |
|---|---|---|---|
| `duplication` | Manuel de duplication | Éléments obligatoires / personnalisables / non modifiables, besoins minimums, lieux compatibles, contrôle qualité, critères d'autorisation, **budgets par échelle** (locale, régionale, nationale) recalculés | Moteur + gabarit |
| `croissance` | Potentiel de croissance | Trajectoire sur 3 ans | Gabarit + override |
| `territoire` | Implantation territoriale | Villes cibles, partenariat type, qualifications → finale | Gabarit |
| `evolutions` | Évolutions possibles | Versions digitale, inclusive, premium | Gabarit |
| `versions` | Historique des versions | Version, date, modification | Moteur |
| `retex` | Retours d'expérience | Alertes de conception à traiter ; à compléter par l'audit | Moteur |

> Les sections « gabarit » sont des **points de départ** : elles doivent être relues et adaptées par l'équipe avant diffusion. Les sections juridiques sont de l'**information générale**, pas un conseil personnalisé.

## 2. Personnaliser un dossier : `BlueprintExtras`

```ts
interface BlueprintExtras {
  edition?: string;      // « Édition 2 — 2027 »
  date?: string;         // libellé lisible
  dateISO?: string;
  city?: string;
  venueLabel?: string;
  organiser?: string;
  overrides?: Record<sectionId, { mode: 'replace' | 'prepend' | 'append'; blocks: Block[] }>;
}
```

- `replace` remplace le contenu généré ; `prepend` / `append` l'encadrent.
- Exemple réel : `src/data/flagship-asg-2027.ts` ajoute au résumé le rappel de l'édition 2026, à l'étude de marché un tableau de faits sourcés (avec niveau de fiabilité), à la concurrence le risque de calendrier (playoffs en juin) et à la croissance la saison interconnectée qui mène à l'All Star Game.
- Bonne pratique : tout fait ajouté en override doit citer sa source et son niveau de fiabilité.

## 3. Chaîne d'export

```
npm run blueprint [concept-id]      # défaut : asg-grand-est-2027
  → analyzeConcept (500 simulations)
  → buildBlueprint
  → docs/blueprints/<id>/blueprint.md     (Markdown, visuels en assets/*.svg)
  → docs/blueprints/<id>/blueprint.html   (HTML autonome, imprimable)
  → docs/blueprints/<id>/blueprint.pdf    (PDF A4 via Chromium)
  → docs/blueprints/<id>/blueprint.json   (données pour Office)
  → docs/blueprints/<id>/assets/*.svg + *.png (10 visuels)

npm run exports [concept-id]        # Python : python-docx, openpyxl, python-pptx
  → <id>-dossier.docx                  dossier complet, 8 parties, visuels intégrés
  → <id>-kit-operationnel.docx         règlement, arbitrage, calendrier, plans, implantation, conducteur,
                                       rétroplanning, organigramme, RACI, fiches bénévoles, inventaire,
                                       prestataires, flux, secours, risques, checklists
  → <id>-budget.xlsx                   budget MODIFIABLE (voir ci-dessous)
  → <id>-presentation-partenaires.pptx 11 diapositives
```

Depuis l'interface, la Bibliothèque des dossiers télécharge à la volée le HTML (à imprimer en PDF depuis le navigateur), le Markdown, le JSON et chaque visuel SVG, pour **n'importe quel** concept (y compris ceux enregistrés depuis le générateur).

### Le budget Excel

| Onglet | Contenu |
|---|---|
| Hypothèses | Spectateurs, participants, équipes, part payante, imprévus — **cellules jaunes modifiables** |
| Synthèse | Charges décaissées, imprévus, apports en nature, produits par nature (pondérés par probabilité), emprunts hors résultat, résultat, part sécurisée, dépendance aux subventions — **formules** |
| Charges / Produits | Une ligne par poste ; coût unitaire et quantité modifiables ; multiplicateur calculé selon la base (fixe, par spectateur, par spectateur payant, par participant, par équipe) |
| Scénarios | Valeurs du simulateur (prudent, réaliste, ambitieux) |
| Trésorerie | Solde cumulé par jour + graphique |
| Planning, Conducteur, Rétroplanning (colonne « Fait ? »), Risques, Offres partenaires (totaux en formule), KPI (colonne « Réalisé »), Notation | Tables de travail |

Vérification : le classeur recalculé dans LibreOffice donne les mêmes produits que le simulateur (25 010 € pour le dossier phare) ; l'écart sur les charges correspond à la dérive de +3 % que le simulateur applique au scénario réaliste (mentionnée dans l'onglet Synthèse).

### La présentation partenaires (11 diapositives)

Couverture (logo + affiche), le concept, les chiffres clés, le programme, pour qui, l'expérience, visibilité et contenus, devenir partenaire (offres), impact sur le territoire, engagements mesurables (KPI), contact (à compléter par l'association).

## 4. Fichiers produits pour le dossier phare

`docs/blueprints/asg-grand-est-2027/` :

| Fichier | Usage |
|---|---|
| `blueprint.md` | Lecture dans GitHub / Notion |
| `blueprint.html` | Lecture et impression navigateur |
| `blueprint.pdf` | Diffusion (A4, couverture, sommaire) |
| `blueprint.json` | Données structurées (réutilisation, futur dashboard administratif) |
| `asg-grand-est-2027-dossier.docx` | Dossier complet modifiable (Word) |
| `asg-grand-est-2027-kit-operationnel.docx` | Kit de l'équipe organisatrice |
| `asg-grand-est-2027-budget.xlsx` | Budget modifiable |
| `asg-grand-est-2027-presentation-partenaires.pptx` | Présentation synthétique pour les partenaires |
| `assets/` | 10 visuels en SVG (source) et PNG (intégration) : logo, affiche, maillots domicile/extérieur, billet, accréditations bénévole/joueur, visuel réseaux J-7, habillage écran, plan d'implantation |

Pour régénérer après modification du concept : `npm run blueprint && npm run exports`.

## 5. Règles de qualité d'un Blueprint

- Aucun chiffre présenté comme certain s'il est estimé : les montants unitaires portent la mention « estimation », les plans la mention « indicative, à valider ».
- Aucune donnée personnelle (bénévoles, joueurs, mineurs) dans un dossier destiné à circuler.
- Le statut de maturité affiché est celui calculé par le moteur, jamais surévalué.
- Toute modification significative incrémente la version du concept (historique dans la section `versions`).
