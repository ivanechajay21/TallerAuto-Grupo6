package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.InspeccionRecepcionCompraService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = InspeccionRecepcionCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(InspeccionRecepcionCompraControllerTest.MethodSecurityConfig.class)
class InspeccionRecepcionCompraControllerTest {

    private static final String INSPECCION =
            "{\"result\":\"ACEPTADA\",\"acceptedQuantity\":2,\"rejectedQuantity\":0}";

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private InspeccionRecepcionCompraService service;

    @Test
    @DisplayName("GET /api/recepciones/{id}/inspecciones devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void listar_ok() throws Exception {
        when(service.listarDto(5L)).thenReturn(List.of());

        mockMvc.perform(get("/api/recepciones/5/inspecciones")).andExpect(status().isOk());
        verify(service).listarDto(5L);
    }

    @Test
    @DisplayName("GET /api/recepciones/{id}/inspecciones sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/recepciones/5/inspecciones")).andExpect(status().isForbidden());
        verify(service, never()).listarDto(5L);
    }

    @Test
    @DisplayName("POST /api/recepciones/{id}/inspecciones/producto/{producto} registra la inspección")
    @WithMockUser(authorities = "COMPRAS:RECEPCIONAR")
    void registrar_ok() throws Exception {
        when(service.registrarDto(eq(5L), eq(7L), any()))
                .thenReturn(mock(ComprasResponses.InspeccionRecepcionCompraResponse.class));

        mockMvc.perform(post("/api/recepciones/5/inspecciones/producto/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INSPECCION))
                .andExpect(status().isOk());

        verify(service).registrarDto(eq(5L), eq(7L), any());
    }

    @Test
    @DisplayName("POST /api/recepciones/{id}/inspecciones/producto/{producto} sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void registrar_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/recepciones/5/inspecciones/producto/7")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(INSPECCION))
                .andExpect(status().isForbidden());

        verify(service, never()).registrarDto(eq(5L), eq(7L), any());
    }
}
