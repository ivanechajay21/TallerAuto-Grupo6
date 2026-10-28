package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Cantidad realmente recibida de una línea de compra. */
@Entity
@Table(name = "detalles_recepcion_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DetalleRecepcionCompra {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "recepcion_id", nullable = false)
    @JsonIgnore private RecepcionCompra receipt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "detalle_orden_compra_id", nullable = false)
    @JsonIgnore private DetalleOrdenCompra purchaseItem;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "producto_id", nullable = false)
    private Producto product;
    @Column(name = "cantidad", nullable = false)
    private Integer quantity;
    @Column(name = "costo_unitario", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;
}
