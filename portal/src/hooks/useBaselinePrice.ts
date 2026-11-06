"use client";

import { useEffect, useRef, useState } from "react";
import type { PredictResponse } from "@/lib/types";
import { toHouseFeatures, validateFeatures, type FeatureValues } from "@/lib/validation";

export type BaselinePriceState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; price: number }
  | { status: "error"; message: string };

/** Re-predict this long after the last edit, so keystrokes batch up. */
const PREDICT_DEBOUNCE_MS = 400;

/**
 * Live predicted price for the what-if baseline property: predicts as soon
 * as the baseline values are valid and re-predicts shortly after each
 * edit, through the portal's /api/predict proxy (the same Task 1 model the
 * estimator uses). Invalid values clear the price; only the newest request
 * may update the state, so a slow response can never overwrite a newer one.
 */
export function useBaselinePrice(baseline: FeatureValues): BaselinePriceState {
  const [state, setState] = useState<BaselinePriceState>({ status: "idle" });
  const latestKey = useRef("");
  const requestId = useRef(0);

  useEffect(() => {
    if (Object.keys(validateFeatures(baseline)).length > 0) {
      // Invalid values (or fields being cleared): drop the price.
      latestKey.current = "";
      setState({ status: "idle" });
      return;
    }
    const features = toHouseFeatures(baseline);
    const key = JSON.stringify(features);
    if (key === latestKey.current) return; // already predicted for these values
    setState({ status: "loading" });
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([features]),
        });
        const data: unknown = await res.json().catch(() => null);
        const predicts =
          data && typeof data === "object" ? (data as PredictResponse).predicts : undefined;
        const item = Array.isArray(predicts) ? predicts[0] : undefined;
        if (!res.ok || !item) {
          const detail =
            data &&
            typeof data === "object" &&
            "detail" in data &&
            typeof (data as { detail: unknown }).detail === "string"
              ? (data as { detail: string }).detail
              : "The prediction service returned an unexpected response.";
          throw new Error(detail);
        }
        if (id !== requestId.current) return; // superseded by a newer edit
        latestKey.current = key;
        setState(
          item.price > 0
            ? { status: "success", price: item.price }
            : { status: "error", message: item.reason || "The model could not price this baseline." },
        );
      } catch (err) {
        if (id !== requestId.current) return;
        setState({
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Something went wrong while predicting the baseline price.",
        });
      }
    }, PREDICT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [baseline]);

  return state;
}
