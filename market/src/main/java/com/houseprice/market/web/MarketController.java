package com.houseprice.market.web;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.houseprice.market.analysis.Aggregates;
import com.houseprice.market.analysis.MarketAnalysisService;
import com.houseprice.market.analysis.MarketFilters;
import com.houseprice.market.analysis.PropertiesPage;
import com.houseprice.market.config.CacheConfig;
import com.houseprice.market.data.DatasetLoader;
import com.houseprice.market.data.House;
import com.houseprice.market.export.CsvExporter;
import com.houseprice.market.export.PdfExporter;
import com.houseprice.market.ml.MlClient;
import com.houseprice.market.whatif.WhatIfModels;
import com.houseprice.market.whatif.WhatIfService;
import jakarta.validation.Valid;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Market analysis endpoints (b.i). JSON keys are snake_case to match the
 * Task 1 vocabulary; query params bind in camelCase — the JSON name
 * `min_year_built` is the query parameter `minYearBuilt`.
 */
@RestController
@RequestMapping("/api/market")
public class MarketController {

  private final MarketAnalysisService analysis;
  private final WhatIfService whatIf;
  private final CsvExporter csvExporter;
  private final PdfExporter pdfExporter;
  private final MlClient mlClient;
  private final DatasetLoader loader;

  public MarketController(
      MarketAnalysisService analysis,
      WhatIfService whatIf,
      CsvExporter csvExporter,
      PdfExporter pdfExporter,
      MlClient mlClient,
      DatasetLoader loader) {
    this.analysis = analysis;
    this.whatIf = whatIf;
    this.csvExporter = csvExporter;
    this.pdfExporter = pdfExporter;
    this.mlClient = mlClient;
    this.loader = loader;
  }

  /** Filtered aggregate statistics for the dashboard (a.i/a.ii). */
  @GetMapping("/aggregates")
  @Cacheable(cacheNames = CacheConfig.AGGREGATES, key = "#filters.toCacheKey()")
  public Aggregates.Response aggregates(MarketFilters filters) {
    return analysis.aggregates(filters);
  }

  /** Paged, sorted, filtered dataset rows for the data table (a.v). */
  @GetMapping("/properties")
  public PropertiesPage properties(
      MarketFilters filters,
      @RequestParam(defaultValue = "id") String sortBy,
      @RequestParam(defaultValue = "asc") String sortDir,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    return analysis.properties(filters, sortBy, sortDir, page, size);
  }

  /** What-if scenarios (a.iii): baseline + changes, predicted by the Task 1 model. */
  @PostMapping("/what-if")
  @Cacheable(cacheNames = CacheConfig.WHAT_IF, key = "#request.toString()")
  public WhatIfModels.WhatIfResult whatIf(@Valid @RequestBody WhatIfModels.WhatIfRequest request) {
    return whatIf.analyze(request);
  }

  /** Filtered dataset rows as a downloadable CSV (a.iv). */
  @GetMapping("/export.csv")
  public ResponseEntity<String> exportCsv(MarketFilters filters) {
    List<House> rows = analysis.filtered(filters);
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
    headers.setContentDisposition(ContentDisposition.attachment()
        .filename("market-properties-" + LocalDate.now() + ".csv").build());
    return new ResponseEntity<>(csvExporter.toCsv(rows), headers, HttpStatus.OK);
  }

  /** Filtered aggregates as a downloadable PDF summary (a.iv). */
  @GetMapping("/export.pdf")
  public ResponseEntity<byte[]> exportPdf(MarketFilters filters) {
    byte[] pdf = pdfExporter.toPdf(analysis.aggregates(filters));
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(ContentDisposition.attachment()
        .filename("market-analysis-" + LocalDate.now() + ".pdf").build());
    return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
  }

  /** Task 1 model metadata, passed through and cached (b.iii). */
  @GetMapping("/model-info")
  @Cacheable(cacheNames = CacheConfig.ML, key = "'model-info'")
  public Map<String, Object> modelInfo() {
    return mlClient.modelInfo();
  }

  /** Re-read the mounted dataset CSV and drop all caches. */
  @PostMapping("/reload")
  @CacheEvict(cacheNames = {CacheConfig.AGGREGATES, CacheConfig.WHAT_IF, CacheConfig.ML, CacheConfig.ML_HEALTH}, allEntries = true)
  public Map<String, Object> reload() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "reloaded");
    body.put("properties", loader.reload());
    return body;
  }
}
