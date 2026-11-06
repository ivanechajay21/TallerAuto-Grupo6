package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Factura;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.TipoComprobante;
import com.sigtm.backend.model.TipoDocumento;
import com.sigtm.backend.repository.FacturaRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Emite y registra el cobro de los comprobantes asociados a las órdenes de trabajo.
 *
 * <p>Los importes se calculan a partir de los ítems de la orden aplicando un IGV del
 * 18 %. Cada emisión reserva un correlativo propio de la serie de factura o de
 * boleta y toda emisión o pago queda registrado en la auditoría.</p>
 */
@Service
@RequiredArgsConstructor
public class FacturaService {

    private static final BigDecimal TASA_IGV = new BigDecimal("0.18");
    private static final Set<String> METODOS_PAGO = Set.of("CASH", "CARD", "TRANSFER");

    private final FacturaRepository facturaRepository;
    private final OrdenTrabajoRepository ordenTrabajoRepository;
    private final AuditoriaService auditoriaService;
    private final CorrelativoComprobanteService correlativoComprobanteService;

    /**
     * Lista todos los comprobantes emitidos, con el resumen de la orden de trabajo asociada.
     *
     * @return la colección de comprobantes en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerTodas() {
        return facturaRepository.findAll().stream().map(this::aMapa).toList();
    }

    /**
     * Obtiene un comprobante por su identificador.
     *
     * @param id identificador del comprobante
     * @return el comprobante solicitado en formato {@code Map}
     * @throws ResourceNotFoundException si el comprobante no existe
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerPorId(Long id) {
        return aMapa(facturaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada")));
    }

    /**
     * Emite una factura para una orden de trabajo.
     *
     * <p>Se conserva esta sobrecarga para los clientes antiguos que no envían el
     * tipo de comprobante.</p>
     *
     * @param workOrderId identificador de la orden de trabajo
     * @return la factura emitida en formato {@code Map}
     */
    @Transactional
    public Map<String, Object> generarFactura(Long workOrderId) {
        return generarFactura(workOrderId, TipoComprobante.FACTURA);
    }

