package com.houseprice.market.config;

import java.time.Duration;

import com.houseprice.market.ml.MlUpstreamException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * HTTP client for the Task 1 ML container (b.iii). Built from Boot's
 * configured builder so the snake_case Jackson naming applies. The predict
 * endpoint answers 200/207/400 with the same body shape, so only those are
 * accepted; anything else raises {@link MlUpstreamException}, mapped to
 * 502 by {@link com.houseprice.market.ml.MlClient}.
 */
@Configuration
public class RestClientConfig {

  @Bean
  public RestClient mlRestClient(RestClient.Builder builder, MarketProperties properties) {
    SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
    factory.setConnectTimeout(Duration.ofSeconds(3));
    factory.setReadTimeout(Duration.ofSeconds(20));
    return builder
        .baseUrl(properties.pythonApiUrl())
        .requestFactory(factory)
        .defaultStatusHandler(
            status -> status.isError() && status.value() != 400,
            (request, response) -> {
              throw new MlUpstreamException(
                  "prediction service returned HTTP " + response.getStatusCode().value());
            })
        .build();
  }
}
