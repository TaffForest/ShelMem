"""ShelMem — Decentralised AI agent memory SDK with tamper detection."""

from __future__ import annotations

import asyncio
from typing import Optional, List, Dict

from .shelby import ShelbyStorage, compute_hash, generate_blob_name
from .supabase_client import MemoryMetadata
from .types import (
    WriteResult, MemoryRecord, VerifyResult, SearchResult,
    RecordTransactionParams, RecordBalanceParams,
    Pool, PoolMember, CreatePoolParams, WriteToPoolParams, RecallFromPoolParams,
    SearchPoolParams, PoolAuditEntry,
)
from .embeddings import EmbeddingProvider

VALID_MEMORY_TYPES = (
    "fact", "decision", "preference", "observation",
    "transaction_record", "balance_snapshot", "spending_policy",
)


class ShelMemError(Exception):
    """Base exception for ShelMem errors."""
    pass


class ValidationError(ShelMemError):
    """Raised when input validation fails."""
    pass


class StorageError(ShelMemError):
    """Raised when Shelby storage operations fail."""
    pass


class MetadataError(ShelMemError):
    """Raised when Supabase metadata operations fail."""
    pass


class PermissionError(ShelMemError):
    """Raised when an agent lacks the required pool role."""
    pass


VALID_POOL_ROLES = ("owner", "writer", "reader")


