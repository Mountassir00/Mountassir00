"""ARCHIVE + SOURCE REGISTRY + ingestion pipeline.

Pipeline per document: identify source -> identify authors -> deduplicate (content hash,
incremental re-import) -> scan (secrets redacted, injection quarantined, sensitive topics
raise classification) -> store -> index. One transaction per document, so an interrupted
import resumes by simply running it again.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from .db import Database
from .enums import DEFAULT_CLASSIFICATION
from .errors import NotFound
from .guard import scan
from .importers import ParsedDocument
from .index import SearchIndex
from .util import dumps, new_id, now_iso, sha256_hex


class Archive:
    def __init__(self, db: Database, index: SearchIndex):
        self.db = db
        self.conn = db.conn
        self.index = index

    # -- sources ---------------------------------------------------------------------
    def get_or_create_source(self, kind: str, label: str, classification: int | None = None) -> sqlite3.Row:
        row = self.conn.execute("SELECT * FROM sources WHERE kind = ? AND label = ?", (kind, label)).fetchone()
        if row:
            return row
        sid = new_id("src")
        self.conn.execute(
            "INSERT INTO sources(id, kind, label, classification, created_at) VALUES (?,?,?,?,?)",
            (sid, kind, label, DEFAULT_CLASSIFICATION if classification is None else classification, now_iso()),
        )
        return self.conn.execute("SELECT * FROM sources WHERE id = ?", (sid,)).fetchone()

    def require_source(self, source_id: str) -> sqlite3.Row:
        row = self.conn.execute("SELECT * FROM sources WHERE id = ?", (source_id,)).fetchone()
        if row is None:
            raise NotFound("source not found")
        return row

    def list_sources(self) -> list[dict[str, Any]]:
        return [
            dict(r)
            for r in self.conn.execute(
                "SELECT s.*, (SELECT COUNT(*) FROM documents d WHERE d.source_id = s.id) AS documents,"
                " (SELECT COUNT(DISTINCT memory_id) FROM memory_provenance p WHERE p.source_id = s.id) AS memories"
                " FROM sources s ORDER BY s.created_at"
            )
        ]

    # -- import runs -----------------------------------------------------------------
    def completed_run(self, source_id: str, file_hash: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM import_runs WHERE source_id = ? AND file_hash = ? AND status = 'completed'",
            (source_id, file_hash),
        ).fetchone()

    def start_run(self, source_id: str, file_name: str, file_hash: str) -> str:
        rid = new_id("run")
        self.conn.execute(
            "INSERT INTO import_runs(id, source_id, file_name, file_hash, status, started_at) VALUES (?,?,?,?,'running',?)",
            (rid, source_id, file_name, file_hash, now_iso()),
        )
        return rid

    def finish_run(self, run_id: str, status: str, stats: dict[str, Any]) -> None:
        self.conn.execute(
            "UPDATE import_runs SET status = ?, finished_at = ?, stats = ? WHERE id = ?",
            (status, now_iso(), dumps(stats), run_id),
        )

    # -- documents -------------------------------------------------------------------
    def upsert_document(self, source: sqlite3.Row, doc: ParsedDocument, stats: dict[str, int]) -> str:
        """Returns 'created' | 'updated' | 'unchanged'. Caller wraps in a transaction."""
        doc_hash = sha256_hex(dumps([doc.title, [(s.author_type, s.content) for s in doc.segments]]))
        existing = self.conn.execute(
            "SELECT id, content_hash FROM documents WHERE source_id = ? AND external_id = ?",
            (source["id"], doc.external_id),
        ).fetchone()
        now = now_iso()
        if existing and existing["content_hash"] == doc_hash:
            return "unchanged"
        if existing:
            doc_id = existing["id"]
            for seg in self.conn.execute("SELECT id FROM segments WHERE document_id = ?", (doc_id,)).fetchall():
                self.index.remove("segment", seg["id"])
            self.conn.execute("DELETE FROM segments WHERE document_id = ?", (doc_id,))
            self.conn.execute(
                "UPDATE documents SET title = ?, observed_at = ?, content_hash = ?, updated_at = ? WHERE id = ?",
                (doc.title, doc.observed_at, doc_hash, now, doc_id),
            )
            outcome = "updated"
        else:
            doc_id = new_id("doc")
            self.conn.execute(
                "INSERT INTO documents(id, source_id, external_id, kind, title, observed_at, content_hash,"
                " classification, imported_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (doc_id, source["id"], doc.external_id, doc.kind, doc.title, doc.observed_at, doc_hash,
                 source["classification"], now, now),
            )
            outcome = "created"
        doc_class = self.conn.execute("SELECT classification FROM documents WHERE id = ?", (doc_id,)).fetchone()[0]
        for seq, seg in enumerate(doc.segments):
            result = scan(seg.content)
            flags = sorted(set(seg.flags + result.flags))
            classification = max(doc_class, result.classification_floor)
            sid = new_id("seg")
            self.conn.execute(
                "INSERT INTO segments(id, document_id, seq, author_type, author_label, content, content_hash,"
                " observed_at, classification, flags, quarantined, quarantine_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
                (sid, doc_id, seq, seg.author_type, seg.author_label, result.redacted, sha256_hex(result.redacted),
                 seg.observed_at, classification, dumps(flags), int(result.injection),
                 "prompt_injection_suspect" if result.injection else None),
            )
            self.index.upsert("segment", sid, result.redacted)
            stats["segments"] += 1
            stats[f"segments_{seg.author_type}"] = stats.get(f"segments_{seg.author_type}", 0) + 1
            stats["secrets_redacted"] += len(result.secrets)
            stats["quarantined"] += int(result.injection)
            stats["raised_to_c4"] += int(classification > doc_class)
        return outcome

    def segment(self, segment_id: str) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT s.*, d.source_id, d.title AS document_title, d.classification AS document_classification"
            " FROM segments s JOIN documents d ON d.id = s.document_id WHERE s.id = ?",
            (segment_id,),
        ).fetchone()

    # -- quarantine ------------------------------------------------------------------
    def list_quarantine(self, limit: int = 100) -> list[dict[str, Any]]:
        return [
            dict(r)
            for r in self.conn.execute(
                "SELECT s.id, s.document_id, d.title AS document_title, s.author_type, s.quarantine_reason,"
                " substr(s.content, 1, 200) AS excerpt FROM segments s JOIN documents d ON d.id = s.document_id"
                " WHERE s.quarantined = 1 ORDER BY d.imported_at LIMIT ?",
                (limit,),
            )
        ]

    def release(self, segment_id: str) -> None:
        cur = self.conn.execute(
            "UPDATE segments SET quarantined = 0, quarantine_reason = NULL WHERE id = ? AND quarantined = 1",
            (segment_id,),
        )
        if cur.rowcount == 0:
            raise NotFound("segment not found or not quarantined")

    # -- deletion --------------------------------------------------------------------
    def purge_source_index(self, source_id: str) -> int:
        n = 0
        for seg in self.conn.execute(
            "SELECT s.id FROM segments s JOIN documents d ON d.id = s.document_id WHERE d.source_id = ?",
            (source_id,),
        ).fetchall():
            self.index.remove("segment", seg["id"])
            n += 1
        return n
