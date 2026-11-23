package com.sigtm.backend.controller;

import com.sigtm.backend.service.VehiculoService;
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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = VehiculoController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(VehiculoControllerTest.MethodSecurityConfig.class)
class VehiculoControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private VehiculoService vehiculoService;

    @Test
    @DisplayName("GET /api/vehiculos/paginado devuelve página y resumen")
    @WithMockUser(authorities = "VEHICULOS:VER")
    void paginado_ok() throws Exception {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("total", 5);
        resumen.put("active", 4);
        resumen.put("inactive", 1);
        resumen.put("withMileage", 3);

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", List.of(Map.of("id", 1, "plate", "ABC-123")));
        respuesta.put("page", 1);
        respuesta.put("size", 10);
        respuesta.put("totalElements", 5);
        respuesta.put("totalPages", 1);
        respuesta.put("summary", resumen);

        when(vehiculoService.buscarPaginado(0, 10, "abc", "ACTIVOS", "reciente"))
                .thenReturn(respuesta);

        mockMvc.perform(get("/api/vehiculos/paginado")
                        .param("page", "0")
                        .param("size", "10")
                        .param("search", "abc")
                        .param("status", "ACTIVOS")
                        .param("sort", "reciente"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].plate").value("ABC-123"))
                .andExpect(jsonPath("$.totalElements").value(5))
                .andExpect(jsonPath("$.summary.active").value(4));

        verify(vehiculoService).buscarPaginado(0, 10, "abc", "ACTIVOS", "reciente");
    }

    @Test
    @DisplayName("GET /api/vehiculos/paginado sin VEHICULOS:VER devuelve 403")
    @WithMockUser(authorities = {})
    void paginado_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/vehiculos/paginado"))
                .andExpect(status().isForbidden());

        verify(vehiculoService, never()).buscarPaginado(0, 10, null, "TODOS", "reciente");
    }
}
