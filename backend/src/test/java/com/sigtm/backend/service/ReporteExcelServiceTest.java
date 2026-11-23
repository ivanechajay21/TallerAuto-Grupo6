package com.sigtm.backend.service;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ReporteExcelServiceTest {

    private final ReporteExcelService service = new ReporteExcelService();

    @Test
    void generaUnLibroCorporativoConSolesFiltrosYFormatoCondicional() throws Exception {
        Map<String, Object> reporte = new LinkedHashMap<>();
        reporte.put("tipo", "INVENTARIO");
        reporte.put("titulo", "Reporte de prueba");
        reporte.put("columnas", List.of("Descripción", "Monto", "Estado"));
        reporte.put("tipos", List.of("TEXT", "MONEY", "TEXT"));
        reporte.put("filas", List.of(
                List.of("=2+2", new BigDecimal("15.50"), "Disponible"),
                List.of("Producto", new BigDecimal("10.00"), "Stock bajo")
        ));
        reporte.put("totales", List.of(Map.of("etiqueta", "Total", "valor", new BigDecimal("25.50"), "money", true)));

        byte[] archivo = service.generar(reporte, "admin");

        try (XSSFWorkbook libro = new XSSFWorkbook(new ByteArrayInputStream(archivo))) {
            assertEquals(2, libro.getNumberOfSheets());
            assertEquals("Resumen", libro.getSheetName(0));
            assertEquals("Datos", libro.getSheetName(1));

            XSSFSheet resumen = libro.getSheet("Resumen");
            XSSFSheet datos = libro.getSheet("Datos");

            assertEquals("'=2+2", datos.getRow(4).getCell(0).getStringCellValue());
            assertEquals(CellType.NUMERIC, datos.getRow(4).getCell(1).getCellType());
            assertEquals(15.5, datos.getRow(4).getCell(1).getNumericCellValue());
            String formatoMoneda = datos.getRow(4).getCell(1).getCellStyle().getDataFormatString();
            assertTrue(formatoMoneda.contains("S/"));
            assertTrue(formatoMoneda.contains("\"S/ \""), "El literal S/ debe ir entre comillas en el formato Excel");
            assertTrue(datos.getCTWorksheet().isSetAutoFilter());
            assertTrue(datos.getPaneInformation().isFreezePane());
            assertTrue(datos.getSheetConditionalFormatting().getNumConditionalFormattings() > 0);
            assertTrue(contieneTexto(resumen, "Soles (S/)"));
            assertTrue(contieneTexto(resumen, "REGISTROS"));
            assertTrue(contieneTexto(resumen, "DISTRIBUCIÓN POR ESTADO"));
            assertNotNull(resumen.getDrawingPatriarch());
            assertEquals(1, resumen.getDrawingPatriarch().getCharts().size());

            assertFalse(contieneTexto(libro, "PEN"), "Ninguna celda debe mostrar PEN");
        }
    }

    private boolean contieneTexto(XSSFWorkbook libro, String buscado) {
        for (int i = 0; i < libro.getNumberOfSheets(); i++) {
            if (contieneTexto(libro.getSheetAt(i), buscado)) return true;
        }
        return false;
    }

    private boolean contieneTexto(XSSFSheet hoja, String buscado) {
        DataFormatter formatter = new DataFormatter();
        for (Row fila : hoja) {
            for (var celda : fila) {
                String valor = formatter.formatCellValue(celda);
                if (valor != null && valor.toLowerCase().contains(buscado.toLowerCase())) return true;
            }
        }
        return false;
    }
}
