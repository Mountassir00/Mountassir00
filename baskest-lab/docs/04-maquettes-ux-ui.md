# 04 — Maquettes UX/UI

Les maquettes sont **l'application elle-même** (`npm run dev`), capturée ici module par module (`docs/screenshots/`, régénérables avec `scripts/screenshots.cjs`). Chaque écran affiche son statut réel : opérationnel, prototype ou dépendant d'une intégration.

## 1. Direction de design

| Choix | Décision | Pourquoi (spécifique à Bask'Est) |
|---|---|---|
| Couleurs | Nuit `#0B1A33` (navigation, tableau de score), parquet froid `#EEF2F7` (fond de travail), orange ballon `#F26B1D` (actions), or Stanislas `#C9A227` (notes), chardon `#7B5EA7` (statut « intégration ») | Reprend la proposition de marque mère Bask'Est (Nancy, place Stanislas, chardon) au lieu d'une palette générique |
| Typographie | Barlow Condensed (titres, chiffres) + Barlow (texte) | Registre des maillots et tableaux d'affichage, une seule famille en deux largeurs |
| Élément signature | La note /100 affichée comme un **tableau de score de salle** (chiffres or sur fond nuit, liseré or) | Une seule audace visuelle ; tout le reste est sobre |
| Structure | Sections et tableaux denses, séparateurs en « ligne de terrain », rayons différenciés (6 px champs, 10 px panneaux, 4 px tableau de score) | Outil de travail : lisibilité et densité avant décoration |
| Navigation | 6 groupes (Pilotage, Veille, Création, Simulation, Production, Écosystème), pastille de statut par module | Passer de l'idée au dossier sans changer d'outil |
| Accessibilité | Focus visible, contrastes AA, `prefers-reduced-motion`, thème clair/sombre/système, tableaux navigables au clavier, mobile sans défilement horizontal | Bénévoles de tous profils, usage sur téléphone le jour J |

## 2. Parcours type : de l'idée au dossier

1. **Générateur** : cocher objectifs et publics, choisir lieu et budget → 3 concepts notés, avec leurs défauts visibles.
2. **Laboratoire** : tester une variante de règle sur 200 tournois simulés.
3. **Simulateur sportif / financier / Programmation / Salles** : ajuster le format, le budget, le planning, l'implantation.
4. **Tableau de notation** : vérifier portes et maturité, ajuster une note avec motif (jury).
5. **Bibliothèque des dossiers** : générer le BASK'EST EVENT BLUEPRINT et ses visuels.
6. **Projets** : transformer le concept en projet daté (rétroplanning complet), suivre les versions.
7. **Intégrations et validations** : demander la publication ; rien ne part sans validation.
8. **Analyse post-événement** : saisir le réalisé → priorités de l'édition suivante.

## 3. Écrans

### Pilotage
| Tableau de bord | Tableau de notation |
|---|---|
| ![Tableau de bord](screenshots/accueil.jpg) | ![Notation](screenshots/notation.jpg) |

| Projets et calendrier | Analyse post-événement |
|---|---|
| ![Projets](screenshots/projets.jpg) | ![Post-événement](screenshots/post-evenement.jpg) |

### Veille
| Observatoire des tendances | Veille basket et multisport |
|---|---|
| ![Tendances](screenshots/tendances.jpg) | ![Veille](screenshots/veille.jpg) |

| Bibliothèque des innovations | Registre des erreurs |
|---|---|
| ![Innovations](screenshots/innovations.jpg) | ![Erreurs](screenshots/erreurs.jpg) |

### Création
| Générateur de concepts | Laboratoire créatif |
|---|---|
| ![Générateur](screenshots/generateur.jpg) | ![Labo](screenshots/labo.jpg) |

| Studio de design | |
|---|---|
| ![Studio](screenshots/studio.jpg) | |

### Simulation
| Configurateur de salles | Simulateur sportif |
|---|---|
| ![Salles](screenshots/salles.jpg) | ![Simulateur sportif](screenshots/simulateur-sportif.jpg) |

| Simulateur financier | Programmation sportive |
|---|---|
| ![Finance](screenshots/simulateur-financier.jpg) | ![Programmation](screenshots/programmation.jpg) |

### Production et écosystème
| Bibliothèque des dossiers | Intégrations et validations |
|---|---|
| ![Dossiers](screenshots/dossiers.jpg) | ![Écosystème](screenshots/ecosysteme.jpg) |

| Notifications | Espaces collaboratifs |
|---|---|
| ![Notifications](screenshots/notifications.jpg) | ![Collaboratif](screenshots/collaboratif.jpg) |

### Mobile (jour J)
![Mobile](screenshots/mobile-accueil.jpg)

## 4. Maquettes d'écrans hors outil (pour le site et l'événement)

Générées par le Studio pour chaque concept (voir `docs/blueprints/asg-grand-est-2027/assets/`) : logo, affiche A4, maillots domicile/extérieur, billet, accréditations (bénévole, joueur), visuel réseaux 1:1, habillage d'écran géant (score + vote MVP). Ce sont des directions artistiques à finaliser par un graphiste.
