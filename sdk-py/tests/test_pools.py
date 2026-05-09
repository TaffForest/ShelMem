"""Tests for shared multi-agent memory pools."""

from __future__ import annotations

import asyncio
import pytest
from unittest.mock import MagicMock, patch

from shelmem.client import ShelMem, PermissionError
from shelmem.types import (
    CreatePoolParams, WriteToPoolParams, RecallFromPoolParams, SearchPoolParams,
)


async def _fake_embedding(_text: str):
    return [0.1] * 1536


class FakeStore:
    """In-memory mirror of memory_pools / pool_members / memories."""

    def __init__(self):
        self.pool = {
            "id": "pool-1",
            "name": "market-ops",
            "description": None,
            "owner_agent_id": "trading-agent",
            "metadata": {},
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }
        self.members = {
            "trading-agent": {
                "pool_id": "pool-1",
                "agent_id": "trading-agent",
                "role": "owner",
                "added_at": "2026-01-01T00:00:00Z",
            }
        }
        self.memories = []


@pytest.fixture
def mem_and_store():
    with patch("shelmem.supabase_client.create_client") as mock_create:
        mock_create.return_value = MagicMock()
        mem = ShelMem(
            supabase_url="https://fake.supabase.co",
            supabase_key="fake-key",
            mock=True,
            embedding_provider=_fake_embedding,
        )
    store = FakeStore()
    store.audit = []
    md = mem._metadata

    md.get_member = lambda pool_id, agent_id: (
        store.members.get(agent_id) if pool_id == store.pool["id"] else None
    )
    md.list_members = lambda pool_id: (
        list(store.members.values()) if pool_id == store.pool["id"] else []
    )

    def upsert_member(pool_id, agent_id, role):
        m = {
            "pool_id": pool_id,
            "agent_id": agent_id,
            "role": role,
            "added_at": "2026-01-01T00:00:00Z",
        }
        store.members[agent_id] = m
        return m
    md.upsert_member = upsert_member

    def remove_member(pool_id, agent_id):
        store.members.pop(agent_id, None)
    md.remove_member = remove_member

    def insert_pool(name, owner_agent_id, description=None, metadata=None):
        store.pool = {
            "id": "pool-1",
            "name": name,
            "description": description,
            "owner_agent_id": owner_agent_id,
            "metadata": metadata or {},
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
        }
        # mirror the DB trigger: owner becomes a member
        store.members[owner_agent_id] = {
            "pool_id": "pool-1",
            "agent_id": owner_agent_id,
            "role": "owner",
            "added_at": "2026-01-01T00:00:00Z",
        }
        return store.pool
    md.insert_pool = insert_pool

    md.get_pool = lambda pool_id: (
        store.pool if pool_id == store.pool["id"] else None
    )
    md.delete_pool = lambda pool_id: None
    md.list_pools_for_agent = lambda agent_id: (
        [store.pool] if agent_id in store.members else []
    )

    def insert(**kwargs):
        row = {
            "id": f"mem-{len(store.memories) + 1}",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "verified": None,
            **kwargs,
        }
        store.memories.append(row)
        return row
    md.insert = insert

    def query_pool(pool_id, context=None, memory_type=None, limit=10):
        rows = [m for m in store.memories if m.get("pool_id") == pool_id]
        if context:
            rows = [m for m in rows if m.get("context") == context]
        if memory_type:
            rows = [m for m in rows if m.get("memory_type") == memory_type]
        return rows[:limit]
    md.query_pool = query_pool

    md.update_verified = lambda *a, **k: None

    def query_shared_with(agent_id, context=None, memory_type=None, limit=10):
        rows = [m for m in store.memories if agent_id in (m.get("shared_with") or [])]
        if context:
            rows = [m for m in rows if m.get("context") == context]
        if memory_type:
            rows = [m for m in rows if m.get("memory_type") == memory_type]
        return rows[:limit]
    md.query_shared_with = query_shared_with

    def search_pool(query_embedding, pool_id, threshold=0.5, limit=10):
        rows = [m for m in store.memories if m.get("pool_id") == pool_id]
        return [
            {
                "id": m["id"], "agent_id": m["agent_id"], "context": m["context"],
                "memory_preview": m.get("memory_preview"),
                "memory_type": m.get("memory_type"),
                "content_hash": m.get("content_hash"),
                "aptos_tx_hash": m.get("aptos_tx_hash"),
                "created_at": m["created_at"],
                "similarity": 0.9 - i * 0.05,
            }
            for i, m in enumerate(rows[:limit])
        ]
    md.search_pool = search_pool

    def log_pool_access(pool_id, agent_id, action, memory_id=None, result_count=None, metadata=None):
        store.audit.append({
            "id": f"audit-{len(store.audit) + 1}",
            "pool_id": pool_id, "agent_id": agent_id, "action": action,
            "memory_id": memory_id, "result_count": result_count,
            "metadata": metadata or {},
            "created_at": "2026-01-01T00:00:00Z",
        })
    md.log_pool_access = log_pool_access

    def query_pool_audit_log(pool_id, limit=100):
        return [a for a in store.audit if a["pool_id"] == pool_id][:limit]
    md.query_pool_audit_log = query_pool_audit_log

    yield mem, store


