package com.sigtm.backend.service;

import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.FacturaRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Pruebas de caracterización de emisión, IGV y cobro de facturas existentes. */
@ExtendWith(MockitoExtension.class)
class FacturaServiceTest {
    @Mock private FacturaRepository facturas;
    @Mock private OrdenTrabajoRepository ordenes;
    @Mock private AuditoriaService auditoria;

    private FacturaService service() { return new FacturaService(facturas, ordenes, auditoria); }

    @Test
    void generaFacturaConSubtotalIgvYTotalDeOrdenFinalizada() {
        OrdenTrabajo orden = orden("FINALIZADO");
        orden.getItems().add(item("Cambio de aceite", "40.00", 2));
        orden.getItems().add(item("Filtro", "15.50", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden)); when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());
        when(facturas.save(any())).thenAnswer(i -> {
            Factura factura = i.getArgument(0); factura.setId(70L); factura.setIssueDate(LocalDateTime.of(2026, 11, 1, 10, 0)); return factura;
        });

        Map<String, Object> result = service().generarFactura(9L);

        assertEquals(new BigDecimal("95.50"), result.get("subtotal"));
        assertEquals(new BigDecimal("17.1900"), result.get("taxAmount"));
        assertEquals(new BigDecimal("112.6900"), result.get("totalAmount"));
        assertEquals("PENDING", result.get("status"));
        assertTrue(((String) result.get("invoiceNumber")).startsWith("INV-"));
        verify(auditoria).registrar(eq("CREATE"), eq("FACTURA"), eq(70L), contains("OT-0009"));
    }

    @Test
    void permiteFacturarOrdenEntregada() {
        OrdenTrabajo orden = orden("ENTREGADO"); orden.getItems().add(item("Servicio", "100.00", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden)); when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());
        when(facturas.save(any())).thenAnswer(i -> { Factura f = i.getArgument(0); f.setId(1L); f.setIssueDate(LocalDateTime.now()); return f; });

        Map<String, Object> result = service().generarFactura(9L);

        assertEquals("PENDING", result.get("status")); verify(facturas).save(any(Factura.class));
    }

    @Test
    void rechazaFacturaParaOrdenEnProcesoOYaFacturada() {
        OrdenTrabajo pendiente = orden("EN_PROCESO"); when(ordenes.findById(9L)).thenReturn(Optional.of(pendiente));
        assertTrue(assertThrows(RuntimeException.class, () -> service().generarFactura(9L)).getMessage().contains("FINALIZADO"));

        OrdenTrabajo terminada = orden("FINALIZADO"); when(ordenes.findById(10L)).thenReturn(Optional.of(terminada));
        when(facturas.findByWorkOrderId(10L)).thenReturn(Optional.of(Factura.builder().id(8L).build()));
        assertTrue(assertThrows(RuntimeException.class, () -> service().generarFactura(10L)).getMessage().contains("ya tiene"));
        verify(facturas, never()).save(any());
    }

    @Test
    void rechazaFacturaSiLaOrdenNoExiste() {
        when(ordenes.findById(404L)).thenReturn(Optional.empty());
        assertEquals("Orden de trabajo no encontrada", assertThrows(RuntimeException.class, () -> service().generarFactura(404L)).getMessage());
        verifyNoInteractions(facturas, auditoria);
    }

    @Test
    void registraPagoYConservaElTotalFacturado() {
        Factura factura = Factura.builder().id(45L).invoiceNumber("INV-2026-ABC").totalAmount(new BigDecimal("112.69"))
                .status("PENDING").issueDate(LocalDateTime.of(2026, 11, 1, 10, 0)).build();
        when(facturas.findById(45L)).thenReturn(Optional.of(factura)); when(facturas.save(factura)).thenReturn(factura);

        Map<String, Object> result = service().pagarFactura(45L, "CARD");

        assertEquals("PAID", factura.getStatus()); assertEquals("CARD", factura.getPaymentMethod());
        assertEquals(new BigDecimal("112.69"), result.get("totalAmount"));
        verify(auditoria).registrar(eq("PAYMENT"), eq("FACTURA"), eq(45L), contains("CARD"));
    }

    @Test
    void listaFacturasYReportaFacturaInexistente() {
        Factura factura = Factura.builder().id(1L).invoiceNumber("INV-1").issueDate(LocalDateTime.now()).subtotal(BigDecimal.TEN)
                .taxAmount(BigDecimal.ONE).totalAmount(new BigDecimal("11")).status("PENDING").build();
        when(facturas.findAll()).thenReturn(List.of(factura));
        assertEquals(1, service().obtenerTodas().size());
        when(facturas.findById(99L)).thenReturn(Optional.empty());
        assertEquals("Factura no encontrada", assertThrows(RuntimeException.class, () -> service().obtenerPorId(99L)).getMessage());
    }

    private OrdenTrabajo orden(String status) {
        OrdenTrabajo orden = OrdenTrabajo.builder().id(9L).orderNumber("OT-0009").status(status).priority("NORMAL").build();
        orden.setItems(new ArrayList<>()); return orden;
    }
    private ItemOrdenTrabajo item(String description, String price, int quantity) {
        return ItemOrdenTrabajo.builder().description(description).price(new BigDecimal(price)).quantity(quantity).status("PENDING").build();
    }
}
