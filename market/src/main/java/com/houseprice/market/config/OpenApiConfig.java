package com.houseprice.market.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI metadata for the springdoc Swagger UI (Task 2 deliverable:
 * show the API live during the interview). Served at /swagger-ui.html
 * with the JSON at /v3/api-docs. The version in the info block matches
 * the /api/v1 URL prefix: bump the minor version when the v1 surface
 * changes in a backwards-compatible way.
 */
@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI marketOpenApi() {
    return new OpenAPI().info(new Info()
        .title("Property Market Analysis API v1")
        .description("Market analysis endpoints for the house-price portal (App 2 Java backend), "
            + "versioned under /api/v1/market.")
        .version("1.0.0"));
  }
}
