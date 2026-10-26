package com.sigtm.backend.controller;

import com.sigtm.backend.service.ReporteService;
import com.sigtm.backend.service.ReporteExcelService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de reportes y del panel de control.
 *
 * <p>Agrupa las consultas del panel de indicadores, que exigen
 * {@code DASHBOARD:VER}, y el centro de reportes, que exige
 * {@code REPORTES:VER}. Los datos se devuelven ya agregados por el servicio,
 * listos para las tarjetas y gráficos del frontend.</p>
 */
@RestController
@RequestMapping("/api/reportes")
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;
    private final ReporteExcelService reporteExcelService;

    @Value("${app.export.apache-poi-enabled:false}")
    private boolean apachePoiEnabled;

    // Acceso por permiso de los módulos DASHBOARD / REPORTES. Todo rol con acceso
    // al panel (DASHBOARD:VER) o a los reportes (REPORTES:VER) obtiene los datos
    // según lo configurado desde Roles y Permisos.
    /**
     * Devuelve las métricas principales del panel.
     *
     * <p>Exige {@code DASHBOARD:VER}.</p>
     *
     * @return el mapa con los indicadores del panel (200)
     */
    @GetMapping("/panel-indicadores")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<Map<String, Object>> obtenerMetricasDashboard() {
        return ResponseEntity.ok(reporteService.obtenerMetricasDashboard());
    }

    /**
     * Devuelve los ingresos agrupados por mes.
     *
     * <p>Exige {@code DASHBOARD:VER}.</p>
     *
     * @return la lista de importes mensuales (200)
     */
    @GetMapping("/ingresos-mensuales")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerIngresosMensuales() {
        return ResponseEntity.ok(reporteService.obtenerIngresosMensuales());
    }

    /**
     * Devuelve el resumen del panel para un periodo.
     *
     * <p>Exige {@code DASHBOARD:VER}. El periodo es opcional: si no se indica se
     * usa el rango por defecto del servicio.</p>
     *
     * @param periodo periodo a resumir; opcional
     * @return el mapa con el resumen del panel (200)
     */
    @GetMapping("/panel-resumen")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<Map<String, Object>> obtenerResumenDashboard(@RequestParam(required = false) String periodo) {
        return ResponseEntity.ok(reporteService.obtenerResumenDashboard(periodo));
    }

    /**
     * Devuelve la serie del gráfico de líneas del panel.
     *
     * <p>Exige {@code DASHBOARD:VER}. El periodo es opcional.</p>
     *
     * @param periodo periodo a graficar; opcional
     * @return la lista de puntos de la serie (200)
     */
    @GetMapping("/panel-linea")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerLineaDashboard(@RequestParam(required = false) String periodo) {
        return ResponseEntity.ok(reporteService.obtenerLineaDashboard(periodo));
    }

    /**
     * Devuelve la serie del gráfico de barras del panel.
     *
     * <p>Exige {@code DASHBOARD:VER}. El periodo es opcional.</p>
     *
     * @param periodo periodo a graficar; opcional
     * @return el mapa con las barras del panel (200)
     */
    @GetMapping("/panel-barras")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<Map<String, Object>> obtenerBarrasDashboard(@RequestParam(required = false) String periodo) {
        return ResponseEntity.ok(reporteService.obtenerBarrasDashboard(periodo));
    }

    /**
     * Devuelve la serie del gráfico de dona del panel.
     *
     * <p>Exige {@code DASHBOARD:VER}.</p>
     *
     * @return la lista de porciones del gráfico de dona (200)
     */
    @GetMapping("/panel-dona")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerDonutDashboard() {
        return ResponseEntity.ok(reporteService.obtenerDonutDashboard());
    }

    /**
     * Lista los servicios más solicitados.
     *
     * <p>Exige {@code DASHBOARD:VER}.</p>
     *
     * @return la lista de servicios destacados (200)
     */
    @GetMapping("/servicios-mas-solicitados")
    @PreAuthorize("hasAuthority('DASHBOARD:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerServiciosDestacados() {
        return ResponseEntity.ok(reporteService.obtenerServiciosDestacados());
    }

    /**
     * Devuelve un reporte del centro de reportes según su tipo.
     *
     * <p>Exige {@code REPORTES:VER}. El tipo es obligatorio y selecciona el reporte
     * a generar; un tipo no soportado produce 400.</p>
     *
     * @param tipo tipo de reporte a generar
     * @return el mapa con los datos del reporte solicitado (200)
     */
    @GetMapping("/centro")
    @PreAuthorize("hasAuthority('REPORTES:VER')")
    public ResponseEntity<Map<String, Object>> obtenerCentroReportes(@RequestParam String tipo) {
        return ResponseEntity.ok(reporteService.obtenerCentroReportes(tipo));
    }

    /**
     * Genera el Excel del centro de reportes en el servidor usando Apache POI.
     *
     * <p>El endpoint se habilita únicamente con {@code USE_APACHE_POI=true}. Los
     * datos se consultan en el servidor y requieren {@code REPORTES:EXPORTAR}; no
     * se aceptan filas suministradas por el cliente.</p>
     *
     * @param tipo tipo de reporte a exportar
     * @return archivo XLSX (200), o 404 si la exportación con Apache POI está deshabilitada
     */
    @GetMapping(value = "/centro/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAuthority('REPORTES:EXPORTAR')")
    public ResponseEntity<byte[]> exportarCentroExcel(@RequestParam String tipo) {
        if (!apachePoiEnabled) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> reporte = reporteService.obtenerCentroReportes(tipo);
        byte[] archivo = reporteExcelService.generar(reporte);
        String tipoReporte = String.valueOf(reporte.get("tipo")).toLowerCase().replaceAll("[^a-z0-9]+", "-");
        String nombre = "reporte-" + tipoReporte + ".xlsx";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + nombre + "\"")
                .body(archivo);
    }
}
