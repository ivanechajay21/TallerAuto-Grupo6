package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.*;

/** Agrupa las necesidades planificadas antes de transformarlas en una solicitud de compra. */
@Entity
@Table(name = "planes_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlanCompra extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 30) private String code;
    @Column(nullable = false, length = 7) private String period;
    @Column(nullable = false, length = 25) private String status;
    @Column(nullable = false) private LocalDateTime createdAt;
    @Column(length = 500) private String notes;
    @Builder.Default
    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DetallePlanCompra> items = new ArrayList<>();
}