@pytest.mark.asyncio
async def test_create_pool_auto_adds_owner(mem_and_store):
    mem, store = mem_and_store
    # Reset members so we can observe trigger behaviour
    store.members.clear()
    pool = await mem.create_pool(CreatePoolParams(
        name="market-ops",
        owner_agent_id="trading-agent",
    ))
    assert pool.name == "market-ops"
    assert store.members.get("trading-agent", {}).get("role") == "owner"


@pytest.mark.asyncio
async def test_create_pool_rejects_empty_name(mem_and_store):
    mem, _ = mem_and_store
    from shelmem.client import ValidationError
    with pytest.raises(ValidationError):
        await mem.create_pool(CreatePoolParams(name="", owner_agent_id="x"))


@pytest.mark.asyncio
async def test_owner_can_add_writer(mem_and_store):
    mem, _ = mem_and_store
    m = await mem.add_pool_member("pool-1", "trading-agent", "execution-agent", "writer")
    assert m.role == "writer"


@pytest.mark.asyncio
async def test_non_owner_cannot_add_members(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    with pytest.raises(PermissionError):
        await mem.add_pool_member("pool-1", "execution-agent", "risk-agent", "reader")


@pytest.mark.asyncio
async def test_non_member_cannot_add_members(mem_and_store):
    mem, _ = mem_and_store
    with pytest.raises(PermissionError):
        await mem.add_pool_member("pool-1", "rando", "risk-agent", "reader")


@pytest.mark.asyncio
async def test_cannot_remove_pool_owner(mem_and_store):
    mem, _ = mem_and_store
    with pytest.raises(PermissionError):
        await mem.remove_pool_member("pool-1", "trading-agent", "trading-agent")


@pytest.mark.asyncio
async def test_owner_can_remove_writer(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    await mem.remove_pool_member("pool-1", "trading-agent", "execution-agent")
    assert "execution-agent" not in store.members


@pytest.mark.asyncio
async def test_writer_can_write_to_pool(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1",
        agent_id="execution-agent",
        memory="Filled order at $8.50",
        context="trading",
    ))
    assert len(store.memories) == 1
    assert store.memories[0]["pool_id"] == "pool-1"
    assert store.memories[0]["agent_id"] == "execution-agent"


@pytest.mark.asyncio
async def test_reader_cannot_write_to_pool(mem_and_store):
    mem, store = mem_and_store
    store.members["reporting-agent"] = {
        "pool_id": "pool-1", "agent_id": "reporting-agent", "role": "reader",
        "added_at": "2026-01-01T00:00:00Z",
    }
    with pytest.raises(PermissionError):
        await mem.write_to_pool(WriteToPoolParams(
            pool_id="pool-1",
            agent_id="reporting-agent",
            memory="should fail",
            context="trading",
        ))


@pytest.mark.asyncio
async def test_member_can_recall_from_pool(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    store.members["reporting-agent"] = {
        "pool_id": "pool-1", "agent_id": "reporting-agent", "role": "reader",
        "added_at": "2026-01-01T00:00:00Z",
    }

    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1", agent_id="trading-agent",
        memory="RSI=35, buy 500 APT", context="trading", memory_type="decision",
    ))
    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1", agent_id="execution-agent",
        memory="Order filled", context="trading", memory_type="observation",
    ))

    records = await mem.recall_from_pool(RecallFromPoolParams(
        pool_id="pool-1", agent_id="reporting-agent",
    ))
    assert len(records) == 2
    writers = sorted(r.agent_id for r in records)
    assert writers == ["execution-agent", "trading-agent"]
    assert all(r.pool_id == "pool-1" for r in records)


@pytest.mark.asyncio
async def test_non_member_cannot_recall(mem_and_store):
    mem, _ = mem_and_store
    with pytest.raises(PermissionError):
        await mem.recall_from_pool(RecallFromPoolParams(
            pool_id="pool-1", agent_id="rando",
        ))


@pytest.mark.asyncio
async def test_list_pools_for_member(mem_and_store):
    mem, _ = mem_and_store
    pools = await mem.list_pools("trading-agent")
    assert [p.id for p in pools] == ["pool-1"]


