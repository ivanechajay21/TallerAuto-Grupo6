package com.sigtm.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.time.LocalDateTime;

/** Demanda prevista para un repuesto en un período mensual (AAAA-MM). */
@Entity
@Table(name = "pronosticos_demanda", uniqueConstraints = @UniqueConstraint(columnNames = {"producto_id", "periodo"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PronosticoDemanda extends Auditable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @NotBlank @Column(nullable = false, length = 7) private String period;
    @NotNull @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "producto_id", nullable = false) private Producto product;
    @NotNull @Min(0) @Column(nullable = false) private Integer forecastQuantity;
    @NotNull @Min(0) @Column(nullable = false) private Integer safetyStock;
    @Column(nullable = false) private LocalDateTime registeredAt;
    @Column(length = 500) private String notes;
}
