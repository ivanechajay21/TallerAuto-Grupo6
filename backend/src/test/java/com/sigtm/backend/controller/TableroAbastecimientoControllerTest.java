package com.sigtm.backend.controller;

import com.sigtm.backend.dto.TableroAbastecimientoResponse;
import com.sigtm.backend.service.TableroAbastecimientoService;
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

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = TableroAbastecimientoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(TableroAbastecimientoControllerTest.MethodSecurityConfig.class)
class TableroAbastecimientoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TableroAbastecimientoService service;

    @Test
    @DisplayName("GET /api/abastecimiento/tablero devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void obtener_ok() throws Exception {
        when(service.obtener()).thenReturn(mock(TableroAbastecimientoResponse.class));

        mockMvc.perform(get("/api/abastecimiento/tablero")).andExpect(status().isOk());
        verify(service).obtener();
    }

    @Test
    @DisplayName("GET /api/abastecimiento/tablero sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void obtener_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/abastecimiento/tablero")).andExpect(status().isForbidden());
        verify(service, never()).obtener();
    }
}
