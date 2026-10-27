package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Evento auditable de una orden de compra durante todo su ciclo de vida. */
@Entity
@Table(name = "historial_orden_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HistorialOrdenCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "orden_compra_id", nullable = false) @JsonIgnore private OrdenCompra purchaseOrder;
    @Column(nullable = false, length = 40) private String eventType;
    @Column(name = "estado_anterior", length = 20) private String previousStatus;
    @Column(name = "estado_nuevo", length = 20) private String newStatus;
    @Column(nullable = false) private LocalDateTime occurredAt;
    @Column(length = 500) private String details;
}
