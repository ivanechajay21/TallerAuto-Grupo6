package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Incidencia operativa asociada a un proveedor, orden o recepción. */
@Entity
@Table(name = "incidencias_proveedor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IncidenciaProveedor extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "proveedor_id", nullable = false) private Proveedor supplier;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "orden_compra_id") private OrdenCompra purchaseOrder;
    @Column(nullable = false, length = 30) private String category;
    @Column(nullable = false, length = 20) private String priority;
    @Column(nullable = false, length = 20) private String status;
    @Column(nullable = false, length = 500) private String description;
    @Column(nullable = false) private LocalDateTime reportedAt;
    private LocalDateTime resolvedAt;
    @Column(length = 500) private String resolution;
}
