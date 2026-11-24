"""DATA PORTABILITY ENGINE — open-format exports, encrypted backups, verified restore.

Export formats (documented in the generated FORMAT.md):
  * JSON     — complete, machine-readable, re-importable by any tool;
  * Markdown — human-readable without any software (memories by category + raw archive);
  * CSV      — memories, sources, audit log for spreadsheets.
Derived tables (search index, embeddings) are not exported: they are rebuildable.
Token hashes are never exported.

Backup: SQLite snapshot -> AES-256-GCM, key from passphrase via scrypt; header authenticated.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sqlite3
from pathlib import Path
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

from .db import SCHEMA_VERSION
from .errors import BackupError
from .util import now_iso, sha256_hex

EXPORT_FORMAT = "mountassir-core-export"
EXPORT_FORMAT_VERSION = 1
EXPORT_TABLES = [
    "meta", "entities", "sources", "import_runs", "documents", "segments", "memories", "memory_versions",
    "memory_provenance", "contradictions", "tombstones", "agents", "context_packages", "context_package_items",
    "system_flags", "audit_log",
]
SECRET_COLUMNS = {"agents": {"token_hash"}}

MAGIC = b"MCBK1\n"
SCRYPT_N, SCRYPT_R, SCRYPT_P = 2**15, 8, 1
MIN_PASSPHRASE = 12


def _rows(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    hidden = SECRET_COLUMNS.get(table, set())
    out = []
    for r in conn.execute(f"SELECT * FROM {table}"):
        d = dict(r)
        for col in hidden:
            d.pop(col, None)
        out.append(d)
    return out


def export_json(conn: sqlite3.Connection, out_dir: Path) -> Path:
    payload = {
        "format": EXPORT_FORMAT,
        "format_version": EXPORT_FORMAT_VERSION,
        "schema_version": SCHEMA_VERSION,
        "exported_at": now_iso(),
        "tables": {t: _rows(conn, t) for t in EXPORT_TABLES},
    }
    path = out_dir / "mountassir-core.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def _slug(text: str, fallback: str) -> str:
    s = re.sub(r"[^\w\-]+", "-", (text or "").strip().lower()).strip("-")
    return (s[:60] or fallback)


def export_markdown(conn: sqlite3.Connection, out_dir: Path) -> Path:
    md = out_dir / "markdown"
    (md / "memories").mkdir(parents=True, exist_ok=True)
    (md / "archive").mkdir(parents=True, exist_ok=True)
    cats = [r[0] for r in conn.execute("SELECT DISTINCT category FROM memories WHERE status != 'rejected' ORDER BY 1")]
    index_lines = [f"# MOUNTASSIR CORE — export du {now_iso()}", "", "## Mémoires par catégorie", ""]
    for cat in cats:
        rows = conn.execute(
            "SELECT * FROM memories WHERE category = ? AND status != 'rejected' ORDER BY created_at", (cat,)
        ).fetchall()
        lines = [f"# Mémoire : {cat}", ""]
        for m in rows:
            lines += [
                f"## {m['content'][:80].replace(chr(10), ' ')}",
                "",
                f"- id : `{m['id']}`",
                f"- type épistémique : {m['epistemic_type']} · statut : {m['status']} · C{m['classification']}"
                f" · confiance : {m['confidence']}",
                f"- auteur : {m['author_type']} ({m['author_id']}) · observé : {m['observed_at'] or '-'}"
                f" · acquis : {m['acquired_at']} · vérifié : {m['last_verified_at'] or '-'}",
            ]
            if m["slot"]:
                lines.append(f"- attribut : `{m['slot']}` = {m['value'] or ''}")
            if m["valid_until"]:
                lines.append(f"- valable jusqu'au : {m['valid_until']}")
            lines += ["", m["content"], ""]
        (md / "memories" / f"{cat}.md").write_text("\n".join(lines), encoding="utf-8")
        index_lines.append(f"- [{cat}](memories/{cat}.md) — {len(rows)} élément(s)")
    index_lines += ["", "## Archive (conversations et notes)", ""]
    for d in conn.execute(
        "SELECT d.*, s.label AS source_label FROM documents d JOIN sources s ON s.id = d.source_id ORDER BY d.observed_at"
    ).fetchall():
        name = f"{_slug(d['source_label'], 'source')}/{_slug(d['title'], d['id'])}-{d['id'][-6:]}.md"
        path = md / "archive" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        lines = [f"# {d['title'] or '(sans titre)'}", "", f"- source : {d['source_label']} · C{d['classification']}"
                 f" · {d['observed_at'] or ''}", ""]
        for s in conn.execute("SELECT * FROM segments WHERE document_id = ? ORDER BY seq", (d["id"],)):
            who = {"owner": "Moi", "ai": f"IA ({s['author_label']})"}.get(s["author_type"], s["author_type"])
            q = " · QUARANTAINE" if s["quarantined"] else ""
            lines += [f"### {who} — {s['observed_at'] or ''}{q}", "", s["content"], ""]
        path.write_text("\n".join(lines), encoding="utf-8")
        index_lines.append(f"- [{d['title'] or d['id']}](archive/{name})")
    (md / "INDEX.md").write_text("\n".join(index_lines), encoding="utf-8")
    return md


def export_csv(conn: sqlite3.Connection, out_dir: Path) -> Path:
    d = out_dir / "csv"
    d.mkdir(parents=True, exist_ok=True)
    for table in ("memories", "sources", "documents", "audit_log", "tombstones"):
        rows = _rows(conn, table)
        cols = [c[1] for c in conn.execute(f"PRAGMA table_info({table})") if c[1] not in SECRET_COLUMNS.get(table, set())]
        with (d / f"{table}.csv").open("w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
    return d


FORMAT_DOC = """# Format d'export MOUNTASSIR CORE (v{v})

