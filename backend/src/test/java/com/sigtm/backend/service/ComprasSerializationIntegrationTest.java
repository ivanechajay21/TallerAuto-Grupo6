package com.sigtm.backend.service;

import com.sigtm.backend.model.*;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas de serialización de los endpoints de compras y abastecimiento.
 *
 * <p>Se ejecutan con MySQL real y sin {@code @Transactional}: los datos se
 * confirman antes del GET, de modo que una asociación LAZY no inicializada
 * reproduce el mismo fallo que en producción.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("mysql")
@Testcontainers
@WithMockUser(authorities = "COMPRAS:VER")
class ComprasSerializationIntegrationTest {

    private static final String TEST_JWT_SECRET =
            "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWYwMTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZg==";

    @Container
    private static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.0")
            .withDatabaseName("sigtm_compras_test")
            .withUsername("sigtm_test")
            .withPassword("sigtm_test");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
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

    @Autowired private MockMvc mockMvc;
    @Autowired private ProveedorRepository suppliers;
    @Autowired private ProductoRepository products;
    @Autowired private OrdenCompraRepository orders;
    @Autowired private FacturaProveedorRepository invoices;
    @Autowired private PagoProveedorRepository payments;
    @Autowired private ContratoProveedorRepository contracts;
    @Autowired private SolicitudCompraRepository requests;
    @Autowired private PlanCompraRepository plans;
    @Autowired private PronosticoDemandaRepository forecasts;
    @Autowired private IncidenciaProveedorRepository incidents;
    @Autowired private SeguimientoCompraRepository tracking;

    @Test
    @DisplayName("los listados de compras serializan DTOs con asociaciones reales")
    void listadosSerializanSinLazyInitialization() throws Exception {
        Proveedor supplier = suppliers.save(Proveedor.builder()
                .businessName("Proveedor Integración SAC")
                .taxId("20999999998")
                .contactName("Contacto")
                .email("integracion@proveedor.test")
                .build());

        Producto product = products.save(Producto.builder()
                .code("INT-001")
                .name("Producto integración")
                .purchasePrice(new BigDecimal("10.00"))
                .salePrice(new BigDecimal("15.00"))
                .currentStock(4)
                .minStock(2)
                .build());

        OrdenCompra order = orders.save(OrdenCompra.builder()
                .code("OC-INT-001")
                .supplier(supplier)
                .status("RECIBIDA")
                .issueDate(LocalDate.now())
                .total(new BigDecimal("20.00"))
                .build());

        invoices.save(FacturaProveedor.builder()
                .number("FP-INT-001")
                .purchaseOrder(order)
                .issueDate(LocalDate.now())
                .dueDate(LocalDate.now().plusDays(30))
                .total(new BigDecimal("20.00"))
                .balance(new BigDecimal("15.00"))
                .status("PARCIAL")
                .build());
        payments.save(PagoProveedor.builder()
                .supplierInvoice(invoices.findByNumber("FP-INT-001").orElseThrow())
                .amount(new BigDecimal("5.00"))
                .method("CARD")
                .paidAt(LocalDateTime.now())
                .build());

        contracts.save(ContratoProveedor.builder()
                .code("CP-INT-001")
                .supplier(supplier)
                .startsAt(LocalDate.now())
                .endsAt(LocalDate.now().plusYears(1))
                .currency("PEN")
                .discountPercentage(BigDecimal.ZERO)
                .paymentDays(30)
                .minimumPurchase(new BigDecimal("100.00"))
                .terms("Contrato de integración")
                .build());

        SolicitudCompra request = SolicitudCompra.builder()
                .code("SC-INT-001")
                .requestedAt(LocalDateTime.now())
                .status("PENDIENTE")
                .notes("Solicitud de integración")
                .build();
        request.getItems().add(DetalleSolicitudCompra.builder()
                .request(request).product(product).quantity(2).build());
        requests.save(request);

        PronosticoDemanda forecast = PronosticoDemanda.builder()
                .period("2026-11")
                .product(product)
                .forecastQuantity(10)
                .safetyStock(2)
                .registeredAt(LocalDateTime.now())
                .build();
        forecasts.save(forecast);

        PlanCompra plan = PlanCompra.builder()
                .code("PC-INT-001")
                .period("2026-11")
                .status("BORRADOR")
                .createdAt(LocalDateTime.now())
                .notes("Plan de integración")
                .build();
        plan.getItems().add(DetallePlanCompra.builder()
                .plan(plan).product(product).suggestedQuantity(8).stockAtPlanning(4).forecastQuantity(10).build());
        plans.save(plan);

        incidents.save(IncidenciaProveedor.builder()
                .supplier(supplier)
                .purchaseOrder(order)
                .category("CALIDAD")
                .priority("ALTA")
                .status("ABIERTA")
                .description("Incidencia de integración")
                .reportedAt(LocalDateTime.now())
                .build());

        tracking.save(SeguimientoCompra.builder()
                .purchaseOrder(order)
                .status("EN_TRANSITO")
                .carrier("Transportes Integración")
                .build());

        mockMvc.perform(get("/api/cuentas-por-pagar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].purchaseOrder.code").value("OC-INT-001"))
                .andExpect(jsonPath("$[0].payments[0].method").value("CARD"));

        mockMvc.perform(get("/api/cuentas-por-pagar/{id}/pagos", invoices.findByNumber("FP-INT-001").orElseThrow().getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].amount").value(5.00));

        mockMvc.perform(get("/api/proveedores/{id}/contratos", supplier.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].supplier.businessName").value("Proveedor Integración SAC"));

        mockMvc.perform(get("/api/reposicion/solicitudes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].items[0].product.name").value("Producto integración"));

        mockMvc.perform(get("/api/planificacion-abastecimiento/pronosticos").param("period", "2026-11"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].product.name").value("Producto integración"));

        mockMvc.perform(get("/api/planificacion-abastecimiento/planes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].items[0].product.name").value("Producto integración"));

        mockMvc.perform(get("/api/incidencias-proveedor"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].supplier.businessName").value("Proveedor Integración SAC"));

        mockMvc.perform(get("/api/compras/{id}/seguimiento", order.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purchaseOrder.code").value("OC-INT-001"));
    }
}
