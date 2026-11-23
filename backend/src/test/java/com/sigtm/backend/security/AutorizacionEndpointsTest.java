package com.sigtm.backend.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Matriz básica de autorización por permisos.
 *
 * <p>Comprueba los tres resultados esperados: 401 sin sesión, 403 con sesión
 * pero sin el permiso del módulo y 200 con el permiso correcto.</p>
 */
class AutorizacionEndpointsTest extends SeguridadBaseTest {

    @Test
    @DisplayName("Clientes sin token devuelve 401")
    void clientes_sinToken_401() throws Exception {
        mockMvc.perform(get("/api/clientes/paginado"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Clientes con rol MECÁNICO devuelve 403")
    void clientes_mecanico_403() throws Exception {
        String token = loginMecanico();

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Clientes con rol RECEPCIÓN devuelve 200")
    void clientes_recepcion_200() throws Exception {
        String token = loginRecepcion();

        mockMvc.perform(get("/api/clientes/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Auditoría con rol MECÁNICO devuelve 403")
    void auditoria_mecanico_403() throws Exception {
        String token = loginMecanico();

        mockMvc.perform(get("/api/auditoria")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Auditoría con rol ADMIN devuelve 200")
    void auditoria_admin_200() throws Exception {
        String token = loginAdmin();

        mockMvc.perform(get("/api/auditoria")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Facturas con rol MECÁNICO devuelve 403")
    void facturas_mecanico_403() throws Exception {
        String token = loginMecanico();

        mockMvc.perform(get("/api/facturas")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Facturas con rol RECEPCIÓN devuelve 200")
    void facturas_recepcion_200() throws Exception {
        String token = loginRecepcion();

        mockMvc.perform(get("/api/facturas")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Órdenes paginadas con rol MECÁNICO devuelve 403")
    void ordenes_mecanico_403() throws Exception {
        String token = loginMecanico();

        mockMvc.perform(get("/api/ordenes-trabajo/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Órdenes paginadas con rol ADMIN devuelve 200")
    void ordenes_admin_200() throws Exception {
        String token = loginAdmin();

        mockMvc.perform(get("/api/ordenes-trabajo/paginado")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }
}
