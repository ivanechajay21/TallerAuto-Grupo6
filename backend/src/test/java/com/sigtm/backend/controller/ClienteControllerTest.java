package com.sigtm.backend.controller;

import com.sigtm.backend.service.ClienteService;
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

@WebMvcTest(controllers = ClienteController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ClienteControllerTest.MethodSecurityConfig.class)
class ClienteControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ClienteService clienteService;

    @Test
    @DisplayName("GET /api/clientes/paginado devuelve página y resumen")
    @WithMockUser(authorities = "CLIENTES:VER")
    void paginado_ok() throws Exception {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", 8);
        resumen.put("active", 7);
        resumen.put("inactive", 1);
        resumen.put("whatsapp", 5);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", List.of(Map.of("id", 1, "firstName", "Ana")));
        respuesta.put("page", 1);
        respuesta.put("size", 9);
        respuesta.put("totalElements", 8);
        respuesta.put("totalPages", 1);
        respuesta.put("summary", resumen);

        when(clienteService.buscarPaginado(0, 9, "ana", "ACTIVOS", "reciente"))
                .thenReturn(respuesta);

        mockMvc.perform(get("/api/clientes/paginado")
                        .param("page", "0")
                        .param("size", "9")
                        .param("search", "ana")
                        .param("status", "ACTIVOS")
                        .param("sort", "reciente"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].firstName").value("Ana"))
                .andExpect(jsonPath("$.totalElements").value(8))
                .andExpect(jsonPath("$.summary.whatsapp").value(5));

        verify(clienteService).buscarPaginado(0, 9, "ana", "ACTIVOS", "reciente");
    }

    @Test
    @DisplayName("GET /api/clientes/paginado sin CLIENTES:VER devuelve 403")
    @WithMockUser(authorities = {})
    void paginado_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/clientes/paginado"))
                .andExpect(status().isForbidden());

        verify(clienteService, never()).buscarPaginado(0, 9, null, "TODOS", "reciente");
    }
}
