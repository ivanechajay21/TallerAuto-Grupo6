package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Precio y condiciones ofertadas por un proveedor para un producto. */
@Entity
@Table(name = "precios_proveedor", uniqueConstraints = @UniqueConstraint(columnNames = {"proveedor_id", "producto_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PrecioProveedor extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "proveedor_id", nullable = false)
    private Proveedor supplier;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "producto_id", nullable = false)
    private Producto product;
    @DecimalMin("0.01") @Column(name = "precio_unitario", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;
    @Min(1) @Column(name = "cantidad_minima", nullable = false)
    private Integer minimumQuantity;
    @Min(0) @Column(name = "plazo_dias", nullable = false)
    private Integer leadTimeDays;
    @Column(name = "vigente_desde", nullable = false)
    private LocalDate validFrom;
    private LocalDate validUntil;
    @Builder.Default @Column(name = "activo", nullable = false)
    private Boolean active = true;
}
