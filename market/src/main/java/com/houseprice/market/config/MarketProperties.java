package com.houseprice.market.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Service configuration, bound from the `market.*` keys in application.yml. */
@ConfigurationProperties(prefix = "market")
public record MarketProperties(
    String dataFile,
    String pythonApiUrl,
    long aggregatesCacheTtlSeconds,
    long mlCacheTtlSeconds) {}
