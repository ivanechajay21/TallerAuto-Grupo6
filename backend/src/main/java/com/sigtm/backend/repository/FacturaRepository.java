package com.sigtm.backend.repository;

import com.sigtm.backend.model.Factura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Acceso a datos de las facturas emitidas por el taller.
 *
 * <p>
 * Permite localizar una factura por su número, por la orden de trabajo que la
 * originó
 * o por su estado de cobro.
 * </p>
 */
@Repository
public interface FacturaRepository extends JpaRepository<Factura, Long> {
    /**
     * Busca una factura por su número.
     *
     * @param invoiceNumber número de factura o boleta emitida.
     * @return la factura encontrada o vacía si el número no existe.
     */
    Optional<Factura> findByInvoiceNumber(String invoiceNumber);

    /**
     * Busca la factura emitida para una orden de trabajo.
     *
     * @param workOrderId identificador de la orden de trabajo.
     * @return la factura de la orden o vacía si la orden todavía no fue facturada.
     */
    Optional<Factura> findByWorkOrderId(Long workOrderId);

    /**
     * Lista las facturas que se encuentran en un estado determinado.
     *
     * @param status estado de la factura, por ejemplo PENDING, PAID o CANCELLED.
     * @return facturas con el estado indicado.
     */
    List<Factura> findByStatus(String status);
}
