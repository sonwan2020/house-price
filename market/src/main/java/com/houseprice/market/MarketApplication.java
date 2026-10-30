package com.houseprice.market;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Property market analysis service (App 2 backend). */
@SpringBootApplication
@ConfigurationPropertiesScan
public class MarketApplication {

  public static void main(String[] args) {
    SpringApplication.run(MarketApplication.class, args);
  }
}
