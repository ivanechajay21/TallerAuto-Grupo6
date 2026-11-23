package com.sigtm.backend.controller;

import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.service.ProveedorService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ProveedorController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ProveedorControllerTest.MethodSecurityConfig.class)
class ProveedorControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProveedorService proveedorService;

    private Proveedor proveedor() {
        return Proveedor.builder()
                .id(2L)
                .businessName("Repuestos del Norte")
                .taxId("20999999999")
                .active(true)
                .build();
    }

    @Test
    @DisplayName("GET /api/proveedores con PROVEEDORES:VER devuelve 200")
    @WithMockUser(authorities = "PROVEEDORES:VER")
    void listar_ok() throws Exception {
        when(proveedorService.listar(false)).thenReturn(List.of(proveedor()));

        mockMvc.perform(get("/api/proveedores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].businessName").value("Repuestos del Norte"));
    }

    @Test
    @DisplayName("GET /api/proveedores sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/proveedores")).andExpect(status().isForbidden());
        verify(proveedorService, never()).listar(false);
    }

    @Test
    @DisplayName("GET /api/proveedores/{id} devuelve 200")
    @WithMockUser(authorities = "PROVEEDORES:VER")
    void obtener_ok() throws Exception {
        when(proveedorService.obtener(2L)).thenReturn(proveedor());

        mockMvc.perform(get("/api/proveedores/2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.taxId").value("20999999999"));
    }

    @Test
    @DisplayName("DELETE /api/proveedores/{id} con permiso devuelve 204")
    @WithMockUser(authorities = "PROVEEDORES:ELIMINAR")
    void desactivar_ok() throws Exception {
        mockMvc.perform(delete("/api/proveedores/2")).andExpect(status().isNoContent());
        verify(proveedorService).desactivar(2L);
    }

    @Test
    @DisplayName("DELETE /api/proveedores/{id} sin permiso devuelve 403")
    @WithMockUser(authorities = "PROVEEDORES:VER")
    void desactivar_sinPermiso_403() throws Exception {
        mockMvc.perform(delete("/api/proveedores/2")).andExpect(status().isForbidden());
        verify(proveedorService, never()).desactivar(2L);
    }
}
