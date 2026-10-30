"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { newId } from "@/lib/history";
import { formatNumber, formatPrice } from "@/lib/format";
import type { WhatIfResult } from "@/lib/market";
import {
  FIELD_DEFS,
  type FeatureValues,
  type FieldName,
  type ValidationErrors,
  toHouseFeatures,
  validateFeatures,
} from "@/lib/validation";
import DeltaBarChart from "./DeltaBarChart";

const MAX_SCENARIOS = 10;

/** Sensible starting point so the first what-if run is one click away. */
const BASELINE_DEFAULTS: FeatureValues = {
  square_footage: "1500",
  bedrooms: "3",
  bathrooms: "2",
  year_built: "2000",
  lot_size: "6000",
  distance_to_city_center: "5",
  school_rating: "8",
};

/** One scenario row: a named single-feature change over the baseline. */
interface ScenarioForm {
  key: string;
  name: string;
  feature: FieldName;
  value: string;
  error?: string;
}

function createScenario(): ScenarioForm {
  return { key: newId(), name: "", feature: "square_footage", value: "" };
}

const fieldLabel = (name: FieldName): string =>
  FIELD_DEFS.find((field) => field.name === name)?.label ?? name;

/** Baseline default for a feature, used in the "old → new" change column. */
function baselineValueOf(feature: FieldName, values: FeatureValues): string {
  return formatNumber(Number(values[feature]));
}

/**
 * What-if analysis tool (a.iii): a baseline house plus scenarios that
 * change one feature each. The batch is predicted by the Task 1 model via
 * the market-api; outcomes show the new price and the delta vs baseline.
 */
