package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.AprobacionCompraService;
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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AprobacionCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AprobacionCompraControllerTest.MethodSecurityConfig.class)
class AprobacionCompraControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AprobacionCompraService service;

    @Test
    @DisplayName("GET /api/compras/aprobaciones/niveles devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void niveles_ok() throws Exception {
        when(service.nivelesDto()).thenReturn(List.of());

        mockMvc.perform(get("/api/compras/aprobaciones/niveles")).andExpect(status().isOk());
        verify(service).nivelesDto();
    }

    @Test
    @DisplayName("GET /api/compras/aprobaciones/niveles sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void niveles_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/compras/aprobaciones/niveles")).andExpect(status().isForbidden());
        verify(service, never()).nivelesDto();
    }

    @Test
    @DisplayName("POST /api/compras/aprobaciones/orden/{id}/nivel/{nivel} decide la aprobación")
    @WithMockUser(authorities = "COMPRAS:APROBAR")
    void decidir_ok() throws Exception {
        when(service.decidirDto(3L, 1L, "APPROVED", "ok"))
                .thenReturn(mock(ComprasResponses.AprobacionOrdenCompraResponse.class));

        mockMvc.perform(post("/api/compras/aprobaciones/orden/3/nivel/1")
                        .param("decision", "approved")
                        .param("comment", "ok"))
                .andExpect(status().isOk());

        verify(service).decidirDto(3L, 1L, "APPROVED", "ok");
    }

    @Test
    @DisplayName("POST /api/compras/aprobaciones/orden/{id}/nivel/{nivel} sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void decidir_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/compras/aprobaciones/orden/3/nivel/1").param("decision", "approved"))
                .andExpect(status().isForbidden());

        verify(service, never()).decidirDto(3L, 1L, "APPROVED", null);
    }

    @Test
    @DisplayName("GET /api/compras/aprobaciones/orden/{id} devuelve el historial")
    @WithMockUser(authorities = "COMPRAS:VER")
    void historial_ok() throws Exception {
        when(service.historialDto(3L)).thenReturn(List.of());

        mockMvc.perform(get("/api/compras/aprobaciones/orden/3")).andExpect(status().isOk());
        verify(service).historialDto(3L);
    }
}
