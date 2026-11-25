"""Implémentation de référence de CORE, en mémoire, pour le développement et les tests.

Ce n'est PAS un stockage de production (pas de persistance chiffrée, pas d'index
vectoriel). Le stockage réel est MOUNTASSIR CORE (mountassir-os/, PR #4) : voir docs/interfaces/core-protocol.md.
"""

from __future__ import annotations

import re
from typing import Optional

from ..domain.records import InformationRecord, RecordState, utcnow
from ..security.untrusted import normalize
from .core_port import Query, RetrievalScope

EXPORT_FORMAT = "mountassir-core-export/v0"


def _keywords(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", normalize(text)) if len(w) >= 4}


class ReferenceCore:
    def __init__(self) -> None:
        self._current: dict[str, InformationRecord] = {}
        self._history: dict[str, list[InformationRecord]] = {}

    def put(self, record: InformationRecord) -> None:
        self._current[record.id] = record
        self._history.setdefault(record.id, []).append(record)

    def get(self, record_id: str) -> Optional[InformationRecord]:
        return self._current.get(record_id)

    def scan(self) -> list[InformationRecord]:
        return list(self._current.values())

    def history(self, record_id: str) -> list[InformationRecord]:
        return list(self._history.get(record_id, []))

    def query(self, scope: RetrievalScope, q: Query) -> list[InformationRecord]:
        words = _keywords(q.text) if q.text else set()
        out: list[InformationRecord] = []
        for rec in self._current.values():
            if not scope.admits(rec):  # filtrage AVANT récupération
                continue
            if q.subject_id and q.subject_id not in rec.subject_ids:
                continue
            if q.predicate and not rec.predicate.startswith(q.predicate):
                continue
            if words and not (words & _keywords(f"{rec.predicate.replace('.', ' ')} {rec.content} {rec.context or ''}")):
                continue
            out.append(rec)
        return out[: q.limit]

    def tombstone(self, record_id: str) -> None:
        rec = self._current.get(record_id)
        if rec is None:
            return
        stub = rec.model_copy(update={"content": "", "context": None, "state": RecordState.DELETED,
                                      "quasi_identifiers": frozenset(), "version": rec.version + 1})
        self._current[record_id] = stub
        # Effacement effectif : l'historique ne conserve que des pierres tombales.
        self._history[record_id] = [stub]

    def export(self) -> dict:
        """Export intégral en format ouvert (JSON), sans les pierres tombales."""
        return {
            "format": EXPORT_FORMAT,
            "exported_at": utcnow().isoformat(),
            "records": [r.model_dump(mode="json") for r in self._current.values() if r.state != RecordState.DELETED],
        }
