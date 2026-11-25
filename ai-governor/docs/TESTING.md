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

## Derniers résultats (25 nov. 2026, Chromium headless sans GPU, 1440×900, données de démonstration)

**Unitaires : 37/37. Bout en bout : 52/52** (5 vues, aucune erreur JavaScript).

| Vue | Bascule (horloge murale) | Images/s | Tâches longues (3 s) | Nœuds DOM | CPU occupé |
|---|---|---|---|---|---|
| Control Center | 49 ms | 61 | 0 | 1 274 | 5 % |
| Espace spatial (3D) | 613 ms | 60 | 0 | 1 033 | 2 % |
| Kanban des tâches (depuis la scène 3D) | 183 ms | 60 | 0 | 1 585 | 1 % |
| AI Office | 101 ms | 61 | 0 | 1 685 | 2 % |
| AI System Map | 166 ms | 60 | 0 | 1 306 | 3 % |

La bascule vers l'Espace spatial inclut le premier chargement de Three.js ; celle qui le quitte inclut la libération du contexte WebGL. La mémoire JS reste à 19 Mo après le passage par les 5 vues.

Accessibilité : aucune violation axe *serious* ou *critical* sur les 5 vues (clair et sombre), le centre de décision, la galerie, le studio, le builder, les données et les réglages.

Historique : la v0.3 comptait 21 vues (164/164 vérifications) ; seules les 5 vues en favori ont été conservées en v0.4 (voir `AUDIT.md`, A13).

### Sobriété adaptative des scènes 3D

Le test tourne **sans GPU** : WebGL y est rastérisé par le processeur (SwiftShader). Une première passe (v0.3) a mesuré 96 à 98 % de CPU sur les scènes 3D, parce que les flux animés entretenaient une boucle continue dont chaque image coûte 150 à 300 ms en rendu logiciel. Trois corrections :

1. **Détection du rendu logiciel** (SwiftShader, llvmpipe…) ou d'une boucle qui ne tient pas sa cadence (images trois fois plus espacées que prévu, 12 fois de suite) : la scène ne s'anime plus qu'aux changements d'état réels (comme en « économique »), passe à un ratio de pixels de 1 et coupe les ombres portées. Un message l'indique (visible 8 s, puis réservé aux lecteurs d'écran) et `stats().slow` donne la raison.
2. **Plus d'image WebGL pour rien** : les étiquettes se replacent sans redessiner la scène quand seul leur texte change, et les tableaux et flux de l'Espace spatial ne sont redessinés que si leur contenu change (l'horloge avance chaque seconde).
3. **Intensité des flux par paliers** : un appel de plus ne reconstruit plus les tubes.

Résultat dans les mêmes conditions (mesuré en v0.3) : Espace spatial de 96 % à 10 % (2 % au dernier passage), et de 96–98 % à 3–37 % sur les deux autres scènes 3D retirées depuis. **Limite** : ce test mesure donc le mode économe de la scène 3D. Sur un poste avec GPU, la boucle continue (flux animés en « standard ») n'est pas mesurée ici.

### Coût CPU par niveau de rendu (scène active, 5 s, sans interaction ; mesure v0.1, Modular Office retirée depuis)

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
| Application (React, shell, moteur, validation, design system, manifestes et vignettes) | 458 Ko | 141 Ko | au démarrage |
| Control Center, Kanban, AI Office, AI System Map | 20 à 45 Ko | 7 à 13 Ko | à la demande |
| Espace spatial, Three.js et kit 3D compris | 705 Ko | 184 Ko | à la première ouverture de la vue |
| Générateur de démo | 26 Ko | 9 Ko | uniquement en mode démo |
| Pages d'administration | 5 à 19 Ko | 2 à 8 Ko | à l'ouverture |

Piste d'optimisation : passer la validation à `zod/mini` (≈ −20 Ko gzip au démarrage).

### Limites des mesures
- Machine de test sans GPU (rendu logiciel) : le CPU inclut la rastérisation, il est donc majoré par rapport à un poste réel.
- La consommation GPU n'est pas mesurable depuis un navigateur ; la mémoire JS n'est exposée que par Chromium.
