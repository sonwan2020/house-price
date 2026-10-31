"use client";

import Link from "next/link";
import { MAX_COMPARE, useCompareSelection } from "@/hooks/useCompareSelection";
import { useHistory } from "@/hooks/useHistory";
import { formatNumber, formatPrice } from "@/lib/format";
import type { HouseFeatures } from "@/lib/types";
import EmptyState from "./EmptyState";

/** Feature columns of the table, formatted the same way as the compare
 * table. Headers with a unit wrap to two lines: the name on top, the
 * parenthesised unit below, so columns can stay narrow. */
const FEATURE_COLUMNS: {
  key: keyof HouseFeatures;
  label: string;
  unit?: string;
  render: (f: HouseFeatures) => string;
}[] = [
  { key: "square_footage", label: "Square footage", unit: "sq ft", render: (f) => formatNumber(f.square_footage) },
  { key: "bedrooms", label: "Bedrooms", render: (f) => String(f.bedrooms) },
  { key: "bathrooms", label: "Bathrooms", render: (f) => formatNumber(f.bathrooms, 1) },
  { key: "year_built", label: "Year built", render: (f) => String(f.year_built) },
  { key: "lot_size", label: "Lot size", unit: "sq ft", render: (f) => formatNumber(f.lot_size) },
  { key: "distance_to_city_center", label: "Distance", unit: "miles", render: (f) => formatNumber(f.distance_to_city_center, 1) },
  { key: "school_rating", label: "School rating", render: (f) => formatNumber(f.school_rating, 1) },
];

/** Previous estimates, kept in the browser's localStorage. */
export default function HistoryView() {
  const { entries, remove, clear } = useHistory();
  const compare = useCompareSelection();

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
                <th className="py-2 pr-4 text-xs font-medium text-ink-muted">Property</th>
                {FEATURE_COLUMNS.map((col) => (
                  <th key={col.key} className="py-2 pr-3 text-xs font-medium text-ink-muted">
                    <span className="block">{col.label}</span>
                    {col.unit && (
                      <span className="block text-[10px] font-normal">({col.unit})</span>
                    )}
                  </th>
                ))}
                <th className="py-2 pr-4 text-xs font-medium text-ink-muted">Estimate price</th>
                <th className="py-2 text-right text-xs font-medium text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
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
