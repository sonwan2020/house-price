# House Price Prediction API

FastAPI service that predicts house prices with a trained regression
model (linear / Ridge / Lasso, configurable via `MODEL_TYPE`)
model. Endpoints are versioned under `/api/v1`.

## Project structure

```
predict/
├── app/
│   ├── main.py                  # app entry: create app, register routes, startup events
│   ├── config.py                # configuration (paths, host/port, model version)
│   ├── api/                     # HTTP layer
│   │   ├── router.py            # aggregates all sub-routers under /api
│   │   ├── health.py            # GET  /api/health (version-independent)
│   │   └── v1/
│   │       ├── predict.py       # POST /api/v1/predict
│   │       └── model_info.py    # GET  /api/v1/model-info
│   ├── schemas/                 # Pydantic request/response models
│   │   └── predict.py           # HouseFeatures, HouseInfo, HousePrice, ...
│   ├── services/                # business logic (pure Python, no FastAPI)
│   │   └── predictor.py         # per-item validation + batch prediction
│   ├── core/                    # cross-cutting: model loading, errors, logging
│   │   ├── model_loader.py      # loads the joblib model at startup
│   │   ├── errors.py            # per-item error code enum
│   │   └── logging.py           # logging setup
│   └── models/                  # trained artifacts (generated, not code)
│       ├── house_price_model.joblib
│       └── model_metrics.json
├── data/                        # raw training and test CSVs
├── scripts/
│   ├── train.py                 # trains and saves app/models/*
│   └── test.py                  # predicts rows from a test CSV
├── tests/
│   ├── test_predict_api.py      # HTTP contract tests
│   └── test_predictor.py        # business logic tests (no server needed)
├── requirements.txt
├── .env                         # local config (not committed)
└── .env.example
```

## Quickstart

### Docker Compose (recommended)

`docker-compose.yaml` lives at the **repository root** (`../` from this
folder) as the single entry point for the whole project; more services
will be added as siblings under `services:` there (see the comments in
the file). Run from the repo root:

```bash
cd ..                          # repository root

# start everything (builds the image if missing)
docker compose up -d

# rebuild after code changes, then start
docker compose up -d --build

# check it's healthy
docker compose ps           # STATUS shows "(healthy)" once the healthcheck passes
curl http://localhost:8000/api/health

# follow logs / stop and remove everything
docker compose logs -f api
docker compose down
```

The host port is configurable via `API_PORT` in the repo root `.env`
(see `.env.example`). The image runs as a non-root user, includes a
HEALTHCHECK against `/api/health`, and binds `0.0.0.0:8000` inside
the container.

On a fresh clone (the artifacts are gitignored) the image build trains the
model automatically — no manual step needed. The build also retrains when
`scripts/train.py` or any CSV in `data/` is newer than the artifact
(Makefile-style freshness check).

The regression model is configurable: `linear` (plain OLS),
`linear_positive` (non-negative OLS), `ridge` and `lasso` (StandardScaler
pipeline + one-standard-error alpha selection). Features can be excluded
with `DROP_FEATURES` (comma-separated) / `--drop-features`. Choose the
model via the `MODEL_TYPE` env var (Compose default: `linear_positive`
without `lot_size`) or `--model` directly. `GET /api/v1/model-info`
reports the trained model type, positivity and alpha.

## Model selection

The training dataset is 50 synthetic rows whose features are almost
perfectly collinear (e.g. `square_footage` ↔ `lot_size` = 0.99, and every
feature correlates ≥ 0.93 with the others). Under such collinearity plain
OLS/Ridge split the shared size effect arbitrarily and can produce
counter-intuitive sign flips (a negative `square_footage` or `year_built`
coefficient). Experiments over candidate configurations (CV RMSE):

| Configuration | `year_built` | `square_footage` | CV RMSE |
|---|---|---|---|
| Ridge (alpha=1) | −446 | +6.7 | 9,827 |
| non-negative OLS | 0 | 0 | 9,216 |
| **non-negative OLS, without `lot_size`** (default) | **+120** | 0 | 10,776 |

