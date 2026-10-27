package com.sigtm.backend.service;

import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AprobacionCompraServiceTest {
    @Mock private NivelAprobacionCompraRepository levels;
    @Mock private AprobacionOrdenCompraRepository decisions;
    @Mock private OrdenCompraRepository orders;
    @Mock private AuditoriaService audit;

    private AprobacionCompraService service() { return new AprobacionCompraService(levels, decisions, orders, audit); }

    @Test
    void apruebaOrdenAlCumplirNumeroDeAprobaciones() {
        OrdenCompra order = OrdenCompra.builder().id(4L).status("PENDIENTE_APROBACION").total(BigDecimal.TEN).build();
        NivelAprobacionCompra level = NivelAprobacionCompra.builder().id(2L).level(1).requiredApprovals(1).amountFrom(BigDecimal.ZERO).requiredRole("ROLE_MANAGER").build();
        when(orders.findDetailedById(4L)).thenReturn(Optional.of(order));
        when(levels.findById(2L)).thenReturn(Optional.of(level));
        when(decisions.save(any())).thenAnswer(i -> i.getArgument(0));
        when(decisions.countByPurchaseOrderIdAndLevelIdAndDecision(4L, 2L, "APROBADA")).thenReturn(1L);
        when(orders.save(order)).thenReturn(order);

        service().decidir(4L, 2L, "APROBADA", "Correcto");

        assertEquals("PENDIENTE", order.getStatus());
        verify(audit).registrar(eq("UPDATE"), eq("ORDEN_COMPRA"), eq(4L), contains("APROBADA"));
    }

    @Test
    void rechazaOrdenCuandoLaDecisionEsNegativa() {
        OrdenCompra order = OrdenCompra.builder().id(4L).status("PENDIENTE_APROBACION").total(BigDecimal.TEN).build();
        NivelAprobacionCompra level = NivelAprobacionCompra.builder().id(2L).level(1).requiredApprovals(2).amountFrom(BigDecimal.ZERO).requiredRole("ROLE_MANAGER").build();
        when(orders.findDetailedById(4L)).thenReturn(Optional.of(order));
        when(levels.findById(2L)).thenReturn(Optional.of(level));
        when(decisions.save(any())).thenAnswer(i -> i.getArgument(0));
        when(orders.save(order)).thenReturn(order);

        service().decidir(4L, 2L, "RECHAZADA", "Excede presupuesto");

        assertEquals("RECHAZADA", order.getStatus());
    }

    @Test
    void noAceptaDecisionDesconocida() {
        OrdenCompra order = OrdenCompra.builder().id(4L).status("PENDIENTE_APROBACION").build();
        NivelAprobacionCompra level = NivelAprobacionCompra.builder().id(2L).level(1).requiredApprovals(1).amountFrom(BigDecimal.ZERO).requiredRole("ROLE_MANAGER").build();
        when(orders.findDetailedById(4L)).thenReturn(Optional.of(order));
        when(levels.findById(2L)).thenReturn(Optional.of(level));

        assertThrows(IllegalArgumentException.class, () -> service().decidir(4L, 2L, "DUDOSA", null));
        verify(decisions, never()).save(any());
    }
}
