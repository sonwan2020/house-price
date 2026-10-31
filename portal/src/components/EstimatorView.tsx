"use client";

import { Fragment, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePrediction } from "@/hooks/usePrediction";
import { useHistory } from "@/hooks/useHistory";
import { newId } from "@/lib/history";
import { formatPrice } from "@/lib/format";
import type { HouseInfo, HousePrice } from "@/lib/types";
import {
  FIELD_DEFS,
  type FieldName,
  type FeatureValues,
  type ValidationErrors,
  toHouseFeatures,
  validateFeatures,
} from "@/lib/validation";

const MAX_PROPERTIES = 10;

/** One property column in the grid form: a stable client key, values and errors. */
interface PropertyForm {
  key: string;
  label: string;
  labelError?: string;
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

/** Field-input classes when the value failed validation. */
const ERROR_INPUT = "border-critical focus:border-critical focus:ring-critical/25";

/** Controls per column in Tab / Enter order: Name first, then each feature. */
const FIELD_ORDER: readonly ("label" | FieldName)[] = [
  "label",
  ...FIELD_DEFS.map((field) => field.name),
];

/**
 * The estimator, laid out as a grid: field labels down the left column and
 * one input column per property to the right (add up to 10). An Estimate
 * price row at the bottom fills in green after a successful round-trip.
 * Successful estimates are saved to history automatically.
 * Client-side validation mirrors the backend's rules; property names are
 * optional but must be unique on the page.
 *
 * Keyboard flow: Tab or Enter moves through each column's controls — Name,
 * then every feature — and after the last column's School rating on to Add
 * property, then Estimate. Enter on Add property appends a column and
 * focuses its Name input.
 */
export default function EstimatorView() {
  const { status, response, error, predict } = usePrediction();
  const history = useHistory();

  // The initial column uses a deterministic key so the server-rendered HTML
  // and the client hydration agree; columns added later are client-only.
  const [forms, setForms] = useState<PropertyForm[]>([createForm("property-0")]);
  // Column keys as submitted, so each price stays pinned to its column even
  // if columns are added or removed afterwards.
  const [pricedKeys, setPricedKeys] = useState<string[]>([]);

  // Focus bookkeeping for the keyboard flow: every control registers itself
  // by id, and pendingFocusRef holds the id to focus once it mounts.
  const fieldRefs = useRef(new Map<string, HTMLInputElement | HTMLSelectElement>());
  const pendingFocusRef = useRef<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const estimateButtonRef = useRef<HTMLButtonElement>(null);

  const registerField = (id: string, el: HTMLInputElement | HTMLSelectElement | null) => {
    if (el) fieldRefs.current.set(id, el);
    else fieldRefs.current.delete(id);
    if (pendingFocusRef.current === id && el) {
      pendingFocusRef.current = null;
      el.focus();
    }
  };

  /** Add a column to the right and focus its Name input. */
  const addForm = () => {
    if (forms.length >= MAX_PROPERTIES) return;
    const form = createForm();
    pendingFocusRef.current = `${form.key}-label`;
    setForms((prev) => (prev.length < MAX_PROPERTIES ? [...prev, form] : prev));
  };

  /**
   * Move focus to the next control: the next field in this column, the Name
   * of the next column, or — after the last column's School rating — Add
   * property (or Estimate once the page is full).
   */
  const focusNext = (key: string, field: "label" | FieldName) => {
    const index = FIELD_ORDER.indexOf(field);
    if (index < FIELD_ORDER.length - 1) {
      fieldRefs.current.get(`${key}-${FIELD_ORDER[index + 1]}`)?.focus();
      return;
    }
    const formIndex = forms.findIndex((f) => f.key === key);
    const next = forms[formIndex + 1];
    if (next) {
      fieldRefs.current.get(`${next.key}-label`)?.focus();
      return;
    }
    (addButtonRef.current ?? estimateButtonRef.current)?.focus();
  };

  /** Enter advances to the next control like Tab; it never submits the form. */
  const advanceOnEnter =
    (key: string, field: "label" | FieldName) =>
    (event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        focusNext(key, field);
      }
    };

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

