"""Error codes for per-item prediction failures."""

from enum import Enum


class ErrorCode(str, Enum):
    """Machine-readable codes embedded in ``HousePrice.reason``."""

    NOT_OBJECT = "NOT_OBJECT"
    MISSING_FIELD = "MISSING_FIELD"
    INVALID_TYPE = "INVALID_TYPE"
    NOT_INTEGER = "NOT_INTEGER"
    INVALID_ID = "INVALID_ID"
    OUT_OF_RANGE = "OUT_OF_RANGE"


def reason(code: ErrorCode, detail: str) -> str:
    """Format a per-item failure reason, e.g. ``[MISSING_FIELD] 'lot_size' is required``."""
    return f"[{code.value}] {detail}"
