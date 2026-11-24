# Tests de performance et d'accessibilité

## Lancer

```bash
npm run check                 # TypeScript strict + 35 tests unitaires + build
npm run build && npm run test:e2e   # Playwright (Chromium) + axe-core
```

Le rapport détaillé (JSON) et les captures sont écrits dans `tests/e2e/output/` (non versionné).

## Tests unitaires (Vitest)

| Domaine | Ce qui est vérifié |
|---|---|
| Schéma | Événements invalides rejetés, valides acceptés |
| Démo | ≥ 3 000 événements, 100 % `demo`, déterministe, jamais dans le futur |
| Projection & replay | `projectAt(t)` identique à un repli complet, en accès direct et en lecture continue ; le replay ne modifie pas l'état en direct ; déduplication ; lot hors ordre |
| Expurgation | Clés Anthropic, jetons GitHub, `Bearer`, `password=` masqués avant le journal |
| Passerelle de commandes | Replay = lecture seule ; source en lecture seule ; permissions par rôle ; refus des dépenses depuis un double-clic/glisser ; saisie « CONFIRMER » pour les modifications durables |
| Sélecteurs | Conservation des totaux par intervalle ; avant/après refuse de conclure sur petit échantillon ; estimation de coût |
| Import Claude Code | Aucun contenu de message, commande ou réponse conservé ; usage dédupliqué par message ; erreurs d'outils ; import réel du journal local sans rejet |
| Registre | Manifestes valides et uniques ; paramètres bornés ; dupliquer → personnaliser → publier → supprimer ; intégrées non supprimables ; choix par projet/appareil |
| Import/export | Aller-retour ; refus du contenu exécutable, de `url(…)`, des clés inconnues, des variantes orphelines ; import toujours en brouillon |
| Thèmes & sobriété | Thèmes intégrés valides ; réduction des mouvements ⇒ jamais d'animation d'ambiance |
| Frontières | Imports des expériences limités ; `core/` sans UI ; `engine/` sans shell ; aucun client LLM dans la présentation |

## Tests de bout en bout (Playwright + axe-core)

