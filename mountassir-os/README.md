# MOUNTASSIR OS — CORE (MVP 1 : mémoire souveraine)

> Les intelligences artificielles peuvent changer. Ma mémoire doit rester.

Ce dossier contient **MOUNTASSIR CORE**, première brique de MOUNTASSIR OS. C'est une mémoire personnelle locale :
un seul fichier SQLite sur votre machine, un moteur de règles déterministe, et une passerelle MCP. N'importe
quel assistant compatible MCP peut y **lire** ce que vous l'autorisez à lire et y **proposer** des souvenirs.
Il ne peut jamais les y écrire définitivement sans votre validation.

**Statut** : MVP 1 implémenté et testé (41 tests automatisés). Rien n'est encore déployé. Les limites sont
listées dans le [registre](docs/07-registre-fonctionnalites-et-limitations.md).

## Ce qui fonctionne aujourd'hui

| Capacité | Commande / outil |
|---|---|
| Importer l'historique ChatGPT (zip, json, export découpé) et Claude, avec distinction moi / IA | `mcore import chatgpt export.zip` |
| Importer des notes Markdown ou un JSONL générique (pont pour Gemini, Mistral, etc.) | `mcore import markdown ~/Notes` |
| Masquer automatiquement les secrets, mettre en quarantaine les injections de prompt, passer les sujets sensibles en C4 | automatique à l'import |
| Mémoires typées : 12 catégories × 11 types épistémiques (fait, déclaration, préférence, hypothèse, aspiration…) | `mcore memory add` |
| Provenance (qui a écrit, d'où c'est tiré), versions, corrections, contradictions | `mcore memory history`, `mcore contradictions list` |
| Candidats proposés par les IA, invisibles tant que vous ne les validez pas | `mcore candidates list / approve / reject` |
| Suppression réelle : index, vecteurs, versions, paquets de contexte, puis effacement physique du fichier | `mcore memory delete`, `mcore source delete` |
| Agents IA avec jeton, plafond de classification, périmètres, quotas ; révocation immédiate | `mcore agent add / revoke` |
| Journal d'audit chaîné par hachage, sans contenu | `mcore audit verify` |
| Export ouvert (JSON, Markdown lisible, CSV) | `mcore export --out DIR` |
| Sauvegarde chiffrée AES-256-GCM. La restauration réapplique les suppressions et révocations faites après la sauvegarde | `mcore backup`, `mcore restore` |
| Arrêt d'urgence : passerelle, écritures, apprentissage | `mcore stop --all` |

## Installation

Prérequis : Python ≥ 3.11 avec une version de SQLite compilée avec FTS5. C'est le cas des installeurs officiels
macOS et Windows. Sous Linux, cela dépend de la distribution, et CORE le vérifie au démarrage.

Cette commande est à lancer depuis le dossier `mountassir-os/` :

```bash
pip install -e ".[mcp]"
```

```bash
mcore init --owner-name "Votre nom"
```

La base est créée dans `~/.mountassir/core.db` avec les droits 0600. Changez cet emplacement avec `--db`
ou avec la variable `MOUNTASSIR_DB`.

## Brancher un assistant (MCP local, stdio)

1. Créez un agent et notez le jeton. Il ne s'affiche qu'une fois.

```bash
mcore agent add claude-desktop --max-class 3
```

2. Déclarez le serveur dans le client. Pour Claude Desktop, c'est le fichier `claude_desktop_config.json` :

```json
{
  "mcpServers": {
    "mountassir-core": {
      "command": "mcore",
      "args": ["serve-mcp"],
      "env": { "MOUNTASSIR_AGENT_TOKEN": "mct_…", "MOUNTASSIR_DB": "/Users/vous/.mountassir/core.db" }
    }
  }
}
```

Pour Claude Code, la commande équivalente est :

```bash
claude mcp add mountassir-core --env MOUNTASSIR_AGENT_TOKEN=mct_… -- mcore serve-mcp
```

Codex, Antigravity CLI et les autres clients stdio fonctionnent sur le même principe.

**Clients web** (claude.ai, ChatGPT, Gemini, Mistral Vibe, Grok, Perplexity) : ils exigent un serveur MCP
**distant en HTTPS**. Ce transport est prévu en Phase 2 et n'est **pas encore disponible** ; voir la
[matrice des connecteurs](docs/04-benchmark-et-connecteurs.md).

### Outils exposés aux IA

`search_memory`, `get_memory`, `get_user_context`, `get_user_preferences`, `retrieve_relevant_documents`,
`save_memory_candidate`, `list_my_candidates`, `create_context_package`, `get_context_package`,
`get_agent_permissions`.

Les opérations réservées au propriétaire (valider, supprimer, exporter, gérer les permissions, restaurer,
arrêter) **n'existent pas** dans la passerelle : elles ne passent que par la CLI locale.

## Flux recommandé

1. Importez vos exports ChatGPT et Claude dans l'archive : `mcore import`.
2. Créez un agent avec `--scopes memory:read,memory:propose,documents:read,context:create`.
3. Demandez à votre assistant de lire l'archive et de **proposer** les souvenirs utiles.
4. Relisez les propositions (`mcore candidates list`), puis validez, corrigez ou rejetez.
5. Tous vos assistants partagent ensuite la même mémoire validée, sans dépendre d'aucun fournisseur.

## Sécurité : à lire avant usage réel

- **Celui qui peut lire le fichier `core.db` a tout.** Dans le MVP 1, l'accès local à la CLI fait office
  d'authentification du propriétaire. Un assistant qui a un accès shell à la même machine, comme Claude Code
  ou Codex, peut lire la base en contournant les règles. Pour une isolation forte, faites tourner CORE sous un
  **compte système dédié** et activez le **chiffrement du disque** (FileVault, BitLocker ou LUKS). Détails
  dans [docs/02](docs/02-gouvernance-securite-et-donnees.md).
- `mcore export` écrit **en clair**. Préférez `mcore backup`, qui chiffre.
- **Ne commitez jamais de données.** Le `.gitignore` exclut les bases, exports et sauvegardes. Ce dépôt est
  probablement public : c'est votre dépôt de profil GitHub.

## Développement

```bash
pip install -e ".[dev]"
```

```bash
python -m pytest -q
```

Organisation du code :
- `src/mountassir_core/` : `core.py` est la façade unique. Autour d'elle : `policy.py` (règles d'accès),
  `memory.py`, `archive.py`, `index.py`, `guard.py`, `audit.py`, `portability.py`, `gateway/mcp_server.py`
  et `cli.py`.
- `docs/` : synthèse, architecture, gouvernance, modèle de données, benchmark, tests, roadmap, registres.
