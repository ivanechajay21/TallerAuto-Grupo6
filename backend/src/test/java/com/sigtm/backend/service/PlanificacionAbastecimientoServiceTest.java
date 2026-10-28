package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearPlanCompraRequest;
import com.sigtm.backend.dto.RegistrarPronosticoDemandaRequest;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlanificacionAbastecimientoServiceTest {
    @Mock private PronosticoDemandaRepository pronosticos;
    @Mock private PlanCompraRepository planes;
    @Mock private ProductoRepository productos;
    @Mock private SolicitudCompraRepository solicitudes;
    @Mock private AuditoriaService auditoria;

    private PlanificacionAbastecimientoService service() {
        return new PlanificacionAbastecimientoService(pronosticos, planes, productos, solicitudes, auditoria);
    }

    @Test
    void registraPronosticoNuevoParaProductoExistente() {
        Producto producto = producto(3L, "ACE-3", 4);
        when(productos.findById(3L)).thenReturn(Optional.of(producto));
        when(pronosticos.findByProductIdAndPeriod(3L, "2026-11")).thenReturn(Optional.empty());
        when(pronosticos.save(any())).thenAnswer(invocation -> {
            PronosticoDemanda value = invocation.getArgument(0);
            value.setId(10L);
            return value;
        });

        PronosticoDemanda saved = service().registrarPronostico(3L,
                new RegistrarPronosticoDemandaRequest("2026-11", 12, 3, "Campaña de invierno"));

        assertEquals(10L, saved.getId());
        assertEquals(producto, saved.getProduct());
        assertEquals(12, saved.getForecastQuantity());
        assertEquals(3, saved.getSafetyStock());
        assertNotNull(saved.getRegisteredAt());
        verify(auditoria).registrar(eq("UPSERT"), eq("PRONOSTICO_DEMANDA"), eq(10L), contains("ACE-3"));
    }

    @Test
    void actualizaPronosticoDelMismoProductoYPeriodo() {
        Producto producto = producto(3L, "ACE-3", 4);
        PronosticoDemanda existing = PronosticoDemanda.builder().id(8L).product(producto).period("2026-11")
                .forecastQuantity(4).safetyStock(1).build();
        when(productos.findById(3L)).thenReturn(Optional.of(producto));
        when(pronosticos.findByProductIdAndPeriod(3L, "2026-11")).thenReturn(Optional.of(existing));
        when(pronosticos.save(existing)).thenReturn(existing);

        PronosticoDemanda saved = service().registrarPronostico(3L,
                new RegistrarPronosticoDemandaRequest("2026-11", 20, 5, "Ajustado"));

        assertSame(existing, saved);
        assertEquals(20, existing.getForecastQuantity());
        assertEquals(5, existing.getSafetyStock());
        assertEquals("Ajustado", existing.getNotes());
        verify(pronosticos).save(existing);
    }

    @Test
    void generaPlanSoloParaProductosCuyaDemandaSuperaElStock() {
        Producto requiere = producto(1L, "FILTRO", 3);
        Producto cubierto = producto(2L, "BUJIA", 20);
        PronosticoDemanda uno = PronosticoDemanda.builder().product(requiere).period("2026-11")
                .forecastQuantity(10).safetyStock(2).build();
        PronosticoDemanda dos = PronosticoDemanda.builder().product(cubierto).period("2026-11")
                .forecastQuantity(8).safetyStock(2).build();
        when(pronosticos.findByPeriodOrderByProductNameAsc("2026-11")).thenReturn(List.of(uno, dos));
        when(planes.save(any())).thenAnswer(invocation -> {
            PlanCompra plan = invocation.getArgument(0);
            plan.setId(30L);
            return plan;
        });

        PlanCompra plan = service().generarDesdePronosticos("2026-11", "Revisar proveedor");

        assertEquals("BORRADOR", plan.getStatus());
        assertEquals(1, plan.getItems().size());
        DetallePlanCompra line = plan.getItems().getFirst();
        assertEquals(requiere, line.getProduct());
        assertEquals(9, line.getSuggestedQuantity());
        assertEquals(3, line.getStockAtPlanning());
        assertEquals(10, line.getForecastQuantity());
        verify(auditoria).registrar(eq("CREATE"), eq("PLAN_COMPRA"), eq(30L), contains("pronósticos"));
    }

    @Test
    void noCreaPlanCuandoElInventarioCubreTodoElPronostico() {
        Producto producto = producto(1L, "FILTRO", 20);
        PronosticoDemanda entry = PronosticoDemanda.builder().product(producto).period("2026-11")
                .forecastQuantity(10).safetyStock(2).build();
        when(pronosticos.findByPeriodOrderByProductNameAsc("2026-11")).thenReturn(List.of(entry));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service().generarDesdePronosticos("2026-11", null));

        assertTrue(error.getMessage().contains("inventario"));
        verify(planes, never()).save(any());
    }

    @Test
    void creaPlanManualConInventarioConservadoEnCadaLinea() {
        Producto producto = producto(4L, "CORREA", 7);
        when(productos.findById(4L)).thenReturn(Optional.of(producto));
        when(planes.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        PlanCompra plan = service().crearPlan(new CrearPlanCompraRequest("2026-12", "Compra estacional",
                List.of(new CrearPlanCompraRequest.Item(4L, 15))));

        assertEquals("2026-12", plan.getPeriod());
        assertEquals("Compra estacional", plan.getNotes());
        assertEquals(15, plan.getItems().getFirst().getSuggestedQuantity());
        assertEquals(7, plan.getItems().getFirst().getStockAtPlanning());
        assertEquals(0, plan.getItems().getFirst().getForecastQuantity());
    }

    @Test
    void rechazaProductoRepetidoEnPlanManual() {
        Producto producto = producto(4L, "CORREA", 7);
        when(productos.findById(4L)).thenReturn(Optional.of(producto));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class, () -> service().crearPlan(
                new CrearPlanCompraRequest("2026-12", null, List.of(
                        new CrearPlanCompraRequest.Item(4L, 2), new CrearPlanCompraRequest.Item(4L, 3)))));

        assertTrue(error.getMessage().contains("repetirse"));
        verify(planes, never()).save(any());
    }

    @Test
    void conviertePlanBorradorEnSolicitudPendienteSinCrearOrdenDirecta() {
        Producto producto = producto(8L, "BOMBA", 1);
        PlanCompra plan = PlanCompra.builder().id(18L).code("PC-202611-ABC").status("BORRADOR").build();
        plan.getItems().add(DetallePlanCompra.builder().plan(plan).product(producto).suggestedQuantity(9)
                .stockAtPlanning(1).forecastQuantity(6).build());
        when(planes.findById(18L)).thenReturn(Optional.of(plan));
        when(solicitudes.save(any())).thenAnswer(invocation -> {
            SolicitudCompra request = invocation.getArgument(0);
            request.setId(90L);
            return request;
        });
        when(planes.save(plan)).thenReturn(plan);

        SolicitudCompra request = service().convertirEnSolicitud(18L);

        assertEquals("PENDIENTE", request.getStatus());
        assertTrue(request.getCode().startsWith("SC-PL-"));
        assertEquals(1, request.getItems().size());
        assertEquals(producto, request.getItems().getFirst().getProduct());
        assertEquals(9, request.getItems().getFirst().getQuantity());
        assertEquals("CONVERTIDO", plan.getStatus());
        verify(auditoria).registrar(eq("CREATE"), eq("SOLICITUD_COMPRA"), eq(90L), contains("PC-202611-ABC"));
    }

    @Test
    void noConvierteDosVecesElMismoPlan() {
        PlanCompra plan = PlanCompra.builder().id(18L).status("CONVERTIDO").build();
        when(planes.findById(18L)).thenReturn(Optional.of(plan));

        assertThrows(IllegalArgumentException.class, () -> service().convertirEnSolicitud(18L));

        verify(solicitudes, never()).save(any());
    }

    @Test
    void fallaConProductoOPlanInexistente() {
        when(productos.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service().registrarPronostico(99L,
                new RegistrarPronosticoDemandaRequest("2026-11", 1, 0, null)));
        when(planes.findById(77L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service().convertirEnSolicitud(77L));
    }

    private Producto producto(Long id, String code, int stock) {
        return Producto.builder().id(id).code(code).name(code).purchasePrice(BigDecimal.TEN).salePrice(BigDecimal.TEN)
                .currentStock(stock).minStock(4).active(true).build();
    }
}
