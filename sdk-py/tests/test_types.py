from shelmem.types import WriteResult, MemoryRecord, VerifyResult


def test_write_result_fields():
    r = WriteResult(
        shelby_object_id="shelby://abc",
        aptos_tx_hash="0xdef",
        content_hash="aabb",
        memory_type="decision",
        timestamp="2026-01-01T00:00:00Z",
    )
    assert r.shelby_object_id == "shelby://abc"
    assert r.memory_type == "decision"
    assert r.content_hash == "aabb"


def test_memory_record_verified():
    r = MemoryRecord(
        memory="test",
        context="ctx",
        timestamp="",
        aptos_tx_hash="",
        content_hash="hash",
        memory_type="fact",
        verified=True,
    )
    assert r.verified is True


def test_memory_record_unverified():
    r = MemoryRecord(
        memory="test",
        context="ctx",
        timestamp="",
        aptos_tx_hash="",
        content_hash="",
        memory_type="observation",
        verified=None,
    )
    assert r.verified is None


def test_verify_result_match():
    r = VerifyResult(verified=True, content_hash="abc", expected_hash="abc")
    assert r.verified is True
    assert r.content_hash == r.expected_hash


def test_verify_result_mismatch():
    r = VerifyResult(verified=False, content_hash="abc", expected_hash="xyz")
    assert r.verified is False
    assert r.content_hash != r.expected_hash


def test_tamper_detection_logic():
    """Simulates the core tamper detection: hash at write vs hash at recall."""
    import hashlib

    original = b"original memory content"
    stored_hash = hashlib.sha256(original).hexdigest()

    # Same content — verified
    downloaded = b"original memory content"
    assert hashlib.sha256(downloaded).hexdigest() == stored_hash

    # Tampered content — fails
    tampered = b"tampered memory content"
    assert hashlib.sha256(tampered).hexdigest() != stored_hash
