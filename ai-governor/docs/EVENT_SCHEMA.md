# Schéma commun d'événements (v1)

Toutes les expériences sont alimentées par le même journal d'événements immuables. Source de vérité : `src/core/events/schema.ts` (validé par Zod à l'ingestion).

## Champs

| Champ | Type | Rôle |
|---|---|---|
| `v` | `1` | Version du schéma |
| `id` | string | Identifiant unique (déduplication) |
| `ts` | entier (ms) | Horodatage |
| `type` | enum | Nature de l'événement (voir ci-dessous) |
| `origin` | `{kind, id}` | Origine (agent, service, utilisateur, file…) |
| `destination?` | `{kind, id}` | Destination (modèle, connecteur, base…) — trace les **flux réels** |
| `actor?` | `{kind, id}` | Agent ou service concerné |
| `project?`, `department?`, `taskId?` | string | Rattachements |
| `status` | `pending · started · running · succeeded · failed · cancelled · paused · info` | Statut |
| `durationMs?` | number | Durée |
| `provider?`, `model?`, `effort?` | string | Fournisseur, modèle, niveau d'effort |
| `metrics?` | objet | `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `tokensSaved`, `costUsd` + `costNature` (`measured`/`estimated`), `avoidedCostUsd`, `latencyMs`, `qualityScore`, `quotaUsedPct` |
| `resultRef?` | string | **Référence** vers un résultat (jamais le résultat lui-même) |
| `confidentiality` | `public · internal · confidential · restricted` | Niveau de confidentialité ; les résumés `confidential`/`restricted` sont masqués sans la permission `view.confidential` |
| `nature` | `real · planned · estimated · historical · demo · unavailable` | **Nature de la donnée**, affichée partout |
| `summary?` | string ≤ 280 | Résumé opérationnel expurgé — jamais le raisonnement interne d'un modèle |
| `attrs?` | record de scalaires | Attributs typés par événement |
| `sourceId` | string | Source productrice |

## Types

`task.created · task.started · task.completed · task.failed · task.paused · task.resumed · task.priority · agent.state · llm.call · tool.call · flow · skill.installed · skill.updated · skill.disabled · connector.status · optimization.applied · decision.proposed · decision.resolved · security.incident · update.detected · recommendation · config.changed · automation.run · quality.check · quota.updated`

## Distinguer réel, estimé, démo, indisponible

- `real` : mesuré par une source réelle (ex. tokens d'une réponse Claude Code).
- `estimated` : calculé (ex. coût = tokens × prix catalogue). Un coût estimé n'est **jamais** présenté comme une dépense.
- `demo` : généré pour évaluer les interfaces. Bandeau permanent « Données de démonstration », badge hachuré sur chaque chiffre.
- `unavailable` : la source ne le permet pas (ex. « Économies vérifiées » sans source de facturation). L'interface affiche « Indisponible » et la raison, sans valeur de remplacement.
- `planned`, `historical` : prévus pour le moteur opérationnel (planification, archives).

Les badges de nature sont codés par **forme** (rond plein, rond pointillé, carré hachuré, rond barré) en plus de la couleur.

## Exemple

```json
{
  "v": 1,
  "id": "claude-code:msg_01X…:42",
  "ts": 1795536000000,
  "type": "llm.call",
  "origin": { "kind": "agent", "id": "cc-16e7369b" },
  "destination": { "kind": "model", "id": "claude-opus-5-5" },
  "actor": { "kind": "agent", "id": "cc-16e7369b" },
  "department": "proj-ai-governor",
  "taskId": "cc-16e7369b:turn-3",
  "status": "succeeded",
  "provider": "anthropic",
  "model": "claude-opus-5-5",
  "metrics": { "inputTokens": 2, "outputTokens": 489, "cacheReadTokens": 65422, "cacheWriteTokens": 50707, "costUsd": 0.23, "costNature": "estimated" },
  "confidentiality": "internal",
  "nature": "real",
  "summary": "Réponse du modèle",
  "sourceId": "claude-code"
}
```

## Règles d'ingestion

1. Validation du schéma ; un événement invalide est rejeté et compté (jamais « réparé »).
2. Expurgation de toutes les chaînes (clés Anthropic/OpenAI/GitHub/AWS/Google/Slack, JWT, `Bearer`, `password=`, clés privées).
3. Déduplication par `id` ; tri chronologique ; reconstruction si un lot arrive en désordre.
4. Notification groupée (une rafale = un rendu).
