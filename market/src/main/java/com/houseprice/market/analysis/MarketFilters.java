package com.houseprice.market.analysis;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.houseprice.market.data.House;
import com.houseprice.market.web.ApiException;
import org.springframework.http.HttpStatus;

/**
 * Optional segment filters (a.ii), one query param each. All bounds are
 * inclusive; unset bounds are ignored. Query params bind in camelCase
 * (e.g. `minYearBuilt`); the cache key and the `filters` echo use the
 * dataset's snake_case names.
 */
public record MarketFilters(
    Integer bedrooms,
    Integer minSquareFootage,
    Integer maxSquareFootage,
    Double minBathrooms,
    Double maxBathrooms,
    Integer minYearBuilt,
    Integer maxYearBuilt,
    Integer minLotSize,
    Integer maxLotSize,
    Double maxDistanceToCityCenter,
    Double minSchoolRating,
    Long minPrice,
    Long maxPrice) {

  /**
   * Reject bounds outside the dataset's sanity ranges (the same ranges
   * Task 1's HouseFeatures enforces) and min > max pairs. Without this,
   * typo'd query params silently return empty results; with it, they are
   * 400s. Called by every endpoint that binds these params.
   */
  public void validate() {
    List<String> problems = new ArrayList<>();
    bounds(problems, "bedrooms", bedrooms, 1d, 19d);
    bounds(problems, "min_square_footage", minSquareFootage, 0d, 100_000d, true, true);
    bounds(problems, "max_square_footage", maxSquareFootage, 0d, 100_000d, true, true);
    bounds(problems, "min_bathrooms", minBathrooms, 0d, 20d, true, true);
    bounds(problems, "max_bathrooms", maxBathrooms, 0d, 20d, true, true);
    bounds(problems, "min_year_built", minYearBuilt, 1950d, (double) (LocalDate.now().getYear() + 5));
    bounds(problems, "max_year_built", maxYearBuilt, 1950d, (double) (LocalDate.now().getYear() + 5));
    bounds(problems, "min_lot_size", minLotSize, 0d, 300_000d, true, true);
    bounds(problems, "max_lot_size", maxLotSize, 0d, 300_000d, true, true);
    bounds(problems, "max_distance_to_city_center", maxDistanceToCityCenter, 0d, 100d, true, true);
    bounds(problems, "min_school_rating", minSchoolRating, 0d, 10d);
    bounds(problems, "min_price", minPrice, 50_000d, null);
    bounds(problems, "max_price", maxPrice, 50_000d, null);
    pair(problems, "square_footage", minSquareFootage, maxSquareFootage);
    pair(problems, "bathrooms", minBathrooms, maxBathrooms);
    pair(problems, "year_built", minYearBuilt, maxYearBuilt);
    pair(problems, "lot_size", minLotSize, maxLotSize);
    pair(problems, "price", minPrice, maxPrice);
    if (!problems.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, String.join(" ", problems));
    }
  }

  private static void bounds(
      List<String> problems, String name, Number value, double min, Double max) {
    bounds(problems, name, value, min, max, false, false);
  }

  private static void bounds(
      List<String> problems,
      String name,
      Number value,
      double min,
      Double max,
      boolean minExclusive,
      boolean maxExclusive) {
    if (value == null) {
      return;
    }
    double v = value.doubleValue();
    if (minExclusive ? v <= min : v < min) {
      problems.add(name + " must be " + (minExclusive ? "> " : ">= ") + fmt(min) + ".");
    } else if (max != null && (maxExclusive ? v >= max : v > max)) {
      problems.add(name + " must be " + (maxExclusive ? "< " : "<= ") + fmt(max) + ".");
    }
  }

  private static void pair(List<String> problems, String name, Number min, Number max) {
    if (min != null && max != null && min.doubleValue() > max.doubleValue()) {
      problems.add("min_" + name + " must be <= max_" + name + ".");
    }
  }

  /** 1900 instead of 1900.0 in messages. */
  private static String fmt(double value) {
    return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
  }

  public boolean matches(House house) {
    return (bedrooms == null || house.bedrooms() == bedrooms)
        && (minSquareFootage == null || house.squareFootage() >= minSquareFootage)
        && (maxSquareFootage == null || house.squareFootage() <= maxSquareFootage)
        && (minBathrooms == null || house.bathrooms() >= minBathrooms)
        && (maxBathrooms == null || house.bathrooms() <= maxBathrooms)
        && (minYearBuilt == null || house.yearBuilt() >= minYearBuilt)
        && (maxYearBuilt == null || house.yearBuilt() <= maxYearBuilt)
        && (minLotSize == null || house.lotSize() >= minLotSize)
        && (maxLotSize == null || house.lotSize() <= maxLotSize)
        && (maxDistanceToCityCenter == null
            || house.distanceToCityCenter() <= maxDistanceToCityCenter)
        && (minSchoolRating == null || house.schoolRating() >= minSchoolRating)
        && (minPrice == null || house.price() >= minPrice)
        && (maxPrice == null || house.price() <= maxPrice);
  }

  /** Stable string of the applied bounds, used as the aggregates cache key. */
  public String toCacheKey() {
    StringBuilder key = new StringBuilder();
    append(key, "bedrooms", bedrooms);
    append(key, "min_square_footage", minSquareFootage);
    append(key, "max_square_footage", maxSquareFootage);
    append(key, "min_bathrooms", minBathrooms);
    append(key, "max_bathrooms", maxBathrooms);
    append(key, "min_year_built", minYearBuilt);
    append(key, "max_year_built", maxYearBuilt);
    append(key, "min_lot_size", minLotSize);
    append(key, "max_lot_size", maxLotSize);
    append(key, "max_distance_to_city_center", maxDistanceToCityCenter);
    append(key, "min_school_rating", minSchoolRating);
    append(key, "min_price", minPrice);
    append(key, "max_price", maxPrice);
    return key.toString();
  }

  /** The applied bounds in snake_case, echoed back in the aggregates response. */
  public Map<String, Object> applied() {
    Map<String, Object> map = new LinkedHashMap<>();
    put(map, "bedrooms", bedrooms);
    put(map, "min_square_footage", minSquareFootage);
    put(map, "max_square_footage", maxSquareFootage);
    put(map, "min_bathrooms", minBathrooms);
    put(map, "max_bathrooms", maxBathrooms);
    put(map, "min_year_built", minYearBuilt);
    put(map, "max_year_built", maxYearBuilt);
    put(map, "min_lot_size", minLotSize);
    put(map, "max_lot_size", maxLotSize);
    put(map, "max_distance_to_city_center", maxDistanceToCityCenter);
    put(map, "min_school_rating", minSchoolRating);
    put(map, "min_price", minPrice);
    put(map, "max_price", maxPrice);
    return map;
  }

  private static void append(StringBuilder builder, String name, Object value) {
    if (value != null) {
      builder.append(name).append('=').append(value).append(';');
    }
  }

  private static void put(Map<String, Object> map, String name, Object value) {
    if (value != null) {
      map.put(name, value);
    }
  }
}
