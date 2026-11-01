#!/usr/bin/env python3
"""Train every supported model type on the same data and print comparison tables.

Fits linear (plain OLS), linear_positive (non-negative OLS), ridge and
lasso over the training CSV — honoring ``DROP_FEATURES`` / ``--drop-features``
— and prints two markdown tables suitable for predict/README.md
("Model selection"): coefficients in original feature units, and CV metrics.
"""

import argparse
import os
from pathlib import Path

import pandas as pd

from train import (
    DEFAULT_DROP_FEATURES,
    MODEL_TYPES,
    TRAIN_PATH,
    build_model,
    evaluate_model,
    get_features_and_target,
    load_training_data,
    select_alpha,
    unscaled_coefficients,
)


def fit_model(model_type: str, features: pd.DataFrame, target: pd.Series):
    """Fit a model type on all rows, returning it and its chosen alpha."""
    model = build_model(model_type)
    model, alpha = select_alpha(model, model_type, features, target)
    if alpha is None:
        model.fit(features, target)
    return model, alpha


def to_markdown(rows: list[str], columns: list[str], values: list[list[str]]) -> str:
    """Render a markdown table from header and pre-formatted cell strings."""
    header = "| " + " | ".join([""] + columns) + " |"
    separator = "|---" + "|---" * len(columns) + "|"
    body = [
        "| " + " | ".join([row] + cells) + " |"
        for row, cells in zip(rows, values)
    ]
    return "\n".join([header, separator, *body])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--drop-features",
        default=os.environ.get("DROP_FEATURES", DEFAULT_DROP_FEATURES),
        help=(
            "comma-separated features to exclude from training "
            f"(default: '{os.environ.get('DROP_FEATURES', DEFAULT_DROP_FEATURES)}')"
        ),
    )
    parser.add_argument(
        "--train-csv",
        type=Path,
        default=TRAIN_PATH,
        help=f"training CSV path (default: {TRAIN_PATH})",
    )
    args = parser.parse_args()
    dropped = {name.strip() for name in args.drop_features.split(",") if name.strip()}

    data = load_training_data(args.train_csv)
    features, target, feature_names = get_features_and_target(data, dropped)
    print(f"Training data: {len(data)} rows; features: {', '.join(feature_names)}")
    if dropped:
        print(f"Dropped features: {', '.join(sorted(dropped))}")

    coefficient_rows: list[str] = []
    coefficient_cells: list[list[str]] = []
    metric_rows: list[list[str]] = []
    for model_type in MODEL_TYPES:
        model, alpha = fit_model(model_type, features, target)
        cv = evaluate_model(model, features, target)
        intercept, coefs = unscaled_coefficients(model)
        coefficient_rows.append(model_type)
        coefficient_cells.append(
            [f"{intercept:,.0f}"]
            + [f"{coefs[name]:,.0f}" for name in feature_names]
        )
        metric_rows.append(
            [
                model_type,
                "—" if alpha is None else f"{alpha:g}",
                f"{cv['r2']:.3f}",
                f"{cv['mae']:,.0f}",
                f"{cv['rmse']:,.0f}",
            ]
        )
        print(f"  fitted {model_type} (alpha={alpha})")

    print()
    print("### Coefficients (original units)")
    print(to_markdown(coefficient_rows, ["intercept", *feature_names], coefficient_cells))
    print()
    print("### CV metrics")
    print(
        to_markdown(
            [row[0] for row in metric_rows],
            ["alpha", "r2", "mae", "rmse"],
            [row[1:] for row in metric_rows],
        )
    )


if __name__ == "__main__":
    main()
