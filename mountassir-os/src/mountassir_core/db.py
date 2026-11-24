"""SQLite access layer: connection settings, schema bootstrap, nested transactions."""

from __future__ import annotations

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from importlib import resources

SCHEMA_VERSION = "1"


class Database:
    def __init__(self, path: str | os.PathLike[str]):
        self.path = str(path)
        in_memory = self.path == ":memory:"
        is_new = not in_memory and not os.path.exists(self.path)
        if not in_memory:
            parent = os.path.dirname(os.path.abspath(self.path))
            os.makedirs(parent, mode=0o700, exist_ok=True)
        self.conn = sqlite3.connect(self.path, isolation_level=None, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON")
        self.conn.execute("PRAGMA busy_timeout = 5000")
        # Overwrite deleted content with zeros: deletion must not leave data in free pages.
        self.conn.execute("PRAGMA secure_delete = ON")
        if not in_memory:
            self.conn.execute("PRAGMA journal_mode = WAL")
            self.conn.execute("PRAGMA synchronous = FULL")
            if is_new:
                os.chmod(self.path, 0o600)
        self._depth = 0
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        try:  # FTS5 is compiled into most SQLite builds, but not guaranteed on every Linux distro.
            self.conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS temp._fts5_probe USING fts5(x)")
            self.conn.execute("DROP TABLE temp._fts5_probe")
        except sqlite3.OperationalError as e:
            raise RuntimeError("this SQLite build lacks FTS5, which MOUNTASSIR CORE requires") from e
        sql = resources.files("mountassir_core").joinpath("schema.sql").read_text("utf-8")
        self.conn.executescript(sql)
        self.conn.execute(
            "INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)", (SCHEMA_VERSION,)
        )
        found = self.get_meta("schema_version")
        if found != SCHEMA_VERSION:
            raise RuntimeError(f"unsupported schema version {found}; expected {SCHEMA_VERSION}")

    def get_meta(self, key: str) -> str | None:
        row = self.conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
        return row[0] if row else None

    def set_meta(self, key: str, value: str) -> None:
        self.conn.execute(
            "INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            (key, value),
        )

    @contextmanager
    def tx(self) -> Iterator[sqlite3.Connection]:
        """Transaction; nested calls become savepoints so an inner failure rolls back only itself."""
        depth = self._depth
        if depth == 0:
            self.conn.execute("BEGIN IMMEDIATE")
        else:
            self.conn.execute(f"SAVEPOINT sp{depth}")
        self._depth += 1
        try:
            yield self.conn
        except BaseException:
            self._depth -= 1
            if depth == 0:
                self.conn.execute("ROLLBACK")
            else:
                self.conn.execute(f"ROLLBACK TO sp{depth}")
                self.conn.execute(f"RELEASE sp{depth}")
            raise
        else:
            self._depth -= 1
            if depth == 0:
                self.conn.execute("COMMIT")
            else:
                self.conn.execute(f"RELEASE sp{depth}")

    def compact_after_deletion(self) -> None:
        """Purge residues of deleted rows: FTS segments and WAL frames."""
        if self._depth:
            return
        self.conn.execute("INSERT INTO search_fts(search_fts) VALUES ('optimize')")
        if self.path != ":memory:":
            self.conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")

    def close(self) -> None:
        self.conn.close()
