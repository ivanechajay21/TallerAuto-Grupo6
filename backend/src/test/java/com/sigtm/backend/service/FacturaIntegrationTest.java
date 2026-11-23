package com.sigtm.backend.service;

import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.Factura;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.TipoComprobante;
import com.sigtm.backend.model.TipoDocumento;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.FacturaRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Prueba de integración real de emisión de comprobantes.
 *
 * <p>Levanta MySQL con Testcontainers y persiste la orden, el detalle y el
 * comprobante. Es la prueba que habría detectado el fallo de
 * {@code fecha_emision} nula y la ausencia de serie/correlativo.</p>
 */
@SpringBootTest
@ActiveProfiles("mysql")
@Testcontainers
@Transactional
class FacturaIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZg==";

    @Container
    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("sigtm_test")
            .withUsername("sigtm_test")
            .withPassword("sigtm_test");

    @DynamicPropertySource
    static void registerTestProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update");
        registry.add("DB_URL", MYSQL::getJdbcUrl);
        registry.add("DB_USERNAME", MYSQL::getUsername);
        registry.add("DB_PASSWORD", MYSQL::getPassword);
        registry.add("JWT_SECRET", () -> TEST_JWT_SECRET);
        registry.add("app.seed.enabled", () -> "false");
    }

    @Autowired private FacturaService facturaService;
    @Autowired private ClienteRepository clientes;
    @Autowired private VehiculoRepository vehiculos;
    @Autowired private OrdenTrabajoRepository ordenes;
    @Autowired private FacturaRepository facturas;

    @Test
    @DisplayName("persiste una factura con fecha, serie F001 y RUC")
    void persisteFacturaConFechaSerieYDocumento() {
        OrdenTrabajo orden = crearOrden("20123456789", "FAC-001", "OT-FAC-001");

        Map<String, Object> result = facturaService.generarFactura(orden.getId(), TipoComprobante.FACTURA);

        Factura factura = facturas.findByWorkOrderId(orden.getId()).orElseThrow();
        assertNotNull(factura.getIssueDate(), "La fecha de emisión debe quedar persistida");
        assertEquals(TipoComprobante.FACTURA, factura.getDocumentType());
        assertEquals(TipoDocumento.RUC, factura.getCustomerDocumentType());
        assertEquals("F001", factura.getSeries());
        assertTrue(factura.getCorrelative() > 0);
        assertTrue(factura.getInvoiceNumber().startsWith("F001-"));
        assertEquals(new BigDecimal("100.00"), factura.getSubtotal());
        assertEquals(new BigDecimal("18.00"), factura.getTaxAmount());
        assertEquals(new BigDecimal("118.00"), factura.getTotalAmount());
        assertEquals("FACTURA", result.get("documentType"));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) result.get("items");
        assertEquals(1, items.size());
        assertEquals("Servicio de prueba", items.get(0).get("description"));
        assertEquals(new BigDecimal("100.00"), items.get(0).get("unitPrice"));
    }

    @Test
    @DisplayName("persiste una boleta con serie B001 y DNI")
    void persisteBoletaConSerieYDocumento() {
        OrdenTrabajo orden = crearOrden("74125896", "BOL-001", "OT-BOL-001");

        facturaService.generarFactura(orden.getId(), TipoComprobante.BOLETA);

        Factura factura = facturas.findByWorkOrderId(orden.getId()).orElseThrow();
        assertNotNull(factura.getIssueDate());
        assertEquals(TipoComprobante.BOLETA, factura.getDocumentType());
        assertEquals(TipoDocumento.DNI, factura.getCustomerDocumentType());
        assertEquals("B001", factura.getSeries());
        assertTrue(factura.getInvoiceNumber().startsWith("B001-"));
    }

    @Test
    @DisplayName("rechaza factura cuando el cliente solo tiene DNI")
    void rechazaFacturaConDni() {
        OrdenTrabajo orden = crearOrden("87654321", "FAC-002", "OT-FAC-002");

        IllegalArgumentException error = org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () -> facturaService.generarFactura(orden.getId(), TipoComprobante.FACTURA));

        assertTrue(error.getMessage().contains("RUC"));
        assertTrue(facturas.findByWorkOrderId(orden.getId()).isEmpty());
    }

    private OrdenTrabajo crearOrden(String documento, String placa, String numeroOrden) {
        Cliente cliente = clientes.save(Cliente.builder()
                .documentNumber(documento)
                .firstName("Cliente")
                .lastName("Prueba")
                .build());

        Vehiculo vehiculo = vehiculos.save(Vehiculo.builder()
                .plate(placa)
                .brand("Toyota")
                .model("Corolla")
                .customer(cliente)
                .build());

        OrdenTrabajo orden = OrdenTrabajo.builder()
                .orderNumber(numeroOrden)
                .customer(cliente)
                .vehicle(vehiculo)
                .priority("NORMAL")
                .status("FINALIZADO")
                .build();
        orden.setItems(new ArrayList<>());

        ItemOrdenTrabajo item = ItemOrdenTrabajo.builder()
                .description("Servicio de prueba")
                .price(new BigDecimal("100.00"))
                .quantity(1)
                .status("COMPLETED")
                .workOrder(orden)
                .build();
        orden.getItems().add(item);

        return ordenes.save(orden);
    }
}
