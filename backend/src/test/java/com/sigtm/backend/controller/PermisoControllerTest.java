package com.sigtm.backend.controller;

import com.sigtm.backend.service.RolService;
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

@WebMvcTest(controllers = PermisoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(PermisoControllerTest.MethodSecurityConfig.class)
class PermisoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RolService rolService;

    @Test
    @DisplayName("GET /api/permisos con ROLES:VER devuelve 200")
    @WithMockUser(authorities = "ROLES:VER")
    void listar_ok() throws Exception {
        when(rolService.obtenerPermisos()).thenReturn(List.of(Map.of("code", "COMPRAS:VER")));

        mockMvc.perform(get("/api/permisos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("COMPRAS:VER"));
    }

    @Test
    @DisplayName("GET /api/permisos sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/permisos")).andExpect(status().isForbidden());
        verify(rolService, never()).obtenerPermisos();
    }
}
