"""Small, dependency-free helpers shared by every CORE module."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any


def _now() -> datetime:
    """Indirection point so tests can freeze or move time."""
    return datetime.now(timezone.utc)


def utcnow() -> datetime:
    return _now()


def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def now_iso() -> str:
    return iso(utcnow())


def hours_from_now(hours: float) -> str:
    return iso(utcnow() + timedelta(hours=hours))


def hour_window() -> str:
    return utcnow().strftime("%Y-%m-%dT%H:00:00Z")


def parse_ts(value: Any) -> str | None:
    """Accept epoch seconds (int/float/str) or ISO-8601; return canonical UTC ISO or None."""
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return iso(datetime.fromtimestamp(float(value), tz=timezone.utc))
    if isinstance(value, str):
        v = value.strip()
        try:
            return iso(datetime.fromtimestamp(float(v), tz=timezone.utc))
        except ValueError:
            pass
        if v.endswith("Z"):
            v = v[:-1] + "+00:00"
        try:
            return iso(datetime.fromisoformat(v))
        except ValueError:
            return None
    return None


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def sha256_hex(data: bytes | str) -> str:
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def strip_diacritics(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


_WS = re.compile(r"\s+")
_EDGE_PUNCT = re.compile(r"^[\W_]+|[\W_]+$")


def normalize_text(text: str) -> str:
    """Canonical form used for deduplication and value comparison."""
    t = strip_diacritics(unicodedata.normalize("NFKC", text)).casefold()
    t = _WS.sub(" ", t).strip()
    return _EDGE_PUNCT.sub("", t)


def content_hash(text: str) -> str:
    return sha256_hex(normalize_text(text))


def dumps(obj: Any) -> str:
    """Canonical JSON (stable key order) — used for hashing and storage."""
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def loads_list(raw: str | None) -> list:
    return json.loads(raw) if raw else []
