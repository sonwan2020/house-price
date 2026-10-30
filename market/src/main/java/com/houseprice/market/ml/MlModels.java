package com.houseprice.market.ml;

import java.util.List;
import java.util.Map;

/** DTOs mirroring the Task 1 schemas (predict/app/schemas/predict.py). */
public final class MlModels {

  private MlModels() {}

  /** One house to predict; features are snake_case on the wire. */
  public record MlHouse(
      String id,
      double squareFootage,
      int bedrooms,
      double bathrooms,
      int yearBuilt,
      double lotSize,
      double distanceToCityCenter,
      double schoolRating) {

    public static MlHouse from(Map<String, Double> features, String id) {
      return new MlHouse(
          id,
          features.get("square_footage"),
          features.get("bedrooms").intValue(),
          features.get("bathrooms"),
          features.get("year_built").intValue(),
          features.get("lot_size"),
          features.get("distance_to_city_center"),
          features.get("school_rating"));
    }
  }

  public record MlSummary(int total, int succeed, int failed) {}

  public record MlHousePrice(int index, String id, long price, String reason) {}

  /** Response body of POST /api/v1/predict, in input order. */
  public record MlPredictResponse(MlSummary summary, List<MlHousePrice> predicts) {}
}
