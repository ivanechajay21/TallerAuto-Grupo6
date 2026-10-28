package com.sigtm.backend.controller;

import com.sigtm.backend.model.Cita;
import com.sigtm.backend.service.CitaService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Endpoints de la agenda de citas del taller.
 *
 * <p>Cada operación exige el permiso del módulo {@code CITAS} correspondiente a
 * su acción ({@code CITAS:VER}, {@code CITAS:CREAR} y
 * {@code CITAS:CAMBIAR_ESTADO}), administrados desde Roles y Permisos. Todas las
 * respuestas usan mapas con los datos del cliente y del vehículo resumidos.</p>
 */
@RestController
@RequestMapping("/api/citas")
@RequiredArgsConstructor
public class CitaController {

    private final CitaService citaService;

    // Acceso por permiso del módulo CITAS (administrado desde Roles y Permisos).
    /**
     * Lista todas las citas registradas.
     *
     * <p>Exige {@code CITAS:VER}. Cada cita incluye el cliente y el vehículo
     * asociados, de modo que la agenda se resuelve con una sola llamada.</p>
     *
     * @return la lista de citas de la agenda (200)
     */
    @GetMapping
    @PreAuthorize("hasAuthority('CITAS:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerTodas() {
        return ResponseEntity.ok(citaService.obtenerTodas());
    }

    /**
     * Lista las citas programadas para una fecha concreta.
     *
     * <p>Exige {@code CITAS:VER}. La fecha debe llegar en formato ISO
     * ({@code yyyy-MM-dd}); un formato inválido produce 400 y una fecha sin citas
     * devuelve una lista vacía, no un error.</p>
     *
     * @param date fecha de la cita en formato ISO
     * @return la lista de citas de ese día (200)
     */
    @GetMapping("/fecha/{date}")
    @PreAuthorize("hasAuthority('CITAS:VER')")
    public ResponseEntity<List<Map<String, Object>>> obtenerPorFecha(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(citaService.obtenerPorFecha(date));
    }

    /**
     * Devuelve el detalle de una cita.
     *
     * <p>Exige {@code CITAS:VER}. Si el identificador no corresponde a ninguna
     * cita se devuelve 404.</p>
     *
     * @param id identificador de la cita
     * @return el mapa con los datos de la cita, su cliente y su vehículo (200)
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CITAS:VER')")
    public ResponseEntity<Map<String, Object>> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(citaService.obtenerPorId(id));
    }

    /**
     * Registra una cita para el vehículo indicado de un cliente.
     *
     * <p>Exige {@code CITAS:CREAR}. El cliente y el vehículo deben existir; la cita
     * nace siempre en estado {@code PENDING} y el inicio de sesión se audita
     * automáticamente.</p>
     *
     * @param customerId identificador del cliente que solicita el servicio
     * @param vehicleId  identificador del vehículo a atender
     * @param cita       datos de la cita (fecha, hora, servicio solicitado, prioridad y observaciones)
     * @return el mapa con la cita creada ya enlazada a cliente y vehículo (200)
     */
    @PostMapping("/cliente/{customerId}/vehiculo/{vehicleId}")
    @PreAuthorize("hasAuthority('CITAS:CREAR')")
    public ResponseEntity<Map<String, Object>> crearCita(
            @PathVariable Long customerId,
            @PathVariable Long vehicleId,
            @RequestBody Cita cita) {
        return ResponseEntity.ok(citaService.crearCita(customerId, vehicleId, cita));
    }

    /**
     * Cambia el estado de una cita.
     *
     * <p>Exige {@code CITAS:CAMBIAR_ESTADO}. El estado viaja como parámetro
     * {@code status} y se guarda tal cual, sin validación de la tabla de estados;
     * el paso de estado queda registrado en la auditoría.</p>
     *
     * @param id     identificador de la cita
     * @param status nuevo estado de la cita
     * @return el mapa con la cita ya actualizada (200)
     */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('CITAS:CAMBIAR_ESTADO')")
    public ResponseEntity<Map<String, Object>> actualizarEstado(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(citaService.actualizarEstado(id, status));
    }
}
