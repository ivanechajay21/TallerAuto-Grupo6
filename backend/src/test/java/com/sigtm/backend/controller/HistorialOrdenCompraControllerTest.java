package com.sigtm.backend.controller;

import com.sigtm.backend.service.CompraService;
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

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = HistorialOrdenCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(HistorialOrdenCompraControllerTest.MethodSecurityConfig.class)
class HistorialOrdenCompraControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompraService service;

    @Test
    @DisplayName("GET /api/compras/{id}/historial devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void historial_ok() throws Exception {
        when(service.historial(3L)).thenReturn(List.of());

        mockMvc.perform(get("/api/compras/3/historial")).andExpect(status().isOk());
        verify(service).historial(3L);
    }

    @Test
    @DisplayName("GET /api/compras/{id}/historial sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void historial_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/compras/3/historial")).andExpect(status().isForbidden());
        verify(service, never()).historial(3L);
    }
}
