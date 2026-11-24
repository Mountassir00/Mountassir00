# 04 — Benchmark et matrice des connecteurs IA (CORE)

**Date de vérification : 2026-11-24.** Périmètre : faits utiles aux choix d'architecture de CORE (Python 3.13, SQLite + FTS5, moteur de politique déterministe, serveur MCP stdio ; cible ultérieure PostgreSQL + pgvector).

**Méthode et limites.**
- La lecture directe des pages web n'était possible que pour `support.claude.com` et `code.claude.com`.
- Les autres faits viennent de trois sources :
  - les fichiers bruts des dépôts GitHub officiels (`LICENSE`, `README`, `docs/`) ;
  - les métadonnées PyPI et npm (versions, dates, licences déclarées) ;
  - les extraits de pages officielles renvoyés par le moteur de recherche. Ces pages n'ont pas été lues en entier.
- Les prix sont les prix publics affichés et restent à revérifier avant tout engagement.
- Les mentions « non vérifié » et « communautaire » sont signalées comme telles.

---

## A. Couches mémoire et connaissance personnelle

### A1. Licence, auto-hébergement, MCP

| Outil | Licence (exacte) | Self-host | Support MCP |
|---|---|---|---|
| **Mem0** (lib + serveur) | Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/mem0ai/mem0/main/LICENSE)) | **oui** : lib `pip install mem0ai`, serveur `docker compose` avec auth activée par défaut. Fonctions avancées réservées à la Platform (« Teasers » en self-host) ([README](https://raw.githubusercontent.com/mem0ai/mem0/main/README.md)) | Serveur officiel **distant** `https://mcp.mem0.ai/mcp`, Platform + clé API ([doc](https://raw.githubusercontent.com/mem0ai/mem0/main/docs/platform/mem0-mcp.mdx)). L'ancien dépôt `mem0-mcp` est archivé |
| **OpenMemory MCP** (Mem0) | était dans le dépôt Mem0 (Apache-2.0) | — | **Abandonné** : le dossier `openmemory/` est absent de `main` et les pages `/openmemory/*` redirigent vers `/introduction` ([docs.json](https://raw.githubusercontent.com/mem0ai/mem0/main/docs/docs.json)). Un « sunset » en mai 2026 est rapporté par une source tierce ([chatforest](https://chatforest.com/reviews/mem0-mcp-server/)) |
| **Zep** | Service cloud propriétaire. Le dépôt `getzep/zep` (Apache-2.0) ne contient que des exemples : « *not Zep's product* » ([README](https://raw.githubusercontent.com/getzep/zep/main/README.md)) | **non**. L'Enterprise mentionne des « deployment options », détail non vérifié | « Context MCP Server » inclus, avec un nombre de sièges selon le plan, distant ([pricing](https://www.getzep.com/pricing/)) |
| **Graphiti** (moteur de Zep) | Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/getzep/graphiti/main/LICENSE)) | **oui**. Backends : Neo4j 5.26, FalkorDB, Neptune, « Relate » (embarqué, sans serveur) ([README](https://raw.githubusercontent.com/getzep/graphiti/main/README.md)) | Officiel (`mcp_server/`) : HTTP par défaut sur `/mcp/`, stdio supporté, FalkorDB par défaut ([README MCP](https://raw.githubusercontent.com/getzep/graphiti/main/mcp_server/README.md)) |
| **Letta** | Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/letta-ai/letta/main/LICENSE)) | **oui** : runtime local sans compte, ou « App Server ». L'image Docker serveur n'est plus maintenue ([docs](https://docs.letta.com/guides/selfhosting/)) | **Client** MCP (outils MCP distants). Serveur MCP officiel exposant Letta : non vérifié ([pricing](https://docs.letta.com/pricing)) |
| **Supermemory** | Dépôt public sous MIT (SDK, plugins). Le serveur local est un **binaire non open source**, construit depuis un code non public ([doc self-host](https://raw.githubusercontent.com/supermemoryai/supermemory/main/apps/docs/self-hosting/overview.mdx)) | **partiel** : binaire gratuit jusqu'à 10 000 documents (« lite license ») ([local vs enterprise](https://raw.githubusercontent.com/supermemoryai/supermemory/main/apps/docs/self-hosting/local-vs-enterprise.mdx)) | Officiel **distant** `https://mcp.supermemory.ai/mcp` ([README](https://raw.githubusercontent.com/supermemoryai/supermemory/main/README.md)) |
| **Basic Memory** | **AGPL-3.0-or-later** ([LICENSE](https://raw.githubusercontent.com/basicmachines-co/basic-memory/main/LICENSE)) | **oui** : fichiers Markdown + index **SQLite** par défaut, Postgres en option ([README](https://raw.githubusercontent.com/basicmachines-co/basic-memory/main/README.md)) | Officiel : stdio en local, HTTPS pour le Cloud. Clients documentés : Claude Desktop et Code, Codex, Cursor |
| **Cognee** | Apache-2.0 ([LICENSE](https://raw.githubusercontent.com/topoteretes/cognee/main/LICENSE)) | **oui**. Défauts : `sqlite` + `lancedb` + `kuzu` ([.env.template](https://raw.githubusercontent.com/topoteretes/cognee/main/.env.template)). Mode « tout Postgres » possible, mais le graphe sur Postgres est une **démo** et la version de production est sous licence ([README](https://raw.githubusercontent.com/topoteretes/cognee/main/README.md)) | Officiel `cognee-mcp` : stdio par défaut, SSE, Streamable HTTP ([README MCP](https://raw.githubusercontent.com/topoteretes/cognee/main/cognee-mcp/README.md)). Endpoint hébergé en plus |
| **Obsidian** | Propriétaire, gratuit, y compris en usage commercial (licence commerciale « encouragée ») ([pricing](https://obsidian.md/pricing)) | n/a : application locale, vault = dossier local | **Pas de serveur MCP officiel** : plugins communautaires, demande ouverte sur le forum ([forum](https://forum.obsidian.md/t/official-mcp-core-plugin/109276)). CLI officielle depuis 1.12, l'app doit tourner ([CLI](https://help.obsidian.md/cli)) |
| **Anytype** | « Any Source Available License 1.0 » pour les clients et le middleware ([LICENSE](https://raw.githubusercontent.com/anyproto/anytype-heart/main/LICENSE.md)). `any-sync` sous MIT | **partiel** : réseau any-sync auto-hébergeable (MongoDB + S3 + Redis). Le self-host commercial demande une autorisation séparée ([tech](https://tech.anytype.io/how-to/self-hosting)) | Officiel `@anyproto/anytype-mcp` (MIT), **local** via l'API de l'app desktop avec clé API ([README](https://raw.githubusercontent.com/anyproto/anytype-mcp/main/README.md)) |
| **Logseq** | AGPL-3.0 ([LICENSE](https://raw.githubusercontent.com/logseq/logseq/master/LICENSE.md)) | n/a : application locale. Sync RTC en alpha | **Officiel (version DB)** : à activer dans Settings > AI. HTTP local `127.0.0.1:12315/mcp` + jeton, ou via la CLI ([db-version](https://raw.githubusercontent.com/logseq/docs/master/db-version.md)) |
| **Notion** | Propriétaire | **non** | Officiel **hébergé** `mcp.notion.com/mcp` (OAuth), tous plans. Jetons MCP en Business et Enterprise. Le serveur open source (MIT) n'est plus activement maintenu ([docs](https://developers.notion.com/guides/mcp/hosting-open-source-mcp)) |

### A2. Prix, export, dépendance, maturité

| Outil | Gratuit → 1er palier payant | Export des données | Dépendance | Maturité |
|---|---|---|---|---|
| Mem0 | Gratuit : 30 jours à 10k ajouts et 1k recherches par mois ; ensuite BYOK obligatoire pour ajouter, à 50k et 10k par mois, puis facturation à l'usage. Starter, Growth et Pro ne sont plus vendus aux nouveaux comptes ([FAQ prix](https://raw.githubusercontent.com/mem0ai/mem0/main/docs/platform/pricing.mdx)) | API « Memory Export » : JSON structuré par schéma Pydantic ([doc](https://raw.githubusercontent.com/mem0ai/mem0/main/docs/platform/features/memory-export.mdx)) | **moyenne** : OSS, mais les fonctions avancées sont cloud | `mem0ai` 2.2.1 (2026-09-25) |
| Zep | Free : 10k crédits par mois ; Flex : 125 $/mois pour 50k crédits ([pricing](https://www.getzep.com/pricing/)) | via API/SDK. Format dédié non vérifié | **élevée** : cloud uniquement, virage entreprise | SDK `zep-cloud` 4.2.0 |
| Graphiti | OSS gratuit, plus le coût LLM et embeddings | Celui de la base graphe | **faible** : OSS, mais un LLM est requis | `graphiti-core` 0.32.1 (2026-11-24), pré-1.0 |
| Letta | Free 0 $ ; Pro 20 $/mois ([pricing](https://docs.letta.com/pricing)) | Agent File `.af`, format ouvert sous Apache-2.0 ([agent-file](https://raw.githubusercontent.com/letta-ai/agent-file/main/README.md)) | **moyenne** : OSS, orienté agents | `letta` 0.34.12 (2026-10-12) |
| Supermemory | Free 0 $ (5 $ de crédits) ; Pro 19 $/mois ([pricing](https://supermemory.ai/pricing/)) | Non vérifié. L'app grand public (Nova) a fermé le **2026-09-09** ([blog](https://supermemory.ai/blog/unified-memory-that-works-where-you-work-your-second-brain-with-supermemory/)) | **élevée** : cœur fermé | SDK 5.0.1 |
| Basic Memory | Local gratuit ; Cloud 15 $/mois (bêta, prix normal 19 $) | Markdown brut | **faible** : fichiers ouverts | `basic-memory` 1.0.0 (2026-10-29) |
| Cognee | Cloud : Hobby gratuit (10M tokens) ; Growth 5 $ par tenant et par mois ([billing](https://docs.cognee.ai/cognee-cloud/functionality/account-and-billing)) | Non vérifié | **faible** en OSS, **moyenne** pour la prod Postgres sous licence | `cognee` 1.6.10 (2026-11-18) |
| Obsidian | App gratuite ; Sync 4 $/mois en annuel ([pricing](https://obsidian.md/pricing)) | Markdown brut (le vault) | **faible** : format ouvert | Mature |
| Anytype | Free (100 Mo distants) ; Plus 4 $/mois ([pricing](https://anytype.io/pricing/)) | Markdown ; Any-Block en Protobuf ou JSON ([doc](https://doc.anytype.io/anytype/data/import-and-export)) | **moyenne** : licence source-available, formats propres | Stable |
| Logseq | Gratuit. Prix du sync : non vérifié | Graphes fichiers : Markdown. Graphes DB : `.db` SQLite, **EDN** (seul export complet) ou Markdown standard | **faible** | Version DB en **bêta**, « data loss is possible » ([README](https://raw.githubusercontent.com/logseq/logseq/master/README.md)) |
| Notion | Free 0 ; Plus 10 $ par siège et par mois ([pricing](https://www.notion.com/pricing)) | Markdown et CSV, HTML ; PDF par page. Export PDF du workspace retiré au 2026-08-31 ([backup](https://www.notion.com/help/back-up-your-data)) | **élevée** : cloud, modèle propriétaire | Mature |

---

## B. Infrastructure

| Composant | Rôle | Licence | Self-host | Coût de départ | Exploitation perso (indicatif) | Complexité | Trigger d'adoption | Sources |
|---|---|---|---|---|---|---|---|---|
| **SQLite + FTS5** | Stockage et plein-texte de CORE | Domaine public | oui (fichier) | 0 | ≈ 0, fichier local | très faible | **maintenant** | [copyright](https://sqlite.org/copyright.html), [fts5](https://sqlite.org/fts5.html). Les binaires CPython 3.13 Windows et macOS embarquent SQLite 3.50.4 avec `SQLITE_ENABLE_FTS5` ([vcxproj](https://raw.githubusercontent.com/python/cpython/3.13/PCbuild/sqlite3.vcxproj), [mac](https://raw.githubusercontent.com/python/cpython/3.13/Mac/BuildScript/build-installer.py)). Sous Linux, cela dépend de la distribution : tester `sqlite_compileoption_used('ENABLE_FTS5')` |
| **sqlite-vec** | Vecteurs dans SQLite | MIT **ou** Apache-2.0 | oui | 0 | ≈ 0 | faible, mais **pré-v1** : « expect breaking changes » | Quand la recherche sémantique locale est nécessaire. Épingler la version : PyPI 0.1.9 du 2026-03-31, dépôt à 0.1.10-alpha.4 | [README](https://raw.githubusercontent.com/asg017/sqlite-vec/main/README.md) |
| **PostgreSQL + pgvector** | Cible relationnelle + vectorielle | PostgreSQL License | oui | 0 | Coût machine ou VPS, non chiffré | moyenne : service, sauvegardes, montées de version | Serveur MCP distant toujours actif, multi-appareils, écritures concurrentes, gros volumes vectoriels | pgvector v0.8.7, Postgres 13+, HNSW et IVFFlat ([README](https://raw.githubusercontent.com/pgvector/pgvector/master/README.md)) |
| **Supabase** | Postgres managé avec auth et stockage | Apache-2.0 (dépôt) | oui, stack lourde | Free : 500 Mo de BD, **pause après 1 semaine d'inactivité**, 2 projets | Pro 25 $/mois | faible en cloud, élevée en self-host | Seulement si l'hébergement tiers est accepté. La pause du plan Free est incompatible avec un MCP toujours joignable | [pricing](https://supabase.com/pricing) |
| **Qdrant** | Moteur vectoriel dédié | Apache-2.0 | oui | Cloud Free : 1 Go de RAM et 4 Go de disque, suspendu après 1 semaine sans usage | Managé « from 25 $ » | moyenne | Plusieurs millions de vecteurs ou filtrage avancé, sinon pgvector suffit | [pricing](https://qdrant.tech/pricing/) |
| **Neo4j** | Base graphe | Community : **GPLv3**. Enterprise : **commerciale** (clustering, sauvegardes en ligne, failover, composants fermés) | oui (Community) | 0 ; AuraDB Free (nœuds et relations plafonnés) | Non chiffré | moyenne à élevée (JVM) | Requêtes graphe multi-sauts centrales (Graphiti par exemple) | [README](https://raw.githubusercontent.com/neo4j/neo4j/master/README.asciidoc), [FAQ](https://neo4j.com/open-core-and-neo4j/) |
| **LiteLLM** | Passerelle multi-LLM | MIT, **sauf `enterprise/`** qui exige une licence payante en production | oui | 0 | ≈ 0 + coût des LLM | faible à moyenne | À partir de 2 fournisseurs LLM, ou pour des budgets et clés virtuelles | [LICENSE](https://raw.githubusercontent.com/BerriAI/litellm/main/LICENSE), [pricing](https://www.litellm.ai/pricing) |
| **Ollama** | Inférence locale (LLM, embeddings) | MIT | oui | 0 en local ; cloud Pro 20 $/mois | Électricité et GPU | faible | Mode souverain avec embeddings locaux | [LICENSE](https://raw.githubusercontent.com/ollama/ollama/main/LICENSE), [blog prix](https://ollama.com/blog/transparent-pricing) |
| **n8n** | Automatisation et ingestion | **Sustainable Use License** (fair-code, non OSI) : usage interne, personnel ou non commercial seulement. Fichiers `.ee.` sous licence Enterprise. L'hébergement en service ou le white-label exige une licence commerciale | oui | 0 en self-host ; Cloud Starter 20 €/mois (annuel) | faible | faible à moyenne | Connecteurs d'ingestion. **Bloquant si commercialisation SaaS** | [LICENSE](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md), [FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq) |
| **Temporal** | Workflows durables | MIT | oui | 0 en self-host ; Cloud Essentials à partir de 100 $/mois | — | **élevée** | Jobs longs multi-étapes avec reprise. Surdimensionné pour CORE | [LICENSE](https://raw.githubusercontent.com/temporalio/temporal/main/LICENSE), [pricing](https://temporal.io/pricing) |
| **LangGraph** | Orchestration d'agents à état | MIT | oui (lib) | 0 | ≈ 0 | moyenne | Agents multi-étapes. Inutile pour un moteur de politique déterministe | [LICENSE](https://raw.githubusercontent.com/langchain-ai/langgraph/main/LICENSE) |
| **Open WebUI** | Interface de chat auto-hébergée | **Open WebUI License** : BSD-3 + **clause de marque** depuis v0.6.6 (2025-04-19). Interdiction d'altérer la marque au-delà de 50 utilisateurs sur 30 jours glissants, sauf licence enterprise. Non OSI. Le code jusqu'à v0.6.5 reste BSD-3 ([LICENSE_HISTORY](https://raw.githubusercontent.com/open-webui/open-webui/main/LICENSE_HISTORY)) | oui (Docker) | 0 | ≈ 0 | faible | Interface locale. Le paquet PyPI 0.13.4 exige **Python < 3.13**, donc à déployer en conteneur séparé | [LICENSE](https://raw.githubusercontent.com/open-webui/open-webui/main/LICENSE), [doc](https://docs.openwebui.com/license/) |
| **OpenTelemetry** | Traces et métriques | Apache-2.0 | oui | 0 | ≈ 0 | faible à moyenne | Dès le passage du MCP en HTTP ou à plusieurs processus. Ne remplace pas le journal d'audit | [LICENSE](https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector/main/LICENSE) |

**Protocole MCP (impact direct sur CORE).**
- La révision **2026-07-28** est publiée ([annonce](https://blog.modelcontextprotocol.io/posts/2026-07-28/), [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog)). Elle contient des changements cassants :
  - le cœur devient **sans état** : suppression du handshake `initialize` et de l'en-tête `Mcp-Session-Id`, méthode `server/discover` ;
  - nouveaux en-têtes `Mcp-Method` et `Mcp-Name` en Streamable HTTP ;
  - HTTP+SSE est déprécié ;
  - roots, sampling et logging sont dépréciés.
- Transports standard : stdio et Streamable HTTP ([transports](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)).
- L'autorisation OAuth 2.1 ne concerne que HTTP ; en stdio, les identifiants viennent de l'environnement ([auth](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)).
- SDK Python `mcp` 2.3.0 (2026-10-02, Python ≥ 3.10, MIT) ; `fastmcp` 4.2.5 (Apache-2.0).

---

## C. Matrice des connecteurs IA

Légende du statut CORE :
- **MCP-L** : intégrable via MCP local (stdio).
- **MCP-R** : intégrable via MCP distant (HTTPS public, OAuth ou en-tête).
- **IMP** : import manuel seulement.
- **IND** : indisponible.
- **AV** : à vérifier.

| Assistant | (1) Export officiel, format, distinction user/assistant | (2) Serveur MCP personnalisé | (3) Mémoire native, exportable ? | (4) Statut CORE | Sources |
|---|---|---|---|---|---|
| **ChatGPT** (web, apps) | Settings > Data controls > Export data (Free, Go, Plus, Pro ; pas de self-service en Business ni Enterprise). ZIP avec visionneuse `index.html` et conversations en **JSON** (anciens exports : `chat.html`). Rôles distingués : `author.role` (voir D) | **Distant uniquement** (SSE, streaming HTTP), sur le web. MCP complet en **Business et Enterprise/Edu** ; **Pro en lecture/fetch seulement** ; **Plus : non documenté**. Connecteurs renommés « apps » le 2025-12-17. Serveur local : via Secure MCP Tunnel | Mémoires enregistrées + historique de conversations référencé, selon le plan et la région. Présence dans l'export : **non vérifiée** | **MCP-R conditionnel** (Business, Enterprise, Pro en lecture), sinon **IMP** | [export](https://help.openai.com/en/articles/7260999-exporting-your-chatgpt-history-and-data), [MCP](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt), [tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels), [mémoire](https://help.openai.com/en/articles/8590148-memory-in-chatgpt) |
| **Codex** (OpenAI, local) | Sessions locales | **Local stdio + Streamable HTTP** (`[mcp_servers.<nom>]` dans `config.toml`, `codex mcp add`) | n/a | **MCP-L** | [doc](https://developers.openai.com/codex/mcp) |
| **Claude.ai** (web, mobile) | Settings > Privacy > Export data (Free, Pro, Max, Ultra ; Team et Enterprise si l'Owner l'autorise). Lien par e-mail valable 24 h. Les fichiers téléversés ne sont pas inclus. Format JSON (communautaire, voir D). Rôles distingués : `sender` | **Distant** : connecteurs personnalisés sur **tous les plans**, Free limité à **1**. Connexion depuis le cloud Anthropic : serveur **joignable sur Internet public**, **port 443** obligatoire. Tunnels MCP en préversion Enterprise sur demande | Mémoire **activée par défaut** (Free, Pro, Max, Ultra). Export texte et import depuis d'autres IA. « *All memory data is included in data exports* » | **MCP-R** | [export](https://support.claude.com/en/articles/9450526-export-your-claude-data), [connecteurs](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp), [mémoire](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context), [import](https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude) |
| **Claude Desktop** | Même export que Claude.ai | **Local stdio** via `claude_desktop_config.json`, ou extensions `.mcpb` (remplacent `.dxt`). Ces serveurs locaux ne sont **pas disponibles** sur claude.ai ni dans Cowork cloud. Connecteurs distants également | idem | **MCP-L** : cible n°1 de CORE | [support](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop), [extensions](https://www.anthropic.com/engineering/desktop-extensions) |
| **Claude Code** | Sessions locales | **stdio**, **http** (recommandé), `sse` (**déprécié**), `ws`. Portées : local, project (`.mcp.json`), user | `CLAUDE.md` (fichiers) | **MCP-L** | [doc](https://code.claude.com/docs/en/mcp) |
| **Gemini** (app) | Google Takeout > My Activity > « Gemini Apps » ; Gems sous « Gemini ». Archive `.zip` ou `.tgz`. Format interne HTML ou JSON (communautaire). Distinction user/modèle : **non vérifiée** | **Distant** : « custom apps » via Settings > Connected Apps (web uniquement pour l'ajout). Conditions : **18 ans et plus, États-Unis, anglais**, History activé. Confirmation manuelle des écritures | Saved info et « memory » (anciennement « past chats »). Présence dans Takeout : **non vérifiée**. Import de ZIP de chats d'autres IA | **MCP-R** limité géographiquement, sinon **IMP** | [Takeout](https://support.google.com/gemini/answer/16920332?hl=en), [custom apps](https://support.google.com/gemini/answer/17209137?hl=en), [privacy](https://support.google.com/gemini/answer/13594961?hl=en), [import](https://blog.google/innovation-and-ai/products/gemini-app/switch-to-gemini-app/) |
| **Gemini CLI / Antigravity CLI** | Sessions locales | Gemini CLI (Apache-2.0) : stdio, SSE, Streamable HTTP (`command`, `url`, `httpUrl`). **Depuis le 2026-06-18, Gemini CLI est réservé à Code Assist Standard et Enterprise** ; les comptes gratuits et Google AI Pro/Ultra passent à **Antigravity CLI** (`command` pour stdio, `serverUrl` pour Streamable HTTP) | n/a | **MCP-L** | [README](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/README.md), [MCP](https://raw.githubusercontent.com/google-gemini/gemini-cli/main/docs/tools/mcp-server.md), [Antigravity](https://antigravity.google/docs/mcp/) |
| **Mistral Le Chat** (renommé **Vibe**) | Bouton « Export » qui télécharge toutes les données Vibe. Format et structure : **non vérifiés** | **Distant** : « Custom MCP Connector », HTTPS avec TLS valide. Auth : aucune, Bearer/Basic ou OAuth 2.1 avec DCR. Réservé aux admins (en Free et Pro, le propriétaire est admin) | Memories (automatiques, éditables). Mistral les annonce « exportables » | **MCP-R** | [renommage](https://help.mistral.ai/en/articles/682992-le-chat-is-now-vibe), [export](https://help.mistral.ai/en/articles/347623-how-do-i-export-my-data-from-vibe), [MCP](https://docs.mistral.ai/le-chat/knowledge-integrations/connectors/mcp-connectors), [mémoire](https://mistral.ai/news/memory/) |
| **DeepSeek** | Settings > Data > Export data (guide tiers). JSON selon un éditeur tiers. **Non vérifié officiellement** | App : **aucun MCP documenté** ; l'API ignore `mcp_servers`. **DeepSeek Harness** (developer preview) accepte des serveurs MCP tiers (CGU officielles) en stdio ou Streamable HTTP (guide tiers) | Non documentée | **IMP** (app) ; Harness **AV** | [guide](https://joindeleteme.com/ai-privacy-settings/deepseek-privacy-settings-guide/), [API](https://api-docs.deepseek.com/guides/anthropic_api/), [Harness](https://www.deepseek.com/en/harness/terms-of-use/) |
| **Kimi** (Moonshot) | **Aucun export en masse trouvé** : copie manuelle seulement ; export Markdown par réponse dans l'extension navigateur | App : non documenté. **Kimi Code CLI** : MCP (`kimi mcp`) | Memory Space. La nouvelle version (déploiement progressif depuis 10/2026) importe et **exporte** les mémoires | **IMP** / CLI **MCP-L** (**AV**) | [mémoire](https://www.kimi.com/en/help/features/memory-space), [CLI](https://www.kimi.com/en/help/kimi-code/faq) |
| **Grok** (xAI) | `accounts.x.ai/data` : ZIP JSON (guides tiers). **Format non vérifié officiellement** | **Distant** : grok.com/connectors > Custom (depuis le 2026-05-06), web, iOS et Android, « tous les utilisateurs ». Serveur **joignable publiquement**, tunnel nécessaire en local. API : outil `mcp` (SSE, streaming HTTP) | Memory (bêta 2025-04, hors UE et Royaume-Uni au lancement), consultable et effaçable. Export : non vérifié | **MCP-R** | [connecteurs](https://docs.x.ai/grok/connectors), [annonce](https://x.ai/news/grok-connectors), [API](https://docs.x.ai/developers/tools/remote-mcp), [mémoire](https://techcrunch.com/2025/04/16/xai-adds-a-memory-feature-to-grok) |
| **Perplexity** | « Export my data » dans le compte, lien par e-mail. Format : non vérifié. Par fil : PDF, Markdown ou DOCX | **Distant** : Pro, Max et Enterprise (URL + OAuth ou clé API). **App Mac : MCP local non supporté actuellement** (supporté par « Portable Computer ») | Memory (Settings > Memory), consultable et effaçable. Export : non vérifié | **MCP-R** | [données](https://www.perplexity.ai/hub/legal/self-serve-data-options), [MCP](https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity), [changelog](https://www.perplexity.ai/changelog/what-we-shipped---march-13-2026), [mémoire](https://www.perplexity.ai/help-center/en/articles/10968016-memory) |
| **Microsoft Copilot** (grand public) | Tableau de bord confidentialité > Copilot app activity history > Export : **CSV**. Distinction user/assistant : non vérifiée | **Aucun MCP personnalisé documenté** côté grand public. Côté entreprise : Copilot Studio (Streamable HTTP seulement, SSE abandonné après 08/2025) et Microsoft 365 Copilot (plugins MCP distants, validation admin) | Copilot Memory (Personalization), effaçable. Export : non vérifié | **IMP** (grand public) | [export](https://support.microsoft.com/en-us/privacy/manage-your-copilot-activity-history-in-the-privacy-dashboard), [mémoire](https://support.microsoft.com/en-us/privacy/microsoft-copilot/privacy-controls), [Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent) |

**Conséquence d'architecture.**
- Un serveur stdio local n'atteint que les **clients locaux** : Claude Desktop, Claude Code, Codex, Antigravity/Gemini CLI, Kimi CLI, et les outils comme Cursor ou LM Studio.
- **Toutes les applications web** (claude.ai, ChatGPT, Gemini, Vibe, Grok, Perplexity) exigent un endpoint **Streamable HTTP public en HTTPS**. Pour CORE, cela suppose :
  - une authentification (OAuth 2.1 ou en-tête) ;
  - une exposition maîtrisée (tunnel, reverse proxy) ;
  - une politique de lecture et d'écriture distincte selon le client.

---

## D. Structure des exports (pour les parseurs)

### D1. ChatGPT

**Officiel (OpenAI).**
- ZIP contenant `index.html` (visionneuse), les conversations en **JSON** et d'autres données « en CSV ou autres formats ».
- Les exports anciens contiennent `chat.html`.
- **Aucun schéma officiel publié.** Un utilisateur du forum OpenAI demande d'ailleurs s'il existe une documentation ([forum](https://community.openai.com/t/decoding-exported-data-by-parsing-conversations-json-and-or-chat-html/403144)).

**Non officiel (communautaire, 2026).** Sources : [export-format](https://raw.githubusercontent.com/difegam/chatgpt-to-markdown/main/docs/explanation/export-format.md) et [data-models](https://raw.githubusercontent.com/difegam/chatgpt-to-markdown/main/docs/reference/data-models.md).

- **Fichiers racine** :
  - `conversations-NNN.json`, partitionnés et indexés à partir de 0. Les exports plus anciens ont un seul `conversations.json`. Un chemin `personal/conversations/conversations.json` est aussi signalé, **non vérifié** ;
  - `export_manifest.json` (chemins et tailles) ;
  - `user.json` (contient des données personnelles) ;
  - `user_settings.json` ;
  - `message_feedback.json` ;
  - `chat.html` ;
  - les fichiers `file-<id>-<nom>` (format moderne) ou `file_<hex>-<nom>` (ancien format) ;
  - les dossiers `<conv-uuid>/image/`, `dalle-generations/` et `user-<id>/`.
- **Conversation** : `id`, `conversation_id`, `title`, `create_time` et `update_time`, `current_node`, `default_model_slug`, `mapping`, ainsi que d'autres drapeaux. `create_time` et `update_time` sont des **flottants epoch en secondes UTC**.
- **`mapping`** est un DAG de nœuds `{id, parent, children[], message}`. Le nœud racine a `parent: null` et `message: null`. Les modifications et régénérations créent des **branches**.
- **Reconstruction du fil visible** : partir de `current_node`, remonter les `parent`, puis inverser l'ordre. Ignorer les `message` nuls et détecter les cycles.
- **`message`** : `id`, `author{role, …}`, `content`, `channel`, `recipient`, `create_time` (flottant **ou null**), `status`, `weight`, `metadata`.
  - `role` vaut `system`, `user`, `assistant` ou `tool`.
  - `weight` vaut 1.0 pour un message visible, 0.0 pour un message caché.
  - `channel` vaut `null`, `commentary` (raisonnement) ou `final`.
  - Les pièces jointes sont dans `metadata.attachments`.
- **`content`** est discriminé par `content_type`, et les types inconnus doivent être tolérés :
  - `text` : `parts[]` contient des chaînes ;
  - `multimodal_text` : `parts[]` mêle chaînes et objets `image_asset_pointer` dont `asset_pointer` est `file-service://…` ou `sediment://…` ;
  - `code` : `text` et `language` ;
  - autres types : `execution_output`, `thoughts`, `reasoning_recap`, `sonic_webpage`, `tether_quote`, `tether_browsing_display`, `user_editable_context` (instructions personnalisées), `system_error`, `computer_output`.
- **Piège** : `message_feedback.json` horodate en **chaîne ISO 8601** (`2026-01-19T20:41:07.303611Z`), alors que les conversations sont en epoch. Le parseur doit accepter les deux formes.

### D2. Claude (claude.ai)

**Officiel (Anthropic).**
- Export depuis Settings > Privacy > Export data ; lien par e-mail valable 24 h et parfois à usage unique.
- Contenu : données de conversation et données du compte ; la **mémoire** est incluse ; les fichiers d'origine téléversés ne le sont pas ([article](https://support.claude.com/en/articles/9450526-export-your-claude-data)).
- **Ni le format, ni les noms de fichiers, ni le schéma ne sont documentés officiellement.**

**Non officiel (communautaire).** Sources : adaptateur Rust `pond-db` 0.3.2, écrit à partir d'un export réel de 1 488 conversations ([source](https://docs.rs/pond-db/0.3.2/src/pond/adapter/claude_ai_export.rs.html)), et le visualiseur [llm-conversations-viewer](https://raw.githubusercontent.com/tomzxcode/llm-conversations-viewer/main/docs/formats.md).

- **Fichiers** : ZIP avec `conversations.json`, qui est **un seul tableau JSON** de conversations.
  - Autres fichiers signalés par un guide tiers : `users.json`, `projects.json` (Pro et Max), `artifacts.json` ([univik](https://univik.com/help/export-claude-chats.html)). **Non vérifié.**
  - Nom du fichier mémoire : **non vérifié**.
- **Conversation** : `uuid`, `name` (souvent vide : 225 sur 1 488), `summary`, `created_at`, `updated_at`, `account{uuid}`, `chat_messages[]`.
- **Message** : `uuid`, `sender`, `text`, `content[]`, `created_at` et `updated_at`, `attachments[]`, `files[]`.
  - `sender` vaut `"human"` ou `"assistant"`, à normaliser en user/assistant.
  - `text` est le champ hérité et peut être vide.
  - `content[]` contient des blocs `{type}` : `text` (`text`), `thinking` (`thinking`), `tool_use` (`name`, `input`), `tool_result` (`name`, `content`).
  - Un tour `human` composé uniquement de `tool_result` correspond à une sortie d'outil.
- **Horodatage** : **chaînes ISO 8601 / RFC 3339**, avec microsecondes.
- **Structure linéaire** : pas de `mapping` en arbre. Le tri par `created_at` est recommandé par la communauté. L'existence d'un champ de parenté pour les branches n'est **pas vérifiée**.

**Recommandation parseur (déduite, non sourcée).**
- Conserver le JSON brut avec son empreinte (hash) comme preuve d'origine.
- Normaliser vers `{source, conv_id, msg_id, parent_id?, role, created_at_utc, blocks[]}`.
- Rejeter rien en silence : un type inconnu va dans un bloc `raw`.

---

## E. Concurrents directs pour une éventuelle commercialisation

- **Mem0.** Platform cloud et MCP distant ; l'OSS est sous Apache-2.0. Son produit local-first **OpenMemory a disparu** du dépôt ([docs.json](https://raw.githubusercontent.com/mem0ai/mem0/main/docs/docs.json)). L'extraction des mémoires est faite par un LLM, en BYOK après 30 jours ([FAQ](https://raw.githubusercontent.com/mem0ai/mem0/main/docs/platform/pricing.mdx)).
- **Supermemory.** API pour développeurs (Free, puis 19 $/mois) et MCP distant. Le binaire local est **fermé** et plafonné à 10k documents ; l'app grand public a **fermé le 2026-09-09** ([doc](https://raw.githubusercontent.com/supermemoryai/supermemory/main/apps/docs/self-hosting/local-vs-enterprise.mdx), [blog](https://supermemory.ai/blog/unified-memory-that-works-where-you-work-your-second-brain-with-supermemory/)).
- **Basic Memory.** C'est le concurrent **le plus proche** : Markdown local + SQLite (Postgres en option), MCP, AGPL, Cloud à 15 $/mois, système de schémas (`bm_schema_infer` et `bm_schema_validate`) ([README](https://raw.githubusercontent.com/basicmachines-co/basic-memory/main/README.md)).
- **Zep** se repositionne en « enterprise context layer » avec Context Lake ([README](https://raw.githubusercontent.com/getzep/zep/main/README.md)). **Graphiti** couvre déjà la **validité temporelle des faits et leur provenance** (épisodes) ([README](https://raw.githubusercontent.com/getzep/graphiti/main/README.md)) : ce n'est donc pas un différenciateur pour CORE.
- **Pieces.** Mémoire longue locale (PiecesOS) avec MCP sur localhost ; Pro à 18,99 $ par utilisateur et par mois ; les traitements LLM se font dans le cloud ([pricing](https://pieces.app/pricing), [MCP](https://pieces.app/blog/introducing-the-pieces-mcp-server)). **Limitless/Rewind** a été acquis par **Meta le 2025-12-05** et la capture a été désactivée le 2025-12-19 ([TechCrunch](https://www.techcrunch.com/2025/12/05/meta-acquires-ai-device-startup-limitless/)). C'est un précédent de fermeture brutale.
- **Les assistants rendent la mémoire importable**, mais elle reste stockée chez eux :
  - Claude : import et export en texte ([support](https://support.claude.com/en/articles/12123587-import-and-export-your-memory-from-claude)) ;
  - Gemini : import de ZIP de chats ([blog](https://blog.google/innovation-and-ai/products/gemini-app/switch-to-gemini-app/)) ;
  - Kimi : import et export des mémoires ([help](https://www.kimi.com/en/help/features/memory-space)).
  - À noter aussi : MacPaw propose un **standard ouvert « Portable Memory »** (MIT, juillet 2026) fondé sur la suppression vérifiable ([proposition](https://research.macpaw.com/publications/portable-memory.md)).
- **Ce qui n'apparaît pas dans la documentation consultée** (constat d'absence, pas preuve d'absence) :
  - un **typage épistémique** explicite (fait, hypothèse, préférence, avec statut) ;
  - une **validation par le propriétaire avant écriture**. Le schéma dominant est l'extraction automatique : Mem0 passe par un LLM, Mistral « saves automatically », la mémoire Claude est active par défaut ;
  - des **niveaux de classification** et un **moteur de politique déterministe** qui gouvernerait ce que chaque client MCP peut lire ou proposer ;
  - une offre **local-first maintenue et open source** combinant import multi-assistants (ChatGPT, Claude, Gemini) et MCP.

---

## Éléments non vérifiés (à confirmer avant implémentation)

- **ChatGPT**
  - Accès Plus aux serveurs MCP personnalisés.
  - Présence et nom d'un fichier mémoire dans l'export.
  - Chemin `personal/conversations/…`.
- **Claude** : noms des fichiers de l'export (hors `conversations.json`), fichier mémoire, champ de branche ou de parenté.
- **Gemini** : schéma JSON ou HTML de Takeout, distinction prompt/réponse, inclusion de Saved info et de la mémoire.
- **Formats d'export** de Vibe, DeepSeek, Grok, Perplexity et Copilot (grand public) ; exportabilité de leurs mémoires.
- **Kimi** : MCP dans l'app grand public et export en masse.
- **DeepSeek Harness** : configuration MCP officielle.
- **Zep** : options de déploiement Enterprise et format d'export.
- **Autres outils** :
  - Letta : serveur MCP officiel ;
  - Cognee et Supermemory : format d'export ;
  - Logseq : prix du sync.
- **Coûts d'exploitation** d'un VPS ou d'un Postgres auto-hébergé : non chiffrés.
