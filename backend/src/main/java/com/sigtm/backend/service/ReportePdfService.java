package com.sigtm.backend.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.Image;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.sigtm.backend.model.Configuracion;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Genera el PDF corporativo del Centro de Reportes.
 *
 * <p>
 * Recibe la misma estructura que usa la exportación XLSX: columnas, tipos,
 * filas y totales. El backend consulta los datos y este servicio se encarga del
 * diseño, la orientación y la paginación del documento.
 * </p>
 */
@Service
public class ReportePdfService {

    private final ConfiguracionService configuracionService;

    public ReportePdfService(ConfiguracionService configuracionService) {
        this.configuracionService = configuracionService;
    }

    /**
     * Genera el PDF del reporte solicitado.
     *
     * @param reporte columnas, tipos, filas y totales del reporte
     * @param usuario nombre del usuario que solicita la exportación
     * @return el archivo PDF en memoria
     */
    public byte[] generar(Map<String, Object> reporte, String usuario) {
        List<String> columnas = textos(reporte.get("columnas"));
        List<String> tipos = textos(reporte.get("tipos"));
        List<List<Object>> filas = filas(reporte.get("filas"));
        List<Map<String, Object>> totales = totales(reporte.get("totales"));
        String tipo = PdfEstilo.texto(reporte.get("tipo")).toUpperCase(Locale.ROOT);
        String titulo = PdfEstilo.texto(reporte.get("titulo"));
        String emisor = PdfEstilo.texto(usuario);
        Color acento = PdfEstilo.acento(tipo);

        boolean horizontal = columnas.size() >= 7;
        Rectangle size = horizontal ? PageSize.A4.rotate() : PageSize.A4;
        Document documento = new Document(size, 34, 34, 34, 54);
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PdfWriter writer = PdfWriter.getInstance(documento, salida);
            writer.setPageEvent(new PdfEstilo.PiePagina(
                    "SIGTM · Sistema Integral de Gestión de Taller",
                    "Moneda oficial: Soles (S/)",
                    "SIGTM · Centro de Reportes"));

            documento.addTitle("SIGTM · " + titulo);
            documento.addSubject("Reporte corporativo en Soles (S/)");
            documento.addAuthor(emisor);
            documento.addCreator("SIGTM · Centro de Reportes");
            documento.open();

            agregarEncabezado(documento, titulo, tipo, emisor, filas.size(), columnas.size(), acento, writer);
            agregarTabla(documento, columnas, tipos, filas, acento);
            agregarTotales(documento, totales, acento, writer);
            documento.close();
            return salida.toByteArray();
        } catch (DocumentException | java.io.IOException exception) {
            if (documento.isOpen()) {
                documento.close();
            }
            throw new IllegalStateException("No se pudo generar el PDF del reporte", exception);
        }
    }

    private void agregarEncabezado(
            Document documento,
            String titulo,
            String tipo,
            String emisor,
            int registros,
            int columnas,
            Color acento,
            PdfWriter writer) throws DocumentException {
        Configuracion configuracion = configuracionService.obtenerConfiguracion();
        String taller = configuracion != null && configuracion.getTallerNombre() != null
                ? configuracion.getTallerNombre()
                : "SIGTM";

        float anchoLogo = 48f / documento.getPageSize().getWidth();
        float resto = 1f - anchoLogo;
        PdfPTable marca = new PdfPTable(new float[] { anchoLogo, resto * 0.62f, resto * 0.38f });
        marca.setWidthPercentage(100);
        marca.addCell(celdaLogo(configuracion, taller, acento, writer));

        PdfPCell marcaCell = new PdfPCell();
        marcaCell.setBackgroundColor(PdfEstilo.NAVY);
        marcaCell.setBorder(Rectangle.NO_BORDER);
        marcaCell.setBorderWidth(0f);
        marcaCell.setPaddingLeft(4);
        marcaCell.setPaddingTop(10);
        marcaCell.setPaddingBottom(10);
        marcaCell.addElement(new Paragraph(taller, PdfEstilo.bold(13, PdfEstilo.WHITE)));
        marcaCell.addElement(new Paragraph("Centro de Reportes",
                PdfEstilo.font(7.5f, Font.NORMAL, PdfEstilo.SLATE_300)));
        marca.addCell(marcaCell);

        PdfPCell tipoCell = new PdfPCell();
        tipoCell.setBackgroundColor(PdfEstilo.NAVY);
        tipoCell.setBorder(Rectangle.NO_BORDER);
        tipoCell.setBorderWidth(0f);
        tipoCell.setPaddingRight(12);
        tipoCell.setPaddingTop(10);
        tipoCell.setPaddingBottom(10);
        Paragraph etiqueta = new Paragraph("REPORTE",
                PdfEstilo.bold(6.6f, PdfEstilo.SLATE_300));
        etiqueta.setAlignment(Element.ALIGN_RIGHT);
        Paragraph tipoPdf = new Paragraph(tipo, PdfEstilo.bold(13, PdfEstilo.WHITE));
        tipoPdf.setAlignment(Element.ALIGN_RIGHT);
        tipoPdf.setSpacingBefore(2);
        tipoCell.addElement(etiqueta);
        tipoCell.addElement(tipoPdf);
        marca.addCell(tipoCell);
        documento.add(marca);

        PdfPTable linea = new PdfPTable(1);
        linea.setWidthPercentage(100);
        PdfPCell lineaCell = new PdfPCell(new Phrase(" ", PdfEstilo.font(1, Font.NORMAL, acento)));
        lineaCell.setBackgroundColor(acento);
        lineaCell.setBorder(Rectangle.NO_BORDER);
        lineaCell.setFixedHeight(3);
        linea.addCell(lineaCell);
        documento.add(linea);

        Paragraph espacio = new Paragraph(" ", PdfEstilo.font(8, Font.NORMAL, PdfEstilo.SLATE_400));
        espacio.setSpacingAfter(6);
        documento.add(espacio);

        Paragraph tituloPdf = new Paragraph(titulo, PdfEstilo.bold(19, PdfEstilo.NAVY));
        tituloPdf.setSpacingAfter(3);
        documento.add(tituloPdf);

        Paragraph meta = new Paragraph(
                "Emitido el " + PdfEstilo.fechaHora(LocalDateTime.now())
                        + "  ·  Generado por " + emisor
                        + "  ·  " + registros + " registro(s)"
                        + "  ·  " + taller,
                PdfEstilo.font(8.3f, Font.NORMAL, PdfEstilo.SLATE_500));
        meta.setSpacingAfter(10);
        documento.add(meta);

        PdfPTable kpis = new PdfPTable(4);
        kpis.setWidthPercentage(100);
        kpis.setSpacingAfter(10);
        kpis.addCell(kpi("REGISTROS", PdfEstilo.numero(registros)));
        kpis.addCell(kpi("COLUMNAS", PdfEstilo.numero(columnas)));
        kpis.addCell(kpi("MONEDA", "Soles (S/)"));
        kpis.addCell(kpi("TIPO", tipo));
        documento.add(kpis);

        Paragraph seccion = new Paragraph("DETALLE DEL REPORTE", PdfEstilo.bold(7.5f, acento));
        seccion.setSpacingBefore(2);
        seccion.setSpacingAfter(5);
        documento.add(seccion);
    }

    private PdfPCell celdaLogo(Configuracion configuracion, String nombre, Color acento,
            PdfWriter writer) {
        Image logo = logoImagen(configuracion);
        if (logo != null) {
            float size = 34f;
            PdfTemplate template = writer.getDirectContent().createTemplate(size, size);
            template.setColorFill(acento);
            template.roundRectangle(0, 0, size, size, 8);
            template.fill();
            logo.scaleToFit(26, 26);
            float x = (size - logo.getScaledWidth()) / 2;
            float y = (size - logo.getScaledHeight()) / 2;
            template.addImage(logo, logo.getScaledWidth(), 0, 0, logo.getScaledHeight(), x, y);
            Image badge = Image.getInstance(template);
            PdfPCell celda = new PdfPCell(badge, false);
            celda.setBackgroundColor(PdfEstilo.NAVY);
            celda.setBorder(Rectangle.NO_BORDER);
            celda.setBorderWidth(0f);
            celda.setPaddingLeft(12f);
            celda.setPaddingRight(2f);
            celda.setPaddingTop(6f);
            celda.setPaddingBottom(6f);
            celda.setFixedHeight(46f);
            celda.setHorizontalAlignment(Element.ALIGN_CENTER);
            celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
            return celda;
        }

        PdfPCell celda = PdfEstilo.celdaSinBorde(iniciales(nombre),
                PdfEstilo.bold(12, PdfEstilo.WHITE), acento, Element.ALIGN_CENTER);
        celda.setPadding(6f);
        celda.setFixedHeight(46f);
        return celda;
    }

    private Image logoImagen(Configuracion configuracion) {
        if (configuracion == null || configuracion.getTallerLogo() == null
                || configuracion.getTallerLogo().isBlank()) {
            return null;
        }
        try {
            String data = configuracion.getTallerLogo().trim();
            int comma = data.indexOf(',');
            if (comma >= 0) {
                data = data.substring(comma + 1);
            }
            byte[] bytes = Base64.getDecoder().decode(data);
            Image image = Image.getInstance(bytes);
            image.scaleToFit(26, 26);
            return image;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String iniciales(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            return "SG";
        }
        String[] partes = nombre.trim().split("\\s+");
        StringBuilder iniciales = new StringBuilder();
        for (String parte : partes) {
            if (!parte.isBlank() && iniciales.length() < 2) {
                iniciales.append(parte.charAt(0));
            }
        }
        return iniciales.length() == 0 ? "SG" : iniciales.toString().toUpperCase(Locale.ROOT);
    }

    private PdfPCell kpi(String etiqueta, String valor) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(PdfEstilo.SLATE_50);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(8);
        Paragraph label = new Paragraph(etiqueta, PdfEstilo.bold(6.5f, PdfEstilo.SLATE_400));
        label.setSpacingAfter(2);
        cell.addElement(label);
        cell.addElement(new Paragraph(valor, PdfEstilo.bold(11, PdfEstilo.SLATE_900)));
        return cell;
    }

    private void agregarTabla(
            Document documento,
            List<String> columnas,
            List<String> tipos,
            List<List<Object>> filas,
            Color acento) throws DocumentException {
        int totalColumnas = Math.max(1, columnas.size());
        PdfPTable tabla = new PdfPTable(anchos(columnas, tipos));
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);
        tabla.setSplitRows(true);
        tabla.setSplitLate(false);
        tabla.setSpacingAfter(8);

        for (int i = 0; i < totalColumnas; i++) {
            String tipo = tipo(tipos, i);
            String header = PdfEstilo.texto(columnas.get(i)).toUpperCase(Locale.ROOT);
            if ("MONEY".equals(tipo) && !header.contains("S/")) {
                header += " (S/)";
            }
            PdfPCell cell = PdfEstilo.celda(header, PdfEstilo.bold(7.1f, PdfEstilo.WHITE), acento, alineacion(tipo));
            cell.setBorderColor(acento);
            cell.setPadding(5.5f);
            tabla.addCell(cell);
        }

        if (filas.isEmpty()) {
            PdfPCell vacia = PdfEstilo.celda("Sin datos para este reporte",
                    PdfEstilo.font(8, Font.NORMAL, PdfEstilo.SLATE_500),
                    PdfEstilo.SLATE_50, Element.ALIGN_CENTER);
            vacia.setColspan(totalColumnas);
            vacia.setPadding(16);
            tabla.addCell(vacia);
        } else {
            int index = 0;
            for (List<Object> fila : filas) {
                Color fondo = index % 2 == 0 ? PdfEstilo.WHITE : PdfEstilo.SLATE_50;
                for (int i = 0; i < totalColumnas; i++) {
                    String tipo = tipo(tipos, i);
                    Object valor = i < fila.size() ? fila.get(i) : "";
                    String texto = switch (tipo) {
                        case "MONEY" -> PdfEstilo.money(valor);
                        case "NUM" -> PdfEstilo.numero(valor);
                        default -> PdfEstilo.texto(valor);
                    };
                    Font fuente = estadoFuente(texto, tipo);
                    PdfPCell cell = PdfEstilo.celda(texto, fuente, fondo, alineacion(tipo));
                    cell.setPadding(4.5f);
                    tabla.addCell(cell);
                }
                index++;
            }
        }
        documento.add(tabla);
    }

    private Font estadoFuente(String texto, String tipo) {
        if (!"TEXT".equals(tipo)) {
            return PdfEstilo.font(7.2f, Font.NORMAL, PdfEstilo.SLATE_700);
        }
        String valor = texto.toUpperCase(Locale.ROOT);
        if (valor.contains("PAGAD") || valor.contains("ACTIV") || valor.contains("COMPLET")
                || valor.contains("ENTREG")) {
            return PdfEstilo.bold(7.2f, PdfEstilo.EMERALD);
        }
        if (valor.contains("ANULAD") || valor.contains("CANCEL") || valor.contains("INACTIV")
                || valor.contains("VENCID")) {
            return PdfEstilo.bold(7.2f, PdfEstilo.RED);
        }
        if (valor.contains("PENDIENT") || valor.contains("PROCESO") || valor.contains("ESPERA")) {
            return PdfEstilo.bold(7.2f, PdfEstilo.AMBER);
        }
        return PdfEstilo.font(7.2f, Font.NORMAL, PdfEstilo.SLATE_700);
    }

    private void agregarTotales(
            Document documento,
            List<Map<String, Object>> totales,
            Color acento,
            PdfWriter writer) throws DocumentException {
        if (totales.isEmpty()) {
            return;
        }
        if (writer.getVerticalPosition(true) < 120) {
            documento.newPage();
        }

        Paragraph seccion = new Paragraph("RESUMEN", PdfEstilo.bold(7.5f, acento));
        seccion.setSpacingBefore(4);
        seccion.setSpacingAfter(5);
        documento.add(seccion);

        PdfPTable resumen = new PdfPTable(new float[] { 2.6f, 1f });
        resumen.setWidthPercentage(62);
        resumen.setHorizontalAlignment(Element.ALIGN_RIGHT);
        for (Map<String, Object> total : totales) {
            String etiqueta = PdfEstilo.texto(total.get("etiqueta"));
            Object valor = total.get("valor");
            boolean money = Boolean.TRUE.equals(total.get("money"));
            resumen.addCell(PdfEstilo.celda(etiqueta,
                    PdfEstilo.font(8, Font.NORMAL, PdfEstilo.SLATE_500),
                    PdfEstilo.SLATE_50, Element.ALIGN_LEFT));
            resumen.addCell(PdfEstilo.celda(money ? PdfEstilo.money(valor) : PdfEstilo.numero(valor),
                    PdfEstilo.bold(8.5f, PdfEstilo.SLATE_900),
                    PdfEstilo.WHITE, Element.ALIGN_RIGHT));
        }
        documento.add(resumen);
        documento.add(new Paragraph(" ", PdfEstilo.font(4, Font.NORMAL, PdfEstilo.WHITE)));
        documento.add(new Paragraph("Fin del reporte",
                PdfEstilo.font(7.3f, Font.NORMAL, PdfEstilo.SLATE_400)));
    }

    private float[] anchos(List<String> columnas, List<String> tipos) {
        int total = Math.max(1, columnas.size());
        float[] widths = new float[total];
        for (int i = 0; i < total; i++) {
            String tipo = tipo(tipos, i);
            widths[i] = switch (tipo) {
                case "MONEY" -> 1.05f;
                case "NUM" -> 0.72f;
                default -> 1.5f;
            };
            if (columnas.get(i).length() > 18) {
                widths[i] += 0.25f;
            }
        }
        return widths;
    }

    private int alineacion(String tipo) {
        return "MONEY".equals(tipo) || "NUM".equals(tipo)
                ? Element.ALIGN_RIGHT
                : Element.ALIGN_LEFT;
    }

    private String tipo(List<String> tipos, int index) {
        return index < tipos.size() ? tipos.get(index).toUpperCase(Locale.ROOT) : "TEXT";
    }

    private List<String> textos(Object value) {
        List<String> result = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                result.add(PdfEstilo.texto(item));
            }
        }
        return result;
    }

    private List<List<Object>> filas(Object value) {
        List<List<Object>> result = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object row : list) {
                if (row instanceof List<?> cells) {
                    result.add(new ArrayList<>(cells));
                }
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> totales(Object value) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    result.add((Map<String, Object>) map);
                }
            }
        }
        return result;
    }
}
