"""Classification C0–C5 (§26), catégories sensibles et règles d'héritage."""

from __future__ import annotations

from enum import Enum, IntEnum
from typing import Iterable, Optional


class Classification(IntEnum):
    C0_PUBLIC = 0
    C1_SHARED = 1
    C2_CONFIDENTIAL = 2
    C3_PRIVATE = 3
    C4_SENSITIVE = 4
    C5_VAULT = 5


# Une donnée non classée est traitée comme C4 partout (fail-closed) :
# non divulgable, non chargée dans un contexte externe, routée en local uniquement.
UNCLASSIFIED_EFFECTIVE = Classification.C4_SENSITIVE


class SensitiveCategory(str, Enum):
    HEALTH = "health"
    INTIMATE = "intimate"
    FINANCE = "finance"
    LOCATION = "location"
    SECURITY = "security"
    IDENTITY_DOCUMENT = "identity_document"
    LEGAL = "legal"
    CONVICTIONS = "convictions"
    RELATIONSHIPS = "relationships"


# Plancher de classification imposé par catégorie : une donnée de santé ne peut
# jamais être déclarée C0–C3, même par erreur de saisie.
CATEGORY_FLOOR: dict[SensitiveCategory, Classification] = {
    SensitiveCategory.HEALTH: Classification.C4_SENSITIVE,
    SensitiveCategory.INTIMATE: Classification.C4_SENSITIVE,
    SensitiveCategory.SECURITY: Classification.C4_SENSITIVE,
    SensitiveCategory.IDENTITY_DOCUMENT: Classification.C4_SENSITIVE,
    SensitiveCategory.FINANCE: Classification.C3_PRIVATE,
}


def effective(c: Optional[Classification]) -> Classification:
    """Classification appliquée par les contrôles (inconnu => C4)."""
    return UNCLASSIFIED_EFFECTIVE if c is None else c


def floor_for(categories: Iterable[SensitiveCategory]) -> Classification:
    floors = [CATEGORY_FLOOR[c] for c in categories if c in CATEGORY_FLOOR]
    return max(floors) if floors else Classification.C0_PUBLIC


def derive(sources: Iterable[Optional[Classification]]) -> Optional[Classification]:
    """Classification d'une information dérivée de plusieurs sources.

    - hérite de la source la plus restrictive ;
    - si une source est C5, la dérivée est C5 ;
    - si une source n'est pas classée, la dérivée ne l'est pas non plus (reste fail-closed).
    """
    srcs = list(sources)
    if not srcs:
        return None
    known = [s for s in srcs if s is not None]
    if known and max(known) == Classification.C5_VAULT:
        return Classification.C5_VAULT
    if len(known) < len(srcs):
        return None
    return max(known)
