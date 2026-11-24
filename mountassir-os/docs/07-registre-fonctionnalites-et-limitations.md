# 07 — Registre des fonctionnalités et des limitations

Statuts (spec §108) :
- **proposé** : décrit dans la spec, pas conçu ;
- **conçu** : architecture ou schéma défini ;
- **implémenté** : code écrit ;
- **testé** : tests automatisés réussis ;
- **déployé** : en usage réel.

**Rien n'est déployé à ce jour.**

## Fonctionnalités

| Fonctionnalité | Statut |
|---|---|
| Mémoire typée (12 catégories × 11 types épistémiques), versions, statuts | testé |
| Candidats IA avec validation, rejet et dédoublonnage du propriétaire | testé |
| Contradictions par attribut (`slot`) et résolution sans perte | testé |
| Import ChatGPT (json, zip, export découpé, branche active, messages cachés ignorés) | testé (fixtures synthétiques) |
| Import Claude, JSONL générique, Markdown | testé (fixtures synthétiques) |
| Import idempotent, incrémental et repris après interruption | testé |
| Masquage des secrets, quarantaine des injections, plancher C4 sensible | testé (heuristique) |
| Recherche BM25 + reclassement vectoriel lexical, filtrée par la politique | testé |
| Contexte utilisateur par section épistémique ; paquets de contexte | testé |
| Agents : jetons, plafond, périmètres, catégories, quotas, révocation et purge | testé |
| Pas d'écriture descendante, héritage de classification, C5 impossible | testé |
| Suppression en cascade et effacement physique ; suppression de source | testé |
| Audit chaîné et vérification | testé |
| Export JSON, Markdown, CSV avec FORMAT.md | testé |
| Sauvegarde chiffrée ; restauration avec report des suppressions, révocations et interrupteurs | testé |
| Arrêt d'urgence (passerelle, écritures, apprentissage) | testé |
| Serveur MCP stdio (SDK v2, repli v1 non testé) | testé (v2) |
| MCP Streamable HTTP + OAuth | conçu (Phase 2) |
| Embeddings sémantiques (Ollama et autres) | conçu (interface `Embedder`) |
| Graphe entité↔entité | proposé |
| Approval Center pour les actions et mandats | conçu (doc 02 §5) |
| ONE, CORTEX, APEX, STRATEGY, EXECUTIVE, REPRESENTATIVE, applications OS | proposé |
| Interface graphique, mobile, voix | proposé |

## Limitations connues (à lire)

1. **Authentification du propriétaire = accès local.** Pas de MFA ni de passkeys. Quiconque peut lancer
   `mcore` avec le fichier est le propriétaire.
2. **Isolation vis-à-vis des assistants dotés d'un shell.** Claude Code ou Codex, sous le même compte OS,
   peuvent lire `core.db` directement. Utilisez un compte OS dédié (doc 02 §6).
3. **Pas de chiffrement au repos propre à CORE.** SQLCipher n'est pas utilisé. Il faut s'appuyer sur le
   chiffrement du disque. Les sauvegardes, elles, sont chiffrées.
4. **Exports `mcore export` en clair.** Les copies `*.pre-restore-*` aussi, et elles sont à supprimer après
   vérification.
5. **Le jeton d'agent est en clair dans la config du client MCP.** Limitez le plafond de l'agent en
   conséquence.
6. **Parseurs non testés sur de vrais exports.**
   - Aucun schéma n'est publié par OpenAI ni par Anthropic.
   - Formats non pris en charge : les `content_type` autres que du texte (images, code exécuté), les
     pièces jointes et le fichier mémoire de Claude.
7. **Heuristiques GUARDIAN.**
   - Des faux positifs sont possibles : un mot comme « salaire » dans un contexte anodin fait passer en C4.
   - Des faux négatifs aussi : un secret au format inconnu, une injection paraphrasée.
   - La quarantaine porte sur le segment, pas sur le document.
8. **Recherche vectorielle lexicale.** Elle tolère les fautes et les flexions, mais ce n'est pas de la
   sémantique. Elle n'est pas adaptée au-delà d'environ 100 000 éléments sans index dédié (sqlite-vec,
   pgvector).
9. **Oracle d'existence résiduel.** Un agent qui connaît le texte exact d'une mémoire peut savoir qu'un
   équivalent existe, via une réponse de doublon opaque.
10. **Contradictions détectées uniquement par attribut (`slot`).** Deux phrases contradictoires sans
    attribut ne sont pas repérées. Cette détection sémantique serait le rôle d'un agent.
11. **Aucune planification automatique** (sauvegardes, purge des paquets expirés). Les paquets expirés sont
    purgés quand on y accède. Le reste est à planifier soi-même : cron ou launchd.
12. **Journalisation des échecs d'authentification non bornée.** Une attaque par rafale de jetons invalides
    fait grossir l'audit. Une limite de débit est prévue en Phase 2.
13. **CLI en anglais, documentation en français.** L'internationalisation de l'interface n'est pas faite.
