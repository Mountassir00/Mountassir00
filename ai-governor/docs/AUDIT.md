# Audit critique du cahier des charges (§ 23)

Chaque point : exigence, problème, conséquences, alternative, bénéfice, compromis, et la décision à prendre (GO / NO GO / TEST). Les points marqués **Appliqué** ont été mis en œuvre sans attendre car ils ne retirent rien de validé ; les autres attendent votre arbitrage.

---

### A1. « Analyse les deux vidéos de référence » (§ 4, § 22)
- **Problème** : aucune vidéo n'a été transmise dans cette session. La direction artistique repose sur la description textuelle (isométrique, pastel, contours fins, fond quadrillé, minimaliste, non photoréaliste).
- **Conséquence** : risque d'écart avec ce que vous aviez en tête (proportions des personnages, densité des pièces, rythme des flux).
- **Alternative** : prototypes livrés comme base de discussion ; transmettez les vidéos (ou 3 à 5 captures) et je compare point par point.
- **Décision demandée** : **TEST** — valider la direction sur les prototypes, puis ajuster après réception des références.

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
- **Problème** : coût mémoire, GPU et poids (≈ 150 Ko) injustifiés pour un rendu isométrique.
- **Appliqué** : SVG pour les scènes ; WebGL réservé à une éventuelle expérience de catégorie B chargée uniquement quand elle est active.

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
