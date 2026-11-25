"""Contrat entre MOUNTASSIR ONE et MOUNTASSIR CORE (§3, §4).

ONE ne lit CORE qu'à travers un `RetrievalScope` calculé par le moteur de politiques :
le filtrage intervient AVANT la récupération (CORE ne renvoie rien hors périmètre).
ONE n'écrit jamais directement : il passe par la `MemoryGateway`, qui applique les règles
de provenance, de contradiction, de validation et de quarantaine.

Spécification complète : docs/interfaces/core-protocol.md
"""

from __future__ import annotations

from typing import Optional, Protocol

from pydantic import BaseModel, ConfigDict

from ..domain.classification import Classification, SensitiveCategory, effective
from ..domain.records import DataDomain, InformationRecord, RecordState


class RetrievalScope(BaseModel):
    model_config = ConfigDict(frozen=True)

    max_classification: Classification
    include_unclassified: bool
    domains: frozenset[DataDomain]
    excluded_categories: frozenset[SensitiveCategory] = frozenset()
    states: frozenset[RecordState] = frozenset({RecordState.ACTIVE})
    org_scopes: Optional[frozenset[str]] = None  # None = pas de restriction (propriétaire)

    def admits(self, rec: InformationRecord) -> bool:
        if rec.state not in self.states:
            return False
        if rec.classification is None and not self.include_unclassified:
            return False
        if effective(rec.classification) > self.max_classification:
            return False
        if rec.domain not in self.domains:
            return False
        if rec.categories & self.excluded_categories:
            return False
        if self.org_scopes is not None and rec.domain == DataDomain.ORGANIZATIONAL:
            if rec.org_scope not in self.org_scopes and effective(rec.classification) > Classification.C0_PUBLIC:
                return False
        return True


class Query(BaseModel):
    model_config = ConfigDict(frozen=True)

    text: Optional[str] = None
    subject_id: Optional[str] = None
    predicate: Optional[str] = None
    limit: int = 20


class CorePort(Protocol):
    """Interface que tout adaptateur CORE (référence, PostgreSQL, distant) doit respecter."""

    def query(self, scope: RetrievalScope, q: Query) -> list[InformationRecord]: ...

    def get(self, record_id: str) -> Optional[InformationRecord]: ...

    def put(self, record: InformationRecord) -> None: ...

    def scan(self) -> list[InformationRecord]:
        """Accès complet réservé aux composants de contrôle (garde de sortie, passerelle)."""
        ...

    def history(self, record_id: str) -> list[InformationRecord]: ...

    def tombstone(self, record_id: str) -> None: ...

    def export(self) -> dict: ...
