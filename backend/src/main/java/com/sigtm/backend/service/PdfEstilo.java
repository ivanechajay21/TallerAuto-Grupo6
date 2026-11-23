package com.sigtm.backend.service;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfContentByte;
import com.lowagie.text.pdf.PdfGState;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPageEventHelper;
import com.lowagie.text.pdf.PdfWriter;

import java.awt.Color;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Locale;

/**
 * Utilidades compartidas por los generadores de PDF del backend.
 *
 * <p>Centraliza la paleta corporativa, las fuentes, el formato de importes y el
 * pie de página para que facturas y reportes mantengan el mismo lenguaje visual.</p>
 */
final class PdfEstilo {

    static final Color NAVY = new Color(15, 23, 42);
    static final Color SLATE_900 = new Color(15, 23, 42);
    static final Color SLATE_700 = new Color(51, 65, 85);
    static final Color SLATE_500 = new Color(100, 116, 139);
    static final Color SLATE_400 = new Color(148, 163, 184);
    static final Color SLATE_300 = new Color(203, 213, 225);
    static final Color SLATE_200 = new Color(226, 232, 240);
    static final Color SLATE_100 = new Color(241, 245, 249);
    static final Color SLATE_50 = new Color(248, 250, 252);
    static final Color WHITE = new Color(255, 255, 255);
    static final Color EMERALD = new Color(5, 150, 105);
    static final Color AMBER = new Color(217, 119, 6);
    static final Color RED = new Color(220, 38, 38);
    static final Color BLUE = new Color(37, 99, 235);
    static final Color INDIGO = new Color(79, 70, 229);
    static final Color TEAL = new Color(13, 148, 136);

    private static final Locale PERU = new Locale("es", "PE");
    private static final DecimalFormat MONEY = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(PERU));
    private static final DecimalFormat NUMBER = new DecimalFormat("#,##0", DecimalFormatSymbols.getInstance(PERU));
    private static final DateTimeFormatter FECHA_LARGA =
            DateTimeFormatter.ofPattern("dd 'de' MMMM 'de' yyyy", PERU);
    private static final DateTimeFormatter FECHA_HORA =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", PERU);

    private PdfEstilo() {
    }

    static Font font(float size, int style, Color color) {
        return new Font(Font.HELVETICA, size, style, color);
    }

    static Font bold(float size, Color color) {
        return font(size, Font.BOLD, color);
    }

    static String texto(Object value) {
        String text = value == null ? "—" : String.valueOf(value).trim();
        if (text.isEmpty()) {
            return "—";
        }
        return text.replaceAll("(?i)(\\d[\\d.,]*)\\s*PEN\\b", "S/ $1")
                .replaceAll("(?i)\\bPEN\\b", "Soles");
    }

    static String money(Object value) {
        BigDecimal number = decimal(value);
        return "S/ " + MONEY.format(number);
    }

    static String numero(Object value) {
        BigDecimal number = decimal(value);
        return NUMBER.format(number);
    }

    static BigDecimal decimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal bigDecimal) {
            return bigDecimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        String clean = String.valueOf(value).replaceAll("[^\\d,.-]", "").replace(",", "");
        if (clean.isBlank()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(clean);
        } catch (NumberFormatException ignored) {
            return BigDecimal.ZERO;
        }
    }

    static String fecha(Object value) {
        LocalDate date = localDate(value);
        return date == null ? texto(value) : FECHA_LARGA.format(date);
    }

    static String fechaHora(Object value) {
        LocalDateTime dateTime = localDateTime(value);
        return dateTime == null ? texto(value) : FECHA_HORA.format(dateTime);
    }

    static LocalDate localDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toLocalDate();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return LocalDate.parse(text.substring(0, Math.min(text.length(), 10)));
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    static LocalDateTime localDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        if (value instanceof LocalDate date) {
            return date.atStartOfDay();
        }
        String text = String.valueOf(value).trim();
        if (text.isEmpty()) {
            return null;
        }
        try {
            return LocalDateTime.parse(text);
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDate.parse(text.substring(0, Math.min(text.length(), 10))).atStartOfDay();
            } catch (DateTimeParseException ignoredAgain) {
                return null;
            }
        }
    }

    static Color acento(String tipo) {
        return switch (tipo == null ? "" : tipo.toUpperCase(Locale.ROOT)) {
            case "CLIENTES" -> new Color(79, 70, 229);
            case "VEHICULOS" -> new Color(2, 132, 199);
            case "REPARACIONES" -> new Color(37, 99, 235);
            case "INVENTARIO" -> new Color(217, 119, 6);
            case "CITAS" -> new Color(5, 150, 105);
            default -> EMERALD;
        };
    }

    static String archivo(String value, String extension) {
        String base = texto(value).toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "documento";
        }
        return base + "." + extension;
    }

    static PdfPCell celda(String value, Font font, Color background, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(value, font));
        cell.setBackgroundColor(background);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(6f);
        cell.setBorderColor(SLATE_200);
        cell.setBorderWidth(0.5f);
        return cell;
    }

    static PdfPCell celdaSinBorde(String value, Font font, Color background, int alignment) {
        PdfPCell cell = celda(value, font, background, alignment);
        cell.setBorder(Rectangle.NO_BORDER);
        return cell;
    }

    /**
     * Pie de página común. Mantiene el número de página y la nota corporativa.
     */
    static class PiePagina extends PdfPageEventHelper {

        private final String linea1;
        private final String linea2;
        private final String derecha;

        PiePagina(String linea1, String linea2, String derecha) {
            this.linea1 = linea1;
            this.linea2 = linea2;
            this.derecha = derecha;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            float left = document.leftMargin();
            float right = document.right();
            PdfContentByte cb = writer.getDirectContent();

            cb.setColorStroke(SLATE_200);
            cb.setLineWidth(0.5f);
            cb.moveTo(left, 36);
            cb.lineTo(right, 36);
            cb.stroke();

            ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                    new Phrase(linea1, font(7.3f, Font.NORMAL, SLATE_400)), left, 25, 0);
            if (linea2 != null && !linea2.isBlank()) {
                ColumnText.showTextAligned(cb, Element.ALIGN_LEFT,
                        new Phrase(linea2, font(7.3f, Font.NORMAL, SLATE_400)), left, 15, 0);
            }
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                    new Phrase("Página " + writer.getPageNumber(),
                            font(7.3f, Font.NORMAL, SLATE_400)), right, 25, 0);
            ColumnText.showTextAligned(cb, Element.ALIGN_RIGHT,
                    new Phrase("Generado por " + derecha,
                            font(7.3f, Font.NORMAL, SLATE_400)), right, 15, 0);
        }
    }

    /**
     * Pie de factura con marca de agua opcional para comprobantes anulados.
     */
    static class PieFactura extends PiePagina {

        private final boolean anulada;

        PieFactura(String linea1, String linea2, String derecha, boolean anulada) {
            super(linea1, linea2, derecha);
            this.anulada = anulada;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            super.onEndPage(writer, document);
            if (!anulada) {
                return;
            }
            PdfContentByte cb = writer.getDirectContentUnder();
            PdfGState state = new PdfGState();
            state.setFillOpacity(0.16f);
            cb.setGState(state);
            ColumnText.showTextAligned(cb, Element.ALIGN_CENTER,
                    new Phrase("ANULADA", bold(64, RED)),
                    document.getPageSize().getWidth() / 2,
                    document.getPageSize().getHeight() / 2,
                    35);
        }
    }
}
