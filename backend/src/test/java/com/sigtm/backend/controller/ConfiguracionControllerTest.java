package com.sigtm.backend.controller;

import com.sigtm.backend.model.Configuracion;
import com.sigtm.backend.service.ConfiguracionService;
import com.sigtm.backend.service.EmailService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ConfiguracionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ConfiguracionControllerTest.MethodSecurityConfig.class)
class ConfiguracionControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ConfiguracionService configuracionService;

    @MockitoBean
    private EmailService emailService;

    private Configuracion configuracion() {
        return Configuracion.builder()
                .id(1L)
                .tallerNombre("SIGTM")
                .tallerRuc("20123456789")
                .correoTipo("GMAIL")
                .smtpSeguridad("STARTTLS")
                .smtpPuerto(587)
                .build();
    }

    @Test
    @DisplayName("GET /api/configuracion con CONFIGURACION:VER devuelve 200")
    @WithMockUser(authorities = "CONFIGURACION:VER")
    void obtener_ok() throws Exception {
        when(configuracionService.obtenerConfiguracion()).thenReturn(configuracion());

        mockMvc.perform(get("/api/configuracion"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tallerNombre").value("SIGTM"))
                .andExpect(jsonPath("$.smtpPuerto").value(587));
    }

    @Test
    @DisplayName("GET /api/configuracion sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void obtener_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/configuracion")).andExpect(status().isForbidden());
        verify(configuracionService, never()).obtenerConfiguracion();
    }

    @Test
    @DisplayName("PUT /api/configuracion con CONFIGURACION:EDITAR devuelve 200")
    @WithMockUser(authorities = "CONFIGURACION:EDITAR")
    void actualizar_ok() throws Exception {
        when(configuracionService.actualizar(any())).thenReturn(configuracion());

        mockMvc.perform(put("/api/configuracion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tallerNombre\":\"SIGTM\",\"tallerRuc\":\"20123456789\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tallerRuc").value("20123456789"));

        verify(configuracionService).actualizar(any());
    }

    @Test
    @DisplayName("PUT /api/configuracion sin permiso devuelve 403")
    @WithMockUser(authorities = "CONFIGURACION:VER")
    void actualizar_sinPermiso_403() throws Exception {
        mockMvc.perform(put("/api/configuracion")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tallerNombre\":\"SIGTM\"}"))
                .andExpect(status().isForbidden());

        verify(configuracionService, never()).actualizar(any());
    }
}
