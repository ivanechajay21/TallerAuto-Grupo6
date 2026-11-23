package com.sigtm.backend.repository;

import com.sigtm.backend.model.CorrelativoComprobante;
import com.sigtm.backend.model.TipoComprobante;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Acceso al contador de correlativos de comprobantes.
 */
@Repository
public interface CorrelativoComprobanteRepository extends JpaRepository<CorrelativoComprobante, Long> {

    /**
     * Crea la fila del contador si todavía no existe. El {@code ON DUPLICATE KEY}
     * hace que la operación sea idempotente y que la fila quede bloqueada para
     * las demás transacciones mientras se asigna el número.
     *
     * @param tipo  nombre del tipo de comprobante
     * @param serie serie del comprobante
     * @param anio  año de emisión
     */
    @Modifying
    @Query(value = "INSERT INTO correlativos_comprobante (tipo_comprobante, serie, anio, ultimo) "
            + "VALUES (:tipo, :serie, :anio, 0) "
            + "ON DUPLICATE KEY UPDATE ultimo = ultimo", nativeQuery = true)
    void crearSiNoExiste(@Param("tipo") String tipo,
                         @Param("serie") String serie,
                         @Param("anio") Integer anio);

    /**
     * Recupera y bloquea la fila del contador para asignar el siguiente número.
     *
     * @param tipo  tipo de comprobante
     * @param serie serie del comprobante
     * @param anio  año de emisión
     * @return el contador bloqueado, si existe
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from CorrelativoComprobante c "
            + "where c.tipoComprobante = :tipo and c.serie = :serie and c.anio = :anio")
    Optional<CorrelativoComprobante> buscarParaActualizar(@Param("tipo") TipoComprobante tipo,
                                                          @Param("serie") String serie,
                                                          @Param("anio") Integer anio);
}
