"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatCompact, formatPrice } from "@/lib/format";
import type { ScenarioOutcome } from "@/lib/market";

/**
 * Polarity colours: gains use the good ink, losses the critical red,
 * a zero delta the muted ink. Colours carry the sign (not entity
 * identity), which the side legend explains — never colour alone.
 */
const POSITIVE = "#006300";
const NEGATIVE = "#d03b3b";
const ZERO = "#898781";
const INK_PRIMARY = "#0b0b0b";
const INK_MUTED = "#898781";
const GRIDLINE = "#e1e0d9";
const AXIS = "#c3c2b7";

interface DeltaDatum {
  name: string;
  delta: number;
  price: number;
  color: string;
}

function signed(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}$${formatCompact(Math.abs(value))}`;
}

function ChartTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  const row = payload?.[0]?.payload as DeltaDatum | undefined;
  if (!active || !row) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface px-3 py-2 shadow-md">
      <span className="text-sm font-medium text-ink">{row.name}</span>
      <p className="mt-1 text-sm text-ink-secondary">
        Change <span className="font-semibold tabular-nums">{signed(row.delta)}</span>
      </p>
      <p className="text-sm text-ink-secondary">
        New price <span className="font-semibold tabular-nums text-ink">{formatPrice(row.price)}</span>
      </p>
    </div>
  );
}

/**
 * Delta-vs-baseline bars for what-if scenarios. Diverging by sign around
 * a zero reference line; direct labels carry the sign, so the colour is
 * reinforced by text. Scenarios whose prediction failed are not drawn.
 */
export default function DeltaBarChart({ scenarios }: { scenarios: ScenarioOutcome[] }) {
  const rows: DeltaDatum[] = scenarios
    .filter((s) => s.delta !== null)
    .map((s) => ({
      name: s.name,
      delta: s.delta ?? 0,
      price: s.price,
      color: (s.delta ?? 0) > 0 ? POSITIVE : s.delta === 0 ? ZERO : NEGATIVE,
    }));
  if (rows.length === 0) return null;

  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 1000);
  const domainMax = Math.ceil((maxAbs * 1.2) / 1000) * 1000;
  const aria = `Bar chart of price changes: ${rows
    .map((r) => `${r.name} ${signed(r.delta)}`)
    .join("; ")}.`;

  return (
    <div>
      <div role="img" aria-label={aria}>
        <ResponsiveContainer width="100%" height={288}>
          <BarChart
            data={rows}
            margin={{ top: 28, right: 16, bottom: 4, left: 8 }}
            barCategoryGap="22%"
          >
            <CartesianGrid vertical={false} stroke={GRIDLINE} strokeWidth={1} />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={{ stroke: AXIS }}
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              interval={0}
            />
            <YAxis
              width={62}
              tickLine={false}
              axisLine={false}
              tick={{ fill: INK_MUTED, fontSize: 12 }}
              tickFormatter={(value: number) => `$${formatCompact(value)}`}
              domain={[-domainMax, domainMax]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(11, 11, 11, 0.04)" }} />
            <ReferenceLine y={0} stroke={AXIS} strokeWidth={1} />
            <Bar dataKey="delta" name="Price change" barSize={24} radius={[4, 4, 4, 4]} isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.name} fill={row.color} />
              ))}
              <LabelList
                dataKey="delta"
                position="top"
                offset={8}
                formatter={(value: unknown) => signed(Number(value))}
                fill={INK_PRIMARY}
                fontSize={12}
                fontWeight={600}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: POSITIVE }} />
          Price increase
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: NEGATIVE }} />
          Price decrease
        </span>
      </div>
    </div>
  );
}
