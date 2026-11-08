package com.sigtm.backend.service;

import com.sigtm.backend.dto.EstadoPresupuestoCompraResponse;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.PresupuestoCompra;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.PresupuestoCompraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.util.Set;

/**
 * Límites mensuales de compra y su consumo.
 *
 * <p>El guardado es un upsert real por período. Solo cuentan como comprometido
 * las órdenes que representan una compra efectiva, no cotizaciones, rechazos
 * ni anulaciones.</p>
 */
@Service
@RequiredArgsConstructor
public class PresupuestoCompraService {

    private static final Set<String> ESTADOS_COMPROMETIDOS = Set.of(
            "PENDIENTE_APROBACION", "PENDIENTE", "PARCIAL", "RECIBIDA");

    private final PresupuestoCompraRepository budgets;
    private final OrdenCompraRepository orders;
    private final AuditoriaService audit;

    @Transactional
    public PresupuestoCompra guardar(PresupuestoCompra data) {
        validar(data);
        PresupuestoCompra budget = budgets.findByPeriod(data.getPeriod().trim())
                .orElseGet(() -> PresupuestoCompra.builder().period(data.getPeriod().trim()).build());
        budget.setLimitAmount(data.getLimitAmount());
        budget.setAlertPercentage(data.getAlertPercentage());
        budget.setActive(data.getActive() == null || data.getActive());
        PresupuestoCompra saved = budgets.save(budget);
        audit.registrar("UPSERT", "PRESUPUESTO_COMPRA", saved.getId(), "Presupuesto " + saved.getPeriod());
        return saved;
    }

    @Transactional(readOnly = true)
    public EstadoPresupuestoCompraResponse estado(String period) {
        validarPeriodo(period);
        PresupuestoCompra budget = budgets.findByPeriod(period)
                .orElseThrow(() -> new ResourceNotFoundException("Presupuesto no encontrado"));
        BigDecimal committed = orders.findAll().stream()
                .filter(order -> ESTADOS_COMPROMETIDOS.contains(order.getStatus()))
                .filter(order -> order.getIssueDate() != null
                        && YearMonth.from(order.getIssueDate()).toString().equals(period))
                .map(OrdenCompra::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal percentage = committed.multiply(BigDecimal.valueOf(100))
                .divide(budget.getLimitAmount(), 2, RoundingMode.HALF_UP);
        String status = percentage.compareTo(BigDecimal.valueOf(100)) >= 0 ? "EXCEDIDO"
                : percentage.compareTo(BigDecimal.valueOf(budget.getAlertPercentage())) >= 0 ? "ALERTA"
                : "DISPONIBLE";
        return new EstadoPresupuestoCompraResponse(period, budget.getLimitAmount(), committed,
                budget.getLimitAmount().subtract(committed), percentage, status);
    }

    private void validar(PresupuestoCompra data) {
        if (data == null) throw new IllegalArgumentException("El presupuesto es obligatorio");
        if (data.getPeriod() == null || data.getPeriod().isBlank()) {
            throw new IllegalArgumentException("El período es obligatorio");
        }
        validarPeriodo(data.getPeriod().trim());
        if (data.getLimitAmount() == null || data.getLimitAmount().signum() <= 0) {
            throw new IllegalArgumentException("El límite debe ser mayor a cero");
        }
        if (data.getAlertPercentage() == null) data.setAlertPercentage(80);
        if (data.getAlertPercentage() < 0 || data.getAlertPercentage() > 100) {
            throw new IllegalArgumentException("El porcentaje de alerta debe estar entre 0 y 100");
        }
    }

    private void validarPeriodo(String period) {
        try {
            YearMonth.parse(period);
        } catch (Exception ex) {
            throw new IllegalArgumentException("El período debe tener formato AAAA-MM");
        }
    }
}
