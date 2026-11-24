"""MVP 1 acceptance criteria (spec §126), one test per criterion."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mountassir_core import Core
from mountassir_core.errors import BackupError, NotFound, PermissionDenied


def test_1_ai_import_is_stored_with_authorship(core, owner, chatgpt_file, claude_file):
    r1 = core.import_file(owner, "chatgpt", chatgpt_file)
    r2 = core.import_file(owner, "claude", claude_file)
    assert r1["status"] == r2["status"] == "completed"
    assert r1["documents_created"] == 2 and r2["documents_created"] == 1
    segs = core.conn.execute("SELECT author_type, author_label, content FROM segments ORDER BY seq").fetchall()
    authors = {(s["author_type"], s["author_label"]) for s in segs}
    assert ("ai", "openai:gpt-4o") in authors and ("ai", "anthropic:claude") in authors and ("owner", "owner") in authors
    # Only the active branch of the ChatGPT tree is imported.
    assert not any("Branche abandonnée" in s["content"] for s in segs)
    # AI answers are never attributed to the owner.
    gpt_answer = [s for s in segs if "bloquer vos matinées" in s["content"]][0]
    assert gpt_answer["author_type"] == "ai"


def test_1b_reimport_is_idempotent_and_incremental(core, owner, chatgpt_file):
    core.import_file(owner, "chatgpt", chatgpt_file)
    assert core.import_file(owner, "chatgpt", chatgpt_file)["status"] == "already_imported"
    data = json.loads(chatgpt_file.read_text())
    data[0]["title"] = "Organisation du travail (maj)"
    chatgpt_file.write_text(json.dumps(data))
    r = core.import_file(owner, "chatgpt", chatgpt_file)
    assert (r["documents_created"], r["documents_updated"], r["documents_unchanged"]) == (0, 1, 1)
    assert core.conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0] == 2


def test_2_provenance_is_preserved(core, owner, chatgpt_file):
    core.import_file(owner, "chatgpt", chatgpt_file)
    seg = core.conn.execute("SELECT id FROM segments WHERE content LIKE 'Je travaille mieux%'").fetchone()["id"]
    m = core.add_memory(owner, "Travaille mieux le matin avant 9h", category="behavioral",
                        epistemic_type="self_statement", evidence_segment_ids=[seg])["memory"]
    roles = {(p["role"], p["source_kind"]) for p in m["provenance"]}
    assert ("author", "manual") in roles and ("evidence", "chatgpt_export") in roles
    ev = [p for p in m["provenance"] if p["role"] == "evidence"][0]
    assert ev["segment_id"] == seg and ev["document_title"] == "Organisation du travail"


def test_3_second_authorized_ai_can_retrieve(core, owner, make_agent):
    _, _, gpt = make_agent("chatgpt", max_classification=3)
    _, _, claude = make_agent("claude", max_classification=3)
    cand = core.propose_memory(gpt, "Préfère des réponses courtes et structurées", category="preferential",
                               epistemic_type="preference", confidence=0.7)
    assert cand["stored"] and cand["status"] == "proposed"
    # Not visible to anyone before validation.
    assert core.search_memory(claude, "réponses courtes") == []
    core.approve_candidate(owner, cand["candidate_id"])
    hits = core.search_memory(claude, "reponses courtes")  # accents ignored
    assert hits and hits[0]["id"] == cand["candidate_id"]
    assert hits[0]["author_type"] == "ai"


def test_4_unauthorized_ai_cannot_read(core, owner, make_agent):
    m = core.add_memory(owner, "Projet confidentiel Orion", category="prospective", epistemic_type="intention",
                        classification=3)["memory"]
    with pytest.raises(PermissionDenied):
        core.authenticate("mct_forged-token-that-does-not-exist-000000")
    _, _, low = make_agent("low-clearance", max_classification=2)
    assert core.search_memory(low, "Orion") == []
    with pytest.raises(NotFound):
        core.get_memory(low, m["id"])
    _, _, noscope = make_agent("no-read", scopes=["memory:propose"], max_classification=3)
    with pytest.raises(PermissionDenied):
        core.search_memory(noscope, "Orion")
    _, _, narrow = make_agent("finance-only", max_classification=3, categories=["decisional"])
    assert core.search_memory(narrow, "Orion") == []


def test_5_correction_is_versioned(core, owner):
    m = core.add_memory(owner, "Vit à Lyon", category="autobiographical", epistemic_type="self_statement")["memory"]
    core.correct_memory(owner, m["id"], content="Vit à Marseille depuis 2026", reason="déménagement")
    hist = core.memory_history(owner, m["id"])["versions"]
    assert [v["content"] for v in hist] == ["Vit à Lyon", "Vit à Marseille depuis 2026"]
    assert hist[-1]["change_reason"] == "déménagement"
    assert core.search_memory(owner, "Lyon") == [] and core.search_memory(owner, "Marseille")


def test_6_deletion_and_7_derived_data(core, owner, make_agent, db_path):
    marker = "zqxjmarker7731"
    m = core.add_memory(owner, f"Code secret de famille {marker}", category="relational",
                        epistemic_type="self_statement", classification=3)["memory"]
    core.correct_memory(owner, m["id"], content=f"Code de famille {marker} corrigé")
    _, _, agent = make_agent("ctx", max_classification=3)
    pkg = core.create_context_package(agent, "test", query=marker)
    assert any(i["id"] == m["id"] for items in pkg["sections"].values() for i in items)

    report = core.delete_memory(owner, m["id"], reason="test")
    assert report["fts_rows"] == 1 and report["embeddings"] == 1 and report["versions"] == 2
    assert report["context_packages_deleted"] == 1
    for table, col in (("memories", "id"), ("memory_versions", "memory_id"), ("memory_provenance", "memory_id"),
                       ("embeddings", "item_id"), ("search_items", "item_id"), ("context_package_items", "memory_id")):
        assert core.conn.execute(f"SELECT COUNT(*) FROM {table} WHERE {col} = ?", (m["id"],)).fetchone()[0] == 0
    assert core.search_memory(owner, marker) == []
    with pytest.raises(NotFound):
        core.get_context_package(agent, pkg["id"])
    tomb = core.conn.execute("SELECT * FROM tombstones WHERE item_id = ?", (m["id"],)).fetchone()
    assert tomb and marker not in (tomb["reason"] or "")
    # Physical erasure: the text must not survive in the database file nor its WAL.
    raw = b"".join(Path(str(db_path) + s).read_bytes() for s in ("", "-wal") if Path(str(db_path) + s).exists())
    assert marker.encode() not in raw


def test_7b_deleting_a_source_cascades_to_derived_memories(core, owner, make_agent, chatgpt_file):
    core.import_file(owner, "chatgpt", chatgpt_file)
    src = core.conn.execute("SELECT id FROM sources WHERE kind = 'chatgpt_export'").fetchone()["id"]
    seg = core.conn.execute("SELECT id FROM segments WHERE content LIKE 'Oui. Mon objectif%'").fetchone()["id"]
    _, _, agent = make_agent("reader", max_classification=3,
                             scopes=["memory:read", "memory:propose", "documents:read"])
    derived = core.propose_memory(agent, "Objectif : lancer une offre de conseil en 2027", category="prospective",
                                  epistemic_type="intention", evidence_segment_ids=[seg])["candidate_id"]
    core.approve_candidate(owner, derived)
    owned = core.add_memory(owner, "Je veux lancer mon offre de conseil", category="prospective",
                            epistemic_type="intention", evidence_segment_ids=[seg])["memory"]["id"]
    report = core.delete_source(owner, src, reason="droit à l'oubli")
    assert report["memories_deleted"] == 1 and report["memories_flagged_for_review"] == 1
    assert core.memories.get(derived) is None                     # AI-derived solely from that source
    assert core.memories.get(owned)["status"] == "needs_review"   # owner's own assertion kept, flagged
    assert core.conn.execute("SELECT COUNT(*) FROM segments").fetchone()[0] == 0
    assert core.conn.execute("SELECT COUNT(*) FROM search_items WHERE item_type = 'segment'").fetchone()[0] == 0


def test_8_accesses_are_logged_without_content(core, owner, make_agent):
    _, _, agent = make_agent("logger", max_classification=3)
    core.add_memory(owner, "Aime le jazz modal", category="preferential", epistemic_type="preference")
    core.search_memory(agent, "jazz")
    with pytest.raises(PermissionDenied):
        core.delete_memory(agent, "mem_x")
    rows = core.audit_tail(owner, 50)
    actions = {(r["actor"].split(":")[0], r["action"], r["outcome"]) for r in rows}
    assert ("agent", "memory.search", "allowed") in actions
    assert ("agent", "memory.delete", "denied") in actions
    assert not any("jazz" in json.dumps(r, ensure_ascii=False) for r in rows)
    assert core.verify_audit(owner)["ok"]


def test_8b_audit_tampering_is_detected(core, owner):
    core.add_memory(owner, "x1 fact", category="semantic", epistemic_type="observation")
    core.conn.execute("DROP TRIGGER audit_log_no_update")
    core.conn.execute("UPDATE audit_log SET outcome = 'denied' WHERE seq = 1")
    res = core.verify_audit(owner)
    assert res["ok"] is False and res["first_bad_seq"] == 1


def test_9_export_open_formats(core, owner, chatgpt_file, make_agent, tmp_path):
    core.import_file(owner, "chatgpt", chatgpt_file)
    core.add_memory(owner, "Valeur : honnêteté radicale", category="normative", epistemic_type="self_statement")
    make_agent("exported-agent")
    out = core.export(owner, tmp_path / "export")
    data = json.loads(Path(out["json"]).read_text())
    assert data["format"] == "mountassir-core-export"
    assert any(m["content"].startswith("Valeur") for m in data["tables"]["memories"])
    assert all("token_hash" not in a for a in data["tables"]["agents"])
    md = (Path(out["markdown"]) / "memories" / "normative.md").read_text()
    assert "honnêteté radicale" in md
    assert (tmp_path / "export" / "FORMAT.md").exists() and (Path(out["csv"]) / "memories.csv").exists()


def test_10_backup_restore_carries_forward_deletions_and_revocations(core, owner, make_agent, db_path, tmp_path):
    keep = core.add_memory(owner, "Mémoire à conserver", category="semantic", epistemic_type="observation")["memory"]["id"]
    gone = core.add_memory(owner, "Mémoire à oublier plus tard", category="semantic", epistemic_type="observation")["memory"]["id"]
    agent_id, token, _ = make_agent("to-revoke")
    bk = tmp_path / "b.mcbk"
    core.backup(owner, bk, "correct horse battery staple")
    core.delete_memory(owner, gone, reason="après la sauvegarde")
    core.revoke_agent(owner, agent_id)
    core.close()

    with pytest.raises(BackupError):
        Core.restore(bk, db_path, "wrong passphrase!!")
    tampered = tmp_path / "t.mcbk"
    blob = bytearray(bk.read_bytes())
    blob[-5] ^= 0xFF
    tampered.write_bytes(bytes(blob))
    with pytest.raises(BackupError):
        Core.restore(tampered, db_path, "correct horse battery staple")

    report = Core.restore(bk, db_path, "correct horse battery staple")
    assert report["tombstones_applied"] == 1 and report["agents_revoked"] == 1
    c = Core(db_path)
    o = c.owner()
    assert c.memories.get(keep) is not None and c.memories.get(gone) is None
    with pytest.raises(PermissionDenied):
        c.authenticate(token)
    assert c.verify_audit(o)["ok"]
    c.close()


def test_1c_split_chatgpt_export_in_zip_and_hidden_messages(core, owner, tmp_path):
    import zipfile

    from conftest import chatgpt_export

    convs = chatgpt_export()
    hidden = convs[0]["mapping"]["n2"]["message"]
    convs[0]["mapping"]["n2"]["message"] = {**hidden, "weight": 0.0}
    z = tmp_path / "export.zip"
    with zipfile.ZipFile(z, "w") as zf:
        zf.writestr("conversations-000.json", json.dumps(convs[:1]))
        zf.writestr("conversations-001.json", json.dumps(convs[1:]))
        zf.writestr("message_feedback.json", "[]")
    r = core.import_file(owner, "chatgpt", z)
    assert r["documents_created"] == 2
    assert core.conn.execute("SELECT COUNT(*) FROM segments WHERE author_type = 'ai'").fetchone()[0] == 0
