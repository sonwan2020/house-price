package com.houseprice.market.analysis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import com.houseprice.market.config.MarketProperties;
import com.houseprice.market.data.DatasetLoader;
import com.houseprice.market.web.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;

class MarketAnalysisServiceTest {

  @TempDir
  Path tempDir;

  private MarketAnalysisService service;

  @BeforeEach
  void setUp() throws IOException {
    Path csv = tempDir.resolve("houses.csv");
    Files.writeString(csv, """
        id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance_to_city_center,school_rating,price
        1,1250,2,1,1985,5200,3.2,7.1,185000
        2,1850,3,2,1998,7500,5.6,8.2,265000
        3,2100,4,2.5,2005,9000,2.1,9.1,345000
        4,1600,3,2,2012,6800,6.8,6.4,240000
        5,1400,2,1.5,1995,6000,1.5,5.5,210000
        6,2300,4,3,2008,10200,8.0,7.8,395000
        """);
    DatasetLoader loader = new DatasetLoader(
        new MarketProperties(csv.toString(), "http://api:8000", 300, 60));
    service = new MarketAnalysisService(loader);
  }

  private static final MarketFilters NONE = new MarketFilters(
      null, null, null, null, null, null, null, null, null, null, null, null, null);

  @Test
  void aggregatesOverAllRows() {
    Aggregates.Response response = service.aggregates(NONE);

    assertThat(response.count()).isEqualTo(6);
    assertThat(response.price().min()).isEqualTo(185000.0);
    assertThat(response.price().max()).isEqualTo(395000.0);
    assertThat(response.price().mean()).isEqualTo(273333.3);
    assertThat(response.price().median()).isEqualTo(252500.0);
    assertThat(response.price().total()).isEqualTo(1_640_000);

    assertThat(response.byBedrooms()).extracting(Aggregates.BandCount::band)
        .containsExactly("2", "3", "4");
    assertThat(response.byBedrooms().get(0).count()).isEqualTo(2);

    assertThat(response.byYearBuiltBand()).extracting(Aggregates.BandCount::band)
        .containsExactly("1980s", "1990s", "2000s", "2010s");

    assertThat(response.bySchoolRatingBand()).extracting(Aggregates.BandCount::band)
        .containsExactly("5-6", "6-7", "7-8", "8-9", "9-10");

    assertThat(response.byDistanceBand()).extracting(Aggregates.BandCount::band)
        .containsExactly("0-2 miles", "2-4 miles", "4-6 miles", "6-8 miles", "8+ miles");

    assertThat(response.priceHistogram()).hasSize(8);
    assertThat(response.priceHistogram().stream().mapToInt(Aggregates.HistogramBin::count).sum())
        .isEqualTo(6);
  }

  @Test
  void aggregatesHonorFilters() {
    Aggregates.Response response = service.aggregates(new MarketFilters(
        3, null, null, null, null, null, null, null, null, null, null, null, null));

    assertThat(response.count()).isEqualTo(2);
    assertThat(response.filters()).containsEntry("bedrooms", 3);
    assertThat(response.price().min()).isEqualTo(240000.0);
  }

  @Test
  void emptySegmentYieldsNoStats() {
    Aggregates.Response response = service.aggregates(new MarketFilters(
        9, null, null, null, null, null, null, null, null, null, null, null, null));

    assertThat(response.count()).isZero();
    assertThat(response.price()).isNull();
    assertThat(response.priceHistogram()).isEmpty();
  }

  @Test
  void propertiesSortAndPage() {
    PropertiesPage firstPage = service.properties(NONE, "price", "desc", 0, 2);
    assertThat(firstPage.total()).isEqualTo(6);
    assertThat(firstPage.properties()).extracting(price -> price.price())
        .containsExactly(395000L, 345000L);

    PropertiesPage secondPage = service.properties(NONE, "price", "desc", 1, 2);
    assertThat(secondPage.properties()).extracting(price -> price.price())
        .containsExactly(265000L, 240000L);
  }

  @Test
  void propertiesRejectUnknownSortAndDir() {
    assertThatThrownBy(() -> service.properties(NONE, "garages", "asc", 0, 50))
        .isInstanceOf(ApiException.class)
        .satisfies(e -> {
          assertThat(((ApiException) e).status()).isEqualTo(HttpStatus.BAD_REQUEST);
          assertThat(e.getMessage()).contains("Unknown sort_by");
        });
    assertThatThrownBy(() -> service.properties(NONE, "price", "sideways", 0, 50))
        .isInstanceOf(ApiException.class)
        .hasMessageContaining("sort_dir");
  }

  @Test
  void filteredReturnsRowsInIdOrder() {
    List<Long> ids = service.filtered(NONE).stream().map(house -> house.id()).toList();
    assertThat(ids).containsExactly(1L, 2L, 3L, 4L, 5L, 6L);
  }
}
