package com.sigtm.backend.controller;

import com.sigtm.backend.dto.EstadoPresupuestoCompraResponse;
import com.sigtm.backend.model.PresupuestoCompra;
import com.sigtm.backend.service.PresupuestoCompraService;
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

import java.math.BigDecimal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = PresupuestoCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(PresupuestoCompraControllerTest.MethodSecurityConfig.class)
class PresupuestoCompraControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PresupuestoCompraService service;

    @Test
    @DisplayName("GET /api/presupuestos-compras/{periodo} devuelve el estado")
    @WithMockUser(authorities = "COMPRAS:VER")
    void estado_ok() throws Exception {
        when(service.estado("2026-11")).thenReturn(mock(EstadoPresupuestoCompraResponse.class));

        mockMvc.perform(get("/api/presupuestos-compras/2026-11")).andExpect(status().isOk());
        verify(service).estado("2026-11");
    }

    @Test
    @DisplayName("GET /api/presupuestos-compras/{periodo} sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void estado_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/presupuestos-compras/2026-11")).andExpect(status().isForbidden());
        verify(service, never()).estado("2026-11");
    }

    @Test
    @DisplayName("POST /api/presupuestos-compras guarda con COMPRAS:APROBAR")
    @WithMockUser(authorities = "COMPRAS:APROBAR")
    void guardar_ok() throws Exception {
        PresupuestoCompra presupuesto = PresupuestoCompra.builder()
                .id(1L)
                .period("2026-11")
                .limitAmount(new BigDecimal("5000.00"))
                .alertPercentage(80)
                .active(true)
                .build();
        when(service.guardar(any())).thenReturn(presupuesto);

        mockMvc.perform(post("/api/presupuestos-compras")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"period\":\"2026-11\",\"limitAmount\":5000,\"alertPercentage\":80}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/presupuestos-compras sin COMPRAS:APROBAR devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void guardar_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/presupuestos-compras")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"period\":\"2026-11\",\"limitAmount\":5000,\"alertPercentage\":80}"))
                .andExpect(status().isForbidden());

        verify(service, never()).guardar(any());
    }
}
