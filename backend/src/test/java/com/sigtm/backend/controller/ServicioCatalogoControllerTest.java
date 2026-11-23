package com.sigtm.backend.controller;

import com.sigtm.backend.model.ServicioCatalogo;
import com.sigtm.backend.service.ServicioCatalogoService;
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

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ServicioCatalogoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ServicioCatalogoControllerTest.MethodSecurityConfig.class)
class ServicioCatalogoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ServicioCatalogoService servicioCatalogoService;

    private ServicioCatalogo servicio() {
        return ServicioCatalogo.builder()
                .id(1L)
                .code("SRV-001")
                .name("Mantenimiento preventivo")
                .defaultPrice(new BigDecimal("120.00"))
                .active(true)
                .build();
    }

    @Test
    @DisplayName("GET /api/catalogo-servicios con ORDENES:VER devuelve 200")
    @WithMockUser(authorities = "ORDENES:VER")
    void listar_ok() throws Exception {
        when(servicioCatalogoService.obtenerActivos()).thenReturn(List.of(servicio()));

        mockMvc.perform(get("/api/catalogo-servicios"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("SRV-001"));
    }

    @Test
    @DisplayName("GET /api/catalogo-servicios con incluirInactivos usa la lista completa")
    @WithMockUser(authorities = "CONFIGURACION:VER")
    void listar_inactivos_ok() throws Exception {
        when(servicioCatalogoService.obtenerTodos()).thenReturn(List.of());

        mockMvc.perform(get("/api/catalogo-servicios").param("incluirInactivos", "true"))
                .andExpect(status().isOk());

        verify(servicioCatalogoService).obtenerTodos();
    }

    @Test
    @DisplayName("GET /api/catalogo-servicios sin permiso devuelve 403")
    @WithMockUser(authorities = "CLIENTES:VER")
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/catalogo-servicios")).andExpect(status().isForbidden());
        verify(servicioCatalogoService, never()).obtenerActivos();
    }

    @Test
    @DisplayName("GET /api/catalogo-servicios/{id} devuelve 200")
    @WithMockUser(authorities = "ORDENES:VER")
    void detalle_ok() throws Exception {
        when(servicioCatalogoService.obtenerPorId(1L)).thenReturn(servicio());

        mockMvc.perform(get("/api/catalogo-servicios/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Mantenimiento preventivo"));
    }

    @Test
    @DisplayName("POST /api/catalogo-servicios con CONFIGURACION:EDITAR devuelve 200")
    @WithMockUser(authorities = "CONFIGURACION:EDITAR")
    void crear_ok() throws Exception {
        when(servicioCatalogoService.crearServicio(any())).thenReturn(servicio());

        mockMvc.perform(post("/api/catalogo-servicios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"SRV-001\",\"name\":\"Mantenimiento preventivo\",\"defaultPrice\":120}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1));

        verify(servicioCatalogoService).crearServicio(any());
    }

    @Test
    @DisplayName("POST /api/catalogo-servicios sin permiso devuelve 403")
    @WithMockUser(authorities = "ORDENES:VER")
    void crear_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/catalogo-servicios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());

        verify(servicioCatalogoService, never()).crearServicio(any());
    }
}
