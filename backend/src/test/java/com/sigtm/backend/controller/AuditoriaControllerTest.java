package com.sigtm.backend.controller;

import com.sigtm.backend.service.AuditoriaService;
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

@WebMvcTest(controllers = AuditoriaController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(AuditoriaControllerTest.MethodSecurityConfig.class)
class AuditoriaControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuditoriaService auditoriaService;

    @Test
    @DisplayName("GET /api/auditoria con AUDITORIA:VER devuelve 200")
    @WithMockUser(authorities = "AUDITORIA:VER")
    void listar_ok() throws Exception {
        when(auditoriaService.obtenerRegistros("CREATE", "producto")).thenReturn(List.of());

        mockMvc.perform(get("/api/auditoria")
                        .param("action", "CREATE")
                        .param("search", "producto"))
                .andExpect(status().isOk());

        verify(auditoriaService).obtenerRegistros("CREATE", "producto");
    }

    @Test
    @DisplayName("GET /api/auditoria sin permiso devuelve 403")
    @WithMockUser(authorities = "AUDITORIA:EXPORTAR")
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/auditoria")).andExpect(status().isForbidden());
        verify(auditoriaService, never()).obtenerRegistros(null, null);
    }

    @Test
    @DisplayName("GET /api/auditoria sin filtros devuelve 200")
    @WithMockUser(authorities = "AUDITORIA:VER")
    void listar_sinFiltros_ok() throws Exception {
        when(auditoriaService.obtenerRegistros(null, null)).thenReturn(List.of());

        mockMvc.perform(get("/api/auditoria")).andExpect(status().isOk());
        verify(auditoriaService).obtenerRegistros(null, null);
    }

    @Test
    @DisplayName("GET /api/auditoria/acciones sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void acciones_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/auditoria/acciones")).andExpect(status().isForbidden());
        verify(auditoriaService, never()).obtenerAcciones();
    }

    @Test
    @DisplayName("GET /api/auditoria/acciones devuelve 200")
    @WithMockUser(authorities = "AUDITORIA:VER")
    void acciones_ok() throws Exception {
        when(auditoriaService.obtenerAcciones()).thenReturn(List.of());

        mockMvc.perform(get("/api/auditoria/acciones")).andExpect(status().isOk());
        verify(auditoriaService).obtenerAcciones();
    }
}
