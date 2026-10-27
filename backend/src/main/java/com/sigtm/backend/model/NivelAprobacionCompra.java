package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.*;
import java.math.BigDecimal;

/** Regla que exige un nivel de aprobación de acuerdo con el monto de compra. */
@Entity
@Table(name = "niveles_aprobacion_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NivelAprobacionCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true) private Integer level;
    @DecimalMin("0.0") @Column(name = "monto_desde", nullable = false, precision = 12, scale = 2) private BigDecimal amountFrom;
    @DecimalMin("0.0") @Column(name = "monto_hasta", precision = 12, scale = 2) private BigDecimal amountTo;
    @Column(nullable = false, length = 50) private String requiredRole;
    @Min(1) @Column(nullable = false) private Integer requiredApprovals;
    @Builder.Default @Column(nullable = false) private Boolean active = true;
}
