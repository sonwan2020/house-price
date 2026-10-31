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


def _rounded_cv(metrics: dict[str, Any] | None) -> dict[str, Any] | None:
    """Round the cross-validation metrics for display.

    r2 is rounded to 3 decimals (0.001), mae and rmse to 1 decimal (0.1).
    The artifacts keep full precision; only the API response is rounded.
    """
    if not metrics or not isinstance(metrics.get("cv"), dict):
        return metrics
    cv = metrics["cv"]
    rounded = dict(cv)
    for key, ndigits in (("r2", 3), ("mae", 1), ("rmse", 1)):
        if cv.get(key) is not None:
            rounded[key] = round(float(cv[key]), ndigits)
    return {**metrics, "cv": rounded}


@router.get("/model-info", summary="Model coefficients and performance metrics")
def model_info(request: Request) -> dict[str, Any]:
    """Return the loaded model's coefficients and training metrics.

    Coefficients are rounded to 0.1 for display; cv metrics are rounded
    per _rounded_cv (r2 to 0.001, mae/rmse to 0.1).
    """
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
            "intercept": round(intercept, 1),
            "features": {name: round(coef, 1) for name, coef in zip(order, coefficients)},
        },
        "metrics": _rounded_cv(request.app.state.metrics),
    }
