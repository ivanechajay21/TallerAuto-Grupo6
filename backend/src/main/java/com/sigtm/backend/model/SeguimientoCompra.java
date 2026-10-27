package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

/** Seguimiento logístico de una orden emitida al proveedor. */
@Entity
@Table(name = "seguimientos_compra", uniqueConstraints = @UniqueConstraint(columnNames = "orden_compra_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SeguimientoCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "orden_compra_id", nullable = false) private OrdenCompra purchaseOrder;
    @Column(nullable = false, length = 20) private String status;
    private LocalDate dispatchedAt;
    private LocalDate estimatedArrival;
    private LocalDate actualArrival;
    @Column(length = 80) private String shippingGuide;
    @Column(length = 100) private String carrier;
    @Column(length = 500) private String notes;
}
