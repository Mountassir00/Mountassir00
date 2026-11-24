# 01 — Architecture : cartographie, frontières CORE / ONE, flux

## 1. Principe directeur

Le système part d'un **monolithe modulaire** : un seul processus Python et une seule base SQLite. Les
frontières de sécurité sont tenues dans le code, pas par l'infrastructure. Quand un découpage en services
deviendra justifié (multi-appareils, MCP distant toujours actif), il se fera **sans changer les contrats** :
chaque adaptateur n'appelle que la façade `Core`.

```
                 ┌───────────────────────── MOUNTASSIR OS ─────────────────────────┐
 Assistants IA   │                                                                 │
 (Claude, Codex, │   AI GATEWAY (adaptateurs)            MOUNTASSIR CORE           │
  ChatGPT*, ...) │  ┌──────────────────────┐   ┌──────────────────────────────┐    │
  ─── MCP ──────►│  │ gateway/mcp_server   │──►│ core.Core  (façade unique)   │    │
                 │  │  • jeton → agent     │   │  guard → tx → policy → audit │    │
 Propriétaire    │  │  • aucun outil admin │   ├──────────────────────────────┤    │
  ─── CLI ──────►│  │ cli (mcore)          │──►│ policy  memory  archive      │    │
                 │  │  • owner principal   │   │ index   guard   portability  │    │
                 │  └──────────────────────┘   │ audit                        │    │
                 │                             └──────────────┬───────────────┘    │
 MOUNTASSIR ONE  │  (Phase 3+) : un client MCP comme un autre │                    │
  (futur) ──MCP─►│  avec sa propre identité d'agent           ▼                    │
                 │                                  SQLite (1 fichier, WAL,        │
                 │                                  secure_delete, 0600)           │
                 └─────────────────────────────────────────────────────────────────┘
   * clients web : exigent le MCP distant HTTPS (Phase 2)
```

## 2. Frontière CORE / ONE (spec §04)

| Règle | Mise en œuvre |
|---|---|
| CORE fonctionne sans ONE | CORE n'appelle **aucun** LLM. Recherche, politique, déduplication et contradictions sont déterministes. |
| CORE alimente tout outil compatible | Contrat MCP générique. Testé avec un client MCP standard, en mémoire et en stdio réel. |
| ONE est remplaçable sans perte | ONE sera un **agent MCP** avec son propre jeton et ses propres plafonds. Le supprimer ne touche pas la mémoire. |
| Aucun accès direct ni illimité d'un LLM à la base | Les LLM ne voient que des résultats d'outils déjà filtrés par la politique, **avant** récupération (clauses SQL). Aucun outil n'exécute du SQL ou du code. |
| Une IA propose, le propriétaire valide | `save_memory_candidate` crée un statut `proposed`, invisible aux agents. La validation n'existe que dans la CLI. |
| Contrats versionnés | `schema_version` dans `meta`, format d'export v1, format de paquet de contexte v1, version du serveur MCP. |

**Limite assumée.** Un processus local qui peut lire le fichier `core.db` contourne tout. L'isolation
« produit » est donc applicative en MVP 1. Pour qu'elle devienne aussi système, il faut un compte OS dédié
(voir [02 §6](02-gouvernance-securite-et-donnees.md)).

## 3. Cartographie fonctionnelle (spec §05–§08) et statut

Légende : ✅ implémenté et testé · 🟡 partiel · 📐 conçu (dans le schéma ou la doc) · ⏳ phase ultérieure.

### MOUNTASSIR CORE

| Module | Statut | Où |
|---|---|---|
| MEMORY CORE (12 types de mémoire, versions, statuts) | ✅ | `memory.py`, `schema.sql` |
| KNOWLEDGE GRAPH | 🟡 entités, provenance et relations mémoire↔source ; pas encore de relations entre entités | `entities`, `memory_provenance` |
| ARCHIVE (conversations, notes) | ✅ | `archive.py` |
| CONTEXT ENGINE + Context Packages | ✅ | `core.create_context_package` |
| DOCUMENT INTELLIGENCE | 🟡 découpage et scan ; pas d'OCR, de PDF ni d'extraction d'entités | `importers.py`, `guard.py` |
| SEARCH ENGINE (BM25 + vecteurs) | ✅ lexical ; 🟡 sémantique (embedder enfichable) | `index.py` |
| DATA QUALITY ENGINE | 🟡 doublons, contradictions par attribut, quarantaine ; pas d'obsolescence automatique | `memory.detect_contradictions` |
| IDENTITY REGISTRY | 🟡 propriétaire et entités ; pas d'interface de gestion des tiers | `entities` |
| SOURCE REGISTRY | ✅ | `sources`, `import_runs` |
| MEMORY CONTROL CENTER | ✅ en CLI ; ⏳ interface graphique | `cli.py` |
| DATA PORTABILITY ENGINE | ✅ | `portability.py` |

### Infrastructure transversale

