package com.sigtm.backend.repository;

import com.sigtm.backend.model.Cita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Acceso a datos de las citas de la agenda del taller.
 *
 * <p>Soporta los filtros de la agenda por fecha, así como la consulta del historial de citas
 * de un cliente o de un vehículo concreto.</p>
 */
@Repository
public interface CitaRepository extends JpaRepository<Cita, Long>, JpaSpecificationExecutor<Cita> {
    /**
     * Busca las citas programadas para una fecha concreta.
     *
     * @param date fecha de la cita.
     * @return citas agendadas en la fecha indicada.
     */
    List<Cita> findByAppointmentDate(LocalDate date);

    /**
     * Busca las citas de un cliente.
     *
     * @param customerId identificador del cliente.
     * @return citas asociadas al cliente.
     */
    List<Cita> findByCustomerId(Long customerId);

    /**
     * Busca las citas de un vehículo.
     *
     * @param vehicleId identificador del vehículo.
     * @return citas asociadas al vehículo.
     */
    List<Cita> findByVehicleId(Long vehicleId);

    long countByStatus(String status);

    long countByStatusIn(List<String> statuses);

    long countByStatusNotIn(List<String> statuses);
}
