package com.sigtm.backend.service;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.ComparisonOperator;
import org.apache.poi.ss.usermodel.ConditionalFormattingRule;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.FontFormatting;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.common.usermodel.HyperlinkType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.PatternFormatting;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.SheetConditionalFormatting;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.chart.AxisCrosses;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.BarDirection;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.LegendPosition;
import org.apache.poi.xddf.usermodel.chart.XDDFBarChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSourcesFactory;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Genera las hojas XLSX del Centro de Reportes con Apache POI.
 *
 * <p>El libro resultante tiene dos hojas: {@code Resumen}, con la portada
 * corporativa, indicadores, totales y distribución por estado; y {@code Datos},
 * con la tabla detallada, filtros, panel congelado, formato condicional y
 * configuración de impresión. Todos los importes se presentan en Soles (S/).</p>
 */
@Service
public class ReporteExcelService {

    private static final Pattern MONEDA_PEN = Pattern.compile("(?i)(\\d[\\d.,]*)\\s*PEN\\b");
    private static final Pattern PEN = Pattern.compile("(?i)\\bPEN\\b");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", new Locale("es", "PE"));
    private static final String MONEDA = "Soles (S/)";

    private static final byte[] NAVY = {(byte) 23, (byte) 37, (byte) 84};
    private static final byte[] SLATE_900 = {(byte) 15, (byte) 23, (byte) 42};
    private static final byte[] SLATE_500 = {(byte) 100, (byte) 116, (byte) 139};
    private static final byte[] SLATE_200 = {(byte) 226, (byte) 232, (byte) 240};
    private static final byte[] SLATE_50 = {(byte) 248, (byte) 250, (byte) 252};
    private static final byte[] WHITE = {(byte) 255, (byte) 255, (byte) 255};

    /**
     * Convierte la estructura producida por {@link ReporteService} en un XLSX.
     *
     * @param reporte columnas, tipos, filas y totales del reporte
     * @return el archivo XLSX en memoria
     */
    public byte[] generar(Map<String, Object> reporte) {
        return generar(reporte, null);
    }

