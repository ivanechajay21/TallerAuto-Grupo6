package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.CuentaPorPagarService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CuentaPorPagarController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CuentaPorPagarControllerTest.MethodSecurityConfig.class)
class CuentaPorPagarControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CuentaPorPagarService service;

    @Test
    @DisplayName("GET /api/cuentas-por-pagar con COMPRAS:VER devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void listar_ok() throws Exception {
        when(service.listarDto()).thenReturn(List.of());

        mockMvc.perform(get("/api/cuentas-por-pagar")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/cuentas-por-pagar sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/cuentas-por-pagar")).andExpect(status().isForbidden());
        verify(service, never()).listarDto();
    }

    @Test
    @DisplayName("GET /api/cuentas-por-pagar/{id} devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void obtener_ok() throws Exception {
        ComprasResponses.FacturaProveedorResponse factura = mock(ComprasResponses.FacturaProveedorResponse.class);
        when(service.obtenerDto(5L)).thenReturn(factura);

        mockMvc.perform(get("/api/cuentas-por-pagar/5")).andExpect(status().isOk());
        verify(service).obtenerDto(5L);
    }

    @Test
    @DisplayName("PATCH /api/cuentas-por-pagar/{id}/anular con COMPRAS:ANULAR devuelve 200")
    @WithMockUser(authorities = "COMPRAS:ANULAR")
    void anular_ok() throws Exception {
        when(service.anularDto(5L)).thenReturn(mock(ComprasResponses.FacturaProveedorResponse.class));

        mockMvc.perform(patch("/api/cuentas-por-pagar/5/anular")).andExpect(status().isOk());
        verify(service).anularDto(5L);
    }

    @Test
    @DisplayName("PATCH /api/cuentas-por-pagar/{id}/anular sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void anular_sinPermiso_403() throws Exception {
        mockMvc.perform(patch("/api/cuentas-por-pagar/5/anular")).andExpect(status().isForbidden());
        verify(service, never()).anularDto(5L);
    }
}
