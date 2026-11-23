package com.sigtm.backend.service;

import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import com.sigtm.backend.repository.RecepcionVehiculoRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VehiculoServicePaginadoTest {

    @Mock
    private VehiculoRepository vehiculoRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private CodeGeneratorService codeGeneratorService;

    @Mock
    private RecepcionVehiculoRepository recepcionRepository;

    @Mock
    private OrdenTrabajoRepository ordenTrabajoRepository;

    @Mock
    private AuditoriaService auditoriaService;

    @InjectMocks
    private VehiculoService service;

    private Vehiculo vehiculo() {
        return Vehiculo.builder()
                .id(7L)
                .code("VEH-000007")
                .plate("ABC-123")
                .brand("Toyota")
                .model("Corolla")
                .year(2022)
                .color("Blanco")
                .currentMileage(45000)
                .active(true)
                .registrationDate(LocalDate.of(2026, 1, 15))
                .build();
    }

    private void resumen(long total, long active, long inactive, long withMileage) {
        when(vehiculoRepository.count()).thenReturn(total);
        when(vehiculoRepository.countByActiveTrue()).thenReturn(active);
        when(vehiculoRepository.countByActiveFalse()).thenReturn(inactive);
        when(vehiculoRepository.countByCurrentMileageGreaterThan(0)).thenReturn(withMileage);
    }

    @Test
    @DisplayName("buscarPaginado devuelve contenido, metadatos y resumen del padrón")
    void buscarPaginado_ok() {
        Vehiculo vehiculo = vehiculo();
        when(vehiculoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(vehiculo), PageRequest.of(0, 10), 12));
        resumen(12, 10, 2, 8);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, "toyota", "ACTIVOS", "reciente");

        assertEquals(1, ((List<?>) resultado.get("content")).size());
        assertSame(vehiculo, ((List<?>) resultado.get("content")).get(0));
        assertEquals(1, resultado.get("page"));
        assertEquals(10, resultado.get("size"));
        assertEquals(12L, resultado.get("totalElements"));
        assertEquals(2, resultado.get("totalPages"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(12L, summary.get("total"));
        assertEquals(10L, summary.get("active"));
        assertEquals(2L, summary.get("inactive"));
        assertEquals(8L, summary.get("withMileage"));
    }

    @Test
    @DisplayName("buscarPaginado normaliza página negativa y limita el tamaño a 100")
    void buscarPaginado_normalizaParametros() {
        when(vehiculoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
        resumen(0, 0, 0, 0);

        service.buscarPaginado(-5, 500, null, null, null);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(vehiculoRepository).findAll(any(Specification.class), captor.capture());
        Pageable pageable = captor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(100, pageable.getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("registrationDate").getDirection());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("id").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado ordena por placa cuando se solicita")
    void buscarPaginado_ordenPlaca() {
        when(vehiculoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0);

        service.buscarPaginado(0, 10, null, "INACTIVOS", "placa");

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(vehiculoRepository).findAll(any(Specification.class), captor.capture());
        Sort.Order order = captor.getValue().getSort().getOrderFor("plate");
        assertEquals(Sort.Direction.ASC, order.getDirection());
    }

    @Test
    @DisplayName("buscarPaginado devuelve una página vacía sin errores")
    void buscarPaginado_vacio() {
        when(vehiculoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, null, "TODOS", null);

        assertTrue(((List<?>) resultado.get("content")).isEmpty());
        assertEquals(0L, resultado.get("totalElements"));
        assertEquals(0, resultado.get("totalPages"));
    }
}
