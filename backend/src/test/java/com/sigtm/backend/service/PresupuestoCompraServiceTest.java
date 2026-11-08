package com.sigtm.backend.service;

import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.PresupuestoCompra;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.PresupuestoCompraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PresupuestoCompraServiceTest {
    @Mock private PresupuestoCompraRepository budgets;
    @Mock private OrdenCompraRepository orders;
    @Mock private AuditoriaService audit;

    @Test
    void marcaAlertaCuandoElConsumoAlcanzaElUmbral() {
        PresupuestoCompra budget = PresupuestoCompra.builder().period("2026-10").limitAmount(new BigDecimal("1000"))
                .alertPercentage(80).active(true).build();
        OrdenCompra order = OrdenCompra.builder().status("PENDIENTE").issueDate(LocalDate.of(2026, 10, 10))
                .total(new BigDecimal("850")).build();
        when(budgets.findByPeriod("2026-10")).thenReturn(Optional.of(budget));
        when(orders.findAll()).thenReturn(List.of(order));

        var state = new PresupuestoCompraService(budgets, orders, audit).estado("2026-10");

        assertEquals("ALERTA", state.status());
        assertEquals(new BigDecimal("150"), state.availableAmount());
        assertEquals(new BigDecimal("85.00"), state.percentageUsed());
    }

    @Test
    void marcaExcedidoCuandoLasOrdenesSuperanElLimite() {
        PresupuestoCompra budget = PresupuestoCompra.builder().period("2026-10").limitAmount(new BigDecimal("1000"))
                .alertPercentage(80).active(true).build();
        OrdenCompra order = OrdenCompra.builder().status("PENDIENTE").issueDate(LocalDate.of(2026, 10, 10))
                .total(new BigDecimal("1200")).build();
        when(budgets.findByPeriod("2026-10")).thenReturn(Optional.of(budget));
        when(orders.findAll()).thenReturn(List.of(order));

        var state = new PresupuestoCompraService(budgets, orders, audit).estado("2026-10");

        assertEquals("EXCEDIDO", state.status());
        assertEquals(new BigDecimal("-200"), state.availableAmount());
    }

    @Test
    void ignoraOrdenesAnuladasYDeOtrosPeriodos() {
        PresupuestoCompra budget = PresupuestoCompra.builder().period("2026-10").limitAmount(new BigDecimal("1000"))
                .alertPercentage(80).active(true).build();
        OrdenCompra cancelled = OrdenCompra.builder().status("ANULADA").issueDate(LocalDate.of(2026, 10, 10)).total(new BigDecimal("900")).build();
        OrdenCompra anotherMonth = OrdenCompra.builder().status("PENDIENTE").issueDate(LocalDate.of(2026, 9, 10)).total(new BigDecimal("900")).build();
        when(budgets.findByPeriod("2026-10")).thenReturn(Optional.of(budget));
        when(orders.findAll()).thenReturn(List.of(cancelled, anotherMonth));

        var state = new PresupuestoCompraService(budgets, orders, audit).estado("2026-10");

        assertEquals(BigDecimal.ZERO, state.committedAmount());
        assertEquals("DISPONIBLE", state.status());
    }

    @Test
    void actualizaElPresupuestoDelMismoPeriodoEnLugarDeDuplicarlo() {
        PresupuestoCompra existing = PresupuestoCompra.builder()
                .id(9L).period("2026-11").limitAmount(new BigDecimal("500"))
                .alertPercentage(70).active(true).build();
        when(budgets.findByPeriod("2026-11")).thenReturn(Optional.of(existing));
        when(budgets.save(any(PresupuestoCompra.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PresupuestoCompra saved = new PresupuestoCompraService(budgets, orders, audit)
                .guardar(PresupuestoCompra.builder().period("2026-11")
                        .limitAmount(new BigDecimal("800")).alertPercentage(90).build());

        assertEquals(9L, saved.getId());
        assertEquals(new BigDecimal("800"), saved.getLimitAmount());
        assertEquals(90, saved.getAlertPercentage());
        verify(budgets).save(existing);
    }

    @Test
    void rechazaPeriodoConFormatoInvalido() {
        assertThrows(IllegalArgumentException.class, () -> new PresupuestoCompraService(budgets, orders, audit)
                .guardar(PresupuestoCompra.builder().period("2026/11")
                        .limitAmount(new BigDecimal("800")).alertPercentage(90).build()));
    }
}
