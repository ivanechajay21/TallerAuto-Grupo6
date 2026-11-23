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
import com.lowagie.text.pdf.ColumnText;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfTemplate;
import com.lowagie.text.pdf.PdfWriter;
import com.sigtm.backend.model.Configuracion;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Genera el PDF de una factura o boleta en el backend.
 *
 * <p>Toma el comprobante ya persistido, sus ítems y los datos del taller, y
 * construye un documento A4 con el mismo lenguaje visual del módulo de
 * Facturación. La descarga queda protegida por los permisos de facturas.</p>
 */
@Service
public class FacturaPdfService {

    private static final String[] UNIDADES = {
            "CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE",
            "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE",
            "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS",
            "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"
    };
    private static final String[] DECENAS = {
            "", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA",
            "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"
    };
    private static final String[] CENTENAS = {
            "", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS",
            "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"
    };

    private final FacturaService facturaService;
    private final ConfiguracionService configuracionService;

    public FacturaPdfService(FacturaService facturaService, ConfiguracionService configuracionService) {
        this.facturaService = facturaService;
        this.configuracionService = configuracionService;
    }

    /**
     * Genera el PDF del comprobante indicado.
     *
     * @param id identificador de la factura o boleta
     * @return el archivo PDF en memoria
     */
    public byte[] generar(Long id) {
        Map<String, Object> factura = facturaService.obtenerPorId(id);
        Configuracion configuracion = configuracionService.obtenerConfiguracion();
        boolean boleta = "BOLETA".equalsIgnoreCase(PdfEstilo.texto(factura.get("documentType")));
        boolean anulada = "CANCELLED".equalsIgnoreCase(PdfEstilo.texto(factura.get("status")));
        Color acento = boleta ? PdfEstilo.BLUE : PdfEstilo.INDIGO;
        String emisor = emisor(configuracion);
        String tipoDocumento = boleta ? "boleta" : "factura";

        Document documento = new Document(PageSize.A4, 34, 34, 34, 54);
        try (ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            PdfWriter writer = PdfWriter.getInstance(documento, salida);
            writer.setPageEvent(new PdfEstilo.PieFactura(
                    "Gracias por confiar en " + emisor + ".",
                    "Representación impresa de la " + tipoDocumento + " electrónica.",
                    "SIGTM",
                    anulada));

            documento.addTitle("SIGTM - " + PdfEstilo.texto(factura.get("invoiceNumber")));
            documento.addSubject("Comprobante electrónico en Soles (S/)");
            documento.addAuthor(emisor);
            documento.addCreator("SIGTM - Facturación");
            documento.open();

            agregarCabecera(documento, factura, configuracion, acento, boleta, writer);
            agregarInformacion(documento, factura);
            agregarItems(documento, factura, acento);
            agregarTotales(documento, factura, acento, writer);
            documento.close();
            return salida.toByteArray();
        } catch (DocumentException | java.io.IOException exception) {
            if (documento.isOpen()) {
                documento.close();
            }
            throw new IllegalStateException("No se pudo generar el PDF del comprobante", exception);
        }
    }

