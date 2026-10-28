package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.*;

/**
 * Parámetros de abastecimiento de un producto.
 * Define cuándo sugerir una compra, el proveedor preferido y la cantidad objetivo.
 */
@Entity
@Table(name = "politicas_reposicion", uniqueConstraints = @UniqueConstraint(columnNames = "producto_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PoliticaReposicion extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "producto_id", nullable = false)
    private Producto product;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "proveedor_preferido_id")
    private Proveedor preferredSupplier;
    @Min(0) @Column(name = "punto_reorden", nullable = false)
    private Integer reorderPoint;
    @Min(1) @Column(name = "lote_minimo", nullable = false)
    private Integer minimumLot;
    @Min(1) @Column(name = "stock_objetivo", nullable = false)
    private Integer targetStock;
    @Min(0) @Column(name = "plazo_entrega_dias", nullable = false)
    private Integer leadTimeDays;
    @Builder.Default @Column(name = "activa", nullable = false)
    private Boolean active = true;
}
