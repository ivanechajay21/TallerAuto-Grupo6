package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.dto.CrearFacturaProveedorRequest;
import com.sigtm.backend.dto.RegistrarPagoProveedorRequest;
import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.FacturaProveedor;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.PagoProveedor;
import com.sigtm.backend.repository.FacturaProveedorRepository;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.PagoProveedorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Gestiona las facturas de proveedor y sus pagos.
 *
 * <p>Las respuestas de la API se entregan como DTOs para no serializar
 * asociaciones LAZY fuera de la transacción. El pago bloquea la factura para
 * evitar que dos cobros concurrentes calculen el mismo saldo.</p>
 */
@Service
@RequiredArgsConstructor
public class CuentaPorPagarService {

    private static final Set<String> METODOS_PAGO = Set.of("CASH", "CARD", "TRANSFER");

    private final FacturaProveedorRepository invoices;
    private final PagoProveedorRepository payments;
    private final OrdenCompraRepository orders;
    private final AuditoriaService audit;

    @Transactional(readOnly = true)
    public List<FacturaProveedor> listar() {
        return invoices.findAll();
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.FacturaProveedorResponse> listarDto() {
        return invoices.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ComprasResponses.FacturaProveedorResponse obtenerDto(Long id) {
        return toResponse(invoices.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Factura de proveedor no encontrada")));
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.PagoProveedorResponse> pagos(Long id) {
        if (!invoices.existsById(id)) {
            throw new ResourceNotFoundException("Factura de proveedor no encontrada");
        }
        return payments.findBySupplierInvoiceIdOrderByPaidAtDesc(id).stream()
                .map(ComprasResponses.PagoProveedorResponse::from).toList();
    }

    @Transactional
    public FacturaProveedor crear(CrearFacturaProveedorRequest request) {
        return crearEntity(request);
    }

    @Transactional
    public ComprasResponses.FacturaProveedorResponse crearDto(CrearFacturaProveedorRequest request) {
        return toResponse(crearEntity(request));
    }

    @Transactional
    public FacturaProveedor pagar(Long id, RegistrarPagoProveedorRequest request) {
        return pagarEntity(id, request);
    }

    @Transactional
    public ComprasResponses.FacturaProveedorResponse pagarDto(Long id, RegistrarPagoProveedorRequest request) {
        return toResponse(pagarEntity(id, request));
    }

    private FacturaProveedor crearEntity(CrearFacturaProveedorRequest request) {
        if (request == null || request.number() == null || request.number().isBlank()) {
            throw new IllegalArgumentException("El número de factura es obligatorio");
        }
        if (request.issueDate() == null || request.dueDate() == null) {
            throw new IllegalArgumentException("Las fechas de emisión y vencimiento son obligatorias");
        }
        if (request.total() == null || request.total().signum() <= 0) {
            throw new IllegalArgumentException("El total de la factura debe ser mayor a cero");
        }
        if (invoices.findByNumber(request.number().trim()).isPresent()) {
            throw new DuplicateResourceException("Número de factura de proveedor duplicado");
        }
        if (request.dueDate().isBefore(request.issueDate())) {
            throw new IllegalArgumentException("La fecha de vencimiento no puede ser anterior a la emisión");
        }
        OrdenCompra order = orders.findDetailedById(request.purchaseOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Orden de compra no encontrada"));
        if (!Set.of("RECIBIDA", "PARCIAL").contains(order.getStatus())) {
            throw new IllegalArgumentException("La orden debe tener una recepción");
        }
        if (invoices.findByPurchaseOrderId(order.getId()).isPresent()) {
            throw new IllegalArgumentException("La orden ya tiene factura de proveedor");
        }
        if (request.total().compareTo(order.getTotal()) > 0) {
            throw new IllegalArgumentException("El total de la factura no puede superar el total de la orden");
        }
        FacturaProveedor invoice = FacturaProveedor.builder()
                .number(request.number().trim())
                .purchaseOrder(order)
                .issueDate(request.issueDate())
                .dueDate(request.dueDate())
                .total(request.total())
                .balance(request.total())
                .status("PENDIENTE")
                .build();
        invoice = invoices.save(invoice);
        audit.registrar("CREATE", "FACTURA_PROVEEDOR", invoice.getId(), "Factura proveedor " + invoice.getNumber());
        return invoice;
    }

    private FacturaProveedor pagarEntity(Long id, RegistrarPagoProveedorRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Los datos del pago son obligatorios");
        }
        FacturaProveedor invoice = invoices.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Factura de proveedor no encontrada"));
        if (!"PENDIENTE".equals(invoice.getStatus()) && !"PARCIAL".equals(invoice.getStatus())) {
            throw new IllegalArgumentException("Solo se pueden pagar facturas pendientes o parciales");
        }
        if (request.amount() == null || request.amount().signum() <= 0) {
            throw new IllegalArgumentException("El monto del pago debe ser mayor a cero");
        }
        if (request.amount().compareTo(invoice.getBalance()) > 0) {
            throw new IllegalArgumentException("El pago supera el saldo");
        }
        String method = request.method() == null ? "" : request.method().trim().toUpperCase(Locale.ROOT);
        if (!METODOS_PAGO.contains(method)) {
            throw new IllegalArgumentException("Método de pago inválido. Usa CASH, CARD o TRANSFER");
        }
        payments.save(PagoProveedor.builder()
                .supplierInvoice(invoice)
                .amount(request.amount())
                .method(method)
                .reference(request.reference())
                .paidAt(LocalDateTime.now())
                .build());
        invoice.setBalance(invoice.getBalance().subtract(request.amount()));
        invoice.setStatus(invoice.getBalance().signum() == 0 ? "PAGADA" : "PARCIAL");
        audit.registrar("UPDATE", "FACTURA_PROVEEDOR", invoice.getId(),
                "Pago " + request.amount() + " para " + invoice.getNumber());
        return invoices.save(invoice);
    }

    private ComprasResponses.FacturaProveedorResponse toResponse(FacturaProveedor invoice) {
        return ComprasResponses.FacturaProveedorResponse.from(invoice,
                payments.findBySupplierInvoiceIdOrderByPaidAtDesc(invoice.getId()));
    }
}
