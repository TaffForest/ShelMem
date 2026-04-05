import hashlib
import pytest
from shelmem.shelby import ShelbyStorage, compute_hash, ShelbyUploadResult


def test_compute_hash_deterministic():
    data = b"hello world"
    assert compute_hash(data) == compute_hash(data)
    assert len(compute_hash(data)) == 64


def test_compute_hash_known_value():
    assert compute_hash(b"test") == "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"


def test_compute_hash_different_input():
    assert compute_hash(b"alpha") != compute_hash(b"beta")


def test_compute_hash_empty():
    assert compute_hash(b"") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


@pytest.mark.asyncio
async def test_mock_upload_returns_all_fields():
    storage = ShelbyStorage(mock=True)
    result = await storage.upload(b"test memory", "test_blob")

    assert isinstance(result, ShelbyUploadResult)
    assert result.shelby_address.startswith("shelby://")
    assert result.shelby_proof.startswith("0x")
    assert len(result.content_hash) == 64


@pytest.mark.asyncio
async def test_mock_upload_hash_matches():
    storage = ShelbyStorage(mock=True)
    data = b"verify this content"
    result = await storage.upload(data, "verify_blob")

    expected = compute_hash(data)
    assert result.content_hash == expected


@pytest.mark.asyncio
async def test_mock_upload_different_content():
    storage = ShelbyStorage(mock=True)
    a = await storage.upload(b"alpha", "a")
    b = await storage.upload(b"beta", "b")

    assert a.shelby_address != b.shelby_address
    assert a.content_hash != b.content_hash


@pytest.mark.asyncio
async def test_mock_download_unknown_address_raises():
    storage = ShelbyStorage(mock=True)
    with pytest.raises(KeyError, match="not found in mock store"):
        await storage.download("shelby://mock/nonexistent")


@pytest.mark.asyncio
async def test_mock_upload_then_download():
    storage = ShelbyStorage(mock=True)
    data = b"test memory content for round trip"
    result = await storage.upload(data, "test_blob")
    downloaded = await storage.download(result.shelby_address)
    assert downloaded == data