    private void agregarCabecera(
            Document documento,
            Map<String, Object> factura,
            Configuracion configuracion,
            Color acento,
            boolean boleta,
            PdfWriter writer
    ) throws DocumentException {
        String nombre = emisor(configuracion);
        String ruc = valor(configuracion == null ? null : configuracion.getTallerRuc());
        String direccion = valor(configuracion == null ? null : configuracion.getTallerDireccion());
        String telefono = valor(configuracion == null ? null : configuracion.getTallerTelefono());
        String correo = valor(configuracion == null ? null : configuracion.getTallerCorreo());

        PdfPTable cabecera = new PdfPTable(new float[]{1.6f, 1f});
        cabecera.setWidthPercentage(100);

        PdfPCell izquierda = new PdfPCell();
        izquierda.setBackgroundColor(PdfEstilo.NAVY);
        izquierda.setBorder(Rectangle.NO_BORDER);
        izquierda.setPadding(14);

        PdfPTable marca = new PdfPTable(new float[]{0.18f, 1f});
        marca.setWidthPercentage(100);
        marca.addCell(celdaLogo(configuracion, nombre, acento, writer));
        PdfPCell datosMarca = new PdfPCell();
        datosMarca.setBorder(Rectangle.NO_BORDER);
        datosMarca.setPaddingLeft(7);
        datosMarca.addElement(new Paragraph(nombre, PdfEstilo.bold(13, PdfEstilo.WHITE)));
        datosMarca.addElement(new Paragraph("Servicio técnico automotriz",
                PdfEstilo.font(7.4f, Font.NORMAL, PdfEstilo.SLATE_300)));
        marca.addCell(datosMarca);
        izquierda.addElement(marca);
        if (!ruc.isBlank()) {
            izquierda.addElement(linea("RUC " + ruc, 7.3f));
        }
        if (!direccion.isBlank()) {
            izquierda.addElement(linea(direccion, 7.3f));
        }
        String contacto = StreamUtil.unir("  |  ", telefono, correo);
        if (!contacto.isBlank()) {
            izquierda.addElement(linea(contacto, 7.3f));
        }
        cabecera.addCell(izquierda);

        PdfPCell derecha = new PdfPCell();
        derecha.setBackgroundColor(PdfEstilo.NAVY);
        derecha.setBorder(Rectangle.NO_BORDER);
        derecha.setPadding(14);
        Paragraph tipo = new Paragraph(boleta ? "BOLETA DE VENTA" : "FACTURA ELECTRÓNICA",
                PdfEstilo.bold(10.5f, PdfEstilo.WHITE));
        tipo.setAlignment(Element.ALIGN_RIGHT);
        derecha.addElement(tipo);
        Paragraph numero = new Paragraph(PdfEstilo.texto(factura.get("invoiceNumber")),
                PdfEstilo.bold(12.5f, PdfEstilo.WHITE));
        numero.setAlignment(Element.ALIGN_RIGHT);
        numero.setSpacingBefore(2);
        derecha.addElement(numero);
        derecha.addElement(derechaTexto("Emitido el " + PdfEstilo.fecha(factura.get("issueDate"))));
        String serie = PdfEstilo.texto(factura.get("series"));
        String correlativo = PdfEstilo.texto(factura.get("correlative"));
        derecha.addElement(derechaTexto("Serie " + serie + "  |  Correlativo " + correlativo));

        Image estadoBadge = badge(estado(factura.get("status")),
                colorEstado(factura.get("status")), writer);
        estadoBadge.setSpacingBefore(7);
        estadoBadge.setAlignment(Element.ALIGN_RIGHT);
        derecha.addElement(estadoBadge);
        cabecera.addCell(derecha);
        documento.add(cabecera);

        PdfPTable barra = new PdfPTable(1);
        barra.setWidthPercentage(100);
        PdfPCell barraCell = new PdfPCell(new Phrase(" ", PdfEstilo.font(1, Font.NORMAL, acento)));
        barraCell.setBackgroundColor(acento);
        barraCell.setBorder(Rectangle.NO_BORDER);
        barraCell.setFixedHeight(4);
        barra.addCell(barraCell);
        documento.add(barra);
        documento.add(new Paragraph(" ", PdfEstilo.font(8, Font.NORMAL, PdfEstilo.SLATE_400)));
    }