class ShelMem:
    """Main client for writing and recalling agent memories.

    Memory content is stored on Shelby Protocol's decentralised hot storage.
    Metadata (agent_id, context, timestamps) is stored in Supabase.
    Every write is anchored on Aptos with a content hash for tamper detection.
    If an embedding provider is configured, semantic search is available.
    """

    def __init__(
        self,
        supabase_url: str,
        supabase_key: str,
        shelby_api_key: Optional[str] = None,
        aptos_private_key: Optional[str] = None,
        network: Optional[str] = None,
        mock: Optional[bool] = None,
        encrypt: bool = False,
        embedding_provider: Optional[EmbeddingProvider] = None,
    ):
        if not supabase_url or not supabase_url.startswith("http"):
            raise ValidationError("supabase_url must be a valid HTTP(S) URL")
        if not supabase_key:
            raise ValidationError("supabase_key is required")

        self._storage = ShelbyStorage(
            api_key=shelby_api_key,
            private_key=aptos_private_key,
            network=network,
            mock=mock,
            encrypt=encrypt,
        )
        self._metadata = MemoryMetadata(supabase_url, supabase_key)
        self._embed = embedding_provider

    async def write(
        self,
        agent_id: str,
        memory: str,
        context: str,
        memory_type: str = "observation",
        metadata: Optional[Dict] = None,
        amount: Optional[float] = None,
        currency: Optional[str] = None,
        counterparty: Optional[str] = None,
        tx_status: Optional[str] = None,
        shared_with: Optional[List[str]] = None,
    ) -> WriteResult:
        """Write a memory to decentralised storage with on-chain proof."""
        if not agent_id or not agent_id.strip():
            raise ValidationError("agent_id cannot be empty")
        if not memory:
            raise ValidationError("memory cannot be empty")
        if not context or not context.strip():
            raise ValidationError("context cannot be empty")
        if memory_type not in VALID_MEMORY_TYPES:
            raise ValidationError(
                f"memory_type must be one of: {', '.join(VALID_MEMORY_TYPES)} — got '{memory_type}'"
            )

        data = memory.encode("utf-8")
        blob_name = generate_blob_name(agent_id)

        try:
            result = await self._storage.upload(data, blob_name)
        except Exception as e:
            raise StorageError(f"Failed to upload to Shelby: {e}") from e

        embedding = None
        if self._embed:
            embedding = await self._embed(memory)

        preview = memory[:200]

        try:
            row = self._metadata.insert(
                agent_id=agent_id,
                context=context,
                memory_preview=preview,
                shelby_object_id=result.shelby_address,
                aptos_tx_hash=result.shelby_proof,
                content_hash=result.content_hash,
                memory_type=memory_type,
                metadata=metadata,
                embedding=embedding,
                amount=amount,
                currency=currency,
                counterparty=counterparty,
                tx_status=tx_status,
                shared_with=shared_with,
            )
        except Exception as e:
            raise MetadataError(f"Failed to insert metadata: {e}") from e

        return WriteResult(
            shelby_object_id=result.shelby_address,
            aptos_tx_hash=result.shelby_proof,
            content_hash=result.content_hash,
            memory_type=memory_type,
            timestamp=row["created_at"],
            amount=row.get("amount"),
            currency=row.get("currency"),
            counterparty=row.get("counterparty"),
            tx_status=row.get("tx_status"),
        )

    async def recall(
        self,
        agent_id: str,
        context: Optional[str] = None,
        limit: int = 10,
        memory_type: Optional[str] = None,
    ) -> List[MemoryRecord]:
        """Retrieve memories. Each is decrypted and verified against its content hash."""
        if not agent_id or not agent_id.strip():
            raise ValidationError("agent_id cannot be empty")

        rows = self._metadata.query(agent_id, context, memory_type, limit)

        async def _process_row(row: Dict) -> MemoryRecord:
            verified = None
            try:
                data = await self._storage.download(row["shelby_object_id"])
                memory_text = data.decode("utf-8")

                stored_hash = row.get("content_hash")
                if stored_hash:
                    actual_hash = compute_hash(data)
                    verified = actual_hash == stored_hash
            except KeyError:
                memory_text = row.get("memory_preview") or "[content unavailable]"
                verified = None
            except Exception:
                memory_text = row.get("memory_preview") or "[content unavailable]"
                verified = None

            # Write back verified status if it changed
            if verified is not None and verified != row.get("verified"):
                try:
                    self._metadata.update_verified(row["id"], verified)
                except Exception:
                    pass

            return MemoryRecord(
                memory=memory_text,
                context=row["context"],
                timestamp=row["created_at"],
                aptos_tx_hash=row.get("aptos_tx_hash", ""),
                content_hash=row.get("content_hash", ""),
                memory_type=row.get("memory_type", "observation"),
                verified=verified,
                amount=row.get("amount"),
                currency=row.get("currency"),
                counterparty=row.get("counterparty"),
                tx_status=row.get("tx_status"),
            )

        return list(await asyncio.gather(*[_process_row(row) for row in rows]))

    async def verify(self, memory_id: str) -> VerifyResult:
        """Verify a memory's integrity by re-downloading and checking hash."""
        row = self._metadata.get_by_id(memory_id)
        if not row:
            raise ValidationError(f"Memory not found: {memory_id}")

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

    async def search(
        self,
        query: str,
        agent_id: Optional[str] = None,
        limit: int = 10,
        threshold: float = 0.5,
    ) -> List[SearchResult]:
        """Semantic search by meaning using vector similarity."""
        if not self._embed:
            raise RuntimeError("Semantic search requires an embedding_provider")

        query_embedding = await self._embed(query)
        rows = self._metadata.search(query_embedding, agent_id, threshold, limit)

        return [
            SearchResult(
                id=r["id"],
                agent_id=r["agent_id"],
                context=r["context"],
                memory_preview=r.get("memory_preview"),
                memory_type=r.get("memory_type"),
                content_hash=r.get("content_hash"),
                aptos_tx_hash=r.get("aptos_tx_hash"),
                created_at=r["created_at"],
                similarity=r["similarity"],
            )
            for r in rows
        ]

    async def delete(self, memory_id: str) -> None:
        """Delete a memory. Attempts Shelby blob deletion before removing metadata."""
        row = self._metadata.get_by_id(memory_id)
        if row:
            await self._storage.try_delete(row["shelby_object_id"])
        self._metadata.delete(memory_id)

    # --- Treasury convenience methods ---

    async def record_transaction(self, params: RecordTransactionParams) -> WriteResult:
        """Record an agent transaction. Sets memory_type='transaction_record'."""
        return await self.write(
            agent_id=params.agent_id,
            memory=params.memory,
            context=params.context,
            memory_type="transaction_record",
            metadata=params.metadata,
            amount=params.amount,
            currency=params.currency,
            counterparty=params.counterparty,
            tx_status=params.tx_status,
        )

    async def record_balance_snapshot(self, params: RecordBalanceParams) -> WriteResult:
        """Record a point-in-time balance snapshot. Sets memory_type='balance_snapshot'."""
        return await self.write(
            agent_id=params.agent_id,
            memory=params.memory,
            context=params.context,
            memory_type="balance_snapshot",
            metadata=params.metadata,
            amount=params.amount,
            currency=params.currency,
        )

    async def get_latest_balance(self, agent_id: str) -> Optional[MemoryRecord]:
        """Get the most recent balance snapshot. Returns None if none exist."""
        results = await self.recall(agent_id, None, 1, "balance_snapshot")
        return results[0] if results else None

    # --- Shared memory pools ---

    def _assert_role(self, pool_id: str, agent_id: str, allowed: tuple) -> dict:
        member = self._metadata.get_member(pool_id, agent_id)
        if not member:
            raise PermissionError(
                f"Agent '{agent_id}' is not a member of pool '{pool_id}'"
            )
        if member.get("role") not in allowed:
            raise PermissionError(
                f"Agent '{agent_id}' has role '{member.get('role')}'; "
                f"required one of {list(allowed)}"
            )
        return member

    async def create_pool(self, params: CreatePoolParams) -> Pool:
        """Create a pool. Owner is auto-added as a member with role='owner'."""
        if not params.name or not params.name.strip():
            raise ValidationError("pool name cannot be empty")
        if not params.owner_agent_id or not params.owner_agent_id.strip():
            raise ValidationError("owner_agent_id cannot be empty")

        row = self._metadata.insert_pool(
            name=params.name,
            owner_agent_id=params.owner_agent_id,
            description=params.description,
            metadata=params.metadata,
        )
        return Pool(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            owner_agent_id=row["owner_agent_id"],
            metadata=row.get("metadata") or {},
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def get_pool(self, pool_id: str, caller_agent_id: str) -> Pool:
        """Get pool metadata. Caller must be a pool member."""
        self._assert_role(pool_id, caller_agent_id, VALID_POOL_ROLES)
        row = self._metadata.get_pool(pool_id)
        if not row:
            raise ValidationError(f"Pool not found: {pool_id}")
        return Pool(
            id=row["id"],
            name=row["name"],
            description=row.get("description"),
            owner_agent_id=row["owner_agent_id"],
            metadata=row.get("metadata") or {},
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def list_pools(self, agent_id: str) -> List[Pool]:
        """List pools the agent is a member of."""
        rows = self._metadata.list_pools_for_agent(agent_id)
        return [
            Pool(
                id=r["id"],
                name=r["name"],
                description=r.get("description"),
                owner_agent_id=r["owner_agent_id"],
                metadata=r.get("metadata") or {},
                created_at=r["created_at"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    async def delete_pool(self, pool_id: str, caller_agent_id: str) -> None:
        """Delete a pool. Owner only."""
        self._assert_role(pool_id, caller_agent_id, ("owner",))
        self._metadata.delete_pool(pool_id)

    async def add_pool_member(
        self,
        pool_id: str,
        caller_agent_id: str,
        target_agent_id: str,
        role: str,
    ) -> PoolMember:
        """Add or update a member's role. Owner only."""
        self._assert_role(pool_id, caller_agent_id, ("owner",))
        if role not in VALID_POOL_ROLES:
            raise ValidationError(f"role must be one of {list(VALID_POOL_ROLES)}")
        if not target_agent_id or not target_agent_id.strip():
            raise ValidationError("target_agent_id cannot be empty")
        row = self._metadata.upsert_member(pool_id, target_agent_id, role)
        return PoolMember(
            pool_id=row["pool_id"],
            agent_id=row["agent_id"],
            role=row["role"],
            added_at=row["added_at"],
        )

    async def remove_pool_member(
        self,
        pool_id: str,
        caller_agent_id: str,
        target_agent_id: str,
    ) -> None:
        """Remove a member. Owner only. Cannot remove the pool owner."""
        self._assert_role(pool_id, caller_agent_id, ("owner",))
        target = self._metadata.get_member(pool_id, target_agent_id)
        if target and target.get("role") == "owner":
            raise PermissionError("Cannot remove the pool owner")
        self._metadata.remove_member(pool_id, target_agent_id)

    async def list_pool_members(
        self, pool_id: str, caller_agent_id: str
    ) -> List[PoolMember]:
        """List all members. Caller must be a pool member."""
        self._assert_role(pool_id, caller_agent_id, VALID_POOL_ROLES)
        rows = self._metadata.list_members(pool_id)
        return [
            PoolMember(
                pool_id=r["pool_id"],
                agent_id=r["agent_id"],
                role=r["role"],
                added_at=r["added_at"],
            )
            for r in rows
        ]

    async def write_to_pool(self, params: WriteToPoolParams) -> WriteResult:
        """Write a memory into a shared pool. Caller must be owner or writer."""
        self._assert_role(params.pool_id, params.agent_id, ("owner", "writer"))

        if not params.memory:
            raise ValidationError("memory cannot be empty")
        if not params.context or not params.context.strip():
            raise ValidationError("context cannot be empty")
        if params.memory_type not in VALID_MEMORY_TYPES:
            raise ValidationError(
                f"memory_type must be one of: {', '.join(VALID_MEMORY_TYPES)} — got '{params.memory_type}'"
            )

        data = params.memory.encode("utf-8")
        blob_name = generate_blob_name(params.agent_id)

        try:
            result = await self._storage.upload(data, blob_name)
        except Exception as e:
            raise StorageError(f"Failed to upload to Shelby: {e}") from e

        embedding = None
        if self._embed:
            embedding = await self._embed(params.memory)

        preview = params.memory[:200]

        try:
            row = self._metadata.insert(
                agent_id=params.agent_id,
                context=params.context,
                memory_preview=preview,
                shelby_object_id=result.shelby_address,
                aptos_tx_hash=result.shelby_proof,
                content_hash=result.content_hash,
                memory_type=params.memory_type,
                metadata=params.metadata,
                embedding=embedding,
                amount=params.amount,
                currency=params.currency,
                counterparty=params.counterparty,
                tx_status=params.tx_status,
                pool_id=params.pool_id,
            )
        except Exception as e:
            raise MetadataError(f"Failed to insert metadata: {e}") from e

        # Best-effort audit log; never fail the write.
        try:
            self._metadata.log_pool_access(
                pool_id=params.pool_id,
                agent_id=params.agent_id,
                action="write",
                memory_id=row.get("id"),
            )
        except Exception:
            pass

        return WriteResult(
            shelby_object_id=result.shelby_address,
            aptos_tx_hash=result.shelby_proof,
            content_hash=result.content_hash,
            memory_type=params.memory_type,
            timestamp=row["created_at"],
            amount=row.get("amount"),
            currency=row.get("currency"),
            counterparty=row.get("counterparty"),
            tx_status=row.get("tx_status"),
        )

    async def recall_from_pool(
        self, params: RecallFromPoolParams
    ) -> List[MemoryRecord]:
        """Recall memories from a shared pool. Caller must be a pool member."""
        self._assert_role(params.pool_id, params.agent_id, VALID_POOL_ROLES)

        rows = self._metadata.query_pool(
            params.pool_id, params.context, params.memory_type, params.limit
        )

        async def _process_row(row: Dict) -> MemoryRecord:
            verified = None
            try:
                data = await self._storage.download(row["shelby_object_id"])
                memory_text = data.decode("utf-8")

                stored_hash = row.get("content_hash")
                if stored_hash:
                    actual_hash = compute_hash(data)
                    verified = actual_hash == stored_hash
            except Exception:
                memory_text = row.get("memory_preview") or "[content unavailable]"
                verified = None

            if verified is not None and verified != row.get("verified"):
                try:
                    self._metadata.update_verified(row["id"], verified)
                except Exception:
                    pass

            return MemoryRecord(
                memory=memory_text,
                context=row["context"],
                timestamp=row["created_at"],
                aptos_tx_hash=row.get("aptos_tx_hash", ""),
                content_hash=row.get("content_hash", ""),
                memory_type=row.get("memory_type", "observation"),
                verified=verified,
                agent_id=row.get("agent_id"),
                pool_id=row.get("pool_id"),
                shared_with=row.get("shared_with") or [],
                amount=row.get("amount"),
                currency=row.get("currency"),
                counterparty=row.get("counterparty"),
                tx_status=row.get("tx_status"),
            )

        records = list(await asyncio.gather(*[_process_row(row) for row in rows]))

        try:
            self._metadata.log_pool_access(
                pool_id=params.pool_id,
                agent_id=params.agent_id,
                action="read",
                result_count=len(records),
            )
        except Exception:
            pass

        return records

    async def recall_shared(
        self,
        agent_id: str,
        context: Optional[str] = None,
        limit: int = 10,
        memory_type: Optional[str] = None,
    ) -> List[MemoryRecord]:
        """Recall memories explicitly shared with this agent via shared_with."""
        rows = self._metadata.query_shared_with(agent_id, context, memory_type, limit)

        async def _process_row(row: Dict) -> MemoryRecord:
            verified = None
            try:
                data = await self._storage.download(row["shelby_object_id"])
                memory_text = data.decode("utf-8")
                stored_hash = row.get("content_hash")
                if stored_hash:
                    verified = compute_hash(data) == stored_hash
            except Exception:
                memory_text = row.get("memory_preview") or "[content unavailable]"
                verified = None

            return MemoryRecord(
                memory=memory_text,
                context=row["context"],
                timestamp=row["created_at"],
                aptos_tx_hash=row.get("aptos_tx_hash", ""),
                content_hash=row.get("content_hash", ""),
                memory_type=row.get("memory_type", "observation"),
                verified=verified,
                agent_id=row.get("agent_id"),
                pool_id=row.get("pool_id"),
                shared_with=row.get("shared_with") or [],
                amount=row.get("amount"),
                currency=row.get("currency"),
                counterparty=row.get("counterparty"),
                tx_status=row.get("tx_status"),
            )

        return list(await asyncio.gather(*[_process_row(r) for r in rows]))

    async def search_pool(self, params: SearchPoolParams) -> List[SearchResult]:
        """Semantic search inside a shared pool. Caller must be a member."""
        if not self._embed:
            raise RuntimeError("Semantic search requires an embedding_provider")
        self._assert_role(params.pool_id, params.agent_id, VALID_POOL_ROLES)

        query_embedding = await self._embed(params.query)
        rows = self._metadata.search_pool(
            query_embedding, params.pool_id, params.threshold, params.limit
        )

        try:
            self._metadata.log_pool_access(
                pool_id=params.pool_id,
                agent_id=params.agent_id,
                action="read",
                result_count=len(rows),
                metadata={"search_query": params.query},
            )
        except Exception:
            pass

        return [
            SearchResult(
                id=r["id"],
                agent_id=r["agent_id"],
                context=r["context"],
                memory_preview=r.get("memory_preview"),
                memory_type=r.get("memory_type"),
                content_hash=r.get("content_hash"),
                aptos_tx_hash=r.get("aptos_tx_hash"),
                created_at=r["created_at"],
                similarity=r["similarity"],
            )
            for r in rows
        ]

    async def get_pool_audit_log(
        self, pool_id: str, caller_agent_id: str, limit: int = 100
    ) -> List[PoolAuditEntry]:
        """Read the audit log for a pool. Owner only."""
        self._assert_role(pool_id, caller_agent_id, ("owner",))
        rows = self._metadata.query_pool_audit_log(pool_id, limit)
        return [
            PoolAuditEntry(
                id=r["id"],
                pool_id=r["pool_id"],
                agent_id=r["agent_id"],
                action=r["action"],
                memory_id=r.get("memory_id"),
                result_count=r.get("result_count"),
                metadata=r.get("metadata") or {},
                created_at=r["created_at"],
            )
            for r in rows
        ]
