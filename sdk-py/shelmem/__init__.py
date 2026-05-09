from .client import (
    ShelMem, ShelMemError, ValidationError, StorageError, MetadataError, PermissionError,
)
from .types import (
    WriteResult, MemoryRecord, VerifyResult, SearchResult, MemoryType,
    TreasuryMemoryType, RecordTransactionParams, RecordBalanceParams,
    Pool, PoolMember, PoolRole, CreatePoolParams, WriteToPoolParams, RecallFromPoolParams,
    SearchPoolParams, PoolAuditEntry, AuditAction, AgentClaim,
)
from .embeddings import openai_embeddings, EmbeddingProvider
from .agent_identity import sign_agent_claim, verify_agent_claim, AgentClaimError

__all__ = [
    "ShelMem",
    "ShelMemError",
    "ValidationError",
    "StorageError",
    "MetadataError",
    "PermissionError",
    "WriteResult",
    "MemoryRecord",
    "VerifyResult",
    "SearchResult",
    "MemoryType",
    "TreasuryMemoryType",
    "RecordTransactionParams",
    "RecordBalanceParams",
    "Pool",
    "PoolMember",
    "PoolRole",
    "CreatePoolParams",
    "WriteToPoolParams",
    "RecallFromPoolParams",
    "SearchPoolParams",
    "PoolAuditEntry",
    "AuditAction",
    "AgentClaim",
    "openai_embeddings",
    "EmbeddingProvider",
    "sign_agent_claim",
    "verify_agent_claim",
    "AgentClaimError",
]
