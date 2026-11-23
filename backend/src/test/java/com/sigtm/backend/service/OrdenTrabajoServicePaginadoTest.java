package com.sigtm.backend.service;

import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.CitaRepository;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.ItemOrdenTrabajoRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import com.sigtm.backend.repository.ServicioCatalogoRepository;
import com.sigtm.backend.repository.UsuarioRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrdenTrabajoServicePaginadoTest {

    @Mock
    private OrdenTrabajoRepository ordenTrabajoRepository;

    @Mock
    private ClienteRepository clienteRepository;

    @Mock
    private VehiculoRepository vehiculoRepository;

    @Mock
    private CitaRepository citaRepository;

    @Mock
    private ItemOrdenTrabajoRepository itemOrdenTrabajoRepository;

    @Mock
    private ServicioCatalogoRepository servicioCatalogoRepository;

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private CodeGeneratorService codeGeneratorService;

    @Mock
    private NotificacionService notificacionService;

    @Mock
    private AuditoriaService auditoriaService;

    @Mock
    private ProductoService productoService;

    @InjectMocks
    private OrdenTrabajoService service;

    private Cliente cliente() {
        return Cliente.builder()
                .id(1L)
                .code("CLI-000001")
                .firstName("Ana")
                .lastName("Torres")
                .documentNumber("12345678")
                .phone("999888777")
                .build();
    }

    private Vehiculo vehiculo() {
        return Vehiculo.builder()
                .id(2L)
                .code("VEH-000002")
                .plate("XYZ-456")
                .brand("Hyundai")
                .model("Accent")
                .year(2021)
                .color("Gris")
                .build();
    }

    private OrdenTrabajo orden(Long id, String numero, String prioridad, String estado) {
        return OrdenTrabajo.builder()
                .id(id)
                .orderNumber(numero)
                .customer(cliente())
                .vehicle(vehiculo())
                .receptionDate(LocalDateTime.of(2026, 11, 5, 10, 0))
                .currentMileage(32000)
                .fuelLevel("1/2")
                .customerSymptoms("Ruido en frenos")
                .priority(prioridad)
                .status(estado)
                .items(List.of())
                .build();
    }

    private void resumen(long total, long history, long active, long urgent, long ready, BigDecimal value) {
        when(ordenTrabajoRepository.count()).thenReturn(total);
        when(ordenTrabajoRepository.countByStatus("FINALIZADO")).thenReturn(history);
        when(ordenTrabajoRepository.countByStatusNot("FINALIZADO")).thenReturn(active);
        when(ordenTrabajoRepository.countByStatusNotAndPriorityIgnoreCase("FINALIZADO", "URGENTE"))
                .thenReturn(urgent);
        when(ordenTrabajoRepository.countByStatus("LISTO_PARA_ENTREGA")).thenReturn(ready);
        when(itemOrdenTrabajoRepository.sumarValorActivo()).thenReturn(value);
    }

    @Test
    @DisplayName("buscarPaginado devuelve órdenes mapeadas y resumen global")
    void buscarPaginado_ok() {
        OrdenTrabajo orden = orden(5L, "OT-000005", "ALTA", "EN_PROCESO");
        when(ordenTrabajoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(orden), PageRequest.of(0, 10), 20));
        resumen(20, 8, 12, 3, 2, new BigDecimal("8750.50"));

        Map<String, Object> resultado = service.buscarPaginado(
                0, 10, "activas", "XYZ", "EN_PROCESO", "ALTA", null,
                false, false, false, false, "reciente");

        assertEquals(1, ((List<?>) resultado.get("content")).size());
        @SuppressWarnings("unchecked")
        Map<String, Object> fila = (Map<String, Object>) ((List<?>) resultado.get("content")).get(0);
        assertEquals(5L, fila.get("id"));
        assertEquals("OT-000005", fila.get("orderNumber"));
        assertEquals("EN_PROCESO", fila.get("status"));
        assertEquals("ALTA", fila.get("priority"));
        assertEquals("XYZ-456", ((Map<?, ?>) fila.get("vehicle")).get("plate"));
        assertEquals("Torres", ((Map<?, ?>) fila.get("customer")).get("lastName"));
        assertEquals(new BigDecimal("0"), fila.get("totalAmount"));
        assertEquals(1, resultado.get("page"));
        assertEquals(10, resultado.get("size"));
        assertEquals(20L, resultado.get("totalElements"));
        assertEquals(2, resultado.get("totalPages"));

        @SuppressWarnings("unchecked")
        Map<String, Object> summary = (Map<String, Object>) resultado.get("summary");
        assertEquals(20L, summary.get("total"));
        assertEquals(8L, summary.get("history"));
        assertEquals(12L, summary.get("active"));
        assertEquals(3L, summary.get("urgent"));
        assertEquals(2L, summary.get("ready"));
        assertEquals(new BigDecimal("8750.50"), summary.get("estimatedValue"));
    }

    @Test
    @DisplayName("buscarPaginado normaliza página negativa y limita el tamaño a 100")
    void buscarPaginado_normalizaParametros() {
        when(ordenTrabajoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 100), 0));
        resumen(0, 0, 0, 0, 0, BigDecimal.ZERO);

        service.buscarPaginado(-9, 500, null, null, null, null, null,
                false, false, false, false, "reciente");

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(ordenTrabajoRepository).findAll(any(Specification.class), captor.capture());
        assertEquals(0, captor.getValue().getPageNumber());
        assertEquals(100, captor.getValue().getPageSize());
        assertEquals(Sort.Direction.DESC,
                captor.getValue().getSort().getOrderFor("receptionDate").getDirection());
    }

    @Test
    @DisplayName("buscarPaginado ordena por total y pagina en memoria")
    void buscarPaginado_ordenTotal() {
        OrdenTrabajo menor = orden(1L, "OT-000001", "BAJA", "EN_PROCESO");
        OrdenTrabajo mayor = orden(2L, "OT-000002", "ALTA", "EN_PROCESO");
        mayor.setItems(List.of(ItemOrdenTrabajo.builder()
                .id(10L)
                .description("Cambio de pastillas")
                .price(new BigDecimal("450"))
                .quantity(2)
                .status("COMPLETED")
                .build()));
        when(ordenTrabajoRepository.findAll(any(Specification.class))).thenReturn(List.of(menor, mayor));
        resumen(2, 0, 2, 1, 1, new BigDecimal("900"));

        Map<String, Object> resultado = service.buscarPaginado(
                0, 10, "activas", null, null, null, null,
                false, false, false, false, "total");

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> filas = (List<Map<String, Object>>) resultado.get("content");
        assertEquals(2, filas.size());
        assertEquals(2L, filas.get(0).get("id"));
        assertEquals(new BigDecimal("900"), filas.get(0).get("totalAmount"));
        assertEquals(1L, filas.get(1).get("id"));
        assertEquals(2L, resultado.get("totalElements"));
    }

    @Test
    @DisplayName("buscarPaginado devuelve una página vacía sin errores")
    void buscarPaginado_vacio() {
        when(ordenTrabajoRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        resumen(0, 0, 0, 0, 0, BigDecimal.ZERO);

        Map<String, Object> resultado = service.buscarPaginado(
                0, 10, "historial", null, null, null, null,
                false, false, false, false, null);

        assertTrue(((List<?>) resultado.get("content")).isEmpty());
        assertEquals(0L, resultado.get("totalElements"));
        assertEquals(0, resultado.get("totalPages"));
    }
}
