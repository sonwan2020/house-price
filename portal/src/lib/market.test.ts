import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS, filtersToQuery, type MarketFilterState } from "./market";

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
