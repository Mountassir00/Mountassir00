"""Journal d'audit inviolable par chaînage HMAC (§29).

- Chaque entrée inclut le MAC de la précédente : toute modification, suppression ou
  réorganisation est détectée par `verify()`.
- Le journal ne contient JAMAIS le contenu des informations : uniquement des identifiants,
  des décisions et des identifiants de règles (minimisation).
- En production : clé HMAC dans le coffre-fort, et ancrage périodique de `head()` hors
  système (ex. e-mail à soi-même, stockage WORM) pour détecter une réécriture complète.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Optional

from ..domain.records import utcnow

_MAX_DETAIL_LEN = 120
GENESIS = "0" * 64


@dataclass(frozen=True)
class AuditEntry:
    seq: int
    ts: str
    actor: str
    action: str
    effect: str
    rule_ids: tuple[str, ...]
    record_ids: tuple[str, ...]
    details: dict = field(default_factory=dict)
    prev_mac: str = GENESIS
    mac: str = ""

    def payload(self) -> bytes:
        body = asdict(self)
        body.pop("mac")
        return json.dumps(body, sort_keys=True, ensure_ascii=False, default=list).encode()


class AuditLog:
    def __init__(self, key: bytes, path: Optional[Path] = None) -> None:
        if len(key) < 32:
            raise ValueError("clé HMAC trop courte (32 octets minimum).")
        self._key = key
        self._path = path
        self.entries: list[AuditEntry] = []

    def _mac(self, entry: AuditEntry) -> str:
        return hmac.new(self._key, entry.payload(), hashlib.sha256).hexdigest()

    def append(
        self,
        actor: str,
        action: str,
        effect: str,
        rule_ids: tuple[str, ...] | list[str] = (),
        record_ids: tuple[str, ...] | list[str] = (),
        details: Optional[dict] = None,
    ) -> AuditEntry:
        safe_details = {str(k): str(v)[:_MAX_DETAIL_LEN] for k, v in (details or {}).items()}
        draft = AuditEntry(
            seq=len(self.entries),
            ts=utcnow().isoformat(),
            actor=actor,
            action=action,
            effect=effect,
            rule_ids=tuple(rule_ids),
            record_ids=tuple(record_ids),
            details=safe_details,
            prev_mac=self.entries[-1].mac if self.entries else GENESIS,
        )
        entry = AuditEntry(**{**asdict(draft), "rule_ids": draft.rule_ids, "record_ids": draft.record_ids, "mac": self._mac(draft)})
        self.entries.append(entry)
        if self._path is not None:
            with self._path.open("a", encoding="utf-8") as fh:
                fh.write(json.dumps(asdict(entry), ensure_ascii=False, default=list) + "\n")
        return entry

    def verify(self) -> tuple[bool, Optional[int]]:
        """Retourne (intègre, numéro de la première entrée corrompue)."""
        prev = GENESIS
        for i, e in enumerate(self.entries):
            if e.seq != i or e.prev_mac != prev or not hmac.compare_digest(e.mac, self._mac(e)):
                return False, i
            prev = e.mac
        return True, None

    def head(self) -> str:
        return self.entries[-1].mac if self.entries else GENESIS

    def find(self, action: Optional[str] = None, effect: Optional[str] = None) -> list[AuditEntry]:
        return [e for e in self.entries if (action is None or e.action == action) and (effect is None or e.effect == effect)]
