"use client";

import Link from "next/link";
import { useCompareSelection } from "@/hooks/useCompareSelection";
import { useHistory } from "@/hooks/useHistory";
import { formatDateTime, formatNumber, formatPrice } from "@/lib/format";
import type { HistoryEntry } from "@/lib/history";
import EmptyState from "./EmptyState";

function featureSummary(entry: HistoryEntry): string {
  const f = entry.features;
  return (
    `${formatNumber(f.square_footage)} sq ft · ${f.bedrooms} bd · ` +
    `${formatNumber(f.bathrooms, 1)} ba · built ${f.year_built} · ` +
    `${formatNumber(f.distance_to_city_center, 1)} mi from centre`
  );
}

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
            body="Run an estimate and save it — it will appear here so you can review it later or compare it with other properties."
            href="/"
            linkLabel="Estimate a property"
          />
        </div>
      </section>
    );
  }

  const canCompare = compare.selected.length >= 2;

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

      <ul className="mt-6 space-y-3">
        {entries.map((entry) => {
          const isSelected = compare.selected.includes(entry.id);
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border border-hairline bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <h2 className="font-medium text-ink">{entry.label}</h2>
                  <span className="text-xs text-ink-muted">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-ink-secondary">{featureSummary(entry)}</p>
              </div>
              <p className="text-xl font-semibold tabular-nums text-ink">
                {formatPrice(entry.price)}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => compare.toggle(entry.id)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 text-xs ${
                    isSelected ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {isSelected ? "✓ In comparison" : "+ Compare"}
                </button>
                <button
                  onClick={() => {
                    remove(entry.id);
                    compare.remove(entry.id);
                  }}
                  className="btn-secondary px-3 py-1.5 text-xs hover:border-critical hover:text-critical"
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
