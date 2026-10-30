package com.houseprice.market.export;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import com.houseprice.market.analysis.Aggregates;
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
 * PDF export (a.iv): a one-page market summary built with OpenPDF —
 * applied filters, key price statistics and the segment breakdown.
 */
@Component
public class PdfExporter {

  private static final DateTimeFormatter TIMESTAMP =
      DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public byte[] toPdf(Aggregates.Response aggregates) {
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    Document document = new Document(PageSize.A4, 48, 48, 48, 48);
    try {
      PdfWriter.getInstance(document, out);
      document.open();

      Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD);
      Font headingFont = new Font(Font.HELVETICA, 12, Font.BOLD);
      Font bodyFont = new Font(Font.HELVETICA, 10);

      document.add(new Paragraph("Property Market Analysis", titleFont));
      document.add(new Paragraph("Generated " + TIMESTAMP.format(LocalDateTime.now()), bodyFont));
      document.add(new Paragraph(filtersLine(aggregates.filters()), bodyFont));
      document.add(Chunk.NEWLINE);

      if (aggregates.count() == 0) {
        document.add(new Paragraph("No properties match the selected filters.", bodyFont));
        document.close();
        return out.toByteArray();
      }

      document.add(new Paragraph("Summary", headingFont));
      document.add(statsTable(aggregates));
      document.add(new Paragraph("By bedrooms", headingFont));
      document.add(bandTable(aggregates.byBedrooms()));
      document.add(new Paragraph("By year built", headingFont));
      document.add(bandTable(aggregates.byYearBuiltBand()));
      document.add(new Paragraph("By school rating", headingFont));
      document.add(bandTable(aggregates.bySchoolRatingBand()));
      document.add(new Paragraph("By distance to city centre", headingFont));
      document.add(bandTable(aggregates.byDistanceBand()));
      document.close();
      return out.toByteArray();
    } catch (DocumentException e) {
      throw new IllegalStateException("PDF export failed", e);
    } finally {
      if (document.isOpen()) {
        document.close();
      }
    }
  }

  private static String filtersLine(Map<String, Object> filters) {
    if (filters.isEmpty()) {
      return "Filters: none";
    }
    StringBuilder line = new StringBuilder("Filters: ");
    filters.forEach((name, value) -> line.append(name).append(" = ").append(value).append("; "));
    return line.toString();
  }

  private static PdfPTable statsTable(Aggregates.Response aggregates) throws DocumentException {
    PdfPTable table = new PdfPTable(new float[] {1, 1});
    table.setWidthPercentage(100);
    addRow(table, "Properties", String.valueOf(aggregates.count()), true);
    if (aggregates.price() != null) {
      addRow(table, "Mean price", money(aggregates.price().mean()), false);
      addRow(table, "Median price", money(aggregates.price().median()), false);
      addRow(table, "Min price", money(aggregates.price().min()), false);
      addRow(table, "Max price", money(aggregates.price().max()), false);
    }
    if (aggregates.pricePerSqFt() != null) {
      addRow(table, "Mean price per sq ft", money(aggregates.pricePerSqFt().mean()), false);
    }
    return table;
  }

  private static PdfPTable bandTable(List<Aggregates.BandCount> bands) throws DocumentException {
    PdfPTable table = new PdfPTable(new float[] {2, 1, 1, 1});
    table.setWidthPercentage(100);
    table.addCell(headerCell("Segment"));
    table.addCell(headerCell("Count"));
    table.addCell(headerCell("Mean price"));
    table.addCell(headerCell("Median price"));
    for (Aggregates.BandCount band : bands) {
      table.addCell(bodyCell(band.band()));
      table.addCell(bodyCell(String.valueOf(band.count())));
      table.addCell(bodyCell(money(band.meanPrice())));
      table.addCell(bodyCell(money(band.medianPrice())));
    }
    return table;
  }

  private static void addRow(PdfPTable table, String label, String value, boolean header) {
    table.addCell(header ? headerCell(label) : bodyCell(label));
    table.addCell(header ? headerCell(value) : bodyCell(value));
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

  private static String money(double value) {
    return String.format("$%,.0f", value);
  }
}
