package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ConfiguracionRequest;
import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.security.services.UserDetailsImpl;
import com.sigtm.backend.service.ConfiguracionService;
import com.sigtm.backend.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoints de los parámetros generales del taller.
 *
 * <p>Gestiona la configuración única del sistema (datos del taller, remitente y
 * servidor SMTP, y las banderas de notificación). La lectura exige
 * {@code CONFIGURACION:VER} y la modificación {@code CONFIGURACION:EDITAR}.</p>
 */
@RestController
@RequestMapping("/api/configuracion")
@RequiredArgsConstructor
public class ConfiguracionController {

    private final ConfiguracionService configuracionService;
    private final EmailService emailService;

    /**
     * Devuelve la configuración vigente del sistema.
     *
     * <p>Exige {@code CONFIGURACION:VER}. El taller trabaja con una única
     * configuración: si aún no existe se devuelven los valores por defecto
     * (nombre del taller, correo {@code GMAIL} y SMTP con {@code STARTTLS} en el
     * puerto 587) sin escribir en la base de datos.</p>
     *
     * @return la configuración actual del sistema (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('CONFIGURACION:VER')")
    public ResponseEntity<Configuracion> obtenerConfiguracion() {
        return ResponseEntity.ok(configuracionService.obtenerConfiguracion());
    }

    /**
     * Guarda los cambios de la configuración del sistema.
     *
     * <p>Exige {@code CONFIGURACION:EDITAR}. Actualiza el registro existente: si
     * el nombre del taller llega vacío se restaura el valor por defecto, los campos
     * nulos conservan su valor actual y los textos vacíos limpian el dato. El cambio
     * queda auditado.</p>
     *
     * @param configuracion nuevos valores de configuración validados
     * @return la configuración ya guardada (200)
     */
    @PutMapping
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<Configuracion> actualizarConfiguracion(
            @Valid @RequestBody ConfiguracionRequest configuracion) {
        return ResponseEntity.ok(configuracionService.actualizar(configuracion));
    }

    /**
     * Envía un correo de prueba al usuario administrador autenticado.
     *
     * <p>Permite validar las credenciales SMTP después de configurar Gmail. No
     * devuelve detalles sensibles del servidor, solo si el envío fue aceptado.</p>
     *
     * @param usuario usuario autenticado que recibirá la prueba
     * @return confirmación del envío o error de configuración
     */
    @PostMapping("/correo/probar")
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<Map<String, Object>> probarCorreo(@AuthenticationPrincipal UserDetailsImpl usuario) {
        if (!emailService.estaConfigurado()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Configura MAIL_USERNAME y MAIL_PASSWORD con una App Password de Gmail."));
        }
        boolean enviado = emailService.sendHtmlEmail(
                usuario.getEmail(),
                "Prueba de correo — SIGTM",
                "<p>Este es un correo de prueba enviado desde la configuración de SIGTM.</p>");
        if (!enviado) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "No se pudo autenticar o enviar el correo. Revisa la App Password y el servidor SMTP."));
        }
        return ResponseEntity.ok(Map.of("message", "Correo de prueba enviado a " + usuario.getEmail()));
    }
}
