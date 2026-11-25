"""Enregistrement d'information avec provenance obligatoire (§4, §25).

Chaque information porte : personnes/entités concernées, source, dates d'acquisition et
de vérification, classification, fiabilité, contexte, durée de conservation, autorisations
et statut épistémique. Les invariants ci-dessous sont vérifiés à la construction : un
enregistrement invalide ne peut pas exister en mémoire.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .classification import Classification, SensitiveCategory, floor_for

OWNER_ID = "owner"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EpistemicStatus(str, Enum):
    VERIFIED_FACT = "verified_fact"
    DECLARATION = "declaration"
    PREFERENCE = "preference"
    OBSERVATION = "observation"
    HYPOTHESIS = "hypothesis"
    DEDUCTION = "deduction"


INFERRED_STATUSES = frozenset({EpistemicStatus.HYPOTHESIS, EpistemicStatus.DEDUCTION})


class DataDomain(str, Enum):
    """Séparation des informations (§25, catégories A à F)."""

    SELF = "A_self"
    THIRD_PARTY = "B_third_party"
    RELATIONAL = "C_relational"
    ORGANIZATIONAL = "D_organizational"
    GENERAL_KNOWLEDGE = "E_general_knowledge"
    INFERENCE = "F_inference"


class SourceKind(str, Enum):
    OWNER_DIRECT = "owner_direct"  # saisi par le propriétaire authentifié
    OWNER_CONNECTOR = "owner_connector"  # agenda, banque, capteur autorisés
    THIRD_PARTY = "third_party"  # déclaration d'un tiers
    PUBLIC_SOURCE = "public_source"
    DOCUMENT = "document"
    AI_INFERENCE = "ai_inference"
    SYSTEM = "system"


class RecordState(str, Enum):
    ACTIVE = "active"
    PENDING_VALIDATION = "pending_validation"
    DISPUTED = "disputed"
    SUPERSEDED = "superseded"
    QUARANTINED = "quarantined"
    DELETED = "deleted"  # pierre tombale : identifiant conservé, contenu effacé


class Provenance(BaseModel):
    model_config = ConfigDict(frozen=True)

    source_kind: SourceKind
    source_ref: str = Field(min_length=1)
    asserted_by: str = Field(min_length=1)
    acquired_at: datetime = Field(default_factory=utcnow)
    last_verified_at: Optional[datetime] = None
    derived_from: tuple[str, ...] = ()


class InformationRecord(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str = Field(default_factory=lambda: f"rec_{uuid4().hex[:12]}")
    subject_ids: tuple[str, ...]
    domain: DataDomain
    predicate: str = Field(min_length=1)
    content: str
    status: EpistemicStatus
    classification: Optional[Classification]
    categories: frozenset[SensitiveCategory] = frozenset()
    reliability: float = Field(ge=0.0, le=1.0)
    context: Optional[str] = None
    retention_until: Optional[datetime] = None
    audiences: frozenset[str] = frozenset()  # "public", "group:x", "person:y", "project:z"
    purposes: frozenset[str] = frozenset()  # vide = toute finalité légitime
    org_scope: Optional[str] = None
    quasi_identifiers: frozenset[str] = frozenset()  # ex. "qi:neighborhood"
    provenance: Provenance
    state: RecordState = RecordState.ACTIVE
    version: int = 1
    verified_by: Optional[str] = None
    conflicts_with: tuple[str, ...] = ()
    supersedes: Optional[str] = None

    @model_validator(mode="after")
    def _invariants(self) -> "InformationRecord":
        if self.classification == Classification.C5_VAULT:
            raise ValueError("C5 interdit en mémoire : les secrets vont au coffre-fort (Vault).")
        if self.classification is not None:
            floor = floor_for(self.categories)
            if self.classification < floor:
                raise ValueError(
                    f"classification {self.classification.name} inférieure au plancher "
                    f"{floor.name} imposé par les catégories {sorted(c.value for c in self.categories)}"
                )
        inferred = self.status in INFERRED_STATUSES
        if inferred != (self.domain == DataDomain.INFERENCE):
            raise ValueError("hypothèses/déductions <=> domaine F (INFERENCE), sans exception.")
        if self.provenance.source_kind == SourceKind.AI_INFERENCE and not inferred:
            raise ValueError("une production de l'IA ne peut être qu'une hypothèse ou une déduction.")
        if self.status == EpistemicStatus.VERIFIED_FACT and not self.verified_by:
            raise ValueError("un fait vérifié exige un vérificateur identifié (verified_by).")
        if self.domain == DataDomain.ORGANIZATIONAL and not self.org_scope:
            raise ValueError("une donnée organisationnelle doit être rattachée à une structure (org_scope).")
        if self.domain == DataDomain.THIRD_PARTY and set(self.subject_ids) <= {OWNER_ID}:
            raise ValueError("une donnée de tiers doit concerner au moins une personne autre que le propriétaire.")
        if self.domain != DataDomain.GENERAL_KNOWLEDGE and not self.subject_ids:
            raise ValueError("toute information personnelle doit être rattachée à ses sujets.")
        return self

    @property
    def is_about_owner(self) -> bool:
        return OWNER_ID in self.subject_ids
