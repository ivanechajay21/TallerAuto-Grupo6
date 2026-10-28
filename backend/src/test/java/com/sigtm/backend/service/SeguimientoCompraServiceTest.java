package com.sigtm.backend.service;

import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.SeguimientoCompra;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.SeguimientoCompraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SeguimientoCompraServiceTest {
    @Mock private SeguimientoCompraRepository tracking;
    @Mock private OrdenCompraRepository orders;
    @Mock private AuditoriaService audit;
    private SeguimientoCompraService service() { return new SeguimientoCompraService(tracking, orders, audit); }

    @Test
    void creaSeguimientoLogisticoDeOrden() {
        OrdenCompra order = OrdenCompra.builder().id(4L).code("OC-1").build();
        SeguimientoCompra input = SeguimientoCompra.builder().status("EN_TRANSITO").carrier("Transportes SAC")
                .dispatchedAt(LocalDate.of(2026, 10, 1)).estimatedArrival(LocalDate.of(2026, 10, 3)).build();
        when(orders.findDetailedById(4L)).thenReturn(Optional.of(order));
        when(tracking.findByPurchaseOrderId(4L)).thenReturn(Optional.empty());
        when(tracking.save(any(SeguimientoCompra.class))).thenAnswer(i -> i.getArgument(0));

        SeguimientoCompra result = service().actualizar(4L, input);

        assertEquals(order, result.getPurchaseOrder());
        assertEquals("EN_TRANSITO", result.getStatus());
        verify(audit).registrar(eq("UPDATE"), eq("SEGUIMIENTO_COMPRA"), isNull(), contains("EN_TRANSITO"));
    }

    @Test
    void rechazaEstadoLogisticoDesconocido() {
        when(orders.findDetailedById(4L)).thenReturn(Optional.of(OrdenCompra.builder().id(4L).build()));
        SeguimientoCompra input = SeguimientoCompra.builder().status("PERDIDA").build();

        assertThrows(IllegalArgumentException.class, () -> service().actualizar(4L, input));
        verify(tracking, never()).save(any());
    }

    @Test
    void fallaCuandoNoHayOrden() {
        when(orders.findDetailedById(4L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service().actualizar(4L, SeguimientoCompra.builder().status("ENVIADA").build()));
    }
}
