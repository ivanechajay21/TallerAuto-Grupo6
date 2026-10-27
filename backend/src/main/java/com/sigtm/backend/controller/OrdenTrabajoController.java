package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ActualizarOrdenTrabajoRequest;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.service.OrdenTrabajoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de las órdenes de trabajo y de sus ítems.
 *
 * <p>El acceso se controla con los permisos de los módulos {@code ORDENES}
 * ({@code ORDENES:VER}, {@code ORDENES:CREAR}, {@code ORDENES:EDITAR} y
 * {@code ORDENES:CAMBIAR_ESTADO}), {@code ITEMS} ({@code ITEMS:CREAR},
 * {@code ITEMS:EDITAR}, {@code ITEMS:ELIMINAR} y {@code ITEMS:CAMBIAR_ESTADO}) y
 * {@code MI_TRABAJO} ({@code MI_TRABAJO:VER} y
 * {@code MI_TRABAJO:CAMBIAR_ESTADO}). El mecánico opera únicamente desde su
 * pantalla "Mi trabajo", sin el módulo Órdenes.</p>
 */
@RestController
@RequestMapping("/api/ordenes-trabajo")
@RequiredArgsConstructor
public class OrdenTrabajoController {

    private final OrdenTrabajoService ordenTrabajoService;

    // Acceso por permiso de los módulos ORDENES / ITEMS / MI_TRABAJO.
    // El mecánico accede solo desde "Mi trabajo" (MI_TRABAJO:*), sin el módulo Órdenes.
    /**
     * Lista todas las órdenes de trabajo.
     *
     * <p>Exige {@code ORDENES:VER}. Cada orden incluye sus ítems y el total
     * calculado.</p>
     *
     * @return la lista de órdenes de trabajo (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('ORDENES:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodas() {
        return ResponseEntity.ok(ordenTrabajoService.obtenerTodas());
    }

    /**
     * Devuelve el detalle de una orden de trabajo.
     *
     * <p>Exige {@code ORDENES:VER} o {@code MI_TRABAJO:VER}. Un identificador
     * inexistente produce 404.</p>
     *
     * @param id identificador de la orden
     * @return la orden con el detalle de sus ítems (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si la orden no existe
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ORDENES:VER', 'MI_TRABAJO:VER')")
    public ResponseEntity<Map<String, Object>> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(ordenTrabajoService.obtenerPorId(id));
    }

    /**
     * Lista las órdenes de trabajo con un estado determinado.
     *
     * <p>Exige {@code ORDENES:VER}. Si ninguna orden tiene ese estado devuelve una
     * lista vacía.</p>
     *
     * @param status estado por el que filtrar (por ejemplo {@code RECIBIDO} o {@code FINALIZADO})
     * @return la lista de órdenes en ese estado (200)
     */
    @GetMapping("/estado/{status}")
    @PreAuthorize("hasAuthority('ORDENES:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerPorEstado(@PathVariable String status) {
        return ResponseEntity.ok(ordenTrabajoService.obtenerPorEstado(status));
    }

    /**
     * Crea una orden de trabajo para un cliente y su vehículo.
     *
     * <p>Exige {@code ORDENES:CREAR}. El cliente y el vehículo deben existir, y si
     * se indica {@code appointmentId} la cita también; o la operación falla con 404.
     * El servicio asigna el número correlativo ({@code OT-000001}), deja la orden en
     * estado {@code RECIBIDO} y notifica a los roles responsables.</p>
     *
     * @param customerId    identificador del cliente
     * @param vehicleId     identificador del vehículo
     * @param appointmentId cita de origen a vincular; opcional
     * @param ordenTrabajo  datos de la orden (prioridad, kilometraje, síntomas, etc.)
     * @return la orden de trabajo creada (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el cliente, el vehículo o la cita no existen
     */
    @PostMapping("/cliente/{customerId}/vehiculo/{vehicleId}")
    @PreAuthorize("hasAuthority('ORDENES:CREAR')")
    public ResponseEntity<Map<String, Object>> crearOrdenTrabajo(
            @PathVariable Long customerId,
            @PathVariable Long vehicleId,
            @RequestParam(required = false) Long appointmentId,
            @RequestBody OrdenTrabajo ordenTrabajo) {
        return ResponseEntity.ok(ordenTrabajoService.crearOrdenTrabajo(customerId, vehicleId, appointmentId, ordenTrabajo));
    }

    /**
     * Cambia el estado de una orden de trabajo.
     *
     * <p>Exige {@code ORDENES:CAMBIAR_ESTADO}. El estado viaja como parámetro
     * {@code status} y se guarda tal cual, sin validación de la tabla de estados; el
     * cambio queda auditado y, si la orden queda finalizada o lista para entrega, se
     * notifica a los roles responsables.</p>
     *
     * @param id     identificador de la orden
     * @param status nuevo estado de la orden
     * @return la orden con el estado actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si la orden no existe
     */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('ORDENES:CAMBIAR_ESTADO')")
    public ResponseEntity<Map<String, Object>> actualizarEstado(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(ordenTrabajoService.actualizarEstado(id, status));
    }

