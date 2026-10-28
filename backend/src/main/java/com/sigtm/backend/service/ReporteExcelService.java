package com.sigtm.backend.service;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/** Genera las hojas XLSX del Centro de Reportes con Apache POI. */
@Service
public class ReporteExcelService {

    /**
     * Convierte la estructura producida por {@link ReporteService} en un XLSX.
     * Los valores de texto potencialmente interpretables como fórmula se fuerzan a
     * texto para impedir formula injection al abrir el archivo en Excel.
     *
     * @param reporte columnas, tipos, filas y totales del reporte
     * @return el archivo XLSX en memoria
     */
    public byte[] generar(Map<String, Object> reporte) {
        List<?> columnas = lista(reporte.get("columnas"));
        List<?> tipos = lista(reporte.get("tipos"));
        List<?> filas = lista(reporte.get("filas"));
        List<?> totales = lista(reporte.get("totales"));
        String titulo = texto(reporte.get("titulo"));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = workbook.createSheet(nombreHoja(titulo));
            Estilos estilos = new Estilos(workbook);
            int cantidadColumnas = Math.max(1, columnas.size());
            int numeroFila = 0;

            Row filaTitulo = hoja.createRow(numeroFila++);
            Cell celdaTitulo = filaTitulo.createCell(0);
            celdaTitulo.setCellValue(titulo.isBlank() ? "Centro de Reportes" : titulo);
            celdaTitulo.setCellStyle(estilos.titulo);
            hoja.addMergedRegion(new CellRangeAddress(0, 0, 0, cantidadColumnas - 1));

            numeroFila++;
            Row encabezado = hoja.createRow(numeroFila++);
            for (int indice = 0; indice < columnas.size(); indice++) {
                Cell celda = encabezado.createCell(indice);
                celda.setCellValue(texto(columnas.get(indice)));
                celda.setCellStyle(estilos.encabezado);
            }

            for (Object filaObjeto : filas) {
                Row fila = hoja.createRow(numeroFila++);
                List<?> valores = lista(filaObjeto);
                for (int indice = 0; indice < columnas.size(); indice++) {
                    Object valor = indice < valores.size() ? valores.get(indice) : "";
                    String tipo = indice < tipos.size() ? texto(tipos.get(indice)) : "TEXT";
                    escribirValor(fila.createCell(indice), valor, tipo, estilos);
                }
            }

            if (!totales.isEmpty()) {
                numeroFila++;
                for (Object totalObjeto : totales) {
                    if (!(totalObjeto instanceof Map<?, ?> total)) continue;
                    Row fila = hoja.createRow(numeroFila++);
                    Cell etiqueta = fila.createCell(0);
                    etiqueta.setCellValue(texto(total.get("etiqueta")));
                    etiqueta.setCellStyle(estilos.totalEtiqueta);
                    Cell valor = fila.createCell(1);
                    boolean money = Boolean.TRUE.equals(total.get("money"));
                    escribirValor(valor, total.get("valor"), money ? "MONEY" : "NUM", estilos);
                    valor.setCellStyle(money ? estilos.totalMoneda : estilos.totalNumero);
                }
            }

            for (int indice = 0; indice < cantidadColumnas; indice++) {
                hoja.autoSizeColumn(indice);
                hoja.setColumnWidth(indice, Math.min(50 * 256, Math.max(14 * 256, hoja.getColumnWidth(indice) + 512)));
            }
            hoja.createFreezePane(0, 3);
            workbook.write(salida);
            return salida.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("No se pudo generar el archivo Excel", exception);
        }
    }

    private void escribirValor(Cell celda, Object valor, String tipo, Estilos estilos) {
        if (("NUM".equals(tipo) || "MONEY".equals(tipo)) && valor instanceof Number numero) {
            celda.setCellValue(numero.doubleValue());
            celda.setCellStyle("MONEY".equals(tipo) ? estilos.moneda : estilos.numero);
            return;
        }
        celda.setCellValue(textoSeguro(valor));
        celda.setCellStyle(estilos.texto);
    }

    private List<?> lista(Object valor) {
        return valor instanceof List<?> lista ? lista : List.of();
    }

    private String texto(Object valor) {
        return valor == null ? "" : valor.toString();
    }

    private String textoSeguro(Object valor) {
        String texto = texto(valor);
        return texto.startsWith("=") || texto.startsWith("+") || texto.startsWith("-") || texto.startsWith("@")
                ? "'" + texto
                : texto;
    }

    private String nombreHoja(String titulo) {
        String limpio = titulo.replaceAll("[\\\\/:*?\\[\\]]", " ").trim();
        return (limpio.isBlank() ? "Reporte" : limpio).substring(0, Math.min(31, Math.max(1, limpio.length())));
    }

    private static final class Estilos {
        private final CellStyle titulo;
        private final CellStyle encabezado;
        private final CellStyle texto;
        private final CellStyle numero;
        private final CellStyle moneda;
        private final CellStyle totalEtiqueta;
        private final CellStyle totalNumero;
        private final CellStyle totalMoneda;

        private Estilos(Workbook libro) {
            Font negrita = libro.createFont();
            negrita.setBold(true);
            Font fuenteTitulo = libro.createFont();
            fuenteTitulo.setBold(true);
            fuenteTitulo.setFontHeightInPoints((short) 14);
            fuenteTitulo.setColor(IndexedColors.WHITE.getIndex());

            titulo = libro.createCellStyle();
            titulo.setFont(fuenteTitulo);
            titulo.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            titulo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            titulo.setAlignment(HorizontalAlignment.LEFT);

            encabezado = libro.createCellStyle();
            encabezado.setFont(negrita);
            encabezado.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            encabezado.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            texto = libro.createCellStyle();
            DataFormat formato = libro.createDataFormat();
            numero = libro.createCellStyle();
            numero.setDataFormat(formato.getFormat("#,##0"));
            moneda = libro.createCellStyle();
            moneda.setDataFormat(formato.getFormat("S/ #,##0.00"));

            totalEtiqueta = libro.createCellStyle();
            totalEtiqueta.setFont(negrita);
            totalNumero = libro.createCellStyle();
            totalNumero.setFont(negrita);
            totalNumero.setDataFormat(formato.getFormat("#,##0"));
            totalMoneda = libro.createCellStyle();
            totalMoneda.setFont(negrita);
            totalMoneda.setDataFormat(formato.getFormat("S/ #,##0.00"));
        }
    }
}
