from __future__ import annotations

"""
Shelby storage adapter for Python with optional AES-256-GCM encryption.
"""

import hashlib
import hmac
import os
import time
from dataclasses import dataclass

import httpx


@dataclass
class ShelbyUploadResult:
    shelby_address: str
    shelby_proof: str
    content_hash: str


def compute_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _derive_encryption_key(private_key: str) -> bytes:
    return hmac.new(b"ShelMem-v1", private_key.encode(), "sha256").digest()


def _encrypt_data(plaintext: bytes, key: bytes) -> bytes:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    iv = os.urandom(12)
    cipher = AESGCM(key)
    ciphertext_with_tag = cipher.encrypt(iv, plaintext, None)
    # Format: [IV 12B] [AuthTag 16B] [Ciphertext]
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
        api_key: str | None = None,
        private_key: str | None = None,
        network: str = "testnet",
        mock: bool | None = None,
        encrypt: bool = False,
    ):
        self.api_key = api_key or os.environ.get("SHELBY_API_KEY")
        self.private_key = private_key or os.environ.get("SHELBY_ACCOUNT_PRIVATE_KEY")
        self.network = network or os.environ.get("SHELBY_NETWORK", "testnet")
        self.encrypt = encrypt
        self._encryption_key: bytes | None = None

        if mock is not None:
            self.mock = mock
        else:
            self.mock = os.environ.get("SHELBY_MOCK", "true").lower() != "false"

        if self.network == "testnet":
            self.base_url = "https://testnet.shelby.dev"
        else:
            self.base_url = "https://shelbynet.shelby.dev"

    def _get_encryption_key(self) -> bytes:
        if not self._encryption_key:
            if not self.private_key:
                raise ValueError("private_key is required for encryption")
            self._encryption_key = _derive_encryption_key(self.private_key)
        return self._encryption_key

    async def upload(self, data: bytes, blob_name: str) -> ShelbyUploadResult:
        # Hash plaintext BEFORE encryption
        content_hash = compute_hash(data)

        if self.mock:
            shelby_address = f"shelby://{content_hash}"
            proof_hash = hashlib.sha256(
                (shelby_address + str(int(time.time() * 1000))).encode()
            ).hexdigest()
            return ShelbyUploadResult(
                shelby_address=shelby_address,
                shelby_proof=f"0x{proof_hash}",
                content_hash=content_hash,
            )

        if not self.private_key:
            raise ValueError("private_key is required when mock=False")

        # Encrypt if enabled
        upload_data = data
        if self.encrypt:
            upload_data = _encrypt_data(data, self._get_encryption_key())

        async with httpx.AsyncClient() as client:
            headers = {}
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            headers["X-Private-Key"] = self.private_key

            response = await client.put(
                f"{self.base_url}/v1/blobs/{blob_name}",
                content=upload_data,
                headers=headers,
                timeout=60.0,
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

    async def download(self, shelby_address: str) -> bytes:
        if self.mock:
            raise RuntimeError("Download not available in mock mode")

        account_address, blob_name = _parse_shelby_address(shelby_address)

        async with httpx.AsyncClient() as client:
            headers = {}
            if self.api_key:
                headers["X-API-Key"] = self.api_key

            response = await client.get(
                f"{self.base_url}/v1/blobs/{account_address}/{blob_name}",
                headers=headers,
                timeout=60.0,
            )
            response.raise_for_status()
            result = response.content

        # Decrypt if enabled
        if self.encrypt:
            result = _decrypt_data(result, self._get_encryption_key())

        return result


def _parse_shelby_address(address: str) -> tuple[str, str]:
    stripped = address.replace("shelby://", "")
    slash_idx = stripped.index("/")
    return stripped[:slash_idx], stripped[slash_idx + 1:]
