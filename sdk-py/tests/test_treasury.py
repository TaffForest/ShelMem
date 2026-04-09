"""Tests for treasury convenience methods."""

from __future__ import annotations

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from shelmem.types import RecordTransactionParams, RecordBalanceParams, WriteResult, MemoryRecord


@pytest.fixture
def mock_mem():
    """Create a ShelMem instance with mocked Supabase."""
    from shelmem.client import ShelMem

    with patch("shelmem.supabase_client.create_client") as mock_create:
        mock_client = MagicMock()

        # Mock insert — returns a row dict
        def mock_insert_exec():
            result = MagicMock()
            result.data = [mock_insert_exec._last_data]
            return result

        def mock_insert(data):
            mock_insert_exec._last_data = {
                "id": "test-uuid",
                "created_at": "2026-01-01T00:00:00Z",
                **data,
            }
            mock_obj = MagicMock()
            mock_obj.execute = mock_insert_exec
            return mock_obj

        mock_table = MagicMock()
        mock_table.insert = mock_insert
        mock_client.table.return_value = mock_table

        mock_create.return_value = mock_client

        mem = ShelMem(
            supabase_url="https://fake.supabase.co",
            supabase_key="fake-key",
            mock=True,
        )

        # Store mock client for query mocking
        mem._mock_client = mock_client
        yield mem


@pytest.mark.asyncio
async def test_record_transaction_sets_type(mock_mem):
    result = await mock_mem.record_transaction(RecordTransactionParams(
        agent_id="agent-01",
        memory="Paid 100 APT",
        context="payments",
        amount=100,
        currency="APT",
        counterparty="0xabc",
    ))
    assert result.memory_type == "transaction_record"


@pytest.mark.asyncio
async def test_record_transaction_defaults_pending(mock_mem):
    result = await mock_mem.record_transaction(RecordTransactionParams(
        agent_id="agent-01",
        memory="Sent payment",
        context="payments",
        amount=50,
        currency="USDT",
        counterparty="0xdef",
    ))
    assert result.tx_status == "pending"


@pytest.mark.asyncio
async def test_record_transaction_includes_fields(mock_mem):
    result = await mock_mem.record_transaction(RecordTransactionParams(
        agent_id="agent-01",
        memory="Received 200 USDT",
        context="payments",
        amount=200,
        currency="USDT",
        counterparty="0x999",
        tx_status="confirmed",
    ))
    assert result.amount == 200
    assert result.currency == "USDT"
    assert result.counterparty == "0x999"
    assert result.tx_status == "confirmed"


@pytest.mark.asyncio
async def test_record_balance_sets_type(mock_mem):
    result = await mock_mem.record_balance_snapshot(RecordBalanceParams(
        agent_id="agent-01",
        memory="Balance: 500 APT",
        context="treasury",
        amount=500,
        currency="APT",
    ))
    assert result.memory_type == "balance_snapshot"


@pytest.mark.asyncio
async def test_record_balance_includes_fields(mock_mem):
    result = await mock_mem.record_balance_snapshot(RecordBalanceParams(
        agent_id="agent-01",
        memory="Balance snapshot",
        context="treasury",
        amount=1000.50,
        currency="USDT",
    ))
    assert result.amount == 1000.50
    assert result.currency == "USDT"


@pytest.mark.asyncio
async def test_get_latest_balance_returns_none_when_empty(mock_mem):
    # Mock query to return empty list
    mock_table = MagicMock()
    mock_q = MagicMock()
    mock_q.execute.return_value = MagicMock(data=[])
    mock_table.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value = mock_q
    mock_mem._metadata.client.table.return_value = mock_table

    result = await mock_mem.get_latest_balance("agent-01")
    assert result is None


@pytest.mark.asyncio
async def test_get_latest_balance_returns_most_recent(mock_mem):
    mock_row = {
        "id": "id-1",
        "agent_id": "agent-01",
        "context": "treasury",
        "memory_preview": "Balance: 750 APT",
        "shelby_object_id": "shelby://mock/balance_1",
        "aptos_tx_hash": "0xabc",
        "content_hash": "hash1",
        "memory_type": "balance_snapshot",
        "verified": None,
        "metadata": {},
        "amount": 750,
        "currency": "APT",
        "counterparty": None,
        "tx_status": None,
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
    }

    # Directly mock the metadata.query method
    mock_mem._metadata.query = MagicMock(return_value=[mock_row])

    # Seed mock store so download works
    await mock_mem._storage.upload(b"Balance: 750 APT", "balance_1")

    result = await mock_mem.get_latest_balance("agent-01")
    assert result is not None
    assert result.memory_type == "balance_snapshot"
    assert result.amount == 750
    assert result.currency == "APT"
