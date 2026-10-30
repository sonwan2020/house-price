package com.houseprice.market.analysis;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.ToDoubleFunction;

import com.houseprice.market.data.DatasetLoader;
import com.houseprice.market.data.House;
import com.houseprice.market.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Aggregate statistics (b.ii) over the housing dataset, scoped by the
 * segment filters. All computations run over the in-memory dataset;
 * results are cached per filter combination by the controller.
 */
@Service
public class MarketAnalysisService {

  private static final int HISTOGRAM_BINS = 8;

  private static final Map<String, Comparator<House>> SORTERS = createSorters();

  private final DatasetLoader loader;

  public MarketAnalysisService(DatasetLoader loader) {
    this.loader = loader;
  }

  public Aggregates.Response aggregates(MarketFilters filters) {
    List<House> filtered = filtered(filters);
    return new Aggregates.Response(
        filters.applied(),
        filtered.size(),
        priceStats(filtered, House::price, true),
        priceStats(filtered, house -> house.price() / house.squareFootage(), false),
        byBedrooms(filtered),
        byBand(filtered, house -> yearBand(house.yearBuilt()), List.of("Pre-1960", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020+")),
        byBand(filtered, house -> schoolBand(house.schoolRating()), List.of("<5", "5-6", "6-7", "7-8", "8-9", "9-10")),
        byBand(filtered, house -> distanceBand(house.distanceToCityCenter()), List.of("0-2 miles", "2-4 miles", "4-6 miles", "6-8 miles", "8+ miles")),
        priceHistogram(filtered));
  }

  /** Filtered rows in id order, used by the data table and CSV export. */
  public List<House> filtered(MarketFilters filters) {
    return loader.dataset().all().stream()
        .filter(filters::matches)
        .sorted(Comparator.comparingLong(House::id))
        .toList();
  }

  /** Filtered, sorted, paged rows for the data table (a.v). */
  public PropertiesPage properties(MarketFilters filters, String sortBy, String sortDir, int page, int size) {
    Comparator<House> sorter = SORTERS.get(sortBy);
    if (sorter == null) {
      throw new ApiException(HttpStatus.BAD_REQUEST,
          "Unknown sort_by '" + sortBy + "'. Valid values: " + String.join(", ", SORTERS.keySet()) + ".");
    }
    if ("desc".equals(sortDir)) {
      sorter = sorter.reversed();
    } else if (!"asc".equals(sortDir)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "sort_dir must be 'asc' or 'desc'.");
    }
    int safeSize = Math.clamp(size, 1, 100);
    int safePage = Math.max(page, 0);
    List<House> rows = loader.dataset().all().stream()
        .filter(filters::matches)
        .sorted(sorter)
        .toList();
    int from = Math.min(safePage * safeSize, rows.size());
    int to = Math.min(from + safeSize, rows.size());
    return new PropertiesPage(rows.size(), safePage, safeSize, rows.subList(from, to));
  }

  private static Aggregates.PriceStats priceStats(List<House> rows, ToDoubleFunction<House> value, boolean withTotal) {
    if (rows.isEmpty()) {
      return null;
    }
    double min = rows.stream().mapToDouble(value).min().orElseThrow();
    double max = rows.stream().mapToDouble(value).max().orElseThrow();
    double mean = rows.stream().mapToDouble(value).average().orElseThrow();
    List<Double> sorted = rows.stream().map(value::applyAsDouble).sorted().toList();
    double total = withTotal ? rows.stream().mapToDouble(value).sum() : 0;
    return new Aggregates.PriceStats(
        round1(min), round1(max), round1(mean), round1(median(sorted)), withTotal ? (long) total : null);
  }

  private static Aggregates.BandCount bandCount(List<House> rows, String band) {
    if (rows.isEmpty()) {
      return null;
    }
    List<Double> prices = rows.stream().map(house -> (double) house.price()).sorted().toList();
    double mean = prices.stream().mapToDouble(Double::doubleValue).average().orElseThrow();
    return new Aggregates.BandCount(band, rows.size(), round1(mean), round1(median(prices)));
  }

  private static List<Aggregates.BandCount> byBedrooms(List<House> rows) {
    List<Integer> bedroomCounts = rows.stream().map(House::bedrooms).distinct().sorted().toList();
    return bedroomCounts.stream()
        .map(count -> bandCount(
            rows.stream().filter(house -> house.bedrooms() == count).toList(),
            String.valueOf(count)))
        .filter(java.util.Objects::nonNull)
        .toList();
  }

  /** Groups rows into the given ordered bands; bands without rows are omitted. */
  private static List<Aggregates.BandCount> byBand(List<House> rows, Function<House, String> band, List<String> order) {
    Map<String, List<House>> byBand = new LinkedHashMap<>();
    order.forEach(label -> byBand.put(label, new ArrayList<>()));
    rows.forEach(house -> byBand.computeIfAbsent(band.apply(house), label -> new ArrayList<>()).add(house));
    return byBand.entrySet().stream()
        .map(entry -> bandCount(entry.getValue(), entry.getKey()))
        .filter(java.util.Objects::nonNull)
        .toList();
  }

  private static List<Aggregates.HistogramBin> priceHistogram(List<House> rows) {
    if (rows.isEmpty()) {
      return List.of();
    }
    double min = rows.stream().mapToDouble(House::price).min().orElseThrow();
    double max = rows.stream().mapToDouble(House::price).max().orElseThrow();
    if (max == min) {
      return List.of(new Aggregates.HistogramBin(min, min + 1, rows.size()));
    }
    double width = (max - min) / HISTOGRAM_BINS;
    List<Aggregates.HistogramBin> bins = new ArrayList<>();
    for (int i = 0; i < HISTOGRAM_BINS; i++) {
      int index = i;
      double from = min + i * width;
      double to = i == HISTOGRAM_BINS - 1 ? max : min + (i + 1) * width;
      int count = (int) rows.stream()
          .filter(house -> house.price() >= from
              && (index == HISTOGRAM_BINS - 1 ? house.price() <= to : house.price() < to))
          .count();
      bins.add(new Aggregates.HistogramBin(round1(from), round1(to), count));
    }
    return bins;
  }

  private static String yearBand(int year) {
    if (year < 1960) {
      return "Pre-1960";
    }
    if (year >= 2020) {
      return "2020+";
    }
    return (year / 10) * 10 + "s";
  }

  private static String schoolBand(double rating) {
    if (rating < 5) {
      return "<5";
    }
    if (rating < 6) {
      return "5-6";
    }
    if (rating < 7) {
      return "6-7";
    }
    if (rating < 8) {
      return "7-8";
    }
    if (rating < 9) {
      return "8-9";
    }
    return "9-10";
  }

  private static String distanceBand(double miles) {
    if (miles < 2) {
      return "0-2 miles";
    }
    if (miles < 4) {
      return "2-4 miles";
    }
    if (miles < 6) {
      return "4-6 miles";
    }
    if (miles < 8) {
      return "6-8 miles";
    }
    return "8+ miles";
  }

  private static double median(List<Double> sorted) {
    int middle = sorted.size() / 2;
    return sorted.size() % 2 == 1
        ? sorted.get(middle)
        : (sorted.get(middle - 1) + sorted.get(middle)) / 2;
  }

  private static double round1(double value) {
    return Math.round(value * 10) / 10.0;
  }

  private static Map<String, Comparator<House>> createSorters() {
    Map<String, Comparator<House>> sorters = new LinkedHashMap<>();
    sorters.put("id", Comparator.comparingLong(House::id));
    sorters.put("square_footage", Comparator.comparingDouble(House::squareFootage));
    sorters.put("bedrooms", Comparator.comparingInt(House::bedrooms));
    sorters.put("bathrooms", Comparator.comparingDouble(House::bathrooms));
    sorters.put("year_built", Comparator.comparingInt(House::yearBuilt));
    sorters.put("lot_size", Comparator.comparingDouble(House::lotSize));
    sorters.put("distance_to_city_center", Comparator.comparingDouble(House::distanceToCityCenter));
    sorters.put("school_rating", Comparator.comparingDouble(House::schoolRating));
    sorters.put("price", Comparator.comparingLong(House::price));
    return sorters;
  }
}
