# House Price

A solution for house price prediction and management. The `predict/`
service provides a FastAPI that predicts house prices from a trained
linear-regression model; the `portal/` service is the Next.js frontend
(form, validation, results, history, comparison); the `market/` service
is the Spring Boot market analysis API (aggregates, what-if, exports).
`docker-compose.yaml` at this root is the single entry point for running
the whole stack.

## Structure

```
.
├── docker-compose.yaml     # orchestrates all services (single command start)
├── .env.example            # compose interpolation vars (copy to .env)
├── predict/                # house price prediction API (FastAPI)
│   ├── Dockerfile          # builds the image; trains the model if artifacts are missing
│   └── README.md           # API details: endpoints, validation rules, local dev
└── portal/                 # frontend (Next.js App Router, Tailwind, Recharts)
    ├── Dockerfile          # multi-stage build → standalone Next server
    └── README.md           # portal details: pages, proxy routes, validation
```

See `market/README.md` for the App 2 endpoints and configuration.

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
| `api`    | House price prediction API (FastAPI) | [`predict/README.md`](predict/README.md) |
| `portal` | Property Value Estimator frontend (Next.js) | [`portal/README.md`](portal/README.md) |
