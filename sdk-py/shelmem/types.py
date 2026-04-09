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
    amount: Optional[float] = None
    currency: Optional[str] = None
    counterparty: Optional[str] = None
    tx_status: Optional[str] = None


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