  /** Names are optional, but two properties on the page cannot share one. */
  const nameError = (key: string, label: string): string | undefined => {
    const name = label.trim();
    if (!name) return undefined;
    const duplicate = forms.some(
      (f) => f.key !== key && f.label.trim().toLowerCase() === name.toLowerCase(),
    );
    return duplicate ? "Names must be unique." : undefined;
  };

  /** At least one column fully valid — Estimate stays disabled without it. */
  const hasValidProperty = forms.some(
    (form) =>
      Object.keys(validateFeatures(form.values)).length === 0 &&
      !nameError(form.key, form.label),
  );

  const setLabel = (key: string, label: string) => {
    setForms((prev) =>
      prev.map((f) => (f.key === key ? { ...f, label, labelError: undefined } : f)),
    );
  };

  const validateLabel = (key: string) => {
    setForms((prev) =>
      prev.map((f) => (f.key === key ? { ...f, labelError: nameError(key, f.label) } : f)),
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validated = forms.map((f) => ({
      ...f,
      errors: validateFeatures(f.values),
      labelError: nameError(f.key, f.label),
    }));
    setForms(validated);
    if (validated.some((f) => Object.keys(f.errors).length > 0 || f.labelError)) return;

    const items: HouseInfo[] = validated.map((f) => {
      const info: HouseInfo = toHouseFeatures(f.values);
      const label = f.label.trim();
      if (label) info.id = label;
      return info;
    });
    setPricedKeys(validated.map((f) => f.key));
    const data = await predict(items);

    // Save each successful estimate to history automatically; failed
    // items (price <= 0, with a reason) are not saved.
    if (data) {
      validated.forEach((f, index) => {
        const result = data.predicts[index];
        if (!result || result.price <= 0) return;
        const label = f.label.trim() || `Property ${index + 1}`;
        history.add(toHouseFeatures(f.values), result.price, label);
      });
    }
  };

  /** The result pinned to a column, if this column was part of the last submit. */
  const priceFor = (key: string): HousePrice | undefined => {
    const index = pricedKeys.indexOf(key);
    if (index < 0 || !response) return undefined;
    return response.predicts[index];
  };

  // Grid placement: row 1 holds the Remove controls (when shown), then the
  // Name row, one row per feature, then the Estimate price row. The label
  // column is rendered first and each property's cells are grouped by
  // column, so the DOM — and therefore keyboard tab order — runs
  // top-to-bottom per property column, then Add property and Estimate.
  // Remove stays out of tab order so the flow matches Enter navigation.
  const firstRow = forms.length > 1 ? 2 : 1;
  const fieldRow = (i: number) => firstRow + 1 + i;
  const priceRow = firstRow + 1 + FIELD_DEFS.length;
  const cell = (column: number, row: number) => ({ gridColumn: column, gridRow: row });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-hairline bg-surface p-5">
        <div>
          <h2 className="text-lg font-semibold text-ink">Estimate a property</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Fill in the details below. The form validates them before they are sent to
            the prediction API — you can estimate up to {MAX_PROPERTIES} properties at once.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mt-4 overflow-x-auto pb-1">
            <div
              className="grid items-start gap-x-4 gap-y-4"
              style={{ gridTemplateColumns: `14rem repeat(${forms.length}, 11rem)` }}
            >
              {/* Left label column (not focusable, so it stays out of tab order). */}
              <div className="pt-2 text-sm font-medium text-ink" style={cell(1, firstRow)}>
                Name
              </div>
              {FIELD_DEFS.map((field, i) => (
                <div
                  key={field.name}
                  className="pt-2 text-sm font-medium text-ink"
                  style={cell(1, fieldRow(i))}
                >
                  {field.label}{" "}
                  {field.unit && <span className="text-ink-muted">({field.unit})</span>}
                </div>
              ))}
              <div className="pt-2 text-sm font-medium text-ink" style={cell(1, priceRow)}>
                Estimate price
              </div>

              {/* One column per property; DOM order = tab order. */}
              {forms.map((form, index) => {
                const column = index + 2; // column 1 is the labels
                const result = priceFor(form.key);
                const ok = result ? result.price > 0 : false;
                return (
                  <Fragment key={form.key}>
                    {forms.length > 1 && (
                      <div className="flex justify-end" style={cell(column, 1)}>
                        <button
                          type="button"
                          onClick={() => removeForm(form.key)}
                          aria-label={`Remove property ${index + 1}`}
                          tabIndex={-1}
                          className="text-xs text-ink-muted underline transition-colors hover:text-critical"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    <div className="min-w-0" style={cell(column, firstRow)}>
                      <input
                        id={`${form.key}-label`}
                        ref={(el) => registerField(`${form.key}-label`, el)}
                        type="text"
                        value={form.label}
                        maxLength={40}
                        placeholder={`Property ${index + 1}`}
                        onChange={(e) => setLabel(form.key, e.target.value)}
                        onBlur={() => validateLabel(form.key)}
                        onKeyDown={advanceOnEnter(form.key, "label")}
                        aria-invalid={Boolean(form.labelError)}
                        aria-describedby={form.labelError ? `${form.key}-label-error` : undefined}
                        className={`field-input ${form.labelError ? ERROR_INPUT : ""}`}
                      />
                      {form.labelError && (
                        <p
                          id={`${form.key}-label-error`}
                          role="alert"
                          className="mt-1 text-xs text-critical"
                        >
                          {form.labelError}
                        </p>
                      )}
                    </div>

                    {FIELD_DEFS.map((field, fi) => (
                      <div key={field.name} className="min-w-0" style={cell(column, fieldRow(fi))}>
                        {field.select ? (
                          <select
                            id={`${form.key}-${field.name}`}
                            ref={(el) => registerField(`${form.key}-${field.name}`, el)}
                            value={form.values[field.name]}
                            onChange={(e) => setFieldValue(form.key, field.name, e.target.value)}
                            onBlur={() => validateField(form.key, field.name)}
                            onKeyDown={advanceOnEnter(form.key, field.name)}
                            aria-label={`${field.label} for property ${index + 1}`}
                            aria-invalid={Boolean(form.errors[field.name])}
                            aria-describedby={
                              form.errors[field.name] ? `${form.key}-${field.name}-error` : undefined
                            }
                            className={`field-input ${form.errors[field.name] ? ERROR_INPUT : ""}`}
                          >
                            <option value="">Select a year</option>
                            {Array.from(
                              { length: field.max - field.min + 1 },
                              (_, i) => field.min + i,
                            ).map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            id={`${form.key}-${field.name}`}
                            ref={(el) => registerField(`${form.key}-${field.name}`, el)}
                            type="number"
                            inputMode="decimal"
                            step={field.step}
                            min={field.min}
                            max={field.max}
                            value={form.values[field.name]}
                            onChange={(e) => setFieldValue(form.key, field.name, e.target.value)}
                            onBlur={() => validateField(form.key, field.name)}
                            onKeyDown={advanceOnEnter(form.key, field.name)}
                            aria-label={`${field.label} for property ${index + 1}`}
                            aria-invalid={Boolean(form.errors[field.name])}
                            aria-describedby={
                              form.errors[field.name] ? `${form.key}-${field.name}-error` : undefined
                            }
                            className={`field-input ${
                              form.errors[field.name] ? ERROR_INPUT : ""
                            }`}
                          />
                        )}
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

                    {/* Estimate price: always visible, filled in green after Estimate. */}
                    <div className="min-w-0 pt-2" style={cell(column, priceRow)} aria-live="polite">
                      {ok && result ? (
                        <p className="text-sm font-semibold text-good-ink">
                          {formatPrice(result.price)}
                        </p>
                      ) : (
                        <p className="text-sm text-ink-muted">—</p>
                      )}
                      {result && !ok && result.reason && (
                        <p className="mt-1 text-xs text-critical">{result.reason}</p>
                      )}
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {forms.length < MAX_PROPERTIES && (
              <button
                type="button"
                ref={addButtonRef}
                onClick={addForm}
                className="btn-secondary text-sm"
              >
                + Add property
              </button>
            )}
            <button
              type="submit"
              ref={estimateButtonRef}
              disabled={status === "loading" || !hasValidProperty}
              className="btn-primary"
            >
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
    </div>
  );
}
