package com.sigtm.backend.repository;

/**
 * Crea de forma idempotente el contador de un comprobante.
 *
 * <p>El SQL de UPSERT difiere entre MySQL y PostgreSQL. Esta interfaz evita
 * que el servicio de facturación dependa de un dialecto concreto.</p>
 */
public interface CorrelativoComprobanteInitializer {

    /** Crea el contador si todavía no existe. */
    void crearSiNoExiste(String tipo, String serie, int anio);
}
