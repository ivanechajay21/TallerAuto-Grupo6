package com.sigtm.backend.controller;

import com.sigtm.backend.service.CitaService;
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

@WebMvcTest(controllers = CitaController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CitaControllerTest.MethodSecurityConfig.class)
class CitaControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CitaService citaService;

    @Test
    @DisplayName("GET /api/citas/paginado devuelve página y resumen")
    @WithMockUser(authorities = "CITAS:VER")
    void paginado_ok() throws Exception {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("upcoming", 3);
        resumen.put("confirmed", 1);
        resumen.put("inProcess", 1);
        resumen.put("completed", 2);
        resumen.put("history", 2);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", List.of(Map.of("id", 1, "requestedService", "Mantenimiento")));
        respuesta.put("page", 1);
        respuesta.put("size", 10);
        respuesta.put("totalElements", 3);
        respuesta.put("totalPages", 1);
        respuesta.put("summary", resumen);

        when(citaService.buscarPaginado(0, 10, "proximas", "ana", "PENDING"))
                .thenReturn(respuesta);

        mockMvc.perform(get("/api/citas/paginado")
                        .param("page", "0")
                        .param("size", "10")
                        .param("tab", "proximas")
                        .param("search", "ana")
                        .param("status", "PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].requestedService").value("Mantenimiento"))
                .andExpect(jsonPath("$.summary.upcoming").value(3));

        verify(citaService).buscarPaginado(0, 10, "proximas", "ana", "PENDING");
    }

    @Test
    @DisplayName("GET /api/citas/paginado sin CITAS:VER devuelve 403")
    @WithMockUser(authorities = {})
    void paginado_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/citas/paginado"))
                .andExpect(status().isForbidden());

        verify(citaService, never()).buscarPaginado(0, 10, "proximas", null, "TODAS");
    }
}
