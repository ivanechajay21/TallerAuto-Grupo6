package com.sigtm.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

/** Línea propuesta por el plan, conservando la necesidad y el inventario al planificar. */
@Entity
@Table(name = "detalles_plan_compra")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DetallePlanCompra {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @JsonIgnore @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "plan_id", nullable = false) private PlanCompra plan;
    @NotNull @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "producto_id", nullable = false) private Producto product;
    @NotNull @Min(1) @Column(nullable = false) private Integer suggestedQuantity;
    @NotNull @Min(0) @Column(nullable = false) private Integer stockAtPlanning;
    @NotNull @Min(0) @Column(nullable = false) private Integer forecastQuantity;
}
