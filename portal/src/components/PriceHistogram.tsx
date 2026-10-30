"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatCompact } from "@/lib/format";
import type { HistogramBin } from "@/lib/market";

/** Single-hue accent for all bins (one series; the title names it). */
const ACCENT = "#2a78d6";
const INK_PRIMARY = "#0b0b0b";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const AXIS = "#c3c2b7";

interface BinDatum {
  label: string;
  from: number;
  to: number;
  count: number;
}

function ChartTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const row = payload?.[0]?.payload as BinDatum | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 shadow-md">
      <p className="text-sm font-medium text-ink">
        {formatPrice(row.from)} – {formatPrice(row.to)}
      </p>
      <p className="mt-1 text-sm text-ink-secondary">
        {row.count} {row.count === 1 ? "property" : "properties"}
      </p>
    </div>
  );
}

function formatPrice(value: number): string {
  return `$${formatCompact(value)}`;
}

/**
 * Histogram of property prices (one bin per price range). Single series:
 * all bins share the accent hue. Mark specs follow the dataviz system —
 * thin bars, rounded data-ends, hairline grid, muted axes, per-bar hover
 * tooltip with the exact range and count.
 */
export default function PriceHistogram({ bins }: { bins: HistogramBin[] }) {
  if (bins.length === 0) return null;

  const rows: BinDatum[] = bins.map((bin) => ({
    label: `${formatPrice(bin.from)}–${formatPrice(bin.to)}`,
    from: bin.from,
    to: bin.to,
    count: bin.count,
  }));
  const maxCount = Math.max(...rows.map((r) => r.count));
  const domainMax = Math.max(1, Math.ceil(maxCount * 1.2));
  const aria = `Histogram of property prices: ${rows
    .map((r) => `${r.label} ${r.count}`)
    .join("; ")}.`;

  return (
    <div role="img" aria-label={aria}>
      <ResponsiveContainer width="100%" height={264}>
        <BarChart
          data={rows}
          margin={{ top: 24, right: 16, bottom: 4, left: 8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} stroke={GRIDLINE} strokeWidth={1} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            interval={0}
          />
          <YAxis
            width={40}
            tickLine={false}
            axisLine={false}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            allowDecimals={false}
            domain={[0, domainMax]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11, 11, 11, 0.04)" }} />
          <Bar
            dataKey="count"
            name="Properties"
            fill={ACCENT}
            barSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="count"
              position="top"
              offset={6}
              fill={INK_PRIMARY}
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
