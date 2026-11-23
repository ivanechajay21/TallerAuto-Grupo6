package com.sigtm.backend.repository;

import com.sigtm.backend.model.ItemOrdenTrabajo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

/**
 * Acceso a datos de los ítems de una orden de trabajo: servicios, repuestos y mano de obra.
 *
 * <p>Permite obtener el detalle completo de una orden y las tareas asignadas a un mecánico,
 * tanto en general como filtradas por estado.</p>
 */
@Repository
public interface ItemOrdenTrabajoRepository extends JpaRepository<ItemOrdenTrabajo, Long> {
    /**
     * Lista los ítems de una orden de trabajo.
     *
     * @param workOrderId identificador de la orden de trabajo.
     * @return ítems de la orden: servicios, repuestos y mano de obra.
     */
    List<ItemOrdenTrabajo> findByWorkOrderId(Long workOrderId);

    /**
     * Lista las tareas asignadas a un mecánico.
     *
     * @param mechanicId identificador del mecánico.
     * @return ítems asignados al mecánico.
     */
    List<ItemOrdenTrabajo> findByMechanicId(Long mechanicId);

    /**
     * Lista las tareas asignadas a un mecánico que se encuentran en un estado determinado.
     *
     * @param mechanicId identificador del mecánico.
     * @param status     estado del ítem, por ejemplo PENDING, IN_PROGRESS o COMPLETED.
     * @return ítems del mecánico con el estado indicado.
     */
    List<ItemOrdenTrabajo> findByMechanicIdAndStatus(Long mechanicId, String status);

    /**
     * Comprueba si una orden tiene al menos un trabajo asignado a un mecánico.
     *
     * <p>Se usa para autorizar la consulta de una orden cuando el usuario solo
     * dispone del permiso {@code MI_TRABAJO:VER} y no del permiso global
     * {@code ORDENES:VER}.</p>
     *
     * @param workOrderId identificador de la orden
     * @param mechanicId  identificador del mecánico
     * @return {@code true} si existe una asignación del mecánico en la orden
     */
    boolean existsByWorkOrderIdAndMechanicId(Long workOrderId, Long mechanicId);

    /**
     * Suma el valor estimado de los ítems de órdenes que siguen activas.
     *
     * @return valor total de las órdenes no finalizadas, o cero si no hay ítems.
     */
    @Query("""
            select coalesce(sum(i.price * i.quantity), 0)
            from ItemOrdenTrabajo i
            where i.workOrder.status <> 'FINALIZADO'
            """)
    BigDecimal sumarValorActivo();
}
