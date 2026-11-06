# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment: run everything in WSL

The repo is opened from Windows at `\\wsl.localhost\Ubuntu\home\stoney\github\stoney\hsbc`, but all build/test/lint commands must run inside WSL:

```bash
wsl bash -lc 'cd /home/stoney/github/stoney/hsbc && <command>'
```

- Never run npm/tsc/eslint from Windows: `portal/node_modules` is Linux-native (contains swc binaries). The Python venv and Maven/OpenJDK 21 also live in WSL.
- The `wsl.exe: A localhost proxy configuration was detected but not mirrored into WSL` warning on stderr is cosmetic (Clash Verge proxy + NAT-mode WSL); commands still succeed.
- Docker commands run inside WSL as well.

## Architecture

One repo, three services, orchestrated by `docker-compose.yaml` at the root:

- `predict/` — FastAPI (Python) ML API: validates and predicts house prices from a trained regression model. This **is** the portal's Python backend (App 1); there is no separate Python service.
- `market/` — Spring Boot 3.4.4 / Java 21 market analysis API (App 2): filtered aggregates, paged listings, what-if analysis, CSV/PDF exports. Calls the predict container over the internal Docker network for what-if predictions.
- `portal/` — Next.js 15 App Router frontend: estimator, history, compare, market dashboard, what-if. Talks to both backends **server-side only** via route handlers in `portal/src/app/api/` — the browser never reaches the backends directly, so there is no CORS anywhere.

Cross-service facts that span multiple files:

- `docker-compose.yaml` is the source of truth for image builds and env defaults; the root `Makefile` wraps the same steps for host-side dev. Model defaults (`MODEL_TYPE=linear_positive`, `DROP_FEATURES=square_footage`) are duplicated in both plus `.env.example` — keep them in sync.
- Model artifacts (`predict/app/models/house_price_model.joblib`, `model_metrics.json`) are **gitignored and trained into the Docker image at build time**. The Dockerfile and `make train` share a freshness check: retrain when `predict/scripts/train.py` or any CSV in `predict/data/` is newer than the artifact. After changing training data or model type: retrain, bump `MODEL_VERSION` in `.env`, rebuild.
- The training set is 50 synthetic rows with near-perfect collinearity; `predict/model-analysis.md` explains why the default model is non-negative OLS without `square_footage` (VIF analysis, coefficient sign-flip avoidance).
- House feature validation rules exist in **three places** that must stay in sync: the Pydantic schema (`predict/app/schemas/predict.py`), the portal's client-side validation (`portal/src/lib/validation.ts`), and the market what-if validator (`market/.../whatif/FeatureValidator.java`).
- Market API JSON is snake_case (matching the predict vocabulary) while query params bind in camelCase (`minYearBuilt`).
- `portal/src/lib/api.ts` and `market-proxy.ts` import `server-only`, so importing them in a client component is a build-time error; backend URLs are server secrets.
- Root `.env` feeds compose interpolation (ports, `MODEL_TYPE`, `MODEL_VERSION`); `portal/.env.local` feeds Next dev (`PYTHON_API_URL`, `MARKET_API_URL`).

The per-service READMEs (`predict/README.md`, `market/README.md`, `portal/README.md`) have full endpoint tables, validation ranges, and file trees — consult them for details rather than re-deriving.

## Commands

All via `wsl bash -lc`, from the repo root unless noted.

### Whole stack

```bash
docker compose up -d --build   # build + start all three; wait for (healthy)
docker compose ps
docker compose logs -f api     # also: market-api, portal
docker compose down
```

After start: api → http://localhost:8000/docs, market-api → http://localhost:8080/swagger-ui.html, portal → http://localhost:3000.

### predict (FastAPI)

```bash
cd predict
python -m venv .venv && .venv/bin/pip install -r requirements.txt   # once
.venv/bin/python -m pytest          # all tests; must run from predict/ (pytest.ini sets testpaths + pythonpath)
.venv/bin/python -m pytest tests/test_predict_api.py::test_predict_all_ok_returns_200   # single test
.venv/bin/python -m app.main        # dev server (or .venv/bin/python -m uvicorn app.main:app --reload)
make train                          # from root; freshness check, MODEL_TYPE / DROP_FEATURES overridable
```

### market (Spring Boot / Java 21)

```bash
cd market
mvn test          # unit + integration (ML mocked); needs OpenJDK 21
mvn test -Dtest=MarketFiltersTest    # single test class
mvn package -DskipTests              # build target/market-api.jar
mvn spring-boot:run -Dspring-boot.run.arguments="--market.data-file=../predict/data/House\ Price\ Dataset.csv"
```

### portal (Next.js 15)

```bash
cd portal
npm install
npm run dev                                 # expects backends running; URLs from .env.local
npm run build                               # next build, includes TypeScript checking
npm run lint                                # ESLint
npm run test                                # vitest run
npm run test -- src/lib/validation.test.ts  # single test file
```

### Retraining (after changing `predict/data/` or the model)

```bash
docker compose run --rm --user root -v ./predict/app/models:/app/app/models api python scripts/train.py
docker compose up -d --build   # bake the new artifacts into the image
# bump MODEL_VERSION in .env so GET /api/v1/model-info stays honest
```
