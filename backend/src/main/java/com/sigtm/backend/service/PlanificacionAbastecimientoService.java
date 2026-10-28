package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearPlanCompraRequest;
import com.sigtm.backend.dto.RegistrarPronosticoDemandaRequest;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

/**
 * Convierte previsiones mensuales de consumo en planes de compra revisables.
 * Un plan no mueve inventario ni emite una orden: al aprobarlo se genera una
 * solicitud interna que recorre el flujo existente de reposición y aprobación.
 */
@Service
@RequiredArgsConstructor
public class PlanificacionAbastecimientoService {
    private final PronosticoDemandaRepository forecasts;
    private final PlanCompraRepository plans;
    private final ProductoRepository products;
    private final SolicitudCompraRepository requests;
    private final AuditoriaService audit;

    @Transactional
    public PronosticoDemanda registrarPronostico(Long productId, RegistrarPronosticoDemandaRequest request) {
        validarPeriodo(request.period());
        Producto product = producto(productId);
        PronosticoDemanda forecast = forecasts.findByProductIdAndPeriod(productId, request.period())
                .orElseGet(() -> PronosticoDemanda.builder().product(product).period(request.period()).build());
        forecast.setForecastQuantity(request.forecastQuantity());
        forecast.setSafetyStock(request.safetyStock());
        forecast.setNotes(limpiar(request.notes()));
        forecast.setRegisteredAt(LocalDateTime.now());
        PronosticoDemanda saved = forecasts.save(forecast);
        audit.registrar("UPSERT", "PRONOSTICO_DEMANDA", saved.getId(), "Pronóstico " + saved.getPeriod() + " para " + product.getCode());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<PronosticoDemanda> listarPronosticos(String period) {
        validarPeriodo(period);
        return forecasts.findByPeriodOrderByProductNameAsc(period);
    }

    /** Genera un borrador calculando demanda prevista + seguridad - stock disponible. */
    @Transactional
    public PlanCompra generarDesdePronosticos(String period, String notes) {
        validarPeriodo(period);
        List<PronosticoDemanda> entries = forecasts.findByPeriodOrderByProductNameAsc(period);
        if (entries.isEmpty()) throw new IllegalArgumentException("No hay pronósticos para el período " + period);
        PlanCompra plan = nuevoPlan(period, notes);
        for (PronosticoDemanda entry : entries) {
            Producto product = entry.getProduct();
            int stock = valor(product.getCurrentStock());
            int requirement = Math.max(0, valor(entry.getForecastQuantity()) + valor(entry.getSafetyStock()) - stock);
            if (requirement > 0) agregarLinea(plan, product, requirement, stock, valor(entry.getForecastQuantity()));
        }
        if (plan.getItems().isEmpty()) throw new IllegalArgumentException("El inventario cubre todos los pronósticos del período");
        return guardarPlan(plan, "Plan generado desde pronósticos");
    }

    /** Permite al responsable crear un plan manual para necesidades no pronosticadas. */
    @Transactional
    public PlanCompra crearPlan(CrearPlanCompraRequest request) {
        validarPeriodo(request.period());
        PlanCompra plan = nuevoPlan(request.period(), request.notes());
        Set<Long> ids = new HashSet<>();
        for (CrearPlanCompraRequest.Item item : request.items()) {
            if (!ids.add(item.productId())) throw new IllegalArgumentException("Un producto no puede repetirse en el plan");
            Producto product = producto(item.productId());
            agregarLinea(plan, product, item.quantity(), valor(product.getCurrentStock()), 0);
        }
        return guardarPlan(plan, "Plan creado manualmente");
    }

    @Transactional(readOnly = true)
    public List<PlanCompra> listarPlanes() { return plans.findAllByOrderByCreatedAtDesc(); }

    @Transactional(readOnly = true)
    public PlanCompra obtenerPlan(Long id) { return plan(id); }

    /** Envía el plan al flujo existente; no crea una orden de compra directamente. */
    @Transactional
    public SolicitudCompra convertirEnSolicitud(Long id) {
        PlanCompra plan = plan(id);
        if (!"BORRADOR".equals(plan.getStatus())) throw new IllegalArgumentException("Solo un plan en borrador puede convertirse en solicitud");
        SolicitudCompra request = SolicitudCompra.builder()
                .code("SC-PL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT))
                .requestedAt(LocalDateTime.now()).status("PENDIENTE")
                .notes("Generada desde " + plan.getCode() + (plan.getNotes() == null ? "" : ": " + plan.getNotes())).build();
        for (DetallePlanCompra line : plan.getItems()) {
            request.getItems().add(DetalleSolicitudCompra.builder().request(request).product(line.getProduct())
                    .quantity(line.getSuggestedQuantity()).build());
        }
        request = requests.save(request);
        plan.setStatus("CONVERTIDO");
        plans.save(plan);
        audit.registrar("CREATE", "SOLICITUD_COMPRA", request.getId(), "Solicitud generada desde " + plan.getCode());
        audit.registrar("UPDATE", "PLAN_COMPRA", plan.getId(), "Plan convertido en " + request.getCode());
        return request;
    }

    private PlanCompra nuevoPlan(String period, String notes) {
        return PlanCompra.builder().code("PC-" + period.replace("-", "") + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase(Locale.ROOT))
                .period(period).status("BORRADOR").createdAt(LocalDateTime.now()).notes(limpiar(notes)).build();
    }
    private PlanCompra guardarPlan(PlanCompra plan, String detail) {
        PlanCompra saved = plans.save(plan);
        audit.registrar("CREATE", "PLAN_COMPRA", saved.getId(), detail + " " + saved.getCode());
        return saved;
    }
    private void agregarLinea(PlanCompra plan, Producto product, int quantity, int stock, int forecast) {
        plan.getItems().add(DetallePlanCompra.builder().plan(plan).product(product).suggestedQuantity(quantity)
                .stockAtPlanning(stock).forecastQuantity(forecast).build());
    }
    private Producto producto(Long id) { return products.findById(id).orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + id)); }
    private PlanCompra plan(Long id) { return plans.findById(id).orElseThrow(() -> new ResourceNotFoundException("Plan de compra no encontrado")); }
    private void validarPeriodo(String period) { try { YearMonth.parse(period); } catch (Exception ex) { throw new IllegalArgumentException("El período debe tener formato AAAA-MM"); } }
    private int valor(Integer value) { return value == null ? 0 : value; }
    private String limpiar(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
