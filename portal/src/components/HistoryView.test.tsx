import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHistoryEntry, saveHistory, type HistoryEntry } from "@/lib/history";
import type { HouseFeatures } from "@/lib/types";
import HistoryView from "./HistoryView";

// next/link needs the app-router context in the real runtime; the compare
// link is not what this test is about.
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const FEATURES: HouseFeatures = {
  square_footage: 2000,
  bedrooms: 3,
  bathrooms: 2,
  year_built: 1995,
  lot_size: 6000,
  distance_to_city_center: 5,
  school_rating: 7.5,
};

function entry(
  id: string,
  createdAt: string,
  label: string,
  price: number,
  squareFootage: number,
): HistoryEntry {
  return {
    ...createHistoryEntry({ ...FEATURES, square_footage: squareFootage }, price, label),
    id,
    createdAt,
  };
}

/** Three saved estimates with distinct values for every sortable column. */
function seed() {
  // Stored newest-first, as useHistory would after adding entries.
  saveHistory([
    entry("a", "2026-01-03T00:00:00.000Z", "Alder", 300000, 1000),
    entry("b", "2026-01-02T00:00:00.000Z", "Beech", 200000, 3000),
    entry("c", "2026-01-01T00:00:00.000Z", "Cedar", 100000, 2000),
  ]);
}

/** Property labels of the body rows, in rendered order. */
function renderedLabels(): (string | null)[] {
  return screen
    .getAllByRole("row")
    .slice(1) // skip the header row
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

beforeEach(() => {
  window.localStorage.clear();
  seed();
});

describe("HistoryView sorting", () => {
  it("keeps the saved newest-first order until a header is clicked", () => {
    render(<HistoryView />);
    expect(renderedLabels()).toEqual(["Alder", "Beech", "Cedar"]);
  });

  it("sorts by a feature column ascending, then descending on the next click", () => {
    render(<HistoryView />);

    const header = screen.getByRole("columnheader", { name: /square footage/i });
    const sortButton = within(header).getByRole("button");

    fireEvent.click(sortButton);
    expect(renderedLabels()).toEqual(["Alder", "Cedar", "Beech"]); // 1000, 2000, 3000
    expect(header).toHaveAttribute("aria-sort", "ascending");

    fireEvent.click(sortButton);
    expect(renderedLabels()).toEqual(["Beech", "Cedar", "Alder"]);
    expect(header).toHaveAttribute("aria-sort", "descending");
  });

  it("sorts by estimate price and by property name", () => {
    render(<HistoryView />);

    fireEvent.click(screen.getByRole("button", { name: /estimate price/i }));
    expect(renderedLabels()).toEqual(["Cedar", "Beech", "Alder"]); // 100k, 200k, 300k

    fireEvent.click(screen.getByRole("button", { name: /^property/i }));
    expect(renderedLabels()).toEqual(["Alder", "Beech", "Cedar"]);
  });

  it("leaves the stored order untouched while sorted", () => {
    render(<HistoryView />);

    fireEvent.click(screen.getByRole("button", { name: /estimate price/i }));
    expect(renderedLabels()).toEqual(["Cedar", "Beech", "Alder"]);

    // Sorting is presentational only; localStorage still holds newest-first.
    const stored = JSON.parse(
      window.localStorage.getItem("hsbc.house-price.history.v1") ?? "[]",
    ) as HistoryEntry[];
    expect(stored.map((e) => e.label)).toEqual(["Alder", "Beech", "Cedar"]);
  });
});
