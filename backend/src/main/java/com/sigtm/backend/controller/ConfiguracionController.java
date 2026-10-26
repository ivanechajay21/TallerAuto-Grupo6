package com.sigtm.backend.controller;

import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.service.ConfiguracionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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

    /**
     * Devuelve la configuración vigente del sistema.
     *
     * <p>Exige {@code CONFIGURACION:VER}. El taller trabaja con una única
     * configuración: si aún no existe se crean los valores por defecto
     * (nombre del taller, correo {@code GMAIL} y SMTP con {@code STARTTLS} en el
     * puerto 587) y se devuelven en la misma respuesta.</p>
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
     * el nombre del taller llega vacío se restaura el valor por defecto, y los
     * campos opcionales nulos (tipo de correo, puerto, seguridad SMTP y banderas
     * de notificación) conservan su valor actual. El cambio queda auditado.</p>
     *
     * @param configuracion nuevos valores de la configuración
     * @return la configuración ya guardada (200)
     */
    @PutMapping
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<Configuracion> actualizarConfiguracion(@RequestBody Configuracion configuracion) {
        return ResponseEntity.ok(configuracionService.actualizar(configuracion));
    }
}
