"use client";

import { useCallback, useState } from "react";
import type { HouseInfo, PredictResponse } from "@/lib/types";

export type PredictionStatus = "idle" | "loading" | "success" | "error";

/**
 * Shared hook for submitting house predictions through the portal's
 * server-side proxy (/api/predict → Python API).
 *
 * The backend answers 200 (all ok), 207 (some failed) and 400 (all
 * failed) with the same body shape; per-item failures carry a `reason`,
 * so any response with `predicts` counts as a successful round-trip.
 *
 * `predict` resolves with the parsed response on success and null on
 * failure, so callers can react to the outcome (e.g. save estimates).
 */
export function usePrediction() {
  const [status, setStatus] = useState<PredictionStatus>("idle");
  const [response, setResponse] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (items: HouseInfo[]): Promise<PredictResponse | null> => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!data || typeof data !== "object" || !Array.isArray((data as PredictResponse).predicts)) {
        const detail =
          data && typeof data === "object" && "detail" in data && typeof (data as { detail: unknown }).detail === "string"
            ? (data as { detail: string }).detail
            : `Prediction service returned an unexpected response (HTTP ${res.status}).`;
        throw new Error(detail);
      }
      setResponse(data as PredictResponse);
      setStatus("success");
      return data as PredictResponse;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while contacting the prediction service.",
      );
      setStatus("error");
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setResponse(null);
    setError(null);
  }, []);

  return { status, response, error, predict, reset };
}
