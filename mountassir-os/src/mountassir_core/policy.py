"""POLICY ENGINE — deterministic access rules, independent of any LLM.

Rules are applied *before retrieval*: they are compiled into SQL WHERE clauses so data
an agent may not see is never loaded, ranked or handed to a model.

Principles implemented here:
  * deny by default — an agent only gets the scopes and categories explicitly granted;
  * hard ceiling — nothing above C4 crosses the gateway, C5 is never stored;
  * no write-down — an agent cannot write below its own clearance, because what it
    writes may be derived from what it read (Bell–LaPadula *-property);
  * derived data inherits the strictest classification of its evidence;
  * owner-only operations (validate, delete, export, permissions...) are not grantable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .enums import (
    CATEGORY_FLOORS,
    DEFAULT_CLASSIFICATION,
    GATEWAY_HARD_CEILING,
    OWNER_ONLY_EPISTEMIC,
    Classification,
    MemoryCategory,
    MemoryStatus,
    Scope,
)
from .errors import PermissionDenied, ValidationError


@dataclass(frozen=True)
class OwnerPrincipal:
    """The owner. Authenticated by local access to the CLI/database (see docs)."""

    id: str = "owner"
    is_owner: bool = True

    @property
    def label(self) -> str:
        return "owner"


@dataclass(frozen=True)
class AgentPrincipal:
    id: str
    name: str
    max_classification: int
    scopes: frozenset[str]
    categories: frozenset[str]
    quota_per_hour: int
    max_results: int
    source_id: str | None
    is_owner: bool = field(default=False)

    @property
    def label(self) -> str:
        return f"agent:{self.id}"

    @property
    def ceiling(self) -> int:
        return min(self.max_classification, int(GATEWAY_HARD_CEILING))

    def allowed_categories(self) -> list[str]:
        if "*" in self.categories:
            return [c.value for c in MemoryCategory]
        return sorted(self.categories)

    def has(self, scope: Scope) -> bool:
        return scope.value in self.scopes


Principal = OwnerPrincipal | AgentPrincipal

# Operations that are structurally impossible to delegate to an agent.
OWNER_ONLY_ACTIONS = frozenset({
    "memory.add", "memory.approve", "memory.reject", "memory.correct", "memory.reclassify",
    "memory.delete", "memory.history", "contradiction.resolve", "source.delete", "archive.import",
    "quarantine.release", "agent.register", "agent.revoke", "export", "backup", "flags.set",
    "audit.verify", "status", "agent.list", "source.list", "contradiction.list", "quarantine.list",
})


def memory_read_clause(
    p: Principal, *, owner_entity_id: str, now: str, alias: str = "m", owner_statuses: tuple[str, ...] | None = None
) -> tuple[str, list[Any]]:
    """SQL predicate selecting the memories ``p`` may read right now."""
    a = alias
    if p.is_owner:
        statuses = owner_statuses or tuple(s.value for s in MemoryStatus if s != MemoryStatus.REJECTED)
        marks = ",".join("?" * len(statuses))
        return f"{a}.status IN ({marks})", list(statuses)
    assert isinstance(p, AgentPrincipal)
    cats = p.allowed_categories()
    if not cats:
        return "0", []
    clauses = [
        f"{a}.status = 'validated'",
        f"{a}.classification <= ?",
        f"{a}.category IN ({','.join('?' * len(cats))})",
        f"({a}.expires_at IS NULL OR {a}.expires_at > ?)",
    ]
    params: list[Any] = [p.ceiling, *cats, now]
    if not p.has(Scope.THIRD_PARTY_READ):
        clauses.append(f"{a}.subject_id = ?")
        params.append(owner_entity_id)
    return " AND ".join(clauses), params


def segment_read_clause(p: Principal, *, seg: str = "s", doc: str = "d") -> tuple[str, list[Any]]:
    if p.is_owner:
        return "1", []
    assert isinstance(p, AgentPrincipal)
    clauses = [f"{seg}.quarantined = 0", f"{seg}.classification <= ?", f"{doc}.classification <= ?"]
    params: list[Any] = [p.ceiling, p.ceiling]
    if not p.has(Scope.THIRD_PARTY_READ):
        clauses.append(f"{seg}.author_type != 'third_party'")
    return " AND ".join(clauses), params


def write_classification(
    p: Principal,
    requested: int | None,
    *,
    category: str,
    evidence_floor: int = 0,
    scan_floor: int = 0,
) -> tuple[int, list[str]]:
    """Return (classification, notes) for a new memory written by ``p``."""
    notes: list[str] = []
    floor = max(evidence_floor, CATEGORY_FLOORS.get(category, 0))
    if isinstance(p, AgentPrincipal):
        floor = max(floor, p.max_classification, scan_floor)
        value = max(DEFAULT_CLASSIFICATION if requested is None else requested, floor)
        if requested is not None and value != requested:
            notes.append(f"classification raised to C{value} (no write-down / inherited floor)")
    else:
        if requested is None:
            value = max(DEFAULT_CLASSIFICATION, floor, scan_floor)
        else:
            value = max(requested, floor)
            if scan_floor > value:
                notes.append(f"warning: content looks sensitive (suggested C{scan_floor}); kept C{value} as requested")
    if value >= Classification.C5_VAULT:
        raise ValidationError("C5 (vault) data cannot be stored as a memory")
    return int(value), notes


def check_agent_epistemic(p: Principal, epistemic_type: str) -> None:
    if isinstance(p, AgentPrincipal) and epistemic_type in OWNER_ONLY_EPISTEMIC:
        raise PermissionDenied(
            "agents cannot assert 'verified_fact'; propose it as observation, inference or self_statement"
            " — the owner may upgrade it at validation"
        )