    private PdfPCell celdaLogo(Configuracion configuracion, String nombre, Color acento,
            PdfWriter writer) {
        Image logo = logoImagen(configuracion);
        if (logo != null) {
            float size = 36f;
            PdfTemplate template = writer.getDirectContent().createTemplate(size, size);
            template.setColorFill(acento);
            template.roundRectangle(0, 0, size, size, 8);
            template.fill();
            logo.scaleToFit(28, 28);
            float x = (size - logo.getScaledWidth()) / 2;
            float y = (size - logo.getScaledHeight()) / 2;
            template.addImage(logo, logo.getScaledWidth(), 0, 0, logo.getScaledHeight(), x, y);
            Image badge = Image.getInstance(template);
            PdfPCell celda = new PdfPCell(badge, false);
            celda.setBorder(Rectangle.NO_BORDER);
            celda.setPadding(0);
            celda.setFixedHeight(size);
            celda.setHorizontalAlignment(Element.ALIGN_CENTER);
            celda.setVerticalAlignment(Element.ALIGN_MIDDLE);
            return celda;
        }

        PdfPCell celda = PdfEstilo.celdaSinBorde(iniciales(nombre),
                PdfEstilo.bold(14, PdfEstilo.WHITE), acento, Element.ALIGN_CENTER);
        celda.setFixedHeight(36);
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
            image.scaleToFit(32, 32);
            return image;
        } catch (Exception ignored) {
            return null;
        }
    }

    private Image badge(String texto, Color color, PdfWriter writer) throws DocumentException {
        float width = Math.max(52f, texto.length() * 5.1f + 18f);
        float height = 18f;
        PdfTemplate template = writer.getDirectContent().createTemplate(width, height);
        template.setColorFill(color);
        template.roundRectangle(0, 0, width, height, height / 2);
        template.fill();
        ColumnText.showTextAligned(template, Element.ALIGN_CENTER,
                new Phrase(texto, PdfEstilo.bold(7.2f, PdfEstilo.WHITE)),
                width / 2, 5.2f, 0);
        Image image = Image.getInstance(template);
        image.scaleAbsolute(width, height);
        return image;
    }

    private void agregarInformacion(Document documento, Map<String, Object> factura)
            throws DocumentException {
        PdfPTable info = new PdfPTable(new float[]{1.45f, 1f});
        info.setWidthPercentage(100);
        info.setSpacingAfter(12);

        PdfPCell cliente = caja();
        cliente.addElement(etiqueta("CLIENTE"));
        cliente.addElement(new Paragraph(PdfEstilo.texto(factura.get("customer")),
                PdfEstilo.bold(10, PdfEstilo.SLATE_900)));
        cliente.addElement(dato("Documento: " + PdfEstilo.texto(factura.get("customerDocumentType"))
                + " " + PdfEstilo.texto(factura.get("documentNumber"))));
        String telefono = PdfEstilo.texto(factura.get("customerPhone"));
        if (!"—".equals(telefono) && !telefono.isBlank()) {
            cliente.addElement(dato("Teléfono: " + telefono));
        }
        info.addCell(cliente);

        PdfPCell referencia = caja();
        referencia.addElement(etiqueta("REFERENCIA"));
        Map<?, ?> orden = factura.get("workOrder") instanceof Map<?, ?> map ? map : Map.of();
        referencia.addElement(dato("Orden: " + PdfEstilo.texto(orden.get("orderNumber"))));
        referencia.addElement(dato("Vehículo: " + PdfEstilo.texto(factura.get("vehicle"))));
        referencia.addElement(dato("Año: " + PdfEstilo.texto(factura.get("vehicleYear"))));
        referencia.addElement(dato("Emisión: " + PdfEstilo.fecha(factura.get("issueDate"))));
        referencia.addElement(dato("Pago: " + pago(factura.get("paymentMethod"))));
        info.addCell(referencia);
        documento.add(info);
    }

    private void agregarItems(Document documento, Map<String, Object> factura, Color acento)
            throws DocumentException {

        PdfPTable tabla = new PdfPTable(new float[]{4.8f, 0.9f, 1.35f, 1.55f});
        tabla.setWidthPercentage(100);
        tabla.setHeaderRows(1);
        tabla.setSplitRows(true);
        tabla.setSplitLate(false);
        tabla.setSpacingAfter(12);

        tabla.addCell(PdfEstilo.celda("DESCRIPCIÓN", PdfEstilo.bold(7.2f, PdfEstilo.WHITE),
                acento, Element.ALIGN_LEFT));
        tabla.addCell(PdfEstilo.celda("CANT.", PdfEstilo.bold(7.2f, PdfEstilo.WHITE),
                acento, Element.ALIGN_CENTER));
        tabla.addCell(PdfEstilo.celda("P. UNIT.", PdfEstilo.bold(7.2f, PdfEstilo.WHITE),
                acento, Element.ALIGN_RIGHT));
        tabla.addCell(PdfEstilo.celda("IMPORTE", PdfEstilo.bold(7.2f, PdfEstilo.WHITE),
                acento, Element.ALIGN_RIGHT));

        List<?> items = factura.get("items") instanceof List<?> list ? list : List.of();
        if (items.isEmpty()) {
            tabla.addCell(celdaItem("Servicios de taller", 8, PdfEstilo.WHITE, Element.ALIGN_LEFT, false));
            tabla.addCell(celdaItem("1", 8, PdfEstilo.WHITE, Element.ALIGN_CENTER, false));
            tabla.addCell(celdaItem(PdfEstilo.money(factura.get("subtotal")), 8, PdfEstilo.WHITE,
                    Element.ALIGN_RIGHT, false));
            tabla.addCell(celdaItem(PdfEstilo.money(factura.get("subtotal")), 8, PdfEstilo.WHITE,
                    Element.ALIGN_RIGHT, true));
        } else {
            int index = 0;
            for (Object item : items) {
                Map<?, ?> fila = item instanceof Map<?, ?> map ? map : Map.of();
                Color fondo = index % 2 == 0 ? PdfEstilo.WHITE : PdfEstilo.SLATE_50;
                tabla.addCell(celdaItem(PdfEstilo.texto(fila.get("description")), 8, fondo,
                        Element.ALIGN_LEFT, false));
                tabla.addCell(celdaItem(PdfEstilo.numero(fila.get("quantity")), 8, fondo,
                        Element.ALIGN_CENTER, false));
                tabla.addCell(celdaItem(PdfEstilo.money(fila.get("unitPrice")), 8, fondo,
                        Element.ALIGN_RIGHT, false));
                tabla.addCell(celdaItem(PdfEstilo.money(fila.get("lineTotal")), 8, fondo,
                        Element.ALIGN_RIGHT, true));
                index++;
            }
        }
        documento.add(tabla);
    }

    private PdfPCell celdaItem(String valor, float size, Color fondo, int alignment, boolean bold) {
        Font font = bold ? PdfEstilo.bold(size, PdfEstilo.SLATE_900)
                : PdfEstilo.font(size, Font.NORMAL, PdfEstilo.SLATE_700);
        PdfPCell cell = PdfEstilo.celda(valor, font, fondo, alignment);
        cell.setPaddingTop(7);
        cell.setPaddingBottom(7);
        return cell;
    }

    private void agregarTotales(
            Document documento,
            Map<String, Object> factura,
            Color acento,
            PdfWriter writer
    ) throws DocumentException {
        if (writer.getVerticalPosition(true) < 190) {
            documento.newPage();
        }

        PdfPTable totales = new PdfPTable(new float[]{1.35f, 1f});
        totales.setWidthPercentage(100);

        PdfPCell pago = caja();
        pago.addElement(etiqueta("INFORMACIÓN DE PAGO"));
        pago.addElement(new Paragraph(estado(factura.get("status")),
                PdfEstilo.bold(9, colorEstado(factura.get("status")))));
        pago.addElement(dato("Forma de pago: " + pago(factura.get("paymentMethod"))));
        pago.addElement(dato("Moneda: Soles (S/)"));
        pago.addElement(dato("Conserve este documento como constancia de su operación."));
        totales.addCell(pago);

        PdfPTable resumen = new PdfPTable(new float[]{1.3f, 0.8f});
        resumen.setWidthPercentage(100);
        totalFila(resumen, "Subtotal", PdfEstilo.money(factura.get("subtotal")), false, acento);
        totalFila(resumen, "IGV (18%)", PdfEstilo.money(factura.get("taxAmount")), false, acento);
        totalFila(resumen, "TOTAL", PdfEstilo.money(factura.get("totalAmount")), true, acento);
        PdfPCell resumenCell = new PdfPCell(resumen);
        resumenCell.setBackgroundColor(PdfEstilo.SLATE_50);
        resumenCell.setBorder(Rectangle.NO_BORDER);
        resumenCell.setPadding(8);
        totales.addCell(resumenCell);
        documento.add(totales);



    }

    private void totalFila(PdfPTable tabla, String etiqueta, String valor, boolean total, Color acento) {
        Font labelFont = total ? PdfEstilo.bold(9.5f, PdfEstilo.SLATE_900)
                : PdfEstilo.font(8, Font.NORMAL, PdfEstilo.SLATE_500);
        Font valueFont = total ? PdfEstilo.bold(13, acento)
                : PdfEstilo.font(8.5f, Font.NORMAL, PdfEstilo.SLATE_700);
        PdfPCell label = PdfEstilo.celdaSinBorde(etiqueta, labelFont, PdfEstilo.SLATE_50, Element.ALIGN_LEFT);
        PdfPCell value = PdfEstilo.celdaSinBorde(valor, valueFont, PdfEstilo.SLATE_50, Element.ALIGN_RIGHT);
        if (total) {
            label.setBorder(Rectangle.TOP);
            value.setBorder(Rectangle.TOP);
            label.setBorderColor(PdfEstilo.SLATE_200);
            value.setBorderColor(PdfEstilo.SLATE_200);
        }
        label.setPaddingTop(total ? 10 : 5);
        value.setPaddingTop(total ? 10 : 5);
        label.setPaddingBottom(5);
        value.setPaddingBottom(5);
        tabla.addCell(label);
        tabla.addCell(value);
    }

    private PdfPCell caja() {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(PdfEstilo.SLATE_50);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(11);
        return cell;
    }

    private Paragraph etiqueta(String texto) {
        Paragraph paragraph = new Paragraph(texto, PdfEstilo.bold(6.8f, PdfEstilo.SLATE_400));
        paragraph.setSpacingAfter(5);
        return paragraph;
    }

    private Paragraph dato(String texto) {
        Paragraph paragraph = new Paragraph(texto, PdfEstilo.font(7.8f, Font.NORMAL, PdfEstilo.SLATE_700));
        paragraph.setSpacingAfter(2);
        return paragraph;
    }

    private Paragraph linea(String texto, float size) {
        Paragraph paragraph = new Paragraph(texto, PdfEstilo.font(size, Font.NORMAL, PdfEstilo.SLATE_300));
        paragraph.setSpacingBefore(1);
        return paragraph;
    }

    private Paragraph derechaTexto(String texto) {
        return derechaTexto(texto, PdfEstilo.SLATE_300);
    }

    private Paragraph derechaTexto(String texto, Color color) {
        Paragraph paragraph = new Paragraph(texto, PdfEstilo.font(7.2f, Font.NORMAL, color));
        paragraph.setAlignment(Element.ALIGN_RIGHT);
        paragraph.setSpacingBefore(2);
        return paragraph;
    }

    private String emisor(Configuracion configuracion) {
        if (configuracion != null && configuracion.getTallerNombre() != null
                && !configuracion.getTallerNombre().isBlank()) {
            return configuracion.getTallerNombre();
        }
        return "Taller Mecánico SIGTM";
    }

    private String valor(Object value) {
        String text = PdfEstilo.texto(value);
        return "—".equals(text) ? "" : text;
    }

    private String iniciales(String nombre) {
        String[] partes = nombre.trim().split("\\s+");
        StringBuilder iniciales = new StringBuilder();
        for (String parte : partes) {
            if (!parte.isBlank() && iniciales.length() < 2) {
                iniciales.append(parte.charAt(0));
            }
        }
        return iniciales.length() == 0 ? "SG" : iniciales.toString().toUpperCase(Locale.ROOT);
    }

    private String estado(Object status) {
        String value = PdfEstilo.texto(status).toUpperCase(Locale.ROOT);
        return switch (value) {
            case "PAID" -> "PAGADA";
            case "CANCELLED" -> "ANULADA";
            default -> "PENDIENTE";
        };
    }

    private Color colorEstado(Object status) {
        String value = PdfEstilo.texto(status).toUpperCase(Locale.ROOT);
        return switch (value) {
            case "PAID" -> PdfEstilo.BLUE;
            case "CANCELLED" -> PdfEstilo.RED;
            default -> PdfEstilo.AMBER;
        };
    }

    private String pago(Object method) {
        String value = PdfEstilo.texto(method).toUpperCase(Locale.ROOT);
        return switch (value) {
            case "CASH" -> "Efectivo";
            case "CARD" -> "Tarjeta";
            case "TRANSFER" -> "Transferencia";
            default -> "—";
        };
    }

    private String importeEnLetras(Object value) {
        BigDecimal amount = PdfEstilo.decimal(value).setScale(2, RoundingMode.HALF_UP);
        long entero = amount.longValue();
        int centavos = amount.subtract(BigDecimal.valueOf(entero))
                .movePointRight(2)
                .abs()
                .intValue();
        return "SON: " + numeroALetras(entero) + " CON "
                + String.format(Locale.ROOT, "%02d/100 SOLES", centavos);
    }

    private String numeroALetras(long numero) {
        if (numero == 0) {
            return "CERO";
        }
        if (numero < 0) {
            return "MENOS " + numeroALetras(-numero);
        }
        if (numero < 30) {
            return UNIDADES[(int) numero];
        }
        if (numero < 100) {
            int decena = (int) numero / 10;
            int unidad = (int) numero % 10;
            return DECENAS[decena] + (unidad > 0 ? " Y " + UNIDADES[unidad] : "");
        }
        if (numero < 1_000) {
            int centena = (int) numero / 100;
            long resto = numero % 100;
            if (centena == 1 && resto == 0) {
                return "CIEN";
            }
            return CENTENAS[centena] + (resto > 0 ? " " + numeroALetras(resto) : "");
        }
        if (numero < 1_000_000) {
            long miles = numero / 1_000;
            long resto = numero % 1_000;
            String prefijo = miles == 1 ? "MIL" : numeroALetras(miles) + " MIL";
            return resto > 0 ? prefijo + " " + numeroALetras(resto) : prefijo;
        }
        if (numero < 1_000_000_000) {
            long millones = numero / 1_000_000;
            long resto = numero % 1_000_000;
            String prefijo = millones == 1 ? "UN MILLÓN" : numeroALetras(millones) + " MILLONES";
            return resto > 0 ? prefijo + " " + numeroALetras(resto) : prefijo;
        }
        return String.valueOf(numero);
    }

    /**
     * Pequeña utilidad para unir datos opcionales sin dependencias externas.
     */
    private static final class StreamUtil {
        private StreamUtil() {
        }

        static String unir(String separador, String... partes) {
            List<String> validas = new ArrayList<>();
            for (String parte : partes) {
                if (parte != null && !parte.isBlank() && !"—".equals(parte)) {
                    validas.add(parte);
                }
            }
            return String.join(separador, validas);
        }
    }
}
