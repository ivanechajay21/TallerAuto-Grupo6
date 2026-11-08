package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
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

/** Pruebas de caracterización de emisión, IGV, tipo de comprobante y cobro. */
@ExtendWith(MockitoExtension.class)
class FacturaServiceTest {
    @Mock private FacturaRepository facturas;
    @Mock private OrdenTrabajoRepository ordenes;
    @Mock private AuditoriaService auditoria;
    @Mock private CorrelativoComprobanteService correlativos;

    private FacturaService service() {
        return new FacturaService(facturas, ordenes, auditoria, correlativos);
    }

    @Test
    void generaFacturaConSubtotalIgvTotalYSerieF001() {
        OrdenTrabajo orden = orden("FINALIZADO", "20123456789");
        orden.getItems().add(item("Cambio de aceite", "40.00", 2));
        orden.getItems().add(item("Filtro", "15.50", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden));
        when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());
        when(correlativos.siguiente(eq(TipoComprobante.FACTURA), anyInt())).thenReturn(7L);
        when(facturas.save(any())).thenAnswer(i -> {
            Factura factura = i.getArgument(0);
            factura.setId(70L);
            return factura;
        });

        Map<String, Object> result = service().generarFactura(9L);

        assertEquals(new BigDecimal("95.50"), result.get("subtotal"));
        assertEquals(new BigDecimal("17.19"), result.get("taxAmount"));
        assertEquals(new BigDecimal("112.69"), result.get("totalAmount"));
        assertEquals("PENDING", result.get("status"));
        assertEquals("FACTURA", result.get("documentType"));
        assertEquals("F001", result.get("series"));
        assertEquals(7L, result.get("correlative"));
        assertEquals("F001-00000007", result.get("invoiceNumber"));
        assertEquals("RUC", result.get("customerDocumentType"));
        assertNotNull(result.get("issueDate"));
        verify(auditoria).registrar(eq("CREATE"), eq("FACTURA"), eq(70L), contains("OT-0009"));
    }

    @Test
    void anulaComprobantePendienteYAudita() {
        Factura factura = Factura.builder().id(5L).invoiceNumber("F001-00000005").status("PENDING").build();
        when(facturas.findById(5L)).thenReturn(Optional.of(factura));
        when(facturas.save(factura)).thenReturn(factura);

        Map<String, Object> result = service().anularFactura(5L);

        assertEquals("CANCELLED", result.get("status"));
        verify(auditoria).registrar(eq("UPDATE"), eq("FACTURA"), eq(5L), contains("Anulación"));
    }

    @Test
    void rechazaAnularComprobantePagado() {
        Factura factura = Factura.builder().id(5L).invoiceNumber("F001-00000005").status("PAID").build();
        when(facturas.findById(5L)).thenReturn(Optional.of(factura));

        assertThrows(IllegalArgumentException.class, () -> service().anularFactura(5L));
        verify(facturas, never()).save(any());
    }

    @Test
    void permiteFacturarOrdenEntregada() {
        OrdenTrabajo orden = orden("ENTREGADO", "20123456789");
        orden.getItems().add(item("Servicio", "100.00", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden));
        when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());
        when(correlativos.siguiente(eq(TipoComprobante.FACTURA), anyInt())).thenReturn(1L);
        when(facturas.save(any())).thenAnswer(i -> {
            Factura f = i.getArgument(0);
            f.setId(1L);
            return f;
        });

        Map<String, Object> result = service().generarFactura(9L);

        assertEquals("PENDING", result.get("status"));
        assertEquals("FACTURA", result.get("documentType"));
        verify(facturas).save(any(Factura.class));
    }

    @Test
    void generaBoletaConDniYSerieB001() {
        OrdenTrabajo orden = orden("FINALIZADO", "74125896");
        orden.getItems().add(item("Servicio", "100.00", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden));
        when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());
        when(correlativos.siguiente(eq(TipoComprobante.BOLETA), anyInt())).thenReturn(3L);
        when(facturas.save(any())).thenAnswer(i -> {
            Factura f = i.getArgument(0);
            f.setId(2L);
            return f;
        });

        Map<String, Object> result = service().generarFactura(9L, TipoComprobante.BOLETA);

        assertEquals("BOLETA", result.get("documentType"));
        assertEquals("B001", result.get("series"));
        assertEquals("B001-00000003", result.get("invoiceNumber"));
        assertEquals("DNI", result.get("customerDocumentType"));
        assertEquals(3L, result.get("correlative"));
    }

    @Test
    void rechazaFacturaParaOrdenEnProcesoOYaFacturada() {
        OrdenTrabajo pendiente = orden("EN_PROCESO", "20123456789");
        when(ordenes.findById(9L)).thenReturn(Optional.of(pendiente));
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service().generarFactura(9L))
                .getMessage().contains("FINALIZADO"));

        OrdenTrabajo terminada = orden("FINALIZADO", "20123456789");
        when(ordenes.findById(10L)).thenReturn(Optional.of(terminada));
        when(facturas.findByWorkOrderId(10L)).thenReturn(Optional.of(Factura.builder().id(8L).build()));
        assertTrue(assertThrows(DuplicateResourceException.class, () -> service().generarFactura(10L))
                .getMessage().contains("ya tiene"));
        verify(facturas, never()).save(any());
        verify(correlativos, never()).siguiente(any(), anyInt());
    }

    @Test
    void rechazaFacturaSiLaOrdenNoExiste() {
        when(ordenes.findById(404L)).thenReturn(Optional.empty());
        assertEquals("Orden de trabajo no encontrada",
                assertThrows(ResourceNotFoundException.class, () -> service().generarFactura(404L)).getMessage());
        verifyNoInteractions(facturas, auditoria, correlativos);
    }

    @Test
    void rechazaFacturaSiElClienteNoTieneRuc() {
        OrdenTrabajo orden = orden("FINALIZADO", "74125896");
        orden.getItems().add(item("Servicio", "100.00", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden));
        when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());

        assertTrue(assertThrows(IllegalArgumentException.class, () -> service().generarFactura(9L))
                .getMessage().contains("RUC"));
        verify(facturas, never()).save(any());
        verify(correlativos, never()).siguiente(any(), anyInt());
    }

    @Test
    void rechazaBoletaSiElDocumentoNoEsDniNiRuc() {
        OrdenTrabajo orden = orden("FINALIZADO", "123");
        orden.getItems().add(item("Servicio", "100.00", 1));
        when(ordenes.findById(9L)).thenReturn(Optional.of(orden));
        when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());

        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service().generarFactura(9L, TipoComprobante.BOLETA)).getMessage().contains("DNI"));
        verify(facturas, never()).save(any());
        verify(correlativos, never()).siguiente(any(), anyInt());
    }

    @Test
    void rechazaOrdenSinItemsYPrecioNegativo() {
        OrdenTrabajo sinItems = orden("FINALIZADO", "20123456789");
        when(ordenes.findById(9L)).thenReturn(Optional.of(sinItems));
        when(facturas.findByWorkOrderId(9L)).thenReturn(Optional.empty());
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service().generarFactura(9L))
                .getMessage().contains("no tiene"));

        OrdenTrabajo conNegativo = orden("FINALIZADO", "20123456789");
        conNegativo.getItems().add(item("Ajuste", "-10.00", 1));
        when(ordenes.findById(10L)).thenReturn(Optional.of(conNegativo));
        when(facturas.findByWorkOrderId(10L)).thenReturn(Optional.empty());
        assertTrue(assertThrows(IllegalArgumentException.class, () -> service().generarFactura(10L))
                .getMessage().contains("negativo"));

        verify(facturas, never()).save(any());
        verify(correlativos, never()).siguiente(any(), anyInt());
    }

    @Test
    void registraPagoYConservaElTotalFacturado() {
        Factura factura = Factura.builder().id(45L).invoiceNumber("F001-00000045")
                .documentType(TipoComprobante.FACTURA).totalAmount(new BigDecimal("112.69"))
                .status("PENDING").issueDate(LocalDateTime.of(2026, 11, 1, 10, 0)).build();
        when(facturas.findById(45L)).thenReturn(Optional.of(factura));
        when(facturas.save(factura)).thenReturn(factura);

        Map<String, Object> result = service().pagarFactura(45L, "card");

        assertEquals("PAID", factura.getStatus());
        assertEquals("CARD", factura.getPaymentMethod());
        assertEquals(new BigDecimal("112.69"), result.get("totalAmount"));
        verify(auditoria).registrar(eq("PAYMENT"), eq("FACTURA"), eq(45L), contains("CARD"));
    }

    @Test
    void rechazaPagoDeFacturaYaPagadaYMetodoInvalido() {
        Factura pagada = Factura.builder().id(45L).status("PAID").issueDate(LocalDateTime.now()).build();
        when(facturas.findById(45L)).thenReturn(Optional.of(pagada));
        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service().pagarFactura(45L, "CASH")).getMessage().contains("pendiente"));

        Factura pendiente = Factura.builder().id(46L).status("PENDING").issueDate(LocalDateTime.now()).build();
        when(facturas.findById(46L)).thenReturn(Optional.of(pendiente));
        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service().pagarFactura(46L, "BITCOIN")).getMessage().contains("inválido"));

        verify(facturas, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    void listaFacturasYReportaFacturaInexistente() {
        Factura factura = Factura.builder().id(1L).invoiceNumber("F001-00000001")
                .documentType(TipoComprobante.FACTURA).issueDate(LocalDateTime.now())
                .subtotal(BigDecimal.TEN).taxAmount(BigDecimal.ONE)
                .totalAmount(new BigDecimal("11")).status("PENDING").build();
        when(facturas.findAll()).thenReturn(List.of(factura));
        assertEquals(1, service().obtenerTodas().size());
        when(facturas.findById(99L)).thenReturn(Optional.empty());
        assertEquals("Factura no encontrada",
                assertThrows(ResourceNotFoundException.class, () -> service().obtenerPorId(99L)).getMessage());
    }

    private OrdenTrabajo orden(String status, String documentNumber) {
        Cliente cliente = Cliente.builder().id(2L).documentNumber(documentNumber)
                .firstName("Cliente").lastName("Prueba").build();
        OrdenTrabajo orden = OrdenTrabajo.builder().id(9L).orderNumber("OT-0009")
                .status(status).priority("NORMAL").customer(cliente).build();
        orden.setItems(new ArrayList<>());
        return orden;
    }

    private ItemOrdenTrabajo item(String description, String price, int quantity) {
        return ItemOrdenTrabajo.builder().description(description)
                .price(new BigDecimal(price)).quantity(quantity).status("PENDING").build();
    }
}
