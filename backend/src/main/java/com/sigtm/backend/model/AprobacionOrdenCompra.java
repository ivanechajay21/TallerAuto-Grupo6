package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Decisión de un aprobador sobre una orden de compra. */
@Entity
@Table(name = "aprobaciones_orden_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AprobacionOrdenCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "orden_compra_id", nullable = false) @JsonIgnore private OrdenCompra purchaseOrder;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "nivel_id", nullable = false) private NivelAprobacionCompra level;
    @Column(nullable = false, length = 20) private String decision;
    @Column(nullable = false) private LocalDateTime decidedAt;
    @Column(length = 500) private String comment;
}
