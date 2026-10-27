package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/** Registro de una recepción parcial o total de una orden de compra. */
@Entity
@Table(name = "recepciones_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecepcionCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "numero", nullable = false, unique = true, length = 40)
    private String receiptNumber;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "orden_compra_id", nullable = false)
    @JsonIgnore private OrdenCompra purchaseOrder;
    @Column(name = "fecha_recepcion", nullable = false)
    private LocalDateTime receivedAt;
    @Column(name = "observaciones", length = 500)
    private String notes;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "recibido_por_id", nullable = false)
    @JsonIgnore private Usuario receivedBy;
    @Builder.Default
    @OneToMany(mappedBy = "receipt", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetalleRecepcionCompra> items = new ArrayList<>();
}
