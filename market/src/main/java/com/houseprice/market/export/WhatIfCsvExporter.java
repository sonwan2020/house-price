package com.houseprice.market.export;

import java.io.IOException;
import java.io.StringWriter;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import com.houseprice.market.whatif.WhatIfExportModels;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.stereotype.Component;

/**
 * CSV export of saved what-if runs: one row per (run, scenario, changed
 * feature), so the base value and the new value stay side by side.
 */
@Component
public class WhatIfCsvExporter {

  private static final String[] HEADER = {
      "run", "created_at", "baseline_price", "scenario",
      "feature", "base_value", "new_value", "predicted_price", "delta"};

  public String toCsv(List<WhatIfExportModels.WhatIfRun> runs) {
    StringWriter writer = new StringWriter();
    try (CSVPrinter printer = new CSVPrinter(writer, CSVFormat.DEFAULT.builder().setHeader(HEADER).build())) {
      for (WhatIfExportModels.WhatIfRun run : runs) {
        Map<String, Double> base = run.baseline().asMap();
        for (WhatIfExportModels.ScenarioExport scenario : run.scenarios()) {
          for (Map.Entry<String, Double> change : scenario.changes().entrySet()) {
            printer.printRecord(
                run.label(),
                run.createdAt(),
                run.baselinePrice() == null ? "" : run.baselinePrice(),
                scenario.name(),
                change.getKey(),
                base.containsKey(change.getKey()) ? fmt(base.get(change.getKey())) : "",
                change.getValue() == null ? "" : fmt(change.getValue()),
                scenario.price() == null ? "" : scenario.price(),
                scenario.delta() == null ? "" : scenario.delta());
          }
        }
      }
    } catch (IOException e) {
      throw new IllegalStateException("What-if CSV export failed", e);
    }
    return writer.toString();
  }

  /** Doubles without trailing zeros: 1.0 -> "1", 3.25 -> "3.25". */
  private static String fmt(double value) {
    return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
  }
}
