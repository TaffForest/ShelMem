from __future__ import annotations

"""Supabase metadata client for memory records."""

from supabase import create_client, Client


class MemoryMetadata:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.client: Client = create_client(supabase_url, supabase_key)

    def insert(
        self,
        agent_id: str,
        context: str,
        memory_preview: str,
        shelby_object_id: str,
        aptos_tx_hash: str,
        metadata: dict | None = None,
    ) -> dict:
        result = (
            self.client.table("memories")
            .insert(
                {
                    "agent_id": agent_id,
                    "context": context,
                    "memory_preview": memory_preview,
                    "shelby_object_id": shelby_object_id,
                    "aptos_tx_hash": aptos_tx_hash,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )
        return result.data[0]

    def query(
        self,
        agent_id: str,
        context: str | None = None,
        limit: int = 10,
    ) -> list[dict]:
        q = (
            self.client.table("memories")
            .select("*")
            .eq("agent_id", agent_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if context:
            q = q.eq("context", context)

        result = q.execute()
        return result.data or []

    def delete(self, memory_id: str) -> None:
        self.client.table("memories").delete().eq("id", memory_id).execute()
