# Protocole ONE ↔ CORE (V0)

MOUNTASSIR ONE (représentant, assistant) ne possède pas la mémoire : il la lit et y propose des écritures
via le contrat `memory/core_port.py`. `ReferenceCore` est l'implémentation en mémoire pour les tests ;
l'adaptateur réel cible MOUNTASSIR CORE (`mountassir-os/`, PR #4).

## Lecture

`PolicyEngine.retrieval_scope(session)` → `RetrievalScope` → `CorePort.query(scope, q)`.
Le filtrage est fait **avant** la récupération (CORE : clause SQL compilée, spec CORE §81 niveau 1).

## Écriture

`MemoryGateway.submit` est la seule voie d'écriture. Correspondance avec CORE :

| ONE | CORE (`mountassir_core`) |
|---|---|
| `RecordState.PENDING_VALIDATION` | candidat (`save_memory_candidate`), invisible avant validation |
| `RecordState.QUARANTINED` | segment en quarantaine (injection) |
| `RecordState.SUPERSEDED` | `superseded` avec `valid_until` |
| `RecordState.DELETED` | suppression effective (`secure_delete`) |
| `EpistemicStatus` (6 valeurs, spec ONE §4) | typage à 11 valeurs : `declaration` ↔ `self_statement` / `third_party_statement` selon la source, `deduction` ↔ `inference` |
| `Classification` C0–C5 | identique ; non classé = non partageable (ONE l'évalue comme C4, CORE comme C3 : les deux bloquent toute divulgation) |
| `KillScope.MEMORY_WRITES` | `writes_frozen` (les suppressions restent permises dans les deux) |

## Écarts connus à résoudre dans l'adaptateur

- CORE ne connaît pas encore `audiences`, `purposes` ni `quasi_identifiers` : à ajouter au schéma ou à
  stocker côté ONE (Phase 6 de la roadmap CORE, pare-feu de divulgation).
- Le registre de quasi-identifiants déjà divulgués (`PolicyEngine._qi_ledger`) est en mémoire : il doit
  être persisté avant toute mise en production du portail externe.
