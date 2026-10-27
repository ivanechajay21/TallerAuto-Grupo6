package com.sigtm.backend.service;

import com.sigtm.backend.dto.AjusteStockRequest;
import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.MovimientoInventario;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.MovimientoInventarioRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.security.services.UserDetailsImpl;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Administra el inventario de repuestos: catálogo, precios y movimientos de stock.
 *
 * <p>Los ajustes de stock se hacen con bloqueo pesimista de la fila del producto,
 * registran siempre un movimiento de inventario y notifican a los roles responsables
 * cuando el stock queda por debajo del mínimo configurado.</p>
 */
@Service
public class ProductoService {

    private final ProductoRepository productoRepository;
    private final MovimientoInventarioRepository movimientoInventarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoriaService;
    private final NotificacionService notificacionService;

    public ProductoService(ProductoRepository productoRepository,
                           MovimientoInventarioRepository movimientoInventarioRepository,
                           UsuarioRepository usuarioRepository,
                           AuditoriaService auditoriaService,
                           NotificacionService notificacionService) {
        this.productoRepository = productoRepository;
        this.movimientoInventarioRepository = movimientoInventarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.auditoriaService = auditoriaService;
        this.notificacionService = notificacionService;
    }

    /**
     * Lista los repuestos del inventario, opcionalmente filtrados por un texto libre.
     *
     * <p>Con {@code incluirInactivos = true} se recuperan todos los productos ordenados
     * por nombre; en caso contrario solo los activos. La búsqueda se aplica en memoria
     * sobre el código, el nombre, la marca y la categoría, sin distinguir mayúsculas.</p>
     *
     * @param incluirInactivos {@code true} para incluir también los productos desactivados
     * @param search          texto a buscar; si es {@code null} o vacío no se filtra
     * @return la lista de productos que cumple los criterios
     */
    @Transactional(readOnly = true)
    public List<Producto> obtenerTodos(boolean incluirInactivos, String search) {
        List<Producto> productos = incluirInactivos
                ? productoRepository.findAll(Sort.by(Sort.Direction.ASC, "name"))
                : productoRepository.findByActiveTrue();
        if (search == null || search.isBlank()) {
            return productos;
        }
        String q = search.trim().toLowerCase();
        return productos.stream()
                .filter(p -> p.getCode().toLowerCase().contains(q)
                        || p.getName().toLowerCase().contains(q)
                        || (p.getBrand() != null && p.getBrand().toLowerCase().contains(q))
                        || (p.getCategory() != null && p.getCategory().toLowerCase().contains(q)))
                .toList();
    }

    /**
     * Obtiene un repuesto por su identificador.
     *
     * @param id identificador del producto
     * @return el producto solicitado
     * @throws ResourceNotFoundException si el producto no existe
     */
    @Transactional(readOnly = true)
    public Producto obtenerPorId(Long id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
    }

    /**
     * Registra un nuevo repuesto en el inventario.
     *
     * <p>El código es obligatorio y único; si no se informan, la cantidad inicial es
     * {@code 0}, el stock mínimo {@code 5} y el estado activo. Si el stock inicial es
     * mayor que cero se genera un movimiento de entrada por dicho importe. El alta se
     * registra en la auditoría.</p>
     *
     * @param producto datos del repuesto a registrar
     * @return el producto creado
     * @throws IllegalArgumentException si falta el código
     * @throws DuplicateResourceException si ya existe un producto con ese código
     */
    @Transactional
    public Producto crearProducto(Producto producto) {
        normalizarProducto(producto);
        if (producto.getCode() == null || producto.getCode().isBlank()) {
            throw new IllegalArgumentException("El código es obligatorio");
        }
        if (productoRepository.findByCodeIgnoreCase(producto.getCode()).isPresent()) {
            throw new DuplicateResourceException("Ya existe un producto con el código " + producto.getCode());
        }
        if (producto.getCurrentStock() == null) {
            producto.setCurrentStock(0);
        }
        if (producto.getMinStock() == null) {
            producto.setMinStock(5);
        }
        if (producto.getActive() == null) {
            producto.setActive(true);
        }
        Producto guardado = productoRepository.save(producto);
        if (guardado.getCurrentStock() != null && guardado.getCurrentStock() > 0) {
            registrarMovimiento(guardado, "IN", guardado.getCurrentStock(),
                    guardado.getPurchasePrice() != null ? guardado.getPurchasePrice() : BigDecimal.ZERO,
                    "Stock inicial al registrar producto", usuarioActual());
        }
        auditoriaService.registrar("CREATE", "PRODUCTO", guardado.getId(),
                "Registro de producto " + guardado.getCode() + " — " + guardado.getName());
        return guardado;
    }

