package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearSolicitudCompraRequest;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.PoliticaReposicion;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.SolicitudCompra;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.PoliticaReposicionRepository;
import com.sigtm.backend.repository.HistorialSolicitudCompraRepository;
import com.sigtm.backend.repository.SolicitudCompraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReposicionServiceTest {
    @Mock private ProductoRepository productoRepository;
    @Mock private SolicitudCompraRepository solicitudRepository;
    @Mock private HistorialSolicitudCompraRepository historialRepository;
    @Mock private PoliticaReposicionRepository politicaRepository;
    @Mock private AuditoriaService auditoriaService;
    @Mock private CompraService compraService;

    private ReposicionService service() {
        return new ReposicionService(productoRepository, solicitudRepository, historialRepository,
                politicaRepository, auditoriaService, compraService);
    }

    @Test
    void sugiereReposicionParaProductosEnStockMinimo() {
        Producto bajo = producto(1L, "ACE-01", 2, 5);
        Producto suficiente = producto(2L, "FIL-01", 9, 5);
        when(productoRepository.findByActiveTrue()).thenReturn(List.of(bajo, suficiente));

        var sugerencias = service().sugerencias();

        assertEquals(1, sugerencias.size());
        assertEquals(1L, sugerencias.getFirst().get("productId"));
        assertEquals(8, sugerencias.getFirst().get("suggestedQuantity"));
    }

    @Test
    void aplicaPoliticaDeReposicionConLoteYStockObjetivo() {
        Producto producto = producto(4L, "ACE-04", 4, 2);
        PoliticaReposicion policy = PoliticaReposicion.builder()
                .product(producto).reorderPoint(10).minimumLot(5).targetStock(20).leadTimeDays(3).active(true).build();
        when(productoRepository.findByActiveTrue()).thenReturn(List.of(producto));
        when(politicaRepository.findByProductId(4L)).thenReturn(Optional.of(policy));

        var sugerencias = service().sugerencias();

        assertEquals(1, sugerencias.size());
        assertEquals(20, sugerencias.getFirst().get("suggestedQuantity"));
        assertEquals(true, sugerencias.getFirst().get("policyApplied"));
        assertEquals(3, sugerencias.getFirst().get("leadTimeDays"));
    }

    @Test
    void creaSolicitudConLineasYAuditoria() {
        Producto producto = producto(3L, "BUJ-01", 1, 4);
        when(productoRepository.findById(3L)).thenReturn(Optional.of(producto));
        when(solicitudRepository.save(any(SolicitudCompra.class))).thenAnswer(i -> {
            SolicitudCompra solicitud = i.getArgument(0);
            solicitud.setId(7L);
            return solicitud;
        });

        SolicitudCompra creada = service().crear(new CrearSolicitudCompraRequest("Urgente",
                List.of(new CrearSolicitudCompraRequest.Item(3L, 6))));

        assertEquals("PENDIENTE", creada.getStatus());
        assertEquals(1, creada.getItems().size());
        assertEquals(6, creada.getItems().getFirst().getQuantity());
        verify(auditoriaService).registrar(eq("CREATE"), eq("SOLICITUD_COMPRA"), eq(7L), contains("SC-"));
    }

    @Test
    void rechazaProductoRepetidoEnSolicitud() {
        Producto producto = producto(3L, "BUJ-01", 1, 4);
        when(productoRepository.findById(3L)).thenReturn(Optional.of(producto));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> service().crear(
                new CrearSolicitudCompraRequest(null, List.of(
                        new CrearSolicitudCompraRequest.Item(3L, 1),
                        new CrearSolicitudCompraRequest.Item(3L, 2)))));

        assertTrue(error.getMessage().contains("repetido"));
        verify(solicitudRepository, never()).save(any());
    }

    @Test
    void fallaSiProductoDeSolicitudNoExiste() {
        when(productoRepository.findById(9L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service().crear(
                new CrearSolicitudCompraRequest(null, List.of(new CrearSolicitudCompraRequest.Item(9L, 1)))));
    }

    @Test
    void apruebaSolicitudPendienteYGuardaHistorial() {
        SolicitudCompra solicitud = SolicitudCompra.builder().id(12L).code("SC-12").status("PENDIENTE").build();
        when(solicitudRepository.findById(12L)).thenReturn(Optional.of(solicitud));
        when(solicitudRepository.save(solicitud)).thenReturn(solicitud);

        SolicitudCompra actualizada = service().cambiarEstado(12L, "APROBADA", "Stock crítico");

        assertEquals("APROBADA", actualizada.getStatus());
        verify(historialRepository).save(argThat(h -> "PENDIENTE".equals(h.getPreviousStatus())
                && "APROBADA".equals(h.getNewStatus()) && "Stock crítico".equals(h.getComment())));
        verify(auditoriaService).registrar(eq("UPDATE"), eq("SOLICITUD_COMPRA"), eq(12L), contains("aprobada"));
    }

    private Producto producto(Long id, String code, int stock, int minimo) {
        return Producto.builder().id(id).code(code).name(code).purchasePrice(BigDecimal.ONE)
                .salePrice(BigDecimal.TEN).currentStock(stock).minStock(minimo).active(true).build();
    }
}
