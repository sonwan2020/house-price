package com.houseprice.market.analysis;

import java.util.LinkedHashMap;
import java.util.Map;

import com.houseprice.market.data.House;

/**
 * Optional segment filters (a.ii), one query param each. All bounds are
 * inclusive; unset bounds are ignored. Query params bind in camelCase
 * (e.g. `minYearBuilt`); the cache key and the `filters` echo use the
 * dataset's snake_case names.
 */
public record MarketFilters(
    Integer bedrooms,
    Double minSquareFootage,
    Double maxSquareFootage,
    Double minBathrooms,
    Double maxBathrooms,
    Integer minYearBuilt,
    Integer maxYearBuilt,
    Double minLotSize,
    Double maxLotSize,
    Double maxDistanceToCityCenter,
    Double minSchoolRating,
    Long minPrice,
    Long maxPrice) {

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
