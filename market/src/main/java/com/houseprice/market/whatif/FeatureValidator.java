package com.houseprice.market.whatif;

import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Sanity ranges mirroring the Task 1 model schema
 * (predict/app/schemas/predict.py, HouseFeatures). What-if inputs are
 * validated before the batch is sent, so the ML container never sees a
 * request it would reject.
 */
public final class FeatureValidator {

  private static final int MAX_YEAR_BUILT = Year.now().getValue() + 5;

  public static final Set<String> FEATURE_NAMES = Set.of(
      "square_footage", "bedrooms", "bathrooms", "year_built",
      "lot_size", "distance_to_city_center", "school_rating");

  private FeatureValidator() {}

  /** Validates every feature; returns field -> message, empty when valid. */
  public static Map<String, String> validate(Map<String, Double> features) {
    Map<String, String> errors = new LinkedHashMap<>();
    for (String name : FEATURE_NAMES) {
      Double value = features.get(name);
      if (value == null) {
        errors.put(name, name + " is required.");
        continue;
      }
      validateValue(name, value, errors);
    }
    return errors;
  }

  private static void validateValue(String name, double value, Map<String, String> errors) {
    switch (name) {
      case "square_footage" -> {
        if (value <= 0) {
          errors.put(name, "must be greater than 0.");
        } else if (value > 100_000) {
          errors.put(name, "must be at most 100,000.");
        }
      }
      case "bedrooms" -> {
        if (value != Math.floor(value)) {
          errors.put(name, "must be a whole number.");
        } else if (value < 1 || value > 20) {
          errors.put(name, "must be between 1 and 20.");
        }
      }
      case "bathrooms" -> {
        if (value <= 0) {
          errors.put(name, "must be greater than 0.");
        } else if (value > 20) {
          errors.put(name, "must be at most 20.");
        }
      }
      case "year_built" -> {
        if (value != Math.floor(value)) {
          errors.put(name, "must be a whole number.");
        } else if (value < 1950 || value > MAX_YEAR_BUILT) {
          errors.put(name, "must be between 1950 and " + MAX_YEAR_BUILT + ".");
        }
      }
      case "lot_size" -> {
        if (value <= 0) {
          errors.put(name, "must be greater than 0.");
        } else if (value > 1_000_000) {
          errors.put(name, "must be at most 1,000,000.");
        }
      }
      case "distance_to_city_center" -> {
        if (value < 0) {
          errors.put(name, "must be at least 0.");
        } else if (value > 1_000) {
          errors.put(name, "must be at most 1,000.");
        }
      }
      case "school_rating" -> {
        if (value < 0 || value > 10) {
          errors.put(name, "must be between 0 and 10.");
        }
      }
      default -> errors.put(name, "unknown feature.");
    }
  }
}
