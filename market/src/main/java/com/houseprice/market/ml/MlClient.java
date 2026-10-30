package com.houseprice.market.ml;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import com.houseprice.market.web.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Client for the Task 1 ML container (b.iii): POST /api/v1/predict for
 * what-if batches, GET /api/v1/model-info passthrough and GET /api/health
 * for the /health probe. Transport failures surface as 502 ApiExceptions.
 */
@Service
public class MlClient {

  private static final Logger log = LoggerFactory.getLogger(MlClient.class);

  private final RestClient rest;

  public MlClient(RestClient rest) {
    this.rest = rest;
  }

  public MlModels.MlPredictResponse predict(List<MlModels.MlHouse> houses) {
    return call(() -> rest.post()
        .uri("/api/v1/predict")
        .contentType(MediaType.APPLICATION_JSON)
        .body(houses)
        .retrieve()
        .body(MlModels.MlPredictResponse.class));
  }

  public Map<String, Object> modelInfo() {
    return call(() -> rest.get()
        .uri("/api/v1/model-info")
        .retrieve()
        .body(new ParameterizedTypeReference<Map<String, Object>>() {}));
  }

  /** Best-effort reachability probe; never throws. */
  public boolean healthy() {
    try {
      rest.get().uri("/api/health").retrieve().toBodilessEntity();
      return true;
    } catch (RestClientException e) {
      log.warn("ML container health probe failed: {}", e.getMessage());
      return false;
    }
  }

  private <T> T call(Supplier<T> operation) {
    try {
      return operation.get();
    } catch (MlUpstreamException e) {
      throw new ApiException(HttpStatus.BAD_GATEWAY, "Prediction service: " + e.getMessage());
    } catch (RestClientException e) {
      throw new ApiException(HttpStatus.BAD_GATEWAY,
          "Prediction service unreachable: " + e.getMessage());
    }
  }
}
