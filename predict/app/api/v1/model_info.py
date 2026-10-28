"""GET /api/v1/model-info — model coefficients and performance metrics."""

from typing import Any

from fastapi import APIRouter, Request

from app.config import settings
from app.schemas.predict import FEATURE_ORDER

router = APIRouter(tags=["model"])


@router.get("/model-info", summary="Model coefficients and performance metrics")
def model_info(request: Request) -> dict[str, Any]:
    """Return the loaded model's coefficients and training metrics."""
    model = request.app.state.model
    order = [str(n) for n in getattr(model, "feature_names_in_", FEATURE_ORDER)]
    return {
        "model": type(model).__name__,
        "model_version": settings.model_version,
        "target": "price",
        "feature_order": order,
        "coefficients": {
            "intercept": float(model.intercept_),
            "features": {name: float(coef) for name, coef in zip(order, model.coef_)},
        },
        "metrics": request.app.state.metrics,
    }
