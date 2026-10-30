package com.houseprice.market.data;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import com.houseprice.market.config.MarketProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DatasetLoaderTest {

  @TempDir
  Path tempDir;

  private static final String HEADER =
      "id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance_to_city_center,school_rating,price";

  private MarketProperties properties(String fileName) {
    return new MarketProperties(tempDir.resolve(fileName).toString(), "http://api:8000", 300, 60);
  }

  @Test
  void loadsRowsAndStripsBom() throws IOException {
    Path csv = tempDir.resolve("houses.csv");
    Files.writeString(csv, new String(Character.toChars(0xFEFF)) + HEADER + "\n1,1250,2,1,1985,5200,3.2,7.1,185000\n");

    DatasetLoader loader = new DatasetLoader(properties("houses.csv"));

    assertThat(loader.dataset().size()).isEqualTo(1);
    House first = loader.dataset().all().get(0);
    assertThat(first.id()).isEqualTo(1);
    assertThat(first.squareFootage()).isEqualTo(1250.0);
    assertThat(first.bedrooms()).isEqualTo(2);
    assertThat(first.price()).isEqualTo(185000);
  }

  @Test
  void failsFastWhenFileMissing() {
    assertThatThrownBy(() -> new DatasetLoader(properties("missing.csv")))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("not found");
  }

  @Test
  void reloadPicksUpChanges() throws IOException {
    Path csv = tempDir.resolve("houses.csv");
    Files.writeString(csv, HEADER + "\n1,1250,2,1,1985,5200,3.2,7.1,185000\n");
    DatasetLoader loader = new DatasetLoader(properties("houses.csv"));
    Files.writeString(csv, HEADER
        + "\n1,1250,2,1,1985,5200,3.2,7.1,185000\n"
        + "\n2,1850,3,2,1998,7500,5.6,8.2,265000\n");

    assertThat(loader.reload()).isEqualTo(2);
    assertThat(loader.dataset().size()).isEqualTo(2);
  }
}
