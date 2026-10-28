#!/usr/bin/env python3
"""Train the linear-regression house-price model and save its artifacts."""

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import KFold, cross_validate

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "app" / "models"
TRAIN_PATH = DATA_DIR / "House Price Dataset.csv"
MODEL_PATH = MODELS_DIR / "house_price_model.joblib"
METRICS_PATH = MODELS_DIR / "model_metrics.json"
TARGET = "price"


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
    data: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series, list[str]]:
    """Separate model inputs and target, excluding an optional row ID."""
    features = [column for column in data.columns if column.lower() not in {TARGET, "id"}]
    if not features:
        raise ValueError("Training CSV must contain at least one feature column.")
    return data[features], data[TARGET], features


def evaluate_model(
    model: LinearRegression, features: pd.DataFrame, target: pd.Series
) -> dict[str, float]:
    """Calculate cross-validation metrics on the training data."""
    folds = KFold(n_splits=5, shuffle=True, random_state=42)
    cv = cross_validate(
        model,
        features,
        target,
        cv=folds,
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


def save_artifacts(
    model: LinearRegression,
    features: list[str],
    cv_metrics: dict[str, float],
    model_path: Path,
    metrics_path: Path,
) -> None:
    """Save the fitted model and metrics JSON for the API."""
    model_path.parent.mkdir(parents=True, exist_ok=True)
    metrics_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)

    metrics = {
        "model_type": type(model).__name__,
        "target": TARGET,
        "features": features,
        "cv": cv_metrics,
    }
    metrics_path.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(f"Model saved to {model_path}")
    print(f"Metrics saved to {metrics_path}")


def train_model(
    csv_path: Path, model_path: Path = MODEL_PATH, metrics_path: Path = METRICS_PATH
) -> None:
    """Train the model from a CSV, evaluate it, and save its artifacts."""
    data = load_training_data(csv_path)
    print_data_summary(data)
    features, target, feature_names = get_features_and_target(data)

    model = LinearRegression()
    cv_metrics = evaluate_model(model, features, target)
    model.fit(features, target)

    coefficients = pd.Series(model.coef_, index=feature_names).sort_values(
        key=abs, ascending=False
    )
    print("intercept:", model.intercept_)
    print(coefficients)
    save_artifacts(model, feature_names, cv_metrics, model_path, metrics_path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
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
    train_model(args.train_csv, args.model_file, args.metrics_file)


if __name__ == "__main__":
    main()
