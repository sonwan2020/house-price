/**
 * Client-side validation mirroring the sanity ranges enforced by the
 * Python service (predict/app/schemas/predict.py, HouseFeatures).
 * The form never submits a request the backend would reject.
 */
import type { HouseFeatures } from "./types";

export type FieldName = keyof HouseFeatures;

/** Raw form state: one string per feature (inputs are text fields). */
export type FeatureValues = Record<FieldName, string>;

export interface FieldDef {
  name: FieldName;
  label: string;
  unit?: string;
  /** HTML input step, e.g. "0.5" for half bathrooms. */
  step: string;
  /** Whole numbers only (bedrooms, year built). */
  integer?: boolean;
  min: number;
  max: number;
  /** True when the backend rejects the minimum itself (gt instead of ge). */
  minExclusive?: boolean;
  /** True when the backend rejects the maximum itself (lt instead of le). */
  maxExclusive?: boolean;
  /** Render as a dropdown with one option per integer from min to max. */
  select?: boolean;
}

const CURRENT_YEAR = new Date().getFullYear();

export const FIELD_DEFS: readonly FieldDef[] = [
  { name: "square_footage", label: "Square footage", unit: "sq ft", step: "1", min: 0, minExclusive: true, max: 100_000, maxExclusive: true },
  { name: "bedrooms", label: "Bedrooms", step: "1", integer: true, min: 1, max: 20 },
  { name: "bathrooms", label: "Bathrooms", step: "0.5", min: 0, minExclusive: true, max: 20, maxExclusive: true },
  { name: "year_built", label: "Year built", step: "1", integer: true, min: 1950, max: CURRENT_YEAR + 5, select: true },
  { name: "lot_size", label: "Lot size", unit: "sq ft", step: "1", min: 0, minExclusive: true, max: 300_000, maxExclusive: true },
  { name: "distance_to_city_center", label: "Distance to centre", unit: "miles", step: "0.1", min: 0, minExclusive: true, max: 100, maxExclusive: true },
  { name: "school_rating", label: "School rating", step: "0.1", min: 0, max: 10 },
];

export type ValidationErrors = Partial<Record<FieldName, string>>;

/** Validate one property form; returns a map of field -> error message. */
export function validateFeatures(values: FeatureValues): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const field of FIELD_DEFS) {
    const raw = values[field.name]?.trim() ?? "";
    if (raw === "") {
      errors[field.name] = `${field.label} is required.`;
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      errors[field.name] = `${field.label} must be a number.`;
      continue;
    }
    if (field.integer && !Number.isInteger(num)) {
      errors[field.name] = `${field.label} must be a whole number.`;
      continue;
    }
    if (field.minExclusive && num <= field.min) {
      errors[field.name] = `${field.label} must be greater than ${field.min}.`;
      continue;
    }
    if (field.maxExclusive && num >= field.max) {
      errors[field.name] = `${field.label} must be less than ${field.max.toLocaleString("en-US")}.`;
      continue;
    }
    if (!field.minExclusive && (num < field.min || num > field.max)) {
      errors[field.name] = `${field.label} must be between ${field.min} and ${field.max}.`;
    }
  }
  return errors;
}

/**
 * Baseline values taken from URL search params (the market table's
 * "What-if analysis" links). Only fields the form knows, given once as a
 * string and passing that field's range rules are kept; anything else is
 * dropped so the form falls back to its default for that field.
 */
export function baselineFromParams(
  params: Record<string, string | string[] | undefined>,
): Partial<FeatureValues> {
  const values: Partial<FeatureValues> = {};
  for (const field of FIELD_DEFS) {
    const raw = params[field.name];
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const probe = Object.fromEntries(
      FIELD_DEFS.map((candidate) => [candidate.name, candidate.name === field.name ? raw : ""]),
    ) as FeatureValues;
    if (!validateFeatures(probe)[field.name]) {
      values[field.name] = raw;
    }
  }
  return values;
}

/** Convert a validated form into the numbers sent to the API. */
export function toHouseFeatures(values: FeatureValues): HouseFeatures {
  const features = {} as Record<FieldName, number>;
  for (const field of FIELD_DEFS) {
    features[field.name] = field.integer
      ? parseInt(values[field.name], 10)
      : parseFloat(values[field.name]);
  }
  return features as HouseFeatures;
}
