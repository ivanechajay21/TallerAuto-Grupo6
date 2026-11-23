package com.sigtm.backend.service;

import com.sigtm.backend.model.RegistroAuditoria;
import com.sigtm.backend.repository.RegistroAuditoriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Escribe y consulta la bitácora de auditoría del sistema.
 *
 * <p>El registro es tolerante a fallos: nunca propaga excepciones para no invalidar la
 * operación de negocio que lo invoca, y trunca el detalle a 4000 caracteres.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditoriaService {

    private final RegistroAuditoriaRepository registroAuditoriaRepository;

    /**
     * Registra una acción en la bitácora de auditoría. Nunca lanza excepciones.
     *
     * <p>Delega en la sobrecarga de cinco argumentos tomando como autor al usuario
     * autenticado en el contexto de seguridad, o {@code SISTEMA} cuando la llamada no
     * proviene de una sesión iniciada.</p>
     *
     * @param action   código de la acción realizada (p. ej. {@code CREATE}, {@code UPDATE})
     * @param entity   nombre de la entidad afectada
     * @param entityId identificador de la entidad; puede ser {@code null}
     * @param details  descripción legible del cambio
     */
    public void registrar(String action, String entity, Long entityId, String details) {
        registrar(action, entity, entityId, details, nombreUsuarioActual());
    }

    /**
     * Registra una acción en la bitácora de auditoría indicando explícitamente su autor.
     *
     * <p>Un autor {@code null} o vacío se reemplaza por {@code SISTEMA} y el detalle se
     * trunca a 4000 caracteres. Cualquier fallo se captura y solo genera un aviso en el
     * log, de modo que la auditoría nunca invalida la transacción de negocio.</p>
     *
     * @param action   código de la acción realizada (p. ej. {@code DELETE}, {@code LOGIN})
     * @param entity   nombre de la entidad afectada
     * @param entityId identificador de la entidad; puede ser {@code null}
     * @param details  descripción legible del cambio
     * @param username autor de la acción; si es {@code null} o vacío se usa {@code SISTEMA}
     */
    public void registrar(String action, String entity, Long entityId, String details, String username) {
        try {
            RegistroAuditoria registro = RegistroAuditoria.builder()
                    .action(action)
                    .entity(entity)
                    .entityId(entityId)
                    .username(username != null && !username.isBlank() ? username : "SISTEMA")
                    .details(details != null && details.length() > 4000 ? details.substring(0, 4000) : details)
                    .timestamp(LocalDateTime.now())
                    .build();
            registroAuditoriaRepository.save(registro);
        } catch (Exception e) {
            log.warn("No se pudo registrar auditoría ({} {}): {}", action, entity, e.getMessage());
        }
    }

    /**
     * Busca registros de auditoría aplicando filtros opcionales.
     *
     * <p>Si no se indica ninguna acción ni texto de búsqueda se devuelven todos los
     * registros ordenados de forma descendente por fecha; en caso contrario la consulta
     * se delega al repositorio con los filtros recortados.</p>
     *
     * @param action acción por la que filtrar; puede ser {@code null} o vacío
     * @param search texto libre a buscar; puede ser {@code null} o vacío
     * @return los registros coincidentes en formato {@code Map}, del más reciente al más antiguo
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerRegistros(String action, String search) {
        List<RegistroAuditoria> registros;
        if ((action == null || action.isBlank()) && (search == null || search.isBlank())) {
            registros = registroAuditoriaRepository.findAllByOrderByTimestampDesc();
        } else {
            String accion = (action == null || action.isBlank()) ? null : action.trim();
            String busqueda = (search == null || search.isBlank()) ? null : search.trim();
            registros = registroAuditoriaRepository.search(accion, busqueda);
        }
        return registros.stream().map(this::aMapa).toList();
    }

    /**
     * Lista las acciones de auditoría distintas registradas en el sistema.
     *
     * <p>Cada acción se devuelve con su código y  para
     * su uso en los filtros de la interfaz.</p>
     *
     * @return las acciones ordenadas alfabéticamente como pares {@code action}/{@code label}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerAcciones() {
        return registroAuditoriaRepository.findAll().stream()
                .map(RegistroAuditoria::getAction)
                .filter(a -> a != null && !a.isBlank())
                .distinct()
                .sorted()
                .map(a -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("action", a);
                    m.put("label", traducirAccion(a));
                    return m;
                })
                .toList();
    }

    private Map<String, Object> aMapa(RegistroAuditoria log) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", log.getId());
        m.put("action", log.getAction());
        m.put("actionLabel", traducirAccion(log.getAction()));
        m.put("entity", log.getEntity());
        m.put("entityId", log.getEntityId());
        m.put("username", log.getUsername());
        m.put("details", log.getDetails());
        m.put("timestamp", log.getTimestamp() != null ? log.getTimestamp().toString() : null);
        return m;
    }

    private String traducirAccion(String action) {
        if (action == null) return action;
        return switch (action.toUpperCase()) {
            case "LOGIN" -> "Inicio de sesión";
            case "LOGOUT" -> "Cierre de sesión";
            case "CREATE" -> "Creación";
            case "UPDATE" -> "Actualización";
            case "DELETE" -> "Eliminación";
            case "STATUS" -> "Cambio de estado";
            case "MOVEMENT" -> "Movimiento de stock";
            case "PAYMENT" -> "Pago";
            case "PERMISSIONS" -> "Permisos";
            default -> action;
        };
    }

    private String nombreUsuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !"anonymousUser".equals(authentication.getName())) {
            return authentication.getName();
        }
        return "SISTEMA";
    }
}