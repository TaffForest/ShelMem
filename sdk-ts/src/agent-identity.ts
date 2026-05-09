/**
 * Cryptographic agent identity (opt-in).
 *
 * In v1 of shared pools, `agent_id` is a trusted string — anyone with the
 * Supabase key can claim to be `trading-agent`. This module gives agents a
 * way to prove they own a private key tied to that identity, using Aptos
 * Ed25519 signatures (the same key the rest of the SDK already uses).
 *
 * Flow:
 *   1. Agent calls `signAgentClaim(agentId, privateKey)` to produce a claim:
 *        { agentId, timestamp, publicKey, signature }
 *   2. Backend / verifier calls `verifyAgentClaim(claim, expectedAgentId,
 *      expectedPublicKey)`. Returns true only if:
 *        - signature is a valid Ed25519 signature of `agentId|timestamp`
 *        - publicKey matches expectedPublicKey
 *        - agentId matches expectedAgentId
 *        - timestamp is within `maxAgeSeconds` of now (default 300s)
 *
 * Pair this with a registry that maps agent_id → expected public key.
 * Wiring this into RLS or every pool method is a follow-up; this module
 * ships the primitive so callers can opt in.
 */

import { Ed25519PrivateKey, Ed25519PublicKey, Ed25519Signature } from '@aptos-labs/ts-sdk';
import type { AgentClaim } from './types.js';

export class AgentClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentClaimError';
  }
}

function claimMessage(agentId: string, timestamp: number): Uint8Array {
  return new TextEncoder().encode(`shelmem:agent-claim:v1\n${agentId}\n${timestamp}`);
}

/**
 * Sign an agent claim with the agent's Ed25519 private key.
 * `privateKey` is the same hex string format used elsewhere in the SDK
 * (e.g. SHELBY_ACCOUNT_PRIVATE_KEY).
 */
export function signAgentClaim(agentId: string, privateKey: string): AgentClaim {
  if (!agentId?.trim()) throw new AgentClaimError('agentId cannot be empty');

  const sk = new Ed25519PrivateKey(privateKey);
  const pk = sk.publicKey();
  const timestamp = Math.floor(Date.now() / 1000);
  const message = claimMessage(agentId, timestamp);
  const sig = sk.sign(message);

  return {
    agentId,
    timestamp,
    publicKey: pk.toString(),
    signature: sig.toString(),
  };
}

/**
 * Verify a claim was signed by the expected agent.
 * Throws AgentClaimError on any failure (caller can `try/catch`).
 */
export function verifyAgentClaim(
  claim: AgentClaim,
  expectedAgentId: string,
  expectedPublicKey: string,
  maxAgeSeconds: number = 300
): true {
  if (claim.agentId !== expectedAgentId) {
    throw new AgentClaimError(
      `agent_id mismatch: claim='${claim.agentId}' expected='${expectedAgentId}'`
    );
  }
  if (claim.publicKey.toLowerCase() !== expectedPublicKey.toLowerCase()) {
    throw new AgentClaimError('public key mismatch');
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - claim.timestamp;
  if (age < -30) {
    throw new AgentClaimError(`claim timestamp is in the future (skew=${-age}s)`);
  }
  if (age > maxAgeSeconds) {
    throw new AgentClaimError(`claim expired (age=${age}s > max=${maxAgeSeconds}s)`);
  }

  const pk = new Ed25519PublicKey(claim.publicKey);
  const sig = new Ed25519Signature(claim.signature);
  const message = claimMessage(claim.agentId, claim.timestamp);

  const ok = pk.verifySignature({ message, signature: sig });
  if (!ok) throw new AgentClaimError('invalid signature');

  return true;
}
