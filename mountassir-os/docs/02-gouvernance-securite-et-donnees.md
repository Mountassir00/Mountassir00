# 02 — Gouvernance, sécurité et données

## 1. Classification C0–C5 (spec §80)

| Niveau | Sens | Règle dans CORE |
|---|---|---|
| C0 Public | diffusion publique autorisée | lisible par tout agent actif ayant le périmètre requis |
| C1 Partagé | personnes ou groupes précis | idem, plafond ≥ 1 |
| C2 Confidentiel | contexte défini | **plafond par défaut d'un nouvel agent** |
| C3 Strictement privé | usage personnel et composants privés | **classification par défaut de toute donnée** : une donnée non classée est traitée comme non partageable |
| C4 Hautement sensible | santé, psychologie, intime, finances sensibles | plancher automatique pour la catégorie `emotional` et les sujets détectés. Ne s'accorde à un agent qu'avec `--allow-c4` explicite |
| C5 Coffre-fort | secrets | **jamais stocké** : un `CHECK classification <= 4` le bloque dans le schéma. Masqué à l'import, refusé en mémoire, jamais accordable |

**Héritage.** Une information dérivée prend la classification la plus stricte parmi :
- ses preuves (segments cités) ;
- le plancher de sa catégorie ;
- le plancher du scan ;
- **pour un agent, son propre plafond.**

Ce dernier point est la règle de non-écriture descendante (ADR-0005).

## 2. Typage épistémique et auteurs (spec §12, §14, §18)

- **11 types** : `verified_fact`, `self_statement`, `third_party_statement`, `preference`, `observation`,
  `intention`, `hypothesis`, `inference`, `prediction`, `evaluation_result`, `aspiration`.
- **Seul le propriétaire** peut affirmer un `verified_fact`.
- `get_user_context` restitue des **sections séparées** accompagnées d'une note explicite. Par exemple,
  `aspirations` porte la mention : « objectifs — ne jamais décrire comme traits actuels ».
- **Auteurs** :
  - `owner` signifie soumis par le propriétaire. Ce n'est pas forcément écrit par lui : les messages de plus
    de 3 000 caractères reçoivent l'indicateur `possible_paste` ;
  - les autres valeurs sont `ai`, `third_party`, `system` et `unknown` ;
  - une réponse d'IA importée n'est **jamais** attribuée au propriétaire. Elle est restituée avec la mention
    « AI-generated: not the owner's opinion ».
- **Répétition ≠ corroboration.** Un doublon n'est pas réinséré et ne fait monter ni la confiance ni le type.
  Un contenu rejeté ne peut pas être reproposé.
- **Nuance temporelle** : `valid_from` et `valid_until`. Une préférence remplacée passe à `superseded` avec
  une date de fin. Elle n'est pas supprimée, car elle n'était pas fausse à l'époque.

## 3. Modèle de permissions (spec §24, §77, §81)

**Refus par défaut.** Un agent n'a que ce qui lui a été explicitement accordé :

| Attribut | Valeurs | Défaut |
|---|---|---|
| plafond de classification | C0–C4 (C4 seulement avec `allow_c4`) | C2 |
| périmètres | `memory:read`, `memory:propose`, `documents:read`, `context:create`, `third_party:read` | `memory:read`, `memory:propose`, `context:create` |
| catégories | liste explicite ou `*` | `*` |
| quota | requêtes par heure | 120 |
| taille de résultat | max par requête | 20 |

**Opérations structurellement non délégables**, absentes de la passerelle et refusées en code :
- valider, rejeter, corriger, reclasser ou supprimer une mémoire ;
- importer ;
- supprimer une source ;
- gérer les agents ;
- exporter ou sauvegarder ;
- lever la quarantaine ;
- agir sur les interrupteurs ;
- consulter l'audit ou le statut.

Un agent **ne peut pas s'octroyer de permission** : à chaque appel, son principal est relu depuis la base
(testé avec un principal forgé en mémoire).

**Politique avant récupération** (spec §81, niveau 1). Les règles sont compilées en clause SQL. Un agent ne
reçoit jamais une donnée qu'il n'a pas le droit d'utiliser, et aucune protection ne repose sur un prompt.
Les niveaux 2 à 5 du pare-feu de divulgation (préparation, transmission au modèle, envoi, enregistrement)
concernent le Représentant (Phase 6).

## 4. Niveaux d'autonomie (spec §76) — matrice MVP 1

| Niveau | Autorisé dans CORE aujourd'hui |
|---|---|
| 0 Observation | lecture filtrée par les agents |
| 1 Recommandation | `save_memory_candidate` : proposition sans effet |
| 2 Préparation | paquets de contexte (références seulement, à durée de vie limitée) |
| 3 Exécution contrôlée | **aucune** action externe. La validation reste humaine |
| 4–5 | **non activés.** Interdits tant que les tests critiques correspondants (Approval Center, mandats) n'existent pas |

## 5. Mandats et approbations (conception pour la Phase 3+)

