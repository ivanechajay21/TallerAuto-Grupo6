package com.sigtm.backend.service;

import com.sigtm.backend.dto.TableroAbastecimientoResponse;
import com.sigtm.backend.model.EvaluacionProveedor;
import com.sigtm.backend.model.FacturaProveedor;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.repository.EvaluacionProveedorRepository;
import com.sigtm.backend.repository.FacturaProveedorRepository;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.SeguimientoCompraRepository;
import com.sigtm.backend.repository.SolicitudCompraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Indicadores agregados del abastecimiento.
 *
 * <p>Incluye productos críticos, solicitudes y órdenes pendientes, entregas
 * demoradas, deuda abierta y el ranking de proveedores por evaluación.</p>
 */
@Service
@RequiredArgsConstructor
public class TableroAbastecimientoService {

    private static final Set<String> ESTADOS_ORDEN_ABIERTA = Set.of(
            "PENDIENTE_APROBACION", "PENDIENTE", "PARCIAL");

    private final ProductoRepository products;
    private final SolicitudCompraRepository requests;
    private final OrdenCompraRepository orders;
    private final FacturaProveedorRepository invoices;
    private final SeguimientoCompraRepository tracking;
    private final EvaluacionProveedorRepository evaluations;

    @Transactional(readOnly = true)
    public TableroAbastecimientoResponse obtener() {
        long critical = products.findByActiveTrue().stream()
                .filter(product -> product.getCurrentStock() != null && product.getMinStock() != null)
                .filter(product -> product.getCurrentStock() <= product.getMinStock())
                .count();
        long pendingRequests = requests.findAll().stream()
                .filter(request -> "PENDIENTE".equals(request.getStatus()))
                .count();
        long pendingOrders = orders.findAll().stream()
                .filter(order -> ESTADOS_ORDEN_ABIERTA.contains(order.getStatus()))
                .count();
        long delayed = orders.findAll().stream()
                .filter(order -> tracking.findByPurchaseOrderId(order.getId())
                        .map(value -> "DEMORADA".equals(value.getStatus()))
                        .orElse(false))
                .count();
        BigDecimal debt = invoices.findAll().stream()
                .filter(invoice -> !"ANULADA".equals(invoice.getStatus()))
                .map(FacturaProveedor::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Map<String, Object>> actions = new ArrayList<>();
        if (critical > 0) actions.add(Map.of("type", "REPOSICION",
                "message", critical + " productos requieren reposición"));
        if (delayed > 0) actions.add(Map.of("type", "LOGISTICA",
                "message", delayed + " entregas están demoradas"));
        if (debt.signum() > 0) actions.add(Map.of("type", "PAGOS",
                "message", "Existen cuentas por pagar abiertas"));

        return new TableroAbastecimientoResponse(critical, pendingRequests, pendingOrders,
                delayed, debt, topSuppliers(), actions);
    }

    private List<Map<String, Object>> topSuppliers() {
        Map<Long, List<EvaluacionProveedor>> grouped = evaluations.findAll().stream()
                .filter(evaluation -> evaluation.getSupplier() != null)
                .collect(Collectors.groupingBy(evaluation -> evaluation.getSupplier().getId()));
        return grouped.values().stream()
                .map(this::supplierSummary)
                .sorted(Comparator.comparingDouble(
                        (Map<String, Object> row) -> ((BigDecimal) row.get("averageScore")).doubleValue()).reversed())
                .limit(5)
                .toList();
    }

    private Map<String, Object> supplierSummary(List<EvaluacionProveedor> supplierEvaluations) {
        EvaluacionProveedor first = supplierEvaluations.getFirst();
        double average = supplierEvaluations.stream()
                .mapToDouble(evaluation -> (evaluation.getQualityScore() + evaluation.getDeliveryScore()
                        + evaluation.getServiceScore()) / 3.0)
                .average()
                .orElse(0);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("supplierId", first.getSupplier().getId());
        row.put("supplier", first.getSupplier().getBusinessName());
        row.put("averageScore", BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP));
        row.put("evaluations", supplierEvaluations.size());
        return row;
    }
}
