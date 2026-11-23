package com.sigtm.backend.controller;

import com.sigtm.backend.dto.RecepcionResponse;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.service.RecepcionService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RecepcionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(RecepcionControllerTest.MethodSecurityConfig.class)
class RecepcionControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RecepcionService recepcionService;

    @MockitoBean
    private UsuarioRepository usuarioRepository;

    @Test
    @DisplayName("GET /api/recepciones con RECEPCION:VER devuelve 200")
    @WithMockUser(authorities = "RECEPCION:VER")
    void listar_ok() throws Exception {
        RecepcionResponse respuesta = mock(RecepcionResponse.class);
        when(recepcionService.obtenerTodas()).thenReturn(List.of(respuesta));

        mockMvc.perform(get("/api/recepciones"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/recepciones sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/recepciones")).andExpect(status().isForbidden());
        verify(recepcionService, never()).obtenerTodas();
    }

    @Test
    @DisplayName("GET /api/recepciones/{id} con MI_TRABAJO:VER devuelve 200")
    @WithMockUser(authorities = "MI_TRABAJO:VER")
    void detalle_mecanico_ok() throws Exception {
        RecepcionResponse respuesta = mock(RecepcionResponse.class);
        when(recepcionService.obtenerPorId(7L)).thenReturn(respuesta);

        mockMvc.perform(get("/api/recepciones/7")).andExpect(status().isOk());
        verify(recepcionService).obtenerPorId(7L);
    }

    @Test
    @DisplayName("GET /api/recepciones/vehiculo/{id} sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void porVehiculo_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/recepciones/vehiculo/3")).andExpect(status().isForbidden());
        verify(recepcionService, never()).obtenerPorVehiculo(3L);
    }

    @Test
    @DisplayName("POST /api/recepciones/{id}/emitir-orden con RECEPCION:CREAR devuelve 200")
    @WithMockUser(authorities = "RECEPCION:CREAR")
    void emitirOrden_ok() throws Exception {
        OrdenTrabajo orden = OrdenTrabajo.builder()
                .id(15L)
                .orderNumber("OT-000015")
                .build();
        when(recepcionService.emitirOrdenTrabajo(7L)).thenReturn(orden);

        mockMvc.perform(post("/api/recepciones/7/emitir-orden"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workOrderId").value(15))
                .andExpect(jsonPath("$.orderNumber").value("OT-000015"));
    }

    @Test
    @DisplayName("POST /api/recepciones/{id}/emitir-orden sin permiso devuelve 403")
    @WithMockUser(authorities = "RECEPCION:VER")
    void emitirOrden_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/recepciones/7/emitir-orden"))
                .andExpect(status().isForbidden());
        verify(recepcionService, never()).emitirOrdenTrabajo(7L);
    }
}
