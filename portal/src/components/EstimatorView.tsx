"use client";

import { useState, type FormEvent } from "react";
import { useHistory } from "@/hooks/useHistory";
import { usePrediction } from "@/hooks/usePrediction";
import { newId } from "@/lib/history";
import type { HouseInfo } from "@/lib/types";
import {
  FIELD_DEFS,
  type FieldName,
  type FeatureValues,
  type ValidationErrors,
  toHouseFeatures,
  validateFeatures,
} from "@/lib/validation";
import ResultsPanel from "./ResultsPanel";

const MAX_PROPERTIES = 10;

/** One property in the batch form: a stable client key, values and errors. */
interface PropertyForm {
  key: string;
  label: string;
  values: FeatureValues;
  errors: ValidationErrors;
}

function emptyValues(): FeatureValues {
  const values = {} as FeatureValues;
  for (const field of FIELD_DEFS) values[field.name] = "";
  return values;
}

function createForm(key?: string): PropertyForm {
  return { key: key ?? newId(), label: "", values: emptyValues(), errors: {} };
}

/**
 * The estimator: a form for one or more properties (batch), client-side
 * validation mirroring the backend's rules, and the results below.
 */
export default function EstimatorView() {
  const history = useHistory();
  const { status, response, error, predict, reset } = usePrediction();

  // The initial form uses a deterministic key so the server-rendered HTML
  // and the client hydration agree; forms added later are client-only.
  const [forms, setForms] = useState<PropertyForm[]>([createForm("property-0")]);
  const [submittedItems, setSubmittedItems] = useState<HouseInfo[] | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());

  const addForm = () =>
    setForms((prev) => (prev.length < MAX_PROPERTIES ? [...prev, createForm()] : prev));

  const removeForm = (key: string) =>
    setForms((prev) => (prev.length > 1 ? prev.filter((f) => f.key !== key) : prev));

  const setFieldValue = (key: string, field: FieldName, value: string) => {
    setForms((prev) =>
      prev.map((f) => {
        if (f.key !== key) return f;
        const errors = { ...f.errors };
        delete errors[field];
        return { ...f, values: { ...f.values, [field]: value }, errors };
      }),
    );
  };

  /** Re-validate a single field on blur so errors clear as the user fixes them. */
  const validateField = (key: string, field: FieldName) => {
    setForms((prev) =>
      prev.map((f) => {
        if (f.key !== key) return f;
        const message = validateFeatures(f.values)[field];
        const errors = { ...f.errors };
        if (message) errors[field] = message;
        else delete errors[field];
        return { ...f, errors };
      }),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validated = forms.map((f) => ({ ...f, errors: validateFeatures(f.values) }));
    setForms(validated);
    if (validated.some((f) => Object.keys(f.errors).length > 0)) return;

    const items: HouseInfo[] = validated.map((f) => {
      const info: HouseInfo = toHouseFeatures(f.values);
      const label = f.label.trim();
      if (label) info.id = label;
      return info;
    });
    setSubmittedItems(items);
    setSavedIndexes(new Set());
    await predict(items);
  };

  const saveResult = (index: number) => {
    if (!response || !submittedItems) return;
    const result = response.predicts[index];
    if (!result || result.price <= 0) return;
    const item = submittedItems[index];
    history.add(item, result.price, item.id?.trim() || `Property ${index + 1}`);
    setSavedIndexes((prev) => new Set(prev).add(index));
  };

  const saveAll = () => {
    if (!response) return;
    response.predicts.forEach((result) => {
      if (result.price > 0 && !savedIndexes.has(result.index)) saveResult(result.index);
    });
  };

  const resetAll = () => {
    reset();
    setSubmittedItems(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">Estimate a property</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Fill in the details below. The form validates them before they are sent to
              the prediction API — you can estimate up to {MAX_PROPERTIES} properties at once.
            </p>
          </div>
          {forms.length < MAX_PROPERTIES && (
            <button type="button" onClick={addForm} className="btn-secondary text-sm">
              + Add property
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-5">
          {forms.map((form, index) => (
            <div key={form.key} className="rounded-lg border border-hairline bg-page p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-ink">Property {index + 1}</p>
                {forms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeForm(form.key)}
                    className="text-xs text-ink-muted underline transition-colors hover:text-critical"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-3 max-w-sm">
                <label htmlFor={`${form.key}-label`} className="block text-sm font-medium text-ink">
                  Name <span className="text-ink-muted">(optional)</span>
                </label>
                <input
                  id={`${form.key}-label`}
                  type="text"
                  value={form.label}
                  maxLength={40}
                  placeholder={`Property ${index + 1}`}
                  onChange={(e) =>
                    setForms((prev) =>
                      prev.map((f) => (f.key === form.key ? { ...f, label: e.target.value } : f)),
                    )
                  }
                  className="field-input mt-1.5"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FIELD_DEFS.map((field) => (
                  <div key={field.name}>
                    <label
                      htmlFor={`${form.key}-${field.name}`}
                      className="block text-sm font-medium text-ink"
                    >
                      {field.label}{" "}
                      {field.unit && <span className="text-ink-muted">({field.unit})</span>}
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id={`${form.key}-${field.name}`}
                        type="number"
                        inputMode="decimal"
                        step={field.step}
                        min={field.min}
                        max={field.max}
                        value={form.values[field.name]}
                        onChange={(e) => setFieldValue(form.key, field.name, e.target.value)}
                        onBlur={() => validateField(form.key, field.name)}
                        aria-invalid={Boolean(form.errors[field.name])}
                        aria-describedby={
                          form.errors[field.name] ? `${form.key}-${field.name}-error` : undefined
                        }
                        className={`field-input pr-16 ${
                          form.errors[field.name]
                            ? "border-critical focus:border-critical focus:ring-critical/25"
                            : ""
                        }`}
                      />
                      {field.unit && (
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-muted">
                          {field.unit}
                        </span>
                      )}
                    </div>
                    {form.errors[field.name] && (
                      <p
                        id={`${form.key}-${field.name}-error`}
                        role="alert"
                        className="mt-1 text-xs text-critical"
                      >
                        {form.errors[field.name]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={status === "loading"} className="btn-primary">
              {status === "loading" ? "Estimating…" : "Estimate"}
            </button>
            {forms.length > 1 && (
              <span className="text-xs text-ink-muted">Batch of {forms.length} properties</span>
            )}
          </div>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-md border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-critical"
          >
            ✕ {error}
          </p>
        )}
      </section>

      {response && submittedItems && (
        <ResultsPanel
          response={response}
          items={submittedItems}
          savedIndexes={savedIndexes}
          onSave={saveResult}
          onSaveAll={saveAll}
          onReset={resetAll}
        />
      )}
    </div>
  );
}
