package com.sigtm.backend.service;

import com.sigtm.backend.model.Cita;
import com.sigtm.backend.repository.CitaRepository;
import com.sigtm.backend.repository.ClienteRepository;
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
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CitaServicePaginadoTest {

    @Mock
    private CitaRepository citaRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private VehiculoRepository vehiculoRepository;

    @Mock
    private AuditoriaService auditoriaService;

    @Mock
    private NotificacionService notificacionService;

    @InjectMocks
    private CitaService service;

    private Cita cita() {
        return Cita.builder()
                .id(9L)
                .appointmentDate(LocalDate.of(2026, 11, 20))
                .appointmentTime(LocalTime.of(9, 30))
                .requestedService("Cambio de aceite")
                .priority("MEDIA")
                .status("PENDING")
                .observations("Cliente puntual")
                .build();
    }

    private void resumen(long upcoming, long confirmed, long inProcess, long completed, long history) {
        when(citaRepository.countByStatusIn(anyList())).thenReturn(upcoming);
        when(citaRepository.countByStatus("CONFIRMED")).thenReturn(confirmed);
        when(citaRepository.countByStatus("IN_PROCESS")).thenReturn(inProcess);
        when(citaRepository.countByStatus("COMPLETED")).thenReturn(completed);
        when(citaRepository.countByStatusNotIn(anyList())).thenReturn(history);
    }

    @Test
    @DisplayName("buscarPaginado devuelve citas mapeadas y resumen de la agenda")
    void buscarPaginado_ok() {
        Cita cita = cita();
        when(citaRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(cita), PageRequest.of(0, 10), 20));
        resumen(3, 2, 1, 1, 1);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, "proximas", "aceite", "TODAS");

        assertEquals(1, ((List<?>) resultado.get("content")).size());
        @SuppressWarnings("unchecked")
        Map<String, Object> fila = (Map<String, Object>) ((List<?>) resultado.get("content")).get(0);
        assertEquals(9L, fila.get("id"));
        assertEquals("2026-11-20", fila.get("appointmentDate"));
        assertEquals("09:30", fila.get("appointmentTime"));
        assertEquals("PENDING", fila.get("status"));
        assertEquals(1, resultado.get("page"));
        assertEquals(10, resultado.get("size"));
        assertEquals(20L, resultado.get("totalElements"));
        assertEquals(2, resultado.get("totalPages"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(3L, summary.get("upcoming"));
        assertEquals(2L, summary.get("confirmed"));
        assertEquals(1L, summary.get("inProcess"));
        assertEquals(1L, summary.get("completed"));
        assertEquals(1L, summary.get("history"));
    }

    @Test
    @DisplayName("buscarPaginado usa orden descendente en la pestaña historial")
    void buscarPaginado_historial() {
        when(citaRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0, 0);

        service.buscarPaginado(0, 10, "historial", null, "COMPLETED");

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(citaRepository).findAll(any(Specification.class), captor.capture());
        Sort sort = captor.getValue().getSort();
        assertEquals(Sort.Direction.DESC, sort.getOrderFor("appointmentDate").getDirection());
        assertEquals(Sort.Direction.DESC, sort.getOrderFor("appointmentTime").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado normaliza página negativa y limita el tamaño a 100")
    void buscarPaginado_normalizaParametros() {
        when(citaRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
        resumen(0, 0, 0, 0, 0);

        service.buscarPaginado(-4, 500, null, null, null);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(citaRepository).findAll(any(Specification.class), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(100, captor.getValue().getPageSize());
    }

    @Test
    @DisplayName("buscarPaginado devuelve una página vacía sin errores")
    void buscarPaginado_vacio() {
        when(citaRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0, 0);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, "proximas", null, "TODAS");

        assertTrue(((List<?>) resultado.get("content")).isEmpty());
        assertEquals(0L, resultado.get("totalElements"));
        assertEquals(0, resultado.get("totalPages"));
    }
}
