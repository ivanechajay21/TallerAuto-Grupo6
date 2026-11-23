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

@WebMvcTest(controllers = DevolucionCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(DevolucionCompraControllerTest.MethodSecurityConfig.class)
class DevolucionCompraControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompraService service;

    @Test
    @DisplayName("GET /api/compras/{id}/devoluciones devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void listar_ok() throws Exception {
        when(service.devolucionesDto(3L)).thenReturn(List.of());

        mockMvc.perform(get("/api/compras/3/devoluciones")).andExpect(status().isOk());
        verify(service).devolucionesDto(3L);
    }

    @Test
    @DisplayName("GET /api/compras/{id}/devoluciones sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/compras/3/devoluciones")).andExpect(status().isForbidden());
        verify(service, never()).devolucionesDto(3L);
    }
}
