package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

/** Condiciones comerciales acordadas con un proveedor. */
@Entity
@Table(name = "contratos_proveedor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContratoProveedor extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String code;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "proveedor_id", nullable = false) private Proveedor supplier;
    @Column(nullable = false) private LocalDate startsAt;
    @Column(nullable = false) private LocalDate endsAt;
    @Column(nullable = false, length = 10) private String currency;
    @DecimalMin("0.0") @Column(name = "descuento_porcentaje", nullable = false, precision = 5, scale = 2) private BigDecimal discountPercentage;
    @Min(0) @Column(name = "dias_pago", nullable = false) private Integer paymentDays;
    @DecimalMin("0.0") @Column(name = "compra_minima", nullable = false, precision = 12, scale = 2) private BigDecimal minimumPurchase;
    @Column(length = 1000) private String terms;
    @Builder.Default @Column(nullable = false) private Boolean active = true;
}
