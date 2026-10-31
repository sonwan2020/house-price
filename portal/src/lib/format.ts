/** Formatting helpers shared across the portal. */

/** $251,000-style currency; defaults to no decimals (prices are already
 *  rounded to 1000s), pass fractionDigits to show decimals (e.g. 1 → $8,643.6). */
export function formatPrice(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Compact numbers for axis ticks: 0 / 1K / 2K / 1.2M. */
export function formatCompact(value: number): string {
  if (Math.abs(value) < 1000) return String(value);
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Plain number formatting, e.g. for table cells. */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

/** "Oct 28, 2026, 09:15" style timestamps for history entries. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
