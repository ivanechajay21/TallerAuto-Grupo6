package com.sigtm.backend.controller;

import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.service.OrdenTrabajoService;
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

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de la capa web (MVC) de {@link OrdenTrabajoController}.
 *
 * <p>Valida la autorización por permiso de los ítems de una orden: agregar exige
 * {@code ITEMS:CREAR}, actualizar {@code ITEMS:EDITAR} y eliminar
 * {@code ITEMS:ELIMINAR}. El caso principal reproduce la asignación de un mecánico
 * mediante {@code mechanicId}, que antes fallaba con 403 cuando el rol no tenía el
 * permiso del submódulo de ítems.</p>
 */
@WebMvcTest(controllers = OrdenTrabajoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(OrdenTrabajoControllerTest.MethodSecurityConfig.class)
class OrdenTrabajoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private OrdenTrabajoService ordenTrabajoService;

    private static final String JSON_ITEM = """
            {"description":"Cambio de aceite","quantity":1,"price":50}
            """;

    @Test
    @DisplayName("POST /api/ordenes-trabajo/{id}/detalles con ITEMS:CREAR asigna el mecánico (200)")
    @WithMockUser(authorities = "ITEMS:CREAR")
    void agregarItem_conPermisoYMechanico_ok() throws Exception {
        when(ordenTrabajoService.agregarItem(eq(5L), eq(2L), isNull(), eq(4L), any(ItemOrdenTrabajo.class)))
                .thenReturn(Map.of("id", 10, "description", "Cambio de aceite"));

        mockMvc.perform(post("/api/ordenes-trabajo/5/detalles")
                        .param("serviceCatalogId", "2")
                        .param("mechanicId", "4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_ITEM))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10));

        verify(ordenTrabajoService).agregarItem(eq(5L), eq(2L), isNull(), eq(4L), any(ItemOrdenTrabajo.class));
    }

    @Test
    @DisplayName("POST /api/ordenes-trabajo/{id}/detalles sin ITEMS:CREAR devuelve 403")
    @WithMockUser(authorities = "ORDENES:EDITAR")
    void agregarItem_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/ordenes-trabajo/5/detalles")
                        .param("serviceCatalogId", "2")
                        .param("mechanicId", "4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_ITEM))
                .andExpect(status().isForbidden());

        verify(ordenTrabajoService, never()).agregarItem(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("PUT /api/ordenes-trabajo/detalles/{id} sin ITEMS:EDITAR devuelve 403")
    @WithMockUser(authorities = "ITEMS:CREAR")
    void actualizarItem_sinPermiso_403() throws Exception {
        mockMvc.perform(put("/api/ordenes-trabajo/detalles/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(JSON_ITEM))
                .andExpect(status().isForbidden());

        verify(ordenTrabajoService, never()).actualizarItem(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("DELETE /api/ordenes-trabajo/detalles/{id} con ITEMS:ELIMINAR devuelve 204")
    @WithMockUser(authorities = "ITEMS:ELIMINAR")
    void eliminarItem_conPermiso_204() throws Exception {
        mockMvc.perform(delete("/api/ordenes-trabajo/detalles/10"))
                .andExpect(status().isNoContent());

        verify(ordenTrabajoService).eliminarItem(10L);
    }

    @Test
    @DisplayName("DELETE /api/ordenes-trabajo/detalles/{id} sin ITEMS:ELIMINAR devuelve 403")
    @WithMockUser(authorities = "ITEMS:EDITAR")
    void eliminarItem_sinPermiso_403() throws Exception {
        mockMvc.perform(delete("/api/ordenes-trabajo/detalles/10"))
                .andExpect(status().isForbidden());

        verify(ordenTrabajoService, never()).eliminarItem(any());
    }
}
