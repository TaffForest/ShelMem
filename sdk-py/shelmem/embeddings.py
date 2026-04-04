"""
Embedding providers for ShelMem semantic search.

The SDK is provider-agnostic — pass any callable that takes text
and returns a list of floats. OpenAI is provided as a convenience.
"""

from __future__ import annotations

from typing import Callable, Awaitable, List

EmbeddingProvider = Callable[[str], Awaitable[List[float]]]


def openai_embeddings(api_key: str) -> EmbeddingProvider:
    """Create an OpenAI embedding provider using text-embedding-3-small (1536 dims).

    Usage:
        embed = openai_embeddings(os.environ["OPENAI_API_KEY"])
        vector = await embed("some text")
    """

    async def embed(text: str) -> List[float]:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "text-embedding-3-small",
                    "input": text,
                },
                timeout=30.0,
            )
            response.raise_for_status()
            data = response.json()
            return data["data"][0]["embedding"]

    return embed
