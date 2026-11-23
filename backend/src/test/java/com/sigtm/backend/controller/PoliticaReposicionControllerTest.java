package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.PoliticaReposicionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PoliticaReposicionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(PoliticaReposicionControllerTest.MethodSecurityConfig.class)
class PoliticaReposicionControllerTest {

    private static final String POLITICA =
            "{\"reorderPoint\":5,\"minimumLot\":2,\"targetStock\":10,\"leadTimeDays\":3}";

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PoliticaReposicionService service;

    @Test
    @DisplayName("GET /api/reposicion/politicas devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void listar_ok() throws Exception {
        when(service.listarDto()).thenReturn(List.of());

        mockMvc.perform(get("/api/reposicion/politicas")).andExpect(status().isOk());
        verify(service).listarDto();
    }

    @Test
    @DisplayName("GET /api/reposicion/politicas sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/reposicion/politicas")).andExpect(status().isForbidden());
        verify(service, never()).listarDto();
    }

    @Test
    @DisplayName("PUT /api/reposicion/politicas/producto/{id} guarda la política")
    @WithMockUser(authorities = "COMPRAS:EDITAR")
    void guardar_ok() throws Exception {
        when(service.guardarDto(eq(4L), eq(2L), any()))
                .thenReturn(mock(ComprasResponses.PoliticaReposicionResponse.class));

        mockMvc.perform(put("/api/reposicion/politicas/producto/4")
                        .param("supplierId", "2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(POLITICA))
                .andExpect(status().isOk());

        verify(service).guardarDto(eq(4L), eq(2L), any());
    }

    @Test
    @DisplayName("PUT /api/reposicion/politicas/producto/{id} sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void guardar_sinPermiso_403() throws Exception {
        mockMvc.perform(put("/api/reposicion/politicas/producto/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(POLITICA))
                .andExpect(status().isForbidden());

        verify(service, never()).guardarDto(eq(4L), any(), any());
    }
}
