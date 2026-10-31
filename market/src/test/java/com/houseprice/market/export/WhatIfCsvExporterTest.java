package com.houseprice.market.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import com.houseprice.market.whatif.WhatIfExportModels;
import com.houseprice.market.whatif.WhatIfModels;
import org.junit.jupiter.api.Test;

class WhatIfCsvExporterTest {

  private static final WhatIfModels.HouseFeaturesRequest BASELINE =
      new WhatIfModels.HouseFeaturesRequest(1500.0, 3, 2.0, 2000, 6000.0, 5.0, 8.0);

  @Test
  void exportsOneRowPerChangedFeature() {
    WhatIfCsvExporter exporter = new WhatIfCsvExporter();
    String csv = exporter.toCsv(List.of(
        new WhatIfExportModels.WhatIfRun(
            "Current run", "2026-10-31T10:00:00Z", BASELINE, 300000L,
            List.of(
                new WhatIfExportModels.ScenarioExport("+1 bedroom",
                    Map.of("bedrooms", 4.0), 330000L, 30000L, ""),
                new WhatIfExportModels.ScenarioExport("Bigger lot",
                    Map.of("lot_size", 7000.0), 312000L, 12000L, "")))));

    String[] lines = csv.split("\\r?\\n");
    assertThat(lines[0]).isEqualTo("run,created_at,baseline_price,scenario,feature,"
        + "base_value,new_value,predicted_price,delta");
    assertThat(lines[1]).isEqualTo("Current run,2026-10-31T10:00:00Z,300000,+1 bedroom,"
        + "bedrooms,3,4,330000,30000");
    assertThat(lines[2]).isEqualTo("Current run,2026-10-31T10:00:00Z,300000,Bigger lot,"
        + "lot_size,6000,7000,312000,12000");
  }

  @Test
  void leavesMissingOutcomesBlank() {
    WhatIfCsvExporter exporter = new WhatIfCsvExporter();
    String csv = exporter.toCsv(List.of(
        new WhatIfExportModels.WhatIfRun(
            "Current run", "2026-10-31T10:00:00Z", BASELINE, 300000L,
            List.of(new WhatIfExportModels.ScenarioExport("Huge lot",
                Map.of("lot_size", 999999.0), null, null, "outside training range")))));

    String[] lines = csv.split("\\r?\\n");
    assertThat(lines[1]).isEqualTo("Current run,2026-10-31T10:00:00Z,300000,Huge lot,"
        + "lot_size,6000,999999,,");
  }
}
