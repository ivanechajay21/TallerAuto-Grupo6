package com.sigtm.backend.controller;

import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.service.ClienteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints del padrón de clientes del taller.
 *
 * <p>Cada endpoint exige el permiso de la acción correspondiente del módulo
 * {@code CLIENTES} ({@code CLIENTES:VER}, {@code CLIENTES:CREAR},
 * {@code CLIENTES:EDITAR} o {@code CLIENTES:ELIMINAR}), administrados desde
 * Roles y Permisos. La eliminación es lógica: desactiva el cliente y conserva
 * su historial.</p>
 */
@RestController
@RequestMapping("/api/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    // Acceso por permiso (administrado desde Roles y Permisos). Cada endpoint exige
    // el permiso de la acción correspondiente del módulo CLIENTES.
    /**
     * Devuelve los clientes paginados con búsqueda, filtro de estado y resumen.
     *
     * <p>Exige {@code CLIENTES:VER}. El resumen se calcula sobre todo el padrón,
     * no solo sobre la página solicitada.</p>
     *
     * @param page   página solicitada, empezando en cero
     * @param size   tamaño de página
     * @param search texto libre opcional
     * @param status {@code TODOS}, {@code ACTIVOS} o {@code INACTIVOS}
     * @param sort   orden solicitado
     * @return la página de clientes y el resumen (200)
     */
    @GetMapping("/paginado")
    @PreAuthorize("hasAuthority('CLIENTES:VER')")
    public ResponseEntity<Map<String, Object>> obtenerPaginado(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "9") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "TODOS") String status,
            @RequestParam(required = false, defaultValue = "reciente") String sort) {
        return ResponseEntity.ok(clienteService.buscarPaginado(page, size, search, status, sort));
    }

    /**
     * Lista todos los clientes del padrón.
     *
     * <p>Exige {@code CLIENTES:VER}. Devuelve también los clientes desactivados
     * para que la interfaz pueda distinguir el estado {@code active}.</p>
     *
     * @return la lista completa de clientes (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('CLIENTES:VER')")
    public ResponseEntity<List<Cliente>> obtenerTodos() {
        return ResponseEntity.ok(clienteService.obtenerTodos());
    }

    /**
     * Devuelve el detalle de un cliente.
     *
     * <p>Exige {@code CLIENTES:VER}. Un identificador inexistente produce 404.</p>
     *
     * @param id identificador del cliente
     * @return el cliente solicitado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el cliente no existe
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CLIENTES:VER')")
    public ResponseEntity<Cliente> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.obtenerPorId(id));
    }

    /**
     * Registra un cliente nuevo en el padrón.
     *
     * <p>Exige {@code CLIENTES:CREAR}. El documento de identidad es la clave
     * natural: si ya está registrado la operación se rechaza con 409. El código
     * correlativo y la fecha de registro se generan automáticamente si no se
     * envían.</p>
     *
     * @param cliente datos del cliente a registrar
     * @return el cliente creado con su código asignado (200)
     * @throws com.sigtm.backend.exception.DuplicateResourceException si ya existe un cliente con el mismo documento
     */
    @PostMapping
    @PreAuthorize("hasAuthority('CLIENTES:CREAR')")
    public ResponseEntity<Cliente> crearCliente(@RequestBody Cliente cliente) {
        return ResponseEntity.ok(clienteService.crearCliente(cliente));
    }

    /**
     * Actualiza los datos de contacto de un cliente.
     *
     * <p>Exige {@code CLIENTES:EDITAR}. Solo se modifican los campos de contacto y
     * estado: el documento de identidad y el código correlativo permanecen
     * intactos. Un identificador inexistente produce 404.</p>
     *
     * @param id      identificador del cliente a modificar
     * @param cliente nuevos valores de nombre, contacto, estado y observaciones
     * @return el cliente ya actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el cliente no existe
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CLIENTES:EDITAR')")
    public ResponseEntity<Cliente> actualizarCliente(@PathVariable Long id, @RequestBody Cliente cliente) {
        return ResponseEntity.ok(clienteService.actualizarCliente(id, cliente));
    }

    /**
     * Desactiva un cliente del padrón.
     *
     * <p>Exige {@code CLIENTES:ELIMINAR}. Es una eliminación lógica
     * ({@code active = false}): no borra datos ni altera los vehículos, órdenes
     * y facturas asociados. Un cliente ya inactivo no produce error.</p>
     *
     * @param id identificador del cliente a desactivar
     * @return respuesta sin cuerpo (204)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el cliente no existe
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CLIENTES:ELIMINAR')")
    public ResponseEntity<Void> eliminarCliente(@PathVariable Long id) {
        clienteService.eliminarCliente(id);
        return ResponseEntity.noContent().build();
    }
}
