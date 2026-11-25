from datetime import timedelta

import pytest

from mountassir_one.domain.classification import Classification as C
from mountassir_one.domain.principals import (AssuranceLevel as A, Channel, IdentityDirectory, Principal,
                                              PrincipalKind, Session)
from mountassir_one.domain.records import (OWNER_ID, DataDomain, EpistemicStatus, InformationRecord, Provenance,
                                           SourceKind, utcnow)
from mountassir_one.memory.gateway import MemoryGateway
from mountassir_one.memory.reference_core import ReferenceCore
from mountassir_one.policy.config import PolicyConfig
from mountassir_one.policy.engine import PolicyEngine
from mountassir_one.security.audit import AuditLog
from mountassir_one.security.killswitch import KillSwitch


class World:
    def __init__(self) -> None:
        self.audit = AuditLog(b"k" * 32)
        self.ks = KillSwitch(self.audit)
        self.core = ReferenceCore()
        self.gateway = MemoryGateway(self.core, self.audit, self.ks)
        self.engine = PolicyEngine(PolicyConfig(), self.audit, self.ks)
        self.directory = IdentityDirectory()
        self.directory.register("ami@example.org", Principal("karim", PrincipalKind.CONTACT, groups=frozenset({"friends"})))
        self.directory.register("collab@alpha.fr", Principal("lea", PrincipalKind.CONTACT, groups=frozenset({"clients"}),
                                                             org_affiliations=frozenset({"org:alpha"})))

    def owner(self, assurance: A = A.STRONG, fresh: bool = True) -> Session:
        at = utcnow() - (timedelta(0) if fresh else timedelta(hours=1))
        return Session(self.directory.owner, assurance, Channel.OWNER_CONSOLE, authenticated_at=at)

    def contact(self, identifier: str, assurance: A = A.AUTHENTICATED, **kw) -> Session:
        return self.directory.resolve(Channel.PUBLIC_PORTAL, assurance, verified_identifier=identifier, **kw)

    def stranger(self, **kw) -> Session:
        return self.directory.resolve(Channel.PUBLIC_PORTAL, A.CLAIMED, **kw)

    def seed(self, rec: InformationRecord) -> InformationRecord:
        self.core.put(rec)
        return rec

    def answer(self, session: Session, text: str, purpose=None):
        scope = self.engine.retrieval_scope(session)
        recs = self.core.scan() if scope is None else [r for r in self.core.scan() if scope.admits(r)]
        return self.engine.decide(session, text, recs if scope else [], purpose)


def rec(content: str, *, cls=C.C0_PUBLIC, domain=DataDomain.SELF, status=EpistemicStatus.DECLARATION,
        predicate="owner.fact", subjects=(OWNER_ID,), source=SourceKind.OWNER_DIRECT, asserted_by=OWNER_ID,
        **kw) -> InformationRecord:
    return InformationRecord(
        subject_ids=subjects, domain=domain, predicate=predicate, content=content, status=status,
        classification=cls, reliability=kw.pop("reliability", 0.9),
        provenance=Provenance(source_kind=source, source_ref="test", asserted_by=asserted_by), **kw)


@pytest.fixture
def w() -> World:
    return World()
