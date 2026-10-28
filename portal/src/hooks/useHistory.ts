"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type HistoryEntry,
  createHistoryEntry,
  loadHistory,
  saveHistory,
} from "@/lib/history";
import type { HouseFeatures } from "@/lib/types";

/**
 * Shared hook for the estimate history. Reads localStorage once on mount
 * (client-only), then keeps the in-memory list and storage in sync.
 */
export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  const add = useCallback(
    (features: HouseFeatures, price: number, label: string) => {
      const entry = createHistoryEntry(features, price, label);
      setEntries((prev) => {
        const next = [entry, ...prev];
        saveHistory(next);
        return next;
      });
      return entry;
    },
    [],
  );

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    saveHistory([]);
  }, []);

  return { entries, add, remove, clear };
}
