package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.PlanificacionAbastecimientoService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PlanificacionAbastecimientoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(PlanificacionAbastecimientoControllerTest.MethodSecurityConfig.class)
class PlanificacionAbastecimientoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PlanificacionAbastecimientoService service;

    @Test
    @DisplayName("GET /api/planificacion-abastecimiento/pronosticos devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void pronosticos_ok() throws Exception {
        when(service.listarPronosticosDto("2026-11")).thenReturn(List.of());

        mockMvc.perform(get("/api/planificacion-abastecimiento/pronosticos").param("period", "2026-11"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/planificacion-abastecimiento/planes devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void planes_ok() throws Exception {
        when(service.listarPlanesDto()).thenReturn(List.of());

        mockMvc.perform(get("/api/planificacion-abastecimiento/planes")).andExpect(status().isOk());
        verify(service).listarPlanesDto();
    }

    @Test
    @DisplayName("GET /api/planificacion-abastecimiento/planes/{id} devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void plan_ok() throws Exception {
        when(service.obtenerPlanDto(5L)).thenReturn(mock(ComprasResponses.PlanCompraResponse.class));

        mockMvc.perform(get("/api/planificacion-abastecimiento/planes/5")).andExpect(status().isOk());
        verify(service).obtenerPlanDto(5L);
    }

    @Test
    @DisplayName("GET /api/planificacion-abastecimiento/planes sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void planes_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/planificacion-abastecimiento/planes")).andExpect(status().isForbidden());
        verify(service, never()).listarPlanesDto();
    }

    @Test
    @DisplayName("POST /api/planificacion-abastecimiento/planes/generar devuelve 200")
    @WithMockUser(authorities = "COMPRAS:EDITAR")
    void generar_ok() throws Exception {
        when(service.generarDesdePronosticosDto("2026-11", "Reposición"))
                .thenReturn(mock(ComprasResponses.PlanCompraResponse.class));

        mockMvc.perform(post("/api/planificacion-abastecimiento/planes/generar")
                        .param("period", "2026-11")
                        .param("notes", "Reposición"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/planificacion-abastecimiento/planes/generar sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void generar_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/planificacion-abastecimiento/planes/generar").param("period", "2026-11"))
                .andExpect(status().isForbidden());

        verify(service, never()).generarDesdePronosticosDto(any(), any());
    }
}
