"""Moteur de politiques de divulgation, déterministe et indépendant du modèle (§27).

Trois points de contrôle, du plus tôt au plus tard :
1. `retrieval_scope` — AVANT la récupération : CORE ne renvoie rien hors périmètre, donc
   le représentant ne reçoit jamais de donnée qu'il n'a pas le droit de divulguer ;
2. `decide` — PENDANT la préparation : audience, finalité, catégories, rapprochement de
   quasi-identifiants, sujets à escalade (§13) ;
3. `guard_output` — AVANT la transmission : le brouillon ne doit citer aucune information
   hors de l'ensemble autorisé.
La politique (`PolicyConfig`) ne change que par `update_config`, réservé au propriétaire
avec un step-up récent : aucun agent ne peut s'accorder de permission.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import timedelta
from enum import Enum
from typing import Iterable, Optional

from ..domain.classification import Classification
from ..domain.principals import AssuranceLevel, Channel, PrincipalKind, Session, is_fresh_step_up
from ..domain.records import DataDomain, InformationRecord, RecordState
from ..memory.core_port import RetrievalScope
from ..security.audit import AuditLog
from ..security.killswitch import KillScope, KillSwitch
from ..security.untrusted import normalize
from .config import PolicyConfig


class Decision(str, Enum):
    ALLOW = "allow"  # réponse autonome possible avec `allowed`
    ESCALATE = "escalate"  # préparer sans envoyer, transfert au propriétaire (§13)
    DENY = "deny"  # aucune réponse externe


@dataclass(frozen=True)
class DisclosureDecision:
    decision: Decision
    allowed: tuple[InformationRecord, ...]
    withheld: tuple[tuple[str, str], ...]  # (record_id, rule_id)
    rule_ids: tuple[str, ...]
    escalation_reasons: tuple[str, ...] = ()


@dataclass(frozen=True)
class OutputCheck:
    ok: bool
    leaked_ids: tuple[str, ...]


class PolicyError(PermissionError):
    pass


# Sujets qui suspendent toute réponse autonome (§13). Appliqués au texte normalisé.
_ESCALATION: dict[str, re.Pattern[str]] = {code: re.compile(p) for code, p in {
    "financial_commitment": r"\b(paiement|payer|virement|rembours\w*|acompte|facture|devis|pret|payment|pay|invoice|refund)\b",
    "signature": r"\b(sign\w*)\b",
    "contract": r"\b(contrat|contract|engag\w*|accord ferme|bon de commande)\b",
    "conflict": r"\b(litige|conflit|plainte|avocat|mise en demeure|dispute|lawyer)\b",
    "accusation": r"\b(accus\w*|diffamation)\b",
    "medical": r"\b(medic\w*|sante|maladie|diagnostic|traitement|hopital|health|medical)\b",
    "intimate": r"\b(intime|sexu\w*|intimate)\b",
    "public_statement": r"\b(declaration publique|communique|presse|journaliste|interview)\b",
    "administrative": r"\b(prefecture|impots|tribunal|huissier|administration fiscale|urssaf)\b",
    "reputation_crisis": r"\b(scandale|bad buzz|crise|polemique)\b",
}.items()}

_EXTERNAL_DOMAINS = frozenset({
    DataDomain.SELF, DataDomain.RELATIONAL, DataDomain.ORGANIZATIONAL, DataDomain.GENERAL_KNOWLEDGE,
})  # jamais de données de tiers (B) ni d'hypothèses (F) vers l'extérieur
_MIN_LEAK_LEN = 8  # en dessous, trop de faux positifs pour la garde de sortie


def escalation_reasons(text: str) -> tuple[str, ...]:
    norm = normalize(text)
    return tuple(code for code, pat in _ESCALATION.items() if pat.search(norm))


class PolicyEngine:
    def __init__(self, config: PolicyConfig, audit: AuditLog, killswitch: KillSwitch) -> None:
        self._config = config
        self._audit = audit
        self._ks = killswitch
        # Quasi-identifiants déjà divulgués, par interlocuteur (§28 : questions anodines cumulées).
        self._qi_ledger: dict[str, frozenset[str]] = {}

    @property
    def config(self) -> PolicyConfig:
        return self._config

    # -- 1. avant récupération -------------------------------------------------------
    def max_level(self, session: Session) -> Optional[Classification]:
        if self._is_owner_console(session):
            ok = [c for c, a in self._config.owner_min_assurance.items() if session.assurance >= a]
            return max(ok) if ok else None
        ok = [c for c, a in self._config.min_assurance_external.items() if session.assurance >= a]
        if not ok:
            return None
        return min(max(ok), self._config.representative_max_classification)

    def retrieval_scope(self, session: Session) -> Optional[RetrievalScope]:
        """Périmètre de lecture, ou None si l'interlocuteur n'a droit à rien."""
        level = self.max_level(session)
        if level is None:
            return None
        if self._is_owner_console(session):
            return RetrievalScope(max_classification=level, include_unclassified=True,
                                  domains=frozenset(DataDomain))
        return RetrievalScope(
            max_classification=level,
            include_unclassified=False,  # non classé = non partageable
            domains=_EXTERNAL_DOMAINS,
            excluded_categories=self._config.external_forbidden_categories,
            org_scopes=session.principal.org_affiliations,
        )

    # -- 2. pendant la préparation ---------------------------------------------------
    def decide(self, session: Session, request_text: str, records: Iterable[InformationRecord],
               purpose: Optional[str] = None) -> DisclosureDecision:
        records = list(records)
        actor = session.principal.id
        if self._is_owner_console(session):
            scope = self.retrieval_scope(session)
            allowed = tuple(r for r in records if scope is not None and scope.admits(r))
            withheld = tuple((r.id, "POL-OWNER-ASSURANCE") for r in records if r not in allowed)
            return self._log(actor, Decision.ALLOW, allowed, withheld, ("POL-OWNER",))

        rules: list[str] = []
        if self._ks.is_engaged(KillScope.EXTERNAL_REPLIES):
            return self._log(actor, Decision.DENY, (), tuple((r.id, "KS-EXTERNAL") for r in records), ("KS-EXTERNAL",))
        if session.claims_owner:
            rules.append("POL-OWNER-CLAIM-UNVERIFIED")  # « je suis Mountassir » n'ouvre rien

        scope = self.retrieval_scope(session)
        tokens = session.audience_tokens()
        key = self._requester_key(session)
        disclosed = self._qi_ledger.get(key, frozenset())
        budget = self._config.max_qi_per_requester.get(session.assurance, 0)
        allowed: list[InformationRecord] = []
        withheld: list[tuple[str, str]] = []
        for rec in records:
            rule = self._record_rule(rec, scope, tokens, purpose)
            if rule is None and rec.quasi_identifiers:
                union = disclosed | rec.quasi_identifiers
                if any(combo <= union for combo in self._config.protected_qi_combinations):
                    rule = "POL-QI-COMBINATION"
                elif len(union) > budget:
                    rule = "POL-QI-BUDGET"
                else:
                    disclosed = union
            if rule is None:
                allowed.append(rec)
            else:
                withheld.append((rec.id, rule))
        self._qi_ledger[key] = disclosed  # mis à jour dès la préparation : fail-closed

        reasons = escalation_reasons(request_text)
        if reasons:
            rules.append("POL-ESCALATION")
        decision = Decision.ESCALATE if reasons else Decision.ALLOW
        rules.extend(sorted({r for _, r in withheld}))
        return self._log(actor, decision, tuple(allowed), tuple(withheld), tuple(rules) or ("POL-EXTERNAL",), reasons)

    def _record_rule(self, rec: InformationRecord, scope: Optional[RetrievalScope], tokens: frozenset[str],
                     purpose: Optional[str]) -> Optional[str]:
        # Défense en profondeur : on revérifie même ce qui vient d'une requête filtrée.
        if scope is None or not scope.admits(rec):
            return "POL-SCOPE"
        if not (rec.audiences & tokens):
            return "POL-AUDIENCE"
        if rec.purposes and (purpose is None or purpose not in rec.purposes):
            return "POL-PURPOSE"
        return None

    # -- 3. avant transmission -------------------------------------------------------
    def guard_output(self, session: Session, draft: str, all_records: Iterable[InformationRecord],
                     allowed_ids: Iterable[str]) -> OutputCheck:
        """Bloque un brouillon qui reprend le contenu d'une information non autorisée."""
        if self._is_owner_console(session):
            return OutputCheck(True, ())
        allowed = set(allowed_ids)
        text = normalize(draft)
        leaked = tuple(
            r.id for r in all_records
            if r.id not in allowed and r.state != RecordState.DELETED
            and len(normalize(r.content).strip()) >= _MIN_LEAK_LEN and normalize(r.content).strip() in text
        )
        self._audit.append(session.principal.id, "policy.guard_output", "deny" if leaked else "allow",
                           ("POL-OUTPUT-LEAK",) if leaked else (), leaked)
        return OutputCheck(not leaked, leaked)

    # -- administration --------------------------------------------------------------
    def authorize_admin(self, session: Session, action: str) -> None:
        """Toute modification de permissions : propriétaire, console privée, step-up récent."""
        max_age = timedelta(seconds=self._config.step_up_max_age_seconds)
        ok = (session.principal.kind == PrincipalKind.OWNER and session.channel == Channel.OWNER_CONSOLE
              and is_fresh_step_up(session, max_age))
        if not ok:
            rules = ("POL-ADMIN-OWNER-ONLY",) + (("POL-OWNER-CLAIM-UNVERIFIED",) if session.claims_owner else ())
            self._audit.append(session.principal.id, action, "deny", rules)
            raise PolicyError("action d'administration réservée au propriétaire authentifié (step-up récent).")

    def update_config(self, session: Session, new_config: PolicyConfig) -> None:
        self.authorize_admin(session, "policy.update")
        old = self._config.fingerprint()
        self._config = new_config
        self._audit.append(session.principal.id, "policy.update", "allow", ("POL-ADMIN-OWNER-ONLY",),
                           details={"from": old, "to": new_config.fingerprint(), "version": new_config.version})

    # -- interne ---------------------------------------------------------------------
    @staticmethod
    def _is_owner_console(session: Session) -> bool:
        return session.is_owner and session.channel == Channel.OWNER_CONSOLE

    def _requester_key(self, session: Session) -> str:
        if session.principal.kind == PrincipalKind.ANONYMOUS and self._config.pool_anonymous_sessions:
            return "anon:*"  # la rotation d'identités anonymes ne remet pas le budget à zéro
        return session.principal.id

    def _log(self, actor: str, decision: Decision, allowed: tuple[InformationRecord, ...],
             withheld: tuple[tuple[str, str], ...], rules: tuple[str, ...],
             reasons: tuple[str, ...] = ()) -> DisclosureDecision:
        self._audit.append(actor, "policy.decide", decision.value, rules, tuple(r.id for r in allowed),
                           details={"withheld": len(withheld), "escalation": ",".join(reasons)})
        return DisclosureDecision(decision, allowed, withheld, rules, reasons)
