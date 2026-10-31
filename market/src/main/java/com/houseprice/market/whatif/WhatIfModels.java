package com.houseprice.market.whatif;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Request/response records for POST /api/v1/market/what-if (a.iii). */
public final class WhatIfModels {

  private WhatIfModels() {}

  /** A fully specified house; scenario changes are applied over these values. */
  public record HouseFeaturesRequest(
      @NotNull(message = "square_footage is required.") Double squareFootage,
      @NotNull(message = "bedrooms is required.") Integer bedrooms,
      @NotNull(message = "bathrooms is required.") Double bathrooms,
      @NotNull(message = "year_built is required.") Integer yearBuilt,
      @NotNull(message = "lot_size is required.") Double lotSize,
      @NotNull(message = "distance_to_city_center is required.") Double distanceToCityCenter,
      @NotNull(message = "school_rating is required.") Double schoolRating) {

    public Map<String, Double> asMap() {
      Map<String, Double> map = new LinkedHashMap<>();
      map.put("square_footage", squareFootage);
      map.put("bedrooms", (double) bedrooms);
      map.put("bathrooms", bathrooms);
      map.put("year_built", (double) yearBuilt);
      map.put("lot_size", lotSize);
      map.put("distance_to_city_center", distanceToCityCenter);
      map.put("school_rating", schoolRating);
      return map;
    }
  }

  /** One scenario: a name plus the features to change relative to the baseline. */
  public record ScenarioRequest(
      @NotBlank(message = "scenario name is required.") @Size(max = 60, message = "scenario name must be at most 60 characters.") String name,
      @NotNull(message = "changes are required.") @Size(min = 1, max = 7, message = "changes must contain 1 to 7 features.") Map<String, Double> changes) {}

  public record WhatIfRequest(
      @NotNull(message = "baseline is required.") @Valid HouseFeaturesRequest baseline,
      @NotNull(message = "scenarios is required.") @Size(min = 1, max = 50, message = "scenarios must contain 1 to 50 items.") List<@Valid ScenarioRequest> scenarios) {}

  public record ScenarioOutcome(String name, Long price, Long delta, String reason) {}

  /** Baseline prediction plus one outcome per scenario; delta vs baseline. */
  public record WhatIfResult(Long baselinePrice, String baselineReason, List<ScenarioOutcome> scenarios) {}
}
