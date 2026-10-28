/**
 * Estimate history and compare-selection persistence (browser localStorage).
 * All access is guarded for SSR, where window/localStorage do not exist.
 */
import type { HouseFeatures } from "./types";

/** One saved estimate. Only successful predictions are saved. */
export interface HistoryEntry {
  id: string;
  createdAt: string;
  /** User-supplied name, or "Property N" when the form label was empty. */
  label: string;
  features: HouseFeatures;
  price: number;
}

const HISTORY_KEY = "hsbc.house-price.history.v1";
const COMPARE_KEY = "hsbc.house-price.compare.v1";
const MAX_ENTRIES = 100;

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createHistoryEntry(
  features: HouseFeatures,
  price: number,
  label: string,
): HistoryEntry {
  return { id: newId(), createdAt: new Date().toISOString(), label, features, price };
}

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage can be unavailable (private mode) or full — history is best-effort.
  }
}

export function loadCompareSelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]).filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveCompareSelection(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(ids));
  } catch {
    // best-effort, same as history
  }
}
