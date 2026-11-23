package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.EvaluacionProveedor;
import com.sigtm.backend.model.PrecioProveedor;
import com.sigtm.backend.service.ProveedorAnaliticaService;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProveedorAnaliticaController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ProveedorAnaliticaControllerTest.MethodSecurityConfig.class)
class ProveedorAnaliticaControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProveedorAnaliticaService service;

    @Test
    @DisplayName("GET /api/abastecimiento/productos/{id}/ofertas devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void ofertas_ok() throws Exception {
        when(service.ofertas(4L)).thenReturn(List.of(mock(PrecioProveedor.class)));

        mockMvc.perform(get("/api/abastecimiento/productos/4/ofertas")).andExpect(status().isOk());
        verify(service).ofertas(4L);
    }

    @Test
    @DisplayName("GET /api/abastecimiento/proveedores/{id}/evaluaciones devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void evaluaciones_ok() throws Exception {
        when(service.evaluaciones(2L)).thenReturn(List.of(mock(EvaluacionProveedor.class)));

        mockMvc.perform(get("/api/abastecimiento/proveedores/2/evaluaciones")).andExpect(status().isOk());
        verify(service).evaluaciones(2L);
    }

    @Test
    @DisplayName("GET /api/abastecimiento/productos/{id}/ofertas sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void ofertas_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/abastecimiento/productos/4/ofertas")).andExpect(status().isForbidden());
        verify(service, never()).ofertas(4L);
    }
}
