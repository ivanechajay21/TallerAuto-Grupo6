package com.sigtm.backend.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Implementación del UPSERT de correlativos para PostgreSQL. */
@Repository
@Profile("postgres")
@RequiredArgsConstructor
public class PostgresCorrelativoComprobanteInitializer implements CorrelativoComprobanteInitializer {

    private static final String SQL = """
            INSERT INTO correlativos_comprobante (tipo_comprobante, serie, anio, ultimo)
            VALUES (?, ?, ?, 0)
            ON CONFLICT (tipo_comprobante, serie, anio) DO NOTHING
            """;

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void crearSiNoExiste(String tipo, String serie, int anio) {
        jdbcTemplate.update(SQL, tipo, serie, anio);
    }
}
