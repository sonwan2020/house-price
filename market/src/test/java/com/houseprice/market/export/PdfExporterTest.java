package com.houseprice.market.export;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;

import com.houseprice.market.analysis.Aggregates;
import org.junit.jupiter.api.Test;

class PdfExporterTest {

  @Test
  void producesPdfBytes() {
    Aggregates.Response response = new Aggregates.Response(
        Map.of("bedrooms", 3),
        2,
        new Aggregates.PriceStats(240000.0, 265000.0, 252500.0, 252500.0, 505000L),
        new Aggregates.PriceStats(141.2, 150.0, 145.6, 145.6, null),
        List.of(new Aggregates.BandCount("3", 2, 252500.0, 252500.0)),
        List.of(),
        List.of(),
        List.of(),
        List.of(new Aggregates.HistogramBin(240000.0, 265000.0, 2)));

    byte[] pdf = new PdfExporter().toPdf(response);

    assertThat(pdf.length).isGreaterThan(500);
    assertThat(new String(pdf, 0, 4, java.nio.charset.StandardCharsets.ISO_8859_1))
        .startsWith("%PDF");
  }

  @Test
  void producesPdfForEmptySegment() {
    Aggregates.Response response = new Aggregates.Response(
        Map.of(), 0, null, null, List.of(), List.of(), List.of(), List.of(), List.of());

    byte[] pdf = new PdfExporter().toPdf(response);

    assertThat(new String(pdf, 0, 4, java.nio.charset.StandardCharsets.ISO_8859_1))
        .startsWith("%PDF");
  }
}
