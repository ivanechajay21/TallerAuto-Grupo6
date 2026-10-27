package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;
import java.time.LocalDate;

/** Evaluación periódica de calidad, puntualidad y atención de un proveedor. */
@Entity
@Table(name = "evaluaciones_proveedor")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EvaluacionProveedor extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "proveedor_id", nullable = false)
    private Proveedor supplier;
    @Column(nullable = false) private LocalDate evaluationDate;
    @Min(1) @Max(5) @Column(nullable = false) private Integer qualityScore;
    @Min(1) @Max(5) @Column(nullable = false) private Integer deliveryScore;
    @Min(1) @Max(5) @Column(nullable = false) private Integer serviceScore;
    @Column(length = 500) private String notes;
}
