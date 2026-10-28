import type { ModelInfo } from "@/lib/types";
import { formatPrice } from "@/lib/format";

/**
 * Model context loaded by the home page server component (React Server
 * Component initial data load). Renders the model's training metrics as
 * small stat tiles; degrades to a notice when the API is offline.
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
  const tiles = [
    { label: "Model", value: `${modelInfo.model} v${modelInfo.model_version}` },
    { label: "R² (cross-validated)", value: cv?.r2 != null ? cv.r2.toFixed(3) : "—" },
    { label: "RMSE", value: cv?.rmse != null ? formatPrice(Math.round(cv.rmse)) : "—" },
    { label: "MAE", value: cv?.mae != null ? formatPrice(Math.round(cv.mae)) : "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg border border-hairline bg-surface px-4 py-3">
          <p className="text-xs text-ink-muted">{tile.label}</p>
          <p className="mt-0.5 text-lg font-semibold text-ink">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}
