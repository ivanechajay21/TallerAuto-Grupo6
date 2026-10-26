package com.sigtm.backend.controller;

import com.sigtm.backend.service.AuditoriaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de consulta de la auditoría del sistema.
 *
 * <p>Expone {@code /api/auditoria} en modo solo lectura; todas las operaciones
 * exigen el permiso {@code AUDITORIA:VER} y la escritura se registra de forma
 * automática desde los servicios, nunca desde este controlador.</p>
 */
@RestController
@RequestMapping("/api/auditoria")
@RequiredArgsConstructor
public class AuditoriaController {

    private final AuditoriaService auditoriaService;

    /**
     * Lista los registros de auditoría con filtros opcionales.
     *
     * <p>Exige {@code AUDITORIA:VER}. Los filtros son opcionales y se combinan:
     * {@code action} acota por tipo de acción (por ejemplo {@code CREATE} o
     * {@code DELETE}) y {@code search} filtra por texto en la descripción.
     * Sin filtros devuelve el histórico completo.</p>
     *
     * @param action  tipo de acción a filtrar; opcional
     * @param search  texto libre para la descripción; opcional
     * @return la lista de registros de auditoría en orden de la más reciente a la más antigua (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('AUDITORIA:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerRegistros(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(auditoriaService.obtenerRegistros(action, search));
    }

    /**
     * Lista las acciones de auditoría disponibles para filtrar.
     *
     * <p>Exige {@code AUDITORIA:VER}. Alimenta el desplegable de filtros de la
     * pantalla de auditoría con los valores realmente registrados.</p>
     *
     * @return la lista de acciones distintas registradas (200)
     */
    @GetMapping("/acciones")
    @PreAuthorize("hasAuthority('AUDITORIA:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerAcciones() {
        return ResponseEntity.ok(auditoriaService.obtenerAcciones());
    }
}
