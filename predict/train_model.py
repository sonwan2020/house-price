#!/usr/bin/env python3

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_validate

DATA_DIR = Path(__file__).resolve().parent / "data"
TRAIN_PATH = DATA_DIR / "House Price Dataset.csv"
TEST_PATH = DATA_DIR / "Test Data For Prediction.csv"
TARGET = "price"

# 1. Load
train = pd.read_csv(TRAIN_PATH)
test = pd.read_csv(TEST_PATH)

print(train.shape, test.shape)
print(train.dtypes)
print(train.describe().T)

# 2. sanity checks
print("NaNs in train:", train.isna().sum().sum())
print("Price skewness:", train[TARGET].skew())  # accepted skew 0.49

# correlation with target
corr = train.corr(numeric_only=True)[TARGET].sort_values(ascending=False)
print(corr)

# 3. X / y
features = [c for c in train.columns if c.lower() not in {TARGET, "id"}]
X_train, y_train = train[features], train[TARGET]
X_test, y_test = test[features], test[TARGET]

# 4. internal validation via K-fold CV on training data only
model = LinearRegression()
kf = KFold(n_splits=5, shuffle=True, random_state=42)
cv = cross_validate(
    model,
    X_train,
    y_train,
    cv=kf,
    scoring={
        "r2": "r2",
        "rmse": "neg_root_mean_squared_error",
        "mae": "neg_mean_absolute_error",
    },
    return_train_score=True,
)

print("CV R2   (val):", cv["test_r2"].mean())
print("CV RMSE (val):", -cv["test_rmse"].mean())
print("CV MAE  (val):", -cv["test_mae"].mean())
print("CV R2   (train):", cv["train_r2"].mean())

model.fit(X_train, y_train)

# Learned parameters
coefs = pd.Series(model.coef_, index=features).sort_values(key=abs, ascending=False)
print("intercept:", model.intercept_)
print(coefs)

MODEL_FILE = DATA_DIR / "house_price_model.joblib"
print(f"Model save to {MODEL_FILE}")
joblib.dump(model, MODEL_FILE)

# Persist performance metrics for the API's /model-info endpoint
metrics = {
    "model_type": type(model).__name__,
    "target": TARGET,
    "features": features,
    "cv": {
        "r2": float(cv["test_r2"].mean()),
        "rmse": float(-cv["test_rmse"].mean()),
        "mae": float(-cv["test_mae"].mean()),
        "r2_train": float(cv["train_r2"].mean()),
    },
}
METRICS_FILE = DATA_DIR / "model_metrics.json"
print(f"Metrics save to {METRICS_FILE}")
METRICS_FILE.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")

y_pred = model.predict(X_test)

prediction_results = X_test.copy()
prediction_results["predicted_price"] = y_pred
print("\nTest records with predicted prices:")
print(prediction_results.to_string(index=False))
