package com.sigtm.backend.controller;

import com.sigtm.backend.service.ExportacionComprasService;
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

import java.nio.charset.StandardCharsets;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ExportacionComprasController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ExportacionComprasControllerTest.MethodSecurityConfig.class)
class ExportacionComprasControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExportacionComprasService service;

    @Test
    @DisplayName("GET /api/reportes/compras/excel devuelve el archivo")
    @WithMockUser(authorities = "COMPRAS:VER")
    void exportar_ok() throws Exception {
        byte[] archivo = "xlsx".getBytes(StandardCharsets.UTF_8);
        when(service.generarLibro()).thenReturn(archivo);

        mockMvc.perform(get("/api/reportes/compras/excel"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")))
                .andExpect(content().bytes(archivo));

        verify(service).generarLibro();
    }

    @Test
    @DisplayName("GET /api/reportes/compras/excel sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void exportar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/reportes/compras/excel")).andExpect(status().isForbidden());
        verify(service, never()).generarLibro();
    }
}
