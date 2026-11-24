"""Deployment path: the `mcore` CLI as a subprocess, and the MCP gateway over real stdio
(the way Claude Desktop / Claude Code / Codex launch it)."""

from __future__ import annotations

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

SRC = str(Path(__file__).resolve().parents[1] / "src")


def mcore(db: Path, *args: str, env_extra: dict | None = None) -> dict | list:
    env = {**os.environ, "PYTHONPATH": SRC, "MOUNTASSIR_DB": str(db), **(env_extra or {})}
    p = subprocess.run([sys.executable, "-m", "mountassir_core", *args], capture_output=True, text=True, env=env, timeout=60)
    assert p.returncode == 0, p.stderr
    return json.loads(p.stdout) if p.stdout.strip() else {}


def test_cli_full_cycle(tmp_path, chatgpt_file):
    db = tmp_path / "home" / "core.db"
    assert mcore(db, "init", "--owner-name", "Test")["initialized"]
    assert oct(os.stat(db).st_mode & 0o777) == "0o600"
    m = mcore(db, "memory", "add", "Décide mieux après une nuit de sommeil", "--category", "decisional",
              "--type", "self_statement")["memory"]
    assert mcore(db, "memory", "search", "sommeil")[0]["id"] == m["id"]
    assert mcore(db, "import", "chatgpt", str(chatgpt_file))["documents_created"] == 2
    tok = mcore(db, "agent", "add", "claude-desktop", "--max-class", "3")["token"]
    assert tok.startswith("mct_")
    mcore(db, "export", "--out", str(tmp_path / "exp"))
    env = {"MOUNTASSIR_BACKUP_PASSPHRASE": "a long enough passphrase"}
    mcore(db, "backup", "--out", str(tmp_path / "bk.mcbk"), env_extra=env)
    mcore(db, "memory", "delete", m["id"], "--reason", "test")
    r = mcore(db, "restore", str(tmp_path / "bk.mcbk"), "--yes", env_extra=env)
    assert r["tombstones_applied"] == 1
    assert mcore(db, "memory", "search", "sommeil") == []
    assert mcore(db, "audit", "verify")["ok"] is True
    assert mcore(db, "stop", "--gateway")[0]["on"] is True
    assert mcore(db, "status")["flags"]["gateway_stopped"] is True


def test_cli_reports_errors_as_json(tmp_path):
    db = tmp_path / "core.db"
    mcore(db, "init")
    env = {**os.environ, "PYTHONPATH": SRC, "MOUNTASSIR_DB": str(db)}
    p = subprocess.run([sys.executable, "-m", "mountassir_core", "memory", "show", "mem_missing"],
                       capture_output=True, text=True, env=env)
    assert p.returncode == 2 and json.loads(p.stderr)["error"] == "not_found"


def test_mcp_over_real_stdio(tmp_path):
    pytest.importorskip("mcp")
    from mcp import Client, StdioServerParameters

    db = tmp_path / "core.db"
    mcore(db, "init")
    mcore(db, "memory", "add", "Langue de travail préférée : français", "--category", "preferential",
          "--type", "preference", "--class", "2")
    tok = mcore(db, "agent", "add", "stdio-client")["token"]
    params = StdioServerParameters(
        command=sys.executable, args=["-m", "mountassir_core", "--db", str(db), "serve-mcp"],
        env={"PYTHONPATH": SRC, "MOUNTASSIR_AGENT_TOKEN": tok, "PATH": os.environ.get("PATH", "")},
    )

    async def go():
        async with Client(params) as c:
            tools = {t.name for t in (await c.list_tools()).tools}
            res = await c.call_tool("get_user_preferences", {})
            return tools, res

    tools, res = asyncio.run(go())
    assert "save_memory_candidate" in tools
    payload = res.structured_content if res.structured_content is not None else json.loads(res.content[0].text)
    assert payload["sections"]["preferences"][0]["content"].startswith("Langue de travail")
