"""
Mock payment charge service.
NOT real tokenisation — PSP required in production.
Server never receives, logs, or persists card_number, cvv, or exp — only opaque tokens.
"""
import re
import uuid


def mock_payment_charge(token: str, amount_cents: int) -> dict:
    """
    Mock payment charge using an opaque token.

    Args:
        token: Token in format ^tok_[a-f0-9]{24}$
        amount_cents: Amount in cents

    Returns:
        dict with charge_id and status

    Raises:
        ValueError: If token format is invalid
    """
    if not re.match(r"^tok_[a-f0-9]{24}$", token):
        raise ValueError("Invalid token format")

    # Deterministic failure path for testing
    if token.startswith("tok_fail"):
        return {"charge_id": None, "status": "failed"}

    charge_id = "ch_" + uuid.uuid4().hex[:16]
    return {"charge_id": charge_id, "status": "succeeded"}