    /**
     * Actualiza la ficha de un repuesto del inventario.
     *
     * <p>El código solo se cambia si llega informado, distinto del actual y no repetido;
     * el resto de campos se sobrescribe únicamente cuando llegan con valor. La operación
     * se registra en la auditoría.</p>
     *
     * @param id               identificador del producto
     * @param detallesProducto nuevos datos del producto
     * @return el producto actualizado
     * @throws ResourceNotFoundException si el producto no existe
     * @throws DuplicateResourceException si se intenta usar un código ya ocupado
     */
    @Transactional
    public Producto actualizarProducto(Long id, Producto detallesProducto) {
        Producto producto = obtenerPorId(id);
        if (detallesProducto.getCode() != null && !detallesProducto.getCode().isBlank()
                && !detallesProducto.getCode().trim().equalsIgnoreCase(producto.getCode())) {
            String newCode = detallesProducto.getCode().trim();
            if (productoRepository.findByCodeIgnoreCase(newCode).isPresent()) {
                throw new DuplicateResourceException("Ya existe un producto con el código " + newCode);
            }
            producto.setCode(newCode);
        }
        if (detallesProducto.getName() != null && !detallesProducto.getName().isBlank()) {
            producto.setName(detallesProducto.getName().trim());
        }
        producto.setDescription(detallesProducto.getDescription());
        producto.setBrand(detallesProducto.getBrand());
        producto.setCategory(detallesProducto.getCategory());
        if (detallesProducto.getPurchasePrice() != null) {
            producto.setPurchasePrice(detallesProducto.getPurchasePrice());
        }
        if (detallesProducto.getSalePrice() != null) {
            producto.setSalePrice(detallesProducto.getSalePrice());
        }
        if (detallesProducto.getMinStock() != null) {
            producto.setMinStock(detallesProducto.getMinStock());
        }
        if (detallesProducto.getActive() != null) {
            producto.setActive(detallesProducto.getActive());
        }
        Producto guardado = productoRepository.save(producto);
        auditoriaService.registrar("UPDATE", "PRODUCTO", guardado.getId(),
                "Actualización de producto " + guardado.getCode() + " — " + guardado.getName());
        return guardado;
    }

    /**
     * Eliminación lógica: desactiva el repuesto manteniendo su historial de movimientos.
     *
     * <p>Solo actúa si el producto estaba activo y deja traza en la auditoría.</p>
     *
     * @param id identificador del producto
     * @throws ResourceNotFoundException si el producto no existe
     */
    @Transactional
    public void eliminarProducto(Long id) {
        Producto producto = obtenerPorId(id);
        if (Boolean.TRUE.equals(producto.getActive())) {
            producto.setActive(false);
            productoRepository.save(producto);
            auditoriaService.registrar("DELETE", "PRODUCTO", producto.getId(),
                    "Producto desactivado: " + producto.getCode() + " — " + producto.getName());
        }
    }

    /**
     * Aplica una entrada o salida de stock sobre un repuesto.
     *
     * <p>La operación se realiza con bloqueo pesimista de la fila del producto para
     * evitar pérdidas de actualización, exige cantidad mayor que cero y tipo {@code IN} u
     * {@code OUT}, y rechaza las salidas sin existencias suficientes. Registra siempre un
     * movimiento de inventario y, cuando una salida deja el stock igual o por debajo del
     * mínimo, notifica a los roles de administración, gerencia y almacén. El movimiento
     * queda también en la auditoría.</p>
     *
     * @param productId identificador del producto
     * @param solicitud datos del ajuste (cantidad, tipo y referencia)
     * @return el producto con el stock actualizado
     * @throws IllegalArgumentException si la cantidad no es válida, el tipo no es
     *                                  {@code IN}/{@code OUT} o no hay stock suficiente
     * @throws ResourceNotFoundException si el producto no existe
     */
    @Transactional
    public Producto aplicarCambioStock(Long productId, AjusteStockRequest solicitud) {
        if (solicitud == null || solicitud.quantity() == null || solicitud.quantity() < 1) {
            throw new IllegalArgumentException("La cantidad debe ser mayor a 0");
        }
        String type = solicitud.type() == null ? "" : solicitud.type().trim().toUpperCase();
        if (!"IN".equals(type) && !"OUT".equals(type)) {
            throw new IllegalArgumentException("El tipo de movimiento debe ser IN u OUT");
        }
        Producto producto = productoRepository.findWithLockingById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        Usuario usuario = usuarioActual();
        if (usuario == null) {
            throw new IllegalStateException("No se pudo identificar al usuario autenticado");
        }
        int disponible = producto.getCurrentStock() == null ? 0 : producto.getCurrentStock();
        if ("OUT".equals(type) && disponible < solicitud.quantity()) {
            throw new IllegalArgumentException("Stock insuficiente para «" + producto.getName()
                    + "». Disponible: " + disponible + ", solicitado: " + solicitud.quantity());
        }
        producto.setCurrentStock("IN".equals(type) ? disponible + solicitud.quantity() : disponible - solicitud.quantity());
        BigDecimal unitPrice = "IN".equals(type)
                ? (producto.getPurchasePrice() != null ? producto.getPurchasePrice() : BigDecimal.ZERO)
                : (producto.getSalePrice() != null ? producto.getSalePrice() : BigDecimal.ZERO);
        String reference = solicitud.reference() == null ? "" : solicitud.reference().trim();
        registrarMovimiento(producto, type, solicitud.quantity(), unitPrice,
                reference.isEmpty() ? null : reference, usuario);
        Producto guardado = productoRepository.save(producto);
        auditoriaService.registrar("MOVEMENT", "PRODUCTO", guardado.getId(),
                "Movimiento de inventario " + type + " x" + solicitud.quantity()
                        + (reference.isEmpty() ? "" : " (ref: " + reference + ")") + " — " + guardado.getName());
        if ("OUT".equals(type) && guardado.getCurrentStock() <= guardado.getMinStock()) {
            notificacionService.notificarRol(List.of("ROLE_ADMIN", "ROLE_MANAGER", "ROLE_STOREKEEPER"),
                    "INVENTARIO", "Stock bajo",
                    "El producto «" + guardado.getName() + "» quedó con " + guardado.getCurrentStock()
                            + " unidades (mínimo " + guardado.getMinStock() + ").",
                    "/inventario");
        }
        return guardado;
    }

