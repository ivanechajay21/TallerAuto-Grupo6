package com.sigtm.backend.service;

import com.sigtm.backend.model.Producto;
import com.sigtm.backend.repository.MovimientoInventarioRepository;
import com.sigtm.backend.repository.ProductoRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductoServicePaginadoTest {

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private MovimientoInventarioRepository movimientoInventarioRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private AuditoriaService auditoriaService;

    @Mock
    private NotificacionService notificacionService;

    private ProductoService service;

    private Producto producto() {
        return Producto.builder()
                .id(6L)
                .code("REP-000006")
                .name("Filtro de aceite")
                .brand("Mann")
                .category("Filtros")
                .purchasePrice(new BigDecimal("18.50"))
                .salePrice(new BigDecimal("29.90"))
                .currentStock(3)
                .minStock(5)
                .active(true)
                .build();
    }

    private void initService() {
        service = new ProductoService(productoRepository, movimientoInventarioRepository,
                usuarioRepository, auditoriaService, notificacionService);
    }

    private void resumen(long total, long low, long out, long inactive, BigDecimal value) {
        when(productoRepository.count()).thenReturn(total);
        when(productoRepository.countLowStock()).thenReturn(low);
        when(productoRepository.countOutOfStock()).thenReturn(out);
        when(productoRepository.countByActiveFalse()).thenReturn(inactive);
        when(productoRepository.sumInventoryValue()).thenReturn(value);
        when(productoRepository.findCategorias()).thenReturn(List.of("Filtros", "Aceites"));
    }

    @Test
    @DisplayName("buscarPaginado devuelve productos, categorías y resumen de inventario")
    void buscarPaginado_ok() {
        initService();
        Producto producto = producto();
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(producto), PageRequest.of(0, 10), 30));
        resumen(30, 5, 2, 4, new BigDecimal("2450.75"));

        Map<String, Object> resultado = service.buscarPaginado(
                0, 10, true, "filtro", "Filtros", "BAJO");

        assertEquals(1, ((List<?>) resultado.get("content")).size());
        assertSame(producto, ((List<?>) resultado.get("content")).get(0));
        assertEquals(1, resultado.get("page"));
        assertEquals(10, resultado.get("size"));
        assertEquals(30L, resultado.get("totalElements"));
        assertEquals(3, resultado.get("totalPages"));
        assertEquals(List.of("Filtros", "Aceites"), resultado.get("categories"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(30L, summary.get("total"));
        assertEquals(5L, summary.get("lowStock"));
        assertEquals(2L, summary.get("outOfStock"));
        assertEquals(4L, summary.get("inactive"));
        assertEquals(new BigDecimal("2450.75"), summary.get("value"));
    }

    @Test
    @DisplayName("buscarPaginado normaliza página negativa y limita el tamaño a 100")
    void buscarPaginado_normalizaParametros() {
        initService();
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
        resumen(0, 0, 0, 0, BigDecimal.ZERO);

        service.buscarPaginado(-2, 900, false, null, null, null);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(productoRepository).findAll(any(Specification.class), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(100, captor.getValue().getPageSize());
        assertEquals(Sort.Direction.ASC,
                captor.getValue().getSort().getOrderFor("name").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado usa valor cero cuando no hay inventario valorizado")
    void buscarPaginado_valorNulo() {
        initService();
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0, null);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, false, null, "TODAS", "TODOS");

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(BigDecimal.ZERO, summary.get("value"));
    }

    @Test
    @DisplayName("buscarPaginado devuelve una página vacía sin errores")
    void buscarPaginado_vacio() {
        initService();
        when(productoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0, BigDecimal.ZERO);

        Map<String, Object> resultado = service.buscarPaginado(0, 10, true, null, null, "AGOTADO");

        assertTrue(((List<?>) resultado.get("content")).isEmpty());
        assertEquals(0L, resultado.get("totalElements"));
        assertEquals(0, resultado.get("totalPages"));
    }
}
