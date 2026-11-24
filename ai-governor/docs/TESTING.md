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

## Derniers résultats (24 nov. 2026, Chromium headless, 1440×900, données de démonstration)

**Unitaires : 35/35. Bout en bout : 51/51.**

| Expérience | Bascule (horloge murale) | Images/s | Tâches longues (3 s) | Nœuds DOM | Mémoire JS | CPU occupé |
|---|---|---|---|---|---|---|
| Control Center | 26 ms | 61 | 0 | 1 020 | 17 Mo | 2 % |
| AI Office | 71 ms | 61 | 0 | 1 598 | 17 Mo | 2 % |
| AI System Map | 37 ms | 60 | 0 | 1 227 | 17 Mo | 4 % |
| AI Modular Office | 53 ms | 61 | 0 | 896 | 17 Mo | 2 % |
| Journal opérationnel | 22 ms | 61 | 0 | 522 | 17 Mo | 1 % |

Accessibilité : aucune violation axe *serious* ou *critical* sur les 5 expériences (clair et sombre), le centre de décision, la galerie, le studio, le builder, les données et les réglages.

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
| Application (React, shell, moteur) | 286 Ko | 90 Ko | au démarrage |
| Validation de schéma (Zod) | 95 Ko | 27 Ko | au démarrage |
| Design system | 38 Ko | 13 Ko | au démarrage |
| Une expérience | 3 à 26 Ko | 2 à 10 Ko | à la demande |
| Générateur de démo | 26 Ko | 9 Ko | uniquement en mode démo |
| Pages d'administration | 5 à 19 Ko | 2 à 8 Ko | à l'ouverture |

Piste d'optimisation identifiée : passer la validation à `zod/mini` (≈ −20 Ko gzip au démarrage).

### Limites des mesures
- Machine de test sans GPU (rendu logiciel) : le CPU inclut la rastérisation, il est donc majoré par rapport à un poste réel.
- La consommation GPU n'est pas mesurable depuis un navigateur ; la mémoire JS n'est exposée que par Chromium.
