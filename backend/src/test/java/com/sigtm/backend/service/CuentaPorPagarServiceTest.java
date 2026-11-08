package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearFacturaProveedorRequest;
import com.sigtm.backend.dto.RegistrarPagoProveedorRequest;
import com.sigtm.backend.model.FacturaProveedor;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CuentaPorPagarServiceTest {
    @Mock private FacturaProveedorRepository invoices;
    @Mock private PagoProveedorRepository payments;
    @Mock private OrdenCompraRepository orders;
    @Mock private AuditoriaService audit;

    private CuentaPorPagarService service() { return new CuentaPorPagarService(invoices, payments, orders, audit); }

    @Test
    void registraPagoParcialYConservaSaldo() {
        FacturaProveedor invoice = invoice("100");
        when(invoices.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));
        when(invoices.save(invoice)).thenReturn(invoice);

        FacturaProveedor result = service().pagar(1L, new RegistrarPagoProveedorRequest(new BigDecimal("40"), "CARD", "OP-1"));

        assertEquals(new BigDecimal("60"), result.getBalance());
        assertEquals("PARCIAL", result.getStatus());
        verify(payments).save(any());
        verify(audit).registrar(eq("UPDATE"), eq("FACTURA_PROVEEDOR"), eq(1L), contains("40"));
    }

    @Test
    void marcaFacturaPagadaAlCubrirSaldo() {
        FacturaProveedor invoice = invoice("75");
        when(invoices.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));
        when(invoices.save(invoice)).thenReturn(invoice);

        FacturaProveedor result = service().pagar(1L, new RegistrarPagoProveedorRequest(new BigDecimal("75"), "CASH", null));

        assertEquals(BigDecimal.ZERO, result.getBalance());
        assertEquals("PAGADA", result.getStatus());
    }

    @Test
    void impidePagoMayorQueSaldo() {
        FacturaProveedor invoice = invoice("50");
        when(invoices.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));

        assertThrows(IllegalArgumentException.class, () -> service().pagar(1L,
                new RegistrarPagoProveedorRequest(new BigDecimal("51"), "CASH", null)));
        verify(payments, never()).save(any());
    }

    @Test
    void rechazaMetodoDePagoNoPermitido() {
        FacturaProveedor invoice = invoice("50");
        when(invoices.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));

        assertThrows(IllegalArgumentException.class, () -> service().pagar(1L,
                new RegistrarPagoProveedorRequest(new BigDecimal("10"), "BITCOIN", null)));
        verify(payments, never()).save(any());
    }

    @Test
    void anulaFacturaSinPagos() {
        FacturaProveedor invoice = invoice("50");
        when(invoices.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));
        when(payments.existsBySupplierInvoiceId(1L)).thenReturn(false);
        when(invoices.save(invoice)).thenReturn(invoice);

        FacturaProveedor result = service().anular(1L);

        assertEquals("ANULADA", result.getStatus());
        verify(audit).registrar(eq("UPDATE"), eq("FACTURA_PROVEEDOR"), eq(1L), contains("anulada"));
    }

    @Test
    void rechazaAnulacionConPagosRegistrados() {
        FacturaProveedor invoice = invoice("50");
        when(invoices.findByIdForUpdate(1L)).thenReturn(Optional.of(invoice));
        when(payments.existsBySupplierInvoiceId(1L)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> service().anular(1L));
        verify(invoices, never()).save(any());
    }

    @Test
    void permiteFacturacionParcialHastaElTotalDeLaOrden() {
        OrdenCompra order = OrdenCompra.builder().id(9L).status("RECIBIDA")
                .total(new BigDecimal("100")).build();
        when(invoices.findByNumber("FP-PARCIAL")).thenReturn(Optional.empty());
        when(orders.findDetailedById(9L)).thenReturn(Optional.of(order));
        when(invoices.sumActiveTotalByPurchaseOrderId(9L)).thenReturn(new BigDecimal("40"));
        when(invoices.save(any(FacturaProveedor.class))).thenAnswer(i -> {
            FacturaProveedor value = i.getArgument(0);
            value.setId(2L);
            return value;
        });

        FacturaProveedor result = service().crear(new CrearFacturaProveedorRequest(9L, "FP-PARCIAL",
                LocalDate.now(), LocalDate.now().plusDays(30), new BigDecimal("60")));

        assertEquals(new BigDecimal("60"), result.getBalance());
        assertEquals("PENDIENTE", result.getStatus());
    }

    @Test
    void rechazaFacturacionAcumuladaQueSuperaLaOrden() {
        OrdenCompra order = OrdenCompra.builder().id(9L).status("RECIBIDA")
                .total(new BigDecimal("100")).build();
        when(invoices.findByNumber("FP-EXCEDIDA")).thenReturn(Optional.empty());
        when(orders.findDetailedById(9L)).thenReturn(Optional.of(order));
        when(invoices.sumActiveTotalByPurchaseOrderId(9L)).thenReturn(new BigDecimal("90"));

        assertThrows(IllegalArgumentException.class, () -> service().crear(new CrearFacturaProveedorRequest(
                9L, "FP-EXCEDIDA", LocalDate.now(), LocalDate.now().plusDays(30), new BigDecimal("20"))));
        verify(invoices, never()).save(any());
    }

    private FacturaProveedor invoice(String balance) {
        return FacturaProveedor.builder().id(1L).number("FP-1").purchaseOrder(OrdenCompra.builder().build())
                .total(new BigDecimal(balance)).balance(new BigDecimal(balance)).status("PENDIENTE").build();
    }
}
