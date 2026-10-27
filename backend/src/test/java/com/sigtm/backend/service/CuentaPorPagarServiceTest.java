package com.sigtm.backend.service;

import com.sigtm.backend.dto.RegistrarPagoProveedorRequest;
import com.sigtm.backend.model.FacturaProveedor;
import com.sigtm.backend.model.OrdenCompra;
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
class CuentaPorPagarServiceTest {
    @Mock private FacturaProveedorRepository invoices;
    @Mock private PagoProveedorRepository payments;
    @Mock private OrdenCompraRepository orders;
    @Mock private AuditoriaService audit;

    private CuentaPorPagarService service() { return new CuentaPorPagarService(invoices, payments, orders, audit); }

    @Test
    void registraPagoParcialYConservaSaldo() {
        FacturaProveedor invoice = invoice("100");
        when(invoices.findById(1L)).thenReturn(Optional.of(invoice));
        when(invoices.save(invoice)).thenReturn(invoice);

        FacturaProveedor result = service().pagar(1L, new RegistrarPagoProveedorRequest(new BigDecimal("40"), "TRANSFERENCIA", "OP-1"));

        assertEquals(new BigDecimal("60"), result.getBalance());
        assertEquals("PARCIAL", result.getStatus());
        verify(payments).save(any());
        verify(audit).registrar(eq("UPDATE"), eq("FACTURA_PROVEEDOR"), eq(1L), contains("40"));
    }

    @Test
    void marcaFacturaPagadaAlCubrirSaldo() {
        FacturaProveedor invoice = invoice("75");
        when(invoices.findById(1L)).thenReturn(Optional.of(invoice));
        when(invoices.save(invoice)).thenReturn(invoice);

        FacturaProveedor result = service().pagar(1L, new RegistrarPagoProveedorRequest(new BigDecimal("75"), "EFECTIVO", null));

        assertEquals(BigDecimal.ZERO, result.getBalance());
        assertEquals("PAGADA", result.getStatus());
    }

    @Test
    void impidePagoMayorQueSaldo() {
        FacturaProveedor invoice = invoice("50");
        when(invoices.findById(1L)).thenReturn(Optional.of(invoice));

        assertThrows(IllegalArgumentException.class, () -> service().pagar(1L,
                new RegistrarPagoProveedorRequest(new BigDecimal("51"), "EFECTIVO", null)));
        verify(payments, never()).save(any());
    }

    private FacturaProveedor invoice(String balance) {
        return FacturaProveedor.builder().id(1L).number("FP-1").purchaseOrder(OrdenCompra.builder().build())
                .total(new BigDecimal(balance)).balance(new BigDecimal(balance)).status("PENDIENTE").build();
    }
}
