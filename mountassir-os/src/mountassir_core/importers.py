"""Parsers for archive material. They only *read* files and yield neutral structures;
storage, scanning and classification happen in the ingestion pipeline (archive.py).

Formats are parsed tolerantly: unknown fields are ignored, missing fields degrade
gracefully. Status: validated against synthetic fixtures only (see docs/07 registre).
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import zipfile
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .enums import AuthorType
from .errors import ValidationError
from .util import parse_ts, sha256_hex

# A message submitted by the owner may still contain pasted text written by someone else.
POSSIBLE_PASTE_CHARS = 3000


@dataclass
class ParsedSegment:
    author_type: str
    author_label: str | None
    content: str
    observed_at: str | None = None
    flags: list[str] = field(default_factory=list)


@dataclass
class ParsedDocument:
    external_id: str
    kind: str
    title: str | None
    observed_at: str | None
    segments: list[ParsedSegment]


_CONV_FILE = re.compile(r"^conversations(?:-\d+)?\.json$")


def _load_conversations(path: str | os.PathLike[str]) -> list[Any]:
    """Load ``conversations.json`` — or every ``conversations-NNN.json`` part of a split export —
    from a JSON file, a directory or a zip archive. Returns the concatenated list."""
    p = Path(path)
    if not p.exists():
        raise ValidationError(f"file not found: {p.name}")
    blobs: list[Any] = []
    if zipfile.is_zipfile(p):
        with zipfile.ZipFile(p) as z:
            names = sorted(n for n in z.namelist() if _CONV_FILE.match(n.rsplit("/", 1)[-1]))
            if not names:
                raise ValidationError(f"no conversations*.json inside archive {p.name}")
            for n in names:
                with z.open(n) as fh:
                    blobs.append(json.load(fh))
    elif p.is_dir():
        files = sorted(f for f in p.rglob("*.json") if _CONV_FILE.match(f.name))
        if not files:
            raise ValidationError(f"no conversations*.json in folder {p.name}")
        for f in files:
            blobs.append(json.loads(f.read_text(encoding="utf-8")))
    else:
        blobs.append(json.loads(p.read_text(encoding="utf-8")))
    out: list[Any] = []
    for b in blobs:
        if isinstance(b, dict) and isinstance(b.get("conversations"), list):
            b = b["conversations"]
        if not isinstance(b, list):
            raise ValidationError("unrecognised export: expected a list of conversations")
        out.extend(b)
    return out


def _owner_segment(text: str, ts: str | None, extra: list[str] | None = None) -> ParsedSegment:
    flags = list(extra or [])
    if len(text) > POSSIBLE_PASTE_CHARS:
        flags.append("possible_paste")
    return ParsedSegment(AuthorType.OWNER.value, "owner", text, ts, flags)


# --- ChatGPT ------------------------------------------------------------------------
def _chatgpt_text(message: dict[str, Any]) -> tuple[str, list[str]]:
    content = message.get("content") or {}
    ctype = content.get("content_type")
    if ctype == "user_editable_context":
        parts = [content.get("user_profile") or "", content.get("user_instructions") or ""]
        return "\n\n".join(p for p in parts if p).strip(), ["custom_instructions"]
    parts = content.get("parts") or []
    text = "\n".join(p for p in parts if isinstance(p, str)).strip()
    if not text and isinstance(content.get("text"), str):
        text = content["text"].strip()
    return text, []


def parse_chatgpt(path: str | os.PathLike[str]) -> Iterator[ParsedDocument]:
    for conv in _load_conversations(path):
        if not isinstance(conv, dict):
            continue
        mapping: dict[str, Any] = conv.get("mapping") or {}
        chain: list[dict[str, Any]] = []
        node_id, seen = conv.get("current_node"), set()
        while node_id and node_id in mapping and node_id not in seen:
            seen.add(node_id)
            chain.append(mapping[node_id])
            node_id = mapping[node_id].get("parent")
        chain.reverse()
        if not chain:  # no current_node: fall back to chronological order of all nodes
            chain = sorted(
                mapping.values(), key=lambda n: ((n.get("message") or {}).get("create_time") or 0)
            )
        segments: list[ParsedSegment] = []
        for node in chain:
            msg = node.get("message")
            if not isinstance(msg, dict):
                continue
            # Hidden messages (weight 0) and internal reasoning (channel "commentary") are not
            # part of the visible conversation.
            if msg.get("weight") == 0 or msg.get("channel") == "commentary":
                continue
            role = (msg.get("author") or {}).get("role")
            text, extra = _chatgpt_text(msg)
            if not text:
                continue
            ts = parse_ts(msg.get("create_time"))
            if role == "user" or extra:
                segments.append(_owner_segment(text, ts, extra))
            elif role == "assistant":
                model = (msg.get("metadata") or {}).get("model_slug") or "unknown"
                segments.append(ParsedSegment(AuthorType.AI.value, f"openai:{model}", text, ts))
            # system / tool messages are skipped: not authored by the owner nor an answer.
        title = conv.get("title")
        created = parse_ts(conv.get("create_time"))
        ext = conv.get("conversation_id") or conv.get("id") or sha256_hex(f"{title}|{created}")[:32]
        yield ParsedDocument(str(ext), "conversation", title, created, segments)


# --- Claude -------------------------------------------------------------------------
def parse_claude(path: str | os.PathLike[str]) -> Iterator[ParsedDocument]:
    for conv in _load_conversations(path):
        if not isinstance(conv, dict):
            continue
        segments: list[ParsedSegment] = []
        for m in conv.get("chat_messages") or []:
            text = (m.get("text") or "").strip()
            if not text:
                blocks = m.get("content") or []
                text = "\n".join(
                    b.get("text", "") for b in blocks if isinstance(b, dict) and b.get("type") == "text"
                ).strip()
            if not text:
                continue
            ts = parse_ts(m.get("created_at"))
            sender = m.get("sender")
            if sender == "human":
                segments.append(_owner_segment(text, ts))
            elif sender == "assistant":
                segments.append(ParsedSegment(AuthorType.AI.value, "anthropic:claude", text, ts))
        ext = conv.get("uuid") or sha256_hex(json.dumps(conv, sort_keys=True))[:32]
        yield ParsedDocument(str(ext), "conversation", conv.get("name"), parse_ts(conv.get("created_at")), segments)


# --- Generic JSONL (bridge for Gemini, Mistral, Perplexity... after conversion) -------
JSONL_AUTHORS = {a.value for a in AuthorType}


def parse_jsonl(path: str | os.PathLike[str]) -> Iterator[ParsedDocument]:
    """One JSON object per line: conversation_id, title?, author, author_label?, content, timestamp?"""
    p = Path(path)
    if not p.exists():
        raise ValidationError(f"file not found: {p.name}")
    docs: dict[str, ParsedDocument] = {}
    with p.open("r", encoding="utf-8") as fh:
        for lineno, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                raise ValidationError(f"invalid JSON on line {lineno}") from None
            author = obj.get("author")
            if author not in JSONL_AUTHORS:
                raise ValidationError(f"line {lineno}: author must be one of {sorted(JSONL_AUTHORS)}")
            content = (obj.get("content") or "").strip()
            if not content:
                continue
            cid = str(obj.get("conversation_id") or "default")
            doc = docs.setdefault(cid, ParsedDocument(cid, "conversation", obj.get("title"), None, []))
            ts = parse_ts(obj.get("timestamp"))
            doc.observed_at = doc.observed_at or ts
            if author == AuthorType.OWNER.value:
                doc.segments.append(_owner_segment(content, ts))
            else:
                doc.segments.append(ParsedSegment(author, obj.get("author_label"), content, ts))
    yield from docs.values()


# --- Markdown / text notes ----------------------------------------------------------
MAX_SEGMENT_CHARS = 1500


def _split_note(text: str) -> list[str]:
    chunks: list[str] = []
    current: list[str] = []
    size = 0
    for block in [b.strip() for b in text.replace("\r\n", "\n").split("\n\n")]:
        if not block:
            continue
        starts_section = block.startswith("#")
        if current and (starts_section or size + len(block) > MAX_SEGMENT_CHARS):
            chunks.append("\n\n".join(current))
            current, size = [], 0
        current.append(block)
        size += len(block)
    if current:
        chunks.append("\n\n".join(current))
    return chunks


def parse_markdown(path: str | os.PathLike[str], author: str = AuthorType.OWNER.value) -> Iterator[ParsedDocument]:
    if author not in JSONL_AUTHORS:
        raise ValidationError(f"author must be one of {sorted(JSONL_AUTHORS)}")
    root = Path(path)
    if not root.exists():
        raise ValidationError(f"path not found: {root.name}")
    files = [root] if root.is_file() else sorted(
        f for f in root.rglob("*") if f.is_file() and f.suffix.lower() in {".md", ".markdown", ".txt"}
        and not any(part.startswith(".") for part in f.relative_to(root).parts)
    )
    for f in files:
        text = f.read_text(encoding="utf-8", errors="replace")
        rel = f.name if root.is_file() else str(f.relative_to(root))
        title = next((ln.lstrip("# ").strip() for ln in text.splitlines() if ln.startswith("#")), f.stem)
        observed = parse_ts(f.stat().st_mtime)
        label = "owner" if author == AuthorType.OWNER.value else None
        segs = [ParsedSegment(author, label, chunk, observed) for chunk in _split_note(text)]
        yield ParsedDocument(rel, "note", title, observed, segs)


PARSERS = {
    "chatgpt": ("chatgpt_export", "ChatGPT export"),
    "claude": ("claude_export", "Claude export"),
    "jsonl": ("jsonl", "JSONL import"),
    "markdown": ("markdown", "Notes"),
}


def parse(kind: str, path: str | os.PathLike[str], author: str = "owner") -> Iterator[ParsedDocument]:
    if kind == "chatgpt":
        return parse_chatgpt(path)
    if kind == "claude":
        return parse_claude(path)
    if kind == "jsonl":
        return parse_jsonl(path)
    if kind == "markdown":
        return parse_markdown(path, author)
    raise ValidationError(f"unknown import kind '{kind}'; allowed: {', '.join(PARSERS)}")


def file_fingerprint(path: str | os.PathLike[str]) -> str:
    p = Path(path)
    h = hashlib.sha256()
    files = [p] if p.is_file() else sorted(f for f in p.rglob("*") if f.is_file())
    for f in files:
        h.update(str(f.relative_to(p) if p.is_dir() else f.name).encode())
        h.update(f.read_bytes())
    return h.hexdigest()
