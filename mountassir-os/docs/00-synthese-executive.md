# 00 — Synthèse exécutive

Version 0.1, du 2026-11-24. Statut : Phase 0 terminée, MVP 1 implémenté et testé, rien n'est déployé.

## Diagnostic (3 constats)

1. **La spécification décrit un programme pluriannuel, pas un projet.** Elle compte 10 phases, plus de 100
   livrables et une quarantaine de modules.
   - Seul avec l'aide d'IA, CORE se construit en quelques semaines.
   - ONE, CORTEX et APEX demandent chacun plusieurs mois.
   - Le Représentant externe exige en plus une maturité juridique et sécuritaire élevée.
   - Le risque n°1 n'est pas technique : c'est la **dispersion**, c'est-à-dire construire l'infrastructure
     au lieu de s'en servir.
2. **Tout le reste dépend de CORE et des données accumulées.** Jumeau, prédictions et statistiques
   personnelles sont inutiles sans des mois d'historique propre, typé et sourcé.
   - Ce qui se cumule (*compounding*), ce sont les données. Le code, lui, se réécrit.
   - Il fallait donc commencer par la mémoire, et commencer à l'alimenter tout de suite.
3. **Le marché de la mémoire IA est encombré, mais un angle semble vacant.**
   - Les acteurs présents : Mem0, Zep, Letta, Supermemory, Basic Memory.
   - Dans la documentation consultée, aucun ne combine typage épistémique, validation par le propriétaire,
     niveaux de classification et politique déterministe, en local.
   - C'est une **hypothèse à tester**, pas un fait (voir [04 §E](04-benchmark-et-connecteurs.md)).

## Ce qui a été construit (vérifié par tests)

MOUNTASSIR CORE MVP 1 se compose d'une bibliothèque Python, d'une CLI `mcore` et d'un serveur MCP stdio.

Les **10 critères du MVP 1** (spec §126) passent :

| Critère | Résultat |
|---|---|
| Import depuis une IA et provenance | OK |
| Une seconde IA autorisée retrouve l'information | OK |
| Une IA non autorisée en est empêchée | OK |
| Correction versionnée | OK |
| Suppression avec cascade sur les données dérivées | OK, effacement physique compris |
| Journalisation | OK |
| Export | OK |
| Sauvegarde et restauration | OK |

Sur les **25 scénarios critiques** de la spec §106 :
- **15 sont couverts** par des tests automatisés : injection, usurpation, contradictions, quotas,
  modification de permissions, import interrompu, tiers, aspiration/trait, index vectoriel, révocation,
  restauration, indépendance du fournisseur, etc. ;
- **5 sont partiels** ;
- **5 relèvent de phases ultérieures** (Représentant, Approval Center, prédictions).

Le détail est dans [05](05-plan-de-tests.md). Au total, 41 tests passent.

Deux décisions de sécurité vont au-delà de la spec :
- **Pas d'écriture descendante.** Un agent ne peut pas écrire en dessous de son propre niveau
  d'habilitation. Cela empêche un agent C3 de « blanchir » une information privée en C0.
- **Report des suppressions lors d'une restauration.** Restaurer une vieille sauvegarde ne ressuscite ni
  les données effacées ni les jetons révoqués après cette sauvegarde.

Un test a révélé une vraie fuite : la requête textuelle d'un paquet de contexte survivait à la suppression
de la mémoire. Elle est corrigée et couverte par un test.

## Ce qui n'est pas fait (honnêtement)

- **Clients web** (claude.ai, ChatGPT, Gemini…) : ils exigent un MCP **distant HTTPS + OAuth**. C'est la
  Phase 2. Aujourd'hui, seuls Claude Desktop, Claude Code, Codex, Antigravity CLI et Kimi CLI se connectent.
- **Chiffrement au repos** au niveau des champs : absent. Il faut compter sur le chiffrement du disque.
- **Authentification forte du propriétaire** (MFA, passkeys) : absente. L'accès local tient lieu
  d'authentification.
- **Recherche sémantique réelle** : l'index vectoriel actuel est lexical (trigrammes). L'interface permet
  de brancher un modèle local, par exemple via Ollama.
- **Formats d'export** : les parseurs sont testés sur des exports **synthétiques**. Aucun export réel n'a
  encore été essayé.
- **Hors périmètre de cette itération** : ONE, CORTEX, APEX, STRATEGY, EXECUTIVE, REPRESENTATIVE et
  l'interface graphique.

