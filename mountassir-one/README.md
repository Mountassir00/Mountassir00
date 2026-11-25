# MOUNTASSIR ONE — V0

Fondations déterministes du représentant numérique : classification C0–C5, mémoire gouvernée, moteur de
politiques de divulgation, audit chaîné, arrêt d'urgence, défense anti-injection, coffre-fort.
Principe : **le modèle de langage n'est jamais une frontière de sécurité.**

```bash
pip install -e '.[dev]'
pytest
```

| Module | Rôle |
|---|---|
| `domain/` | classification, enregistrements avec provenance, identités et niveaux d'assurance |
| `memory/gateway.py` | seule voie d'écriture : quarantaine, doublons, contradictions, validation propriétaire, suppression |
| `policy/engine.py` | 3 contrôles : avant récupération, pendant la préparation (audience, finalité, quasi-identifiants, escalade), avant envoi |
| `security/` | audit HMAC chaîné, arrêt d'urgence, contenu non fiable, coffre-fort |

Tests : `tests/test_critical_scenarios.py` reprend les scénarios 1, 2, 3, 4, 5, 6, 8, 9 et 12 de la spec (§38).
Hors V0 : niveaux d'autonomie, routage des modèles (scénario 10), représentant conversationnel (scénarios 7 et 11).
Protocole avec CORE : [docs/interfaces/core-protocol.md](docs/interfaces/core-protocol.md).
