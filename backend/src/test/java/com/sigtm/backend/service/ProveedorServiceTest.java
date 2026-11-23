package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.ProveedorRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProveedorServiceTest {

    @Mock
    private ProveedorRepository proveedorRepository;

    @Mock
    private AuditoriaService auditoriaService;

    @InjectMocks
    private ProveedorService service;

    private Proveedor proveedor() {
        return Proveedor.builder()
                .id(3L)
                .businessName("Repuestos Andinos")
                .taxId("20512345678")
                .contactName("Luis Ramos")
                .email("ventas@andinos.test")
                .phone("988777666")
                .address("Av. Industrial 450")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("listar sin inactivos consulta solo proveedores activos")
    void listar_activos() {
        Proveedor proveedor = proveedor();
        when(proveedorRepository.findByActiveTrueOrderByBusinessNameAsc())
                .thenReturn(List.of(proveedor));

        List<Proveedor> resultado = service.listar(false);

        assertEquals(1, resultado.size());
        assertSame(proveedor, resultado.get(0));
        verify(proveedorRepository).findByActiveTrueOrderByBusinessNameAsc();
        verify(proveedorRepository, never()).findAll();
    }

    @Test
    @DisplayName("listar con inactivos consulta el catálogo completo")
    void listar_incluyeInactivos() {
        when(proveedorRepository.findAll()).thenReturn(List.of(proveedor()));

        List<Proveedor> resultado = service.listar(true);

        assertEquals(1, resultado.size());
        verify(proveedorRepository).findAll();
    }

    @Test
    @DisplayName("obtener devuelve el proveedor existente")
    void obtener_ok() {
        Proveedor proveedor = proveedor();
        when(proveedorRepository.findById(3L)).thenReturn(Optional.of(proveedor));

        assertSame(proveedor, service.obtener(3L));
    }

    @Test
    @DisplayName("obtener lanza ResourceNotFoundException si no existe")
    void obtener_inexistente() {
        when(proveedorRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.obtener(99L));
    }

    @Test
    @DisplayName("crear normaliza los datos y audita el alta")
    void crear_ok() {
        Proveedor datos = proveedor();
        datos.setBusinessName("  Repuestos Andinos  ");
        datos.setTaxId("  20512345678  ");
        when(proveedorRepository.findByTaxIdIgnoreCase("20512345678"))
                .thenReturn(Optional.empty());
        when(proveedorRepository.save(any(Proveedor.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Proveedor creado = service.crear(datos);

        assertEquals("Repuestos Andinos", creado.getBusinessName());
        assertEquals("20512345678", creado.getTaxId());
        assertEquals(true, creado.getActive());
        verify(auditoriaService).registrar("CREATE", "PROVEEDOR", 3L,
                "Proveedor registrado: Repuestos Andinos");
    }

    @Test
    @DisplayName("crear rechaza un documento duplicado")
    void crear_duplicado() {
        Proveedor datos = proveedor();
        when(proveedorRepository.findByTaxIdIgnoreCase("20512345678"))
                .thenReturn(Optional.of(proveedor()));

        assertThrows(DuplicateResourceException.class, () -> service.crear(datos));
        verify(proveedorRepository, never()).save(any());
    }

    @Test
    @DisplayName("desactivar marca el proveedor como inactivo y audita el cambio")
    void desactivar_ok() {
        Proveedor proveedor = proveedor();
        when(proveedorRepository.findById(3L)).thenReturn(Optional.of(proveedor));
        when(proveedorRepository.save(proveedor)).thenReturn(proveedor);

        service.desactivar(3L);

        assertFalse(proveedor.getActive());
        verify(auditoriaService).registrar("DELETE", "PROVEEDOR", 3L,
                "Proveedor desactivado: Repuestos Andinos");
    }
}