    /**
     * Emite una factura o una boleta para una orden de trabajo.
     *
     * <p>Solo pueden facturarse órdenes en estado {@code FINALIZADO} o
     * {@code ENTREGADO}, con al menos un ítem y una sola vez por orden. La factura
     * exige que el cliente tenga RUC; la boleta admite DNI o RUC. El número se
     * forma con la serie del tipo elegido y un correlativo secuencial por año.</p>
     *
     * @param workOrderId      identificador de la orden de trabajo
     * @param tipoComprobante  factura o boleta; si es {@code null}, se asume factura
     * @return el comprobante emitido en formato {@code Map}
     */
    @Transactional
    public Map<String, Object> generarFactura(Long workOrderId, TipoComprobante tipoComprobante) {
        TipoComprobante tipo = tipoComprobante != null ? tipoComprobante : TipoComprobante.FACTURA;

        OrdenTrabajo workOrder = ordenTrabajoRepository.findById(workOrderId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden de trabajo no encontrada"));

        if (!"FINALIZADO".equals(workOrder.getStatus()) && !"ENTREGADO".equals(workOrder.getStatus())) {
            throw new IllegalArgumentException("La orden debe estar FINALIZADO o ENTREGADO para facturar");
        }

        if (facturaRepository.findByWorkOrderId(workOrderId).isPresent()) {
            throw new DuplicateResourceException("Esta orden ya tiene una factura emitida");
        }

        List<ItemOrdenTrabajo> items = workOrder.getItems();
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("La orden no tiene ítems para facturar");
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        for (ItemOrdenTrabajo item : items) {
            if (item.getPrice() == null || item.getPrice().signum() < 0) {
                throw new IllegalArgumentException("El precio de los ítems no puede ser negativo");
            }
            if (item.getQuantity() == null || item.getQuantity() < 1) {
                throw new IllegalArgumentException("La cantidad de los ítems debe ser mayor a cero");
            }
            subtotal = subtotal.add(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }
        if (subtotal.signum() <= 0) {
            throw new IllegalArgumentException("El importe de la orden debe ser mayor a cero");
        }

        String documento = normalizarDocumento(workOrder);
        TipoDocumento tipoDocumento = tipoDocumento(documento);
        validarDocumento(tipo, tipoDocumento);

        BigDecimal taxAmount = subtotal.multiply(TASA_IGV).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.add(taxAmount).setScale(2, RoundingMode.HALF_UP);

        LocalDateTime issueDate = LocalDateTime.now();
        long correlativo = correlativoComprobanteService.siguiente(tipo, issueDate.getYear());
        String invoiceNumber = String.format(Locale.ROOT, "%s-%08d", tipo.getSerie(), correlativo);

        Factura factura = Factura.builder()
                .invoiceNumber(invoiceNumber)
                .documentType(tipo)
                .series(tipo.getSerie())
                .correlative(correlativo)
                .customerDocumentType(tipoDocumento)
                .issueDate(issueDate)
                .workOrder(workOrder)
                .subtotal(subtotal.setScale(2, RoundingMode.HALF_UP))
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .status("PENDING")
                .build();

        Factura guardada;
        try {
            guardada = facturaRepository.save(factura);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException("La orden ya tiene un comprobante emitido o el correlativo ya fue usado");
        }

        auditoriaService.registrar("CREATE", "FACTURA", guardada.getId(),
                "Emisión de " + tipo.getEtiqueta().toLowerCase(Locale.ROOT) + " " + guardada.getInvoiceNumber()
                        + " para la orden " + workOrder.getOrderNumber()
                        + " (total S/ " + guardada.getTotalAmount() + ")");
        return aMapa(guardada);
    }

    /**
     * Registra el pago de un comprobante pendiente.
     *
     * <p>Solo se puede pagar un comprobante en estado {@code PENDING}. El método
     * de pago debe ser {@code CASH}, {@code CARD} o {@code TRANSFER}. El cobro se
     * registra en la auditoría con la acción {@code PAYMENT}.</p>
     *
     * @param id            identificador del comprobante
     * @param paymentMethod método de pago empleado
     * @return el comprobante pagado en formato {@code Map}
     */
    @Transactional
    public Map<String, Object> pagarFactura(Long id, String paymentMethod) {
        Factura factura = facturaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada"));

        if (!"PENDING".equals(factura.getStatus())) {
            throw new IllegalArgumentException("Solo se puede pagar un comprobante pendiente");
        }

        String metodo = paymentMethod != null ? paymentMethod.trim().toUpperCase(Locale.ROOT) : "";
        if (!METODOS_PAGO.contains(metodo)) {
            throw new IllegalArgumentException("Método de pago inválido. Usa CASH, CARD o TRANSFER");
        }

        factura.setStatus("PAID");
        factura.setPaymentMethod(metodo);
        Factura guardada = facturaRepository.save(factura);
        auditoriaService.registrar("PAYMENT", "FACTURA", guardada.getId(),
                "Pago de " + etiqueta(guardada) + " " + guardada.getInvoiceNumber() + " por " + metodo
                        + " (total S/ " + guardada.getTotalAmount() + ")");
        return aMapa(guardada);
    }

    private String normalizarDocumento(OrdenTrabajo workOrder) {
        if (workOrder.getCustomer() == null
                || workOrder.getCustomer().getDocumentNumber() == null
                || workOrder.getCustomer().getDocumentNumber().isBlank()) {
            throw new IllegalArgumentException("El cliente de la orden no tiene documento de identidad");
        }
        String documento = workOrder.getCustomer().getDocumentNumber().replaceAll("\\D", "");
        if (documento.isBlank()) {
            throw new IllegalArgumentException("El documento del cliente no es válido");
        }
        return documento;
    }

    private TipoDocumento tipoDocumento(String documento) {
        return switch (documento.length()) {
            case 8 -> TipoDocumento.DNI;
            case 11 -> TipoDocumento.RUC;
            default -> TipoDocumento.OTRO;
        };
    }

    private void validarDocumento(TipoComprobante tipo, TipoDocumento tipoDocumento) {
        if (tipo == TipoComprobante.FACTURA && tipoDocumento != TipoDocumento.RUC) {
            throw new IllegalArgumentException("Para emitir una factura el cliente debe tener RUC de 11 dígitos");
        }
        if (tipo == TipoComprobante.BOLETA && tipoDocumento == TipoDocumento.OTRO) {
            throw new IllegalArgumentException("Para emitir una boleta el cliente debe tener DNI de 8 dígitos o RUC de 11 dígitos");
        }
    }

    private String etiqueta(Factura factura) {
        return factura.getDocumentType() == TipoComprobante.BOLETA ? "boleta" : "factura";
    }

    private Map<String, Object> aMapa(Factura factura) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", factura.getId());
        m.put("invoiceNumber", factura.getInvoiceNumber());
        m.put("documentType", factura.getDocumentType() != null ? factura.getDocumentType().name() : null);
        m.put("documentTypeLabel", factura.getDocumentType() != null ? factura.getDocumentType().getEtiqueta() : null);
        m.put("series", factura.getSeries());
        m.put("correlative", factura.getCorrelative());
        m.put("customerDocumentType", factura.getCustomerDocumentType() != null
                ? factura.getCustomerDocumentType().name() : null);
        m.put("issueDate", factura.getIssueDate() != null
                ? factura.getIssueDate().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME) : null);
        m.put("subtotal", factura.getSubtotal());
        m.put("taxAmount", factura.getTaxAmount());
        m.put("totalAmount", factura.getTotalAmount());
        m.put("status", factura.getStatus());
        m.put("paymentMethod", factura.getPaymentMethod());

        OrdenTrabajo ot = factura.getWorkOrder();
        if (ot != null) {
            Map<String, Object> datosOrden = new HashMap<>();
            datosOrden.put("id", ot.getId());
            datosOrden.put("orderNumber", ot.getOrderNumber());
            if (ot.getCustomer() != null) {
                m.put("customer", ot.getCustomer().getFirstName() + " " + ot.getCustomer().getLastName());
                m.put("documentNumber", ot.getCustomer().getDocumentNumber());
                m.put("customerPhone", ot.getCustomer().getPhone());
            }
            if (ot.getVehicle() != null) {
                m.put("vehicle", ot.getVehicle().getPlate() + " · " + ot.getVehicle().getBrand() + " " + ot.getVehicle().getModel());
                m.put("vehiclePlate", ot.getVehicle().getPlate());
                m.put("vehicleBrand", ot.getVehicle().getBrand());
                m.put("vehicleModel", ot.getVehicle().getModel());
                m.put("vehicleYear", ot.getVehicle().getYear());
            }
            m.put("items", itemsDe(ot));
            m.put("workOrder", datosOrden);
        }
        return m;
    }

    private List<Map<String, Object>> itemsDe(OrdenTrabajo orden) {
        List<Map<String, Object>> lineas = new ArrayList<>();
        if (orden.getItems() == null) {
            return lineas;
        }
        for (ItemOrdenTrabajo item : orden.getItems()) {
            BigDecimal precio = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
            int cantidad = item.getQuantity() != null ? item.getQuantity() : 1;
            Map<String, Object> linea = new LinkedHashMap<>();
            linea.put("id", item.getId());
            linea.put("description", descripcionItem(item));
            linea.put("quantity", cantidad);
            linea.put("unitPrice", precio);
            linea.put("lineTotal", precio.multiply(BigDecimal.valueOf(cantidad)));
            lineas.add(linea);
        }
        return lineas;
    }

    private String descripcionItem(ItemOrdenTrabajo item) {
        if (item.getDescription() != null && !item.getDescription().isBlank()) {
            return item.getDescription();
        }
        if (item.getServiceCatalog() != null && item.getServiceCatalog().getName() != null) {
            return item.getServiceCatalog().getName();
        }
        if (item.getProduct() != null && item.getProduct().getName() != null) {
            return item.getProduct().getName();
        }
        return "Servicio de taller";
    }
}
