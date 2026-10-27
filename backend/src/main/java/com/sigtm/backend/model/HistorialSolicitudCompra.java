package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/** Registro inmutable de cada cambio de estado de una solicitud interna. */
@Entity
@Table(name = "historial_solicitud_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HistorialSolicitudCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "solicitud_id", nullable = false) @JsonIgnore
    private SolicitudCompra request;
    @Column(name = "estado_anterior", length = 20) private String previousStatus;
    @Column(name = "estado_nuevo", nullable = false, length = 20) private String newStatus;
    @Column(nullable = false) private LocalDateTime changedAt;
    @Column(length = 500) private String comment;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "usuario_id") @JsonIgnore
    private Usuario changedBy;
}
