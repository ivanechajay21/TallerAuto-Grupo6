package com.sigtm.backend.service;

import com.sigtm.backend.model.Notificacion;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.NotificacionRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Crea y consulta las notificaciones internas dirigidas a los usuarios del sistema.
 *
 * <p>Las notificaciones pueden enviarse a un usuario concreto o a todos los titulares de
 * uno o varios roles, y cada usuario solo puede marcar como leídas las suyas.</p>
 */
@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final ConfiguracionService configuracionService;

    /**
     * Crea una notificación interna para un usuario concreto.
     *
     * <p>Si el usuario no existe se devuelve {@code null} sin registrar nada, para que
     * los flujos de negocio puedan notificar sin fallar. La notificación nace siempre
     * marcada como no leída.</p>
     *
     * @param userId  identificador del usuario destinatario
     * @param module  módulo de origen, por ejemplo {@code ORDENES} o {@code INVENTARIO}
     * @param title   título corto de la notificación
     * @param message cuerpo del mensaje
     * @param link    ruta interna del frontend; puede ser {@code null}
     * @return la notificación creada, o {@code null} si el usuario no existe
     */
    @Transactional
    public Notificacion crear(Long userId, String module, String title, String message, String link) {
        if (!configuracionService.notificacionActiva(module, title)) {
            return null;
        }
        Usuario usuario = usuarioRepository.findById(userId).orElse(null);
        if (usuario == null) {
            return null;
        }
        Notificacion notificacion = Notificacion.builder()
                .user(usuario)
                .module(module)
                .title(title)
                .message(message)
                .link(link)
                .read(false)
                .build();
        return notificacionRepository.save(notificacion);
    }

    /**
     * Notifica a todos los usuarios que tienen uno de los roles indicados.
     *
     * <p>Se recorren los roles en orden y se delega en {@link #crear}, por lo que los
     * usuarios inexistentes o desactivados por rol simplemente se omiten.</p>
     *
     * @param nombresRoles nombres de los roles destinatarios, por ejemplo {@code ROLE_ADMIN}
     * @param module      módulo de origen de la notificación
     * @param title       título corto de la notificación
     * @param message     cuerpo del mensaje
     * @param link        ruta interna del frontend; puede ser {@code null}
     */
    @Transactional
    public void notificarRol(List<String> nombresRoles, String module, String title, String message, String link) {
        for (String nombreRol : nombresRoles) {
            List<Usuario> usuarios = usuarioRepository.findByRole_Name(nombreRol);
            for (Usuario usuario : usuarios) {
                crear(usuario.getId(), module, title, message, link);
            }
        }
    }

    /**
     * Lista las notificaciones de un usuario, de la más reciente a la más antigua.
     *
     * @param userId identificador del usuario
     * @return las notificaciones del usuario
     */
    @Transactional(readOnly = true)
    public List<Notificacion> obtenerMias(Long userId) {
        return notificacionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Cuenta las notificaciones no leídas de un usuario.
     *
     * @param userId identificador del usuario
     * @return el número de notificaciones pendientes de leer
     */
    @Transactional(readOnly = true)
    public long obtenerNoLeidas(Long userId) {
        return notificacionRepository.countByUserIdAndReadFalse(userId);
    }

    /**
     * Marca una notificación como leída.
     *
     * <p>Solo el destinatario puede marcarla; si la notificación no existe o pertenece a
     * otro usuario se lanza {@code RuntimeException}.</p>
     *
     * @param id     identificador de la notificación
     * @param userId identificador del usuario que la marca
     * @return la notificación actualizada
     */
    @Transactional
    public Notificacion marcarComoLeida(Long id, Long userId) {
        Notificacion notificacion = notificacionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notificación no encontrada"));
        if (!notificacion.getUser().getId().equals(userId)) {
            throw new RuntimeException("No tienes permiso para esta notificación");
        }
        notificacion.setRead(true);
        return notificacionRepository.save(notificacion);
    }

    /**
     * Marca como leídas todas las notificaciones pendientes de un usuario.
     *
     * @param userId identificador del usuario
     */
    @Transactional
    public void marcarTodasComoLeidas(Long userId) {
        List<Notificacion> noLeidas = notificacionRepository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId);
        noLeidas.forEach(n -> n.setRead(true));
        notificacionRepository.saveAll(noLeidas);
    }
}