package com.sigtm.backend.controller;

import com.sigtm.backend.service.RolService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Endpoints de gestión de roles y de la asignación de permisos.
 *
 * <p>La consulta de roles y de la matriz de permisos exige
 * {@code ROLES:VER}. Las operaciones de escritura sobre roles y permisos quedan
 * reservadas al rol {@code ADMIN}: no existe un permiso del catálogo que distinga
 * a {@code ADMIN} de {@code MANAGER}, por lo que se mantiene la restricción de
 * plataforma por rol.</p>
 */
@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RolController {

    private final RolService rolService;

    // La consulta de roles y permisos (matriz) usa el permiso ROLES:VER.
    // Las operaciones de escritura sobre roles/permisos quedan reservadas al rol
    // ADMIN: no existe un permiso del catálogo que distinga a ADMIN de MANAGER
    // (ambos reciben el catálogo completo), por lo que se mantiene la restricción
    // de plataforma por rol para no ampliar poderes del gerente sin quererlo.
    /**
     * Lista todos los roles con sus permisos.
     *
     * <p>Exige {@code ROLES:VER}. Alimenta la matriz de Roles y Permisos.</p>
     *
     * @return la lista de roles con los permisos asignados (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ROLES:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodos() {
        return ResponseEntity.ok(rolService.obtenerTodos());
    }

    /**
     * Crea un rol nuevo.
     *
     * <p>Exige el rol {@code ADMIN}. El nombre es obligatorio y único: si ya existe
     * se rechaza con 409.</p>
     *
     * @param cuerpo mapa con el nombre ({@code name}) y la descripción ({@code description}) del rol
     * @return el rol creado (200)
     * @throws IllegalArgumentException  si el nombre del rol está vacío
     * @throws com.sigtm.backend.exception.DuplicateResourceException si ya existe un rol con ese nombre
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> crearRol(@RequestBody Map<String, String> cuerpo) {
        return ResponseEntity.ok(rolService.crearRol(cuerpo.get("name"), cuerpo.get("description")));
    }

    /**
     * Actualiza el nombre y la descripción de un rol.
     *
     * <p>Exige el rol {@code ADMIN}. El nombre es obligatorio y único: si ya existe
     * se rechaza con 409. Un identificador inexistente produce 404.</p>
     *
     * @param id     identificador del rol a modificar
     * @param cuerpo mapa con el nombre ({@code name}) y la descripción ({@code description}) del rol
     * @return el rol ya actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si el rol no existe
     * @throws IllegalArgumentException   si el nombre del rol está vacío
     * @throws com.sigtm.backend.exception.DuplicateResourceException si ya existe otro rol con ese nombre
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> actualizarRol(
            @PathVariable Long id,
            @RequestBody Map<String, String> cuerpo) {
        return ResponseEntity.ok(rolService.actualizarRol(id, cuerpo.get("name"), cuerpo.get("description")));
    }

    /**
     * Elimina un rol del sistema.
     *
     * <p>Exige el rol {@code ADMIN}. No se pueden eliminar los roles propios del
     * sistema ni un rol que tenga usuarios asignados; un identificador inexistente
     * produce 404.</p>
     *
     * @param id identificador del rol a eliminar
     * @return respuesta sin cuerpo (204)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el rol no existe
     * @throws IllegalArgumentException  si es un rol del sistema o tiene usuarios asignados
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> eliminarRol(@PathVariable Long id) {
        rolService.eliminarRol(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Reasigna el conjunto completo de permisos de un rol.
     *
     * <p>Exige el rol {@code ADMIN}. Los códigos recibidos reemplazan por completo a
     * los permisos actuales del rol; un identificador inexistente produce 404.</p>
     *
     * @param id      identificador del rol
     * @param codigos códigos de permiso que quedarán asignados
     * @return el rol con su lista de permisos actualizada (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el rol no existe
     */
    @PutMapping("/{id}/permisos")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> asignarPermisos(
            @PathVariable Long id,
            @RequestBody Set<String> codigos) {
        return ResponseEntity.ok(rolService.asignarPermisos(id, codigos));
    }
}
