package com.sigtm.backend.controller;

import com.sigtm.backend.model.Notificacion;
import com.sigtm.backend.service.NotificacionService;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = NotificacionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(NotificacionControllerTest.MethodSecurityConfig.class)
class NotificacionControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private NotificacionService notificacionService;

    @Test
    @DisplayName("GET /api/notificaciones devuelve 200")
    @WithMockUser
    void listar_ok() throws Exception {
        when(notificacionService.obtenerMias(any())).thenReturn(List.of());

        mockMvc.perform(get("/api/notificaciones")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/notificaciones/no-leidas devuelve el contador")
    @WithMockUser
    void noLeidas_ok() throws Exception {
        when(notificacionService.obtenerNoLeidas(any())).thenReturn(4L);

        mockMvc.perform(get("/api/notificaciones/no-leidas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(4));
    }

    @Test
    @DisplayName("PATCH /api/notificaciones/{id}/leida devuelve 200")
    @WithMockUser
    void marcarLeida_ok() throws Exception {
        when(notificacionService.marcarComoLeida(any(), any())).thenReturn(mock(Notificacion.class));

        mockMvc.perform(patch("/api/notificaciones/8/leida")).andExpect(status().isOk());
        verify(notificacionService).marcarComoLeida(any(), any());
    }

    @Test
    @DisplayName("PATCH /api/notificaciones/leer-todas confirma la operación")
    @WithMockUser
    void marcarTodas_ok() throws Exception {
        mockMvc.perform(patch("/api/notificaciones/leer-todas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());

        verify(notificacionService).marcarTodasComoLeidas(any());
    }
}
