"""GET /api/health — liveness check (version-independent)."""

from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/health", summary="Health check")
def health() -> dict[str, str]:
    """Simple health check: returns 200 OK when the service is up."""
    return {"status": "ok"}
