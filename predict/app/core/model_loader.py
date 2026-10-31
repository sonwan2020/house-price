"""Load the trained model and its metrics at service startup."""

import json
import logging
from pathlib import Path
from typing import Any

import joblib
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)


def final_estimator(model: Any) -> Any:
    """Return the estimator that actually predicts.

    Artifacts are saved as a Pipeline (scaler + model); pre-pipeline
    artifacts are plain estimators. Both are supported.
    """
    return model.named_steps["model"] if isinstance(model, Pipeline) else model


def load_model(path: Path) -> Any:
    """Load the sklearn model from a joblib file (fails fast if missing)."""
    logger.info("Loading model from %s", path)
    if not path.exists():
        raise FileNotFoundError(f"Model file not found: {path}")
    model = joblib.load(path)
    logger.info(
        "Loaded %s with %d coefficients",
        type(final_estimator(model)).__name__,
        len(final_estimator(model).coef_),
    )
    return model


def load_metrics(path: Path) -> dict[str, Any] | None:
    """Load training metrics JSON; returns None when the file is missing."""
    if not path.exists():
        logger.warning("Metrics file not found: %s", path)
        return None
    with path.open(encoding="utf-8") as f:
        return json.load(f)
