package com.sigtm.backend.service;

import com.lowagie.text.pdf.PdfReader;
import com.lowagie.text.pdf.parser.PdfTextExtractor;
import com.sigtm.backend.model.Configuracion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FacturaPdfServiceTest {

    @Mock
    private FacturaService facturaService;

    @Mock
    private ConfiguracionService configuracionService;

    @InjectMocks
    private FacturaPdfService facturaPdfService;

    @BeforeEach
    void setUp() {
        when(configuracionService.obtenerConfiguracion())
                .thenReturn(Configuracion.builder()
                        .tallerNombre("Taller de Prueba")
                        .tallerRuc("20999999999")
                        .tallerDireccion("Av. Siempre Viva 742")
                        .tallerTelefono("999 000 111")
                        .tallerCorreo("taller@prueba.test")
                        .build());
    }

    @Test
    @DisplayName("Genera una factura A4 con cliente, ítems y totales")
    void generaFactura() throws Exception {
        when(facturaService.obtenerPorId(1L)).thenReturn(factura("FACTURA", "PENDING", "F001", "F001-00000001"));

        byte[] pdf = facturaPdfService.generar(1L);

        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");
        assertThat(pdf.length).isGreaterThan(1_000);
        String texto = texto(pdf);
        assertThat(texto).contains(
                "FACTURA",
                "F001-00000001",
                "Empresa Prueba SAC",
                "Mantenimiento preventivo",
                "S/ 118.00",
                "TOTAL",
                "REFERENCIA");
    }

    @Test
    @DisplayName("Genera una boleta pagada sin errores")
    void generaBoletaPagada() throws Exception {
        when(facturaService.obtenerPorId(2L))
                .thenReturn(factura("BOLETA", "PAID", "B001", "B001-00000002"));

        String texto = texto(facturaPdfService.generar(2L));

        assertThat(texto).contains("BOLETA", "B001-00000002", "PAGADA", "Tarjeta", "Conserve este documento");
    }

    @Test
    @DisplayName("Incluye el logo configurado del taller")
    void generaConLogoDelTaller() throws Exception {
        when(configuracionService.obtenerConfiguracion())
                .thenReturn(Configuracion.builder()
                        .tallerNombre("Taller de Prueba")
                        .tallerLogo("data:image/png;base64,"
                                + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
                                + "+A8AAQUBAScY42YAAAAASUVORK5CYII=")
                        .build());
        when(facturaService.obtenerPorId(4L))
                .thenReturn(factura("FACTURA", "PENDING", "F001", "F001-00000004"));

        byte[] pdf = facturaPdfService.generar(4L);

        assertThat(pdf.length).isGreaterThan(1_000);
    }

    @Test
    @DisplayName("Incluye la marca de agua cuando el comprobante está anulado")
    void generaComprobanteAnulado() throws Exception {
        when(facturaService.obtenerPorId(3L))
                .thenReturn(factura("FACTURA", "CANCELLED", "F001", "F001-00000003"));

        String texto = texto(facturaPdfService.generar(3L));

        assertThat(texto).contains("ANULADA");
    }

    private Map<String, Object> factura(String tipo, String estado, String serie, String numero) {
        Map<String, Object> factura = new LinkedHashMap<>();
        factura.put("id", 1L);
        factura.put("invoiceNumber", numero);
        factura.put("documentType", tipo);
        factura.put("series", serie);
        factura.put("correlative", 1L);
        factura.put("issueDate", "2026-11-06T10:00:00");
        factura.put("subtotal", BigDecimal.valueOf(100));
        factura.put("taxAmount", BigDecimal.valueOf(18));
        factura.put("totalAmount", BigDecimal.valueOf(118));
        factura.put("status", estado);
        factura.put("paymentMethod", "CARD");
        factura.put("customer", "Empresa Prueba SAC");
        factura.put("customerDocumentType", "RUC");
        factura.put("documentNumber", "20123456789");
        factura.put("customerPhone", "999 111 222");
        factura.put("vehicle", "ABC-123 · Toyota Corolla");
        factura.put("vehicleYear", 2022);
        factura.put("workOrder", Map.of("id", 5L, "orderNumber", "OT-000005"));
        factura.put("items", List.of(Map.of(
                "id", 1L,
                "description", "Mantenimiento preventivo",
                "quantity", 1,
                "unitPrice", BigDecimal.valueOf(100),
                "lineTotal", BigDecimal.valueOf(100))));
        return factura;
    }

    private String texto(byte[] pdf) throws Exception {
        try (PdfReader reader = new PdfReader(pdf)) {
            StringBuilder texto = new StringBuilder();
            PdfTextExtractor extractor = new PdfTextExtractor(reader);
            for (int page = 1; page <= reader.getNumberOfPages(); page++) {
                texto.append(extractor.getTextFromPage(page)).append('\n');
            }
            return texto.toString();
        }
    }
}
