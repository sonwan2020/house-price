# Property Value Estimator — portal

Next.js frontend for the house price prediction stack. Talks to the
Python API in `../predict` and the market analysis API in `../market`
**server-side only** — the browser never reaches either backend directly,
so no CORS configuration is needed.

## Features

- **Estimator form** with all seven model features (plus an optional
  name), supporting a batch of up to 10 properties per request.
- **Client-side validation** mirroring the API's rules (required, numeric,
  whole-number, and range checks) with inline per-field error messages —
  invalid data never leaves the browser.
- **Results** in both tabular and visual form: each property's price fills
  in the estimate grid, and a results panel below shows summary chips
  (submitted / estimated / failed), a hero figure for a single estimate or
  a bar chart for batches, and per-item failure reasons.
- **History** of saved estimates (browser `localStorage`), with delete
  and clear actions.
- **Comparison view** of selected history entries: price bar chart plus a
  side-by-side feature table.
- **Market dashboard** (`/market`): segment filters (bedrooms, year built,
  school rating, distance, price band) driving aggregate stat tiles, five
  charts (price distribution histogram, average price by bedrooms / year /
  school rating / distance), a server-sorted/paged dataset table and
  CSV/PDF exports — all served by the Java market-api.
- **What-if analysis** (`/market/what-if`): a baseline house plus per-scenario
  feature changes, predicted in one batch by the Task 1 model; results show
  the delta per scenario as a diverging chart and table.

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
│   │   ├── loading.tsx       # route-level loading skeleton (all routes)
│   │   ├── error.tsx         # route-segment error boundary (client)
│   │   ├── global-error.tsx  # root-layout error boundary (client)
│   │   ├── not-found.tsx     # 404 page
│   │   ├── history/page.tsx  # estimate history
│   │   ├── compare/page.tsx  # side-by-side comparison
│   │   ├── market/page.tsx   # market dashboard (App 2)
│   │   ├── market/what-if/page.tsx  # what-if analysis (App 2)
│   │   └── api/              # server-side proxy route handlers
│   │       ├── predict/      #   POST → POST /api/v1/predict
│   │       ├── model-info/   #   GET  → GET /api/v1/model-info (60s revalidate)
│   │       ├── health/       #   GET  → liveness probe (Docker HEALTHCHECK)
│   │       └── market/       #   App 2 proxies → the Java market-api
│   │           ├── aggregates/  # GET  → GET /api/v1/market/aggregates
│   │           ├── properties/  # GET  → GET /api/v1/market/properties
│   │           ├── what-if/     # POST → POST /api/v1/market/what-if
│   │           └── export/      # GET  → GET /api/v1/market/export?type=csv|pdf
│   │               └── what-if/ # POST → POST /api/v1/market/export/what-if?type=csv|pdf
│   ├── components/           # server: ModelInfoPanel, ModelInfoCard, skeleton
│   │                         # client: form + results, history, compare, charts, nav
│   ├── hooks/                # usePrediction, useHistory, useWhatIfHistory, useCompareSelection
│   └── lib/                  # types, validation, formatting, storage, api + market server helpers
├── .env.example              # PYTHON_API_URL, MARKET_API_URL (copy to .env.local)
└── public/
```

## Architecture notes (Next.js requirements)

- **App Router** throughout; pages under `src/app/`, using the convention
  files (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`,
  `global-error.tsx`, `not-found.tsx`).
- **Loading and error states at the layout level**: a route-level
  `loading.tsx` skeleton covers every route while server components render,
  and `error.tsx`/`global-error.tsx` catch render errors with a retry.
- **Server vs client components**: `page.tsx`, `layout.tsx`,
  `ModelInfoPanel`/`ModelInfoCard` are server components; the form, results,
  history, compare views and charts are client components ("use client"),
  pushed as far down the tree as possible (Nav is client only for
  active-link highlighting).
- **React Server Components for initial data loading**: `ModelInfoPanel`
  fetches `/api/v1/model-info` on the server and streams into the page
  inside a Suspense boundary, and the market page's server component
  fetches the initial aggregates + table page (`fetchMarketInitial`), so
  the dashboard paints with data and skips the redundant first client
  fetch — with a skeleton fallback and graceful degradation when the
  backend is offline.
- **Data fetching strategy**: all backend calls go through Next.js route
  handlers (proxy) or server-side fetches — `cache: "no-store"` for
  predictions and market data, `revalidate: 60` for model info — so the
  backend URLs stay a server secret. `lib/api.ts` and
  `lib/market-proxy.ts` are guarded with `server-only`, making accidental
  client imports a build-time error.
- **Custom hooks** for shared functionality: `usePrediction` (submit +
  loading/error state), `useHistory` (localStorage CRUD), and
  `useCompareSelection` (shared compare selection between pages).
- **Smooth transitions**: page navigations cross-fade via the View
  Transitions API (`experimental.viewTransition` + CSS in
  `globals.css`) and result panels animate in; both respect
  `prefers-reduced-motion`.
- **App 1's Python backend**: the Task 1 FastAPI service in `../predict`
  *is* the Python backend — the portal's `POST /api/predict` handler
  submits the form to it and it validates, predicts and returns the batch.
  No separate Python service is needed; see `../predict/README.md`.

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
