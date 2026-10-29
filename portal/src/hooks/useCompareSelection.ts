"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCompareSelection, saveCompareSelection } from "@/lib/history";

/** Maximum number of properties that can be compared side by side. */
export const MAX_COMPARE = 5;

/**
 * Shared hook for the "compare" selection (ids of history entries),
 * persisted in localStorage so the History and Compare pages agree.
 */
export function useCompareSelection() {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected(loadCompareSelection().slice(0, MAX_COMPARE));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_COMPARE
          ? [...prev, id]
          : prev;
      saveCompareSelection(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSelected((prev) => {
      const next = prev.filter((x) => x !== id);
      saveCompareSelection(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
    saveCompareSelection([]);
  }, []);

  return { selected, toggle, remove, clear };
}
