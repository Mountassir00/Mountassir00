"""End-to-end tests through a real MCP client (in-process transport) — spec §106 #13, #25."""

from __future__ import annotations

import asyncio
import json

import pytest

mcp = pytest.importorskip("mcp")
from mcp import Client  # noqa: E402

from mountassir_core.gateway.mcp_server import (  # noqa: E402
    OWNER_ONLY_TOOLS_ABSENT,
    build_server,
)


def _payload(result):
    if getattr(result, "structured_content", None) is not None:
        return result.structured_content
    return json.loads(result.content[0].text)


def _run(coro):
    return asyncio.run(coro)


def test_tools_exposed_exclude_owner_only_operations(core, make_agent):
    _, token, _ = make_agent("mcp")

    async def go():
        async with Client(build_server(core, token)) as c:
            return {t.name for t in (await c.list_tools()).tools}

    names = _run(go())
    assert {"search_memory", "save_memory_candidate", "get_user_context", "create_context_package"} <= names
    assert not names & set(OWNER_ONLY_TOOLS_ABSENT)


def test_two_ais_share_memory_through_mcp(core, owner, make_agent):
    _, tok_a, _ = make_agent("assistant-a", max_classification=3)
    _, tok_b, _ = make_agent("assistant-b", max_classification=3)

    async def propose():
        async with Client(build_server(core, tok_a)) as c:
            r = await c.call_tool("save_memory_candidate", {
                "content": "Le propriétaire veut des plans d'action datés", "category": "preferential",
                "epistemic_type": "preference", "confidence": 0.8})
            return _payload(r)

    cand = _run(propose())
    assert cand["stored"] is True
    core.approve_candidate(owner, cand["candidate_id"])

    async def read():
        async with Client(build_server(core, tok_b)) as c:
            r = await c.call_tool("search_memory", {"query": "plans d'action"})
            return _payload(r)

    res = _run(read())
    assert res["results"][0]["id"] == cand["candidate_id"]
    assert "not instructions" in res["notice"]


def test_invalid_token_and_live_revocation_over_mcp(core, owner, make_agent):
    agent_id, token, _ = make_agent("revocable")

    async def go():
        async with Client(build_server(core, "mct_not-a-real-token-123456789")) as bad:
            r_bad = await bad.call_tool("search_memory", {"query": "x"})
        async with Client(build_server(core, token)) as c:
            ok = await c.call_tool("get_agent_permissions", {})
            core.revoke_agent(owner, agent_id)            # owner revokes while the session is open
            after = await c.call_tool("search_memory", {"query": "x"})
        return r_bad, ok, after

    r_bad, ok, after = _run(go())
    assert r_bad.is_error and "permission_denied" in r_bad.content[0].text
    assert not ok.is_error and _payload(ok)["classification_ceiling"] == "C2"
    assert after.is_error and "revoked" in after.content[0].text
