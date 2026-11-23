package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.SeguimientoCompraService;
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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = SeguimientoCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(SeguimientoCompraControllerTest.MethodSecurityConfig.class)
class SeguimientoCompraControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SeguimientoCompraService service;

    @Test
    @DisplayName("GET /api/compras/{id}/seguimiento devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void obtener_ok() throws Exception {
        when(service.obtenerDto(3L)).thenReturn(mock(ComprasResponses.SeguimientoCompraResponse.class));

        mockMvc.perform(get("/api/compras/3/seguimiento")).andExpect(status().isOk());
        verify(service).obtenerDto(3L);
    }

    @Test
    @DisplayName("GET /api/compras/{id}/seguimiento sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void obtener_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/compras/3/seguimiento")).andExpect(status().isForbidden());
        verify(service, never()).obtenerDto(3L);
    }
}
