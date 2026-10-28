"use client";

import { formatNumber, formatPrice } from "@/lib/format";
import type { HouseInfo, PredictResponse } from "@/lib/types";
import PriceBarChart, { type ChartDatum } from "./PriceBarChart";

interface ResultsPanelProps {
  response: PredictResponse;
  /** The submitted items, aligned with `predicts` by index. */
  items: HouseInfo[];
  savedIndexes: Set<number>;
  onSave: (index: number) => void;
  onSaveAll: () => void;
  onReset: () => void;
}

type Tone = "neutral" | "good" | "warning" | "critical";

function Chip({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const styles: Record<Tone, string> = {
    neutral: "bg-ink/5 text-ink-secondary",
    good: "bg-good/10 text-good-ink",
    warning: "bg-warning/15 text-[#7a5200]",
    critical: "bg-critical/10 text-critical",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/**
 * Results of one prediction round: summary chips, a hero figure for a
 * single estimate (a one-bar chart would be noise) or a bar chart for a
 * batch, and the full tabular view with save-to-history actions.
 */
export default function ResultsPanel({
  response,
  items,
  savedIndexes,
  onSave,
  onSaveAll,
  onReset,
}: ResultsPanelProps) {
  const { summary, predicts } = response;
  const succeeded = predicts.filter((p) => p.reason === "" && p.price > 0);
  const partial = summary.failed > 0 && summary.succeed > 0;
  const unsavedCount = succeeded.filter((p) => !savedIndexes.has(p.index)).length;

  const chartData: ChartDatum[] = succeeded.map((p) => {
    const item = items[p.index];
    return {
      id: `result-${p.index}`,
      label: item?.id?.trim() || `Property ${p.index + 1}`,
      value: p.price,
    };
  });

  return (
    <section className="rounded-lg border border-hairline bg-surface p-5" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">Results</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="neutral">Total {summary.total}</Chip>
          <Chip tone="good">✓ {summary.succeed} predicted</Chip>
          {summary.failed > 0 && <Chip tone="critical">✕ {summary.failed} failed</Chip>}
          <button
            onClick={onReset}
            className="text-xs text-ink-muted underline transition-colors hover:text-ink"
          >
            Start over
          </button>
        </div>
      </div>

      {partial && (
        <p className="mt-3 text-sm text-ink-secondary">
          ⚠ Some properties failed validation on the server — see the reason in the table below.
        </p>
      )}

      {succeeded.length === 1 && (
        <div className="mt-4 rounded-lg border border-hairline bg-page p-5">
          <p className="text-sm text-ink-secondary">Estimated price</p>
          <p className="mt-1 text-5xl font-semibold text-ink">
            {formatPrice(succeeded[0].price)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">{chartData[0].label}</p>
        </div>
      )}

      {succeeded.length >= 2 && (
        <div className="viz-root mt-4 rounded-lg border border-hairline bg-page p-4">
          <h3 className="text-sm font-medium text-ink-secondary">Estimated prices</h3>
          <div className="mt-3">
            <PriceBarChart data={chartData} />
          </div>
        </div>
      )}

      {unsavedCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-page px-3 py-2">
          <p className="text-sm text-ink-secondary">
            Save estimates to this browser&apos;s history to review or compare them later.
          </p>
          <button onClick={onSaveAll} className="btn-secondary px-3 py-1.5 text-xs">
            Save all ({unsavedCount})
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 text-right font-medium">Sq ft</th>
              <th className="py-2 pr-3 text-right font-medium">Bedrooms</th>
              <th className="py-2 pr-3 text-right font-medium">Bathrooms</th>
              <th className="py-2 pr-3 text-right font-medium">Year built</th>
              <th className="py-2 pr-3 text-right font-medium">Lot (sq ft)</th>
              <th className="py-2 pr-3 text-right font-medium">Distance (mi)</th>
              <th className="py-2 pr-3 text-right font-medium">School</th>
              <th className="py-2 pr-3 text-right font-medium">Estimated price</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {predicts.map((p) => {
              const item = items[p.index];
              const ok = p.reason === "" && p.price > 0;
              return (
                <tr key={p.index} className="border-b border-hairline align-top last:border-0">
                  <td className="py-2 pr-3 tabular-nums text-ink-secondary">{p.index + 1}</td>
                  <td className="py-2 pr-3 text-ink">
                    {item?.id?.trim() || `Property ${p.index + 1}`}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.square_footage) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.bedrooms) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.bathrooms, 1) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.year_built) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.lot_size) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.distance_to_city_center, 1) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-ink-secondary">
                    {item ? formatNumber(item.school_rating, 1) : "—"}
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-ink">
                    {ok ? formatPrice(p.price) : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {ok ? (
                      <span className="text-good-ink">✓ Predicted</span>
                    ) : (
                      <span className="text-critical">✕ {p.reason}</span>
                    )}
                  </td>
                  <td className="py-2">
                    {ok &&
                      (savedIndexes.has(p.index) ? (
                        <span className="text-good-ink">Saved ✓</span>
                      ) : (
                        <button
                          onClick={() => onSave(p.index)}
                          className="btn-secondary px-2.5 py-1 text-xs"
                        >
                          Save
                        </button>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
