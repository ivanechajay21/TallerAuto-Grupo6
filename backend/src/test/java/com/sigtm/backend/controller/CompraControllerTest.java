package com.sigtm.backend.controller;

import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.RecepcionCompra;
import com.sigtm.backend.service.CompraService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CompraControllerTest.MethodSecurityConfig.class)
class CompraControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompraService compraService;

    private OrdenCompra compra() {
        return OrdenCompra.builder()
                .id(3L)
                .code("OC-000003")
                .status("PENDING")
                .build();
    }

    @Test
    @DisplayName("GET /api/compras con COMPRAS:VER devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void listar_ok() throws Exception {
        when(compraService.listar()).thenReturn(List.of(compra()));

        mockMvc.perform(get("/api/compras"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("OC-000003"));
    }

    @Test
    @DisplayName("GET /api/compras sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/compras")).andExpect(status().isForbidden());
        verify(compraService, never()).listar();
    }

    @Test
    @DisplayName("GET /api/compras/{id} con COMPRAS:VER devuelve 200")
    @WithMockUser(authorities = "COMPRAS:VER")
    void obtener_ok() throws Exception {
        when(compraService.obtener(3L)).thenReturn(compra());

        mockMvc.perform(get("/api/compras/3"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(3));
    }

    @Test
    @DisplayName("GET /api/compras/{id}/recepciones devuelve la lista")
    @WithMockUser(authorities = "COMPRAS:VER")
    void recepciones_ok() throws Exception {
        RecepcionCompra recepcion = new RecepcionCompra();
        recepcion.setId(9L);
        when(compraService.listarRecepciones(3L)).thenReturn(List.of(recepcion));

        mockMvc.perform(get("/api/compras/3/recepciones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(9));
    }

    @Test
    @DisplayName("PATCH /api/compras/{id}/anular con COMPRAS:ANULAR devuelve 200")
    @WithMockUser(authorities = "COMPRAS:ANULAR")
    void anular_ok() throws Exception {
        OrdenCompra anulada = compra();
        anulada.setStatus("CANCELLED");
        when(compraService.anular(3L)).thenReturn(anulada);

        mockMvc.perform(patch("/api/compras/3/anular"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    @DisplayName("PATCH /api/compras/{id}/anular sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void anular_sinPermiso_403() throws Exception {
        mockMvc.perform(patch("/api/compras/3/anular")).andExpect(status().isForbidden());
        verify(compraService, never()).anular(3L);
    }
}