Un mandat définit :
- l'agent, l'action et la finalité ;
- les ressources, les interlocuteurs et le canal ;
- le budget, la fréquence et la durée ;
- les conditions d'exécution et d'arrêt ;
- le risque, la validation requise et la révocation.

Une approbation sera **liée à l'empreinte exacte** de l'action (contenu, cible, périmètre) et à une date
d'expiration. Une approbation ancienne ne pourra donc pas être rejouée hors de son périmètre (scénario 23).
Les candidats mémoire suivent déjà ce principe : l'approbation porte sur un identifiant précis, avec une
version incrémentée et journalisée.

## 6. Modèle de menaces (MVP 1, STRIDE simplifié)

| Menace | Vecteur | Parade en place | Risque résiduel |
|---|---|---|---|
| Usurpation d'agent | jeton volé dans la config du client | jeton à forte entropie, stocké haché, révocation immédiate, quotas, audit des refus | le jeton reste en clair dans la config du client. Protégez ce fichier et limitez le plafond |
| Usurpation du propriétaire | « je suis le propriétaire » par MCP | aucun outil d'administration dans la passerelle | — |
| **Accès local au fichier** | malware, ou assistant avec shell (Claude Code, Codex) sur la même session OS | droits 0600, répertoire 0700 | **élevé si le même utilisateur OS.** Parade : compte OS dédié à CORE (le client MCP lance `sudo -u mountassir mcore serve-mcp`, ou un conteneur), chiffrement du disque, et ne pas accorder à un assistant doté d'un shell un plafond supérieur à C2 |
| Injection de prompt | documents et conversations importés | quarantaine des segments suspects, contenu marqué comme donnée, candidats injectés refusés | les heuristiques ne détectent pas tout. Le LLM client reste responsable de ne pas obéir |
| Contamination de la mémoire | IA qui répète ou invente | candidats invisibles avant validation, aucun « fait vérifié » d'agent, déduplication sans hausse de confiance, purge par agent (`revoke --purge`) | dépend de la vigilance lors de la validation (indicateur : taux de rejet) |
| Exfiltration massive | requêtes en rafale | quotas par heure, plafond de résultats | la défense contre la divulgation cumulative fine relève de la Phase 6 |
| Falsification de l'audit | réécriture de lignes | déclencheurs « ajout seul » + chaîne de hachage, `audit verify` | réécriture complète de la chaîne : ancrer régulièrement la tête de chaîne hors machine |
| Rémanence | données supprimées encore dans le fichier | `secure_delete`, FTS `optimize`, checkpoint WAL, test d'absence physique | copies hors CORE : exports en clair, `*.pre-restore-*`, sauvegardes antérieures (mais la restauration réapplique les suppressions) |
| Oracle d'existence | proposer un texte exact pour savoir s'il existe | réponse opaque, sans identifiant | l'agent apprend qu'un équivalent existe s'il connaît déjà le texte exact |
| Perte de données | disque, erreur | sauvegarde chiffrée authentifiée, restauration vérifiée et testée | aucune sauvegarde automatique planifiée (Phase 8) : à planifier soi-même |

## 7. Gouvernance réglementaire (information générale, pas un conseil juridique)

- **RGPD, usage strictement personnel.** L'article 2(2)(c) exclut les traitements effectués « dans le cadre
  d'une activité strictement personnelle ou domestique ».
  - Cette exemption est **fragile** dès qu'il y a des données de **tiers** traitées à des fins
    professionnelles, un Représentant externe exposé au public, ou une commercialisation.
  - CORE est conçu comme si le RGPD s'appliquait : minimisation, suppression effective, export,
    classification, pas de profil psychologique des tiers (le périmètre `third_party:read` est exclu par
    défaut).
- **Données de santé et psychologiques** (art. 9) : C4 par défaut. Aucun diagnostic n'est produit (CORE ne
  fait pas d'inférence).
- **Transferts hors UE** : les assistants clients (OpenAI, Anthropic, Google…) reçoivent ce qu'ils lisent
  via MCP. C'est pourquoi le plafond par défaut est C2. Pour du C3 ou C4, privilégiez un modèle local ou un
  fournisseur dont les conditions de conservation conviennent.
- **AI Act** : un usage personnel n'est pas visé en tant que tel. Un Représentant qui dialogue avec des
  tiers devra respecter l'obligation de transparence : indiquer qu'il s'agit d'une IA. La spec le prévoit
  déjà (§22).
- **Consultez un professionnel** (avocat RGPD ou DPO) avant : un Représentant public, tout traitement de
  données de clients ou de contacts professionnels, ou toute commercialisation.

## 8. Arrêt d'urgence (spec §88)

| Interrupteur | Effet | Commande |
|---|---|---|
| `gateway_stopped` | tout appel d'agent est refusé | `mcore stop --gateway` |
| `writes_frozen` | aucune écriture, **sauf les suppressions**, qui ne font que réduire les données | `mcore stop --writes` |
| `learning_paused` | aucun nouveau candidat ; la lecture reste possible | `mcore stop --learning` |

Les interrupteurs survivent à une restauration et sont testés dans la suite automatique. Mode privé
minimal : les interrupteurs activés, la CLI permet toujours de consulter.
