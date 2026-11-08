package com.sigtm.backend.service;

import com.sigtm.backend.model.EvaluacionProveedor;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.EvaluacionProveedorRepository;
import com.sigtm.backend.repository.FacturaProveedorRepository;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.SeguimientoCompraRepository;
import com.sigtm.backend.repository.SolicitudCompraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TableroAbastecimientoServiceTest {
    @Mock private ProductoRepository products;
    @Mock private SolicitudCompraRepository requests;
    @Mock private OrdenCompraRepository orders;
    @Mock private FacturaProveedorRepository invoices;
    @Mock private SeguimientoCompraRepository tracking;
    @Mock private EvaluacionProveedorRepository evaluations;

    @Test
    void calculaProductosCriticosYRankingDeProveedores() {
        Producto product = Producto.builder().id(1L).code("P-1").name("Producto").currentStock(1).minStock(2).build();
        Proveedor supplier = Proveedor.builder().id(3L).businessName("Proveedor Uno").build();
        EvaluacionProveedor first = evaluation(supplier, 5, 4, 4);
        EvaluacionProveedor second = evaluation(supplier, 4, 4, 5);
        when(products.findByActiveTrue()).thenReturn(List.of(product));
        when(requests.findAll()).thenReturn(List.of());
        when(orders.findAll()).thenReturn(List.of());
        when(invoices.findAll()).thenReturn(List.of());
        when(evaluations.findAll()).thenReturn(List.of(first, second));

        var board = new TableroAbastecimientoService(products, requests, orders, invoices, tracking, evaluations).obtener();

        assertEquals(1, board.criticalProducts());
        assertEquals(1, board.topSuppliers().size());
        assertEquals("Proveedor Uno", board.topSuppliers().getFirst().get("supplier"));
        assertEquals(new BigDecimal("4.33"), board.topSuppliers().getFirst().get("averageScore"));
        assertEquals(2, board.topSuppliers().getFirst().get("evaluations"));
        assertFalse(board.actions().isEmpty());
    }

    private EvaluacionProveedor evaluation(Proveedor supplier, int quality, int delivery, int service) {
        return EvaluacionProveedor.builder().supplier(supplier).evaluationDate(LocalDate.now())
                .qualityScore(quality).deliveryScore(delivery).serviceScore(service).build();
    }
}