    /**
     * Actualiza los campos descriptivos de una orden de trabajo.
     *
     * <p>Exige {@code ORDENES:EDITAR}. Solo se modifican los campos enviados
     * (kilometraje, combustible, síntomas, diagnóstico, prioridad y daños visuales);
     * los nulos conservan su valor. El cambio queda auditado.</p>
     *
     * @param id      identificador de la orden
     * @param solicitud nuevos valores de la orden
     * @return la orden ya actualizada (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si la orden no existe
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ORDENES:EDITAR')")
    public ResponseEntity<Map<String, Object>> actualizarCamposOrden(
            @PathVariable Long id,
            @RequestBody ActualizarOrdenTrabajoRequest solicitud) {
        return ResponseEntity.ok(ordenTrabajoService.actualizarCamposOrden(id, solicitud));
    }

    // Work Order Items (Tasks/Services assigned)

    /**
     * Agrega un ítem (servicio o repuesto) a una orden de trabajo.
     *
     * <p>Exige {@code ITEMS:CREAR}. Hay que indicar un servicio o un producto, pero
     * no ambos; la cantidad debe ser mayor a 0. Si se trata de un repuesto se
     * descuenta del inventario y no puede estar inactivo. Un identificador
     * inexistente de orden, servicio, producto o mecánico produce 404.</p>
     *
     * @param workOrderId      identificador de la orden
     * @param serviceCatalogId servicio del catálogo a agregar; opcional
     * @param productId        repuesto a agregar; opcional
     * @param mechanicId       mecánico al que se asigna el trabajo; opcional
     * @param item             descripción, cantidad y observaciones del ítem
     * @return el ítem agregado a la orden (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si la orden, el servicio, el producto o el mecánico no existen
     * @throws IllegalArgumentException   si se envían servicio y producto a la vez, la cantidad es inválida o el producto está inactivo
     */
    @PostMapping("/{workOrderId}/detalles")
    @PreAuthorize("hasAuthority('ITEMS:CREAR')")
    public ResponseEntity<Map<String, Object>> agregarItem(
            @PathVariable Long workOrderId,
            @RequestParam(required = false) Long serviceCatalogId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long mechanicId,
            @RequestBody ItemOrdenTrabajo item) {
        return ResponseEntity.ok(ordenTrabajoService.agregarItem(workOrderId, serviceCatalogId, productId, mechanicId, item));
    }

    /**
     * Actualiza un ítem de una orden de trabajo.
     *
     * <p>Exige {@code ITEMS:EDITAR}. Permite cambiar el servicio, el repuesto, el
     * mecánico asignado, la cantidad, el precio y las observaciones; el stock se
     * reajusta automáticamente. No se puede indicar servicio y producto a la vez, la
     * cantidad debe ser mayor a 0 y el repuesto no puede estar inactivo.</p>
     *
     * @param itemId           identificador del ítem
     * @param serviceCatalogId servicio del catálogo; opcional
     * @param productId        repuesto; opcional
     * @param mechanicId       mecánico asignado; opcional
     * @param item             nuevos valores del ítem
     * @return el ítem actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si el ítem, el servicio, el producto o el mecánico no existen
     * @throws IllegalArgumentException   si se envían servicio y producto a la vez, la cantidad es inválida o el producto está inactivo
     */
    @PutMapping("/detalles/{itemId}")
    @PreAuthorize("hasAuthority('ITEMS:EDITAR')")
    public ResponseEntity<Map<String, Object>> actualizarItem(
            @PathVariable Long itemId,
            @RequestParam(required = false) Long serviceCatalogId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long mechanicId,
            @RequestBody ItemOrdenTrabajo item) {
        return ResponseEntity.ok(ordenTrabajoService.actualizarItem(itemId, serviceCatalogId, productId, mechanicId, item));
    }

    /**
     * Elimina un ítem de una orden de trabajo.
     *
     * <p>Exige {@code ITEMS:ELIMINAR}. Si el ítem usaba un repuesto, su cantidad se
     * devuelve al inventario. Un identificador inexistente produce 404.</p>
     *
     * @param itemId identificador del ítem a eliminar
     * @return respuesta sin cuerpo (204)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el ítem no existe
     */
    @DeleteMapping("/detalles/{itemId}")
    @PreAuthorize("hasAuthority('ITEMS:ELIMINAR')")
    public ResponseEntity<Void> eliminarItem(@PathVariable Long itemId) {
        ordenTrabajoService.eliminarItem(itemId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Cambia el estado de un ítem de la orden.
     *
     * <p>Exige {@code ITEMS:CAMBIAR_ESTADO} o {@code MI_TRABAJO:CAMBIAR_ESTADO}. Al
     * pasar a {@code IN_PROGRESS} se registra la fecha de inicio y al pasar a
     * {@code COMPLETED} la de fin; el cambio queda auditado.</p>
     *
     * @param itemId identificador del ítem
     * @param status nuevo estado del ítem
     * @return el ítem con el estado actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el ítem no existe
     */
    @PatchMapping("/detalles/{itemId}/estado")
    @PreAuthorize("hasAnyAuthority('ITEMS:CAMBIAR_ESTADO', 'MI_TRABAJO:CAMBIAR_ESTADO')")
    public ResponseEntity<Map<String, Object>> actualizarEstadoItem(
            @PathVariable Long itemId,
            @RequestParam String status) {
        return ResponseEntity.ok(ordenTrabajoService.actualizarEstadoItem(itemId, status));
    }

    /**
     * Lista los trabajos asignados a un mecánico.
     *
     * <p>Exige {@code MI_TRABAJO:VER}. Es la consulta que alimenta la pantalla "Mi
     * trabajo" del mecánico.</p>
     *
     * @param mechanicId identificador del mecánico
     * @return la lista de ítems de orden asignados al mecánico (200)
     */
    @GetMapping("/mecanico/{mechanicId}/detalles")
    @PreAuthorize("hasAuthority('MI_TRABAJO:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerMisTrabajos(@PathVariable Long mechanicId) {
        return ResponseEntity.ok(ordenTrabajoService.obtenerMisTrabajos(mechanicId));
    }
}