| Module | Statut | Remarque |
|---|---|---|
| AI GATEWAY (MCP stdio) | ✅ | MCP HTTP + OAuth en Phase 2 |
| GUARDIAN (scan, classification, no write-down) | ✅ | Chiffrement des champs : ⏳ |
| POLICY ENGINE | ✅ | Déterministe, compilé en SQL |
| APPROVAL CENTER | 🟡 | Validation des candidats seulement ; approbations d'actions en Phase 3+ |
| OBSERVABILITY | 🟡 | Journal d'audit ; OpenTelemetry quand le transport HTTP arrivera |
| EMERGENCY STOP | ✅ | 3 interrupteurs |
| COST ENGINE | 🟡 | Quotas par agent ; pas de comptage de tokens (CORE n'appelle aucun LLM) |
| EVENT BUS, AUTOMATION ENGINE, COMMAND CENTER | ⏳ | Phases 8–9 |

### MOUNTASSIR ONE et applications

Tous ces modules relèvent des phases ⏳ 3 à 10 : ONE PRIVATE, REPRESENTATIVE, CORTEX, APEX, STRATEGY,
EXECUTIVE, PERSONAL/PROJECT/FINANCE/HEALTH/LEARNING/CAREER/BEHAVIOR/RELATIONSHIP/DIGITAL ENVIRONMENT OS,
LIFE ANALYTICS et ATLAS.

Ces modules lisent et écrivent dans CORE **uniquement par la passerelle**. Leurs données propres (sessions
cognitives, événements émotionnels, etc.) arriveront sous forme de **schémas séparés** avec des plafonds
C4 (voir [03](03-modele-de-donnees.md)).

## 4. Dépendances

| Dépendance | Usage | Remplaçable par |
|---|---|---|
| Python ≥ 3.11 (stdlib : sqlite3, hashlib, argparse) | tout | — |
| SQLite ≥ 3.35 avec FTS5 | stockage, plein texte, `RETURNING` | PostgreSQL + pgvector (ADR-0002) |
| `cryptography` | AES-256-GCM, scrypt | toute bibliothèque AEAD |
| `mcp` (SDK Python v2, repli v1) | passerelle | tout SDK MCP |

Il n'y a aucune dépendance à un fournisseur de LLM, à un service cloud ou à un framework d'agents.

## 5. Flux

### 5.1 Import (pipeline spec §11)

```
fichier ──► empreinte du fichier ──(déjà importé ?)──► stop
   │
   ▼
parseur (chatgpt | claude | jsonl | markdown) ──► documents + segments(author_type: owner | ai | …)
   │                                    branche active seulement, messages cachés ignorés
   ▼   (1 transaction par document → reprise après interruption)
scan GUARDIAN : secrets → [REDACTED] · injection → quarantaine · santé/finance/intime → C4
   ▼
déduplication (empreinte de document : inchangé | mis à jour | créé)  ──►  index FTS + vecteur
   ▼
audit (comptes uniquement, jamais de contenu)
```

L'extraction de souvenirs est **délibérément hors de CORE**. C'est le rôle d'un agent, qui lit l'archive et
propose des candidats en citant des `evidence_segment_ids`. Le propriétaire valide ensuite.

### 5.2 Lecture par un agent

```
appel MCP ─► authenticate(jeton)  [à chaque appel → révocation immédiate]
          ─► guard : agent actif ? arrêt d'urgence ? périmètre ? quota ?
          ─► clause de politique SQL (statut validé, classification ≤ plafond, catégories, expiration, sujet = propriétaire)
          ─► recherche (FTS BM25 ∩ clause) + reclassement vectoriel
          ─► présentation (provenance réduite, mention « donnée, pas instruction »)
          ─► audit (longueur de la requête, nombre de résultats)
```

### 5.3 Proposition par un agent

Le candidat passe ces contrôles dans l'ordre :

```
save_memory_candidate ─► pause d'apprentissage ? ─► « fait vérifié » interdit ─► sujet = propriétaire ?
   ─► preuves visibles par l'agent ? ─► scan (secret → refus, injection → refus)
   ─► classification = max(demandée, plafond de l'agent [pas d'écriture descendante],
                           plancher des preuves, plancher de catégorie, plancher du scan)
   ─► doublon ? (réponse opaque, aucune hausse de confiance) ─► statut `proposed`
```

### 5.4 Suppression

```
delete_memory ─► lignes FTS + vecteurs ─► versions, provenance, contradictions (cascade)
              ─► paquets de contexte qui la citent (supprimés) ─► tombstone sans contenu
              ─► FTS 'optimize' + checkpoint WAL (TRUNCATE) + secure_delete ⇒ effacement physique (testé)
delete_source ─► mémoires écrites par la source ou dérivées par une IA de cette seule source : supprimées
              ─► mémoires du propriétaire qui perdent leur preuve : `needs_review`
```

### 5.5 Restauration

La sauvegarde est déchiffrée, son authenticité (GCM) et son intégrité (SHA-256 + `integrity_check`) sont
vérifiées, et elle est préparée dans une base temporaire. Trois éléments de la base courante y sont ensuite
**reportés** :
- les tombstones ;
- les révocations d'agents ;
- les interrupteurs d'arrêt actifs.

L'ancienne base est conservée sous `*.pre-restore-<horodatage>`, puis les fichiers sont échangés de façon
atomique.
