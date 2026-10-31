"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type WhatIfHistoryEntry,
  createWhatIfHistoryEntry,
  loadWhatIfHistory,
  saveWhatIfHistory,
} from "@/lib/what-if-history";

/**
 * Shared hook for the what-if run history. Reads localStorage once on
 * mount (client-only), then keeps the in-memory list and storage in sync.
 */
export function useWhatIfHistory() {
  const [entries, setEntries] = useState<WhatIfHistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadWhatIfHistory());
  }, []);

  const add = useCallback((run: Omit<WhatIfHistoryEntry, "id" | "createdAt">) => {
    const entry = createWhatIfHistoryEntry(run);
    setEntries((prev) => {
      const next = [entry, ...prev];
      saveWhatIfHistory(next);
      return next;
    });
    return entry;
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      saveWhatIfHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    saveWhatIfHistory([]);
  }, []);

  return { entries, add, remove, clear };
}
