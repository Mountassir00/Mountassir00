# 08 — Registre des décisions architecturales (ADR)

Format (spec §108) : problème, options, décision, justification, coût, risques, réévaluation, statut.

---

## ADR-0001 — Monolithe modulaire en Python, façade unique

- **Date / statut** : 2026-11-24 · accepté.
- **Problème** : livrer vite une base fiable et maintenable par une seule personne, sans sacrifier les
  frontières de sécurité CORE / ONE.
- **Options** :
  1. Microservices.
  2. Monolithe modulaire.
  3. Framework de mémoire existant (Mem0, Letta).
- **Décision** : option 2, en Python. Tout passe par `core.Core` (garde → transaction → politique → audit).
  La CLI et le MCP ne sont que des adaptateurs.
- **Justification** :
  - coût d'exploitation nul ;
  - un seul processus à sécuriser ;
  - écosystème IA et SDK MCP officiel disponibles ;
  - les frontières sont testées au niveau de la façade.
- **Risques** : la façade grossit (≈ 1 200 lignes). Il faudra la découper par domaine en Phase 3.
- **Réévaluation** : déploiement multi-machines, ou plus d'un développeur.

## ADR-0002 — SQLite (FTS5, WAL, secure_delete) maintenant, PostgreSQL + pgvector plus tard

- **Date / statut** : 2026-11-24 · accepté.
- **Problème** : la spec cite PostgreSQL + pgvector comme référence. Pour un usage personnel local, cela
  demande un service à faire tourner, à sauvegarder et à sécuriser.
- **Options** :
  1. Postgres local.
  2. Supabase.
  3. SQLite.
- **Décision** : SQLite, un fichier unique.
- **Justification** :
  - portabilité totale : un fichier, aucune opération à gérer ;
  - sauvegarde par instantané ;
  - `secure_delete` pour l'effacement physique ;
  - même choix que Basic Memory et Cognee par défaut (doc 04) ;
  - le plan gratuit de Supabase se met en pause après 7 jours d'inactivité, ce qui est incompatible avec
    une mémoire toujours disponible.
- **Risques** :
  - un seul écrivain : WAL et `busy_timeout` suffisent à l'échelle personnelle ;
  - FTS5 absent de certains SQLite Linux : vérifié au démarrage ;
  - recherche vectorielle limitée.
- **Réévaluation** : MCP distant toujours actif en multi-appareils, écritures concurrentes, plus de
  100 000 éléments vectoriels. La migration passe par l'export JSON v1 (doc 03 §5).

## ADR-0003 — MCP comme contrat de la passerelle ; stdio d'abord, Streamable HTTP ensuite

- **Date / statut** : 2026-11-24 · accepté.
- **Problème** : alimenter Claude, ChatGPT, Gemini, Mistral, des modèles locaux… sans dépendre d'aucun.
- **Décision** :
  - utiliser MCP (SDK Python officiel v2, révision du protocole 2026-07-28) ;
  - commencer par stdio (Claude Desktop, Claude Code, Codex, Antigravity CLI) ;
  - les clients web exigent du Streamable HTTP public avec OAuth 2.1 : ce sera la Phase 2.
- **Justification** :
  - standard ouvert, adopté par tous les grands assistants (doc 04 §C) ;
  - en stdio, les identifiants viennent de l'environnement, ce qui est conforme à la spécification.
- **Risques** :
  - protocole jeune, avec des changements cassants en 2026-07 : le SDK et le repli v1 sont épinglés ;
  - exposer un endpoint public augmente la surface d'attaque.
- **Réévaluation** : à chaque révision majeure du protocole.

## ADR-0004 — Politique déterministe, appliquée avant la récupération, indépendante des LLM

- **Date / statut** : 2026-11-24 · accepté.
- **Problème** : la spec §81 interdit de protéger les données par un prompt.
- **Décision** : les règles (statut, plafond, catégories, expiration, sujet, quarantaine) sont **compilées en
  clauses SQL** et appliquées dans la requête elle-même. CORE n'appelle aucun LLM.
- **Justification** : une donnée non autorisée n'est jamais chargée. Le comportement est explicable,
  testable et reproductible.
- **Coût** : il n'y a pas d'extraction automatique de souvenirs dans CORE. Elle est déléguée aux agents
  (ONE ou les assistants), qui proposent des candidats.

## ADR-0005 — Pas d'écriture descendante pour les agents (propriété * de Bell–LaPadula)

- **Date / statut** : 2026-11-24 · accepté (ajout au-delà de la spec).
- **Problème** : un agent habilité C3 lit du C3 et peut proposer une mémoire C0 qui en est dérivée. Une
  information privée serait alors « blanchie » vers des agents moins habilités.
- **Décision** : classification d'un candidat d'agent = max(demandée, plafond de l'agent, preuves,
  catégorie, scan). Le propriétaire peut ensuite abaisser la classification en connaissance de cause.
- **Risque** : sur-classification, donc moins de partage. C'est acceptable : le refus par défaut est un
  principe de la spec.

## ADR-0006 — Report des suppressions et révocations lors d'une restauration

- **Date / statut** : 2026-11-24 · accepté (ajout au-delà de la spec).
- **Problème** : restaurer une sauvegarde ancienne ressusciterait des données effacées (atteinte au droit à
  l'effacement) et des jetons révoqués (faille).
- **Décision** : les tombstones (sans contenu), les révocations et les interrupteurs actifs sont reportés
  de la base courante vers la base restaurée.
- **Risque** : si la base courante est illisible, rien ne peut être reporté. Un avertissement explicite est
  alors émis.

## ADR-0007 — Paquets de contexte par référence, sans contenu ni requête stockés

- **Date / statut** : 2026-11-24 · accepté (issu d'un test qui a révélé une fuite).
- **Problème** : un paquet qui stocke du contenu, ou la requête textuelle de l'agent, conserve une copie de
  données que le propriétaire peut avoir supprimées ou reclassées.
- **Décision** :
  - stocker uniquement les identifiants, la finalité et l'expiration ;
  - assembler le contenu en direct, sous la politique courante ;
  - supprimer tout paquet qui cite une mémoire supprimée.
- **Justification** : la suppression devient vérifiable physiquement (test). Une reclassification
  s'applique immédiatement.

## ADR-0008 — Index vectoriel lexical par défaut, modèle d'embedding enfichable

- **Date / statut** : 2026-11-24 · accepté, à réévaluer.
- **Décision** : utiliser un `HashingEmbedder` (trigrammes de caractères, déterministe, local, gratuit). Un
  vrai modèle se branchera via le protocole `Embedder`, par exemple un modèle local servi par Ollama.
- **Justification** :
  - aucune dépendance réseau ni coût ;
  - permet de tester la purge de l'index vectoriel (scénario 20) ;
  - tolère les fautes et les flexions.
- **Réévaluation** : dès que la qualité de rappel gêne l'usage réel, ou en Phase 2.
