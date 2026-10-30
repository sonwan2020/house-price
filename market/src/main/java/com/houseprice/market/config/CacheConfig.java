package com.houseprice.market.config;

import java.time.Duration;
import java.util.List;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Caching (b.iv): in-memory Caffeine caches with per-cache TTLs.
 * `aggregates` holds filtered aggregate results, `whatIf` prediction
 * batches, `ml` the model-info passthrough and `mlHealth` the short-lived
 * ML reachability probe used by /health. POST /api/market/reload evicts
 * all of them.
 */
@Configuration
@EnableCaching
public class CacheConfig {

  public static final String AGGREGATES = "aggregates";
  public static final String WHAT_IF = "whatIf";
  public static final String ML = "ml";
  public static final String ML_HEALTH = "mlHealth";

  @Bean
  public CacheManager cacheManager(MarketProperties properties) {
    SimpleCacheManager manager = new SimpleCacheManager();
    manager.setCaches(List.of(
        caffeine(AGGREGATES, properties.aggregatesCacheTtlSeconds(), 500),
        caffeine(WHAT_IF, properties.mlCacheTtlSeconds(), 500),
        caffeine(ML, properties.mlCacheTtlSeconds(), 10),
        caffeine(ML_HEALTH, 10, 1)));
    return manager;
  }

  private static Cache caffeine(String name, long ttlSeconds, long maxSize) {
    return new CaffeineCache(name, Caffeine.newBuilder()
        .expireAfterWrite(Duration.ofSeconds(ttlSeconds))
        .maximumSize(maxSize)
        .build());
  }
}
