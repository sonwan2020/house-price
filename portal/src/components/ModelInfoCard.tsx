import type { ModelInfo } from "@/lib/types";
import { formatPrice } from "@/lib/format";

/** What each cross-validated metric means, shown in the ⓘ tooltips. */
const METRIC_HELP = {
  r2: "R² (coefficient of determination) — the share of the price variation the model explains. 1.0 is a perfect fit; 0 means it does no better than always predicting the average price.",
  mae: "MAE (mean absolute error) — the average gap between predicted and actual prices, in dollars. About half of predictions land closer than this, half farther.",
  rmse: "RMSE (root mean squared error) — the typical prediction error, in dollars. Large misses are weighted more than in MAE, so RMSE is always at least as large.",
} as const;

/**
 * Small "i" badge with a hover/focus tooltip explaining the metric. Pure
 * CSS (no client JS): the tooltip shows on hover or when the badge has
 * keyboard focus, and the text is also exposed as the badge's aria-label.
 */
function InfoMark({ text }: { text: string }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <span
        tabIndex={0}
        role="note"
        aria-label={text}
        className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-hairline text-[10px] font-semibold leading-none text-ink-muted transition-colors hover:border-ink-muted hover:text-ink-secondary focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        i
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-56 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-xs font-normal leading-snug text-page shadow-lg group-focus-within:block group-hover:block"
      >
        {text}
      </span>
    </span>
  );
}

/**
 * Model context card on the Model page (React Server Component data load).
 * Renders the model's cross-validated training metrics as small stat tiles,
 * in the order R², MAE, RMSE, each with an info mark explaining the metric;
 * degrades to a notice when the API is offline.
 */
export default function ModelInfoCard({ modelInfo }: { modelInfo: ModelInfo | null }) {
  if (!modelInfo) {
    return (
      <div
        role="status"
        className="rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-ink-secondary"
      >
        Model information is unavailable — the prediction API appears to be offline.
        The form will work again once the service is back.
      </div>
    );
  }

  const cv = modelInfo.metrics?.cv;
  const tiles: { label: string; value: string; help?: string }[] = [
    { label: "Model", value: `${modelInfo.model} v${modelInfo.model_version}` },
    {
      label: "R²",
      value: cv?.r2 != null ? cv.r2.toFixed(3) : "—",
      help: METRIC_HELP.r2,
    },
    {
      label: "MAE",
      value: cv?.mae != null ? formatPrice(cv.mae, 1) : "—",
      help: METRIC_HELP.mae,
    },
    {
      label: "RMSE",
      value: cv?.rmse != null ? formatPrice(cv.rmse, 1) : "—",
      help: METRIC_HELP.rmse,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-hairline bg-surface px-4 py-3">
            <p className="text-xs text-ink-muted">
              {tile.label}
              {tile.help && <InfoMark text={tile.help} />}
            </p>
            <p className="mt-0.5 text-lg font-semibold text-ink">{tile.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        R², MAE and RMSE are cross-validated: the training data is split into five folds,
        and the model is trained on four then scored on the held-out fifth — repeated five
        times, so every score is on houses the model never trained on.
      </p>
    </div>
  );
}
