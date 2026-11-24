"""MEMORY CORE — storage, versioning, provenance, contradictions and cascading deletion.

This module performs data operations only. Authorisation, classification decisions and
auditing live in core.py; callers must already be inside a transaction.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from .db import Database
from .enums import MemoryStatus
from .errors import NotFound, ValidationError
from .index import SearchIndex
from .util import content_hash, new_id, normalize_text, now_iso

MAX_CONTENT_CHARS = 10_000


def _index_text(row: sqlite3.Row | dict[str, Any]) -> str:
    parts = [row["content"]]
    if row["slot"]:
        parts.append(str(row["slot"]).replace(".", " "))
    if row["value"]:
        parts.append(str(row["value"]))
    return "\n".join(parts)


class MemoryStore:
    def __init__(self, db: Database, index: SearchIndex, owner_entity_id: str):
        self.db = db
        self.conn = db.conn
        self.index = index
        self.owner_entity_id = owner_entity_id

    # -- reads -----------------------------------------------------------------------
    def get(self, memory_id: str) -> sqlite3.Row | None:
        return self.conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()

    def require(self, memory_id: str) -> sqlite3.Row:
        row = self.get(memory_id)
        if row is None:
            raise NotFound("memory not found")
        return row

    def provenance(self, memory_id: str) -> list[dict[str, Any]]:
        return [
            dict(r)
            for r in self.conn.execute(
                "SELECT p.role, p.source_id, s.kind AS source_kind, s.label AS source_label,"
                " p.document_id, d.title AS document_title, p.segment_id, p.added_at"
                " FROM memory_provenance p JOIN sources s ON s.id = p.source_id"
                " LEFT JOIN documents d ON d.id = p.document_id WHERE p.memory_id = ? ORDER BY p.added_at",
                (memory_id,),
            )
        ]

    def contested_ids(self, ids: list[str]) -> set[str]:
        if not ids:
            return set()
        marks = ",".join("?" * len(ids))
        rows = self.conn.execute(
            f"SELECT memory_a, memory_b FROM contradictions WHERE status = 'open'"
            f" AND (memory_a IN ({marks}) OR memory_b IN ({marks}))",
            [*ids, *ids],
        ).fetchall()
        out: set[str] = set()
        for a, b in rows:
            out.update({a, b})
        return out & set(ids)

    def versions(self, memory_id: str) -> list[dict[str, Any]]:
        return [
            dict(r)
            for r in self.conn.execute(
                "SELECT * FROM memory_versions WHERE memory_id = ? ORDER BY version", (memory_id,)
            )
        ]

    # -- writes ----------------------------------------------------------------------
    def create(
        self,
        *,
        content: str,
        category: str,
        epistemic_type: str,
        classification: int,
        confidence: float,
        status: str,
        author_type: str,
        author_id: str,
        author_source_id: str,
        actor: str,
        subject_id: str | None = None,
        slot: str | None = None,
        value: str | None = None,
        context: str | None = None,
        observed_at: str | None = None,
        valid_from: str | None = None,
        expires_at: str | None = None,
        evidence: list[dict[str, str]] | None = None,
    ) -> tuple[sqlite3.Row, str | None]:
        """Insert a memory. Returns (row, duplicate_of). Duplicates are never re-inserted
        and never increase confidence: repetition is not corroboration."""
        content = (content or "").strip()
        if not content:
            raise ValidationError("content is empty")
        if len(content) > MAX_CONTENT_CHARS:
            raise ValidationError(f"content exceeds {MAX_CONTENT_CHARS} characters")
        if not 0.0 <= confidence <= 1.0:
            raise ValidationError("confidence must be between 0 and 1")
        subject = subject_id or self.owner_entity_id
        if not self.conn.execute("SELECT 1 FROM entities WHERE id = ?", (subject,)).fetchone():
            raise ValidationError("unknown subject entity")
        chash = content_hash(content)
        existing = self.conn.execute(
            "SELECT * FROM memories WHERE subject_id = ? AND content_hash = ? ORDER BY created_at LIMIT 1",
            (subject, chash),
        ).fetchone()
        if existing is not None:
            if existing["status"] == MemoryStatus.REJECTED:
                raise ValidationError("an identical memory was previously rejected by the owner")
            return existing, existing["id"]

        now = now_iso()
        mid = new_id("mem")
        self.conn.execute(
            "INSERT INTO memories(id, subject_id, category, epistemic_type, content, slot, value, context,"
            " classification, confidence, status, author_type, author_id, observed_at, acquired_at,"
            " last_verified_at, valid_from, expires_at, content_hash, version, created_at, updated_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)",
            (
                mid, subject, category, epistemic_type, content, slot, value, context, classification,
                confidence, status, author_type, author_id, observed_at, now,
                now if status == MemoryStatus.VALIDATED else None, valid_from, expires_at, chash, now, now,
            ),
        )
        self._add_provenance(mid, author_source_id, "author")
        for ev in evidence or []:
            self._add_provenance(mid, ev["source_id"], "evidence", ev.get("document_id"), ev.get("segment_id"))
        row = self.require(mid)
        self._snapshot(row, actor, "created")
        self.index.upsert("memory", mid, _index_text(row))
        return row, None

    def _add_provenance(self, mid, source_id, role, document_id=None, segment_id=None) -> None:
        self.conn.execute(
            "INSERT OR IGNORE INTO memory_provenance(memory_id, source_id, role, document_id, segment_id, added_at)"
            " VALUES (?,?,?,?,?,?)",
            (mid, source_id, role, document_id, segment_id, now_iso()),
        )

    def _snapshot(self, row: sqlite3.Row, actor: str, reason: str | None) -> None:
        self.conn.execute(
            "INSERT INTO memory_versions(memory_id, version, content, slot, value, classification, epistemic_type,"
            " confidence, status, changed_at, changed_by, change_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                row["id"], row["version"], row["content"], row["slot"], row["value"], row["classification"],
                row["epistemic_type"], row["confidence"], row["status"], row["updated_at"], actor, reason,
            ),
        )

    def update(self, memory_id: str, changes: dict[str, Any], *, actor: str, reason: str | None) -> sqlite3.Row:
        allowed = {
            "content", "slot", "value", "context", "classification", "confidence", "status", "epistemic_type",
            "category", "last_verified_at", "valid_until", "expires_at",
        }
        bad = set(changes) - allowed
        if bad:
            raise ValidationError(f"cannot change {sorted(bad)}")
        row = self.require(memory_id)
        if "content" in changes:
            changes["content"] = (changes["content"] or "").strip()
            if not changes["content"]:
                raise ValidationError("content is empty")
            changes["content_hash"] = content_hash(changes["content"])
        changes["version"] = row["version"] + 1
        changes["updated_at"] = now_iso()
        cols = ", ".join(f"{k} = ?" for k in changes)
        self.conn.execute(f"UPDATE memories SET {cols} WHERE id = ?", [*changes.values(), memory_id])
        new = self.require(memory_id)
        self._snapshot(new, actor, reason)
        if {"content", "slot", "value"} & set(changes):
            self.index.upsert("memory", memory_id, _index_text(new))
        return new

    def reject(self, memory_id: str, *, actor: str, reason: str | None) -> None:
        """Wipe content (minimisation) but keep the hash so the same text cannot be re-proposed."""
        self.conn.execute("DELETE FROM memory_versions WHERE memory_id = ?", (memory_id,))
        self.conn.execute(
            "UPDATE memories SET status = 'rejected', content = '[rejected]', slot = NULL, value = NULL,"
            " context = NULL, version = version + 1, updated_at = ? WHERE id = ?",
            (now_iso(), memory_id),
        )
        self.index.remove("memory", memory_id)
        self.conn.execute(
            "INSERT INTO memory_versions(memory_id, version, content, classification, epistemic_type, confidence,"
            " status, changed_at, changed_by, change_reason)"
            " SELECT id, version, '[rejected]', classification, epistemic_type, confidence, status, updated_at, ?, ?"
            " FROM memories WHERE id = ?",
            (actor, reason, memory_id),
        )

    def detect_contradictions(self, memory_id: str) -> list[str]:
        """Same subject + same slot + different value among currently valid memories => open contradiction."""
        row = self.require(memory_id)
        if not row["slot"] or row["status"] != MemoryStatus.VALIDATED:
            return []
        now = now_iso()
        created: list[str] = []
        mine = normalize_text(row["value"] or row["content"])
        for other in self.conn.execute(
            "SELECT id, value, content FROM memories WHERE subject_id = ? AND slot = ? AND id != ?"
            " AND status = 'validated' AND (valid_until IS NULL OR valid_until > ?)",
            (row["subject_id"], row["slot"], memory_id, now),
        ).fetchall():
            if normalize_text(other["value"] or other["content"]) == mine:
                continue
            exists = self.conn.execute(
                "SELECT 1 FROM contradictions WHERE status = 'open' AND"
                " ((memory_a = ? AND memory_b = ?) OR (memory_a = ? AND memory_b = ?))",
                (other["id"], memory_id, memory_id, other["id"]),
            ).fetchone()
            if exists:
                continue
            cid = new_id("ctr")
            self.conn.execute(
                "INSERT INTO contradictions(id, memory_a, memory_b, slot, status, detected_at) VALUES (?,?,?,?,'open',?)",
                (cid, other["id"], memory_id, row["slot"], now),
            )
            created.append(cid)
        return created

    def delete(self, memory_id: str, *, actor: str, reason: str | None) -> dict[str, Any]:
        """Hard delete + every derived artefact. Leaves a content-free tombstone."""
        self.require(memory_id)
        q = lambda sql: self.conn.execute(sql, (memory_id,)).fetchone()[0]  # noqa: E731
        report: dict[str, Any] = {
            "memory_id": memory_id,
            "versions": q("SELECT COUNT(*) FROM memory_versions WHERE memory_id = ?"),
            "provenance_links": q("SELECT COUNT(*) FROM memory_provenance WHERE memory_id = ?"),
        }
        # Packages citing this memory are deleted outright: they may carry an agent-written purpose
        # mentioning it, and an agent must not keep working from a context that no longer exists.
        report["context_packages_deleted"] = self.conn.execute(
            "DELETE FROM context_packages WHERE id IN"
            " (SELECT package_id FROM context_package_items WHERE memory_id = ?)",
            (memory_id,),
        ).rowcount
        report["contradictions"] = self.conn.execute(
            "SELECT COUNT(*) FROM contradictions WHERE memory_a = ? OR memory_b = ?", (memory_id, memory_id)
        ).fetchone()[0]
        report.update(self.index.remove("memory", memory_id))
        self.conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))  # cascades versions/links/items
        self.conn.execute(
            "INSERT INTO tombstones(id, item_type, item_id, deleted_at, actor, reason) VALUES (?,?,?,?,?,?)",
            (new_id("tmb"), "memory", memory_id, now_iso(), actor, reason),
        )
        return report
