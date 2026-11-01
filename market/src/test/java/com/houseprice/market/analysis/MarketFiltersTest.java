package com.houseprice.market.analysis;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.houseprice.market.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/**
 * Range validation of the /aggregates, /listings and /export query filters.
 * The feature bounds are open intervals (both ends exclusive), mirroring
 * Task 1's HouseFeatures schema.
 */
class MarketFiltersTest {

  private static final MarketFilters EMPTY =
      new MarketFilters(null, null, null, null, null, null, null, null, null, null, null, null, null);

  private static final MarketFilters IN_RANGE =
      new MarketFilters(3, 1000, 4000, 1.5d, 3d, 1960, 2020, 5000, 10000, 20d, 7.5d, 200_000L, 800_000L);

  @Test
  void acceptsUnsetFilters() {
    assertDoesNotThrow(EMPTY::validate);
  }

  @Test
  void acceptsInRangeBounds() {
    assertDoesNotThrow(IN_RANGE::validate);
  }

  @Test
  void acceptsBoundsJustInsideOpenIntervals() {
    // Just inside every open interval: the extreme-but-valid bounds.
    MarketFilters filters = new MarketFilters(19, 1, 99_999, 0.5d, 19.5d,
        null, null, 1, 299_999, 99.9d, null, 50_000L, null);
    assertDoesNotThrow(filters::validate);
  }

  @Test
  void rejectsSquareFootageZero() {
    MarketFilters filters = new MarketFilters(null, 0, null, null, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("min_square_footage must be > 0"));
  }

  @Test
  void rejectsSquareFootageAtMax() {
    MarketFilters filters = new MarketFilters(null, null, 100_000, null, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("max_square_footage must be < 100000"));
  }

  @Test
  void rejectsBedroomsBelowOne() {
    MarketFilters filters = new MarketFilters(0, null, null, null, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("bedrooms must be >= 1"));
  }

  @Test
  void rejectsBedroomsAtTwenty() {
    MarketFilters filters = new MarketFilters(20, null, null, null, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("bedrooms must be <= 19"));
  }

  @Test
  void acceptsHalfBathBound() {
    // 0.5 is a valid bathroom count (half baths allowed), so it is a valid bound.
    MarketFilters filters = new MarketFilters(null, null, null, 0.5d, null, null, null,
        null, null, null, null, null, null);
    assertDoesNotThrow(filters::validate);
  }

  @Test
  void rejectsBathroomsZero() {
    MarketFilters filters = new MarketFilters(null, null, null, 0d, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("min_bathrooms must be > 0"));
  }

  @Test
  void rejectsBathroomsAtTwenty() {
    MarketFilters filters = new MarketFilters(null, null, null, null, 20d, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("max_bathrooms must be < 20"));
  }

  @Test
  void rejectsLotSizeAtMax() {
    MarketFilters filters = new MarketFilters(null, null, null, null, null, null, null,
        null, 300_000, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("max_lot_size must be < 300000"));
  }

  @Test
  void rejectsDistanceZero() {
    MarketFilters filters = new MarketFilters(null, null, null, null, null, null, null,
        null, null, 0d, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("max_distance_to_city_center must be > 0"));
  }

  @Test
  void rejectsDistanceAtHundred() {
    MarketFilters filters = new MarketFilters(null, null, null, null, null, null, null,
        null, null, 100d, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("max_distance_to_city_center must be < 100"));
  }

  @Test
  void rejectsMinPriceBelowFloor() {
    MarketFilters filters = new MarketFilters(null, null, null, null, null, null, null,
        null, null, null, null, -5L, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("min_price must be >= 50000"));
  }

  @Test
  void rejectsMinAboveMax() {
    MarketFilters filters = new MarketFilters(null, null, null, null, null, 1990, 1950,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("min_year_built must be <= max_year_built"));
  }

  @Test
  void collectsMultipleProblemsInOneMessage() {
    MarketFilters filters = new MarketFilters(0, null, null, null, null, null, null,
        null, null, null, 15d, -1L, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("bedrooms"));
    assertTrue(ex.getMessage().contains("min_school_rating"));
    assertTrue(ex.getMessage().contains("min_price"));
  }
}
