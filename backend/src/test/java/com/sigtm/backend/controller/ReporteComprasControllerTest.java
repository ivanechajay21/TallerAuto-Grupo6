package com.sigtm.backend.controller;

import com.sigtm.backend.service.ReporteComprasService;
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
import java.util.Map;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReporteComprasController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ReporteComprasControllerTest.MethodSecurityConfig.class)
class ReporteComprasControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReporteComprasService service;

    @Test
    @DisplayName("GET /api/reportes/compras/resumen devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void resumen_ok() throws Exception {
        when(service.resumen()).thenReturn(Map.of("totalCompras", 4));

        mockMvc.perform(get("/api/reportes/compras/resumen"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCompras").value(4));
    }

    @Test
    @DisplayName("GET /api/reportes/compras/proveedores devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void proveedores_ok() throws Exception {
        when(service.porProveedor()).thenReturn(List.of());

        mockMvc.perform(get("/api/reportes/compras/proveedores")).andExpect(status().isOk());
        verify(service).porProveedor();
    }

    @Test
    @DisplayName("GET /api/reportes/compras/vencimientos propaga los días")
    @WithMockUser(authorities = "COMPRAS:VER")
    void vencimientos_ok() throws Exception {
        when(service.alertasVencimiento(30)).thenReturn(List.of());

        mockMvc.perform(get("/api/reportes/compras/vencimientos").param("dias", "30"))
                .andExpect(status().isOk());

        verify(service).alertasVencimiento(30);
    }

    @Test
    @DisplayName("GET /api/reportes/compras/costos devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void costos_ok() throws Exception {
        when(service.tendencias()).thenReturn(List.of());

        mockMvc.perform(get("/api/reportes/compras/costos")).andExpect(status().isOk());
        verify(service).tendencias();
    }

    @Test
    @DisplayName("GET /api/reportes/compras/resumen sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void resumen_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/reportes/compras/resumen")).andExpect(status().isForbidden());
        verify(service, never()).resumen();
    }
}
