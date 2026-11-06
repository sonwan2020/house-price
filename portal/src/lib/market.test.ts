import { describe, expect, it } from "vitest";
import {
  baselineToQuery,
  EMPTY_FILTERS,
  filtersToQuery,
  type MarketFilterState,
  type MarketListing,
} from "./market";

describe("filtersToQuery", () => {
  it("returns an empty string when no filters are set", () => {
    expect(filtersToQuery(EMPTY_FILTERS)).toBe("");
  });

  it("encodes set filters and skips empty ones", () => {
    const filters: MarketFilterState = { ...EMPTY_FILTERS, bedrooms: "3", minPrice: "200000" };
    const query = filtersToQuery(filters);
    expect(query).toContain("bedrooms=3");
    expect(query).toContain("minPrice=200000");
    expect(query).not.toContain("minYearBuilt");
    expect(query).not.toContain("maxDistanceToCityCenter");
  });

  it("appends extra entries such as the export type", () => {
    expect(filtersToQuery(EMPTY_FILTERS, { type: "csv" })).toBe("?type=csv");
  });
});

describe("baselineToQuery", () => {
  const listing: MarketListing = {
    id: 12,
    square_footage: 1500,
    bedrooms: 3,
    bathrooms: 2,
    year_built: 2000,
    lot_size: 6000,
    distance_to_city_center: 5,
    school_rating: 8,
    price: 450000,
  };

  it("encodes every baseline feature in form order, no price or id", () => {
    expect(baselineToQuery(listing)).toBe(
      "?square_footage=1500&bedrooms=3&bathrooms=2&year_built=2000&lot_size=6000&distance_to_city_center=5&school_rating=8",
    );
  });
});
