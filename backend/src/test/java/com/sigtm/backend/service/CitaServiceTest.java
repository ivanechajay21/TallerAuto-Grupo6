package com.sigtm.backend.service;

import com.sigtm.backend.model.Cita;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.CitaRepository;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Pruebas de caracterización de agenda, relaciones y estados de las citas. */
@ExtendWith(MockitoExtension.class)
class CitaServiceTest {
    @Mock private CitaRepository citas;
    @Mock private ClienteRepository clientes;
    @Mock private VehiculoRepository vehiculos;
    @Mock private AuditoriaService auditoria;
    @Mock private NotificacionService notificaciones;

    private CitaService service() { return new CitaService(citas, clientes, vehiculos, auditoria, notificaciones); }

    @Test
    void creaCitaPendienteYExponeResumenDeClienteYVehiculo() {
        Cliente cliente = Cliente.builder().id(3L).code("CLI-3").firstName("Ana").lastName("López").documentNumber("74125896").build();
        Vehiculo vehicle = Vehiculo.builder().id(7L).plate("ABC-123").brand("Honda").model("Civic").build();
        Cita cita = cita();
        when(clientes.findById(3L)).thenReturn(Optional.of(cliente)); when(vehiculos.findById(7L)).thenReturn(Optional.of(vehicle));
        when(citas.save(any())).thenAnswer(i -> { Cita saved = i.getArgument(0); saved.setId(18L); return saved; });

        Map<String, Object> result = service().crearCita(3L, 7L, cita);

        assertEquals("PENDING", cita.getStatus()); assertEquals(cliente, cita.getCustomer()); assertEquals(vehicle, cita.getVehicle());
        assertEquals("2026-11-15", result.get("appointmentDate")); assertEquals("09:30", result.get("appointmentTime"));
        assertEquals("Ana", ((Map<?, ?>) result.get("customer")).get("firstName"));
        assertEquals("ABC-123", ((Map<?, ?>) result.get("vehicle")).get("plate"));
        verify(auditoria).registrar(eq("CREATE"), eq("CITA"), eq(18L), contains("ABC-123"));
    }

    @Test
    void noCreaCitaSiElClienteNoExiste() {
        when(clientes.findById(99L)).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(RuntimeException.class, () -> service().crearCita(99L, 7L, cita()));

        assertEquals("Cliente no encontrado", error.getMessage()); verifyNoInteractions(vehiculos, citas, auditoria);
    }

    @Test
    void noCreaCitaSiElVehiculoNoExiste() {
        when(clientes.findById(3L)).thenReturn(Optional.of(Cliente.builder().id(3L).build()));
        when(vehiculos.findById(99L)).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(RuntimeException.class, () -> service().crearCita(3L, 99L, cita()));

        assertEquals("Vehículo no encontrado", error.getMessage()); verify(citas, never()).save(any());
    }

    @Test
    void actualizaEstadoManteniendoDatosDeLaCita() {
        Vehiculo vehicle = Vehiculo.builder().id(7L).plate("ABC-123").brand("Honda").model("Civic").build();
        Cita cita = cita(); cita.setId(18L); cita.setStatus("PENDING"); cita.setVehicle(vehicle);
        when(citas.findById(18L)).thenReturn(Optional.of(cita)); when(citas.save(cita)).thenReturn(cita);

        Map<String, Object> result = service().actualizarEstado(18L, "CONFIRMED");

        assertEquals("CONFIRMED", cita.getStatus()); assertEquals("CONFIRMED", result.get("status"));
        verify(auditoria).registrar(eq("STATUS"), eq("CITA"), eq(18L), contains("PENDING a CONFIRMED"));
        verify(notificaciones).notificarRol(anyList(), eq("CITAS"), eq("Cita confirmada"), anyString(), eq("/citas"));
    }

    @Test
    void filtraPorFechaYFallaParaCitaInexistente() {
        Cita cita = cita(); cita.setId(1L); cita.setStatus("PENDING");
        when(citas.findByAppointmentDate(LocalDate.of(2026, 11, 15))).thenReturn(List.of(cita));
        assertEquals(1, service().obtenerPorFecha(LocalDate.of(2026, 11, 15)).size());

        when(citas.findById(77L)).thenReturn(Optional.empty());
        assertEquals("Cita no encontrada", assertThrows(RuntimeException.class, () -> service().obtenerPorId(77L)).getMessage());
    }

    @Test
    void actualizaUnaCitaPendiente() {
        Vehiculo vehicle = Vehiculo.builder().id(7L).plate("ABC-123").brand("Honda").model("Civic").build();
        Cita cita = cita();
        cita.setId(18L);
        cita.setStatus("PENDING");
        cita.setVehicle(vehicle);
        when(citas.findById(18L)).thenReturn(Optional.of(cita));
        when(citas.save(cita)).thenReturn(cita);

        Cita cambios = Cita.builder()
                .appointmentDate(LocalDate.of(2026, 11, 20))
                .appointmentTime(LocalTime.of(15, 45))
                .requestedService("Alineación y balanceo")
                .observations("Revisar también la suspensión")
                .build();

        Map<String, Object> result = service().actualizarCita(18L, cambios);

        assertEquals(LocalDate.of(2026, 11, 20), cita.getAppointmentDate());
        assertEquals(LocalTime.of(15, 45), cita.getAppointmentTime());
        assertEquals("Alineación y balanceo", cita.getRequestedService());
        assertEquals("2026-11-20", result.get("appointmentDate"));
        verify(auditoria).registrar(eq("UPDATE"), eq("CITA"), eq(18L), contains("ABC-123"));
    }

    @Test
    void noActualizaUnaCitaQueYaNoEstaPendiente() {
        Cita cita = cita();
        cita.setId(18L);
        cita.setStatus("CONFIRMED");
        when(citas.findById(18L)).thenReturn(Optional.of(cita));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service().actualizarCita(18L, cita()));

        assertEquals("Solo se pueden editar citas pendientes", error.getMessage());
        verify(citas, never()).save(any());
    }

    @Test
    void eliminaUnaCitaPendiente() {
        Cita cita = cita();
        cita.setId(21L);
        cita.setStatus("PENDING");
        when(citas.findById(21L)).thenReturn(Optional.of(cita));

        service().eliminarCita(21L);

        verify(citas).delete(cita);
        verify(citas).flush();
        verify(auditoria).registrar(eq("DELETE"), eq("CITA"), eq(21L), contains("eliminada"));
    }

    @Test
    void noEliminaUnaCitaCompletada() {
        Cita cita = cita();
        cita.setId(22L);
        cita.setStatus("COMPLETED");
        when(citas.findById(22L)).thenReturn(Optional.of(cita));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service().eliminarCita(22L));

        assertEquals("Solo se pueden eliminar citas pendientes", error.getMessage());
        verify(citas, never()).delete(any(Cita.class));
    }

    private Cita cita() {
        return Cita.builder().appointmentDate(LocalDate.of(2026, 11, 15)).appointmentTime(LocalTime.of(9, 30))
                .requestedService("Mantenimiento").priority("NORMAL").observations("Primera visita").build();
    }
}
