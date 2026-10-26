package com.sigtm.backend.controller;

import com.sigtm.backend.model.ServicioCatalogo;
import com.sigtm.backend.service.ServicioCatalogoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints del catálogo de servicios del taller.
 *
 * <p>El catálogo no tiene permiso propio: es dato de apoyo para Órdenes
 * ({@code ORDENES:VER}) y para el mecánico en Mi trabajo ({@code MI_TRABAJO:VER}).
 * Su mantenimiento (alta y edición) se administra desde Configuración y exige
 * {@code CONFIGURACION:EDITAR}.</p>
 */
@RestController
@RequestMapping("/api/catalogo-servicios")
@RequiredArgsConstructor
public class ServicioCatalogoController {

    private final ServicioCatalogoService servicioCatalogoService;

    // El catálogo de servicios no tiene permiso propio: es dato de apoyo para
    // Órdenes (ORDENES:VER) y para el mecánico en Mi trabajo (MI_TRABAJO:VER).
    // Su mantenimiento (crear/editar) se administra desde Configuración, por eso
    // exige CONFIGURACION:EDITAR (solo ADMIN/MANAGER por defecto).
    /**
     * Lista los servicios activos del catálogo.
     *
     * <p>Exige {@code ORDENES:VER} o {@code MI_TRABAJO:VER}. Solo devuelve los
     * servicios vigentes, no los desactivados.</p>
     *
     * @return la lista de servicios activos (200)
     */
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ORDENES:VER', 'MI_TRABAJO:VER')")
    public ResponseEntity<List<ServicioCatalogo>> obtenerActivos() {
        return ResponseEntity.ok(servicioCatalogoService.obtenerActivos());
    }

    /**
     * Devuelve el detalle de un servicio del catálogo.
     *
     * <p>Exige {@code ORDENES:VER}. Un identificador inexistente se traduce en 400
     * con el mensaje de recurso no encontrado.</p>
     *
     * @param id identificador del servicio del catálogo
     * @return el servicio solicitado (200)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ORDENES:VER')")
    public ResponseEntity<ServicioCatalogo> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(servicioCatalogoService.obtenerPorId(id));
    }

    /**
     * Crea un servicio en el catálogo.
     *
     * <p>Exige {@code CONFIGURACION:EDITAR}. Los datos del servicio son validados
     * por la entidad antes de guardarse.</p>
     *
     * @param servicio datos del servicio a registrar
     * @return el servicio creado (200)
     */
    @PostMapping
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<ServicioCatalogo> crearServicio(@RequestBody ServicioCatalogo servicio) {
        return ResponseEntity.ok(servicioCatalogoService.crearServicio(servicio));
    }

    /**
     * Actualiza un servicio del catálogo.
     *
     * <p>Exige {@code CONFIGURACION:EDITAR}. Un identificador inexistente se
     * traduce en 400 con el mensaje de recurso no encontrado.</p>
     *
     * @param id       identificador del servicio a modificar
     * @param servicio nuevos valores del servicio
     * @return el servicio ya actualizado (200)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONFIGURACION:EDITAR')")
    public ResponseEntity<ServicioCatalogo> actualizarServicio(@PathVariable Long id, @RequestBody ServicioCatalogo servicio) {
        return ResponseEntity.ok(servicioCatalogoService.actualizarServicio(id, servicio));
    }
}
