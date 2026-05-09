"""Cryptographic agent identity (opt-in).

Mirrors the TypeScript agent-identity module. Provides Ed25519
sign/verify primitives so callers can prove ownership of an
agent_id without a Supabase service-role key.

Usage:
    claim = sign_agent_claim("trading-agent", "0x...")
    verify_agent_claim(claim, "trading-agent", claim.public_key)
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey, Ed25519PublicKey,
)
from cryptography.exceptions import InvalidSignature

from .types import AgentClaim


class AgentClaimError(Exception):
    """Raised when claim signing or verification fails."""
    pass


def _strip_hex(hex_str: str) -> bytes:
    s = hex_str[2:] if hex_str.startswith("0x") or hex_str.startswith("0X") else hex_str
    return bytes.fromhex(s)


def _claim_message(agent_id: str, timestamp: int) -> bytes:
    return f"shelmem:agent-claim:v1\n{agent_id}\n{timestamp}".encode("utf-8")


def sign_agent_claim(agent_id: str, private_key: str) -> AgentClaim:
    """Sign an agent claim with the agent's Ed25519 private key.

    `private_key` is the raw 32-byte hex (with or without `0x` prefix).
    """
    if not agent_id or not agent_id.strip():
        raise AgentClaimError("agent_id cannot be empty")

    raw = _strip_hex(private_key)
    if len(raw) != 32:
        raise AgentClaimError(f"private_key must be 32 bytes, got {len(raw)}")

    sk = Ed25519PrivateKey.from_private_bytes(raw)
    pk = sk.public_key()
    pk_bytes = pk.public_bytes_raw()

    timestamp = int(time.time())
    message = _claim_message(agent_id, timestamp)
    signature = sk.sign(message)

    return AgentClaim(
        agent_id=agent_id,
        timestamp=timestamp,
        public_key="0x" + pk_bytes.hex(),
        signature="0x" + signature.hex(),
    )


def verify_agent_claim(
    claim: AgentClaim,
    expected_agent_id: str,
    expected_public_key: str,
    max_age_seconds: int = 300,
) -> bool:
    """Verify a claim was signed by the expected agent.

    Raises AgentClaimError on any mismatch. Returns True on success.
    """
    if claim.agent_id != expected_agent_id:
        raise AgentClaimError(
            f"agent_id mismatch: claim='{claim.agent_id}' expected='{expected_agent_id}'"
        )
    if claim.public_key.lower() != expected_public_key.lower():
        raise AgentClaimError("public key mismatch")

    now = int(time.time())
    age = now - claim.timestamp
    if age < -30:
        raise AgentClaimError(f"claim timestamp is in the future (skew={-age}s)")
    if age > max_age_seconds:
        raise AgentClaimError(f"claim expired (age={age}s > max={max_age_seconds}s)")

    try:
        pk = Ed25519PublicKey.from_public_bytes(_strip_hex(claim.public_key))
        pk.verify(_strip_hex(claim.signature), _claim_message(claim.agent_id, claim.timestamp))
    except InvalidSignature:
        raise AgentClaimError("invalid signature")
    except Exception as e:
        raise AgentClaimError(f"verification failed: {e}") from e

    return True