    /**
     * Genera el XLSX e incorpora el usuario emisor en la portada y en la hoja
     * de datos.
     *
     * @param reporte columnas, tipos, filas y totales del reporte
     * @param usuario nombre del usuario que solicita la exportación
     * @return el archivo XLSX en memoria
     */
    public byte[] generar(Map<String, Object> reporte, String usuario) {
        List<?> columnas = lista(reporte.get("columnas"));
        List<?> tipos = lista(reporte.get("tipos"));
        List<?> filas = lista(reporte.get("filas"));
        List<?> totales = lista(reporte.get("totales"));
        String titulo = normalizarMoneda(texto(reporte.get("titulo")));
        String tipo = texto(reporte.get("tipo")).toUpperCase(Locale.ROOT);
        String emisor = normalizarMoneda(texto(usuario)).trim();
        if (emisor.isBlank()) {
            emisor = "Sistema";
        }

        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            libro.getProperties().getCoreProperties().setTitle("SIGTM · " + titulo);
            libro.getProperties().getCoreProperties().setSubjectProperty("Reporte corporativo en Soles (S/)");
            libro.getProperties().getCoreProperties().setCreator("SIGTM · Sistema Integral de Gestión de Taller");
            libro.getProperties().getCoreProperties().setKeywords("SIGTM, reporte, Soles, S/");
            libro.getProperties().getCoreProperties().setDescription("Documento corporativo generado automáticamente por SIGTM.");

            Estilos estilos = new Estilos(libro, acento(tipo));
            crearResumen(libro, estilos, titulo, tipo, emisor, columnas, filas, totales);
            crearDatos(libro, estilos, titulo, emisor, columnas, tipos, filas);
            libro.setActiveSheet(0);
            libro.getSheetAt(0).setSelected(true);
            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("No se pudo generar el archivo Excel", exception);
        }
    }

    /* =====================================================================
       Hoja Resumen: portada ejecutiva, KPIs, totales y distribución
       ===================================================================== */

    private void crearResumen(
            XSSFWorkbook libro,
            Estilos estilos,
            String titulo,
            String tipo,
            String usuario,
            List<?> columnas,
            List<?> filas,
            List<?> totales
    ) {
        XSSFSheet hoja = libro.createSheet("Resumen");
        hoja.setDisplayGridlines(false);
        hoja.setZoom(90);
        for (int i = 0; i < 8; i++) {
            hoja.setColumnWidth(i, 19 * 256);
        }
        hoja.setDefaultRowHeightInPoints(18);

        // Banda de marca
        Row filaMarca = hoja.createRow(0);
        filaMarca.setHeightInPoints(32);
        merge(hoja, 0, 0, 0, 7);
        celda(filaMarca, 0, "SIGTM  ·  CENTRO DE REPORTES", estilos.marca);

        Row filaAcento = hoja.createRow(1);
        filaAcento.setHeightInPoints(5);
        pintarRango(hoja, filaAcento, 0, 7, estilos.acento);

        // Título y metadatos
        Row filaTitulo = hoja.createRow(3);
        filaTitulo.setHeightInPoints(30);
        merge(hoja, 3, 3, 0, 7);
        celda(filaTitulo, 0, titulo.isBlank() ? "Centro de Reportes" : titulo, estilos.titulo);

        Row filaMeta = hoja.createRow(4);
        filaMeta.setHeightInPoints(20);
        merge(hoja, 4, 4, 0, 6);
        celda(filaMeta, 0, "Generado el " + fechaHora() + " · Emitido por " + usuario + " · Moneda oficial: " + MONEDA, estilos.meta);
        enlace(hoja, filaMeta, 7, "Ver datos →", "'Datos'!A1", estilos.enlace);

        // Tarjetas KPI
        Row filaKpiTop = hoja.createRow(6);
        filaKpiTop.setHeightInPoints(5);
        pintarRango(hoja, filaKpiTop, 0, 7, estilos.acento);

        Row filaKpiLabel = hoja.createRow(7);
        filaKpiLabel.setHeightInPoints(17);
        Row filaKpiValor = hoja.createRow(8);
        filaKpiValor.setHeightInPoints(27);
        Row filaKpiPie = hoja.createRow(9);
        filaKpiPie.setHeightInPoints(8);
        kpi(hoja, estilos, 7, 8, 9, 0, 1, "REGISTROS", String.valueOf(filas.size()));
        kpi(hoja, estilos, 7, 8, 9, 2, 3, "COLUMNAS", String.valueOf(columnas.size()));
        kpi(hoja, estilos, 7, 8, 9, 4, 5, "MONEDA", MONEDA);
        kpi(hoja, estilos, 7, 8, 9, 6, 7, "TIPO DE REPORTE", tipo.isBlank() ? "GENERAL" : tipo);

        // Totales
        Row filaSeccionTotales = hoja.createRow(11);
        filaSeccionTotales.setHeightInPoints(24);
        merge(hoja, 11, 11, 0, 7);
        celda(filaSeccionTotales, 0, "RESUMEN DE TOTALES", estilos.seccion);

        Row filaCabeceraTotales = hoja.createRow(12);
        filaCabeceraTotales.setHeightInPoints(23);
        merge(hoja, 12, 12, 0, 3);
        merge(hoja, 12, 12, 4, 7);
        celda(filaCabeceraTotales, 0, "INDICADOR", estilos.cabecera);
        celda(filaCabeceraTotales, 4, "VALOR", estilos.cabecera);

        int fila = 13;
        if (totales.isEmpty()) {
            Row filaVacia = hoja.createRow(fila++);
            merge(hoja, filaVacia.getRowNum(), filaVacia.getRowNum(), 0, 7);
            celda(filaVacia, 0, "Este reporte no contiene totales calculados.", estilos.nota);
        } else {
            for (Object totalObjeto : totales) {
                if (!(totalObjeto instanceof Map<?, ?> total)) continue;
                Row filaTotal = hoja.createRow(fila++);
                filaTotal.setHeightInPoints(22);
                merge(hoja, filaTotal.getRowNum(), filaTotal.getRowNum(), 0, 3);
                merge(hoja, filaTotal.getRowNum(), filaTotal.getRowNum(), 4, 7);
                boolean money = Boolean.TRUE.equals(total.get("money"));
                String etiquetaTotal = normalizarMoneda(texto(total.get("etiqueta")));
                if (money && !etiquetaTotal.toLowerCase(Locale.ROOT).contains("s/")) {
                    etiquetaTotal += " (S/)";
                }
                celda(filaTotal, 0, etiquetaTotal, estilos.totalEtiqueta);
                escribirTotal(filaTotal, 4, total.get("valor"), money, estilos);
            }
        }

        // Distribución por estado
        int indiceEstado = indiceEstado(columnas);
        Map<String, Integer> distribucion = distribucion(filas, indiceEstado);
        if (!distribucion.isEmpty()) {
            fila++;
            Row filaSeccion = hoja.createRow(fila++);
            filaSeccion.setHeightInPoints(24);
            merge(hoja, filaSeccion.getRowNum(), filaSeccion.getRowNum(), 0, 7);
            celda(filaSeccion, 0, "DISTRIBUCIÓN POR ESTADO", estilos.seccion);

            Row filaCabecera = hoja.createRow(fila++);
            filaCabecera.setHeightInPoints(23);
            merge(hoja, filaCabecera.getRowNum(), filaCabecera.getRowNum(), 0, 3);
            merge(hoja, filaCabecera.getRowNum(), filaCabecera.getRowNum(), 4, 5);
            merge(hoja, filaCabecera.getRowNum(), filaCabecera.getRowNum(), 6, 7);
            celda(filaCabecera, 0, "ESTADO", estilos.cabecera);
            celda(filaCabecera, 4, "CANTIDAD", estilos.cabecera);
            celda(filaCabecera, 6, "% DEL TOTAL", estilos.cabecera);

            int primeraFilaDatos = fila;
            int totalEstados = distribucion.values().stream().mapToInt(Integer::intValue).sum();
            List<Map.Entry<String, Integer>> entradas = new ArrayList<>(distribucion.entrySet());
            entradas.sort(Map.Entry.<String, Integer>comparingByValue().reversed()
                    .thenComparing(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER)));
            for (Map.Entry<String, Integer> entrada : entradas) {
                Row filaEstado = hoja.createRow(fila++);
                filaEstado.setHeightInPoints(21);
                merge(hoja, filaEstado.getRowNum(), filaEstado.getRowNum(), 0, 3);
                merge(hoja, filaEstado.getRowNum(), filaEstado.getRowNum(), 4, 5);
                merge(hoja, filaEstado.getRowNum(), filaEstado.getRowNum(), 6, 7);
                Cell celdaEstado = celda(filaEstado, 0, normalizarMoneda(entrada.getKey()), estilos.estado(entrada.getKey()));
                celdaEstado.setCellStyle(estilos.estado(entrada.getKey()));
                Cell celdaCantidad = filaEstado.createCell(4);
                celdaCantidad.setCellValue(entrada.getValue());
                celdaCantidad.setCellStyle(estilos.centrado);
                double porcentaje = totalEstados == 0 ? 0 : (entrada.getValue() * 100.0) / totalEstados;
                celda(filaEstado, 6, String.format(Locale.US, "%.1f%%", porcentaje), estilos.centrado);
            }
            int ultimaFilaDatos = fila - 1;

            fila++;
            crearGraficoEstados(hoja, primeraFilaDatos, ultimaFilaDatos, fila, entradas.size());
            fila += Math.max(16, entradas.size() + 12);
        }

        Row filaNota = hoja.createRow(fila + 1);
        merge(hoja, filaNota.getRowNum(), filaNota.getRowNum(), 0, 7);
        celda(filaNota, 0, "Documento corporativo generado automáticamente por SIGTM · Moneda oficial: " + MONEDA + " · " + fechaHora(), estilos.nota);

        hoja.setFitToPage(true);
        hoja.getPrintSetup().setFitWidth((short) 1);
        hoja.getPrintSetup().setFitHeight((short) 0);
        hoja.getFooter().setLeft("SIGTM · Centro de Reportes");
        hoja.getFooter().setRight("Página &P de &N");
    }

    private void kpi(
            XSSFSheet hoja,
            Estilos estilos,
            int filaLabel,
            int filaValor,
            int filaPie,
            int colInicio,
            int colFin,
            String etiqueta,
            String valor
    ) {
        merge(hoja, filaLabel, filaLabel, colInicio, colFin);
        merge(hoja, filaValor, filaValor, colInicio, colFin);
        merge(hoja, filaPie, filaPie, colInicio, colFin);
        celda(hoja.getRow(filaLabel), colInicio, etiqueta, estilos.kpiEtiqueta);
        celda(hoja.getRow(filaValor), colInicio, valor, estilos.kpiValor);
        for (int c = colInicio; c <= colFin; c++) {
            if (hoja.getRow(filaPie).getCell(c) == null) {
                hoja.getRow(filaPie).createCell(c).setCellStyle(estilos.kpiPie);
            }
        }
    }

    private void crearGraficoEstados(
            XSSFSheet hoja,
            int primeraFilaDatos,
            int ultimaFilaDatos,
            int filaInicio,
            int cantidadEstados
    ) {
        if (ultimaFilaDatos < primeraFilaDatos) return;

        XSSFDrawing dibujo = hoja.createDrawingPatriarch();
        XSSFClientAnchor ancla = dibujo.createAnchor(0, 0, 0, 0, 0, filaInicio, 8, filaInicio + 16);
        XSSFChart grafico = dibujo.createChart(ancla);
        grafico.setTitleText("Distribución por estado");
        grafico.setTitleOverlay(false);
        grafico.getOrAddLegend().setPosition(LegendPosition.BOTTOM);

        XDDFCategoryAxis ejeCategorias = grafico.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis ejeValores = grafico.createValueAxis(AxisPosition.LEFT);
        ejeValores.setCrosses(AxisCrosses.AUTO_ZERO);

        var categorias = XDDFDataSourcesFactory.fromStringCellRange(
                hoja, new CellRangeAddress(primeraFilaDatos, ultimaFilaDatos, 0, 0));
        var valores = XDDFDataSourcesFactory.fromNumericCellRange(
                hoja, new CellRangeAddress(primeraFilaDatos, ultimaFilaDatos, 4, 4));

        XDDFBarChartData datos = (XDDFBarChartData) grafico.createData(ChartTypes.BAR, ejeCategorias, ejeValores);
        datos.setBarDirection(BarDirection.COL);
        datos.setVaryColors(false);
        datos.setGapWidth(45);
        XDDFChartData.Series serie = datos.addSeries(categorias, valores);
        serie.setTitle("Cantidad");
        grafico.plot(datos);

        // Ajusta el alto del gráfico si hay muchas categorías.
        if (cantidadEstados > 6) {
            ancla.setRow2(filaInicio + 18);
        }
    }

    /* =====================================================================
       Hoja Datos: tabla detallada, filtros, formato condicional e impresión
       ===================================================================== */

    private void crearDatos(
            XSSFWorkbook libro,
            Estilos estilos,
            String titulo,
            String usuario,
            List<?> columnas,
            List<?> tipos,
            List<?> filas
    ) {
        XSSFSheet hoja = libro.createSheet("Datos");
        hoja.setDisplayGridlines(false);
        hoja.setZoom(90);
        int cantidadColumnas = Math.max(1, columnas.size());

        Row filaMarca = hoja.createRow(0);
        filaMarca.setHeightInPoints(27);
        merge(hoja, 0, 0, 0, cantidadColumnas - 1);
        celda(filaMarca, 0, "SIGTM  ·  " + titulo, estilos.marca);

        Row filaMeta = hoja.createRow(1);
        filaMeta.setHeightInPoints(19);
        merge(hoja, 1, 1, 0, cantidadColumnas - 1);
        celda(filaMeta, 0, "Detalle de datos · Moneda: " + MONEDA + " · Emitido por " + usuario + " · " + fechaHora(), estilos.meta);

        Row filaAcento = hoja.createRow(2);
        filaAcento.setHeightInPoints(5);
        pintarRango(hoja, filaAcento, 0, cantidadColumnas - 1, estilos.acento);

        Row filaCabecera = hoja.createRow(3);
        filaCabecera.setHeightInPoints(31);
        for (int i = 0; i < columnas.size(); i++) {
            String etiqueta = normalizarMoneda(texto(columnas.get(i)));
            String tipo = i < tipos.size() ? texto(tipos.get(i)) : "TEXT";
            boolean monetaria = "MONEY".equals(tipo)
                    || etiqueta.matches("(?i).*(p\\.|precio|costo|valor|monto|saldo|total).*");
            if (monetaria && !etiqueta.toLowerCase(Locale.ROOT).contains("s/")) {
                etiqueta += " (S/)";
            }
            celda(filaCabecera, i, etiqueta.toUpperCase(Locale.ROOT), estilos.cabecera);
        }

        int primeraFilaDatos = 4;
        int fila = primeraFilaDatos;
        for (Object filaObjeto : filas) {
            Row filaDatos = hoja.createRow(fila);
            filaDatos.setHeightInPoints(19);
            List<?> valores = lista(filaObjeto);
            boolean zebra = ((fila - primeraFilaDatos) % 2 == 1);
            for (int i = 0; i < columnas.size(); i++) {
                Object valor = i < valores.size() ? valores.get(i) : "";
                String tipo = i < tipos.size() ? texto(tipos.get(i)) : "TEXT";
                escribirValor(filaDatos.createCell(i), valor, tipo, estilos, zebra);
            }
            fila++;
        }
        int ultimaFilaDatos = fila - 1;

        if (filas.isEmpty()) {
            Row filaVacia = hoja.createRow(fila);
            merge(hoja, fila, fila, 0, cantidadColumnas - 1);
            celda(filaVacia, 0, "Sin datos para este reporte.", estilos.nota);
            ultimaFilaDatos = fila;
        } else {
            hoja.setAutoFilter(new CellRangeAddress(3, ultimaFilaDatos, 0, cantidadColumnas - 1));
        }

        hoja.createFreezePane(cantidadColumnas > 2 ? 1 : 0, primeraFilaDatos);

        int indiceEstado = indiceEstado(columnas);
        if (indiceEstado >= 0 && !filas.isEmpty()) {
            aplicarFormatoEstados(hoja, filas, indiceEstado, primeraFilaDatos, ultimaFilaDatos);
        }

        for (int i = 0; i < columnas.size(); i++) {
            int longitud = texto(columnas.get(i)).length();
            for (int r = 0; r < Math.min(filas.size(), 40); r++) {
                List<?> valores = lista(filas.get(r));
                if (i < valores.size()) {
                    longitud = Math.max(longitud, texto(valores.get(i)).length());
                }
            }
            int ancho = Math.min(56, Math.max(14, longitud + 4));
            hoja.setColumnWidth(i, ancho * 256);
        }

        boolean horizontal = cantidadColumnas >= 7;
        hoja.setFitToPage(true);
        hoja.getPrintSetup().setFitWidth((short) 1);
        hoja.getPrintSetup().setFitHeight((short) 0);
        hoja.getPrintSetup().setLandscape(horizontal);
        hoja.setRepeatingRows(new CellRangeAddress(0, 3, -1, -1));
        hoja.setAutobreaks(true);
        hoja.getHeader().setCenter("SIGTM · " + titulo);
        hoja.getHeader().setRight("Moneda: " + MONEDA);
        hoja.getFooter().setLeft("Generado el " + fechaHora());
        hoja.getFooter().setRight("Página &P de &N");
        hoja.setSelected(false);
    }

    private void aplicarFormatoEstados(
            XSSFSheet hoja,
            List<?> filas,
            int indiceEstado,
            int primeraFilaDatos,
            int ultimaFilaDatos
    ) {
        Map<String, Integer> estados = distribucion(filas, indiceEstado);
        if (estados.isEmpty()) return;

        SheetConditionalFormatting formato = hoja.getSheetConditionalFormatting();
        for (String estado : estados.keySet()) {
            String valor = normalizarMoneda(estado).replace("\"", "\"\"");
            ConditionalFormattingRule regla = formato.createConditionalFormattingRule(
                    ComparisonOperator.EQUAL, "\"" + valor + "\"");
            PatternFormatting relleno = regla.createPatternFormatting();
            relleno.setFillBackgroundColor(fondoEstado(estado));
            relleno.setFillPattern(PatternFormatting.SOLID_FOREGROUND);
            FontFormatting fuente = regla.createFontFormatting();
            fuente.setFontColorIndex(colorEstado(estado));
            fuente.setFontStyle(true, false);
            formato.addConditionalFormatting(
                    new CellRangeAddress[]{new CellRangeAddress(
                            primeraFilaDatos, ultimaFilaDatos, indiceEstado, indiceEstado)},
                    regla);
        }
    }

    /* =====================================================================
       Utilidades de escritura, estilos y moneda
       ===================================================================== */

    private void escribirValor(Cell celda, Object valor, String tipo, Estilos estilos, boolean zebra) {
        Double numero = ("NUM".equals(tipo) || "MONEY".equals(tipo)) ? aNumero(valor) : null;
        if (numero != null) {
            celda.setCellValue(numero);
            if ("MONEY".equals(tipo)) {
                celda.setCellStyle(zebra ? estilos.monedaZebra : estilos.moneda);
            } else {
                celda.setCellStyle(zebra ? estilos.numeroZebra : estilos.numero);
            }
            return;
        }
        celda.setCellValue(textoSeguro(valor));
        celda.setCellStyle(zebra ? estilos.textoZebra : estilos.texto);
    }

    private void escribirTotal(Row fila, int columna, Object valor, boolean money, Estilos estilos) {
        Double numero = aNumero(valor);
        Cell celda = fila.createCell(columna);
        if (numero != null) {
            celda.setCellValue(numero);
            celda.setCellStyle(money ? estilos.totalMoneda : estilos.totalNumero);
        } else {
            celda.setCellValue(textoSeguro(valor));
            celda.setCellStyle(estilos.totalTexto);
        }
    }

    private Double aNumero(Object valor) {
        if (valor instanceof Number numero) {
            return numero.doubleValue();
        }
        if (valor == null) return null;
        String limpio = normalizarMoneda(String.valueOf(valor))
                .replace("S/", "")
                .replace(",", "")
                .trim();
        if (limpio.isBlank()) return null;
        try {
            return Double.parseDouble(limpio);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private List<?> lista(Object valor) {
        return valor instanceof List<?> lista ? lista : List.of();
    }

    private String texto(Object valor) {
        return valor == null ? "" : valor.toString();
    }

    private String textoSeguro(Object valor) {
        String texto = normalizarMoneda(texto(valor));
        return texto.startsWith("=") || texto.startsWith("+") || texto.startsWith("-") || texto.startsWith("@")
                ? "'" + texto
                : texto;
    }

    private String normalizarMoneda(String texto) {
        if (texto == null || texto.isBlank()) return "";
        Matcher matcher = MONEDA_PEN.matcher(texto);
        StringBuffer resultado = new StringBuffer();
        while (matcher.find()) {
            String numero = matcher.group(1).replace(",", "");
            try {
                double valor = Double.parseDouble(numero);
                matcher.appendReplacement(resultado, Matcher.quoteReplacement(formatearSoles(valor)));
            } catch (NumberFormatException exception) {
                matcher.appendReplacement(resultado, Matcher.quoteReplacement("S/ " + matcher.group(1)));
            }
        }
        matcher.appendTail(resultado);
        return PEN.matcher(resultado.toString()).replaceAll("Soles");
    }

    private String formatearSoles(double valor) {
        DecimalFormat formato = new DecimalFormat("#,##0.00", new DecimalFormatSymbols(Locale.US));
        return "S/ " + formato.format(valor);
    }

    private String fechaHora() {
        return LocalDateTime.now().format(FECHA);
    }

    private byte[] acento(String tipo) {
        return switch (tipo) {
            case "CLIENTES" -> new byte[]{(byte) 79, (byte) 70, (byte) 229};
            case "VEHICULOS" -> new byte[]{(byte) 2, (byte) 132, (byte) 199};
            case "REPARACIONES" -> new byte[]{(byte) 37, (byte) 99, (byte) 235};
            case "INVENTARIO" -> new byte[]{(byte) 217, (byte) 119, (byte) 6};
            case "CITAS" -> new byte[]{(byte) 5, (byte) 150, (byte) 105};
            default -> new byte[]{(byte) 16, (byte) 185, (byte) 129};
        };
    }

    private int indiceEstado(List<?> columnas) {
        for (int i = 0; i < columnas.size(); i++) {
            String cabecera = texto(columnas.get(i)).toLowerCase(Locale.ROOT);
            if (cabecera.contains("estado") || cabecera.contains("situación") || cabecera.contains("situacion")
                    || cabecera.contains("prioridad") || cabecera.contains("disponibilidad")) {
                return i;
            }
        }
        return -1;
    }

    private Map<String, Integer> distribucion(List<?> filas, int columna) {
        if (columna < 0) return Map.of();
        Map<String, Integer> conteo = new LinkedHashMap<>();
        for (Object filaObjeto : filas) {
            List<?> fila = lista(filaObjeto);
            if (columna >= fila.size()) continue;
            String valor = normalizarMoneda(texto(fila.get(columna))).trim();
            if (valor.isBlank()) continue;
            conteo.merge(valor, 1, Integer::sum);
        }
        return conteo.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed()
                        .thenComparing(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER)))
                .collect(LinkedHashMap::new, (mapa, entrada) -> mapa.put(entrada.getKey(), entrada.getValue()), LinkedHashMap::putAll);
    }

    private short fondoEstado(String estado) {
        String valor = estado.toLowerCase(Locale.ROOT);
        if (valor.contains("agotado") || valor.contains("cancelad") || valor.contains("anulad")
                || valor.contains("rechazad") || valor.contains("vencid") || valor.contains("alta")) {
            return IndexedColors.ROSE.getIndex();
        }
        if (valor.contains("bajo") || valor.contains("pendient") || valor.contains("espera")
                || valor.contains("proceso") || valor.contains("diagnostico") || valor.contains("diagnóstico")
                || valor.contains("media")) {
            return IndexedColors.LEMON_CHIFFON.getIndex();
        }
        return IndexedColors.LIGHT_GREEN.getIndex();
    }

    private short colorEstado(String estado) {
        String valor = estado.toLowerCase(Locale.ROOT);
        if (valor.contains("agotado") || valor.contains("cancelad") || valor.contains("anulad")
                || valor.contains("rechazad") || valor.contains("vencid") || valor.contains("alta")) {
            return IndexedColors.DARK_RED.getIndex();
        }
        if (valor.contains("bajo") || valor.contains("pendient") || valor.contains("espera")
                || valor.contains("proceso") || valor.contains("diagnostico") || valor.contains("diagnóstico")
                || valor.contains("media")) {
            return IndexedColors.DARK_YELLOW.getIndex();
        }
        return IndexedColors.DARK_GREEN.getIndex();
    }

    private void merge(XSSFSheet hoja, int filaInicio, int filaFin, int colInicio, int colFin) {
        if (filaInicio == filaFin && colInicio == colFin) return;
        hoja.addMergedRegion(new CellRangeAddress(filaInicio, filaFin, colInicio, colFin));
    }

    private Cell celda(Row fila, int columna, String valor, CellStyle estilo) {
        Cell celda = fila.getCell(columna);
        if (celda == null) celda = fila.createCell(columna);
        celda.setCellValue(valor == null ? "" : valor);
        celda.setCellStyle(estilo);
        return celda;
    }

    private void pintarRango(XSSFSheet hoja, Row fila, int colInicio, int colFin, CellStyle estilo) {
        for (int columna = colInicio; columna <= colFin; columna++) {
            Cell celda = fila.getCell(columna);
            if (celda == null) celda = fila.createCell(columna);
            celda.setCellStyle(estilo);
        }
    }

    private void enlace(XSSFSheet hoja, Row fila, int columna, String texto, String destino, CellStyle estilo) {
        Cell celda = celda(fila, columna, texto, estilo);
        var enlace = hoja.getWorkbook().getCreationHelper().createHyperlink(HyperlinkType.DOCUMENT);
        enlace.setAddress(destino);
        celda.setHyperlink(enlace);
    }

    private static XSSFColor color(byte[] rgb) {
        return new XSSFColor(rgb, null);
    }

    /** Estilos reutilizables del libro corporativo. */
    private static final class Estilos {
        private final CellStyle marca;
        private final CellStyle acento;
        private final CellStyle titulo;
        private final CellStyle meta;
        private final CellStyle enlace;
        private final CellStyle seccion;
        private final CellStyle cabecera;
        private final CellStyle texto;
        private final CellStyle textoZebra;
        private final CellStyle numero;
        private final CellStyle numeroZebra;
        private final CellStyle moneda;
        private final CellStyle monedaZebra;
        private final CellStyle centrado;
        private final CellStyle totalEtiqueta;
        private final CellStyle totalTexto;
        private final CellStyle totalNumero;
        private final CellStyle totalMoneda;
        private final CellStyle nota;
        private final CellStyle kpiEtiqueta;
        private final CellStyle kpiValor;
        private final CellStyle kpiPie;
        private final CellStyle estadoVerde;
        private final CellStyle estadoAmbar;
        private final CellStyle estadoRojo;

        private Estilos(XSSFWorkbook libro, byte[] acentoRgb) {
            DataFormat formato = libro.createDataFormat();

            XSSFFont blanco = fuente(libro, true, 11, IndexedColors.WHITE);
            XSSFFont blancoGrande = fuente(libro, true, 16, IndexedColors.WHITE);
            XSSFFont oscuro = fuente(libro, true, 18, IndexedColors.DARK_BLUE);
            XSSFFont gris = fuente(libro, false, 10, IndexedColors.GREY_50_PERCENT);
            XSSFFont negrita = fuente(libro, true, 10, IndexedColors.DARK_BLUE);
            XSSFFont normal = fuente(libro, false, 10, IndexedColors.BLACK);
            XSSFFont pequena = fuente(libro, false, 9, IndexedColors.GREY_50_PERCENT);
            XSSFFont kpiValorFuente = fuente(libro, true, 16, IndexedColors.DARK_BLUE);

            marca = libro.createCellStyle();
            marca.setFont(blancoGrande);
            relleno(marca, NAVY);
            marca.setAlignment(HorizontalAlignment.LEFT);
            marca.setVerticalAlignment(VerticalAlignment.CENTER);

            acento = libro.createCellStyle();
            relleno(acento, acentoRgb);

            titulo = libro.createCellStyle();
            titulo.setFont(oscuro);
            titulo.setVerticalAlignment(VerticalAlignment.CENTER);

            meta = libro.createCellStyle();
            meta.setFont(gris);
            meta.setVerticalAlignment(VerticalAlignment.CENTER);

            enlace = libro.createCellStyle();
            enlace.setFont(fuente(libro, true, 9, IndexedColors.BLUE));
            enlace.setAlignment(HorizontalAlignment.RIGHT);
            enlace.setVerticalAlignment(VerticalAlignment.CENTER);

            seccion = libro.createCellStyle();
            seccion.setFont(negrita);
            seccion.setFillForegroundColor(color(SLATE_50));
            seccion.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            seccion.setVerticalAlignment(VerticalAlignment.CENTER);

            cabecera = libro.createCellStyle();
            cabecera.setFont(blanco);
            relleno(cabecera, acentoRgb);
            cabecera.setAlignment(HorizontalAlignment.CENTER);
            cabecera.setVerticalAlignment(VerticalAlignment.CENTER);
            cabecera.setWrapText(true);
            bordes(cabecera);

            texto = estiloTexto(libro, normal, false, formato, false);
            textoZebra = estiloTexto(libro, normal, false, formato, true);
            numero = estiloTexto(libro, normal, false, formato, false);
            numero.setDataFormat(formato.getFormat("#,##0"));
            numero.setAlignment(HorizontalAlignment.RIGHT);
            numeroZebra = estiloTexto(libro, normal, false, formato, true);
            numeroZebra.setDataFormat(formato.getFormat("#,##0"));
            numeroZebra.setAlignment(HorizontalAlignment.RIGHT);
            moneda = estiloTexto(libro, normal, false, formato, false);
            moneda.setDataFormat(formato.getFormat("\"S/ \"#,##0.00"));
            moneda.setAlignment(HorizontalAlignment.RIGHT);
            monedaZebra = estiloTexto(libro, normal, false, formato, true);
            monedaZebra.setDataFormat(formato.getFormat("\"S/ \"#,##0.00"));
            monedaZebra.setAlignment(HorizontalAlignment.RIGHT);

            centrado = libro.createCellStyle();
            centrado.setFont(normal);
            centrado.setAlignment(HorizontalAlignment.CENTER);
            centrado.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(centrado);

            totalEtiqueta = libro.createCellStyle();
            totalEtiqueta.setFont(negrita);
            totalEtiqueta.setFillForegroundColor(color(SLATE_50));
            totalEtiqueta.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            totalEtiqueta.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(totalEtiqueta);

            totalTexto = libro.createCellStyle();
            totalTexto.setFont(negrita);
            totalTexto.setVerticalAlignment(VerticalAlignment.CENTER);
            totalTexto.setAlignment(HorizontalAlignment.RIGHT);
            bordes(totalTexto);

            totalNumero = libro.createCellStyle();
            totalNumero.setFont(negrita);
            totalNumero.setDataFormat(formato.getFormat("#,##0"));
            totalNumero.setAlignment(HorizontalAlignment.RIGHT);
            totalNumero.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(totalNumero);

            totalMoneda = libro.createCellStyle();
            totalMoneda.setFont(negrita);
            totalMoneda.setDataFormat(formato.getFormat("\"S/ \"#,##0.00"));
            totalMoneda.setAlignment(HorizontalAlignment.RIGHT);
            totalMoneda.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(totalMoneda);

            nota = libro.createCellStyle();
            nota.setFont(pequena);
            nota.setVerticalAlignment(VerticalAlignment.CENTER);
            nota.setWrapText(true);

            kpiEtiqueta = libro.createCellStyle();
            kpiEtiqueta.setFont(negrita);
            kpiEtiqueta.setFillForegroundColor(color(SLATE_50));
            kpiEtiqueta.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            kpiEtiqueta.setAlignment(HorizontalAlignment.CENTER);
            kpiEtiqueta.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(kpiEtiqueta);

            kpiValor = libro.createCellStyle();
            kpiValor.setFont(kpiValorFuente);
            kpiValor.setAlignment(HorizontalAlignment.CENTER);
            kpiValor.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(kpiValor);

            kpiPie = libro.createCellStyle();
            kpiPie.setFillForegroundColor(color(SLATE_200));
            kpiPie.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            estadoVerde = estiloEstado(libro, IndexedColors.LIGHT_GREEN, IndexedColors.DARK_GREEN);
            estadoAmbar = estiloEstado(libro, IndexedColors.LEMON_CHIFFON, IndexedColors.DARK_YELLOW);
            estadoRojo = estiloEstado(libro, IndexedColors.ROSE, IndexedColors.DARK_RED);
        }

        private CellStyle estado(String valor) {
            String texto = valor == null ? "" : valor.toLowerCase(Locale.ROOT);
            if (texto.contains("agotado") || texto.contains("cancelad") || texto.contains("anulad")
                    || texto.contains("rechazad") || texto.contains("vencid") || texto.contains("alta")) {
                return estadoRojo;
            }
            if (texto.contains("bajo") || texto.contains("pendient") || texto.contains("espera")
                    || texto.contains("proceso") || texto.contains("diagnostico") || texto.contains("diagnóstico")
                    || texto.contains("media")) {
                return estadoAmbar;
            }
            return estadoVerde;
        }

        private static XSSFFont fuente(XSSFWorkbook libro, boolean negrita, int tamano, IndexedColors color) {
            XSSFFont fuente = libro.createFont();
            fuente.setFontName("Calibri");
            fuente.setBold(negrita);
            fuente.setFontHeightInPoints((short) tamano);
            fuente.setColor(color.getIndex());
            return fuente;
        }

        private static void relleno(CellStyle estilo, byte[] rgb) {
            estilo.setFillForegroundColor(color(rgb));
            estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }

        private static void bordes(CellStyle estilo) {
            estilo.setBorderTop(BorderStyle.THIN);
            estilo.setBorderBottom(BorderStyle.THIN);
            estilo.setBorderLeft(BorderStyle.THIN);
            estilo.setBorderRight(BorderStyle.THIN);
            estilo.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            estilo.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            estilo.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
            estilo.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        }

        private static CellStyle estiloTexto(
                XSSFWorkbook libro,
                XSSFFont fuente,
                boolean negrita,
                DataFormat formato,
                boolean zebra
        ) {
            CellStyle estilo = libro.createCellStyle();
            estilo.setFont(fuente);
            estilo.setVerticalAlignment(VerticalAlignment.CENTER);
            estilo.setWrapText(false);
            bordes(estilo);
            if (zebra) {
                estilo.setFillForegroundColor(color(SLATE_50));
                estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            return estilo;
        }

        private static CellStyle estiloEstado(XSSFWorkbook libro, IndexedColors fondo, IndexedColors texto) {
            CellStyle estilo = libro.createCellStyle();
            XSSFFont fuente = fuente(libro, true, 10, texto);
            estilo.setFont(fuente);
            estilo.setFillForegroundColor(fondo.getIndex());
            estilo.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            estilo.setAlignment(HorizontalAlignment.CENTER);
            estilo.setVerticalAlignment(VerticalAlignment.CENTER);
            bordes(estilo);
            return estilo;
        }
    }
}
