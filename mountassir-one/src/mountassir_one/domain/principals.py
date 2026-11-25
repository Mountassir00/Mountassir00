"""Identités, niveaux d'assurance et sessions (§10, §28).

Règle fondamentale : une identité revendiquée dans le contenu d'un message n'est
JAMAIS une identité vérifiée. Seul le niveau d'assurance fourni par la couche
d'authentification ouvre des droits.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum, IntEnum
from typing import Optional
from uuid import uuid4

from .records import OWNER_ID, utcnow


class AssuranceLevel(IntEnum):
    CLAIMED = 0  # identité seulement affirmée dans le message
    CHANNEL = 1  # identifiant de canal connu (e-mail, numéro) — usurpable
    AUTHENTICATED = 2  # connexion au portail (mot de passe / OAuth)
    STRONG = 3  # MFA ou passkey
    STEP_UP = 4  # ré-authentification forte récente, requise pour l'administration


class PrincipalKind(str, Enum):
    OWNER = "owner"
    CONTACT = "contact"
    ANONYMOUS = "anonymous"
    AGENT = "agent"  # un agent IA du système : ne peut jamais s'accorder de droits
    SERVICE = "service"


class Channel(str, Enum):
    OWNER_CONSOLE = "owner_console"  # tableau de bord privé (plan privé)
    PUBLIC_PORTAL = "public_portal"  # portail externe (plan public)
    EMAIL = "email"
    MESSAGING = "messaging"
    API = "api"
    INTERNAL = "internal"


@dataclass(frozen=True)
class Principal:
    id: str
    kind: PrincipalKind
    groups: frozenset[str] = frozenset()  # "friends", "clients", "prospects"...
    org_affiliations: frozenset[str] = frozenset()  # "org:alpha"
    projects: frozenset[str] = frozenset()  # "project:x"


@dataclass(frozen=True)
class Session:
    principal: Principal
    assurance: AssuranceLevel
    channel: Channel
    session_id: str = field(default_factory=lambda: f"ses_{uuid4().hex[:10]}")
    authenticated_at: Optional[datetime] = None
    claimed_identity: Optional[str] = None
    claims_owner: bool = False

    @property
    def is_owner(self) -> bool:
        return self.principal.kind == PrincipalKind.OWNER

    def audience_tokens(self) -> frozenset[str]:
        """Jetons d'audience utilisables pour les autorisations.

        Une identité simplement revendiquée n'ouvre que l'audience publique.
        """
        tokens = {"public"}
        if self.assurance >= AssuranceLevel.CHANNEL and self.principal.kind == PrincipalKind.CONTACT:
            tokens.add(f"person:{self.principal.id}")
            tokens.update(f"group:{g}" for g in self.principal.groups)
            tokens.update(self.principal.projects)
        return frozenset(tokens)


def is_fresh_step_up(session: Session, max_age: timedelta, now: Optional[datetime] = None) -> bool:
    if session.assurance < AssuranceLevel.STEP_UP or session.authenticated_at is None:
        return False
    return (now or utcnow()) - session.authenticated_at <= max_age


class IdentityDirectory:
    """Résolution des identités à partir de preuves d'authentification, jamais du contenu."""

    def __init__(self) -> None:
        self._by_identifier: dict[str, Principal] = {}
        self.owner = Principal(OWNER_ID, PrincipalKind.OWNER)

    def register(self, verified_identifier: str, principal: Principal) -> None:
        if principal.kind == PrincipalKind.OWNER:
            raise ValueError("le propriétaire ne se résout que via la console privée authentifiée.")
        self._by_identifier[verified_identifier] = principal

    def resolve(
        self,
        channel: Channel,
        assurance: AssuranceLevel,
        verified_identifier: Optional[str] = None,
        claimed_identity: Optional[str] = None,
        owner_credential_ok: bool = False,
        authenticated_at: Optional[datetime] = None,
        owner_aliases: tuple[str, ...] = (),
    ) -> Session:
        claims_owner = bool(
            claimed_identity
            and (claimed_identity == OWNER_ID or claimed_identity.lower() in {a.lower() for a in owner_aliases})
        )
        if owner_credential_ok and channel == Channel.OWNER_CONSOLE and assurance >= AssuranceLevel.STRONG:
            return Session(self.owner, assurance, channel, authenticated_at=authenticated_at or utcnow())
        principal = self._by_identifier.get(verified_identifier or "") if assurance >= AssuranceLevel.CHANNEL else None
        if principal is None:
            anon = Principal(f"anon:{uuid4().hex[:8]}", PrincipalKind.ANONYMOUS)
            return Session(
                anon,
                AssuranceLevel.CLAIMED if assurance >= AssuranceLevel.CHANNEL else assurance,
                channel,
                claimed_identity=claimed_identity,
                claims_owner=claims_owner,
            )
        return Session(
            principal,
            assurance,
            channel,
            authenticated_at=authenticated_at,
            claimed_identity=claimed_identity,
            claims_owner=claims_owner,
        )
