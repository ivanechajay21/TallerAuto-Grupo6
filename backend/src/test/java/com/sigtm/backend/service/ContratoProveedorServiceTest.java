package com.sigtm.backend.service;

import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.ContratoProveedor;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.ContratoProveedorRepository;
import com.sigtm.backend.repository.ProveedorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContratoProveedorServiceTest {
    @Mock private ContratoProveedorRepository contracts;
    @Mock private ProveedorRepository suppliers;
    @Mock private AuditoriaService audit;

    @Test
    void creaContratoConProveedorYCodigoGenerado() {
        Proveedor supplier = Proveedor.builder().id(5L).businessName("Autopartes SAC").taxId("20111111111").build();
        ContratoProveedor input = contract(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        when(suppliers.findById(5L)).thenReturn(Optional.of(supplier));
        when(contracts.save(any(ContratoProveedor.class))).thenAnswer(invocation -> {
            ContratoProveedor saved = invocation.getArgument(0); saved.setId(8L); return saved;
        });

        ContratoProveedor saved = new ContratoProveedorService(contracts, suppliers, audit).crear(5L, input);

        assertEquals(supplier, saved.getSupplier());
        assertTrue(saved.getCode().startsWith("CP-"));
        assertTrue(saved.getActive());
        verify(audit).registrar(eq("CREATE"), eq("CONTRATO_PROVEEDOR"), eq(8L), contains("CP-"));
    }

    @Test
    void rechazaContratoConVigenciaInvalida() {
        Proveedor supplier = Proveedor.builder().id(5L).businessName("Autopartes SAC").taxId("20111111111").build();
        when(suppliers.findById(5L)).thenReturn(Optional.of(supplier));

        assertThrows(IllegalArgumentException.class, () -> new ContratoProveedorService(contracts, suppliers, audit)
                .crear(5L, contract(LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1))));
        verify(contracts, never()).save(any());
    }

    @Test
    void fallaSiNoExisteProveedor() {
        when(suppliers.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> new ContratoProveedorService(contracts, suppliers, audit)
                .crear(99L, contract(LocalDate.now(), LocalDate.now().plusDays(1))));
    }

    @Test
    void rechazaContratoConFechasNulas() {
        when(suppliers.findById(5L)).thenReturn(Optional.of(Proveedor.builder().id(5L).build()));
        ContratoProveedor input = ContratoProveedor.builder().currency("PEN")
                .discountPercentage(BigDecimal.ZERO).paymentDays(30)
                .minimumPurchase(BigDecimal.ZERO).build();

        assertThrows(IllegalArgumentException.class,
                () -> new ContratoProveedorService(contracts, suppliers, audit).crear(5L, input));
        verify(contracts, never()).save(any());
    }

    @Test
    void actualizaContratoDelProveedorYLoReactiva() {
        Proveedor supplier = Proveedor.builder().id(5L).businessName("Proveedor").build();
        ContratoProveedor existing = ContratoProveedor.builder().id(8L).code("CP-8").supplier(supplier)
                .startsAt(LocalDate.now()).endsAt(LocalDate.now().plusYears(1)).currency("PEN")
                .discountPercentage(BigDecimal.ZERO).paymentDays(30).minimumPurchase(BigDecimal.ZERO)
                .active(false).build();
        when(contracts.findById(8L)).thenReturn(Optional.of(existing));
        when(contracts.save(any(ContratoProveedor.class))).thenAnswer(i -> i.getArgument(0));

        ContratoProveedor updated = contract(LocalDate.now(), LocalDate.now().plusYears(2));
        updated.setTerms("Nuevo término");
        var result = new ContratoProveedorService(contracts, suppliers, audit).actualizarDto(5L, 8L, updated);

        assertEquals("Nuevo término", result.terms());
        assertEquals(8L, result.id());
        new ContratoProveedorService(contracts, suppliers, audit).reactivarDto(5L, 8L);
        assertEquals(true, existing.getActive());
    }

    @Test
    void noPermiteConsultarNiDesactivarUnContratoDeOtroProveedor() {
        Proveedor supplier = Proveedor.builder().id(5L).businessName("Proveedor").build();
        ContratoProveedor existing = ContratoProveedor.builder().id(8L).code("CP-8").supplier(supplier)
                .active(true).build();
        when(contracts.findById(8L)).thenReturn(Optional.of(existing));

        ContratoProveedorService service = new ContratoProveedorService(contracts, suppliers, audit);
        assertThrows(ResourceNotFoundException.class, () -> service.obtenerDto(6L, 8L));
        assertThrows(ResourceNotFoundException.class, () -> service.desactivarDto(6L, 8L));
        assertTrue(existing.getActive());
        verify(contracts, never()).save(any());
    }

    private ContratoProveedor contract(LocalDate start, LocalDate end) {
        return ContratoProveedor.builder().startsAt(start).endsAt(end).currency("PEN")
                .discountPercentage(BigDecimal.ZERO).paymentDays(30).minimumPurchase(BigDecimal.ZERO).terms("Pago a crédito").build();
    }
}
