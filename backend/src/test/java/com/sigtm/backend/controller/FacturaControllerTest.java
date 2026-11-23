package com.sigtm.backend.controller;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.TipoComprobante;
import com.sigtm.backend.service.FacturaPdfService;
import com.sigtm.backend.service.FacturaService;
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
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de la capa web de {@link FacturaController}.
 *
 * <p>Comprueba el contrato de emisión con tipo de comprobante y la autorización
 * por permisos del módulo {@code FACTURAS}, sin cargar el filtro JWT.</p>
 */
@WebMvcTest(controllers = FacturaController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(FacturaControllerTest.MethodSecurityConfig.class)
class FacturaControllerTest {

    @TestConfiguration
    @EnableMethodSecurity
    static class MethodSecurityConfig {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FacturaService facturaService;

    @MockitoBean
    private FacturaPdfService facturaPdfService;

    @Test
    @DisplayName("GET /api/facturas con FACTURAS:VER devuelve 200")
    @WithMockUser(authorities = "FACTURAS:VER")
    void listar_ok() throws Exception {
        when(facturaService.obtenerTodas()).thenReturn(List.of(Map.of(
                "id", 1,
                "invoiceNumber", "F001-00000001",
                "documentType", "FACTURA")));

        mockMvc.perform(get("/api/facturas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].invoiceNumber").value("F001-00000001"))
                .andExpect(jsonPath("$[0].documentType").value("FACTURA"));
    }

    @Test
    @DisplayName("GET /api/facturas sin FACTURAS:VER devuelve 403")
    @WithMockUser(authorities = {})
    void listar_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/facturas")).andExpect(status().isForbidden());
        verify(facturaService, never()).obtenerTodas();
    }

    @Test
    @DisplayName("GET /api/facturas/{id} inexistente devuelve 404")
    @WithMockUser(authorities = "FACTURAS:VER")
    void detalle_inexistente_404() throws Exception {
        when(facturaService.obtenerPorId(99L))
                .thenThrow(new ResourceNotFoundException("Factura no encontrada"));

        mockMvc.perform(get("/api/facturas/99"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/facturas/{id} con error interno no filtra el SQL")
    @WithMockUser(authorities = "FACTURAS:VER")
    void detalle_errorInterno_500SinFiltrarSql() throws Exception {
        when(facturaService.obtenerPorId(1L))
                .thenThrow(new RuntimeException("Column 'fecha_emision' cannot be null"));

        mockMvc.perform(get("/api/facturas/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Error interno del servidor"));
    }

    @Test
    @DisplayName("GET /api/facturas/{id} con id no numérico devuelve 400")
    @WithMockUser(authorities = "FACTURAS:VER")
    void detalle_idInvalido_400() throws Exception {
        mockMvc.perform(get("/api/facturas/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Valor inválido para el parámetro: id"));
    }

    @Test
    @DisplayName("GET /api/facturas/{id}/pdf con FACTURAS:VER devuelve el PDF")
    @WithMockUser(authorities = "FACTURAS:VER")
    void descargarPdf_ok() throws Exception {
        byte[] pdf = "%PDF-1.4 comprobante".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        when(facturaPdfService.generar(1L)).thenReturn(pdf);

        mockMvc.perform(get("/api/facturas/1/pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("comprobante-1.pdf")))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(content().bytes(pdf));

        verify(facturaPdfService).generar(1L);
    }

    @Test
    @DisplayName("GET /api/facturas/{id}/pdf sin permiso devuelve 403")
    @WithMockUser(authorities = {})
    void descargarPdf_sinPermiso_403() throws Exception {
        mockMvc.perform(get("/api/facturas/1/pdf")).andExpect(status().isForbidden());
        verify(facturaPdfService, never()).generar(1L);
    }

    @Test
    @DisplayName("POST /api/facturas/orden-trabajo/{id} con BOLETA emite boleta")
    @WithMockUser(authorities = "FACTURAS:CREAR")
    void generar_boleta_ok() throws Exception {
        when(facturaService.generarFactura(5L, TipoComprobante.BOLETA))
                .thenReturn(Map.of("id", 10, "documentType", "BOLETA"));

        mockMvc.perform(post("/api/facturas/orden-trabajo/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipoComprobante\":\"BOLETA\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.documentType").value("BOLETA"));

        verify(facturaService).generarFactura(5L, TipoComprobante.BOLETA);
    }

    @Test
    @DisplayName("POST /api/facturas/orden-trabajo/{id} sin cuerpo asume FACTURA")
    @WithMockUser(authorities = "FACTURAS:CREAR")
    void generar_sinCuerpo_asumeFactura() throws Exception {
        when(facturaService.generarFactura(5L, TipoComprobante.FACTURA))
                .thenReturn(Map.of("id", 10, "documentType", "FACTURA"));

        mockMvc.perform(post("/api/facturas/orden-trabajo/5"))
                .andExpect(status().isOk());

        verify(facturaService).generarFactura(5L, TipoComprobante.FACTURA);
    }

    @Test
    @DisplayName("POST /api/facturas/orden-trabajo/{id} con orden duplicada devuelve 409")
    @WithMockUser(authorities = "FACTURAS:CREAR")
    void generar_duplicada_409() throws Exception {
        when(facturaService.generarFactura(eq(5L), any()))
                .thenThrow(new DuplicateResourceException("Esta orden ya tiene una factura emitida"));

        mockMvc.perform(post("/api/facturas/orden-trabajo/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipoComprobante\":\"FACTURA\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/facturas/orden-trabajo/{id} sin FACTURAS:CREAR devuelve 403")
    @WithMockUser(authorities = "FACTURAS:VER")
    void generar_sinPermiso_403() throws Exception {
        mockMvc.perform(post("/api/facturas/orden-trabajo/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipoComprobante\":\"BOLETA\"}"))
                .andExpect(status().isForbidden());

        verify(facturaService, never()).generarFactura(any(), any());
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/pagar con FACTURAS:APROBAR devuelve 200")
    @WithMockUser(authorities = "FACTURAS:APROBAR")
    void pagar_ok() throws Exception {
        when(facturaService.pagarFactura(45L, "CARD"))
                .thenReturn(Map.of("id", 45, "status", "PAID"));

        mockMvc.perform(patch("/api/facturas/45/pagar").param("paymentMethod", "CARD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PAID"));

        verify(facturaService).pagarFactura(45L, "CARD");
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/pagar sin paymentMethod devuelve 400")
    @WithMockUser(authorities = "FACTURAS:APROBAR")
    void pagar_sinMetodo_400() throws Exception {
        mockMvc.perform(patch("/api/facturas/45/pagar"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Falta el parámetro obligatorio: paymentMethod"));

        verify(facturaService, never()).pagarFactura(any(), any());
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/pagar sin FACTURAS:APROBAR devuelve 403")
    @WithMockUser(authorities = "FACTURAS:VER")
    void pagar_sinPermiso_403() throws Exception {
        mockMvc.perform(patch("/api/facturas/45/pagar").param("paymentMethod", "CARD"))
                .andExpect(status().isForbidden());

        verify(facturaService, never()).pagarFactura(any(), any());
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/pagar inexistente devuelve 404")
    @WithMockUser(authorities = "FACTURAS:APROBAR")
    void pagar_inexistente_404() throws Exception {
        when(facturaService.pagarFactura(99L, "CASH"))
                .thenThrow(new ResourceNotFoundException("Factura no encontrada"));

        mockMvc.perform(patch("/api/facturas/99/pagar").param("paymentMethod", "CASH"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/facturas/{id} devuelve el detalle del comprobante")
    @WithMockUser(authorities = "FACTURAS:VER")
    void detalle_ok() throws Exception {
        when(facturaService.obtenerPorId(7L)).thenReturn(Map.of(
                "id", 7,
                "invoiceNumber", "B001-00000007",
                "status", "PENDING"));

        mockMvc.perform(get("/api/facturas/7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invoiceNumber").value("B001-00000007"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/anular con FACTURAS:ELIMINAR devuelve 200")
    @WithMockUser(authorities = "FACTURAS:ELIMINAR")
    void anular_ok() throws Exception {
        when(facturaService.anularFactura(7L)).thenReturn(Map.of("id", 7, "status", "CANCELLED"));

        mockMvc.perform(patch("/api/facturas/7/anular"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        verify(facturaService).anularFactura(7L);
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/anular sin FACTURAS:ELIMINAR devuelve 403")
    @WithMockUser(authorities = "FACTURAS:VER")
    void anular_sinPermiso_403() throws Exception {
        mockMvc.perform(patch("/api/facturas/7/anular")).andExpect(status().isForbidden());
        verify(facturaService, never()).anularFactura(7L);
    }

    @Test
    @DisplayName("PATCH /api/facturas/{id}/anular inexistente devuelve 404")
    @WithMockUser(authorities = "FACTURAS:ELIMINAR")
    void anular_inexistente_404() throws Exception {
        when(facturaService.anularFactura(99L))
                .thenThrow(new ResourceNotFoundException("Factura no encontrada"));

        mockMvc.perform(patch("/api/facturas/99/anular")).andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/facturas/{id}/pdf acepta FACTURAS:EXPORTAR")
    @WithMockUser(authorities = "FACTURAS:EXPORTAR")
    void descargarPdf_conExportar_ok() throws Exception {
        byte[] pdf = "%PDF-1.4 exportacion".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        when(facturaPdfService.generar(8L)).thenReturn(pdf);

        mockMvc.perform(get("/api/facturas/8/pdf"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdf));

        verify(facturaPdfService).generar(8L);
    }

    @Test
    @DisplayName("POST /api/facturas/orden-trabajo/{id} con tipo inválido devuelve 400")
    @WithMockUser(authorities = "FACTURAS:CREAR")
    void generar_tipoInvalido_400() throws Exception {
        mockMvc.perform(post("/api/facturas/orden-trabajo/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tipoComprobante\":\"OTRO\"}"))
                .andExpect(status().isBadRequest());

        verify(facturaService, never()).generarFactura(any(), any());
    }
}
