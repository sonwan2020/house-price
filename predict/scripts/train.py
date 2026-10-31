#!/usr/bin/env python3
"""Train the house-price regression model and save its artifacts.

The regression model is configurable via ``--model
linear|linear_positive|ridge|lasso`` (or the ``MODEL_TYPE`` environment
variable): plain OLS, non-negative OLS, Ridge, or Lasso. Features can be
excluded with ``--drop-features`` (comma-separated, or the
``DROP_FEATURES`` environment variable) to cut collinear columns.

Regularized models are wrapped in a StandardScaler pipeline so the penalty
applies evenly across features of different scales; their penalty strength
(alpha) is chosen with the one-standard-error rule over a coarse grid —
the strongest regularization whose CV RMSE is still within one standard
error of the best, which avoids the noisy, under-regularized CV minimum
on small datasets. Coefficients are reported — and served by
GET /api/v1/model-info — in the original feature units (the scaler is
undone).
"""

import argparse
import json
import os
from pathlib import Path

import joblib
import pandas as pd
from sklearn.base import clone
from sklearn.linear_model import Lasso, LinearRegression, Ridge
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "app" / "models"
TRAIN_PATH = DATA_DIR / "House Price Dataset.csv"
MODEL_PATH = MODELS_DIR / "house_price_model.joblib"
METRICS_PATH = MODELS_DIR / "model_metrics.json"
TARGET = "price"

MODEL_TYPES = ("linear", "linear_positive", "ridge", "lasso")
DEFAULT_MODEL_TYPE = "ridge"

#: Candidate penalty strengths searched for the regularized models.
ALPHAS = {
    "ridge": [0.01, 0.1, 1.0, 10.0, 100.0],
    "lasso": [0.001, 0.01, 0.1, 1.0],
}

CV_FOLDS = KFold(n_splits=5, shuffle=True, random_state=42)


def load_training_data(csv_path: Path) -> pd.DataFrame:
    """Read the training data and ensure it contains the target column."""
    data = pd.read_csv(csv_path)
    if TARGET not in data.columns:
        raise ValueError(f"Training CSV must contain a '{TARGET}' column: {csv_path}")
    return data


def print_data_summary(data: pd.DataFrame) -> None:
    """Print basic summaries useful when checking a training dataset."""
    print("Training data shape:", data.shape)
    print(data.dtypes)
    print(data.describe().T)
    print("NaNs in train:", data.isna().sum().sum())
    print(f"{TARGET.capitalize()} skewness:", data[TARGET].skew())
    print(data.corr(numeric_only=True)[TARGET].sort_values(ascending=False))


def get_features_and_target(
    data: pd.DataFrame, drop_features: set[str] | None = None
) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """Separate model inputs and target, excluding an optional row ID and
    any explicitly dropped columns (e.g. collinear features)."""
    features = [column for column in data.columns if column.lower() not in {TARGET, "id"}]
    dropped = drop_features or set()
    unknown = dropped - set(features)
    if unknown:
        raise ValueError(f"Cannot drop unknown features: {sorted(unknown)}")
    features = [column for column in features if column not in dropped]
    if not features:
        raise ValueError("Training CSV must contain at least one feature column.")
    return data[features], data[TARGET], features


def build_model(model_type: str) -> Pipeline:
    """Return an untrained pipeline for the requested model type.

    Every model sits behind a StandardScaler: a no-op for plain linear
    regression, but required for Ridge/Lasso, whose penalty would otherwise
    treat features of different scales unevenly.
    """
    if model_type == "linear":
        estimator = LinearRegression()
    elif model_type == "linear_positive":
        # Non-negative least squares: a domain prior that no feature may
        # lower the price, which also zeroes collinear redundant features.
        estimator = LinearRegression(positive=True)
    elif model_type == "ridge":
        estimator = Ridge()
    elif model_type == "lasso":
        estimator = Lasso(max_iter=10_000)
    else:
        raise ValueError(
            f"Unknown model type '{model_type}'. Valid values: {', '.join(MODEL_TYPES)}."
        )
    return Pipeline([("scaler", StandardScaler()), ("model", estimator)])


def select_alpha(
    model: Pipeline, model_type: str, features: pd.DataFrame, target: pd.Series
) -> tuple[Pipeline, float | None]:
    """Pick the penalty strength with the one-standard-error rule (regularized models).

    Each candidate alpha is scored by 5-fold CV RMSE; the chosen alpha is
    the largest whose mean RMSE is within one standard error of the best
    mean. With small, highly collinear datasets the CV minimum is noisy and
    under-regularizes (sign-flipped coefficients), so the rule prefers the
    strongest regularization that is statistically indistinguishable from
    the optimum. The winning configuration is then fitted on all rows, so
    the returned pipeline is ready to serve.
    """
    if model_type in ("linear", "linear_positive"):
        return model, None

    candidates: list[tuple[float, float, float]] = []
    for alpha in ALPHAS[model_type]:
        candidate = clone(model).set_params(**{"model__alpha": alpha})
        cv = cross_validate(
            candidate,
            features,
            target,
            cv=CV_FOLDS,
            scoring="neg_root_mean_squared_error",
        )
        scores = -cv["test_score"]
        candidates.append((alpha, float(scores.mean()), float(scores.std())))
        print(f"alpha={alpha:<6} CV RMSE {scores.mean():9.0f} ± {scores.std():7.0f}")

    best_mean = min(row[1] for row in candidates)
    best_std = next(row[2] for row in candidates if row[1] == best_mean)
    threshold = best_mean + best_std
    chosen = max((row for row in candidates if row[1] <= threshold), key=lambda row: row[0])
    print(
        f"One-standard-error rule: alpha={chosen[0]} "
        f"(RMSE {chosen[1]:.0f} <= {best_mean:.0f} + {best_std:.0f})"
    )
    model.set_params(**{"model__alpha": chosen[0]})
    model.fit(features, target)
    return model, chosen[0]


