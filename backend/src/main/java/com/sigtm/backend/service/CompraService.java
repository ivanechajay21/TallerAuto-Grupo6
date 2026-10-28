package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearOrdenCompraRequest;
import com.sigtm.backend.dto.RecepcionarCompraRequest;
import com.sigtm.backend.dto.DevolverCompraRequest;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.HistorialOrdenCompraRepository;
import com.sigtm.backend.repository.DevolucionCompraRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.RecepcionCompraRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.security.services.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/** Emite órdenes de compra y registra recepciones que incrementan el inventario. */
@Service
@RequiredArgsConstructor
public class CompraService {
    private final OrdenCompraRepository ordenCompraRepository;
    private final RecepcionCompraRepository recepcionCompraRepository;
    private final ProveedorService proveedorService;
    private final ProductoRepository productoRepository;
    private final ProductoService productoService;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoriaService;
    private final HistorialOrdenCompraRepository orderHistory;
    private final DevolucionCompraRepository returns;

    @Transactional(readOnly = true)
    public List<OrdenCompra> listar() {
        return ordenCompraRepository.findAllByOrderByIssueDateDescIdDesc();
    }

    @Transactional(readOnly = true)
    public OrdenCompra obtener(Long id) {
        return ordenCompraRepository.findDetailedById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada"));
    }

    @Transactional
    public OrdenCompra crear(CrearOrdenCompraRequest request) {
        return crearDocumento(request, "OC-", "PENDIENTE_APROBACION");
    }

    @Transactional public OrdenCompra crearDesdeSolicitud(Long supplierId, List<DetalleSolicitudCompra> items, String notes) {
        return crear(new CrearOrdenCompraRequest(supplierId, null, notes, items.stream().map(i -> new CrearOrdenCompraRequest.Item(i.getProduct().getId(), i.getQuantity(), i.getProduct().getPurchasePrice())).toList()));
    }

    @Transactional
    public OrdenCompra crearCotizacion(CrearOrdenCompraRequest request) {
        return crearDocumento(request, "COT-", "COTIZACION");
    }

    private OrdenCompra crearDocumento(CrearOrdenCompraRequest request, String prefix, String status) {
        Proveedor proveedor = proveedorService.obtener(request.supplierId());
        if (!Boolean.TRUE.equals(proveedor.getActive())) {
            throw new IllegalArgumentException("No se puede comprar a un proveedor inactivo");
        }
        Set<Long> productIds = new HashSet<>();
        OrdenCompra orden = OrdenCompra.builder()
                .code(prefix + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .supplier(proveedor).status(status).issueDate(LocalDate.now())
                .expectedDate(request.expectedDate()).notes(limpiar(request.notes()))
                .total(BigDecimal.ZERO).build();
        BigDecimal total = BigDecimal.ZERO;
        for (CrearOrdenCompraRequest.Item linea : request.items()) {
            if (!productIds.add(linea.productId())) {
                throw new IllegalArgumentException("Un producto solo puede aparecer una vez en la orden");
            }
            Producto producto = productoRepository.findById(linea.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + linea.productId()));
            if (!Boolean.TRUE.equals(producto.getActive())) {
                throw new IllegalArgumentException("No se puede comprar un producto inactivo: " + producto.getName());
            }
            orden.getItems().add(DetalleOrdenCompra.builder().purchaseOrder(orden).product(producto)
                    .requestedQuantity(linea.quantity()).receivedQuantity(0).returnedQuantity(0).unitCost(linea.unitCost()).build());
            total = total.add(linea.unitCost().multiply(BigDecimal.valueOf(linea.quantity())));
        }
        orden.setTotal(total);
        OrdenCompra guardada = ordenCompraRepository.save(orden);
        evento(guardada, "EMISION", null, guardada.getStatus(), "Documento emitido");
        auditoriaService.registrar("CREATE", "ORDEN_COMPRA", guardada.getId(),
                "Orden " + guardada.getCode() + " emitida para " + proveedor.getBusinessName());
        return obtener(guardada.getId());
    }

