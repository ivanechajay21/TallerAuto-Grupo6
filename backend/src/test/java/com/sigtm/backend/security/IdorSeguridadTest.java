package com.sigtm.backend.security;

import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.ItemOrdenTrabajo;
import com.sigtm.backend.model.OrdenTrabajo;
import com.sigtm.backend.model.Usuario;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.OrdenTrabajoRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.util.ArrayList;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Pruebas IDOR sobre órdenes de trabajo.
 *
 * <p>Un mecánico solo debe acceder a las órdenes que tienen al menos un trabajo
 * asignado a su usuario. Los usuarios con {@code ORDENES:VER} conservan acceso
 * global.</p>
 */
class IdorSeguridadTest extends SeguridadBaseTest {

    @Autowired
    private ClienteRepository clientes;

    @Autowired
    private VehiculoRepository vehiculos;

    @Autowired
    private OrdenTrabajoRepository ordenes;

    @Test
    @DisplayName("El mecánico puede consultar su propia orden")
    void mecanicoPuedeVerSuPropiaOrden() throws Exception {
        Usuario mecanicoA = crearMecanico("mecanico_idor_a");
        OrdenTrabajo ordenA = crearOrdenPara(mecanicoA, "A");

        String tokenA = login("mecanico_idor_a", PASSWORD_PRUEBA);

        mockMvc.perform(get("/api/ordenes-trabajo/{id}", ordenA.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value("OT-IDOR-A"));
    }

    @Test
    @DisplayName("El mecánico no puede consultar la orden de otro mecánico")
    void mecanicoNoPuedeVerOrdenAjena() throws Exception {
        crearMecanico("mecanico_idor_a");
        Usuario mecanicoB = crearMecanico("mecanico_idor_b");
        OrdenTrabajo ordenB = crearOrdenPara(mecanicoB, "B");

        String tokenA = login("mecanico_idor_a", PASSWORD_PRUEBA);

        mockMvc.perform(get("/api/ordenes-trabajo/{id}", ordenB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("El mecánico no puede consultar los trabajos de otro mecánico")
    void mecanicoNoPuedeConsultarTrabajosDeOtro() throws Exception {
        crearMecanico("mecanico_idor_a");
        Usuario mecanicoB = crearMecanico("mecanico_idor_b");
        crearOrdenPara(mecanicoB, "B");

        String tokenA = login("mecanico_idor_a", PASSWORD_PRUEBA);

        mockMvc.perform(get("/api/ordenes-trabajo/mecanico/{id}/detalles", mecanicoB.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un usuario con ORDENES:VER puede consultar cualquier orden")
    void adminPuedeVerCualquierOrden() throws Exception {
        Usuario mecanicoB = crearMecanico("mecanico_idor_b");
        OrdenTrabajo ordenB = crearOrdenPara(mecanicoB, "B");

        String tokenAdmin = loginAdmin();

        mockMvc.perform(get("/api/ordenes-trabajo/{id}", ordenB.getId())
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orderNumber").value("OT-IDOR-B"));
    }

    private OrdenTrabajo crearOrdenPara(Usuario mecanico, String sufijo) {
        Cliente cliente = clientes.save(Cliente.builder()
                .code("CLI-IDOR-" + sufijo)
                .documentNumber("IDOR-DOC-" + sufijo)
                .firstName("Cliente")
                .lastName(sufijo)
                .build());

        Vehiculo vehiculo = vehiculos.save(Vehiculo.builder()
                .code("VEH-IDOR-" + sufijo)
                .plate("IDR-" + sufijo)
                .brand("Marca")
                .model("Modelo")
                .customer(cliente)
                .build());

        OrdenTrabajo orden = OrdenTrabajo.builder()
                .orderNumber("OT-IDOR-" + sufijo)
                .customer(cliente)
                .vehicle(vehiculo)
                .priority("NORMAL")
                .status("EN_PROCESO")
                .items(new ArrayList<>())
                .build();

        ItemOrdenTrabajo item = ItemOrdenTrabajo.builder()
                .workOrder(orden)
                .mechanic(mecanico)
                .description("Trabajo asignado a " + mecanico.getUsername())
                .price(new BigDecimal("100.00"))
                .quantity(1)
                .status("PENDING")
                .build();

        orden.getItems().add(item);

        return ordenes.save(orden);
    }
}
