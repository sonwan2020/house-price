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
import com.houseprice.market.export.WhatIfCsvExporter;
import com.houseprice.market.export.WhatIfPdfExporter;
import com.houseprice.market.ml.MlClient;
import com.houseprice.market.whatif.WhatIfExportModels;
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
@RequestMapping("/api/v1/market")
public class MarketController {

  private final MarketAnalysisService analysis;
  private final WhatIfService whatIf;
  private final CsvExporter csvExporter;
  private final PdfExporter pdfExporter;
  private final WhatIfCsvExporter whatIfCsvExporter;
  private final WhatIfPdfExporter whatIfPdfExporter;
  private final MlClient mlClient;
  private final DatasetLoader loader;

  public MarketController(
      MarketAnalysisService analysis,
      WhatIfService whatIf,
      CsvExporter csvExporter,
      PdfExporter pdfExporter,
      WhatIfCsvExporter whatIfCsvExporter,
      WhatIfPdfExporter whatIfPdfExporter,
      MlClient mlClient,
      DatasetLoader loader) {
    this.analysis = analysis;
    this.whatIf = whatIf;
    this.csvExporter = csvExporter;
    this.pdfExporter = pdfExporter;
    this.whatIfCsvExporter = whatIfCsvExporter;
    this.whatIfPdfExporter = whatIfPdfExporter;
    this.mlClient = mlClient;
    this.loader = loader;
  }

  /** Filtered aggregate statistics for the dashboard (a.i/a.ii). */
  @GetMapping("/aggregates")
  @Cacheable(cacheNames = CacheConfig.AGGREGATES, key = "#filters.toCacheKey()")
  public Aggregates.Response aggregates(MarketFilters filters) {
    filters.validate();
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
    filters.validate();
    return analysis.properties(filters, sortBy, sortDir, page, size);
  }

  /** What-if scenarios (a.iii): baseline + changes, predicted by the Task 1 model. */
  @PostMapping("/what-if")
  @Cacheable(cacheNames = CacheConfig.WHAT_IF, key = "#request.toString()")
  public WhatIfModels.WhatIfResult whatIf(@Valid @RequestBody WhatIfModels.WhatIfRequest request) {
    return whatIf.analyze(request);
  }

  /** Filtered dataset rows (CSV) or aggregates summary (PDF) as a download (a.iv). */
  @GetMapping("/export")
  public ResponseEntity<?> export(@RequestParam String type, MarketFilters filters) {
    requireExportType(type);
    filters.validate();
    HttpHeaders headers = new HttpHeaders();
    if (type.equals("csv")) {
      List<House> rows = analysis.filtered(filters);
      headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
      headers.setContentDisposition(ContentDisposition.attachment()
          .filename("market-properties-" + LocalDate.now() + ".csv").build());
      return new ResponseEntity<>(csvExporter.toCsv(rows), headers, HttpStatus.OK);
    }
    byte[] pdf = pdfExporter.toPdf(analysis.aggregates(filters));
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(ContentDisposition.attachment()
        .filename("market-analysis-" + LocalDate.now() + ".pdf").build());
    return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
  }

  /**
   * Saved what-if runs (current run or history) as a downloadable CSV or
   * PDF. The body carries the already-predicted outcomes; the runs are
   * rendered as-is, nothing is re-predicted.
   */
  @PostMapping("/export/what-if")
  public ResponseEntity<?> exportWhatIf(@RequestParam String type,
      @Valid @RequestBody WhatIfExportModels.WhatIfExportRequest request) {
    requireExportType(type);
    HttpHeaders headers = new HttpHeaders();
    if (type.equals("csv")) {
      headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
      headers.setContentDisposition(ContentDisposition.attachment()
          .filename("what-if-" + LocalDate.now() + ".csv").build());
      return new ResponseEntity<>(whatIfCsvExporter.toCsv(request.runs()), headers, HttpStatus.OK);
    }
    byte[] pdf = whatIfPdfExporter.toPdf(request.runs());
    headers.setContentType(MediaType.APPLICATION_PDF);
    headers.setContentDisposition(ContentDisposition.attachment()
        .filename("what-if-analysis-" + LocalDate.now() + ".pdf").build());
    return new ResponseEntity<>(pdf, headers, HttpStatus.OK);
  }

  /** The shared type parameter of the export endpoints. */
  private static void requireExportType(String type) {
    if (!"csv".equals(type) && !"pdf".equals(type)) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "type must be 'csv' or 'pdf'.");
    }
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
