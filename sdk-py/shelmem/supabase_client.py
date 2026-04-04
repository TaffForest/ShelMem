from __future__ import annotations

"""Supabase metadata client for memory records."""

from typing import Optional
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
        content_hash: str,
        memory_type: str = "observation",
        metadata: Optional[dict] = None,
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
                    "content_hash": content_hash,
                    "memory_type": memory_type,
                    "metadata": metadata or {},
                }
            )
            .execute()
        )
        return result.data[0]

    def query(
        self,
        agent_id: str,
        context: Optional[str] = None,
        memory_type: Optional[str] = None,
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
        if memory_type:
            q = q.eq("memory_type", memory_type)

        result = q.execute()
        return result.data or []

    def get_by_id(self, memory_id: str) -> Optional[dict]:
        result = (
            self.client.table("memories")
            .select("*")
            .eq("id", memory_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def delete(self, memory_id: str) -> None:
        self.client.table("memories").delete().eq("id", memory_id).execute()
