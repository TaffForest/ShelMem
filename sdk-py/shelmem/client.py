"""ShelMem — Decentralised AI agent memory SDK."""

from __future__ import annotations

from .shelby import ShelbyStorage
from .supabase_client import MemoryMetadata
from .types import WriteResult, MemoryRecord


class ShelMem:
    """Main client for writing and recalling agent memories.

    Memory content is stored on Shelby Protocol's decentralised hot storage.
    Metadata (agent_id, context, timestamps) is stored in Supabase.
    Every write is anchored on Aptos for cryptographic proof.
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
        metadata: dict | None = None,
    ) -> WriteResult:
        # 1. Serialise memory to bytes
        data = memory.encode("utf-8")

        # 2. Upload to Shelby
        import time

        blob_name = f"{agent_id}_{int(time.time() * 1000)}"
        result = await self._storage.upload(data, blob_name)

        # 3. Record metadata in Supabase
        preview = memory[:200]
        row = self._metadata.insert(
            agent_id=agent_id,
            context=context,
            memory_preview=preview,
            shelby_object_id=result.shelby_address,
            aptos_tx_hash=result.shelby_proof,
            metadata=metadata,
        )

        return WriteResult(
            shelby_object_id=result.shelby_address,
            aptos_tx_hash=result.shelby_proof,
            timestamp=row["created_at"],
        )

    async def recall(
        self,
        agent_id: str,
        context: str | None = None,
        limit: int = 10,
    ) -> list[MemoryRecord]:
        # 1. Query Supabase for metadata
        rows = self._metadata.query(agent_id, context, limit)

        # 2. For each row, retrieve content from Shelby
        results: list[MemoryRecord] = []

        for row in rows:
            try:
                data = await self._storage.download(row["shelby_object_id"])
                memory_text = data.decode("utf-8")
            except Exception:
                # Fall back to preview if download fails (e.g. mock mode)
                memory_text = row.get("memory_preview") or "[content unavailable]"

            results.append(
                MemoryRecord(
                    memory=memory_text,
                    context=row["context"],
                    timestamp=row["created_at"],
                    aptos_tx_hash=row.get("aptos_tx_hash", ""),
                )
            )

        return results

    def delete(self, memory_id: str) -> None:
        self._metadata.delete(memory_id)