## Enjeu réel

La question n'est pas « comment tout construire ». C'est **« quel est le plus petit système que vous
utiliserez chaque jour et qui produira, dans 6 mois, des données qu'aucun fournisseur ne peut vous
retirer ? »**. CORE MVP 1 répond à la première moitié de cette question. La seconde dépend de votre usage.

## Recommandation (confrontation des deux perspectives)

- **Contextualisée** (votre spec, vos ambitions) : la tentation est d'enchaîner directement ONE et CORTEX.
- **Indépendante** (un entrepreneur sans historique) :
  - un outil personnel n'a de valeur que s'il est utilisé ;
  - la mesure d'émotions et de cognition sur une seule personne demande au moins 60 à 90 jours de données
    avant toute statistique honnête ;
  - le Représentant externe concentre le risque juridique et réputationnel.

**Recommandation : scénario équilibré.**

| Scénario | Contenu | Investissement | Risque | Réversibilité |
|---|---|---|---|---|
| Sécurisé | Utiliser CORE en local seul pendant 30 jours, aucun développement | ~0 € ; 2 h/sem | faible | totale |
| **Équilibré (recommandé)** | 30 jours d'usage réel. En parallèle, Phase 2 (MCP distant + OAuth) puis Journal décisionnel. CORTEX et APEX restent gelés jusqu'au bilan des 60 jours | 5–20 €/mois (VPS ou tunnel) ; 4–6 h/sem | moyen (exposition réseau) | élevée |
| Agressif | Phases 2, 3 et 4 en parallèle, plus une étude de commercialisation | 50–150 €/mois ; plus de 15 h/sem | élevé : dispersion, dette de sécurité | moyenne |

Condition d'arrêt de l'agressif : moins de 3 sessions d'usage réel par semaine pendant 2 semaines. Dans ce
cas, on revient au sécurisé.

**Coût de l'inaction** : chaque mois sans capture, ce sont des conversations, des décisions et des
préférences perdues ou enfermées chez un fournisseur. Ce coût est invisible mais cumulatif.

## Exécution

- **Aujourd'hui** : installer, `mcore init`, importer vos exports ChatGPT et Claude, brancher Claude
  Desktop ou Claude Code.
- **7 jours** :
  - saisir à la main 30 souvenirs à forte valeur : valeurs, objectifs, préférences de travail, décisions
    récentes ;
  - valider ou rejeter les propositions de l'IA ;
  - noter les frictions.
- **30 jours** : bilan sur 4 indicateurs, puis décision de lancer ou non la Phase 2.

| Indicateur | Seuil |
|---|---|
| Sessions avec CORE par semaine | ≥ 3 |
| Mémoires validées | ≥ 100 |
| Taux de rejet des candidats IA (trop bas = complaisance, trop haut = bruit) | 20 à 60 % |
| Réponses d'assistant améliorées par le contexte, selon votre jugement | ≥ 1 par semaine |

## Angle patrimoine (à ne pas confondre avec le produit personnel)

MOUNTASSIR OS est d'abord un **levier personnel**, pas un revenu. Si vous voulez en faire un actif
commercialisable, voici un **test de validation en 7 jours, sans écrire de code** :
- mener 10 entretiens avec des professionnels soumis au secret ou à la confidentialité (avocats, médecins,
  conseillers en gestion de patrimoine, consultants en Europe) ;
- leur poser une question : « Comment gérez-vous la mémoire de vos assistants IA vis-à-vis de vos
  obligations de confidentialité ? » ;
- seuil de poursuite : au moins 3 personnes qui décrivent spontanément le problème et acceptent un appel de
  démonstration payant ou une précommande.

Sans ce signal, on ne construit pas de multi-tenant.

## Risques principaux

1. **Sécurité locale.** Un assistant doté d'un accès shell sur la même machine contourne les règles. Parade :
   un compte système dédié.
2. **Données sensibles.** Mesures en place : classification C4 par défaut pour l'émotionnel et les sujets
   détectés, C5 interdit. Le RGPD et les données de tiers sont traités en [02](02-gouvernance-securite-et-donnees.md).
   Ce n'est pas un conseil juridique.
3. **Dispersion.** La roadmap impose des conditions de passage entre phases ([06](06-roadmap.md)).
4. **Dépôt public.** Le code se trouve dans votre dépôt de profil GitHub. Rien de personnel n'y est commité,
   mais un **dépôt privé dédié** est recommandé pour la suite.