def evaluate_model(
    model: Pipeline, features: pd.DataFrame, target: pd.Series
) -> dict[str, float]:
    """Calculate cross-validation metrics on the training data.

    Note: for regularized models the same folds already selected the alpha,
    so these numbers are slightly optimistic (the usual demo trade-off).
    """
    cv = cross_validate(
        model,
        features,
        target,
        cv=CV_FOLDS,
        scoring={
            "r2": "r2",
            "rmse": "neg_root_mean_squared_error",
            "mae": "neg_mean_absolute_error",
        },
        return_train_score=True,
    )
    metrics = {
        "r2": float(cv["test_r2"].mean()),
        "rmse": float(-cv["test_rmse"].mean()),
        "mae": float(-cv["test_mae"].mean()),
        "r2_train": float(cv["train_r2"].mean()),
    }
    print("CV R2   (val):", metrics["r2"])
    print("CV RMSE (val):", metrics["rmse"])
    print("CV MAE  (val):", metrics["mae"])
    print("CV R2   (train):", metrics["r2_train"])
    return metrics


def unscaled_coefficients(model: Pipeline) -> tuple[float, pd.Series]:
    """Coefficients in the original feature units (undo the scaler)."""
    scaler = model.named_steps["scaler"]
    estimator = model.named_steps["model"]
    beta = estimator.coef_ / scaler.scale_
    intercept = float(estimator.intercept_ - (beta * scaler.mean_).sum())
    return intercept, pd.Series(beta, index=model.feature_names_in_)


def save_artifacts(
    model: Pipeline,
    features: list[str],
    cv_metrics: dict[str, float],
    alpha: float | None,
    positive: bool,
    model_path: Path,
    metrics_path: Path,
) -> None:
    """Save the fitted pipeline and metrics JSON for the API."""
    model_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)

    metrics = {
        "model_type": type(model.named_steps["model"]).__name__,
        "positive": positive,
        "alpha": alpha,
        "target": TARGET,
        "features": features,
        "cv": cv_metrics,
    }
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(f"Model saved to {model_path}")
    print(f"Metrics saved to {metrics_path}")


def train_model(
    csv_path: Path,
    model_path: Path = MODEL_PATH,
    metrics_path: Path = METRICS_PATH,
    model_type: str = DEFAULT_MODEL_TYPE,
    drop_features: set[str] | None = None,
) -> None:
    """Train the configured model from a CSV, evaluate it, and save its artifacts."""
    data = load_training_data(csv_path)
    print_data_summary(data)
    features, target, feature_names = get_features_and_target(data, drop_features)
    print(f"Model type: {model_type}")
    if drop_features:
        print("Dropped features:", sorted(drop_features))

    model, alpha = select_alpha(build_model(model_type), model_type, features, target)
    if alpha is None:
        model.fit(features, target)  # unregularized models: fit once on all rows
    cv_metrics = evaluate_model(model, features, target)

    intercept, coefficients = unscaled_coefficients(model)
    coefficients = coefficients.sort_values(key=abs, ascending=False)
    print("intercept:", intercept)
    print(coefficients)
    print("Penalty strength (alpha):", alpha)
    save_artifacts(
        model,
        feature_names,
        cv_metrics,
        alpha,
        positive=model_type == "linear_positive",
        model_path=model_path,
        metrics_path=metrics_path,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--model",
        choices=MODEL_TYPES,
        default=os.environ.get("MODEL_TYPE", DEFAULT_MODEL_TYPE),
        help=(
            "regression model to train (default: "
            f"{os.environ.get('MODEL_TYPE', DEFAULT_MODEL_TYPE)})"
        ),
    )
    parser.add_argument(
        "--drop-features",
        default=os.environ.get("DROP_FEATURES", ""),
        help=(
            "comma-separated features to exclude from training "
            f"(default: '{os.environ.get('DROP_FEATURES', '')}')"
        ),
    )
    parser.add_argument(
        "--train-csv",
        type=Path,
        default=TRAIN_PATH,
        help=f"training CSV path (default: {TRAIN_PATH})",
    )
    parser.add_argument(
        "--model-file",
        type=Path,
        default=MODEL_PATH,
        help=f"output model path (default: {MODEL_PATH})",
    )
    parser.add_argument(
        "--metrics-file",
        type=Path,
        default=METRICS_PATH,
        help=f"output metrics JSON path (default: {METRICS_PATH})",
    )
    args = parser.parse_args()
    # argparse does not validate defaults (e.g. MODEL_TYPE=svr from the
    # environment), so check explicitly.
    if args.model not in MODEL_TYPES:
        parser.error(
            f"invalid model type '{args.model}' (valid: {', '.join(MODEL_TYPES)})"
        )
    drop_features = {name.strip() for name in args.drop_features.split(",") if name.strip()}
    train_model(
        args.train_csv, args.model_file, args.metrics_file, args.model, drop_features
    )


if __name__ == "__main__":
    main()
