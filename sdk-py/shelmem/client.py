"""ShelMem — Decentralised AI agent memory SDK with tamper detection."""

from __future__ import annotations

import time

from .shelby import ShelbyStorage, compute_hash
from .supabase_client import MemoryMetadata
from .types import WriteResult, MemoryRecord, VerifyResult


class ShelMem:
    """Main client for writing and recalling agent memories.

    Memory content is stored on Shelby Protocol's decentralised hot storage.
    Metadata (agent_id, context, timestamps) is stored in Supabase.
    Every write is anchored on Aptos with a content hash for tamper detection.
    """

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        shelby_api_key: str | None = None,
        aptos_private_key: str | None = None,
        network: str = "testnet",
        mock: bool | None = None,
    ):
        self._storage = ShelbyStorage(
            api_key=shelby_api_key,
            private_key=aptos_private_key,
            network=network,
            mock=mock,
        )
        self._metadata = MemoryMetadata(supabase_url, supabase_key)

    async def write(
        self,
        agent_id: str,
        memory: str,
        context: str,
        memory_type: str = "observation",
        metadata: dict | None = None,
    ) -> WriteResult:
        # 1. Serialise memory to bytes
        data = memory.encode("utf-8")

        # 2. Upload to Shelby (hash computed inside)
        blob_name = f"{agent_id}_{int(time.time() * 1000)}"
        result = await self._storage.upload(data, blob_name)

        # 3. Record metadata in Supabase with content hash
        preview = memory[:200]
        row = self._metadata.insert(
            agent_id=agent_id,
            context=context,
            memory_preview=preview,
            shelby_object_id=result.shelby_address,
            aptos_tx_hash=result.shelby_proof,
            content_hash=result.content_hash,
            memory_type=memory_type,
            metadata=metadata,
        )

        return WriteResult(
            shelby_object_id=result.shelby_address,
            aptos_tx_hash=result.shelby_proof,
            content_hash=result.content_hash,
            memory_type=memory_type,
            timestamp=row["created_at"],
        )

    async def recall(
        self,
        agent_id: str,
        context: str | None = None,
        limit: int = 10,
        memory_type: str | None = None,
    ) -> list[MemoryRecord]:
        # 1. Query Supabase for metadata
        rows = self._metadata.query(agent_id, context, memory_type, limit)

        # 2. For each row, retrieve content and verify hash
        results: list[MemoryRecord] = []

        for row in rows:
            verified = None
            try:
                data = await self._storage.download(row["shelby_object_id"])
                memory_text = data.decode("utf-8")

                # 3. Verify content integrity
                stored_hash = row.get("content_hash")
                if stored_hash:
                    actual_hash = compute_hash(data)
                    verified = actual_hash == stored_hash
            except Exception:
                memory_text = row.get("memory_preview") or "[content unavailable]"
                verified = None

            results.append(
                MemoryRecord(
                    memory=memory_text,
                    context=row["context"],
                    timestamp=row["created_at"],
                    aptos_tx_hash=row.get("aptos_tx_hash", ""),
                    content_hash=row.get("content_hash", ""),
                    memory_type=row.get("memory_type", "observation"),
                    verified=verified,
                )
            )

        return results

    async def verify(self, memory_id: str) -> VerifyResult:
        """Verify a memory's integrity by re-downloading and checking hash."""
        row = self._metadata.get_by_id(memory_id)
        if not row:
            raise ValueError(f"Memory not found: {memory_id}")

        expected_hash = row.get("content_hash", "")

        try:
            data = await self._storage.download(row["shelby_object_id"])
            actual_hash = compute_hash(data)
            return VerifyResult(
                verified=actual_hash == expected_hash,
                content_hash=actual_hash,
                expected_hash=expected_hash,
            )
        except Exception:
            return VerifyResult(
                verified=False,
                content_hash="",
                expected_hash=expected_hash,
            )

    def delete(self, memory_id: str) -> None:
        self._metadata.delete(memory_id)
