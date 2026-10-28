# hsbc

Monorepo for the house price prediction project. `docker-compose.yaml` at
this root is the single entry point for running the whole stack.

## Structure

```
hsbc/
├── docker-compose.yaml     # orchestrates all services (single command start)
├── .env.example            # compose interpolation vars (copy to .env)
└── predict/                # house price prediction API (FastAPI)
    ├── Dockerfile
    └── README.md           # API details: endpoints, validation rules, local dev
```

More services will be added as siblings of `predict/` and wired into
`docker-compose.yaml` under `services:`.

## Quickstart

```bash
# 1. start everything (builds images if missing)
docker compose up -d

# 2. rebuild after code changes, then start
docker compose up -d --build

# 3. check it's healthy
docker compose ps           # STATUS shows "(healthy)" once the healthcheck passes
curl http://localhost:8000/api/v1/health

# 4. stop and remove everything
docker compose down
```

Host ports and other per-service settings are configurable via `.env` at
this root (copy `.env.example` to `.env` and adjust).

## Services

| Service | Description | Where to look |
|---------|-------------|---------------|
| `api`   | House price prediction API (FastAPI) | [`predict/README.md`](predict/README.md) |
