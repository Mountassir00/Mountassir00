# 06 — Roadmap sur 12 mois, conditions de passage, budget

Hypothèses (à corriger) : un développeur, vous, assisté par l'IA, avec 4 à 8 h par semaine, un Mac
personnel et un budget d'exploitation inférieur à 30 €/mois. Les durées sont des estimations, pas des
engagements.

**Règle de passage** : une phase ne démarre que si la précédente est **utilisée**. Une démonstration ne
suffit pas.

## Phases

| Phase | Contenu | Durée estimée | Coût mensuel | Condition de passage (mesurable) |
|---|---|---|---|---|
| **0 Fondations** ✅ | audit, architecture, classification, permissions, schéma, benchmark | fait | 0 | — |
| **1 CORE** ✅ (MVP 1) | mémoire, import, recherche, classification, export, sauvegarde, MCP stdio | fait | 0 | **30 jours d'usage** : ≥ 3 sessions par semaine, ≥ 100 mémoires validées, taux de rejet des candidats IA entre 20 et 60 % |
| **2 Passerelle universelle** | MCP **Streamable HTTP** + **OAuth 2.1** ; tunnel (Cloudflare Tunnel ou Tailscale Funnel) ou petit VPS UE ; politique par client ; OpenTelemetry ; tests d'intrusion de l'endpoint | 3–5 sem. | 0–10 € | claude.ai et ChatGPT connectés ; 0 accès non autorisé dans les tests ; endpoint revu par un test d'intrusion |
| **3 ONE PRIVATE (noyau)** | **journal décisionnel** (spec §65), objectifs et tâches minimaux, briefing quotidien généré *par l'assistant* depuis un paquet de contexte, profil rédactionnel par corrections | 4–6 sem. | coût LLM (2–15 €) | ≥ 10 décisions journalisées avec revue à 30 jours ; briefing utilisé ≥ 4 jours sur 7 |
| **4 CORTEX (minimal)** | check-in émotionnel facultatif (C4, base dédiée), Emotional DNA, 3 exercices cognitifs, **statistiques descriptives seulement** | 4 sem. | 0 | **60 jours de données** avant toute corrélation ; aucune prédiction avant 90 jours |
| **5 APEX** | bibliothèque de modèles, éditeur de qualités, arbre de compétences, *conseil* simulé | 4–6 sem. | coût LLM | utilisé pour ≥ 2 décisions réelles ; Shadow Analysis active |
| **6 REPRESENTATIVE** | instance **isolée**, pare-feu de divulgation sur 5 niveaux, escalade, brouillons à valider | 8–12 sem. | 5–20 € | 100 % des tests de confidentialité ; **avis juridique** obtenu ; mode brouillon seulement pendant 30 jours |
| **7–10** | OS spécialisés, agents, Command Center, intelligence avancée | au-delà de 12 mois | — | décidé au bilan du 6ᵉ mois |

## Calendrier proposé

| Période | Focus |
|---|---|
| M1 (déc. 2026) | Usage réel de CORE, import de vos exports, correctifs des frictions |
| M2–M3 | Phase 2 (accès depuis claude.ai et ChatGPT) |
| M3–M4 | Phase 3 : journal décisionnel, puis briefing |
| M5 | **Bilan du 6ᵉ mois anticipé** : continuer, ajuster, pivoter ou arrêter ; décision sur CORTEX |
| M6–M8 | Phase 4 minimale (si les données le justifient) |
| M8–M10 | Phase 5 |
| M10–M12 | Étude de la Phase 6 + avis juridique ; étude de commercialisation **si** le test des 10 entretiens a été concluant |

**Ce qui est volontairement repoussé** : application mobile, interface vocale, gamification, 7 directions
artistiques, multi-agents, prédictions émotionnelles. Raison : coût élevé, valeur nulle sans données.
L'interface graphique minimale (Memory Control Center web en local, en lecture et validation) peut entrer
en M2 si la CLI freine la validation des candidats.

## Budget

| Configuration | Contenu | Mensuel |
|---|---|---|
| **Minimale** (actuelle) | local seulement, clients stdio | **0 €** + abonnements IA existants |
| Intermédiaire | + tunnel gratuit ou VPS UE (~5 €), embeddings locaux (Ollama) | 5–15 € |
| Avancée | + VPS dédié avec Postgres et pgvector, sauvegardes hors site (S3 UE), supervision | 25–60 € |

Prix indicatifs non vérifiés pour les VPS (voir doc 04, « non vérifié »). Le coût dominant est **votre
temps**, pas l'infrastructure.

## Prochaines actions prioritaires

1. **Vous** :
   - installer ;
   - importer vos exports ChatGPT et Claude ;
   - brancher Claude Desktop ;
   - saisir 30 mémoires clés (valeurs, objectifs, règles de travail).
2. **Vous** : remonter les frictions et les erreurs de parseur sur les vrais exports.
3. **Ensuite** : Phase 2, en commençant par l'ADR sur le choix entre tunnel et VPS et sur le fournisseur
   OAuth.
