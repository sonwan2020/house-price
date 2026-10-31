import { describe, expect, it } from "vitest";
import { FIELD_DEFS, toHouseFeatures, validateFeatures, type FeatureValues } from "./validation";

const valid = (): FeatureValues => ({
  square_footage: "2000",
  bedrooms: "3",
  bathrooms: "2",
  year_built: "1995",
  lot_size: "6000",
  distance_to_city_center: "5",
  school_rating: "7.5",
});

describe("validateFeatures", () => {
  it("covers all seven model fields", () => {
    expect(FIELD_DEFS.map((f) => f.name).sort()).toEqual(
      [
        "bathrooms",
        "bedrooms",
        "distance_to_city_center",
        "lot_size",
        "school_rating",
        "square_footage",
        "year_built",
      ].sort(),
    );
  });

  it("accepts a fully valid form", () => {
    expect(validateFeatures(valid())).toEqual({});
  });

  it("requires every field", () => {
    const errors = validateFeatures({} as FeatureValues);
    for (const field of FIELD_DEFS) {
      expect(errors[field.name]).toMatch(/required/);
    }
  });

  it("rejects non-numeric input", () => {
    expect(validateFeatures({ ...valid(), square_footage: "abc" }).square_footage).toMatch(
      /must be a number/,
    );
  });

  it("rejects fractional bedrooms", () => {
    expect(validateFeatures({ ...valid(), bedrooms: "2.5" }).bedrooms).toMatch(/whole number/);
  });

  it("accepts year_built exactly 1950", () => {
    expect(validateFeatures({ ...valid(), year_built: "1950" }).year_built).toBeUndefined();
  });

  it("rejects year_built below 1950", () => {
    expect(validateFeatures({ ...valid(), year_built: "1949" }).year_built).toMatch(
      /between 1950 and/,
    );
  });

  it("rejects square footage of zero (exclusive minimum)", () => {
    expect(validateFeatures({ ...valid(), square_footage: "0" }).square_footage).toMatch(
      /greater than 0/,
    );
  });

  it("rejects school rating above 10", () => {
    expect(validateFeatures({ ...valid(), school_rating: "10.5" }).school_rating).toMatch(
      /between 0 and 10/,
    );
  });
});

describe("toHouseFeatures", () => {
  it("converts whole-number fields to integers and the rest to decimals", () => {
    const features = toHouseFeatures(valid());
    expect(features.bedrooms).toBe(3);
    expect(features.year_built).toBe(1995);
    expect(features.school_rating).toBeCloseTo(7.5);
    expect(features.square_footage).toBe(2000);
  });
});
