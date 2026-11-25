"""Passerelle d'écriture vers CORE : seule voie d'écriture de MOUNTASSIR ONE (§4, §36).

Règles appliquées, dans l'ordre :
1. arrêt d'urgence `MEMORY_WRITES` : aucune écriture (les suppressions restent possibles) ;
2. contenu suspect d'injection => quarantaine, jamais actif ;
3. seul le propriétaire authentifié affirme un fait vérifié ; un tiers, un document ou
   l'IA ne produisent jamais de fait vérifié ;
4. doublon => pas de réinsertion ni de hausse de fiabilité (répétition ≠ corroboration) ;
5. contradiction avec une information active => en attente de validation, liée à l'autre ;
6. catégories sensibles (identité, convictions, finances, santé, relations) ou écriture
   non issue du propriétaire => en attente de validation.
Valider, rejeter et supprimer sont réservés au propriétaire sur la console privée.
Le journal d'audit ne contient jamais le contenu.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from ..domain.classification import SensitiveCategory
from ..domain.principals import AssuranceLevel, Channel, Session
from ..domain.records import OWNER_ID, EpistemicStatus, InformationRecord, RecordState, SourceKind
from ..security.audit import AuditLog
from ..security.killswitch import KillScope, KillSwitch
from ..security.untrusted import assess, normalize
from .core_port import CorePort

# Changements qui touchent l'identité, les convictions, les finances, la santé ou les relations (§4).
VALIDATION_CATEGORIES = frozenset({
    SensitiveCategory.IDENTITY_DOCUMENT,
    SensitiveCategory.CONVICTIONS,
    SensitiveCategory.FINANCE,
    SensitiveCategory.HEALTH,
    SensitiveCategory.RELATIONSHIPS,
})
OWNER_SOURCES = frozenset({SourceKind.OWNER_DIRECT, SourceKind.OWNER_CONNECTOR})


class MemoryWriteError(PermissionError):
    pass


@dataclass(frozen=True)
class WriteResult:
    record_id: Optional[str]
    state: Optional[RecordState]
    rule_ids: tuple[str, ...]
    duplicate_of: Optional[str] = None


def _same_claim(a: InformationRecord, b: InformationRecord) -> bool:
    return set(a.subject_ids) == set(b.subject_ids) and a.predicate == b.predicate


class MemoryGateway:
    def __init__(self, core: CorePort, audit: AuditLog, killswitch: KillSwitch) -> None:
        self._core = core
        self._audit = audit
        self._ks = killswitch

    # -- écriture --------------------------------------------------------------------
    def submit(self, session: Session, record: InformationRecord) -> WriteResult:
        actor = session.principal.id
        if self._ks.is_engaged(KillScope.MEMORY_WRITES):
            self._audit.append(actor, "memory.submit", "deny", ("KS-MEMORY",))
            raise MemoryWriteError("écritures mémoire gelées par l'arrêt d'urgence.")

        owner_writes = self._is_owner(session, AssuranceLevel.AUTHENTICATED) and record.provenance.source_kind in OWNER_SOURCES
        if record.status == EpistemicStatus.VERIFIED_FACT and not (owner_writes and record.verified_by == OWNER_ID):
            self._audit.append(actor, "memory.submit", "deny", ("MEM-FACT-OWNER-ONLY",))
            raise MemoryWriteError("seul le propriétaire authentifié peut affirmer un fait vérifié.")
        if record.state not in (RecordState.ACTIVE, RecordState.PENDING_VALIDATION):
            raise MemoryWriteError("état initial invalide : la passerelle décide de l'état.")

        rules: list[str] = []
        live = [r for r in self._core.scan() if r.state in (RecordState.ACTIVE, RecordState.PENDING_VALIDATION)]
        same = [r for r in live if _same_claim(r, record)]
        dup = next((r for r in same if normalize(r.content).strip() == normalize(record.content).strip()), None)
        if dup is not None:
            self._audit.append(actor, "memory.submit", "noop", ("MEM-DUPLICATE",), (dup.id,))
            return WriteResult(None, None, ("MEM-DUPLICATE",), duplicate_of=dup.id)

        conflicts = tuple(r.id for r in same if r.state == RecordState.ACTIVE)
        if assess(record.content).suspicious:
            state, rules = RecordState.QUARANTINED, ["MEM-INJECTION-QUARANTINE"]
        elif conflicts:
            state, rules = RecordState.PENDING_VALIDATION, ["MEM-CONTRADICTION"]
        elif record.categories & VALIDATION_CATEGORIES:
            state, rules = RecordState.PENDING_VALIDATION, ["MEM-SENSITIVE-VALIDATION"]
        elif not owner_writes:
            state, rules = RecordState.PENDING_VALIDATION, ["MEM-NON-OWNER-VALIDATION"]
        else:
            state, rules = RecordState.ACTIVE, ["MEM-OWNER-DIRECT"]

        stored = record.model_copy(update={"state": state, "conflicts_with": conflicts})
        self._core.put(stored)
        self._audit.append(actor, "memory.submit", state.value, tuple(rules), (stored.id, *conflicts))
        return WriteResult(stored.id, state, tuple(rules))

    # -- actions réservées au propriétaire -------------------------------------------
    def approve(self, session: Session, record_id: str) -> InformationRecord:
        """Rend actif un enregistrement en attente ; s'il en contredit d'autres, il les remplace."""
        rec = self._owner_action(session, "memory.approve", record_id)
        if rec.state != RecordState.PENDING_VALIDATION:
            raise MemoryWriteError("seul un enregistrement en attente peut être validé.")
        for old_id in rec.conflicts_with:
            old = self._core.get(old_id)
            if old is not None and old.state == RecordState.ACTIVE:
                # remplacée, pas supprimée : elle n'était pas fausse à l'époque.
                self._core.put(old.model_copy(update={"state": RecordState.SUPERSEDED, "version": old.version + 1}))
        new = rec.model_copy(update={
            "state": RecordState.ACTIVE,
            "version": rec.version + 1,
            "supersedes": rec.conflicts_with[0] if rec.conflicts_with else rec.supersedes,
        })
        self._core.put(new)
        self._audit.append(session.principal.id, "memory.approve", "allow", ("MEM-OWNER-VALIDATION",), (record_id, *rec.conflicts_with))
        return new

    def reject(self, session: Session, record_id: str) -> None:
        rec = self._owner_action(session, "memory.reject", record_id)
        if rec.state not in (RecordState.PENDING_VALIDATION, RecordState.QUARANTINED):
            raise MemoryWriteError("seul un enregistrement en attente ou en quarantaine peut être rejeté.")
        self._core.tombstone(record_id)
        self._audit.append(session.principal.id, "memory.reject", "allow", ("MEM-OWNER-VALIDATION",), (record_id,))

    def delete(self, session: Session, record_id: str) -> None:
        """Effacement effectif (§9 des tests). Autorisé même sous arrêt d'urgence : il réduit les données."""
        self._owner_action(session, "memory.delete", record_id)
        self._core.tombstone(record_id)
        self._audit.append(session.principal.id, "memory.delete", "allow", ("MEM-OWNER-DELETE",), (record_id,))

    def pending(self, session: Session) -> list[InformationRecord]:
        if not self._is_owner(session, AssuranceLevel.STRONG):
            raise MemoryWriteError("file de validation réservée au propriétaire.")
        return [r for r in self._core.scan() if r.state in (RecordState.PENDING_VALIDATION, RecordState.QUARANTINED)]

    # -- interne ---------------------------------------------------------------------
    @staticmethod
    def _is_owner(session: Session, min_assurance: AssuranceLevel) -> bool:
        return session.is_owner and session.channel == Channel.OWNER_CONSOLE and session.assurance >= min_assurance

    def _owner_action(self, session: Session, action: str, record_id: str) -> InformationRecord:
        if not self._is_owner(session, AssuranceLevel.STRONG):
            self._audit.append(session.principal.id, action, "deny", ("MEM-OWNER-ONLY",), (record_id,))
            raise MemoryWriteError("action réservée au propriétaire (console privée, authentification forte).")
        rec = self._core.get(record_id)
        if rec is None or rec.state == RecordState.DELETED:
            raise MemoryWriteError("enregistrement introuvable.")
        return rec
