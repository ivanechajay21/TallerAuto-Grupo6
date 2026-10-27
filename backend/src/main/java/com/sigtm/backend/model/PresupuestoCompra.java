package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import lombok.*;
import java.math.BigDecimal;
import java.time.YearMonth;

/** Límite mensual planificado para compras de repuestos e insumos. */
@Entity
@Table(name = "presupuestos_compra", uniqueConstraints = @UniqueConstraint(columnNames = "periodo"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PresupuestoCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "periodo", nullable = false, unique = true, length = 7) private String period;
    @DecimalMin("0.01") @Column(name = "limite", nullable = false, precision = 12, scale = 2) private BigDecimal limitAmount;
    @Column(name = "alerta_porcentaje", nullable = false) private Integer alertPercentage;
    @Builder.Default @Column(nullable = false) private Boolean active = true;
    public YearMonth yearMonth() { return YearMonth.parse(period); }
}
