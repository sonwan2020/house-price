# House Price

A solution for house price prediction and management. The `predict/`
service provides a FastAPI that predicts house prices from a trained
regression model (linear / non-negative linear / Ridge / Lasso, configurable via `MODEL_TYPE`); the `portal/` service is the Next.js frontend
(form, validation, results, history, comparison); the `market/` service
is the Spring Boot market analysis API (aggregates, what-if, exports).
`docker-compose.yaml` at this root is the single entry point for running
the whole stack.

## Structure

```
.
├── docker-compose.yaml     # orchestrates all services (single command start)
├── Makefile                # local workflow helpers (train / test / up / down / logs)
├── .env.example            # compose interpolation vars (copy to .env)
├── predict/                # house price prediction API (FastAPI) — also App 1's Python backend
│   ├── Dockerfile          # builds the image; trains the model if artifacts are missing
│   └── README.md           # API details: endpoints, validation rules, local dev
├── market/                 # market analysis API (Spring Boot 3.4.4 / Java 21)
│   ├── Dockerfile          # multi-stage Maven build → JRE image
│   └── README.md           # endpoints, filters, configuration
└── portal/                 # frontend (Next.js App Router, Tailwind, Recharts)
    ├── Dockerfile          # multi-stage build → standalone Next server
    └── README.md           # portal details: pages, proxy routes, validation
```

**Backend roles**:
* Predict has no separate Python service — the
FastAPI container *is* its Python backend: the portal submits forms
to `POST /api/v1/predict`, which validates and predicts (see
`portal/README.md`).
* Market backend is the Java `market/` service, which
calls the same ML container for what-if analysis.

**Interactive docs**: 
* Predict API → http://localhost:8000/docs 
* Market API (springdoc) → http://localhost:8080/swagger-ui.html

## Quickstart

```bash
# 1. start everything (builds images if missing; the build trains the
#    model automatically when app/models/house_price_model.joblib is
#    absent or older than train.py / the CSVs)
docker compose up -d

# 2. rebuild after code changes, then start
docker compose up -d --build

# 3. check it's healthy
docker compose ps           # STATUS shows "(healthy)" once the healthcheck passes
curl http://localhost:8000/api/health

# 4. open the portal
#    http://localhost:3000

# 5. stop and remove everything
docker compose down
```

**Retraining** (after changing the training data in `predict/data/`):

```bash
docker compose run --rm --user root \
  -v ./predict/app/models:/app/app/models \
  api python scripts/train.py
docker compose up -d --build   # bake the new artifacts into the image
```

**Make targets** (same freshness check, for local workflows):

```bash
make train   # retrain only when train.py or a CSV is newer than the model
make test    # run the pytest suite
make up / make down / make logs
```

Host ports and other per-service settings are configurable via `.env` at
this root (copy `.env.example` to `.env` and adjust).

## Services

| Service | Description | Where to look |
|---------|-------------|---------------|
| `api`    | House price prediction API (FastAPI) — also App 1's Python backend | [`predict/README.md`](predict/README.md) |
| `market-api` | Property market analysis API (Spring Boot / Java) | [`market/README.md`](market/README.md) |
| `portal` | Unified Next.js portal: estimator + market dashboard | [`portal/README.md`](portal/README.md) |