| Vérification | Résultat attendu |
|---|---|
| Au démarrage, seul le moteur de rendu actif est téléchargé | aucun chunk d'une autre expérience |
| Pour chaque vue installée (liste lue dans `window.__mag.views()`, donc toute vue ajoutée est testée) : agent sélectionné, période et filtre conservés après bascule par le lanceur | inspecteur toujours ouvert sur le même agent |
| Durée de bascule (de la touche Entrée à l'affichage) | < 400 ms ; scènes WebGL : < 1 500 ms (chargement de Three.js compris) |
| Nœuds DOM | < 6 000 |
| Tâches longues sur 3 s | ≤ 6 ; scènes WebGL : ≤ 12 |
| Aucune navigation (rechargement) pendant les bascules | 0 |
| Journal d'événements | jamais réinitialisé |
| Requêtes vers un fournisseur LLM depuis l'interface | 0 |
| axe (WCAG 2.1 A/AA) : toutes les vues en clair et en sombre, centre de décision, galerie, studio, builder, données, réglages | aucune violation « serious » ou « critical » |
| Replay | boutons GO / NO GO / TEST désactivés |
| Onglet masqué | `data-anim=paused`, horloge d'animation arrêtée |
| `prefers-reduced-motion` | pas d'animation d'ambiance |
| Mobile 390 px, toutes les vues | aucun défilement horizontal, aucune erreur JS |

## Derniers résultats (24 nov. 2026, Chromium headless sans GPU, 1440×900, données de démonstration)

**Unitaires : 37/37. Bout en bout : 164/164** (21 vues, aucune erreur JavaScript).

| Vue | Bascule (horloge murale) | Images/s | Tâches longues (3 s) | Nœuds DOM | CPU occupé |
|---|---|---|---|---|---|
| Control Center | 35 ms | 61 | 0 | 1 292 | 2 % |
| AI Office | 178 ms | 61 | 0 | 1 672 | 2 % |
| AI System Map | 117 ms | 60 | 0 | 1 300 | 3 % |
| AI Modular Office | 136 ms | 61 | 0 | 1 505 | 2 % |
| Hub central | 146 ms | 60 | 0 | 1 330 | 3 % |
| Journal opérationnel | 97 ms | 61 | 0 | 648 | 2 % |
| Espace spatial (3D) | 527 ms | 56 | 1 | 1 050 | 10 % |
| Kanban des tâches | 196 ms | 61 | 0 | 1 636 | 2 % |
| Tableau blanc | 202 ms | 61 | 0 | 1 055 | 2 % |
| Équipe d’agents | 140 ms | 60 | 0 | 1 116 | 4 % |
| Boîte de réception | 106 ms | 61 | 0 | 695 | 2 % |
| Bureau 3D (3D) | 575 ms | 59 | 0 | 875 | 3 % |
| QG 3D (3D) | 243 ms | 40 | 4 | 952 | 37 % |
| Siège | 156 ms | 60 | 0 | 1 111 | 4 % |
| Éditeur spatial (3D) | 391 ms | 59 | 0 | 937 | 5 % |
| Vision | 330 ms | 60 | 0 | 1 424 | 7 % |
| Boucle d’équipe | 189 ms | 60 | 0 | 766 | 6 % |
| Brief du matin | 211 ms | 61 | 0 | 787 | 2 % |
| Constellation | 129 ms | 60 | 0 | 866 | 9 % |
| Sphère réseau | 95 ms | 60 | 0 | 866 | 10 % |
| Assistant | 59 ms | 60 | 0 | 623 | 3 % |

Les bascules des scènes 3D incluent le chargement de Three.js (chunk partagé de 656 Ko, 169 Ko gzip, téléchargé une seule fois) ; une bascule qui quitte une scène 3D inclut la libération de son contexte WebGL. La mémoire JS reste à 22 Mo après le passage par les 21 vues.

Accessibilité : aucune violation axe *serious* ou *critical* sur les 21 vues (clair et sombre), le centre de décision, la galerie, le studio, le builder, les données et les réglages.

### Sobriété adaptative des scènes 3D

Le test tourne **sans GPU** : WebGL y est rastérisé par le processeur (SwiftShader). Une première passe a mesuré 96 % de CPU sur l'Espace spatial, le Bureau 3D et le QG 3D, parce que les flux animés entretenaient une boucle continue dont chaque image coûte 150 à 300 ms en rendu logiciel. Trois corrections :

1. **Détection du rendu logiciel** (SwiftShader, llvmpipe…) ou d'une boucle qui ne tient pas sa cadence (images trois fois plus espacées que prévu, 12 fois de suite) : la scène ne s'anime plus qu'aux changements d'état réels (comme en « économique »), passe à un ratio de pixels de 1 et coupe les ombres portées. Un message l'indique (visible 8 s, puis réservé aux lecteurs d'écran) et `stats().slow` donne la raison.
2. **Plus d'image WebGL pour rien** : les étiquettes se replacent sans redessiner la scène quand seul leur texte change, et les tableaux et flux de l'Espace spatial ne sont redessinés que si leur contenu change (l'horloge avance chaque seconde).
3. **Intensité des flux par paliers** : un appel de plus ne reconstruit plus les tubes.

Résultat dans les mêmes conditions : Espace spatial de 96 % à 10 %, Bureau 3D de 96 % à 3 %, QG 3D de 98 % à 37 % (ce dernier redessine encore à chaque échange réel entre pièces). **Limite** : ce test mesure donc le mode économe des scènes 3D. Sur un poste avec GPU, la boucle continue (flux animés en « standard », personnages en « haute qualité ») n'est pas mesurée ici.

### Coût CPU par niveau de rendu (scène active, 5 s, sans interaction)

| Niveau | AI Office | System Map | Modular Office | Ce qui bouge |
|---|---|---|---|---|
| Minimaliste | 0,5 % | 0,4 % | 0,3 % | rien |
| Économique | 0,3 % | 0,3 % | 0,4 % | repères ponctuels sur changement d'état |
| Standard (défaut) | 0,3 % | 2,8 % | 0,3 % | pictogrammes de statut, flux actifs (par paliers) |
| Haute qualité | 10,5 % | 12 % | 9,7 % | personnages, voyants, équipements, flux |

Une première mesure a montré qu'en « standard » les animations CSS tournaient à la fréquence de l'écran (≈ 9 % CPU, 60 recalculs de style par seconde) : le niveau standard a été redéfini (mouvement complet réservé à la haute qualité, animations restantes par paliers), ce qui a divisé le coût par 3 à 30. Après 90 s d'inactivité ou onglet masqué, toutes les animations s'arrêtent (≈ 0 %).

### Poids chargé

| Élément | Brut | gzip | Chargé |
|---|---|---|---|
| Application (React, shell, moteur, validation, design system, manifestes et vignettes des 21 vues) | 519 Ko | 158 Ko | au démarrage |
| Une vue 2D | 7 à 73 Ko | 3 à 23 Ko | à la demande |
| Une vue 3D | 43 à 67 Ko | 15 à 24 Ko | à la demande (plus Three.js) |
| Three.js et le kit 3D | 656 Ko | 169 Ko | à la première vue 3D seulement |
| Générateur de démo | 26 Ko | 9 Ko | uniquement en mode démo |
| Pages d'administration | 5 à 19 Ko | 2 à 8 Ko | à l'ouverture |

Pistes d'optimisation : passer la validation à `zod/mini` (≈ −20 Ko gzip au démarrage) ; ne charger les vignettes SVG qu'à l'ouverture du lanceur ou de la galerie.

### Limites des mesures
- Machine de test sans GPU (rendu logiciel) : le CPU inclut la rastérisation, il est donc majoré par rapport à un poste réel.
- La consommation GPU n'est pas mesurable depuis un navigateur ; la mémoire JS n'est exposée que par Chromium.
