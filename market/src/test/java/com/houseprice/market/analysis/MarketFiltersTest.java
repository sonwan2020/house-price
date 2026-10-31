package com.houseprice.market.analysis;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.houseprice.market.web.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

/** Range validation of the /aggregates, /properties and /export query filters. */
class MarketFiltersTest {

  private static final MarketFilters EMPTY =
      new MarketFilters(null, null, null, null, null, null, null, null, null, null, null, null, null);

  private static final MarketFilters IN_RANGE =
      new MarketFilters(3, 1000d, 4000d, 1.5d, 3d, 1960, 2020, 2000d, 10000d, 20d, 7.5d, 200_000L, 800_000L);

  @Test
  void acceptsUnsetFilters() {
    assertDoesNotThrow(EMPTY::validate);
  }

  @Test
  void acceptsInRangeBounds() {
    assertDoesNotThrow(IN_RANGE::validate);
  }

  @Test
  void rejectsBedroomsOutsideDatasetRange() {
    MarketFilters filters = new MarketFilters(99, null, null, null, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertEquals(HttpStatus.BAD_REQUEST, ex.status());
    assertTrue(ex.getMessage().contains("bedrooms must be"));
  }

  @Test
  void rejectsNegativeMinPrice() {
    MarketFilters filters = new MarketFilters(null, null, null, null, null, null, null,
        null, null, null, null, -5L, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("min_price must be >= 0"));
  }

  @Test
  void rejectsZeroSquareFootageBound() {
    // Task 1's sanity range is exclusive of 0 (gt), so a 0 lower bound is invalid.
    MarketFilters filters = new MarketFilters(null, 0d, null, null, null, null, null,
        null, null, null, null, null, null);
    ApiException ex = assertThrows(ApiException.class, filters::validate);
    assertTrue(ex.getMessage().contains("min_square_footage must be > 0"));
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