@pytest.mark.asyncio
async def test_list_pools_empty_for_non_member(mem_and_store):
    mem, _ = mem_and_store
    pools = await mem.list_pools("rando")
    assert pools == []


# ─── Per-memory ACLs ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_write_persists_shared_with(mem_and_store):
    mem, store = mem_and_store
    await mem.write(
        "trading-agent", "shared insight", "analysis",
        memory_type="observation",
        shared_with=["execution-agent", "risk-agent"],
    )
    assert store.memories[0]["shared_with"] == ["execution-agent", "risk-agent"]


@pytest.mark.asyncio
async def test_recall_shared_filters_by_acl(mem_and_store):
    mem, _ = mem_and_store
    await mem.write(
        "trading-agent", "visible to exec", "analysis", "observation",
        shared_with=["execution-agent"],
    )
    await asyncio.sleep(0.005)
    await mem.write(
        "trading-agent", "visible to risk", "analysis", "observation",
        shared_with=["risk-agent"],
    )
    await asyncio.sleep(0.005)
    await mem.write("trading-agent", "private", "analysis", "observation")

    exec_mem = await mem.recall_shared("execution-agent")
    assert [r.memory for r in exec_mem] == ["visible to exec"]

    risk_mem = await mem.recall_shared("risk-agent")
    assert [r.memory for r in risk_mem] == ["visible to risk"]

    rando_mem = await mem.recall_shared("rando")
    assert rando_mem == []


# ─── Pool semantic search ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_search_pool_rejects_non_members(mem_and_store):
    mem, _ = mem_and_store
    with pytest.raises(PermissionError):
        await mem.search_pool(SearchPoolParams(
            pool_id="pool-1", agent_id="rando", query="x",
        ))


@pytest.mark.asyncio
async def test_search_pool_returns_results_for_members(mem_and_store):
    mem, store = mem_and_store
    store.members["reporting-agent"] = {
        "pool_id": "pool-1", "agent_id": "reporting-agent", "role": "reader",
        "added_at": "2026-01-01T00:00:00Z",
    }
    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1", agent_id="trading-agent",
        memory="RSI=35", context="trading", memory_type="decision",
    ))

    results = await mem.search_pool(SearchPoolParams(
        pool_id="pool-1", agent_id="reporting-agent", query="rsi",
    ))
    assert len(results) == 1
    assert results[0].similarity > 0.5


# ─── Audit log ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_write_to_pool_logs_audit(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1", agent_id="execution-agent",
        memory="filled", context="trading",
    ))
    writes = [a for a in store.audit if a["action"] == "write"]
    assert len(writes) == 1
    assert writes[0]["agent_id"] == "execution-agent"


@pytest.mark.asyncio
async def test_recall_from_pool_logs_audit_with_count(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    store.members["reporting-agent"] = {
        "pool_id": "pool-1", "agent_id": "reporting-agent", "role": "reader",
        "added_at": "2026-01-01T00:00:00Z",
    }
    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1", agent_id="execution-agent",
        memory="x", context="trading",
    ))
    await mem.recall_from_pool(RecallFromPoolParams(
        pool_id="pool-1", agent_id="reporting-agent",
    ))
    reads = [a for a in store.audit if a["action"] == "read"]
    assert len(reads) == 1
    assert reads[0]["agent_id"] == "reporting-agent"
    assert reads[0]["result_count"] == 1