export default function WhatIfView() {
  const [baseline, setBaseline] = useState<FeatureValues>(BASELINE_DEFAULTS);
  const [baselineErrors, setBaselineErrors] = useState<ValidationErrors>({});
  const [scenarios, setScenarios] = useState<ScenarioForm[]>([createScenario()]);
  const [submitError, setSubmitError] = useState<string[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [result, setResult] = useState<WhatIfResult | null>(null);

  const setFieldValue = (field: FieldName, value: string) => {
    setBaseline((prev) => ({ ...prev, [field]: value }));
    setBaselineErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const updateScenario = (key: string, patch: Partial<ScenarioForm>) => {
    setScenarios((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch, error: undefined } : s)));
  };

  const addScenario = () =>
    setScenarios((prev) =>
      prev.length < MAX_SCENARIOS ? [...prev, createScenario()] : prev,
    );

  const removeScenario = (key: string) =>
    setScenarios((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    // Client-side validation mirrors the market-api's rules.
    const baselineValidation = validateFeatures(baseline);
    let scenarioValidation: ScenarioForm[] = scenarios.map((scenario) => ({ ...scenario }));
    let valid = Object.keys(baselineValidation).length === 0;
    scenarioValidation = scenarioValidation.map((scenario) => {
      if (!scenario.name.trim()) {
        valid = false;
        return { ...scenario, error: "Scenario name is required." };
      }
      const merged = { ...baseline, [scenario.feature]: scenario.value };
      const message = validateFeatures(merged)[scenario.feature];
      if (message) {
        valid = false;
        return { ...scenario, error: message };
      }
      return scenario;
    });
    setBaselineErrors(baselineValidation);
    setScenarios(scenarioValidation);
    if (!valid) return;

    const body = {
      baseline: toHouseFeatures(baseline),
      scenarios: scenarios.map((scenario) => ({
        name: scenario.name.trim(),
        changes: {
          [scenario.feature]: toHouseFeatures({ ...baseline, [scenario.feature]: scenario.value })[
            scenario.feature
          ],
        },
      })),
    };

    setStatus("loading");
    try {
      const res = await fetch("/api/market/what-if", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data !== "object") {
        const messages: string[] = [];
        if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") {
          messages.push(data.detail);
        }
        if (
          data &&
          typeof data === "object" &&
          "errors" in data &&
          typeof data.errors === "object" &&
          data.errors !== null
        ) {
          for (const [field, message] of Object.entries(data.errors)) {
            if (typeof message === "string") messages.push(`${field}: ${message}`);
          }
        }
        setSubmitError(messages.length > 0 ? messages : ["The market analysis service failed."]);
        return;
      }
      setResult(data as WhatIfResult);
    } catch {
      setSubmitError(["The market analysis service is unreachable. Please try again later."]);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <section>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">What-if analysis</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Start from a baseline house and change one feature per scenario — the model
            predicts each outcome and the delta against the baseline.
          </p>
        </div>
        <Link href="/market" className="btn-secondary">
          ← Back to market
        </Link>
      </header>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div className="rounded-lg border border-hairline bg-surface p-5">
          <h2 className="text-sm font-semibold text-ink">Baseline property</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {FIELD_DEFS.map((field) => (
              <label key={field.name} className="block">
                <span className="mb-1 block text-xs font-medium text-ink-secondary">
                  {field.label} {field.unit && <span className="text-ink-muted">({field.unit})</span>}
                </span>
                {field.select ? (
                  <select
                    value={baseline[field.name]}
                    onChange={(e) => setFieldValue(field.name, e.target.value)}
                    aria-invalid={Boolean(baselineErrors[field.name])}
                    className={`field-input ${baselineErrors[field.name] ? "border-critical" : ""}`}
                  >
                    <option value="">Select a year</option>
                    {Array.from({ length: field.max - field.min + 1 }, (_, i) => field.min + i).map(
                      (year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ),
                    )}
                  </select>
                ) : (
                  <input
                    type="number"
                    inputMode="decimal"
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={baseline[field.name]}
                    onChange={(e) => setFieldValue(field.name, e.target.value)}
                    aria-invalid={Boolean(baselineErrors[field.name])}
                    className={`field-input ${baselineErrors[field.name] ? "border-critical" : ""}`}
                  />
                )}
                {baselineErrors[field.name] && (
                  <span role="alert" className="mt-1 block text-xs text-critical">
                    {baselineErrors[field.name]}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-hairline bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">Scenarios</h2>
            {scenarios.length < MAX_SCENARIOS && (
              <button type="button" onClick={addScenario} className="btn-secondary px-3 py-1 text-xs">
                + Add scenario
              </button>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {scenarios.map((scenario, index) => (
              <div
                key={scenario.key}
                className="grid grid-cols-1 items-start gap-2 rounded-md border border-hairline p-3 md:grid-cols-[1fr_11rem_8rem_auto]"
              >
                <input
                  type="text"
                  value={scenario.name}
                  maxLength={60}
                  placeholder={`Scenario ${index + 1}`}
                  onChange={(e) => updateScenario(scenario.key, { name: e.target.value })}
                  aria-label={`Scenario ${index + 1} name`}
                  aria-invalid={Boolean(scenario.error)}
                  className={`field-input ${scenario.error ? "border-critical" : ""}`}
                />
                <select
                  value={scenario.feature}
                  onChange={(e) => updateScenario(scenario.key, { feature: e.target.value as FieldName })}
                  aria-label={`Scenario ${index + 1} feature`}
                  className="field-input"
                >
                  {FIELD_DEFS.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  step={FIELD_DEFS.find((f) => f.name === scenario.feature)?.step ?? "1"}
                  value={scenario.value}
                  placeholder="New value"
                  onChange={(e) => updateScenario(scenario.key, { value: e.target.value })}
                  aria-label={`Scenario ${index + 1} value`}
                  aria-invalid={Boolean(scenario.error)}
                  className={`field-input ${scenario.error ? "border-critical" : ""}`}
                />
                <div className="flex items-center justify-end md:justify-start">
                  {scenarios.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeScenario(scenario.key)}
                      aria-label={`Remove scenario ${index + 1}`}
                      className="text-xs text-ink-muted underline transition-colors hover:text-critical"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {scenario.error && (
                  <p role="alert" className="text-xs text-critical md:col-span-4">
                    {scenario.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={status === "loading"} className="btn-primary">
            {status === "loading" ? "Predicting…" : "Run what-if analysis"}
          </button>
          {scenarios.length > 1 && (
            <span className="text-xs text-ink-muted">Batch of {scenarios.length} scenarios</span>
          )}
        </div>
      </form>

      {submitError && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical"
        >
          {submitError.map((message) => (
            <p key={message}>✕ {message}</p>
          ))}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-hairline bg-surface p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-ink-muted">Baseline predicted price</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">
                  {result.baseline_price > 0 ? formatPrice(result.baseline_price) : "—"}
                </p>
                {result.baseline_reason && (
                  <p className="mt-1 text-xs text-critical">{result.baseline_reason}</p>
                )}
              </div>
              <p className="text-xs text-ink-muted">
                {result.scenarios.length} {result.scenarios.length === 1 ? "scenario" : "scenarios"} ·{" "}
                {result.scenarios.filter((s) => s.price > 0).length} predicted
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-surface p-5">
            <h2 className="text-sm font-semibold text-ink">Price change by scenario</h2>
            <div className="mt-3">
              <DeltaBarChart scenarios={result.scenarios} />
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left align-bottom">
                    <th className="py-2 pr-4 text-xs font-medium text-ink-muted">Scenario</th>
                    <th className="py-2 pr-4 text-xs font-medium text-ink-muted">Change</th>
                    <th className="py-2 pr-4 text-xs font-medium text-ink-muted">Predicted price</th>
                    <th className="py-2 text-xs font-medium text-ink-muted">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios.map((scenario, index) => {
                    const change = scenarios[index];
                    return (
                      <tr key={scenario.name} className="border-b border-hairline last:border-0">
                        <td className="py-2 pr-4 font-medium text-ink">{scenario.name}</td>
                        <td className="py-2 pr-4 text-ink-secondary">
                          {change
                            ? `${fieldLabel(change.feature)}: ${baselineValueOf(change.feature, baseline)} → ${formatNumber(
                                Number(change.value),
                                Number.isInteger(Number(change.value)) ? 0 : 1,
                              )}`
                            : "—"}
                        </td>
                        <td className="py-2 pr-4 text-ink-secondary">
                          {scenario.price > 0 ? (
                            <span className="font-semibold tabular-nums text-ink">
                              {formatPrice(scenario.price)}
                            </span>
                          ) : (
                            <span className="text-critical">{scenario.reason || "Not predicted"}</span>
                          )}
                        </td>
                        <td className="py-2">
                          {scenario.delta === null ? (
                            <span className="text-ink-muted">—</span>
                          ) : (
                            <span
                              className={`font-semibold tabular-nums ${
                                scenario.delta > 0
                                  ? "text-good-ink"
                                  : scenario.delta < 0
                                    ? "text-critical"
                                    : "text-ink-muted"
                              }`}
                            >
                              {scenario.delta > 0 ? "+" : scenario.delta < 0 ? "−" : ""}
                              {formatPrice(Math.abs(scenario.delta))}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
