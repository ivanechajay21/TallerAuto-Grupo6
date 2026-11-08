package com.sigtm.backend.service;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.AprobacionOrdenCompra;
import com.sigtm.backend.model.NivelAprobacionCompra;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.repository.AprobacionOrdenCompraRepository;
import com.sigtm.backend.repository.NivelAprobacionCompraRepository;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.security.services.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Resuelve el flujo de aprobación multinivel de órdenes de compra.
 *
 * <p>Solo se puede decidir sobre niveles activos que cubran el monto de la
 * orden. El rol del usuario debe coincidir con el nivel (o ser ADMIN) y una
 * misma persona no puede votar dos veces en el mismo nivel. La orden pasa a
 * PENDIENTE solo cuando todos los niveles aplicables alcanzaron su mínimo de
 * aprobaciones.</p>
 */
@Service
@RequiredArgsConstructor
public class AprobacionCompraService {

    private final NivelAprobacionCompraRepository levels;
    private final AprobacionOrdenCompraRepository decisions;
    private final OrdenCompraRepository orders;
    private final AuditoriaService audit;

    @Transactional
    public NivelAprobacionCompra guardarNivel(NivelAprobacionCompra level) {
        if (level == null || level.getLevel() == null || level.getLevel() < 1) {
            throw new IllegalArgumentException("El número de nivel es obligatorio");
        }
        if (level.getAmountFrom() == null || level.getAmountFrom().signum() < 0) {
            throw new IllegalArgumentException("El monto desde es obligatorio y no puede ser negativo");
        }
        if (level.getAmountTo() != null && level.getAmountTo().compareTo(level.getAmountFrom()) < 0) {
            throw new IllegalArgumentException("Rango de monto inválido");
        }
        if (level.getRequiredRole() == null || level.getRequiredRole().isBlank()) {
            throw new IllegalArgumentException("El rol requerido es obligatorio");
        }
        if (level.getRequiredApprovals() == null || level.getRequiredApprovals() < 1) {
            throw new IllegalArgumentException("Se requiere al menos una aprobación");
        }
        if (level.getActive() == null) level.setActive(true);
        return levels.save(level);
    }

    @Transactional(readOnly = true)
    public List<NivelAprobacionCompra> niveles() {
        return levels.findByActiveTrueOrderByLevelAsc();
    }

    @Transactional
    public AprobacionOrdenCompra decidir(Long orderId, Long levelId, String decision, String comment) {
        OrdenCompra order = orders.findDetailedById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada"));
        NivelAprobacionCompra level = levels.findById(levelId)
                .orElseThrow(() -> new ResourceNotFoundException("Nivel no encontrado"));

        if (!"PENDIENTE_APROBACION".equals(order.getStatus())) {
            throw new IllegalArgumentException("La orden no requiere aprobación");
        }
        if (!Boolean.TRUE.equals(level.getActive())) {
            throw new IllegalArgumentException("El nivel de aprobación está inactivo");
        }
        if (!aplica(level, order.getTotal())) {
            throw new IllegalArgumentException("El nivel no corresponde al monto de la orden");
        }
        String userRole = currentRole();
        if (userRole == null
                || (!"ROLE_ADMIN".equals(userRole) && !userRole.equals(level.getRequiredRole()))) {
            throw new IllegalArgumentException("Tu rol no puede aprobar este nivel");
        }
        if (!Set.of("APROBADA", "RECHAZADA").contains(decision)) {
            throw new IllegalArgumentException("Decisión no válida");
        }
        String username = currentUsername();
        if (username != null
                && decisions.existsByPurchaseOrderIdAndLevelIdAndCreatedBy(orderId, levelId, username)) {
            throw new IllegalArgumentException("Ya registraste una decisión en este nivel");
        }

        AprobacionOrdenCompra decisionEntity = decisions.save(AprobacionOrdenCompra.builder()
                .purchaseOrder(order)
                .level(level)
                .decision(decision)
                .decidedAt(LocalDateTime.now())
                .comment(comment)
                .build());

        if ("RECHAZADA".equals(decision)) {
            order.setStatus("RECHAZADA");
        } else if (todosLosNivelesAprobados(order)) {
            order.setStatus("PENDIENTE");
        }
        orders.save(order);
        audit.registrar("UPDATE", "ORDEN_COMPRA", order.getId(),
                "Aprobación nivel " + level.getLevel() + ": " + decision);
        return decisionEntity;
    }

    @Transactional(readOnly = true)
    public List<AprobacionOrdenCompra> historial(Long orderId) {
        return decisions.findByPurchaseOrderIdOrderByDecidedAtDesc(orderId);
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.NivelAprobacionCompraResponse> nivelesDto() {
        return niveles().stream().map(ComprasResponses.NivelAprobacionCompraResponse::from).toList();
    }

    @Transactional
    public ComprasResponses.NivelAprobacionCompraResponse guardarNivelDto(NivelAprobacionCompra level) {
        return ComprasResponses.NivelAprobacionCompraResponse.from(guardarNivel(level));
    }

    @Transactional
    public ComprasResponses.AprobacionOrdenCompraResponse decidirDto(Long orderId, Long levelId,
            String decision, String comment) {
        return ComprasResponses.AprobacionOrdenCompraResponse.from(decidir(orderId, levelId, decision, comment));
    }

    @Transactional(readOnly = true)
    public List<ComprasResponses.AprobacionOrdenCompraResponse> historialDto(Long orderId) {
        return historial(orderId).stream().map(ComprasResponses.AprobacionOrdenCompraResponse::from).toList();
    }

    private boolean todosLosNivelesAprobados(OrdenCompra order) {
        return levels.findByActiveTrueOrderByLevelAsc().stream()
                .filter(level -> aplica(level, order.getTotal()))
                .allMatch(level -> decisions.countByPurchaseOrderIdAndLevelIdAndDecision(
                        order.getId(), level.getId(), "APROBADA") >= level.getRequiredApprovals());
    }

    private boolean aplica(NivelAprobacionCompra level, BigDecimal total) {
        BigDecimal amount = total == null ? BigDecimal.ZERO : total;
        return level.getAmountFrom() != null
                && amount.compareTo(level.getAmountFrom()) >= 0
                && (level.getAmountTo() == null || amount.compareTo(level.getAmountTo()) <= 0);
    }

    private String currentRole() {
        UserDetailsImpl user = currentUser();
        return user == null ? null : user.getRoleName();
    }

    private String currentUsername() {
        UserDetailsImpl user = currentUser();
        return user == null ? null : user.getUsername();
    }

    private UserDetailsImpl currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UserDetailsImpl user ? user : null;
    }
}
