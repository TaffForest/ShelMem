from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

MemoryType = Literal[
    'fact', 'decision', 'preference', 'observation',
    'transaction_record', 'balance_snapshot', 'spending_policy',
]

TreasuryMemoryType = Literal['transaction_record', 'balance_snapshot', 'spending_policy']


@dataclass
class WriteResult:
    shelby_object_id: str
    aptos_tx_hash: str
    content_hash: str
    memory_type: str
    timestamp: str
    amount: Optional[float] = None
    currency: Optional[str] = None
    counterparty: Optional[str] = None
    tx_status: Optional[str] = None


@dataclass
class MemoryRecord:
    memory: str
    context: str
    timestamp: str
    aptos_tx_hash: str
    content_hash: str
    memory_type: str
    verified: Optional[bool]
    agent_id: Optional[str] = None
    pool_id: Optional[str] = None
    shared_with: Optional[list] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    counterparty: Optional[str] = None
    tx_status: Optional[str] = None


PoolRole = Literal["owner", "writer", "reader"]


@dataclass
class Pool:
    id: str
    name: str
    description: Optional[str]
    owner_agent_id: str
    metadata: dict
    created_at: str
    updated_at: str


@dataclass
class PoolMember:
    pool_id: str
    agent_id: str
    role: str
    added_at: str


@dataclass
class CreatePoolParams:
    name: str
    owner_agent_id: str
    description: Optional[str] = None
    metadata: Optional[dict] = None
    claim: Optional["AgentClaim"] = None


@dataclass
class WriteToPoolParams:
    pool_id: str
    agent_id: str
    memory: str
    context: str
    memory_type: str = "observation"
    metadata: Optional[dict] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    counterparty: Optional[str] = None
    tx_status: Optional[str] = None
    claim: Optional["AgentClaim"] = None


@dataclass
class RecallFromPoolParams:
    pool_id: str
    agent_id: str
    context: Optional[str] = None
    limit: int = 10
    memory_type: Optional[str] = None
    claim: Optional["AgentClaim"] = None


@dataclass
class SearchPoolParams:
    pool_id: str
    agent_id: str
    query: str
    limit: int = 10
    threshold: float = 0.5
    claim: Optional["AgentClaim"] = None


AuditAction = Literal["write", "read"]


@dataclass
class PoolAuditEntry:
    id: str
    pool_id: str
    agent_id: str
    action: str
    memory_id: Optional[str]
    result_count: Optional[int]
    metadata: dict
    created_at: str


@dataclass
class AgentClaim:
    agent_id: str
    timestamp: int
    public_key: str
    signature: str


@dataclass
class VerifyResult:
    verified: bool
    content_hash: str
    expected_hash: str


@dataclass
class SearchResult:
    id: str
    agent_id: str
    context: str
    memory_preview: Optional[str]
    memory_type: Optional[str]
    content_hash: Optional[str]
    aptos_tx_hash: Optional[str]
    created_at: str
    similarity: float


@dataclass
class RecordTransactionParams:
    agent_id: str
    memory: str
    context: str
    amount: float
    currency: str
    counterparty: str
    tx_status: str = "pending"
    metadata: Optional[dict] = None


@dataclass
class RecordBalanceParams:
    agent_id: str
    memory: str
    context: str
    amount: float
    currency: str
    metadata: Optional[dict] = None
