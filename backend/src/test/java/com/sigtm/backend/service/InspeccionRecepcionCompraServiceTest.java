package com.sigtm.backend.service;

import com.sigtm.backend.model.DetalleRecepcionCompra;
import com.sigtm.backend.model.InspeccionRecepcionCompra;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.RecepcionCompra;
import com.sigtm.backend.repository.InspeccionRecepcionCompraRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.RecepcionCompraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InspeccionRecepcionCompraServiceTest {
    @Mock private InspeccionRecepcionCompraRepository inspections;
    @Mock private RecepcionCompraRepository receipts;
    @Mock private ProductoRepository products;
    @Mock private AuditoriaService audit;

    private InspeccionRecepcionCompraService service() {
        return new InspeccionRecepcionCompraService(inspections, receipts, products, audit);
    }

    @Test
    void registraInspeccionValidaYAudita() {
        Producto product = Producto.builder().id(5L).code("P-5").name("Producto").build();
        RecepcionCompra receipt = RecepcionCompra.builder().id(1L).receiptNumber("RC-1").build();
        receipt.getItems().add(DetalleRecepcionCompra.builder().product(product).quantity(10).build());
        when(receipts.findById(1L)).thenReturn(Optional.of(receipt));
        when(products.findById(5L)).thenReturn(Optional.of(product));
        when(inspections.save(any(InspeccionRecepcionCompra.class))).thenAnswer(i -> {
            InspeccionRecepcionCompra value = i.getArgument(0);
            value.setId(7L);
            return value;
        });

        InspeccionRecepcionCompra result = service().registrar(1L, 5L,
                InspeccionRecepcionCompra.builder().result("ACEPTADA")
                        .acceptedQuantity(8).rejectedQuantity(1).build());

        assertNotNull(result.getId());
        verify(audit).registrar(any(), any(), any(), any());
    }

    @Test
    void rechazaCantidadQueSuperaLaRecibida() {
        Producto product = Producto.builder().id(5L).code("P-5").name("Producto").build();
        RecepcionCompra receipt = RecepcionCompra.builder().id(1L).receiptNumber("RC-1").build();
        receipt.getItems().add(DetalleRecepcionCompra.builder().product(product).quantity(10).build());
        when(receipts.findById(1L)).thenReturn(Optional.of(receipt));
        when(products.findById(5L)).thenReturn(Optional.of(product));

        assertThrows(IllegalArgumentException.class, () -> service().registrar(1L, 5L,
                InspeccionRecepcionCompra.builder().result("OBSERVADA")
                        .acceptedQuantity(8).rejectedQuantity(5).build()));
        verify(inspections, never()).save(any());
    }

    @Test
    void rechazaProductoQueNoPerteneceALaRecepcion() {
        Producto product = Producto.builder().id(5L).code("P-5").name("Producto").build();
        RecepcionCompra receipt = RecepcionCompra.builder().id(1L).receiptNumber("RC-1").build();
        when(receipts.findById(1L)).thenReturn(Optional.of(receipt));
        when(products.findById(5L)).thenReturn(Optional.of(product));

        assertThrows(IllegalArgumentException.class, () -> service().registrar(1L, 5L,
                InspeccionRecepcionCompra.builder().result("ACEPTADA")
                        .acceptedQuantity(1).rejectedQuantity(0).build()));
        verify(inspections, never()).save(any());
    }
}
