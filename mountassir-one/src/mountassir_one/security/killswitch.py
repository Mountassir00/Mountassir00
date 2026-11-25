"""Bouton d'arrêt d'urgence (§29).

Asymétrie volontaire :
- ENCLENCHER est facile : le propriétaire authentifié, un service de surveillance ou un
  agent détectant une anomalie peuvent tirer le frein ;
- RELÂCHER est difficile : uniquement le propriétaire, sur la console privée, avec une
  ré-authentification forte récente (step-up).
"""

from __future__ import annotations

from datetime import timedelta
from enum import Enum
from typing import Iterable, Optional

from ..domain.principals import AssuranceLevel, Channel, PrincipalKind, Session, is_fresh_step_up
from .audit import AuditLog


class KillScope(str, Enum):
    EXTERNAL_REPLIES = "external_replies"
    AUTOMATIONS = "automations"
    MEMORY_WRITES = "memory_writes"
    CONNECTORS = "connectors"


ALL_SCOPES = frozenset(KillScope)


class KillSwitchError(PermissionError):
    pass


class KillSwitch:
    def __init__(self, audit: Optional[AuditLog] = None, step_up_max_age: timedelta = timedelta(minutes=5)) -> None:
        self._engaged: set[KillScope] = set()
        self._audit = audit
        self._max_age = step_up_max_age

    def is_engaged(self, scope: KillScope) -> bool:
        return scope in self._engaged

    @property
    def engaged(self) -> frozenset[KillScope]:
        return frozenset(self._engaged)

    def engage(self, session: Session, scopes: Iterable[KillScope] = ALL_SCOPES, reason: str = "") -> None:
        kind = session.principal.kind
        allowed = (kind == PrincipalKind.OWNER and session.assurance >= AssuranceLevel.AUTHENTICATED) or kind in (
            PrincipalKind.SERVICE,
            PrincipalKind.AGENT,
        )
        if not allowed:
            self._log(session, "killswitch.engage", "deny", ())
            raise KillSwitchError("seuls le propriétaire authentifié ou un composant interne peuvent enclencher l'arrêt.")
        scopes = frozenset(scopes)
        self._engaged |= scopes
        self._log(session, "killswitch.engage", "allow", scopes, reason)

    def release(self, session: Session, scopes: Iterable[KillScope] = ALL_SCOPES) -> None:
        ok = session.is_owner and session.channel == Channel.OWNER_CONSOLE and is_fresh_step_up(session, self._max_age)
        if not ok:
            self._log(session, "killswitch.release", "deny", ())
            raise KillSwitchError("relâcher l'arrêt exige le propriétaire, la console privée et un step-up récent.")
        scopes = frozenset(scopes)
        self._engaged -= scopes
        self._log(session, "killswitch.release", "allow", scopes)

    def _log(self, session: Session, action: str, effect: str, scopes, reason: str = "") -> None:
        if self._audit:
            self._audit.append(
                session.principal.id,
                action,
                effect,
                details={"scopes": ",".join(sorted(s.value for s in scopes)), "reason": reason},
            )
