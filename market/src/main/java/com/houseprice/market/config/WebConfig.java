package com.houseprice.market.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allow local portal dev servers to call the API directly from the
 * browser; the deployed portal proxies server-side instead.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:3000", "http://127.0.0.1:3000")
        .allowedMethods("GET", "POST");
  }
}
