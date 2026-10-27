package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Solicitud de compra de productos a un proveedor. */
@Entity
@Table(name = "ordenes_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrdenCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "codigo", nullable = false, unique = true, length = 40)
    private String code;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "proveedor_id", nullable = false)
    private Proveedor supplier;
    @Column(name = "estado", nullable = false, length = 20)
    private String status;
    @Column(name = "fecha_emision", nullable = false)
    private LocalDate issueDate;
    @Column(name = "fecha_esperada")
    private LocalDate expectedDate;
    @Column(name = "observaciones", length = 500)
    private String notes;
    @Column(name = "total", nullable = false, precision = 12, scale = 2)
    private BigDecimal total;
    @Builder.Default
    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetalleOrdenCompra> items = new ArrayList<>();
}
