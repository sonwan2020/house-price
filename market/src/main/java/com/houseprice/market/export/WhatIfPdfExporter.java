package com.houseprice.market.export;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import com.houseprice.market.whatif.WhatIfExportModels;
import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

/**
 * PDF export of saved what-if runs: the baseline price plus one scenario
 * table per run, with each change shown as "feature: base → new".
 */
@Component
public class WhatIfPdfExporter {

  private static final DateTimeFormatter TIMESTAMP =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public byte[] toPdf(List<WhatIfExportModels.WhatIfRun> runs) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Document document = new Document(PageSize.A4, 48, 48, 48, 48);
    try {
      PdfWriter.getInstance(document, out);
      document.open();

      Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
      Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD);
      Font bodyFont = new Font(Font.HELVETICA, 10);

      document.add(new Paragraph("What-if Analysis", titleFont));
      document.add(new Paragraph("Generated " + TIMESTAMP.format(LocalDateTime.now()), bodyFont));
      document.add(Chunk.NEWLINE);

      for (int i = 0; i < runs.size(); i++) {
        WhatIfExportModels.WhatIfRun run = runs.get(i);
        document.add(new Paragraph("Run " + (i + 1) + " — " + run.label()
            + (run.createdAt() != null ? " (" + run.createdAt() + ")" : ""), headingFont));
        if (run.baselinePrice() != null) {
          document.add(new Paragraph("Baseline predicted price: " + money(run.baselinePrice()), bodyFont));
        }
        document.add(runTable(run));
        document.add(Chunk.NEWLINE);
      }

      document.close();
      return out.toByteArray();
    } catch (DocumentException e) {
      throw new IllegalStateException("What-if PDF export failed", e);
    } finally {
      if (document.isOpen()) {
        document.close();
      }
    }
  }

  private static PdfPTable runTable(WhatIfExportModels.WhatIfRun run) throws DocumentException {
    PdfPTable table = new PdfPTable(new float[] {3, 3, 1.6f, 1.4f});
    table.setWidthPercentage(100);
    table.addCell(headerCell("Scenario"));
    table.addCell(headerCell("Change"));
    table.addCell(headerCell("Predicted price"));
    table.addCell(headerCell("Delta"));
    Map<String, Double> base = run.baseline().asMap();
    for (WhatIfExportModels.ScenarioExport scenario : run.scenarios()) {
      table.addCell(bodyCell(scenario.name()));
      table.addCell(bodyCell(changesLine(base, scenario.changes())));
      table.addCell(bodyCell(scenario.price() == null ? "—" : money(scenario.price())));
      table.addCell(bodyCell(scenario.delta() == null ? "—"
          : (scenario.delta() >= 0 ? "+" : "−") + money(Math.abs(scenario.delta()))));
    }
    return table;
  }

  private static String changesLine(Map<String, Double> base, Map<String, Double> changes) {
    StringBuilder line = new StringBuilder();
    changes.forEach((feature, value) -> {
      if (line.length() > 0) {
        line.append("; ");
      }
      line.append(feature).append(": ")
          .append(base.containsKey(feature) ? fmt(base.get(feature)) : "—")
          .append(" → ")
          .append(value == null ? "—" : fmt(value));
    });
    return line.toString();
  }

  private static PdfPCell headerCell(String text) {
    PdfPCell cell = new PdfPCell(new Phrase(text, new Font(Font.HELVETICA, 10, Font.BOLD)));
    cell.setPadding(4);
    return cell;
  }

  private static PdfPCell bodyCell(String text) {
    PdfPCell cell = new PdfPCell(new Phrase(text, new Font(Font.HELVETICA, 10)));
    cell.setPadding(4);
    return cell;
  }

  private static String money(long value) {
    return String.format("$%,d", value);
  }

  /** Doubles without trailing zeros: 1.0 -> "1", 3.25 -> "3.25". */
  private static String fmt(double value) {
    return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
  }
}