    /**
     * Registra la entrada de mercancía procedente de una recepción de compra.
     * El producto se bloquea durante la operación para conservar la consistencia del stock
     * cuando existen recepciones concurrentes o ajustes manuales.
     */
    @Transactional
    public Producto registrarEntradaCompra(Long productId, Integer quantity, BigDecimal unitCost, String reference) {
        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException("La cantidad recibida debe ser mayor a 0");
        }
        if (unitCost == null || unitCost.signum() < 0) {
            throw new IllegalArgumentException("El costo unitario no puede ser negativo");
        }
        Producto producto = productoRepository.findWithLockingById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        Usuario usuario = usuarioActual();
        if (usuario == null) {
            throw new IllegalStateException("No se pudo identificar al usuario autenticado");
        }
        int disponible = producto.getCurrentStock() == null ? 0 : producto.getCurrentStock();
        producto.setCurrentStock(disponible + quantity);
        producto.setPurchasePrice(unitCost);
        registrarMovimiento(producto, "IN", quantity, unitCost, reference, usuario);
        Producto guardado = productoRepository.save(producto);
        auditoriaService.registrar("MOVEMENT", "PRODUCTO", guardado.getId(),
                "Entrada por compra x" + quantity + " (ref: " + reference + ") — " + guardado.getName());
        return guardado;
    }

    @Transactional
    public Producto registrarSalidaDevolucionCompra(Long productId, Integer quantity, BigDecimal unitCost, String reference) {
        Producto producto = productoRepository.findWithLockingById(productId).orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        Usuario usuario = usuarioActual();
        if (usuario == null) throw new IllegalStateException("No se pudo identificar al usuario autenticado");
        int stock = producto.getCurrentStock() == null ? 0 : producto.getCurrentStock();
        if (quantity == null || quantity < 1 || stock < quantity) throw new IllegalArgumentException("Stock insuficiente para registrar la devolución");
        producto.setCurrentStock(stock - quantity);
        registrarMovimiento(producto, "OUT", quantity, unitCost, reference, usuario);
        Producto guardado = productoRepository.save(producto);
        auditoriaService.registrar("MOVEMENT", "PRODUCTO", guardado.getId(), "Devolución a proveedor x" + quantity + " (ref: " + reference + ")");
        return guardado;
    }

    /**
     * Lista los movimientos de inventario de un repuesto, del más reciente al más antiguo.
     *
     * @param productId identificador del producto
     * @return los movimientos del producto
     * @throws ResourceNotFoundException si el producto no existe
     */
    @Transactional(readOnly = true)
    public List<MovimientoInventario> obtenerMovimientos(Long productId) {
        obtenerPorId(productId);
        return movimientoInventarioRepository.findByProductIdOrderByTransactionDateDesc(productId);
    }

    private MovimientoInventario registrarMovimiento(Producto producto, String type, Integer quantity,
                                                    BigDecimal unitPrice, String reference, Usuario usuario) {
        return movimientoInventarioRepository.save(MovimientoInventario.builder()
                .product(producto)
                .type(type)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .reference(reference)
                .user(usuario)
                .transactionDate(LocalDateTime.now())
                .build());
    }

    private void normalizarProducto(Producto producto) {
        if (producto.getCode() != null) {
            producto.setCode(producto.getCode().trim());
        }
        if (producto.getName() != null) {
            producto.setName(producto.getName().trim());
        }
    }

    private Usuario usuarioActual() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof UserDetailsImpl principal) {
            return usuarioRepository.findById(principal.getId()).orElse(null);
        }
        return null;
    }
}
