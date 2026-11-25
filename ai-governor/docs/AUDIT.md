# Audit critique du cahier des charges (§ 23)

Chaque point : exigence, problème, conséquences, alternative, bénéfice, compromis, et la décision à prendre (GO / NO GO / TEST). Les points marqués **Appliqué** ont été mis en œuvre sans attendre car ils ne retirent rien de validé ; les autres attendent votre arbitrage.

---

### A1. « Analyse les deux vidéos de référence » (§ 4, § 22)
- **Mise à jour v0.3** : 9 vidéos et 12 images reçues ensuite. Chaque vidéo a été découpée en planches d'images (ffmpeg, local) et chaque *type de présentation* (IDE spatial, bureau 3D, kanban, tableau blanc, immeuble, verre flottant, boucle d'équipe, brief, constellation, sphère de nœuds, assistant, QG 3D) est devenu une vue. Les noms, logos et visuels propriétaires des produits de référence ne sont **pas** repris. **v0.4** : seules les 5 vues en favori sont conservées (voir A13).
- **Décision demandée** : **TEST** — essayer les vues sur vos usages réels, puis GO / NO GO vue par vue.

### A2. « Ne présente jamais de statistiques fictives » vs « données réelles » inexistantes (§ 5, § 18)
- **Problème** : le moteur opérationnel n'existe pas encore dans ce dépôt ; aucune activité réelle d'agents n'est observable.
- **Appliqué** : données de démonstration **explicitement étiquetées** partout (bandeau, badge hachuré sur chaque chiffre, cartouche) ; première source **réelle** livrée : l'import local des journaux Claude Code (tokens, modèles, outils, sous-agents, durées — mesurés ; coûts — estimés).
- **Compromis** : les « économies vérifiées » et « dépenses réelles » restent **Indisponibles** tant qu'aucune source de facturation n'est branchée. C'est volontaire.

### A3. « Économies financières vérifiées » (§ 5)
- **Problème** : une économie n'est vérifiable qu'en rapprochant une facture réelle d'un contrefactuel. Sans source de facturation (API Usage & Cost, clé d'administration côté serveur), toute « économie vérifiée » serait inventée.
- **Appliqué** : trois niveaux distincts — *tokens servis par le cache* (mesuré), *coûts évités estimés* (calcul au prix catalogue), *économies vérifiées* (indisponible, avec la raison). La comparaison avant/après indique « corrélation observée, pas une preuve de causalité » et refuse de conclure sous 8 tâches de chaque côté.
- **Décision demandée** : **GO** pour brancher l'API Usage & Cost dans le moteur opérationnel (serveur).

