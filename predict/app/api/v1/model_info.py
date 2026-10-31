"""GET /api/v1/model-info — model coefficients and performance metrics."""

from typing import Any

from fastapi import APIRouter, Request
from sklearn.pipeline import Pipeline

from app.config import settings
from app.core.model_loader import final_estimator
from app.schemas.predict import FEATURE_ORDER

router = APIRouter(tags=["model"])


def _coefficients(model: Any) -> tuple[float, list[float]]:
    """Intercept and per-feature coefficients in original feature units.

    Pipeline artifacts carry a StandardScaler, so the fitted coefficients
    are divided back by the feature scales; plain estimators are returned
    as-is.
    """
    if isinstance(model, Pipeline):
        scaler = model.named_steps["scaler"]
        estimator = final_estimator(model)
        beta = estimator.coef_ / scaler.scale_
        intercept = float(estimator.intercept_ - (beta * scaler.mean_).sum())
        return intercept, [float(b) for b in beta]
    return float(model.intercept_), [float(c) for c in model.coef_]


@router.get("/model-info", summary="Model coefficients and performance metrics")
def model_info(request: Request) -> dict[str, Any]:
    """Return the loaded model's coefficients and training metrics."""
    model = request.app.state.model
    order = [str(n) for n in getattr(model, "feature_names_in_", FEATURE_ORDER)]
    intercept, coefficients = _coefficients(model)
    name = type(final_estimator(model)).__name__
    if request.app.state.metrics and request.app.state.metrics.get("positive"):
        name += " (positive)"
    return {
        "model": name,
        "model_version": settings.model_version,
        "target": "price",
        "feature_order": order,
        "coefficients": {
            "intercept": intercept,
            "features": {name: coef for name, coef in zip(order, coefficients)},
        },
        "metrics": request.app.state.metrics,
    }
