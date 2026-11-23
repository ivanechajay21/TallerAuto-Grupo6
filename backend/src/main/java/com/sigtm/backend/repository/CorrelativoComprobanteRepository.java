package com.sigtm.backend.repository;

import com.sigtm.backend.model.CorrelativoComprobante;
import com.sigtm.backend.model.TipoComprobante;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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