    @Transactional
    public RecepcionCompra recepcionar(Long orderId, RecepcionarCompraRequest request) {
        OrdenCompra orden = obtener(orderId);
        if (!Set.of("PENDIENTE", "PARCIAL").contains(orden.getStatus())) {
            throw new IllegalArgumentException("Solo se pueden recibir órdenes pendientes o parciales");
        }
        Usuario usuario = usuarioActual();
        if (usuario == null) throw new IllegalStateException("No se pudo identificar al usuario autenticado");
        Map<Long, DetalleOrdenCompra> lineas = new HashMap<>();
        orden.getItems().forEach(item -> lineas.put(item.getId(), item));
        Set<Long> recibidas = new HashSet<>();
        RecepcionCompra recepcion = RecepcionCompra.builder()
                .receiptNumber("RC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .purchaseOrder(orden).receivedAt(LocalDateTime.now()).receivedBy(usuario)
                .notes(limpiar(request.notes())).build();
        for (RecepcionarCompraRequest.Item linea : request.items()) {
            if (!recibidas.add(linea.purchaseItemId())) {
                throw new IllegalArgumentException("Una línea no puede recibirse más de una vez en la misma recepción");
            }
            DetalleOrdenCompra detalle = lineas.get(linea.purchaseItemId());
            if (detalle == null) throw new IllegalArgumentException("El detalle no pertenece a la orden de compra");
            int pendiente = detalle.getRequestedQuantity() - detalle.getReceivedQuantity();
            if (linea.quantity() > pendiente) {
                throw new IllegalArgumentException("La cantidad recibida supera el pendiente para " + detalle.getProduct().getName());
            }
            productoService.registrarEntradaCompra(detalle.getProduct().getId(), linea.quantity(), detalle.getUnitCost(),
                    "Compra " + orden.getCode() + " / " + recepcion.getReceiptNumber());
            detalle.setReceivedQuantity(detalle.getReceivedQuantity() + linea.quantity());
            recepcion.getItems().add(DetalleRecepcionCompra.builder().receipt(recepcion).purchaseItem(detalle)
                    .product(detalle.getProduct()).quantity(linea.quantity()).unitCost(detalle.getUnitCost()).build());
        }
        orden.setStatus(orden.getItems().stream().allMatch(i -> i.getReceivedQuantity() >= i.getRequestedQuantity())
                ? "RECIBIDA" : "PARCIAL");
        ordenCompraRepository.save(orden);
        RecepcionCompra guardada = recepcionCompraRepository.save(recepcion);
        evento(orden, "RECEPCION", "PENDIENTE", orden.getStatus(), "Recepción " + guardada.getReceiptNumber());
        auditoriaService.registrar("CREATE", "RECEPCION_COMPRA", guardada.getId(),
                "Recepción " + guardada.getReceiptNumber() + " para " + orden.getCode());
        return guardada;
    }

    @Transactional(readOnly = true)
    public List<RecepcionCompra> listarRecepciones(Long orderId) {
        obtener(orderId);
        return recepcionCompraRepository.findByPurchaseOrderIdOrderByReceivedAtDesc(orderId);
    }

    @Transactional
    public OrdenCompra anular(Long id) {
        OrdenCompra orden = obtener(id);
        if (!"PENDIENTE".equals(orden.getStatus())) {
            throw new IllegalArgumentException("Solo se puede anular una orden sin recepciones");
        }
        orden.setStatus("ANULADA");
        evento(orden, "ANULACION", "PENDIENTE", "ANULADA", "Orden anulada sin recepción");
        OrdenCompra guardada = ordenCompraRepository.save(orden);
        auditoriaService.registrar("UPDATE", "ORDEN_COMPRA", guardada.getId(), "Orden anulada: " + guardada.getCode());
        return guardada;
    }

    @Transactional
    public OrdenCompra aprobar(Long id) {
        OrdenCompra orden = obtener(id);
        if (!"PENDIENTE_APROBACION".equals(orden.getStatus())) throw new IllegalArgumentException("La orden no está pendiente de aprobación");
        orden.setStatus("PENDIENTE");
        evento(orden, "APROBACION", "PENDIENTE_APROBACION", "PENDIENTE", "Orden aprobada");
        auditoriaService.registrar("UPDATE", "ORDEN_COMPRA", orden.getId(), "Orden aprobada: " + orden.getCode());
        return ordenCompraRepository.save(orden);
    }

    @Transactional
    public OrdenCompra aceptarCotizacion(Long id) {
        OrdenCompra cotizacion = obtener(id);
        if (!"COTIZACION".equals(cotizacion.getStatus())) throw new IllegalArgumentException("El documento no es una cotización vigente");
        cotizacion.setStatus("PENDIENTE_APROBACION");
        evento(cotizacion, "COTIZACION_ACEPTADA", "COTIZACION", "PENDIENTE_APROBACION", "Oferta seleccionada");
        auditoriaService.registrar("UPDATE", "COTIZACION", cotizacion.getId(), "Cotización aceptada: " + cotizacion.getCode());
        return ordenCompraRepository.save(cotizacion);
    }

    @Transactional
    public OrdenCompra devolver(Long id, DevolverCompraRequest request) {
        OrdenCompra orden = obtener(id); Map<Long, DetalleOrdenCompra> lineas = new HashMap<>(); orden.getItems().forEach(i -> lineas.put(i.getId(), i));
        DevolucionCompra devolucion = DevolucionCompra.builder().number("DC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT)).purchaseOrder(orden).returnedAt(LocalDateTime.now()).reason(request.reason() == null || request.reason().isBlank() ? "Devolución a proveedor" : request.reason().trim()).build();
        for (DevolverCompraRequest.Item item : request.items()) {
            DetalleOrdenCompra detalle = lineas.get(item.purchaseItemId());
            if (detalle == null || item.quantity() > detalle.getReceivedQuantity() - detalle.getReturnedQuantity()) throw new IllegalArgumentException("La devolución supera la cantidad disponible");
            productoService.registrarSalidaDevolucionCompra(detalle.getProduct().getId(), item.quantity(), detalle.getUnitCost(), "Devolución " + orden.getCode());
            detalle.setReturnedQuantity(detalle.getReturnedQuantity() + item.quantity());
            devolucion.getItems().add(DetalleDevolucionCompra.builder().returnDocument(devolucion).purchaseItem(detalle).product(detalle.getProduct()).quantity(item.quantity()).unitCost(detalle.getUnitCost()).build());
        }
        returns.save(devolucion);
        auditoriaService.registrar("CREATE", "DEVOLUCION_COMPRA", orden.getId(), "Devolución registrada para " + orden.getCode());
        return ordenCompraRepository.save(orden);
    }

    @Transactional(readOnly = true)
    public List<DevolucionCompra> devoluciones(Long id) { obtener(id); return returns.findByPurchaseOrderIdOrderByReturnedAtDesc(id); }

    @Transactional(readOnly = true)
    public List<HistorialOrdenCompra> historial(Long id) {
        obtener(id);
        return orderHistory.findByPurchaseOrderIdOrderByOccurredAtDesc(id);
    }

    private void evento(OrdenCompra order, String type, String before, String after, String details) {
        orderHistory.save(HistorialOrdenCompra.builder().purchaseOrder(order).eventType(type)
                .previousStatus(before).newStatus(after).occurredAt(LocalDateTime.now()).details(details).build());
    }

    private String limpiar(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private Usuario usuarioActual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl principal
                ? usuarioRepository.findById(principal.getId()).orElse(null) : null;
    }
}
