package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.ServicioCatalogo;
import com.sigtm.backend.repository.ServicioCatalogoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServicioCatalogoServiceTest {

    @Mock
    private ServicioCatalogoRepository repository;

    @InjectMocks
    private ServicioCatalogoService service;

    private ServicioCatalogo servicio() {
        return ServicioCatalogo.builder()
                .id(1L)
                .code("SRV-001")
                .name("Mantenimiento preventivo")
                .description("Cambio de aceite y revisión de niveles")
                .category("Mantenimiento")
                .defaultPrice(new BigDecimal("120.00"))
                .estimatedDurationMinutes(60)
                .active(true)
                .build();
    }

    @Test
    @DisplayName("obtenerActivos consulta solo los servicios habilitados")
    void obtenerActivos_ok() {
        ServicioCatalogo servicio = servicio();
        when(repository.findByActiveTrue()).thenReturn(List.of(servicio));

        List<ServicioCatalogo> resultado = service.obtenerActivos();

        assertEquals(1, resultado.size());
        assertSame(servicio, resultado.get(0));
        verify(repository).findByActiveTrue();
    }

    @Test
    @DisplayName("obtenerTodos consulta el catálogo completo ordenado")
    void obtenerTodos_ok() {
        when(repository.findAllByOrderByNameAsc()).thenReturn(List.of(servicio()));

        List<ServicioCatalogo> resultado = service.obtenerTodos();

        assertEquals(1, resultado.size());
        verify(repository).findAllByOrderByNameAsc();
    }

    @Test
    @DisplayName("obtenerPorId devuelve el servicio existente")
    void obtenerPorId_ok() {
        ServicioCatalogo servicio = servicio();
        when(repository.findById(1L)).thenReturn(Optional.of(servicio));

        assertSame(servicio, service.obtenerPorId(1L));
    }

    @Test
    @DisplayName("obtenerPorId lanza ResourceNotFoundException si no existe")
    void obtenerPorId_inexistente() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.obtenerPorId(99L));
    }

    @Test
    @DisplayName("crearServicio normaliza el código y los textos")
    void crearServicio_ok() {
        ServicioCatalogo datos = servicio();
        datos.setCode("  srv-001  ");
        datos.setName("  Mantenimiento preventivo  ");
        datos.setDescription("  Cambio de aceite  ");
        datos.setCategory("  Mantenimiento  ");
        when(repository.findByCodeIgnoreCase("SRV-001")).thenReturn(Optional.empty());
        when(repository.save(any(ServicioCatalogo.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ServicioCatalogo creado = service.crearServicio(datos);

        assertEquals("SRV-001", creado.getCode());
        assertEquals("Mantenimiento preventivo", creado.getName());
        assertEquals("Cambio de aceite", creado.getDescription());
        assertEquals("Mantenimiento", creado.getCategory());
        assertEquals(true, creado.getActive());
    }

    @Test
    @DisplayName("crearServicio rechaza un código duplicado")
    void crearServicio_duplicado() {
        when(repository.findByCodeIgnoreCase("SRV-001"))
                .thenReturn(Optional.of(servicio()));

        assertThrows(DuplicateResourceException.class,
                () -> service.crearServicio(servicio()));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio rechaza una tarifa negativa")
    void crearServicio_tarifaNegativa() {
        ServicioCatalogo datos = servicio();
        datos.setDefaultPrice(new BigDecimal("-1"));

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("actualizarServicio conserva los campos no informados")
    void actualizarServicio_ok() {
        ServicioCatalogo existente = servicio();
        ServicioCatalogo cambios = ServicioCatalogo.builder()
                .name("Alineación y balanceo")
                .defaultPrice(new BigDecimal("90.00"))
                .active(false)
                .build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(existente)).thenReturn(existente);

        ServicioCatalogo actualizado = service.actualizarServicio(1L, cambios);

        assertEquals("Alineación y balanceo", actualizado.getName());
        assertEquals(new BigDecimal("90.00"), actualizado.getDefaultPrice());
        assertEquals(false, actualizado.getActive());
        assertTrue(actualizado.getDescription().contains("aceite"));
        assertEquals(60, actualizado.getEstimatedDurationMinutes());
    }

    @Test
    @DisplayName("actualizarServicio exige un nombre")
    void actualizarServicio_sinNombre() {
        ServicioCatalogo existente = servicio();
        ServicioCatalogo cambios = ServicioCatalogo.builder().build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));

        assertThrows(IllegalArgumentException.class,
                () -> service.actualizarServicio(1L, cambios));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio exige el código")
    void crearServicio_sinCodigo() {
        ServicioCatalogo datos = servicio();
        datos.setCode("   ");

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio limita el código a 50 caracteres")
    void crearServicio_codigoLargo() {
        ServicioCatalogo datos = servicio();
        datos.setCode("S".repeat(51));

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio rechaza una duración negativa")
    void crearServicio_duracionNegativa() {
        ServicioCatalogo datos = servicio();
        datos.setEstimatedDurationMinutes(-5);

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("actualizarServicio limpia la descripción cuando llega vacía")
    void actualizarServicio_limpiaDescripcion() {
        ServicioCatalogo existente = servicio();
        ServicioCatalogo cambios = ServicioCatalogo.builder()
                .name("Mantenimiento preventivo")
                .description("   ")
                .build();
        when(repository.findById(1L)).thenReturn(Optional.of(existente));
        when(repository.save(existente)).thenReturn(existente);

        ServicioCatalogo actualizado = service.actualizarServicio(1L, cambios);

        assertEquals(null, actualizado.getDescription());
    }

    @Test
    @DisplayName("actualizarServicio lanza ResourceNotFoundException si no existe")
    void actualizarServicio_inexistente() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> service.actualizarServicio(99L, servicio()));
    }

    @Test
    @DisplayName("crearServicio limita el nombre a 100 caracteres")
    void crearServicio_nombreLargo() {
        ServicioCatalogo datos = servicio();
        datos.setName("N".repeat(101));

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio limita la categoría a 50 caracteres")
    void crearServicio_categoriaLarga() {
        ServicioCatalogo datos = servicio();
        datos.setCategory("C".repeat(51));

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio limita la descripción a 255 caracteres")
    void crearServicio_descripcionLarga() {
        ServicioCatalogo datos = servicio();
        datos.setDescription("D".repeat(256));

        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(datos));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crearServicio rechaza datos nulos")
    void crearServicio_nulo() {
        assertThrows(IllegalArgumentException.class,
                () -> service.crearServicio(null));
        verify(repository, never()).save(any());
    }
}
