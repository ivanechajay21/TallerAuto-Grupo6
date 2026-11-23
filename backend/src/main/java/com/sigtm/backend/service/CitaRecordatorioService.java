package com.sigtm.backend.service;

import com.sigtm.backend.model.Cita;
import com.sigtm.backend.repository.CitaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

/**
 * Envía el recordatorio interno de las citas programadas para el día siguiente.
 *
 * <p>La tarea respeta la bandera {@code notifRecordatorio} de Configuración. Se ejecuta
 * una vez al día; si el SMTP o las notificaciones están deshabilitados, el servicio de
 * notificaciones simplemente no crea registros.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CitaRecordatorioService {

    private final CitaRepository citaRepository;
    private final NotificacionService notificacionService;

    /**
     * Recorre las citas de mañana y notifica a recepción, gerencia y administración.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void enviarRecordatorios() {
        LocalDate manana = LocalDate.now().plusDays(1);
        List<Cita> citas = citaRepository.findByAppointmentDate(manana);
        for (Cita cita : citas) {
            if (!List.of("PENDING", "CONFIRMED").contains(cita.getStatus())) {
                continue;
            }
            String cliente = cita.getCustomer() == null
                    ? "cliente"
                    : cita.getCustomer().getFirstName() + " " + cita.getCustomer().getLastName();
            String vehiculo = cita.getVehicle() == null ? "—" : cita.getVehicle().getPlate();
            notificacionService.notificarRol(
                    List.of("ROLE_RECEPTIONIST", "ROLE_ADMIN", "ROLE_MANAGER"),
                    "CITAS",
                    "Recordatorio de cita",
                    "Mañana " + cita.getAppointmentTime() + " está agendada la cita de "
                            + cliente + " para el vehículo " + vehiculo + ".",
                    "/citas");
        }
        if (!citas.isEmpty()) {
            log.info("Recordatorios de citas procesados para {} cita(s) de {}", citas.size(), manana);
        }
    }
}
