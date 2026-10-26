package com.sigtm.backend.service;

import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ReporteExcelServiceTest {

    private final ReporteExcelService service = new ReporteExcelService();

    @Test
    void generaValoresNumericosYNeutralizaFormulasEnTexto() throws Exception {
        Map<String, Object> reporte = new LinkedHashMap<>();
        reporte.put("titulo", "Reporte de prueba");
        reporte.put("columnas", List.of("Descripción", "Monto"));
        reporte.put("tipos", List.of("TEXT", "MONEY"));
        reporte.put("filas", List.of(List.of("=2+2", new BigDecimal("15.50"))));
        reporte.put("totales", List.of(Map.of("etiqueta", "Total", "valor", new BigDecimal("15.50"), "money", true)));

        byte[] archivo = service.generar(reporte);

        try (XSSFWorkbook libro = new XSSFWorkbook(new ByteArrayInputStream(archivo))) {
            var hoja = libro.getSheetAt(0);
            assertEquals("'=2+2", hoja.getRow(3).getCell(0).getStringCellValue());
            assertEquals(CellType.NUMERIC, hoja.getRow(3).getCell(1).getCellType());
            assertEquals(15.5, hoja.getRow(3).getCell(1).getNumericCellValue());
        }
    }
}
