package com.houseprice.market.analysis;

import java.util.List;
import java.util.Map;

/** Response records for GET /api/v1/market/aggregates. */
public final class Aggregates {

  private Aggregates() {}

  /** Min/max/mean/median over one statistic; total only where meaningful. */
  public record PriceStats(Double min, Double max, Double mean, Double median, Long total) {}

  /** One segment band with its size and price summary. */
  public record BandCount(String band, int count, Double meanPrice, Double medianPrice) {}

  /** One bin of the price distribution. */
  public record HistogramBin(Double from, Double to, int count) {}

  /** Filtered aggregate statistics (b.ii). */
  public record Response(
      Map<String, Object> filters,
      int count,
      PriceStats price,
      PriceStats pricePerSqFt,
      List<BandCount> byBedrooms,
      List<BandCount> byYearBuiltBand,
      List<BandCount> bySchoolRatingBand,
      List<BandCount> byDistanceBand,
      List<HistogramBin> priceHistogram) {}
}
