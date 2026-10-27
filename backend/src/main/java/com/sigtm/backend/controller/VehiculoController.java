package com.sigtm.backend.controller;

import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.service.VehiculoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints del padrón de vehículos.
 *
 * <p>El acceso se controla con los permisos del módulo {@code VEHICULOS}
 * ({@code VEHICULOS:VER}, {@code VEHICULOS:CREAR}, {@code VEHICULOS:EDITAR} y
 * {@code VEHICULOS:ELIMINAR}). La consulta de un vehículo y su historial también
 * se permite a quien tenga {@code MI_TRABAJO:VER}, ya que el mecánico los abre
 * desde su pantalla de trabajo.</p>
 */
@RestController
@RequestMapping("/api/vehiculos")
@RequiredArgsConstructor
public class VehiculoController {

    private final VehiculoService vehiculoService;

    // Acceso por permiso del módulo VEHICULOS. El mecánico accede al detalle y al
    // historial desde "Mi trabajo" (MI_TRABAJO:VER), sin tener el módulo Vehículos.
    /**
     * Lista todos los vehículos del padrón.
     *
     * <p>Exige {@code VEHICULOS:VER}.</p>
     *
     * @return la lista completa de vehículos (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('VEHICULOS:VER')")
    public ResponseEntity<List<Vehiculo>> obtenerTodos() {
        return ResponseEntity.ok(vehiculoService.obtenerTodos());
    }

    /**
     * Devuelve el detalle de un vehículo.
     *
     * <p>Exige {@code VEHICULOS:VER} o {@code MI_TRABAJO:VER}. Un identificador
     * inexistente produce 404.</p>
     *
     * @param id identificador del vehículo
     * @return el vehículo solicitado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el vehículo no existe
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('VEHICULOS:VER', 'MI_TRABAJO:VER')")
    public ResponseEntity<Vehiculo> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(vehiculoService.obtenerPorId(id));
    }

    /**
     * Lista los vehículos de un cliente.
     *
     * <p>Exige {@code VEHICULOS:VER}.</p>
     *
     * @param customerId identificador del cliente
     * @return la lista de vehículos del cliente (200)
     */
    @GetMapping("/cliente/{customerId}")
    @PreAuthorize("hasAuthority('VEHICULOS:VER')")
    public ResponseEntity<List<Vehiculo>> obtenerPorClienteId(@PathVariable Long customerId) {
        return ResponseEntity.ok(vehiculoService.obtenerPorClienteId(customerId));
    }

    /**
     * Registra un vehículo nuevo para un cliente.
     *
     * <p>Exige {@code VEHICULOS:CREAR}. La placa y el VIN son claves únicas: si ya
     * están registrados la operación se rechaza con 409; el cliente debe existir o
     * se devuelve 404.</p>
     *
     * @param customerId identificador del cliente propietario
     * @param vehiculo   datos del vehículo a registrar
     * @return el vehículo creado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si el cliente no existe
     * @throws com.sigtm.backend.exception.DuplicateResourceException si la placa o el VIN ya están registrados
     */
    @PostMapping("/cliente/{customerId}")
    @PreAuthorize("hasAuthority('VEHICULOS:CREAR')")
    public ResponseEntity<Vehiculo> crearVehiculo(@PathVariable Long customerId, @RequestBody Vehiculo vehiculo) {
        return ResponseEntity.ok(vehiculoService.crearVehiculo(customerId, vehiculo));
    }

    /**
     * Actualiza los datos de un vehículo.
     *
     * <p>Exige {@code VEHICULOS:EDITAR}. Valida que la nueva placa y el VIN no
     * colisionen con otro vehículo; un identificador inexistente produce 404.</p>
     *
     * @param id       identificador del vehículo a modificar
     * @param vehiculo nuevos valores del vehículo
     * @return el vehículo ya actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si el vehículo no existe
     * @throws com.sigtm.backend.exception.DuplicateResourceException si la placa o el VIN pertenecen a otro vehículo
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('VEHICULOS:EDITAR')")
    public ResponseEntity<Vehiculo> actualizarVehiculo(@PathVariable Long id, @RequestBody Vehiculo vehiculo) {
        return ResponseEntity.ok(vehiculoService.actualizarVehiculo(id, vehiculo));
    }

    /**
     * Elimina un vehículo del padrón.
     *
     * <p>Exige {@code VEHICULOS:ELIMINAR}. Un identificador inexistente produce
     * 404.</p>
     *
     * @param id identificador del vehículo a eliminar
     * @return respuesta sin cuerpo (204)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el vehículo no existe
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('VEHICULOS:ELIMINAR')")
    public ResponseEntity<Void> eliminarVehiculo(@PathVariable Long id) {
        vehiculoService.eliminarVehiculo(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Historial del vehículo: línea de tiempo generada automáticamente a partir de las
     * visitas (recepciones) y las órdenes de trabajo, en orden cronológico.
     *
     * <p>Exige {@code VEHICULOS:VER} o {@code MI_TRABAJO:VER}. Un identificador
     * inexistente produce 404.</p>
     *
     * @param id identificador del vehículo
     * @return el historial del vehículo con sus visitas y órdenes (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el vehículo no existe
     */
    @GetMapping("/{id}/historial")
    @PreAuthorize("hasAnyAuthority('VEHICULOS:VER', 'MI_TRABAJO:VER')")
    public ResponseEntity<Map<String, Object>> obtenerHistorial(@PathVariable Long id) {
        return ResponseEntity.ok(vehiculoService.obtenerHistorial(id));
    }
}
