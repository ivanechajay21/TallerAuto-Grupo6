package com.sigtm.backend.service;

import com.sigtm.backend.model.Cita;
import com.sigtm.backend.model.Cliente;
import com.sigtm.backend.model.Vehiculo;
import com.sigtm.backend.repository.CitaRepository;
import com.sigtm.backend.repository.ClienteRepository;
import com.sigtm.backend.repository.VehiculoRepository;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Administra las citas de los clientes para sus vehículos, desde el registro inicial
 * hasta los cambios de estado.
 *
 * <p>Las citas nacen siempre en estado {@code PENDING} y toda creación o cambio de
 * estado queda registrado en la auditoría.</p>
 */
@Service
@RequiredArgsConstructor
public class CitaService {

    private final CitaRepository citaRepository;
    private final ClienteRepository clienteRepository;
    private final VehiculoRepository vehiculoRepository;
    private final AuditoriaService auditoriaService;
    private final NotificacionService notificacionService;

    /**
     * Lista todas las citas registradas en el sistema.
     *
     * <p>Cada cita se devuelve en formato {@code Map} con los datos del cliente y del
     * vehículo resumidos.</p>
     *
     * @return la lista completa de citas
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerTodas() {
        return citaRepository.findAll().stream().map(this::aMapa).toList();
    }

    /**
     * Busca citas con pestaña, búsqueda, filtro de estado, paginación y resumen.
     *
     * @param page   página solicitada, empezando en cero
     * @param size   tamaño de página; se limita a 100
     * @param tab    {@code proximas} o {@code historial}
     * @param search texto libre opcional
     * @param status estado exacto o {@code TODAS}
     * @return página de citas y resumen de la agenda
     */
    @Transactional(readOnly = true)
    public Map<String, Object> buscarPaginado(
            int page,
            int size,
            String tab,
            String search,
            String status
    ) {
        int pageIndex = Math.max(0, page);
        int pageSize = Math.min(100, Math.max(1, size));
        String pestaña = "historial".equalsIgnoreCase(tab) ? "historial" : "proximas";
        String texto = search == null ? null : search.trim().toLowerCase(Locale.ROOT);
        String estado = status == null ? "TODAS" : status.trim().toUpperCase(Locale.ROOT);
        List<String> activas = List.of("PENDING", "CONFIRMED", "IN_PROCESS");

        Specification<Cita> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add("historial".equals(pestaña)
                    ? cb.not(root.get("status").in(activas))
                    : root.get("status").in(activas));

            if (!"TODAS".equals(estado)) {
                predicates.add(cb.equal(root.get("status"), estado));
            }
            if (texto != null && !texto.isBlank()) {
                Join<Cita, Cliente> cliente = root.join("customer", JoinType.LEFT);
                Join<Cita, Vehiculo> vehiculo = root.join("vehicle", JoinType.LEFT);
                String like = "%" + texto + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("requestedService")), like),
                        cb.like(cb.lower(cliente.get("firstName")), like),
                        cb.like(cb.lower(cliente.get("lastName")), like),
                        cb.like(cb.lower(cliente.get("documentNumber")), like),
                        cb.like(cb.lower(vehiculo.get("plate")), like),
                        cb.like(cb.lower(vehiculo.get("brand")), like),
                        cb.like(cb.lower(vehiculo.get("model")), like)
                ));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };

        Sort orden = "historial".equals(pestaña)
                ? Sort.by(Sort.Direction.DESC, "appointmentDate")
                    .and(Sort.by(Sort.Direction.DESC, "appointmentTime"))
                : Sort.by(Sort.Direction.ASC, "appointmentDate")
                    .and(Sort.by(Sort.Direction.ASC, "appointmentTime"));

        Page<Cita> resultado = citaRepository.findAll(spec, PageRequest.of(pageIndex, pageSize, orden));

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("content", resultado.getContent().stream().map(this::aMapa).toList());
        respuesta.put("page", resultado.getNumber() + 1);
        respuesta.put("size", resultado.getSize());
        respuesta.put("totalElements", resultado.getTotalElements());
        respuesta.put("totalPages", resultado.getTotalPages());
        respuesta.put("summary", resumenCitas(activas));
        return respuesta;
    }

    private Map<String, Object> resumenCitas(List<String> activas) {
        Map<String, Object> resumen = new LinkedHashMap<>();
        resumen.put("upcoming", citaRepository.countByStatusIn(activas));
        resumen.put("confirmed", citaRepository.countByStatus("CONFIRMED"));
        resumen.put("inProcess", citaRepository.countByStatus("IN_PROCESS"));
        resumen.put("completed", citaRepository.countByStatus("COMPLETED"));
        resumen.put("history", citaRepository.countByStatusNotIn(activas));
        return resumen;
    }

    /**
     * Obtiene una cita por su identificador.
     *
     * <p>Si la cita no existe se lanza {@code RuntimeException} con el mensaje
     * «Cita no encontrada».</p>
     *
     * @param id identificador de la cita
     * @return la cita solicitada en formato {@code Map}
     */
    @Transactional(readOnly = true)
    public Map<String, Object> obtenerPorId(Long id) {
        return aMapa(citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada")));
    }

    /**
     * Lista las citas programadas para una fecha concreta.
     *
     * <p>Cada cita se devuelve en formato {@code Map} con los datos del cliente y del
     * vehículo resumidos.</p>
     *
     * @param date fecha de la cita
     * @return las citas de esa fecha
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> obtenerPorFecha(LocalDate date) {
        return citaRepository.findByAppointmentDate(date).stream().map(this::aMapa).toList();
    }

    /**
     * Registra una nueva cita para un cliente y su vehículo.
     *
     * <p>La cita nace siempre en estado {@code PENDING}. Si el cliente o el vehículo no
     * existen se lanza {@code RuntimeException}. La creación queda registrada en la
     * auditoría con la acción {@code CREATE}.</p>
     *
     * @param customerId identificador del cliente
     * @param vehicleId  identificador del vehículo
     * @param cita       datos de la cita a registrar
     * @return la cita creada en formato {@code Map}
     */
    @Transactional
    public Map<String, Object> crearCita(Long customerId, Long vehicleId, Cita cita) {
        Cliente customer = clienteRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));
        Vehiculo vehicle = vehiculoRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehículo no encontrado"));

        cita.setCustomer(customer);
        cita.setVehicle(vehicle);
        cita.setStatus("PENDING");
        Cita guardada = citaRepository.save(cita);
        auditoriaService.registrar("CREATE", "CITA", guardada.getId(),
                "Registro de cita para el vehículo placa " + vehicle.getPlate()
                        + " el " + guardada.getAppointmentDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
        return aMapa(guardada);
    }

    /**
     * Cambia el estado de una cita.
     *
     * <p>Si la cita no existe se lanza {@code RuntimeException}. El cambio se registra
     * en la auditoría con la acción {@code STATUS} indicando el estado anterior y el
     * nuevo.</p>
     *
     * @param id     identificador de la cita
     * @param status nuevo estado de la cita
     * @return la cita actualizada en formato {@code Map}
     */
    @Transactional
    public Map<String, Object> actualizarEstado(Long id, String status) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));
        String anterior = cita.getStatus();
        cita.setStatus(status);
        Cita guardada = citaRepository.save(cita);
        if ("CONFIRMED".equalsIgnoreCase(status)) {
            String cliente = guardada.getCustomer() == null
                    ? "cliente"
                    : guardada.getCustomer().getFirstName() + " " + guardada.getCustomer().getLastName();
            notificacionService.notificarRol(
                    List.of("ROLE_RECEPTIONIST", "ROLE_ADMIN", "ROLE_MANAGER"),
                    "CITAS",
                    "Cita confirmada",
                    "La cita de " + cliente + " para el vehículo "
                            + (guardada.getVehicle() == null ? "—" : guardada.getVehicle().getPlate())
                            + " quedó confirmada.",
                    "/citas");
        }
        auditoriaService.registrar("STATUS", "CITA", guardada.getId(),
                "Cita pasó de " + anterior + " a " + status + " (vehículo " + guardada.getVehicle().getPlate() + ")");
        return aMapa(guardada);
    }

    /**
     * Actualiza la fecha, hora, servicio y observaciones de una cita pendiente.
     *
     * <p>Por seguridad solo se permiten cambios mientras la cita está en estado
     * {@code PENDING}; una cita confirmada, en proceso o cerrada debe gestionarse
     * desde su flujo de estado. El cambio queda auditado.</p>
     *
     * @param id    identificador de la cita
     * @param datos nuevos datos de la cita
     * @return la cita actualizada en formato {@code Map}
     */
    @Transactional
    public Map<String, Object> actualizarCita(Long id, Cita datos) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));
        if (!"PENDING".equalsIgnoreCase(cita.getStatus())) {
            throw new IllegalArgumentException("Solo se pueden editar citas pendientes");
        }
        if (datos.getAppointmentDate() == null || datos.getAppointmentTime() == null
                || datos.getRequestedService() == null || datos.getRequestedService().isBlank()) {
            throw new IllegalArgumentException("La fecha, la hora y el servicio son obligatorios");
        }

        cita.setAppointmentDate(datos.getAppointmentDate());
        cita.setAppointmentTime(datos.getAppointmentTime());
        cita.setRequestedService(datos.getRequestedService().trim());
        cita.setObservations(datos.getObservations() == null || datos.getObservations().isBlank()
                ? null : datos.getObservations().trim());
        if (datos.getPriority() != null && !datos.getPriority().isBlank()) {
            cita.setPriority(datos.getPriority().trim());
        }
        if (datos.getEstimatedDurationMinutes() != null) {
            cita.setEstimatedDurationMinutes(datos.getEstimatedDurationMinutes());
        }

        Cita guardada = citaRepository.save(cita);
        auditoriaService.registrar("UPDATE", "CITA", guardada.getId(),
                "Actualización de cita para el vehículo "
                        + (guardada.getVehicle() == null ? "sin vehículo" : guardada.getVehicle().getPlate()));
        return aMapa(guardada);
    }

    /**
     * Elimina una cita pendiente.
     *
     * <p>No se permite eliminar citas confirmadas, en proceso o cerradas. Si la
     * cita ya originó una orden de trabajo, la restricción de integridad impide
     * borrarla y se devuelve un mensaje funcional.</p>
     *
     * @param id identificador de la cita
     */
    @Transactional
    public void eliminarCita(Long id) {
        Cita cita = citaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada"));
        if (!"PENDING".equalsIgnoreCase(cita.getStatus())) {
            throw new IllegalArgumentException("Solo se pueden eliminar citas pendientes");
        }
        try {
            citaRepository.delete(cita);
            citaRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new IllegalStateException("No se puede eliminar una cita que ya tiene una orden de trabajo asociada");
        }
        auditoriaService.registrar("DELETE", "CITA", id, "Cita pendiente eliminada");
    }

    private Map<String, Object> aMapa(Cita a) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", a.getId());
        m.put("appointmentDate", a.getAppointmentDate().format(DateTimeFormatter.ISO_LOCAL_DATE));
        m.put("appointmentTime", a.getAppointmentTime().format(DateTimeFormatter.ISO_LOCAL_TIME).substring(0, 5));
        m.put("requestedService", a.getRequestedService());
        m.put("priority", a.getPriority());
        m.put("status", a.getStatus());
        m.put("observations", a.getObservations());

        if (a.getCustomer() != null) {
            Map<String, Object> c = new HashMap<>();
            c.put("id", a.getCustomer().getId());
            c.put("code", a.getCustomer().getCode());
            c.put("firstName", a.getCustomer().getFirstName());
            c.put("lastName", a.getCustomer().getLastName());
            c.put("documentNumber", a.getCustomer().getDocumentNumber());
            m.put("customer", c);
        }
        if (a.getVehicle() != null) {
            Map<String, Object> v = new HashMap<>();
            v.put("id", a.getVehicle().getId());
            v.put("plate", a.getVehicle().getPlate());
            v.put("brand", a.getVehicle().getBrand());
            v.put("model", a.getVehicle().getModel());
            m.put("vehicle", v);
        }
        return m;
    }
}
