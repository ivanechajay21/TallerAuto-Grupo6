package com.sigtm.backend.controller;

import com.sigtm.backend.service.RolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints del catálogo de permisos del sistema.
 *
 * <p>Expone {@code /api/permisos} en modo solo lectura; la única operación exige
 * {@code ROLES:VER} porque se consume en la matriz de Roles y Permisos.</p>
 */
@RestController
@RequestMapping("/api/permisos")
@RequiredArgsConstructor
public class PermisoController {

    private final RolService rolService;

    // Catálogo de permisos completo: se consume en la matriz de Roles y Permisos.
    /**
     * Lista todos los permisos del catálogo.
     *
     * <p>Exige {@code ROLES:VER}. Alimenta la matriz de Roles y Permisos con los
     * códigos agrupados por módulo.</p>
     *
     * @return la lista de permisos disponibles (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLES:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerPermisos() {
        return ResponseEntity.ok(rolService.obtenerPermisos());
    }
}