### A4. Un agent animé par département (§ 6, § 9)
- **Problème** : 15 départements représentés par 15 personnages laisseraient croire à 15 agents LLM permanents (coût, faux sentiment d'activité).
- **Appliqué** : 13 moteurs pour 15 départements, dont **4 seulement sont des LLM**. Scripts et services sont dessinés comme des **consoles** (aucun modèle derrière) ; un agent partagé n'apparaît que dans la pièce de sa tâche en cours, les autres pièces montrent un poste vide.

### A5. Analyse automatique de Pinterest, vidéos, Figma, modèles 3D (§ 13)
- **Problème** : récupérer et analyser ces contenus exige soit des appels réseau vers des sites tiers (confidentialité, conditions d'utilisation), soit un modèle de vision (coût en tokens), soit le connecteur Figma (côté serveur).
- **Appliqué** : analyse **locale et déterministe** (palette par k-moyennes, luminosité, saturation, mots-clés, extraction d'une image des vidéos) ; liens conservés sans téléchargement ; brief d'implémentation pour la catégorie B ; bouton « Analyse approfondie par IA » désactivé avec explication.
- **Décision demandée** : **TEST** — activer l'analyse par modèle vision derrière une proposition GO / NO GO chiffrée (≈ quelques centimes par image au prix catalogue, à confirmer).

### A6. Moteurs 3D (Three.js / WebGL) (§ 17)
- **v0.1** : SVG pour les scènes isométriques (coût GPU et poids injustifiés pour de l'isométrique).
- **v0.3** : les références demandent de vraies scènes 3D explorables (bureau fermé, QG, éditeur spatial, sphère de nœuds). Three.js est donc adopté, **uniquement** pour les vues `renderer: 'webgl'`, dans un chunk séparé téléchargé à la première ouverture d'une vue 3D (jamais au démarrage, contrôlé par l'e2e). Exigences imposées au kit 3D (en cours de construction, à vérifier à la livraison) : rendu **à la demande** (aucune boucle permanente), arrêt complet quand l'onglet est masqué ou inactif, ratio de pixels plafonné, niveau `minimal` = image fixe. Repli 2D déclaré dans chaque manifeste (`devices.fallbackId`) si WebGL est indisponible.
- **Compromis** : budget e2e distinct pour les vues 3D (bascule < 1,5 s, car le rendu logiciel des machines de test est lent) ; sur matériel réel la bascule est nettement plus rapide.

### A7. Mesure CPU/GPU (§ 17)
- **Problème** : un navigateur n'expose pas la consommation GPU, et la mémoire JS seulement sous Chromium.
- **Appliqué** : mesures disponibles (images/s, tâches longues, nœuds DOM, mémoire JS si exposée, temps CPU via DevTools dans les tests e2e), et mention « non mesurable » pour le GPU.

### A8. Thèmes et expériences externes (§ 14, § 19)
- **Appliqué** : import limité aux données (schéma strict, couleurs littérales, polices sur liste fermée) ; les variantes importées arrivent en brouillon ; le code ne s'installe que par le dépôt (revue, tests, build).

### A9. Ampleur du périmètre (21 livrables)
- **Problème** : « production graphique définitive » des quatre interfaces avant validation des prototypes = risque de refaire.
- **Appliqué** : conformément au § 22, livraison de **prototypes interactifs fonctionnels** sur un socle définitif (données, moteur, sécurité, tests). La finition graphique (illustrations des personnages, mobilier détaillé, micro-animations) attend votre validation de direction.
- **Décision demandée** : **GO / NO GO** par expérience sur la direction artistique.

### A10. Persistance des préférences
- **Problème** : les préférences (vues par défaut, variantes, thèmes) sont aujourd'hui dans le navigateur (localStorage) : elles ne suivent pas d'un appareil à l'autre.
- **Alternative** : les stocker dans la base du moteur opérationnel (ex. Supabase, déjà connecté à votre environnement) avec synchronisation.
- **Décision demandée** : **GO** au moment de brancher le moteur opérationnel.

### A11. Accès temps réel aux événements
- **Problème** : sans serveur, aucun flux temps réel réel n'est possible depuis le navigateur.
- **Alternative** : journal d'événements côté serveur (Postgres) + diffusion temps réel (abonnement push, pas d'interrogation périodique). L'interface est prête : une source n'a qu'à implémenter `subscribe()`.
- **Décision demandée** : **GO** pour la conception du moteur opérationnel (chantier séparé).

### A12. Arborescence du dépôt
- **Constat** : le seul dépôt disponible est votre dépôt de profil GitHub (`Mountassir00/Mountassir00`). Le projet est isolé dans `ai-governor/` pour ne pas toucher au README du profil.
- **Recommandation** : **GO** pour déplacer le projet dans un dépôt dédié (privé) avant d'y brancher des données réelles.

### A13. Nombre de vues (v0.3 : 21 vues ; v0.4 : 5 vues retenues)
- **Problème** : 21 présentations des mêmes données, c'est un coût de maintenance réel (chaque évolution du modèle de données touche 21 rendus) et un risque de dispersion : on passe d'une vue à l'autre au lieu de décider.
- **Appliqué** : (1) toutes les vues lisent le même journal via le SDK, donc un changement de données ne casse aucune vue tant que le SDK reste stable ; (2) lanceur (touche G) + favoris : seules 5 vues apparaissent dans l'en-tête et la barre latérale ; (3) ajouter ou supprimer une vue = ajouter ou supprimer un dossier, sans toucher au cœur ; (4) les tests de bout en bout découvrent les vues automatiquement.
- **Recommandation** : après une semaine d'usage, gardez 4 à 6 vues (une par question réelle : « combien ça coûte », « qui fait quoi maintenant », « qu'est-ce qui bloque », « qu'est-ce que je dois arbitrer », « que s'est-il passé ») et désactivez le reste dans la Galerie. Les vues désactivées ne coûtent rien à l'exécution (jamais chargées).
- **Décision prise (v0.4)** : seules les vues en favori sont conservées : Control Center, Espace spatial, Kanban des tâches, AI Office, AI System Map. Les 16 autres dossiers ont été supprimés (AI Modular Office et Hub central, Journal opérationnel, Tableau blanc, Équipe d'agents, Boîte de réception, Bureau 3D, QG 3D, Siège, Éditeur spatial, Vision, Boucle d'équipe, Brief du matin, Constellation et Sphère réseau, Assistant). Ils restent dans l'historique git (dernier état complet : branche `archive/ai-governor-v0.3`, commit `ed39849`, conservé même après une fusion par squash) : restaurer une vue = restaurer son dossier.
- **Conséquences assumées** : AI Modular Office faisait partie des quatre interfaces du cahier des charges initial ; le Journal servait de preuve d'extensibilité (la preuve reste : 16 vues ajoutées puis retirées sans toucher au cœur). Sans l'Éditeur spatial, la disposition de l'Espace spatial n'est plus modifiable depuis l'interface (disposition par défaut, modifiable par code via `setLayout`).
