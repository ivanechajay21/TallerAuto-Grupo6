package com.sigtm.backend.service;

import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.EvaluacionProveedorRepository;
import com.sigtm.backend.repository.PrecioProveedorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ComparadorOfertasServiceTest {
    @Mock private PrecioProveedorRepository prices;
    @Mock private EvaluacionProveedorRepository evaluations;

    @Test
    void recomiendaOfertaConMejorPuntajeIntegral() {
        Proveedor rapido = Proveedor.builder().id(1L).businessName("Rápido").taxId("201").build();
        Proveedor barato = Proveedor.builder().id(2L).businessName("Barato").taxId("202").build();
        Producto product = Producto.builder().id(1L).code("P-1").name("P").build();
        PrecioProveedor a = PrecioProveedor.builder().supplier(rapido).product(product).unitPrice(new BigDecimal("12.00")).minimumQuantity(1).leadTimeDays(1).active(true).build();
        PrecioProveedor b = PrecioProveedor.builder().supplier(barato).product(product).unitPrice(new BigDecimal("10.00")).minimumQuantity(1).leadTimeDays(10).active(true).build();
        when(prices.findByProductIdAndActiveTrueOrderByUnitPriceAsc(1L)).thenReturn(List.of(b, a));
        when(evaluations.findBySupplierIdOrderByEvaluationDateDesc(1L)).thenReturn(List.of(EvaluacionProveedor.builder().qualityScore(5).deliveryScore(5).serviceScore(5).build()));
        when(evaluations.findBySupplierIdOrderByEvaluationDateDesc(2L)).thenReturn(List.of(EvaluacionProveedor.builder().qualityScore(1).deliveryScore(1).serviceScore(1).build()));

        var result = new ComparadorOfertasService(prices, evaluations).comparar(1L);

        assertEquals("Rápido", result.getFirst().supplierName());
        assertEquals("RECOMENDADA", result.getFirst().recommendation());
    }
}
