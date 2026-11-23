package com.sigtm.backend.model;

import jakarta.persistence.*;
import lombok.*;

/**
 * Elemento de un catálogo de valores reutilizables del sistema.
 *
 * <p>Se persiste en la tabla catalog_items y clasifica sus registros por tipo (CATEGORIA, ESTADO,
 * PRIORIDAD o UNIDAD). Permite mantener ordenadas y activables las opciones ofrecidas por los
 * distintos módulos del taller.</p>
 */
@Entity
@Table(name = "catalog_items", uniqueConstraints = {
        @UniqueConstraint(name = "uk_catalog_tipo_codigo", columnNames = {"tipo", "codigo"}),
        @UniqueConstraint(name = "uk_catalog_tipo_nombre", columnNames = {"tipo", "nombre"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ItemCatalogo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // CATEGORIA, ESTADO, PRIORIDAD, UNIDAD
    @Column(name = "tipo", nullable = false, length = 20)
    private String tipo;

    @Column(name = "codigo", length = 30)
    private String code;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "orden")
    private Integer orden;

    @Column(name = "activo", nullable = false)
    private Boolean activo = true;
}