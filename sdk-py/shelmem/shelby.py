from __future__ import annotations

"""
Shelby storage adapter for Python with optional AES-256-GCM encryption.
"""

import hashlib
import hmac
import os
import time
import uuid
from dataclasses import dataclass
from typing import Dict, Optional

import httpx

VALID_NETWORKS = ("testnet", "shelbynet")
NETWORK_URLS = {
    "testnet": "https://api.testnet.shelby.xyz/shelby",
    "shelbynet": "https://api.shelbynet.shelby.xyz/shelby",
}


@dataclass
class ShelbyUploadResult:
    shelby_address: str
    shelby_proof: str
    content_hash: str


def compute_hash(data: bytes) -> str:
    """Compute SHA-256 hash of data, returned as hex string."""
    return hashlib.sha256(data).hexdigest()


def _derive_encryption_key(private_key: str) -> bytes:
    return hmac.new(b"ShelMem-v1", private_key.encode(), "sha256").digest()


def _encrypt_data(plaintext: bytes, key: bytes) -> bytes:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    iv = os.urandom(12)
    cipher = AESGCM(key)
    ciphertext_with_tag = cipher.encrypt(iv, plaintext, None)
    auth_tag = ciphertext_with_tag[-16:]
    ciphertext = ciphertext_with_tag[:-16]
    return iv + auth_tag + ciphertext


def _decrypt_data(encrypted: bytes, key: bytes) -> bytes:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    iv = encrypted[:12]
    auth_tag = encrypted[12:28]
    ciphertext = encrypted[28:]
    cipher = AESGCM(key)
    return cipher.decrypt(iv, ciphertext + auth_tag, None)


class ShelbyStorage:
    def __init__(
        self,
        api_key: Optional[str] = None,
        private_key: Optional[str] = None,
        network: Optional[str] = None,
        mock: Optional[bool] = None,
        encrypt: bool = False,
    ):
        self.api_key = api_key or os.environ.get("SHELBY_API_KEY") or None
        self.private_key = private_key or os.environ.get("SHELBY_ACCOUNT_PRIVATE_KEY") or None
        self.encrypt = encrypt
        self._encryption_key: Optional[bytes] = None
        self._http_client: Optional[httpx.AsyncClient] = None

        # BUG-1 fix: default to None so env var is actually read
        resolved_network = network or os.environ.get("SHELBY_NETWORK", "testnet")

        # BUG-6 fix: validate network name
        if resolved_network not in VALID_NETWORKS:
            raise ValueError(
                f"Invalid network '{resolved_network}'. Must be one of: {', '.join(VALID_NETWORKS)}"
            )
        self.network = resolved_network
        self.base_url = NETWORK_URLS[self.network]

        # Mock mode — off by default, must be explicitly enabled
        if mock is not None:
            self.mock = mock
        else:
            self.mock = os.environ.get("SHELBY_MOCK", "false").lower() == "true"

        if self.mock:
            import warnings
            warnings.warn("ShelMem: running in mock mode — data will not persist")

        # Local content store for mock mode
        self._mock_store: Dict[str, bytes] = {}

    def _get_encryption_key(self) -> bytes:
        if not self._encryption_key:
            if not self.private_key:
                raise ValueError("private_key is required for encryption")
            self._encryption_key = _derive_encryption_key(self.private_key)
        return self._encryption_key

    async def _get_client(self) -> httpx.AsyncClient:
        """Reuse httpx client across requests."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=60.0)
        return self._http_client

    async def upload(self, data: bytes, blob_name: str) -> ShelbyUploadResult:
        """Upload data to Shelby. Hash is computed on plaintext before encryption."""
        content_hash = compute_hash(data)

        if self.mock:
            shelby_address = f"shelby://mock/{blob_name}"
            proof_hash = hashlib.sha256(
                (shelby_address + str(int(time.time() * 1000))).encode()
            ).hexdigest()
            # BUG-2 fix: store content locally for mock download
            self._mock_store[shelby_address] = data
            return ShelbyUploadResult(
                shelby_address=shelby_address,
                shelby_proof=f"0x{proof_hash}",
                content_hash=content_hash,
            )

        if not self.private_key:
            raise ValueError("private_key is required when mock=False")

        upload_data = data
        if self.encrypt:
            upload_data = _encrypt_data(data, self._get_encryption_key())

        # BUG-4 fix: don't send raw private key as HTTP header
        # Use API key for auth. Private key is for local signing only.
        client = await self._get_client()
        headers: Dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = await client.put(
            f"{self.base_url}/v1/blobs/{blob_name}",
            content=upload_data,
            headers=headers,
        )
        response.raise_for_status()

        result = response.json()
        shelby_address = result.get(
            "address", f"shelby://{result.get('account')}/{blob_name}"
        )
        shelby_proof = result.get("proof", shelby_address)

        return ShelbyUploadResult(
            shelby_address=shelby_address,
            shelby_proof=shelby_proof,
            content_hash=content_hash,
        )

    async def download(self, shelby_address: str, retries: int = 1) -> bytes:
        """Download data from Shelby. In mock mode, returns locally stored content."""
        # BUG-2 fix: mock mode returns stored content
        if self.mock:
            content = self._mock_store.get(shelby_address)
            if content is None:
                raise KeyError(f"Memory not found in mock store: {shelby_address}")
            return content

        account_address, blob_name = _parse_shelby_address(shelby_address)
        result = await self._download_once(account_address, blob_name)

        if len(result) == 0 and retries > 0:
            import asyncio
            await asyncio.sleep(2)
            result = await self._download_once(account_address, blob_name)

        if self.encrypt:
            result = _decrypt_data(result, self._get_encryption_key())

        return result

    async def _download_once(self, account_address: str, blob_name: str) -> bytes:
        client = await self._get_client()
        headers: Dict[str, str] = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        response = await client.get(
            f"{self.base_url}/v1/blobs/{account_address}/{blob_name}",
            headers=headers,
        )
        response.raise_for_status()
        return response.content

    async def try_delete(self, shelby_address: str) -> None:
        """Best-effort Shelby blob deletion. Logs warning on failure."""
        if self.mock:
            self._mock_store.pop(shelby_address, None)
            return

        try:
            account_address, blob_name = _parse_shelby_address(shelby_address)
            client = await self._get_client()
            headers: Dict[str, str] = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"

            await client.delete(
                f"{self.base_url}/v1/blobs/{account_address}/{blob_name}",
                headers=headers,
            )
        except Exception:
            import warnings
            warnings.warn(
                f"ShelMem: Shelby blob deletion not supported or failed for {shelby_address}. "
                "Content will expire naturally."
            )


def _parse_shelby_address(address: str) -> tuple[str, str]:
    """Parse shelby://account/blobname into (account, blobname)."""
    if not address.startswith("shelby://"):
        raise ValueError(f"Invalid shelby address: must start with 'shelby://' — got '{address}'")

    stripped = address[len("shelby://"):]

    # BUG-3 fix: handle mock addresses (shelby://mock/blobname) and real addresses
    slash_idx = stripped.find("/")
    if slash_idx == -1:
        raise ValueError(
            f"Invalid shelby address format: '{address}'. Expected 'shelby://account/blobname'"
        )

    return stripped[:slash_idx], stripped[slash_idx + 1:]


def generate_blob_name(agent_id: str) -> str:
    """Generate a unique blob name with UUID suffix to prevent collisions."""
    ts = int(time.time() * 1000)
    suffix = uuid.uuid4().hex[:8]
    return f"{agent_id}_{ts}_{suffix}"
