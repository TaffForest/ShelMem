from __future__ import annotations

"""Supabase metadata client for memory records."""

import json
from typing import Optional, List
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
        embedding: Optional[List[float]] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        counterparty: Optional[str] = None,
        tx_status: Optional[str] = None,
        pool_id: Optional[str] = None,
        shared_with: Optional[List[str]] = None,
    ) -> dict:
        insert_data = {
            "agent_id": agent_id,
            "context": context,
            "memory_preview": memory_preview,
            "shelby_object_id": shelby_object_id,
            "aptos_tx_hash": aptos_tx_hash,
            "content_hash": content_hash,
            "memory_type": memory_type,
            "metadata": metadata or {},
        }

        if embedding is not None:
            insert_data["embedding"] = json.dumps(embedding)

        if pool_id is not None:
            insert_data["pool_id"] = pool_id

        if shared_with:
            insert_data["shared_with"] = shared_with

        # Treasury fields
        if amount is not None:
            insert_data["amount"] = amount
        if currency is not None:
            insert_data["currency"] = currency
        if counterparty is not None:
            insert_data["counterparty"] = counterparty
        if tx_status is not None:
            insert_data["tx_status"] = tx_status

        result = (
            self.client.table("memories")
            .insert(insert_data)
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

    def search(
        self,
        query_embedding: List[float],
        agent_id: Optional[str] = None,
        threshold: float = 0.5,
        limit: int = 10,
    ) -> list[dict]:
        result = self.client.rpc(
            "match_memories",
            {
                "query_embedding": json.dumps(query_embedding),
                "filter_agent_id": agent_id,
                "match_threshold": threshold,
                "match_count": limit,
            },
        ).execute()
        return result.data or []

    def get_by_id(self, memory_id: str) -> Optional[dict]:
        result = (
            self.client.table("memories")
            .select("*")
            .eq("id", memory_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_verified(self, memory_id: str, verified: bool) -> None:
        self.client.table("memories").update({"verified": verified}).eq("id", memory_id).execute()

    def delete(self, memory_id: str) -> None:
        self.client.table("memories").delete().eq("id", memory_id).execute()

    def query_pool(
        self,
        pool_id: str,
        context: Optional[str] = None,
        memory_type: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        q = (
            self.client.table("memories")
            .select("*")
            .eq("pool_id", pool_id)
            .order("created_at", desc=True)
            .limit(limit)
        )
        if context:
            q = q.eq("context", context)
        if memory_type:
            q = q.eq("memory_type", memory_type)

        result = q.execute()
        return result.data or []

    # --- Pool methods ---

    def insert_pool(
        self,
        name: str,
        owner_agent_id: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> dict:
        result = (
            self.client.table("memory_pools")
            .insert({
                "name": name,
                "description": description,
                "owner_agent_id": owner_agent_id,
                "metadata": metadata or {},
            })
            .execute()
        )
        return result.data[0]

    def get_pool(self, pool_id: str) -> Optional[dict]:
        result = (
            self.client.table("memory_pools")
            .select("*")
            .eq("id", pool_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def delete_pool(self, pool_id: str) -> None:
        self.client.table("memory_pools").delete().eq("id", pool_id).execute()

    def list_pools_for_agent(self, agent_id: str) -> list[dict]:
        result = (
            self.client.table("pool_members")
            .select("pool_id, memory_pools(*)")
            .eq("agent_id", agent_id)
            .execute()
        )
        rows = result.data or []
        pools: list[dict] = []
        for r in rows:
            p = r.get("memory_pools")
            if isinstance(p, list):
                pools.extend(p)
            elif p:
                pools.append(p)
        return pools

    def get_member(self, pool_id: str, agent_id: str) -> Optional[dict]:
        result = (
            self.client.table("pool_members")
            .select("*")
            .eq("pool_id", pool_id)
            .eq("agent_id", agent_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def list_members(self, pool_id: str) -> list[dict]:
        result = (
            self.client.table("pool_members")
            .select("*")
            .eq("pool_id", pool_id)
            .execute()
        )
        return result.data or []

    def upsert_member(self, pool_id: str, agent_id: str, role: str) -> dict:
        result = (
            self.client.table("pool_members")
            .upsert(
                {"pool_id": pool_id, "agent_id": agent_id, "role": role},
                on_conflict="pool_id,agent_id",
            )
            .execute()
        )
        return result.data[0]

    def remove_member(self, pool_id: str, agent_id: str) -> None:
        (
            self.client.table("pool_members")
            .delete()
            .eq("pool_id", pool_id)
            .eq("agent_id", agent_id)
            .execute()
        )

    # --- Per-memory ACLs ---

    def query_shared_with(
        self,
        agent_id: str,
        context: Optional[str] = None,
        memory_type: Optional[str] = None,
        limit: int = 10,
    ) -> list[dict]:
        q = (
            self.client.table("memories")
            .select("*")
            .contains("shared_with", [agent_id])
            .order("created_at", desc=True)
            .limit(limit)
        )
        if context:
            q = q.eq("context", context)
        if memory_type:
            q = q.eq("memory_type", memory_type)
        result = q.execute()
        return result.data or []

    # --- Pool semantic search ---

    def search_pool(
        self,
        query_embedding: List[float],
        pool_id: str,
        threshold: float = 0.5,
        limit: int = 10,
    ) -> list[dict]:
        result = self.client.rpc(
            "match_pool_memories",
            {
                "query_embedding": json.dumps(query_embedding),
                "filter_pool_id": pool_id,
                "match_threshold": threshold,
                "match_count": limit,
            },
        ).execute()
        return result.data or []

    # --- Audit log ---

    def log_pool_access(
        self,
        pool_id: str,
        agent_id: str,
        action: str,
        memory_id: Optional[str] = None,
        result_count: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> None:
        (
            self.client.table("pool_access_log")
            .insert({
                "pool_id": pool_id,
                "agent_id": agent_id,
                "action": action,
                "memory_id": memory_id,
                "result_count": result_count,
                "metadata": metadata or {},
            })
            .execute()
        )

    def query_pool_audit_log(self, pool_id: str, limit: int = 100) -> list[dict]:
        result = (
            self.client.table("pool_access_log")
            .select("*")
            .eq("pool_id", pool_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []
