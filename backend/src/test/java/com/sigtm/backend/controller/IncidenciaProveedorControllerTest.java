package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.service.IncidenciaProveedorService;
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

@WebMvcTest(controllers = IncidenciaProveedorController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(IncidenciaProveedorControllerTest.MethodSecurityConfig.class)
class IncidenciaProveedorControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IncidenciaProveedorService service;

    @Test
    @DisplayName("GET /api/incidencias-proveedor devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void abiertas_ok() throws Exception {
        when(service.abiertasDto()).thenReturn(List.of());

        mockMvc.perform(get("/api/incidencias-proveedor")).andExpect(status().isOk());
        verify(service).abiertasDto();
    }

    @Test
    @DisplayName("GET /api/incidencias-proveedor sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void abiertas_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/incidencias-proveedor")).andExpect(status().isForbidden());
        verify(service, never()).abiertasDto();
    }

    @Test
    @DisplayName("PATCH /api/incidencias-proveedor/{id}/resolver devuelve 200")
    @WithMockUser(authorities = "COMPRAS:EDITAR")
    void resolver_ok() throws Exception {
        when(service.resolverDto(5L, "Repuesto repuesto"))
                .thenReturn(mock(ComprasResponses.IncidenciaProveedorResponse.class));

        mockMvc.perform(patch("/api/incidencias-proveedor/5/resolver")
                        .param("resolution", "Repuesto repuesto"))
                .andExpect(status().isOk());

        verify(service).resolverDto(5L, "Repuesto repuesto");
    }

    @Test
    @DisplayName("PATCH /api/incidencias-proveedor/{id}/resolver sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void resolver_sinPermiso_403() throws Exception {
        mockMvc.perform(patch("/api/incidencias-proveedor/5/resolver").param("resolution", "x"))
                .andExpect(status().isForbidden());

        verify(service, never()).resolverDto(5L, "x");
    }
}
