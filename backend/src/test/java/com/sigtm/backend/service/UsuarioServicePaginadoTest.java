package com.sigtm.backend.service;

import com.sigtm.backend.model.Rol;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.repository.RolRepository;
import com.sigtm.backend.repository.UsuarioRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsuarioServicePaginadoTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private RolRepository rolRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private AuditoriaService auditoriaService;

    @Mock
    private PresenceService presenceService;

    @InjectMocks
    private UsuarioService service;

    private Usuario usuario() {
        Rol rol = Rol.builder().name("ROLE_MECHANIC").build();
        return Usuario.builder()
                .id(3L)
                .name("Carlos")
                .lastName("Rojas")
                .username("crojas")
                .email("crojas@example.com")
                .phone("955555555")
                .role(rol)
                .active(true)
                .lastLogin(LocalDateTime.of(2026, 11, 7, 8, 30))
                .build();
    }

    private void resumen(long total, long active, long inactive) {
        when(usuarioRepository.count()).thenReturn(total);
        when(usuarioRepository.countByActiveTrue()).thenReturn(active);
        when(usuarioRepository.countByActiveFalse()).thenReturn(inactive);
    }

    @Test
    @DisplayName("buscarPaginado devuelve perfiles y resumen del directorio")
    void buscarPaginado_ok() {
        Usuario usuario = usuario();
        when(usuarioRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(usuario), PageRequest.of(0, 10), 20));
        when(presenceService.estaEnLinea(3L)).thenReturn(true);
        resumen(20, 17, 3);

        Map<String, Object> resultado = service.buscarPaginado(
                0, 10, "rojas", "ACTIVOS", "ROLE_MECHANIC");

        assertEquals(1, ((List<?>) resultado.get("content")).size());
        @SuppressWarnings("unchecked")
        Map<String, Object> perfil = (Map<String, Object>) ((List<?>) resultado.get("content")).get(0);
        assertEquals(3L, perfil.get("id"));
        assertEquals("Carlos", perfil.get("name"));
        assertEquals("Rojas", perfil.get("lastName"));
        assertEquals("ROLE_MECHANIC", perfil.get("roleName"));
        assertEquals(true, perfil.get("online"));
        assertEquals(1, resultado.get("page"));
        assertEquals(10, resultado.get("size"));
        assertEquals(20L, resultado.get("totalElements"));
        assertEquals(2, resultado.get("totalPages"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(20L, summary.get("total"));
        assertEquals(17L, summary.get("active"));
        assertEquals(3L, summary.get("inactive"));
    }

    @Test
    @DisplayName("buscarPaginado normaliza página negativa y limita el tamaño a 100")
    void buscarPaginado_normalizaParametros() {
        when(usuarioRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
        resumen(0, 0, 0);

        service.buscarPaginado(-7, 500, null, null, null);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(usuarioRepository).findAll(any(Specification.class), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(100, captor.getValue().getPageSize());
        assertEquals(Sort.Direction.ASC,
                captor.getValue().getSort().getOrderFor("name").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado devuelve una página vacía sin errores")
    void buscarPaginado_vacio() {
        when(usuarioRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, null, "INACTIVOS", "ROLE_ADMIN");

        assertTrue(((List<?>) resultado.get("content")).isEmpty());
        assertEquals(0L, resultado.get("totalElements"));
        assertEquals(0, resultado.get("totalPages"));
    }
}
