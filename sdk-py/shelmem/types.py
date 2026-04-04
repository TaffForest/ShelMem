from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Optional

MemoryType = Literal['fact', 'decision', 'preference', 'observation']


@dataclass
class WriteResult:
    shelby_object_id: str
    aptos_tx_hash: str
    content_hash: str
    memory_type: str
    timestamp: str


@dataclass
class MemoryRecord:
    memory: str
    context: str
    timestamp: str
    aptos_tx_hash: str
    content_hash: str
    memory_type: str
    verified: Optional[bool]


@dataclass
class VerifyResult:
    verified: bool
    content_hash: str
    expected_hash: str
