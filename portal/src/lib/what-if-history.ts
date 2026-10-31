/**
 * What-if run history (browser localStorage): each saved run keeps its
 * baseline, the single-feature changes and the predicted outcomes, so the
 * history table can highlight what moved vs the baseline and the export
 * window can hand the runs to the market-api export endpoint.
 */
import type { HouseFeatures } from "./types";
import type { FieldName } from "./validation";
import { newId } from "./history";
import { formatDateTime } from "./format";

/** One scenario as saved in history: a single-feature change plus its outcome. */
export interface WhatIfHistoryScenario {
  name: string;
  feature: FieldName;
  /** Baseline value of the changed feature. */
  from: number;
  /** New value of the changed feature. */
  to: number;
  price: number;
  delta: number | null;
  reason: string;
}

/** One what-if run saved after a prediction batch. */
export interface WhatIfHistoryEntry {
  id: string;
  createdAt: string;
  baseline: HouseFeatures;
  baselinePrice: number;
  scenarios: WhatIfHistoryScenario[];
}

/** One run in the POST /api/v1/market/export/what-if body (snake_case JSON). */
export interface WhatIfExportRun {
  label: string;
  created_at: string;
  baseline: HouseFeatures;
  baseline_price: number;
  scenarios: {
    name: string;
    changes: Record<string, number>;
    price: number;
    delta: number | null;
    reason: string;
  }[];
}

const HISTORY_KEY = "hsbc.what-if-history.v1";
const MAX_ENTRIES = 50;

export function createWhatIfHistoryEntry(
  run: Omit<WhatIfHistoryEntry, "id" | "createdAt">,
): WhatIfHistoryEntry {
  return { id: newId(), createdAt: new Date().toISOString(), ...run };
}

export function loadWhatIfHistory(): WhatIfHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WhatIfHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveWhatIfHistory(entries: WhatIfHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage can be unavailable (private mode) or full — history is best-effort.
  }
}

/** Convert saved entries into the market-api export body (snake_case). */
export function toExportRuns(entries: WhatIfHistoryEntry[]): WhatIfExportRun[] {
  return entries.map((entry) => ({
    label: formatDateTime(entry.createdAt),
    created_at: entry.createdAt,
    baseline: entry.baseline,
    baseline_price: entry.baselinePrice,
    scenarios: entry.scenarios.map((scenario) => ({
      name: scenario.name,
      changes: { [scenario.feature]: scenario.to },
      price: scenario.price,
      delta: scenario.delta,
      reason: scenario.reason,
    })),
  }));
}
