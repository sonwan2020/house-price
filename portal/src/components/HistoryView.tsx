"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MAX_COMPARE, useCompareSelection } from "@/hooks/useCompareSelection";
import { useHistory } from "@/hooks/useHistory";
import { formatNumber, formatPrice } from "@/lib/format";
import type { HouseFeatures } from "@/lib/types";
import EmptyState from "./EmptyState";

/** Feature columns of the table, formatted the same way as the compare
 * table. Headers are a single clear line: the name plus the sort arrow. */
const FEATURE_COLUMNS: {
  key: keyof HouseFeatures;
  label: string;
  render: (f: HouseFeatures) => string;
}[] = [
  { key: "square_footage", label: "Square footage", render: (f) => formatNumber(f.square_footage) },
  { key: "bedrooms", label: "Bedrooms", render: (f) => String(f.bedrooms) },
  { key: "bathrooms", label: "Bathrooms", render: (f) => formatNumber(f.bathrooms, 1) },
  { key: "year_built", label: "Year built", render: (f) => String(f.year_built) },
  { key: "lot_size", label: "Lot size", render: (f) => formatNumber(f.lot_size) },
  { key: "distance_to_city_center", label: "Distance to city centre", render: (f) => formatNumber(f.distance_to_city_center, 1) },
  { key: "school_rating", label: "School rating", render: (f) => formatNumber(f.school_rating, 1) },
];

/** Every data column can sort the table: the property label and price plus
 * the seven house features. */
type SortKey = "label" | "price" | keyof HouseFeatures;

type Sort = { key: SortKey; dir: "asc" | "desc" };

/** Clickable column header, matching the sort affordance of MarketDataTable:
 * ▲/▼ shows the direction of the active column, an inactive column shows a
 * muted ▲. */
function SortableHeader({
  sortKey,
  label,
  sort,
  onSort,
  className = "",
}: {
  sortKey: SortKey;
  label: string;
  sort: Sort | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const dir = active ? sort?.dir : undefined;
  return (
    <th
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      className={`py-2 pr-3 text-xs font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        title={`Sort by ${label}`}
        className={`flex items-center gap-1 transition-colors ${
          active ? "text-ink" : "text-ink-muted hover:text-ink"
        }`}
      >
        {label}
        <span aria-hidden="true" className={active ? "" : "opacity-30"}>
          {dir ? (dir === "asc" ? "▲" : "▼") : "▲"}
        </span>
      </button>
    </th>
  );
}

/** Previous estimates, kept in the browser's localStorage. */
export default function HistoryView() {
  const { entries, remove, clear } = useHistory();
  const compare = useCompareSelection();
  const [sort, setSort] = useState<Sort | null>(null);

  const handleSort = (key: SortKey) => {
    setSort((prev) =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  };

  const sortedEntries = useMemo(() => {
    if (!sort) return entries;
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...entries].sort((a, b) => {
      let diff: number;
      if (sort.key === "label") {
        diff = a.label.localeCompare(b.label);
      } else if (sort.key === "price") {
        diff = a.price - b.price;
      } else {
        diff = a.features[sort.key] - b.features[sort.key];
      }
      // Equal values keep their newest-first order.
      return diff !== 0 ? sign * diff : b.createdAt.localeCompare(a.createdAt);
    });
  }, [entries, sort]);

  if (entries.length === 0) {
    return (
      <section>
        <h1 className="text-2xl font-semibold text-ink">Estimate history</h1>
        <div className="mt-6">
          <EmptyState
            title="No estimates yet"
            body="Run an estimate — it is saved here automatically so you can review it later or compare it with other properties."
            href="/"
            linkLabel="Estimate a property"
          />
        </div>
      </section>
    );
  }

  const canCompare = compare.selected.length >= 2;
  const atLimit = compare.selected.length >= MAX_COMPARE;

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Estimate history</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {entries.length} saved {entries.length === 1 ? "estimate" : "estimates"} — stored in
            this browser only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clear} className="btn-secondary">
            Clear history
          </button>
          <Link
            href="/compare"
            aria-disabled={!canCompare}
            className={`btn-primary ${canCompare ? "" : "pointer-events-none opacity-50"}`}
          >
            Compare{compare.selected.length > 0 ? ` (${compare.selected.length})` : ""}
          </Link>
        </div>
      </header>

      {compare.selected.length === 1 && (
        <p className="mt-3 text-sm text-ink-muted">
          Select at least one more estimate to compare.
        </p>
      )}

      {atLimit && (
        <p className="mt-3 text-sm text-ink-muted">
          Comparison is limited to {MAX_COMPARE} properties — deselect one to add another.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-hairline bg-surface p-5">
        <div className="overflow-x-auto">
          <table className="min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-hairline text-left align-bottom">
                <SortableHeader
                  sortKey="label"
                  label="Property"
                  className="pr-4"
                  sort={sort}
                  onSort={handleSort}
                />
                {FEATURE_COLUMNS.map((col) => (
                  <SortableHeader
                    key={col.key}
                    sortKey={col.key}
                    label={col.label}
                    sort={sort}
                    onSort={handleSort}
                  />
                ))}
                <SortableHeader
                  sortKey="price"
                  label="Estimate price"
                  className="pr-4"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="py-2 text-right text-xs font-medium text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry) => {
                const isSelected = compare.selected.includes(entry.id);
                return (
                  <tr key={entry.id} className="border-b border-hairline last:border-0">
                    <td className="py-2 pr-4">
                      <span className="font-medium text-ink">{entry.label}</span>
                    </td>
                    {FEATURE_COLUMNS.map((col) => (
                      <td key={col.key} className="py-2 pr-3 tabular-nums text-ink-secondary">
                        {col.render(entry.features)}
                      </td>
                    ))}
                    <td className="py-2 pr-4 text-sm font-semibold text-good-ink">
                      {formatPrice(entry.price)}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex shrink-0 items-center justify-end gap-2">
                        <button
                          onClick={() => compare.toggle(entry.id)}
                          aria-pressed={isSelected}
                          disabled={atLimit && !isSelected}
                          title={
                            atLimit && !isSelected
                              ? `Comparison is limited to ${MAX_COMPARE} properties`
                              : undefined
                          }
                          className={`whitespace-nowrap px-3 py-1.5 text-xs ${
                            isSelected ? "btn-primary" : "btn-secondary"
                          } ${atLimit && !isSelected ? "opacity-50" : ""}`}
                        >
                          {isSelected ? "✓ In comparison" : "+ Compare"}
                        </button>
                        <button
                          onClick={() => {
                            remove(entry.id);
                            compare.remove(entry.id);
                          }}
                          className="btn-secondary whitespace-nowrap px-3 py-1.5 text-xs"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
