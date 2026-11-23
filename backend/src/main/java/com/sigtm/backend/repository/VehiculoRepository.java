package com.sigtm.backend.repository;

import com.sigtm.backend.model.Vehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de los vehículos registrados en el taller.
 *
 * <p>La placa y el número de chasis localizan un vehículo concreto, mientras que el cliente
 * permite recuperar su flota de vehículos.</p>
 */
@Repository
public interface VehiculoRepository extends JpaRepository<Vehiculo, Long>, JpaSpecificationExecutor<Vehiculo> {
    /**
     * Busca un vehículo por su placa.
     *
     * @param plate placa o patente del vehículo.
     * @return el vehículo encontrado o vacío si la placa no está registrada.
     */
    Optional<Vehiculo> findByPlate(String plate);

    /**
     * Busca un vehículo por su número de chasis.
     *
     * @param vin número de chasis (VIN) del vehículo.
     * @return el vehículo encontrado o vacío si el chasis no está registrado.
     */
    Optional<Vehiculo> findByVin(String vin);

    /**
     * Lista los vehículos de un cliente.
     *
     * @param customerId identificador del cliente.
     * @return vehículos asociados al cliente.
     */
    List<Vehiculo> findByCustomerId(Long customerId);

    long countByActiveTrue();

    long countByActiveFalse();

    long countByCurrentMileageGreaterThan(Integer mileage);
}
