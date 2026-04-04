from __future__ import annotations

"""
Shelby storage adapter for Python.

Since there is no native Python Shelby SDK, this module uses the Shelby HTTP
gateway API for upload/download operations. In mock mode, it generates
deterministic addresses from content hashes.
"""

import hashlib
import os
import time
from dataclasses import dataclass

import httpx


@dataclass
class ShelbyUploadResult:
    shelby_address: str
    shelby_proof: str


class ShelbyStorage:
    def __init__(
        self,
        api_key: str | None = None,
        private_key: str | None = None,
        network: str = "testnet",
        mock: bool | None = None,
    ):
        self.api_key = api_key or os.environ.get("SHELBY_API_KEY")
        self.private_key = private_key or os.environ.get("SHELBY_ACCOUNT_PRIVATE_KEY")
        self.network = network or os.environ.get("SHELBY_NETWORK", "testnet")

        if mock is not None:
            self.mock = mock
        else:
            self.mock = os.environ.get("SHELBY_MOCK", "true").lower() != "false"

        # Gateway base URL varies by network
        if self.network == "testnet":
            self.base_url = "https://testnet.shelby.dev"
        else:
            self.base_url = "https://shelbynet.shelby.dev"

    async def upload(self, data: bytes, blob_name: str) -> ShelbyUploadResult:
        if self.mock:
            content_hash = hashlib.sha256(data).hexdigest()
            shelby_address = f"shelby://{content_hash}"
            proof_hash = hashlib.sha256(
                (shelby_address + str(int(time.time() * 1000))).encode()
            ).hexdigest()
            return ShelbyUploadResult(
                shelby_address=shelby_address,
                shelby_proof=f"0x{proof_hash}",
            )

        if not self.private_key:
            raise ValueError("private_key is required when mock=False")

        async with httpx.AsyncClient() as client:
            headers = {}
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            headers["X-Private-Key"] = self.private_key

            response = await client.put(
                f"{self.base_url}/v1/blobs/{blob_name}",
                content=data,
                headers=headers,
                timeout=60.0,
            )
            response.raise_for_status()

            result = response.json()
            shelby_address = result.get("address", f"shelby://{result.get('account')}/{blob_name}")
            shelby_proof = result.get("proof", shelby_address)

            return ShelbyUploadResult(
                shelby_address=shelby_address,
                shelby_proof=shelby_proof,
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
            return response.content


def _parse_shelby_address(address: str) -> tuple[str, str]:
    stripped = address.replace("shelby://", "")
    slash_idx = stripped.index("/")
    return stripped[:slash_idx], stripped[slash_idx + 1 :]
