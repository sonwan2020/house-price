"use client";

import Link from "next/link";
import { formatNumber, formatPrice } from "@/lib/format";
import { baselineToQuery, type MarketListing, type ListingsPage } from "@/lib/market";

/** Sortable columns; keys match the market-api sort_by values. */
const COLUMNS: { key: string; label: string; render: (l: MarketListing) => string }[] = [
  { key: "id", label: "ID", render: (l) => String(l.id) },
  { key: "square_footage", label: "Square footage", render: (l) => formatNumber(l.square_footage) },
  { key: "bedrooms", label: "Bedrooms", render: (l) => String(l.bedrooms) },
  { key: "bathrooms", label: "Bathrooms", render: (l) => formatNumber(l.bathrooms, 1) },
  { key: "year_built", label: "Year built", render: (l) => String(l.year_built) },
  { key: "lot_size", label: "Lot size", render: (l) => formatNumber(l.lot_size) },
  { key: "distance_to_city_center", label: "Distance to centre (miles)", render: (l) => formatNumber(l.distance_to_city_center, 1) },
  { key: "school_rating", label: "School rating", render: (l) => formatNumber(l.school_rating, 1) },
  { key: "price", label: "Price", render: (l) => formatPrice(l.price) },
];

const PAGE_SIZES = [10, 25, 50];

/**
 * Server-driven data table (a.v): column sorting and paging are handled
 * by the market-api so the contract works beyond the demo dataset. Scrolls
 * horizontally on narrow screens.
 *
 * Rows are click-selectable (single selection): the selected row is
 * highlighted and shows an inline "What-if analysis" button that opens the
 * what-if tool with this listing as the baseline. Clicking the selected
 * row again clears the selection.
 */
export default function MarketDataTable({
  page,
  loading,
  sortBy,
  sortDir,
  selectedId,
  onSort,
  onPageChange,
  onSizeChange,
  onSelect,
}: {
  page: ListingsPage | null;
  loading: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
  selectedId: number | null;
  onSort: (key: string) => void;
  onPageChange: (next: number) => void;
  onSizeChange: (size: number) => void;
  onSelect: (id: number | null) => void;
}) {
  const total = page?.total ?? 0;
  const rows = page?.listings ?? [];
  const size = page?.size ?? 25;
  const current = page?.page ?? 0;
  const from = total === 0 ? 0 : current * size + 1;
  const to = Math.min((current + 1) * size, total);
  const pages = Math.max(1, Math.ceil(total / size));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left align-bottom">
              {COLUMNS.map((column) => {
                const active = column.key === sortBy;
                return (
                  <th
                    key={column.key}
                    aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    className="px-1 py-2 pr-4 first:pl-0"
                  >
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      title={`Sort by ${column.label}`}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                        active ? "text-ink" : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      {column.label}
                      <span aria-hidden="true" className={active ? "" : "opacity-30"}>
                        {active ? (sortDir === "asc" ? "▲" : "▼") : "▲"}
                      </span>
                    </button>
                  </th>
                );
              })}
              <th aria-label="Actions" className="py-2 pr-0" />
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-8 text-center text-sm text-ink-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-8 text-center text-sm text-ink-muted">
                  No listings match the selected filters.
                </td>
              </tr>
            )}
            {rows.map((listing) => {
              const selected = listing.id === selectedId;
              const toggle = () => onSelect(selected ? null : listing.id);
              return (
                <tr
                  key={listing.id}
                  aria-selected={selected}
                  tabIndex={0}
                  onClick={toggle}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggle();
                    }
                  }}
                  className={`cursor-pointer border-b border-hairline transition-colors last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 ${
                    selected ? "bg-accent/10 hover:bg-accent/10" : "hover:bg-accent/5"
                  }`}
                >
                  {COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`px-1 py-2 pr-4 tabular-nums first:pl-0 ${
                        column.key === "price" ? "text-sm font-semibold text-ink" : "text-ink-secondary"
                      }`}
                    >
                      {column.render(listing)}
                    </td>
                  ))}
                  <td className="py-2 pr-0 text-right">
                    {selected && (
                      <Link
                        href={`/market/what-if${baselineToQuery(listing)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="btn-primary whitespace-nowrap px-3 py-1 text-xs"
                      >
                        What-if analysis
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-muted">
          {total === 0 ? "0 listings" : `${from}–${to} of ${total} listings`}
        </p>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-ink-secondary">
            Rows
            <select
              value={size}
              onChange={(e) => onSizeChange(Number(e.target.value))}
              className="field-input w-auto px-2 py-1"
            >
              {PAGE_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => onPageChange(current - 1)}
            disabled={current <= 0}
            className="btn-secondary px-3 py-1 text-xs"
          >
            ← Prev
          </button>
          <span className="text-xs tabular-nums text-ink-secondary">
            Page {current + 1} of {pages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(current + 1)}
            disabled={current + 1 >= pages}
            className="btn-secondary px-3 py-1 text-xs"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
