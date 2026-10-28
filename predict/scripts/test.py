#!/usr/bin/env python3
"""Load a trained house-price model and print predictions for a CSV."""

import argparse
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
MODELS_DIR = ROOT / "app" / "models"
TEST_PATH = DATA_DIR / "Test Data For Prediction.csv"
MODEL_PATH = MODELS_DIR / "house_price_model.joblib"
TARGET = "price"


def load_model(model_path: Path) -> Any:
    """Load a previously trained model."""
    return joblib.load(model_path)


def predict_csv(model: Any, csv_path: Path) -> pd.DataFrame:
    """Predict prices for a CSV and return its rows with predictions."""
    data = pd.read_csv(csv_path)
    model_features = getattr(model, "feature_names_in_", None)
    if model_features is None:
        features = [column for column in data.columns if column.lower() not in {TARGET, "id"}]
    else:
        features = [str(column) for column in model_features]

    missing_features = [column for column in features if column not in data.columns]
    if missing_features:
        raise ValueError(f"Test CSV is missing model features: {', '.join(missing_features)}")

    result = data.drop(columns=[TARGET], errors="ignore").copy()
    result["predicted_price"] = model.predict(data[features])
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--test-csv",
        type=Path,
        default=TEST_PATH,
        help=f"test CSV path (default: {TEST_PATH})",
    )
    parser.add_argument(
        "--model-file",
        type=Path,
        default=MODEL_PATH,
        help=f"trained model path (default: {MODEL_PATH})",
    )
    args = parser.parse_args()

    model = load_model(args.model_file)
    predictions = predict_csv(model, args.test_csv)
    print(predictions.to_string(index=False))


if __name__ == "__main__":
    main()
