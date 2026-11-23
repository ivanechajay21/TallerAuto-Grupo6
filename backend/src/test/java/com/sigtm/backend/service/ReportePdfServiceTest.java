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
class ReportePdfServiceTest {

    @Mock
    private ConfiguracionService configuracionService;

    @InjectMocks
    private ReportePdfService reportePdfService;

    @BeforeEach
    void setUp() {
        when(configuracionService.obtenerConfiguracion())
                .thenReturn(Configuracion.builder().tallerNombre("Taller de Prueba").build());
    }

    @Test
    @DisplayName("Genera un PDF vertical con datos y totales")
    void generaReporteConDatos() throws Exception {
        Map<String, Object> reporte = reporte(
                "CLIENTES",
                "Reporte de Clientes",
                List.of("Código", "Cliente", "Total"),
                List.of("TEXT", "TEXT", "MONEY"),
                List.of(List.of("C001", "Ana Pérez", BigDecimal.valueOf(118))),
                List.of(total("Total facturado", BigDecimal.valueOf(118), true))
        );

        byte[] pdf = reportePdfService.generar(reporte, "admin");

        assertThat(new String(pdf, 0, 4, StandardCharsets.US_ASCII)).isEqualTo("%PDF");
        assertThat(pdf.length).isGreaterThan(1_000);
        String texto = texto(pdf);
        assertThat(texto).contains("Reporte de Clientes", "Ana", "Taller de Prueba");
        try (PdfReader reader = new PdfReader(pdf)) {
            assertThat(reader.getPageSize(1).getWidth()).isLessThan(reader.getPageSize(1).getHeight());
        }
    }

    @Test
    @DisplayName("Genera un PDF horizontal cuando el reporte tiene muchas columnas")
    void generaReporteHorizontal() throws Exception {
        Map<String, Object> reporte = reporte(
                "INVENTARIO",
                "Reporte de Inventario",
                List.of("Código", "Producto", "Marca", "Categoría", "Stock", "Mínimo", "Compra", "Venta"),
                List.of("TEXT", "TEXT", "TEXT", "TEXT", "NUM", "NUM", "MONEY", "MONEY"),
                List.of(List.of("P001", "Filtro", "Toyota", "Repuestos", 10, 2,
                        BigDecimal.valueOf(20), BigDecimal.valueOf(35))),
                List.of(total("Valor inventario", BigDecimal.valueOf(350), true))
        );

        byte[] pdf = reportePdfService.generar(reporte, "admin");

        try (PdfReader reader = new PdfReader(pdf)) {
            assertThat(reader.getPageSizeWithRotation(1).getWidth())
                    .isGreaterThan(reader.getPageSizeWithRotation(1).getHeight());
        }
        assertThat(texto(pdf)).contains("Reporte de Inventario", "Filtro");
    }

    @Test
    @DisplayName("Genera un PDF con mensaje cuando el reporte no tiene filas")
    void generaReporteVacio() throws Exception {
        Map<String, Object> reporte = reporte(
                "CITAS",
                "Reporte de Citas",
                List.of("N°", "Cliente"),
                List.of("TEXT", "TEXT"),
                List.of(),
                List.of()
        );

        String texto = texto(reportePdfService.generar(reporte, "admin"));

        assertThat(texto).contains("Sin datos para este reporte");
    }

    private Map<String, Object> reporte(
            String tipo,
            String titulo,
            List<String> columnas,
            List<String> tipos,
            List<List<Object>> filas,
            List<Map<String, Object>> totales
    ) {
        Map<String, Object> reporte = new LinkedHashMap<>();
        reporte.put("tipo", tipo);
        reporte.put("titulo", titulo);
        reporte.put("columnas", columnas);
        reporte.put("tipos", tipos);
        reporte.put("filas", filas);
        reporte.put("totales", totales);
        return reporte;
    }

    private Map<String, Object> total(String etiqueta, Object valor, boolean money) {
        Map<String, Object> total = new LinkedHashMap<>();
        total.put("etiqueta", etiqueta);
        total.put("valor", valor);
        total.put("money", money);
        return total;
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
