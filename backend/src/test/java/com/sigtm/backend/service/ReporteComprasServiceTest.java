package com.sigtm.backend.service;

import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReporteComprasServiceTest {
    @Mock private OrdenCompraRepository orders;
    @Mock private FacturaProveedorRepository invoices;
    @Mock private PrecioProveedorRepository prices;
    @Mock private ProductoRepository products;

    @Test
    void identificaCuentasVencidasYProximas() {
        Proveedor supplier = Proveedor.builder().businessName("Proveedor 1").taxId("201").build();
        OrdenCompra order = OrdenCompra.builder().supplier(supplier).build();
        FacturaProveedor overdue = FacturaProveedor.builder().id(1L).number("FP-1").purchaseOrder(order)
                .dueDate(LocalDate.now().minusDays(1)).balance(new BigDecimal("20")).status("PENDIENTE").build();
        FacturaProveedor upcoming = FacturaProveedor.builder().id(2L).number("FP-2").purchaseOrder(order)
                .dueDate(LocalDate.now().plusDays(3)).balance(new BigDecimal("30")).status("PARCIAL").build();
        FacturaProveedor paid = FacturaProveedor.builder().id(3L).number("FP-3").purchaseOrder(order)
                .dueDate(LocalDate.now()).balance(BigDecimal.ZERO).status("PAGADA").build();
        when(invoices.findAll()).thenReturn(List.of(overdue, upcoming, paid));

        var alerts = service().alertasVencimiento(7);

        assertEquals(2, alerts.size());
        assertEquals("VENCIDA", alerts.getFirst().severity());
        assertEquals("PROXIMA", alerts.getLast().severity());
    }

    @Test
    void informaAhorroCuandoExisteOfertaMasBarata() {
        Producto product = Producto.builder().id(1L).code("ACE-1").name("Aceite")
                .purchasePrice(new BigDecimal("100")).currentStock(5).minStock(2).active(true).build();
        Proveedor supplier = Proveedor.builder().id(2L).businessName("Oferta").taxId("202").build();
        PrecioProveedor offer = PrecioProveedor.builder().supplier(supplier).product(product)
                .unitPrice(new BigDecimal("80")).minimumQuantity(1).leadTimeDays(2).active(true).build();
        when(products.findByActiveTrue()).thenReturn(List.of(product));
        when(prices.findByProductIdAndActiveTrueOrderByUnitPriceAsc(1L)).thenReturn(List.of(offer));

        var costs = service().tendencias();

        assertEquals("AHORRO_DISPONIBLE", costs.getFirst().signal());
        assertEquals(new BigDecimal("-20.00"), costs.getFirst().differencePercent());
    }

    private ReporteComprasService service() { return new ReporteComprasService(orders, invoices, prices, products); }
}
