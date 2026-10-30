package com.houseprice.market.web;

import java.util.LinkedHashMap;
import java.util.Map;

import com.houseprice.market.config.CacheConfig;
import com.houseprice.market.data.DatasetLoader;
import com.houseprice.market.ml.MlClient;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Liveness probe; also used by the Docker HEALTHCHECK. */
@RestController
public class HealthController {

  private final DatasetLoader loader;
  private final MlClient mlClient;

  public HealthController(DatasetLoader loader, MlClient mlClient) {
    this.loader = loader;
    this.mlClient = mlClient;
  }

  /** The ML reachability probe is cached briefly so healthchecks stay cheap. */
  @GetMapping("/health")
  @Cacheable(cacheNames = CacheConfig.ML_HEALTH, key = "'ml'")
  public Map<String, Object> health() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "ok");
    body.put("properties", loader.dataset().size());
    body.put("ml", mlClient.healthy() ? "ok" : "unreachable");
    return body;
  }
}
