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
}

const CURRENT_YEAR = new Date().getFullYear();

export const FIELD_DEFS: readonly FieldDef[] = [
  { name: "square_footage", label: "Square footage", unit: "sq ft", step: "1", min: 0, minExclusive: true, max: 100_000 },
  { name: "bedrooms", label: "Bedrooms", step: "1", integer: true, min: 1, max: 20 },
  { name: "bathrooms", label: "Bathrooms", step: "0.5", min: 0, minExclusive: true, max: 20 },
  { name: "year_built", label: "Year built", step: "1", integer: true, min: 1900, max: CURRENT_YEAR + 5 },
  { name: "lot_size", label: "Lot size", unit: "sq ft", step: "1", min: 0, minExclusive: true, max: 1_000_000 },
  { name: "distance_to_city_center", label: "Distance to city centre", unit: "miles", step: "0.1", min: 0, max: 1_000 },
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
    if (!field.minExclusive && (num < field.min || num > field.max)) {
      errors[field.name] = `${field.label} must be between ${field.min} and ${field.max}.`;
      continue;
    }
    if (field.minExclusive && num > field.max) {
      errors[field.name] = `${field.label} must be at most ${field.max.toLocaleString("en-US")}.`;
    }
  }
  return errors;
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
