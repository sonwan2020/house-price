package com.houseprice.market.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import com.houseprice.market.data.House;
import org.junit.jupiter.api.Test;

class CsvExporterTest {

  @Test
  void exportsHeaderAndRows() {
    CsvExporter exporter = new CsvExporter();
    String csv = exporter.toCsv(List.of(
        new House(1, 1250, 2, 1, 1985, 5200, 3.2, 7.1, 185000),
        new House(2, 1850, 3, 2, 1998, 7500, 5.6, 8.2, 265000)));

    String[] lines = csv.split("\\r?\\n");
    assertThat(lines[0]).isEqualTo("id,square_footage,bedrooms,bathrooms,year_built,lot_size,"
        + "distance_to_city_center,school_rating,price");
    assertThat(lines[1]).isEqualTo("1,1250,2,1,1985,5200,3.2,7.1,185000");
    assertThat(lines[2]).isEqualTo("2,1850,3,2,1998,7500,5.6,8.2,265000");
  }
}
