package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.SeguimientoCompra;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.SeguimientoCompraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * Registra el avance logístico de una orden de compra.
 *
 * <p>Las respuestas se mapean a DTOs dentro de la transacción y las
 * transiciones de estado impiden retrocesos y entregas sin fecha real.</p>
 */
@Service
@RequiredArgsConstructor
public class SeguimientoCompraService {

    private static final Set<String> ESTADOS = Set.of("ENVIADA", "EN_TRANSITO", "ENTREGADA", "DEMORADA");
    private static final Set<String> ORDENES_SEGUIBLES = Set.of("PENDIENTE", "PARCIAL", "RECIBIDA");

    private final SeguimientoCompraRepository tracking;
    private final OrdenCompraRepository orders;
    private final AuditoriaService audit;

    @Transactional
    public SeguimientoCompra actualizar(Long orderId, SeguimientoCompra data) {
        OrdenCompra order = orders.findDetailedById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada"));
        if (order.getStatus() != null && !ORDENES_SEGUIBLES.contains(order.getStatus())) {
            throw new IllegalArgumentException("La orden no admite seguimiento en su estado actual");
        }
        if (data.getStatus() == null || !ESTADOS.contains(data.getStatus())) {
            throw new IllegalArgumentException("Estado logístico inválido");
        }
        if ("ENTREGADA".equals(data.getStatus()) && data.getActualArrival() == null) {
            throw new IllegalArgumentException("La entrega requiere fecha real de llegada");
        }
        SeguimientoCompra trackingValue = tracking.findByPurchaseOrderId(orderId)
                .orElse(SeguimientoCompra.builder().purchaseOrder(order).build());
        if (trackingValue.getId() != null && rank(data.getStatus()) < rank(trackingValue.getStatus())) {
            throw new IllegalArgumentException("El seguimiento no puede retroceder de estado");
        }
        trackingValue.setStatus(data.getStatus());
        trackingValue.setDispatchedAt(data.getDispatchedAt());
        trackingValue.setEstimatedArrival(data.getEstimatedArrival());
        trackingValue.setActualArrival(data.getActualArrival());
        trackingValue.setShippingGuide(data.getShippingGuide());
        trackingValue.setCarrier(data.getCarrier());
        trackingValue.setNotes(data.getNotes());
        trackingValue = tracking.save(trackingValue);
        audit.registrar("UPDATE", "SEGUIMIENTO_COMPRA", trackingValue.getId(),
                "Seguimiento " + order.getCode() + ": " + trackingValue.getStatus());
        return trackingValue;
    }

    @Transactional(readOnly = true)
    public SeguimientoCompra obtener(Long orderId) {
        return tracking.findByPurchaseOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Seguimiento no encontrado"));
    }

    @Transactional
    public ComprasResponses.SeguimientoCompraResponse actualizarDto(Long orderId, SeguimientoCompra data) {
        return ComprasResponses.SeguimientoCompraResponse.from(actualizar(orderId, data));
    }

    @Transactional(readOnly = true)
    public ComprasResponses.SeguimientoCompraResponse obtenerDto(Long orderId) {
        return ComprasResponses.SeguimientoCompraResponse.from(obtener(orderId));
    }

    private int rank(String status) {
        return switch (status == null ? "" : status) {
            case "ENVIADA" -> 1;
            case "EN_TRANSITO" -> 2;
            case "DEMORADA" -> 3;
            case "ENTREGADA" -> 4;
            default -> 0;
        };
    }
}
