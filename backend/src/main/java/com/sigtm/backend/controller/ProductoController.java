package com.sigtm.backend.controller;

import com.sigtm.backend.dto.AjusteStockRequest;
import com.sigtm.backend.model.MovimientoInventario;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.service.ProductoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Endpoints del inventario de repuestos.
 *
 * <p>El catálogo y sus movimientos se controlan con los permisos de los módulos
 * {@code PRODUCTOS} ({@code PRODUCTOS:VER}, {@code PRODUCTOS:CREAR},
 * {@code PRODUCTOS:EDITAR} y {@code PRODUCTOS:ELIMINAR}) y {@code MOVIMIENTOS}
 * ({@code MOVIMIENTOS:VER} y {@code MOVIMIENTOS:CREAR}); el ajuste de stock
 * también se permite al mecánico con {@code MI_TRABAJO:CAMBIAR_ESTADO}. La
 * eliminación es lógica: desactiva el producto y conserva sus movimientos.</p>
 */
@RestController
@RequestMapping("/api/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService productoService;

    // Acceso por permiso de los módulos PRODUCTOS / MOVIMIENTOS / MI_TRABAJO.
    // El detalle (GET /{id}) se alinea con PRODUCTOS:VER: todo rol con el módulo
    // Inventario (incluido el mecánico) puede consultarlo.
    /**
     * Lista los repuestos del inventario con filtros opcionales.
     *
     * <p>Exige {@code PRODUCTOS:VER}. Por defecto solo devuelve los productos
     * activos; con {@code incluirInactivos=true} incorpora también los desactivados.
     * La búsqueda libre se aplica sobre código, nombre, marca y categoría.</p>
     *
     * @param incluirInactivos {@code true} para incluir los productos desactivados
     * @param search          texto a buscar; opcional
     * @return la lista de productos que cumple los criterios (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('PRODUCTOS:VER')")
    public ResponseEntity<List<Producto>> obtenerTodos(
            @RequestParam(defaultValue = "false") boolean incluirInactivos,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(productoService.obtenerTodos(incluirInactivos, search));
    }

    /**
     * Devuelve el detalle de un repuesto.
     *
     * <p>Exige {@code PRODUCTOS:VER}. Un identificador inexistente produce 404.</p>
     *
     * @param id identificador del producto
     * @return el producto solicitado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el producto no existe
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCTOS:VER')")
    public ResponseEntity<Producto> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.obtenerPorId(id));
    }

    /**
     * Lista los movimientos de inventario de un producto.
     *
     * <p>Exige {@code MOVIMIENTOS:VER}. Un identificador inexistente produce 404.</p>
     *
     * @param id identificador del producto
     * @return la lista de movimientos del producto, del más reciente al más antiguo (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el producto no existe
     */
    @GetMapping("/{id}/movimientos")
    @PreAuthorize("hasAuthority('MOVIMIENTOS:VER')")
    public ResponseEntity<List<MovimientoInventario>> obtenerMovimientos(@PathVariable Long id) {
        return ResponseEntity.ok(productoService.obtenerMovimientos(id));
    }

    /**
     * Registra un repuesto nuevo en el inventario.
     *
     * <p>Exige {@code PRODUCTOS:CREAR}. Valida la entidad ({@code @Valid}) y exige
     * el código: si falta produce 400 y si ya existe 409. Al crearlo con stock
     * inicial se registra el movimiento de entrada correspondiente.</p>
     *
     * @param producto datos del repuesto a registrar
     * @return el producto creado (200)
     * @throws IllegalArgumentException  si falta el código
     * @throws com.sigtm.backend.exception.DuplicateResourceException si ya existe un producto con ese código
     */
    @PostMapping
    @PreAuthorize("hasAuthority('PRODUCTOS:CREAR')")
    public ResponseEntity<Producto> crearProducto(@Valid @RequestBody Producto producto) {
        return ResponseEntity.ok(productoService.crearProducto(producto));
    }

    /**
     * Actualiza un repuesto del inventario.
     *
     * <p>Exige {@code PRODUCTOS:EDITAR}. Valida la entidad ({@code @Valid}); el
     * código es único y no puede colisionar con otro producto. Un identificador
     * inexistente produce 404.</p>
     *
     * @param id       identificador del producto a modificar
     * @param producto nuevos valores del repuesto
     * @return el producto ya actualizado (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException  si el producto no existe
     * @throws com.sigtm.backend.exception.DuplicateResourceException si el nuevo código ya pertenece a otro producto
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCTOS:EDITAR')")
    public ResponseEntity<Producto> actualizarProducto(@PathVariable Long id, @Valid @RequestBody Producto producto) {
        return ResponseEntity.ok(productoService.actualizarProducto(id, producto));
    }

    /**
     * Desactiva un repuesto del inventario.
     *
     * <p>Exige {@code PRODUCTOS:ELIMINAR}. Es una eliminación lógica: si el producto
     * ya estaba inactivo no se produce error; un identificador inexistente produce
     * 404.</p>
     *
     * @param id identificador del producto a desactivar
     * @return respuesta sin cuerpo (204)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el producto no existe
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PRODUCTOS:ELIMINAR')")
    public ResponseEntity<Void> eliminarProducto(@PathVariable Long id) {
        productoService.eliminarProducto(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Ajusta la existencia de un producto con un movimiento de entrada o salida.
     *
     * <p>Exige {@code MOVIMIENTOS:CREAR} o {@code MI_TRABAJO:CAMBIAR_ESTADO}. Valida
     * la solicitud ({@code @Valid}): la cantidad debe ser mayor a 0 y el tipo
     * {@code IN} o {@code OUT}; una salida por encima del stock disponible produce
     * 400. El ajuste registra el movimiento y, si el stock baja del mínimo, notifica
     * a los roles responsables.</p>
     *
     * @param id       identificador del producto
     * @param solicitud cantidad, tipo de movimiento y referencia del ajuste
     * @return el producto con la existencia actualizada (200)
     * @throws com.sigtm.backend.exception.ResourceNotFoundException si el producto no existe
     * @throws IllegalArgumentException  si la cantidad es inválida, el tipo no es IN/OUT o el stock es insuficiente
     */
    @PostMapping("/{id}/existencia")
    @PreAuthorize("hasAnyAuthority('MOVIMIENTOS:CREAR', 'MI_TRABAJO:CAMBIAR_ESTADO')")
    public ResponseEntity<Producto> ajustarStock(@PathVariable Long id, @Valid @RequestBody AjusteStockRequest solicitud) {
        return ResponseEntity.ok(productoService.aplicarCambioStock(id, solicitud));
    }
}
