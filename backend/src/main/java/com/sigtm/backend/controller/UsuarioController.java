package com.sigtm.backend.controller;

import com.sigtm.backend.dto.CrearUsuarioRequest;
import com.sigtm.backend.dto.ActualizarUsuarioRequest;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.service.UsuarioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de la gestión de usuarios del sistema.
 *
 * <p>Cada operación exige el permiso de su acción en el módulo {@code USUARIOS}
 * ({@code USUARIOS:VER}, {@code USUARIOS:CREAR}, {@code USUARIOS:EDITAR} y
 * {@code USUARIOS:CAMBIAR_ESTADO}); el listado de mecánicos también se permite a
 * quien tenga {@code ORDENES:VER} porque se usa al asignar trabajo. La consulta de
 * los permisos propios ({@code /actual/permisos}) no exige permiso de módulo:
 * basta una sesión válida.</p>
 */
@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    private Long idUsuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl usuario) {
            return usuario.getId();
        }
        return null;
    }

    // Acceso por permiso del módulo USUARIOS. El listado de mecánicos es dato de
    // apoyo para las Órdenes (la recepcionista asigna mecánicos desde ORDENES:VER).
    /**
     * Lista todos los usuarios del sistema.
     *
     * <p>Exige {@code USUARIOS:VER}. Cada usuario se devuelve como mapa con sus
     * datos de perfil y su rol.</p>
     *
     * @return la lista de usuarios (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('USUARIOS:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodos() {
        return ResponseEntity.ok(usuarioService.obtenerTodos());
    }

    /**
     * Lista los usuarios con rol de mecánico.
     *
     * <p>Exige {@code USUARIOS:VER} o {@code ORDENES:VER}. Es un dato de apoyo para
     * asignar mecánicos a los ítems de una orden de trabajo.</p>
     *
     * @return la lista de mecánicos (200)
     */
    @GetMapping("/mecanicos")
    @PreAuthorize("hasAnyAuthority('USUARIOS:VER', 'ORDENES:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerMecanicos() {
        return ResponseEntity.ok(usuarioService.obtenerMecanicos());
    }

    /**
     * Crea un usuario nuevo.
     *
     * <p>Exige {@code USUARIOS:CREAR}. El nombre de usuario y el correo son únicos:
     * si ya están en uso la operación se rechaza con 409; el rol indicado debe
     * existir. El alta queda registrada en la auditoría con el usuario que la
     * ejecuta.</p>
     *
     * @param solicitud datos del usuario a crear (usuario, correo, contraseña, nombre, rol, etc.)
     * @return el usuario creado (200)
     * @throws com.sigtm.backend.exception.DuplicateResourceException si el nombre de usuario o el correo ya existen
     */
    @PostMapping
    @PreAuthorize("hasAuthority('USUARIOS:CREAR')")
    public ResponseEntity<Map<String, Object>> crearUsuario(@RequestBody CrearUsuarioRequest solicitud) {
        return ResponseEntity.ok(usuarioService.crearUsuario(solicitud, idUsuarioActual()));
    }

    // Endpoint de uso interno de la sesión: permisos del usuario autenticado.
    /**
     * Devuelve los permisos del usuario autenticado.
     *
     * <p>No exige permiso de módulo: basta con una sesión válida. El frontend lo usa
     * para construir el menú y habilitar las acciones según los permisos vigentes.</p>
     *
     * @return la lista de códigos de permiso del usuario en sesión (200)
     */
    @GetMapping("/actual/permisos")
    public ResponseEntity<java.util.List<String>> obtenerMisPermisos() {
        return ResponseEntity.ok(usuarioService.obtenerMisPermisos(idUsuarioActual()));
    }

    /**
     * Devuelve el perfil de un usuario.
     *
     * <p>Exige {@code USUARIOS:VER}. Un identificador inexistente produce 404.</p>
     *
     * @param id identificador del usuario
     * @return el mapa con el perfil del usuario (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el usuario no existe
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS:VER')")
    public ResponseEntity<Map<String, Object>> obtenerUsuario(@PathVariable Long id) {
        return ResponseEntity.ok(usuarioService.obtenerPerfil(id));
    }

    /**
     * Actualiza los datos de un usuario.
     *
     * <p>Exige {@code USUARIOS:EDITAR}. Valida que el nombre de usuario y el correo
     * no colisionen con otro registro; un identificador inexistente produce 404. El
     * cambio queda auditado.</p>
     *
     * @param id        identificador del usuario a modificar
     * @param solicitud nuevos valores del usuario
     * @return el usuario ya actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si el usuario no existe
     * @throws com.sigtm.backend.exception.DuplicateResourceException si el nombre de usuario o el correo ya existen
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('USUARIOS:EDITAR')")
    public ResponseEntity<Map<String, Object>> actualizarUsuario(
            @PathVariable Long id,
            @RequestBody ActualizarUsuarioRequest solicitud) {
        return ResponseEntity.ok(usuarioService.actualizarUsuario(id, solicitud, idUsuarioActual()));
    }

    /**
     * Activa o desactiva un usuario.
     *
     * <p>Exige {@code USUARIOS:CAMBIAR_ESTADO}. El estado se envía en el parámetro
     * {@code active}; un identificador inexistente produce 404. El cambio queda
     * auditado.</p>
     *
     * @param id     identificador del usuario
     * @param active nuevo estado de la cuenta ({@code true} activo, {@code false} inactivo)
     * @return el usuario con su estado actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el usuario no existe
     */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('USUARIOS:CAMBIAR_ESTADO')")
    public ResponseEntity<Map<String, Object>> setActive(
            @PathVariable Long id,
            @RequestParam boolean active) {
        return ResponseEntity.ok(usuarioService.setActive(id, active, idUsuarioActual()));
    }
}
