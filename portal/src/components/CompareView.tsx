"use client";

import { useCompareSelection } from "@/hooks/useCompareSelection";
import { useHistory } from "@/hooks/useHistory";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import type { HistoryEntry } from "@/lib/history";
import EmptyState from "./EmptyState";
import PriceBarChart from "./PriceBarChart";

/** Rows of the side-by-side table; the first row is emphasised. */
const ROWS: { key: string; label: string; render: (entry: HistoryEntry) => string }[] = [
  { key: "price", label: "Estimated price", render: (e) => formatPrice(e.price) },
  { key: "created", label: "Estimated at", render: (e) => formatDateTime(e.createdAt) },
  { key: "square_footage", label: "Square footage (sq ft)", render: (e) => formatNumber(e.features.square_footage) },
  { key: "bedrooms", label: "Bedrooms", render: (e) => String(e.features.bedrooms) },
  { key: "bathrooms", label: "Bathrooms", render: (e) => formatNumber(e.features.bathrooms, 1) },
  { key: "year_built", label: "Year built", render: (e) => String(e.features.year_built) },
  { key: "lot_size", label: "Lot size (sq ft)", render: (e) => formatNumber(e.features.lot_size) },
  { key: "distance_to_city_center", label: "Distance to city centre (miles)", render: (e) => formatNumber(e.features.distance_to_city_center, 1) },
  { key: "school_rating", label: "School rating", render: (e) => formatNumber(e.features.school_rating, 1) },
];

/**
 * Side-by-side analysis of the estimates selected in history: a price
 * comparison chart plus a feature table (oldest estimate first).
 */
export default function CompareView() {
  const { entries } = useHistory();
  const { selected, remove, clear } = useCompareSelection();

  const chosen = selected
    .map((id) => entries.find((e) => e.id === id))
    .filter((e): e is HistoryEntry => Boolean(e))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Compare properties</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Side-by-side view of the estimates you selected in history.
          </p>
        </div>
        {chosen.length > 0 && (
          <button onClick={clear} className="btn-secondary">
            Clear selection
          </button>
        )}
      </header>

      {chosen.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Nothing selected"
            body='Use "+ Compare" on the History page to pick at least two estimates, then come back here to analyse them side by side.'
            href="/history"
            linkLabel="Go to history"
          />
        </div>
      )}

      {chosen.length === 1 && (
        <div className="mt-6">
          <EmptyState
            title="One more to go"
            body="Comparing needs at least two estimates — select another property in history."
            href="/history"
            linkLabel="Go to history"
          />
        </div>
      )}

      {chosen.length >= 2 && (
        <div className="mt-6 space-y-6">
          <div className="viz-root rounded-lg border border-hairline bg-surface p-5">
            <h2 className="text-sm font-medium text-ink-secondary">Predicted prices</h2>
            <div className="mt-3">
              <PriceBarChart
                data={chosen.map((e) => ({ id: e.id, label: e.label, value: e.price }))}
              />
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-surface p-5">
            <h2 className="text-sm font-medium text-ink-secondary">Property details</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left align-bottom">
                    <th className="py-2 pr-4 text-xs font-medium text-ink-muted">Property</th>
                    {chosen.map((entry) => (
                      <th key={entry.id} className="py-2 pr-4">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-ink">{entry.label}</span>
                          <button
                            onClick={() => remove(entry.id)}
                            aria-label={`Remove ${entry.label} from comparison`}
                            className="text-xs text-ink-muted transition-colors hover:text-critical"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, rowIndex) => (
                    <tr key={row.key} className="border-b border-hairline last:border-0">
                      <th scope="row" className="py-2 pr-4 text-left font-medium text-ink-secondary">
                        {row.label}
                      </th>
                      {chosen.map((entry) => (
                        <td
                          key={entry.id}
                          className={`py-2 pr-4 tabular-nums ${
                            rowIndex === 0 ? "text-base font-semibold text-ink" : "text-ink-secondary"
                          }`}
                        >
                          {row.render(entry)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
