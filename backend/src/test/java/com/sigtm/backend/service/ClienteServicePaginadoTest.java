package com.sigtm.backend.service;

import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.repository.ClienteRepository;
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
class ClienteServicePaginadoTest {

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private CodeGeneratorService codeGeneratorService;

    @Mock
    private AuditoriaService auditoriaService;

    @InjectMocks
    private ClienteService service;

    private Cliente cliente() {
        return Cliente.builder()
                .id(4L)
                .code("CLI-000004")
                .firstName("María")
                .lastName("Quispe")
                .documentNumber("45678912")
                .phone("987654321")
                .whatsapp("987654321")
                .email("maria@example.com")
                .active(true)
                .registrationDate(LocalDate.of(2026, 2, 1))
                .build();
    }

    private void resumen(long total, long active, long inactive, long whatsapp) {
        when(clienteRepository.count()).thenReturn(total);
        when(clienteRepository.countByActiveTrue()).thenReturn(active);
        when(clienteRepository.countByActiveFalse()).thenReturn(inactive);
        when(clienteRepository.countByWhatsappIsNotNullAndWhatsappNot("")).thenReturn(whatsapp);
    }

    @Test
    @DisplayName("buscarPaginado devuelve contenido, metadatos y resumen del padrón")
    void buscarPaginado_ok() {
        Cliente cliente = cliente();
        when(clienteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(cliente), PageRequest.of(0, 10), 21));
        resumen(21, 18, 3, 15);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, "maría", "ACTIVOS", "nombre");

        assertEquals(1, ((List<?>) resultado.get("content")).size());
        assertSame(cliente, ((List<?>) resultado.get("content")).get(0));
        assertEquals(1, resultado.get("page"));
        assertEquals(10, resultado.get("size"));
        assertEquals(21L, resultado.get("totalElements"));
        assertEquals(3, resultado.get("totalPages"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(21L, summary.get("total"));
        assertEquals(18L, summary.get("active"));
        assertEquals(3L, summary.get("inactive"));
        assertEquals(15L, summary.get("whatsapp"));
    }

    @Test
    @DisplayName("buscarPaginado normaliza página negativa y limita el tamaño a 100")
    void buscarPaginado_normalizaParametros() {
        when(clienteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
        resumen(0, 0, 0, 0);

        service.buscarPaginado(-3, 1000, null, null, null);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(clienteRepository).findAll(any(Specification.class), captor.capture());
        Pageable pageable = captor.getValue();
        assertEquals(0, pageable.getPageNumber());
        assertEquals(100, pageable.getPageSize());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("registrationDate").getDirection());
        assertEquals(Sort.Direction.DESC, pageable.getSort().getOrderFor("id").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado ordena por apellidos y nombre cuando se solicita")
    void buscarPaginado_ordenNombre() {
        when(clienteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0);

        service.buscarPaginado(0, 10, null, "TODOS", "nombre");

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(clienteRepository).findAll(any(Specification.class), captor.capture());
        Sort sort = captor.getValue().getSort();
        assertEquals(Sort.Direction.ASC, sort.getOrderFor("firstName").getDirection());
        assertEquals(Sort.Direction.ASC, sort.getOrderFor("lastName").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado devuelve una página vacía sin errores")
    void buscarPaginado_vacio() {
        when(clienteRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, null, "INACTIVOS", "codigo");

        assertTrue(((List<?>) resultado.get("content")).isEmpty());
        assertEquals(0L, resultado.get("totalElements"));
        assertEquals(0, resultado.get("totalPages"));
    }
}
