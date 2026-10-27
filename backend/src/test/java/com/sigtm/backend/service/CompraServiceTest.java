package com.sigtm.backend.service;

import com.sigtm.backend.dto.CrearOrdenCompraRequest;
import com.sigtm.backend.model.OrdenCompra;
import com.sigtm.backend.model.Producto;
import com.sigtm.backend.model.Proveedor;
import com.sigtm.backend.repository.OrdenCompraRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.RecepcionCompraRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.repository.HistorialOrdenCompraRepository;
import com.sigtm.backend.repository.DevolucionCompraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CompraServiceTest {
    @Mock private OrdenCompraRepository ordenCompraRepository;
    @Mock private RecepcionCompraRepository recepcionCompraRepository;
    @Mock private ProveedorService proveedorService;
    @Mock private ProductoRepository productoRepository;
    @Mock private ProductoService productoService;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private AuditoriaService auditoriaService;
    @Mock private HistorialOrdenCompraRepository historialOrdenCompraRepository;
    @Mock private DevolucionCompraRepository devolucionCompraRepository;

    @Test
    void creaOrdenPendienteConTotalCalculadoYLineasDeProducto() {
        CompraService service = new CompraService(ordenCompraRepository, recepcionCompraRepository, proveedorService,
                productoRepository, productoService, usuarioRepository, auditoriaService, historialOrdenCompraRepository, devolucionCompraRepository);
        Proveedor proveedor = Proveedor.builder().id(4L).businessName("Repuestos Perú").taxId("20123456789").active(true).build();
        Producto producto = Producto.builder().id(9L).name("Filtro de aceite").code("FIL-01").active(true).build();
        CrearOrdenCompraRequest request = new CrearOrdenCompraRequest(4L, null, "Compra semanal",
                List.of(new CrearOrdenCompraRequest.Item(9L, 3, new BigDecimal("12.50"))));
        when(proveedorService.obtener(4L)).thenReturn(proveedor);
        when(productoRepository.findById(9L)).thenReturn(Optional.of(producto));
        AtomicReference<OrdenCompra> saved = new AtomicReference<>();
        when(ordenCompraRepository.save(any(OrdenCompra.class))).thenAnswer(invocation -> {
            OrdenCompra order = invocation.getArgument(0);
            order.setId(15L);
            saved.set(order);
            return order;
        });
        when(ordenCompraRepository.findDetailedById(15L)).thenAnswer(invocation -> Optional.of(saved.get()));

        OrdenCompra result = service.crear(request);

        ArgumentCaptor<OrdenCompra> captor = ArgumentCaptor.forClass(OrdenCompra.class);
        verify(ordenCompraRepository).save(captor.capture());
        assertEquals("PENDIENTE_APROBACION", result.getStatus());
        assertEquals(new BigDecimal("37.50"), result.getTotal());
        assertEquals(1, result.getItems().size());
        assertEquals(3, result.getItems().getFirst().getRequestedQuantity());
        verify(auditoriaService).registrar(eq("CREATE"), eq("ORDEN_COMPRA"), eq(15L), contains("Repuestos Perú"));
    }
}
