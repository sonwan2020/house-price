# House Price Prediction API

FastAPI service that predicts house prices with a trained linear-regression
model. Endpoints are versioned under `/api/v1`.

## Project structure

```
predict/
├── app/
│   ├── main.py                  # app entry: create app, register routes, startup events
│   ├── config.py                # configuration (paths, host/port, model version)
│   ├── api/                     # HTTP layer
│   │   ├── router.py            # aggregates all sub-routers under /api
│   │   └── v1/
│   │       ├── predict.py       # POST /api/v1/predict
│   │       ├── model_info.py    # GET  /api/v1/model-info
│   │       └── health.py        # GET  /api/v1/health
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
├── data/                        # raw training CSVs (source for scripts/train.py)
├── scripts/
│   └── train.py                 # trains the model, outputs app/models/*
├── tests/
│   ├── test_predict_api.py      # HTTP contract tests
│   └── test_predictor.py        # business logic tests (no server needed)
├── requirements.txt
├── .env                         # local config (not committed)
└── .env.example
```

## Quickstart

### Docker (recommended)

```bash
# build the image (includes the trained artifacts from app/models/)
docker build -t house-price-api .

# run it, publishing port 8000
docker run -d --name house-price-api -p 8000:8000 house-price-api

# check it's healthy
docker ps                    # STATUS shows "(healthy)" once the healthcheck passes
curl http://localhost:8000/api/v1/health

# stop / remove
docker stop house-price-api && docker rm house-price-api
```

The image runs as a non-root user, includes a HEALTHCHECK against
`/api/v1/health`, and binds `0.0.0.0:8000` inside the container.

### Local (without Docker)

```bash
# 1. (once) install dependencies
python -m venv .venv && .venv/bin/pip install -r requirements.txt

# 2. (optional) retrain the model -> app/models/
.venv/bin/python scripts/train.py

# 3. run the server (honors .env for host/port)
.venv/bin/python -m app.main
# or: .venv/bin/python -m uvicorn app.main:app --reload

# 4. run the tests
.venv/bin/python -m pytest
```

Interactive docs: http://127.0.0.1:8000/docs

## Endpoints

### POST `/api/v1/predict`

Accepts a JSON array of houses (features + optional `id`) and returns a JSON
array of results in the same order, with `index`, `id`, `price`, `message`.
Failed items get `price = 0` and the reason (with a machine-readable code) in
`message`.

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
[
  {"index": 0, "id": "house-1", "price": 250879.73, "message": ""}
]
```

Features (all required): `square_footage`, `bedrooms`, `bathrooms`,
`year_built`, `lot_size`, `distance_to_city_center`, `school_rating`.
`id` is optional and echoed back unchanged.

Validation per item: all fields required, must be numbers, `bedrooms` /
`year_built` must be integers, plus sanity ranges (positive footage/lot size,
`year_built` 1800–current year + 5, `school_rating` 0–10, ...).

Status codes:

| Status | Meaning |
|--------|---------|
| 200    | all items predicted |
| 207    | some items failed (their `price` is 0) |
| 400    | all items failed (their `price` is 0) |
| 422    | body is not a JSON array |

Error codes embedded in `message`: `NOT_OBJECT`, `MISSING_FIELD`,
`INVALID_TYPE`, `NOT_INTEGER`, `INVALID_ID`, `OUT_OF_RANGE`.

### GET `/api/v1/model-info`

Returns the model coefficients (intercept + per-feature) and the
cross-validation performance metrics saved by `scripts/train.py`.

### GET `/api/v1/health`

Returns `{"status": "ok"}` with HTTP 200.
