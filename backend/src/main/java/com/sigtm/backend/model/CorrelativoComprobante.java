package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Contador de correlativos por tipo de comprobante, serie y año.
 *
 * <p>La fila se bloquea con {@code SELECT ... FOR UPDATE} durante la emisión,
 * de modo que dos facturas concurrentes no reciban el mismo número. La tabla
 * se crea automáticamente con el esquema de Hibernate.</p>
 */
@Entity
@Table(name = "correlativos_comprobante",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_correlativo_tipo_serie_anio",
                columnNames = {"tipo_comprobante", "serie", "anio"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorrelativoComprobante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_comprobante", nullable = false, length = 20)
    private TipoComprobante tipoComprobante;

    @Column(name = "serie", nullable = false, length = 4)
    private String serie;

    @Column(name = "anio", nullable = false)
    private Integer anio;

    @Column(name = "ultimo", nullable = false)
    private Long ultimo;
}
