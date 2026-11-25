# Sources de données et limites de visibilité

| Source | État | Nature | Observable | Non observable |
|---|---|---|---|---|
| Données de démonstration | Active par défaut | `demo` | Tout (généré, déterministe, 30 jours + direct) | Aucune activité réelle |
| Import Claude Code (`.jsonl`) | **Livré** | `real` (tokens, outils, modèles, durées) · `estimated` (coûts) | Réponses modèle dédupliquées par identifiant de message, cache lu/écrit, outils et erreurs d'outils, sous-agents, skills invoqués, tours de conversation, projets | Dépense facturée, contenu des messages (ignoré volontairement), activité hors Claude Code |
| API Usage & Cost d'Anthropic | Prévue — nécessite le moteur opérationnel | `real` (facturation) | Tokens et coûts facturés par modèle, jour, clé | Contenu, activité claude.ai |
| OpenTelemetry Claude Code | Prévue — nécessite un collecteur | `real` | Sessions, tokens, coûts estimés, décisions d'outils | Raisonnement interne |
| claude.ai (web, bureau, mobile) | Non observable | — | — | Tokens, coûts, outils : aucune API publique pour un compte individuel |
| Autres fournisseurs | À concevoir | selon API | selon fournisseur | selon fournisseur |

## Import Claude Code — confidentialité

- Les fichiers sont lus **dans le navigateur** ; rien n'est envoyé.
- Seuls sont conservés : horodatages, identifiants de session, nom du dossier de projet, modèle, compteurs de tokens, **noms** d'outils, identifiant de skill ou de type de sous-agent.
- Prompts, réponses, commandes, contenus de fichiers et résultats d'outils ne sont **jamais** lus dans les événements (test : `Claude Code importer › keeps metadata only`).
- Toutes les chaînes passent par l'expurgation des secrets.

## Coûts

Coût estimé = tokens × prix catalogue (table `src/core/pricing.ts`, relevé du 2026-11-03). Hors remises, Batch, mode rapide, fournisseurs partenaires ; écriture cache au multiplicateur standard (×1,25 pour 5 min, ×2 pour 1 h) — à vérifier. Un modèle absent de la table donne un coût **inconnu**, jamais zéro silencieux.

## Brancher une nouvelle source

Implémenter `DataSource` (`src/core/sources/types.ts`) :

```ts
interface DataSource {
  id; label; kind; defaultNature;
  capabilities: { live; commands; history };
  visibility: { observable: string[]; notObservable: string[] };
  catalog(): Catalog;
  load(now): Promise<GovEvent[]>;
  subscribe?(push): () => void;     // temps réel poussé, pas d'interrogation
  operations?: OperationsPort;      // si la source accepte des commandes
}
```

puis `runtime.addSource(new MaSource())`. Aucune expérience n'est à modifier.
