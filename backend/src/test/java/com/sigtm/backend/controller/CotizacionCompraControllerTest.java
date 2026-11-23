package com.sigtm.backend.controller;

import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.service.CompraService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = CotizacionCompraController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(CotizacionCompraControllerTest.MethodSecurityConfig.class)
class CotizacionCompraControllerTest {

    private static final String COTIZACION =
            "{\"supplierId\":1,\"items\":[{\"productId\":1,\"quantity\":2,\"unitCost\":10}]}";

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CompraService compraService;

    private OrdenCompra orden() {
        return OrdenCompra.builder().id(4L).code("COT-000004").status("DRAFT").build();
    }

    @Test
    @DisplayName("POST /api/cotizaciones-compra crea una cotización")
    @WithMockUser(authorities = "COMPRAS:CREAR")
    void crear_ok() throws Exception {
        when(compraService.crearCotizacion(any())).thenReturn(orden());

        mockMvc.perform(post("/api/cotizaciones-compra")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COTIZACION))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/cotizaciones-compra sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void crear_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/cotizaciones-compra")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(COTIZACION))
                .andExpect(status().isForbidden());

        verify(compraService, never()).crearCotizacion(any());
    }

    @Test
    @DisplayName("POST /api/cotizaciones-compra/{id}/aceptar devuelve 200")
    @WithMockUser(authorities = "COMPRAS:APROBAR")
    void aceptar_ok() throws Exception {
        when(compraService.aceptarCotizacion(4L)).thenReturn(orden());

        mockMvc.perform(post("/api/cotizaciones-compra/4/aceptar")).andExpect(status().isOk());
        verify(compraService).aceptarCotizacion(4L);
    }

    @Test
    @DisplayName("POST /api/cotizaciones-compra/{id}/aceptar sin permiso devuelve 403")
    @WithMockUser(authorities = "COMPRAS:VER")
    void aceptar_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/cotizaciones-compra/4/aceptar")).andExpect(status().isForbidden());
        verify(compraService, never()).aceptarCotizacion(4L);
    }
}
