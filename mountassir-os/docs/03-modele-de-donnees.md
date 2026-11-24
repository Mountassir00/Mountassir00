# 03 — Modèle de données

La source de vérité est [`src/mountassir_core/schema.sql`](../src/mountassir_core/schema.sql) (schéma v1).
Ce document en explique les choix et situe les domaines prévus par la spec (§102).

## 1. Tables v1 (implémentées)

| Domaine | Table | Rôle | Suppression |
|---|---|---|---|
| Méta | `meta` | version du schéma, identifiant d'instance, propriétaire | — |
| Identité | `entities` | propriétaire (unique, par index partiel), personnes, organisations, projets… | — |
| Sources | `sources` | origine : `manual`, `agent`, `chatgpt_export`, `claude_export`, `markdown`, `jsonl` | supprime en cascade documents, segments, imports et provenance |
| | `import_runs` | exécutions d'import : empreinte du fichier, statut, statistiques. Sert à l'idempotence et à la reprise | cascade |
| Archive | `documents` | conversation, note ou fichier ; empreinte de contenu, classification | cascade sur les segments |
| | `segments` | message ou fragment : `author_type`, contenu masqué, indicateurs, quarantaine | supprime aussi l'index (application) |
| Mémoire | `memories` | voir §2 | voir §3 |
| | `memory_versions` | instantané à chaque changement : qui, quand, pourquoi | cascade |
| | `memory_provenance` | rôle `author` (qui a écrit) ou `evidence` (d'où c'est tiré), segment cité | cascade |
| | `contradictions` | même sujet, même attribut, valeur différente ; ouverte ou résolue | cascade |
| | `tombstones` | trace sans contenu d'une suppression (mémoire, source), reportée à la restauration | conservée |
| | vue `memory_candidates` | mémoires au statut `proposed` | — |
| Recherche (dérivée) | `search_items`, `search_fts` (FTS5), `embeddings` | index reconstruisible, **non exporté** | supprimée par l'application, puis `optimize` |
| Passerelle | `agents` | jeton **haché**, statut, plafond ≤ C4 (vérifié par `CHECK`), périmètres, catégories, quotas | révocation (pas de suppression : traçabilité) |
| | `agent_usage` | compteur horaire | cascade |
| | `context_packages`, `context_package_items` | **références seulement**, finalité, expiration, plafond | supprimés si une mémoire citée est supprimée |
| Gouvernance | `system_flags` | arrêt d'urgence | — |
| | `audit_log` | chaîné par hachage, ajout seul (déclencheurs), aucun contenu | jamais |

## 2. Une mémoire (spec §12)

| Champ | Spec | Remarque |
|---|---|---|
| `id` | identifiant unique | `mem_<uuid4>` |
| `subject_id` | personne ou entité concernée | propriétaire par défaut ; tiers seulement avec le périmètre `third_party:read` |
| `author_type`, `author_id` | auteur | `owner` / `ai` / … ; identifiant de l'agent |
| provenance | source | `memory_provenance` |
| `acquired_at` / `observed_at` / `last_verified_at` | dates | la validation met à jour `last_verified_at` |
| `context` | contexte, « pourquoi c'est conservé » | — |
| `category` | catégorie | 12 types de mémoire (§13) |
| `classification` | confidentialité | 0–4 |
| `confidence` | confiance | 0–1, jamais augmentée automatiquement |
| `expires_at` | durée de conservation | masquée aux agents une fois expirée |
| autorisations | autorisations | dérivées de la classification, de la catégorie et du sujet (pas d'ACL par ligne en v1) |
| `status` | validation | `proposed`, `validated`, `rejected` (contenu effacé, empreinte conservée), `needs_review`, `superseded` |
| `version` + `memory_versions` | version et historique | — |
| `epistemic_type` | fait, déclaration, hypothèse… | 11 types |
| `slot` / `value` | — (ajout) | attribut comparable (ex. `preference.work.hours`) qui permet de détecter les contradictions de façon déterministe |
| `valid_from` / `valid_until` | nuance temporelle | un remplacement ferme la période |

## 3. Règles de suppression

1. **Mémoire** :
   - suppression de la ligne, des versions, de la provenance et des contradictions ;
   - suppression des lignes FTS, des vecteurs et des paquets de contexte qui la citent ;
   - création d'un tombstone ;
   - `optimize` FTS, puis checkpoint WAL. L'absence physique de la donnée dans le fichier est testée.
2. **Source** :
   - documents, segments et index supprimés ;
   - mémoires **écrites** par cette source (par exemple un agent purgé) : supprimées ;
   - mémoires **d'IA** dont toutes les preuves venaient de cette source : supprimées ;
   - mémoires **du propriétaire** qui perdent une preuve : passées en `needs_review`, car c'est votre
     affirmation et c'est à vous de décider.
3. **Rejet** : le contenu est remplacé par `[rejected]` et les versions sont effacées. Seule l'empreinte est
   conservée, pour bloquer une nouvelle proposition.

## 4. Domaines prévus (spec §102) et emplacement futur

Principe : **un schéma SQLite attaché par domaine sensible**, ou une base séparée, pour pouvoir chiffrer,
sauvegarder et supprimer chaque domaine indépendamment. La provenance et les mémoires résumées restent dans
CORE.

| Domaine (spec) | Phase | Plafond | Remarque |
|---|---|---|---|
| projects, objectives, tasks, decisions, commitments | 3 | C3 | **Le journal décisionnel est prioritaire** : c'est le meilleur retour sur investissement pour la qualité des décisions |
| cognitive_sessions, cognitive_results, psychometric_* | 4 | C4 | instruments sous licence, voir spec §30 |
| emotional_events, triggers, regulation_*, predictions | 4 | C4 | base dédiée chiffrée, jamais lisible par un agent C2 |
| role_models, traits, target_identities, skills… | 5 | C2–C3 | `role_model` est déjà un type d'entité ; **jamais attribué au sujet propriétaire** |
| contacts, interlocutor_permissions, messages, drafts, disclosure_policies | 6 | variable | **instance isolée** (portail externe), sans accès au fichier CORE |
| financial, health, relationship, learning, behavior | 7 | C4 (santé, finances) | séparation par structure juridique (une source par entité) |
| mandates, approvals, automations, execution_logs, cost_records | 3–8 | C3 | approbations liées à l'empreinte de l'action |

## 5. Migration vers PostgreSQL (ADR-0002)

Le schéma est volontairement portable :
- identifiants texte ;
- dates ISO-8601 UTC ;
- JSON en texte, qui deviendra JSONB ;
- aucune fonction propre à SQLite hors FTS5.

Le moteur de recherche est isolé dans `index.py`, ce qui permettra de passer à `tsvector` + `pgvector`. La
migration se fera par l'export JSON v1, qui couvre toutes les tables non dérivées.
