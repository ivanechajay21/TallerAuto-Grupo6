package com.sigtm.backend.service;

import com.sigtm.backend.model.CorrelativoComprobante;
import com.sigtm.backend.model.TipoComprobante;
import com.sigtm.backend.repository.CorrelativoComprobanteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Asigna correlativos secuenciales por tipo de comprobante, serie y año.
 *
 * <p>La asignación se ejecuta en una transacción independiente para que el
 * bloqueo de la fila se libere inmediatamente después de reservar el número.
 * Si la emisión posterior falla, puede quedar un hueco en la numeración, lo
 * cual es preferible a entregar dos comprobantes con el mismo número.</p>
 */
@Service
@RequiredArgsConstructor
public class CorrelativoComprobanteService {

    private final CorrelativoComprobanteRepository repository;

    /**
     * Reserva y devuelve el siguiente correlativo del tipo y año indicados.
     *
     * @param tipo tipo de comprobante
     * @param anio año de emisión
     * @return el siguiente número correlativo, empezando en 1
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public long siguiente(TipoComprobante tipo, int anio) {
        repository.crearSiNoExiste(tipo.name(), tipo.getSerie(), anio);

        CorrelativoComprobante contador = repository.buscarParaActualizar(tipo, tipo.getSerie(), anio)
                .orElseThrow(() -> new IllegalStateException("No se pudo obtener el correlativo del comprobante"));

        contador.setUltimo(contador.getUltimo() + 1);
        repository.saveAndFlush(contador);
        return contador.getUltimo();
    }
}
