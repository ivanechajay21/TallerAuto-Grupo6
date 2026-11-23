package com.sigtm.backend.controller;

import com.sigtm.backend.model.ItemCatalogo;
import com.sigtm.backend.service.ItemCatalogoService;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ItemCatalogoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ItemCatalogoControllerTest.MethodSecurityConfig.class)
class ItemCatalogoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ItemCatalogoService itemCatalogoService;

    private ItemCatalogo item() {
        return ItemCatalogo.builder()
                .id(1L)
                .tipo("ESTADOS")
                .code("PENDIENTE")
                .nombre("Pendiente")
                .orden(1)
                .activo(true)
                .build();
    }

    @Test
    @DisplayName("GET /api/configuracion/catalogo lista por tipo")
    @WithMockUser(authorities = "CONFIGURACION:VER")
    void listar_ok() throws Exception {
        when(itemCatalogoService.listarPorTipo("ESTADOS")).thenReturn(List.of(item()));

        mockMvc.perform(get("/api/configuracion/catalogo").param("tipo", "ESTADOS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].code").value("PENDIENTE"));
    }

    @Test
    @DisplayName("GET /api/configuracion/catalogo sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/configuracion/catalogo").param("tipo", "ESTADOS"))
                .andExpect(status().isForbidden());

        verify(itemCatalogoService, never()).listarPorTipo("ESTADOS");
    }

    @Test
    @DisplayName("POST /api/configuracion/catalogo crea un elemento")
    @WithMockUser(authorities = "CONFIGURACION:EDITAR")
    void crear_ok() throws Exception {
        when(itemCatalogoService.crear(eq("ESTADOS"), any())).thenReturn(item());

        mockMvc.perform(post("/api/configuracion/catalogo").param("tipo", "ESTADOS")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"PENDIENTE\",\"nombre\":\"Pendiente\",\"orden\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Pendiente"));
    }

    @Test
    @DisplayName("PUT /api/configuracion/catalogo/{id} actualiza un elemento")
    @WithMockUser(authorities = "CONFIGURACION:EDITAR")
    void actualizar_ok() throws Exception {
        when(itemCatalogoService.actualizar(eq(1L), eq("ESTADOS"), any())).thenReturn(item());

        mockMvc.perform(put("/api/configuracion/catalogo/1").param("tipo", "ESTADOS")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"PENDIENTE\",\"nombre\":\"Pendiente\",\"orden\":1}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("DELETE /api/configuracion/catalogo/{id} devuelve 204")
    @WithMockUser(authorities = "CONFIGURACION:EDITAR")
    void eliminar_ok() throws Exception {
        mockMvc.perform(delete("/api/configuracion/catalogo/1")).andExpect(status().isNoContent());
        verify(itemCatalogoService).delete(1L);
    }

    @Test
    @DisplayName("DELETE /api/configuracion/catalogo/{id} sin permiso devuelve 403")
    @WithMockUser(authorities = "CONFIGURACION:VER")
    void eliminar_sinPermiso_403() throws Exception {
        mockMvc.perform(delete("/api/configuracion/catalogo/1")).andExpect(status().isForbidden());
        verify(itemCatalogoService, never()).delete(1L);
    }
}