Ce dossier est lisible sans MOUNTASSIR. Il contient :

- `mountassir-core.json` — export complet. Clé `tables` : une liste d'objets par table.
  Les tables dérivées (index plein texte, vecteurs) sont exclues : elles se reconstruisent.
  Les empreintes de jetons d'agents ne sont jamais exportées.
- `markdown/INDEX.md` — mémoires par catégorie + archive des conversations/notes.
- `csv/*.csv` — mémoires, sources, documents, journal d'audit, tombstones.

Champs clés d'une mémoire : `content`, `category` (12 types de mémoire), `epistemic_type`
(fait vérifié, déclaration, préférence, hypothèse, aspiration...), `classification` (0-4, C5
n'est jamais stocké), `confidence` (0-1), `status`, `author_type` (owner / ai / third_party),
`observed_at` / `acquired_at` / `last_verified_at`, `valid_from` / `valid_until`, `version`.
Provenance : table `memory_provenance` (rôle `author` = qui a écrit, `evidence` = d'où c'est tiré).

ATTENTION : cet export est en clair et contient des données privées (jusqu'à C4).
Stockez-le sur un support chiffré ou utilisez `mcore backup` (chiffré).
"""


def export_all(conn: sqlite3.Connection, out_dir: str | os.PathLike[str], formats: list[str]) -> dict[str, str]:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    os.chmod(out, 0o700)
    written: dict[str, str] = {}
    if "json" in formats:
        written["json"] = str(export_json(conn, out))
    if "markdown" in formats:
        written["markdown"] = str(export_markdown(conn, out))
    if "csv" in formats:
        written["csv"] = str(export_csv(conn, out))
    (out / "FORMAT.md").write_text(FORMAT_DOC.format(v=EXPORT_FORMAT_VERSION), encoding="utf-8")
    return written


# --- encrypted backup -----------------------------------------------------------------
def _derive(passphrase: str, salt: bytes) -> bytes:
    return Scrypt(salt=salt, length=32, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P).derive(passphrase.encode("utf-8"))


def snapshot_bytes(conn: sqlite3.Connection) -> bytes:
    mem = sqlite3.connect(":memory:")
    try:
        conn.backup(mem)
        data = bytearray(mem.serialize())
    finally:
        mem.close()
    # Header bytes 18-19 = file format read/write version (2 = WAL). Store the snapshot as a
    # rollback-journal database so it can be deserialised and opened anywhere.
    data[18] = data[19] = 1
    return bytes(data)


def write_backup(conn: sqlite3.Connection, out_path: str | os.PathLike[str], passphrase: str) -> dict[str, Any]:
    if len(passphrase) < MIN_PASSPHRASE:
        raise BackupError(f"passphrase must be at least {MIN_PASSPHRASE} characters")
    data = snapshot_bytes(conn)
    salt, nonce = os.urandom(16), os.urandom(12)
    header = MAGIC + salt + nonce
    blob = header + AESGCM(_derive(passphrase, salt)).encrypt(nonce, data, header)
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(blob)
    os.chmod(out, 0o600)
    counts = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("memories", "documents", "segments", "audit_log")}
    manifest = {
        "format": "mountassir-core-backup", "version": 1, "created_at": now_iso(),
        "schema_version": SCHEMA_VERSION, "plaintext_sha256": sha256_hex(data), "plaintext_bytes": len(data),
        "cipher": "AES-256-GCM", "kdf": {"name": "scrypt", "n": SCRYPT_N, "r": SCRYPT_R, "p": SCRYPT_P},
        "counts": counts,
    }
    Path(str(out) + ".manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return {"path": str(out), **manifest}


def read_backup(path: str | os.PathLike[str], passphrase: str) -> bytes:
    p = Path(path)
    if not p.exists():
        raise BackupError("backup file not found")
    blob = p.read_bytes()
    if not blob.startswith(MAGIC) or len(blob) < len(MAGIC) + 28:
        raise BackupError("not a MOUNTASSIR CORE backup")
    salt = blob[len(MAGIC) : len(MAGIC) + 16]
    nonce = blob[len(MAGIC) + 16 : len(MAGIC) + 28]
    header = blob[: len(MAGIC) + 28]
    try:
        data = AESGCM(_derive(passphrase, salt)).decrypt(nonce, blob[len(header):], header)
    except InvalidTag:
        raise BackupError("wrong passphrase or backup has been tampered with") from None
    manifest = Path(str(p) + ".manifest.json")
    if manifest.exists():
        expected = json.loads(manifest.read_text("utf-8")).get("plaintext_sha256")
        if expected and expected != sha256_hex(data):
            raise BackupError("backup content does not match its manifest")
    mem = sqlite3.connect(":memory:")
    try:
        mem.deserialize(data)
        if mem.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise BackupError("backup database failed integrity check")
        row = mem.execute("SELECT value FROM meta WHERE key = 'schema_version'").fetchone()
        if not row or row[0] != SCHEMA_VERSION:
            raise BackupError("backup schema version is not supported")
    except sqlite3.DatabaseError as e:
        raise BackupError(f"backup is not a valid database: {e}") from None
    finally:
        mem.close()
    return data
