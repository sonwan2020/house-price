# market-api — Property Market Analysis (App 2 backend)

Spring Boot 3.4.4 / Java 21 service that turns the housing dataset into market
insights: filtered aggregate statistics, a sortable data table API, what-if
analysis through the Task 1 ML container, and CSV/PDF exports.

Interactive docs (springdoc): http://127.0.0.1:8080/swagger-ui.html
(OpenAPI JSON at `/v3/api-docs`).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe (also the Docker HEALTHCHECK); reports dataset size and ML reachability |
| GET | `/api/v1/market/aggregates` | Filtered aggregate stats: price stats, price per sq ft, breakdowns by bedrooms / year band / school band / distance band, price histogram |
| GET | `/api/v1/market/properties` | Paged, sorted, filtered dataset rows (`sortBy`, `sortDir`, `page`, `size`) |
| POST | `/api/v1/market/what-if` | Baseline + scenarios predicted by the ML container; returns per-scenario price and delta vs baseline |
| GET | `/api/v1/market/export?type=csv\|pdf` | Filtered rows (CSV) or summary sheet (PDF) as a download |
| POST | `/api/v1/market/export/what-if?type=csv\|pdf` | Saved what-if runs (current run or history) rendered as CSV or PDF |
| GET | `/api/v1/market/model-info` | Task 1 model metadata, passed through |
| POST | `/api/v1/market/reload` | Re-reads the dataset CSV and clears all caches |

JSON keys are snake_case (matching the Task 1 vocabulary); query params bind
in camelCase — the JSON name `min_year_built` is the query param `minYearBuilt`.

All endpoints are versioned under `/api/v1/market`; the Swagger info block
carries the matching version (v1, `1.0.0`).

## Segment filters (query params, all optional)

`bedrooms` (exact), `minSquareFootage`/`maxSquareFootage`, `minBathrooms`/
`maxBathrooms`, `minYearBuilt`/`maxYearBuilt`, `minLotSize`/`maxLotSize`,
`maxDistanceToCityCenter`, `minSchoolRating`, `minPrice`/`maxPrice`.

## Configuration (env vars)

| Variable | Default | Meaning |
|---|---|---|
| `DATA_FILE` | `/data/House Price Dataset.csv` | Dataset CSV, mounted read-only from `./predict/data` in Compose |
| `PYTHON_API_URL` | `http://api:8000` | Task 1 ML container, called server-side only |
| `AGGREGATES_CACHE_TTL_SECONDS` | `300` | TTL of cached aggregate responses |
| `ML_CACHE_TTL_SECONDS` | `60` | TTL of cached what-if batches and model-info |

## Running

```sh
docker compose up -d --build market-api   # from the repo root

# locally (needs Java 21 + Maven):
mvn spring-boot:run -Dspring-boot.run.arguments="--market.data-file=../predict/data/House\ Price\ Dataset.csv"
mvn test                                  # unit + integration tests (ML mocked)
```
