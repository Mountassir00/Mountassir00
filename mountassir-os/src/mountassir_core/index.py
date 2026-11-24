"""SEARCH ENGINE — FTS5 (BM25) + pluggable vector index, both derived and rebuildable.

The default embedder is a *lexical* character-trigram hashing model: deterministic, local,
zero-cost, typo/inflection tolerant — but NOT semantic. A real embedding model (e.g. a local
Ollama model) can be plugged in through the ``Embedder`` protocol without schema changes.
"""

from __future__ import annotations

import hashlib
import math
import re
import sqlite3
from array import array
from typing import Any, Protocol

from .util import strip_diacritics

_WORD = re.compile(r"\w+")


class Embedder(Protocol):
    model: str
    dim: int

    def embed(self, text: str) -> list[float]: ...


class HashingEmbedder:
    model = "lexical-hash-v1"

    def __init__(self, dim: int = 256):
        self.dim = dim

    def embed(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for word in _WORD.findall(strip_diacritics(text.casefold())):
            token = f"#{word}#"
            for i in range(max(1, len(token) - 2)):
                h = int.from_bytes(hashlib.blake2b(token[i : i + 3].encode(), digest_size=8).digest(), "big")
                vec[h % self.dim] += 1.0 if (h >> 63) & 1 else -1.0
        norm = math.sqrt(sum(v * v for v in vec))
        return [v / norm for v in vec] if norm else vec


def _pack(vec: list[float]) -> bytes:
    return array("f", vec).tobytes()


def _unpack(blob: bytes) -> array:
    a = array("f")
    a.frombytes(blob)
    return a


def _cosine(a, b) -> float:
    return sum(x * y for x, y in zip(a, b, strict=True))


def match_expression(query: str) -> str | None:
    """Turn free text into a safe FTS5 expression (prefix OR query); None if nothing usable."""
    tokens: list[str] = []
    for t in _WORD.findall(strip_diacritics(query.casefold())):
        if len(t) >= 2 and t not in tokens:
            tokens.append(t)
    if not tokens:
        return None
    return " OR ".join(f'"{t}"*' for t in tokens[:16])


class SearchIndex:
    VECTOR_FALLBACK_SCAN = 5000
    VECTOR_FALLBACK_MIN_SCORE = 0.30

    def __init__(self, conn: sqlite3.Connection, embedder: Embedder | None = None):
        self.conn = conn
        self.embedder: Embedder = embedder or HashingEmbedder()

    def upsert(self, item_type: str, item_id: str, text: str) -> None:
        row = self.conn.execute(
            "SELECT rowid FROM search_items WHERE item_type = ? AND item_id = ?", (item_type, item_id)
        ).fetchone()
        if row:
            rowid = row[0]
            self.conn.execute("DELETE FROM search_fts WHERE rowid = ?", (rowid,))
        else:
            rowid = self.conn.execute(
                "INSERT INTO search_items(item_type, item_id) VALUES (?, ?)", (item_type, item_id)
            ).lastrowid
        self.conn.execute("INSERT INTO search_fts(rowid, content) VALUES (?, ?)", (rowid, text))
        vec = self.embedder.embed(text)
        self.conn.execute(
            "INSERT OR REPLACE INTO embeddings(item_type, item_id, model, dim, vector) VALUES (?,?,?,?,?)",
            (item_type, item_id, self.embedder.model, len(vec), _pack(vec)),
        )

    def remove(self, item_type: str, item_id: str) -> dict[str, int]:
        fts = 0
        row = self.conn.execute(
            "SELECT rowid FROM search_items WHERE item_type = ? AND item_id = ?", (item_type, item_id)
        ).fetchone()
        if row:
            self.conn.execute("DELETE FROM search_fts WHERE rowid = ?", (row[0],))
            self.conn.execute("DELETE FROM search_items WHERE rowid = ?", (row[0],))
            fts = 1
        emb = self.conn.execute(
            "DELETE FROM embeddings WHERE item_type = ? AND item_id = ?", (item_type, item_id)
        ).rowcount
        return {"fts_rows": fts, "embeddings": emb}

    def search(
        self,
        *,
        item_type: str,
        select_sql: str,
        join_sql: str,
        where_sql: str,
        params: list[Any],
        query: str,
        limit: int,
        id_column: str,
        fallback_order: str,
    ) -> list[tuple[sqlite3.Row, float]]:
        """Hybrid search restricted by ``where_sql`` (the policy clause) *inside* the query."""
        limit = max(1, limit)
        qvec = self.embedder.embed(query)
        expr = match_expression(query)
        rows: list[sqlite3.Row] = []
        bm25: dict[str, float] = {}
        if expr:
            rows = self.conn.execute(
                f"SELECT {select_sql}, bm25(search_fts) AS _rank FROM search_fts"
                f" JOIN search_items si ON si.rowid = search_fts.rowid AND si.item_type = ?"
                f" {join_sql} WHERE search_fts MATCH ? AND {where_sql}"
                f" ORDER BY _rank LIMIT ?",
                [item_type, expr, *params, max(limit * 5, 50)],
            ).fetchall()
            bm25 = {r[id_column]: -float(r["_rank"]) for r in rows}
        if rows:
            vecs = self._vectors(item_type, [r[id_column] for r in rows])
            top = max(bm25.values()) or 1.0
            scored = []
            for r in rows:
                v = vecs.get(r[id_column])
                cos = max(0.0, _cosine(qvec, v)) if v is not None else 0.0
                scored.append((r, 0.75 * (bm25[r[id_column]] / top) + 0.25 * cos))
            scored.sort(key=lambda t: t[1], reverse=True)
            return scored[:limit]
        # Fallback: fuzzy (vector) recall over the permitted set only.
        candidates = self.conn.execute(
            f"SELECT {select_sql} FROM search_items si {join_sql} WHERE si.item_type = ? AND {where_sql}"
            f" ORDER BY {fallback_order} LIMIT ?",
            [item_type, *params, self.VECTOR_FALLBACK_SCAN],
        ).fetchall()
        vecs = self._vectors(item_type, [r[id_column] for r in candidates])
        scored = []
        for r in candidates:
            v = vecs.get(r[id_column])
            if v is None:
                continue
            cos = _cosine(qvec, v)
            if cos >= self.VECTOR_FALLBACK_MIN_SCORE:
                scored.append((r, cos))
        scored.sort(key=lambda t: t[1], reverse=True)
        return scored[:limit]

    def _vectors(self, item_type: str, ids: list[str]) -> dict[str, array]:
        out: dict[str, array] = {}
        for i in range(0, len(ids), 500):
            chunk = ids[i : i + 500]
            marks = ",".join("?" * len(chunk))
            for r in self.conn.execute(
                f"SELECT item_id, vector FROM embeddings WHERE item_type = ? AND model = ? AND item_id IN ({marks})",
                [item_type, self.embedder.model, *chunk],
            ):
                out[r[0]] = _unpack(r[1])
        return out
