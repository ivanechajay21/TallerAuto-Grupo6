package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Línea de producto solicitada en una orden de compra. */
@Entity
@Table(name = "detalles_orden_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DetalleOrdenCompra {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "orden_compra_id", nullable = false)
    @JsonIgnore private OrdenCompra purchaseOrder;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "producto_id", nullable = false)
    private Producto product;
    @Column(name = "cantidad_solicitada", nullable = false)
    private Integer requestedQuantity;
    @Builder.Default @Column(name = "cantidad_recibida", nullable = false)
    private Integer receivedQuantity = 0;
    @Builder.Default @Column(name = "cantidad_devuelta", nullable = false)
    private Integer returnedQuantity = 0;
    @Column(name = "costo_unitario", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitCost;
}
