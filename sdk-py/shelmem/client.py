"""ShelMem — Decentralised AI agent memory SDK with tamper detection."""

from __future__ import annotations

from typing import Optional, List, Dict

from .shelby import ShelbyStorage, compute_hash, generate_blob_name
from .supabase_client import MemoryMetadata
from .types import WriteResult, MemoryRecord, VerifyResult, SearchResult
from .embeddings import EmbeddingProvider

VALID_MEMORY_TYPES = ("fact", "decision", "preference", "observation")


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
    ) -> WriteResult:
        """Write a memory to decentralised storage with on-chain proof."""
        # Input validation
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

        # Generate embedding if provider configured
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
            )
        except Exception as e:
            raise MetadataError(f"Failed to insert metadata: {e}") from e

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
        context: Optional[str] = None,
        limit: int = 10,
        memory_type: Optional[str] = None,
    ) -> List[MemoryRecord]:
        """Retrieve memories. Each is decrypted and verified against its content hash."""
        if not agent_id or not agent_id.strip():
            raise ValidationError("agent_id cannot be empty")

        rows = self._metadata.query(agent_id, context, memory_type, limit)
        results: List[MemoryRecord] = []

        for row in rows:
            verified = None
            try:
                data = await self._storage.download(row["shelby_object_id"])
                memory_text = data.decode("utf-8")

                stored_hash = row.get("content_hash")
                if stored_hash:
                    actual_hash = compute_hash(data)
                    verified = actual_hash == stored_hash
            except KeyError:
                # Mock store miss — use preview
                memory_text = row.get("memory_preview") or "[content unavailable]"
                verified = None
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
        """Delete a memory from Supabase metadata."""
        self._metadata.delete(memory_id)
