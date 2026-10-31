/**
 * Types mirroring the market-api records (snake_case JSON, Java service)
 * plus the dashboard filter state and its query-string encoding.
 */

export interface PriceStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  total?: number;
}

export interface BandCount {
  band: string;
  count: number;
  mean_price: number;
  median_price: number;
}

export interface HistogramBin {
  from: number;
  to: number;
  count: number;
}

/** Response body of GET /api/market/aggregates. */
export interface AggregatesResponse {
  filters: Record<string, string | number>;
  count: number;
  price: PriceStats | null;
  price_per_sq_ft: PriceStats | null;
  by_bedrooms: BandCount[];
  by_year_built_band: BandCount[];
  by_school_rating_band: BandCount[];
  by_distance_band: BandCount[];
  price_histogram: HistogramBin[];
}

/** Initial dashboard data fetched by the market page's server component. */
export interface MarketInitialData {
  aggregates: AggregatesResponse;
  properties: PropertiesPage;
}

/** One dataset row as served by GET /api/market/properties. */
export interface MarketProperty {
  id: number;
  square_footage: number;
  bedrooms: number;
  bathrooms: number;
  year_built: number;
  lot_size: number;
  distance_to_city_center: number;
  school_rating: number;
  price: number;
}

export interface PropertiesPage {
  total: number;
  page: number;
  size: number;
  properties: MarketProperty[];
}

/** One what-if scenario outcome. */
export interface ScenarioOutcome {
  name: string;
  price: number;
  delta: number | null;
  reason: string;
}

/** Response body of POST /api/market/what-if. */
export interface WhatIfResult {
  baseline_price: number;
  baseline_reason: string;
  scenarios: ScenarioOutcome[];
}

/**
 * Dashboard filter state; empty strings mean "no filter". Keys match the
 * market-api query params (camelCase).
 */
export interface MarketFilterState {
  bedrooms: string;
  minYearBuilt: string;
  maxYearBuilt: string;
  minSchoolRating: string;
  maxDistanceToCityCenter: string;
  minPrice: string;
  maxPrice: string;
}

export const EMPTY_FILTERS: MarketFilterState = {
  bedrooms: "",
  minYearBuilt: "",
  maxYearBuilt: "",
  minSchoolRating: "",
  maxDistanceToCityCenter: "",
  minPrice: "",
  maxPrice: "",
};

/**
 * Query string for the market API, skipping empty values; extra entries
 * (e.g. `{ format: "csv" }`) are appended first. Returns "" when nothing
 * is set, otherwise a leading "?".
 */
export function filtersToQuery(
  filters: MarketFilterState,
  extra: Record<string, string | number> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...extra, ...filters })) {
    if (value !== "") {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
