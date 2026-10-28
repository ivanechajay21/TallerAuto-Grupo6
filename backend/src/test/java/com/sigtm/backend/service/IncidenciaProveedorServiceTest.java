package com.sigtm.backend.service;

import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidenciaProveedorServiceTest {
    @Mock private IncidenciaProveedorRepository incidents;
    @Mock private ProveedorRepository suppliers;
    @Mock private OrdenCompraRepository orders;
    @Mock private AuditoriaService audit;
    private IncidenciaProveedorService service() { return new IncidenciaProveedorService(incidents, suppliers, orders, audit); }

    @Test
    void registraIncidenciaAbiertaConProveedor() {
        Proveedor supplier = Proveedor.builder().id(2L).businessName("Proveedor").taxId("201").build();
        IncidenciaProveedor input = IncidenciaProveedor.builder().category("CALIDAD").priority("ALTA").description("Envase dañado").build();
        when(suppliers.findById(2L)).thenReturn(Optional.of(supplier));
        when(incidents.save(any())).thenAnswer(i -> { IncidenciaProveedor value = i.getArgument(0); value.setId(9L); return value; });

        IncidenciaProveedor result = service().crear(2L, null, input);

        assertEquals("ABIERTA", result.getStatus());
        assertEquals(supplier, result.getSupplier());
        assertNotNull(result.getReportedAt());
        verify(audit).registrar(eq("CREATE"), eq("INCIDENCIA_PROVEEDOR"), eq(9L), contains("CALIDAD"));
    }

    @Test
    void rechazaCategoriaNoReconocida() {
        when(suppliers.findById(2L)).thenReturn(Optional.of(Proveedor.builder().id(2L).build()));
        IncidenciaProveedor input = IncidenciaProveedor.builder().category("OTRA").priority("ALTA").description("x").build();
        assertThrows(IllegalArgumentException.class, () -> service().crear(2L, null, input));
        verify(incidents, never()).save(any());
    }

    @Test
    void resuelveIncidenciaUnaSolaVez() {
        IncidenciaProveedor incident = IncidenciaProveedor.builder().id(7L).status("ABIERTA").build();
        when(incidents.findById(7L)).thenReturn(Optional.of(incident));
        when(incidents.save(incident)).thenReturn(incident);

        IncidenciaProveedor result = service().resolver(7L, "Proveedor reemplazó producto");

        assertEquals("RESUELTA", result.getStatus());
        assertNotNull(result.getResolvedAt());
        assertEquals("Proveedor reemplazó producto", result.getResolution());
    }

    @Test
    void fallaAlResolverIncidenciaInexistente() {
        when(incidents.findById(7L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service().resolver(7L, "x"));
    }
}
