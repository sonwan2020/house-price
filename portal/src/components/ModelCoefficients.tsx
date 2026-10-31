import { fetchModelInfo } from "@/lib/api";
import { FIELD_DEFS } from "@/lib/validation";
import { formatPrice } from "@/lib/format";

/** Display labels and $/unit denominators for the seven feature dimensions. */
const LABELS: Record<string, string> = Object.fromEntries(
  FIELD_DEFS.map((field) => [field.name, field.label]),
);

const UNITS: Record<string, string> = {
  square_footage: "sq ft",
  bedrooms: "bedroom",
  bathrooms: "bathroom",
  year_built: "year of build",
  lot_size: "sq ft",
  distance_to_city_center: "mile",
  school_rating: "rating point",
};

/** Signed money; small coefficients keep one decimal (e.g. +$6.7 per sq ft). */
function signed(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  const abs = Math.abs(value);
  return sign + (abs >= 100 ? formatPrice(Math.round(abs)) : `$${abs.toFixed(1)}`);
}

/**
 * Server component: the trained model's per-dimension coefficients, sorted
 * by impact. Explains what each what-if change is worth — the scenario
 * delta is the sum of these per-unit moves, all other dimensions held
 * constant.
 */
export default async function ModelCoefficients() {
  const modelInfo = await fetchModelInfo().catch(() => null);
  if (!modelInfo) return null;

  const entries = Object.entries(modelInfo.coefficients.features).sort(
    ([, a], [, b]) => Math.abs(b) - Math.abs(a),
  );
  const intercept = modelInfo.coefficients.intercept;

  return (
    <div className="rounded-lg border border-hairline bg-surface p-5">
      <h2 className="text-sm font-semibold text-ink">Model coefficients</h2>
      <p className="mt-1 text-xs text-ink-muted">
        What each dimension is worth in the {modelInfo.model} model — the predicted price
        moves by this amount per unit, with every other dimension held constant.
      </p>
      {/* Auto table layout: each column is as wide as its longest cell, so
          the table hugs its text instead of stretching to the card width. */}
      <table className="mt-2 border-collapse text-sm">
        <tbody>
          {entries.map(([name, value]) => (
            <tr key={name} className="border-b border-hairline">
              <td className="whitespace-nowrap py-1.5 pr-8 text-ink-secondary">
                {LABELS[name] ?? name}{" "}
                <span className="text-ink-muted">per {UNITS[name] ?? "unit"}</span>
              </td>
              <td
                className={`whitespace-nowrap py-1.5 text-right font-semibold tabular-nums ${
                  value >= 0 ? "text-good-ink" : "text-critical"
                }`}
              >
                {signed(value)}
              </td>
            </tr>
          ))}
          <tr className="border-b border-hairline">
            <td className="whitespace-nowrap py-1.5 pr-8 text-ink-secondary">
              Base value <span className="text-ink-muted">(intercept)</span>
            </td>
            {/* The intercept is a mathematical offset, not a feature — the
                sign constraint does not apply to it, so it stays neutral. */}
            <td className="whitespace-nowrap py-1.5 text-right font-semibold tabular-nums text-ink">
              {signed(intercept)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-xs text-ink-muted">
        A scenario&apos;s delta is the sum of these per-unit moves for the changed dimensions;
        predicted prices are rounded to the nearest $1,000.
      </p>
    </div>
  );
}
