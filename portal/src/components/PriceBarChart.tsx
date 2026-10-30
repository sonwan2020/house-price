"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatCompact, formatPrice } from "@/lib/format";

/** One bar per property. The stable id drives the colour slot so colours
 * follow the entity, never its position in the current list. */
export interface ChartDatum {
  id: string;
  label: string;
  value: number;
}

/** Validated categorical slots, light mode (dataviz palette). */
const CATEGORICAL = [
  "#2a78d6", "#eb6834", "#1baf7a", "#eda100",
  "#e87ba4", "#008300", "#6250d6", "#e34948",
];
const INK_PRIMARY = "#0b0b0b";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const AXIS = "#c3c2b7";

function slotFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return hash % CATEGORICAL.length;
}

/** Assign colours per entity; rare collisions take the next free slot. */
function assignColours(data: ChartDatum[]): Map<string, string> {
  const colours = new Map<string, string>();
  const used = new Set<string>();
  for (const datum of data) {
    let slot = slotFor(datum.id);
    while (used.has(CATEGORICAL[slot])) slot = (slot + 1) % CATEGORICAL.length;
    used.add(CATEGORICAL[slot]);
    colours.set(datum.id, CATEGORICAL[slot]);
  }
  return colours;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

/** Recharts injects the tooltip props at render time; they are optional here
 * so the component can be mounted as `<ChartTooltip />`. */
function ChartTooltip({
  active,
  payload,
  metricLabel,
}: Partial<TooltipContentProps<number, string>> & { metricLabel: string }) {
  const row = payload?.[0]?.payload as (ChartDatum & { color?: string }) | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: row.color }}
        />
        <span className="text-sm font-medium text-ink">{row.label}</span>
      </div>
      <p className="mt-1 text-sm text-ink-secondary">
        {metricLabel}{" "}
        <span className="font-semibold tabular-nums text-ink">{formatPrice(row.value)}</span>
      </p>
    </div>
  );
}

/**
 * Bar chart of prices by entity. Mark specs follow the dataviz system:
 * thin bars (24px) with rounded data-ends, hairline grid, muted axes,
 * direct value labels at the tips, and a legend whenever more than one
 * entity is drawn (single-entity callers render a stat tile instead).
 */
export default function PriceBarChart({
  data,
  metricLabel = "Estimated price",
}: {
  data: ChartDatum[];
  /** Name of the measured quantity, used in the tooltip and aria text. */
  metricLabel?: string;
}) {
  if (data.length === 0) return null;

  const colours = assignColours(data);
  const rows = data.map((d) => ({ ...d, color: colours.get(d.id) ?? CATEGORICAL[0] }));
  const maxValue = Math.max(...rows.map((r) => r.value));
  const domainMax = Math.ceil((maxValue * 1.15) / 1000) * 1000;
  const aria = `Bar chart of ${metricLabel}: ${rows
    .map((r) => `${r.label} ${formatPrice(r.value)}`)
    .join("; ")}.`;

  return (
    <div role="img" aria-label={aria}>
      <ResponsiveContainer width="100%" height={288}>
        <BarChart
          data={rows}
          margin={{ top: 28, right: 16, bottom: 4, left: 8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} stroke={GRIDLINE} strokeWidth={1} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: AXIS }}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            tickFormatter={(label: string) => truncate(label, 12)}
            interval={0}
          />
          <YAxis
            width={62}
            tickLine={false}
            axisLine={false}
            tick={{ fill: INK_MUTED, fontSize: 12 }}
            tickFormatter={(value: number) => `$${formatCompact(value)}`}
            domain={[0, domainMax]}
          />
          <Tooltip
            content={<ChartTooltip metricLabel={metricLabel} />}
            cursor={{ fill: "rgba(11, 11, 11, 0.04)" }}
          />
          <Bar
            dataKey="value"
            name={metricLabel}
            barSize={24}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell key={row.id} fill={row.color} />
            ))}
          </Bar>
          <LabelList
            dataKey="value"
            position="top"
            offset={8}
            formatter={(value: unknown) => `$${formatCompact(Number(value))}`}
            fill={INK_PRIMARY}
            fontSize={12}
            fontWeight={600}
          />
        </BarChart>
      </ResponsiveContainer>
      {rows.length >= 2 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {rows.map((row) => (
            <span key={row.id} className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: row.color }}
              />
              {row.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
