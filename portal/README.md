# Property Value Estimator — portal

Next.js frontend for the house price prediction stack. Talks to the
Python API in `../predict` **server-side only** — the browser never
reaches the FastAPI service, so no CORS configuration is needed.

## Features

- **Estimator form** with all seven model features (plus an optional
  name), supporting a batch of up to 10 properties per request.
- **Client-side validation** mirroring the API's rules (required, numeric,
  whole-number, and range checks) with inline per-field error messages —
  invalid data never leaves the browser.
- **Results** in tabular form and as a chart: a hero figure for a single
  estimate, a bar chart for batches, plus summary chips (total / predicted
  / failed) and per-item failure reasons.
- **History** of saved estimates (browser `localStorage`), with delete
  and clear actions.
- **Comparison view** of selected history entries: price bar chart plus a
  side-by-side feature table.

## Project structure

```
portal/
├── Dockerfile                # multi-stage build → standalone Next server
├── next.config.ts            # output: "standalone"
├── eslint.config.mjs         # ESLint flat config (next/core-web-vitals + next/typescript)
├── src/
│   ├── app/
│   │   ├── layout.tsx        # root layout + nav (server component)
│   │   ├── page.tsx          # home: RSC shell + Suspense around model info
│   │   ├── error.tsx         # route-segment error boundary (client)
│   │   ├── global-error.tsx  # root-layout error boundary (client)
│   │   ├── not-found.tsx     # 404 page
│   │   ├── history/page.tsx  # estimate history
│   │   ├── compare/page.tsx  # side-by-side comparison
│   │   └── api/              # server-side proxy route handlers
│   │       ├── predict/      #   POST → POST /api/v1/predict
│   │       ├── model-info/   #   GET  → GET /api/v1/model-info (60s revalidate)
│   │       └── health/       #   GET  → liveness probe (Docker HEALTHCHECK)
│   ├── components/           # server: ModelInfoPanel, ModelInfoCard, skeleton
│   │                         # client: form, results, history, compare, chart, nav
│   ├── hooks/                # usePrediction, useHistory, useCompareSelection
│   └── lib/                  # types, validation rules, formatting, storage, api helpers
├── .env.example              # PYTHON_API_URL (copy to .env.local)
└── public/
```

## Architecture notes (Next.js requirements)

- **App Router** throughout; pages under `src/app/`, using the convention
  files (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`,
  `global-error.tsx`, `not-found.tsx`).
- **Server vs client components**: `page.tsx`, `layout.tsx`,
  `ModelInfoPanel`/`ModelInfoCard` are server components; the form, results,
  history, compare views and chart are client components ("use client"),
  pushed as far down the tree as possible (Nav is client only for
  active-link highlighting).
- **React Server Components for initial data loading**: `ModelInfoPanel`
  fetches `/api/v1/model-info` on the server and streams into the page
  inside a Suspense boundary — the estimator form paints immediately and
  the model tiles fill in when the API answers, with a skeleton fallback
  and graceful degradation when the API is offline.
- **Data fetching strategy**: all Python API calls go through Next.js route
  handlers (proxy) — `cache: "no-store"` for predictions, `revalidate: 60`
  for model info — so the backend URL stays a server secret. `lib/api.ts`
  is guarded with `server-only`, making accidental client imports a
  build-time error.
- **Custom hooks** for shared functionality: `usePrediction` (submit +
  loading/error state), `useHistory` (localStorage CRUD), and
  `useCompareSelection` (shared compare selection between pages).

## Quickstart

### Docker Compose (recommended)

Run the whole stack from the repository root (`../`): `docker compose up
-d --build` starts the API and this portal. Open http://localhost:3000.
The portal calls the API over the internal network (`http://api:8000`).

### Local development (without Docker)

```bash
npm install
# Start the Python API first (see ../predict/README.md), then:
npm run dev          # http://localhost:3000
```

The portal expects the API at `PYTHON_API_URL` (default
`http://127.0.0.1:8000`); override it in `.env.local` (see
`.env.example`).

### Quality checks and production build

```bash
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run build        # type check + standalone production build
npm start
```

## Endpoints

| Portal route | Proxies | Notes |
|---|---|---|
| `POST /api/predict` | `POST /api/v1/predict` | passes through status 200/207/400/422 |
| `GET /api/model-info` | `GET /api/v1/model-info` | cached 60s |
| `GET /api/health` | `GET /api/health` (best-effort) | portal liveness for the Docker HEALTHCHECK |

## Validation rules (client-side)

Matches the API's Pydantic schema: `square_footage` > 0 ≤ 100,000;
`bedrooms` integer 1–20; `bathrooms` > 0 ≤ 20 (half baths allowed);
`year_built` integer 1900–current year + 5; `lot_size` > 0 ≤ 1,000,000;
`distance_to_city_center` 0–1,000 miles; `school_rating` 0–10.
