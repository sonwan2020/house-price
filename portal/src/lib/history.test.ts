import { beforeEach, describe, expect, it } from "vitest";
import {
  createHistoryEntry,
  loadCompareSelection,
  loadHistory,
  saveCompareSelection,
  saveHistory,
} from "./history";

const FEATURES = {
  square_footage: 2000,
  bedrooms: 3,
  bathrooms: 2,
  year_built: 1995,
  lot_size: 6000,
  distance_to_city_center: 5,
  school_rating: 7.5,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("history persistence", () => {
  it("round-trips saved estimates through localStorage", () => {
    const entry = createHistoryEntry(FEATURES, 251000, "House 1");
    saveHistory([entry]);
    const loaded = loadHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].label).toBe("House 1");
    expect(loaded[0].price).toBe(251000);
    expect(loaded[0].features.bedrooms).toBe(3);
  });

  it("returns an empty list when nothing is saved", () => {
    expect(loadHistory()).toEqual([]);
  });

  it("ignores malformed stored JSON", () => {
    window.localStorage.setItem("hsbc.house-price.history.v1", "{not json");
    expect(loadHistory()).toEqual([]);
  });

  it("caps saved history at 100 entries", () => {
    const entries = Array.from({ length: 150 }, (_, i) =>
      createHistoryEntry(FEATURES, 100000 + i, `House ${i}`),
    );
    saveHistory(entries);
    expect(loadHistory()).toHaveLength(100);
  });
});

describe("compare selection persistence", () => {
  it("round-trips the selected ids", () => {
    saveCompareSelection(["a", "b"]);
    expect(loadCompareSelection()).toEqual(["a", "b"]);
  });

  it("returns an empty list when nothing is saved", () => {
    expect(loadCompareSelection()).toEqual([]);
  });
});
