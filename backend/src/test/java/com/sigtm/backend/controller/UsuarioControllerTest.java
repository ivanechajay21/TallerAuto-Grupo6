package com.sigtm.backend.controller;

import com.sigtm.backend.service.UsuarioService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = UsuarioController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(UsuarioControllerTest.MethodSecurityConfig.class)
class UsuarioControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService usuarioService;

    @Test
    @DisplayName("GET /api/usuarios/paginado devuelve página y resumen")
    @WithMockUser(authorities = "USUARIOS:VER")
    void paginado_ok() throws Exception {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", 4);
        resumen.put("active", 3);
        resumen.put("inactive", 1);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", List.of(Map.of("id", 1, "name", "Ana")));
        respuesta.put("page", 1);
        respuesta.put("size", 10);
        respuesta.put("totalElements", 4);
        respuesta.put("totalPages", 1);
        respuesta.put("summary", resumen);

        when(usuarioService.buscarPaginado(0, 10, "ana", "ACTIVOS", "ROLE_ADMIN"))
                .thenReturn(respuesta);

        mockMvc.perform(get("/api/usuarios/paginado")
                        .param("page", "0")
                        .param("size", "10")
                        .param("search", "ana")
                        .param("status", "ACTIVOS")
                        .param("role", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Ana"))
                .andExpect(jsonPath("$.summary.active").value(3));

        verify(usuarioService).buscarPaginado(0, 10, "ana", "ACTIVOS", "ROLE_ADMIN");
    }

    @Test
    @DisplayName("GET /api/usuarios/paginado sin USUARIOS:VER devuelve 403")
    @WithMockUser(authorities = {})
    void paginado_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/usuarios/paginado"))
                .andExpect(status().isForbidden());

        verify(usuarioService, never()).buscarPaginado(0, 10, null, "TODOS", "TODOS");
    }
}
