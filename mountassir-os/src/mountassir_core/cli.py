"""`mcore` — the owner's local control center for MOUNTASSIR CORE (MEMORY CONTROL CENTER, MVP 1).

Running this CLI with access to the database file is what authenticates the owner.
Output is JSON so it can be piped into other tools.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import sys
from pathlib import Path
from typing import Any

from . import __version__
from .core import Core
from .errors import CoreError

DB_ENV = "MOUNTASSIR_DB"
PASS_ENV = "MOUNTASSIR_BACKUP_PASSPHRASE"


def default_db() -> str:
    return os.environ.get(DB_ENV) or str(Path.home() / ".mountassir" / "core.db")


def _out(obj: Any) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2, default=str))


def _passphrase(confirm: bool) -> str:
    env = os.environ.get(PASS_ENV)
    if env:
        return env
    first = getpass.getpass("Backup passphrase: ")
    if confirm and getpass.getpass("Confirm passphrase: ") != first:
        raise SystemExit("passphrases do not match")
    return first


def _csv(value: str | None) -> list[str] | None:
    return [v.strip() for v in value.split(",") if v.strip()] if value else None


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="mcore", description="MOUNTASSIR CORE — sovereign personal memory")
    ap.add_argument("--db", default=None, help=f"database path (default: ${DB_ENV} or ~/.mountassir/core.db)")
    ap.add_argument("--version", action="version", version=__version__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("init", help="create the database and the owner identity")
    s.add_argument("--owner-name", default="Owner")
    sub.add_parser("status", help="counts, flags, audit size")

    # memory
    m = sub.add_parser("memory", help="memories").add_subparsers(dest="sub", required=True)
    s = m.add_parser("add", help="add a validated memory")
    s.add_argument("content")
    s.add_argument("--category", required=True)
    s.add_argument("--type", dest="epistemic_type", required=True)
    s.add_argument("--class", dest="classification")
    s.add_argument("--confidence", type=float, default=0.9)
    s.add_argument("--slot")
    s.add_argument("--value")
    s.add_argument("--context", help="why this is worth keeping")
    s.add_argument("--observed-at")
    s.add_argument("--valid-from")
    s.add_argument("--expires-at", help="retention limit (ISO date)")
    s.add_argument("--from-segment", action="append", dest="segments", help="archive segment id used as evidence")
    s = m.add_parser("show")
    s.add_argument("memory_id")
    s = m.add_parser("history")
    s.add_argument("memory_id")
    s = m.add_parser("search")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=10)
    s.add_argument("--validated-only", action="store_true")
    s = m.add_parser("list")
    s.add_argument("--status")
    s.add_argument("--type", dest="epistemic_type")
    s.add_argument("--category")
    s.add_argument("--limit", type=int, default=50)
    s = m.add_parser("correct")
    s.add_argument("memory_id")
    s.add_argument("--content")
    s.add_argument("--value")
    s.add_argument("--slot")
    s.add_argument("--reason")
    s = m.add_parser("reclassify")
    s.add_argument("memory_id")
    s.add_argument("classification")
    s.add_argument("--reason")
    s = m.add_parser("delete")
    s.add_argument("memory_id")
    s.add_argument("--reason")

    c = sub.add_parser("candidates", help="memories proposed by agents").add_subparsers(dest="sub", required=True)
    c.add_parser("list")
    s = c.add_parser("approve")
    s.add_argument("memory_id")
    s.add_argument("--class", dest="classification")
    s.add_argument("--type", dest="epistemic_type")
    s.add_argument("--category")
    s.add_argument("--confidence", type=float)
    s = c.add_parser("reject")
    s.add_argument("memory_id")
    s.add_argument("--reason")

    x = sub.add_parser("contradictions").add_subparsers(dest="sub", required=True)
    x.add_parser("list")
    s = x.add_parser("resolve")
    s.add_argument("contradiction_id")
    s.add_argument("--keep", help="memory id to keep (the other is superseded); omit to keep both")
    s.add_argument("--reason")

    # archive
    s = sub.add_parser("import", help="import an export or a notes folder into the archive")
    s.add_argument("kind", choices=["chatgpt", "claude", "jsonl", "markdown"])
    s.add_argument("path")
    s.add_argument("--label", help="source label (one source per account/folder)")
    s.add_argument("--author", default="owner", help="markdown only: owner|ai|third_party|unknown")
    s.add_argument("--class", dest="classification", help="source classification (default C3)")
    s = sub.add_parser("docs", help="search the archive")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=10)
    src = sub.add_parser("source").add_subparsers(dest="sub", required=True)
    src.add_parser("list")
    s = src.add_parser("delete", help="delete a source and everything derived from it")
    s.add_argument("source_id")
    s.add_argument("--reason")
    s.add_argument("--yes", action="store_true")
    q = sub.add_parser("quarantine").add_subparsers(dest="sub", required=True)
    q.add_parser("list")
    s = q.add_parser("release")
    s.add_argument("segment_id")

    # agents
    a = sub.add_parser("agent", help="AI agents allowed to use the gateway").add_subparsers(dest="sub", required=True)
    s = a.add_parser("add", help="register an agent and print its token (once)")
    s.add_argument("name")
    s.add_argument("--max-class", default="2", help="classification ceiling, C0-C4 (default C2)")
    s.add_argument("--scopes", help="comma list (default memory:read,memory:propose,context:create)")
    s.add_argument("--categories", help="comma list of memory categories (default all)")
    s.add_argument("--allow-c4", action="store_true", help="required to grant C4")
    s.add_argument("--quota", type=int, default=120, help="requests per hour")
    s.add_argument("--max-results", type=int, default=20)
    a.add_parser("list")
    s = a.add_parser("revoke")
    s.add_argument("agent_id")
    s.add_argument("--purge", action="store_true", help="also delete everything this agent proposed")
    s.add_argument("--reason")

    # portability
    s = sub.add_parser("export", help="export to open formats (plaintext!)")
    s.add_argument("--out", required=True)
    s.add_argument("--formats", default="json,markdown,csv")
    s = sub.add_parser("backup", help="encrypted backup (AES-256-GCM)")
    s.add_argument("--out", required=True)
    s = sub.add_parser("restore", help="restore an encrypted backup (carries forward later deletions/revocations)")
    s.add_argument("backup_path")
    s.add_argument("--yes", action="store_true")

    # governance
    au = sub.add_parser("audit").add_subparsers(dest="sub", required=True)
    au.add_parser("verify")
    s = au.add_parser("tail")
    s.add_argument("-n", type=int, default=20)
    s.add_argument("--actor")
    for name, on in (("stop", True), ("resume", False)):
        s = sub.add_parser(name, help=("emergency stop" if on else "lift an emergency stop"))
        s.add_argument("--gateway", action="store_true", help="refuse every agent call")
        s.add_argument("--writes", action="store_true", help="freeze memory writes")
        s.add_argument("--learning", action="store_true", help="refuse new memory candidates")
        s.add_argument("--all", action="store_true")

    s = sub.add_parser("serve-mcp", help="run the MCP gateway on stdio (token in $MOUNTASSIR_AGENT_TOKEN)")
    return ap


def run(args: argparse.Namespace) -> Any:
    db = args.db or default_db()
    if args.cmd == "restore":
        if not args.yes:
            raise SystemExit("restore replaces the current database (a copy is kept); re-run with --yes")
        return Core.restore(args.backup_path, db, _passphrase(confirm=False))
    if args.cmd == "serve-mcp":
        from .gateway.mcp_server import serve

        serve(db)
        return None

    core = Core(db)
    owner = core.owner()
    try:
        if args.cmd == "init":
            return core.initialize(args.owner_name)
        if args.cmd == "status":
            return core.status(owner)
        if args.cmd == "memory":
            if args.sub == "add":
                return core.add_memory(
                    owner, args.content, category=args.category, epistemic_type=args.epistemic_type,
                    classification=args.classification, confidence=args.confidence, slot=args.slot, value=args.value,
                    context=args.context, observed_at=args.observed_at, valid_from=args.valid_from,
                    expires_at=args.expires_at, evidence_segment_ids=args.segments,
                )
            if args.sub == "show":
                return core.get_memory(owner, args.memory_id)
            if args.sub == "history":
                return core.memory_history(owner, args.memory_id)
            if args.sub == "search":
                return core.search_memory(owner, args.query, limit=args.limit, validated_only=args.validated_only)
            if args.sub == "list":
                return core.list_memories(owner, status=args.status, epistemic_type=args.epistemic_type,
                                          category=args.category, limit=args.limit)
            if args.sub == "correct":
                return core.correct_memory(owner, args.memory_id, content=args.content, value=args.value,
                                           slot=args.slot, reason=args.reason)
            if args.sub == "reclassify":
                return core.reclassify_memory(owner, args.memory_id, args.classification, args.reason)
            if args.sub == "delete":
                return core.delete_memory(owner, args.memory_id, args.reason)
        if args.cmd == "candidates":
            if args.sub == "list":
                return core.list_candidates(owner)
            if args.sub == "approve":
                return core.approve_candidate(owner, args.memory_id, classification=args.classification,
                                              epistemic_type=args.epistemic_type, category=args.category,
                                              confidence=args.confidence)
            if args.sub == "reject":
                return core.reject_candidate(owner, args.memory_id, args.reason)
        if args.cmd == "contradictions":
            if args.sub == "list":
                return core.list_contradictions(owner)
            return core.resolve_contradiction(owner, args.contradiction_id, keep_memory_id=args.keep, reason=args.reason)
        if args.cmd == "import":
            return core.import_file(owner, args.kind, args.path, label=args.label, author=args.author,
                                    classification=args.classification)
        if args.cmd == "docs":
            return core.search_documents(owner, args.query, limit=args.limit)
        if args.cmd == "source":
            if args.sub == "list":
                return core.list_sources(owner)
            if not args.yes:
                raise SystemExit("this deletes the source, its archive and the memories derived from it; re-run with --yes")
            return core.delete_source(owner, args.source_id, args.reason)
        if args.cmd == "quarantine":
            if args.sub == "list":
                return core.list_quarantine(owner)
            return core.release_quarantine(owner, args.segment_id)
        if args.cmd == "agent":
            if args.sub == "add":
                return core.register_agent(
                    owner, args.name, max_classification=args.max_class, scopes=_csv(args.scopes),
                    categories=_csv(args.categories), allow_c4=args.allow_c4, quota_per_hour=args.quota,
                    max_results=args.max_results,
                )
            if args.sub == "list":
                return core.list_agents(owner)
            return core.revoke_agent(owner, args.agent_id, purge=args.purge, reason=args.reason)
        if args.cmd == "export":
            return core.export(owner, args.out, _csv(args.formats))
        if args.cmd == "backup":
            return core.backup(owner, args.out, _passphrase(confirm=True))
        if args.cmd == "audit":
            if args.sub == "verify":
                return core.verify_audit(owner)
            return core.audit_tail(owner, args.n, args.actor)
        if args.cmd in ("stop", "resume"):
            on = args.cmd == "stop"
            chosen = [f for f, flag in (("gateway_stopped", args.gateway), ("writes_frozen", args.writes),
                                        ("learning_paused", args.learning)) if flag or args.all]
            if not chosen:
                raise SystemExit("choose --gateway, --writes, --learning or --all")
            return [core.set_flag(owner, f, on) for f in chosen]
    finally:
        core.close()
    raise SystemExit(f"unknown command {args.cmd}")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        result = run(args)
    except CoreError as e:
        print(json.dumps({"error": e.code, "message": str(e)}, ensure_ascii=False), file=sys.stderr)
        return 2
    if result is not None:
        _out(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
