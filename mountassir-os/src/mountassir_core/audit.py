"""Append-only, hash-chained audit log.

Each entry hashes (ts, actor, action, target, outcome, detail, prev_hash). Editing or
deleting a past entry breaks the chain from that point; ``verify`` reports where.
Entries hold identifiers and short reasons only — never memory content or queries.
For tamper-evidence against someone able to rewrite the whole file, periodically copy
the head hash (``mcore audit verify``) somewhere outside this machine.
"""

from __future__ import annotations

from typing import Any

from .db import Database
from .util import dumps, now_iso, sha256_hex

GENESIS = "0" * 64


def _entry_hash(ts, actor, action, target_type, target_id, outcome, detail, prev_hash) -> str:
    return sha256_hex(dumps([ts, actor, action, target_type, target_id, outcome, detail, prev_hash]))


class AuditLog:
    def __init__(self, db: Database):
        self.db = db

    def record(
        self,
        actor: str,
        action: str,
        outcome: str,
        target_type: str | None = None,
        target_id: str | None = None,
        detail: str | None = None,
    ) -> int:
        if detail is not None and len(detail) > 300:
            detail = detail[:297] + "..."
        with self.db.tx() as conn:
            row = conn.execute("SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1").fetchone()
            prev_hash = row[0] if row else GENESIS
            ts = now_iso()
            h = _entry_hash(ts, actor, action, target_type, target_id, outcome, detail, prev_hash)
            cur = conn.execute(
                "INSERT INTO audit_log(ts, actor, action, target_type, target_id, outcome, detail, prev_hash, entry_hash)"
                " VALUES (?,?,?,?,?,?,?,?,?)",
                (ts, actor, action, target_type, target_id, outcome, detail, prev_hash, h),
            )
            return int(cur.lastrowid)

    def verify(self) -> dict[str, Any]:
        prev = GENESIS
        count = 0
        for r in self.db.conn.execute("SELECT * FROM audit_log ORDER BY seq"):
            count += 1
            expected = _entry_hash(
                r["ts"], r["actor"], r["action"], r["target_type"], r["target_id"],
                r["outcome"], r["detail"], r["prev_hash"],
            )
            if r["prev_hash"] != prev or r["entry_hash"] != expected:
                return {"ok": False, "entries": count, "first_bad_seq": r["seq"], "head": None}
            prev = r["entry_hash"]
        return {"ok": True, "entries": count, "first_bad_seq": None, "head": prev}

    def tail(self, n: int = 20, actor: str | None = None) -> list[dict[str, Any]]:
        sql = "SELECT seq, ts, actor, action, target_type, target_id, outcome, detail FROM audit_log"
        params: list[Any] = []
        if actor:
            sql += " WHERE actor = ?"
            params.append(actor)
        sql += " ORDER BY seq DESC LIMIT ?"
        params.append(n)
        return [dict(r) for r in self.db.conn.execute(sql, params)][::-1]
