package com.houseprice.market.data;

import java.io.IOException;
import java.io.StringReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import com.houseprice.market.config.MarketProperties;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Loads the housing CSV (b.ii) at startup — failing fast when missing or
 * malformed — and again on POST /api/market/reload. The dataset arrives
 * through the read-only volume shared with the predict service.
 */
@Component
public class DatasetLoader {

  private static final Logger log = LoggerFactory.getLogger(DatasetLoader.class);

  /** The dataset header row starts with a UTF-8 byte-order mark. */
  private static final String UTF8_BOM = new String(Character.toChars(0xFEFF));

  private static final Set<String> REQUIRED_COLUMNS = Set.of(
      "id", "square_footage", "bedrooms", "bathrooms", "year_built",
      "lot_size", "distance_to_city_center", "school_rating", "price");

  private final Path dataFile;
  private final MarketDataset dataset;

  public DatasetLoader(MarketProperties properties) {
    this.dataFile = Path.of(properties.dataFile());
    this.dataset = new MarketDataset(readCsv());
    log.info("Loaded {} houses from {}", dataset.size(), dataFile);
  }

  public MarketDataset dataset() {
    return dataset;
  }

  public int reload() {
    List<House> next = readCsv();
    dataset.replace(next);
    log.info("Reloaded {} houses from {}", next.size(), dataFile);
    return next.size();
  }

  private List<House> readCsv() {
    if (!Files.isRegularFile(dataFile)) {
      throw new IllegalStateException(
          "Dataset file not found: " + dataFile + " (mount ./predict/data at /data, or set DATA_FILE)");
    }
    String content;
    try {
      content = Files.readString(dataFile);
    } catch (IOException e) {
      throw new IllegalStateException("Cannot read dataset file " + dataFile + ": " + e.getMessage(), e);
    }
    content = content.replaceFirst("^" + Pattern.quote(UTF8_BOM), "");

    CSVFormat format = CSVFormat.DEFAULT.builder()
        .setHeader()
        .setSkipHeaderRecord(true)
        .setIgnoreEmptyLines(true)
        .setTrim(true)
        .build();

    List<House> houses = new ArrayList<>();
    try (CSVParser parser = format.parse(new StringReader(content))) {
      Map<String, Integer> header = parser.getHeaderMap();
      if (!header.keySet().containsAll(REQUIRED_COLUMNS)) {
        List<String> missing = REQUIRED_COLUMNS.stream()
            .filter(column -> !header.containsKey(column)).toList();
        throw new IllegalStateException("Dataset " + dataFile + " is missing columns: " + missing);
      }
      for (CSVRecord record : parser) {
        try {
          houses.add(new House(
              Long.parseLong(record.get("id")),
              Double.parseDouble(record.get("square_footage")),
              Integer.parseInt(record.get("bedrooms")),
              Double.parseDouble(record.get("bathrooms")),
              Integer.parseInt(record.get("year_built")),
              Double.parseDouble(record.get("lot_size")),
              Double.parseDouble(record.get("distance_to_city_center")),
              Double.parseDouble(record.get("school_rating")),
              Long.parseLong(record.get("price"))));
        } catch (NumberFormatException e) {
          throw new IllegalStateException(
              "Malformed row " + record.getRecordNumber() + " in " + dataFile + ": " + record, e);
        }
      }
    } catch (IOException e) {
      throw new IllegalStateException("Cannot parse dataset " + dataFile + ": " + e.getMessage(), e);
    }
    return houses;
  }
}
