package com.sigtm.backend.controller;

import com.sigtm.backend.model.Notificacion;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.service.NotificacionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de las notificaciones del usuario autenticado.
 *
 * <p>No exigen permiso de módulo: cada operación trabaja siempre sobre las
 * notificaciones del usuario en sesión, de modo que basta con un token válido.</p>
 */
@RestController
@RequestMapping("/api/notificaciones")
@RequiredArgsConstructor
public class NotificacionController {

    private final NotificacionService notificacionService;

    private Long idUsuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl usuario) {
            return usuario.getId();
        }
        return null;
    }

    /**
     * Lista las notificaciones del usuario autenticado.
     *
     * <p>Solo requiere sesión válida. Devuelve las notificaciones del usuario en
     * sesión, de la más reciente a la más antigua.</p>
     *
     * @return la lista de notificaciones del usuario (200)
     */
    @GetMapping
    public ResponseEntity<List<Notificacion>> obtenerMias() {
        return ResponseEntity.ok(notificacionService.obtenerMias(idUsuarioActual()));
    }

    /**
     * Cuenta las notificaciones no leídas del usuario autenticado.
     *
     * <p>Solo requiere sesión válida. Alimenta el indicador de la campana.</p>
     *
     * @return un mapa con la clave {@code count} y el número de no leídas (200)
     */
    @GetMapping("/no-leidas")
    public ResponseEntity<Map<String, Object>> obtenerNoLeidas() {
        return ResponseEntity.ok(Map.of("count", notificacionService.obtenerNoLeidas(idUsuarioActual())));
    }

    /**
     * Marca como leída una notificación.
     *
     * <p>Solo requiere sesión válida y la notificación debe pertenecer al usuario en
     * sesión. Un identificador inexistente se traduce en 400 con el mensaje de
     * recurso no encontrado.</p>
     *
     * @param id identificador de la notificación
     * @return la notificación marcada como leída (200)
     */
    @PatchMapping("/{id}/leida")
    public ResponseEntity<Notificacion> marcarComoLeida(@PathVariable Long id) {
        return ResponseEntity.ok(notificacionService.marcarComoLeida(id, idUsuarioActual()));
    }

    /**
     * Marca como leídas todas las notificaciones del usuario autenticado.
     *
     * <p>Solo requiere sesión válida.</p>
     *
     * @return un mapa con el mensaje de confirmación (200)
     */
    @PatchMapping("/leer-todas")
    public ResponseEntity<Map<String, Object>> marcarTodasComoLeidas() {
        notificacionService.marcarTodasComoLeidas(idUsuarioActual());
        return ResponseEntity.ok(Map.of("message", "Todas las notificaciones marcadas como leídas."));
    }
}
