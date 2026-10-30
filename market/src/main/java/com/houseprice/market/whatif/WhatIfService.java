package com.houseprice.market.whatif;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.houseprice.market.ml.MlClient;
import com.houseprice.market.ml.MlModels;
import com.houseprice.market.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * What-if analysis (a.iii): merges each scenario's changes over the
 * baseline, validates the result against the Task 1 sanity ranges, then
 * predicts the whole batch in a single call to the ML container — its
 * /predict endpoint accepts an array, so an N-scenario sweep is one
 * request. Outcomes carry the price and the delta vs the baseline.
 */
@Service
public class WhatIfService {

  private final MlClient mlClient;

  public WhatIfService(MlClient mlClient) {
    this.mlClient = mlClient;
  }

  public WhatIfModels.WhatIfResult analyze(WhatIfModels.WhatIfRequest request) {
    Map<String, String> errors = new LinkedHashMap<>();
    Map<String, Double> baseline = request.baseline().asMap();
    FeatureValidator.validate(baseline)
        .forEach((field, message) -> errors.put("baseline." + field, message));

    List<Map<String, Double>> merged = new ArrayList<>();
    for (int i = 0; i < request.scenarios().size(); i++) {
      WhatIfModels.ScenarioRequest scenario = request.scenarios().get(i);
      String prefix = "scenarios[" + i + "].";
      Map<String, Double> candidate = new LinkedHashMap<>(baseline);
      for (Map.Entry<String, Double> change : scenario.changes().entrySet()) {
        String feature = change.getKey();
        if (!FeatureValidator.FEATURE_NAMES.contains(feature)) {
          errors.put(prefix + "changes", "unknown feature '" + feature + "'. Valid features: "
              + String.join(", ", FeatureValidator.FEATURE_NAMES.stream().sorted().toList()) + ".");
          continue;
        }
        if (change.getValue() == null) {
          errors.put(prefix + feature, "must be a number.");
          continue;
        }
        candidate.put(feature, change.getValue());
      }
      FeatureValidator.validate(candidate)
          .forEach((field, message) -> errors.put(prefix + field, message));
      merged.add(candidate);
    }

    if (!errors.isEmpty()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Validation failed.", errors);
    }

    List<MlModels.MlHouse> batch = new ArrayList<>();
    batch.add(MlModels.MlHouse.from(baseline, "baseline"));
    for (int i = 0; i < request.scenarios().size(); i++) {
      batch.add(MlModels.MlHouse.from(merged.get(i), request.scenarios().get(i).name()));
    }

    MlModels.MlPredictResponse response = mlClient.predict(batch);
    MlModels.MlHousePrice baselineResult = response.predicts().get(0);
    long baselinePrice = baselineResult.price();
    List<WhatIfModels.ScenarioOutcome> outcomes = new ArrayList<>();
    for (int i = 0; i < request.scenarios().size(); i++) {
      MlModels.MlHousePrice result = response.predicts().get(i + 1);
      Long delta = baselinePrice > 0 && result.price() > 0
          ? result.price() - baselinePrice
          : null;
      outcomes.add(new WhatIfModels.ScenarioOutcome(
          request.scenarios().get(i).name(), result.price(), delta, result.reason()));
    }
    return new WhatIfModels.WhatIfResult(baselinePrice, baselineResult.reason(), outcomes);
  }
}
