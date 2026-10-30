package com.houseprice.market.export;

import java.io.IOException;
import java.io.StringWriter;
import java.math.BigDecimal;
import java.util.List;

import com.houseprice.market.data.House;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Component;

/** CSV export (a.iv) of the filtered dataset rows. */
@Component
public class CsvExporter {

  private static final String[] HEADER = {
      "id", "square_footage", "bedrooms", "bathrooms", "year_built",
      "lot_size", "distance_to_city_center", "school_rating", "price"};

  public String toCsv(List<House> houses) {
    StringWriter writer = new StringWriter();
    try (CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader(HEADER).build())) {
      for (House house : houses) {
        printer.printRecord(
            house.id(), fmt(house.squareFootage()), house.bedrooms(), fmt(house.bathrooms()),
            house.yearBuilt(), fmt(house.lotSize()), fmt(house.distanceToCityCenter()),
            fmt(house.schoolRating()), house.price());
      }
    } catch (IOException e) {
      throw new IllegalStateException("CSV export failed", e);
    }
    return writer.toString();
  }

  /** Doubles without trailing zeros: 1.0 -> "1", 3.25 -> "3.25". */
  private static String fmt(double value) {
    return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
  }
}