@pytest.mark.asyncio
async def test_get_audit_log_owner_only(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    await mem.write_to_pool(WriteToPoolParams(
        pool_id="pool-1", agent_id="execution-agent",
        memory="x", context="trading",
    ))

    log = await mem.get_pool_audit_log("pool-1", "trading-agent")
    assert len(log) > 0

    with pytest.raises(PermissionError):
        await mem.get_pool_audit_log("pool-1", "execution-agent")


# ─── Agent identity (sign + verify) ───────────────────────────────────────


PRIV_HEX = "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"


def test_sign_and_verify_fresh_claim():
    from shelmem import sign_agent_claim, verify_agent_claim
    claim = sign_agent_claim("trading-agent", PRIV_HEX)
    assert verify_agent_claim(claim, "trading-agent", claim.public_key) is True


def test_verify_rejects_mismatched_agent_id():
    from shelmem import sign_agent_claim, verify_agent_claim, AgentClaimError
    claim = sign_agent_claim("trading-agent", PRIV_HEX)
    with pytest.raises(AgentClaimError):
        verify_agent_claim(claim, "execution-agent", claim.public_key)


def test_verify_rejects_mismatched_public_key():
    from shelmem import sign_agent_claim, verify_agent_claim, AgentClaimError
    claim = sign_agent_claim("trading-agent", PRIV_HEX)
    with pytest.raises(AgentClaimError):
        verify_agent_claim(claim, "trading-agent", "0xdeadbeef" * 8)


def test_verify_rejects_expired_claim():
    from shelmem import sign_agent_claim, verify_agent_claim, AgentClaimError
    claim = sign_agent_claim("trading-agent", PRIV_HEX)
    claim.timestamp -= 9999
    with pytest.raises(AgentClaimError):
        verify_agent_claim(claim, "trading-agent", claim.public_key)


def test_verify_rejects_tampered_signature():
    from shelmem import sign_agent_claim, verify_agent_claim, AgentClaimError
    claim = sign_agent_claim("trading-agent", PRIV_HEX)
    last = claim.signature[-1]
    claim.signature = claim.signature[:-1] + ("1" if last == "0" else "0")
    with pytest.raises(AgentClaimError):
        verify_agent_claim(claim, "trading-agent", claim.public_key)


# ─── transfer_pool ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_transfer_pool_promotes_target_demotes_caller(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    md = mem._metadata
    def _update_pool_owner(pool_id, new_owner):
        store.pool["owner_agent_id"] = new_owner
        return store.pool
    md.update_pool_owner = _update_pool_owner

    await mem.transfer_pool("pool-1", "trading-agent", "execution-agent")
    assert store.members["execution-agent"]["role"] == "owner"
    assert store.members["trading-agent"]["role"] == "writer"
    assert store.pool["owner_agent_id"] == "execution-agent"


@pytest.mark.asyncio
async def test_transfer_pool_rejects_non_owner(mem_and_store):
    mem, store = mem_and_store
    store.members["execution-agent"] = {
        "pool_id": "pool-1", "agent_id": "execution-agent", "role": "writer",
        "added_at": "2026-01-01T00:00:00Z",
    }
    with pytest.raises(PermissionError):
        await mem.transfer_pool("pool-1", "execution-agent", "trading-agent")


@pytest.mark.asyncio
async def test_transfer_pool_rejects_non_member_target(mem_and_store):
    mem, _ = mem_and_store
    with pytest.raises(PermissionError):
        await mem.transfer_pool("pool-1", "trading-agent", "rando")


@pytest.mark.asyncio
async def test_transfer_pool_rejects_self(mem_and_store):
    from shelmem.client import ValidationError
    mem, _ = mem_and_store
    with pytest.raises(ValidationError):
        await mem.transfer_pool("pool-1", "trading-agent", "trading-agent")


# ─── verify_signatures enforcement ────────────────────────────────────────


def test_verify_signatures_requires_agent_registry():
    from shelmem.client import ValidationError
    with patch("shelmem.supabase_client.create_client"):
        with pytest.raises(ValidationError):
            ShelMem(
                supabase_url="https://fake.supabase.co",
                supabase_key="fake-key",
                mock=True,
                verify_signatures=True,
            )


@pytest.mark.asyncio
async def test_verify_signatures_rejects_call_without_claim():
    from shelmem import sign_agent_claim, AgentClaimError
    claim = sign_agent_claim("trading-agent", PRIV_HEX)
    with patch("shelmem.supabase_client.create_client") as mc:
        mc.return_value = MagicMock()
        mem = ShelMem(
            supabase_url="https://fake.supabase.co",
            supabase_key="fake-key",
            mock=True,
            verify_signatures=True,
            agent_registry={"trading-agent": claim.public_key},
        )
    with pytest.raises(AgentClaimError):
        await mem.write_to_pool(WriteToPoolParams(
            pool_id="pool-1", agent_id="trading-agent",
            memory="x", context="trading",
        ))


@pytest.mark.asyncio
async def test_verify_signatures_rejects_impersonation():
    from shelmem import sign_agent_claim, AgentClaimError
    real_claim = sign_agent_claim("trading-agent", PRIV_HEX)
    OTHER_PRIV = "0x" + "aa" * 32
    attacker_claim = sign_agent_claim("trading-agent", OTHER_PRIV)
    with patch("shelmem.supabase_client.create_client") as mc:
        mc.return_value = MagicMock()
        mem = ShelMem(
            supabase_url="https://fake.supabase.co",
            supabase_key="fake-key",
            mock=True,
            verify_signatures=True,
            agent_registry={"trading-agent": real_claim.public_key},
        )
    with pytest.raises(AgentClaimError):
        await mem.write_to_pool(WriteToPoolParams(
            pool_id="pool-1", agent_id="trading-agent",
            memory="attack", context="trading",
            claim=attacker_claim,
        ))
