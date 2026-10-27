package com.sigtm.backend.service;

import com.sigtm.backend.exception.DuplicateResourceException;
import com.sigtm.backend.exception.ResourceNotFoundException;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Pruebas de caracterización de altas, validaciones y baja lógica de vehículos. */
@ExtendWith(MockitoExtension.class)
class VehiculoServiceTest {
    @Mock private VehiculoRepository vehiculos;
    @Mock private ClienteRepository clientes;
    @Mock private CodeGeneratorService codigos;
    @Mock private RecepcionVehiculoRepository recepciones;
    @Mock private OrdenTrabajoRepository ordenes;
    @Mock private AuditoriaService auditoria;

    private VehiculoService service() { return new VehiculoService(vehiculos, clientes, codigos, recepciones, ordenes, auditoria); }

    @Test
    void creaVehiculoAsignandoPropietarioYValoresPorDefecto() {
        Cliente cliente = Cliente.builder().id(2L).firstName("Ana").lastName("López").documentNumber("123").build();
        Vehiculo vehicle = vehiculo(null, "ABC-123", "1HGBH41JXMN109186"); vehicle.setCode(null); vehicle.setActive(null); vehicle.setRegistrationDate(null);
        when(clientes.findById(2L)).thenReturn(Optional.of(cliente));
        when(vehiculos.findByPlate("ABC-123")).thenReturn(Optional.empty());
        when(vehiculos.findByVin("1HGBH41JXMN109186")).thenReturn(Optional.empty());
        when(codigos.nextCode("VEH")).thenReturn("VEH-000010");
        when(vehiculos.save(any())).thenAnswer(i -> { Vehiculo saved = i.getArgument(0); saved.setId(10L); return saved; });

        Vehiculo created = service().crearVehiculo(2L, vehicle);

        assertEquals(cliente, created.getCustomer()); assertEquals("VEH-000010", created.getCode());
        assertTrue(created.getActive()); assertNotNull(created.getRegistrationDate());
        verify(auditoria).registrar(eq("CREATE"), eq("VEHICULO"), eq(10L), contains("ABC-123"));
    }

    @Test
    void rechazaPlacaDuplicadaSinConsultarVinNiGuardar() {
        when(clientes.findById(2L)).thenReturn(Optional.of(Cliente.builder().id(2L).build()));
        when(vehiculos.findByPlate("ABC-123")).thenReturn(Optional.of(vehiculo(1L, "ABC-123", null)));

        assertThrows(DuplicateResourceException.class, () -> service().crearVehiculo(2L, vehiculo(null, "ABC-123", "VIN-NUEVO")));

        verify(vehiculos, never()).findByVin(anyString()); verify(vehiculos, never()).save(any());
    }

    @Test
    void rechazaVinDuplicadoCuandoLaPlacaEstaDisponible() {
        when(clientes.findById(2L)).thenReturn(Optional.of(Cliente.builder().id(2L).build()));
        when(vehiculos.findByPlate("ABC-123")).thenReturn(Optional.empty());
        when(vehiculos.findByVin("VIN-1")).thenReturn(Optional.of(vehiculo(4L, "OLD-001", "VIN-1")));

        assertThrows(DuplicateResourceException.class, () -> service().crearVehiculo(2L, vehiculo(null, "ABC-123", "VIN-1")));
        verify(vehiculos, never()).save(any());
    }

    @Test
    void actualizaFichaTecnicaSinCambiarPropietarioNiCodigo() {
        Cliente owner = Cliente.builder().id(2L).build();
        Vehiculo actual = vehiculo(8L, "ABC-123", "VIN-1"); actual.setCode("VEH-000008"); actual.setCustomer(owner);
        Vehiculo changes = vehiculo(null, "XYZ-999", "VIN-2"); changes.setBrand("Toyota"); changes.setCurrentMileage(120000); changes.setActive(false);
        when(vehiculos.findById(8L)).thenReturn(Optional.of(actual)); when(vehiculos.save(actual)).thenReturn(actual);

        Vehiculo updated = service().actualizarVehiculo(8L, changes);

        assertEquals(owner, updated.getCustomer()); assertEquals("VEH-000008", updated.getCode());
        assertEquals("XYZ-999", updated.getPlate()); assertEquals("Toyota", updated.getBrand()); assertFalse(updated.getActive());
        verify(auditoria).registrar(eq("UPDATE"), eq("VEHICULO"), eq(8L), contains("XYZ-999"));
    }

    @Test
    void desactivaVehiculoActivoYReportaVehiculoInexistente() {
        Vehiculo actual = vehiculo(8L, "ABC-123", null); actual.setCode("VEH-000008"); actual.setActive(true);
        when(vehiculos.findById(8L)).thenReturn(Optional.of(actual));
        service().eliminarVehiculo(8L);
        assertFalse(actual.getActive()); verify(vehiculos).save(actual);
        verify(auditoria).registrar(eq("DELETE"), eq("VEHICULO"), eq(8L), contains("desactivado"));

        when(vehiculos.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service().obtenerPorId(99L));
    }

    private Vehiculo vehiculo(Long id, String plate, String vin) {
        return Vehiculo.builder().id(id).plate(plate).vin(vin).brand("Honda").model("Civic").active(true).build();
    }
}
