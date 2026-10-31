package com.houseprice.market.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI metadata for the springdoc Swagger UI (Task 2 deliverable:
 * show the API live during the interview). Served at /swagger-ui.html
 * with the JSON at /v3/api-docs.
 */
@Configuration
public class OpenApiConfig {

  @Bean
  public OpenAPI marketOpenApi() {
    return new OpenAPI().info(new Info()
        .title("Property Market Analysis API")
        .description("Market analysis endpoints for the house-price portal (App 2 Java backend).")
        .version("1.0.0"));
  }
}
