package com.sigtm.backend.service;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Registro en memoria de usuarios con actividad reciente.
 *
 * <p>El frontend envía un latido periódico mientras hay sesión activa. Se considera
 * en línea a quien haya enviado un latido dentro de la ventana de vigencia. Al no
 * persistir datos, un reinicio del backend limpia la presencia y el siguiente
 * latido vuelve a registrar al usuario.</p>
 */
@Service
public class PresenceService {

    private static final Duration VENTANA_ACTIVIDAD = Duration.ofSeconds(75);

    private final ConcurrentHashMap<Long, Instant> ultimaActividad = new ConcurrentHashMap<>();

    /**
     * Registra actividad del usuario autenticado.
     *
     * @param usuarioId identificador del usuario; se ignora si es {@code null}
     */
    public void marcarActivo(Long usuarioId) {
        if (usuarioId == null) return;
        ultimaActividad.put(usuarioId, Instant.now());
    }

    /**
     * Devuelve los identificadores de usuarios con actividad dentro de la ventana.
     *
     * @return conjunto de identificadores en línea
     */
    public Set<Long> usuariosEnLinea() {
        purgarVencidos();
        return Set.copyOf(ultimaActividad.keySet());
    }

    /**
     * Indica si un usuario tiene actividad reciente.
     *
     * @param usuarioId identificador del usuario
     * @return {@code true} si está dentro de la ventana de actividad
     */
    public boolean estaEnLinea(Long usuarioId) {
        if (usuarioId == null) return false;
        Instant visto = ultimaActividad.get(usuarioId);
        if (visto == null) return false;
        if (visto.isBefore(Instant.now().minus(VENTANA_ACTIVIDAD))) {
            ultimaActividad.remove(usuarioId, visto);
            return false;
        }
        return true;
    }

    private void purgarVencidos() {
        Instant limite = Instant.now().minus(VENTANA_ACTIVIDAD);
        ultimaActividad.entrySet().removeIf(entry -> entry.getValue().isBefore(limite));
    }
}
