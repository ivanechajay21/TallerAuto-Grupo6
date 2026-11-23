package com.sigtm.backend.controller;

import com.sigtm.backend.dto.ComprasResponses;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.service.ReposicionService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ReposicionController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ReposicionControllerTest.MethodSecurityConfig.class)
class ReposicionControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReposicionService service;

    @Test
    @DisplayName("GET /api/reposicion/solicitudes devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void solicitudes_ok() throws Exception {
        when(service.listarDto()).thenReturn(List.of());

        mockMvc.perform(get("/api/reposicion/solicitudes")).andExpect(status().isOk());
        verify(service).listarDto();
    }

    @Test
    @DisplayName("GET /api/reposicion/sugerencias devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void sugerencias_ok() throws Exception {
        when(service.sugerencias()).thenReturn(List.of());

        mockMvc.perform(get("/api/reposicion/sugerencias")).andExpect(status().isOk());
        verify(service).sugerencias();
    }

    @Test
    @DisplayName("GET /api/reposicion/solicitudes/{id}/historial devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void historial_ok() throws Exception {
        when(service.historial(5L)).thenReturn(List.of());

        mockMvc.perform(get("/api/reposicion/solicitudes/5/historial")).andExpect(status().isOk());
        verify(service).historial(5L);
    }

    @Test
    @DisplayName("POST /api/reposicion/solicitudes/{id}/convertir-orden devuelve 200")
    @WithMockUser(authorities = "COMPRAS:CREAR")
    void convertir_ok() throws Exception {
        OrdenCompra orden = OrdenCompra.builder().id(9L).code("OC-000009").status("PENDING").build();
        when(service.convertirEnOrden(5L, 2L)).thenReturn(orden);

        mockMvc.perform(post("/api/reposicion/solicitudes/5/convertir-orden").param("supplierId", "2"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("PATCH /api/reposicion/solicitudes/{id}/estado devuelve 200")
    @WithMockUser(authorities = "COMPRAS:APROBAR")
    void estado_ok() throws Exception {
        when(service.cambiarEstadoDto(5L, "APPROVED", "ok"))
                .thenReturn(mock(ComprasResponses.SolicitudCompraResponse.class));

        mockMvc.perform(patch("/api/reposicion/solicitudes/5/estado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"APPROVED\",\"comment\":\"ok\"}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/reposicion/solicitudes con COMPRAS:CREAR delega en el servicio")
    @WithMockUser(authorities = "COMPRAS:CREAR")
    void crear_ok() throws Exception {
        when(service.crearDto(any())).thenReturn(mock(ComprasResponses.SolicitudCompraResponse.class));

        mockMvc.perform(post("/api/reposicion/solicitudes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"productId\":1,\"quantity\":2}]}"))
                .andExpect(status().isOk());
    }
}