The default configuration trades ~10% CV RMSE for a sign-constrained
solution whose coefficients match domain expectations (no feature lowers
the price; a newer build year is worth more). The zeroed coefficients are
feature selection under collinearity: a zero weight means the feature adds
no measurable information beyond its correlates in the training data —
not that it is irrelevant to price. See `GET /api/v1/model-info` for the
deployed model's coefficients.

To retrain explicitly after changing the training data:

```bash
docker compose run --rm --user root \
  -v ./predict/app/models:/app/app/models \
  api python scripts/train.py              # honors MODEL_TYPE (default ridge)
docker compose up -d --build               # bake the new artifacts into the image
```

### Plain Docker

```bash
docker build -t house-price-api .
docker run -d --name house-price-api -p 8000:8000 house-price-api
```

### Local (without Docker)

```bash
# 1. (once) install dependencies
python -m venv .venv && .venv/bin/pip install -r requirements.txt

# 2. (optional) retrain the model -> app/models/
.venv/bin/python scripts/train.py

# Override the input CSV and/or output artifact paths
.venv/bin/python scripts/train.py \
  --train-csv "data/House Price Dataset.csv" \
  --model-file app/models/house_price_model.joblib \
  --metrics-file app/models/model_metrics.json

# 3. load the saved model and print test predictions as a table
.venv/bin/python scripts/test.py \
  --test-csv "data/Test Data For Prediction.csv" \
  --model-file app/models/house_price_model.joblib

# 4. run the server (honors .env for host/port)
.venv/bin/python -m app.main
# or: .venv/bin/python -m uvicorn app.main:app --reload

# 5. run the tests
.venv/bin/python -m pytest
```

Interactive docs: http://127.0.0.1:8000/docs

## Endpoints

### POST `/api/v1/predict`

Accepts a JSON array of houses (features + optional `id`) and returns a
batch `summary` plus `predicts` in the same order, each with `index`, `id`,
`price`, `reason`. `price` is rounded to the nearest 1000 (int). Failed
items get `price = 0` and the reason (with a machine-readable code) in
`reason`.

```bash
curl -X POST http://127.0.0.1:8000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '[
    {"id": "house-1", "square_footage": 1550, "bedrooms": 3, "bathrooms": 2,
     "year_built": 1997, "lot_size": 6800, "distance_to_city_center": 4.1,
     "school_rating": 7.6}
  ]'
```

Response:

```json
{
  "summary": {"total": 1, "succeed": 1, "failed": 0},
  "predicts": [
    {"index": 0, "id": "house-1", "price": 251000, "reason": ""}
  ]
}
```

Features (all required): `square_footage`, `bedrooms`, `bathrooms`,
`year_built`, `lot_size`, `distance_to_city_center`, `school_rating`.
`id` is an optional string, echoed back unchanged; defaults to an empty
string when omitted.

`lot_size` is always required even though the default model is trained
without it (`DROP_FEATURES=lot_size`, see "Model selection"): the request
contract stays the full dataset schema no matter which model variant is
deployed, and clients don't change when the model does.
`GET /api/v1/model-info` reports the deployed model's actual feature order.

Validation per item: all fields required, must be numbers, `bedrooms` /
`year_built` must be integers, plus sanity ranges (positive footage/lot size,
`year_built` 1950–current year + 5, `school_rating` 0–10, ...).

Status codes:

| Status | Meaning |
|--------|---------|
| 200    | all items predicted |
| 207    | some items failed (their `price` is 0) |
| 400    | all items failed (their `price` is 0) |
| 422    | body is not a JSON array |

Error codes embedded in `reason`: `NOT_OBJECT`, `MISSING_FIELD`,
`INVALID_TYPE`, `NOT_INTEGER`, `INVALID_ID`, `OUT_OF_RANGE`.

### GET `/api/v1/model-info`

Returns the model coefficients (intercept + per-feature) and the
cross-validation performance metrics saved by `scripts/train.py`.
Values are rounded for display: coefficients to 0.1, cv `r2` to 0.001,
and cv `mae`/`rmse` to 0.1 (the artifacts keep full precision).

### GET `/api/health`

Version-independent liveness check. Returns `{"status": "ok"}` with HTTP 200.
