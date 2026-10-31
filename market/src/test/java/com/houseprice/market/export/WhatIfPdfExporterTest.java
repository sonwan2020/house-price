package com.houseprice.market.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import com.houseprice.market.whatif.WhatIfExportModels;
import com.houseprice.market.whatif.WhatIfModels;
import org.junit.jupiter.api.Test;

class WhatIfPdfExporterTest {

  private static final WhatIfModels.HouseFeaturesRequest BASELINE =
      new WhatIfModels.HouseFeaturesRequest(1500.0, 3, 2.0, 2000, 6000.0, 5.0, 8.0);

  @Test
  void producesPdfBytes() {
    byte[] pdf = new WhatIfPdfExporter().toPdf(List.of(
        new WhatIfExportModels.WhatIfRun(
            "Current run", "2026-10-31T10:00:00Z", BASELINE, 300000L,
            List.of(new WhatIfExportModels.ScenarioExport("+1 bedroom",
                Map.of("bedrooms", 4.0), 330000L, 30000L, "")))));

    assertThat(pdf.length).isGreaterThan(500);
    assertThat(new String(pdf, 0, 4, StandardCharsets.ISO_8859_1)).startsWith("%PDF");
  }

  @Test
  void producesPdfForRunWithoutPrediction() {
    byte[] pdf = new WhatIfPdfExporter().toPdf(List.of(
        new WhatIfExportModels.WhatIfRun(
            "Current run", "2026-10-31T10:00:00Z", BASELINE, null,
            List.of(new WhatIfExportModels.ScenarioExport("Huge lot",
                Map.of("lot_size", 999999.0), null, null, "outside training range")))));

    assertThat(new String(pdf, 0, 4, StandardCharsets.ISO_8859_1)).startsWith("%PDF");
  }
}
