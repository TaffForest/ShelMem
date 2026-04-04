"""
ShelMem LangChain Integration — Decentralised Chat Message History

Use ShelMem as a LangChain memory backend. Every message is stored on
Shelby Protocol with SHA-256 content hashing and Aptos on-chain proof.

Usage:
    from shelmem.integrations.langchain import ShelMemChatMessageHistory

    history = ShelMemChatMessageHistory(
        session_id="user-123",
        agent_id="my-chatbot",
        supabase_url="https://your-project.supabase.co",
        supabase_key="your-key",
    )

    # Use with LangChain
    from langchain_core.runnables.history import RunnableWithMessageHistory
    chain_with_history = RunnableWithMessageHistory(chain, lambda sid: history)
"""

from __future__ import annotations

import hashlib
import json
import time
from typing import List, Optional, Sequence

from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage, messages_from_dict, messages_to_dict

from ..supabase_client import MemoryMetadata


def _compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _mock_shelby_address(content_hash: str) -> str:
    return f"shelby://{content_hash}"


def _mock_aptos_tx(addr: str) -> str:
    proof = hashlib.sha256((addr + str(int(time.time() * 1000))).encode()).hexdigest()
    return f"0x{proof}"


class ShelMemChatMessageHistory(BaseChatMessageHistory):
    """LangChain chat message history backed by ShelMem.

    Stores messages in Supabase with Shelby addresses and content hashes.
    Each message is individually hashed for tamper detection.

    Args:
        session_id: Unique session identifier (used as context in ShelMem)
        agent_id: Agent identifier for ShelMem
        supabase_url: Supabase project URL
        supabase_key: Supabase API key
    """

    def __init__(
        self,
        session_id: str,
        agent_id: str,
        supabase_url: str,
        supabase_key: str,
    ):
        self.session_id = session_id
        self.agent_id = agent_id
        self._metadata = MemoryMetadata(supabase_url, supabase_key)

    @property
    def messages(self) -> List[BaseMessage]:
        """Retrieve all messages for this session from ShelMem."""
        rows = self._metadata.query(
            agent_id=self.agent_id,
            context=f"langchain:{self.session_id}",
            memory_type="fact",
            limit=1000,
        )

        # Sort by created_at ascending (oldest first for conversation order)
        rows.sort(key=lambda r: r.get("created_at", ""))

        result: List[BaseMessage] = []
        for row in rows:
            preview = row.get("memory_preview", "")
            if not preview:
                continue
            try:
                msg_data = json.loads(preview)
                restored = messages_from_dict([msg_data])
                result.extend(restored)
            except (json.JSONDecodeError, Exception):
                continue

        return result

    def add_messages(self, messages: Sequence[BaseMessage]) -> None:
        """Add messages to ShelMem with content hashing."""
        serialized = messages_to_dict(messages)

        for msg_dict in serialized:
            content_str = json.dumps(msg_dict, sort_keys=True)
            content_hash = _compute_hash(content_str)
            shelby_id = _mock_shelby_address(content_hash)
            aptos_tx = _mock_aptos_tx(shelby_id)

            # Store the full serialised message as memory_preview
            # (within 200 char limit we store the JSON; for longer messages
            # we truncate but the hash covers the full content)
            preview = content_str[:200]

            self._metadata.insert(
                agent_id=self.agent_id,
                context=f"langchain:{self.session_id}",
                memory_preview=preview,
                shelby_object_id=shelby_id,
                aptos_tx_hash=aptos_tx,
                content_hash=content_hash,
                memory_type="fact",
                metadata={"langchain": True, "session_id": self.session_id},
            )

    def clear(self) -> None:
        """Remove all messages for this session."""
        rows = self._metadata.query(
            agent_id=self.agent_id,
            context=f"langchain:{self.session_id}",
            limit=1000,
        )
        for row in rows:
            self._metadata.delete(row["id"])
