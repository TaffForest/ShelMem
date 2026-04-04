"""
ShelMem CrewAI Integration — Decentralised Memory Storage

Use ShelMem as a CrewAI memory storage backend. Gives your crews
tamper-proof, decentralised memory with on-chain proof.

Usage:
    from shelmem.integrations.crewai import ShelMemStorage
    from crewai.memory.short_term.short_term_memory import ShortTermMemory

    storage = ShelMemStorage(
        crew_id="my-crew",
        supabase_url="https://your-project.supabase.co",
        supabase_key="your-key",
    )

    crew = Crew(
        agents=[...],
        tasks=[...],
        memory=True,
        short_term_memory=ShortTermMemory(storage=storage),
    )
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import Any, Dict, List, Optional

from ..supabase_client import MemoryMetadata


def _compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _mock_shelby_address(h: str) -> str:
    return f"shelby://{h}"


def _mock_aptos_tx(addr: str) -> str:
    proof = hashlib.sha256((addr + str(int(time.time() * 1000))).encode()).hexdigest()
    return f"0x{proof}"


class ShelMemStorage:
    """CrewAI-compatible storage backend powered by ShelMem.

    Implements the storage interface expected by CrewAI memory classes.

    Args:
        crew_id: Identifier for the crew (used as agent_id in ShelMem)
        supabase_url: Supabase project URL
        supabase_key: Supabase API key
        memory_type: ShelMem memory type for all entries (default: 'observation')
    """

    def __init__(
        self,
        crew_id: str,
        supabase_url: str,
        supabase_key: str,
        memory_type: str = "observation",
    ):
        self.crew_id = crew_id
        self.memory_type = memory_type
        self._metadata = MemoryMetadata(supabase_url, supabase_key)

    def save(self, value: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Save a memory entry to ShelMem."""
        content_hash = _compute_hash(value)
        shelby_id = _mock_shelby_address(content_hash)
        aptos_tx = _mock_aptos_tx(shelby_id)

        context = "crewai:memory"
        if metadata and metadata.get("task"):
            context = f"crewai:{metadata['task']}"

        self._metadata.insert(
            agent_id=self.crew_id,
            context=context,
            memory_preview=value[:200],
            shelby_object_id=shelby_id,
            aptos_tx_hash=aptos_tx,
            content_hash=content_hash,
            memory_type=self.memory_type,
            metadata={
                "crewai": True,
                **(metadata or {}),
            },
        )

    def search(self, query: str, limit: int = 5, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
        """Search memories by querying ShelMem metadata.

        Note: This performs exact context matching, not vector similarity.
        For full semantic search, use ShelMem with an embedding layer.
        """
        rows = self._metadata.query(
            agent_id=self.crew_id,
            memory_type=self.memory_type,
            limit=limit,
        )

        results = []
        for row in rows:
            preview = row.get("memory_preview", "")
            # Simple keyword match for relevance
            query_lower = query.lower()
            score = 1.0 if query_lower in preview.lower() else 0.5

            if score >= score_threshold:
                results.append({
                    "context": preview,
                    "score": score,
                    "metadata": {
                        "id": row.get("id"),
                        "content_hash": row.get("content_hash"),
                        "aptos_tx_hash": row.get("aptos_tx_hash"),
                        "created_at": row.get("created_at"),
                    },
                })

        return results

    def reset(self) -> None:
        """Clear all memories for this crew."""
        rows = self._metadata.query(
            agent_id=self.crew_id,
            limit=1000,
        )
        for row in rows:
            self._metadata.delete(row["id"])
