"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import {
  EMPTY_FILTERS,
  filtersToQuery,
  type AggregatesResponse,
  type MarketFilterState,
  type MarketInitialData,
  type PropertiesPage,
} from "@/lib/market";
import MarketDataTable from "./MarketDataTable";
import PriceBarChart, { type ChartDatum } from "./PriceBarChart";
import PriceHistogram from "./PriceHistogram";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR + 5 - 1900 + 1 }, (_, i) => 1900 + i);
const BEDROOM_OPTIONS = Array.from({ length: 8 }, (_, i) => i + 1);
const SCHOOL_OPTIONS = [5, 6, 7, 8, 9];
const DISTANCE_OPTIONS = [2, 4, 6, 8];

/** Filter input grid shared by all controls. */
const FILTER_GRID = "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4";

function FilterSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: number[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-secondary">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field-input">
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Fetches one market endpoint; cancelled responses are ignored. When the
 * server component already loaded the mount-time URL (RSC initial data),
 * `initial` seeds the state and the first fetch is skipped; every other
 * URL change fetches normally.
 */
function useMarketJson<T>(url: string | null, initial?: T): {
  data: T | null;
  error: string | null;
  loading: boolean;
} {
  const [data, setData] = useState<T | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === undefined);
  const seededUrl = useRef(initial !== undefined ? url : null);

  useEffect(() => {
    if (url === null) return;
    if (seededUrl.current === url) {
      // The server already fetched this exact URL; only fetch on change.
      setLoading(false);
      return;
    }
    seededUrl.current = null;
    let cancelled = false;
    setLoading(true);
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(
            body && typeof body === "object" && "detail" in body && typeof body.detail === "string"
              ? body.detail
              : `Request failed (HTTP ${res.status}).`,
          );
        }
        return body as T;
      })
      .then((body) => {
        if (!cancelled) {
          setData(body);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, error, loading };
}

/** One headline number above the charts. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-3">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-ink-secondary">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Market dashboard (a.i/a.ii): segment filters drive aggregate stats,
 * charts, the sortable/paged data table and the export links, all served
 * by the market-api through the portal's proxy routes. `initialData` is
 * the unfiltered data the page's server component already fetched.
 */
export default function MarketDashboardView({
  initialData,
}: {
  initialData?: MarketInitialData | null;
}) {
  const [filters, setFilters] = useState<MarketFilterState>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);

  const setFilter = (key: keyof MarketFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  };

  const query = useMemo(() => filtersToQuery(filters), [filters]);
  const aggregatesUrl = useMemo(() => `/api/market/aggregates${query}`, [query]);
  const propertiesUrl = useMemo(
    () =>
      `/api/market/properties${filtersToQuery(filters, {
        sortBy,
        sortDir,
        page,
        size,
      })}`,
    [filters, sortBy, sortDir, page, size],
  );

  const aggregates = useMarketJson<AggregatesResponse>(
    aggregatesUrl,
    initialData?.aggregates ?? undefined,
  );
  const properties = useMarketJson<PropertiesPage>(
    propertiesUrl,
    initialData?.properties ?? undefined,
  );

  const handleSort = (key: string) => {
    if (key === sortBy) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  const handleSizeChange = (next: number) => {
    setSize(next);
    setPage(0);
  };

  const data = aggregates.data;
  const count = data?.count ?? 0;
  const stats: { label: string; value: string }[] = [
    { label: "Properties", value: data ? String(count) : "—" },
    {
      label: "Average price",
      value: data?.price ? formatPrice(data.price.mean) : "—",
    },
    {
      label: "Median price",
      value: data?.price ? formatPrice(data.price.median) : "—",
    },
    {
      label: "Average price per sq ft",
      value: data?.price_per_sq_ft ? formatPrice(data.price_per_sq_ft.mean) : "—",
    },
  ];

  const bandChart = (bands: { band: string; mean_price: number }[], suffix: string): ChartDatum[] =>
    bands.map((band) => ({
      id: `${suffix}:${band.band}`,
      label: band.band,
      value: band.mean_price,
    }));

  const csvHref = `/api/market/export${filtersToQuery(filters, { format: "csv" })}`;
  const pdfHref = `/api/market/export${filtersToQuery(filters, { format: "pdf" })}`;

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Property market</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Explore the housing dataset by segment — every filter below reshapes the
            statistics, charts and table.
          </p>
        </div>
        <Link href="/market/what-if" className="btn-primary">
          What-if analysis →
        </Link>
      </header>

      {/* Segment filters (a.ii). */}
      <div className="mt-6 rounded-lg border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Segment filters</h2>
          <button type="button" onClick={resetFilters} className="btn-secondary px-3 py-1 text-xs">
            Reset
          </button>
        </div>
        <div className={`${FILTER_GRID} mt-3`}>
          <FilterSelect
            label="Bedrooms"
            value={filters.bedrooms}
            options={BEDROOM_OPTIONS}
            allLabel="Any"
            onChange={(value) => setFilter("bedrooms", value)}
          />
          <FilterSelect
            label="Built from"
            value={filters.minYearBuilt}
            options={YEARS}
            allLabel="Any year"
            onChange={(value) => setFilter("minYearBuilt", value)}
          />
          <FilterSelect
            label="Built until"
            value={filters.maxYearBuilt}
            options={YEARS}
            allLabel="Any year"
            onChange={(value) => setFilter("maxYearBuilt", value)}
          />
          <FilterSelect
            label="School rating at least"
            value={filters.minSchoolRating}
            options={SCHOOL_OPTIONS}
            allLabel="Any"
            onChange={(value) => setFilter("minSchoolRating", value)}
          />
          <FilterSelect
            label="Max distance to city centre (miles)"
            value={filters.maxDistanceToCityCenter}
            options={DISTANCE_OPTIONS}
            allLabel="Any"
            onChange={(value) => setFilter("maxDistanceToCityCenter", value)}
          />
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">Min price ($)</span>
            <input
              type="number"
              inputMode="numeric"
              step={1000}
              min={0}
              placeholder="No minimum"
              value={filters.minPrice}
              onChange={(e) => setFilter("minPrice", e.target.value)}
              className="field-input"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-secondary">Max price ($)</span>
            <input
              type="number"
              inputMode="numeric"
              step={1000}
              min={0}
              placeholder="No maximum"
              value={filters.maxPrice}
              onChange={(e) => setFilter("maxPrice", e.target.value)}
              className="field-input"
            />
          </label>
        </div>
      </div>

      {aggregates.error && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical"
        >
          ✕ {aggregates.error}
        </p>
      )}

      {/* Headline stats + visualisations (a.i). */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatTile key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-hairline bg-surface p-5">
        {aggregates.loading && !data && (
          <p className="py-16 text-center text-sm text-ink-muted">Loading market data…</p>
        )}
        {data && count === 0 && (
          <p className="py-16 text-center text-sm text-ink-muted">
            No properties match the selected filters — adjust or reset them to see the market.
          </p>
        )}
        {data && count > 0 && (
          <div className="space-y-8">
            <ChartBlock title="Price distribution">
              <PriceHistogram bins={data.price_histogram} />
            </ChartBlock>
            <div className="grid gap-8 lg:grid-cols-2">
              <ChartBlock title="Average price by bedrooms">
                <PriceBarChart
                  data={bandChart(data.by_bedrooms, "bedrooms")}
                  metricLabel="Average price"
                />
              </ChartBlock>
              <ChartBlock title="Average price by year built">
                <PriceBarChart
                  data={bandChart(data.by_year_built_band, "year")}
                  metricLabel="Average price"
                />
              </ChartBlock>
              <ChartBlock title="Average price by school rating">
                <PriceBarChart
                  data={bandChart(data.by_school_rating_band, "school")}
                  metricLabel="Average price"
                />
              </ChartBlock>
              <ChartBlock title="Average price by distance to city centre">
                <PriceBarChart
                  data={bandChart(data.by_distance_band, "distance")}
                  metricLabel="Average price"
                />
              </ChartBlock>
            </div>
          </div>
        )}
      </div>

      {/* Data table + exports (a.iv/a.v). */}
      <div className="mt-4 rounded-lg border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">Dataset</h2>
          <div className="flex items-center gap-2">
            <a href={csvHref} className="btn-secondary px-3 py-1.5 text-xs">
              ⭳ Download CSV
            </a>
            <a href={pdfHref} className="btn-secondary px-3 py-1.5 text-xs">
              ⭳ Download PDF
            </a>
          </div>
        </div>
        {properties.error && (
          <p role="alert" className="mt-3 text-sm text-critical">
            ✕ {properties.error}
          </p>
        )}
        <div className="mt-3">
          <MarketDataTable
            page={properties.data}
            loading={properties.loading}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onPageChange={setPage}
            onSizeChange={handleSizeChange}
          />
        </div>
      </div>
    </section>
  );
}
