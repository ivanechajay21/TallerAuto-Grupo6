package com.sigtm.backend.repository;

import com.sigtm.backend.model.OrdenTrabajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de las órdenes de trabajo del taller.
 *
 * <p>Ofrece los filtros de búsqueda del tablero de órdenes: por número de orden, por cliente,
 * por vehículo y por estado de avance.</p>
 */
@Repository
public interface OrdenTrabajoRepository extends JpaRepository<OrdenTrabajo, Long>, JpaSpecificationExecutor<OrdenTrabajo> {
    /**
     * Busca una orden de trabajo por su número.
     *
     * @param orderNumber número de la orden de trabajo.
     * @return la orden encontrada o vacía si el número no existe.
     */
    Optional<OrdenTrabajo> findByOrderNumber(String orderNumber);

    /**
     * Lista las órdenes de trabajo de un cliente.
     *
     * @param customerId identificador del cliente.
     * @return órdenes asociadas al cliente.
     */
    List<OrdenTrabajo> findByCustomerId(Long customerId);

    /**
     * Lista las órdenes de trabajo de un vehículo.
     *
     * @param vehicleId identificador del vehículo.
     * @return órdenes asociadas al vehículo.
     */
    List<OrdenTrabajo> findByVehicleId(Long vehicleId);

    /**
     * Lista las órdenes de trabajo que se encuentran en un estado determinado.
     *
     * @param status estado de la orden, por ejemplo PENDING, IN_PROGRESS o COMPLETED.
     * @return órdenes con el estado indicado.
     */
    List<OrdenTrabajo> findByStatus(String status);

    long countByStatus(String status);

    long countByStatusNot(String status);

    long countByStatusNotAndPriorityIgnoreCase(String status, String priority);
}
