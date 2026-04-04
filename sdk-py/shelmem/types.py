from dataclasses import dataclass, field
from typing import Optional


@dataclass
class WriteResult:
    shelby_object_id: str
    aptos_tx_hash: str
    timestamp: str


@dataclass
class MemoryRecord:
    memory: str
    context: str
    timestamp: str
    aptos_tx_hash: str
